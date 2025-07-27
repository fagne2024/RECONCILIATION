package com.reconciliation.service;

import com.reconciliation.entity.*;
import com.reconciliation.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.Optional;

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
    private EntityManager entityManager;

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
        
        // TODO: Vérifier si le profil est utilisé par des utilisateurs
        // Si oui, empêcher la suppression
        
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

    // Attribution de permissions à un profil
    public ProfilPermissionEntity addPermissionToProfil(Long profilId, Long moduleId, Long permissionId) {
        ProfilEntity profil = profilRepository.findById(profilId).orElseThrow();
        ModuleEntity module = moduleRepository.findById(moduleId).orElseThrow();
        PermissionEntity permission = permissionRepository.findById(permissionId).orElseThrow();
        ProfilPermissionEntity pp = new ProfilPermissionEntity();
        pp.setProfil(profil);
        pp.setModule(module);
        pp.setPermission(permission);
        return profilPermissionRepository.save(pp);
    }

    public void removePermissionFromProfil(Long profilPermissionId) {
        profilPermissionRepository.deleteById(profilPermissionId);
    }

    public List<ProfilPermissionEntity> getPermissionsForProfil(Long profilId) {
        return profilPermissionRepository.findAll().stream()
            .filter(pp -> pp.getProfil().getId().equals(profilId))
            .toList();
    }

    // Actions disponibles pour un module
    public List<PermissionEntity> getPermissionsForModule(Long moduleId) {
        List<ModulePermissionEntity> modulePermissions = modulePermissionRepository.findByModuleId(moduleId);
        
        // Si des permissions spécifiques sont définies pour ce module, les retourner
        if (!modulePermissions.isEmpty()) {
            return modulePermissions.stream()
                .map(ModulePermissionEntity::getPermission)
                .toList();
        }
        
        // Sinon, retourner toutes les permissions disponibles
        return permissionRepository.findAll();
    }
} 