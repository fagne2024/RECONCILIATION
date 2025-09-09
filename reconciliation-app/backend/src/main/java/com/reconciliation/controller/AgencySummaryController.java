package com.reconciliation.controller;

import com.reconciliation.dto.AgencySummarySaveRequest;
import com.reconciliation.model.AgencySummary;
import com.reconciliation.entity.AgencySummaryEntity;
import com.reconciliation.repository.AgencySummaryRepository;
import com.reconciliation.service.OperationService;
import com.reconciliation.service.CompteService;
import com.reconciliation.dto.OperationCreateRequest;
import com.reconciliation.model.Compte;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;
import java.util.ArrayList;
import java.util.Optional;
import java.util.Set;
import java.util.HashSet;
import java.util.Arrays;

@RestController
@RequestMapping("/api/agency-summary")
public class AgencySummaryController {

    @Autowired
    private AgencySummaryRepository repository;

    @Autowired
    private OperationService operationService;

    @Autowired
    private CompteService compteService;

    /**
     * Détermine le type d'opération basé sur le nom du service
     */
    private String determineOperationType(String serviceName) {
        if (serviceName == null) {
            return "total_cashin"; // Par défaut
        }
        
        String serviceUpper = serviceName.toUpperCase();
        
        if (serviceUpper.contains("CASHIN") || serviceUpper.contains("AIRTIME") || serviceUpper.contains("SEND")) {
            return "total_cashin";
        } else if (serviceUpper.contains("PAIEMENT")) {
            return "total_paiement";
        } else {
            return "total_cashin"; // Par défaut
        }
    }

    @GetMapping("/all")
    public List<AgencySummary> getAllSummaries() {
        // Récupérer toutes les données agency_summary
        List<AgencySummaryEntity> allSummaries = repository.findAll();
        
        // Récupérer les opérations pour vérifier les statuts
        List<com.reconciliation.model.Operation> allOperations = operationService.getAllOperations();
        
        // Créer un set des opérations annulées/rejetées pour les types spécifiques
        Set<String> excludedOperations = new HashSet<>();
        List<String> excludedStatusTypes = Arrays.asList(
            "total_paiement",
            "total_cashin",
            "Compense_client",
            "Compense_fournisseur",
            "ajustement",
            "Appro_client",
            "Appro_fournisseur",
            "nivellement",
            "régularisation_solde",
            "FRAIS_TRANSACTION",
            "annulation_bo",
            "annulation_partenaire"
        );
        
        for (com.reconciliation.model.Operation op : allOperations) {
            if (excludedStatusTypes.contains(op.getTypeOperation()) && 
                op.getStatut() != null && 
                (op.getStatut().equals("Annulée") || op.getStatut().equals("Rejetée"))) {
                // Créer une clé unique pour identifier l'opération
                String key = op.getDateOperation().toLocalDate().toString() + "|" + 
                           op.getCodeProprietaire() + "|" + op.getService();
                excludedOperations.add(key);
            }
        }
        
        // Filtrer les agency_summary en excluant celles correspondant aux opérations annulées/rejetées
        return allSummaries.stream()
            .filter(entity -> {
                String key = entity.getDate() + "|" + entity.getAgency() + "|" + entity.getService();
                return !excludedOperations.contains(key);
            })
            .map(entity -> {
                AgencySummary dto = new AgencySummary();
                dto.setId(entity.getId());
                dto.setAgency(entity.getAgency());
                dto.setService(entity.getService());
                dto.setCountry(entity.getCountry());
                dto.setDate(entity.getDate());
                dto.setTotalVolume(entity.getTotalVolume());
                dto.setRecordCount(entity.getRecordCount());
                return dto;
            })
            .collect(Collectors.toList());
    }

    /**
     * Endpoint de debug pour vérifier les données AgencySummary
     */
    @GetMapping("/debug")
    public Map<String, Object> debugAgencySummary(
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String agency,
            @RequestParam(required = false) String service) {
        
        Map<String, Object> result = new HashMap<>();
        
        try {
            // Récupérer toutes les données AgencySummary
            List<AgencySummaryEntity> allSummaries = repository.findAll();
            result.put("totalRecords", allSummaries.size());
            
            // Filtrer par date si fournie
            List<AgencySummaryEntity> filteredByDate = allSummaries;
            if (date != null && !date.isEmpty()) {
                filteredByDate = allSummaries.stream()
                    .filter(summary -> date.equals(summary.getDate()))
                    .collect(Collectors.toList());
                result.put("recordsForDate", filteredByDate.size());
            }
            
            // Filtrer par agence si fournie
            List<AgencySummaryEntity> filteredByAgency = filteredByDate;
            if (agency != null && !agency.isEmpty()) {
                filteredByAgency = filteredByDate.stream()
                    .filter(summary -> agency.equals(summary.getAgency()))
                    .collect(Collectors.toList());
                result.put("recordsForAgency", filteredByAgency.size());
            }
            
            // Filtrer par service si fourni
            List<AgencySummaryEntity> filteredByService = filteredByAgency;
            if (service != null && !service.isEmpty()) {
                filteredByService = filteredByAgency.stream()
                    .filter(summary -> service.equals(summary.getService()))
                    .collect(Collectors.toList());
                result.put("recordsForService", filteredByService.size());
            }
            
            // Détails des enregistrements trouvés
            List<Map<String, Object>> details = filteredByService.stream()
                .map(summary -> {
                    Map<String, Object> detail = new HashMap<>();
                    detail.put("id", summary.getId());
                    detail.put("agency", summary.getAgency());
                    detail.put("service", summary.getService());
                    detail.put("date", summary.getDate());
                    detail.put("totalVolume", summary.getTotalVolume());
                    detail.put("recordCount", summary.getRecordCount());
                    detail.put("country", summary.getCountry());
                    return detail;
                })
                .collect(Collectors.toList());
            
            result.put("details", details);
            
            // Statistiques générales
            Map<String, Object> stats = new HashMap<>();
            stats.put("uniqueAgencies", allSummaries.stream().map(AgencySummaryEntity::getAgency).distinct().count());
            stats.put("uniqueServices", allSummaries.stream().map(AgencySummaryEntity::getService).distinct().count());
            stats.put("uniqueDates", allSummaries.stream().map(AgencySummaryEntity::getDate).distinct().count());
            result.put("statistics", stats);
            
            result.put("success", true);
            
        } catch (Exception e) {
            result.put("success", false);
            result.put("error", e.getMessage());
        }
        
        return result;
    }

    @PostMapping("/save")
    @Transactional
    public ResponseEntity<?> saveAgencySummary(@RequestBody AgencySummarySaveRequest request) {
        try {
            List<AgencySummary> summaryList = request.getSummary();
            String timestamp = request.getTimestamp();
            List<String> savedRecords = new ArrayList<>();
            List<String> errorRecords = new ArrayList<>();
            List<Map<String, Object>> duplicateRecords = new ArrayList<>();

            // 1. Séparer doublons et non-doublons
            List<AgencySummary> nonDoublons = new ArrayList<>();
            for (AgencySummary summary : summaryList) {
                List<AgencySummaryEntity> existingDuplicates = repository.findDuplicates(
                    summary.getDate(),
                    summary.getAgency(),
                    summary.getService(),
                    summary.getTotalVolume(),
                    summary.getRecordCount()
                );
                if (!existingDuplicates.isEmpty()) {
                    Map<String, Object> duplicateInfo = new HashMap<>();
                    duplicateInfo.put("date", summary.getDate());
                    duplicateInfo.put("agence", summary.getAgency());
                    duplicateInfo.put("service", summary.getService());
                    duplicateInfo.put("volume", summary.getTotalVolume());
                    duplicateInfo.put("nombreTransactions", summary.getRecordCount());
                    duplicateInfo.put("message", String.format(
                        "❌ ERREUR: Enregistrement en double détecté!\n" +
                        "   Date: %s\n" +
                        "   Agence: %s\n" +
                        "   Service: %s\n" +
                        "   Volume: %.2f\n" +
                        "   Nombre de transactions: %d\n" +
                        "   Cet enregistrement existe déjà dans la base de données et ne sera pas sauvegardé.",
                        summary.getDate(),
                        summary.getAgency(),
                        summary.getService(),
                        summary.getTotalVolume(),
                        summary.getRecordCount()
                    ));
                    duplicateInfo.put("enregistrementsExistants", existingDuplicates.size());
                    duplicateRecords.add(duplicateInfo);
                } else {
                    nonDoublons.add(summary);
                }
            }

            // 2. Enregistrer uniquement les non-doublons
            for (AgencySummary summary : nonDoublons) {
                try {
                    AgencySummaryEntity entity = new AgencySummaryEntity();
                    entity.setAgency(summary.getAgency());
                    entity.setService(summary.getService());
                    entity.setCountry(summary.getCountry());
                    entity.setDate(summary.getDate());
                    entity.setTotalVolume(summary.getTotalVolume());
                    entity.setRecordCount(summary.getRecordCount());
                    entity.setTimestamp(timestamp);
                    repository.save(entity);
                    repository.flush();
                    String successMessage = String.format(
                        "✅ Enregistrement sauvegardé avec succès:\n" +
                        "   Date: %s\n" +
                        "   Agence: %s\n" +
                        "   Service: %s\n" +
                        "   Volume: %.2f\n" +
                        "   Nombre de transactions: %d",
                        summary.getDate(),
                        summary.getAgency(),
                        summary.getService(),
                        summary.getTotalVolume(),
                        summary.getRecordCount()
                    );
                    savedRecords.add(successMessage);
                    try {
                        createOperationFromSummaryInNewTransaction(summary);
                    } catch (Exception e) {
                        String operationErrorMessage = String.format(
                            "⚠️ ERREUR lors de la création des opérations pour l'agence %s (Service: %s): %s\n" +
                            "   L'enregistrement a été sauvegardé mais les opérations n'ont pas pu être créées.",
                            summary.getAgency(),
                            summary.getService(),
                            e.getMessage()
                        );
                        errorRecords.add(operationErrorMessage);
                    }
                } catch (Exception e) {
                    String errorMessage = String.format(
                        "❌ Erreur lors de la sauvegarde de l'enregistrement pour l'agence %s: %s",
                        summary.getAgency(),
                        e.getMessage()
                    );
                    errorRecords.add(errorMessage);
                }
            }

            Map<String, Object> response = new HashMap<>();
            if (!duplicateRecords.isEmpty()) {
                response.put("status", "DUPLICATES_FOUND");
                response.put("message", "⚠️ ATTENTION: Des enregistrements en double ont été détectés!");
                response.put("duplicateRecords", duplicateRecords);
                response.put("savedRecords", savedRecords);
                response.put("errorRecords", errorRecords);
                return ResponseEntity.badRequest().body(response);
            } else if (!errorRecords.isEmpty()) {
                response.put("status", "PARTIAL_SUCCESS");
                response.put("message", "⚠️ ATTENTION: Certains enregistrements n'ont pas pu être traités (solde insuffisant ou autres erreurs)");
                response.put("savedRecords", savedRecords);
                response.put("errorRecords", errorRecords);
                return ResponseEntity.ok(response);
            } else {
                response.put("status", "SUCCESS");
                response.put("message", "✅ Tous les enregistrements ont été sauvegardés avec succès");
                response.put("savedRecords", savedRecords);
                return ResponseEntity.ok(response);
            }
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("status", "ERROR");
            errorResponse.put("message", "❌ ERREUR CRITIQUE: Impossible de sauvegarder les données");
            errorResponse.put("details", e.getMessage());
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @PostMapping("/save-selection")
    @Transactional
    public ResponseEntity<?> saveSelection(@RequestBody List<AgencySummary> summaries) {
        List<String> savedRecords = new ArrayList<>();
        List<String> errorRecords = new ArrayList<>();
        List<Map<String, Object>> duplicateRecords = new ArrayList<>();

        for (AgencySummary summary : summaries) {
            List<AgencySummaryEntity> existing = repository.findDuplicates(
                summary.getDate(),
                summary.getAgency(),
                summary.getService(),
                summary.getTotalVolume(),
                summary.getRecordCount()
            );

            if (!existing.isEmpty()) {
                Map<String, Object> duplicateInfo = new HashMap<>();
                duplicateInfo.put("message", "Doublon détecté pour l'agence " + summary.getAgency());
                duplicateRecords.add(duplicateInfo);
                continue;
            }

            try {
                AgencySummaryEntity entity = new AgencySummaryEntity();
                entity.setAgency(summary.getAgency());
                entity.setService(summary.getService());
                entity.setCountry(summary.getCountry());
                entity.setDate(summary.getDate());
                entity.setTotalVolume(summary.getTotalVolume());
                entity.setRecordCount(summary.getRecordCount());
                repository.save(entity);
                repository.flush();
                
                try {
                    createOperationFromSummaryInNewTransaction(summary);
                    savedRecords.add("Agence " + summary.getAgency() + " sauvegardée avec opérations.");
                } catch (Exception e) {
                    String operationErrorMessage = String.format(
                        "L'enregistrement pour l'agence %s a été sauvegardé, mais la création des opérations a échoué: %s",
                        summary.getAgency(),
                        e.getMessage()
                    );
                    errorRecords.add(operationErrorMessage);
                }
            } catch (Exception e) {
                errorRecords.add("Erreur pour l'agence " + summary.getAgency() + ": " + e.getMessage());
            }
        }

        Map<String, Object> response = new HashMap<>();
        if (!duplicateRecords.isEmpty() || !errorRecords.isEmpty()) {
            response.put("message", "Opération terminée avec des erreurs ou des doublons.");
            response.put("duplicates", duplicateRecords);
            response.put("errors", errorRecords);
            response.put("saved", savedRecords);
            return ResponseEntity.ok().body(response);
        }

        response.put("message", "Toutes les sélections ont été sauvegardées.");
        response.put("saved", savedRecords);
        return ResponseEntity.ok(response);
    }

    /**
     * Enregistrer uniquement les lignes sélectionnées (agence + service)
     */
    @PostMapping("/save-selected")
    @Transactional
    public ResponseEntity<?> saveSelectedSummaries(@RequestBody List<AgencySummary> selectedSummaries) {
        List<Map<String, Object>> results = new ArrayList<>();
        for (AgencySummary summary : selectedSummaries) {
            Map<String, Object> result = new HashMap<>();
            result.put("agency", summary.getAgency());
            result.put("service", summary.getService());
            result.put("date", summary.getDate());
            try {
                // Créer l'opération à partir du résumé sélectionné
                createOperationFromSummary(summary);
                result.put("success", true);
            } catch (Exception e) {
                result.put("success", false);
                result.put("error", e.getMessage());
            }
            results.add(result);
        }
        return ResponseEntity.ok(results);
    }

    /**
     * Méthode séparée pour créer les opérations dans une nouvelle transaction
     * Cela évite les problèmes de rollback-only
     */
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public void createOperationFromSummaryInNewTransaction(AgencySummary summary) {
        createOperationFromSummary(summary);
    }

    @GetMapping
    public List<AgencySummaryEntity> getAll() {
        return repository.findAll();
    }

    @GetMapping("/check-duplicates")
    public ResponseEntity<?> checkDuplicates() {
        List<AgencySummaryEntity> allRecords = repository.findAll();
        Map<String, Object> result = new HashMap<>();
        Map<String, List<AgencySummaryEntity>> duplicates = new HashMap<>();
        List<String> errorMessages = new ArrayList<>();

        for (AgencySummaryEntity record : allRecords) {
            String key = String.format("%s_%s_%s_%.2f_%d",
                record.getDate(),
                record.getAgency(),
                record.getService(),
                record.getTotalVolume(),
                record.getRecordCount()
            );

            List<AgencySummaryEntity> duplicateRecords = repository.findDuplicates(
                record.getDate(),
                record.getAgency(),
                record.getService(),
                record.getTotalVolume(),
                record.getRecordCount()
            );

            if (duplicateRecords.size() > 1) {
                duplicates.put(key, duplicateRecords);
                String errorMessage = String.format(
                    "❌ DOUBLON DÉTECTÉ:\n" +
                    "   Date: %s\n" +
                    "   Agence: %s\n" +
                    "   Service: %s\n" +
                    "   Volume: %.2f\n" +
                    "   Nombre de transactions: %d\n" +
                    "   Nombre d'occurrences: %d",
                    record.getDate(),
                    record.getAgency(),
                    record.getService(),
                    record.getTotalVolume(),
                    record.getRecordCount(),
                    duplicateRecords.size()
                );
                errorMessages.add(errorMessage);
            }
        }

        if (!duplicates.isEmpty()) {
            result.put("status", "ERROR");
            result.put("message", "⚠️ ATTENTION: Des enregistrements en double ont été trouvés dans la base de données");
            result.put("nombreDoublons", duplicates.size());
            result.put("errors", errorMessages);
            result.put("duplicates", duplicates);
            return ResponseEntity.badRequest().body(result);
        } else {
            result.put("status", "SUCCESS");
            result.put("message", "✅ Aucun doublon trouvé dans la base de données");
            return ResponseEntity.ok(result);
        }
    }

    @GetMapping("/export")
    public List<AgencySummary> exportAllSummaries() {
        return repository.findAll().stream()
            .map(entity -> {
                AgencySummary dto = new AgencySummary();
                dto.setId(entity.getId());
                dto.setAgency(entity.getAgency());
                dto.setService(entity.getService());
                dto.setCountry(entity.getCountry());
                dto.setDate(entity.getDate());
                dto.setTotalVolume(entity.getTotalVolume());
                dto.setRecordCount(entity.getRecordCount());
                return dto;
            })
            .collect(Collectors.toList());
    }

    private void createOperationFromSummary(AgencySummary summary) {
        // 1. Créer le compte agence
        String agencyAccountNumber = summary.getAgency();
        Compte agencyCompte = compteService.getCompteByNumero(agencyAccountNumber)
            .orElseGet(() -> {
                // Si le compte d'agence n'existe pas, en créer un nouveau
                Compte newCompte = new Compte();
                newCompte.setNumeroCompte(agencyAccountNumber);
                newCompte.setPays(summary.getCountry() != null ? summary.getCountry() : "SN");
                newCompte.setCodeProprietaire(agencyAccountNumber);
                newCompte.setAgence(agencyAccountNumber); // Définir l'agence pour les frais de transaction
                newCompte.setSolde(0.0);
                return compteService.saveCompte(newCompte);
            });

        // 2. Créer le compte service
        String serviceAccountNumber = summary.getService();
        Compte serviceCompte = compteService.getCompteByNumero(serviceAccountNumber)
            .orElseGet(() -> {
                // Si le compte service n'existe pas, en créer un nouveau
                Compte newCompte = new Compte();
                newCompte.setNumeroCompte(serviceAccountNumber);
                newCompte.setPays(summary.getCountry() != null ? summary.getCountry() : "SN");
                newCompte.setCodeProprietaire(serviceAccountNumber);
                newCompte.setAgence(agencyAccountNumber); // L'agence reste la même
                newCompte.setSolde(0.0);
                return compteService.saveCompte(newCompte);
            });

        String operationType = determineOperationType(summary.getService());
        
        // 3. Opération nominale pour l'agence (comportement existant)
        OperationCreateRequest agencyOperationRequest = new OperationCreateRequest();
        agencyOperationRequest.setCompteId(agencyCompte.getId());
        agencyOperationRequest.setTypeOperation(operationType);
        agencyOperationRequest.setMontant(summary.getTotalVolume());
        agencyOperationRequest.setBanque("SYSTEM");
        agencyOperationRequest.setNomBordereau("AGENCY_SUMMARY_" + summary.getDate() + "_" + summary.getAgency());
        agencyOperationRequest.setService(summary.getService());
        agencyOperationRequest.setDateOperation(summary.getDate());
        agencyOperationRequest.setRecordCount(summary.getRecordCount());
        
        System.out.println("DEBUG: Création opération nominale agence avec date: " + summary.getDate() + " pour agence: " + summary.getAgency() + " service: " + summary.getService());
        
        operationService.createOperationForSummary(agencyOperationRequest);
        
        // 4. Opération nominale pour le service (nouvelle logique)
        OperationCreateRequest serviceOperationRequest = new OperationCreateRequest();
        serviceOperationRequest.setCompteId(serviceCompte.getId());
        serviceOperationRequest.setTypeOperation(operationType);
        serviceOperationRequest.setMontant(summary.getTotalVolume());
        serviceOperationRequest.setBanque("SYSTEM");
        serviceOperationRequest.setNomBordereau("SERVICE_SUMMARY_" + summary.getDate() + "_" + summary.getService());
        serviceOperationRequest.setService(summary.getAgency()); // L'agence devient le service
        serviceOperationRequest.setDateOperation(summary.getDate());
        serviceOperationRequest.setRecordCount(summary.getRecordCount());
        
        System.out.println("DEBUG: Création opération nominale service avec date: " + summary.getDate() + " pour service: " + summary.getService() + " agence: " + summary.getAgency());
        
        operationService.createOperationForSummary(serviceOperationRequest);
    }

    /**
     * Endpoint pour vérifier les données du tableau spécifique
     */
    @GetMapping("/check-table-data")
    public Map<String, Object> checkTableData() {
        Map<String, Object> result = new HashMap<>();
        
        try {
            String service = "PAIEMENTMARCHAND_MTN_CM";
            String date = "2025-06-20";
            
            // Données attendues selon le tableau
            Map<String, Integer> expectedData = Map.of(
                "BETPW8064", 178112,
                "BMOCM8056", 852,
                "BTWIN8060", 290,
                "MELBT8066", 5887,
                "SGBET8063", 841,
                "XBTCM8057", 94941
            );
            
            result.put("service", service);
            result.put("date", date);
            result.put("expectedData", expectedData);
            
            List<Map<String, Object>> checkResults = new ArrayList<>();
            
            for (String agence : expectedData.keySet()) {
                Map<String, Object> agenceCheck = new HashMap<>();
                agenceCheck.put("agence", agence);
                agenceCheck.put("expectedTransactions", expectedData.get(agence));
                
                // Chercher dans AgencySummary
                List<AgencySummaryEntity> summaries = repository.findByDateAndAgencyAndService(date, agence, service);
                
                if (!summaries.isEmpty()) {
                    AgencySummaryEntity summary = summaries.get(0);
                    agenceCheck.put("found", true);
                    agenceCheck.put("actualRecordCount", summary.getRecordCount());
                    agenceCheck.put("actualTotalVolume", summary.getTotalVolume());
                    agenceCheck.put("match", summary.getRecordCount() == expectedData.get(agence));
                    
                    // Calcul des frais attendus
                    double expectedFrais = 500.0 * expectedData.get(agence);
                    double actualFrais = 500.0 * summary.getRecordCount();
                    agenceCheck.put("expectedFrais", expectedFrais);
                    agenceCheck.put("actualFrais", actualFrais);
                    agenceCheck.put("fraisMatch", Math.abs(expectedFrais - actualFrais) < 0.01);
                    
                } else {
                    agenceCheck.put("found", false);
                    agenceCheck.put("message", "Aucune donnée trouvée");
                }
                
                checkResults.add(agenceCheck);
            }
            
            result.put("checkResults", checkResults);
            
            // Résumé
            long foundCount = checkResults.stream().mapToLong(r -> (Boolean) r.get("found") ? 1 : 0).sum();
            long matchCount = checkResults.stream().mapToLong(r -> (Boolean) r.get("match") ? 1 : 0).sum();
            
            result.put("summary", Map.of(
                "totalAgencies", expectedData.size(),
                "foundAgencies", foundCount,
                "matchingTransactions", matchCount,
                "missingAgencies", expectedData.size() - foundCount
            ));
            
            result.put("success", true);
            
        } catch (Exception e) {
            result.put("success", false);
            result.put("error", e.getMessage());
            e.printStackTrace();
        }
        
        return result;
    }
    
    /**
     * Endpoint pour vérifier les données du 18/06/2025
     */
    @GetMapping("/check-18-06-2025")
    public Map<String, Object> check18June2025() {
        Map<String, Object> result = new HashMap<>();
        
        try {
            String service = "PAIEMENTMARCHAND_MTN_CM";
            String date = "2025-06-18";
            
            // Données attendues selon le tableau pour le 18/06/2025
            Map<String, Integer> expectedData = Map.of(
                "BETPW8064", 178112,
                "BMOCM8056", 852,
                "BTWIN8060", 290,
                "MELBT8066", 5887,
                "SGBET8063", 841,
                "XBTCM8057", 94941
            );
            
            result.put("service", service);
            result.put("date", date);
            result.put("expectedData", expectedData);
            
            List<Map<String, Object>> checkResults = new ArrayList<>();
            
            for (String agence : expectedData.keySet()) {
                Map<String, Object> agenceCheck = new HashMap<>();
                agenceCheck.put("agence", agence);
                agenceCheck.put("expectedTransactions", expectedData.get(agence));
                agenceCheck.put("expectedFrais", 500.0 * expectedData.get(agence));
                
                // Chercher dans AgencySummary
                List<AgencySummaryEntity> summaries = repository.findByDateAndAgencyAndService(date, agence, service);
                
                if (!summaries.isEmpty()) {
                    AgencySummaryEntity summary = summaries.get(0);
                    agenceCheck.put("found", true);
                    agenceCheck.put("actualRecordCount", summary.getRecordCount());
                    agenceCheck.put("actualTotalVolume", summary.getTotalVolume());
                    agenceCheck.put("match", summary.getRecordCount() == expectedData.get(agence));
                    
                    // Calcul des frais attendus
                    double expectedFrais = 500.0 * expectedData.get(agence);
                    double actualFrais = 500.0 * summary.getRecordCount();
                    agenceCheck.put("expectedFrais", expectedFrais);
                    agenceCheck.put("actualFrais", actualFrais);
                    agenceCheck.put("fraisMatch", Math.abs(expectedFrais - actualFrais) < 0.01);
                    
                } else {
                    agenceCheck.put("found", false);
                    agenceCheck.put("message", "Aucune donnée trouvée");
                    
                    // Debug: afficher toutes les données disponibles pour cette date
                    List<AgencySummaryEntity> allSummaries = repository.findAll();
                    List<AgencySummaryEntity> dateSummaries = allSummaries.stream()
                        .filter(summary -> date.equals(summary.getDate()))
                        .collect(Collectors.toList());
                    
                    agenceCheck.put("totalSummariesForDate", dateSummaries.size());
                    
                    List<Map<String, Object>> availableData = dateSummaries.stream()
                        .map(summary -> {
                            Map<String, Object> data = new HashMap<>();
                            data.put("agency", summary.getAgency());
                            data.put("service", summary.getService());
                            data.put("recordCount", summary.getRecordCount());
                            data.put("totalVolume", summary.getTotalVolume());
                            return data;
                        })
                        .collect(Collectors.toList());
                    agenceCheck.put("availableDataForDate", availableData);
                }
                
                checkResults.add(agenceCheck);
            }
            
            result.put("checkResults", checkResults);
            
            // Résumé
            long foundCount = checkResults.stream().mapToLong(r -> (Boolean) r.get("found") ? 1 : 0).sum();
            long matchCount = checkResults.stream().mapToLong(r -> (Boolean) r.get("match") ? 1 : 0).sum();
            
            result.put("summary", Map.of(
                "totalAgencies", expectedData.size(),
                "foundAgencies", foundCount,
                "matchingTransactions", matchCount,
                "missingAgencies", expectedData.size() - foundCount
            ));
            
            result.put("success", true);
            
        } catch (Exception e) {
            result.put("success", false);
            result.put("error", e.getMessage());
            e.printStackTrace();
        }
        
        return result;
    }

    /**
     * Supprimer un résumé d'agence par son id
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAgencySummary(@PathVariable Long id) {
        if (!repository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        repository.deleteById(id);
        return ResponseEntity.ok().build();
    }
} 