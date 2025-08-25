package com.reconciliation.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.reconciliation.dto.ReconciliationConfig;
import com.reconciliation.entity.ReconciliationJob;
import com.reconciliation.service.ReconciliationJobService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/reconciliation")
@RequiredArgsConstructor
@Slf4j
public class ReconciliationWebSocketController {
    
    private final ReconciliationJobService jobService;
    private final ObjectMapper objectMapper;
    
    /**
     * Upload et préparation des fichiers pour réconciliation
     */
    @PostMapping("/upload-and-prepare")
    public ResponseEntity<Map<String, String>> uploadAndPrepare(
            @RequestParam("boFile") MultipartFile boFile,
            @RequestParam("partnerFile") MultipartFile partnerFile,
            @RequestParam("boReconciliationKey") String boReconciliationKey,
            @RequestParam("partnerReconciliationKey") String partnerReconciliationKey,
            @RequestParam(value = "additionalKeys", required = false) String additionalKeysJson,
            @RequestParam(value = "tolerance", required = false) String toleranceStr,
            @RequestParam(value = "clientId", required = false) String clientId) {
        
        try {
            log.info("Upload et préparation des fichiers - BO: {}, Partner: {}", 
                    boFile.getOriginalFilename(), partnerFile.getOriginalFilename());
            
            // Créer la configuration
            ReconciliationConfig config = new ReconciliationConfig();
            config.setBoReconciliationKey(boReconciliationKey);
            config.setPartnerReconciliationKey(partnerReconciliationKey);
            
            // Parser les clés supplémentaires si fournies
            if (additionalKeysJson != null && !additionalKeysJson.isEmpty()) {
                config.setAdditionalKeys(objectMapper.readValue(additionalKeysJson, 
                        objectMapper.getTypeFactory().constructCollectionType(
                                java.util.List.class, ReconciliationConfig.AdditionalKey.class)));
            }
            
            // Parser la tolérance si fournie
            if (toleranceStr != null && !toleranceStr.isEmpty()) {
                config.setTolerance(Double.parseDouble(toleranceStr));
            }
            
            // Générer un clientId si non fourni
            if (clientId == null || clientId.isEmpty()) {
                clientId = "client_" + System.currentTimeMillis() + "_" + 
                          java.util.UUID.randomUUID().toString().substring(0, 8);
            }
            
            // Créer le job
            String jobId = jobService.createJob(boFile, partnerFile, config, clientId);
            
            Map<String, String> response = new HashMap<>();
            response.put("jobId", jobId);
            response.put("status", "prepared");
            response.put("clientId", clientId);
            
            log.info("Job créé avec succès: {}", jobId);
            return ResponseEntity.ok(response);
            
        } catch (IOException e) {
            log.error("Erreur lors de l'upload des fichiers", e);
            Map<String, String> error = new HashMap<>();
            error.put("error", "Erreur lors de l'upload: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    /**
     * Récupère le statut d'un job
     */
    @GetMapping("/status/{jobId}")
    public ResponseEntity<Map<String, Object>> getJobStatus(@PathVariable String jobId) {
        try {
            Optional<ReconciliationJob> jobOpt = jobService.getJobStatus(jobId);
            
            if (jobOpt.isPresent()) {
                ReconciliationJob job = jobOpt.get();
                Map<String, Object> response = new HashMap<>();
                response.put("status", job.getStatus().name());
                response.put("createdAt", job.getCreatedAt());
                response.put("updatedAt", job.getUpdatedAt());
                
                // Ajouter la progression si disponible
                if (job.getProgressJson() != null) {
                    try {
                        response.put("progress", objectMapper.readValue(job.getProgressJson(), 
                                com.reconciliation.dto.ProgressUpdate.class));
                    } catch (JsonProcessingException e) {
                        log.warn("Erreur lors du parsing de la progression pour job {}", jobId);
                    }
                }
                
                // Ajouter le résultat si disponible
                if (job.getResultJson() != null) {
                    try {
                        response.put("result", objectMapper.readValue(job.getResultJson(), 
                                com.reconciliation.dto.ReconciliationResponse.class));
                    } catch (JsonProcessingException e) {
                        log.warn("Erreur lors du parsing du résultat pour job {}", jobId);
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
            log.error("Erreur lors de la récupération du statut du job {}", jobId, e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Erreur serveur: " + e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }
    
    /**
     * Annule un job
     */
    @PostMapping("/cancel")
    public ResponseEntity<Map<String, String>> cancelJob(@RequestBody Map<String, String> request) {
        try {
            String jobId = request.get("jobId");
            if (jobId == null || jobId.isEmpty()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "jobId requis");
                return ResponseEntity.badRequest().body(error);
            }
            
            jobService.cancelJob(jobId);
            
            Map<String, String> response = new HashMap<>();
            response.put("status", "cancelled");
            response.put("jobId", jobId);
            
            log.info("Job annulé: {}", jobId);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Erreur lors de l'annulation du job", e);
            Map<String, String> error = new HashMap<>();
            error.put("error", "Erreur lors de l'annulation: " + e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }
    
    /**
     * Endpoint de santé pour vérifier que le service fonctionne
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "healthy");
        response.put("timestamp", java.time.LocalDateTime.now().toString());
        response.put("websocket", "enabled");
        return ResponseEntity.ok(response);
    }
}
