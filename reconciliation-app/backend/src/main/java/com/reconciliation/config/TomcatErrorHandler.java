package com.reconciliation.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration pour gérer les erreurs de parsing HTTP de manière plus gracieuse.
 * Ces erreurs se produisent souvent lorsque des clients mal configurés ou des scanners
 * de port envoient des données binaires au lieu de requêtes HTTP valides.
 * 
 * Tomcat gère déjà ces erreurs automatiquement et les log en DEBUG après la première occurrence.
 * Cette configuration permet d'ajuster le comportement si nécessaire.
 */
@Configuration
public class TomcatErrorHandler {

    private static final Logger log = LoggerFactory.getLogger(TomcatErrorHandler.class);

    @Bean
    public WebServerFactoryCustomizer<TomcatServletWebServerFactory> tomcatCustomizer() {
        return factory -> {
            factory.addConnectorCustomizers(connector -> {
                // Configurer Tomcat pour gérer les erreurs de parsing HTTP plus gracieusement
                // Les erreurs de parsing HTTP sont déjà gérées par Tomcat et loggées en DEBUG
                // après la première occurrence, ce qui réduit le bruit dans les logs.
                
                // Optionnel: Configurer le timeout de connexion pour fermer rapidement
                // les connexions malformées
                connector.setProperty("connectionTimeout", "20000");
                
                log.debug("✅ Configuration Tomcat appliquée pour gérer les erreurs de parsing HTTP");
            });
        };
    }
}

