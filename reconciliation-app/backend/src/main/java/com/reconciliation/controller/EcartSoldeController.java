package com.reconciliation.controller;

import com.reconciliation.model.EcartSolde;
import com.reconciliation.service.EcartSoldeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ecart-solde")
public class EcartSoldeController {
    
    @Autowired
    private EcartSoldeService ecartSoldeService;
    
    @GetMapping
    public ResponseEntity<List<EcartSolde>> getAllEcartSoldes() {
        List<EcartSolde> ecartSoldes = ecartSoldeService.getAllEcartSoldes();
        return ResponseEntity.ok(ecartSoldes);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<EcartSolde> getEcartSoldeById(@PathVariable Long id) {
        return ecartSoldeService.getEcartSoldeById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @GetMapping("/agence/{agence}")
    public ResponseEntity<List<EcartSolde>> getEcartSoldesByAgence(@PathVariable String agence) {
        List<EcartSolde> ecartSoldes = ecartSoldeService.getEcartSoldesByAgence(agence);
        return ResponseEntity.ok(ecartSoldes);
    }
    
    @GetMapping("/service/{service}")
    public ResponseEntity<List<EcartSolde>> getEcartSoldesByService(@PathVariable String service) {
        List<EcartSolde> ecartSoldes = ecartSoldeService.getEcartSoldesByService(service);
        return ResponseEntity.ok(ecartSoldes);
    }
    
    @GetMapping("/pays/{pays}")
    public ResponseEntity<List<EcartSolde>> getEcartSoldesByPays(@PathVariable String pays) {
        List<EcartSolde> ecartSoldes = ecartSoldeService.getEcartSoldesByPays(pays);
        return ResponseEntity.ok(ecartSoldes);
    }
    
    @GetMapping("/statut/{statut}")
    public ResponseEntity<List<EcartSolde>> getEcartSoldesByStatut(@PathVariable String statut) {
        List<EcartSolde> ecartSoldes = ecartSoldeService.getEcartSoldesByStatut(statut);
        return ResponseEntity.ok(ecartSoldes);
    }
    
    @GetMapping("/date-range")
    public ResponseEntity<List<EcartSolde>> getEcartSoldesByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dateDebut,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dateFin) {
        List<EcartSolde> ecartSoldes = ecartSoldeService.getEcartSoldesByDateRange(dateDebut, dateFin);
        return ResponseEntity.ok(ecartSoldes);
    }
    
    @GetMapping("/agences")
    public ResponseEntity<List<String>> getDistinctAgences() {
        List<String> agences = ecartSoldeService.getDistinctAgences();
        return ResponseEntity.ok(agences);
    }
    
    @GetMapping("/services")
    public ResponseEntity<List<String>> getDistinctServices() {
        List<String> services = ecartSoldeService.getDistinctServices();
        return ResponseEntity.ok(services);
    }
    
    @GetMapping("/pays")
    public ResponseEntity<List<String>> getDistinctPays() {
        List<String> pays = ecartSoldeService.getDistinctPays();
        return ResponseEntity.ok(pays);
    }
    
    @PostMapping
    public ResponseEntity<EcartSolde> createEcartSolde(@RequestBody EcartSolde ecartSolde) {
        EcartSolde createdEcartSolde = ecartSoldeService.createEcartSolde(ecartSolde);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdEcartSolde);
    }
    
    @PostMapping("/batch")
    public ResponseEntity<Map<String, Object>> createMultipleEcartSoldes(@RequestBody List<EcartSolde> ecartSoldes) {
        try {
            List<EcartSolde> createdEcartSoldes = ecartSoldeService.createMultipleEcartSoldes(ecartSoldes);
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "message", "Enregistrements créés avec succès",
                "count", createdEcartSoldes.size(),
                "data", createdEcartSoldes
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur lors de la création des enregistrements: " + e.getMessage()));
        }
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<EcartSolde> updateEcartSolde(@PathVariable Long id, @RequestBody EcartSolde ecartSolde) {
        try {
            EcartSolde updatedEcartSolde = ecartSoldeService.updateEcartSolde(id, ecartSolde);
            return ResponseEntity.ok(updatedEcartSolde);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEcartSolde(@PathVariable Long id) {
        boolean deleted = ecartSoldeService.deleteEcartSolde(id);
        if (deleted) {
            return ResponseEntity.noContent().build();
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    @PatchMapping("/{id}/statut")
    public ResponseEntity<Map<String, String>> updateStatut(@PathVariable Long id, @RequestBody Map<String, String> request) {
        System.out.println("=== DÉBUT updateStatut Controller ===");
        System.out.println("DEBUG: ID reçu: " + id);
        System.out.println("DEBUG: Request body: " + request);
        
        String nouveauStatut = request.get("statut");
        System.out.println("DEBUG: Nouveau statut extrait: " + nouveauStatut);
        
        if (nouveauStatut == null) {
            System.out.println("DEBUG: Statut manquant dans la requête");
            return ResponseEntity.badRequest().body(Map.of("error", "Le statut est requis"));
        }
        
        try {
            System.out.println("DEBUG: Appel du service updateStatut...");
            boolean updated = ecartSoldeService.updateStatut(id, nouveauStatut);
            System.out.println("DEBUG: Résultat du service: " + updated);
            
            if (updated) {
                System.out.println("=== FIN updateStatut Controller - SUCCÈS ===");
                return ResponseEntity.ok(Map.of("message", "Statut mis à jour avec succès"));
            } else {
                System.out.println("=== FIN updateStatut Controller - ÉCHEC ===");
                return ResponseEntity.notFound().build();
            }
        } catch (RuntimeException e) {
            System.out.println("=== ERREUR updateStatut Controller ===");
            System.out.println("DEBUG: Exception: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.notFound().build();
        }
    }
    
    @PutMapping("/{id}/statut")
    public ResponseEntity<Map<String, String>> updateStatutPut(@PathVariable Long id, @RequestBody Map<String, String> request) {
        System.out.println("=== DÉBUT updateStatutPut Controller ===");
        System.out.println("DEBUG: ID reçu: " + id);
        System.out.println("DEBUG: Request body: " + request);
        
        String nouveauStatut = request.get("statut");
        System.out.println("DEBUG: Nouveau statut extrait: " + nouveauStatut);
        
        if (nouveauStatut == null) {
            System.out.println("DEBUG: Statut manquant dans la requête");
            return ResponseEntity.badRequest().body(Map.of("error", "Le statut est requis"));
        }
        
        try {
            System.out.println("DEBUG: Appel du service updateStatut...");
            boolean updated = ecartSoldeService.updateStatut(id, nouveauStatut);
            System.out.println("DEBUG: Résultat du service: " + updated);
            
            if (updated) {
                System.out.println("=== FIN updateStatutPut Controller - SUCCÈS ===");
                return ResponseEntity.ok(Map.of("message", "Statut mis à jour avec succès"));
            } else {
                System.out.println("=== FIN updateStatutPut Controller - ÉCHEC ===");
                return ResponseEntity.notFound().build();
            }
        } catch (RuntimeException e) {
            System.out.println("=== ERREUR updateStatutPut Controller ===");
            System.out.println("DEBUG: Exception: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.notFound().build();
        }
    }
    
    @PostMapping("/{id}/statut")
    public ResponseEntity<Map<String, String>> updateStatutPost(@PathVariable Long id, 
                                                               @RequestParam String statut,
                                                               @RequestParam(required = false) String commentaire) {
        System.out.println("=== DÉBUT updateStatutPost Controller ===");
        System.out.println("DEBUG: ID reçu: " + id);
        System.out.println("DEBUG: Statut reçu: " + statut);
        System.out.println("DEBUG: Commentaire reçu: " + commentaire);
        
        if (statut == null || statut.trim().isEmpty()) {
            System.out.println("DEBUG: Statut manquant dans la requête");
            return ResponseEntity.badRequest().body(Map.of("error", "Le statut est requis"));
        }
        
        try {
            System.out.println("DEBUG: Appel du service updateStatut...");
            boolean updated = ecartSoldeService.updateStatutWithComment(id, statut, commentaire);
            System.out.println("DEBUG: Résultat du service: " + updated);
            
            if (updated) {
                System.out.println("=== FIN updateStatutPost Controller - SUCCÈS ===");
                return ResponseEntity.ok(Map.of("message", "Statut mis à jour avec succès"));
            } else {
                System.out.println("=== FIN updateStatutPost Controller - ÉCHEC ===");
                return ResponseEntity.notFound().build();
            }
        } catch (RuntimeException e) {
            System.out.println("=== ERREUR updateStatutPost Controller ===");
            System.out.println("DEBUG: Exception: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.notFound().build();
        }
    }
    
    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> uploadCsvFile(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Le fichier est vide"));
        }
        
        String fileName = file.getOriginalFilename().toLowerCase();
        if (!fileName.endsWith(".csv") && !fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Le fichier doit être au format CSV, XLSX ou XLS"));
        }
        
        try {
            List<EcartSolde> uploadedEcartSoldes = ecartSoldeService.uploadCsvFile(file);
            return ResponseEntity.ok(Map.of(
                "message", "Fichier uploadé avec succès",
                "count", uploadedEcartSoldes.size(),
                "data", uploadedEcartSoldes
            ));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur lors de la lecture du fichier: " + e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur lors du traitement du fichier: " + e.getMessage()));
        }
    }
    
    @PostMapping("/validate")
    public ResponseEntity<Map<String, Object>> validateFile(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Le fichier est vide"));
        }
        
        String fileName = file.getOriginalFilename().toLowerCase();
        if (!fileName.endsWith(".csv") && !fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Le fichier doit être au format CSV, XLSX ou XLS"));
        }
        
        try {
            Map<String, Object> validationResult = ecartSoldeService.validateFile(file);
            return ResponseEntity.ok(validationResult);
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur lors de la lecture du fichier: " + e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur lors de la validation du fichier: " + e.getMessage()));
        }
    }
} 