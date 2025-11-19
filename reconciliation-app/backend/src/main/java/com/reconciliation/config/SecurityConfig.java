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
            .authorizeHttpRequests(auth -> auth
                // Endpoints publics (pas d'authentification requise)
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/users/check-admin").permitAll() // Vérification admin accessible sans authentification
                .requestMatchers("/api/users/forgot-password").permitAll() // Réinitialisation mot de passe accessible sans authentification
                .requestMatchers("/api/auto-processing/models").permitAll() // Lecture des modèles (GET) - public pour chargement initial
                .requestMatchers("/api/auto-processing/models/*/column-rules").permitAll() // Lecture des règles (GET) - public
                .requestMatchers("/api/file-watcher/available-files").permitAll() // Lecture des fichiers disponibles (GET) - public
                .requestMatchers("/api/reconciliation/reconcile").permitAll() // Réconciliation automatique - public pour mode automatique
                .requestMatchers("/").permitAll()
                .requestMatchers("/health").permitAll()
                
                // Endpoints protégés (authentification JWT requise)
                .requestMatchers("/api/users/**").authenticated()
                .requestMatchers("/api/operations/**").authenticated()
                .requestMatchers("/api/accounts/**").authenticated()
                .requestMatchers("/api/comptes/**").authenticated()
                .requestMatchers("/api/reconciliation/**").authenticated() // Autres endpoints de réconciliation protégés
                .requestMatchers("/api/rankings/**").authenticated()
                .requestMatchers("/api/statistics/**").authenticated()
                .requestMatchers("/api/auto-processing/**").authenticated() // Modifications des modèles (POST/PUT/DELETE) - protégé
                .requestMatchers("/api/file-watcher/**").authenticated() // Modifications de la surveillance (POST/PUT/DELETE) - protégé
                .requestMatchers("/api/sql/**").hasRole("ADMIN") // Admin seulement
                
                // Endpoints semi-protégés (peut nécessiter authentification selon le contexte)
                .requestMatchers("/api/**").authenticated()
                
                // Tous les autres endpoints nécessitent une authentification
                .anyRequest().authenticated()
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

