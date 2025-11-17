package com.reconciliation.controller;

import com.reconciliation.entity.AutoProcessingModel;
import com.reconciliation.entity.ColumnProcessingRule;
import com.reconciliation.dto.AutoProcessingModelDTO;
import com.reconciliation.dto.ColumnProcessingRuleDTO;
import com.reconciliation.service.AutoProcessingService;
import com.reconciliation.service.ColumnProcessingRuleService;
import com.reconciliation.service.ColumnProcessingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/auto-processing")
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:3000", "http://172.214.108.8:4200"}, allowCredentials = "true")
public class AutoProcessingController {

    @Autowired
    private AutoProcessingService autoProcessingService;
    
    @Autowired
    private ColumnProcessingRuleService columnProcessingRuleService;
    
    @Autowired
    private ColumnProcessingService columnProcessingService;

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
    public ResponseEntity<Map<String, Object>> createModel(@RequestBody AutoProcessingModelDTO modelDTO) {
        try {
            System.out.println("🔄 AutoProcessingController: createModel() appelé");
            System.out.println("📝 DTO reçu: " + modelDTO);
            
            // Convertir le DTO en entité
            AutoProcessingModel model = convertDTOToEntity(modelDTO);
            
            AutoProcessingModel createdModel = autoProcessingService.createModel(model);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "model", createdModel
            ));
        } catch (Exception e) {
            System.err.println("❌ Erreur lors de la création du modèle: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    @PutMapping("/models/{id}")
    public ResponseEntity<Map<String, Object>> updateModel(@PathVariable String id, @RequestBody AutoProcessingModelDTO modelDTO) {
        try {
            System.out.println("🔄 AutoProcessingController: updateModel() appelé avec id: " + id);
            System.out.println("📝 DTO reçu: " + modelDTO);
            
            // Convertir le DTO en entité
            AutoProcessingModel model = convertDTOToEntity(modelDTO);
            model.setId(Long.parseLong(id)); // S'assurer que l'ID est correct
            
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
            System.out.println("🔍 [DEBUG] Tentative de suppression du modèle: " + id);
            boolean deleted = autoProcessingService.deleteModel(id);
            System.out.println("✅ [DEBUG] Résultat de la suppression: " + deleted);
            return ResponseEntity.ok(Map.of(
                "success", deleted
            ));
        } catch (Exception e) {
            System.err.println("❌ [DEBUG] Erreur lors de la suppression du modèle " + id + ": " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    // ===== ENDPOINTS POUR LES RÈGLES DE TRAITEMENT DES COLONNES =====

    @GetMapping("/models/{modelId}/column-rules")
    public ResponseEntity<Map<String, Object>> getColumnRulesByModelId(@PathVariable String modelId) {
        try {
            List<ColumnProcessingRule> rules = columnProcessingRuleService.getRulesByModelId(modelId);
            List<ColumnProcessingRuleDTO> ruleDTOs = rules.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "rules", ruleDTOs
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    @PostMapping("/models/{modelId}/column-rules")
    public ResponseEntity<Map<String, Object>> createColumnRule(
            @PathVariable String modelId, 
            @RequestBody ColumnProcessingRuleDTO ruleDTO) {
        try {
            ColumnProcessingRule rule = convertToEntity(ruleDTO);
            ColumnProcessingRule createdRule = columnProcessingRuleService.createRule(rule, modelId);
            ColumnProcessingRuleDTO createdRuleDTO = convertToDTO(createdRule);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "rule", createdRuleDTO
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    @PutMapping("/column-rules/{ruleId}")
    public ResponseEntity<Map<String, Object>> updateColumnRule(
            @PathVariable Long ruleId, 
            @RequestBody ColumnProcessingRuleDTO ruleDTO) {
        try {
            ColumnProcessingRule rule = convertToEntity(ruleDTO);
            ColumnProcessingRule updatedRule = columnProcessingRuleService.updateRule(ruleId, rule);
            ColumnProcessingRuleDTO updatedRuleDTO = convertToDTO(updatedRule);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "rule", updatedRuleDTO
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    @DeleteMapping("/column-rules/{ruleId}")
    public ResponseEntity<Map<String, Object>> deleteColumnRule(@PathVariable Long ruleId) {
        try {
            boolean deleted = columnProcessingRuleService.deleteRule(ruleId);
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

    @PostMapping("/models/{modelId}/column-rules/batch")
    public ResponseEntity<Map<String, Object>> saveColumnRulesBatch(
            @PathVariable String modelId, 
            @RequestBody List<ColumnProcessingRuleDTO> ruleDTOs) {
        try {
            List<ColumnProcessingRule> rules = ruleDTOs.stream()
                .map(this::convertToEntity)
                .collect(Collectors.toList());
            
            List<ColumnProcessingRule> savedRules = columnProcessingRuleService.saveRulesForModel(modelId, rules);
            List<ColumnProcessingRuleDTO> savedRuleDTOs = savedRules.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "rules", savedRuleDTOs
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    // ===== ENDPOINTS POUR LE TRAITEMENT DES DONNÉES =====

    @PostMapping("/process-data/{modelId}")
    public ResponseEntity<Map<String, Object>> processData(
            @PathVariable String modelId, 
            @RequestBody List<Map<String, Object>> dataList) {
        try {
            List<Map<String, Object>> processedData = columnProcessingService.processDataList(modelId, dataList);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "processedData", processedData,
                "originalCount", dataList.size(),
                "processedCount", processedData.size()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    @PostMapping("/process-single-row/{modelId}")
    public ResponseEntity<Map<String, Object>> processSingleRow(
            @PathVariable String modelId, 
            @RequestBody Map<String, Object> dataRow) {
        try {
            Map<String, Object> processedRow = columnProcessingService.processDataRow(modelId, dataRow);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "originalData", dataRow,
                "processedData", processedRow
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    @GetMapping("/models/{modelId}/target-columns")
    public ResponseEntity<Map<String, Object>> getTargetColumns(@PathVariable String modelId) {
        try {
            List<String> targetColumns = columnProcessingService.getTargetColumns(modelId);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "targetColumns", targetColumns
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    @GetMapping("/models/{modelId}/validate-rules")
    public ResponseEntity<Map<String, Object>> validateRules(@PathVariable String modelId) {
        try {
            boolean isValid = columnProcessingService.validateRules(modelId);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "isValid", isValid
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    // ===== MÉTHODES UTILITAIRES =====

    private ColumnProcessingRuleDTO convertToDTO(ColumnProcessingRule entity) {
        ColumnProcessingRuleDTO dto = new ColumnProcessingRuleDTO();
        dto.setId(entity.getId());
        dto.setSourceColumn(entity.getSourceColumn());
        dto.setTargetColumn(entity.getTargetColumn());
        dto.setFormatType(entity.getFormatType());
        dto.setToUpperCase(entity.isToUpperCase());
        dto.setToLowerCase(entity.isToLowerCase());
        dto.setTrimSpaces(entity.isTrimSpaces());
        dto.setRemoveSpecialChars(entity.isRemoveSpecialChars());
        dto.setPadZeros(entity.isPadZeros());
        dto.setRegexReplace(entity.getRegexReplace());
        dto.setSpecialCharReplacementMap(entity.getSpecialCharReplacementMap());
        dto.setRuleOrder(entity.getRuleOrder());
        return dto;
    }

    private ColumnProcessingRule convertToEntity(ColumnProcessingRuleDTO dto) {
        ColumnProcessingRule entity = new ColumnProcessingRule();
        entity.setId(dto.getId());
        entity.setSourceColumn(dto.getSourceColumn());
        entity.setTargetColumn(dto.getTargetColumn());
        entity.setFormatType(dto.getFormatType());
        entity.setToUpperCase(dto.isToUpperCase());
        entity.setToLowerCase(dto.isToLowerCase());
        entity.setTrimSpaces(dto.isTrimSpaces());
        entity.setRemoveSpecialChars(dto.isRemoveSpecialChars());
        entity.setPadZeros(dto.isPadZeros());
        entity.setRegexReplace(dto.getRegexReplace());
        entity.setSpecialCharReplacementMap(dto.getSpecialCharReplacementMap());
        entity.setRuleOrder(dto.getRuleOrder());
        return entity;
    }

    private AutoProcessingModel convertDTOToEntity(AutoProcessingModelDTO dto) {
        AutoProcessingModel entity = new AutoProcessingModel();
        
        if (dto.getId() != null) {
            entity.setId(dto.getId());
        }
        
        entity.setModelId(dto.getModelId());
        entity.setName(dto.getName());
        entity.setFilePattern(dto.getFilePattern());
        
        // Convertir le type de fichier
        if (dto.getFileType() != null) {
            switch (dto.getFileType().toLowerCase()) {
                case "bo":
                    entity.setFileType(AutoProcessingModel.FileType.BO);
                    break;
                case "partner":
                    entity.setFileType(AutoProcessingModel.FileType.PARTNER);
                    break;
                case "both":
                    entity.setFileType(AutoProcessingModel.FileType.BOTH);
                    break;
                default:
                    entity.setFileType(AutoProcessingModel.FileType.BO);
            }
        }
        
        entity.setAutoApply(dto.isAutoApply());
        entity.setTemplateFile(dto.getTemplateFile());
        entity.setReconciliationKeys(dto.getReconciliationKeys());
        entity.setReconciliationLogic(dto.getReconciliationLogic());
        entity.setCorrespondenceRules(dto.getCorrespondenceRules());
        entity.setComparisonColumns(dto.getComparisonColumns());
        
        // Convertir les règles de traitement des colonnes
        if (dto.getColumnProcessingRules() != null) {
            List<ColumnProcessingRule> rules = dto.getColumnProcessingRules().stream()
                .map(this::convertToEntity)
                .collect(Collectors.toList());
            entity.setColumnProcessingRules(rules);
        }
        
        // Gérer les dates
        if (dto.getCreatedAt() != null) {
            entity.setCreatedAt(dto.getCreatedAt());
        } else {
            entity.setCreatedAt(LocalDateTime.now());
        }
        
        entity.setUpdatedAt(LocalDateTime.now());
        
        return entity;
    }
} 