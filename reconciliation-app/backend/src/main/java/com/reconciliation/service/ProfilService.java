package com.reconciliation.service;

import com.reconciliation.entity.*;
import com.reconciliation.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.Optional;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ProfilService {
    @Autowired
    private ProfilRepository profilRepository;
    @Autowired
    private ModuleRepository moduleRepository;
    @Autowired
    private PermissionRepository permissionRepository;
    @Autowired
    private ProfilPermissionRepository profilPermissionRepository;
    @Autowired
    private ModulePermissionRepository modulePermissionRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private EntityManager entityManager;
    @Autowired
    private PermissionGeneratorService permissionGeneratorService;

    // CRUD Profil
    public List<ProfilEntity> getAllProfils() { return profilRepository.findAll(); }
    public Optional<ProfilEntity> getProfil(Long id) { return profilRepository.findById(id); }
    public ProfilEntity createProfil(ProfilEntity profil) { 
        return profilRepository.save(profil);
    }
    public ProfilEntity updateProfil(ProfilEntity profil) { 
        return profilRepository.save(profil);
    }
    @Transactional
    public void deleteProfil(Long id) {
        System.out.println("💾 Tentative de suppression du profil ID: " + id);

        // Vérifier si le profil existe
        if (!profilRepository.existsById(id)) {
            System.out.println("❌ Profil non trouvé avec l'ID: " + id);
            throw new RuntimeException("Profil non trouvé avec l'ID: " + id);
        }

        // Vérifier si le profil est utilisé par des utilisateurs
        List<UserEntity> usersWithProfil = userRepository.findByProfilId(id);
        if (!usersWithProfil.isEmpty()) {
            System.out.println("❌ Impossible de supprimer le profil: " + usersWithProfil.size() + " utilisateur(s) l'utilisent");
            String usernames = usersWithProfil.stream()
                .map(UserEntity::getUsername)
                .limit(5)
                .reduce((a, b) -> a + ", " + b)
                .orElse("");
            String message = "Impossible de supprimer ce profil car il est utilisé par " + usersWithProfil.size() + " utilisateur(s)";
            if (usersWithProfil.size() <= 5) {
                message += " : " + usernames;
            } else {
                message += " (incluant : " + usernames + ", ...)";
            }
            message += ". Veuillez d'abord réassigner ces utilisateurs à un autre profil.";
            throw new RuntimeException(message);
        }

        System.out.println("✅ Profil trouvé, suppression des permissions et actions associées...");

        // Supprimer d'abord les permissions associées au profil
        List<ProfilPermissionEntity> permissions = profilPermissionRepository.findAll().stream()
            .filter(pp -> pp.getProfil().getId().equals(id))
            .toList();

        System.out.println("🗑️ Suppression de " + permissions.size() + " permissions associées");
        profilPermissionRepository.deleteAll(permissions);

        // Supprimer les actions associées au profil (table profil_action)
        System.out.println("🗑️ Suppression des actions associées au profil");
        try {
            int deletedActions = entityManager.createNativeQuery("DELETE FROM profil_action WHERE profil_id = :profilId")
                .setParameter("profilId", id)
                .executeUpdate();
            System.out.println("🗑️ Suppression de " + deletedActions + " actions associées");
        } catch (Exception e) {
            System.out.println("⚠️ Aucune action à supprimer ou table inexistante: " + e.getMessage());
        }

        System.out.println("✅ Permissions et actions supprimées, suppression du profil...");

        profilRepository.deleteById(id);
        System.out.println("✅ Profil supprimé avec succès: ID " + id);
    }

    // Modules
    public List<ModuleEntity> getAllModules() { return moduleRepository.findAll(); }
    public ModuleEntity createModule(ModuleEntity module) { return moduleRepository.save(module); }
    public ModuleEntity updateModule(ModuleEntity module) { return moduleRepository.save(module); }
    @Transactional
    public void deleteModule(Long id) { 
        System.out.println("💾 Tentative de suppression du module ID: " + id);
        
        // Vérifier si le module existe
        if (!moduleRepository.existsById(id)) {
            System.out.println("❌ Module non trouvé avec l'ID: " + id);
            throw new RuntimeException("Module non trouvé avec l'ID: " + id);
        }
        
        System.out.println("✅ Module trouvé, suppression des permissions associées...");
        
        // Supprimer d'abord les permissions associées au module
        List<ProfilPermissionEntity> permissions = profilPermissionRepository.findAll().stream()
            .filter(pp -> pp.getModule().getId().equals(id))
            .toList();
        
        System.out.println("🗑️ Suppression de " + permissions.size() + " permissions associées");
        profilPermissionRepository.deleteAll(permissions);
        
        // Supprimer les associations module-permission
        List<ModulePermissionEntity> modulePermissions = modulePermissionRepository.findByModuleId(id);
        System.out.println("🗑️ Suppression de " + modulePermissions.size() + " associations module-permission");
        modulePermissionRepository.deleteAll(modulePermissions);
        
        System.out.println("✅ Permissions supprimées, suppression du module...");
        
        moduleRepository.deleteById(id);
        System.out.println("✅ Module supprimé avec succès: ID " + id);
    }

    // Permissions
    public List<PermissionEntity> getAllPermissions() { return permissionRepository.findAll(); }
    public PermissionEntity createPermission(PermissionEntity permission) { return permissionRepository.save(permission); }
    
    @Transactional
    public void deletePermission(Long id) {
        // Vérifier si la permission existe
        PermissionEntity permission = permissionRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Permission non trouvée avec l'ID: " + id));
        
        // Vérifier si la permission est utilisée dans des associations profil-permission-module
        // Charger toutes les associations et filtrer celles qui utilisent cette permission
        List<ProfilPermissionEntity> allAssociations = profilPermissionRepository.findAll();
        List<ProfilPermissionEntity> associations = allAssociations.stream()
            .filter(pp -> {
                // Forcer le chargement de la relation permission si nécessaire
                if (pp.getPermission() == null) {
                    return false;
                }
                // Comparer les IDs
                Long permissionId = pp.getPermission().getId();
                return permissionId != null && permissionId.equals(id);
            })
            .toList();
        
        if (!associations.isEmpty()) {
            throw new RuntimeException("Impossible de supprimer la permission '" + permission.getNom() + 
                "' car elle est utilisée dans " + associations.size() + " association(s) profil-module. " +
                "Veuillez d'abord supprimer ces associations.");
        }
        
        // Supprimer la permission
        permissionRepository.deleteById(id);
        System.out.println("✅ Permission '" + permission.getNom() + "' (ID: " + id + ") supprimée avec succès");
    }

    // Attribution de permissions à un profil
    @Transactional
    public ProfilPermissionEntity addPermissionToProfil(Long profilId, Long moduleId, Long permissionId) {
        // Vérifier si l'association existe déjà
        ProfilPermissionEntity existing = profilPermissionRepository.findAll().stream()
            .filter(pp -> pp.getProfil() != null && pp.getProfil().getId().equals(profilId) &&
                         pp.getModule() != null && pp.getModule().getId().equals(moduleId) &&
                         pp.getPermission() != null && pp.getPermission().getId().equals(permissionId))
            .findFirst()
            .orElse(null);
        
        if (existing != null) {
            // Retourner l'existant avec ses relations chargées
            return existing;
        }
        
        ProfilEntity profil = profilRepository.findById(profilId).orElseThrow();
        ModuleEntity module = moduleRepository.findById(moduleId).orElseThrow();
        PermissionEntity permission = permissionRepository.findById(permissionId).orElseThrow();
        ProfilPermissionEntity pp = new ProfilPermissionEntity();
        pp.setProfil(profil);
        pp.setModule(module);
        pp.setPermission(permission);
        ProfilPermissionEntity saved = profilPermissionRepository.save(pp);
        
        // Recharger avec les relations pour s'assurer qu'elles sont disponibles
        return profilPermissionRepository.findById(saved.getId()).orElse(saved);
    }

    /**
     * Ajoute plusieurs permissions à un profil en une seule transaction
     * @param profilId L'ID du profil
     * @param moduleId L'ID du module
     * @param permissionIds Liste des IDs des permissions à ajouter
     * @return Liste des ProfilPermissionEntity créées ou existantes
     */
    @Transactional
    public List<ProfilPermissionEntity> addMultiplePermissionsToProfil(Long profilId, Long moduleId, List<Long> permissionIds) {
        ProfilEntity profil = profilRepository.findById(profilId).orElseThrow(() -> new RuntimeException("Profil non trouvé avec l'ID: " + profilId));
        ModuleEntity module = moduleRepository.findById(moduleId).orElseThrow(() -> new RuntimeException("Module non trouvé avec l'ID: " + moduleId));
        
        List<ProfilPermissionEntity> result = new ArrayList<>();
        
        // Charger toutes les associations existantes pour ce profil et ce module
        List<ProfilPermissionEntity> existingPermissions = profilPermissionRepository.findAll().stream()
            .filter(pp -> pp.getProfil() != null && pp.getProfil().getId().equals(profilId) &&
                         pp.getModule() != null && pp.getModule().getId().equals(moduleId))
            .toList();
        
        for (Long permissionId : permissionIds) {
            // Vérifier si l'association existe déjà
            ProfilPermissionEntity existing = existingPermissions.stream()
                .filter(pp -> pp.getPermission() != null && pp.getPermission().getId().equals(permissionId))
                .findFirst()
                .orElse(null);
            
            if (existing != null) {
                result.add(existing);
            } else {
                PermissionEntity permission = permissionRepository.findById(permissionId)
                    .orElseThrow(() -> new RuntimeException("Permission non trouvée avec l'ID: " + permissionId));
                
                ProfilPermissionEntity pp = new ProfilPermissionEntity();
                pp.setProfil(profil);
                pp.setModule(module);
                pp.setPermission(permission);
                ProfilPermissionEntity saved = profilPermissionRepository.save(pp);
                result.add(saved);
            }
        }
        
        return result;
    }

    public void removePermissionFromProfil(Long profilPermissionId) {
        profilPermissionRepository.deleteById(profilPermissionId);
    }

    public List<ProfilPermissionEntity> getPermissionsForProfil(Long profilId) {
        // Charger toutes les permissions avec leurs relations
        List<ProfilPermissionEntity> allPermissions = profilPermissionRepository.findAll();
        // Filtrer par profil et s'assurer que les relations sont chargées
        return allPermissions.stream()
            .filter(pp -> pp.getProfil() != null && pp.getProfil().getId() != null && 
                         pp.getProfil().getId().equals(profilId))
            .filter(pp -> pp.getModule() != null && pp.getPermission() != null)
            .toList();
    }

    /**
     * Retourne les permissions disponibles pour un module.
     * Chaque module ne contient que les permissions réellement disponibles sur ce module
     * (définies par les endpoints/actions analysés dans le code).
     */
    public List<PermissionEntity> getPermissionsForModule(Long moduleId) {
        ModuleEntity module = moduleRepository.findById(moduleId).orElse(null);
        if (module == null || module.getNom() == null) {
            return List.of();
        }
        try {
            String moduleName = module.getNom();
            List<Map<String, Object>> actions = permissionGeneratorService.getActionsForModule(moduleName);
            Set<String> actionNames = actions.stream()
                .map(m -> (String) m.get("action"))
                .filter(name -> name != null && !name.isEmpty())
                .collect(Collectors.toSet());
            List<PermissionEntity> allPermissions = permissionRepository.findAll();
            return allPermissions.stream()
                .filter(p -> p.getNom() != null && actionNames.contains(p.getNom()))
                .toList();
        } catch (Exception e) {
            System.err.println("Erreur getPermissionsForModule(" + moduleId + "): " + e.getMessage());
            return List.of();
        }
    }

    /**
     * Retourne toutes les permissions groupées par module.
     * Chaque module ne contient que les permissions réellement disponibles sur ce module
     * (définies par les endpoints/actions analysés dans le code).
     * @return Map où la clé est le nom du module et la valeur est la liste des permissions
     */
    public Map<String, List<PermissionEntity>> getPermissionsGroupedByModule() {
        Map<String, List<PermissionEntity>> permissionsByModule = new HashMap<>();
        List<PermissionEntity> allPermissions = permissionRepository.findAll();
        try {
            Map<String, Object> analysis = permissionGeneratorService.analyzeAllModuleActions();
            @SuppressWarnings("unchecked")
            Map<String, List<Map<String, Object>>> modules = (Map<String, List<Map<String, Object>>>) analysis.get("modules");
            if (modules == null) {
                modules = new HashMap<>();
            }

            for (Map.Entry<String, List<Map<String, Object>>> entry : modules.entrySet()) {
                String moduleName = entry.getKey();
                Set<String> actionNames = entry.getValue().stream()
                    .map(m -> (String) m.get("action"))
                    .filter(name -> name != null && !name.isEmpty())
                    .collect(Collectors.toSet());

                List<PermissionEntity> permsForModule = allPermissions.stream()
                    .filter(p -> p.getNom() != null && actionNames.contains(p.getNom()))
                    .toList();

                if (!permsForModule.isEmpty()) {
                    permissionsByModule.put(moduleName, permsForModule);
                }
            }

            Set<String> allActionNames = modules.values().stream()
                .flatMap(list -> list.stream())
                .map(m -> (String) m.get("action"))
                .filter(name -> name != null && !name.isEmpty())
                .collect(Collectors.toSet());

            List<PermissionEntity> permissionsWithoutModule = allPermissions.stream()
                .filter(p -> p.getNom() != null && !allActionNames.contains(p.getNom()))
                .toList();

            if (!permissionsWithoutModule.isEmpty()) {
                permissionsByModule.put("Sans module", permissionsWithoutModule);
            }
        } catch (Exception e) {
            System.err.println("Erreur getPermissionsGroupedByModule: " + e.getMessage());
            e.printStackTrace();
        }
        return permissionsByModule;
    }
} 