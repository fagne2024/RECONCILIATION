package com.reconciliation.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.List;

@Configuration
public class GlobalCorsConfig {

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        // Configuration CORS sécurisée - limiter aux origines autorisées
        // En développement: localhost:4200 (Angular)
        // En production: remplacer par les domaines de production
        config.setAllowedOrigins(List.of(
            "http://localhost:4200",      // Angular frontend (développement)
            "http://localhost:3000"       // Autre frontend (si nécessaire)
            // Ajouter les domaines de production ici:
            // "https://votre-domaine.com",
            // "https://app.votre-domaine.com"
        ));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("*"));
        config.setAllowCredentials(true); // Permettre les credentials si nécessaire

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return new CorsFilter(source);
    }
}


