package com.reconciliation.service;

import com.reconciliation.entity.ImpactOPEntity;
import com.reconciliation.repository.ImpactOPRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class ImpactOPService {

    @Autowired
    private ImpactOPRepository impactOPRepository;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final DateTimeFormatter DATE_FORMATTER_WITH_MS = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.S");

    /**
     * Récupérer tous les impacts OP avec filtres
     */
    public List<ImpactOPEntity> getImpactOPs(String codeProprietaire, String typeOperation, 
                                            String groupeReseau, String statut, String dateDebut, 
                                            String dateFin, Double montantMin, Double montantMax) {
        
        ImpactOPEntity.Statut statutEnum = null;
        if (statut != null && !statut.isEmpty()) {
            try {
                statutEnum = ImpactOPEntity.Statut.valueOf(statut);
            } catch (IllegalArgumentException e) {
                // Statut invalide, on ignore le filtre
            }
        }

        LocalDateTime dateDebutParsed = null;
        LocalDateTime dateFinParsed = null;
        
        if (dateDebut != null && !dateDebut.isEmpty()) {
            try {
                // Gérer différents formats de date
                if (dateDebut.contains("T")) {
                    dateDebutParsed = LocalDateTime.parse(dateDebut.replace("T", " "));
                } else {
                    // Format "YYYY-MM-DD HH:mm:ss"
                    dateDebutParsed = LocalDateTime.parse(dateDebut, DATE_FORMATTER);
                }
                System.out.println("Date début parsée: " + dateDebutParsed); // Debug
            } catch (Exception e) {
                System.err.println("Erreur parsing date début: " + dateDebut + " - " + e.getMessage());
                // Date invalide, on ignore le filtre
            }
        }
        
        if (dateFin != null && !dateFin.isEmpty()) {
            try {
                // Gérer différents formats de date
                if (dateFin.contains("T")) {
                    dateFinParsed = LocalDateTime.parse(dateFin.replace("T", " "));
                } else {
                    // Format "YYYY-MM-DD HH:mm:ss"
                    dateFinParsed = LocalDateTime.parse(dateFin, DATE_FORMATTER);
                }
                System.out.println("Date fin parsée: " + dateFinParsed); // Debug
            } catch (Exception e) {
                System.err.println("Erreur parsing date fin: " + dateFin + " - " + e.getMessage());
                // Date invalide, on ignore le filtre
            }
        }

        System.out.println("Filtrage Impact OP - Paramètres:");
        System.out.println("  codeProprietaire: " + codeProprietaire);
        System.out.println("  dateDebut: " + dateDebut + " -> " + dateDebutParsed);
        System.out.println("  dateFin: " + dateFin + " -> " + dateFinParsed);

        List<ImpactOPEntity> results = impactOPRepository.findWithFilters(
            codeProprietaire, typeOperation, groupeReseau, statutEnum,
            dateDebutParsed, dateFinParsed, montantMin, montantMax);
        
        System.out.println("Résultats trouvés: " + results.size());
        
        return results;
    }

    /**
     * Récupérer un impact OP par ID
     */
    public ImpactOPEntity getImpactOP(Long id) {
        return impactOPRepository.findById(id).orElse(null);
    }

    /**
     * Créer un nouvel impact OP
     */
    public ImpactOPEntity createImpactOP(ImpactOPEntity impactOP) {
        return impactOPRepository.save(impactOP);
    }

    /**
     * Mettre à jour un impact OP
     */
    public ImpactOPEntity updateImpactOP(ImpactOPEntity impactOP) {
        if (impactOP.getId() == null) {
            throw new IllegalArgumentException("ID requis pour la mise à jour");
        }
        return impactOPRepository.save(impactOP);
    }

    /**
     * Supprimer un impact OP
     */
    public boolean deleteImpactOP(Long id) {
        if (impactOPRepository.existsById(id)) {
            impactOPRepository.deleteById(id);
            return true;
        }
        return false;
    }

    /**
     * Mettre à jour tous les commentaires des impacts OP existants
     */
    public Map<String, Object> updateAllComments() {
        Map<String, Object> result = new HashMap<>();
        int updatedCount = 0;
        int tsopCount = 0;
        int impactJ1Count = 0;
        
        try {
            // Récupérer tous les impacts OP
            List<ImpactOPEntity> allImpacts = impactOPRepository.findAll();
            
            for (ImpactOPEntity impact : allImpacts) {
                String typeOperation = impact.getTypeOperation();
                String newComment = "";
                
                // Définir le commentaire selon le type d'opération
                if (typeOperation != null && typeOperation.toUpperCase().contains("TSOP")) {
                    newComment = "TSOP";
                    tsopCount++;
                } else {
                    newComment = "IMPACT J+1";
                    impactJ1Count++;
                }
                
                // Mettre à jour le commentaire seulement s'il est différent
                if (!newComment.equals(impact.getCommentaire())) {
                    impact.setCommentaire(newComment);
                    impactOPRepository.save(impact);
                    updatedCount++;
                }
            }
            
            result.put("success", true);
            result.put("message", "✅ Mise à jour terminée : " + updatedCount + " commentaires mis à jour");
            result.put("totalImpacts", allImpacts.size());
            result.put("updatedCount", updatedCount);
            result.put("tsopCount", tsopCount);
            result.put("impactJ1Count", impactJ1Count);
            
        } catch (Exception e) {
            result.put("success", false);
            result.put("message", "❌ Erreur lors de la mise à jour : " + e.getMessage());
            result.put("error", e.getMessage());
        }
        
        return result;
    }

    /**
     * Vérifier si un type d'opération doit être exclu de l'import
     */
    private boolean shouldExcludeTypeOperation(String typeOperation) {
        if (typeOperation == null || typeOperation.trim().isEmpty()) {
            return false;
        }
        return typeOperation.trim().toUpperCase().startsWith("ANNULATION_");
    }

    /**
     * Valider un fichier d'impacts OP
     */
    public Map<String, Object> validateFile(MultipartFile file) {
        Map<String, Object> result = new HashMap<>();
        List<String> errors = new ArrayList<>();
        int validLines = 0;
        int errorLines = 0;
        int duplicates = 0;
        int newRecords = 0;
        int excludedLines = 0; // Compteur pour les lignes exclues

        try {
            List<Map<String, String>> data = parseFile(file);
            
            // Debug: afficher les en-têtes trouvés
            if (!data.isEmpty()) {
                System.out.println("En-têtes trouvés: " + data.get(0).keySet());
                System.out.println("Première ligne: " + data.get(0));
            }
            
            for (int i = 0; i < data.size(); i++) {
                Map<String, String> row = data.get(i);
                int lineNumber = i + 2; // +2 car l'index commence à 0 et on a un header
                
                try {
                    // Vérifier si le type d'opération doit être exclu
                    String typeOperationField = findFieldIgnoreAccents(row, "Type Opération");
                    String typeOperation = row.get(typeOperationField);
                    
                    if (shouldExcludeTypeOperation(typeOperation)) {
                        System.out.println("Ligne " + lineNumber + " EXCLUE - Type d'opération: " + typeOperation);
                        excludedLines++;
                        continue; // Passer à la ligne suivante
                    }
                    
                    // Valider les données
                    validateRow(row, lineNumber, errors);
                    
                    if (errors.stream().noneMatch(error -> error.contains("Ligne " + lineNumber))) {
                        validLines++;
                        
                        // Vérifier les doublons
                        if (isDuplicate(row)) {
                            duplicates++;
                        } else {
                            newRecords++;
                        }
                    } else {
                        errorLines++;
                    }
                } catch (Exception e) {
                    errors.add("Ligne " + lineNumber + ": Erreur de validation - " + e.getMessage());
                    errorLines++;
                }
            }
        } catch (Exception e) {
            errors.add("Erreur lors de la lecture du fichier: " + e.getMessage());
        }

        result.put("validLines", validLines);
        result.put("errorLines", errorLines);
        result.put("duplicates", duplicates);
        result.put("newRecords", newRecords);
        result.put("excludedLines", excludedLines); // Ajouter le compteur des lignes exclues
        result.put("hasErrors", !errors.isEmpty());
        result.put("errors", errors);

        return result;
    }

    /**
     * Uploader un fichier d'impacts OP
     */
    public Map<String, Object> uploadFile(MultipartFile file) {
        Map<String, Object> result = new HashMap<>();
        List<String> errors = new ArrayList<>();
        int count = 0;
        int duplicates = 0;
        int totalReceived = 0;
        int excludedLines = 0; // Compteur pour les lignes exclues

        try {
            List<Map<String, String>> data = parseFile(file);
            totalReceived = data.size();
            
            for (Map<String, String> row : data) {
                try {
                    // Vérifier si le type d'opération doit être exclu
                    String typeOperationField = findFieldIgnoreAccents(row, "Type Opération");
                    String typeOperation = row.get(typeOperationField);
                    
                    if (shouldExcludeTypeOperation(typeOperation)) {
                        System.out.println("Ligne EXCLUE lors de l'import - Type d'opération: " + typeOperation);
                        excludedLines++;
                        continue; // Passer à la ligne suivante
                    }
                    
                    ImpactOPEntity impact = createImpactFromRow(row);
                    
                    // Vérifier les doublons
                    if (!isDuplicate(row)) {
                        impactOPRepository.save(impact);
                        count++;
                    } else {
                        duplicates++;
                    }
                } catch (Exception e) {
                    errors.add("Erreur lors de l'import: " + e.getMessage());
                }
            }
        } catch (Exception e) {
            errors.add("Erreur lors de la lecture du fichier: " + e.getMessage());
        }

        String message = errors.isEmpty() ? 
            "✅ " + count + " enregistrements importés avec succès" + 
            (excludedLines > 0 ? " (" + excludedLines + " lignes exclues)" : "") : 
            "❌ Erreurs lors de l'import: " + String.join(", ", errors);

        result.put("success", errors.isEmpty());
        result.put("message", message);
        result.put("count", count);
        result.put("duplicates", duplicates);
        result.put("totalReceived", totalReceived);
        result.put("excludedLines", excludedLines); // Ajouter le compteur des lignes exclues

        return result;
    }

    /**
     * Mettre à jour le statut d'un impact OP
     */
    public ImpactOPEntity updateStatut(Long id, String statut, String commentaire) {
        ImpactOPEntity impact = impactOPRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Impact OP non trouvé"));

        try {
            impact.setStatut(ImpactOPEntity.Statut.valueOf(statut));
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Statut invalide: " + statut);
        }

        if (commentaire != null && !commentaire.trim().isEmpty()) {
            impact.setCommentaire(commentaire);
        }

        return impactOPRepository.save(impact);
    }

    /**
     * Récupérer les options de filtres
     */
    public Map<String, List<String>> getFilterOptions() {
        Map<String, List<String>> options = new HashMap<>();
        options.put("codeProprietaires", impactOPRepository.findDistinctCodeProprietaires());
        options.put("typeOperations", impactOPRepository.findDistinctTypeOperations());
        options.put("groupeReseaux", impactOPRepository.findDistinctGroupeReseaux());
        return options;
    }

    /**
     * Exporter les impacts OP en Excel
     */
    public byte[] exportToExcel(String codeProprietaire, String typeOperation, 
                               String groupeReseau, String statut, String dateDebut, 
                               String dateFin, Double montantMin, Double montantMax) throws IOException {
        
        List<ImpactOPEntity> impacts = getImpactOPs(codeProprietaire, typeOperation, 
                                                   groupeReseau, statut, dateDebut, 
                                                   dateFin, montantMin, montantMax);

        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Impacts OP");

            // Créer le style pour l'en-tête
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            // Créer le style pour les montants négatifs
            CellStyle negativeStyle = workbook.createCellStyle();
            Font negativeFont = workbook.createFont();
            negativeFont.setColor(IndexedColors.RED.getIndex());
            negativeStyle.setFont(negativeFont);

            // Créer le style pour les montants positifs
            CellStyle positiveStyle = workbook.createCellStyle();
            Font positiveFont = workbook.createFont();
            positiveFont.setColor(IndexedColors.GREEN.getIndex());
            positiveStyle.setFont(positiveFont);

            // En-têtes
            Row headerRow = sheet.createRow(0);
            String[] headers = {"Type Opération", "Montant", "Solde avant", "Solde après", 
                              "Code propriétaire", "Date opération", "Numéro Trans GU", 
                              "Groupe de réseau", "Statut", "Commentaire"};
            
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Données
            for (int i = 0; i < impacts.size(); i++) {
                ImpactOPEntity impact = impacts.get(i);
                Row row = sheet.createRow(i + 1);

                row.createCell(0).setCellValue(impact.getTypeOperation());
                
                Cell montantCell = row.createCell(1);
                montantCell.setCellValue(impact.getMontant().doubleValue());
                if (impact.getMontant().compareTo(BigDecimal.ZERO) < 0) {
                    montantCell.setCellStyle(negativeStyle);
                } else {
                    montantCell.setCellStyle(positiveStyle);
                }

                row.createCell(2).setCellValue(impact.getSoldeAvant().doubleValue());
                row.createCell(3).setCellValue(impact.getSoldeApres().doubleValue());
                row.createCell(4).setCellValue(impact.getCodeProprietaire());
                row.createCell(5).setCellValue(impact.getDateOperation().format(DATE_FORMATTER));
                row.createCell(6).setCellValue(impact.getNumeroTransGU());
                row.createCell(7).setCellValue(impact.getGroupeReseau());
                row.createCell(8).setCellValue(impact.getStatut().toString());
                row.createCell(9).setCellValue(impact.getCommentaire() != null ? impact.getCommentaire() : "");
            }

            // Auto-dimensionner les colonnes
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            workbook.write(outputStream);
            return outputStream.toByteArray();
        }
    }

    /**
     * Récupérer les statistiques
     */
    public Map<String, Object> getStats() {
        Map<String, Object> stats = new HashMap<>();
        
        long total = impactOPRepository.count();
        long enAttente = impactOPRepository.countByStatut(ImpactOPEntity.Statut.EN_ATTENTE);
        long traite = impactOPRepository.countByStatut(ImpactOPEntity.Statut.TRAITE);
        long erreur = impactOPRepository.countByStatut(ImpactOPEntity.Statut.ERREUR);
        
        Double montantTotal = impactOPRepository.sumTotalMontant();
        if (montantTotal == null) montantTotal = 0.0;

        stats.put("total", total);
        stats.put("enAttente", enAttente);
        stats.put("traite", traite);
        stats.put("erreur", erreur);
        stats.put("montantTotal", montantTotal);

        return stats;
    }

    /**
     * Récupérer la somme des impacts OP pour une date et un code propriétaire donnés
     */
    public Double getSumForDate(String date, String codeProprietaire) {
        try {
            // Parser la date pour obtenir le début et la fin de la journée
            LocalDateTime dateDebut = LocalDateTime.parse(date + " 00:00:00", DATE_FORMATTER);
            LocalDateTime dateFin = LocalDateTime.parse(date + " 23:59:59", DATE_FORMATTER);
            
            // Récupérer tous les impacts OP pour cette date et ce code propriétaire
            List<ImpactOPEntity> impacts = impactOPRepository.findByCodeProprietaireAndDateOperationBetween(
                codeProprietaire, dateDebut, dateFin);
            
            // Calculer la somme des montants
            return impacts.stream()
                .mapToDouble(impact -> impact.getMontant().doubleValue())
                .sum();
        } catch (Exception e) {
            System.err.println("Erreur lors du calcul de la somme Impact OP pour la date " + date + 
                             " et le code propriétaire " + codeProprietaire + ": " + e.getMessage());
            return 0.0;
        }
    }

    /**
     * Parser un fichier (CSV ou Excel)
     */
    private List<Map<String, String>> parseFile(MultipartFile file) throws IOException {
        List<Map<String, String>> data = new ArrayList<>();
        
        if (file.getOriginalFilename().toLowerCase().endsWith(".csv")) {
            data = parseCsvFile(file);
        } else {
            data = parseExcelFile(file);
        }
        
        return data;
    }

    /**
     * Parser un fichier CSV
     */
    private List<Map<String, String>> parseCsvFile(MultipartFile file) throws IOException {
        List<Map<String, String>> data = new ArrayList<>();
        String content = new String(file.getBytes(), "UTF-8");
        String[] lines = content.split("\n");
        
        if (lines.length < 2) {
            throw new RuntimeException("Fichier vide ou format invalide");
        }

        // En-têtes - nettoyer les espaces et corriger les accents
        String[] headers = lines[0].split(",");
        for (int i = 0; i < headers.length; i++) {
            headers[i] = headers[i].trim();
            // Corriger les accents courants
            headers[i] = headers[i].replace("aprés", "après")
                                  .replace("proprietaire", "propriétaire")
                                  .replace("groupe de réseau", "Groupe de réseau");
        }
        
        for (int i = 1; i < lines.length; i++) {
            String[] values = lines[i].split(",");
            if (values.length == headers.length) {
                Map<String, String> row = new HashMap<>();
                for (int j = 0; j < headers.length; j++) {
                    row.put(headers[j], values[j].trim());
                }
                data.add(row);
            }
        }
        
        return data;
    }

    /**
     * Parser un fichier Excel
     */
    private List<Map<String, String>> parseExcelFile(MultipartFile file) throws IOException {
        List<Map<String, String>> data = new ArrayList<>();
        
        try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            
            Row headerRow = sheet.getRow(0);
            if (headerRow == null) {
                throw new RuntimeException("Fichier vide ou format invalide");
            }

            // En-têtes
            List<String> headers = new ArrayList<>();
            for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                Cell cell = headerRow.getCell(i);
                headers.add(cell != null ? cell.toString().trim() : "Colonne" + i);
            }

            // Données
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row != null) {
                    Map<String, String> rowData = new HashMap<>();
                    for (int j = 0; j < headers.size(); j++) {
                        Cell cell = row.getCell(j);
                        String value = "";
                        if (cell != null) {
                            switch (cell.getCellType()) {
                                case STRING:
                                    value = cell.getStringCellValue();
                                    break;
                                case NUMERIC:
                                    if (DateUtil.isCellDateFormatted(cell)) {
                                        value = cell.getLocalDateTimeCellValue().format(DATE_FORMATTER);
                                    } else {
                                        value = String.valueOf(cell.getNumericCellValue());
                                    }
                                    break;
                                default:
                                    value = cell.toString();
                            }
                        }
                        rowData.put(headers.get(j), value.trim());
                    }
                    data.add(rowData);
                }
            }
        }
        
        return data;
    }

    /**
     * Valider une ligne de données
     */
    private void validateRow(Map<String, String> row, int lineNumber, List<String> errors) {
        // Vérifier les champs obligatoires avec gestion des accents
        String[] requiredFields = {"Type Opération", "Montant", "Solde avant", "Solde après", 
                                 "Code propriétaire", "Date opération", "Numéro Trans GU", "Groupe de réseau"};
        
        for (String field : requiredFields) {
            String actualField = findFieldIgnoreAccents(row, field);
            if (actualField == null || row.get(actualField) == null || row.get(actualField).trim().isEmpty()) {
                errors.add("❌ Ligne " + lineNumber + ": Champ obligatoire manquant → '" + field + "'");
            }
        }

        // Valider le montant
        try {
            String montantField = findFieldIgnoreAccents(row, "Montant");
            if (montantField != null && row.get(montantField) != null) {
                BigDecimal montant = new BigDecimal(row.get(montantField).replace(",", ""));
            }
        } catch (Exception e) {
            String montantValue = row.get("Montant") != null ? row.get("Montant") : "valeur manquante";
            errors.add("❌ Ligne " + lineNumber + ": Montant invalide → '" + montantValue + "' (format attendu: nombre décimal)");
        }

        // Valider les soldes
        try {
            String soldeAvantField = findFieldIgnoreAccents(row, "Solde avant");
            String soldeApresField = findFieldIgnoreAccents(row, "Solde après");
            if (soldeAvantField != null && row.get(soldeAvantField) != null) {
                BigDecimal soldeAvant = new BigDecimal(row.get(soldeAvantField).replace(",", ""));
            }
            if (soldeApresField != null && row.get(soldeApresField) != null) {
                BigDecimal soldeApres = new BigDecimal(row.get(soldeApresField).replace(",", ""));
            }
        } catch (Exception e) {
            errors.add("❌ Ligne " + lineNumber + ": Solde invalide → Format attendu: nombre décimal");
        }

        // Valider la date - accepter les deux formats
        try {
            String dateField = findFieldIgnoreAccents(row, "Date opération");
            String dateStr = row.get(dateField);
            System.out.println("📅 Validation date ligne " + lineNumber + ": " + dateStr);
            if (dateStr.contains("T")) {
                LocalDateTime.parse(dateStr); // Format ISO
            } else if (dateStr.contains(".")) {
                LocalDateTime.parse(dateStr, DATE_FORMATTER_WITH_MS); // Format avec millisecondes
            } else {
                LocalDateTime.parse(dateStr, DATE_FORMATTER); // Format avec espace
            }
        } catch (Exception e) {
            String dateValue = row.get("Date opération") != null ? row.get("Date opération") : "valeur manquante";
            System.out.println("❌ Erreur date ligne " + lineNumber + ": " + e.getMessage());
            errors.add("❌ Ligne " + lineNumber + ": Date invalide → '" + dateValue + "' (formats acceptés: yyyy-MM-dd HH:mm:ss, yyyy-MM-ddTHH:mm:ss, yyyy-MM-dd HH:mm:ss.S)");
        }
    }

    /**
     * Trouver un champ en ignorant les accents
     */
    private String findFieldIgnoreAccents(Map<String, String> row, String targetField) {
        String normalizedTarget = normalizeString(targetField);
        for (String field : row.keySet()) {
            if (normalizeString(field).equals(normalizedTarget)) {
                return field;
            }
        }
        return null;
    }

    /**
     * Normaliser une chaîne pour ignorer les accents
     */
    private String normalizeString(String str) {
        return java.text.Normalizer.normalize(str, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .toLowerCase();
    }

    /**
     * Créer un ImpactOPEntity à partir d'une ligne de données
     */
    private ImpactOPEntity createImpactFromRow(Map<String, String> row) {
        String montantField = findFieldIgnoreAccents(row, "Montant");
        String soldeAvantField = findFieldIgnoreAccents(row, "Solde avant");
        String soldeApresField = findFieldIgnoreAccents(row, "Solde après");
        String dateField = findFieldIgnoreAccents(row, "Date opération");
        String typeOperationField = findFieldIgnoreAccents(row, "Type Opération");
        String codeProprietaireField = findFieldIgnoreAccents(row, "Code propriétaire");
        String numeroTransGUField = findFieldIgnoreAccents(row, "Numéro Trans GU");
        String groupeReseauField = findFieldIgnoreAccents(row, "Groupe de réseau");
        
        BigDecimal montant = new BigDecimal(row.get(montantField).replace(",", ""));
        BigDecimal soldeAvant = new BigDecimal(row.get(soldeAvantField).replace(",", ""));
        BigDecimal soldeApres = new BigDecimal(row.get(soldeApresField).replace(",", ""));
        
        // Parser la date selon le format
        String dateStr = row.get(dateField);
        LocalDateTime dateOperation;
        if (dateStr.contains("T")) {
            dateOperation = LocalDateTime.parse(dateStr); // Format ISO
        } else if (dateStr.contains(".")) {
            dateOperation = LocalDateTime.parse(dateStr, DATE_FORMATTER_WITH_MS); // Format avec millisecondes
        } else {
            dateOperation = LocalDateTime.parse(dateStr, DATE_FORMATTER); // Format avec espace
        }

        // Créer l'entité avec le commentaire par défaut selon le type d'opération
        ImpactOPEntity impact = new ImpactOPEntity(
            row.get(typeOperationField),
            montant,
            soldeAvant,
            soldeApres,
            row.get(codeProprietaireField),
            dateOperation,
            row.get(numeroTransGUField),
            row.get(groupeReseauField)
        );
        
        // Définir le commentaire selon le type d'opération
        String typeOperation = row.get(typeOperationField);
        if (typeOperation != null && typeOperation.toUpperCase().contains("TSOP")) {
            impact.setCommentaire("TSOP");
        } else {
            impact.setCommentaire("IMPACT J+1");
        }
        
        return impact;
    }

    /**
     * Vérifier si un impact est un doublon
     */
    private boolean isDuplicate(Map<String, String> row) {
        try {
            String dateField = findFieldIgnoreAccents(row, "Date opération");
            String codeProprietaireField = findFieldIgnoreAccents(row, "Code propriétaire");
            String numeroTransGUField = findFieldIgnoreAccents(row, "Numéro Trans GU");
            String montantField = findFieldIgnoreAccents(row, "Montant");
            String soldeAvantField = findFieldIgnoreAccents(row, "Solde avant");
            String soldeApresField = findFieldIgnoreAccents(row, "Solde après");
            String typeOperationField = findFieldIgnoreAccents(row, "Type Opération");
            String groupeReseauField = findFieldIgnoreAccents(row, "Groupe de réseau");
            String commentaireField = findFieldIgnoreAccents(row, "Commentaire");
            
            String codeProprietaire = row.get(codeProprietaireField);
            String numeroTransGU = row.get(numeroTransGUField);
            String dateStr = row.get(dateField);
            String montantStr = row.get(montantField);
            String soldeAvantStr = row.get(soldeAvantField);
            String soldeApresStr = row.get(soldeApresField);
            String typeOperation = row.get(typeOperationField);
            String groupeReseau = row.get(groupeReseauField);
            String commentaire = commentaireField != null ? row.get(commentaireField) : "";
            
            System.out.println("Vérification doublon - Code: " + codeProprietaire + ", Numéro: " + numeroTransGU + 
                             ", Date: " + dateStr + ", Montant: " + montantStr + ", Type: " + typeOperation);
            
            LocalDateTime dateOperation;
            if (dateStr.contains("T")) {
                dateOperation = LocalDateTime.parse(dateStr); // Format ISO
            } else if (dateStr.contains(".")) {
                dateOperation = LocalDateTime.parse(dateStr, DATE_FORMATTER_WITH_MS); // Format avec millisecondes
            } else {
                dateOperation = LocalDateTime.parse(dateStr, DATE_FORMATTER); // Format avec espace
            }
            
            // 1. Vérifier la limite de 2 enregistrements par numéro de transaction GU
            List<ImpactOPEntity> existingByNumeroTransGU = impactOPRepository.findByNumeroTransGU(numeroTransGU);
            if (existingByNumeroTransGU.size() >= 2) {
                System.out.println("❌ DOUBLON DÉTECTÉ - Limite de 2 enregistrements atteinte pour le numéro de transaction GU: " + numeroTransGU);
                System.out.println("   → Déjà " + existingByNumeroTransGU.size() + " enregistrements existants avec ce numéro");
                return true;
            }
            
            // 2. Vérifier si un enregistrement avec TOUTES les mêmes valeurs existe (vrai doublon)
            List<ImpactOPEntity> existing = impactOPRepository.findByCodeProprietaire(codeProprietaire);
            existing = existing.stream()
                .filter(e -> e.getNumeroTransGU().equals(numeroTransGU) && 
                           e.getDateOperation().equals(dateOperation))
                .toList();
            
            if (!existing.isEmpty()) {
                BigDecimal newMontant = new BigDecimal(montantStr.replace(",", ""));
                BigDecimal newSoldeAvant = new BigDecimal(soldeAvantStr.replace(",", ""));
                BigDecimal newSoldeApres = new BigDecimal(soldeApresStr.replace(",", ""));
                
                for (ImpactOPEntity existingEntity : existing) {
                    boolean isExactDuplicate = existingEntity.getMontant().equals(newMontant) &&
                                             existingEntity.getSoldeAvant().equals(newSoldeAvant) &&
                                             existingEntity.getSoldeApres().equals(newSoldeApres) &&
                                             existingEntity.getTypeOperation().equals(typeOperation) &&
                                             existingEntity.getGroupeReseau().equals(groupeReseau) &&
                                             (existingEntity.getCommentaire() == null ? "" : existingEntity.getCommentaire()).equals(commentaire);
                    
                    if (isExactDuplicate) {
                        System.out.println("❌ DOUBLON EXACT DÉTECTÉ - Toutes les valeurs sont identiques");
                        System.out.println("   → Numéro Trans GU: " + numeroTransGU);
                        System.out.println("   → Code propriétaire: " + codeProprietaire);
                        System.out.println("   → Date: " + dateStr);
                        System.out.println("   → Montant: " + montantStr);
                        System.out.println("   → Type opération: " + typeOperation);
                        System.out.println("   → Groupe réseau: " + groupeReseau);
                        System.out.println("   → Commentaire: " + commentaire);
                        return true;
                    }
                }
            }
            
            System.out.println("✅ ENREGISTREMENT AUTORISÉ - Pas de doublon détecté");
            System.out.println("   → Numéro Trans GU: " + numeroTransGU + " (enregistrements existants: " + existingByNumeroTransGU.size() + ")");
            return false;
        } catch (Exception e) {
            System.out.println("❌ ERREUR lors de la vérification doublon: " + e.getMessage());
            return false;
        }
    }
} 