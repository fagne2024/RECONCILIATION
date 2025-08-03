package com.reconciliation.controller;

import com.reconciliation.entity.AutoProcessingModel;
import com.reconciliation.service.AutoProcessingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auto-processing")
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:3000"}, allowCredentials = "true")
public class AutoProcessingController {

    @Autowired
    private AutoProcessingService autoProcessingService;

    @GetMapping("/models")
    public ResponseEntity<Map<String, Object>> getAllModels() {
        try {
            List<AutoProcessingModel> models = autoProcessingService.getAllModels();
            return ResponseEntity.ok(Map.of(
                "success", true,
                "models", models
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    @GetMapping("/models/{id}")
    public ResponseEntity<Map<String, Object>> getModelById(@PathVariable String id) {
        try {
            AutoProcessingModel model = autoProcessingService.getModelById(id);
            if (model != null) {
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "model", model
                ));
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    @PostMapping("/models")
    public ResponseEntity<Map<String, Object>> createModel(@RequestBody AutoProcessingModel model) {
        try {
            AutoProcessingModel createdModel = autoProcessingService.createModel(model);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "model", createdModel
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    @PutMapping("/models/{id}")
    public ResponseEntity<Map<String, Object>> updateModel(@PathVariable String id, @RequestBody AutoProcessingModel model) {
        try {
            System.out.println("🔄 AutoProcessingController: updateModel() appelé avec id: " + id);
            System.out.println("📝 Modèle reçu: " + model);
            
            AutoProcessingModel updatedModel = autoProcessingService.updateModelById(Long.parseLong(id), model);
            
            if (updatedModel != null) {
                System.out.println("✅ Modèle mis à jour: " + updatedModel);
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "model", updatedModel
                ));
            } else {
                System.err.println("❌ Modèle non trouvé pour la mise à jour avec id: " + id);
                return ResponseEntity.status(404).body(Map.of(
                    "success", false,
                    "error", "Modèle non trouvé pour la mise à jour"
                ));
            }
        } catch (Exception e) {
            System.err.println("❌ Erreur lors de la mise à jour du modèle: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    @PostMapping("/models/fix-reconciliation-keys")
    public ResponseEntity<Map<String, Object>> fixReconciliationKeys() {
        try {
            System.out.println("🔧 AutoProcessingController: fixReconciliationKeys() appelé");
            
            List<AutoProcessingModel> models = autoProcessingService.getAllModels();
            int fixedCount = 0;
            
            for (AutoProcessingModel model : models) {
                boolean needsUpdate = false;
                Map<String, Object> reconciliationKeys = model.getReconciliationKeys();
                
                if (reconciliationKeys != null) {
                    // Corriger les clés partenaire
                    if (reconciliationKeys.containsKey("partnerKeys")) {
                        List<String> partnerKeys = (List<String>) reconciliationKeys.get("partnerKeys");
                        if (partnerKeys != null && partnerKeys.contains("External id")) {
                            partnerKeys.remove("External id");
                            partnerKeys.add("Id");
                            needsUpdate = true;
                            System.out.println("🔧 Modèle " + model.getName() + ": 'External id' -> 'Id'");
                        }
                    }
                    
                    // Corriger les clés BO
                    if (reconciliationKeys.containsKey("boKeys")) {
                        List<String> boKeys = (List<String>) reconciliationKeys.get("boKeys");
                        if (boKeys != null && boKeys.contains("Numéro Trans GU")) {
                            boKeys.remove("Numéro Trans GU");
                            boKeys.add("IDTransaction");
                            needsUpdate = true;
                            System.out.println("🔧 Modèle " + model.getName() + ": 'Numéro Trans GU' -> 'IDTransaction'");
                        }
                    }
                    
                    // Corriger les clés dans boModelKeys
                    if (reconciliationKeys.containsKey("boModelKeys")) {
                        Map<String, List<String>> boModelKeys = (Map<String, List<String>>) reconciliationKeys.get("boModelKeys");
                        if (boModelKeys != null) {
                            for (Map.Entry<String, List<String>> entry : boModelKeys.entrySet()) {
                                List<String> keys = entry.getValue();
                                if (keys.contains("Numéro Trans GU")) {
                                    keys.remove("Numéro Trans GU");
                                    keys.add("IDTransaction");
                                    needsUpdate = true;
                                    System.out.println("🔧 Modèle " + model.getName() + " (boModelKeys): 'Numéro Trans GU' -> 'IDTransaction'");
                                }
                            }
                        }
                    }
                }
                
                if (needsUpdate) {
                    autoProcessingService.updateModel(model.getModelId(), model);
                    fixedCount++;
                }
            }
            
            Map<String, Object> response = Map.of(
                "message", "Clés de réconciliation corrigées",
                "fixedModels", fixedCount,
                "totalModels", models.size()
            );
            
            System.out.println("✅ Correction terminée: " + fixedCount + " modèles corrigés sur " + models.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("❌ Erreur lors de la correction des clés: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/models/{id}")
    public ResponseEntity<Map<String, Object>> deleteModel(@PathVariable String id) {
        try {
            boolean deleted = autoProcessingService.deleteModel(id);
            return ResponseEntity.ok(Map.of(
                "success", deleted
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }
} 