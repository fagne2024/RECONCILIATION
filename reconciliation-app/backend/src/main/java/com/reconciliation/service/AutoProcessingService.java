package com.reconciliation.service;

import com.reconciliation.entity.AutoProcessingModel;
import com.reconciliation.entity.ColumnProcessingRule;
import com.reconciliation.repository.AutoProcessingModelRepository;
import com.reconciliation.service.ColumnProcessingRuleService;
import com.reconciliation.service.ModelNormalizationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
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

    @Transactional(readOnly = true)
    @Cacheable(value = "autoProcessingModels", unless = "#result == null || #result.isEmpty()")
    public List<AutoProcessingModel> getAllModels() {
        // Utiliser la méthode optimisée qui charge toutes les règles en une seule requête
        List<AutoProcessingModel> models = autoProcessingModelRepository.findAllWithRules();
        
        if (models == null) {
            System.out.println("⚠️ findAllWithRules() a retourné null");
            return new ArrayList<>();
        }
        
        System.out.println("📋 " + models.size() + " modèles chargés depuis la base de données");
        
        // S'assurer que les règles sont bien chargées en accédant à la collection
        // Cela force Hibernate à charger les règles dans la même transaction
        models.forEach(model -> {
            try {
                // Accéder explicitement aux règles pour forcer le chargement
                List<ColumnProcessingRule> rules = model.getColumnProcessingRules();
                if (rules != null) {
                    int size = rules.size(); // Force le chargement
                    System.out.println("  - Modèle " + model.getModelId() + ": " + size + " règles chargées");
                } else {
                    System.out.println("  - Modèle " + model.getModelId() + ": aucune règle");
                }
            } catch (Exception e) {
                System.err.println("❌ Erreur lors du chargement des règles pour le modèle " + model.getModelId() + ": " + e.getMessage());
            }
        });
        
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
    @CacheEvict(value = "autoProcessingModels", allEntries = true)
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
    @CacheEvict(value = "autoProcessingModels", allEntries = true)
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
    @CacheEvict(value = "autoProcessingModels", allEntries = true)
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
    @CacheEvict(value = "autoProcessingModels", allEntries = true)
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