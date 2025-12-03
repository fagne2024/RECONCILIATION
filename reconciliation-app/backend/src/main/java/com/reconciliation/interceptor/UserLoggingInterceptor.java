package com.reconciliation.interceptor;

import com.reconciliation.entity.UserLogEntity;
import com.reconciliation.service.UserLogService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class UserLoggingInterceptor implements HandlerInterceptor {

    @Autowired
    private UserLogService userLogService;

    // Chemins qui ne doivent pas être loggés (toutes méthodes)
    private static final String[] EXCLUDED_PATHS = {
        "/api/auth/login",
        "/api/auth/logout",
        "/api/users/check-admin",
        "/api/users/forgot-password",
        "/api/log-utilisateur", // Ne pas logger les consultations de logs
        "/api/reconciliation/status", // Statut de réconciliation (GET fréquent)
        "/api/reconciliation/ok-keys", // Clés OK (GET fréquent)
        "/api/reconciliation/test", // Test endpoint
        "/api/comptes/pays/list", // Liste des pays (GET fréquent)
        "/api/comptes/code-proprietaire/list", // Liste codes propriétaires (GET fréquent)
        "/api/agency-summary/all", // Résumé agences (GET fréquent)
        "/api/operations/date-range", // Opérations par période (GET fréquent)
        "/api/rankings/agencies/transactions", // Classement agences (GET fréquent)
        "/api/rankings/countries", // Liste pays (GET fréquent)
        "/api/rankings/services/transactions", // Classement services (GET fréquent)
        "/api/statistics/transaction-created-stats", // Stats transactions (GET fréquent)
        "/api/statistics/detailed-metrics", // Métriques détaillées (GET fréquent)
        "/api/frais-transaction/services", // Services frais (GET fréquent)
        "/api/frais-transaction/agences", // Agences frais (GET fréquent)
        "/api/ecart-solde/agences", // Agences écart solde (GET fréquent)
        "/api/ecart-solde/services", // Services écart solde (GET fréquent)
        "/api/ecart-solde/pays", // Pays écart solde (GET fréquent)
        "/api/impact-op/filter-options", // Options filtrage (GET fréquent)
        "/api/impact-op/stats", // Stats impact OP (GET fréquent)
        "/api/file-watcher/available-files", // Fichiers disponibles (GET fréquent)
        "/api/auto-processing/models", // Liste modèles (GET fréquent)
        "/error",
        "/favicon.ico"
    };
    
    // Chemins GET qui ne doivent JAMAIS être loggés (chargements automatiques)
    private static final String[] EXCLUDED_GET_PATHS = {
        "/api/pays", // Liste des pays (GET automatique)
        "/api/profils", // Liste des profils (GET automatique)
        "/api/users", // Liste des utilisateurs (GET automatique)
        "/api/comptes", // Liste des comptes (GET automatique)
        "/api/operations", // Liste des opérations (GET automatique)
        "/api/operations-bancaires", // Liste des opérations bancaires (GET automatique)
        "/api/ranking", // Classements (GET automatique)
        "/api/statistics", // Statistiques (GET automatique)
        "/api/stats", // Stats (GET automatique)
        "/api/frais", // Frais (GET automatique)
        "/api/frais-transaction", // Frais transaction (GET automatique)
        "/api/commission", // Commission (GET automatique)
        "/api/ecart-solde", // Écart solde (GET automatique)
        "/api/impact-op", // Impact OP (GET automatique)
        "/api/trx-sf", // TRX SF (GET automatique)
        "/api/service-balance", // Service Balance (GET automatique)
        "/api/banque", // Banque (GET automatique)
        "/api/comptabilite", // Comptabilité (GET automatique)
        "/api/traitement", // Traitement (GET automatique)
        "/api/results", // Résultats (GET automatique)
        "/api/result8rec", // Rapport réconciliation (GET automatique - liste)
        "/api/modules", // Modules (GET automatique)
        "/api/permissions" // Permissions (GET automatique)
    };

    @Override
    public boolean preHandle(HttpServletRequest request, 
                             HttpServletResponse response, 
                             Object handler) throws Exception {
        String path = request.getRequestURI();
        String method = request.getMethod();

        // Ignorer les chemins exclus
        for (String excludedPath : EXCLUDED_PATHS) {
            if (path.equals(excludedPath) || path.startsWith(excludedPath + "/") || path.startsWith(excludedPath + "?")) {
                return true;
            }
        }

        // Ignorer les requêtes OPTIONS (CORS)
        if ("OPTIONS".equals(method)) {
            return true;
        }

        // Ignorer les chemins statiques
        if (path.startsWith("/static/") || path.startsWith("/css/") || path.startsWith("/js/") || path.startsWith("/images/")) {
            return true;
        }

        // Ne logger que les requêtes API
        if (!path.startsWith("/api/")) {
            return true;
        }

        // Ne PAS logger les requêtes GET sauf exceptions très spécifiques
        // On log uniquement les actions significatives : POST, PUT, DELETE
        String lowerPath = path.toLowerCase();
        
        if ("GET".equals(method)) {
            // Par défaut, NE PAS logger les GET
            // Vérifier d'abord si c'est un chemin GET exclu (listes, chargements automatiques)
            for (String excludedGetPath : EXCLUDED_GET_PATHS) {
                if (path.equals(excludedGetPath) || path.startsWith(excludedGetPath + "/")) {
                    return true; // Ne pas logger cette requête GET
                }
            }
            
            // Vérifier aussi les patterns de chemins GET automatiques
            if (lowerPath.contains("/filter") || 
                lowerPath.contains("/search") ||
                lowerPath.contains("/list") ||
                lowerPath.contains("/all") ||
                lowerPath.contains("/stats") ||
                lowerPath.contains("/metrics") ||
                lowerPath.contains("/date-range") ||
                lowerPath.contains("/transactions") ||
                lowerPath.contains("/agences") ||
                lowerPath.contains("/services") ||
                lowerPath.contains("/countries") ||
                lowerPath.contains("/pays/list") ||
                lowerPath.contains("/code-proprietaire/list")) {
                return true; // Ne pas logger ces GET de chargement/filtrage
            }
            
            // Ensuite vérifier si c'est une GET significative (export, download, consultation par ID)
            if (!isSignificantGetRequest(path)) {
                return true; // Ne pas logger cette requête GET
            }
        }
        
        // Ne pas logger les actions de filtrage en POST (chargements automatiques)
        // Mais logger les autres POST, PUT, DELETE
        if (lowerPath.contains("/filter") && !lowerPath.contains("/export")) {
            return true; // Ne pas logger les actions de filtrage
        }

        // Récupérer le nom d'utilisateur
        String username = getUsernameFromRequest(request);
        
        if (username == null || username.isEmpty()) {
            // Pas d'utilisateur, on ne log pas
            return true;
        }

        // Logger l'action utilisateur
        try {
            String moduleName = extractModuleNameFromPath(path);
            String permissionName = extractPermissionNameFromPath(path, method);
            
            // Debug temporaire
            if (moduleName == null || permissionName == null) {
                System.out.println("⚠️ Log non enregistré - Path: " + path + ", Method: " + method + 
                    ", Module: " + moduleName + ", Permission: " + permissionName);
            }
            
            if (moduleName != null && permissionName != null) {
                userLogService.saveLog(permissionName, moduleName, username);
                System.out.println("✅ Log enregistré - Path: " + path + ", Method: " + method + 
                    ", Module: " + moduleName + ", Permission: " + permissionName + ", User: " + username);
            }
        } catch (Exception e) {
            // Ne pas bloquer la requête en cas d'erreur de logging
            System.err.println("Erreur lors de l'enregistrement du log: " + e.getMessage());
            e.printStackTrace();
        }

        return true;
    }

    /**
     * Récupère le nom d'utilisateur depuis la requête
     */
    private String getUsernameFromRequest(HttpServletRequest request) {
        // Priorité 1 : Essayer depuis le header X-Username (toujours disponible si envoyé par le frontend)
        String username = request.getHeader("X-Username");
        if (username != null && !username.isEmpty()) {
            return username;
        }

        // Priorité 2 : Essayer depuis le SecurityContext
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()) {
            Object principal = authentication.getPrincipal();
            if (principal instanceof UserDetails) {
                return ((UserDetails) principal).getUsername();
            } else if (principal instanceof String) {
                return (String) principal;
            }
        }

        // Priorité 3 : Essayer depuis la session
        try {
            Object sessionUser = request.getSession().getAttribute("username");
            if (sessionUser != null) {
                return sessionUser.toString();
            }
        } catch (Exception e) {
            // Ignorer les erreurs de session
        }

        return null;
    }

    /**
     * Détermine si une requête GET est significative et doit être loggée
     * On ne log PAS les requêtes GET de chargement de données automatiques
     * On log UNIQUEMENT les GET qui sont des actions EXPLICITES de l'utilisateur
     */
    private boolean isSignificantGetRequest(String path) {
        if (path == null) return false;
        
        String lowerPath = path.toLowerCase();
        
        // Par défaut, NE PAS logger les GET
        // On ne log que les GET qui sont des actions EXPLICITES de l'utilisateur
        
        // 1. Export/Download de fichiers (action explicite)
        if (lowerPath.contains("/export") || 
            lowerPath.contains("/download") || 
            lowerPath.contains("/template")) {
            return true;
        }
        
        // 2. Consultation d'un élément spécifique par ID uniquement (ex: /api/users/123)
        // Pattern strict : /api/module/123 (seulement 2 niveaux après /api, sans paramètres)
        if (lowerPath.matches("/api/[^/]+/\\d+$")) {
            // Vérifier que ce n'est pas un chemin exclu
            String basePath = lowerPath.substring(0, lowerPath.lastIndexOf('/'));
            // Exclure TOUS les chemins de liste même avec ID (chargements automatiques)
            if (basePath.equals("/api/pays") || 
                basePath.equals("/api/profils") || 
                basePath.equals("/api/users") ||
                basePath.equals("/api/comptes") ||
                basePath.equals("/api/operations") ||
                basePath.equals("/api/operations-bancaires") ||
                basePath.equals("/api/ranking") ||
                basePath.equals("/api/statistics") ||
                basePath.equals("/api/stats") ||
                basePath.equals("/api/frais") ||
                basePath.equals("/api/frais-transaction") ||
                basePath.equals("/api/ecart-solde") ||
                basePath.equals("/api/impact-op") ||
                basePath.equals("/api/trx-sf") ||
                basePath.equals("/api/service-balance") ||
                basePath.equals("/api/banque") ||
                basePath.equals("/api/comptabilite") ||
                basePath.equals("/api/traitement") ||
                basePath.equals("/api/results") ||
                basePath.equals("/api/result8rec") ||
                basePath.equals("/api/modules") ||
                basePath.equals("/api/permissions")) {
                // Même avec un ID, ces chemins sont souvent des chargements automatiques
                return false;
            }
            // Pour les autres modules (moins fréquents), on peut logger la consultation par ID
            return true;
        }
        
        // 3. Actions spéciales explicites (génération, diagnostic, profil utilisateur)
        if (lowerPath.contains("/generate") ||
            lowerPath.contains("/diagnostic") ||
            lowerPath.equals("/api/users/me") ||
            lowerPath.startsWith("/api/users/me/")) {
            return true;
        }
        
        // Tous les autres GET ne sont PAS loggés
        // Cela inclut : /api/pays, /api/profils, /api/operations, /api/comptes, etc.
        return false;
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
        if (path.startsWith("/api/dashboard")) return "Dashboard";
        if (path.startsWith("/api/traitement")) return "Traitement";
        if (path.startsWith("/api/results")) return "Résultats";
        if (path.startsWith("/api/result8rec")) return "Résultats";
        if (path.startsWith("/api/pays")) return "Pays";
        if (path.startsWith("/api/modules")) return "Module";
        if (path.startsWith("/api/permissions")) return "Permission";
        if (path.startsWith("/api/dashboard")) return "Dashboard";
        if (path.startsWith("/api/reconciliation-dashboard")) return "Dashboard";
        if (path.startsWith("/api/banque-dashboard")) return "Dashboard";
        if (path.startsWith("/api/report-dashboard")) return "Dashboard";
        
        // Par défaut, retourner "Autre" pour ne pas bloquer le logging
        return "Autre";
    }
    
    /**
     * Extrait le nom de la permission à partir du chemin et de la méthode HTTP
     * Cette méthode identifie précisément l'action effectuée
     */
    private String extractPermissionNameFromPath(String path, String method) {
        if (path == null || method == null) return null;
        
        String lowerPath = path.toLowerCase();
        String lowerMethod = method.toLowerCase();
        
        // Actions spécifiques de réconciliation
        if (lowerPath.contains("/reconciliation/reconcile")) return "lancer_reconciliation";
        if (lowerPath.contains("/reconciliation/mark-ok")) {
            return lowerMethod.equals("delete") ? "retirer_marquage_ok" : "marquer_ok";
        }
        if (lowerPath.contains("/reconciliation/mark-ok/bulk")) return "marquer_ok_en_masse";
        if (lowerPath.contains("/reconciliation/unmark-ok/bulk")) return "retirer_marquage_ok_en_masse";
        if (lowerPath.contains("/reconciliation/status")) {
            return lowerMethod.equals("post") ? "definir_statut" : "consulter_statut";
        }
        if (lowerPath.contains("/reconciliation/status/bulk")) return "definir_statut_en_masse";
        if (lowerPath.contains("/reconciliation/upload")) return "uploader_fichier_reconciliation";
        if (lowerPath.contains("/reconciliation/execute-magic")) return "executer_reconciliation_magique";
        if (lowerPath.contains("/reconciliation/analyze-keys")) return "analyser_cles_reconciliation";
        if (lowerPath.contains("/reconciliation/save-summary")) return "sauvegarder_resume_reconciliation";
        
        // Actions spécifiques result8rec (rapport de réconciliation)
        if (lowerPath.startsWith("/api/result8rec")) {
            if (lowerPath.matches("/api/result8rec/\\d+")) {
                // PUT /api/result8rec/{id} ou DELETE /api/result8rec/{id}
                if (lowerMethod.equals("put") || lowerMethod.equals("patch")) {
                    return "modifier_ligne_rapport";
                } else if (lowerMethod.equals("delete")) {
                    return "supprimer_ligne_rapport";
                }
            } else if (lowerPath.equals("/api/result8rec") || lowerPath.equals("/api/result8rec/")) {
                // POST /api/result8rec
                if (lowerMethod.equals("post")) {
                    return "creer_ligne_rapport";
                } else if (lowerMethod.equals("get")) {
                    return "consulter_rapport";
                }
            } else if (lowerPath.contains("/bulk")) {
                return "sauvegarder_lignes_rapport_en_masse";
            }
        }
        
        // Actions spécifiques utilisateurs
        if (lowerPath.startsWith("/api/users")) {
            if (lowerPath.matches("/api/users/\\d+")) {
                if (lowerMethod.equals("put") || lowerMethod.equals("patch")) {
                    return "modifier_utilisateur";
                } else if (lowerMethod.equals("delete")) {
                    return "supprimer_utilisateur";
                }
            } else if (lowerPath.contains("/password")) {
                return "changer_mot_de_passe";
            } else if (lowerPath.contains("/reset-password")) {
                return "reinitialiser_mot_de_passe";
            } else if (lowerMethod.equals("post") && !lowerPath.contains("/")) {
                return "creer_utilisateur";
            }
        }
        
        // Actions spécifiques profils
        if (lowerPath.startsWith("/api/profils")) {
            if (lowerPath.matches("/api/profils/\\d+")) {
                if (lowerMethod.equals("put") || lowerMethod.equals("patch")) {
                    return "modifier_profil";
                } else if (lowerMethod.equals("delete")) {
                    return "supprimer_profil";
                }
            } else if (lowerPath.contains("/droits")) {
                return lowerMethod.equals("put") ? "modifier_droits_profil" : "consulter_droits_profil";
            } else if (lowerPath.contains("/permissions/generate")) {
                return "generer_permissions";
            } else if (lowerMethod.equals("post")) {
                return "creer_profil";
            }
        }
        
        // Actions spécifiques comptes
        if (lowerPath.startsWith("/api/comptes")) {
            if (lowerPath.matches("/api/comptes/\\d+")) {
                if (lowerMethod.equals("put") || lowerMethod.equals("patch")) {
                    return "modifier_compte";
                } else if (lowerMethod.equals("delete")) {
                    return "supprimer_compte";
                }
            } else if (lowerPath.contains("/filter")) {
                return "filtrer_comptes";
            } else if (lowerMethod.equals("post")) {
                return "creer_compte";
            }
        }
        
        // Actions spécifiques opérations
        if (lowerPath.startsWith("/api/operations")) {
            if (lowerPath.contains("/date-range")) {
                return "consulter_operations_periode";
            } else if (lowerPath.contains("/filter")) {
                return "filtrer_operations";
            } else if (lowerMethod.equals("post")) {
                return "creer_operation";
            } else if (lowerPath.matches("/api/operations/\\d+")) {
                if (lowerMethod.equals("put") || lowerMethod.equals("patch")) {
                    return "modifier_operation";
                } else if (lowerMethod.equals("delete")) {
                    return "supprimer_operation";
                }
            }
        }
        
        // Actions spécifiques service-balance
        if (lowerPath.startsWith("/api/service-balance")) {
            if (lowerPath.contains("/merge")) {
                return "fusionner_comptes_service";
            } else if (lowerPath.contains("/synchroniser")) {
                return "synchroniser_comptes";
            }
        }
        
        // Actions spécifiques impact-op
        if (lowerPath.startsWith("/api/impact-op")) {
            if (lowerPath.contains("/validate")) {
                return "valider_impact_op";
            } else if (lowerPath.contains("/delete-batch")) {
                return "supprimer_impacts_en_masse";
            } else if (lowerPath.matches("/api/impact-op/\\d+")) {
                if (lowerMethod.equals("put") || lowerMethod.equals("patch")) {
                    return "modifier_impact_op";
                } else if (lowerMethod.equals("delete")) {
                    return "supprimer_impact_op";
                }
            } else if (lowerMethod.equals("post")) {
                return "creer_impact_op";
            }
        }
        
        // Actions spécifiques auto-processing-models
        if (lowerPath.startsWith("/api/auto-processing-models")) {
            if (lowerPath.contains("/models/") && lowerPath.contains("/process")) {
                return "traiter_donnees_modele";
            } else if (lowerPath.contains("/models/") && lowerPath.contains("/column-rules")) {
                return lowerMethod.equals("post") ? "creer_regle_colonne" : 
                       lowerMethod.equals("put") ? "modifier_regle_colonne" : "supprimer_regle_colonne";
            } else if (lowerPath.contains("/models/")) {
                if (lowerMethod.equals("put") || lowerMethod.equals("patch")) {
                    return "modifier_modele";
                } else if (lowerMethod.equals("delete")) {
                    return "supprimer_modele";
                }
            } else if (lowerMethod.equals("post")) {
                return "creer_modele";
            }
        }
        
        // Actions génériques basées sur le chemin
        if (lowerPath.contains("/upload") || lowerPath.endsWith("upload")) return "uploader_fichier";
        if (lowerPath.contains("/download") || lowerPath.contains("/template") || lowerPath.endsWith("download") || lowerPath.endsWith("template")) return "telecharger_fichier";
        if (lowerPath.contains("/export") || lowerPath.endsWith("export")) return "exporter_donnees";
        if (lowerPath.contains("/import") || lowerPath.endsWith("import")) return "importer_donnees";
        if (lowerPath.contains("/bulk") || lowerPath.endsWith("bulk")) {
            return lowerMethod.equals("post") ? "creer_en_masse" :
                   lowerMethod.equals("put") ? "modifier_en_masse" :
                   lowerMethod.equals("delete") ? "supprimer_en_masse" : "action_en_masse";
        }
        if ((lowerPath.contains("/filter") || lowerPath.contains("/search")) && !lowerPath.contains("statistics")) {
            return "filtrer_donnees";
        }
        if (lowerPath.contains("/validate") || lowerPath.endsWith("validate")) return "valider";
        if (lowerPath.contains("/approve") || lowerPath.endsWith("approve")) return "approuver";
        if (lowerPath.contains("/reject") || lowerPath.endsWith("reject")) return "rejeter";
        if (lowerPath.contains("/reset") || lowerPath.endsWith("reset")) return "reinitialiser";
        if (lowerPath.contains("/annuler") || lowerPath.contains("/cancel") || lowerPath.endsWith("annuler") || lowerPath.endsWith("cancel")) return "annuler";
        
        // Actions standard basées sur la méthode HTTP et le contexte
        switch (lowerMethod) {
            case "get":
                // Pour les GET, on peut être plus précis selon le contexte
                if (lowerPath.contains("/all") || lowerPath.contains("/list")) {
                    return "consulter_liste";
                } else if (lowerPath.matches(".*/\\d+$")) {
                    return "consulter_detail";
                } else {
                    return "consulter";
                }
            case "post":
                return "creer";
            case "put":
            case "patch":
                return "modifier";
            case "delete":
                return "supprimer";
            default:
                return "action";
        }
    }
}

