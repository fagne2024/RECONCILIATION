package com.reconciliation.config;

import com.reconciliation.filter.JwtAuthenticationFilter;
import com.reconciliation.filter.RateLimitingFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.security.web.header.writers.XXssProtectionHeaderWriter;

/**
 * Configuration Spring Security
 * Protection des endpoints avec JWT (JSON Web Tokens)
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Autowired
    private RateLimitingFilter rateLimitingFilter;

    /**
     * Configuration du PasswordEncoder avec BCrypt
     * BCrypt est un algorithme de hashage sécurisé pour les mots de passe
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Configuration de l'AuthenticationManager
     */
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    /**
     * Configuration de la chaîne de filtres de sécurité
     * Protection des endpoints avec JWT
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // Désactiver CSRF pour les API REST (JWT le remplace)
            .csrf(csrf -> csrf.disable())
            
            // Configuration de l'autorisation
            // TEMPORAIRE : Tous les endpoints sont publics pour le développement
            // TODO: Réactiver l'authentification en production
            .authorizeHttpRequests(auth -> auth
                // Tous les endpoints API sont publics (temporaire)
                .requestMatchers("/api/**").permitAll()
                .requestMatchers("/").permitAll()
                .requestMatchers("/health").permitAll()
                .anyRequest().permitAll()
            )
            
            // Configuration des sessions (stateless pour REST API avec JWT)
            .sessionManagement(session -> 
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            
            // Configuration des en-têtes de sécurité HTTP
            .headers(headers -> headers
                // Protection contre le clickjacking
                .frameOptions(frameOptions -> frameOptions.deny())
                
                // Protection contre le MIME type sniffing
                .contentTypeOptions(contentTypeOptions -> {})
                
                // Protection XSS
                .xssProtection(xssProtection -> xssProtection
                    .headerValue(XXssProtectionHeaderWriter.HeaderValue.ENABLED_MODE_BLOCK)
                )
                
                // Strict Transport Security (HSTS) - Force HTTPS
                .httpStrictTransportSecurity(hsts -> hsts
                    .maxAgeInSeconds(31536000) // 1 an
                )
                
                // Referrer Policy - Contrôle des informations de référent
                .referrerPolicy(referrerPolicy -> referrerPolicy
                    .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN)
                )
                
                // Content Security Policy - Protection contre les attaques XSS et injection
                .contentSecurityPolicy(csp -> csp
                    .policyDirectives("default-src 'self'; " +
                        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
                        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; " +
                        "img-src 'self' data: https:; " +
                        "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com; " +
                        "connect-src 'self' https:; " +
                        "frame-ancestors 'none'; " +
                        "base-uri 'self'; " +
                        "form-action 'self'; " +
                        "object-src 'none'; " +
                        "upgrade-insecure-requests")
                )
                
                // Permissions Policy - Contrôle des fonctionnalités du navigateur
                .permissionsPolicy(permissionsPolicy -> permissionsPolicy
                    .policy("geolocation=(), " +
                        "microphone=(), " +
                        "camera=(), " +
                        "payment=(), " +
                        "usb=(), " +
                        "magnetometer=(), " +
                        "gyroscope=(), " +
                        "fullscreen=(self), " +
                        "sync-xhr=()")
                )
            )
            
            // Ajouter le filtre de rate limiting en premier (avant l'authentification)
            .addFilterBefore(rateLimitingFilter, UsernamePasswordAuthenticationFilter.class)
            
            // Ajouter le filtre JWT avant le filtre d'authentification par défaut
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}

