package com.reconciliation.util;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;

public class RequestContextUtil {
    
    /**
     * Récupère le nom d'utilisateur depuis le header X-Username de la requête HTTP
     */
    public static String getUsernameFromRequest() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.isAuthenticated()) {
                Object principal = authentication.getPrincipal();
                if (principal instanceof UserDetails userDetails) {
                    String username = userDetails.getUsername();
                    if (username != null && !username.isBlank()) {
                        return username;
                    }
                } else if (principal instanceof String username && !"anonymousUser".equals(username)) {
                    return username;
                }
            }

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

    public static String getPermissionModuleFromRequest() {
        try {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                HttpServletRequest request = attributes.getRequest();
                if (request != null) {
                    String module = request.getHeader("X-Permission-Module");
                    return module != null && !module.isBlank() ? module.trim() : null;
                }
            }
        } catch (Exception e) {
            // Ignorer les erreurs si on n'est pas dans un contexte HTTP
        }
        return null;
    }
}

