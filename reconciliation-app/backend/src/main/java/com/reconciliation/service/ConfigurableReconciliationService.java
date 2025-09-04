package com.reconciliation.service;

import com.reconciliation.dto.ReconciliationRequest;
import com.reconciliation.dto.ReconciliationResponse;
import com.reconciliation.entity.AutoProcessingModel;
import com.reconciliation.service.AutoProcessingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ConfigurableReconciliationService {

    private final AutoProcessingService autoProcessingService;

    /**
     * Détermine la logique de réconciliation à utiliser basée sur les modèles
     */
    public ReconciliationLogicType determineReconciliationLogic(ReconciliationRequest request) {
        log.info("🔍 Détermination de la logique de réconciliation...");
        
        // 1. Chercher un modèle partenaire qui correspond aux fichiers
        AutoProcessingModel partnerModel = findMatchingPartnerModel(request);
        
        if (partnerModel != null && partnerModel.getReconciliationLogic() != null) {
            String logicType = (String) partnerModel.getReconciliationLogic().get("type");
            log.info("📋 Logique trouvée dans le modèle {}: {}", partnerModel.getName(), logicType);
            
            switch (logicType.toUpperCase()) {
                case "SPECIAL_RATIO":
                    return ReconciliationLogicType.SPECIAL_RATIO;
                case "STANDARD":
                    return ReconciliationLogicType.STANDARD;
                case "CUSTOM":
                    return ReconciliationLogicType.CUSTOM;
                default:
                    log.warn("⚠️ Type de logique inconnu: {}, utilisation de la logique standard", logicType);
                    return ReconciliationLogicType.STANDARD;
            }
        }
        
        // 2. Fallback: Détection automatique basée sur le contenu
        if (detectTRXBOOPPARTContent(request)) {
            log.info("🔍 Détection automatique TRXBO/OPPART basée sur le contenu");
            return ReconciliationLogicType.SPECIAL_RATIO;
        }
        
        log.info("✅ Utilisation de la logique standard par défaut");
        return ReconciliationLogicType.STANDARD;
    }

    /**
     * Trouve un modèle partenaire correspondant aux fichiers
     */
    private AutoProcessingModel findMatchingPartnerModel(ReconciliationRequest request) {
        try {
            // Récupérer tous les modèles depuis la base de données
            List<AutoProcessingModel> models = autoProcessingService.getAllModels();
            log.info("📋 {} modèles récupérés depuis la base de données", models.size());
            
            for (AutoProcessingModel model : models) {
                if (model.getFileType() == AutoProcessingModel.FileType.PARTNER) {
                    log.info("🔍 Test du modèle partenaire: {}", model.getName());
                    // Vérifier si le modèle correspond aux fichiers
                    if (matchesFilePattern(request, model)) {
                        log.info("✅ Modèle partenaire trouvé: {}", model.getName());
                        return model;
                    }
                }
            }
            
            log.warn("⚠️ Aucun modèle partenaire trouvé pour les fichiers");
            return null;
        } catch (Exception e) {
            log.error("❌ Erreur lors de la récupération des modèles: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Vérifie si les fichiers correspondent au pattern du modèle
     * Pour l'instant, on utilise une détection basée sur le contenu
     */
    private boolean matchesFilePattern(ReconciliationRequest request, AutoProcessingModel model) {
        try {
            String filePattern = model.getFilePattern();
            log.info("🔍 Test pattern: '{}' pour le modèle {}", filePattern, model.getName());
            
            // Pour l'instant, on accepte tous les modèles partenaires
            // La détection se fait principalement par le contenu TRXBO/OPPART
            return true;
        } catch (Exception e) {
            log.error("❌ Erreur lors de la vérification du pattern: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Détection automatique du contenu TRXBO/OPPART
     */
    private boolean detectTRXBOOPPARTContent(ReconciliationRequest request) {
        // Vérifier la présence de TRXBO dans les données BO
        boolean hasTRXBO = request.getBoFileContent().stream()
            .anyMatch(record -> record.values().stream()
                .anyMatch(value -> value.toString().toUpperCase().contains("TRXBO")));
        
        // Vérifier la présence d'OPPART dans les données partenaire
        boolean hasOPPART = request.getPartnerFileContent().stream()
            .anyMatch(record -> record.values().stream()
                .anyMatch(value -> value.toString().toUpperCase().contains("OPPART")));
        
        return hasTRXBO && hasOPPART;
    }

    /**
     * Récupère les règles de correspondance configurées
     */
    public List<CorrespondenceRule> getCorrespondenceRules(ReconciliationRequest request) {
        AutoProcessingModel partnerModel = findMatchingPartnerModel(request);
        
        if (partnerModel != null && partnerModel.getCorrespondenceRules() != null) {
            return parseCorrespondenceRules(partnerModel.getCorrespondenceRules());
        }
        
        // Règles par défaut
        return getDefaultCorrespondenceRules();
    }

    /**
     * Parse les règles de correspondance depuis la configuration JSON
     */
    private List<CorrespondenceRule> parseCorrespondenceRules(Map<String, Object> rulesConfig) {
        List<CorrespondenceRule> rules = new ArrayList<>();
        
        if (rulesConfig.containsKey("rules")) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> rulesList = (List<Map<String, Object>>) rulesConfig.get("rules");
            
            for (Map<String, Object> ruleConfig : rulesList) {
                CorrespondenceRule rule = new CorrespondenceRule();
                rule.setName((String) ruleConfig.get("name"));
                rule.setCondition((String) ruleConfig.get("condition"));
                rule.setAction((String) ruleConfig.get("action"));
                rule.setDescription((String) ruleConfig.get("description"));
                rules.add(rule);
            }
        }
        
        return rules;
    }

    /**
     * Règles de correspondance par défaut
     */
    private List<CorrespondenceRule> getDefaultCorrespondenceRules() {
        List<CorrespondenceRule> rules = new ArrayList<>();
        
        // Règle pour correspondance parfaite (1:1 par défaut)
        CorrespondenceRule perfectMatch = new CorrespondenceRule();
        perfectMatch.setName("Correspondance Parfaite (1:1)");
        perfectMatch.setCondition("partnerMatches == 1");
        perfectMatch.setAction("MARK_AS_MATCH");
        perfectMatch.setDescription("Une correspondance exacte entre BO et Partenaire");
        rules.add(perfectMatch);
        
        // Règle pour écarts
        CorrespondenceRule mismatch = new CorrespondenceRule();
        mismatch.setName("Écart");
        mismatch.setCondition("partnerMatches != 1");
        mismatch.setAction("MARK_AS_MISMATCH");
        mismatch.setDescription("Nombre de correspondances différent de 1");
        rules.add(mismatch);
        
        log.info("📋 Règles de correspondance par défaut configurées (1:1)");
        return rules;
    }

    /**
     * Récupère les colonnes de comparaison configurées
     */
    public List<ComparisonColumn> getComparisonColumns(ReconciliationRequest request) {
        AutoProcessingModel partnerModel = findMatchingPartnerModel(request);
        
        if (partnerModel != null && partnerModel.getComparisonColumns() != null) {
            return parseComparisonColumns(partnerModel.getComparisonColumns());
        }
        
        // Colonnes par défaut
        return getDefaultComparisonColumns(request);
    }

    /**
     * Parse les colonnes de comparaison depuis la configuration JSON
     */
    private List<ComparisonColumn> parseComparisonColumns(Map<String, Object> columnsConfig) {
        List<ComparisonColumn> columns = new ArrayList<>();
        
        if (columnsConfig.containsKey("columns")) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> columnsList = (List<Map<String, Object>>) columnsConfig.get("columns");
            
            for (Map<String, Object> columnConfig : columnsList) {
                ComparisonColumn column = new ComparisonColumn();
                column.setBoColumn((String) columnConfig.get("boColumn"));
                column.setPartnerColumn((String) columnConfig.get("partnerColumn"));
                column.setTolerance(((Number) columnConfig.get("tolerance")).doubleValue());
                column.setComparisonType((String) columnConfig.get("comparisonType"));
                columns.add(column);
            }
        }
        
        return columns;
    }

    /**
     * Colonnes de comparaison par défaut
     */
    private List<ComparisonColumn> getDefaultComparisonColumns(ReconciliationRequest request) {
        List<ComparisonColumn> columns = new ArrayList<>();
        
        // Trouver les colonnes communes
        Set<String> boColumns = request.getBoFileContent().isEmpty() ? 
            new HashSet<>() : request.getBoFileContent().get(0).keySet();
        Set<String> partnerColumns = request.getPartnerFileContent().isEmpty() ? 
            new HashSet<>() : request.getPartnerFileContent().get(0).keySet();
        
        // Colonnes communes
        Set<String> commonColumns = boColumns.stream()
            .filter(partnerColumns::contains)
            .collect(Collectors.toSet());
        
        for (String columnName : commonColumns) {
            ComparisonColumn column = new ComparisonColumn();
            column.setBoColumn(columnName);
            column.setPartnerColumn(columnName);
            column.setTolerance(0.01); // Tolérance par défaut
            column.setComparisonType("AUTO"); // Détection automatique du type
            columns.add(column);
        }
        
        return columns;
    }

    /**
     * Types de logique de réconciliation
     */
    public enum ReconciliationLogicType {
        STANDARD,      // Logique standard 1:1
        SPECIAL_RATIO, // Logique spéciale (ex: 1:2 pour TRXBO/OPPART)
        CUSTOM         // Logique personnalisée
    }

    /**
     * Règle de correspondance
     */
    public static class CorrespondenceRule {
        private String name;
        private String condition;
        private String action;
        private String description;

        // Getters et setters
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getCondition() { return condition; }
        public void setCondition(String condition) { this.condition = condition; }
        public String getAction() { return action; }
        public void setAction(String action) { this.action = action; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
    }

    /**
     * Colonne de comparaison
     */
    public static class ComparisonColumn {
        private String boColumn;
        private String partnerColumn;
        private double tolerance;
        private String comparisonType;

        // Getters et setters
        public String getBoColumn() { return boColumn; }
        public void setBoColumn(String boColumn) { this.boColumn = boColumn; }
        public String getPartnerColumn() { return partnerColumn; }
        public void setPartnerColumn(String partnerColumn) { this.partnerColumn = partnerColumn; }
        public double getTolerance() { return tolerance; }
        public void setTolerance(double tolerance) { this.tolerance = tolerance; }
        public String getComparisonType() { return comparisonType; }
        public void setComparisonType(String comparisonType) { this.comparisonType = comparisonType; }
    }
}
