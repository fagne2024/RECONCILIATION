package com.reconciliation.service;

import com.reconciliation.dto.ReconciliationRequest;
import com.reconciliation.dto.ReconciliationResponse;
import com.reconciliation.dto.ColumnComparison;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.DisposableBean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;
import java.util.stream.Collectors;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ForkJoinPool;
import java.util.concurrent.RecursiveTask;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

// Classe pour stocker les résultats d'un batch de traitement
class ReconciliationBatchResult {
    private final List<ReconciliationResponse.Match> matches;
    private final List<Map<String, String>> boOnly;
    private final List<Map<String, String>> mismatches;
    private final int processedCount;

    public ReconciliationBatchResult(List<ReconciliationResponse.Match> matches, 
                                   List<Map<String, String>> boOnly, 
                                   List<Map<String, String>> mismatches, 
                                   int processedCount) {
        this.matches = matches;
        this.boOnly = boOnly;
        this.mismatches = mismatches;
        this.processedCount = processedCount;
    }

    public List<ReconciliationResponse.Match> getMatches() { return matches; }
    public List<Map<String, String>> getBoOnly() { return boOnly; }
    public List<Map<String, String>> getMismatches() { return mismatches; }
    public int getProcessedCount() { return processedCount; }
}

@Service
public class CsvReconciliationService implements DisposableBean {

    private static final Logger logger = LoggerFactory.getLogger(CsvReconciliationService.class);
    private static final int BATCH_SIZE = 10000; // Taille de lot augmentée pour performance
    private static final int PARALLEL_THREADS = Runtime.getRuntime().availableProcessors(); // Utilise tous les CPU
    private final ConcurrentHashMap<String, Integer> progressMap = new ConcurrentHashMap<>();
    // Créer un ExecutorService réutilisable au lieu de le fermer après chaque utilisation
    private final ExecutorService executorService = Executors.newFixedThreadPool(PARALLEL_THREADS, r -> {
        Thread t = new Thread(r);
        t.setDaemon(true); // Thread daemon pour éviter les blocages
        return t;
    });

    public ReconciliationResponse reconcile(ReconciliationRequest request) {
        long startTime = System.currentTimeMillis();
        try {
            logger.info("🚀 Début de la réconciliation optimisée pour performance");
            logger.info("📊 Nombre d'enregistrements BO: {}", request.getBoFileContent().size());
            logger.info("📊 Nombre d'enregistrements Partenaire: {}", request.getPartnerFileContent().size());
            logger.info("⚡ Threads parallèles: {}", PARALLEL_THREADS);
            
            // Détection de la réconciliation spéciale TRXBO/OPPART
            boolean isTRXBOOPPARTReconciliation = detectTRXBOOPPARTReconciliation(request);
            if (isTRXBOOPPARTReconciliation) {
                logger.info("🔍 Détection de réconciliation spéciale TRXBO/OPPART - Logique 1:2");
                return reconcileTRXBOOPPART(request, startTime);
            }
            
            // Vérification de la mémoire disponible
            Runtime runtime = Runtime.getRuntime();
            long maxMemory = runtime.maxMemory();
            long totalMemory = runtime.totalMemory();
            long freeMemory = runtime.freeMemory();
            long usedMemory = totalMemory - freeMemory;
            
            logger.info("💾 État mémoire - Max: {} MB, Utilisé: {} MB, Libre: {} MB", 
                maxMemory / 1024 / 1024, usedMemory / 1024 / 1024, freeMemory / 1024 / 1024);
            
            // Appliquer les filtres BO si présents
            List<Map<String, String>> filteredBoRecords = applyBOFilters(request.getBoFileContent(), request.getBoColumnFilters());
            logger.info("✅ Nombre d'enregistrements BO après filtrage: {}", filteredBoRecords.size());
            
            // Initialise la réponse
            ReconciliationResponse response = new ReconciliationResponse();
            response.setMatches(new ArrayList<>());
            response.setBoOnly(new ArrayList<>());
            response.setPartnerOnly(new ArrayList<>());
            response.setMismatches(new ArrayList<>());

            // Création optimisée de l'index partenaire avec HashMap au lieu de HashMap avec List
            logger.info("🔍 Création de l'index optimisé des enregistrements partenaire...");
            Map<String, Map<String, String>> partnerIndex = new HashMap<>();
            
            // Vérifier que l'ExecutorService est disponible
            if (executorService.isShutdown()) {
                logger.error("❌ ExecutorService est fermé, impossible de traiter la réconciliation");
                throw new RuntimeException("ExecutorService non disponible");
            }
            
            // Traitement parallèle de l'indexation partenaire
            int partnerChunkSize = request.getPartnerFileContent().size() / PARALLEL_THREADS;
            List<CompletableFuture<Void>> partnerIndexFutures = new ArrayList<>();
            
            for (int i = 0; i < PARALLEL_THREADS; i++) {
                final int startIndex = i * partnerChunkSize;
                final int endIndex = (i == PARALLEL_THREADS - 1) ? request.getPartnerFileContent().size() : (i + 1) * partnerChunkSize;
                
                CompletableFuture<Void> future = CompletableFuture.runAsync(() -> {
                    for (int j = startIndex; j < endIndex; j++) {
                        Map<String, String> partnerRecord = request.getPartnerFileContent().get(j);
                        String partnerKey = partnerRecord.get(request.getPartnerKeyColumn());
                        if (partnerKey != null) {
                            synchronized (partnerIndex) {
                                partnerIndex.put(partnerKey, partnerRecord);
                            }
                        }
                    }
                }, executorService);
                
                partnerIndexFutures.add(future);
            }
            
            // Attendre la fin de l'indexation
            CompletableFuture.allOf(partnerIndexFutures.toArray(new CompletableFuture[0])).join();
            logger.info("✅ Index partenaire optimisé créé avec {} clés", partnerIndex.size());

            // Traitement parallèle des enregistrements BO
            logger.info("🔄 Début du traitement parallèle par lots (taille: {})", BATCH_SIZE);
            
            Set<String> processedBoKeys = Collections.newSetFromMap(new ConcurrentHashMap<>());
            int totalRecords = filteredBoRecords.size();
            int processedRecords = 0;
            
            // Diviser les données BO en chunks pour traitement parallèle
            List<List<Map<String, String>>> boChunks = new ArrayList<>();
            for (int i = 0; i < filteredBoRecords.size(); i += BATCH_SIZE) {
                int endIndex = Math.min(i + BATCH_SIZE, filteredBoRecords.size());
                boChunks.add(filteredBoRecords.subList(i, endIndex));
            }
            
            // Traitement parallèle des chunks
            List<CompletableFuture<ReconciliationBatchResult>> batchFutures = new ArrayList<>();
            
            for (List<Map<String, String>> chunk : boChunks) {
                CompletableFuture<ReconciliationBatchResult> future = CompletableFuture.supplyAsync(() -> 
                    processBatchOptimized(chunk, partnerIndex, request, processedBoKeys), executorService);
                batchFutures.add(future);
            }
            
            // Collecter les résultats
            for (CompletableFuture<ReconciliationBatchResult> future : batchFutures) {
                ReconciliationBatchResult result = future.get();
                response.getMatches().addAll(result.getMatches());
                response.getBoOnly().addAll(result.getBoOnly());
                response.getMismatches().addAll(result.getMismatches());
                processedRecords += result.getProcessedCount();
                
                // Log de progression
                long currentTime = System.currentTimeMillis();
                long elapsedTime = currentTime - startTime;
                double progress = (double) processedRecords / totalRecords * 100;
                double recordsPerSecond = processedRecords / (elapsedTime / 1000.0);
                
                logger.info("📊 Progression: {:.2f}% ({}/{} enregistrements) - Vitesse: {:.0f} rec/s - Temps: {} ms", 
                    progress, processedRecords, totalRecords, recordsPerSecond, elapsedTime);
            }

            // Recherche optimisée des enregistrements uniquement dans le fichier partenaire
            logger.info("🔍 Recherche optimisée des enregistrements uniquement partenaire...");
            int partnerOnlyCount = 0;
            
            // Utilisation d'un Set pour une recherche O(1) au lieu de O(n)
            Set<String> processedBoKeysSet = new HashSet<>(processedBoKeys);
            
            for (Map<String, String> partnerRecord : request.getPartnerFileContent()) {
                String partnerKey = partnerRecord.get(request.getPartnerKeyColumn());
                if (partnerKey != null && !processedBoKeysSet.contains(partnerKey)) {
                    response.getPartnerOnly().add(partnerRecord);
                    partnerOnlyCount++;
                    
                    if (partnerOnlyCount <= 10) {
                        logger.info("Enregistrement uniquement partenaire trouvé: {}", partnerKey);
                    }
                }
            }
            
            logger.info("✅ Nombre total d'enregistrements uniquement partenaire: {}", partnerOnlyCount);

            // Calcule les totaux
            response.setTotalBoRecords(filteredBoRecords.size());
            response.setTotalPartnerRecords(request.getPartnerFileContent().size());
            response.setTotalMatches(response.getMatches().size());
            response.setTotalMismatches(response.getMismatches().size());
            response.setTotalBoOnly(response.getBoOnly().size());
            response.setTotalPartnerOnly(response.getPartnerOnly().size());

            // Calcul du temps total
            long totalTime = System.currentTimeMillis() - startTime;
            double recordsPerSecond = (double) totalRecords / (totalTime / 1000.0);
            
            // Ajout des informations de performance à la réponse
            response.setExecutionTimeMs(totalTime);
            response.setProcessedRecords(totalRecords);
            response.setProgressPercentage(100.0);
            
            logger.info("🎯 RÉSULTATS FINAUX:");
            logger.info("📊 Total BO: {}", response.getTotalBoRecords());
            logger.info("📊 Total Partenaire: {}", response.getTotalPartnerRecords());
            logger.info("✅ Correspondances: {}", response.getTotalMatches());
            logger.info("❌ Différences: {}", response.getTotalMismatches());
            logger.info("📈 Uniquement BO: {}", response.getTotalBoOnly());
            logger.info("📈 Uniquement Partenaire: {}", response.getTotalPartnerOnly());
            logger.info("⚡ Performance: {:.0f} enregistrements/seconde", recordsPerSecond);
            logger.info("⏱️  Temps total d'exécution: {} ms ({:.2f} secondes)", totalTime, totalTime / 1000.0);

            // Ne pas fermer l'ExecutorService pour permettre la réutilisation
            // executorService.shutdown();
            
            return response;

        } catch (Exception e) {
            long totalTime = System.currentTimeMillis() - startTime;
            logger.error("❌ Erreur lors de la réconciliation après {} ms: {}", totalTime, e.getMessage(), e);
            
            // Ne pas fermer l'ExecutorService en cas d'erreur non plus
            // executorService.shutdown();
            
            throw new RuntimeException("Erreur lors de la réconciliation: " + e.getMessage(), e);
        }
    }

    /**
     * Détecte si c'est une réconciliation spéciale TRXBO/OPPART
     */
    private boolean detectTRXBOOPPARTReconciliation(ReconciliationRequest request) {
        logger.info("🔍 Début de la détection TRXBO/OPPART");
        
        // Vérifier si les fichiers contiennent des indicateurs TRXBO et OPPART
        boolean hasTRXBO = false;
        boolean hasOPPART = false;
        
        // Vérifier dans les données BO
        for (Map<String, String> boRecord : request.getBoFileContent()) {
            for (String value : boRecord.values()) {
                if (value != null && value.contains("TRXBO")) {
                    hasTRXBO = true;
                    logger.info("🔍 TRXBO détecté dans les valeurs: {}", value);
                    break;
                }
            }
            if (hasTRXBO) break;
        }
        
        // Vérifier dans les données Partenaire
        for (Map<String, String> partnerRecord : request.getPartnerFileContent()) {
            for (String value : partnerRecord.values()) {
                if (value != null && value.contains("OPPART")) {
                    hasOPPART = true;
                    logger.info("🔍 OPPART détecté dans les valeurs: {}", value);
                    break;
                }
            }
            if (hasOPPART) break;
        }
        
        // Vérifier aussi dans les noms de colonnes
        if (!hasTRXBO && !request.getBoFileContent().isEmpty()) {
            Set<String> boColumns = request.getBoFileContent().get(0).keySet();
            hasTRXBO = boColumns.stream().anyMatch(col -> col.contains("TRXBO"));
            if (hasTRXBO) {
                logger.info("🔍 TRXBO détecté dans les colonnes BO");
            }
        }
        
        if (!hasOPPART && !request.getPartnerFileContent().isEmpty()) {
            Set<String> partnerColumns = request.getPartnerFileContent().get(0).keySet();
            hasOPPART = partnerColumns.stream().anyMatch(col -> col.contains("OPPART"));
            if (hasOPPART) {
                logger.info("🔍 OPPART détecté dans les colonnes Partenaire");
            }
        }
        
        // Détection basée sur les colonnes spécifiques et les valeurs
        if (!hasTRXBO && !request.getBoFileContent().isEmpty()) {
            Map<String, String> firstBoRecord = request.getBoFileContent().get(0);
            logger.info("🔍 Vérification des colonnes TRXBO spécifiques...");
            
            // Vérifier les colonnes spécifiques à TRXBO
            boolean hasIDTransaction = firstBoRecord.containsKey("IDTransaction");
            boolean hasTelephoneClient = firstBoRecord.containsKey("téléphone client");
            boolean hasMontant = firstBoRecord.containsKey("montant");
            boolean hasService = firstBoRecord.containsKey("Service");
            boolean hasNumeroTransGU = firstBoRecord.containsKey("Numéro Trans GU");
            
            logger.info("🔍 Colonnes TRXBO - IDTransaction: {}, téléphone client: {}, montant: {}, Service: {}, Numéro Trans GU: {}", 
                       hasIDTransaction, hasTelephoneClient, hasMontant, hasService, hasNumeroTransGU);
            
            hasTRXBO = hasIDTransaction && hasTelephoneClient && hasMontant && hasService && hasNumeroTransGU;
            
            if (hasTRXBO) {
                logger.info("🔍 TRXBO détecté par colonnes spécifiques");
            }
            
            // Vérifier aussi dans les valeurs de service
            if (!hasTRXBO) {
                logger.info("🔍 Vérification des valeurs de service...");
                for (Map<String, String> boRecord : request.getBoFileContent()) {
                    String service = boRecord.get("Service");
                    if (service != null && (service.contains("PAIEMENT") || service.contains("MARCHAND"))) {
                        hasTRXBO = true;
                        logger.info("🔍 TRXBO détecté par valeur de service: {}", service);
                        break;
                    }
                }
            }
            
            // Détection forcée si les colonnes correspondent
            if (!hasTRXBO) {
                Set<String> boColumns = firstBoRecord.keySet();
                boolean hasRequiredColumns = boColumns.contains("IDTransaction") || 
                                          boColumns.contains("téléphone client") ||
                                          boColumns.contains("montant") ||
                                          boColumns.contains("Service") ||
                                          boColumns.contains("Numéro Trans GU");
                
                if (hasRequiredColumns) {
                    hasTRXBO = true;
                    logger.info("🔍 Détection TRXBO basée sur les colonnes disponibles: {}", boColumns);
                }
            }
        }
        
        if (!hasOPPART && !request.getPartnerFileContent().isEmpty()) {
            Map<String, String> firstPartnerRecord = request.getPartnerFileContent().get(0);
            logger.info("🔍 Vérification des colonnes OPPART spécifiques...");
            
            // Vérifier les colonnes spécifiques à OPPART
            boolean hasTypeOperation = firstPartnerRecord.containsKey("Type Opération");
            boolean hasMontant = firstPartnerRecord.containsKey("Montant");
            boolean hasSoldeAvant = firstPartnerRecord.containsKey("Solde avant");
            boolean hasSoldeApres = firstPartnerRecord.containsKey("Solde aprés");
            boolean hasNumeroTransGU = firstPartnerRecord.containsKey("Numéro Trans GU");
            
            logger.info("🔍 Colonnes OPPART - Type Opération: {}, Montant: {}, Solde avant: {}, Solde aprés: {}, Numéro Trans GU: {}", 
                       hasTypeOperation, hasMontant, hasSoldeAvant, hasSoldeApres, hasNumeroTransGU);
            
            hasOPPART = hasTypeOperation && hasMontant && hasSoldeAvant && hasSoldeApres && hasNumeroTransGU;
            
            if (hasOPPART) {
                logger.info("🔍 OPPART détecté par colonnes spécifiques");
            }
            
            // Vérifier aussi dans les valeurs de type d'opération
            if (!hasOPPART) {
                logger.info("🔍 Vérification des valeurs de type d'opération...");
                for (Map<String, String> partnerRecord : request.getPartnerFileContent()) {
                    String typeOperation = partnerRecord.get("Type Opération");
                    if (typeOperation != null && typeOperation.contains("IMPACT")) {
                        hasOPPART = true;
                        logger.info("🔍 OPPART détecté par valeur de type d'opération: {}", typeOperation);
                        break;
                    }
                }
            }
            
            // Détection forcée si les colonnes correspondent
            if (!hasOPPART) {
                Set<String> partnerColumns = firstPartnerRecord.keySet();
                boolean hasRequiredColumns = partnerColumns.contains("Type Opération") || 
                                          partnerColumns.contains("Montant") ||
                                          partnerColumns.contains("Solde avant") ||
                                          partnerColumns.contains("Solde aprés") ||
                                          partnerColumns.contains("Numéro Trans GU");
                
                if (hasRequiredColumns) {
                    hasOPPART = true;
                    logger.info("🔍 Détection OPPART basée sur les colonnes disponibles: {}", partnerColumns);
                }
            }
        }
        
        logger.info("🔍 Détection TRXBO/OPPART - TRXBO: {}, OPPART: {}", hasTRXBO, hasOPPART);
        
        // Log des détails pour debug
        if (!request.getBoFileContent().isEmpty()) {
            Map<String, String> firstBoRecord = request.getBoFileContent().get(0);
            logger.info("🔍 Colonnes BO disponibles: {}", firstBoRecord.keySet());
            logger.info("🔍 Exemple valeurs BO: {}", firstBoRecord.values());
        }
        
        if (!request.getPartnerFileContent().isEmpty()) {
            Map<String, String> firstPartnerRecord = request.getPartnerFileContent().get(0);
            logger.info("🔍 Colonnes Partenaire disponibles: {}", firstPartnerRecord.keySet());
            logger.info("🔍 Exemple valeurs Partenaire: {}", firstPartnerRecord.values());
        }
        
        return hasTRXBO && hasOPPART;
    }

    /**
     * Réconciliation spéciale pour TRXBO/OPPART avec logique 1:2
     * Chaque ligne TRXBO doit correspondre exactement à 2 lignes OPPART
     */
    private ReconciliationResponse reconcileTRXBOOPPART(ReconciliationRequest request, long startTime) {
        logger.info("🔄 Début de la réconciliation spéciale TRXBO/OPPART - Logique 1:2");
        
        // Appliquer les filtres BO si présents
        List<Map<String, String>> filteredBoRecords = applyBOFilters(request.getBoFileContent(), request.getBoColumnFilters());
        logger.info("✅ Nombre d'enregistrements BO (TRXBO) après filtrage: {}", filteredBoRecords.size());
        
        // Initialise la réponse
        ReconciliationResponse response = new ReconciliationResponse();
        response.setMatches(new ArrayList<>());
        response.setBoOnly(new ArrayList<>());
        response.setPartnerOnly(new ArrayList<>());
        response.setMismatches(new ArrayList<>());
        
        // Créer un index des enregistrements OPPART groupés par clé
        Map<String, List<Map<String, String>>> partnerIndex = new HashMap<>();
        
        for (Map<String, String> partnerRecord : request.getPartnerFileContent()) {
            String partnerKey = partnerRecord.get(request.getPartnerKeyColumn());
            if (partnerKey != null) {
                partnerIndex.computeIfAbsent(partnerKey, k -> new ArrayList<>()).add(partnerRecord);
            }
        }
        
        logger.info("✅ Index OPPART créé avec {} clés uniques", partnerIndex.size());
        
        // Traiter chaque enregistrement TRXBO
        Set<String> processedPartnerKeys = new HashSet<>();
        int processedCount = 0;
        
        for (Map<String, String> boRecord : filteredBoRecords) {
            String boKey = boRecord.get(request.getBoKeyColumn());
            if (boKey == null) {
                response.getBoOnly().add(boRecord);
                processedCount++;
                continue;
            }
            
            List<Map<String, String>> matchingPartnerRecords = partnerIndex.get(boKey);
            
            if (matchingPartnerRecords == null || matchingPartnerRecords.isEmpty()) {
                // Aucune correspondance trouvée - ÉCART
                logger.debug("❌ ÉCART: Aucune correspondance OPPART pour TRXBO key: {}", boKey);
                response.getBoOnly().add(boRecord);
            } else if (matchingPartnerRecords.size() == 1) {
                // Une seule correspondance trouvée - ÉCART
                logger.debug("❌ ÉCART: Une seule correspondance OPPART pour TRXBO key: {} (attendu: 2)", boKey);
                response.getMismatches().add(boRecord);
                // Pour TRXBO/OPPART, les enregistrements OPPART avec 1 correspondance vont dans partnerOnly
                for (Map<String, String> partnerRecord : matchingPartnerRecords) {
                    response.getPartnerOnly().add(partnerRecord);
                }
                // Marquer les clés partenaires comme traitées
                processedPartnerKeys.add(boKey);
            } else if (matchingPartnerRecords.size() == 2) {
                // Exactement 2 correspondances trouvées - CORRESPONDANCE PARFAITE
                logger.debug("✅ CORRESPONDANCE PARFAITE: 2 correspondances OPPART pour TRXBO key: {}", boKey);
                
                // Créer un match avec les 2 enregistrements OPPART
                ReconciliationResponse.Match match = new ReconciliationResponse.Match();
                match.setKey(boKey);
                match.setBoData(boRecord);
                
                // Combiner les 2 enregistrements OPPART en un seul pour la comparaison
                Map<String, String> combinedPartnerData = new HashMap<>();
                for (int i = 0; i < matchingPartnerRecords.size(); i++) {
                    Map<String, String> partnerRecord = matchingPartnerRecords.get(i);
                    for (Map.Entry<String, String> entry : partnerRecord.entrySet()) {
                        String key = entry.getKey();
                        String value = entry.getValue();
                        // Ajouter un suffixe pour distinguer les 2 enregistrements
                        combinedPartnerData.put(key + "_OPPART_" + (i + 1), value);
                    }
                }
                match.setPartnerData(combinedPartnerData);
                match.setDifferences(new ArrayList<>()); // Pas de différences pour une correspondance parfaite
                
                response.getMatches().add(match);
                processedPartnerKeys.add(boKey);
            } else {
                // Plus de 2 correspondances trouvées - ÉCART
                logger.debug("❌ ÉCART: {} correspondances OPPART pour TRXBO key: {} (attendu: 2)", 
                    matchingPartnerRecords.size(), boKey);
                response.getMismatches().add(boRecord);
                // Pour TRXBO/OPPART, les enregistrements OPPART avec >2 correspondances vont dans partnerOnly
                for (Map<String, String> partnerRecord : matchingPartnerRecords) {
                    response.getPartnerOnly().add(partnerRecord);
                }
                processedPartnerKeys.add(boKey);
            }
            
            processedCount++;
            
            // Log de progression
            if (processedCount % 1000 == 0) {
                long currentTime = System.currentTimeMillis();
                long elapsedTime = currentTime - startTime;
                double progress = (double) processedCount / filteredBoRecords.size() * 100;
                logger.info("📊 Progression TRXBO/OPPART: {:.2f}% ({}/{} enregistrements)", 
                    progress, processedCount, filteredBoRecords.size());
            }
        }
        
        // Identifier les enregistrements OPPART non utilisés
        for (Map<String, String> partnerRecord : request.getPartnerFileContent()) {
            String partnerKey = partnerRecord.get(request.getPartnerKeyColumn());
            if (partnerKey != null && !processedPartnerKeys.contains(partnerKey)) {
                response.getPartnerOnly().add(partnerRecord);
            }
        }
        
        // Calculer les totaux
        response.setTotalBoRecords(filteredBoRecords.size());
        response.setTotalPartnerRecords(request.getPartnerFileContent().size());
        response.setTotalMatches(response.getMatches().size());
        response.setTotalMismatches(response.getMismatches().size());
        response.setTotalBoOnly(response.getBoOnly().size());
        response.setTotalPartnerOnly(response.getPartnerOnly().size());
        
        // Calcul du temps total
        long totalTime = System.currentTimeMillis() - startTime;
        double recordsPerSecond = (double) processedCount / (totalTime / 1000.0);
        
        // Ajout des informations de performance à la réponse
        response.setExecutionTimeMs(totalTime);
        response.setProcessedRecords(processedCount);
        response.setProgressPercentage(100.0);
        
        logger.info("🎯 RÉSULTATS FINAUX TRXBO/OPPART:");
        logger.info("📊 Total TRXBO: {}", response.getTotalBoRecords());
        logger.info("📊 Total OPPART: {}", response.getTotalPartnerRecords());
        logger.info("✅ Correspondances parfaites (1:2): {}", response.getTotalMatches());
        logger.info("❌ Écarts (0, 1, ou >2 correspondances): {}", response.getTotalMismatches());
        logger.info("📈 Uniquement TRXBO: {}", response.getTotalBoOnly());
        logger.info("📈 Uniquement OPPART: {}", response.getTotalPartnerOnly());
        logger.info("⚡ Performance: {:.0f} enregistrements/seconde", recordsPerSecond);
        logger.info("⏱️  Temps total d'exécution: {} ms ({:.2f} secondes)", totalTime, totalTime / 1000.0);
        
        return response;
    }

    private ReconciliationBatchResult processBatchOptimized(List<Map<String, String>> batch, 
                            Map<String, Map<String, String>> partnerIndex,
                            ReconciliationRequest request,
                            Set<String> processedBoKeys) {
        
        List<ReconciliationResponse.Match> matches = new ArrayList<>();
        List<Map<String, String>> boOnly = new ArrayList<>();
        List<Map<String, String>> mismatches = new ArrayList<>();
        int processedCount = 0;

        for (Map<String, String> boRecord : batch) {
            String boKey = boRecord.get(request.getBoKeyColumn());
            if (boKey == null) {
                boOnly.add(boRecord);
                processedCount++;
                continue;
            }

            processedBoKeys.add(boKey);
            Map<String, String> partnerRecord = partnerIndex.get(boKey);

            if (partnerRecord == null) {
                boOnly.add(boRecord);
                processedCount++;
            } else {
                // Comparaison optimisée - une seule correspondance par clé
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
                    matches.add(match);
                } else {
                    mismatches.add(boRecord);
                }
                processedCount++;
            }
        }
        return new ReconciliationBatchResult(matches, boOnly, mismatches, processedCount);
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

    @Override
    public void destroy() throws Exception {
        logger.info("🧹 Nettoyage de l'ExecutorService...");
        if (executorService != null && !executorService.isShutdown()) {
            executorService.shutdown();
            // Attendre un maximum de 30 secondes pour la fin des tâches
            if (!executorService.awaitTermination(30, java.util.concurrent.TimeUnit.SECONDS)) {
                logger.warn("⚠️  Forçage de l'arrêt de l'ExecutorService après timeout");
                executorService.shutdownNow();
            }
            logger.info("✅ ExecutorService fermé proprement");
        }
    }
} 