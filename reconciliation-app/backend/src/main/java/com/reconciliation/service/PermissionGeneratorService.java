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
     * Cette méthode fait une analyse plus approfondie pour extraire toutes les actions spécifiques
     */
    private String determineActionType(String path, String methodName, String defaultAction) {
        String lowerPath = path.toLowerCase();
        String lowerMethodName = methodName.toLowerCase();
        
        // Construire le nom d'action spécifique basé sur le chemin et la méthode
        StringBuilder actionBuilder = new StringBuilder();

        // Analyser le chemin pour extraire les segments d'action
        String[] pathSegments = lowerPath.split("/");
        List<String> actionSegments = new ArrayList<>();
        
        // Extraire les segments significatifs du chemin
        for (String segment : pathSegments) {
            segment = segment.trim();
            if (segment.isEmpty() || segment.matches("\\{[^}]+\\}") || segment.matches("\\d+")) {
                continue; // Ignorer les paramètres et IDs numériques
            }
            
            // Ajouter les segments significatifs
            if (segment.length() > 0) {
                actionSegments.add(segment);
            }
        }
        
        // Analyser les actions spécifiques dans le chemin
        String specificAction = extractSpecificAction(lowerPath, lowerMethodName, defaultAction);
        
        // Si on a une action spécifique, l'utiliser
        if (specificAction != null && !specificAction.isEmpty()) {
            return specificAction;
        }
        
        // Sinon, construire l'action à partir des segments
        if (!actionSegments.isEmpty()) {
            // Prendre le dernier segment significatif comme action spécifique
            String lastSegment = actionSegments.get(actionSegments.size() - 1);
            
            // Combiner avec l'action de base
            String baseAction = getBaseAction(defaultAction);
            if (!lastSegment.equals(baseAction) && !lastSegment.equals("liste") && !lastSegment.equals("list")) {
                return baseAction + "_" + lastSegment;
            }
        }
        
        // Actions standard
        return getBaseAction(defaultAction);
    }
    
    /**
     * Extrait une action spécifique basée sur des patterns connus
     */
    private String extractSpecificAction(String lowerPath, String lowerMethodName, String defaultAction) {
        // Patterns d'upload/import
        if (lowerPath.contains("upload") || lowerMethodName.contains("upload")) {
            if (lowerPath.contains("operations")) {
                return "importer_operations";
            } else if (lowerPath.contains("operations-bancaires")) {
                return "importer_operations_bancaires";
            } else if (lowerPath.contains("reconciliation")) {
                return "importer_fichier_reconciliation";
            }
            return "importer";
        }
        
        // Patterns de template/download
        if (lowerPath.contains("template") || lowerPath.contains("download")) {
            if (lowerPath.contains("operations")) {
                return "telecharger_template_operations";
            } else if (lowerPath.contains("operations-bancaires")) {
                return "telecharger_template_operations_bancaires";
            }
            return "telecharger_template";
        }
        
        // Patterns de création spécifiques
        if (lowerMethodName.contains("create") || lowerPath.contains("create") || defaultAction.equals("create")) {
            if (lowerPath.contains("manual-from-form") || lowerMethodName.contains("form")) {
                return "creer_operation_formulaire";
            } else if (lowerPath.contains("manual-with-four-operations") || lowerMethodName.contains("four")) {
                return "creer_operation_quatre_operations";
            } else if (lowerPath.contains("operation") && !lowerPath.contains("operations")) {
                return "creer_operation";
            } else if (lowerPath.contains("operations-bancaires")) {
                return "creer_operation_bancaire";
            } else if (lowerPath.contains("compte")) {
                return "creer_compte";
            } else if (lowerPath.contains("profil")) {
                return "creer_profil";
            } else if (lowerPath.contains("module")) {
                return "creer_module";
            } else if (lowerPath.contains("permission")) {
                return "creer_permission";
            }
        }
        
        // Patterns de modification spécifiques
        if (lowerMethodName.contains("update") || lowerPath.contains("update") || defaultAction.equals("update")) {
            if (lowerPath.contains("statut") || lowerMethodName.contains("statut")) {
                if (lowerPath.contains("bulk")) {
                    return "modifier_statut_bulk";
                }
                return "modifier_statut";
            } else if (lowerPath.contains("recon-status") || lowerMethodName.contains("recon")) {
                return "modifier_statut_reconciliation";
            } else if (lowerPath.contains("validate") || lowerMethodName.contains("validate")) {
                return "valider_operation";
            } else if (lowerPath.contains("reject") || lowerMethodName.contains("reject")) {
                return "rejeter_operation";
            } else if (lowerPath.contains("cancel") || lowerMethodName.contains("cancel")) {
                return "annuler_operation";
            }
        }
        
        // Patterns de réconciliation
        if (lowerPath.contains("mark-ok")) {
            if (lowerPath.contains("bulk")) {
                return "marquer_ok_bulk";
            } else if (lowerPath.contains("unmark")) {
                return "annuler_marquer_ok_bulk";
            }
            return "marquer_ok";
        }
        
        if (lowerPath.contains("unmark-ok")) {
            return "annuler_marquer_ok";
        }
        
        if (lowerPath.contains("status") && defaultAction.equals("create")) {
            if (lowerPath.contains("bulk")) {
                return "enregistrer_statut_bulk";
            }
            return "enregistrer_statut_reconciliation";
        }
        
        if (lowerPath.contains("reconcile") || lowerMethodName.contains("reconcile")) {
            return "lancer_reconciliation";
        }
        
        if (lowerPath.contains("execute-magic") || lowerMethodName.contains("magic")) {
            return "executer_reconciliation_magique";
        }
        
        if (lowerPath.contains("analyze-keys") || lowerMethodName.contains("analyze")) {
            return "analyser_cles_reconciliation";
        }
        
        if (lowerPath.contains("save-summary") || lowerMethodName.contains("summary")) {
            return "sauvegarder_resume_reconciliation";
        }
        
        // Patterns de filtrage/recherche
        if (lowerPath.contains("filter") || lowerMethodName.contains("filter")) {
            if (lowerPath.contains("operations")) {
                return "filtrer_operations";
            } else if (lowerPath.contains("operations-bancaires")) {
                return "filtrer_operations_bancaires";
            }
            return "filtrer";
        }
        
        // Patterns de statistiques
        if (lowerPath.contains("stats") || lowerPath.contains("statistiques") || lowerMethodName.contains("stat")) {
            if (lowerPath.contains("by-type")) {
                if (lowerPath.contains("filtered")) {
                    return "consulter_statistiques_par_type_filtre";
                }
                return "consulter_statistiques_par_type";
            }
            return "consulter_statistiques";
        }
        
        // Patterns de suppression
        if (lowerMethodName.contains("delete") || lowerPath.contains("delete") || defaultAction.equals("delete")) {
            if (lowerPath.contains("batch") || lowerMethodName.contains("batch")) {
                return "supprimer_operations_batch";
            }
            return "supprimer";
        }
        
        // Patterns de lecture spécifiques
        if (lowerPath.contains("with-frais") || lowerMethodName.contains("frais")) {
            return "consulter_avec_frais";
        }
        
        if (lowerPath.contains("recent") || lowerMethodName.contains("recent")) {
            return "consulter_recent";
        }
        
        if (lowerPath.contains("progress") || lowerMethodName.contains("progress")) {
            return "consulter_progression_reconciliation";
        }
        
        if (lowerPath.contains("results") || lowerMethodName.contains("result")) {
            return "consulter_resultats_reconciliation";
        }
        
        if (lowerPath.contains("ok-keys")) {
            return "consulter_cles_ok";
        }
        
        if (lowerPath.contains("status") && defaultAction.equals("read")) {
            return "consulter_statuts_reconciliation";
        }
        
        // Patterns de synchronisation
        if (lowerPath.contains("synchronize") || lowerMethodName.contains("synchronize")) {
            return "synchroniser_soldes";
        }
        
        if (lowerPath.contains("recalculate") || lowerMethodName.contains("recalculate")) {
            return "recalculer_solde_cloture";
        }
        
        // Patterns de correction
        if (lowerPath.contains("correct") || lowerMethodName.contains("correct")) {
            return "corriger_frais";
        }
        
        // Patterns de can-process/solde-impact
        if (lowerPath.contains("can-process") || lowerMethodName.contains("canprocess")) {
            return "verifier_traitement_operation";
        }
        
        if (lowerPath.contains("solde-impact") || lowerMethodName.contains("soldeimpact")) {
            return "calculer_impact_solde";
        }
        
        return null; // Pas d'action spécifique trouvée
    }
    
    /**
     * Retourne l'action de base selon le type HTTP
     */
    private String getBaseAction(String defaultAction) {
        switch (defaultAction) {
            case "read":
                return "consulter";
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
     * Analyse tous les contrôleurs et retourne toutes les actions disponibles par module
     * Cette méthode fournit une vue détaillée de toutes les actions possibles
     */
    public Map<String, Object> analyzeAllModuleActions() {
        Map<String, Object> result = new HashMap<>();
        Map<String, List<Map<String, Object>>> moduleActions = new HashMap<>();
        
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
                            continue;
                        }
                        
                        // Ajouter l'action au module correspondant
                        moduleActions.computeIfAbsent(permInfo.moduleName, k -> new ArrayList<>())
                            .add(Map.of(
                                "action", permInfo.permissionName,
                                "httpMethod", permInfo.httpMethod,
                                "path", permInfo.path,
                                "controller", controllerClass.getSimpleName(),
                                "method", method.getName()
                            ));
                    }
                } catch (Exception e) {
                    System.err.println("Erreur lors de l'analyse de la méthode " + method.getName() + ": " + e.getMessage());
                }
            }
        }
        
        // Compter les actions par module
        Map<String, Integer> actionCounts = new HashMap<>();
        for (Map.Entry<String, List<Map<String, Object>>> entry : moduleActions.entrySet()) {
            actionCounts.put(entry.getKey(), entry.getValue().size());
        }
        
        result.put("modules", moduleActions);
        result.put("actionCounts", actionCounts);
        result.put("totalModules", moduleActions.size());
        result.put("totalActions", moduleActions.values().stream().mapToInt(List::size).sum());
        
        return result;
    }
    
    /**
     * Retourne toutes les actions disponibles pour un module spécifique
     */
    public List<Map<String, Object>> getActionsForModule(String moduleName) {
        Map<String, Object> allActions = analyzeAllModuleActions();
        @SuppressWarnings("unchecked")
        Map<String, List<Map<String, Object>>> modules = (Map<String, List<Map<String, Object>>>) allActions.get("modules");
        
        return modules.getOrDefault(moduleName, new ArrayList<>());
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

