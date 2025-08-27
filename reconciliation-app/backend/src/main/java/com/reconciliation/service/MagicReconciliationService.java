package com.reconciliation.service;

import com.reconciliation.dto.ReconciliationRequest;
import com.reconciliation.dto.ReconciliationResponse;
import com.reconciliation.dto.ColumnComparison;
import com.reconciliation.model.ReconciliationProgress;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MagicReconciliationService {

    private final KeyDiscoveryService keyDiscoveryService;
    private final CsvReconciliationService reconciliationService;
    private final ReconciliationProgressService progressService;
    private final ReconciliationJobService jobService;
    
    private final ExecutorService executorService = Executors.newFixedThreadPool(2);

    /**
     * Exécute une réconciliation magique complète
     */
    public CompletableFuture<MagicReconciliationResult> executeMagicReconciliation(
            List<Map<String, String>> boData, 
            List<Map<String, String>> partnerData, 
            String jobId) {
        
        log.info("🚀 Début de la réconciliation magique pour le job: {}", jobId);
        
        return CompletableFuture.supplyAsync(() -> {
            try {
                // Étape 1: Découverte des clés
                updateProgress(jobId, 10, "Découverte automatique des clés de réconciliation...");
                KeyDiscoveryService.KeyDiscoveryResult keyResult = keyDiscoveryService.discoverKeys(boData, partnerData);
                
                if (keyResult.confidence < 0.1) {
                    String errorMessage = String.format("Impossible de déterminer une clé de réconciliation fiable automatiquement (confiance: %.1f%%). Veuillez utiliser le mode Assisté ou Manuel.", 
                        keyResult.confidence * 100);
                    log.warn("⚠️ Confiance insuffisante ({:.2f}%) pour la réconciliation magique (seuil: 10%)", keyResult.confidence * 100);
                    jobService.failJob(jobId, errorMessage);
                    return new MagicReconciliationResult(false, null, errorMessage, keyResult);
                }
                
                // Étape 2: Préparation de la requête de réconciliation avec traitements
                updateProgress(jobId, 30, "Configuration automatique de la réconciliation avec normalisation...");
                ReconciliationRequest request = buildReconciliationRequestWithTreatments(boData, partnerData, keyResult);
                
                // Étape 3: Exécution de la réconciliation
                updateProgress(jobId, 50, "Exécution de la réconciliation...");
                ReconciliationResponse response = reconciliationService.reconcile(request);
                
                // Étape 4: Sauvegarder les résultats dans le job
                jobService.completeJob(jobId, response);
                updateProgress(jobId, 100, "Réconciliation terminée avec succès");
                
                log.info("✅ Réconciliation magique terminée avec succès pour le job: {}", jobId);
                return new MagicReconciliationResult(true, response, "Réconciliation magique réussie", keyResult);
                
            } catch (Exception e) {
                log.error("❌ Erreur lors de la réconciliation magique pour le job: {}", jobId, e);
                jobService.failJob(jobId, "Erreur: " + e.getMessage());
                updateProgress(jobId, 0, "Erreur: " + e.getMessage());
                return new MagicReconciliationResult(false, null, "Erreur: " + e.getMessage(), null);
            }
        }, executorService);
    }

    /**
     * Met à jour la progression de la réconciliation
     */
    private void updateProgress(String jobId, int percentage, String message) {
        ReconciliationProgress progress = new ReconciliationProgress(percentage, message, 0, 0);
        progressService.updateProgress(jobId, progress);
        log.info("📊 Progression [{}]: {}% - {}", jobId, percentage, message);
    }

    /**
     * Construit la requête de réconciliation à partir des clés découvertes avec traitements
     */
    private ReconciliationRequest buildReconciliationRequestWithTreatments(
            List<Map<String, String>> boData, 
            List<Map<String, String>> partnerData, 
            KeyDiscoveryService.KeyDiscoveryResult keyResult) {
        
        // Appliquer les transformations détectées aux données BO
        List<Map<String, String>> transformedBoData = applyTransformationsToBoData(boData, keyResult);
        
        ReconciliationRequest request = new ReconciliationRequest();
        request.setBoFileContent(transformedBoData);
        request.setPartnerFileContent(partnerData);
        
        // Utiliser la première clé comme clé principale avec ses traitements
        if (!keyResult.candidates.isEmpty()) {
            KeyDiscoveryService.KeyCandidate primaryKey = keyResult.candidates.get(0);
            request.setBoKeyColumn(primaryKey.boColumn);
            request.setPartnerKeyColumn(primaryKey.partnerColumn);
            
            log.info("🔑 Clé principale sélectionnée: {} ↔ {} (confiance: {:.1f}%)", 
                primaryKey.boColumn, primaryKey.partnerColumn, primaryKey.getOverallScore() * 100);
            log.info("🔧 Traitements appliqués: {}", primaryKey.contentAnalysis.appliedTreatments);
            log.info("📝 Raison: {}", primaryKey.contentAnalysis.reason);
        } else {
            // Fallback: utiliser les premières colonnes disponibles
            if (!boData.isEmpty() && !partnerData.isEmpty()) {
                String firstBoColumn = boData.get(0).keySet().iterator().next();
                String firstPartnerColumn = partnerData.get(0).keySet().iterator().next();
                request.setBoKeyColumn(firstBoColumn);
                request.setPartnerKeyColumn(firstPartnerColumn);
                
                log.warn("⚠️ Utilisation des premières colonnes disponibles: {} ↔ {}", firstBoColumn, firstPartnerColumn);
            }
        }
        
        // Ajouter des colonnes de comparaison automatiques
        List<ColumnComparison> comparisonColumns = buildComparisonColumns(transformedBoData, partnerData, keyResult);
        request.setComparisonColumns(comparisonColumns);
        
        log.info("📋 Requête de réconciliation construite avec {} colonnes de comparaison", comparisonColumns.size());
        return request;
    }
    
    /**
     * Applique les transformations détectées aux données BO
     */
    private List<Map<String, String>> applyTransformationsToBoData(
            List<Map<String, String>> boData, 
            KeyDiscoveryService.KeyDiscoveryResult keyResult) {
        
        if (keyResult.candidates.isEmpty()) {
            return boData;
        }
        
        KeyDiscoveryService.KeyCandidate primaryKey = keyResult.candidates.get(0);
        String boKeyColumn = primaryKey.boColumn;
        
        // Vérifier s'il y a des traitements à appliquer
        if (primaryKey.contentAnalysis.appliedTreatments.isEmpty()) {
            log.info("🔍 Aucun traitement à appliquer pour la colonne: {}", boKeyColumn);
            return boData;
        }
        
        log.info("🔧 Application des transformations à la colonne BO: {}", boKeyColumn);
        log.info("🔧 Traitements détectés: {}", primaryKey.contentAnalysis.appliedTreatments);
        
        // Créer une copie des données avec les transformations appliquées
        List<Map<String, String>> transformedData = new ArrayList<>();
        
        for (Map<String, String> row : boData) {
            Map<String, String> transformedRow = new HashMap<>(row);
            String originalValue = row.get(boKeyColumn);
            
            if (originalValue != null && !originalValue.trim().isEmpty()) {
                String transformedValue = applyTreatments(originalValue, primaryKey.contentAnalysis.appliedTreatments);
                
                if (!originalValue.equals(transformedValue)) {
                    log.debug("🔧 Transformation: \"{}\" → \"{}\"", originalValue, transformedValue);
                }
                
                transformedRow.put(boKeyColumn, transformedValue);
            }
            
            transformedData.add(transformedRow);
        }
        
        log.info("✅ Transformations appliquées à {} enregistrements BO", transformedData.size());
        return transformedData;
    }
    
    /**
     * Applique les traitements détectés à une valeur
     */
    private String applyTreatments(String value, List<String> treatments) {
        String result = value;
        
        for (String treatment : treatments) {
            switch (treatment) {
                case "trim":
                    result = result.trim();
                    break;
                case "toLowerCase":
                    result = result.toLowerCase();
                    break;
                case "trim+toLowerCase":
                    result = result.trim().toLowerCase();
                    break;
                case "removeSpecialChars":
                    result = result.replaceAll("[^a-zA-Z0-9]", "");
                    break;
                case "normalizeNumbers":
                    result = result.replaceAll("^0+", "");
                    break;
                case "removeSuffix_CM":
                    result = removeSuffix(result, "_CM");
                    break;
                case "removeSuffix_FR":
                    result = removeSuffix(result, "_FR");
                    break;
                case "removeSuffix_US":
                    result = removeSuffix(result, "_US");
                    break;
                case "removeSuffixPattern":
                    result = removeSuffixPattern(result);
                    break;
                case "trim+toLowerCase+removeSpecialChars":
                    result = result.trim().toLowerCase().replaceAll("[^a-zA-Z0-9]", "");
                    break;
                case "trim+toLowerCase+normalizeNumbers":
                    result = result.trim().toLowerCase().replaceAll("^0+", "");
                    break;
                case "trim+removeSuffixPattern":
                    result = removeSuffixPattern(result.trim());
                    break;
                default:
                    log.debug("⚠️ Traitement non reconnu: {}", treatment);
                    break;
            }
        }
        
        return result;
    }
    
    /**
     * Supprime un suffixe spécifique d'une valeur
     */
    private String removeSuffix(String value, String suffix) {
        if (value != null && value.endsWith(suffix)) {
            return value.substring(0, value.length() - suffix.length());
        }
        return value;
    }
    
    /**
     * Supprime les patterns de suffixe courants
     */
    private String removeSuffixPattern(String value) {
        if (value == null) return value;
        
        // Patterns courants pour les suffixes
        String[] patterns = {
            "_CM", "_FR", "_US", "_UK", "_DE", "_IT", "_ES", "_CA", "_AU", "_BR",
            "_01", "_02", "_03", "_04", "_05", "_06", "_07", "_08", "_09", "_10",
            "_CM1", "_FR1", "_US1", "_UK1", "_DE1", "_IT1", "_ES1", "_CA1", "_AU1", "_BR1"
        };
        
        for (String pattern : patterns) {
            if (value.endsWith(pattern)) {
                return value.substring(0, value.length() - pattern.length());
            }
        }
        
        // Pattern générique pour les suffixes de 2-5 caractères commençant par _
        if (value.matches(".*_[A-Z0-9]{2,5}$")) {
            return value.replaceAll("_[A-Z0-9]{2,5}$", "");
        }
        
        return value;
    }

    /**
     * Construit la requête de réconciliation à partir des clés découvertes
     */
    private ReconciliationRequest buildReconciliationRequest(
            List<Map<String, String>> boData, 
            List<Map<String, String>> partnerData, 
            KeyDiscoveryService.KeyDiscoveryResult keyResult) {
        
        ReconciliationRequest request = new ReconciliationRequest();
        request.setBoFileContent(boData);
        request.setPartnerFileContent(partnerData);
        
        // Utiliser la première clé comme clé principale
        if (!keyResult.candidates.isEmpty()) {
            KeyDiscoveryService.KeyCandidate primaryKey = keyResult.candidates.get(0);
            request.setBoKeyColumn(primaryKey.boColumn);
            request.setPartnerKeyColumn(primaryKey.partnerColumn);
            
            log.info("🔑 Clé principale sélectionnée: {} ↔ {}", primaryKey.boColumn, primaryKey.partnerColumn);
        } else {
            // Fallback: utiliser les premières colonnes disponibles
            if (!boData.isEmpty() && !partnerData.isEmpty()) {
                String firstBoColumn = boData.get(0).keySet().iterator().next();
                String firstPartnerColumn = partnerData.get(0).keySet().iterator().next();
                
                request.setBoKeyColumn(firstBoColumn);
                request.setPartnerKeyColumn(firstPartnerColumn);
                
                log.warn("⚠️ Aucune clé optimale trouvée, utilisation des premières colonnes: {} ↔ {}", 
                        firstBoColumn, firstPartnerColumn);
            }
        }
        
        // Définir les colonnes de comparaison automatiquement
        List<ColumnComparison> comparisonColumns = buildComparisonColumns(boData, partnerData, keyResult);
        request.setComparisonColumns(comparisonColumns);
        
        log.info("⚙️ Requête de réconciliation construite avec {} colonnes de comparaison", comparisonColumns.size());
        return request;
    }

    /**
     * Construit automatiquement les colonnes de comparaison
     */
    private List<ColumnComparison> buildComparisonColumns(
            List<Map<String, String>> boData, 
            List<Map<String, String>> partnerData, 
            KeyDiscoveryService.KeyDiscoveryResult keyResult) {
        
        List<ColumnComparison> comparisonColumns = new ArrayList<>();
        
        if (boData.isEmpty() || partnerData.isEmpty()) {
            return comparisonColumns;
        }
        
        Set<String> boColumns = boData.get(0).keySet();
        Set<String> partnerColumns = partnerData.get(0).keySet();
        
        // Colonnes communes à comparer (excluant les clés déjà sélectionnées)
        Set<String> usedBoColumns = keyResult.candidates.stream()
                .map(k -> k.boColumn)
                .collect(HashSet::new, HashSet::add, HashSet::addAll);
        
        Set<String> usedPartnerColumns = keyResult.candidates.stream()
                .map(k -> k.partnerColumn)
                .collect(HashSet::new, HashSet::add, HashSet::addAll);
        
        // Trouver les colonnes communes restantes
        for (String boColumn : boColumns) {
            if (usedBoColumns.contains(boColumn)) {
                continue;
            }
            
            // Chercher une correspondance dans les colonnes partenaire
            for (String partnerColumn : partnerColumns) {
                if (usedPartnerColumns.contains(partnerColumn)) {
                    continue;
                }
                
                // Vérifier si les colonnes sont similaires
                if (isSimilarColumn(boColumn, partnerColumn)) {
                    ColumnComparison comparison = new ColumnComparison();
                    comparison.setBoColumn(boColumn);
                    comparison.setPartnerColumn(partnerColumn);
                    comparisonColumns.add(comparison);
                    
                    usedBoColumns.add(boColumn);
                    usedPartnerColumns.add(partnerColumn);
                    break;
                }
            }
        }
        
        log.info("🔍 Colonnes de comparaison automatiques: {}", comparisonColumns);
        return comparisonColumns;
    }

    /**
     * Vérifie si deux colonnes sont similaires pour la comparaison
     */
    private boolean isSimilarColumn(String boColumn, String partnerColumn) {
        String normalizedBo = boColumn.toLowerCase().replaceAll("[^a-z0-9]", "");
        String normalizedPartner = partnerColumn.toLowerCase().replaceAll("[^a-z0-9]", "");
        
        // Correspondance exacte
        if (normalizedBo.equals(normalizedPartner)) {
            return true;
        }
        
        // Correspondance partielle
        if (normalizedBo.contains(normalizedPartner) || normalizedPartner.contains(normalizedBo)) {
            return true;
        }
        
        // Mots-clés communs
        Set<String> commonKeywords = Set.of("montant", "amount", "date", "heure", "time", "service", "agence", "agency");
        boolean boHasKeyword = commonKeywords.stream().anyMatch(normalizedBo::contains);
        boolean partnerHasKeyword = commonKeywords.stream().anyMatch(normalizedPartner::contains);
        
        return boHasKeyword && partnerHasKeyword;
    }

    /**
     * Arrête le service et libère les ressources
     */
    public void shutdown() {
        executorService.shutdown();
    }

    // Classe de résultat
    public static class MagicReconciliationResult {
        private final boolean success;
        private final ReconciliationResponse response;
        private final String message;
        private final KeyDiscoveryService.KeyDiscoveryResult keyDiscoveryResult;
        
        public MagicReconciliationResult(boolean success, ReconciliationResponse response, String message, KeyDiscoveryService.KeyDiscoveryResult keyDiscoveryResult) {
            this.success = success;
            this.response = response;
            this.message = message;
            this.keyDiscoveryResult = keyDiscoveryResult;
        }
        
        public boolean isSuccess() { return success; }
        public ReconciliationResponse getResponse() { return response; }
        public String getMessage() { return message; }
        public KeyDiscoveryService.KeyDiscoveryResult getKeyDiscoveryResult() { return keyDiscoveryResult; }
        
        @Override
        public String toString() {
                    return String.format("MagicReconciliationResult{success=%s, message='%s', confidence=%.2f}", 
                success, message, keyDiscoveryResult != null ? keyDiscoveryResult.confidence : 0.0);
        }
    }
}
