package com.reconciliation.filter;

import com.reconciliation.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;

/**
 * Filtre JWT pour intercepter les requêtes et valider les tokens
 * Ce filtre s'exécute avant les autres filtres de sécurité Spring
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        
        // Ignorer les requêtes OPTIONS (CORS preflight)
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        final String authHeader = request.getHeader("Authorization");

        // Si pas d'Authorization header ou ne commence pas par "Bearer ", continuer sans authentification
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            // Extraire le token (enlever "Bearer ")
            final String jwt = authHeader.substring(7);

            // Extraire le username du token
            final String username = jwtService.extractUsername(jwt);

            // Si username extrait et pas d'authentification dans le contexte actuel
            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {

                // Charger les détails de l'utilisateur
                UserDetails userDetails = this.userDetailsService.loadUserByUsername(username);

                // Valider le token
                if (jwtService.validateToken(jwt, username)) {
                    if (!userDetails.isEnabled()) {
                        SecurityContextHolder.clearContext();
                        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                        return;
                    }
                    // Créer l'authentification
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                    );
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    // Mettre à jour le contexte de sécurité
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                } else {
                    // IMPORTANT: un token présent mais invalide/expiré doit être rejeté
                    SecurityContextHolder.clearContext();
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    return;
                }
            }
        } catch (Exception e) {
            log.debug("Erreur validation JWT: {}", e.getMessage());
            SecurityContextHolder.clearContext();
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        filterChain.doFilter(request, response);
    }
}

