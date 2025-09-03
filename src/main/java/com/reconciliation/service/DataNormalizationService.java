package com.reconciliation.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import java.util.*;
import java.text.Normalizer;
import java.util.regex.Pattern;

@Service
public class DataNormalizationService {
    private static final Logger logger = LoggerFactory.getLogger(DataNormalizationService.class);

    // Mapping des noms de colonnes pour la normalisation
    private static final Map<String, String> COLUMN_MAPPING = new HashMap<>();
    static {
        COLUMN_MAPPING.put("PAYS", "country");
        COLUMN_MAPPING.put("Pays", "country");
        COLUMN_MAPPING.put("Country", "country");
        COLUMN_MAPPING.put("COUNTRY", "country");
        COLUMN_MAPPING.put("Countries", "country");
        
        // Ajout de nouveaux mappings pour les colonnes courantes
        COLUMN_MAPPING.put("External id", "External ID");
        COLUMN_MAPPING.put("Transaction ID", "Transaction ID");
        COLUMN_MAPPING.put("Opration", "Opération");
        COLUMN_MAPPING.put("Montant (XAF)", "Montant (XAF)");
        COLUMN_MAPPING.put("Commissions (XAF)", "Commissions (XAF)");
        COLUMN_MAPPING.put("N° de Compte", "N° de Compte");
        COLUMN_MAPPING.put("N° Pseudo", "N° Pseudo");
    }

    // Pattern pour nettoyer les caractères spéciaux
    private static final Pattern SPECIAL_CHARS_PATTERN = Pattern.compile("[^\\w\\s-]");
    private static final Pattern MULTIPLE_SPACES_PATTERN = Pattern.compile("\\s+");

    public Map<String, String> normalizeRecord(Map<String, String> record) {
        logger.info("Début de la normalisation d'un enregistrement");
        logger.info("Enregistrement original: {}", record);

        // Création d'une nouvelle map pour l'enregistrement normalisé
        Map<String, String> normalizedRecord = new HashMap<>();
        
        // Copie et normalisation de toutes les colonnes originales
        for (Map.Entry<String, String> entry : record.entrySet()) {
            String normalizedKey = normalizeColumnName(entry.getKey());
            String normalizedValue = normalizeValue(entry.getValue());
            
            normalizedRecord.put(normalizedKey, normalizedValue);
            logger.debug("Colonne normalisée: {} -> {} avec valeur: {}", entry.getKey(), normalizedKey, normalizedValue);
        }
        
        // Recherche et normalisation de la colonne pays
        String paysValue = null;
        String paysKey = null;
        
        // Vérification de chaque clé possible pour le pays
        for (String key : Arrays.asList("PAYS", "Pays", "Country", "COUNTRY", "Countries")) {
            paysValue = record.get(key);
            if (paysValue != null && !paysValue.trim().isEmpty()) {
                paysKey = key;
                logger.info("Valeur du pays trouvée dans la colonne {}: {}", key, paysValue);
                break;
            }
        }

        if (paysValue != null) {
            String normalizedValue = normalizeCountryValue(paysValue);
            logger.info("Valeur du pays normalisée: {}", normalizedValue);
            
            // Ajout de la valeur normalisée dans la colonne country
            normalizedRecord.put("country", normalizedValue);
            logger.info("Valeur du pays ajoutée à la colonne country: {}", normalizedValue);
            
            // Suppression de l'ancienne colonne si elle existe
            if (paysKey != null && !paysKey.equals("country")) {
                normalizedRecord.remove(paysKey);
                logger.info("Ancienne colonne {} supprimée", paysKey);
            }
        } else {
            logger.warn("Aucune valeur de pays trouvée dans l'enregistrement");
        }

        // Vérification finale de la présence de la colonne country
        if (!normalizedRecord.containsKey("country")) {
            logger.warn("La colonne country est manquante après normalisation");
            // Tentative de récupération depuis PAYS
            String backupPaysValue = record.get("PAYS");
            if (backupPaysValue != null && !backupPaysValue.trim().isEmpty()) {
                normalizedRecord.put("country", backupPaysValue);
                logger.info("Récupération de la valeur PAYS pour la colonne country: {}", backupPaysValue);
            }
        }

        // Vérification finale de la valeur du pays
        String finalCountryValue = normalizedRecord.get("country");
        if (finalCountryValue == null || finalCountryValue.trim().isEmpty()) {
            logger.warn("La valeur du pays est vide après normalisation");
            // Tentative de récupération depuis PAYS
            String backupPaysValue = record.get("PAYS");
            if (backupPaysValue != null && !backupPaysValue.trim().isEmpty()) {
                normalizedRecord.put("country", backupPaysValue);
                logger.info("Récupération finale de la valeur PAYS pour la colonne country: {}", backupPaysValue);
            }
        }

        logger.info("Fin de la normalisation de l'enregistrement");
        logger.info("Enregistrement normalisé: {}", normalizedRecord);
        
        return normalizedRecord;
    }

    /**
     * Normalise un nom de colonne
     */
    private String normalizeColumnName(String columnName) {
        if (columnName == null || columnName.trim().isEmpty()) {
            return columnName;
        }

        String normalized = columnName.trim();
        
        // Vérifier d'abord dans le mapping
        if (COLUMN_MAPPING.containsKey(normalized)) {
            return COLUMN_MAPPING.get(normalized);
        }
        
        // Normaliser les caractères spéciaux
        normalized = SPECIAL_CHARS_PATTERN.matcher(normalized).replaceAll(" ");
        
        // Normaliser les espaces multiples
        normalized = MULTIPLE_SPACES_PATTERN.matcher(normalized).replaceAll(" ");
        
        // Supprimer les espaces en début et fin
        normalized = normalized.trim();
        
        // Vérifier à nouveau dans le mapping après normalisation
        if (COLUMN_MAPPING.containsKey(normalized)) {
            return COLUMN_MAPPING.get(normalized);
        }
        
        return normalized;
    }

    /**
     * Normalise une valeur
     */
    private String normalizeValue(String value) {
        if (value == null) {
            return "";
        }

        String normalized = value.trim();
        
        // Supprimer les guillemets inutiles
        if ((normalized.startsWith("\"") && normalized.endsWith("\"")) ||
            (normalized.startsWith("'") && normalized.endsWith("'"))) {
            normalized = normalized.substring(1, normalized.length() - 1);
        }
        
        // Normaliser les caractères spéciaux
        normalized = Normalizer.normalize(normalized, Normalizer.Form.NFC);
        
        return normalized;
    }

    private String normalizeCountryValue(String value) {
        if (value == null || value.trim().isEmpty()) {
            logger.warn("Valeur du pays vide ou nulle");
            return "";
        }

        // Suppression des espaces en début et fin
        value = value.trim();
        logger.debug("Valeur du pays après trim: {}", value);
        
        // Conversion en majuscules
        value = value.toUpperCase();
        logger.debug("Valeur du pays en majuscules: {}", value);
        
        // Traitement spécial pour "GRX"
        if (value.equals("GRX")) {
            logger.info("Détection de la valeur GRX - traitement spécial");
            return "GRX";
        }

        // Pour les codes pays à deux lettres (comme CM), on les laisse tels quels
        if (value.length() == 2) {
            logger.info("Code pays à deux lettres détecté: {}", value);
            return value;
        }

        // Suppression des caractères spéciaux et des accents
        value = value.replaceAll("[^A-Z0-9]", "");
        logger.debug("Valeur du pays après suppression des caractères spéciaux: {}", value);
        
        return value;
    }

    public List<Map<String, String>> normalizeRecords(List<Map<String, String>> records) {
        logger.info("Début de la normalisation de {} enregistrements", records.size());
        
        List<Map<String, String>> normalizedRecords = new ArrayList<>();
        for (Map<String, String> record : records) {
            Map<String, String> normalizedRecord = normalizeRecord(record);
            normalizedRecords.add(normalizedRecord);
            logger.info("Enregistrement normalisé ajouté: {}", normalizedRecord);
        }
        
        logger.info("Fin de la normalisation des enregistrements");
        return normalizedRecords;
    }
} 