package com.reconciliation.service;

import com.reconciliation.entity.ProfilPaysEntity;
import com.reconciliation.entity.UserEntity;
import com.reconciliation.repository.ProfilPaysRepository;
import com.reconciliation.repository.PaysRepository;
import com.reconciliation.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PaysFilterService {
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private ProfilPaysRepository profilPaysRepository;
    
    @Autowired
    private PaysRepository paysRepository;
    
    /**
     * Récupère les codes de pays autorisés pour un utilisateur
     * Retourne une liste vide si l'utilisateur n'a aucun pays autorisé
     * Retourne null si l'utilisateur a accès à GNL (tous les pays)
     */
    public List<String> getAllowedPaysCodes(String username) {
        try {
            if (username == null || username.isEmpty()) {
                System.out.println("⚠️ Username null ou vide, retour d'une liste vide");
                return new ArrayList<>();
            }
            
            // Vérifier si c'est l'admin (accès à tout)
            if ("admin".equalsIgnoreCase(username)) {
                System.out.println("✅ Admin détecté, accès à tous les pays");
                return null; // null signifie tous les pays
            }
            
            // Récupérer l'utilisateur
            UserEntity user = userRepository.findByUsername(username).orElse(null);
            if (user == null) {
                System.out.println("⚠️ Utilisateur non trouvé: " + username);
                return new ArrayList<>();
            }
            
            // Vérifier si le profil est administrateur
            if (user.getProfil() != null && user.getProfil().getNom() != null) {
                String profilNom = user.getProfil().getNom().toUpperCase();
                if (profilNom.equals("ADMIN") || profilNom.equals("ADMINISTRATEUR")) {
                    System.out.println("✅ Profil administrateur détecté pour " + username + ", accès à tous les pays");
                    return null; // null signifie tous les pays
                }
            }
            
            if (user.getProfil() == null || user.getProfil().getId() == null) {
                System.out.println("⚠️ Utilisateur sans profil: " + username);
                return new ArrayList<>();
            }
            
            Long profilId = user.getProfil().getId();
            
            // Récupérer tous les pays associés au profil
            List<ProfilPaysEntity> profilPays = profilPaysRepository.findByProfilId(profilId);
            
            if (profilPays == null || profilPays.isEmpty()) {
                System.out.println("⚠️ Aucun pays associé au profil " + profilId);
                return new ArrayList<>();
            }
            
            // Vérifier si GNL est présent
            boolean hasGNL = profilPays.stream()
                .anyMatch(pp -> pp != null && pp.getPays() != null && "GNL".equals(pp.getPays().getCode()));
            
            if (hasGNL) {
                System.out.println("✅ Utilisateur " + username + " a accès à GNL (tous les pays)");
                return null; // null signifie tous les pays
            }
            
            // Extraire les codes de pays
            List<String> paysCodes = profilPays.stream()
                .filter(pp -> pp != null && pp.getPays() != null && pp.getPays().getCode() != null)
                .map(pp -> pp.getPays().getCode())
                .collect(Collectors.toList());
            
            System.out.println("✅ Utilisateur " + username + " a accès aux pays: " + paysCodes);
            return paysCodes;
        } catch (Exception e) {
            System.err.println("❌ Erreur dans getAllowedPaysCodes pour username: " + username);
            e.printStackTrace();
            // En cas d'erreur, retourner une liste vide pour sécurité
            return new ArrayList<>();
        }
    }
    
    /**
     * Vérifie si un utilisateur peut accéder à un pays spécifique
     */
    public boolean canAccessPays(String username, String paysCode) {
        List<String> allowedPays = getAllowedPaysCodes(username);
        
        // null signifie tous les pays (GNL)
        if (allowedPays == null) {
            return true;
        }
        
        // Liste vide signifie aucun accès
        if (allowedPays.isEmpty()) {
            return false;
        }
        
        return allowedPays.contains(paysCode);
    }
    
    /**
     * Récupère les noms de pays autorisés (pour l'affichage)
     */
    public List<String> getAllowedPaysNames(String username) {
        List<String> codes = getAllowedPaysCodes(username);
        
        if (codes == null) {
            return List.of("GNL - Tous les pays");
        }
        
        if (codes.isEmpty()) {
            return new ArrayList<>();
        }
        
        return codes.stream()
            .map(code -> paysRepository.findByCode(code))
            .filter(opt -> opt.isPresent())
            .map(opt -> opt.get().getNom())
            .collect(Collectors.toList());
    }
}

