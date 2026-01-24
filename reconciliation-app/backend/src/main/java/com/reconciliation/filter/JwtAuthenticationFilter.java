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

import java.io.IOException;

/**
 * Filtre JWT pour intercepter les requêtes et valider les tokens
 * Ce filtre s'exécute avant les autres filtres de sécurité Spring
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

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
        String path = request.getRequestURI();
        
        // Log pour débogage
        if (path.contains("result8rec")) {
            System.out.println("🔍 JwtAuthenticationFilter - Path: " + path + ", AuthHeader: " + (authHeader != null ? "présent" : "absent"));
        }
        
        // Si pas d'Authorization header ou ne commence pas par "Bearer ", continuer sans authentification
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            if (path.contains("result8rec")) {
                System.out.println("⚠️ JwtAuthenticationFilter - Pas de token JWT pour " + path);
            }
            filterChain.doFilter(request, response);
            return;
        }

        try {
            // Extraire le token (enlever "Bearer ")
            final String jwt = authHeader.substring(7);
            
            // Extraire le username du token
            final String username = jwtService.extractUsername(jwt);
            
            if (path.contains("result8rec")) {
                System.out.println("🔍 JwtAuthenticationFilter - Username extrait: " + username);
            }
            
            // Si username extrait et pas d'authentification dans le contexte actuel
            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                
                // Charger les détails de l'utilisateur
                UserDetails userDetails = this.userDetailsService.loadUserByUsername(username);
                
                // Valider le token
                if (jwtService.validateToken(jwt, username)) {
                    // Créer l'authentification
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                    );
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    
                    // Mettre à jour le contexte de sécurité
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    
                    if (path.contains("result8rec")) {
                        System.out.println("✅ JwtAuthenticationFilter - Authentification réussie pour " + username);
                    }
                } else {
                    if (path.contains("result8rec")) {
                        System.out.println("❌ JwtAuthenticationFilter - Token invalide pour " + username);
                    }
                    // IMPORTANT: un token présent mais invalide/expiré doit être rejeté
                    SecurityContextHolder.clearContext();
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    return;
                }
            } else if (path.contains("result8rec")) {
                System.out.println("⚠️ JwtAuthenticationFilter - Username null ou authentification déjà présente");
            }
        } catch (Exception e) {
            // En cas d'erreur (token invalide, expiré, etc.), REJETER la requête si un token a été fourni
            if (path.contains("result8rec")) {
                System.err.println("❌ JwtAuthenticationFilter - Erreur lors de la validation du token JWT: " + e.getMessage());
                e.printStackTrace();
            }
            logger.debug("Erreur lors de la validation du token JWT: " + e.getMessage());
            SecurityContextHolder.clearContext();
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        filterChain.doFilter(request, response);
    }
}

