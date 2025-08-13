package com.reconciliation.service;

import com.reconciliation.entity.CompteEntity;
import com.reconciliation.entity.OperationEntity;
import com.reconciliation.repository.CompteRepository;
import com.reconciliation.repository.OperationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class OperationBusinessService {
    
    @Autowired
    private CompteRepository compteRepository;
    
    @Autowired
    private OperationRepository operationRepository;
    
    /**
     * Traite une opération et met à jour le solde du compte associé
     */
    @Transactional
    public boolean processOperation(OperationEntity operation) {
        if (operation.getCompte() == null) {
            return false;
        }
        
        // Vérifier si l'opération a déjà été traitée
        if (operation.getSoldeApres() != null) {
            return true; // L'opération a déjà été traitée
        }
        
        CompteEntity compte = operation.getCompte();
        double soldeAvant = compte.getSolde();
        double montant = operation.getMontant();
        double soldeApres;
        
        // Déterminer le type d'opération et calculer le nouveau solde
        if (isDebitOperation(operation.getTypeOperation())) {
            // Vérifier si le compte a un solde suffisant pour le débit
            if (soldeAvant < montant) {
                throw new IllegalStateException("Solde insuffisant pour effectuer cette opération");
            }
            soldeApres = soldeAvant - montant;
        } else if (isCreditOperation(operation.getTypeOperation())) {
            soldeApres = soldeAvant + montant;
        } else {
            // Ajustement : peut être positif ou négatif
            soldeApres = soldeAvant + montant;
        }
        
        // Mettre à jour les soldes
        operation.setSoldeAvant(soldeAvant);
        operation.setSoldeApres(soldeApres);
        compte.setSolde(soldeApres);
        compte.setDateDerniereMaj(LocalDateTime.now());
        
        // Sauvegarder les modifications
        compteRepository.save(compte);
        operationRepository.save(operation);
        
        return true;
    }
    
    /**
     * Annule une opération : garde la ligne, change le statut à "Annulée" et préfixe le type avec "annulation_"
     */
    @Transactional
    public boolean cancelOperation(Long operationId) {
        Optional<OperationEntity> optionalOperation = operationRepository.findById(operationId);
        if (optionalOperation.isPresent()) {
            OperationEntity operation = optionalOperation.get();
            
            if (operation.getCompte() != null) {
                CompteEntity compte = operation.getCompte();
                double soldeAvant = operation.getSoldeAvant();
                
                // Restaurer le solde précédent
                compte.setSolde(soldeAvant);
                compte.setDateDerniereMaj(LocalDateTime.now());
                compteRepository.save(compte);
            }
            
            // Garder la ligne, changer le statut à "Annulée" et préfixer le type avec "annulation_"
            operation.setStatut("Annulée");
            if (!operation.getTypeOperation().startsWith("annulation_")) {
                operation.setTypeOperation("annulation_" + operation.getTypeOperation());
            }
            operationRepository.save(operation);
            return true;
        }
        return false;
    }
    
    /**
     * Valide une opération (change le statut et traite l'opération)
     */
    @Transactional
    public boolean validateOperation(Long operationId) {
        Optional<OperationEntity> optionalOperation = operationRepository.findById(operationId);
        if (optionalOperation.isPresent()) {
            OperationEntity operation = optionalOperation.get();
            
            // Vérifier que l'opération est en attente ou en cours
            if ("En attente".equals(operation.getStatut()) || "En cours".equals(operation.getStatut())) {
                // Traiter l'opération et mettre à jour le solde du compte
                if (processOperation(operation)) {
                    // Changer le statut à "Validée"
                    operation.setStatut("Validée");
                    operationRepository.save(operation);
                    return true;
                }
            }
        }
        return false;
    }
    
    /**
     * Rejette une opération
     */
    @Transactional
    public boolean rejectOperation(Long operationId) {
        Optional<OperationEntity> optionalOperation = operationRepository.findById(operationId);
        if (optionalOperation.isPresent()) {
            OperationEntity operation = optionalOperation.get();
            operation.setStatut("Rejetée");
            operationRepository.save(operation);
            return true;
        }
        return false;
    }
    
    /**
     * Détermine si une opération est un débit (diminue le solde)
     */
    public boolean isDebitOperation(String typeOperation) {
        return "total_paiement".equals(typeOperation) || 
               "ajustement".equals(typeOperation) ||
               "Compense_client".equals(typeOperation) || 
               "Compense_fournisseur".equals(typeOperation) ||
               "FRAIS_TRANSACTION".equals(typeOperation) ||
               "annulation_partenaire".equals(typeOperation) ||
               "annulation_bo".equals(typeOperation) ||
               "transaction_cree".equals(typeOperation);
    }
    
    /**
     * Détermine si une opération est un crédit (augmente le solde)
     */
    public boolean isCreditOperation(String typeOperation) {
        return "total_cashin".equals(typeOperation) || 
               "Appro_client".equals(typeOperation) ||
               "Appro_fournisseur".equals(typeOperation);
    }
    
    /**
     * Détermine si une opération est un ajustement (peut être positif ou négatif)
     */
    public boolean isAjustementOperation(String typeOperation) {
        return "ajustement".equals(typeOperation) ||
               "nivellement".equals(typeOperation) ||
               "régularisation_solde".equals(typeOperation);
    }
    
    /**
     * Calcule l'impact d'une opération sur le solde sans l'appliquer
     */
    public double calculateSoldeImpact(String typeOperation, double montant) {
        if (isDebitOperation(typeOperation)) {
            return -montant; // Diminue le solde
        } else if (isCreditOperation(typeOperation)) {
            return montant; // Augmente le solde
        } else {
            return montant; // Ajustement : peut être positif ou négatif selon le montant
        }
    }
    
    /**
     * Vérifie si une opération peut être effectuée sur un compte
     */
    public boolean canProcessOperation(Long compteId, String typeOperation, double montant) {
        Optional<CompteEntity> optionalCompte = compteRepository.findById(compteId);
        if (optionalCompte.isPresent()) {
            CompteEntity compte = optionalCompte.get();
            double soldeActuel = compte.getSolde();
            
            if (isDebitOperation(typeOperation)) {
                return soldeActuel >= montant;
            } else {
                return true; // Les crédits et ajustements sont toujours possibles
            }
        }
        return false;
    }
} 