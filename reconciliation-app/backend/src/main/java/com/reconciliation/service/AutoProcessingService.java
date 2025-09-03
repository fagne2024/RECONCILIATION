package com.reconciliation.service;

import com.reconciliation.entity.AutoProcessingModel;
import com.reconciliation.entity.ColumnProcessingRule;
import com.reconciliation.repository.AutoProcessingModelRepository;
import com.reconciliation.service.ColumnProcessingRuleService;
import com.reconciliation.service.ModelNormalizationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class AutoProcessingService {

    @Autowired
    private AutoProcessingModelRepository autoProcessingModelRepository;
    
    @Autowired
    private ColumnProcessingRuleService columnProcessingRuleService;

    @Autowired
    private ModelNormalizationService modelNormalizationService;

    public List<AutoProcessingModel> getAllModels() {
        List<AutoProcessingModel> models = autoProcessingModelRepository.findAll();
        // Charger les règles de traitement des colonnes pour chaque modèle
        for (AutoProcessingModel model : models) {
            List<ColumnProcessingRule> rules = columnProcessingRuleService.getRulesByModelId(model.getModelId());
            model.setColumnProcessingRules(rules);
        }
        return models;
    }

    public AutoProcessingModel getModelById(String id) {
        Optional<AutoProcessingModel> model = autoProcessingModelRepository.findByModelId(id);
        if (model.isPresent()) {
            AutoProcessingModel autoProcessingModel = model.get();
            // Charger les règles de traitement des colonnes
            List<ColumnProcessingRule> rules = columnProcessingRuleService.getRulesByModelId(id);
            autoProcessingModel.setColumnProcessingRules(rules);
            return autoProcessingModel;
        }
        return null;
    }

    public AutoProcessingModel getModelByModelId(String modelId) {
        Optional<AutoProcessingModel> model = autoProcessingModelRepository.findByModelId(modelId);
        if (model.isPresent()) {
            AutoProcessingModel autoProcessingModel = model.get();
            // Charger les règles de traitement des colonnes
            List<ColumnProcessingRule> rules = columnProcessingRuleService.getRulesByModelId(modelId);
            autoProcessingModel.setColumnProcessingRules(rules);
            return autoProcessingModel;
        }
        return null;
    }

    @Transactional
    public AutoProcessingModel createModel(AutoProcessingModel model) {
        // Normaliser le modèle avant la sauvegarde
        model = modelNormalizationService.normalizeModel(model);
        
        if (model.getModelId() == null || model.getModelId().isEmpty()) {
            model.setModelId(modelNormalizationService.generateModelId(model.getName()));
        }
        model.setCreatedAt(LocalDateTime.now());
        model.setUpdatedAt(LocalDateTime.now());
        
        AutoProcessingModel savedModel = autoProcessingModelRepository.save(model);
        
        // Sauvegarder les règles de traitement des colonnes si présentes
        if (model.getColumnProcessingRules() != null && !model.getColumnProcessingRules().isEmpty()) {
            columnProcessingRuleService.saveRulesForModel(savedModel.getModelId(), model.getColumnProcessingRules());
        }
        
        return savedModel;
    }

    @Transactional
    public AutoProcessingModel updateModel(String id, AutoProcessingModel model) {
        Optional<AutoProcessingModel> existingModel = autoProcessingModelRepository.findByModelId(id);
        if (existingModel.isPresent()) {
            // Normaliser le modèle avant la mise à jour
            model = modelNormalizationService.normalizeModel(model);
            
            AutoProcessingModel existing = existingModel.get();
            existing.setName(model.getName());
            existing.setFilePattern(model.getFilePattern());
            existing.setFileType(model.getFileType());
            existing.setAutoApply(model.isAutoApply());
            existing.setTemplateFile(model.getTemplateFile());
            existing.setReconciliationKeys(model.getReconciliationKeys());
            existing.setReconciliationLogic(model.getReconciliationLogic());
            existing.setCorrespondenceRules(model.getCorrespondenceRules());
            existing.setComparisonColumns(model.getComparisonColumns());
            existing.setUpdatedAt(LocalDateTime.now());
            
            AutoProcessingModel savedModel = autoProcessingModelRepository.save(existing);
            
            // Mettre à jour les règles de traitement des colonnes si présentes
            if (model.getColumnProcessingRules() != null) {
                columnProcessingRuleService.saveRulesForModel(savedModel.getModelId(), model.getColumnProcessingRules());
            }
            
            return savedModel;
        }
        return null;
    }

    @Transactional
    public AutoProcessingModel updateModelById(Long id, AutoProcessingModel model) {
        Optional<AutoProcessingModel> existingModel = autoProcessingModelRepository.findById(id);
        if (existingModel.isPresent()) {
            AutoProcessingModel existing = existingModel.get();
            existing.setName(model.getName());
            existing.setFilePattern(model.getFilePattern());
            existing.setFileType(model.getFileType());
            existing.setAutoApply(model.isAutoApply());
            existing.setTemplateFile(model.getTemplateFile());
            existing.setReconciliationKeys(model.getReconciliationKeys());
            existing.setUpdatedAt(LocalDateTime.now());
            
            AutoProcessingModel savedModel = autoProcessingModelRepository.save(existing);
            
            // Mettre à jour les règles de traitement des colonnes si présentes
            if (model.getColumnProcessingRules() != null) {
                columnProcessingRuleService.saveRulesForModel(savedModel.getModelId(), model.getColumnProcessingRules());
            }
            
            return savedModel;
        }
        return null;
    }

    @Transactional
    public boolean deleteModel(String id) {
        try {
            System.out.println("🔍 [DEBUG] AutoProcessingService.deleteModel() appelé avec ID: " + id);
            
            // Essayer d'abord avec l'ID tel quel (modelId)
            Optional<AutoProcessingModel> model = autoProcessingModelRepository.findByModelId(id);
            System.out.println("🔍 [DEBUG] Recherche par modelId: " + (model.isPresent() ? "trouvé" : "non trouvé"));
            
            // Si pas trouvé, essayer avec l'ID numérique
            if (!model.isPresent()) {
                try {
                    Long numericId = Long.parseLong(id);
                    model = autoProcessingModelRepository.findById(numericId);
                    System.out.println("🔍 [DEBUG] Recherche par ID numérique: " + (model.isPresent() ? "trouvé" : "non trouvé"));
                } catch (NumberFormatException e) {
                    System.out.println("🔍 [DEBUG] ID non numérique: " + id);
                    // L'ID n'est pas numérique, on garde le résultat null
                }
            }
            
            if (model.isPresent()) {
                System.out.println("🔍 [DEBUG] Modèle trouvé: " + model.get().getName() + " (ID: " + model.get().getModelId() + ")");
                try {
                    // Supprimer les règles de traitement des colonnes associées
                    System.out.println("🔍 [DEBUG] Suppression des règles de traitement...");
                    columnProcessingRuleService.deleteRulesByModelId(model.get().getModelId());
                    System.out.println("✅ [DEBUG] Règles de traitement supprimées");
                } catch (Exception e) {
                    // Log l'erreur mais continuer avec la suppression du modèle
                    System.err.println("⚠️ [DEBUG] Erreur lors de la suppression des règles pour le modèle " + id + ": " + e.getMessage());
                }
                
                System.out.println("🔍 [DEBUG] Suppression du modèle...");
                autoProcessingModelRepository.delete(model.get());
                System.out.println("✅ [DEBUG] Modèle supprimé avec succès");
                return true;
            } else {
                System.out.println("❌ [DEBUG] Modèle non trouvé avec l'ID: " + id);
                return false;
            }
        } catch (Exception e) {
            System.err.println("❌ [DEBUG] Erreur lors de la suppression du modèle " + id + ": " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }
} 