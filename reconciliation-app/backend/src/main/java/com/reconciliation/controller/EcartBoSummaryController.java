package com.reconciliation.controller;

import com.reconciliation.model.EcartBoSummary;
import com.reconciliation.model.EcartBoSummaryDTO;
import com.reconciliation.service.EcartBoSummaryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ecart-bo-summary")
public class EcartBoSummaryController {
    
    @Autowired
    private EcartBoSummaryService ecartBoSummaryService;
    
    @GetMapping
    public ResponseEntity<List<EcartBoSummary>> getEcartBoSummaries(
            @RequestParam(required = false) String agence,
            @RequestParam(required = false) String service,
            @RequestParam(required = false) String pays,
            @RequestParam(required = false) String statut) {
        try {
            List<EcartBoSummary> summaries = ecartBoSummaryService.getEcartBoSummaries(agence, service, pays, statut);
            return ResponseEntity.ok(summaries);
        } catch (Exception e) {
            System.err.println("=== ERREUR getEcartBoSummaries (Controller) ===");
            System.err.println("DEBUG: Exception: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<EcartBoSummary> getEcartBoSummaryById(@PathVariable Long id) {
        return ecartBoSummaryService.getEcartBoSummaryById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @GetMapping("/agences")
    public ResponseEntity<List<String>> getDistinctAgences() {
        List<String> agences = ecartBoSummaryService.getDistinctAgences();
        return ResponseEntity.ok(agences);
    }
    
    @GetMapping("/services")
    public ResponseEntity<List<String>> getDistinctServices() {
        List<String> services = ecartBoSummaryService.getDistinctServices();
        return ResponseEntity.ok(services);
    }
    
    @GetMapping("/pays")
    public ResponseEntity<List<String>> getDistinctPays() {
        List<String> pays = ecartBoSummaryService.getDistinctPays();
        return ResponseEntity.ok(pays);
    }
    
    @PostMapping
    public ResponseEntity<Map<String, Object>> saveEcartBoSummary(@RequestBody List<EcartBoSummaryDTO> summaryData) {
        try {
            System.out.println("=== DÉBUT saveEcartBoSummary (Controller) ===");
            System.out.println("DEBUG: Nombre de résumés reçus: " + summaryData.size());
            
            int count = ecartBoSummaryService.saveEcartBoSummary(summaryData);
            
            System.out.println("DEBUG: Résultats finaux:");
            System.out.println("  - Résumés reçus: " + summaryData.size());
            System.out.println("  - Enregistrements créés: " + count);
            System.out.println("=== FIN saveEcartBoSummary (Controller) ===");
            
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "message", "Résumés sauvegardés avec succès",
                "count", count,
                "totalReceived", summaryData.size()
            ));
        } catch (Exception e) {
            System.err.println("=== ERREUR saveEcartBoSummary (Controller) ===");
            System.err.println("DEBUG: Exception: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur lors de la sauvegarde des résumés: " + e.getMessage()));
        }
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<EcartBoSummary> updateEcartBoSummary(@PathVariable Long id, @RequestBody EcartBoSummary ecartBoSummary) {
        try {
            EcartBoSummary updated = ecartBoSummaryService.updateEcartBoSummary(id, ecartBoSummary);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEcartBoSummary(@PathVariable Long id) {
        boolean deleted = ecartBoSummaryService.deleteEcartBoSummary(id);
        if (deleted) {
            return ResponseEntity.noContent().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }
}
