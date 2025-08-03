package com.reconciliation.service;

import com.reconciliation.dto.ReconciliationRequest;
import com.reconciliation.dto.ReconciliationResponse;
import com.reconciliation.dto.ColumnComparison;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;
import java.util.stream.Collectors;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class CsvReconciliationService {

    private static final Logger logger = LoggerFactory.getLogger(CsvReconciliationService.class);
    private static final int BATCH_SIZE = 1000; // Taille du lot pour le traitement
    private final ConcurrentHashMap<String, Integer> progressMap = new ConcurrentHashMap<>();

    public ReconciliationResponse reconcile(ReconciliationRequest request) {
        long startTime = System.currentTimeMillis();
        try {
            logger.info("Début de la réconciliation");
            logger.info("Nombre d'enregistrements BO: {}", request.getBoFileContent().size());
            logger.info("Nombre d'enregistrements Partenaire: {}", request.getPartnerFileContent().size());
            
            // Appliquer les filtres BO si présents
            List<Map<String, String>> filteredBoRecords = applyBOFilters(request.getBoFileContent(), request.getBoColumnFilters());
            logger.info("Nombre d'enregistrements BO après filtrage: {}", filteredBoRecords.size());
            
            // Initialise la réponse
            ReconciliationResponse response = new ReconciliationResponse();
            response.setMatches(new ArrayList<>());
            response.setBoOnly(new ArrayList<>());
            response.setPartnerOnly(new ArrayList<>());
            response.setMismatches(new ArrayList<>());

            // Crée un index des enregistrements du partenaire pour une recherche rapide
            logger.info("Création de l'index des enregistrements partenaire...");
            Map<String, List<Map<String, String>>> partnerMap = new HashMap<>();
            Set<String> processedPartnerKeys = new HashSet<>();
            
            for (Map<String, String> partnerRecord : request.getPartnerFileContent()) {
                String partnerKey = partnerRecord.get(request.getPartnerKeyColumn());
                if (partnerKey != null) {
                    partnerMap.computeIfAbsent(partnerKey, k -> new ArrayList<>()).add(partnerRecord);
                    processedPartnerKeys.add(partnerKey);
                }
            }
            
            logger.info("Index partenaire créé avec {} clés", partnerMap.size());

            // Traite les enregistrements BO filtrés par lots
            Set<String> processedBoKeys = new HashSet<>();
            int totalRecords = filteredBoRecords.size();
            int processedRecords = 0;
            
            for (int i = 0; i < filteredBoRecords.size(); i += BATCH_SIZE) {
                int endIndex = Math.min(i + BATCH_SIZE, filteredBoRecords.size());
                List<Map<String, String>> batch = filteredBoRecords.subList(i, endIndex);
                
                processBatch(batch, partnerMap, request, response, processedBoKeys);
                processedRecords += batch.size();
                
                // Log de progression
                long currentTime = System.currentTimeMillis();
                long elapsedTime = currentTime - startTime;
                double progress = (double) processedRecords / totalRecords * 100;
                logger.info("Progression: {:.2f}% ({}/{} enregistrements) - Temps écoulé: {} ms", 
                    progress, processedRecords, totalRecords, elapsedTime);
                
                // Nettoyage explicite de la mémoire
                if (i % 10000 == 0) {
                    System.gc();
                }
            }

            // Trouve les enregistrements uniquement dans le fichier partenaire
            logger.info("Recherche des enregistrements uniquement dans le fichier partenaire...");
            int partnerOnlyCount = 0;
            
            for (Map<String, String> partnerRecord : request.getPartnerFileContent()) {
                String partnerKey = partnerRecord.get(request.getPartnerKeyColumn());
                if (partnerKey != null && !processedBoKeys.contains(partnerKey)) {
                    response.getPartnerOnly().add(partnerRecord);
                    partnerOnlyCount++;
                    
                    if (partnerOnlyCount <= 10) {
                        logger.info("Enregistrement uniquement partenaire trouvé: {}", partnerKey);
                    }
                }
            }
            
            logger.info("Nombre total d'enregistrements uniquement partenaire: {}", partnerOnlyCount);

            // Calcule les totaux
            response.setTotalBoRecords(filteredBoRecords.size());
            response.setTotalPartnerRecords(request.getPartnerFileContent().size());
            response.setTotalMatches(response.getMatches().size());
            response.setTotalMismatches(response.getMismatches().size());
            response.setTotalBoOnly(response.getBoOnly().size());
            response.setTotalPartnerOnly(response.getPartnerOnly().size());

            // Calcul du temps total
            long totalTime = System.currentTimeMillis() - startTime;
            
            // Ajout des informations de performance à la réponse
            response.setExecutionTimeMs(totalTime);
            response.setProcessedRecords(totalRecords);
            response.setProgressPercentage(100.0);
            
            logger.info("Résultats finaux:");
            logger.info("- Total BO: {}", response.getTotalBoRecords());
            logger.info("- Total Partenaire: {}", response.getTotalPartnerRecords());
            logger.info("- Correspondances: {}", response.getTotalMatches());
            logger.info("- Différences: {}", response.getTotalMismatches());
            logger.info("- Uniquement BO: {}", response.getTotalBoOnly());
            logger.info("- Uniquement Partenaire: {}", response.getTotalPartnerOnly());
            logger.info("- Temps total d'exécution: {} ms ({} secondes)", totalTime, totalTime / 1000.0);

            return response;

        } catch (Exception e) {
            long totalTime = System.currentTimeMillis() - startTime;
            logger.error("Erreur lors de la réconciliation après {} ms: {}", totalTime, e.getMessage(), e);
            throw new RuntimeException("Erreur lors de la réconciliation: " + e.getMessage(), e);
        }
    }

    private void processBatch(List<Map<String, String>> batch, 
                            Map<String, List<Map<String, String>>> partnerMap,
                            ReconciliationRequest request,
                            ReconciliationResponse response,
                            Set<String> processedBoKeys) {
        for (Map<String, String> boRecord : batch) {
            String boKey = boRecord.get(request.getBoKeyColumn());
            if (boKey != null) {
                processedBoKeys.add(boKey);
            }
            
            List<Map<String, String>> partnerRecords = partnerMap.get(boKey);

            if (partnerRecords == null || partnerRecords.isEmpty()) {
                response.getBoOnly().add(boRecord);
            } else {
                // Compare avec tous les enregistrements partenaire correspondants
                boolean foundMatch = false;
                boolean foundMismatch = false;
                
                for (Map<String, String> partnerRecord : partnerRecords) {
                List<ReconciliationResponse.Difference> differences = new ArrayList<>();
                boolean isMatch = true;

                for (ColumnComparison comparison : request.getComparisonColumns()) {
                    String boValue = boRecord.get(comparison.getBoColumn());
                    String partnerValue = partnerRecord.get(comparison.getPartnerColumn());
                    
                    if (!Objects.equals(boValue, partnerValue)) {
                        ReconciliationResponse.Difference difference = new ReconciliationResponse.Difference();
                        difference.setBoColumn(comparison.getBoColumn());
                        difference.setPartnerColumn(comparison.getPartnerColumn());
                        difference.setBoValue(boValue);
                        difference.setPartnerValue(partnerValue);
                        difference.setDifferent(true);
                        
                        differences.add(difference);
                        isMatch = false;
                    }
                }

                if (isMatch) {
                    ReconciliationResponse.Match match = new ReconciliationResponse.Match();
                    match.setKey(boKey);
                    match.setBoData(boRecord);
                    match.setPartnerData(partnerRecord);
                    match.setDifferences(differences);
                    response.getMatches().add(match);
                        foundMatch = true;
                        break; // On arrête dès qu'on trouve une correspondance parfaite
                } else {
                        foundMismatch = true;
                    }
                }
                
                // Si aucune correspondance parfaite n'a été trouvée, on ajoute aux mismatches
                if (!foundMatch && foundMismatch) {
                    response.getMismatches().add(boRecord);
                }
            }
        }
    }

    private Map<String, Map<String, String>> createRecordMap(List<Map<String, String>> records, String keyColumn) {
        Map<String, Map<String, String>> map = new HashMap<>();
        for (Map<String, String> record : records) {
            map.put(record.get(keyColumn), record);
        }
        return map;
    }

    public void setProgress(String jobId, int percent) {
        progressMap.put(jobId, percent);
    }

    public int getProgress(String jobId) {
        return progressMap.getOrDefault(jobId, 0);
    }

    public void removeProgress(String jobId) {
        progressMap.remove(jobId);
    }

    /**
     * Applique les filtres BO sur les enregistrements BO
     */
    private List<Map<String, String>> applyBOFilters(List<Map<String, String>> boRecords, 
                                                    List<ReconciliationRequest.BOColumnFilter> filters) {
        if (filters == null || filters.isEmpty()) {
            logger.info("Aucun filtre BO à appliquer");
            return boRecords;
        }
        
        logger.info("Application de {} filtres BO", filters.size());
        for (ReconciliationRequest.BOColumnFilter filter : filters) {
            logger.info("Filtre: colonne='{}', valeurs sélectionnées={}", 
                filter.getColumnName(), filter.getSelectedValues());
        }
        
        List<Map<String, String>> filteredRecords = new ArrayList<>();
        int excludedCount = 0;
        
        for (Map<String, String> record : boRecords) {
            boolean shouldInclude = true;
            
            for (ReconciliationRequest.BOColumnFilter filter : filters) {
                String columnValue = record.get(filter.getColumnName());
                
                if (columnValue == null || !filter.getSelectedValues().contains(columnValue)) {
                    shouldInclude = false;
                    logger.debug("Enregistrement exclu par le filtre {}: valeur '{}' non trouvée dans {}", 
                        filter.getColumnName(), columnValue, filter.getSelectedValues());
                    excludedCount++;
                    break;
                }
            }
            
            if (shouldInclude) {
                filteredRecords.add(record);
            }
        }
        
        logger.info("Filtrage terminé: {} enregistrements conservés sur {} ({} exclus)", 
            filteredRecords.size(), boRecords.size(), excludedCount);
        
        // Log quelques exemples d'enregistrements conservés
        if (!filteredRecords.isEmpty()) {
            logger.info("Exemple d'enregistrement conservé: {}", filteredRecords.get(0));
        }
        
        return filteredRecords;
    }
} 