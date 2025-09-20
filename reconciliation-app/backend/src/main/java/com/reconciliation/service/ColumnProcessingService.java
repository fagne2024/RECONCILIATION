package com.reconciliation.service;

import com.reconciliation.entity.ColumnProcessingRule;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class ColumnProcessingService {

    @Autowired
    private ColumnProcessingRuleService columnProcessingRuleService;

    /**
     * Applique les règles de traitement des colonnes à une ligne de données
     * @param modelId L'ID du modèle de traitement
     * @param data La ligne de données à traiter (Map<String, Object>)
     * @return La ligne de données traitée
     */
    public Map<String, Object> processDataRow(String modelId, Map<String, Object> data) {
        List<ColumnProcessingRule> rules = columnProcessingRuleService.getRulesByModelId(modelId);
        Map<String, Object> processedData = new HashMap<>(data);
        
        for (ColumnProcessingRule rule : rules) {
            String sourceColumn = rule.getSourceColumn();
            String targetColumn = rule.getTargetColumn();
            
            if (processedData.containsKey(sourceColumn)) {
                Object value = processedData.get(sourceColumn);
                Object processedValue = applyRule(value, rule);
                processedData.put(targetColumn, processedValue);
            }
        }
        
        return processedData;
    }

    /**
     * Applique les règles de traitement des colonnes à une liste de lignes de données
     * @param modelId L'ID du modèle de traitement
     * @param dataList La liste des lignes de données à traiter
     * @return La liste des lignes de données traitées
     */
    public List<Map<String, Object>> processDataList(String modelId, List<Map<String, Object>> dataList) {
        List<Map<String, Object>> processedDataList = new ArrayList<>();
        
        for (Map<String, Object> dataRow : dataList) {
            Map<String, Object> processedRow = processDataRow(modelId, dataRow);
            processedDataList.add(processedRow);
        }
        
        return processedDataList;
    }

    /**
     * Applique une règle de traitement à une valeur
     * @param value La valeur à traiter
     * @param rule La règle à appliquer
     * @return La valeur traitée
     */
    private Object applyRule(Object value, ColumnProcessingRule rule) {
        if (value == null) {
            return null;
        }
        
        String stringValue = value.toString();
        
        // Appliquer les transformations dans l'ordre
        stringValue = applyFormatType(stringValue, rule.getFormatType());
        stringValue = applyCaseTransformations(stringValue, rule);
        stringValue = applySpaceTransformations(stringValue, rule);
        stringValue = applySpecialCharTransformations(stringValue, rule);
        stringValue = applyStringRemoval(stringValue, rule);
        stringValue = applyAccentRemoval(stringValue, rule);
        stringValue = applyPadding(stringValue, rule);
        stringValue = applyRegexReplace(stringValue, rule);
        
        return stringValue;
    }

    /**
     * Applique le type de format
     */
    private String applyFormatType(String value, String formatType) {
        if (formatType == null || formatType.isEmpty()) {
            return value;
        }
        
        switch (formatType.toLowerCase()) {
            case "string":
                return value;
            case "numeric":
                return value.replaceAll("[^0-9.-]", "");
            case "date":
                // Logique de formatage de date si nécessaire
                return value;
            case "boolean":
                return Boolean.parseBoolean(value) ? "true" : "false";
            default:
                return value;
        }
    }

    /**
     * Applique les transformations de casse
     */
    private String applyCaseTransformations(String value, ColumnProcessingRule rule) {
        if (rule.isToUpperCase()) {
            value = value.toUpperCase();
        }
        if (rule.isToLowerCase()) {
            value = value.toLowerCase();
        }
        return value;
    }

    /**
     * Applique les transformations d'espaces
     */
    private String applySpaceTransformations(String value, ColumnProcessingRule rule) {
        if (rule.isTrimSpaces()) {
            value = value.trim();
        }
        return value;
    }

    /**
     * Applique les transformations de caractères spéciaux
     */
    private String applySpecialCharTransformations(String value, ColumnProcessingRule rule) {
        if (rule.isRemoveSpecialChars()) {
            // Supprimer les caractères spéciaux sauf les espaces
            value = value.replaceAll("[^a-zA-Z0-9\\s]", "");
        }
        
        // Appliquer le mapping de remplacement des caractères spéciaux
        Map<String, String> replacementMap = rule.getSpecialCharReplacementMap();
        if (replacementMap != null && !replacementMap.isEmpty()) {
            for (Map.Entry<String, String> entry : replacementMap.entrySet()) {
                value = value.replace(entry.getKey(), entry.getValue());
            }
        }
        
        return value;
    }

    /**
     * Applique la suppression de chaînes spécifiques
     */
    private String applyStringRemoval(String value, ColumnProcessingRule rule) {
        String stringToRemove = rule.getStringToRemove();
        if (stringToRemove != null && !stringToRemove.isEmpty()) {
            // Supprimer toutes les occurrences de la chaîne spécifiée
            value = value.replace(stringToRemove, "");
        }
        return value;
    }

    /**
     * Applique la suppression des accents
     */
    private String applyAccentRemoval(String value, ColumnProcessingRule rule) {
        if (rule.isRemoveAccents()) {
            // Normaliser les caractères Unicode et supprimer les accents
            return java.text.Normalizer.normalize(value, java.text.Normalizer.Form.NFD)
                    .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        }
        return value;
    }

    /**
     * Applique le padding avec des zéros
     */
    private String applyPadding(String value, ColumnProcessingRule rule) {
        if (rule.isPadZeros() && value.matches("\\d+")) {
            // Ajouter des zéros en tête pour avoir au moins 8 chiffres
            return String.format("%08d", Integer.parseInt(value));
        }
        return value;
    }

    /**
     * Applique le remplacement par regex
     */
    private String applyRegexReplace(String value, ColumnProcessingRule rule) {
        String regexReplace = rule.getRegexReplace();
        if (regexReplace != null && !regexReplace.isEmpty()) {
            try {
                // Format attendu: "pattern|replacement"
                String[] parts = regexReplace.split("\\|", 2);
                if (parts.length == 2) {
                    String pattern = parts[0];
                    String replacement = parts[1];
                    return value.replaceAll(pattern, replacement);
                }
            } catch (Exception e) {
                // En cas d'erreur, retourner la valeur originale
                return value;
            }
        }
        return value;
    }

    /**
     * Valide les règles de traitement d'un modèle
     * @param modelId L'ID du modèle
     * @return true si les règles sont valides, false sinon
     */
    public boolean validateRules(String modelId) {
        List<ColumnProcessingRule> rules = columnProcessingRuleService.getRulesByModelId(modelId);
        
        for (ColumnProcessingRule rule : rules) {
            if (rule.getSourceColumn() == null || rule.getSourceColumn().isEmpty()) {
                return false;
            }
            if (rule.getTargetColumn() == null || rule.getTargetColumn().isEmpty()) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Obtient les colonnes cibles d'un modèle
     * @param modelId L'ID du modèle
     * @return La liste des colonnes cibles
     */
    public List<String> getTargetColumns(String modelId) {
        List<ColumnProcessingRule> rules = columnProcessingRuleService.getRulesByModelId(modelId);
        List<String> targetColumns = new ArrayList<>();
        
        for (ColumnProcessingRule rule : rules) {
            targetColumns.add(rule.getTargetColumn());
        }
        
        return targetColumns;
    }
}
