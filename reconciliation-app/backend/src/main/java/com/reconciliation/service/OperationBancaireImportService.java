package com.reconciliation.service;

import com.reconciliation.entity.OperationBancaireEntity;
import com.reconciliation.repository.OperationBancaireRepository;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class OperationBancaireImportService {

    @Autowired
    private OperationBancaireRepository repository;

    public static class ImportResult {
        public int totalRead;
        public int saved;
        public List<String> errors = new ArrayList<>();
    }

    public ImportResult importFile(MultipartFile file) throws Exception {
        String orig = file.getOriginalFilename();
        String filename = orig != null ? orig.toLowerCase() : "";
        try (InputStream is = file.getInputStream(); Workbook wb = createWorkbook(filename, is)) {
            Sheet sheet = wb.getSheetAt(0);
            ImportResult result = new ImportResult();
            if (sheet == null) return result;

            // Expect header row as first row (0)
            Row header = sheet.getRow(0);
            Map<String, Integer> idx = mapHeaders(header);
            System.out.println("[IMPORT DEBUG] Headers found: " + idx.keySet());

            List<OperationBancaireEntity> toSave = new ArrayList<>();
            int last = sheet.getLastRowNum();
            Map<String, Integer> refCounter = new HashMap<>();
            for (int r = 1; r <= last; r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;
                result.totalRead++;
                try {
                    OperationBancaireEntity e = new OperationBancaireEntity();
                    Set<Integer> usedCols = new HashSet<>();
                    e.setPays(getString(row, findColumnBest(idx, new String[]{"pays"}, usedCols)));
                    LocalDateTime dateOp = getLocalDateTime(row, findColumnBest(idx, new String[]{"date", "dateoperation", "dateop", "jour", "journee"}, usedCols));
                    e.setDateOperation(dateOp != null ? dateOp : LocalDateTime.now());
                    String agence = getString(row, findColumnBest(idx, new String[]{"agence"}, usedCols));
                    System.out.println("[IMPORT DEBUG] Row " + r + " agence=" + agence + " demandeur=" + getString(row, findColumnBest(idx, new String[]{"demandeur"}, usedCols)) + " valideur=" + getString(row, findColumnBest(idx, new String[]{"valideur"}, usedCols)) + " banque=" + getString(row, findColumnBest(idx, new String[]{"banque"}, usedCols)) + " date=" + dateOp + " type=" + getString(row, findColumnBest(idx, new String[]{"type", "typeoperation"}, usedCols)) + " idglpi=" + getString(row, findColumnBest(idx, new String[]{"glpi", "id_ticket", "id"}, usedCols)));
                    e.setAgence(agence != null ? agence : "");
                    e.setTypeOperation(getString(row, findColumnBest(idx, new String[]{"type", "typeoperation", "operation"}, usedCols)));
                    e.setMontant(getDouble(row, findColumnBest(idx, new String[]{"montant"}, usedCols)));
                    // GÃ©nÃ©rer la rÃ©fÃ©rence : Agence-Date-PrefixeNN, selon le type d'opÃ©ration
                    String datePart = dateOp != null ? dateOp.format(java.time.format.DateTimeFormatter.ofPattern("yyyyMMdd")) : "NDATE";
                    String typeOp = (e.getTypeOperation() != null ? e.getTypeOperation() : "").toUpperCase().trim();
                    String prefixKey;
                    if (typeOp.contains("PARTENAIRE")) {
                        prefixKey = "CPFR";
                    } else if (typeOp.contains("APPROVISIONNEMENT_DISTRIBUTEUR") || typeOp.contains("APPROVISIONNEMENT_FOURNISSEUR")) {
                        prefixKey = "AP";
                    } else if (typeOp.contains("COMPENSE")) {
                        prefixKey = "CP";
                    } else {
                        prefixKey = "CP";
                    }
                    String refKey = (agence != null ? agence : "NA") + "-" + datePart + "-" + prefixKey;
                    int count = refCounter.merge(refKey, 1, Integer::sum);
                    String generatedRef = agence + "-" + datePart + prefixKey + count;
                    e.setReference(generatedRef);
                    e.setIdGlpi(getString(row, findColumnBest(idx, new String[]{"id_ticket", "glpi", "idticket"}, usedCols)));
                    e.setBo(getString(row, findColumnBest(idx, new String[]{"banque"}, usedCols)));
                    String statut = getString(row, findColumnBest(idx, new String[]{"statut"}, usedCols));
                    e.setStatut((statut == null || statut.isBlank()) ? "En attente" : statut);
                    e.setTraitement(getString(row, findColumnBest(idx, new String[]{"traitement"}, usedCols)));
                    e.setDemandeur(getString(row, findColumnBest(idx, new String[]{"demandeur", "beneficiaire", "benef", "nom beneficiaire"}, usedCols)));
                    e.setValideur(getString(row, findColumnBest(idx, new String[]{"valideur", "banque"}, usedCols)));
                    e.setGroupe(getString(row, findColumnBest(idx, new String[]{"groupe"}, usedCols)));
                    String reconStatus = getString(row, findColumnBest(idx, new String[]{"recon", "reconciliation"}, usedCols));
                    e.setReconStatus(reconStatus);
                    e.setCompteADebiter(getString(row, findColumnBest(idx, new String[]{"compte", "compte_a_debiter"}, usedCols)));
                    toSave.add(e);
                } catch (Exception ex) {
                    result.errors.add("Ligne " + (r + 1) + ": " + ex.getMessage());
                }
            }
            if (!toSave.isEmpty()) {
                repository.saveAll(toSave);
                result.saved = toSave.size();
            }
            return result;
        }
    }

    private static Workbook createWorkbook(String filename, InputStream is) throws Exception {
        if (filename.endsWith(".xlsx") || filename.endsWith(".xlsm")) {
            return new XSSFWorkbook(is);
        } else if (filename.endsWith(".xls")) {
            return new HSSFWorkbook(is);
        } else if (filename.endsWith(".csv")) {
            // Simple CSV to workbook conversion; caller will close the returned workbook
            java.util.List<String> lines;
            try (java.io.BufferedReader br = new java.io.BufferedReader(new java.io.InputStreamReader(is))) {
                lines = br.lines().toList();
            }
            Workbook wb = new XSSFWorkbook();
            Sheet sheet = wb.createSheet();
            int r = 0;
            for (String line : lines) {
                Row row = sheet.createRow(r++);
                // DÃ©tecter le sÃ©parateur : point-virgule (CSV franÃ§ais) ou virgule
                String delimiter = line.contains(";") ? ";" : ",";
                String[] parts = line.split(delimiter, -1);
                for (int i = 0; i < parts.length; i++) {
                    Cell cell = row.createCell(i, CellType.STRING);
                    cell.setCellValue(parts[i]);
                }
            }
            return wb;
        } else {
            throw new IllegalArgumentException("Format non supportÃ©: " + filename);
        }
    }

    private static Map<String, Integer> mapHeaders(Row headerRow) {
        Map<String, Integer> map = new HashMap<>();
        if (headerRow == null) return map;
        for (int i = headerRow.getFirstCellNum(); i < headerRow.getLastCellNum(); i++) {
            Cell c = headerRow.getCell(i);
            String raw = (c != null) ? c.toString() : null;
            if (raw == null) continue;
            String key = normalize(raw);
            map.put(key, i);
        }
        return map;
    }

    /** Trouve l'index d'une colonne dont le nom normalisÃ© contient le mot-clÃ© donnÃ©.
     *  PrivilÃ©gie le mot-clÃ© le plus long (le plus spÃ©cifique) pour Ã©viter les conflits. */
    private static Integer findColumn(Map<String, Integer> idx, String keyword) {
        if (idx == null || keyword == null) return null;
        String k = keyword.toLowerCase();
        Integer bestIdx = null;
        int bestLen = -1;
        for (Map.Entry<String, Integer> entry : idx.entrySet()) {
            String colKey = entry.getKey();
            if (colKey.contains(k) && colKey.length() > bestLen) {
                bestIdx = entry.getValue();
                bestLen = colKey.length();
            }
        }
        return bestIdx;
    }

    /** Trouve l'index d'une colonne en testant plusieurs mots-clÃ©s alternatifs.
     *  PrivilÃ©gie le mot-clÃ© le plus long. */
    private static Integer findColumnBest(Map<String, Integer> idx, String[] keywords, Set<Integer> usedIndices) {
        if (idx == null || keywords == null || keywords.length == 0) return null;
        Integer bestIdx = null;
        int bestLen = -1;
        for (String kw : keywords) {
            String k = kw.toLowerCase();
            for (Map.Entry<String, Integer> entry : idx.entrySet()) {
                int colIdx = entry.getValue();
                if (usedIndices.contains(colIdx)) continue;
                String colKey = entry.getKey();
                boolean matches = colKey.equals(k) || colKey.contains(k) || k.contains(colKey);
                if (matches && colKey.length() > bestLen) {
                    bestIdx = colIdx;
                    bestLen = colKey.length();
                }
            }
        }
        return bestIdx;
    }

    private static String normalize(String s) {
        String n = java.text.Normalizer.normalize(s, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        n = n.toLowerCase().trim();
        n = n.replaceAll("[\n\r\t]", " ");
        n = n.replaceAll("[\\s]+", " ");
        n = n.replace(" ", "_");
        n = n.replaceAll("[^a-z0-9_]+", "");
        return n;
    }

    private static String getString(Row row, Integer col) {
        if (row == null || col == null) return null;
        Cell c = row.getCell(col);
        if (c == null) return null;
        if (c.getCellType() == CellType.STRING) return c.getStringCellValue().trim();
        if (c.getCellType() == CellType.NUMERIC) return String.valueOf((long)c.getNumericCellValue());
        if (c.getCellType() == CellType.BOOLEAN) return Boolean.toString(c.getBooleanCellValue());
        return c.toString().trim();
    }

    private static Double getDouble(Row row, Integer col) {
        if (row == null || col == null) return null;
        Cell c = row.getCell(col);
        if (c == null) return null;
        if (c.getCellType() == CellType.NUMERIC) return c.getNumericCellValue();
        String s = c.toString().trim();
        if (s.isEmpty()) return null;
        // Supprimer espaces et espaces insÃ©curitaires
        s = s.replace(" ", "").replace("\u00A0", "");
        // StratÃ©gie 1: tel quel
        try { return Double.parseDouble(s); } catch (Exception ignored) {}
        // StratÃ©gie 2: supprimer toutes les virgules (sÃ©parateurs de milliers: "2,455,108" -> "2455108")
        try { return Double.parseDouble(s.replace(",", "")); } catch (Exception ignored) {}
        // StratÃ©gie 3: remplacer la virgule par un point (dÃ©cimales: "2,5" -> "2.5")
        try { return Double.parseDouble(s.replace(",", ".")); } catch (Exception ignored) {}
        return null;
    }

        private static LocalDateTime getLocalDateTime(Row row, Integer col) {
        if (row == null || col == null) return null;
        Cell c = row.getCell(col);
        if (c == null) return null;
        try {
            String s = c.toString().trim();
            if (s.isEmpty()) return null;
            // Try ISO yyyy-MM-dd HH:mm:ss(.S or .SS or .SSS)
            if (s.matches("\\d{4}-\\d{2}-\\d{2}[ T]\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?")) {
                String normalized = s;
                int dotIdx = s.lastIndexOf('.');
                if (dotIdx >= 0 && dotIdx + 1 < s.length()) {
                    String msPart = s.substring(dotIdx + 1);
                    if (msPart.matches("\\d+")) {
                        while (msPart.length() < 3) msPart += "0";
                        if (msPart.length() > 3) msPart = msPart.substring(0, 3);
                        normalized = s.substring(0, dotIdx + 1) + msPart;
                    }
                }
                return LocalDateTime.parse(normalized, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS"));
            }
            // Try French format dd/MM/yyyy HH:mm:ss
            if (s.matches("\\d{2}/\\d{2}/\\d{4}[ T]\\d{2}:\\d{2}:\\d{2}$")) {
                return LocalDateTime.parse(s, DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"));
            }
            if (s.matches("\\d{2}/\\d{2}/\\d{4}$")) {
                LocalDate ld = LocalDate.parse(s, DateTimeFormatter.ofPattern("dd/MM/yyyy"));
                return ld.atStartOfDay();
            }
        } catch (Exception ignored) { }
        return null;
    }

    public byte[] generateTemplate() throws Exception {
        Workbook wb = new XSSFWorkbook();
        Sheet sheet = wb.createSheet("Operations");
        String[] headers = new String[]{
                "Pays","Date OpÃ©ration","Agence","Type OpÃ©ration","Montant","RÃ©fÃ©rence","ID TICKET","Banque","Statut","Traitement","Demandeur","Valideur","GroupÃ©","Statut RÃ©conciliation","Compte Ã  dÃ©biter"
        };
        Row h = sheet.createRow(0);
        for (int i = 0; i < headers.length; i++) {
            Cell c = h.createCell(i, CellType.STRING);
            c.setCellValue(headers[i]);
        }
        // Example row
        Row ex = sheet.createRow(1);
        ex.createCell(0).setCellValue("CÃ´te d'Ivoire");
        ex.createCell(1).setCellValue("2025-10-01");
        ex.createCell(2).setCellValue("AG001");
        ex.createCell(3).setCellValue("Compensation Client");
        ex.createCell(4).setCellValue(100000);
        ex.createCell(5).setCellValue("REF-ABC-123");
        ex.createCell(6).setCellValue("12345");
        ex.createCell(7).setCellValue("BOA");
        ex.createCell(8).setCellValue("En attente");
        ex.createCell(9).setCellValue("Niveau Group");
        ex.createCell(10).setCellValue("Jean Dupont");
        ex.createCell(11).setCellValue("Marie Martin");
        ex.createCell(12).setCellValue("Non");
        ex.createCell(13).setCellValue("KO");
        ex.createCell(14).setCellValue("000123456789");

        for (int i = 0; i < headers.length; i++) sheet.autoSizeColumn(i);

        try (ByteArrayOutputStream bos = new ByteArrayOutputStream()) {
            wb.write(bos);
            wb.close();
            return bos.toByteArray();
        }
    }
}


