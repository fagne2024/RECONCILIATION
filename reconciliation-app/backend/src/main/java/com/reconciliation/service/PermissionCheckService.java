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

import java.util.List;
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
        String moduleName = mapApiPathToModule(apiPath);
        if (moduleName == null) {
            // Si le module n'est pas mappé, autoriser par défaut (pour éviter de bloquer les nouvelles routes)
            System.out.println("⚠️ Module non mappé pour le chemin: " + apiPath + " - Autorisation par défaut");
            return true;
        }

        // Mapper la méthode HTTP vers la permission
        String permissionName = mapHttpMethodToPermission(apiPath, httpMethod);
        if (permissionName == null) {
            // Si la permission n'est pas mappée, autoriser par défaut
            System.out.println("⚠️ Permission non mappée pour " + httpMethod + " sur " + apiPath + " - Autorisation par défaut");
            return true;
        }

        return hasPermission(username, moduleName, permissionName);
    }

    /**
     * Mappe un chemin d'API vers un nom de module
     */
    private String mapApiPathToModule(String apiPath) {
        if (apiPath == null) return null;
        
        if (apiPath.startsWith("/api/operations")) return "Opérations";
        if (apiPath.startsWith("/api/operations-bancaires")) return "Opérations";
        if (apiPath.startsWith("/api/comptes")) return "Comptes";
        if (apiPath.startsWith("/api/frais")) return "Frais";
        if (apiPath.startsWith("/api/commission")) return "Frais";
        if (apiPath.startsWith("/api/reconciliation")) return "Réconciliation";
        if (apiPath.startsWith("/api/stats")) return "Statistiques";
        if (apiPath.startsWith("/api/statistics")) return "Statistiques";
        if (apiPath.startsWith("/api/ranking")) return "Classements";
        if (apiPath.startsWith("/api/ecart-solde")) return "TSOP";
        if (apiPath.startsWith("/api/trx-sf")) return "TRX SF";
        if (apiPath.startsWith("/api/impact-op")) return "Impact OP";
        if (apiPath.startsWith("/api/service-balance")) return "Service Balance";
        if (apiPath.startsWith("/api/banque")) return "BANQUE";
        if (apiPath.startsWith("/api/comptabilite")) return "Comptabilité";
        if (apiPath.startsWith("/api/auto-processing-models")) return "Modèles";
        if (apiPath.startsWith("/api/profils")) return "Profil";
        if (apiPath.startsWith("/api/users")) return "Utilisateur";
        if (apiPath.startsWith("/api/log-utilisateur")) return "Log utilisateur";
        if (apiPath.startsWith("/api/dashboard")) return "Dashboard";
        if (apiPath.startsWith("/api/traitement")) return "Traitement";
        if (apiPath.startsWith("/api/results")) return "Résultats";
        
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
        if (lowerPath.contains("/upload") || lowerPath.endsWith("upload")) return "upload";
        if (lowerPath.contains("/download") || lowerPath.contains("/template") || lowerPath.contains("/export") || lowerPath.endsWith("download") || lowerPath.endsWith("template") || lowerPath.endsWith("export")) return "download";
        if ((lowerPath.contains("/filter") || lowerPath.contains("/search")) && !lowerPath.contains("statistics")) return "filter";
        if (lowerPath.contains("/bulk") || lowerPath.endsWith("bulk")) return "bulk";
        // Ne pas mapper "statistiques" comme permission spéciale - utiliser la méthode HTTP standard
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
        // Pour les chemins /api/statistics/*, utiliser "lire" pour GET
        switch (lowerMethod) {
            case "get":
                // Si c'est un endpoint de statistiques, vérifier s'il y a une permission spéciale
                if (lowerPath.contains("dashboard-metrics") || lowerPath.contains("detailed-metrics") || lowerPath.contains("filter-options") || lowerPath.contains("transaction-created-stats")) {
                    // Ces endpoints nécessitent la permission "lire" pour le module Statistiques
                    return "lire";
                }
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

