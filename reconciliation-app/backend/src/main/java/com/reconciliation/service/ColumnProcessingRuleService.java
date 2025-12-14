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
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ColumnProcessingRuleService {

    @Autowired
    private ColumnProcessingRuleRepository columnProcessingRuleRepository;
    
    @Autowired
    private AutoProcessingModelRepository autoProcessingModelRepository;
    
    // Cache pour éviter de recharger les règles à chaque fois
    // Clé: modelId, Valeur: Liste des règles
    private final ConcurrentHashMap<String, List<ColumnProcessingRule>> rulesCache = new ConcurrentHashMap<>();

    /**
     * Récupère les règles par modelId avec cache
     * OPTIMISATION: Utilise un cache en mémoire pour éviter les requêtes répétées
     */
    public List<ColumnProcessingRule> getRulesByModelId(String modelId) {
        // Vérifier le cache d'abord
        List<ColumnProcessingRule> cachedRules = rulesCache.get(modelId);
        if (cachedRules != null) {
            return cachedRules;
        }
        
        // Charger depuis la base de données
        List<ColumnProcessingRule> rules = columnProcessingRuleRepository.findByAutoProcessingModelModelIdOrderByRuleOrderAsc(modelId);
        
        // Mettre en cache (même si la liste est vide pour éviter de recharger)
        rulesCache.put(modelId, rules);
        
        return rules;
    }
    
    /**
     * Invalide le cache pour un modelId donné
     * À appeler après modification/suppression de règles
     */
    public void invalidateCache(String modelId) {
        rulesCache.remove(modelId);
    }
    
    /**
     * Invalide tout le cache
     */
    public void clearCache() {
        rulesCache.clear();
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
            
            ColumnProcessingRule savedRule = columnProcessingRuleRepository.save(rule);
            
            // Invalider le cache après création
            invalidateCache(modelId);
            
            return savedRule;
        }
        throw new IllegalArgumentException("Modèle non trouvé avec l'ID: " + modelId);
    }

    @Transactional
    public ColumnProcessingRule updateRule(Long ruleId, ColumnProcessingRule updatedRule) {
        Optional<ColumnProcessingRule> existingRuleOpt = columnProcessingRuleRepository.findById(ruleId);
        if (existingRuleOpt.isPresent()) {
            ColumnProcessingRule existingRule = existingRuleOpt.get();
            String modelId = existingRule.getAutoProcessingModel().getModelId();
            
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
            
            ColumnProcessingRule savedRule = columnProcessingRuleRepository.save(existingRule);
            
            // Invalider le cache après modification
            invalidateCache(modelId);
            
            return savedRule;
        }
        throw new IllegalArgumentException("Règle non trouvée avec l'ID: " + ruleId);
    }

    @Transactional
    public boolean deleteRule(Long ruleId) {
        Optional<ColumnProcessingRule> ruleOpt = columnProcessingRuleRepository.findById(ruleId);
        if (ruleOpt.isPresent()) {
            ColumnProcessingRule rule = ruleOpt.get();
            String modelId = rule.getAutoProcessingModel().getModelId();
            
            columnProcessingRuleRepository.delete(rule);
            
            // Invalider le cache après suppression
            invalidateCache(modelId);
            
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
            
            // Invalider le cache après suppression
            invalidateCache(modelId);
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
            
            // Invalider le cache après suppression alternative
            invalidateCache(modelId);
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
                System.out.println("  - stringToRemove: " + (rule.getStringToRemove() != null ? "\"" + rule.getStringToRemove() + "\"" : "null"));
                
                columnProcessingRuleRepository.save(rule);
            }
            
            // Le cache sera invalidé par deleteRulesByModelId, mais on recharge quand même
            List<ColumnProcessingRule> savedRules = getRulesByModelId(modelId);
            return savedRules;
        }
        throw new IllegalArgumentException("Modèle non trouvé avec l'ID: " + modelId);
    }
}
