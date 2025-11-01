package com.reconciliation.util;

import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;

public class RequestContextUtil {
    
    /**
     * Récupère le nom d'utilisateur depuis le header X-Username de la requête HTTP
     */
    public static String getUsernameFromRequest() {
        try {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                HttpServletRequest request = attributes.getRequest();
                if (request != null) {
                    String username = request.getHeader("X-Username");
                    return username != null ? username : null;
                }
            }
        } catch (Exception e) {
            // Ignorer les erreurs si on n'est pas dans un contexte HTTP
        }
        return null;
    }
}

