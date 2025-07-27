package com.reconciliation.service;

import com.reconciliation.entity.UserEntity;
import com.reconciliation.entity.ProfilEntity;
import com.reconciliation.repository.UserRepository;
import com.reconciliation.repository.ProfilRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Optional;

@Service
public class UserProfilService {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private ProfilRepository profilRepository;
    
    /**
     * Associe automatiquement un profil par défaut à tous les utilisateurs qui n'en ont pas
     */
    @Transactional
    public void associateDefaultProfilsToUsers() {
        System.out.println("🔧 Association automatique des profils aux utilisateurs...");
        
        // Récupérer ou créer le profil ADMINISTRATEUR
        ProfilEntity adminProfil = getOrCreateProfil("ADMINISTRATEUR", "Profil administrateur avec tous les droits");
        
        // Récupérer ou créer le profil UTILISATEUR
        ProfilEntity userProfil = getOrCreateProfil("UTILISATEUR", "Profil utilisateur standard");
        
        // Récupérer tous les utilisateurs
        List<UserEntity> users = userRepository.findAll();
        
        int updatedCount = 0;
        
        for (UserEntity user : users) {
            if (user.getProfil() == null) {
                // Associer le profil ADMINISTRATEUR à l'utilisateur admin
                if ("admin".equals(user.getUsername())) {
                    user.setProfil(adminProfil);
                    System.out.println("✅ Utilisateur 'admin' associé au profil ADMINISTRATEUR");
                } else {
                    // Associer le profil UTILISATEUR aux autres utilisateurs
                    user.setProfil(userProfil);
                    System.out.println("✅ Utilisateur '" + user.getUsername() + "' associé au profil UTILISATEUR");
                }
                userRepository.save(user);
                updatedCount++;
            }
        }
        
        System.out.println("🎯 Association terminée : " + updatedCount + " utilisateur(s) mis à jour");
    }
    
    /**
     * Associe un profil spécifique à un utilisateur
     */
    @Transactional
    public boolean associateProfilToUser(String username, String profilName) {
        Optional<UserEntity> userOpt = userRepository.findByUsername(username);
        if (!userOpt.isPresent()) {
            System.out.println("❌ Utilisateur '" + username + "' non trouvé");
            return false;
        }
        
        ProfilEntity profil = profilRepository.findByNom(profilName);
        if (profil == null) {
            System.out.println("❌ Profil '" + profilName + "' non trouvé");
            return false;
        }
        
        UserEntity user = userOpt.get();
        user.setProfil(profil);
        userRepository.save(user);
        
        System.out.println("✅ Utilisateur '" + username + "' associé au profil '" + profilName + "'");
        return true;
    }
    
    /**
     * Récupère ou crée un profil avec le nom et la description donnés
     */
    private ProfilEntity getOrCreateProfil(String nom, String description) {
        ProfilEntity profil = profilRepository.findByNom(nom);
        if (profil == null) {
            profil = new ProfilEntity();
            profil.setNom(nom);
            profil.setDescription(description);
            profil = profilRepository.save(profil);
            System.out.println("📝 Profil '" + nom + "' créé avec l'ID: " + profil.getId());
        }
        return profil;
    }
    
    /**
     * Vérifie si tous les utilisateurs ont un profil associé
     */
    public boolean checkAllUsersHaveProfil() {
        List<UserEntity> users = userRepository.findAll();
        for (UserEntity user : users) {
            if (user.getProfil() == null) {
                System.out.println("⚠️ Utilisateur '" + user.getUsername() + "' n'a pas de profil associé");
                return false;
            }
        }
        System.out.println("✅ Tous les utilisateurs ont un profil associé");
        return true;
    }
    
    /**
     * Affiche le statut des associations utilisateur-profil
     */
    public void displayUserProfilStatus() {
        List<UserEntity> users = userRepository.findAll();
        System.out.println("\n📊 Statut des associations utilisateur-profil:");
        System.out.println("================================================");
        
        for (UserEntity user : users) {
            String profilName = user.getProfil() != null ? user.getProfil().getNom() : "AUCUN PROFIL";
            System.out.println("👤 " + user.getUsername() + " → " + profilName);
        }
        
        System.out.println("================================================\n");
    }
} 