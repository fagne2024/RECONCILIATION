package com.reconciliation.service;

import com.reconciliation.entity.ColumnProcessingRule;
import com.reconciliation.entity.AutoProcessingModel;
import com.reconciliation.repository.ColumnProcessingRuleRepository;
import com.reconciliation.repository.AutoProcessingModelRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class ColumnProcessingRuleService {

    @Autowired
    private ColumnProcessingRuleRepository columnProcessingRuleRepository;
    
    @Autowired
    private AutoProcessingModelRepository autoProcessingModelRepository;

    public List<ColumnProcessingRule> getRulesByModelId(String modelId) {
        return columnProcessingRuleRepository.findByAutoProcessingModelModelIdOrderByRuleOrderAsc(modelId);
    }

    public List<ColumnProcessingRule> getRulesByModelId(Long modelId) {
        return columnProcessingRuleRepository.findByAutoProcessingModelIdOrderByRuleOrderAsc(modelId);
    }

    @Transactional
    public ColumnProcessingRule createRule(ColumnProcessingRule rule, String modelId) {
        Optional<AutoProcessingModel> modelOpt = autoProcessingModelRepository.findByModelId(modelId);
        if (modelOpt.isPresent()) {
            AutoProcessingModel model = modelOpt.get();
            rule.setAutoProcessingModel(model);
            
            // Définir l'ordre si non défini
            if (rule.getRuleOrder() == null) {
                List<ColumnProcessingRule> existingRules = getRulesByModelId(modelId);
                rule.setRuleOrder(existingRules.size());
            }
            
            return columnProcessingRuleRepository.save(rule);
        }
        throw new IllegalArgumentException("Modèle non trouvé avec l'ID: " + modelId);
    }

    @Transactional
    public ColumnProcessingRule updateRule(Long ruleId, ColumnProcessingRule updatedRule) {
        Optional<ColumnProcessingRule> existingRuleOpt = columnProcessingRuleRepository.findById(ruleId);
        if (existingRuleOpt.isPresent()) {
            ColumnProcessingRule existingRule = existingRuleOpt.get();
            
            existingRule.setSourceColumn(updatedRule.getSourceColumn());
            existingRule.setTargetColumn(updatedRule.getTargetColumn());
            existingRule.setFormatType(updatedRule.getFormatType());
            existingRule.setToUpperCase(updatedRule.isToUpperCase());
            existingRule.setToLowerCase(updatedRule.isToLowerCase());
            existingRule.setTrimSpaces(updatedRule.isTrimSpaces());
            existingRule.setRemoveSpecialChars(updatedRule.isRemoveSpecialChars());
            existingRule.setRemoveAccents(updatedRule.isRemoveAccents());
            existingRule.setPadZeros(updatedRule.isPadZeros());
            existingRule.setRegexReplace(updatedRule.getRegexReplace());
            existingRule.setSpecialCharReplacementMap(updatedRule.getSpecialCharReplacementMap());
            existingRule.setRuleOrder(updatedRule.getRuleOrder());
            
            return columnProcessingRuleRepository.save(existingRule);
        }
        throw new IllegalArgumentException("Règle non trouvée avec l'ID: " + ruleId);
    }

    @Transactional
    public boolean deleteRule(Long ruleId) {
        Optional<ColumnProcessingRule> ruleOpt = columnProcessingRuleRepository.findById(ruleId);
        if (ruleOpt.isPresent()) {
            columnProcessingRuleRepository.delete(ruleOpt.get());
            return true;
        }
        return false;
    }

    @Transactional
    public void deleteRulesByModelId(String modelId) {
        try {
            System.out.println("🔍 [DEBUG] ColumnProcessingRuleService.deleteRulesByModelId() appelé avec modelId: " + modelId);
            columnProcessingRuleRepository.deleteByAutoProcessingModelModelId(modelId);
            System.out.println("✅ [DEBUG] Règles supprimées avec succès pour le modèle: " + modelId);
        } catch (Exception e) {
            System.err.println("⚠️ [DEBUG] Erreur lors de la suppression des règles pour le modèle " + modelId + ": " + e.getMessage());
            // Essayer une approche alternative si la suppression en masse échoue
            System.out.println("🔄 [DEBUG] Tentative de suppression alternative...");
            List<ColumnProcessingRule> rules = getRulesByModelId(modelId);
            System.out.println("🔍 [DEBUG] " + rules.size() + " règles trouvées pour suppression alternative");
            for (ColumnProcessingRule rule : rules) {
                try {
                    columnProcessingRuleRepository.delete(rule);
                    System.out.println("✅ [DEBUG] Règle " + rule.getId() + " supprimée");
                } catch (Exception deleteException) {
                    System.err.println("❌ [DEBUG] Erreur lors de la suppression de la règle " + rule.getId() + ": " + deleteException.getMessage());
                }
            }
        }
    }

    @Transactional
    public void deleteRulesByModelId(Long modelId) {
        columnProcessingRuleRepository.deleteByAutoProcessingModelId(modelId);
    }

    @Transactional
    public List<ColumnProcessingRule> saveRulesForModel(String modelId, List<ColumnProcessingRule> rules) {
        // Supprimer les règles existantes
        deleteRulesByModelId(modelId);
        
        // Sauvegarder les nouvelles règles
        Optional<AutoProcessingModel> modelOpt = autoProcessingModelRepository.findByModelId(modelId);
        if (modelOpt.isPresent()) {
            AutoProcessingModel model = modelOpt.get();
            
            for (int i = 0; i < rules.size(); i++) {
                ColumnProcessingRule rule = rules.get(i);
                
                // S'assurer que tous les champs sont correctement initialisés
                if (rule.getSourceColumn() == null) rule.setSourceColumn("");
                if (rule.getTargetColumn() == null) rule.setTargetColumn("");
                if (rule.getFormatType() == null) rule.setFormatType("string");
                if (rule.getRuleOrder() == null) rule.setRuleOrder(i);
                
                // S'assurer que les champs boolean sont correctement définis
                rule.setToUpperCase(rule.isToUpperCase());
                rule.setToLowerCase(rule.isToLowerCase());
                rule.setTrimSpaces(rule.isTrimSpaces());
                rule.setRemoveSpecialChars(rule.isRemoveSpecialChars());
                rule.setRemoveAccents(rule.isRemoveAccents());
                rule.setPadZeros(rule.isPadZeros());
                
                rule.setAutoProcessingModel(model);
                rule.setRuleOrder(i);
                
                // Debug: Afficher les valeurs avant sauvegarde
                System.out.println("🔍 [DEBUG] Sauvegarde règle " + i + ":");
                System.out.println("  - sourceColumn: " + rule.getSourceColumn());
                System.out.println("  - removeAccents: " + rule.isRemoveAccents());
                System.out.println("  - removeSpecialChars: " + rule.isRemoveSpecialChars());
                System.out.println("  - trimSpaces: " + rule.isTrimSpaces());
                
                columnProcessingRuleRepository.save(rule);
            }
            
            return getRulesByModelId(modelId);
        }
        throw new IllegalArgumentException("Modèle non trouvé avec l'ID: " + modelId);
    }
}
