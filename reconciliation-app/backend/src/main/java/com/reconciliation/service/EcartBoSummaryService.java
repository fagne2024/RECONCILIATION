package com.reconciliation.service;

import com.reconciliation.entity.EcartBoSummaryEntity;
import com.reconciliation.model.EcartBoSummary;
import com.reconciliation.model.EcartBoSummaryDTO;
import com.reconciliation.repository.EcartBoSummaryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;
import java.util.Optional;

@Service
public class EcartBoSummaryService {
    
    @Autowired
    private EcartBoSummaryRepository ecartBoSummaryRepository;
    
    public List<EcartBoSummary> getAllEcartBoSummaries() {
        return ecartBoSummaryRepository.findAllOrderByDateImportDesc().stream()
                .map(this::convertToModel)
                .collect(Collectors.toList());
    }
    
    public Optional<EcartBoSummary> getEcartBoSummaryById(Long id) {
        return ecartBoSummaryRepository.findById(id)
                .map(this::convertToModel);
    }
    
    public List<EcartBoSummary> getEcartBoSummaries(String agence, String service, String pays, String statut) {
        List<EcartBoSummaryEntity> entities;
        
        if (agence != null && service != null && pays != null) {
            entities = ecartBoSummaryRepository.findByAgenceAndServiceAndPays(agence, service, pays);
        } else if (agence != null) {
            entities = ecartBoSummaryRepository.findByAgence(agence);
        } else if (service != null) {
            entities = ecartBoSummaryRepository.findByService(service);
        } else if (pays != null) {
            entities = ecartBoSummaryRepository.findByPays(pays);
        } else if (statut != null) {
            entities = ecartBoSummaryRepository.findByStatut(statut);
        } else {
            entities = ecartBoSummaryRepository.findAllOrderByDateImportDesc();
        }
        
        // Filtrer par statut si spécifié
        if (statut != null && (agence == null && service == null && pays == null)) {
            entities = entities.stream()
                    .filter(e -> statut.equals(e.getStatut()))
                    .collect(Collectors.toList());
        }
        
        return entities.stream()
                .map(this::convertToModel)
                .collect(Collectors.toList());
    }
    
    @Transactional
    public int saveEcartBoSummary(List<EcartBoSummaryDTO> summaryData) {
        System.out.println("=== DÉBUT saveEcartBoSummary ===");
        System.out.println("DEBUG: Nombre de résumés à sauvegarder: " + summaryData.size());
        
        List<EcartBoSummaryEntity> entitiesToSave = new java.util.ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ISO_DATE_TIME;
        
        for (EcartBoSummaryDTO summary : summaryData) {
            try {
                // Parser la date
                LocalDateTime dateTransaction;
                if (summary.getDate() != null && !summary.getDate().trim().isEmpty()) {
                    try {
                        if (summary.getDate().contains("T")) {
                            dateTransaction = LocalDateTime.parse(summary.getDate(), formatter);
                        } else {
                            dateTransaction = LocalDateTime.parse(summary.getDate() + "T00:00:00", formatter);
                        }
                    } catch (Exception e) {
                        System.out.println("DEBUG: Erreur de parsing de date, utilisation de la date actuelle: " + summary.getDate());
                        dateTransaction = LocalDateTime.now();
                    }
                } else {
                    dateTransaction = LocalDateTime.now();
                }

                // Créer une variable finale pour la lambda (après avoir déterminé la valeur)
                final LocalDateTime finalDateTransaction = dateTransaction;
                final String finalStatut = summary.getStatut();
                final String finalAgence = summary.getAgence();
                final String finalService = summary.getService();
                final String finalPays = summary.getPays();

                // Vérifier si un enregistrement similaire existe déjà
                List<EcartBoSummaryEntity> existing = ecartBoSummaryRepository.findByAgenceAndServiceAndPays(
                    finalAgence, finalService, finalPays);
                
                // Vérifier si c'est un doublon exact (même date, agence, service, pays)
                boolean isDuplicate = existing.stream().anyMatch(e -> 
                    e.getDateTransaction().toLocalDate().equals(finalDateTransaction.toLocalDate()) &&
                    (finalStatut == null || finalStatut.equals(e.getStatut()))
                );
                
                if (isDuplicate) {
                    System.out.println("DEBUG: Enregistrement déjà existant pour: " + 
                        finalAgence + " - " + finalService + " - " + finalPays);
                    continue;
                }

                // Créer l'entité
                EcartBoSummaryEntity entity = new EcartBoSummaryEntity();
                entity.setDateTransaction(finalDateTransaction);
                entity.setAgence(finalAgence);
                entity.setService(finalService);
                entity.setPays(finalPays);
                entity.setNombreTransactions(summary.getNombreTransactions() != null ? summary.getNombreTransactions() : 0);
                entity.setMontantTotal(summary.getMontant() != null ? summary.getMontant() : 0.0);
                entity.setStatut(finalStatut != null ? finalStatut : "EN_COURS");
                entity.setEnv(summary.getEnv() != null && !summary.getEnv().trim().isEmpty() ? summary.getEnv() : "BO");
                // Utiliser le commentaire fourni ou générer un commentaire par défaut
                if (summary.getCommentaire() != null && !summary.getCommentaire().trim().isEmpty()) {
                    entity.setCommentaire(summary.getCommentaire());
                } else {
                    entity.setCommentaire("Résumé des écarts BO - " + 
                        (summary.getNombreTransactions() != null ? summary.getNombreTransactions() : 0) + 
                        " transaction(s)");
                }
                entity.setDateImport(LocalDateTime.now());

                entitiesToSave.add(entity);
                System.out.println("DEBUG: Résumé préparé pour agence: " + finalAgence + 
                    ", service: " + finalService + ", montant: " + summary.getMontant());
            } catch (Exception e) {
                System.err.println("DEBUG: Erreur lors du traitement du résumé: " + e.getMessage());
                e.printStackTrace();
            }
        }

        // Sauvegarder tous les enregistrements
        if (!entitiesToSave.isEmpty()) {
            List<EcartBoSummaryEntity> savedEntities = ecartBoSummaryRepository.saveAll(entitiesToSave);
            System.out.println("DEBUG: " + savedEntities.size() + " résumé(s) sauvegardé(s) avec succès");
            System.out.println("=== FIN saveEcartBoSummary ===");
            return savedEntities.size();
        }

        System.out.println("=== FIN saveEcartBoSummary - Aucun enregistrement à sauvegarder ===");
        return 0;
    }
    
    @Transactional
    public EcartBoSummary updateEcartBoSummary(Long id, EcartBoSummary ecartBoSummary) {
        EcartBoSummaryEntity entity = ecartBoSummaryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Résumé d'écart BO non trouvé"));
        
        entity.setDateTransaction(ecartBoSummary.getDateTransaction());
        entity.setAgence(ecartBoSummary.getAgence());
        entity.setService(ecartBoSummary.getService());
        entity.setPays(ecartBoSummary.getPays());
        entity.setNombreTransactions(ecartBoSummary.getNombreTransactions());
        entity.setMontantTotal(ecartBoSummary.getMontantTotal());
        entity.setStatut(ecartBoSummary.getStatut());
        entity.setCommentaire(ecartBoSummary.getCommentaire());
        entity.setEnv(ecartBoSummary.getEnv() != null && !ecartBoSummary.getEnv().trim().isEmpty() ? ecartBoSummary.getEnv() : "BO");
        
        entity = ecartBoSummaryRepository.save(entity);
        return convertToModel(entity);
    }
    
    @Transactional
    public boolean deleteEcartBoSummary(Long id) {
        if (ecartBoSummaryRepository.existsById(id)) {
            ecartBoSummaryRepository.deleteById(id);
            return true;
        }
        return false;
    }
    
    public List<String> getDistinctAgences() {
        return ecartBoSummaryRepository.findDistinctAgence();
    }
    
    public List<String> getDistinctServices() {
        return ecartBoSummaryRepository.findDistinctService();
    }
    
    public List<String> getDistinctPays() {
        return ecartBoSummaryRepository.findDistinctPays();
    }
    
    // Méthodes de conversion
    private EcartBoSummary convertToModel(EcartBoSummaryEntity entity) {
        EcartBoSummary model = new EcartBoSummary();
        model.setId(entity.getId());
        model.setDateTransaction(entity.getDateTransaction());
        model.setAgence(entity.getAgence());
        model.setService(entity.getService());
        model.setPays(entity.getPays());
        model.setNombreTransactions(entity.getNombreTransactions());
        model.setMontantTotal(entity.getMontantTotal());
        model.setStatut(entity.getStatut());
        model.setDateImport(entity.getDateImport());
        model.setCommentaire(entity.getCommentaire());
        model.setEnv(entity.getEnv() != null ? entity.getEnv() : "BO");
        return model;
    }
}
