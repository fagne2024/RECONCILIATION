package com.reconciliation.service;

import com.reconciliation.dto.ReconciliationRequest;
import com.reconciliation.dto.ReconciliationResponse;
import com.reconciliation.dto.ColumnComparison;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.DisposableBean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
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
    private final ConfigurableReconciliationService configurableReconciliationService;
    private final ColumnProcessingService columnProcessingService;
    private static final int BATCH_SIZE = 10000; // Taille de lot augmentée pour performance
    
    public CsvReconciliationService(ConfigurableReconciliationService configurableReconciliationService,
                                   ColumnProcessingService columnProcessingService) {
        this.configurableReconciliationService = configurableReconciliationService;
        this.columnProcessingService = columnProcessingService;
    }
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
        
        // LOGS DE DEBUG TRÈS VISIBLES
        System.out.println("🚀🚀🚀 DÉBUT RÉCONCILIATION DEBUG 🚀🚀🚀");
        System.out.println("📊 Données BO: " + request.getBoFileContent().size() + " lignes");
        System.out.println("📊 Données Partenaire: " + request.getPartnerFileContent().size() + " lignes");
        System.out.println("🔑 Clé BO: '" + request.getBoKeyColumn() + "'");
        System.out.println("🔑 Clé Partenaire: '" + request.getPartnerKeyColumn() + "'");
        
        // 🔧 APPLICATION DES RÈGLES DE TRAITEMENT DES COLONNES
        System.out.println("🔧 Application des règles de traitement des colonnes...");
        List<Map<String, String>> processedBoData = applyColumnProcessingRules(request.getBoFileContent(), "bo");
        List<Map<String, String>> processedPartnerData = applyColumnProcessingRules(request.getPartnerFileContent(), "partner");
        
        System.out.println("✅ Règles de traitement appliquées");
        System.out.println("📊 Données BO après traitement: " + processedBoData.size() + " lignes");
        System.out.println("📊 Données Partenaire après traitement: " + processedPartnerData.size() + " lignes");
        
                    // DEBUG: Afficher quelques exemples de valeurs (après traitement)
            if (!processedBoData.isEmpty()) {
                Map<String, String> firstBoRecord = processedBoData.get(0);
                String boKeyValue = firstBoRecord.get(request.getBoKeyColumn());
                System.out.println("🔍 Exemple clé BO (après traitement): '" + request.getBoKeyColumn() + "' -> '" + boKeyValue + "'");
                System.out.println("🔍 Toutes les clés BO disponibles: " + firstBoRecord.keySet());
            }
            
            if (!processedPartnerData.isEmpty()) {
                Map<String, String> firstPartnerRecord = processedPartnerData.get(0);
                String partnerKeyValue = firstPartnerRecord.get(request.getPartnerKeyColumn());
                System.out.println("🔍 Exemple clé Partenaire (après traitement): '" + request.getPartnerKeyColumn() + "' -> '" + partnerKeyValue + "'");
                System.out.println("🔍 Toutes les clés Partenaire disponibles: " + firstPartnerRecord.keySet());
            }
        
                    // DEBUG: Afficher toutes les colonnes disponibles (après traitement)
            if (!processedBoData.isEmpty()) {
                System.out.println("📋 Colonnes BO disponibles: " + processedBoData.get(0).keySet());
            }
            if (!processedPartnerData.isEmpty()) {
                System.out.println("📋 Colonnes Partenaire disponibles: " + processedPartnerData.get(0).keySet());
            }
        
        logger.info("🚀 Début de la réconciliation optimisée");
        logger.info("📊 Données BO: {} lignes", request.getBoFileContent().size());
        logger.info("📊 Données Partenaire: {} lignes", request.getPartnerFileContent().size());
        logger.info("🔑 Clé BO: '{}'", request.getBoKeyColumn());
        logger.info("🔑 Clé Partenaire: '{}'", request.getPartnerKeyColumn());
        
        // DEBUG: Afficher quelques exemples de valeurs
        if (!request.getBoFileContent().isEmpty()) {
            Map<String, String> firstBoRecord = request.getBoFileContent().get(0);
            String boKeyValue = firstBoRecord.get(request.getBoKeyColumn());
            logger.info("🔍 Exemple clé BO: '{}' -> '{}'", request.getBoKeyColumn(), boKeyValue);
        }
        
        if (!request.getPartnerFileContent().isEmpty()) {
            Map<String, String> firstPartnerRecord = request.getPartnerFileContent().get(0);
            String partnerKeyValue = firstPartnerRecord.get(request.getPartnerKeyColumn());
            logger.info("🔍 Exemple clé Partenaire: '{}' -> '{}'", request.getPartnerKeyColumn(), partnerKeyValue);
        }
        
        // DEBUG: Afficher toutes les colonnes disponibles
        if (!request.getBoFileContent().isEmpty()) {
            logger.info("📋 Colonnes BO disponibles: {}", request.getBoFileContent().get(0).keySet());
        }
        if (!request.getPartnerFileContent().isEmpty()) {
            logger.info("📋 Colonnes Partenaire disponibles: {}", request.getPartnerFileContent().get(0).keySet());
        }
        
        try {
            logger.info("🚀 Début de la réconciliation optimisée pour performance");
            logger.info("📊 Nombre d'enregistrements BO: {}", processedBoData.size());
            logger.info("📊 Nombre d'enregistrements Partenaire: {}", processedPartnerData.size());
            logger.info("⚡ Threads parallèles: {}", PARALLEL_THREADS);
            
            // FORCER LA LOGIQUE 1-1 POUR LA RÉCONCILIATION AUTOMATIQUE
            // La réconciliation automatique doit toujours utiliser la logique 1-1 pour éviter les correspondances multiples
            logger.info("🔒 RÉCONCILIATION AUTOMATIQUE - Forçage de la logique 1-1 (pas de correspondances multiples)");
            
            // IGNORER les types paramétrables dans la réconciliation automatique
            if (request.getReconciliationType() != null && !"1-1".equals(request.getReconciliationType())) {
                logger.info("⚠️ Type paramétrable détecté: {} mais IGNORÉ pour la réconciliation automatique - Forçage 1-1", 
                    request.getReconciliationType());
            }
            
            // Détection de la logique de réconciliation à utiliser (CONFIGURABLE)
            ConfigurableReconciliationService.ReconciliationLogicType logicType = 
                configurableReconciliationService.determineReconciliationLogic(request);
            
            // IGNORER la logique SPECIAL_RATIO pour la réconciliation automatique
            if (logicType == ConfigurableReconciliationService.ReconciliationLogicType.SPECIAL_RATIO) {
                logger.info("⚠️ Logique SPECIAL_RATIO détectée mais IGNORÉE pour la réconciliation automatique - Utilisation de la logique standard 1-1");
                logicType = ConfigurableReconciliationService.ReconciliationLogicType.STANDARD;
            }
            logger.info("✅ Logique standard 1-1 utilisée pour la réconciliation automatique - Logique configurable: {}", logicType);
            
            // Vérification de la mémoire disponible
            Runtime runtime = Runtime.getRuntime();
            long maxMemory = runtime.maxMemory();
            long totalMemory = runtime.totalMemory();
            long freeMemory = runtime.freeMemory();
            long usedMemory = totalMemory - freeMemory;
            
            logger.info("💾 État mémoire - Max: {} MB, Utilisé: {} MB, Libre: {} MB", 
                maxMemory / 1024 / 1024, usedMemory / 1024 / 1024, freeMemory / 1024 / 1024);
            
            // Appliquer les filtres BO si présents (sur les données traitées)
            List<Map<String, String>> filteredBoRecords = applyBOFilters(processedBoData, request.getBoColumnFilters());
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
            
            // Normalisation des noms de colonnes pour gérer les accents
                    String normalizedBoKeyColumn = request.getBoKeyColumn();
        String normalizedPartnerKeyColumn = request.getPartnerKeyColumn();
            
            logger.info("🔧 Normalisation des noms de colonnes:");
            logger.info("  BO Key: '{}' -> '{}'", request.getBoKeyColumn(), normalizedBoKeyColumn);
            logger.info("  Partner Key: '{}' -> '{}'", request.getPartnerKeyColumn(), normalizedPartnerKeyColumn);
            
            // Traitement parallèle de l'indexation partenaire
            int partnerChunkSize = processedPartnerData.size() / PARALLEL_THREADS;
            List<CompletableFuture<Void>> partnerIndexFutures = new ArrayList<>();
            
            for (int i = 0; i < PARALLEL_THREADS; i++) {
                final int startIndex = i * partnerChunkSize;
                final int endIndex = (i == PARALLEL_THREADS - 1) ? processedPartnerData.size() : (i + 1) * partnerChunkSize;
                
                CompletableFuture<Void> future = CompletableFuture.runAsync(() -> {
                    for (int j = startIndex; j < endIndex; j++) {
                        Map<String, String> partnerRecord = processedPartnerData.get(j);
                        // Chercher la clé avec normalisation
                        String partnerKey = findKeyWithNormalization(partnerRecord, normalizedPartnerKeyColumn);
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
                    processBatchOptimized(chunk, partnerIndex, request, processedBoKeys, normalizedBoKeyColumn), executorService);
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
     * Détecte si c'est une réconciliation spéciale TRXBO/OPPART (DÉPRÉCIÉ - Utilise maintenant la logique configurable)
     */
    @Deprecated
    private boolean detectTRXBOOPPARTReconciliation(ReconciliationRequest request) {
        logger.info("🔍 Début de la détection TRXBO/OPPART");
        
        // Vérifier si les fichiers contiennent des indicateurs TRXBO et OPPART
        boolean hasTRXBO = false;
        boolean hasOPPART = false;
        
        // EXCLUSION EXPLICITE DE USSDPART
        // Détecter USSDPART par ses colonnes spécifiques
        if (!request.getPartnerFileContent().isEmpty()) {
            Map<String, String> firstPartnerRecord = request.getPartnerFileContent().get(0);
            Set<String> partnerColumns = firstPartnerRecord.keySet();
            
            // USSDPART a des colonnes spécifiques comme "Token", "Code PIXI", "Code de Proxy"
            boolean hasToken = partnerColumns.contains("Token");
            boolean hasCodePixi = partnerColumns.contains("Code PIXI");
            boolean hasCodeProxy = partnerColumns.contains("Code de Proxy");
            boolean hasGroupeReseaux = partnerColumns.contains("Groupe R seaux");
            
            if (hasToken && hasCodePixi && hasCodeProxy && hasGroupeReseaux) {
                logger.info("🔍 USSDPART détecté par colonnes spécifiques - Exclusion de la logique TRXBO/OPPART");
                return false;
            }
        }
        
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
            
            // Vérifier les colonnes spécifiques à TRXBO (plus strict)
            boolean hasIDTransaction = firstBoRecord.containsKey("IDTransaction");
            boolean hasTelephoneClient = firstBoRecord.containsKey("téléphone client") || firstBoRecord.containsKey("t l phone client");
            boolean hasMontant = firstBoRecord.containsKey("montant");
            boolean hasService = firstBoRecord.containsKey("Service");
            boolean hasNumeroTransGU = firstBoRecord.containsKey("Numéro Trans GU") || firstBoRecord.containsKey("Numero Trans GU");
            
            logger.info("🔍 Colonnes TRXBO - IDTransaction: {}, téléphone client: {}, montant: {}, Service: {}, Numéro Trans GU: {}", 
                       hasIDTransaction, hasTelephoneClient, hasMontant, hasService, hasNumeroTransGU);
            
            // Détection plus stricte : au moins 4 colonnes TRXBO spécifiques
            int trxboColumnCount = 0;
            if (hasIDTransaction) trxboColumnCount++;
            if (hasTelephoneClient) trxboColumnCount++;
            if (hasMontant) trxboColumnCount++;
            if (hasService) trxboColumnCount++;
            if (hasNumeroTransGU) trxboColumnCount++;
            
            hasTRXBO = trxboColumnCount >= 4; // Au moins 4 colonnes TRXBO spécifiques
            
            if (hasTRXBO) {
                logger.info("🔍 TRXBO détecté par colonnes spécifiques ({} colonnes TRXBO)", trxboColumnCount);
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
            
            // Détection forcée si les colonnes correspondent (plus strict)
            if (!hasTRXBO) {
                Set<String> boColumns = firstBoRecord.keySet();
                boolean hasRequiredColumns = boColumns.contains("IDTransaction") || 
                                          boColumns.contains("téléphone client") ||
                                          boColumns.contains("t l phone client") ||
                                          boColumns.contains("montant") ||
                                          boColumns.contains("Service") ||
                                          boColumns.contains("Numéro Trans GU") ||
                                          boColumns.contains("Numero Trans GU");
                
                if (hasRequiredColumns) {
                    hasTRXBO = true;
                    logger.info("🔍 Détection TRXBO basée sur les colonnes disponibles: {}", boColumns);
                }
            }
        }
        
        if (!hasOPPART && !request.getPartnerFileContent().isEmpty()) {
            Map<String, String> firstPartnerRecord = request.getPartnerFileContent().get(0);
            logger.info("🔍 Vérification des colonnes OPPART spécifiques...");
            
            // Vérifier les colonnes spécifiques à OPPART (plus strict)
            boolean hasTypeOperation = firstPartnerRecord.containsKey("Type Opération");
            boolean hasMontant = firstPartnerRecord.containsKey("Montant");
            boolean hasSoldeAvant = firstPartnerRecord.containsKey("Solde avant");
            boolean hasSoldeApres = firstPartnerRecord.containsKey("Solde aprés") || firstPartnerRecord.containsKey("Solde après");
            boolean hasNumeroTransGU = firstPartnerRecord.containsKey("Numéro Trans GU") || firstPartnerRecord.containsKey("Numero Trans GU");
            
            logger.info("🔍 Colonnes OPPART - Type Opération: {}, Montant: {}, Solde avant: {}, Solde aprés: {}, Numéro Trans GU: {}", 
                       hasTypeOperation, hasMontant, hasSoldeAvant, hasSoldeApres, hasNumeroTransGU);
            
            // Détection plus stricte : au moins 4 colonnes OPPART spécifiques
            int oppartColumnCount = 0;
            if (hasTypeOperation) oppartColumnCount++;
            if (hasMontant) oppartColumnCount++;
            if (hasSoldeAvant) oppartColumnCount++;
            if (hasSoldeApres) oppartColumnCount++;
            if (hasNumeroTransGU) oppartColumnCount++;
            
            hasOPPART = oppartColumnCount >= 4; // Au moins 4 colonnes OPPART spécifiques
            
            if (hasOPPART) {
                logger.info("🔍 OPPART détecté par colonnes spécifiques ({} colonnes OPPART)", oppartColumnCount);
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
            
            // Détection forcée si les colonnes correspondent (plus strict)
            if (!hasOPPART) {
                Set<String> partnerColumns = firstPartnerRecord.keySet();
                boolean hasRequiredColumns = partnerColumns.contains("Type Opération") || 
                                          partnerColumns.contains("Montant") ||
                                          partnerColumns.contains("Solde avant") ||
                                          partnerColumns.contains("Solde aprés") ||
                                          partnerColumns.contains("Solde après") ||
                                          partnerColumns.contains("Numéro Trans GU") ||
                                          partnerColumns.contains("Numero Trans GU");
                
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
     * Réconciliation avec logique de ratio spéciale configurable
     * Utilise les règles de correspondance configurées dans les modèles
     */
    private ReconciliationResponse reconcileWithSpecialRatio(ReconciliationRequest request, long startTime) {
        logger.info("🔄 Début de la réconciliation avec logique de ratio spéciale configurable");
        
        // Récupérer les règles de correspondance configurées
        List<ConfigurableReconciliationService.CorrespondenceRule> correspondenceRules = 
            configurableReconciliationService.getCorrespondenceRules(request);
        
        logger.info("📋 Règles de correspondance configurées: {}", correspondenceRules.size());
        for (ConfigurableReconciliationService.CorrespondenceRule rule : correspondenceRules) {
            logger.info("  - {}: {} -> {}", rule.getName(), rule.getCondition(), rule.getAction());
        }
        
        // Appliquer les filtres BO si présents
        List<Map<String, String>> filteredBoRecords = applyBOFilters(request.getBoFileContent(), request.getBoColumnFilters());
        logger.info("✅ Nombre d'enregistrements BO après filtrage: {}", filteredBoRecords.size());
        
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
            int partnerMatchCount = matchingPartnerRecords != null ? matchingPartnerRecords.size() : 0;
            
            // Appliquer les règles de correspondance configurées
            String action = determineActionFromRules(correspondenceRules, partnerMatchCount);
            
            switch (action) {
                case "MARK_AS_MATCH":
                    logger.debug("✅ CORRESPONDANCE PARFAITE: {} correspondances pour key: {}", partnerMatchCount, boKey);
                    
                    // Créer un match avec les enregistrements partenaires
                    ReconciliationResponse.Match match = new ReconciliationResponse.Match();
                    match.setKey(boKey);
                    match.setBoData(boRecord);
                    
                    // Combiner les enregistrements partenaires
                    Map<String, String> combinedPartnerData = new HashMap<>();
                    if (matchingPartnerRecords != null) {
                        for (int i = 0; i < matchingPartnerRecords.size(); i++) {
                        Map<String, String> partnerRecord = matchingPartnerRecords.get(i);
                        for (Map.Entry<String, String> entry : partnerRecord.entrySet()) {
                            String key = entry.getKey();
                            String value = entry.getValue();
                            // Ajouter un suffixe pour distinguer les enregistrements
                            combinedPartnerData.put(key + "_PARTNER_" + (i + 1), value);
                        }
                        }
                    }
                    match.setPartnerData(combinedPartnerData);
                    match.setDifferences(new ArrayList<>());
                    
                    response.getMatches().add(match);
                    processedPartnerKeys.add(boKey);
                    break;
                    
                case "MARK_AS_MISMATCH":
                    logger.debug("❌ ÉCART: {} correspondances pour key: {} (condition non respectée)", partnerMatchCount, boKey);
                    response.getMismatches().add(boRecord);
                    if (matchingPartnerRecords != null) {
                        for (Map<String, String> partnerRecord : matchingPartnerRecords) {
                            response.getPartnerOnly().add(partnerRecord);
                        }
                    }
                    processedPartnerKeys.add(boKey);
                    break;
                    
                case "MARK_AS_BO_ONLY":
                default:
                    logger.debug("📈 BO UNIQUEMENT: {} correspondances pour key: {}", partnerMatchCount, boKey);
                    response.getBoOnly().add(boRecord);
                    break;
            }
            
            processedCount++;
            
            // Log de progression
            if (processedCount % 1000 == 0) {
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

    /**
     * Réconciliation avec types paramétrables (1-1, 1-2, 1-3, 1-4, 1-5)
     * Gère les correspondances multiples selon le type sélectionné
     */
    private ReconciliationResponse reconcileWithParametricType(ReconciliationRequest request, long startTime) {
        logger.info("🔄 Début de la réconciliation avec type paramétrable: {}", request.getReconciliationType());
        
        // Appliquer les filtres BO si présents
        List<Map<String, String>> filteredBoRecords = applyBOFilters(request.getBoFileContent(), request.getBoColumnFilters());
        logger.info("✅ Nombre d'enregistrements BO après filtrage: {}", filteredBoRecords.size());
        
        // Initialise la réponse
        ReconciliationResponse response = new ReconciliationResponse();
        response.setMatches(new ArrayList<>());
        response.setBoOnly(new ArrayList<>());
        response.setPartnerOnly(new ArrayList<>());
        response.setMismatches(new ArrayList<>());
        
        // Créer un index des enregistrements partenaire groupés par clé
        Map<String, List<Map<String, String>>> partnerIndex = new HashMap<>();
        
        for (Map<String, String> partnerRecord : request.getPartnerFileContent()) {
            String partnerKey = partnerRecord.get(request.getPartnerKeyColumn());
            if (partnerKey != null) {
                partnerIndex.computeIfAbsent(partnerKey, k -> new ArrayList<>()).add(partnerRecord);
            }
        }
        
        logger.info("✅ Index partenaire créé avec {} clés uniques", partnerIndex.size());
        
        // Déterminer le nombre de correspondances attendues
        int expectedPartnerCount = getExpectedPartnerCount(request.getReconciliationType());
        logger.info("🎯 Nombre de correspondances partenaire attendues: {}", expectedPartnerCount);
        
        // Traiter chaque enregistrement BO
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
            int partnerMatchCount = matchingPartnerRecords != null ? matchingPartnerRecords.size() : 0;
            
            // Vérifier si le nombre de correspondances correspond au type attendu
            if (partnerMatchCount == expectedPartnerCount) {
                logger.debug("✅ CORRESPONDANCE PARFAITE ({}): {} correspondances pour key: {}", 
                    request.getReconciliationType(), partnerMatchCount, boKey);
                
                // Créer un match avec les enregistrements partenaires
                ReconciliationResponse.Match match = new ReconciliationResponse.Match();
                match.setKey(boKey);
                match.setBoData(boRecord);
                match.setReconciliationType(request.getReconciliationType());
                
                // Pour les types 1-1, utiliser la structure existante
                if ("1-1".equals(request.getReconciliationType())) {
                    match.setPartnerData(matchingPartnerRecords.get(0));
                    match.setPartnerDataList(null);
                } else {
                    // Pour les types multiples, utiliser la nouvelle structure
                    match.setPartnerData(null);
                    match.setPartnerDataList(matchingPartnerRecords);
                    
                    // Créer aussi une version combinée pour compatibilité
                    Map<String, String> combinedPartnerData = new HashMap<>();
                    if (matchingPartnerRecords != null) {
                        for (int i = 0; i < matchingPartnerRecords.size(); i++) {
                            Map<String, String> partnerRecord = matchingPartnerRecords.get(i);
                            for (Map.Entry<String, String> entry : partnerRecord.entrySet()) {
                                String key = entry.getKey();
                                String value = entry.getValue();
                                combinedPartnerData.put(key + "_PARTNER_" + (i + 1), value);
                            }
                        }
                    }
                    match.setPartnerData(combinedPartnerData);
                }
                
                match.setDifferences(new ArrayList<>());
                response.getMatches().add(match);
                processedPartnerKeys.add(boKey);
                
            } else if (partnerMatchCount > 0) {
                logger.debug("❌ ÉCART ({}): {} correspondances pour key: {} (attendu: {})", 
                    request.getReconciliationType(), partnerMatchCount, boKey, expectedPartnerCount);
                response.getMismatches().add(boRecord);
                if (matchingPartnerRecords != null) {
                    for (Map<String, String> partnerRecord : matchingPartnerRecords) {
                        response.getPartnerOnly().add(partnerRecord);
                    }
                }
                processedPartnerKeys.add(boKey);
            } else {
                logger.debug("📈 BO UNIQUEMENT ({}): 0 correspondances pour key: {}", 
                    request.getReconciliationType(), boKey);
                response.getBoOnly().add(boRecord);
            }
            
            processedCount++;
            
            // Log de progression
            if (processedCount % 1000 == 0) {
                double progress = (double) processedCount / filteredBoRecords.size() * 100;
                logger.info("📊 Progression réconciliation {}: {:.2f}% ({}/{} enregistrements)", 
                    request.getReconciliationType(), progress, processedCount, filteredBoRecords.size());
            }
        }
        
        // Identifier les enregistrements partenaire non utilisés
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
        
        logger.info("🎯 RÉSULTATS FINAUX RÉCONCILIATION {}:", request.getReconciliationType());
        logger.info("📊 Total BO: {}", response.getTotalBoRecords());
        logger.info("📊 Total Partenaire: {}", response.getTotalPartnerRecords());
        logger.info("✅ Correspondances parfaites ({}): {}", request.getReconciliationType(), response.getTotalMatches());
        logger.info("❌ Écarts: {}", response.getTotalMismatches());
        logger.info("📈 Uniquement BO: {}", response.getTotalBoOnly());
        logger.info("📈 Uniquement Partenaire: {}", response.getTotalPartnerOnly());
        logger.info("⚡ Performance: {:.0f} enregistrements/seconde", recordsPerSecond);
        logger.info("⏱️  Temps total d'exécution: {} ms ({:.2f} secondes)", totalTime, totalTime / 1000.0);
        
        return response;
    }

    /**
     * Détermine le nombre de correspondances partenaire attendues selon le type
     */
    private int getExpectedPartnerCount(String reconciliationType) {
        switch (reconciliationType) {
            case "1-1": return 1;
            case "1-2": return 2;
            case "1-3": return 3;
            case "1-4": return 4;
            case "1-5": return 5;
            default: return 1; // Par défaut 1-1
        }
    }

    private ReconciliationBatchResult processBatchOptimized(List<Map<String, String>> batch, 
                            Map<String, Map<String, String>> partnerIndex,
                            ReconciliationRequest request,
                            Set<String> processedBoKeys,
                            String normalizedBoKeyColumn) {
        
        List<ReconciliationResponse.Match> matches = new ArrayList<>();
        List<Map<String, String>> boOnly = new ArrayList<>();
        List<Map<String, String>> mismatches = new ArrayList<>();
        int processedCount = 0;

        for (Map<String, String> boRecord : batch) {
            // Utiliser la normalisation pour trouver la clé BO
            String boKey = findKeyWithNormalization(boRecord, normalizedBoKeyColumn);
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

    @Deprecated
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

    /**
     * Normalise un nom de colonne pour gérer les accents et les espaces
     * 
     * Cette méthode gère :
     * - ENCODAGE : Suppression des caractères spéciaux problématiques
     * - NORMALISATION : Standardisation des espaces multiples
     * - TYPAGE : Standardisation du format des noms de colonnes
     * 
     * @param columnName Le nom de colonne à normaliser
     * @return Le nom de colonne normalisé et standardisé
     */


    /**
     * Normalise un enregistrement CSV
     */
    public Map<String, String> normalizeRecord(Map<String, String> record) {
        if (record == null) {
            return new HashMap<>();
        }
        
        Map<String, String> normalizedRecord = new HashMap<>();
        
        for (Map.Entry<String, String> entry : record.entrySet()) {
            String key = entry.getKey();
            String value = entry.getValue();
            
            // Normaliser la clé (nom de colonne)
            String normalizedKey = key != null ? key.trim() : "";
            
            // Normaliser la valeur
            String normalizedValue = value != null ? value.trim() : "";
            
            normalizedRecord.put(normalizedKey, normalizedValue);
        }
        
        return normalizedRecord;
    }

    /**
     * Trouve une clé dans un enregistrement avec normalisation
     */
    private String findKeyWithNormalization(Map<String, String> record, String normalizedKeyColumn) {
        if (record == null || normalizedKeyColumn == null) return null;
        
        // Essayer d'abord la clé exacte
        String value = record.get(normalizedKeyColumn);
        if (value != null) {
            logger.debug("🔍 Clé exacte trouvée: '{}' -> '{}'", normalizedKeyColumn, value);
            return value;
        }
        
        // Essayer avec normalisation pour chaque clé de l'enregistrement
        for (Map.Entry<String, String> entry : record.entrySet()) {
            String normalizedEntryKey = entry.getKey();
            if (normalizedKeyColumn.equals(normalizedEntryKey)) {
                logger.debug("🔍 Clé normalisée trouvée: '{}' (original: '{}') -> '{}'", 
                    normalizedEntryKey, entry.getKey(), entry.getValue());
                return entry.getValue();
            }
        }
        
        // Debug: afficher toutes les clés disponibles si aucune correspondance
        logger.debug("❌ Aucune correspondance trouvée pour '{}'. Clés disponibles: {}", 
            normalizedKeyColumn, record.keySet());
        
        return null;
    }

    /**
     * Détermine l'action à effectuer basée sur les règles de correspondance configurées
     */
    private String determineActionFromRules(List<ConfigurableReconciliationService.CorrespondenceRule> rules, int partnerMatchCount) {
        for (ConfigurableReconciliationService.CorrespondenceRule rule : rules) {
            if (evaluateCondition(rule.getCondition(), partnerMatchCount)) {
                logger.debug("🔍 Règle appliquée: {} -> {}", rule.getName(), rule.getAction());
                return rule.getAction();
            }
        }
        
        // Action par défaut si aucune règle ne correspond
        logger.debug("🔍 Aucune règle ne correspond, action par défaut: MARK_AS_BO_ONLY");
        return "MARK_AS_BO_ONLY";
    }

    /**
     * Évalue une condition de règle
     */
    private boolean evaluateCondition(String condition, int partnerMatchCount) {
        if (condition == null) return false;
        
        // Remplacer les variables dans la condition
        String evaluatedCondition = condition.replace("partnerMatches", String.valueOf(partnerMatchCount));
        
        // Évaluer les conditions simples
        if (evaluatedCondition.contains("==")) {
            String[] parts = evaluatedCondition.split("==");
            if (parts.length == 2) {
                try {
                    int expectedCount = Integer.parseInt(parts[1].trim());
                    return partnerMatchCount == expectedCount;
                } catch (NumberFormatException e) {
                    logger.warn("⚠️ Impossible de parser le nombre dans la condition: {}", condition);
                }
            }
        } else if (evaluatedCondition.contains("!=")) {
            String[] parts = evaluatedCondition.split("!=");
            if (parts.length == 2) {
                try {
                    int expectedCount = Integer.parseInt(parts[1].trim());
                    return partnerMatchCount != expectedCount;
                } catch (NumberFormatException e) {
                    logger.warn("⚠️ Impossible de parser le nombre dans la condition: {}", condition);
                }
            }
        } else if (evaluatedCondition.contains(">=")) {
            String[] parts = evaluatedCondition.split(">=");
            if (parts.length == 2) {
                try {
                    int expectedCount = Integer.parseInt(parts[1].trim());
                    return partnerMatchCount >= expectedCount;
                } catch (NumberFormatException e) {
                    logger.warn("⚠️ Impossible de parser le nombre dans la condition: {}", condition);
                }
            }
        } else if (evaluatedCondition.contains("<=")) {
            String[] parts = evaluatedCondition.split("<=");
            if (parts.length == 2) {
                try {
                    int expectedCount = Integer.parseInt(parts[1].trim());
                    return partnerMatchCount <= expectedCount;
                } catch (NumberFormatException e) {
                    logger.warn("⚠️ Impossible de parser le nombre dans la condition: {}", condition);
                }
            }
        } else if (evaluatedCondition.contains(">")) {
            String[] parts = evaluatedCondition.split(">");
            if (parts.length == 2) {
                try {
                    int expectedCount = Integer.parseInt(parts[1].trim());
                    return partnerMatchCount > expectedCount;
                } catch (NumberFormatException e) {
                    logger.warn("⚠️ Impossible de parser le nombre dans la condition: {}", condition);
                }
            }
        } else if (evaluatedCondition.contains("<")) {
            String[] parts = evaluatedCondition.split("<");
            if (parts.length == 2) {
                try {
                    int expectedCount = Integer.parseInt(parts[1].trim());
                    return partnerMatchCount < expectedCount;
                } catch (NumberFormatException e) {
                    logger.warn("⚠️ Impossible de parser le nombre dans la condition: {}", condition);
                }
            }
        }
        
        logger.warn("⚠️ Condition non reconnue: {}", condition);
        return false;
    }
    
    /**
     * Applique les règles de traitement des colonnes aux données
     */
    private List<Map<String, String>> applyColumnProcessingRules(List<Map<String, String>> data, String fileType) {
        System.out.println("🔧 Application des règles de traitement pour le type: " + fileType);
        
        // Pour l'instant, appliquer une règle hardcodée pour IDTransaction
        // TODO: Récupérer les vraies règles depuis les modèles
        List<Map<String, String>> processedData = new ArrayList<>();
        
        for (Map<String, String> row : data) {
            Map<String, String> processedRow = new HashMap<>(row);
            
            // Règle spécifique pour IDTransaction : supprimer _CM
            if (processedRow.containsKey("IDTransaction")) {
                String originalValue = processedRow.get("IDTransaction");
                if (originalValue != null && originalValue.endsWith("_CM")) {
                    String newValue = originalValue.substring(0, originalValue.length() - 3);
                    processedRow.put("IDTransaction", newValue);
                    System.out.println("🔧 Transformation IDTransaction: \"" + originalValue + "\" → \"" + newValue + "\"");
                }
            }
            
            // Règle pour Numéro Trans GU : supprimer _CM aussi
            if (processedRow.containsKey("Numéro Trans GU")) {
                String originalValue = processedRow.get("Numéro Trans GU");
                if (originalValue != null && originalValue.endsWith("_CM")) {
                    String newValue = originalValue.substring(0, originalValue.length() - 3);
                    processedRow.put("Numéro Trans GU", newValue);
                    System.out.println("🔧 Transformation Numéro Trans GU: \"" + originalValue + "\" → \"" + newValue + "\"");
                }
            }
            
            processedData.add(processedRow);
        }
        
        System.out.println("✅ Règles appliquées à " + processedData.size() + " lignes");
        return processedData;
    }
} 