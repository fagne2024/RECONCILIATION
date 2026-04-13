package com.reconciliation.service;

import com.reconciliation.entity.ProfilPermissionEntity;
import com.reconciliation.entity.UserEntity;
import com.reconciliation.entity.ModuleEntity;
import com.reconciliation.entity.PermissionEntity;
import com.reconciliation.repository.ProfilPermissionRepository;
import com.reconciliation.repository.UserRepository;
import com.reconciliation.repository.ModuleRepository;
import com.reconciliation.repository.PermissionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class PermissionCheckService {

    @Autowired
    private ProfilPermissionRepository profilPermissionRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ModuleRepository moduleRepository;

    @Autowired
    private PermissionRepository permissionRepository;

    @Autowired
    private PermissionGeneratorService permissionGeneratorService;

    /**
     * Vérifie si un utilisateur a une permission spécifique pour un module spécifique
     * @param username Le nom d'utilisateur
     * @param moduleName Le nom du module
     * @param permissionName Le nom de la permission
     * @return true si l'utilisateur a la permission, false sinon
     */
    public boolean hasPermission(String username, String moduleName, String permissionName) {
        // Si l'utilisateur est admin, il a toutes les permissions
        if ("admin".equals(username)) {
            return true;
        }

        // Trouver l'utilisateur
        Optional<UserEntity> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            return false;
        }

        UserEntity user = userOpt.get();
        
        // Vérifier si le profil est administrateur
        if (user.getProfil() != null && user.getProfil().getNom() != null) {
            String profilNom = user.getProfil().getNom().toUpperCase();
            if (profilNom.equals("ADMIN") || profilNom.equals("ADMINISTRATEUR")) {
                return true;
            }
        }
        
        if (user.getProfil() == null || user.getProfil().getId() == null) {
            return false;
        }

        Long profilId = user.getProfil().getId();

        // Trouver le module
        ModuleEntity module = moduleRepository.findByNom(moduleName);
        if (module == null || module.getId() == null) {
            return false;
        }

        // Trouver la permission
        PermissionEntity permission = permissionRepository.findByNom(permissionName);
        if (permission == null || permission.getId() == null) {
            return false;
        }

        // Vérifier si l'association profil-module-permission existe
        List<ProfilPermissionEntity> allPermissions = profilPermissionRepository.findAll();
        return allPermissions.stream()
            .anyMatch(pp -> 
                pp.getProfil() != null && 
                pp.getProfil().getId() != null &&
                pp.getProfil().getId().equals(profilId) &&
                pp.getModule() != null && 
                pp.getModule().getId() != null &&
                pp.getModule().getId().equals(module.getId()) &&
                pp.getPermission() != null && 
                pp.getPermission().getId() != null &&
                pp.getPermission().getId().equals(permission.getId())
            );
    }

    /**
     * Vérifie si un utilisateur a une permission pour un module basé sur le chemin de l'API
     * @param username Le nom d'utilisateur
     * @param apiPath Le chemin de l'API (ex: /api/operations)
     * @param httpMethod La méthode HTTP (GET, POST, PUT, DELETE)
     * @return true si l'utilisateur a la permission, false sinon
     */
    public boolean hasPermissionForApiPath(String username, String apiPath, String httpMethod) {
        return hasPermissionForApiPath(username, apiPath, httpMethod, null, null);
    }

    public boolean hasPermissionForApiPath(String username, String apiPath, String httpMethod, String moduleOverride, String permissionOverride) {
        // Si l'utilisateur est admin, il a toutes les permissions
        if ("admin".equals(username)) {
            return true;
        }
        
        // Vérifier si l'utilisateur a un profil administrateur
        Optional<UserEntity> userOpt = userRepository.findByUsername(username);
        if (userOpt.isPresent()) {
            UserEntity user = userOpt.get();
            if (user.getProfil() != null && user.getProfil().getNom() != null) {
                String profilNom = user.getProfil().getNom().toUpperCase();
                if (profilNom.equals("ADMIN") || profilNom.equals("ADMINISTRATEUR")) {
                    return true;
                }
            }
        }

        // Mapper le chemin API vers le module
        String moduleName = resolveModuleForApiPath(apiPath, httpMethod, moduleOverride);
        if (moduleName == null) {
            // Si le module n'est pas mappé, autoriser par défaut (pour éviter de bloquer les nouvelles routes)
            System.out.println("⚠️ Module non mappé pour le chemin: " + apiPath + " - Autorisation par défaut");
            return true;
        }

        // Mapper la méthode HTTP vers la permission
        String permissionName = resolvePermissionForApiPath(apiPath, httpMethod, moduleOverride, permissionOverride);
        if (permissionName == null) {
            // Si la permission n'est pas mappée, autoriser par défaut
            System.out.println("⚠️ Permission non mappée pour " + httpMethod + " sur " + apiPath + " - Autorisation par défaut");
            return true;
        }

        return hasPermission(username, moduleName, permissionName);
    }

    public String resolveModuleForApiPath(String apiPath) {
        return resolveModuleForApiPath(apiPath, null, null);
    }

    public String resolveModuleForApiPath(String apiPath, String httpMethod) {
        return resolveModuleForApiPath(apiPath, httpMethod, null);
    }

    public String resolveModuleForApiPath(String apiPath, String httpMethod, String moduleOverride) {
        if (moduleOverride != null && !moduleOverride.isBlank()) {
            return moduleOverride;
        }
        String dashboardModule = mapDashboardReadApiPathToModule(apiPath, httpMethod);
        if (dashboardModule != null) {
            return dashboardModule;
        }
        return mapApiPathToModule(apiPath);
    }

    public String resolvePermissionForApiPath(String apiPath, String httpMethod) {
        return resolvePermissionForApiPath(apiPath, httpMethod, null, null);
    }

    public String resolvePermissionForApiPath(String apiPath, String httpMethod, String moduleOverride, String permissionOverride) {
        if (permissionOverride != null && !permissionOverride.isBlank()) {
            return permissionOverride;
        }

        if (moduleOverride != null && !moduleOverride.isBlank() && "GET".equalsIgnoreCase(httpMethod)) {
            return "consulter";
        }

        String moduleName = resolveModuleForApiPath(apiPath, httpMethod, moduleOverride);
        if (moduleName == null) {
            return null;
        }

        String generatedPermission = findGeneratedPermissionForApiPath(moduleName, apiPath, httpMethod);
        if (generatedPermission != null) {
            return generatedPermission;
        }

        return mapHttpMethodToPermission(apiPath, httpMethod);
    }

    /**
     * Mappe un chemin d'API vers un nom de module
     */
    private String mapApiPathToModule(String apiPath) {
        if (apiPath == null) return null;

        if (apiPath.startsWith("/api/statistics/dashboard-metrics")) return "Dashboard";
        if (apiPath.startsWith("/api/statistics/filter-options")) return "Dashboard";
        if (apiPath.startsWith("/api/statistics/detailed-metrics")) return "Dashboard";
        if (apiPath.startsWith("/api/statistics/transaction-created-stats")) return "Dashboard";
        if (apiPath.startsWith("/api/operations")) return "Opérations";
        if (apiPath.startsWith("/api/operations-bancaires")) return "Opérations";
        if (apiPath.startsWith("/api/comptes")) return "Comptes";
        if (apiPath.startsWith("/api/releve-bancaire")) return "BANQUE";
        if (apiPath.startsWith("/api/frais")) return "Frais";
        if (apiPath.startsWith("/api/frais-transaction")) return "Frais";
        if (apiPath.startsWith("/api/commission")) return "Frais";
        if (apiPath.startsWith("/api/reconciliation")) return "Réconciliation";
        if (apiPath.startsWith("/api/reconciliation-launcher")) return "Réconciliation";
        if (apiPath.startsWith("/api/stats")) return "Statistiques";
        if (apiPath.startsWith("/api/statistics")) return "Statistiques";
        if (apiPath.startsWith("/api/ranking")) return "Classements";
        if (apiPath.startsWith("/api/ecart-solde")) return "TSOP";
        if (apiPath.startsWith("/api/trx-sf")) return "TRX SF";
        if (apiPath.startsWith("/api/impact-op")) return "Impact OP";
        if (apiPath.startsWith("/api/service-balance")) return "Service Balance";
        if (apiPath.startsWith("/api/banque")) return "BANQUE";
        if (apiPath.startsWith("/api/banque-dashboard")) return "Dashboard";
        if (apiPath.startsWith("/api/comptabilite")) return "Comptabilité";
        if (apiPath.startsWith("/api/auto-processing-models")) return "Modèles";
        if (apiPath.startsWith("/api/auto-processing")) return "Modèles";
        if (apiPath.startsWith("/api/profils")) return "Profil";
        if (apiPath.startsWith("/api/users")) return "Utilisateur";
        if (apiPath.startsWith("/api/log-utilisateur")) return "Log utilisateur";
        if (apiPath.startsWith("/api/dashboard")) return "Dashboard";
        if (apiPath.startsWith("/api/traitement")) return "Traitement";
        if (apiPath.startsWith("/api/results")) return "Résultats";
        if (apiPath.startsWith("/api/reconciliation-report")) return "Résultats";
        if (apiPath.startsWith("/api/result8rec")) return "Résultats";
        if (apiPath.startsWith("/api/report-dashboard")) return "Résultats";
        if (apiPath.startsWith("/api/service-references")) return "Dashboard";
        if (apiPath.startsWith("/api/aide")) return "AIDE";
        
        return null;
    }

    private String mapDashboardReadApiPathToModule(String apiPath, String httpMethod) {
        if (apiPath == null || httpMethod == null || !"GET".equalsIgnoreCase(httpMethod)) {
            return null;
        }

        String normalizedPath = normalizeApiPath(apiPath);
        if (normalizedPath.equals("/api/result8rec")) return "Dashboard";
        if (normalizedPath.equals("/api/result8rec/filters")) return "Dashboard";
        if (normalizedPath.equals("/api/reconciliation-report/manual-trx/range")) return "Dashboard";
        if (normalizedPath.equals("/api/agency-summary/all")) return "Dashboard";
        if (normalizedPath.equals("/api/operations")) return "Dashboard";
        if (normalizedPath.equals("/api/comptes")) return "Dashboard";

        return null;
    }

    /**
     * Mappe une méthode HTTP vers un nom de permission
     */
    private String mapHttpMethodToPermission(String apiPath, String httpMethod) {
        if (apiPath == null || httpMethod == null) return null;

        String lowerPath = apiPath.toLowerCase();
        String lowerMethod = httpMethod.toLowerCase();

        // Actions spéciales basées sur le chemin (uniquement pour les chemins spécifiques)
        // Note: Les chemins contenant "statistics" ou "stats" doivent utiliser la permission standard selon la méthode HTTP
        if (lowerPath.contains("/upload") || lowerPath.endsWith("upload")) return "importer";
        if (lowerPath.contains("/download") || lowerPath.contains("/template") || lowerPath.contains("/export") || lowerPath.endsWith("download") || lowerPath.endsWith("template") || lowerPath.endsWith("export")) return "exporter";
        if ((lowerPath.contains("/filter") || lowerPath.contains("/search")) && !lowerPath.contains("statistics")) return "filtrer";
        if (lowerPath.contains("/bulk") || lowerPath.endsWith("bulk")) return "bulk";
        if (lowerPath.contains("/recent") || lowerPath.endsWith("recent")) return "consulter_recent";
        if (lowerPath.contains("/mark-ok") || lowerPath.contains("/mark") || lowerPath.endsWith("mark-ok") || lowerPath.endsWith("mark")) return "marquer_ok";
        if (lowerPath.contains("/reconcil") || lowerPath.endsWith("reconcil")) return "lancer_reconciliation";
        if (lowerPath.contains("/import") || lowerPath.endsWith("import")) return "importer";
        if (lowerPath.contains("/export") || lowerPath.endsWith("export")) return "exporter";
        if (lowerPath.contains("/validate") || lowerPath.endsWith("validate")) return "valider";
        if (lowerPath.contains("/approve") || lowerPath.endsWith("approve")) return "approuver";
        if (lowerPath.contains("/reject") || lowerPath.endsWith("reject")) return "rejeter";
        if (lowerPath.contains("/reset") || lowerPath.endsWith("reset")) return "reinitialiser";
        if (lowerPath.contains("/annuler") || lowerPath.contains("/cancel") || lowerPath.endsWith("annuler") || lowerPath.endsWith("cancel")) return "annuler";

        switch (lowerMethod) {
            case "get":
                return "consulter";
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

    private String findGeneratedPermissionForApiPath(String moduleName, String apiPath, String httpMethod) {
        List<Map<String, Object>> actions = permissionGeneratorService.getActionsForModule(moduleName);
        String normalizedPath = normalizeApiPath(apiPath);

        return actions.stream()
            .filter(action -> httpMethod != null && httpMethod.equalsIgnoreCase((String) action.get("httpMethod")))
            .filter(action -> pathMatchesTemplate(normalizedPath, (String) action.get("path")))
            .sorted(Comparator.<Map<String, Object>>comparingInt(action -> ((String) action.get("path")).length()).reversed())
            .map(action -> (String) action.get("action"))
            .filter(actionName -> actionName != null && !actionName.isBlank())
            .findFirst()
            .orElse(null);
    }

    private String normalizeApiPath(String apiPath) {
        if (apiPath == null || apiPath.isBlank()) {
            return "";
        }

        String normalized = apiPath.split("\\?")[0].trim();
        if (normalized.endsWith("/") && normalized.length() > 1) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }

    private boolean pathMatchesTemplate(String actualPath, String templatePath) {
        String normalizedTemplate = normalizeApiPath(templatePath);
        String normalizedActual = normalizeApiPath(actualPath);

        String[] templateSegments = normalizedTemplate.split("/");
        String[] actualSegments = normalizedActual.split("/");

        if (templateSegments.length != actualSegments.length) {
            return false;
        }

        for (int i = 0; i < templateSegments.length; i++) {
            String templateSegment = templateSegments[i];
            String actualSegment = actualSegments[i];

            if (templateSegment.startsWith("{") && templateSegment.endsWith("}")) {
                if (actualSegment == null || actualSegment.isBlank()) {
                    return false;
                }
                continue;
            }

            if (!templateSegment.equalsIgnoreCase(actualSegment)) {
                return false;
            }
        }

        return true;
    }
}

