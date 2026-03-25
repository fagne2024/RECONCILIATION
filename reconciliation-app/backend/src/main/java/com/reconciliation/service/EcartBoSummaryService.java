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
import java.util.Map;
import java.util.HashMap;
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
    
    public List<EcartBoSummary> getEcartBoSummaries(String agence, String service, String pays, String statut, String token) {
        List<EcartBoSummaryEntity> entities;

        if (token != null && !token.trim().isEmpty()) {
            entities = ecartBoSummaryRepository.findByToken(token.trim());
        } else if (agence != null && service != null && pays != null) {
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

        // Filtrer par statut si spécifié (et pas de filtre token)
        if (statut != null && (agence == null && service == null && pays == null) && (token == null || token.trim().isEmpty())) {
            entities = entities.stream()
                    .filter(e -> statut.equals(e.getStatut()))
                    .collect(Collectors.toList());
        }

        return entities.stream()
                .map(this::convertToModel)
                .collect(Collectors.toList());
    }
    
    @Transactional
    public java.util.Map<String, Object> saveEcartBoSummary(List<EcartBoSummaryDTO> summaryData) {
        System.out.println("=== DÉBUT saveEcartBoSummary ===");
        System.out.println("DEBUG: Nombre de résumés à sauvegarder: " + summaryData.size());
        
        List<EcartBoSummaryEntity> entitiesToSave = new java.util.ArrayList<>();
        List<Map<String, Object>> duplicateRecords = new java.util.ArrayList<>();
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
                final Integer finalNombreTransactions = summary.getNombreTransactions() != null ? summary.getNombreTransactions() : 0;

                // Vérifier si un enregistrement similaire existe déjà
                List<EcartBoSummaryEntity> existing = ecartBoSummaryRepository.findByAgenceAndServiceAndPays(
                    finalAgence, finalService, finalPays);
                
                // Vérifier si c'est un doublon exact (même date, agence, service, pays et nombre de transactions)
                EcartBoSummaryEntity duplicateEntity = existing.stream()
                    .filter(e -> 
                        e.getDateTransaction().toLocalDate().equals(finalDateTransaction.toLocalDate()) &&
                        e.getNombreTransactions() != null && 
                        e.getNombreTransactions().equals(finalNombreTransactions)
                    )
                    .findFirst()
                    .orElse(null);
                
                if (duplicateEntity != null) {
                    String duplicateMessage = String.format(
                        "❌ DOUBLON DÉTECTÉ: Un enregistrement identique existe déjà dans la base de données!\n" +
                        "   📋 Détails du doublon (Date, Agence, Service, Pays, Nombre):\n" +
                        "   • Date de transaction: %s\n" +
                        "   • Agence: %s\n" +
                        "   • Service: %s\n" +
                        "   • Pays: %s\n" +
                        "   • Nombre de transactions: %d\n" +
                        "   • Statut existant: %s\n" +
                        "   • Montant total existant: %.2f\n" +
                        "   • Date d'import existante: %s\n" +
                        "   • ID de l'enregistrement existant: %d\n" +
                        "   ⚠️ Cet enregistrement ne sera pas sauvegardé pour éviter les doublons.",
                        finalDateTransaction.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")),
                        finalAgence,
                        finalService,
                        finalPays,
                        finalNombreTransactions,
                        duplicateEntity.getStatut() != null ? duplicateEntity.getStatut() : "N/A",
                        duplicateEntity.getMontantTotal(),
                        duplicateEntity.getDateImport() != null ? 
                            duplicateEntity.getDateImport().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")) : "N/A",
                        duplicateEntity.getId()
                    );
                    
                    System.out.println("DEBUG: " + duplicateMessage);
                    
                    Map<String, Object> duplicateInfo = new HashMap<>();
                    duplicateInfo.put("agence", finalAgence);
                    duplicateInfo.put("service", finalService);
                    duplicateInfo.put("pays", finalPays);
                    duplicateInfo.put("dateTransaction", finalDateTransaction.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
                    duplicateInfo.put("statut", finalStatut);
                    duplicateInfo.put("montant", summary.getMontant());
                    duplicateInfo.put("nombreTransactions", summary.getNombreTransactions());
                    duplicateInfo.put("message", duplicateMessage);
                    duplicateInfo.put("idExistant", duplicateEntity.getId());
                    duplicateRecords.add(duplicateInfo);
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
                if (summary.getEnvCode() != null && !summary.getEnvCode().trim().isEmpty()) {
                    entity.setEnvCode(summary.getEnvCode().trim());
                }
                // Utiliser le commentaire fourni ou générer un commentaire par défaut
                if (summary.getCommentaire() != null && !summary.getCommentaire().trim().isEmpty()) {
                    entity.setCommentaire(summary.getCommentaire());
                } else {
                    entity.setCommentaire("Résumé des écarts BO - " +
                        (summary.getNombreTransactions() != null ? summary.getNombreTransactions() : 0) +
                        " transaction(s)");
                }
                if (summary.getToken() != null && !summary.getToken().trim().isEmpty()) {
                    entity.setToken(summary.getToken().trim());
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
        int savedCount = 0;
        if (!entitiesToSave.isEmpty()) {
            List<EcartBoSummaryEntity> savedEntities = ecartBoSummaryRepository.saveAll(entitiesToSave);
            savedCount = savedEntities.size();
            System.out.println("DEBUG: " + savedCount + " résumé(s) sauvegardé(s) avec succès");
        }

        Map<String, Object> result = new HashMap<>();
        result.put("count", savedCount);
        result.put("totalReceived", summaryData.size());
        result.put("duplicates", duplicateRecords.size());
        result.put("duplicateRecords", duplicateRecords);
        
        if (duplicateRecords.isEmpty()) {
            System.out.println("=== FIN saveEcartBoSummary ===");
        } else {
            System.out.println("=== FIN saveEcartBoSummary - " + duplicateRecords.size() + " doublon(s) détecté(s) ===");
        }
        
        return result;
    }
    
    @Transactional
    public EcartBoSummary updateEcartBoSummary(Long id, EcartBoSummary ecartBoSummary) {
        EcartBoSummaryEntity entity = ecartBoSummaryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Résumé d'écart BO non trouvé"));

        // Mise à jour partielle : ne modifier que les champs fournis (non null)
        if (ecartBoSummary.getDateTransaction() != null) {
            entity.setDateTransaction(ecartBoSummary.getDateTransaction());
        }
        if (ecartBoSummary.getAgence() != null) {
            entity.setAgence(ecartBoSummary.getAgence());
        }
        if (ecartBoSummary.getService() != null) {
            entity.setService(ecartBoSummary.getService());
        }
        if (ecartBoSummary.getPays() != null) {
            entity.setPays(ecartBoSummary.getPays());
        }
        if (ecartBoSummary.getNombreTransactions() != null) {
            entity.setNombreTransactions(ecartBoSummary.getNombreTransactions());
        }
        if (ecartBoSummary.getMontantTotal() != null) {
            entity.setMontantTotal(ecartBoSummary.getMontantTotal());
        }
        if (ecartBoSummary.getStatut() != null) {
            entity.setStatut(ecartBoSummary.getStatut());
        }
        if (ecartBoSummary.getCommentaire() != null) {
            entity.setCommentaire(ecartBoSummary.getCommentaire());
        }
        if (ecartBoSummary.getEnv() != null && !ecartBoSummary.getEnv().trim().isEmpty()) {
            entity.setEnv(ecartBoSummary.getEnv().trim());
        }
        if (ecartBoSummary.getEnvCode() != null) {
            String code = ecartBoSummary.getEnvCode().trim();
            entity.setEnvCode(code.isEmpty() ? null : code);
        }
        if (ecartBoSummary.getToken() != null) {
            entity.setToken(ecartBoSummary.getToken().trim().isEmpty() ? null : ecartBoSummary.getToken().trim());
        }

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
        model.setEnvCode(entity.getEnvCode());
        model.setToken(entity.getToken());
        return model;
    }
}
