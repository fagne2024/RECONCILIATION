package com.reconciliation.interceptor;

import com.reconciliation.service.PermissionCheckService;
import com.reconciliation.service.UserLogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;
import java.util.Map;
import java.util.HashMap;

@Component
public class PermissionInterceptor implements HandlerInterceptor {

    @Autowired
    private PermissionCheckService permissionCheckService;
    
    @Autowired
    private UserLogService userLogService;

    // Chemins qui ne nécessitent pas de vérification de permissions
    private static final String[] EXCLUDED_PATHS = {
        "/api/auth/login",
        "/api/auth/verify-2fa",
        "/api/auth/logout",
        "/api/users/check-admin",
        "/api/users/forgot-password",
        "/api/users/me",
        "/api/users/me/password",
        "/api/log-utilisateur/log-activity",
        "/error"
    };

    @Override
    public boolean preHandle(@org.springframework.lang.NonNull HttpServletRequest request, 
                             @org.springframework.lang.NonNull HttpServletResponse response, 
                             @org.springframework.lang.NonNull Object handler) throws Exception {
        String path = request.getRequestURI();
        String method = request.getMethod();
        String moduleOverride = request.getHeader("X-Permission-Module");
        String permissionOverride = request.getHeader("X-Permission-Action");

        // Ignorer les chemins exclus
        for (String excludedPath : EXCLUDED_PATHS) {
            // Vérifier si le chemin correspond exactement ou commence par le chemin exclu
            // Pour les chemins avec des sous-chemins, vérifier aussi les correspondances exactes
            if (path.equals(excludedPath) || path.startsWith(excludedPath + "/") || path.startsWith(excludedPath + "?")) {
                return true;
            }
        }
        
        // Patterns spéciaux avec paramètres dynamiques
        // /api/profils/{id}/droits
        if (path.matches("/api/profils/\\d+/droits")) {
            return true;
        }
        // /api/pays/profil/{id}
        if (path.matches("/api/pays/profil/\\d+")) {
            return true;
        }

        // Ignorer les requêtes OPTIONS (CORS)
        if ("OPTIONS".equals(method)) {
            return true;
        }

        // Ignorer les chemins statiques
        if (path.startsWith("/static/") || path.startsWith("/css/") || path.startsWith("/js/") || path.startsWith("/images/")) {
            return true;
        }

        // Récupérer le nom d'utilisateur depuis le header ou la session
        String username = getUsernameFromRequest(request);
        
        // Log pour débogage
        System.out.println("🔍 PermissionInterceptor - Path: " + path + ", Method: " + method + ", Username: " + username);

        // Si pas d'utilisateur, autoriser (sera géré par l'authentification)
        if (username == null || username.isEmpty()) {
            // Pour l'instant, autoriser toutes les requêtes sans utilisateur
            // À adapter selon votre système d'authentification
            System.out.println("⚠️ PermissionInterceptor - Aucun username trouvé, autorisation par défaut");
            return true;
        }

        // Vérifier les permissions uniquement pour les chemins API
        if (path.startsWith("/api/")) {
            try {
                boolean hasPermission = permissionCheckService.hasPermissionForApiPath(username, path, method, moduleOverride, permissionOverride);
                System.out.println("🔍 PermissionInterceptor - hasPermission: " + hasPermission + " pour " + username + " sur " + path);
                
                if (!hasPermission) {
                    // Log pour débogage
                    System.out.println("🔒 Permission refusée pour " + username + " sur " + method + " " + path);
                    
                    response.setStatus(HttpStatus.FORBIDDEN.value());
                    response.setContentType("application/json");
                    response.setCharacterEncoding("UTF-8");
                    
                    String moduleName = permissionCheckService.resolveModuleForApiPath(path, method, moduleOverride);
                    String actionName = permissionCheckService.resolvePermissionForApiPath(path, method, moduleOverride, permissionOverride);
                    if (actionName == null || actionName.isBlank()) {
                        actionName = switch (method) {
                            case "GET" -> "consulter";
                            case "POST" -> "créer";
                            case "PUT", "PATCH" -> "modifier";
                            case "DELETE" -> "supprimer";
                            default -> "effectuer cette action";
                        };
                    }
                    
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put("error", "Permission refusée");
                    if (moduleName != null) {
                        errorResponse.put("message", "Vous n'avez pas la permission \"" + actionName + "\" dans le module \"" + moduleName + "\".");
                    } else {
                        errorResponse.put("message", "Vous n'avez pas la permission pour exécuter cette action.");
                    }
                    errorResponse.put("path", path);
                    errorResponse.put("method", method);
                    errorResponse.put("action", actionName);
                    
                    try {
                        response.getWriter().write(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(errorResponse));
                    } catch (IOException e) {
                        // Erreur lors de l'écriture de la réponse
                        System.err.println("Erreur lors de l'écriture de la réponse d'erreur: " + e.getMessage());
                    }
                    
                    return false;
                } else {
                    System.out.println("✅ Permission accordée pour " + username + " sur " + method + " " + path);
                    
                    // Logger l'action utilisateur
                    try {
                        String moduleName = permissionCheckService.resolveModuleForApiPath(path, method, moduleOverride);
                        String permissionName = permissionCheckService.resolvePermissionForApiPath(path, method, moduleOverride, permissionOverride);
                        
                        if (moduleName != null && permissionName != null) {
                            userLogService.saveLog(permissionName, moduleName, username);
                        }
                    } catch (Exception e) {
                        // Ne pas bloquer la requête en cas d'erreur de logging
                        System.err.println("Erreur lors de l'enregistrement du log: " + e.getMessage());
                    }
                }
            } catch (Exception e) {
                // En cas d'erreur lors de la vérification, autoriser la requête pour éviter de bloquer l'application
                // Log l'erreur pour le débogage
                System.err.println("Erreur lors de la vérification des permissions pour " + path + ": " + e.getMessage());
                e.printStackTrace();
                // Autoriser la requête en cas d'erreur (mode permissif pour éviter de bloquer l'application)
                return true;
            }
        }

        return true;
    }

    /**
     * Récupère le nom d'utilisateur depuis la requête
     * À adapter selon votre système d'authentification
     */
    private String getUsernameFromRequest(HttpServletRequest request) {
        // Essayer d'abord depuis le SecurityContext (rempli par JwtAuthenticationFilter)
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()) {
            Object principal = authentication.getPrincipal();
            System.out.println("🔍 PermissionInterceptor - Authentication trouvée, principal type: " + (principal != null ? principal.getClass().getName() : "null"));
            if (principal instanceof UserDetails) {
                String username = ((UserDetails) principal).getUsername();
                System.out.println("🔍 PermissionInterceptor - Username depuis UserDetails: " + username);
                return username;
            } else if (principal instanceof String) {
                String username = (String) principal;
                System.out.println("🔍 PermissionInterceptor - Username depuis String: " + username);
                return username;
            }
        } else {
            System.out.println("⚠️ PermissionInterceptor - Aucune authentication trouvée dans SecurityContext");
        }

        // Essayer depuis le header X-Username (si envoyé par le frontend)
        String username = request.getHeader("X-Username");
        if (username != null && !username.isEmpty()) {
            return username;
        }

        // Essayer depuis la session
        Object sessionUser = request.getSession().getAttribute("username");
        if (sessionUser != null) {
            return sessionUser.toString();
        }

        // Essayer depuis les paramètres de requête (pour le développement)
        username = request.getParameter("username");
        if (username != null && !username.isEmpty()) {
            return username;
        }

        return null;
    }

    /**
     * Extrait le nom du module à partir du chemin de l'API
     */
    private String extractModuleNameFromPath(String path) {
        if (path == null) return null;
        
        if (path.startsWith("/api/operations")) return "Opérations";
        if (path.startsWith("/api/operations-bancaires")) return "Opérations";
        if (path.startsWith("/api/comptes")) return "Comptes";
        if (path.startsWith("/api/frais")) return "Frais";
        if (path.startsWith("/api/commission")) return "Frais";
        if (path.startsWith("/api/reconciliation")) return "Réconciliation";
        if (path.startsWith("/api/stats")) return "Statistiques";
        if (path.startsWith("/api/statistics")) return "Statistiques";
        if (path.startsWith("/api/ranking")) return "Classements";
        if (path.startsWith("/api/ecart-solde")) return "TSOP";
        if (path.startsWith("/api/trx-sf")) return "TRX SF";
        if (path.startsWith("/api/impact-op")) return "Impact OP";
        if (path.startsWith("/api/service-balance")) return "Service Balance";
        if (path.startsWith("/api/banque")) return "BANQUE";
        if (path.startsWith("/api/comptabilite")) return "Comptabilité";
        if (path.startsWith("/api/auto-processing-models")) return "Modèles";
        if (path.startsWith("/api/profils")) return "Profil";
        if (path.startsWith("/api/users")) return "Utilisateur";
        if (path.startsWith("/api/log-utilisateur")) return "Log utilisateur";
        if (path.startsWith("/api/dashboard")) return "Dashboard";
        if (path.startsWith("/api/traitement")) return "Traitement";
        if (path.startsWith("/api/results")) return "Résultats";
        if (path.startsWith("/api/result8rec")) return "Résultats";
        
        return null;
    }
    
    /**
     * Extrait le nom de la permission à partir du chemin et de la méthode HTTP
     */
    private String extractPermissionNameFromPath(String path, String method) {
        if (path == null || method == null) return null;
        
        String lowerPath = path.toLowerCase();
        String lowerMethod = method.toLowerCase();
        
        // Actions spéciales basées sur le chemin
        if (lowerPath.contains("/upload") || lowerPath.endsWith("upload")) return "upload";
        if (lowerPath.contains("/download") || lowerPath.contains("/template") || lowerPath.contains("/export") || lowerPath.endsWith("download") || lowerPath.endsWith("template") || lowerPath.endsWith("export")) return "download";
        if ((lowerPath.contains("/filter") || lowerPath.contains("/search")) && !lowerPath.contains("statistics")) return "filter";
        // Création en masse du rapport : même droit que POST /api/result8rec (évite 403 si seul "creer" est accordé)
        if (lowerPath.startsWith("/api/result8rec") && lowerPath.contains("/bulk") && "post".equals(lowerMethod)) {
            return "creer";
        }
        if (lowerPath.contains("/bulk") || lowerPath.endsWith("bulk")) return "bulk";
        if (lowerPath.contains("/recent") || lowerPath.endsWith("recent")) return "lire_recent";
        if (lowerPath.contains("/mark-ok") || lowerPath.contains("/mark") || lowerPath.endsWith("mark-ok") || lowerPath.endsWith("mark")) return "marquer";
        if (lowerPath.contains("/reconcil") || lowerPath.endsWith("reconcil")) return "reconcilier";
        if (lowerPath.contains("/import") || lowerPath.endsWith("import")) return "importer";
        if (lowerPath.contains("/export") || lowerPath.endsWith("export")) return "exporter";
        if (lowerPath.contains("/validate") || lowerPath.endsWith("validate")) return "valider";
        if (lowerPath.contains("/approve") || lowerPath.endsWith("approve")) return "approuver";
        if (lowerPath.contains("/reject") || lowerPath.endsWith("reject")) return "rejeter";
        if (lowerPath.contains("/reset") || lowerPath.endsWith("reset")) return "reinitialiser";
        if (lowerPath.contains("/annuler") || lowerPath.contains("/cancel") || lowerPath.endsWith("annuler") || lowerPath.endsWith("cancel")) return "annuler";
        
        // Actions standard basées sur la méthode HTTP
        switch (lowerMethod) {
            case "get":
                return "lire";
            case "post":
                return "creer";
            case "put":
            case "patch":
                return "modifier";
            case "delete":
                return "supprimer";
            default:
                return null;
        }
    }
}

