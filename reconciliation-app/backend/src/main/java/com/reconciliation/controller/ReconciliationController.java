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
import com.reconciliation.service.CompteRegroupementService;
import com.reconciliation.dto.OperationCreateRequest;
import com.reconciliation.model.Compte;
import com.reconciliation.model.Operation;
import com.reconciliation.entity.CompteEntity;
import org.springframework.beans.factory.annotation.Autowired;
import com.reconciliation.repository.ReconciliationOkRepository;
import com.reconciliation.entity.ReconciliationOkEntity;
import com.reconciliation.entity.ReconciliationStatusEntity;
import com.reconciliation.repository.ReconciliationStatusRepository;
import com.reconciliation.service.ReconciliationLockService;

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
    @Autowired
    private CompteRegroupementService compteRegroupementService;
    @Autowired
    private ReconciliationOkRepository reconOkRepository;
    @Autowired
    private ReconciliationStatusRepository reconStatusRepository;
    @Autowired
    private ReconciliationLockService lockService;

    @GetMapping("/test")
    public ResponseEntity<String> test() {
        log.info("Test endpoint called");
        return ResponseEntity.ok("Serveur fonctionne - CORS OK");
    }

    // Marquer une clé de réconciliation comme OK (à ignorer)
    @PostMapping("/mark-ok")
    public ResponseEntity<Map<String, Object>> markOk(@RequestParam("key") String key) {
        if (key == null || key.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(java.util.Map.of("success", false, "message", "Key manquante"));
        }
        if (!reconOkRepository.existsByKeyValue(key)) {
            reconOkRepository.save(new ReconciliationOkEntity(key.trim()));
        }
        return ResponseEntity.ok(java.util.Map.of("success", true));
    }

    // Marquer plusieurs clés comme OK (bulk)
    @PostMapping("/mark-ok/bulk")
    public ResponseEntity<Map<String, Object>> markOkBulk(@RequestBody Map<String, Object> body) {
        try {
            Object keysObj = body != null ? body.get("keys") : null;
            if (!(keysObj instanceof List)) {
                return ResponseEntity.badRequest().body(java.util.Map.of("success", false, "message", "Liste 'keys' requise"));
            }
            @SuppressWarnings("unchecked") List<Object> keysList = (List<Object>) keysObj;
            int created = 0;
            for (Object kObj : keysList) {
                if (kObj == null) continue;
                String key = kObj.toString().trim();
                if (key.isEmpty()) continue;
                if (!reconOkRepository.existsByKeyValue(key)) {
                    reconOkRepository.save(new ReconciliationOkEntity(key));
                    created++;
                }
            }
            return ResponseEntity.ok(java.util.Map.of("success", true, "created", created));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(java.util.Map.of("success", false, "message", e.getMessage()));
        }
    }

    // Récupérer toutes les clés OK
    @GetMapping("/ok-keys")
    public ResponseEntity<java.util.List<String>> getOkKeys() {
        java.util.List<String> keys = reconOkRepository.findAll().stream().map(ReconciliationOkEntity::getKeyValue).toList();
        return ResponseEntity.ok(keys);
    }

    // Annuler une clé OK (revenir sur l'action)
    @DeleteMapping("/mark-ok")
    public ResponseEntity<Map<String, Object>> unmarkOk(@RequestParam("key") String key) {
        try {
            if (key == null || key.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(java.util.Map.of("success", false, "message", "Key manquante"));
            }
            String cleaned = key.trim();
            var opt = reconOkRepository.findByKeyValue(cleaned);
            opt.ifPresent(reconOkRepository::delete);
            return ResponseEntity.ok(java.util.Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(java.util.Map.of("success", false, "message", e.getMessage()));
        }
    }

    // Annuler plusieurs clés OK (bulk)
    @PostMapping("/unmark-ok/bulk")
    public ResponseEntity<Map<String, Object>> unmarkOkBulk(@RequestBody Map<String, Object> body) {
        try {
            Object keysObj = body != null ? body.get("keys") : null;
            if (!(keysObj instanceof List)) {
                return ResponseEntity.badRequest().body(java.util.Map.of("success", false, "message", "Liste 'keys' requise"));
            }
            @SuppressWarnings("unchecked") List<Object> keysList = (List<Object>) keysObj;
            int deleted = 0;
            for (Object kObj : keysList) {
                if (kObj == null) continue;
                String key = kObj.toString().trim();
                if (key.isEmpty()) continue;
                var opt = reconOkRepository.findByKeyValue(key);
                if (opt.isPresent()) {
                    reconOkRepository.delete(opt.get());
                    deleted++;
                }
            }
            return ResponseEntity.ok(java.util.Map.of("success", true, "deleted", deleted));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(java.util.Map.of("success", false, "message", e.getMessage()));
        }
    }

    // Enregistrer le statut (OK/KO) d'une clé de correspondance
    @PostMapping("/status")
    public ResponseEntity<Map<String, Object>> saveStatus(@RequestParam("key") String key, @RequestParam("status") String status) {
        if (key == null || key.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(java.util.Map.of("success", false, "message", "Key manquante"));
        }
        String s = status != null ? status.trim().toUpperCase() : "";
        if (!s.equals("OK") && !s.equals("KO")) {
            return ResponseEntity.badRequest().body(java.util.Map.of("success", false, "message", "Status invalide"));
        }
        log.info("[RECON] saveStatus key={} status={}", key, s);
        String cleaned = key.trim();
        var opt = reconStatusRepository.findByKeyValue(cleaned);
        ReconciliationStatusEntity entity = opt.orElseGet(ReconciliationStatusEntity::new);
        entity.setKeyValue(cleaned);
        entity.setKeyStr(cleaned); // compat: anciennes bases avec colonne key_str NOT NULL
        entity.setStatus(s);
        reconStatusRepository.save(entity);
        log.info("[RECON] saveStatus persisted key={} status={}", key, s);
        return ResponseEntity.ok(java.util.Map.of("success", true));
    }

    // Enregistrer le statut pour plusieurs clés (bulk)
    @PostMapping("/status/bulk")
    public ResponseEntity<Map<String, Object>> saveStatusBulk(@RequestBody Map<String, Object> body) {
        try {
            if (body == null) {
                return ResponseEntity.badRequest().body(java.util.Map.of("success", false, "message", "Body requis"));
            }
            Object entriesObj = body.get("entries");
            if (!(entriesObj instanceof List)) {
                return ResponseEntity.badRequest().body(java.util.Map.of("success", false, "message", "Liste 'entries' requise"));
            }
            @SuppressWarnings("unchecked") List<Map<String, Object>> entries = (List<Map<String, Object>>) entriesObj;
            int saved = 0;
            for (Map<String, Object> entry : entries) {
                Object k = entry.get("key");
                Object s = entry.get("status");
                if (k == null || s == null) continue;
                String key = k.toString().trim();
                String status = s.toString().trim().toUpperCase();
                if (key.isEmpty()) continue;
                if (!status.equals("OK") && !status.equals("KO")) continue;
                var opt = reconStatusRepository.findByKeyValue(key);
                ReconciliationStatusEntity entity = opt.orElseGet(ReconciliationStatusEntity::new);
                entity.setKeyValue(key);
                entity.setKeyStr(key);
                entity.setStatus(status);
                reconStatusRepository.save(entity);
                saved++;
            }
            return ResponseEntity.ok(java.util.Map.of("success", true, "saved", saved));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(java.util.Map.of("success", false, "message", e.getMessage()));
        }
    }

    // Liste des statuts enregistrés
    @GetMapping("/status")
    public ResponseEntity<java.util.Map<String, String>> listStatus() {
        java.util.Map<String, String> map = new java.util.HashMap<>();
        reconStatusRepository.findAll().forEach(e -> map.put(e.getKeyValue(), e.getStatus()));
        log.info("[RECON] listStatus size={}", map.size());
        return ResponseEntity.ok(map);
    }

    @PostMapping("/reconcile")
    public ResponseEntity<ReconciliationResponse> reconcile(@RequestBody ReconciliationRequest request, HttpServletRequest httpRequest) {
        long startTime = System.currentTimeMillis();
        String userId = extractUserId(httpRequest);
        String lockKey = "reconcile_" + userId + "_" + System.currentTimeMillis();
        
        try {
            log.info("🚀 === REQUÊTE DE RÉCONCILIATION REÇUE ===");
            log.info("📊 Method: {}", httpRequest.getMethod());
            log.info("🌐 Origin: {}", httpRequest.getHeader("Origin"));
            log.info("📄 Content-Type: {}", httpRequest.getHeader("Content-Type"));
            log.info("👤 User ID: {}", userId);
            log.info("⏱️  Timeout configuré: 10 minutes");
            
            // Tenter d'acquérir un verrou pour cette réconciliation
            // Utiliser un verrou de type USER pour permettre plusieurs réconciliations simultanées par utilisateur
            boolean lockAcquired = lockService.acquireLock(lockKey, ReconciliationLockService.LOCK_TYPE_USER, userId, null, 60);
            
            if (!lockAcquired) {
                log.warn("⚠️ Impossible d'acquérir le verrou pour la réconciliation - Une autre réconciliation est peut-être en cours");
                // Ne pas bloquer complètement, mais logger l'avertissement
                // Dans un environnement de production, on pourrait retourner une erreur 429 (Too Many Requests)
            }
            
            try {
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
            } finally {
                // Libérer le verrou après le traitement
                if (lockAcquired) {
                    lockService.releaseLock(lockKey, ReconciliationLockService.LOCK_TYPE_USER);
                }
            }
        } catch (Exception e) {
            long totalTime = System.currentTimeMillis() - startTime;
            log.error("❌ Erreur lors de la réconciliation après {} ms: {}", totalTime, e.getMessage());
            log.error("🔍 Stack trace:", e);
            
            // Libérer le verrou en cas d'erreur
            lockService.releaseLock(lockKey, ReconciliationLockService.LOCK_TYPE_USER);
            
            throw e;
        }
    }

    @PostMapping("/upload")
    public ResponseEntity<String> uploadFile(@RequestParam("file") MultipartFile file, HttpServletRequest httpRequest) {
        long startTime = System.currentTimeMillis();
        String userId = extractUserId(httpRequest);
        
        try {
            log.info("📤 === REQUÊTE D'UPLOAD REÇUE ===");
            log.info("📁 Fichier: {} ({} bytes)", file.getOriginalFilename(), file.getSize());
            log.info("👤 User ID: {}", userId);
            
            // Traitement synchrone de l'upload sans verrou bloquant
            // Les uploads peuvent être traités simultanément
            String content = new String(file.getBytes(), StandardCharsets.UTF_8);
            log.debug("Longueur du contenu du fichier: {} caractères", content.length());
            
            long totalTime = System.currentTimeMillis() - startTime;
            log.info("✅ Upload terminé avec succès en {} ms", totalTime);
            
            return ResponseEntity.ok(content);
        } catch (IOException e) {
            long totalTime = System.currentTimeMillis() - startTime;
            log.error("❌ Erreur lors de la lecture du fichier après {} ms: {}", totalTime, e.getMessage());
            return ResponseEntity.badRequest().body("Erreur lors de la lecture du fichier: " + e.getMessage());
        } catch (Exception e) {
            long totalTime = System.currentTimeMillis() - startTime;
            log.error("❌ Erreur inattendue lors de l'upload après {} ms: {}", totalTime, e.getMessage());
            return ResponseEntity.status(500).body("Erreur serveur lors de l'upload: " + e.getMessage());
        }
    }

    @PostMapping("/execute-magic")
    public ResponseEntity<Map<String, Object>> executeMagicReconciliation(
            @RequestParam("boFile") MultipartFile boFile,
            @RequestParam("partnerFile") MultipartFile partnerFile,
            HttpServletRequest httpRequest) {
        
        long startTime = System.currentTimeMillis();
        String jobId = UUID.randomUUID().toString();
        String userId = extractUserId(httpRequest);
        String jobLockKey = "magic_" + jobId;
        boolean jobLockAcquired = false;
        
        try {
            log.info("🚀 === RÉCONCILIATION MAGIQUE DÉMARRÉE ===");
            log.info("🎯 Job ID: {}", jobId);
            log.info("👤 User ID: {}", userId);
            log.info("📁 Fichier BO: {} ({} bytes)", boFile.getOriginalFilename(), boFile.getSize());
            log.info("📁 Fichier Partenaire: {} ({} bytes)", partnerFile.getOriginalFilename(), partnerFile.getSize());
            
            // Acquérir un verrou pour ce job de réconciliation (pas pour l'upload)
            // Les uploads peuvent être traités simultanément, seule la réconciliation est verrouillée
            jobLockAcquired = lockService.acquireLock(jobLockKey, ReconciliationLockService.LOCK_TYPE_JOB, userId, jobId, 60);
            
            if (!jobLockAcquired) {
                log.warn("⚠️ Impossible d'acquérir le verrou pour le job: {} - Une autre réconciliation est peut-être en cours", jobId);
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", true);
                errorResponse.put("message", "Une réconciliation est déjà en cours. Veuillez patienter.");
                return ResponseEntity.status(429).body(errorResponse);
            }
            
            try {
                progressService.createJob(jobId, "Réconciliation magique en cours...");
                
                // Lancer la réconciliation magique en arrière-plan
                magicReconciliationService.executeMagicReconciliation(
                    parseCsvFile(boFile), 
                    parseCsvFile(partnerFile), 
                    jobId
                ).thenAccept(result -> {
                    try {
                        if (result.isSuccess()) {
                            log.info("✅ Réconciliation magique terminée avec succès pour le job: {}", jobId);
                            progressService.updateProgress(jobId, new ReconciliationProgress(100, "Réconciliation terminée avec succès", 0, 0));
                        } else {
                            log.error("❌ Réconciliation magique échouée pour le job: {}", jobId);
                            progressService.updateProgress(jobId, new ReconciliationProgress(0, "Échec: " + result.getMessage(), 0, 0));
                        }
                    } finally {
                        // Libérer le verrou du job après le traitement
                        lockService.releaseLock(jobLockKey, ReconciliationLockService.LOCK_TYPE_JOB);
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
                // Libérer le verrou en cas d'erreur
                if (jobLockAcquired) {
                    lockService.releaseLock(jobLockKey, ReconciliationLockService.LOCK_TYPE_JOB);
                }
                throw e;
            }
            
        } catch (Exception e) {
            long totalTime = System.currentTimeMillis() - startTime;
            log.error("❌ Erreur lors de la réconciliation magique après {} ms: {}", totalTime, e.getMessage());
            
            // S'assurer que le verrou est libéré
            if (jobLockAcquired) {
                lockService.releaseLock(jobLockKey, ReconciliationLockService.LOCK_TYPE_JOB);
            }
            
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
            @RequestParam("partnerFile") MultipartFile partnerFile,
            HttpServletRequest httpRequest) {
        
        long startTime = System.currentTimeMillis();
        String userId = extractUserId(httpRequest);
        
        try {
            log.info("🔍 === ANALYSE INTELLIGENTE DES CLÉS DÉMARRÉE ===");
            log.info("👤 User ID: {}", userId);
            log.info("📁 Fichier BO: {} ({} bytes)", boFile.getOriginalFilename(), boFile.getSize());
            log.info("📁 Fichier Partenaire: {} ({} bytes)", partnerFile.getOriginalFilename(), partnerFile.getSize());
            
            // Traitement synchrone sans verrou bloquant
            // Les uploads peuvent être traités simultanément
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
                                // Vérifier si c'est un doublon ou une erreur
                                String agency = getStringValue(itemMap, "agency");
                                String service = getStringValue(itemMap, "service");
                                String date = getStringValue(itemMap, "date");
                                Double totalVolume = getDoubleValue(itemMap, "totalVolume");
                                Integer recordCount = getIntegerValue(itemMap, "recordCount");
                                
                                if (agency != null && service != null && date != null && totalVolume != null && recordCount != null) {
                                    // C'est probablement un doublon
                                    Map<String, Object> duplicateItem = new HashMap<>();
                                    duplicateItem.put("index", i);
                                    duplicateItem.put("data", itemMap);
                                    duplicateItem.put("message", String.format(
                                        "❌ Doublon détecté pour l'agence %s, service %s, date %s, volume %.2f, records %d",
                                        agency, service, date, totalVolume, recordCount
                                    ));
                                    duplicateItems.add(duplicateItem);
                                    log.info("❌ Élément {} est un doublon - ignoré", i);
                                } else {
                                    errorItems.add("Impossible de sauvegarder l'élément " + i + " - données manquantes");
                                }
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
                    // Vérifier si c'est un doublon ou une erreur
                    String agency = getStringValue(summaryMap, "agency");
                    String service = getStringValue(summaryMap, "service");
                    String date = getStringValue(summaryMap, "date");
                    Double totalVolume = getDoubleValue(summaryMap, "totalVolume");
                    Integer recordCount = getIntegerValue(summaryMap, "recordCount");
                    
                    if (agency != null && service != null && date != null && totalVolume != null && recordCount != null) {
                        // C'est probablement un doublon
                        Map<String, Object> duplicateItem = new HashMap<>();
                        duplicateItem.put("data", summaryMap);
                        duplicateItem.put("message", String.format(
                            "❌ Doublon détecté pour l'agence %s, service %s, date %s, volume %.2f, records %d",
                            agency, service, date, totalVolume, recordCount
                        ));
                        duplicateItems.add(duplicateItem);
                        log.info("❌ Objet est un doublon - ignoré");
                    } else {
                        errorItems.add("Impossible de sauvegarder l'objet - données manquantes");
                    }
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
            // Log de débogage pour voir les données reçues
            log.info("🔍 DEBUG saveAgencySummaryToDatabase - Données reçues: {}", data);
            log.info("🔍 DEBUG saveAgencySummaryToDatabase - Clés disponibles: {}", data.keySet());
            
            // Extraire les données du Map
            String agency = getStringValue(data, "agency");
            String service = getStringValue(data, "service");
            String country = getStringValue(data, "country");
            String date = getStringValue(data, "date");
            Double totalVolume = getDoubleValue(data, "totalVolume");
            Integer recordCount = getIntegerValue(data, "recordCount");
            
            log.info("🔍 DEBUG saveAgencySummaryToDatabase - Valeurs extraites: agency={}, service={}, country={}, date={}, totalVolume={}, recordCount={}", 
                    agency, service, country, date, totalVolume, recordCount);
            
            // Validation des données requises
            if (agency == null || service == null || country == null || date == null || totalVolume == null || recordCount == null) {
                log.warn("⚠️ Données manquantes pour la sauvegarde: agency={}, service={}, country={}, date={}, totalVolume={}, recordCount={}", 
                        agency, service, country, date, totalVolume, recordCount);
                return null;
            }
            
            // Vérifier s'il existe déjà un enregistrement avec les mêmes critères (y compris volume et recordCount)
            List<AgencySummaryEntity> existingDuplicates = agencySummaryRepository.findDuplicates(
                date, agency, service, totalVolume, recordCount
            );
            
            if (!existingDuplicates.isEmpty()) {
                log.info("❌ Doublon détecté pour {}/{}/{} - Volume: {}, Records: {}", 
                        date, agency, service, totalVolume, recordCount);
                return null; // Ne pas sauvegarder le doublon
            }
            
            // Vérifier s'il existe un enregistrement avec les mêmes critères de base (pour mise à jour)
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
                log.error("❌ Erreur lors de la création automatique de l'opération pour {}/{}/{}: {}", 
                        date, agency, service, e.getMessage());
                log.error("🔍 Stack trace complète:", e);
                // Ne pas faire échouer la sauvegarde du summary à cause de l'opération
                // Mais continuer avec la création du compte service et la synchronisation
                try {
                    createServiceAccountAndSyncBalances(savedEntity);
                    log.info("✅ Compte service créé et soldes synchronisés pour {}/{}/{}", date, agency, service);
                } catch (Exception syncError) {
                    log.error("❌ Erreur lors de la synchronisation des soldes pour {}/{}/{}: {}", 
                            date, agency, service, syncError.getMessage());
                }
            }
            
            return savedEntity;
            
        } catch (Exception e) {
            log.error("❌ Erreur lors de la sauvegarde en base: {}", e.getMessage());
            return null;
        }
    }
    
    /**
     * Crée automatiquement les opérations à partir d'un AgencySummary
     * Crée les comptes agence et service s'ils n'existent pas
     * Applique les mêmes impacts sur les deux comptes
     * Synchronise les soldes des comptes fusionés
     */
    private void createOperationFromSummary(AgencySummaryEntity summary) {
        try {
            log.info("🔧 Début de création d'opération pour summary: {}/{}/{}", 
                    summary.getAgency(), summary.getService(), summary.getDate());
            
            // 1. Créer le compte agence
            String agencyAccountNumber = summary.getAgency();
            Compte agencyCompte = compteService.getCompteByNumero(agencyAccountNumber)
                .orElseGet(() -> {
                    log.info("➕ Création du compte agence: {}", agencyAccountNumber);
                    Compte newCompte = new Compte();
                    newCompte.setNumeroCompte(agencyAccountNumber);
                    newCompte.setPays(summary.getCountry() != null ? summary.getCountry() : "SN");
                    newCompte.setCodeProprietaire(agencyAccountNumber);
                    newCompte.setAgence(agencyAccountNumber);
                    newCompte.setSolde(0.0);
                    return compteService.saveCompte(newCompte);
                });
            
            log.info("✅ Compte agence trouvé/créé: ID={}, Numéro={}", agencyCompte.getId(), agencyCompte.getNumeroCompte());

            // 2. Créer le compte service
            String serviceAccountNumber = summary.getService();
            Compte serviceCompte = compteService.getCompteByNumero(serviceAccountNumber)
                .orElseGet(() -> {
                    log.info("➕ Création du compte service: {}", serviceAccountNumber);
                    Compte newCompte = new Compte();
                    newCompte.setNumeroCompte(serviceAccountNumber);
                    newCompte.setPays(summary.getCountry() != null ? summary.getCountry() : "SN");
                    newCompte.setCodeProprietaire(serviceAccountNumber);
                    newCompte.setAgence(agencyAccountNumber);
                    newCompte.setSolde(0.0);
                    return compteService.saveCompte(newCompte);
                });
            
            log.info("✅ Compte service trouvé/créé: ID={}, Numéro={}", serviceCompte.getId(), serviceCompte.getNumeroCompte());

            String operationType = determineOperationType(summary.getService());
            
            // 3. Créer l'opération pour l'agence
            try {
                OperationCreateRequest agencyOperationRequest = new OperationCreateRequest();
                agencyOperationRequest.setCompteId(agencyCompte.getId());
                agencyOperationRequest.setTypeOperation(operationType);
                agencyOperationRequest.setMontant(summary.getTotalVolume());
                agencyOperationRequest.setBanque("SYSTEM");
                agencyOperationRequest.setNomBordereau("AGENCY_SUMMARY_" + summary.getDate() + "_" + summary.getAgency());
                agencyOperationRequest.setService(summary.getService());
                agencyOperationRequest.setDateOperation(summary.getDate());
                agencyOperationRequest.setRecordCount(summary.getRecordCount());
                
                log.info("🔧 Création opération agence: type={}, montant={}, service={}", 
                        operationType, summary.getTotalVolume(), summary.getService());
                
                operationService.createOperationForSummary(agencyOperationRequest);
                log.info("✅ Opération agence créée avec succès");
                
                // Synchroniser immédiatement les soldes des comptes consolidés après la création de l'opération
                synchroniserComptesConsolides(agencyCompte.getId());
                
                // Synchroniser également les comptes consolidés qui contiennent ce service dans leur codeProprietaire
                synchroniserComptesConsolidesParCodeProprietaire(summary.getService());
                
            } catch (Exception agencyError) {
                log.error("❌ Erreur lors de la création de l'opération agence: {}", agencyError.getMessage());
                // Continuer avec l'opération service même si l'agence échoue
            }
            
            // 4. Créer l'opération pour le service
            try {
                OperationCreateRequest serviceOperationRequest = new OperationCreateRequest();
                serviceOperationRequest.setCompteId(serviceCompte.getId());
                serviceOperationRequest.setTypeOperation(operationType);
                serviceOperationRequest.setMontant(summary.getTotalVolume());
                serviceOperationRequest.setBanque("SYSTEM");
                serviceOperationRequest.setNomBordereau("SERVICE_SUMMARY_" + summary.getDate() + "_" + summary.getService());
                serviceOperationRequest.setService(summary.getAgency()); // L'agence devient le service
                serviceOperationRequest.setDateOperation(summary.getDate());
                serviceOperationRequest.setRecordCount(summary.getRecordCount());
                
                log.info("🔧 Création opération service: type={}, montant={}, service={}", 
                        operationType, summary.getTotalVolume(), summary.getAgency());
                
                Operation serviceOperation = operationService.createOperationForSummary(serviceOperationRequest);
                log.info("✅ Opération service créée avec ID: {}", serviceOperation.getId());
                
                // Synchroniser immédiatement les soldes des comptes consolidés après la création de l'opération
                synchroniserComptesConsolides(serviceCompte.getId());
                
                // Synchroniser également les comptes consolidés qui contiennent ce service dans leur codeProprietaire
                synchroniserComptesConsolidesParCodeProprietaire(summary.getService());
                
            } catch (Exception serviceError) {
                log.error("❌ Erreur lors de la création de l'opération service: {}", serviceError.getMessage());
                // Ne pas faire échouer complètement la méthode
            }
            
            // 5. Synchroniser les soldes des comptes consolidés
            try {
                synchroniserComptesConsolides(agencyCompte.getId());
                synchroniserComptesConsolides(serviceCompte.getId());
                
                // Synchroniser également tous les comptes consolidés pour s'assurer de la cohérence
                synchroniserTousLesComptesConsolides();
                
                log.info("✅ Soldes des comptes consolidés synchronisés");
            } catch (Exception syncError) {
                log.error("❌ Erreur lors de la synchronisation des soldes consolidés: {}", syncError.getMessage());
                // Ne pas faire échouer la méthode pour une erreur de synchronisation
            }
            
            log.info("✅ Création des opérations terminée pour {}/{}/{}", 
                    summary.getAgency(), summary.getService(), summary.getDate());
                    
        } catch (Exception e) {
            log.error("❌ Erreur lors de la création des opérations pour {}/{}/{}: {}", 
                    summary.getAgency(), summary.getService(), summary.getDate(), e.getMessage());
            log.error("🔍 Stack trace complète:", e);
            throw new RuntimeException("Erreur lors de la création des opérations: " + e.getMessage(), e);
        }
    }
    
    /**
     * Crée le compte service et synchronise les soldes des comptes fusionés
     * Utilisé en cas d'échec de la création des opérations complètes
     */
    private void createServiceAccountAndSyncBalances(AgencySummaryEntity summary) {
        try {
            log.info("🔧 Création du compte service et synchronisation des soldes pour {}/{}/{}", 
                    summary.getAgency(), summary.getService(), summary.getDate());
            
            // 1. Créer le compte agence s'il n'existe pas
            String agencyAccountNumber = summary.getAgency();
            Compte agencyCompte = compteService.getCompteByNumero(agencyAccountNumber)
                .orElseGet(() -> {
                    log.info("➕ Création du compte agence: {}", agencyAccountNumber);
                    Compte newCompte = new Compte();
                    newCompte.setNumeroCompte(agencyAccountNumber);
                    newCompte.setPays(summary.getCountry() != null ? summary.getCountry() : "SN");
                    newCompte.setCodeProprietaire(agencyAccountNumber);
                    newCompte.setAgence(agencyAccountNumber);
                    newCompte.setSolde(0.0);
                    return compteService.saveCompte(newCompte);
                });
            
            // 2. Créer le compte service s'il n'existe pas
            String serviceAccountNumber = summary.getService();
            Compte serviceCompte = compteService.getCompteByNumero(serviceAccountNumber)
                .orElseGet(() -> {
                    log.info("➕ Création du compte service: {}", serviceAccountNumber);
                    Compte newCompte = new Compte();
                    newCompte.setNumeroCompte(serviceAccountNumber);
                    newCompte.setPays(summary.getCountry() != null ? summary.getCountry() : "SN");
                    newCompte.setCodeProprietaire(serviceAccountNumber);
                    newCompte.setAgence(agencyAccountNumber);
                    newCompte.setSolde(0.0);
                    return compteService.saveCompte(newCompte);
                });
            
            log.info("✅ Comptes agence et service créés/vérifiés: agence={}, service={}", 
                    agencyCompte.getId(), serviceCompte.getId());
            
            // 3. Synchroniser les soldes des comptes consolidés
            try {
                // Synchroniser le compte agence
                synchroniserComptesConsolides(agencyCompte.getId());
                log.info("✅ Soldes consolidés synchronisés pour le compte agence: {}", agencyAccountNumber);
                
                // Synchroniser le compte service
                synchroniserComptesConsolides(serviceCompte.getId());
                log.info("✅ Soldes consolidés synchronisés pour le compte service: {}", serviceAccountNumber);
                
                // Synchroniser également tous les comptes consolidés pour s'assurer de la cohérence globale
                synchroniserTousLesComptesConsolides();
                
                // Synchroniser les comptes consolidés qui contiennent ce service dans leur codeProprietaire
                synchroniserComptesConsolidesParCodeProprietaire(summary.getService());
                
                log.info("✅ Synchronisation globale des comptes consolidés terminée");
                
            } catch (Exception syncError) {
                log.error("❌ Erreur lors de la synchronisation des soldes consolidés: {}", syncError.getMessage());
                // Ne pas faire échouer la méthode pour une erreur de synchronisation
            }
            
            log.info("✅ Création du compte service et synchronisation terminée pour {}/{}/{}", 
                    summary.getAgency(), summary.getService(), summary.getDate());
                    
        } catch (Exception e) {
            log.error("❌ Erreur lors de la création du compte service et synchronisation pour {}/{}/{}: {}", 
                    summary.getAgency(), summary.getService(), summary.getDate(), e.getMessage());
            throw new RuntimeException("Erreur lors de la création du compte service: " + e.getMessage(), e);
        }
    }
    
    /**
     * Synchronise les comptes consolidés qui dépendent du compte modifié
     */
    private void synchroniserComptesConsolides(Long compteId) {
        try {
            // Utiliser le service de regroupement pour synchroniser les soldes
            if (compteRegroupementService != null) {
                List<CompteEntity> comptesConsolides = compteRegroupementService.getComptesConsolidesDependants(compteId);
                for (CompteEntity compteConsolide : comptesConsolides) {
                    compteRegroupementService.synchroniserSoldeCompteConsolide(compteConsolide.getId());
                }
                log.info("✅ Synchronisation des comptes consolidés terminée pour le compte: {}", compteId);
            } else {
                log.warn("⚠️ Service de regroupement non disponible pour la synchronisation du compte: {}", compteId);
            }
        } catch (Exception e) {
            log.error("❌ Erreur lors de la synchronisation des comptes consolidés pour le compte {}: {}", 
                    compteId, e.getMessage(), e);
        }
    }
    
    /**
     * Synchronise tous les comptes consolidés pour assurer la cohérence globale
     */
    private void synchroniserTousLesComptesConsolides() {
        try {
            if (compteRegroupementService != null) {
                compteRegroupementService.synchroniserTousLesComptesConsolides();
                log.info("✅ Synchronisation globale de tous les comptes consolidés terminée");
            } else {
                log.warn("⚠️ Service de regroupement non disponible pour la synchronisation globale");
            }
        } catch (Exception e) {
            log.error("❌ Erreur lors de la synchronisation globale des comptes consolidés: {}", e.getMessage(), e);
        }
    }
    
    /**
     * Synchronise les comptes consolidés basé sur le codeProprietaire
     * Cette méthode trouve les comptes consolidés qui contiennent le service dans leur codeProprietaire
     */
    private void synchroniserComptesConsolidesParCodeProprietaire(String serviceCode) {
        try {
            if (compteRegroupementService != null) {
                compteRegroupementService.synchroniserComptesConsolidesParCodeProprietaire(serviceCode);
                log.info("✅ Synchronisation des comptes consolidés par codeProprietaire terminée pour le service: {}", serviceCode);
            } else {
                log.warn("⚠️ Service de regroupement non disponible pour la synchronisation par codeProprietaire");
            }
        } catch (Exception e) {
            log.error("❌ Erreur lors de la synchronisation par codeProprietaire pour le service {}: {}", serviceCode, e.getMessage(), e);
        }
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
        if (value != null) {
            log.debug("🔍 DEBUG getStringValue - Clé '{}' trouvée avec valeur: {}", key, value);
            return value.toString();
        }
        
        // Pour le pays, chercher aussi dans paysProvenance (fichiers GRX)
        if ("country".equals(key)) {
            log.debug("🔍 DEBUG getStringValue - Recherche du pays dans les colonnes GRX");
            Object paysProvenance = map.get("paysProvenance");
            if (paysProvenance != null) {
                log.info("✅ DEBUG getStringValue - Pays trouvé dans 'paysProvenance': {}", paysProvenance);
                return paysProvenance.toString();
            }
            // Chercher aussi dans "Pays provenance"
            Object paysProvenanceWithSpace = map.get("Pays provenance");
            if (paysProvenanceWithSpace != null) {
                log.info("✅ DEBUG getStringValue - Pays trouvé dans 'Pays provenance': {}", paysProvenanceWithSpace);
                return paysProvenanceWithSpace.toString();
            }
            log.warn("❌ DEBUG getStringValue - Aucun pays trouvé dans les colonnes GRX");
        }
        
        log.debug("🔍 DEBUG getStringValue - Clé '{}' non trouvée", key);
        return null;
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
    
    /**
     * Extrait l'identifiant de l'utilisateur depuis la requête HTTP
     * Utilise l'adresse IP comme identifiant par défaut si aucun utilisateur n'est authentifié
     */
    private String extractUserId(HttpServletRequest request) {
        // Essayer d'extraire un userId depuis les headers ou la session
        String userId = request.getHeader("X-User-Id");
        if (userId != null && !userId.trim().isEmpty()) {
            return userId.trim();
        }
        
        // Utiliser l'adresse IP comme identifiant par défaut
        String remoteAddr = request.getRemoteAddr();
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.trim().isEmpty()) {
            remoteAddr = forwardedFor.split(",")[0].trim();
        }
        
        return "user_" + (remoteAddr != null ? remoteAddr : "unknown");
    }
} 