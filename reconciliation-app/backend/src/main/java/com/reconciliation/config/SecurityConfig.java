package com.reconciliation.config;

import com.reconciliation.filter.JwtAuthenticationFilter;
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
            
            // Ajouter le filtre JWT avant le filtre d'authentification par défaut
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}

