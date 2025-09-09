package com.reconciliation.controller;

import com.reconciliation.dto.ReconciliationRequest;
import com.reconciliation.dto.ReconciliationResponse;
import com.reconciliation.service.CsvReconciliationService;
import com.reconciliation.service.MagicReconciliationService;
import com.reconciliation.service.KeyDiscoveryService;
import com.reconciliation.service.ReconciliationJobService;
import com.reconciliation.entity.ReconciliationJob;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import jakarta.servlet.http.HttpServletRequest;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.List;
import java.util.ArrayList;
import java.util.Set;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;
import com.reconciliation.model.ReconciliationProgress;
import com.reconciliation.service.ReconciliationProgressService;
import com.reconciliation.repository.AgencySummaryRepository;
import com.reconciliation.entity.AgencySummaryEntity;
import com.reconciliation.service.OperationService;
import com.reconciliation.service.CompteService;
import com.reconciliation.dto.OperationCreateRequest;
import com.reconciliation.model.Compte;
import org.springframework.beans.factory.annotation.Autowired;

@Slf4j
@RestController
@RequestMapping("/api/reconciliation")
@RequiredArgsConstructor
public class ReconciliationController {

    private final CsvReconciliationService reconciliationService;
    @Autowired
    private ReconciliationProgressService progressService;
    @Autowired
    private MagicReconciliationService magicReconciliationService;
    @Autowired
    private KeyDiscoveryService keyDiscoveryService;
    @Autowired
    private ReconciliationJobService jobService;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private AgencySummaryRepository agencySummaryRepository;
    @Autowired
    private OperationService operationService;
    @Autowired
    private CompteService compteService;

    @GetMapping("/test")
    public ResponseEntity<String> test() {
        log.info("Test endpoint called");
        return ResponseEntity.ok("Serveur fonctionne - CORS OK");
    }

    @PostMapping("/reconcile")
    public ResponseEntity<ReconciliationResponse> reconcile(@RequestBody ReconciliationRequest request, HttpServletRequest httpRequest) {
        long startTime = System.currentTimeMillis();
        try {
            log.info("🚀 === REQUÊTE DE RÉCONCILIATION REÇUE ===");
            log.info("📊 Method: {}", httpRequest.getMethod());
            log.info("🌐 Origin: {}", httpRequest.getHeader("Origin"));
            log.info("📄 Content-Type: {}", httpRequest.getHeader("Content-Type"));
            log.info("⏱️  Timeout configuré: 10 minutes");
            
            // Journalisation optimisée des détails de la requête
            if (request != null) {
                log.info("📈 Nombre d'enregistrements BO: {}", 
                    request.getBoFileContent() != null ? request.getBoFileContent().size() : 0);
                log.info("📈 Nombre d'enregistrements Partenaire: {}", 
                    request.getPartnerFileContent() != null ? request.getPartnerFileContent().size() : 0);
                log.info("🔑 Colonne clé BO: {}", request.getBoKeyColumn());
                log.info("🔑 Colonne clé Partenaire: {}", request.getPartnerKeyColumn());
                
                // Vérification de la taille des données
                long boSize = request.getBoFileContent() != null ? request.getBoFileContent().size() : 0;
                long partnerSize = request.getPartnerFileContent() != null ? request.getPartnerFileContent().size() : 0;
                long totalSize = boSize + partnerSize;
                
                log.info("💾 Taille totale des données: {} enregistrements", totalSize);
                
                if (totalSize > 100000) {
                    log.warn("⚠️  GROS FICHIER DÉTECTÉ - Optimisations activées");
                    log.warn("📊 Taille: {} enregistrements ({} MB estimés)", totalSize, totalSize * 0.001);
                }
            }
            
            log.info("🔄 Début du traitement de la réconciliation...");
            ReconciliationResponse response = reconciliationService.reconcile(request);
            
            long totalTime = System.currentTimeMillis() - startTime;
            log.info("✅ Réconciliation terminée avec succès en {} ms ({:.2f} secondes)", totalTime, totalTime / 1000.0);
            log.info("📊 Résultats: {} correspondances, {} BO uniquement, {} Partenaire uniquement", 
                response.getMatches() != null ? response.getMatches().size() : 0,
                response.getBoOnly() != null ? response.getBoOnly().size() : 0,
                response.getPartnerOnly() != null ? response.getPartnerOnly().size() : 0);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            long totalTime = System.currentTimeMillis() - startTime;
            log.error("❌ Erreur lors de la réconciliation après {} ms: {}", totalTime, e.getMessage());
            log.error("🔍 Stack trace:", e);
            throw e;
        }
    }

    @PostMapping("/upload")
    public ResponseEntity<String> uploadFile(@RequestParam("file") MultipartFile file) {
        try {
            log.info("Reçu une demande d'upload de fichier: {} ({} bytes)", 
                file.getOriginalFilename(), file.getSize());
            String content = new String(file.getBytes(), StandardCharsets.UTF_8);
            log.debug("Longueur du contenu du fichier: {} caractères", content.length());
            return ResponseEntity.ok(content);
        } catch (IOException e) {
            log.error("Erreur lors de la lecture du fichier: {}", e.getMessage());
            return ResponseEntity.badRequest().body("Erreur lors de la lecture du fichier: " + e.getMessage());
        }
    }

    @PostMapping("/execute-magic")
    public ResponseEntity<Map<String, Object>> executeMagicReconciliation(
            @RequestParam("boFile") MultipartFile boFile,
            @RequestParam("partnerFile") MultipartFile partnerFile) {
        
        long startTime = System.currentTimeMillis();
        String jobId = UUID.randomUUID().toString();
        
        try {
            log.info("🚀 === RÉCONCILIATION MAGIQUE DÉMARRÉE ===");
            log.info("🎯 Job ID: {}", jobId);
            log.info("📁 Fichier BO: {} ({} bytes)", boFile.getOriginalFilename(), boFile.getSize());
            log.info("📁 Fichier Partenaire: {} ({} bytes)", partnerFile.getOriginalFilename(), partnerFile.getSize());
            
            progressService.createJob(jobId, "Réconciliation magique en cours...");
            
            // Lancer la réconciliation magique en arrière-plan
            magicReconciliationService.executeMagicReconciliation(
                parseCsvFile(boFile), 
                parseCsvFile(partnerFile), 
                jobId
            ).thenAccept(result -> {
                if (result.isSuccess()) {
                    log.info("✅ Réconciliation magique terminée avec succès pour le job: {}", jobId);
                    progressService.updateProgress(jobId, new ReconciliationProgress(100, "Réconciliation terminée avec succès", 0, 0));
                } else {
                    log.error("❌ Réconciliation magique échouée pour le job: {}", jobId);
                    progressService.updateProgress(jobId, new ReconciliationProgress(0, "Échec: " + result.getMessage(), 0, 0));
                }
            });
            
            Map<String, Object> response = new HashMap<>();
            response.put("jobId", jobId);
            response.put("status", "started");
            response.put("message", "Réconciliation magique lancée avec succès");
            
            long totalTime = System.currentTimeMillis() - startTime;
            log.info("✅ Réconciliation magique lancée en {} ms", totalTime);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            long totalTime = System.currentTimeMillis() - startTime;
            log.error("❌ Erreur lors de la réconciliation magique après {} ms: {}", totalTime, e.getMessage());
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", true);
            errorResponse.put("message", "Impossible de déterminer une clé de réconciliation fiable automatiquement. Veuillez utiliser le mode Assisté ou Manuel.");
            
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @PostMapping("/start")
    public ResponseEntity<Map<String, String>> startReconciliation(@RequestBody ReconciliationRequest req) {
        String jobId = UUID.randomUUID().toString();
        // reconciliationService.reconcileAsync(jobId, req); // Lancer en asynchrone (méthode non implémentée)
        Map<String, String> resp = new HashMap<>();
        resp.put("jobId", jobId);
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/progress")
    public ResponseEntity<Map<String, Object>> getProgress(@RequestParam String sessionId) {
        log.info("📊 Récupération des résultats pour le job: {}", sessionId);
        
        try {
            Optional<ReconciliationJob> jobOpt = jobService.getJobStatus(sessionId);
            
            if (jobOpt.isPresent()) {
                ReconciliationJob job = jobOpt.get();
                Map<String, Object> response = new HashMap<>();
                
                // Ajouter la progression
                ReconciliationProgress progress = progressService.getProgress(sessionId);
                response.put("progress", progress);
                
                // Ajouter le résultat si disponible
                if (job.getResultJson() != null) {
                    try {
                        ReconciliationResponse result = objectMapper.readValue(job.getResultJson(), 
                                ReconciliationResponse.class);
                        response.put("result", result);
                        log.info("✅ Résultats trouvés pour le job {}: {} correspondances", sessionId, 
                                result.getMatches() != null ? result.getMatches().size() : 0);
                    } catch (Exception e) {
                        log.warn("Erreur lors du parsing du résultat pour job {}", sessionId, e);
                    }
                } else {
                    log.warn("⚠️ Aucun résultat JSON pour le job: {}", sessionId);
                }
                
                // Ajouter l'erreur si présente
                if (job.getErrorMessage() != null) {
                    response.put("error", job.getErrorMessage());
                }
                
                return ResponseEntity.ok(response);
            } else {
                log.warn("⚠️ Job non trouvé: {}", sessionId);
                Map<String, Object> error = new HashMap<>();
                error.put("error", "Job non trouvé: " + sessionId);
                return ResponseEntity.notFound().build();
            }
            
        } catch (Exception e) {
            log.error("Erreur lors de la récupération des résultats du job {}", sessionId, e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Erreur serveur: " + e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }

    @GetMapping("/progress/{jobId}")
    public ResponseEntity<Map<String, Object>> getJobProgress(@PathVariable String jobId) {
        log.info("📊 Récupération des résultats pour le job: {}", jobId);
        
        try {
            Optional<ReconciliationJob> jobOpt = jobService.getJobStatus(jobId);
            
            if (jobOpt.isPresent()) {
                ReconciliationJob job = jobOpt.get();
                Map<String, Object> response = new HashMap<>();
                
                // Ajouter la progression
                ReconciliationProgress progress = progressService.getProgress(jobId);
                response.put("progress", progress);
                
                // Ajouter le résultat si disponible
                if (job.getResultJson() != null) {
                    try {
                        ReconciliationResponse result = objectMapper.readValue(job.getResultJson(), 
                                ReconciliationResponse.class);
                        response.put("result", result);
                    } catch (Exception e) {
                        log.warn("Erreur lors du parsing du résultat pour job {}", jobId, e);
                    }
                }
                
                // Ajouter l'erreur si présente
                if (job.getErrorMessage() != null) {
                    response.put("error", job.getErrorMessage());
                }
                
                return ResponseEntity.ok(response);
            } else {
                Map<String, Object> error = new HashMap<>();
                error.put("error", "Job non trouvé: " + jobId);
                return ResponseEntity.notFound().build();
            }
            
        } catch (Exception e) {
            log.error("Erreur lors de la récupération des résultats du job {}", jobId, e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Erreur serveur: " + e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }

    @GetMapping("/results")
    public ResponseEntity<Map<String, Object>> getResults(@RequestParam String sessionId) {
        try {
            log.info("📋 Récupération des résultats pour le job: {}", sessionId);
            
            // Récupérer les résultats depuis le service de jobs
            Optional<ReconciliationJob> jobOpt = jobService.getJobStatus(sessionId);
            if (!jobOpt.isPresent()) {
                log.warn("⚠️ Job non trouvé: {}", sessionId);
                return ResponseEntity.notFound().build();
            }
            
            ReconciliationJob job = jobOpt.get();
            if (job.getStatus() != ReconciliationJob.JobStatus.COMPLETED) {
                log.warn("⚠️ Job non terminé: {} (status: {})", sessionId, job.getStatus());
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("error", "Job non terminé - status: " + job.getStatus());
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            // Parser les résultats JSON
            if (job.getResultJson() == null) {
                log.error("❌ Aucun résultat JSON trouvé pour le job: {}", sessionId);
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("error", "Aucun résultat disponible");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            ReconciliationResponse result = objectMapper.readValue(job.getResultJson(), ReconciliationResponse.class);
            
            // Construire la réponse
            Map<String, Object> results = new HashMap<>();
            results.put("success", true);
            results.put("totalMatches", result.getTotalMatches());
            results.put("totalMismatches", result.getTotalMismatches());
            results.put("totalBoOnly", result.getTotalBoOnly());
            results.put("totalPartnerOnly", result.getTotalPartnerOnly());
            results.put("totalBoRecords", result.getTotalBoRecords());
            results.put("totalPartnerRecords", result.getTotalPartnerRecords());
            results.put("executionTime", result.getExecutionTimeMs());
            results.put("processedRecords", result.getProcessedRecords());
            
            // Détails des résultats
            results.put("matches", result.getMatches() != null ? result.getMatches() : new ArrayList<>());
            results.put("mismatches", result.getMismatches() != null ? result.getMismatches() : new ArrayList<>());
            results.put("boOnly", result.getBoOnly() != null ? result.getBoOnly() : new ArrayList<>());
            results.put("partnerOnly", result.getPartnerOnly() != null ? result.getPartnerOnly() : new ArrayList<>());
            
            // TODO: Ajouter les informations magiques si nécessaire
            log.info("✅ Résultats récupérés avec succès");
            
            log.info("✅ Résultats retournés pour le job: {} - {} correspondances", sessionId, result.getTotalMatches());
            return ResponseEntity.ok(results);
            
        } catch (Exception e) {
            log.error("❌ Erreur lors de la récupération des résultats pour le job {}: {}", sessionId, e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", "Impossible de récupérer les résultats: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @PostMapping("/analyze-keys")
    public ResponseEntity<Map<String, Object>> analyzeKeys(
            @RequestParam("boFile") MultipartFile boFile,
            @RequestParam("partnerFile") MultipartFile partnerFile) {
        
        long startTime = System.currentTimeMillis();
        log.info("🔍 === ANALYSE INTELLIGENTE DES CLÉS DÉMARRÉE ===");
        log.info("📁 Fichier BO: {} ({} bytes)", boFile.getOriginalFilename(), boFile.getSize());
        log.info("📁 Fichier Partenaire: {} ({} bytes)", partnerFile.getOriginalFilename(), partnerFile.getSize());
        
        try {
            // Vérifier que les fichiers sont présents
            if (boFile.isEmpty() || partnerFile.isEmpty()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", true);
                errorResponse.put("message", "Les deux fichiers (BO et Partenaire) sont requis");
                return ResponseEntity.badRequest().body(errorResponse);
            }
            
            // Parser les fichiers CSV (en-tête + 100 premières lignes max)
            List<Map<String, String>> boData = parseCsvFileLimited(boFile, 100);
            List<Map<String, String>> partnerData = parseCsvFileLimited(partnerFile, 100);
            
            log.info("📊 Données BO parsées: {} enregistrements", boData.size());
            log.info("📊 Données Partenaire parsées: {} enregistrements", partnerData.size());
            
            // Utiliser le service de découverte de clés existant
            KeyDiscoveryService.KeyDiscoveryResult discoveryResult = keyDiscoveryService.discoverKeys(boData, partnerData);
            
            // Construire la réponse avec les suggestions
            List<Map<String, Object>> suggestions = new ArrayList<>();
            
            for (KeyDiscoveryService.KeyCandidate candidate : discoveryResult.candidates) {
                Map<String, Object> suggestion = new HashMap<>();
                suggestion.put("boColumn", candidate.boColumn);
                suggestion.put("partnerColumn", candidate.partnerColumn);
                suggestion.put("confidenceScore", candidate.getOverallScore());
                
                // Calculer les taux d'unicité
                Map<String, Double> uniqueness = new HashMap<>();
                uniqueness.put("bo", calculateUniqueness(boData, candidate.boColumn));
                uniqueness.put("partner", calculateUniqueness(partnerData, candidate.partnerColumn));
                suggestion.put("uniqueness", uniqueness);
                
                // Extraire des exemples de données
                Map<String, List<String>> sampleData = new HashMap<>();
                sampleData.put("bo", extractSampleData(boData, candidate.boColumn, 3));
                sampleData.put("partner", extractSampleData(partnerData, candidate.partnerColumn, 3));
                suggestion.put("sampleData", sampleData);
                
                suggestions.add(suggestion);
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("suggestions", suggestions);
            response.put("totalAnalyzed", suggestions.size());
            response.put("overallConfidence", discoveryResult.confidence);
            
            long totalTime = System.currentTimeMillis() - startTime;
            log.info("✅ Analyse terminée en {} ms - {} suggestions trouvées", totalTime, suggestions.size());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            long totalTime = System.currentTimeMillis() - startTime;
            log.error("❌ Erreur lors de l'analyse des clés après {} ms: {}", totalTime, e.getMessage());
            log.error("🔍 Stack trace:", e);
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", true);
            errorResponse.put("message", "Erreur lors de l'analyse des clés: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
    
    /**
     * Parse un fichier CSV en liste de Map avec limitation du nombre de lignes
     */
    private List<Map<String, String>> parseCsvFileLimited(MultipartFile file, int maxLines) throws IOException {
        String content = new String(file.getBytes(), StandardCharsets.UTF_8);
        String[] lines = content.split("\n");
        
        if (lines.length < 2) {
            throw new IllegalArgumentException("Fichier CSV invalide: au moins 2 lignes requises (en-tête + données)");
        }
        
        // Parser l'en-tête (séparateur point-virgule)
        String[] headers = lines[0].split(";");
        List<Map<String, String>> data = new ArrayList<>();
        
        // Parser les données (limitées à maxLines)
        int dataLines = Math.min(lines.length - 1, maxLines);
        for (int i = 1; i <= dataLines; i++) {
            if (lines[i].trim().isEmpty()) continue;
            
            String[] values = lines[i].split(";");
            Map<String, String> row = new HashMap<>();
            
            for (int j = 0; j < Math.min(headers.length, values.length); j++) {
                row.put(headers[j].trim(), values[j].trim());
            }
            
            data.add(row);
        }
        
        log.info("📊 Fichier {} parsé: {} enregistrements (limité à {})", 
                file.getOriginalFilename(), data.size(), maxLines);
        return data;
    }
    
    /**
     * Calcule le taux d'unicité d'une colonne
     */
    private double calculateUniqueness(List<Map<String, String>> data, String column) {
        if (data.isEmpty()) return 0.0;
        
        Set<String> uniqueValues = data.stream()
                .map(row -> row.get(column))
                .filter(Objects::nonNull)
                .filter(val -> !val.trim().isEmpty())
                .collect(Collectors.toSet());
        
        return (double) uniqueValues.size() / data.size();
    }
    
    /**
     * Extrait des exemples de données d'une colonne
     */
    private List<String> extractSampleData(List<Map<String, String>> data, String column, int maxSamples) {
        return data.stream()
                .map(row -> row.get(column))
                .filter(Objects::nonNull)
                .filter(val -> !val.trim().isEmpty())
                .limit(maxSamples)
                .collect(Collectors.toList());
    }

    @PostMapping("/save-summary")
    public ResponseEntity<Map<String, Object>> saveSummary(@RequestBody Object summaryData) {
        try {
            log.info("💾 Sauvegarde du résumé de réconciliation");
            
            List<Map<String, Object>> savedItems = new ArrayList<>();
            List<Map<String, Object>> duplicateItems = new ArrayList<>();
            List<String> errorItems = new ArrayList<>();
            
            // Gérer les deux cas : objet ou tableau
            if (summaryData instanceof List) {
                List<?> summaryList = (List<?>) summaryData;
                log.info("📊 Résumé reçu sous forme de tableau avec {} éléments", summaryList.size());
                
                // Traiter chaque élément du tableau
                for (int i = 0; i < summaryList.size(); i++) {
                    Object item = summaryList.get(i);
                    try {
                        if (item instanceof Map) {
                            Map<?, ?> itemMap = (Map<?, ?>) item;
                            log.info("📋 Élément {}: {}", i, itemMap.keySet());
                            
                            // Sauvegarder réellement en base de données
                            AgencySummaryEntity savedEntity = saveAgencySummaryToDatabase(itemMap);
                            if (savedEntity != null) {
                                Map<String, Object> savedItem = new HashMap<>();
                                savedItem.put("index", i);
                                savedItem.put("id", savedEntity.getId());
                                savedItem.put("data", itemMap);
                                savedItem.put("timestamp", System.currentTimeMillis());
                                savedItems.add(savedItem);
                                log.info("✅ Élément {} sauvegardé en base avec ID: {}", i, savedEntity.getId());
                            } else {
                                errorItems.add("Impossible de sauvegarder l'élément " + i);
                            }
                            
                        } else {
                            log.info("📋 Élément {}: {}", i, item);
                            errorItems.add("Élément " + i + " n'est pas un objet valide pour la sauvegarde");
                        }
                    } catch (Exception itemError) {
                        log.warn("⚠️ Erreur lors du traitement de l'élément {}: {}", i, itemError.getMessage());
                        errorItems.add("Erreur sur l'élément " + i + ": " + itemError.getMessage());
                    }
                }
            } else if (summaryData instanceof Map) {
                Map<?, ?> summaryMap = (Map<?, ?>) summaryData;
                log.info("📊 Résumé reçu sous forme d'objet avec {} propriétés", summaryMap.size());
                log.info("📋 Propriétés: {}", summaryMap.keySet());
                
                // Sauvegarder l'objet unique
                AgencySummaryEntity savedEntity = saveAgencySummaryToDatabase(summaryMap);
                if (savedEntity != null) {
                    Map<String, Object> savedItem = new HashMap<>();
                    savedItem.put("id", savedEntity.getId());
                    savedItem.put("data", summaryMap);
                    savedItem.put("timestamp", System.currentTimeMillis());
                    savedItems.add(savedItem);
                    log.info("✅ Objet sauvegardé en base avec ID: {}", savedEntity.getId());
                } else {
                    errorItems.add("Impossible de sauvegarder l'objet");
                }
                
            } else {
                log.info("📊 Résumé reçu sous forme de: {}", summaryData.getClass().getSimpleName());
                errorItems.add("Type de données non supporté: " + summaryData.getClass().getSimpleName());
            }
            
            // Construire la réponse au format attendu par le frontend
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Résumé sauvegardé avec succès");
            response.put("timestamp", System.currentTimeMillis());
            response.put("dataType", summaryData.getClass().getSimpleName());
            
            // Ajouter les tableaux attendus par le frontend
            response.put("saved", savedItems);
            response.put("duplicates", duplicateItems);
            response.put("errors", errorItems);
            
            log.info("✅ Résumé sauvegardé avec succès - {} éléments sauvegardés, {} doublons, {} erreurs", 
                    savedItems.size(), duplicateItems.size(), errorItems.size());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("❌ Erreur lors de la sauvegarde du résumé: {}", e.getMessage());
            log.error("🔍 Stack trace:", e);
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Erreur lors de la sauvegarde: " + e.getMessage());
            errorResponse.put("saved", new ArrayList<>());
            errorResponse.put("duplicates", new ArrayList<>());
            errorResponse.put("errors", new ArrayList<>());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
    
    /**
     * Sauvegarde un résumé d'agence en base de données
     */
    private AgencySummaryEntity saveAgencySummaryToDatabase(Map<?, ?> data) {
        try {
            // Extraire les données du Map
            String agency = getStringValue(data, "agency");
            String service = getStringValue(data, "service");
            String country = getStringValue(data, "country");
            String date = getStringValue(data, "date");
            Double totalVolume = getDoubleValue(data, "totalVolume");
            Integer recordCount = getIntegerValue(data, "recordCount");
            
            // Validation des données requises
            if (agency == null || service == null || country == null || date == null || totalVolume == null || recordCount == null) {
                log.warn("⚠️ Données manquantes pour la sauvegarde: agency={}, service={}, country={}, date={}, totalVolume={}, recordCount={}", 
                        agency, service, country, date, totalVolume, recordCount);
                return null;
            }
            
            // Vérifier s'il existe déjà un enregistrement avec les mêmes critères
            List<AgencySummaryEntity> existing = agencySummaryRepository.findByDateAndAgencyAndService(date, agency, service);
            AgencySummaryEntity savedEntity;
            
            if (!existing.isEmpty()) {
                log.info("🔄 Mise à jour de l'enregistrement existant pour {}/{}/{}", date, agency, service);
                AgencySummaryEntity existingEntity = existing.get(0);
                existingEntity.setTotalVolume(totalVolume);
                existingEntity.setRecordCount(recordCount);
                existingEntity.setTimestamp(String.valueOf(System.currentTimeMillis()));
                savedEntity = agencySummaryRepository.save(existingEntity);
            } else {
                // Créer un nouvel enregistrement
                log.info("➕ Création d'un nouvel enregistrement pour {}/{}/{}", date, agency, service);
                AgencySummaryEntity newEntity = new AgencySummaryEntity();
                newEntity.setAgency(agency);
                newEntity.setService(service);
                newEntity.setCountry(country);
                newEntity.setDate(date);
                newEntity.setTotalVolume(totalVolume);
                newEntity.setRecordCount(recordCount);
                newEntity.setTimestamp(String.valueOf(System.currentTimeMillis()));
                savedEntity = agencySummaryRepository.save(newEntity);
            }
            
            // Créer automatiquement l'opération et mettre à jour le compte
            try {
                createOperationFromSummary(savedEntity);
                log.info("✅ Opération créée automatiquement pour {}/{}/{}", date, agency, service);
            } catch (Exception e) {
                log.warn("⚠️ Erreur lors de la création automatique de l'opération pour {}/{}/{}: {}", 
                        date, agency, service, e.getMessage());
                // Ne pas faire échouer la sauvegarde du summary à cause de l'opération
            }
            
            return savedEntity;
            
        } catch (Exception e) {
            log.error("❌ Erreur lors de la sauvegarde en base: {}", e.getMessage());
            return null;
        }
    }
    
    /**
     * Crée automatiquement 4 opérations à partir d'un AgencySummary
     * 1. Opération nominale agence (agence comme compte, service comme service)
     * 2. Opération frais agence (frais sur le compte agence)
     * 3. Opération nominale service (service comme compte, agence comme service)
     * 4. Opération frais service (frais sur le compte service)
     */
    private void createOperationFromSummary(AgencySummaryEntity summary) {
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
        
        log.info("🔧 Création opération nominale agence avec date: {} pour agence: {} service: {}", 
                summary.getDate(), summary.getAgency(), summary.getService());
        
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
        
        log.info("🔧 Création opération nominale service avec date: {} pour service: {} agence: {}", 
                summary.getDate(), summary.getService(), summary.getAgency());
        
        operationService.createOperationForSummary(serviceOperationRequest);
    }
    
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

    /**
     * Utilitaires pour extraire les valeurs du Map
     */
    private String getStringValue(Map<?, ?> map, String key) {
        Object value = map.get(key);
        return value != null ? value.toString() : null;
    }
    
    private Double getDoubleValue(Map<?, ?> map, String key) {
        Object value = map.get(key);
        if (value == null) return null;
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        try {
            return Double.parseDouble(value.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }
    
    private Integer getIntegerValue(Map<?, ?> map, String key) {
        Object value = map.get(key);
        if (value == null) return null;
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        try {
            return Integer.parseInt(value.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /**
     * Parse un fichier CSV en liste de Map
     */
    private List<Map<String, String>> parseCsvFile(MultipartFile file) throws IOException {
        String content = new String(file.getBytes(), StandardCharsets.UTF_8);
        String[] lines = content.split("\n");
        
        if (lines.length < 2) {
            throw new IllegalArgumentException("Fichier CSV invalide: au moins 2 lignes requises (en-tête + données)");
        }
        
        // Parser l'en-tête (séparateur point-virgule)
        String[] headers = lines[0].split(";");
        List<Map<String, String>> data = new ArrayList<>();
        
        // Parser les données
        for (int i = 1; i < lines.length; i++) {
            if (lines[i].trim().isEmpty()) continue;
            
            String[] values = lines[i].split(";");
            Map<String, String> row = new HashMap<>();
            
            for (int j = 0; j < Math.min(headers.length, values.length); j++) {
                row.put(headers[j].trim(), values[j].trim());
            }
            
            data.add(row);
        }
        
        log.info("📊 Fichier {} parsé: {} enregistrements", file.getOriginalFilename(), data.size());
        return data;
    }
} 