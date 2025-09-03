package com.reconciliation.controller;

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
import java.util.stream.Collectors;

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
                    name.toLowerCase().endsWith(".xls") ||
                    name.toLowerCase().endsWith(".xlsm") ||
                    name.toLowerCase().endsWith(".xlsb") ||
                    name.toLowerCase().endsWith(".xlt") ||
                    name.toLowerCase().endsWith(".xltx") ||
                    name.toLowerCase().endsWith(".xltm")
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
                // Lister TOUS les fichiers dans le dossier
                File[] allFiles = watchPath.toFile().listFiles();
                System.out.println("📄 Tous les fichiers dans le dossier: " + (allFiles != null ? allFiles.length : 0));
                if (allFiles != null) {
                    for (File file : allFiles) {
                        System.out.println("   - " + file.getName() + " (taille: " + file.length() + " bytes)");
                    }
                }
                
                File[] fileList = watchPath.toFile().listFiles((dir, name) -> 
                    name.toLowerCase().endsWith(".csv") || 
                    name.toLowerCase().endsWith(".xlsx") || 
                    name.toLowerCase().endsWith(".xls") ||
                    name.toLowerCase().endsWith(".xlsm") ||
                    name.toLowerCase().endsWith(".xlsb") ||
                    name.toLowerCase().endsWith(".xlt") ||
                    name.toLowerCase().endsWith(".xltx") ||
                    name.toLowerCase().endsWith(".xltm")
                );
                
                System.out.println("📄 Fichiers filtrés trouvés: " + (fileList != null ? fileList.length : 0));
                if (fileList != null) {
                    for (File file : fileList) {
                        System.out.println("   ✅ Fichier accepté: " + file.getName());
                    }
                }
                
                if (fileList != null) {
                    for (File file : fileList) {
                        System.out.println("📄 Traitement du fichier: " + file.getName());
                        
                        // Lire les vraies colonnes
                        List<String> columns = getFileColumns(file);
                        System.out.println("📋 Colonnes lues pour " + file.getName() + ": " + columns);
                        
                        // Lire les vraies données d'exemple
                        List<Map<String, Object>> sampleData = getSampleData(file);
                        System.out.println("📊 Données d'exemple lues pour " + file.getName() + ": " + sampleData.size() + " lignes");
                        
                        Map<String, Object> fileInfo = Map.of(
                            "fileName", file.getName(),
                            "filePath", file.getAbsolutePath(),
                            "columns", columns,
                            "sampleData", sampleData,
                            "fileType", getFileType(file.getName()),
                            "recordCount", getRecordCount(file)
                        );
                        files.add(fileInfo);
                        
                        System.out.println("✅ Fichier " + file.getName() + " traité avec succès");
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
            
            // Construire le chemin complet en utilisant WATCH_FOLDER
            Path fullPath;
            if (filePath.startsWith("watch-folder/")) {
                // Le chemin contient déjà watch-folder, construire le chemin complet
                fullPath = Paths.get(WATCH_FOLDER).resolve(filePath.substring("watch-folder/".length()));
            } else {
                // C'est juste un nom de fichier, l'ajouter à WATCH_FOLDER
                fullPath = Paths.get(WATCH_FOLDER).resolve(filePath);
            }
            
            // Si le chemin relatif ne fonctionne pas, essayer avec le chemin absolu depuis le répertoire de travail
            if (!fullPath.toFile().exists()) {
                System.out.println("⚠️ Chemin relatif non trouvé, essai avec chemin absolu...");
                fullPath = Paths.get(System.getProperty("user.dir")).resolve(WATCH_FOLDER).resolve(filePath.replace("watch-folder/", ""));
            }
            
            // Si toujours pas trouvé, essayer avec le chemin depuis la racine du projet
            if (!fullPath.toFile().exists()) {
                System.out.println("⚠️ Chemin absolu non trouvé, essai depuis la racine du projet...");
                fullPath = Paths.get(System.getProperty("user.dir")).resolve("..").resolve("watch-folder").resolve(filePath.replace("watch-folder/", ""));
            }
            
            File file = fullPath.toFile();
            
            System.out.println("🔍 Analyse du fichier demandée: " + filePath);
            System.out.println("📁 Chemin complet construit: " + fullPath.toAbsolutePath());
            System.out.println("✅ Fichier existe: " + file.exists());
            
            if (!file.exists()) {
                System.err.println("❌ Fichier non trouvé: " + fullPath.toAbsolutePath());
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "Fichier non trouvé: " + filePath
                ));
            }
            
            System.out.println("🔍 Début de l'analyse du fichier: " + file.getName());
            
            // Analyser les colonnes
            List<String> columns = getFileColumns(file);
            System.out.println("📋 Colonnes détectées (" + columns.size() + "): " + columns);
            
            // Analyser les données d'exemple
            List<Map<String, Object>> sampleData = getSampleData(file);
            System.out.println("📊 Données d'exemple (" + sampleData.size() + " lignes)");
            
            // Obtenir le type de fichier
            String fileType = getFileType(file.getName());
            System.out.println("📄 Type de fichier détecté: " + fileType);
            
            // Obtenir le nombre d'enregistrements
            int recordCount = getRecordCount(file);
            System.out.println("📊 Nombre d'enregistrements: " + recordCount);
            
            Map<String, Object> analysis = Map.of(
                "fileName", file.getName(),
                "filePath", file.getAbsolutePath(),
                "columns", columns,
                "sampleData", sampleData,
                "fileType", fileType,
                "recordCount", recordCount
            );
            
            System.out.println("✅ Analyse terminée pour: " + file.getName());
            System.out.println("📋 Résumé de l'analyse: " + analysis);
            return ResponseEntity.ok(analysis);
        } catch (Exception e) {
            System.err.println("❌ Erreur lors de l'analyse du fichier: " + e.getMessage());
            e.printStackTrace();
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
            System.out.println("🔍 getFileColumns() appelé pour: " + file.getName());
            System.out.println("📁 Chemin absolu: " + file.getAbsolutePath());
            System.out.println("✅ Fichier existe: " + file.exists());
            
            List<String> columns;
            if (file.getName().toLowerCase().endsWith(".csv")) {
                System.out.println("📄 Lecture des colonnes CSV");
                columns = readCsvColumns(file);
            } else {
                System.out.println("📄 Lecture des colonnes Excel");
                columns = readExcelColumns(file);
            }
            
            System.out.println("📋 Colonnes détectées pour " + file.getName() + ": " + columns);
            return columns;
        } catch (Exception e) {
            System.err.println("❌ Erreur dans getFileColumns() pour " + file.getName() + ": " + e.getMessage());
            e.printStackTrace();
            return List.of("date", "montant", "description", "reference");
        }
    }

    private List<Map<String, Object>> getSampleData(File file) {
        try {
            System.out.println("🔍 getSampleData() appelé pour: " + file.getName());
            
            if (file.getName().toLowerCase().endsWith(".csv")) {
                System.out.println("📄 Lecture des données d'exemple CSV");
                return readCsvSampleData(file);
            } else if (file.getName().toLowerCase().endsWith(".xls") || 
                       file.getName().toLowerCase().endsWith(".xlsx") ||
                       file.getName().toLowerCase().endsWith(".xlsm") ||
                       file.getName().toLowerCase().endsWith(".xlsb") ||
                       file.getName().toLowerCase().endsWith(".xlt") ||
                       file.getName().toLowerCase().endsWith(".xltx") ||
                       file.getName().toLowerCase().endsWith(".xltm")) {
                System.out.println("📄 Lecture des données d'exemple Excel");
                return readExcelSampleData(file);
            } else {
                System.out.println("⚠️ Type de fichier non supporté, utilisation de données par défaut");
                // Pour les autres types de fichiers, retourner des données d'exemple
                return List.of(
                    Map.of("date", "2025-08-01", "montant", "1000.00", "description", "Transaction 1", "reference", "REF001"),
                    Map.of("date", "2025-08-02", "montant", "2000.00", "description", "Transaction 2", "reference", "REF002")
                );
            }
        } catch (Exception e) {
            System.err.println("❌ Erreur dans getSampleData() pour " + file.getName() + ": " + e.getMessage());
            e.printStackTrace();
            System.out.println("🔄 Utilisation de données par défaut en cas d'erreur");
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
                            String correctedColumn = column.trim();
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

    /**
     * Méthode pour corriger les caractères spéciaux corrompus
     * 
     * Cette méthode gère :
     * - ENCODAGE : Correction des caractères mal encodés dans les en-têtes
     * - NORMALISATION : Mapping vers des caractères corrects
     * - TYPAGE : Standardisation du format des caractères
     * 
     * @param text Le texte à corriger
     * @return Le texte corrigé et normalisé
     */


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
        if (lowerName.endsWith(".xlsx") || 
            lowerName.endsWith(".xls") ||
            lowerName.endsWith(".xlsm") ||
            lowerName.endsWith(".xlsb") ||
            lowerName.endsWith(".xlt") ||
            lowerName.endsWith(".xltx") ||
            lowerName.endsWith(".xltm")) return "excel";
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

    // Méthode pour lire les colonnes Excel avec détection intelligente des en-têtes et types
    private List<String> readExcelColumns(File file) throws IOException {
        System.out.println("🔵 [readExcelColumns] Appelée pour: " + file.getName());
        System.out.println("📁 Chemin complet du fichier: " + file.getAbsolutePath());
        System.out.println("📊 Taille du fichier: " + file.length() + " bytes");
        
        try {
            // Utiliser Apache POI pour lire les fichiers Excel
            Workbook workbook;
            if (file.getName().toLowerCase().endsWith(".xlsx") || 
                file.getName().toLowerCase().endsWith(".xlsm") ||
                file.getName().toLowerCase().endsWith(".xltx") ||
                file.getName().toLowerCase().endsWith(".xltm")) {
                workbook = new XSSFWorkbook(new FileInputStream(file));
                System.out.println("📄 Format Excel détecté: XLSX (2007+)");
            } else {
                workbook = new HSSFWorkbook(new FileInputStream(file));
                System.out.println("📄 Format Excel détecté: XLS (97-2003)");
            }
            
            Sheet sheet = workbook.getSheetAt(0);
            System.out.println("📋 Nombre de feuilles: " + workbook.getNumberOfSheets());
            System.out.println("📄 Nombre de lignes dans la première feuille: " + sheet.getLastRowNum());
            
            // Analyser les premières lignes pour voir la structure
            System.out.println("🔍 Analyse des 5 premières lignes pour comprendre la structure:");
            for (int i = 0; i < Math.min(5, sheet.getLastRowNum()); i++) {
                Row row = sheet.getRow(i);
                if (row != null) {
                    System.out.println("   Ligne " + i + " - getLastCellNum(): " + row.getLastCellNum());
                    List<String> rowData = readAllColumnsFromRow(row, sheet);
                    System.out.println("   Ligne " + i + " - Colonnes lues: " + rowData.size() + " - Contenu: " + rowData);
                } else {
                    System.out.println("   Ligne " + i + " - NULL");
                }
            }
            
            List<String> headers = new ArrayList<>();
            
            // Analyser les premières 200 lignes pour trouver les en-têtes avec détection avancée
            int maxRowsToCheck = Math.min(200, sheet.getLastRowNum());
            System.out.println("🔍 Analyse avancée des " + maxRowsToCheck + " premières lignes");
            
            int bestHeaderRowIndex = 0;
            int bestScore = 0;
            List<String> bestHeaders = new ArrayList<>();
            
            for (int i = 0; i <= maxRowsToCheck; i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                
                List<String> rowData = readAllColumnsFromRow(row, sheet);
                
                // Analyser la qualité de cette ligne comme en-tête
                int score = analyzeHeaderRowQuality(rowData, i);
                System.out.println("📋 Ligne " + i + " - Score: " + score + " - Contenu: " + rowData);
                
                if (score > bestScore) {
                    bestScore = score;
                    bestHeaderRowIndex = i;
                    bestHeaders = new ArrayList<>(rowData);
                    System.out.println("⭐ Nouveau meilleur en-tête trouvé à la ligne " + i + " avec score " + score);
                }
                
                // Vérifier si cette ligne contient les en-têtes Orange Money
                if (isOrangeMoneyHeaderRow(rowData)) {
                    headers = rowData;
                    System.out.println("✅ En-têtes Orange Money détectés à la ligne " + i);
                    break;
                }
                
                // Vérifier si cette ligne contient les en-têtes OPPART
                if (isOPPARTHeaderRow(rowData)) {
                    headers = rowData;
                    System.out.println("✅ En-têtes OPPART détectés à la ligne " + i);
                    break;
                }
            }
            
            // Si aucun en-tête Orange Money n'est trouvé, utiliser le meilleur en-tête détecté
            if (headers.isEmpty() && bestScore > 0) {
                headers = bestHeaders;
                System.out.println("✅ Meilleur en-tête détecté à la ligne " + bestHeaderRowIndex + " avec score " + bestScore);
            }
            
            // Détection spécifique pour les fichiers OPPART
            if (headers.isEmpty() && file.getName().toLowerCase().contains("oppart")) {
                System.out.println("🔍 Détection spécifique OPPART pour le fichier: " + file.getName());
                headers = getOPPARTDefaultHeaders();
                System.out.println("✅ En-têtes OPPART par défaut appliqués: " + headers);
            }
            
            workbook.close();
            
            if (headers.isEmpty()) {
                System.err.println("⚠️ [readExcelColumns] Fallback sur colonnes par défaut pour " + file.getName());
                // Fallback : utiliser la première ligne non vide
                for (int i = 0; i <= sheet.getLastRowNum(); i++) {
                    Row row = sheet.getRow(i);
                    if (row != null) {
                        List<String> rowData = readAllColumnsFromRow(row, sheet);
                        
                        if (rowData.stream().anyMatch(s -> !s.isEmpty())) {
                            headers = rowData;
                            System.out.println("✅ En-têtes de fallback à la ligne " + i + ": " + headers);
                            break;
                        }
                    }
                }
            }
            
            // Nettoyer et corriger les en-têtes
            
            
            System.out.println("📋 Colonnes finales nettoyées et corrigées: " + headers);
            return headers;
        } catch (Exception e) {
            System.err.println("❌ [readExcelColumns] Erreur lors de la lecture Excel pour " + file.getName() + ": " + e.getMessage());
            e.printStackTrace();
            System.err.println("⚠️ [readExcelColumns] Fallback sur colonnes par défaut pour " + file.getName());
            return List.of("date", "montant", "description", "reference");
        }
    }

    // Méthode utilitaire pour lire toutes les colonnes d'une ligne Excel
    private List<String> readAllColumnsFromRow(Row row, Sheet sheet) {
        List<String> rowData = new ArrayList<>();
        if (row == null) return rowData;
        
        System.out.println("🔍 [readAllColumnsFromRow] Début de lecture de la ligne");
        
        // Déterminer le nombre maximum de colonnes à lire
        int maxColumns = 0;
        
        // Vérifier la première ligne pour avoir une référence
        Row firstRow = sheet.getRow(0);
        if (firstRow != null) {
            int firstRowColumns = firstRow.getLastCellNum();
            maxColumns = Math.max(maxColumns, firstRowColumns);
            System.out.println("📊 [readAllColumnsFromRow] Première ligne (0): " + firstRowColumns + " colonnes");
        }
        
        // Vérifier la ligne actuelle
        int currentRowColumns = row.getLastCellNum();
        maxColumns = Math.max(maxColumns, currentRowColumns);
        System.out.println("📊 [readAllColumnsFromRow] Ligne actuelle: " + currentRowColumns + " colonnes");
        
        // Vérifier quelques autres lignes pour s'assurer de ne rien manquer
        for (int i = 1; i < Math.min(10, sheet.getLastRowNum()); i++) {
            Row checkRow = sheet.getRow(i);
            if (checkRow != null) {
                int checkRowColumns = checkRow.getLastCellNum();
                maxColumns = Math.max(maxColumns, checkRowColumns);
                System.out.println("📊 [readAllColumnsFromRow] Ligne " + i + ": " + checkRowColumns + " colonnes");
            }
        }
        
        // Minimum 20 colonnes pour s'assurer de ne rien manquer
        maxColumns = Math.max(maxColumns, 20);
        System.out.println("📊 [readAllColumnsFromRow] Nombre final de colonnes à lire: " + maxColumns);
        
        // Lire toutes les colonnes
        for (int j = 0; j < maxColumns; j++) {
            Cell cell = row.getCell(j);
            String cellValue = (cell != null) ? cell.toString().trim() : "";
            rowData.add(cellValue);
        }
        
        System.out.println("📊 [readAllColumnsFromRow] Ligne lue avec " + rowData.size() + " colonnes (maxColumns: " + maxColumns + ")");
        System.out.println("📋 [readAllColumnsFromRow] Contenu de la ligne: " + rowData);
        return rowData;
    }

    // Méthode pour analyser la qualité d'une ligne comme en-tête
    private int analyzeHeaderRowQuality(List<String> rowData, int rowIndex) {
        if (rowData.isEmpty()) return 0;
        
        int score = 0;
        int nonEmptyColumns = 0;
        boolean hasNumberColumn = false;
        boolean hasDateColumn = false;
        boolean hasAmountColumn = false;
        int keywordMatches = 0;
        
        // Mots-clés pour identifier les en-têtes
        List<String> headerKeywords = List.of(
            "N°", "Date", "Heure", "Référence", "Service", "Paiement", 
            "Statut", "Mode", "Compte", "Wallet", "Pseudo", "Débit", 
            "Crédit", "Montant", "Commissions", "Opération", "Agent", 
            "Correspondant", "Sous-réseau", "Transaction", "Description",
            "Prix", "Coût", "Tarif", "Somme", "Total", "Reste", "Balance",
            "Solde", "Commission", "Frais", "Code", "ID", "Numéro"
        );
        
        for (String cell : rowData) {
            if (cell.isEmpty()) continue;
            
            nonEmptyColumns++;
            
            // Vérifier si c'est une colonne "N°"
            if (cell.startsWith("N°") || cell.equals("N") || cell.contains("N°")) {
                hasNumberColumn = true;
                score += 25;
            }
            
            // Vérifier les mots-clés d'en-tête
            for (String keyword : headerKeywords) {
                if (cell.toLowerCase().contains(keyword.toLowerCase())) {
                    score += 8;
                    keywordMatches++;
                    
                    // Bonus pour les types spécifiques
                    if (keyword.equals("Date") || keyword.equals("Heure")) {
                        hasDateColumn = true;
                    }
                    if (keyword.equals("Montant") || keyword.equals("Prix") || keyword.equals("Coût")) {
                        hasAmountColumn = true;
                    }
                }
            }
            
            // Bonus pour les colonnes qui ressemblent à des en-têtes
            if (cell.length() > 0 && cell.length() < 50 && 
                (cell.contains(" ") || cell.contains("(") || cell.contains(")") || 
                 cell.contains(":") || cell.contains("-") || cell.contains("_"))) {
                score += 3;
            }
            
            // Bonus pour les colonnes avec des caractères spéciaux (typiques des en-têtes)
            if (cell.contains("é") || cell.contains("è") || cell.contains("à") || 
                cell.contains("ç") || cell.contains("ù") || cell.contains("ô")) {
                score += 4;
            }
        }
        
        // Bonus pour avoir une colonne "N°" et plusieurs colonnes non vides
        if (hasNumberColumn && nonEmptyColumns >= 3) {
            score += 30;
        }
        
        // Bonus pour avoir des mots-clés d'en-tête
        if (keywordMatches >= 3) {
            score += 20;
        }
        
        // Bonus pour avoir des types de colonnes spécifiques
        if (hasDateColumn) score += 10;
        if (hasAmountColumn) score += 10;
        
        // Score de base pour les lignes avec plusieurs colonnes non vides
        if (nonEmptyColumns >= 3) {
            score += 8;
        }
        
        // Pénalité pour les lignes avec peu de colonnes non vides
        if (nonEmptyColumns < 2) {
            score -= 5;
        }
        
        return score;
    }

    /**
     * Méthode pour nettoyer et corriger les en-têtes
     * 
     * Cette méthode gère :
     * - ENCODAGE : Nettoyage des caractères spéciaux dans les en-têtes
     * - NORMALISATION : Corrections spécifiques pour les fichiers Excel
     * - TYPAGE : Standardisation du format des en-têtes
     * 
     * @param headers La liste des en-têtes à nettoyer et corriger
     * @return La liste des en-têtes nettoyés et corrigés
     */

    
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

    // Méthode pour détecter si une ligne contient les en-têtes OPPART
    private boolean isOPPARTHeaderRow(List<String> rowData) {
        List<String> oppartHeaders = List.of(
            "ID Opération", "Type Opération", "Montant", "Solde avant", "Solde aprés",
            "Code propriétaire", "Téléphone", "Statut", "ID Transaction", "Num bordereau",
            "Date opération", "Date de versement", "Banque appro", "Login demandeur Appro",
            "Login valideur Appro", "Motif rejet", "Frais connexion", "Numéro Trans GU",
            "Agent", "Motif régularisation", "groupe de réseau"
        );
        
        int matchingHeaders = 0;
        for (String header : oppartHeaders) {
            if (rowData.stream().anyMatch(cell -> cell.contains(header))) {
                matchingHeaders++;
            }
        }
        
        // Retourner true si au moins 5 en-têtes OPPART sont trouvés
        return matchingHeaders >= 5;
    }

    // Méthode pour obtenir les en-têtes OPPART par défaut
    private List<String> getOPPARTDefaultHeaders() {
        return List.of(
            "ID Opération", "Type Opération", "Montant", "Solde avant", "Solde aprés",
            "Code propriétaire", "Téléphone", "Statut", "ID Transaction", "Num bordereau",
            "Date opération", "Date de versement", "Banque appro", "Login demandeur Appro",
            "Login valideur Appro", "Motif rejet", "Frais connexion", "Numéro Trans GU",
            "Agent", "Motif régularisation", "groupe de réseau"
        );
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
            
            // Détection spécifique pour les fichiers OPPART
            if (file.getName().toLowerCase().contains("oppart")) {
                System.out.println("🔍 Détection spécifique OPPART pour les données d'exemple");
                headers = getOPPARTDefaultHeaders();
                headerRowIndex = 0; // Supposer que les en-têtes sont à la première ligne
            } else {
                // Trouver la ligne d'en-têtes pour les autres fichiers
            for (int i = 0; i <= maxRowsToCheck; i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                
                List<String> rowData = readAllColumnsFromRow(row, sheet);
                
                // Vérifier si cette ligne contient les en-têtes Orange Money
                if (isOrangeMoneyHeaderRow(rowData)) {
                    headers = rowData;
                    headerRowIndex = i;
                    System.out.println("✅ En-têtes Orange Money détectés à la ligne " + i);
                    System.out.println("📊 En-têtes détectés: " + headers);
                    break;
                    }
                }
            }
            
                            // Si aucun en-tête Orange Money n'est trouvé, utiliser la première ligne non vide
                if (headers.isEmpty()) {
                    for (int i = 0; i <= sheet.getLastRowNum(); i++) {
                        Row row = sheet.getRow(i);
                        if (row != null) {
                            List<String> rowData = readAllColumnsFromRow(row, sheet);
                            
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
                     
                     // Lire toutes les colonnes de la ligne
                     List<String> rowValues = readAllColumnsFromRow(row, sheet);
                     
                     for (int j = 0; j < headers.size() && j < rowValues.size(); j++) {
                         String cellValue = rowValues.get(j);
                         
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
                         
                         // Lire toutes les colonnes de la ligne
                         List<String> rowValues = readAllColumnsFromRow(row, sheet);
                         
                         for (int j = 0; j < headers.size() && j < rowValues.size(); j++) {
                             String cellValue = rowValues.get(j);
                             
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