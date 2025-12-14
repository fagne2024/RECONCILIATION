package com.reconciliation.service;

import com.reconciliation.dto.ReconciliationRequest;
import com.reconciliation.entity.AutoProcessingModel;
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
    private final ColumnProcessingRuleService columnProcessingRuleService;
    
    // Cache local pour éviter les appels multiples à getAllModels() dans la même requête
    private AutoProcessingModel cachedPartnerModel = null;
    private ReconciliationRequest cachedRequest = null;

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
     * Obtient le modelId du modèle partenaire correspondant aux fichiers
     * @param request La requête de réconciliation
     * @return Le modelId du modèle partenaire trouvé, ou null si aucun modèle n'est trouvé
     */
    public String getPartnerModelId(ReconciliationRequest request) {
        AutoProcessingModel partnerModel = findMatchingPartnerModel(request);
        if (partnerModel != null) {
            String modelId = partnerModel.getModelId();
            log.info("🔑 ModelId du modèle partenaire trouvé: {} (modèle: {})", modelId, partnerModel.getName());
            return modelId;
        }
        return null;
    }

    /**
     * Trouve un modèle partenaire correspondant aux fichiers
     * Utilise un cache local pour éviter les appels multiples dans la même requête
     */
    private AutoProcessingModel findMatchingPartnerModel(ReconciliationRequest request) {
        // Utiliser le cache si c'est la même requête
        if (cachedPartnerModel != null && cachedRequest == request) {
            return cachedPartnerModel;
        }
        
        try {
            // Récupérer tous les modèles depuis la base de données (avec cache Spring)
            List<AutoProcessingModel> models = autoProcessingService.getAllModels();
            log.info("📋 {} modèles récupérés depuis la base de données", models.size());
            
            // Récupérer les colonnes partenaires pour la détection
            Set<String> partnerColumns = new HashSet<>();
            if (!request.getPartnerFileContent().isEmpty()) {
                partnerColumns = request.getPartnerFileContent().get(0).keySet();
                log.info("📋 Colonnes partenaires disponibles: {}", partnerColumns);
            }
            
            List<AutoProcessingModel> matchingModels = new ArrayList<>();
            
            for (AutoProcessingModel model : models) {
                if (model.getFileType() == AutoProcessingModel.FileType.PARTNER) {
                    log.info("🔍 Test du modèle partenaire: {} (pattern: {}, template: {})", 
                            model.getName(), model.getFilePattern(), model.getTemplateFile());
                    // Vérifier si le modèle correspond aux fichiers
                    if (matchesFilePattern(request, model)) {
                        matchingModels.add(model);
                        log.info("✅ Modèle partenaire correspondant: {}", model.getName());
                    }
                }
            }
            
            // Si plusieurs modèles correspondent, choisir le plus spécifique ou celui avec des règles
            if (!matchingModels.isEmpty()) {
                // Prioriser les modèles qui ont des règles de traitement
                AutoProcessingModel bestModel = null;
                int maxRules = -1;
                
                for (AutoProcessingModel model : matchingModels) {
                    int ruleCount = 0;
                    try {
                        // OPTIMISATION: Utiliser directement le service de règles au lieu de charger tout le modèle
                        // Cela évite de charger toutes les données du modèle juste pour compter les règles
                        List<com.reconciliation.entity.ColumnProcessingRule> rules = 
                            columnProcessingRuleService.getRulesByModelId(model.getModelId());
                        if (rules != null) {
                            ruleCount = rules.size();
                        }
                    } catch (Exception e) {
                        log.debug("Erreur lors du comptage des règles pour le modèle {}: {}", model.getName(), e.getMessage());
                    }
                    
                    log.info("  - Modèle {}: {} règle(s) de traitement", model.getName(), ruleCount);
                    
                    if (ruleCount > maxRules) {
                        maxRules = ruleCount;
                        bestModel = model;
                    }
                }
                
                if (bestModel != null) {
                    log.info("✅ Modèle partenaire sélectionné: {} ({} règles)", bestModel.getName(), maxRules);
                    cachedPartnerModel = bestModel;
                    cachedRequest = request;
                    return bestModel;
                } else {
                    // Si aucun modèle n'a de règles, prendre le premier
                    log.info("✅ Modèle partenaire sélectionné (premier trouvé): {}", matchingModels.get(0).getName());
                    cachedPartnerModel = matchingModels.get(0);
                    cachedRequest = request;
                    return matchingModels.get(0);
                }
            }
            
            log.warn("⚠️ Aucun modèle partenaire trouvé pour les fichiers");
            // Mettre null en cache pour éviter de chercher à nouveau
            cachedPartnerModel = null;
            cachedRequest = request;
            return null;
        } catch (Exception e) {
            log.error("❌ Erreur lors de la récupération des modèles: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Vérifie si les fichiers correspondent au pattern du modèle
     * Détection basée sur les colonnes présentes dans les données
     */
    private boolean matchesFilePattern(ReconciliationRequest request, AutoProcessingModel model) {
        try {
            String filePattern = model.getFilePattern();
            log.info("🔍 Test pattern: '{}' pour le modèle {}", filePattern, model.getName());
            
            // Détection basée sur les colonnes présentes dans les données partenaires
            if (!request.getPartnerFileContent().isEmpty()) {
                Map<String, String> firstPartnerRecord = request.getPartnerFileContent().get(0);
                Set<String> partnerColumns = firstPartnerRecord.keySet();
                
                // Récupérer le templateFile du modèle pour identifier le type de fichier
                String templateFile = model.getTemplateFile();
                if (templateFile != null && !templateFile.isEmpty()) {
                    log.info("  - Template file du modèle: {}", templateFile);
                    
                    // Vérifier si le templateFile correspond aux colonnes présentes
                    // CIMTNCM.xlsx a des colonnes spécifiques comme "External id", "From", "To", etc.
                    if (templateFile.toLowerCase().contains("cimtncm")) {
                        // Vérifier les colonnes spécifiques à CIMTNCM
                        boolean hasExternalId = partnerColumns.contains("External id") || partnerColumns.stream().anyMatch(col -> col.equalsIgnoreCase("External id"));
                        boolean hasFrom = partnerColumns.contains("From") || partnerColumns.stream().anyMatch(col -> col.equalsIgnoreCase("From"));
                        boolean hasTo = partnerColumns.contains("To") || partnerColumns.stream().anyMatch(col -> col.equalsIgnoreCase("To"));
                        
                        if (hasExternalId && hasFrom && hasTo) {
                            log.info("✅ Modèle CIMTNCM détecté par colonnes: External id, From, To");
                            return true;
                        }
                    }
                    
                    // OPPART.xls a des colonnes spécifiques
                    if (templateFile.toLowerCase().contains("oppart")) {
                        boolean hasIdOperation = partnerColumns.contains("ID Opération") || partnerColumns.stream().anyMatch(col -> col.equalsIgnoreCase("ID Opération"));
                        boolean hasTypeOperation = partnerColumns.contains("Type Opération") || partnerColumns.stream().anyMatch(col -> col.equalsIgnoreCase("Type Opération"));
                        
                        if (hasIdOperation && hasTypeOperation) {
                            log.info("✅ Modèle OPPART détecté par colonnes: ID Opération, Type Opération");
                            return true;
                        }
                    }
                    
                    // Autres modèles partenaires - vérifier avec le pattern si défini
                    // Si le templateFile ne correspond à aucun pattern connu, vérifier le filePattern
                    if (filePattern != null && !filePattern.isEmpty()) {
                        // Vérifier si le pattern correspond vraiment aux colonnes présentes
                        // Par exemple, si le pattern contient "CIMTNCM" et qu'on a les colonnes CIMTNCM
                        String lowerPattern = filePattern.toLowerCase();
                        if (lowerPattern.contains("cimtncm")) {
                            boolean hasExternalId = partnerColumns.contains("External id") || 
                                                   partnerColumns.stream().anyMatch(col -> col.equalsIgnoreCase("External id"));
                            if (hasExternalId) {
                                log.info("✅ Modèle détecté par pattern et colonnes: {} (pattern: {}, colonne: External id)", model.getName(), filePattern);
                                return true;
                            }
                        }
                        
                        log.info("⚠️ Pattern '{}' du modèle {} ne correspond pas aux colonnes présentes", filePattern, model.getName());
                        return false;
                    }
                    
                    // Si pas de templateFile ni de pattern spécifique, ne pas accepter par défaut
                    log.info("⚠️ Modèle {} n'a ni templateFile spécifique ni pattern vérifiable, ignoré", model.getName());
                    return false;
                }
            }
            
            // Fallback: accepter le modèle si aucun autre critère n'a été vérifié
            return false;
        } catch (Exception e) {
            log.error("❌ Erreur lors de la vérification du pattern: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Détection automatique du contenu TRXBO/OPPART
     */
    public boolean detectTRXBOOPPARTContent(ReconciliationRequest request) {
        log.info("🔍 Début de la détection TRXBO/OPPART");
        
        // EXCLUSION EXPLICITE DE USSDPART
        // Détecter USSDPART par ses colonnes spécifiques
        if (!request.getPartnerFileContent().isEmpty()) {
            Map<String, String> firstPartnerRecord = request.getPartnerFileContent().get(0);
            Set<String> partnerColumns = firstPartnerRecord.keySet();
            
            // USSDPART a des colonnes spécifiques comme "Token", "Code PIXI", "Code de Proxy"
            boolean hasToken = partnerColumns.contains("Token");
            boolean hasCodePixi = partnerColumns.contains("Code PIXI");
            boolean hasCodeProxy = partnerColumns.contains("Code de Proxy");
            boolean hasGroupeReseaux = partnerColumns.contains("Groupe R seaux") || partnerColumns.contains("Groupe Réseaux");
            
            if (hasToken && hasCodePixi && hasCodeProxy && hasGroupeReseaux) {
                log.info("🔍 USSDPART détecté par colonnes spécifiques - Exclusion de la logique TRXBO/OPPART");
                return false;
            }
        }
        
        boolean hasTRXBO = false;
        boolean hasOPPART = false;
        
        // 1. Vérifier dans les valeurs des données BO
        for (Map<String, String> boRecord : request.getBoFileContent()) {
            for (String value : boRecord.values()) {
                if (value != null && value.toUpperCase().contains("TRXBO")) {
                    hasTRXBO = true;
                    log.info("🔍 TRXBO détecté dans les valeurs: {}", value);
                    break;
                }
            }
            if (hasTRXBO) break;
        }
        
        // 2. Vérifier dans les valeurs des données Partenaire
        for (Map<String, String> partnerRecord : request.getPartnerFileContent()) {
            for (String value : partnerRecord.values()) {
                if (value != null && value.toUpperCase().contains("OPPART")) {
                    hasOPPART = true;
                    log.info("🔍 OPPART détecté dans les valeurs: {}", value);
                    break;
                }
            }
            if (hasOPPART) break;
        }
        
        // 3. Vérifier dans les noms de colonnes BO
        if (!hasTRXBO && !request.getBoFileContent().isEmpty()) {
            Set<String> boColumns = request.getBoFileContent().get(0).keySet();
            hasTRXBO = boColumns.stream().anyMatch(col -> col.toUpperCase().contains("TRXBO"));
            if (hasTRXBO) {
                log.info("🔍 TRXBO détecté dans les colonnes BO");
            }
        }
        
        // 4. Vérifier dans les noms de colonnes Partenaire
        if (!hasOPPART && !request.getPartnerFileContent().isEmpty()) {
            Set<String> partnerColumns = request.getPartnerFileContent().get(0).keySet();
            hasOPPART = partnerColumns.stream().anyMatch(col -> col.toUpperCase().contains("OPPART"));
            if (hasOPPART) {
                log.info("🔍 OPPART détecté dans les colonnes Partenaire");
            }
        }
        
        // 5. Détection par colonnes spécifiques TRXBO
        if (!hasTRXBO && !request.getBoFileContent().isEmpty()) {
            Set<String> boColumns = request.getBoFileContent().get(0).keySet();
            boolean hasIDTransaction = boColumns.contains("IDTransaction") || boColumns.contains("ID Transaction");
            boolean hasTelephoneClient = boColumns.contains("téléphone client") || boColumns.contains("telephone client");
            boolean hasMontant = boColumns.contains("montant") || boColumns.contains("Montant");
            boolean hasService = boColumns.contains("Service") || boColumns.contains("service");
            boolean hasNumeroTransGU = boColumns.contains("Numéro Trans GU") || boColumns.contains("Numero Trans GU");
            
            int trxboColumnCount = 0;
            if (hasIDTransaction) trxboColumnCount++;
            if (hasTelephoneClient) trxboColumnCount++;
            if (hasMontant) trxboColumnCount++;
            if (hasService) trxboColumnCount++;
            if (hasNumeroTransGU) trxboColumnCount++;
            
            hasTRXBO = trxboColumnCount >= 4; // Au moins 4 colonnes TRXBO spécifiques
            
            if (hasTRXBO) {
                log.info("🔍 TRXBO détecté par colonnes spécifiques ({} colonnes TRXBO)", trxboColumnCount);
            }
        }
        
        // 6. Détection par colonnes spécifiques OPPART
        if (!hasOPPART && !request.getPartnerFileContent().isEmpty()) {
            Map<String, String> firstPartnerRecord = request.getPartnerFileContent().get(0);
            Set<String> partnerColumns = firstPartnerRecord.keySet();
            boolean hasTypeOperation = partnerColumns.contains("Type Opération") || partnerColumns.contains("Type Operation");
            boolean hasMontant = partnerColumns.contains("Montant") || partnerColumns.contains("montant");
            boolean hasSoldeAvant = partnerColumns.contains("Solde avant") || partnerColumns.contains("Solde avant");
            boolean hasSoldeApres = partnerColumns.contains("Solde aprés") || partnerColumns.contains("Solde après");
            boolean hasNumeroTransGU = partnerColumns.contains("Numéro Trans GU") || partnerColumns.contains("Numero Trans GU");
            
            int oppartColumnCount = 0;
            if (hasTypeOperation) oppartColumnCount++;
            if (hasMontant) oppartColumnCount++;
            if (hasSoldeAvant) oppartColumnCount++;
            if (hasSoldeApres) oppartColumnCount++;
            if (hasNumeroTransGU) oppartColumnCount++;
            
            hasOPPART = oppartColumnCount >= 4; // Au moins 4 colonnes OPPART spécifiques
            
            if (hasOPPART) {
                log.info("🔍 OPPART détecté par colonnes spécifiques ({} colonnes OPPART)", oppartColumnCount);
            }
        }
        
        log.info("🔍 Détection TRXBO/OPPART - TRXBO: {}, OPPART: {}", hasTRXBO, hasOPPART);
        return hasTRXBO && hasOPPART;
    }

    /**
     * Récupère les règles de correspondance configurées
     */
    public List<CorrespondenceRule> getCorrespondenceRules(ReconciliationRequest request) {
        // Utiliser le cache pour éviter les appels multiples
        AutoProcessingModel partnerModel = findMatchingPartnerModel(request);
        
        if (partnerModel != null && partnerModel.getCorrespondenceRules() != null) {
            return parseCorrespondenceRules(partnerModel.getCorrespondenceRules());
        }
        
        // Règles par défaut
        return getDefaultCorrespondenceRules(request);
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
    private List<CorrespondenceRule> getDefaultCorrespondenceRules(ReconciliationRequest request) {
        List<CorrespondenceRule> rules = new ArrayList<>();
        
        // Détecter si c'est une réconciliation TRXBO/OPPART
        boolean isTRXBOOPPART = detectTRXBOOPPARTContent(request);
        
        if (isTRXBOOPPART) {
            // Pour TRXBO/OPPART: une transaction doit correspondre à exactement 2 opérations
            CorrespondenceRule perfectMatch = new CorrespondenceRule();
            perfectMatch.setName("Correspondance Parfaite TRXBO/OPPART (1:2)");
            perfectMatch.setCondition("partnerMatches == 2");
            perfectMatch.setAction("MARK_AS_MATCH");
            perfectMatch.setDescription("Une transaction TRXBO correspond à exactement 2 opérations OPPART");
            rules.add(perfectMatch);
            
            // Règle pour 0 correspondance (TSOP)
            CorrespondenceRule noMatch = new CorrespondenceRule();
            noMatch.setName("TRXBO sans correspondance (TSOP)");
            noMatch.setCondition("partnerMatches == 0");
            noMatch.setAction("MARK_AS_BO_ONLY_TSOP");
            noMatch.setDescription("Transaction TRXBO sans correspondance OPPART");
            rules.add(noMatch);
            
            // Règle pour 1 correspondance (TRXSF)
            CorrespondenceRule singleMatch = new CorrespondenceRule();
            singleMatch.setName("TRXBO avec une seule correspondance (TRXSF)");
            singleMatch.setCondition("partnerMatches == 1");
            singleMatch.setAction("MARK_AS_MISMATCH_TRXSF");
            singleMatch.setDescription("Transaction TRXBO avec une seule correspondance OPPART (attendu: 2)");
            rules.add(singleMatch);
            
            // Règle pour >=3 correspondances (Écart)
            CorrespondenceRule multipleMatch = new CorrespondenceRule();
            multipleMatch.setName("TRXBO avec plusieurs correspondances (Écart)");
            multipleMatch.setCondition("partnerMatches >= 3");
            multipleMatch.setAction("MARK_AS_MISMATCH");
            multipleMatch.setDescription("Transaction TRXBO avec 3 ou plus correspondances OPPART (attendu: 2)");
            rules.add(multipleMatch);
            
            log.info("📋 Règles de correspondance par défaut configurées pour TRXBO/OPPART (1:2)");
        } else {
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
        }
        
        return rules;
    }

    /**
     * Récupère les colonnes de comparaison configurées
     */
    public List<ComparisonColumn> getComparisonColumns(ReconciliationRequest request) {
        // Utiliser le cache pour éviter les appels multiples
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
