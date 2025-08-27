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