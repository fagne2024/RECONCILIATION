package com.reconciliation.service;

import com.reconciliation.entity.ModuleEntity;
import com.reconciliation.entity.PermissionEntity;
import com.reconciliation.entity.ModulePermissionEntity;
import com.reconciliation.repository.ModuleRepository;
import com.reconciliation.repository.PermissionRepository;
import com.reconciliation.repository.ModulePermissionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.lang.reflect.Method;
import java.util.*;

@Service
public class PermissionGeneratorService {

    @Autowired
    private ApplicationContext applicationContext;

    @Autowired
    private PermissionRepository permissionRepository;

    @Autowired
    private ModuleRepository moduleRepository;
    
    @Autowired
    private ModulePermissionRepository modulePermissionRepository;

    /**
     * Génère automatiquement les permissions pour tous les modules
     * en analysant les contrôleurs Spring
     */
    @Transactional
    public Map<String, Object> generatePermissionsForAllModules() {
        Map<String, Object> result = new HashMap<>();
        List<String> createdPermissions = new ArrayList<>();
        List<String> skippedPermissions = new ArrayList<>();
        int totalCreated = 0;

        // Cartographie des chemins d'API vers les noms de modules
        Map<String, String> apiToModuleMap = createApiToModuleMapping();

        // Obtenir tous les contrôleurs
        Map<String, Object> controllers = applicationContext.getBeansWithAnnotation(RestController.class);

        for (Object controller : controllers.values()) {
            Class<?> controllerClass = controller.getClass();
            
            // Ignorer les classes proxy Spring
            if (controllerClass.getName().contains("$")) {
                controllerClass = controllerClass.getSuperclass();
            }
            
            // Obtenir le RequestMapping de la classe
            RequestMapping classMapping = controllerClass.getAnnotation(RequestMapping.class);
            String basePath = classMapping != null && classMapping.value().length > 0 
                ? classMapping.value()[0] 
                : "";

            // Analyser toutes les méthodes avec des annotations de mapping
            Method[] methods = controllerClass.getDeclaredMethods();
            for (Method method : methods) {
                try {
                    List<PermissionInfo> permissions = extractPermissionsFromMethod(method, basePath, apiToModuleMap);
                    
                    for (PermissionInfo permInfo : permissions) {
                        if (permInfo.moduleName == null || permInfo.permissionName == null) {
                            continue; // Ignorer si pas de module ou permission associée
                        }

                        // Trouver ou créer le module
                        ModuleEntity module = moduleRepository.findByNom(permInfo.moduleName);
                        if (module == null) {
                            // Créer le module s'il n'existe pas
                            module = new ModuleEntity();
                            module.setNom(permInfo.moduleName);
                            module = moduleRepository.save(module);
                        }

                        // Vérifier si la permission existe déjà
                        PermissionEntity permission = permissionRepository.findByNom(permInfo.permissionName);
                        if (permission == null) {
                            // Créer la nouvelle permission
                            PermissionEntity newPermission = new PermissionEntity();
                            newPermission.setNom(permInfo.permissionName);
                            permission = permissionRepository.save(newPermission);
                            createdPermissions.add(permInfo.permissionName + " (Module: " + permInfo.moduleName + ", Path: " + permInfo.path + ")");
                            totalCreated++;
                        }
                        
                        // Utiliser une référence finale pour la lambda
                        final PermissionEntity finalPermission = permission;
                        final ModuleEntity finalModule = module;
                        
                        // Vérifier si l'association module-permission existe déjà
                        boolean associationExists = modulePermissionRepository.findByModuleId(finalModule.getId()).stream()
                            .anyMatch(mp -> mp.getPermission() != null && mp.getPermission().getId().equals(finalPermission.getId()));
                        
                        if (!associationExists) {
                            // Créer l'association module-permission
                            ModulePermissionEntity modulePermission = new ModulePermissionEntity();
                            modulePermission.setModule(finalModule);
                            modulePermission.setPermission(finalPermission);
                            modulePermissionRepository.save(modulePermission);
                        }
                    }
                } catch (Exception e) {
                    System.err.println("Erreur lors de l'analyse de la méthode " + method.getName() + ": " + e.getMessage());
                }
            }
        }

        result.put("totalCreated", totalCreated);
        result.put("createdPermissions", createdPermissions);
        result.put("skippedPermissions", skippedPermissions);
        result.put("message", "Génération des permissions terminée. " + totalCreated + " nouvelle(s) permission(s) créée(s).");

        return result;
    }

    /**
     * Extrait les permissions d'une méthode de contrôleur
     */
    private List<PermissionInfo> extractPermissionsFromMethod(Method method, String basePath, Map<String, String> apiToModuleMap) {
        List<PermissionInfo> permissions = new ArrayList<>();

        // Analyser les annotations de mapping
        GetMapping getMapping = method.getAnnotation(GetMapping.class);
        PostMapping postMapping = method.getAnnotation(PostMapping.class);
        PutMapping putMapping = method.getAnnotation(PutMapping.class);
        DeleteMapping deleteMapping = method.getAnnotation(DeleteMapping.class);
        PatchMapping patchMapping = method.getAnnotation(PatchMapping.class);

        String methodPath = "";
        String httpMethod = "";
        String actionType = "";

        if (getMapping != null) {
            methodPath = getMapping.value().length > 0 ? getMapping.value()[0] : "";
            httpMethod = "GET";
            actionType = determineActionType(methodPath, method.getName(), "read");
        } else if (postMapping != null) {
            methodPath = postMapping.value().length > 0 ? postMapping.value()[0] : "";
            httpMethod = "POST";
            actionType = determineActionType(methodPath, method.getName(), "create");
        } else if (putMapping != null) {
            methodPath = putMapping.value().length > 0 ? putMapping.value()[0] : "";
            httpMethod = "PUT";
            actionType = determineActionType(methodPath, method.getName(), "update");
        } else if (deleteMapping != null) {
            methodPath = deleteMapping.value().length > 0 ? deleteMapping.value()[0] : "";
            httpMethod = "DELETE";
            actionType = determineActionType(methodPath, method.getName(), "delete");
        } else if (patchMapping != null) {
            methodPath = patchMapping.value().length > 0 ? patchMapping.value()[0] : "";
            httpMethod = "PATCH";
            actionType = determineActionType(methodPath, method.getName(), "update");
        }

        if (httpMethod.isEmpty()) {
            return permissions; // Pas d'annotation de mapping HTTP
        }

        // Construire le chemin complet
        String fullPath = (basePath + methodPath).replace("//", "/");
        // Nettoyer le chemin des paramètres dynamiques pour la correspondance
        String cleanPath = fullPath.replaceAll("\\{[^}]+\\}", "");
        
        // Trouver le module correspondant
        String moduleName = findModuleForPath(cleanPath, apiToModuleMap);

        if (moduleName != null && actionType != null && !actionType.isEmpty()) {
            PermissionInfo permInfo = new PermissionInfo();
            permInfo.moduleName = moduleName;
            permInfo.permissionName = actionType;
            permInfo.httpMethod = httpMethod;
            permInfo.path = fullPath;
            permissions.add(permInfo);
        }

        return permissions;
    }

    /**
     * Détermine le type d'action basé sur le chemin et le nom de la méthode
     */
    private String determineActionType(String path, String methodName, String defaultAction) {
        String lowerPath = path.toLowerCase();
        String lowerMethodName = methodName.toLowerCase();

        // Actions spéciales
        if (lowerPath.contains("upload") || lowerMethodName.contains("upload")) {
            return "upload";
        }
        if (lowerPath.contains("download") || lowerPath.contains("template") || lowerPath.contains("export") || lowerMethodName.contains("download") || lowerMethodName.contains("export")) {
            return "download";
        }
        if (lowerPath.contains("filter") || lowerPath.contains("search") || lowerMethodName.contains("filter") || lowerMethodName.contains("search")) {
            return "filter";
        }
        if (lowerPath.contains("bulk") || lowerMethodName.contains("bulk")) {
            return "bulk";
        }
        if (lowerPath.contains("statistiques") || lowerPath.contains("stats") || lowerMethodName.contains("stat")) {
            return "statistiques";
        }
        if (lowerPath.contains("recent") || lowerMethodName.contains("recent")) {
            return "lire_recent";
        }
        if (lowerPath.contains("mark-ok") || lowerMethodName.contains("mark")) {
            return "marquer";
        }
        if (lowerPath.contains("reconcil") || lowerMethodName.contains("reconcil")) {
            return "reconcilier";
        }

        // Actions spéciales supplémentaires
        if (lowerPath.contains("import") || lowerMethodName.contains("import")) {
            return "importer";
        }
        if (lowerPath.contains("export") || lowerMethodName.contains("export")) {
            return "exporter";
        }
        if (lowerPath.contains("validate") || lowerMethodName.contains("validate")) {
            return "valider";
        }
        if (lowerPath.contains("approve") || lowerMethodName.contains("approve")) {
            return "approuver";
        }
        if (lowerPath.contains("reject") || lowerMethodName.contains("reject")) {
            return "rejeter";
        }
        if (lowerPath.contains("reset") || lowerMethodName.contains("reset")) {
            return "reinitialiser";
        }
        if (lowerPath.contains("annuler") || lowerMethodName.contains("annuler") || lowerMethodName.contains("cancel")) {
            return "annuler";
        }

        // Actions standard basées sur le chemin
        if (path.isEmpty() || path.equals("/")) {
            if (defaultAction.equals("read")) {
                return "lire";
            } else if (defaultAction.equals("create")) {
                return "creer";
            }
        }

        // Actions standard
        switch (defaultAction) {
            case "read":
                return "lire";
            case "create":
                return "creer";
            case "update":
                return "modifier";
            case "delete":
                return "supprimer";
            default:
                return defaultAction;
        }
    }

    /**
     * Trouve le module correspondant à un chemin d'API
     */
    private String findModuleForPath(String path, Map<String, String> apiToModuleMap) {
        // Vérifier les correspondances exactes d'abord
        for (Map.Entry<String, String> entry : apiToModuleMap.entrySet()) {
            if (path.startsWith(entry.getKey())) {
                return entry.getValue();
            }
        }
        return null;
    }

    /**
     * Crée la cartographie entre les chemins d'API et les modules
     */
    private Map<String, String> createApiToModuleMapping() {
        Map<String, String> mapping = new HashMap<>();
        
        // Mapping basé sur les routes de l'application
        mapping.put("/api/operations", "Opérations");
        mapping.put("/api/operations-bancaires", "Opérations");
        mapping.put("/api/comptes", "Comptes");
        mapping.put("/api/frais", "Frais");
        mapping.put("/api/commission", "Frais");
        mapping.put("/api/reconciliation", "Réconciliation");
        mapping.put("/api/reconciliation-launcher", "Réconciliation");
        mapping.put("/api/stats", "Statistiques");
        mapping.put("/api/statistics", "Statistiques");
        mapping.put("/api/ranking", "Classements");
        mapping.put("/api/ecart-solde", "TSOP");
        mapping.put("/api/trx-sf", "TRX SF");
        mapping.put("/api/impact-op", "Impact OP");
        mapping.put("/api/service-balance", "Service Balance");
        mapping.put("/api/banque", "BANQUE");
        mapping.put("/api/comptabilite", "Comptabilité");
        mapping.put("/api/auto-processing-models", "Modèles");
        mapping.put("/api/profils", "Profil");
        mapping.put("/api/users", "Utilisateur");
        mapping.put("/api/log-utilisateur", "Log utilisateur");
        mapping.put("/api/dashboard", "Dashboard");
        mapping.put("/api/traitement", "Traitement");
        mapping.put("/api/results", "Résultats");
        mapping.put("/api/reconciliation-report", "Résultats");
        mapping.put("/api/report-dashboard", "Résultats");
        mapping.put("/api/reconciliation-dashboard", "Dashboard");
        mapping.put("/api/banque-dashboard", "Dashboard");
        
        return mapping;
    }

    /**
     * Classe interne pour stocker les informations de permission
     */
    private static class PermissionInfo {
        String moduleName;
        String permissionName;
        String httpMethod;
        String path;
    }
}

