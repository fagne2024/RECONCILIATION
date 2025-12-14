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
     * @param rules Les règles de traitement (chargées une seule fois)
     * @param data La ligne de données à traiter (Map<String, Object>)
     * @return La ligne de données traitée
     */
    public Map<String, Object> processDataRow(List<ColumnProcessingRule> rules, Map<String, Object> data) {
        Map<String, Object> processedData = new HashMap<>(data);
        
        for (ColumnProcessingRule rule : rules) {
            String sourceColumn = rule.getSourceColumn();
            String targetColumn = rule.getTargetColumn();
            
            // Recherche flexible de la colonne avec normalisation
            String actualColumnKey = findColumnKey(processedData, sourceColumn);
            
            if (actualColumnKey != null) {
                Object value = processedData.get(actualColumnKey);
                String originalValueStr = value != null ? value.toString() : null;
                
                Object processedValue = applyRule(value, rule);
                String processedValueStr = processedValue != null ? processedValue.toString() : null;
                
                // Si targetColumn est vide ou null, mettre à jour la valeur dans sourceColumn
                // Sinon, créer une nouvelle colonne targetColumn avec la valeur traitée
                if (targetColumn == null || targetColumn.trim().isEmpty()) {
                    processedData.put(actualColumnKey, processedValue);
                    if (originalValueStr != null && !originalValueStr.equals(processedValueStr)) {
                        System.out.println("✅ [PROCESS] Colonne \"" + actualColumnKey + "\": \"" + originalValueStr + "\" -> \"" + processedValueStr + "\"");
                    }
                } else {
                    processedData.put(targetColumn, processedValue);
                    if (originalValueStr != null && !originalValueStr.equals(processedValueStr)) {
                        System.out.println("✅ [PROCESS] Colonne \"" + actualColumnKey + "\" -> \"" + targetColumn + "\": \"" + originalValueStr + "\" -> \"" + processedValueStr + "\"");
                    }
                }
            } else {
                System.out.println("⚠️ [PROCESS] Colonne \"" + sourceColumn + "\" non trouvée dans les données");
            }
        }
        
        return processedData;
    }
    
    /**
     * Applique les règles de traitement des colonnes à une ligne de données (méthode de compatibilité)
     * @param modelId L'ID du modèle de traitement
     * @param data La ligne de données à traiter (Map<String, Object>)
     * @return La ligne de données traitée
     */
    public Map<String, Object> processDataRow(String modelId, Map<String, Object> data) {
        List<ColumnProcessingRule> rules = columnProcessingRuleService.getRulesByModelId(modelId);
        
        // Log pour debug
        if (!rules.isEmpty()) {
            System.out.println("🔧 [PROCESS] Application de " + rules.size() + " règle(s) pour le modèle: " + modelId);
            System.out.println("  📋 Colonnes disponibles dans les données: " + String.join(", ", data.keySet()));
            rules.forEach(rule -> {
                System.out.println("  - Règle pour colonne: \"" + rule.getSourceColumn() + "\"" + 
                                 ", stringToRemove: " + (rule.getStringToRemove() != null ? "\"" + rule.getStringToRemove() + "\"" : "null") +
                                 ", removeSpecialChars: " + rule.isRemoveSpecialChars());
            });
        }
        
        return processDataRow(rules, data);
    }
    
    /**
     * Trouve la clé de colonne correspondante dans les données avec recherche flexible
     * Gère les problèmes d'encodage et les différences de casse
     */
    private String findColumnKey(Map<String, Object> data, String sourceColumn) {
        // Recherche exacte d'abord
        if (data.containsKey(sourceColumn)) {
            return sourceColumn;
        }
        
        // Normalisation pour la recherche flexible
        String normalizedSource = normalizeColumnName(sourceColumn);
        
        // Recherche avec normalisation
        for (String key : data.keySet()) {
            String normalizedKey = normalizeColumnName(key);
            if (normalizedSource.equalsIgnoreCase(normalizedKey)) {
                System.out.println("🔍 [PROCESS] Colonne trouvée avec normalisation: \"" + sourceColumn + "\" -> \"" + key + "\"");
                return key;
            }
        }
        
        // Recherche partielle (contient)
        for (String key : data.keySet()) {
            if (key.contains(normalizedSource) || normalizedSource.contains(key)) {
                System.out.println("🔍 [PROCESS] Colonne trouvée avec recherche partielle: \"" + sourceColumn + "\" -> \"" + key + "\"");
                return key;
            }
        }
        
        return null;
    }
    
    /**
     * Normalise un nom de colonne pour la comparaison
     */
    private String normalizeColumnName(String columnName) {
        if (columnName == null) return "";
        
        // Correction des caractères mal encodés courants
        String normalized = columnName;
        
        // Corriger les caractères corrompus
        normalized = normalized.replace("Num??ro", "Numéro");
        normalized = normalized.replace("??", "é");
        normalized = normalized.replace("?", "");
        
        // Normalisation Unicode
        normalized = java.text.Normalizer.normalize(normalized, java.text.Normalizer.Form.NFD);
        normalized = normalized.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        
        // Normaliser la casse et les espaces
        normalized = normalized.trim().toLowerCase().replaceAll("\\s+", " ");
        
        return normalized;
    }

    /**
     * Applique les règles de traitement des colonnes à une liste de lignes de données
     * OPTIMISATION: Charge les règles une seule fois au lieu de les charger pour chaque ligne
     * @param modelId L'ID du modèle de traitement
     * @param dataList La liste des lignes de données à traiter
     * @return La liste des lignes de données traitées
     */
    public List<Map<String, Object>> processDataList(String modelId, List<Map<String, Object>> dataList) {
        // OPTIMISATION CRITIQUE: Charger les règles une seule fois au lieu de les charger pour chaque ligne
        // Cela évite des centaines/milliers de requêtes SQL (problème N+1)
        List<ColumnProcessingRule> rules = columnProcessingRuleService.getRulesByModelId(modelId);
        
        // Log pour debug (seulement si des règles existent)
        if (!rules.isEmpty() && !dataList.isEmpty()) {
            System.out.println("🔧 [PROCESS] Application de " + rules.size() + " règle(s) pour le modèle: " + modelId + " sur " + dataList.size() + " lignes");
            System.out.println("  📋 Colonnes disponibles dans les données: " + String.join(", ", dataList.get(0).keySet()));
        }
        
        List<Map<String, Object>> processedDataList = new ArrayList<>(dataList.size());
        
        // Traiter toutes les lignes avec les règles déjà chargées
        for (Map<String, Object> dataRow : dataList) {
            Map<String, Object> processedRow = processDataRow(rules, dataRow);
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
        
        // Appliquer les transformations dans l'ordre optimal pour garantir une suppression correcte des caractères
        // 1. Format type (nettoyage initial basé sur le type)
        stringValue = applyFormatType(stringValue, rule.getFormatType());
        
        // 2. Suppression des accents AVANT la suppression des caractères spéciaux
        //    (pour normaliser les caractères accentués avant qu'ils ne soient supprimés)
        stringValue = applyAccentRemoval(stringValue, rule);
        
        // 3. Suppression de chaînes spécifiques (ex: -ENV_BET, _CM, _ML, etc.)
        //    IMPORTANT: Doit être appliqué AVANT removeSpecialChars pour éviter que les caractères spéciaux
        //    (comme le tiret dans "-ENV_BET") ne soient supprimés avant la recherche
        stringValue = applyStringRemoval(stringValue, rule);
        
        // 4. Suppression des caractères spéciaux (après suppression des chaînes spécifiques)
        stringValue = applySpecialCharTransformations(stringValue, rule);
        
        // 5. Transformations de casse (après nettoyage des caractères)
        stringValue = applyCaseTransformations(stringValue, rule);
        
        // 6. Padding avec zéros (pour les valeurs numériques)
        stringValue = applyPadding(stringValue, rule);
        
        // 7. Remplacement par regex (dernière transformation personnalisée)
        stringValue = applyRegexReplace(stringValue, rule);
        
        // 8. Trim des espaces EN DERNIER pour nettoyer les espaces restants après toutes les suppressions
        stringValue = applySpaceTransformations(stringValue, rule);
        
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
        // D'abord appliquer le mapping de remplacement des caractères spéciaux
        // (pour permettre de remplacer certains caractères spéciaux par des caractères alphanumériques)
        Map<String, String> replacementMap = rule.getSpecialCharReplacementMap();
        if (replacementMap != null && !replacementMap.isEmpty()) {
            for (Map.Entry<String, String> entry : replacementMap.entrySet()) {
                value = value.replace(entry.getKey(), entry.getValue());
            }
        }
        
        // Ensuite supprimer les caractères spéciaux restants (sauf les espaces)
        if (rule.isRemoveSpecialChars()) {
            // Supprimer tous les caractères qui ne sont pas des lettres, chiffres ou espaces
            value = value.replaceAll("[^a-zA-Z0-9\\s]", "");
        }
        
        return value;
    }

    /**
     * Applique la suppression de chaînes spécifiques
     */
    private String applyStringRemoval(String value, ColumnProcessingRule rule) {
        String stringToRemove = rule.getStringToRemove();
        if (stringToRemove != null && !stringToRemove.isEmpty()) {
            String originalValue = value;
            // Supprimer toutes les occurrences de la chaîne spécifiée (pas seulement la première)
            // Échapper les caractères spéciaux pour éviter les problèmes avec les regex
            String escapedString = stringToRemove.replace("\\", "\\\\")
                                                 .replace(".", "\\.")
                                                 .replace("*", "\\*")
                                                 .replace("+", "\\+")
                                                 .replace("?", "\\?")
                                                 .replace("^", "\\^")
                                                 .replace("$", "\\$")
                                                 .replace("{", "\\{")
                                                 .replace("}", "\\}")
                                                 .replace("(", "\\(")
                                                 .replace(")", "\\)")
                                                 .replace("[", "\\[")
                                                 .replace("]", "\\]")
                                                 .replace("|", "\\|");
            
            // Remplacer toutes les occurrences (comme le frontend)
            value = value.replaceAll(escapedString, "");
            
            // Log pour vérifier l'application de la règle
            if (!originalValue.equals(value)) {
                System.out.println("✅ [APPLY] stringToRemove appliqué pour colonne \"" + rule.getSourceColumn() + "\": \"" + stringToRemove + "\" sur \"" + originalValue + "\" -> \"" + value + "\"");
            } else {
                System.out.println("⚠️ [APPLY] stringToRemove \"" + stringToRemove + "\" non trouvé dans \"" + originalValue + "\" pour colonne \"" + rule.getSourceColumn() + "\"");
            }
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
