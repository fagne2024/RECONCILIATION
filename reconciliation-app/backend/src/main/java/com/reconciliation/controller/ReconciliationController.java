package com.reconciliation.controller;

import com.reconciliation.dto.ReconciliationRequest;
import com.reconciliation.dto.ReconciliationResponse;
import com.reconciliation.service.CsvReconciliationService;
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

    @PostMapping("/start")
    public ResponseEntity<Map<String, String>> startReconciliation(@RequestBody ReconciliationRequest req) {
        String jobId = UUID.randomUUID().toString();
        // reconciliationService.reconcileAsync(jobId, req); // Lancer en asynchrone (méthode non implémentée)
        Map<String, String> resp = new HashMap<>();
        resp.put("jobId", jobId);
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/progress")
    public ReconciliationProgress getProgress(@RequestParam String sessionId) {
        return progressService.getProgress(sessionId);
    }
} 