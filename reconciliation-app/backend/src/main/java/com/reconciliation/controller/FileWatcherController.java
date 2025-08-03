package com.reconciliation.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;

@RestController
@RequestMapping("/api/file-watcher")
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:3000"}, allowCredentials = "true")
public class FileWatcherController {

    private static final String WATCH_FOLDER = "../watch-folder";
    private static final String PROCESSED_FOLDER = "../watch-folder/processed";

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        try {
            System.out.println("🔍 FileWatcherController: getStatus() appelé");
            Path watchPath = Paths.get(WATCH_FOLDER);
            System.out.println("📁 Chemin du dossier watch: " + watchPath.toAbsolutePath());
            
            boolean isWatching = Files.exists(watchPath);
            System.out.println("✅ Dossier existe: " + isWatching);
            
            int queueLength = 0;
            if (isWatching) {
                File[] files = watchPath.toFile().listFiles((dir, name) -> 
                    name.toLowerCase().endsWith(".csv") || 
                    name.toLowerCase().endsWith(".xlsx") || 
                    name.toLowerCase().endsWith(".xls")
                );
                queueLength = files != null ? files.length : 0;
                System.out.println("📄 Nombre de fichiers trouvés: " + queueLength);
            }
            
            Map<String, Object> response = Map.of(
                "watchPath", WATCH_FOLDER,
                "isProcessing", false,
                "queueLength", queueLength
            );
            
            System.out.println("✅ Réponse status: " + response);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("❌ Erreur dans getStatus(): " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of(
                "error", e.getMessage()
            ));
        }
    }

    @GetMapping("/available-files")
    public ResponseEntity<List<Map<String, Object>>> getAvailableFiles() {
        try {
            System.out.println("🔍 FileWatcherController: getAvailableFiles() appelé");
            List<Map<String, Object>> files = new ArrayList<>();
            Path watchPath = Paths.get(WATCH_FOLDER);
            System.out.println("📁 Chemin du dossier watch: " + watchPath.toAbsolutePath());
            
            if (Files.exists(watchPath)) {
                File[] fileList = watchPath.toFile().listFiles((dir, name) -> 
                    name.toLowerCase().endsWith(".csv") || 
                    name.toLowerCase().endsWith(".xlsx") || 
                    name.toLowerCase().endsWith(".xls")
                );
                
                System.out.println("📄 Fichiers trouvés: " + (fileList != null ? fileList.length : 0));
                
                if (fileList != null) {
                    for (File file : fileList) {
                        System.out.println("📄 Traitement du fichier: " + file.getName());
                        Map<String, Object> fileInfo = Map.of(
                            "fileName", file.getName(),
                            "filePath", file.getAbsolutePath(),
                            "columns", getFileColumns(file),
                            "sampleData", getSampleData(file),
                            "fileType", getFileType(file.getName()),
                            "recordCount", getRecordCount(file)
                        );
                        files.add(fileInfo);
                    }
                }
            } else {
                System.out.println("❌ Le dossier watch-folder n'existe pas: " + watchPath.toAbsolutePath());
            }
            
            System.out.println("✅ Nombre de fichiers retournés: " + files.size());
            return ResponseEntity.ok(files);
        } catch (Exception e) {
            System.err.println("❌ Erreur dans getAvailableFiles(): " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(List.of());
        }
    }

    @PostMapping("/analyze-file")
    public ResponseEntity<Map<String, Object>> analyzeFile(@RequestBody Map<String, String> request) {
        try {
            String filePath = request.get("filePath");
            File file = new File(filePath);
            
            if (!file.exists()) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "Fichier non trouvé"
                ));
            }
            
            Map<String, Object> analysis = Map.of(
                "fileName", file.getName(),
                "filePath", file.getAbsolutePath(),
                "columns", getFileColumns(file),
                "sampleData", getSampleData(file),
                "fileType", getFileType(file.getName()),
                "recordCount", getRecordCount(file)
            );
            
            return ResponseEntity.ok(analysis);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", e.getMessage()
            ));
        }
    }

    @PostMapping("/start")
    public ResponseEntity<Map<String, Object>> startWatching() {
        try {
            Path watchPath = Paths.get(WATCH_FOLDER);
            if (!Files.exists(watchPath)) {
                Files.createDirectories(watchPath);
            }
            
            Path processedPath = Paths.get(PROCESSED_FOLDER);
            if (!Files.exists(processedPath)) {
                Files.createDirectories(processedPath);
            }
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Surveillance démarrée"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    @PostMapping("/stop")
    public ResponseEntity<Map<String, Object>> stopWatching() {
        try {
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Surveillance arrêtée"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "error", e.getMessage()
            ));
        }
    }

    // Méthodes utilitaires améliorées
    private List<String> getFileColumns(File file) {
        try {
            if (file.getName().toLowerCase().endsWith(".csv")) {
                return readCsvColumns(file);
            } else if (file.getName().toLowerCase().endsWith(".xls") || file.getName().toLowerCase().endsWith(".xlsx")) {
                return readExcelColumns(file);
            } else {
                // Pour les autres types de fichiers, retourner des colonnes par défaut
                return List.of("date", "montant", "description", "reference");
            }
        } catch (Exception e) {
            System.err.println("❌ Erreur lors de la lecture des colonnes: " + e.getMessage());
            return List.of("date", "montant", "description", "reference");
        }
    }

    private List<Map<String, Object>> getSampleData(File file) {
        try {
            if (file.getName().toLowerCase().endsWith(".csv")) {
                return readCsvSampleData(file);
            } else if (file.getName().toLowerCase().endsWith(".xls") || file.getName().toLowerCase().endsWith(".xlsx")) {
                return readExcelSampleData(file);
            } else {
                // Pour les autres types de fichiers, retourner des données d'exemple
                return List.of(
                    Map.of("date", "2025-08-01", "montant", "1000.00", "description", "Transaction 1", "reference", "REF001"),
                    Map.of("date", "2025-08-02", "montant", "2000.00", "description", "Transaction 2", "reference", "REF002")
                );
            }
        } catch (Exception e) {
            System.err.println("❌ Erreur lors de la lecture des données: " + e.getMessage());
            return List.of(
                Map.of("date", "2025-08-01", "montant", "1000.00", "description", "Transaction 1", "reference", "REF001"),
                Map.of("date", "2025-08-02", "montant", "2000.00", "description", "Transaction 2", "reference", "REF002")
            );
        }
    }

    private List<String> readCsvColumns(File file) throws IOException {
        List<String> columns = new ArrayList<>();
        
        // Essayer différents encodages
        String[] encodings = {"UTF-8", "ISO-8859-1", "Windows-1252", "UTF-8-BOM"};
        
        for (String encoding : encodings) {
            try {
                BufferedReader reader;
                if ("UTF-8-BOM".equals(encoding)) {
                    // Gérer le BOM UTF-8
                    reader = new BufferedReader(new InputStreamReader(new FileInputStream(file), "UTF-8"));
                    reader.mark(3);
                    int bom = reader.read();
                    if (bom != 0xEF) {
                        reader.reset();
                    }
                } else {
                    reader = new BufferedReader(new InputStreamReader(new FileInputStream(file), encoding));
                }
                
                                    String firstLine = reader.readLine();
                    if (firstLine != null && !firstLine.trim().isEmpty()) {
                        System.out.println("🔍 Ligne brute lue avec " + encoding + ": " + firstLine);
                        // Détecter le délimiteur (virgule ou point-virgule)
                        String delimiter = firstLine.contains(";") ? ";" : ",";
                        String[] columnArray = firstLine.split(delimiter);
                        for (String column : columnArray) {
                            // Corriger les caractères spéciaux corrompus
                            String correctedColumn = fixCorruptedCharacters(column.trim());
                            columns.add(correctedColumn);
                        }
                        reader.close();
                        System.out.println("📊 Colonnes détectées avec encodage " + encoding + ": " + columns);
                        return columns;
                    }
                reader.close();
            } catch (Exception e) {
                System.err.println("❌ Erreur avec l'encodage " + encoding + ": " + e.getMessage());
                columns.clear();
            }
        }
        
        // Fallback avec UTF-8
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(new FileInputStream(file), "UTF-8"))) {
            String firstLine = reader.readLine();
            if (firstLine != null && !firstLine.trim().isEmpty()) {
                String delimiter = firstLine.contains(";") ? ";" : ",";
                String[] columnArray = firstLine.split(delimiter);
                for (String column : columnArray) {
                    columns.add(column.trim());
                }
            }
        }
        
        System.out.println("📊 Colonnes détectées (fallback): " + columns);
        return columns;
    }

    // Méthode pour corriger les caractères spéciaux corrompus
    private String fixCorruptedCharacters(String text) {
        if (text == null) return "";
        
        // Corrections spécifiques pour les caractères corrompus
        String corrected = text
            .replace("tlphone", "téléphone")
            .replace("Numro", "Numéro")
            .replace("Expditeur", "Expéditeur")
            .replace("Bnficiaire", "Bénéficiaire")
            .replace("Pays provenance", "Pays de provenance");
        
        return corrected;
    }

    private List<Map<String, Object>> readCsvSampleData(File file) throws IOException {
        List<Map<String, Object>> sampleData = new ArrayList<>();
        List<String> columns = readCsvColumns(file);
        
        if (columns.isEmpty()) {
            return sampleData;
        }

        // Utiliser le même encodage que pour les colonnes
        String[] encodings = {"UTF-8", "ISO-8859-1", "Windows-1252", "UTF-8-BOM"};
        
        for (String encoding : encodings) {
            try {
                BufferedReader reader;
                if ("UTF-8-BOM".equals(encoding)) {
                    reader = new BufferedReader(new InputStreamReader(new FileInputStream(file), "UTF-8"));
                    reader.mark(3);
                    int bom = reader.read();
                    if (bom != 0xEF) {
                        reader.reset();
                    }
                } else {
                    reader = new BufferedReader(new InputStreamReader(new FileInputStream(file), encoding));
                }
                
                // Lire l'en-tête
                String headerLine = reader.readLine();
                if (headerLine == null) {
                    reader.close();
                    continue;
                }
                
                // Détecter le délimiteur
                String delimiter = headerLine.contains(";") ? ";" : ",";
                
                // Lire les premières lignes (max 5) pour les données d'exemple
                int lineCount = 0;
                String line;
                while ((line = reader.readLine()) != null && lineCount < 5) {
                    if (!line.trim().isEmpty()) {
                        String[] values = line.split(delimiter);
                        Map<String, Object> row = new java.util.HashMap<>();
                        
                        for (int i = 0; i < columns.size() && i < values.length; i++) {
                            row.put(columns.get(i), values[i].trim());
                        }
                        
                        sampleData.add(row);
                        lineCount++;
                    }
                }
                reader.close();
                System.out.println("📊 Données d'exemple avec encodage " + encoding + ": " + sampleData.size() + " lignes");
                return sampleData;
            } catch (Exception e) {
                System.err.println("❌ Erreur avec l'encodage " + encoding + " pour les données: " + e.getMessage());
                sampleData.clear();
            }
        }
        
        // Fallback avec UTF-8
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(new FileInputStream(file), "UTF-8"))) {
            String headerLine = reader.readLine();
            if (headerLine != null) {
                String delimiter = headerLine.contains(";") ? ";" : ",";
                
                int lineCount = 0;
                String line;
                while ((line = reader.readLine()) != null && lineCount < 5) {
                    if (!line.trim().isEmpty()) {
                        String[] values = line.split(delimiter);
                        Map<String, Object> row = new java.util.HashMap<>();
                        
                        for (int i = 0; i < columns.size() && i < values.length; i++) {
                            row.put(columns.get(i), values[i].trim());
                        }
                        
                        sampleData.add(row);
                        lineCount++;
                    }
                }
            }
        }
        
        System.out.println("📊 Données d'exemple (fallback): " + sampleData.size() + " lignes");
        return sampleData;
    }

    private String getFileType(String fileName) {
        String lowerName = fileName.toLowerCase();
        if (lowerName.endsWith(".csv")) return "csv";
        if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) return "excel";
        return "unknown";
    }

    private int getRecordCount(File file) {
        try {
            if (file.getName().toLowerCase().endsWith(".csv")) {
                return countCsvLines(file);
            } else {
                return 100; // Valeur par défaut pour les autres types
            }
        } catch (Exception e) {
            System.err.println("❌ Erreur lors du comptage des lignes: " + e.getMessage());
            return 100;
        }
    }

    private int countCsvLines(File file) throws IOException {
        int lineCount = 0;
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(new FileInputStream(file), "UTF-8"))) {
            while (reader.readLine() != null) {
                lineCount++;
            }
        }
        // Soustraire 1 pour l'en-tête
        return Math.max(0, lineCount - 1);
    }

    // Méthode pour lire les colonnes Excel avec détection intelligente des en-têtes
    private List<String> readExcelColumns(File file) throws IOException {
        try {
            // Utiliser Apache POI pour lire les fichiers Excel
            Workbook workbook;
            if (file.getName().toLowerCase().endsWith(".xlsx")) {
                workbook = new XSSFWorkbook(new FileInputStream(file));
            } else {
                workbook = new HSSFWorkbook(new FileInputStream(file));
            }
            
            Sheet sheet = workbook.getSheetAt(0);
            List<String> headers = new ArrayList<>();
            
            // Analyser les premières 200 lignes pour trouver les en-têtes
            int maxRowsToCheck = Math.min(200, sheet.getLastRowNum());
            
            for (int i = 0; i <= maxRowsToCheck; i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                
                List<String> rowData = new ArrayList<>();
                for (int j = 0; j < row.getLastCellNum(); j++) {
                    Cell cell = row.getCell(j);
                    String cellValue = (cell != null) ? cell.toString().trim() : "";
                    rowData.add(cellValue);
                }
                
                // Vérifier si cette ligne contient les en-têtes Orange Money
                if (isOrangeMoneyHeaderRow(rowData)) {
                    headers = rowData;
                    System.out.println("✅ En-têtes Orange Money détectés à la ligne " + i);
                    break;
                }
            }
            
            workbook.close();
            
            if (headers.isEmpty()) {
                // Fallback : utiliser la première ligne non vide
                for (int i = 0; i <= sheet.getLastRowNum(); i++) {
                    Row row = sheet.getRow(i);
                    if (row != null) {
                        List<String> rowData = new ArrayList<>();
                        for (int j = 0; j < row.getLastCellNum(); j++) {
                            Cell cell = row.getCell(j);
                            String cellValue = (cell != null) ? cell.toString().trim() : "";
                            rowData.add(cellValue);
                        }
                        
                        if (rowData.stream().anyMatch(s -> !s.isEmpty())) {
                            headers = rowData;
                            break;
                        }
                    }
                }
            }
            
            return headers;
        } catch (Exception e) {
            System.err.println("❌ Erreur lors de la lecture Excel: " + e.getMessage());
            return List.of("date", "montant", "description", "reference");
        }
    }
    
    // Méthode pour détecter si une ligne contient les en-têtes Orange Money
    private boolean isOrangeMoneyHeaderRow(List<String> rowData) {
        List<String> orangeMoneyHeaders = List.of(
            "N°", "Date", "Heure", "Référence", "Service", "Paiement", 
            "Statut", "Mode", "N° de Compte", "Wallet", "N° Pseudo", 
            "Débit", "Crédit", "Compte:", "Sous-réseau"
        );
        
        int matchingHeaders = 0;
        for (String header : orangeMoneyHeaders) {
            if (rowData.stream().anyMatch(cell -> cell.contains(header))) {
                matchingHeaders++;
            }
        }
        
        // Retourner true si au moins 8 en-têtes Orange Money sont trouvés
        return matchingHeaders >= 8;
    }

    // Méthode pour lire les données d'exemple des fichiers Excel
    private List<Map<String, Object>> readExcelSampleData(File file) throws IOException {
        try {
            // Utiliser Apache POI pour lire les fichiers Excel
            Workbook workbook;
            if (file.getName().toLowerCase().endsWith(".xlsx")) {
                workbook = new XSSFWorkbook(new FileInputStream(file));
            } else {
                workbook = new HSSFWorkbook(new FileInputStream(file));
            }
            
            Sheet sheet = workbook.getSheetAt(0);
            List<Map<String, Object>> sampleData = new ArrayList<>();
            List<String> headers = new ArrayList<>();
            int headerRowIndex = -1;
            
            // Analyser les premières 200 lignes pour trouver les en-têtes
            int maxRowsToCheck = Math.min(200, sheet.getLastRowNum());
            System.out.println("🔍 Recherche des en-têtes dans les " + maxRowsToCheck + " premières lignes...");
            
            // Trouver la ligne d'en-têtes
            for (int i = 0; i <= maxRowsToCheck; i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                
                List<String> rowData = new ArrayList<>();
                for (int j = 0; j < row.getLastCellNum(); j++) {
                    Cell cell = row.getCell(j);
                    String cellValue = (cell != null) ? cell.toString().trim() : "";
                    rowData.add(cellValue);
                }
                
                // Vérifier si cette ligne contient les en-têtes Orange Money
                if (isOrangeMoneyHeaderRow(rowData)) {
                    headers = rowData;
                    headerRowIndex = i;
                    System.out.println("✅ En-têtes Orange Money détectés à la ligne " + i);
                    System.out.println("📊 En-têtes détectés: " + headers);
                    break;
                }
            }
            
            // Si aucun en-tête Orange Money n'est trouvé, utiliser la première ligne non vide
            if (headers.isEmpty()) {
                for (int i = 0; i <= sheet.getLastRowNum(); i++) {
                    Row row = sheet.getRow(i);
                    if (row != null) {
                        List<String> rowData = new ArrayList<>();
                        for (int j = 0; j < row.getLastCellNum(); j++) {
                            Cell cell = row.getCell(j);
                            String cellValue = (cell != null) ? cell.toString().trim() : "";
                            rowData.add(cellValue);
                        }
                        
                        if (rowData.stream().anyMatch(s -> !s.isEmpty())) {
                            headers = rowData;
                            headerRowIndex = i;
                            break;
                        }
                    }
                }
            }
            
                         // Lire les données d'exemple (recherche agressive dans tout le fichier)
             if (!headers.isEmpty() && headerRowIndex >= 0) {
                 System.out.println("🔍 Recherche de données valides dans tout le fichier...");
                 
                 // Parcourir tout le fichier pour trouver des données valides
                 for (int i = headerRowIndex + 1; i <= sheet.getLastRowNum(); i++) {
                     Row row = sheet.getRow(i);
                     if (row == null) continue;
                     
                     Map<String, Object> rowData = new java.util.HashMap<>();
                     boolean hasData = false;
                     boolean hasNonEmptyValues = false;
                     boolean hasStatutValue = false;
                     
                     for (int j = 0; j < headers.size() && j < row.getLastCellNum(); j++) {
                         Cell cell = row.getCell(j);
                         String cellValue = (cell != null) ? cell.toString().trim() : "";
                         
                         if (!cellValue.isEmpty()) {
                             hasData = true;
                             
                             // Vérifier spécifiquement si la colonne Statut a une valeur
                             if (j < headers.size() && headers.get(j).equals("Statut") && !cellValue.isEmpty()) {
                                 hasStatutValue = true;
                                 System.out.println("🎯 Valeur Statut trouvée: " + cellValue);
                             }
                         }
                         
                         rowData.put(headers.get(j), cellValue);
                     }
                     
                     // Vérifier si cette ligne n'est pas la ligne d'en-têtes elle-même
                     boolean isHeaderRow = false;
                     for (Object value : rowData.values()) {
                         if (value != null && headers.contains(value.toString())) {
                             isHeaderRow = true;
                             break;
                         }
                     }
                     
                     // Ajouter les lignes qui contiennent des données significatives
                     if (hasData && !isHeaderRow) { // Suppression de la vérification hasNonEmptyValues
                         sampleData.add(rowData);
                         System.out.println("✅ Ligne " + i + " ajoutée avec des données valides: " + rowData);
                         
                         // Si on a trouvé une ligne avec une valeur Statut, c'est encore mieux
                         if (hasStatutValue) {
                             System.out.println("🎯 Ligne " + i + " contient une valeur Statut!");
                         }
                         
                         // Arrêter après avoir trouvé 10 lignes valides (augmenté)
                         if (sampleData.size() >= 10) break;
                     } else if (isHeaderRow) {
                         System.out.println("⚠️ Ligne " + i + " ignorée car c'est la ligne d'en-têtes: " + rowData);
                     } else {
                         System.out.println("⚠️ Ligne " + i + " ignorée car pas de données valides: " + rowData);
                     }
                 }
                 
                 // Si toujours aucune ligne valide, essayer une approche plus permissive
                 if (sampleData.isEmpty()) {
                     System.out.println("⚠️ Aucune ligne valide trouvée, essai avec critères plus permissifs...");
                     for (int i = headerRowIndex + 1; i <= Math.min(headerRowIndex + 1000, sheet.getLastRowNum()); i++) {
                         Row row = sheet.getRow(i);
                         if (row == null) continue;
                         
                         Map<String, Object> rowData = new java.util.HashMap<>();
                         boolean hasAnyData = false;
                         
                         for (int j = 0; j < headers.size() && j < row.getLastCellNum(); j++) {
                             Cell cell = row.getCell(j);
                             String cellValue = (cell != null) ? cell.toString().trim() : "";
                             
                             if (!cellValue.isEmpty()) {
                                 hasAnyData = true;
                             }
                             
                             rowData.put(headers.get(j), cellValue);
                         }
                         
                         // Ajouter toute ligne qui a au moins une donnée
                         if (hasAnyData) {
                             sampleData.add(rowData);
                             System.out.println("✅ Ligne " + i + " ajoutée (critères permissifs): " + rowData);
                             if (sampleData.size() >= 10) break; // Augmenté à 10
                         }
                     }
                 }
             }
            
            workbook.close();
            System.out.println("📊 Données d'exemple Excel: " + sampleData.size() + " lignes avec " + headers.size() + " colonnes");
            return sampleData;
            
        } catch (Exception e) {
            System.err.println("❌ Erreur lors de la lecture des données Excel: " + e.getMessage());
            e.printStackTrace();
            return List.of(
                Map.of("date", "2025-08-01", "montant", "1000.00", "description", "Transaction 1", "reference", "REF001"),
                Map.of("date", "2025-08-02", "montant", "2000.00", "description", "Transaction 2", "reference", "REF002")
            );
        }
    }
} 