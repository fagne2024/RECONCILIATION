package com.reconciliation.service;

import com.reconciliation.entity.CompteEntity;
import com.reconciliation.entity.OperationEntity;
import com.reconciliation.repository.CompteRepository;
import com.reconciliation.repository.OperationRepository;
import com.reconciliation.service.CompteRegroupementService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ServiceBalanceService {
    
    private static final Logger logger = LoggerFactory.getLogger(ServiceBalanceService.class);
    
    @Autowired
    private CompteRepository compteRepository;
    
    @Autowired
    private OperationRepository operationRepository;
    
    @Autowired
    private CompteRegroupementService compteRegroupementService;
    
    /**
     * Fusionne plusieurs comptes service en un nouveau compte
     * Les anciens comptes restent opérationnels avec leurs soldes inchangés
     * 
     * @param compteIds Liste des IDs des comptes à fusionner
     * @param nouveauNomCompte Nom du nouveau compte fusionné
     * @param pays Pays du nouveau compte
     * @return Résultat de la fusion avec le solde total
     */
    @Transactional
    public FusionResult mergeServiceComptes(List<Long> compteIds, String nouveauNomCompte, String pays) {
        logger.info("=== DÉBUT mergeServiceComptes ===");
        logger.info("Comptes à fusionner: {}", compteIds);
        logger.info("Nouveau nom: {}, Pays: {}", nouveauNomCompte, pays);
        
        try {
            // 1. Récupérer les comptes à fusionner
            List<CompteEntity> comptesAFusionner = compteRepository.findAllById(compteIds);
            
            if (comptesAFusionner.isEmpty()) {
                throw new IllegalArgumentException("Aucun compte trouvé avec les IDs fournis");
            }
            
            if (comptesAFusionner.size() != compteIds.size()) {
                throw new IllegalArgumentException("Certains comptes n'ont pas été trouvés");
            }
            
            // 2. Calculer le solde total
            double soldeTotal = comptesAFusionner.stream()
                .mapToDouble(CompteEntity::getSolde)
                .sum();
            
            logger.info("Solde total calculé: {}", soldeTotal);
            
            // 3. Créer le nouveau compte fusionné
            CompteEntity nouveauCompte = new CompteEntity();
            nouveauCompte.setNumeroCompte(nouveauNomCompte);
            nouveauCompte.setSolde(soldeTotal);
            nouveauCompte.setPays(pays);
            nouveauCompte.setDateDerniereMaj(LocalDateTime.now());
            
            // Déterminer l'agence (prendre la première agence trouvée)
            String agence = comptesAFusionner.stream()
                .map(CompteEntity::getAgence)
                .filter(ag -> ag != null && !ag.trim().isEmpty())
                .findFirst()
                .orElse("REGROUPEMENT");
            
            nouveauCompte.setAgence(agence);
            
            // Définir le codeProprietaire avec les services choisis (numéros de compte des services fusionnés)
            String codeProprietaire = comptesAFusionner.stream()
                .map(CompteEntity::getNumeroCompte)
                .filter(numero -> numero != null && !numero.trim().isEmpty())
                .collect(Collectors.joining(","));
            
            nouveauCompte.setCodeProprietaire(codeProprietaire);
            logger.info("Code propriétaire défini pour le compte fusionné: {}", codeProprietaire);
            
            // 4. Sauvegarder le nouveau compte
            CompteEntity compteSauvegarde = compteRepository.save(nouveauCompte);
            logger.info("Nouveau compte créé avec ID: {}", compteSauvegarde.getId());
            
            // 5. Créer une opération de regroupement pour tracer la fusion
            OperationEntity operationRegroupement = new OperationEntity();
            operationRegroupement.setTypeOperation("regroupement_comptes_service");
            operationRegroupement.setMontant(soldeTotal);
            operationRegroupement.setCompte(compteSauvegarde); // L'opération est liée au nouveau compte
            operationRegroupement.setDateOperation(LocalDateTime.now());
            operationRegroupement.setStatut("VALIDE");
            operationRegroupement.setReference("REGROUPEMENT_" + nouveauNomCompte + "_" + System.currentTimeMillis());
            operationRegroupement.setCodeProprietaire(nouveauNomCompte);
            operationRegroupement.setPays(pays);
            operationRegroupement.setSoldeAvant(0.0); // Le nouveau compte commence à 0
            operationRegroupement.setSoldeApres(soldeTotal); // Puis a le solde total
            
            operationRepository.save(operationRegroupement);
            logger.info("Opération de regroupement créée pour le nouveau compte: {}", nouveauNomCompte);
            
            // 6. Créer les relations de regroupement pour la synchronisation des soldes
            for (CompteEntity compteOriginal : comptesAFusionner) {
                compteRegroupementService.createRegroupementRelation(compteSauvegarde, compteOriginal);
            }
            
            // 7. Synchroniser immédiatement le solde du compte consolidé
            compteRegroupementService.synchroniserSoldeCompteConsolide(compteSauvegarde.getId());
            logger.info("Solde du compte consolidé synchronisé avec les comptes originaux");
            
            // 8. Les anciens comptes restent opérationnels avec leurs soldes inchangés
            // On ne modifie pas les soldes des comptes fusionnés, ils restent actifs
            logger.info("Les {} comptes fusionnés restent opérationnels avec leurs soldes inchangés", comptesAFusionner.size());
            logger.info("Relations de regroupement créées pour la synchronisation automatique des soldes");
            
            logger.info("=== FIN mergeServiceComptes ===");
            
            return new FusionResult(
                compteSauvegarde.getId(),
                nouveauNomCompte,
                soldeTotal,
                comptesAFusionner.size(),
                pays
            );
            
        } catch (Exception e) {
            logger.error("Erreur lors de la fusion des comptes service: {}", e.getMessage(), e);
            throw new RuntimeException("Erreur lors de la fusion des comptes: " + e.getMessage(), e);
        }
    }
    
    /**
     * Récupère tous les comptes service (comptes avec des noms longs contenant des underscores)
     */
    public List<CompteEntity> getServiceComptes() {
        logger.info("Récupération des comptes service");
        
        List<CompteEntity> allComptes = compteRepository.findAll();
        
        // Filtrer les comptes service (noms longs avec underscores)
        List<CompteEntity> serviceComptes = allComptes.stream()
            .filter(compte -> isServiceCompte(compte.getNumeroCompte()))
            .toList();
        
        logger.info("Nombre de comptes service trouvés: {}", serviceComptes.size());
        return serviceComptes;
    }
    
    /**
     * Récupère tous les comptes (pour debug)
     */
    public List<CompteEntity> getAllComptes() {
        logger.info("Récupération de tous les comptes");
        List<CompteEntity> allComptes = compteRepository.findAll();
        logger.info("Nombre total de comptes: {}", allComptes.size());
        return allComptes;
    }
    
    /**
     * Détermine si un compte est un compte service
     */
    private boolean isServiceCompte(String numeroCompte) {
        if (numeroCompte == null || numeroCompte.trim().isEmpty()) {
            return false;
        }
        
        String numero = numeroCompte.trim().toUpperCase();
        
        // Un compte service est identifié par:
        // 1. Contient "SERVICE" dans le nom
        // 2. Contient des underscores (format SERVICE_XXX_YYY)
        // 3. Commence par "SERVICE"
        // 4. Contient des patterns de comptes service
        return numero.contains("SERVICE") || 
               numero.contains("_") || 
               numero.startsWith("SERVICE") ||
               numero.matches(".*SERVICE.*") ||
               numero.matches(".*_[A-Z0-9]+_.*");
    }
    
    /**
     * Classe de résultat pour la fusion
     */
    public static class FusionResult {
        private final Long nouveauCompteId;
        private final String nouveauNomCompte;
        private final double totalSolde;
        private final int nombreComptesFusionnes;
        private final String pays;
        
        public FusionResult(Long nouveauCompteId, String nouveauNomCompte, double totalSolde, 
                           int nombreComptesFusionnes, String pays) {
            this.nouveauCompteId = nouveauCompteId;
            this.nouveauNomCompte = nouveauNomCompte;
            this.totalSolde = totalSolde;
            this.nombreComptesFusionnes = nombreComptesFusionnes;
            this.pays = pays;
        }
        
        // Getters
        public Long getNouveauCompteId() { return nouveauCompteId; }
        public String getNouveauNomCompte() { return nouveauNomCompte; }
        public double getTotalSolde() { return totalSolde; }
        public int getNombreComptesFusionnes() { return nombreComptesFusionnes; }
        public String getPays() { return pays; }
    }
}
