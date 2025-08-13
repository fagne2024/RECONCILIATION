package com.reconciliation.service;

import com.reconciliation.entity.TrxSfEntity;
import com.reconciliation.repository.TrxSfRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import com.reconciliation.entity.FraisTransactionEntity;
import com.reconciliation.service.FraisTransactionService;

@Service
public class TrxSfService {
    
    @Autowired
    private TrxSfRepository trxSfRepository;
    
    @Autowired
    private FraisTransactionService fraisTransactionService;
    
    public List<TrxSfEntity> getAllTrxSf() {
        return trxSfRepository.findAllOrderByDateTransactionDesc();
    }
    
    public Optional<TrxSfEntity> getTrxSfById(Long id) {
        return trxSfRepository.findById(id);
    }
    
    public List<TrxSfEntity> getTrxSfByAgence(String agence) {
        return trxSfRepository.findByAgence(agence);
    }
    
    public List<TrxSfEntity> getTrxSfByService(String service) {
        return trxSfRepository.findByService(service);
    }
    
    public List<TrxSfEntity> getTrxSfByPays(String pays) {
        return trxSfRepository.findByPays(pays);
    }
    
    public List<TrxSfEntity> getTrxSfByStatut(String statut) {
        return trxSfRepository.findByStatut(statut);
    }
    
    public List<TrxSfEntity> getTrxSfByDateRange(LocalDateTime dateDebut, LocalDateTime dateFin) {
        return trxSfRepository.findByDateTransactionBetween(dateDebut, dateFin);
    }
    
    public List<String> getDistinctAgences() {
        return trxSfRepository.findDistinctAgence();
    }
    
    public List<String> getDistinctServices() {
        return trxSfRepository.findDistinctService();
    }
    
    public List<String> getDistinctPays() {
        return trxSfRepository.findDistinctPays();
    }
    
    @Transactional
    public TrxSfEntity createTrxSf(TrxSfEntity trxSf) {
        return trxSfRepository.save(trxSf);
    }
    
    @Transactional
    public List<TrxSfEntity> createMultipleTrxSf(List<TrxSfEntity> trxSfList) {
        return trxSfRepository.saveAll(trxSfList);
    }
    
    @Transactional
    public TrxSfEntity updateTrxSf(Long id, TrxSfEntity trxSf) {
        if (trxSfRepository.existsById(id)) {
            trxSf.setId(id);
            return trxSfRepository.save(trxSf);
        }
        return null;
    }
    
    @Transactional
    public boolean deleteTrxSf(Long id) {
        if (trxSfRepository.existsById(id)) {
            trxSfRepository.deleteById(id);
            return true;
        }
        return false;
    }
    
    @Transactional
    public boolean updateStatut(Long id, String nouveauStatut) {
        Optional<TrxSfEntity> optional = trxSfRepository.findById(id);
        if (optional.isPresent()) {
            TrxSfEntity trxSf = optional.get();
            trxSf.setStatut(nouveauStatut);
            trxSfRepository.save(trxSf);
            return true;
        }
        return false;
    }
    
    @Transactional
    public boolean updateStatutWithComment(Long id, String nouveauStatut, String commentaire) {
        Optional<TrxSfEntity> optional = trxSfRepository.findById(id);
        if (optional.isPresent()) {
            TrxSfEntity trxSf = optional.get();
            trxSf.setStatut(nouveauStatut);
            trxSf.setCommentaire(commentaire);
            trxSfRepository.save(trxSf);
            return true;
        }
        return false;
    }
    
    @Transactional
    public List<TrxSfEntity> uploadCsvFile(MultipartFile file) throws IOException {
        List<TrxSfEntity> newTrxSfList = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        int duplicatesFound = 0;
        
        System.out.println("=== DÉBUT uploadCsvFile TRX SF ===");
        String fileName = file.getOriginalFilename();
        System.out.println("DEBUG: Nom du fichier: " + (fileName != null ? fileName : "unknown"));
        System.out.println("DEBUG: Taille du fichier: " + file.getSize() + " bytes");
        
        try (BufferedReader br = new BufferedReader(new InputStreamReader(file.getInputStream()))) {
            String line;
            boolean isFirstLine = true;
            int lineNumber = 0;
            
            while ((line = br.readLine()) != null) {
                lineNumber++;
                if (isFirstLine) {
                    isFirstLine = false;
                    System.out.println("DEBUG: En-tête ignoré: " + line);
                    continue; // Skip header
                }
                
                try {
                    String[] values = line.split(";");
                    System.out.println("DEBUG: Ligne " + lineNumber + " - Colonnes: " + values.length);
                    
                    if (values.length >= 10) {
                        TrxSfEntity trxSf = parseTrxSfFromValues(values, formatter);
                        if (trxSf != null) {
                            // Vérifier si la transaction existe déjà
                            boolean exists = existsByTransactionDetails(
                                trxSf.getIdTransaction(), 
                                trxSf.getAgence(), 
                                trxSf.getDateTransaction().toString()
                            );
                            
                            if (exists) {
                                duplicatesFound++;
                                System.out.println("DEBUG: Doublon détecté pour ID: " + trxSf.getIdTransaction() + " - Ignoré");
                            } else {
                                newTrxSfList.add(trxSf);
                                System.out.println("DEBUG: Transaction ajoutée pour ID: " + trxSf.getIdTransaction());
                            }
                        }
                    } else {
                        System.out.println("DEBUG: Ligne " + lineNumber + " ignorée - Colonnes insuffisantes (" + values.length + " au lieu de 10)");
                    }
                } catch (Exception e) {
                    System.out.println("DEBUG: Erreur ligne " + lineNumber + ": " + e.getMessage());
                    e.printStackTrace();
                }
            }
        }
        
        System.out.println("DEBUG: Doublons détectés: " + duplicatesFound);
        System.out.println("DEBUG: Nouvelles transactions à insérer: " + newTrxSfList.size());
        System.out.println("=== FIN uploadCsvFile TRX SF ===");
        
        return trxSfRepository.saveAll(newTrxSfList);
    }
    
    @Transactional
    public List<TrxSfEntity> uploadExcelFile(MultipartFile file) throws IOException {
        List<TrxSfEntity> trxSfList = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        
        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row != null) {
                    TrxSfEntity trxSf = parseTrxSfFromExcelRow(row, formatter);
                    if (trxSf != null) {
                        trxSfList.add(trxSf);
                    }
                }
            }
        }
        
        return trxSfRepository.saveAll(trxSfList);
    }
    
    public Map<String, Object> validateFile(MultipartFile file) throws IOException {
        Map<String, Object> result = new HashMap<>();
        List<TrxSfEntity> validRecords = new ArrayList<>();
        List<String> errors = new ArrayList<>();
        int validLines = 0;
        int errorLines = 0;
        int duplicates = 0;
        int newRecords = 0;
        
        System.out.println("=== DÉBUT validateFile TRX SF ===");
        String originalFileName = file.getOriginalFilename();
        System.out.println("DEBUG: Nom du fichier: " + (originalFileName != null ? originalFileName : "unknown"));
        System.out.println("DEBUG: Taille du fichier: " + file.getSize() + " bytes");
        
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        String fileName = originalFileName != null ? originalFileName.toLowerCase() : "";
        
        try {
            if (fileName.endsWith(".csv")) {
                // Validation des fichiers CSV
                System.out.println("DEBUG: Traitement fichier CSV");
                try (BufferedReader br = new BufferedReader(new InputStreamReader(file.getInputStream()))) {
                    String line;
                    boolean isFirstLine = true;
                    int lineNumber = 0;
                    
                    while ((line = br.readLine()) != null) {
                        lineNumber++;
                        if (isFirstLine) {
                            isFirstLine = false;
                            System.out.println("DEBUG: En-tête ignoré: " + line);
                            continue;
                        }
                        
                        try {
                            String[] values = line.split(";");
                            System.out.println("DEBUG: Ligne " + lineNumber + " - Colonnes: " + values.length);
                            
                            if (values.length >= 10) {
                                TrxSfEntity trxSf = parseTrxSfFromValues(values, formatter);
                                
                                // Vérifier les doublons
                                if (trxSfRepository.existsByIdTransaction(trxSf.getIdTransaction())) {
                                    duplicates++;
                                    errors.add("Ligne " + lineNumber + ": Doublon détecté pour ID " + trxSf.getIdTransaction());
                                    System.out.println("DEBUG: Doublon détecté pour ID: " + trxSf.getIdTransaction());
                                } else {
                                    newRecords++;
                                    validRecords.add(trxSf);
                                    System.out.println("DEBUG: Nouvel enregistrement ajouté pour ID: " + trxSf.getIdTransaction());
                                }
                                validLines++;
                            } else {
                                errorLines++;
                                errors.add("Ligne " + lineNumber + ": Nombre de colonnes insuffisant (" + values.length + " au lieu de 10)");
                                System.out.println("DEBUG: Erreur ligne " + lineNumber + " - Colonnes insuffisantes");
                            }
                        } catch (Exception e) {
                            errorLines++;
                            errors.add("Ligne " + lineNumber + ": " + e.getMessage());
                            System.out.println("DEBUG: Exception ligne " + lineNumber + ": " + e.getMessage());
                            e.printStackTrace();
                        }
                    }
                }
            } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
                // Validation des fichiers Excel
                System.out.println("DEBUG: Traitement fichier Excel");
                try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
                    Sheet sheet = workbook.getSheetAt(0);
                    System.out.println("DEBUG: Nombre de lignes dans la feuille: " + sheet.getLastRowNum());
                    
                    for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                        Row row = sheet.getRow(i);
                        if (row != null) {
                            try {
                                TrxSfEntity trxSf = parseTrxSfFromExcelRow(row, formatter);
                                
                                // Vérifier les doublons
                                if (trxSfRepository.existsByIdTransaction(trxSf.getIdTransaction())) {
                                    duplicates++;
                                    errors.add("Ligne " + (i + 1) + ": Doublon détecté pour ID " + trxSf.getIdTransaction());
                                    System.out.println("DEBUG: Doublon détecté pour ID: " + trxSf.getIdTransaction());
                                } else {
                                    newRecords++;
                                    validRecords.add(trxSf);
                                    System.out.println("DEBUG: Nouvel enregistrement ajouté pour ID: " + trxSf.getIdTransaction());
                                }
                                validLines++;
                            } catch (Exception e) {
                                errorLines++;
                                errors.add("Ligne " + (i + 1) + ": " + e.getMessage());
                                System.out.println("DEBUG: Exception ligne " + (i + 1) + ": " + e.getMessage());
                                e.printStackTrace();
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            System.out.println("DEBUG: Exception générale dans validateFile: " + e.getMessage());
            e.printStackTrace();
        }
        
        System.out.println("=== FIN validateFile TRX SF ===");
        
        result.put("validLines", validLines);
        result.put("errorLines", errorLines);
        result.put("duplicates", duplicates);
        result.put("newRecords", newRecords);
        result.put("errors", errors);
        result.put("hasErrors", errorLines > 0);
        
        return result;
    }
    
    public Map<String, Object> getStatistics() {
        Map<String, Object> stats = new HashMap<>();
        
        stats.put("total", trxSfRepository.count());
        stats.put("enAttente", trxSfRepository.countByStatut("EN_ATTENTE"));
        stats.put("traite", trxSfRepository.countByStatut("TRAITE"));
        stats.put("erreur", trxSfRepository.countByStatut("ERREUR"));
        
        Double totalMontant = trxSfRepository.sumMontantByStatut("EN_ATTENTE");
        if (totalMontant != null) {
            stats.put("totalMontant", totalMontant);
        } else {
            stats.put("totalMontant", 0.0);
        }
        
        Double totalFrais = trxSfRepository.sumFraisByStatut("EN_ATTENTE");
        if (totalFrais != null) {
            stats.put("totalFrais", totalFrais);
        } else {
            stats.put("totalFrais", 0.0);
        }
        
        return stats;
    }
    
    /**
     * Récupérer la somme des frais par agence et date
     */
    public Double getFraisByAgenceAndDate(String agence, String date) {
        Double frais = trxSfRepository.sumFraisByAgenceAndDate(agence, date);
        return frais != null ? frais : 0.0;
    }
    
    /**
     * Récupérer la somme des frais par agence et date, uniquement pour les transactions EN_ATTENTE
     */
    public Double getFraisByAgenceAndDateEnAttente(String agence, String date) {
        Double frais = trxSfRepository.sumFraisByAgenceAndDateAndStatutEnAttente(agence, date);
        return frais != null ? frais : 0.0;
    }

    /**
     * Récupérer la somme des frais par agence, date et service
     */
    public Double getFraisByAgenceAndDateAndService(String agence, String date, String service) {
        Double frais = trxSfRepository.sumFraisByAgenceAndDateAndService(agence, date, service);
        return frais != null ? frais : 0.0;
    }

    /**
     * Récupérer la somme des frais par agence, date et service, uniquement pour les transactions EN_ATTENTE
     */
    public Double getFraisByAgenceAndDateAndServiceEnAttente(String agence, String date, String service) {
        Double frais = trxSfRepository.sumFraisByAgenceAndDateAndServiceAndStatutEnAttente(agence, date, service);
        return frais != null ? frais : 0.0;
    }

    /**
     * Récupérer la configuration des frais par service
     */
    public Map<String, Object> getFraisConfigByService(String service) {
        // Configuration des frais par service depuis la table frais_transaction
        Map<String, Object> config = new HashMap<>();
        
        try {
            // Chercher un frais applicable pour ce service (on prend le premier trouvé)
            List<FraisTransactionEntity> fraisList = fraisTransactionService.getFraisTransactionsByService(service);
            
            if (!fraisList.isEmpty()) {
                // Prendre le premier frais actif trouvé
                FraisTransactionEntity frais = fraisList.stream()
                    .filter(f -> f.getActif())
                    .findFirst()
                    .orElse(fraisList.get(0)); // Fallback sur le premier si aucun actif
                
                config.put("typeFrais", frais.getTypeCalcul());
                config.put("montant", frais.getMontantFrais());
                config.put("pourcentage", frais.getPourcentage());
                config.put("description", frais.getDescription());
                config.put("service", service);
                config.put("agence", frais.getAgence());
                
                System.out.println("DEBUG: Configuration frais trouvée pour " + service + ":");
                System.out.println("  - Type: " + frais.getTypeCalcul());
                System.out.println("  - Montant: " + frais.getMontantFrais());
                System.out.println("  - Pourcentage: " + frais.getPourcentage());
                System.out.println("  - Agence: " + frais.getAgence());
                
            } else {
                // Pas de configuration trouvée, utiliser les valeurs par défaut
                config.put("typeFrais", "FIXE");
                config.put("montant", 0.0);
                config.put("pourcentage", null);
                config.put("description", "Configuration par défaut");
                config.put("service", service);
                config.put("agence", null);
                
                System.out.println("DEBUG: Aucune configuration frais trouvée pour " + service + ", utilisation des valeurs par défaut");
            }
            
        } catch (Exception e) {
            System.err.println("ERREUR lors de la récupération de la configuration des frais pour " + service + ": " + e.getMessage());
            
            // Configuration par défaut en cas d'erreur
            config.put("typeFrais", "FIXE");
            config.put("montant", 0.0);
            config.put("pourcentage", null);
            config.put("description", "Configuration par défaut (erreur)");
            config.put("service", service);
            config.put("agence", null);
        }
        
        return config;
    }
    
    /**
     * Vérifier si une transaction existe déjà
     */
    public boolean existsByTransactionDetails(String idTransaction, String agence, String dateTransaction) {
        return trxSfRepository.existsByTransactionDetails(idTransaction, agence, dateTransaction);
    }
    
    /**
     * Récupérer les transactions en doublon
     */
    public List<TrxSfEntity> findDuplicates() {
        return trxSfRepository.findDuplicates();
    }
    
    /**
     * Supprimer les doublons en gardant la plus récente
     */
    @Transactional
    public int removeDuplicates() {
        System.out.println("=== DÉBUT removeDuplicates ===");
        
        // D'abord, compter les doublons existants
        List<TrxSfEntity> duplicatesList = trxSfRepository.findDuplicates();
        System.out.println("DEBUG: Nombre de doublons trouvés avant suppression: " + duplicatesList.size());
        
        // Afficher quelques exemples de doublons
        duplicatesList.stream().limit(5).forEach(duplicate -> {
            System.out.println("DEBUG: Doublon - ID: " + duplicate.getIdTransaction() + 
                ", Agence: " + duplicate.getAgence() + 
                ", Date: " + duplicate.getDateTransaction() + 
                ", DB ID: " + duplicate.getId());
        });
        
        // Supprimer les doublons
        int removedCount = trxSfRepository.removeDuplicates();
        System.out.println("DEBUG: Nombre de doublons supprimés: " + removedCount);
        
        // Vérifier après suppression
        List<TrxSfEntity> remainingDuplicates = trxSfRepository.findDuplicates();
        System.out.println("DEBUG: Nombre de doublons restants après suppression: " + remainingDuplicates.size());
        
        System.out.println("=== FIN removeDuplicates ===");
        return removedCount;
    }
    
    /**
     * Supprimer les doublons manuellement (approche alternative)
     */
    @Transactional
    public int removeDuplicatesManually() {
        System.out.println("=== DÉBUT removeDuplicatesManually ===");
        
        List<TrxSfEntity> duplicates = trxSfRepository.findDuplicates();
        System.out.println("DEBUG: Nombre de doublons trouvés: " + duplicates.size());
        
        // Grouper par clé unique (idTransaction + agence + date)
        Map<String, List<TrxSfEntity>> groupedDuplicates = duplicates.stream()
            .collect(Collectors.groupingBy(entity -> 
                entity.getIdTransaction() + "_" + entity.getAgence() + "_" + 
                entity.getDateTransaction().toLocalDate().toString()
            ));
        
        int removedCount = 0;
        
        for (Map.Entry<String, List<TrxSfEntity>> entry : groupedDuplicates.entrySet()) {
            List<TrxSfEntity> duplicateGroup = entry.getValue();
            
            if (duplicateGroup.size() > 1) {
                // Trier par ID (garder le plus récent = ID le plus élevé)
                duplicateGroup.sort((a, b) -> Long.compare(b.getId(), a.getId()));
                
                // Supprimer tous sauf le premier (le plus récent)
                for (int i = 1; i < duplicateGroup.size(); i++) {
                    TrxSfEntity toDelete = duplicateGroup.get(i);
                    System.out.println("DEBUG: Suppression doublon ID DB: " + toDelete.getId() + 
                        ", ID Transaction: " + toDelete.getIdTransaction());
                    trxSfRepository.delete(toDelete);
                    removedCount++;
                }
            }
        }
        
        System.out.println("DEBUG: Nombre de doublons supprimés manuellement: " + removedCount);
        System.out.println("=== FIN removeDuplicatesManually ===");
        return removedCount;
    }
    
    private TrxSfEntity parseTrxSfFromValues(String[] values, DateTimeFormatter formatter) {
        try {
            TrxSfEntity trxSf = new TrxSfEntity();
            
            // Vérifier que nous avons assez de colonnes
            if (values.length < 10) {
                throw new IllegalArgumentException("Nombre de colonnes insuffisant: " + values.length + " (attendu: 10)");
            }
            
            trxSf.setIdTransaction(values[0] != null ? values[0].trim() : "");
            trxSf.setTelephoneClient(values[1] != null ? values[1].trim() : "");
            
            // Parser le montant
            if (values[2] != null && !values[2].trim().isEmpty()) {
                try {
                    String montantStr = values[2].trim().replace(",", ".");
                    trxSf.setMontant(Double.parseDouble(montantStr));
                } catch (NumberFormatException e) {
                    throw new IllegalArgumentException("Montant invalide: " + values[2]);
                }
            } else {
                trxSf.setMontant(0.0);
            }
            
            trxSf.setService(values[3] != null ? values[3].trim() : "");
            trxSf.setAgence(values[4] != null ? values[4].trim() : "");
            
            // Parser la date
            if (values[5] != null && !values[5].trim().isEmpty()) {
                try {
                    String dateStr = values[5].trim();
                    LocalDateTime dateTransaction = LocalDateTime.parse(dateStr, formatter);
                    trxSf.setDateTransaction(dateTransaction);
                } catch (Exception e) {
                    throw new IllegalArgumentException("Date invalide: " + values[5] + " - " + e.getMessage());
                }
            } else {
                trxSf.setDateTransaction(LocalDateTime.now());
            }
            
            trxSf.setNumeroTransGu(values[6] != null ? values[6].trim() : "");
            trxSf.setPays(values[7] != null ? values[7].trim() : "");
            
            // Parser les frais
            if (values[8] != null && !values[8].trim().isEmpty()) {
                try {
                    String fraisStr = values[8].trim().replace(",", ".");
                    trxSf.setFrais(Double.parseDouble(fraisStr));
                } catch (NumberFormatException e) {
                    throw new IllegalArgumentException("Frais invalides: " + values[8]);
                }
            } else {
                trxSf.setFrais(0.0);
            }
            
            // Commentaire
            trxSf.setCommentaire(values[9] != null ? values[9].trim() : "");
            
            // Valeurs par défaut
            trxSf.setStatut("EN_ATTENTE");
            trxSf.setDateImport(LocalDateTime.now());
            
            return trxSf;
        } catch (Exception e) {
            System.out.println("DEBUG: Erreur parsing valeurs: " + e.getMessage());
            throw e;
        }
    }
    
    private TrxSfEntity parseTrxSfFromExcelRow(Row row, DateTimeFormatter formatter) {
        try {
            TrxSfEntity trxSf = new TrxSfEntity();
            trxSf.setIdTransaction(getCellValueAsString(row.getCell(0)));
            trxSf.setTelephoneClient(getCellValueAsString(row.getCell(1)));
            trxSf.setMontant(getCellValueAsDouble(row.getCell(2)));
            trxSf.setService(getCellValueAsString(row.getCell(3)));
            trxSf.setAgence(getCellValueAsString(row.getCell(4)));
            trxSf.setDateTransaction(LocalDateTime.parse(getCellValueAsString(row.getCell(5)), formatter));
            trxSf.setNumeroTransGu(getCellValueAsString(row.getCell(6)));
            trxSf.setPays(getCellValueAsString(row.getCell(7)));
            
            if (row.getCell(8) != null) {
                trxSf.setFrais(getCellValueAsDouble(row.getCell(8)));
            }
            
            if (row.getCell(9) != null) {
                trxSf.setCommentaire(getCellValueAsString(row.getCell(9)));
            }
            
            return trxSf;
        } catch (Exception e) {
            return null;
        }
    }
    
    private String getCellValueAsString(Cell cell) {
        if (cell == null) return "";
        
        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue().trim();
            case NUMERIC:
                return String.valueOf((long) cell.getNumericCellValue());
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            default:
                return "";
        }
    }
    
    private Double getCellValueAsDouble(Cell cell) {
        if (cell == null) return 0.0;
        
        switch (cell.getCellType()) {
            case NUMERIC:
                return cell.getNumericCellValue();
            case STRING:
                try {
                    return Double.parseDouble(cell.getStringCellValue().trim());
                } catch (NumberFormatException e) {
                    return 0.0;
                }
            default:
                return 0.0;
        }
    }
}
