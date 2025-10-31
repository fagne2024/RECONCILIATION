package com.reconciliation.service;

import com.reconciliation.entity.OperationBancaireEntity;
import com.reconciliation.model.OperationBancaire;
import com.reconciliation.repository.OperationBancaireRepository;
import com.reconciliation.dto.OperationBancaireCreateRequest;
import com.reconciliation.dto.OperationBancaireUpdateRequest;
import org.springframework.beans.factory.annotation.Autowired;
import com.reconciliation.entity.CompteEntity;
import com.reconciliation.repository.CompteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class OperationBancaireService {
    
    private static final Logger logger = LoggerFactory.getLogger(OperationBancaireService.class);
    
    @Autowired
    private OperationBancaireRepository operationBancaireRepository;
    @Autowired
    private CompteRepository compteRepository;
    
    // Récupérer toutes les opérations bancaires
    public List<OperationBancaire> getAllOperationsBancaires() {
        return operationBancaireRepository.findAllOrderByDateOperationDesc().stream()
                .map(this::convertToModel)
                .collect(Collectors.toList());
    }
    
    // Récupérer une opération bancaire par ID
    public Optional<OperationBancaire> getOperationBancaireById(Long id) {
        return operationBancaireRepository.findById(id)
                .map(this::convertToModel);
    }
    
    // Récupérer les opérations bancaires par pays
    public List<OperationBancaire> getOperationsBancairesByPays(String pays) {
        return operationBancaireRepository.findByPaysOrderByDateOperationDesc(pays).stream()
                .map(this::convertToModel)
                .collect(Collectors.toList());
    }
    
    // Récupérer les opérations bancaires par agence
    public List<OperationBancaire> getOperationsBancairesByAgence(String agence) {
        return operationBancaireRepository.findByAgenceOrderByDateOperationDesc(agence).stream()
                .map(this::convertToModel)
                .collect(Collectors.toList());
    }
    
    // Récupérer les opérations bancaires par statut
    public List<OperationBancaire> getOperationsBancairesByStatut(String statut) {
        return operationBancaireRepository.findByStatutOrderByDateOperationDesc(statut).stream()
                .map(this::convertToModel)
                .collect(Collectors.toList());
    }
    
    // Récupérer les opérations bancaires par plage de dates
    public List<OperationBancaire> getOperationsBancairesByDateRange(LocalDateTime dateDebut, LocalDateTime dateFin) {
        return operationBancaireRepository.findByDateOperationBetween(dateDebut, dateFin).stream()
                .map(this::convertToModel)
                .collect(Collectors.toList());
    }
    
    // Filtrer les opérations bancaires
    public List<OperationBancaire> filterOperationsBancaires(String pays, String codePays, String mois,
                                                             String agence, String typeOperation, String statut,
                                                             LocalDateTime dateDebut, LocalDateTime dateFin, String reference) {
        return operationBancaireRepository.findFilteredOperationsOrderByDateOperationDesc(
                pays, codePays, mois, agence, typeOperation, statut, dateDebut, dateFin, reference)
                .stream()
                .map(this::convertToModel)
                .collect(Collectors.toList());
    }
    
    // Créer une nouvelle opération bancaire
    @Transactional
    public OperationBancaire createOperationBancaire(OperationBancaireCreateRequest request) {
        logger.info("🏦 Création d'une nouvelle opération bancaire: agence={}, type={}, montant={}", 
                   request.getAgence(), request.getTypeOperation(), request.getMontant());
        
        OperationBancaireEntity entity = new OperationBancaireEntity();
        entity.setPays(request.getPays());
        entity.setCodePays(request.getCodePays());
        entity.setMois(request.getMois());
        
        // Convertir la date string en LocalDateTime
        if (request.getDateOperation() != null && !request.getDateOperation().isEmpty()) {
            try {
                if (request.getDateOperation().length() == 10) { // format yyyy-MM-dd
                    entity.setDateOperation(LocalDateTime.parse(request.getDateOperation() + "T00:00:00"));
                } else {
                    entity.setDateOperation(LocalDateTime.parse(request.getDateOperation()));
                }
            } catch (Exception e) {
                logger.error("Erreur lors du parsing de la date: {}", e.getMessage());
                entity.setDateOperation(LocalDateTime.now());
            }
        } else {
            entity.setDateOperation(LocalDateTime.now());
        }
        
        entity.setAgence(request.getAgence());
        entity.setTypeOperation(request.getTypeOperation());
        entity.setNomBeneficiaire(request.getNomBeneficiaire());
        entity.setCompteADebiter(request.getCompteADebiter());
        entity.setMontant(request.getMontant());
        entity.setModePaiement(request.getModePaiement());
        entity.setReference(request.getReference());
        entity.setIdGlpi(request.getIdGlpi());
        entity.setBo(request.getBo());
        entity.setStatut(request.getStatut() != null ? request.getStatut() : "En attente");
        entity.setOperationId(request.getOperationId());
        
        OperationBancaireEntity savedEntity = operationBancaireRepository.save(entity);
        
        logger.info("✅ Opération bancaire créée avec ID: {}", savedEntity.getId());
        
        return convertToModel(savedEntity);
    }
    
    // Mettre à jour une opération bancaire
    @Transactional
    public OperationBancaire updateOperationBancaire(Long id, OperationBancaireUpdateRequest request) {
        OperationBancaireEntity entity = operationBancaireRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Opération bancaire non trouvée avec ID: " + id));
        
        String previousStatut = entity.getStatut();

        if (request.getPays() != null) entity.setPays(request.getPays());
        if (request.getCodePays() != null) entity.setCodePays(request.getCodePays());
        if (request.getMois() != null) entity.setMois(request.getMois());
        
        if (request.getDateOperation() != null && !request.getDateOperation().isEmpty()) {
            try {
                if (request.getDateOperation().length() == 10) {
                    entity.setDateOperation(LocalDateTime.parse(request.getDateOperation() + "T00:00:00"));
                } else {
                    entity.setDateOperation(LocalDateTime.parse(request.getDateOperation()));
                }
            } catch (Exception e) {
                logger.error("Erreur lors du parsing de la date: {}", e.getMessage());
            }
        }
        
        if (request.getAgence() != null) entity.setAgence(request.getAgence());
        if (request.getTypeOperation() != null) entity.setTypeOperation(request.getTypeOperation());
        if (request.getNomBeneficiaire() != null) entity.setNomBeneficiaire(request.getNomBeneficiaire());
        if (request.getCompteADebiter() != null) entity.setCompteADebiter(request.getCompteADebiter());
        if (request.getMontant() != null) entity.setMontant(request.getMontant());
        if (request.getModePaiement() != null) entity.setModePaiement(request.getModePaiement());
        if (request.getReference() != null) entity.setReference(request.getReference());
        if (request.getIdGlpi() != null) entity.setIdGlpi(request.getIdGlpi());
        if (request.getBo() != null) entity.setBo(request.getBo());
        if (request.getStatut() != null) entity.setStatut(request.getStatut());
        if (request.getOperationId() != null) entity.setOperationId(request.getOperationId());
        if (request.getTraitement() != null) entity.setTraitement(request.getTraitement());
        
        OperationBancaireEntity savedEntity = operationBancaireRepository.save(entity);
        // Impacter le compte si le statut devient Validée ET que l'impact n'a pas déjà été appliqué
        if (!"Validée".equalsIgnoreCase(previousStatut) && "Validée".equalsIgnoreCase(savedEntity.getStatut())) {
            appliquerImpactSurCompte(savedEntity);
        }

        return convertToModel(savedEntity);
    }

    private void appliquerImpactSurCompte(OperationBancaireEntity ob) {
        try {
            // Vérifier si l'impact a déjà été appliqué pour éviter le double impact
            if (Boolean.TRUE.equals(ob.getImpactApplique())) {
                logger.warn("⚠️ L'impact a déjà été appliqué pour l'opération bancaire {} - Ignoré", ob.getId());
                return;
            }
            
            String numero = ob.getCompteADebiter();
            if (numero == null || numero.isEmpty()) {
                logger.warn("⚠️ Aucun compte spécifié pour l'opération bancaire {}", ob.getId());
                return;
            }
            Optional<CompteEntity> opt = compteRepository.findByNumeroCompte(numero);
            if (opt.isEmpty()) {
                logger.warn("⚠️ Compte {} introuvable pour l'opération bancaire {}", numero, ob.getId());
                return;
            }
            CompteEntity compte = opt.get();
            double soldeInitial = compte.getSolde();
            double montant = ob.getMontant() != null ? ob.getMontant() : 0.0;

            double soldeFinal = soldeInitial;
            String type = ob.getTypeOperation() != null ? ob.getTypeOperation().toLowerCase() : "";
            if (type.contains("appro")) {
                soldeFinal = soldeInitial + montant; // crédit
            } else if (type.contains("compens") || type.contains("compense") || type.contains("compensation")) {
                soldeFinal = soldeInitial - montant; // débit
            } else if (type.contains("nivellement")) {
                soldeFinal = soldeInitial + montant; // signe du montant décide
            } else {
                logger.info("ℹ️ Type '{}' non impactant, pas d'ajustement de solde", ob.getTypeOperation());
                return;
            }

            compte.setSolde(soldeFinal);
            compte.setDateDerniereMaj(LocalDateTime.now());
            compteRepository.save(compte);
            
            // Marquer l'impact comme appliqué pour éviter le double impact
            ob.setImpactApplique(true);
            operationBancaireRepository.save(ob);
            
            logger.info("✅ Solde compte mis à jour suite validation op bancaire {}: {} -> {}", ob.getId(), soldeInitial, soldeFinal);
        } catch (Exception e) {
            logger.error("❌ Erreur lors de l'impact sur le compte pour op bancaire {}: {}", ob.getId(), e.getMessage(), e);
        }
    }
    
    // Mettre à jour en lot le statut des opérations bancaires
    @Transactional
    public int bulkUpdateStatut(List<Long> ids, String nouveauStatut) {
        if (ids == null || ids.isEmpty() || nouveauStatut == null || nouveauStatut.isEmpty()) {
            return 0;
        }
        List<OperationBancaireEntity> operations = operationBancaireRepository.findAllById(ids);
        int updated = 0;
        for (OperationBancaireEntity entity : operations) {
            String previous = entity.getStatut();
            entity.setStatut(nouveauStatut);
            OperationBancaireEntity saved = operationBancaireRepository.save(entity);
            if (!"Validée".equalsIgnoreCase(previous) && "Validée".equalsIgnoreCase(nouveauStatut)) {
                appliquerImpactSurCompte(saved);
            }
            updated++;
        }
        return updated;
    }

    // Supprimer une opération bancaire
    @Transactional
    public boolean deleteOperationBancaire(Long id) {
        Optional<OperationBancaireEntity> optionalOperation = operationBancaireRepository.findById(id);
        if (optionalOperation.isPresent()) {
            operationBancaireRepository.deleteById(id);
            logger.info("✅ Opération bancaire ID: {} supprimée avec succès", id);
            return true;
        }
        logger.warn("⚠️ Opération bancaire ID: {} introuvable pour suppression", id);
        return false;
    }
    
    // Récupérer les pays distincts
    public List<String> getDistinctPays() {
        return operationBancaireRepository.findDistinctPays();
    }
    
    // Récupérer les agences distinctes
    public List<String> getDistinctAgences() {
        return operationBancaireRepository.findDistinctAgences();
    }
    
    // Récupérer les types d'opération distincts
    public List<String> getDistinctTypesOperation() {
        return operationBancaireRepository.findDistinctTypesOperation();
    }
    
    // Récupérer les statuts distincts
    public List<String> getDistinctStatuts() {
        return operationBancaireRepository.findDistinctStatuts();
    }
    
    // Convertir une entité en modèle
    private OperationBancaire convertToModel(OperationBancaireEntity entity) {
        OperationBancaire model = new OperationBancaire(
            entity.getId(),
            entity.getPays(),
            entity.getCodePays(),
            entity.getMois(),
            entity.getDateOperation(),
            entity.getAgence(),
            entity.getTypeOperation(),
            entity.getNomBeneficiaire(),
            entity.getCompteADebiter(),
            entity.getMontant(),
            entity.getModePaiement(),
            entity.getReference(),
            entity.getIdGlpi(),
            entity.getBo(),
            entity.getStatut(),
            entity.getOperationId()
        );
        model.setImpactApplique(entity.getImpactApplique());
        model.setTraitement(entity.getTraitement());
        return model;
    }
}

