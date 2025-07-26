package com.reconciliation.service;

import com.reconciliation.entity.EcartSoldeEntity;
import com.reconciliation.entity.FraisTransactionEntity;
import com.reconciliation.entity.OperationEntity;
import com.reconciliation.entity.CompteEntity;
import com.reconciliation.model.EcartSolde;
import com.reconciliation.repository.EcartSoldeRepository;
import com.reconciliation.repository.OperationRepository;
import com.reconciliation.repository.CompteRepository;
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
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.Map;

@Service
public class EcartSoldeService {
    
    @Autowired
    private EcartSoldeRepository ecartSoldeRepository;
    
    @Autowired
    private FraisTransactionService fraisTransactionService;
    
    @Autowired
    private OperationRepository operationRepository;
    
    @Autowired
    private CompteRepository compteRepository;
    
    public List<EcartSolde> getAllEcartSoldes() {
        return ecartSoldeRepository.findAllOrderByDateTransactionDesc().stream()
                .map(this::convertToModel)
                .collect(Collectors.toList());
    }
    
    public Optional<EcartSolde> getEcartSoldeById(Long id) {
        return ecartSoldeRepository.findById(id)
                .map(this::convertToModel);
    }
    
    public List<EcartSolde> getEcartSoldesByAgence(String agence) {
        return ecartSoldeRepository.findByAgence(agence).stream()
                .map(this::convertToModel)
                .collect(Collectors.toList());
    }
    
    public List<EcartSolde> getEcartSoldesByService(String service) {
        return ecartSoldeRepository.findByService(service).stream()
                .map(this::convertToModel)
                .collect(Collectors.toList());
    }
    
    public List<EcartSolde> getEcartSoldesByPays(String pays) {
        return ecartSoldeRepository.findByPays(pays).stream()
                .map(this::convertToModel)
                .collect(Collectors.toList());
    }
    
    public List<EcartSolde> getEcartSoldesByStatut(String statut) {
        return ecartSoldeRepository.findByStatut(statut).stream()
                .map(this::convertToModel)
                .collect(Collectors.toList());
    }
    
    public List<EcartSolde> getEcartSoldesByDateRange(LocalDateTime dateDebut, LocalDateTime dateFin) {
        return ecartSoldeRepository.findByDateTransactionBetween(dateDebut, dateFin).stream()
                .map(this::convertToModel)
                .collect(Collectors.toList());
    }
    
    public List<String> getDistinctAgences() {
        return ecartSoldeRepository.findDistinctAgence();
    }
    
    public List<String> getDistinctServices() {
        return ecartSoldeRepository.findDistinctService();
    }
    
    public List<String> getDistinctPays() {
        return ecartSoldeRepository.findDistinctPays();
    }
    
    @Transactional
    public EcartSolde createEcartSolde(EcartSolde ecartSolde) {
        EcartSoldeEntity entity = convertToEntity(ecartSolde);
        entity = ecartSoldeRepository.save(entity);
        
        // SUPPRIMÉ: Création automatique des frais de transaction pour les écarts de solde
        // createFraisTransactionForEcartSolde(entity);
        
        return convertToModel(entity);
    }
    
    @Transactional
    public List<EcartSolde> createMultipleEcartSoldes(List<EcartSolde> ecartSoldes) {
        List<EcartSoldeEntity> entities = ecartSoldes.stream()
                .map(this::convertToEntity)
                .collect(Collectors.toList());
        
        List<EcartSoldeEntity> savedEntities = ecartSoldeRepository.saveAll(entities);
        
        // SUPPRIMÉ: Création automatique des frais de transaction pour les écarts de solde
        // for (EcartSoldeEntity savedEntity : savedEntities) {
        //     createFraisTransactionForEcartSolde(savedEntity);
        // }
        
        return savedEntities.stream()
                .map(this::convertToModel)
                .collect(Collectors.toList());
    }
    
    @Transactional
    public EcartSolde updateEcartSolde(Long id, EcartSolde ecartSolde) {
        EcartSoldeEntity entity = ecartSoldeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Écart de solde non trouvé"));
        
        entity.setIdTransaction(ecartSolde.getIdTransaction());
        entity.setTelephoneClient(ecartSolde.getTelephoneClient());
        entity.setMontant(ecartSolde.getMontant());
        entity.setService(ecartSolde.getService());
        entity.setAgence(ecartSolde.getAgence());
        entity.setDateTransaction(ecartSolde.getDateTransaction());
        entity.setNumeroTransGu(ecartSolde.getNumeroTransGu());
        entity.setPays(ecartSolde.getPays());
        entity.setStatut(ecartSolde.getStatut());
        entity.setCommentaire(ecartSolde.getCommentaire());
        
        entity = ecartSoldeRepository.save(entity);
        return convertToModel(entity);
    }
    
    @Transactional
    public boolean deleteEcartSolde(Long id) {
        if (ecartSoldeRepository.existsById(id)) {
            ecartSoldeRepository.deleteById(id);
            return true;
        }
        return false;
    }
    
    @Transactional
    public boolean updateStatut(Long id, String nouveauStatut) {
        System.out.println("=== DÉBUT updateStatut ===");
        System.out.println("DEBUG: ID: " + id);
        System.out.println("DEBUG: Nouveau statut: " + nouveauStatut);
        
        try {
            EcartSoldeEntity entity = ecartSoldeRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Écart de solde non trouvé"));
            
            System.out.println("DEBUG: Entité trouvée - ID: " + entity.getId());
            System.out.println("DEBUG: Ancien statut: " + entity.getStatut());
            
            entity.setStatut(nouveauStatut);
            System.out.println("DEBUG: Nouveau statut défini: " + entity.getStatut());
            
            EcartSoldeEntity savedEntity = ecartSoldeRepository.save(entity);
            System.out.println("DEBUG: Entité sauvegardée - ID: " + savedEntity.getId());
            System.out.println("DEBUG: Statut final: " + savedEntity.getStatut());
            
            System.out.println("=== FIN updateStatut - SUCCÈS ===");
            return true;
        } catch (Exception e) {
            System.out.println("=== ERREUR updateStatut ===");
            System.out.println("DEBUG: Exception: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }

    @Transactional
    public boolean updateStatutWithComment(Long id, String nouveauStatut, String commentaire) {
        System.out.println("=== DÉBUT updateStatutWithComment ===");
        System.out.println("DEBUG: ID: " + id);
        System.out.println("DEBUG: Nouveau statut: " + nouveauStatut);
        System.out.println("DEBUG: Commentaire: " + commentaire);
        
        try {
            EcartSoldeEntity entity = ecartSoldeRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Écart de solde non trouvé"));
            
            System.out.println("DEBUG: Entité trouvée - ID: " + entity.getId());
            System.out.println("DEBUG: Ancien statut: " + entity.getStatut());
            System.out.println("DEBUG: Ancien commentaire: " + entity.getCommentaire());
            
            entity.setStatut(nouveauStatut);
            entity.setCommentaire(commentaire);
            System.out.println("DEBUG: Nouveau statut défini: " + entity.getStatut());
            System.out.println("DEBUG: Nouveau commentaire défini: " + entity.getCommentaire());
            
            EcartSoldeEntity savedEntity = ecartSoldeRepository.save(entity);
            System.out.println("DEBUG: Entité sauvegardée - ID: " + savedEntity.getId());
            System.out.println("DEBUG: Statut final: " + savedEntity.getStatut());
            System.out.println("DEBUG: Commentaire final: " + savedEntity.getCommentaire());
            
            System.out.println("=== FIN updateStatutWithComment - SUCCÈS ===");
            return true;
        } catch (Exception e) {
            System.out.println("=== ERREUR updateStatutWithComment ===");
            System.out.println("DEBUG: Exception: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }
    
    @Transactional
    public List<EcartSolde> uploadCsvFile(MultipartFile file) throws IOException {
        List<EcartSolde> ecartSoldes = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.S");
        
        String fileName = file.getOriginalFilename().toLowerCase();
        
        if (fileName.endsWith(".csv")) {
            // Traitement des fichiers CSV
            try (BufferedReader br = new BufferedReader(new InputStreamReader(file.getInputStream()))) {
                String line;
                boolean isFirstLine = true;
                
                while ((line = br.readLine()) != null) {
                    if (isFirstLine) {
                        // Ignorer l'en-tête
                        isFirstLine = false;
                        continue;
                    }
                    
                    // Traiter la ligne de données
                    String[] values = line.split(";");
                    if (values.length >= 9) {
                        try {
                            EcartSolde ecartSolde = parseEcartSoldeFromValues(values, formatter);
                            ecartSoldes.add(ecartSolde);
                        } catch (Exception e) {
                            // Ignorer les lignes avec des erreurs de parsing
                            System.err.println("Erreur lors du parsing de la ligne CSV: " + line + " - " + e.getMessage());
                        }
                    }
                }
            }
        } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
            // Traitement des fichiers Excel
            try (Workbook workbook = WorkbookFactory.create(file.getInputStream())) {
                Sheet sheet = workbook.getSheetAt(0); // Première feuille
                
                for (int i = 1; i <= sheet.getLastRowNum(); i++) { // Commencer à 1 pour ignorer l'en-tête
                    Row row = sheet.getRow(i);
                    if (row != null) {
                        try {
                            EcartSolde ecartSolde = parseEcartSoldeFromExcelRow(row, formatter);
                            ecartSoldes.add(ecartSolde);
                        } catch (Exception e) {
                            // Ignorer les lignes avec des erreurs de parsing
                            System.err.println("Erreur lors du parsing de la ligne Excel " + (i + 1) + " - " + e.getMessage());
                        }
                    }
                }
            }
        }
        
        // Sauvegarder tous les écarts de solde
        List<EcartSoldeEntity> entities = ecartSoldes.stream()
                .map(this::convertToEntity)
                .collect(Collectors.toList());
        
        List<EcartSoldeEntity> savedEntities = ecartSoldeRepository.saveAll(entities);
        
        // SUPPRIMÉ: Création automatique des frais de transaction pour les écarts de solde
        // for (EcartSoldeEntity savedEntity : savedEntities) {
        //     createFraisTransactionForEcartSolde(savedEntity);
        // }
        
        return savedEntities.stream()
                .map(this::convertToModel)
                .collect(Collectors.toList());
    }
    
    public Map<String, Object> validateFile(MultipartFile file) throws IOException {
        List<EcartSolde> ecartSoldes = new ArrayList<>();
        List<String> errors = new ArrayList<>();
        int validLines = 0;
        int errorLines = 0;
        int duplicates = 0;
        int newRecords = 0;
        
        System.out.println("=== DÉBUT validateFile ===");
        System.out.println("DEBUG: Nom du fichier: " + file.getOriginalFilename());
        System.out.println("DEBUG: Taille du fichier: " + file.getSize() + " bytes");
        
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.S");
        String fileName = file.getOriginalFilename().toLowerCase();
        
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
                            
                            if (values.length >= 9) {
                                EcartSolde ecartSolde = parseEcartSoldeFromValues(values, formatter);
                                
                                // Vérifier les doublons
                                if (isDuplicate(ecartSolde)) {
                                    duplicates++;
                                    errors.add("Ligne " + lineNumber + ": Doublon détecté pour ID " + ecartSolde.getIdTransaction());
                                    System.out.println("DEBUG: Doublon détecté pour ID: " + ecartSolde.getIdTransaction());
                                } else {
                                    newRecords++;
                                    ecartSoldes.add(ecartSolde);
                                    System.out.println("DEBUG: Nouvel enregistrement ajouté pour ID: " + ecartSolde.getIdTransaction());
                                }
                                validLines++;
                            } else {
                                errorLines++;
                                errors.add("Ligne " + lineNumber + ": Nombre de colonnes insuffisant (" + values.length + " au lieu de 9)");
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
                                EcartSolde ecartSolde = parseEcartSoldeFromExcelRow(row, formatter);
                                
                                // Vérifier les doublons
                                if (isDuplicate(ecartSolde)) {
                                    duplicates++;
                                    errors.add("Ligne " + (i + 1) + ": Doublon détecté pour ID " + ecartSolde.getIdTransaction());
                                    System.out.println("DEBUG: Doublon détecté pour ID: " + ecartSolde.getIdTransaction());
                                } else {
                                    newRecords++;
                                    ecartSoldes.add(ecartSolde);
                                    System.out.println("DEBUG: Nouvel enregistrement ajouté pour ID: " + ecartSolde.getIdTransaction());
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
            } else {
                errors.add("Format de fichier non supporté: " + fileName);
                System.out.println("DEBUG: Format non supporté: " + fileName);
            }
        } catch (Exception e) {
            System.out.println("DEBUG: Exception générale dans validateFile: " + e.getMessage());
            e.printStackTrace();
            errors.add("Erreur générale lors de la validation: " + e.getMessage());
        }
        
        System.out.println("DEBUG: Résultats finaux:");
        System.out.println("  - Lignes valides: " + validLines);
        System.out.println("  - Lignes avec erreurs: " + errorLines);
        System.out.println("  - Doublons: " + duplicates);
        System.out.println("  - Nouveaux enregistrements: " + newRecords);
        System.out.println("=== FIN validateFile ===");
        
        return Map.of(
            "validLines", validLines,
            "errorLines", errorLines,
            "duplicates", duplicates,
            "newRecords", newRecords,
            "hasErrors", errorLines > 0 || duplicates > 0,
            "errors", errors
        );
    }
    
    private boolean isDuplicate(EcartSolde ecartSolde) {
        // Vérifier si un enregistrement avec le même IDTransaction existe déjà
        if (ecartSolde.getIdTransaction() == null || ecartSolde.getIdTransaction().trim().isEmpty()) {
            System.out.println("DEBUG: IDTransaction null ou vide, pas de vérification de doublon");
            return false;
        }
        
        try {
            boolean exists = ecartSoldeRepository.existsByIdTransaction(ecartSolde.getIdTransaction());
            System.out.println("DEBUG: Vérification doublon pour ID " + ecartSolde.getIdTransaction() + " -> " + exists);
            return exists;
        } catch (Exception e) {
            System.out.println("DEBUG: Erreur lors de la vérification de doublon: " + e.getMessage());
            e.printStackTrace();
            return false;
        }
    }
    
    private EcartSolde parseEcartSoldeFromValues(String[] values, DateTimeFormatter formatter) {
        try {
            EcartSolde ecartSolde = new EcartSolde();
            
            // Vérifier que nous avons assez de colonnes
            if (values.length < 9) {
                throw new IllegalArgumentException("Nombre de colonnes insuffisant: " + values.length + " (attendu: 9)");
            }
            
            ecartSolde.setIdTransaction(values[1] != null ? values[1].trim() : "");
            ecartSolde.setTelephoneClient(values[2] != null ? values[2].trim() : "");
            
            // Parser le montant
            if (values[3] != null && !values[3].trim().isEmpty()) {
                try {
                    ecartSolde.setMontant(Double.parseDouble(values[3].trim()));
                } catch (NumberFormatException e) {
                    throw new IllegalArgumentException("Montant invalide: " + values[3]);
                }
            } else {
                ecartSolde.setMontant(0.0);
            }
            
            ecartSolde.setService(values[4] != null ? values[4].trim() : "");
            ecartSolde.setAgence(values[5] != null ? values[5].trim() : "");
            
            // Parser la date
            if (values[6] != null && !values[6].trim().isEmpty()) {
                try {
                    String dateStr = values[6].trim();
                    LocalDateTime dateTransaction = LocalDateTime.parse(dateStr, formatter);
                    ecartSolde.setDateTransaction(dateTransaction);
                } catch (Exception e) {
                    throw new IllegalArgumentException("Date invalide: " + values[6] + " - " + e.getMessage());
                }
            } else {
                ecartSolde.setDateTransaction(LocalDateTime.now());
            }
            
            ecartSolde.setNumeroTransGu(values[7] != null ? values[7].trim() : "");
            ecartSolde.setPays(values[8] != null ? values[8].trim() : "");
            ecartSolde.setStatut("EN_ATTENTE");
            ecartSolde.setDateImport(LocalDateTime.now());
            
            return ecartSolde;
        } catch (Exception e) {
            System.out.println("DEBUG: Erreur parsing valeurs: " + e.getMessage());
            throw e;
        }
    }
    
    private EcartSolde parseEcartSoldeFromExcelRow(Row row, DateTimeFormatter formatter) {
        EcartSolde ecartSolde = new EcartSolde();
        
        // Lire les cellules Excel (commencer à l'index 1 pour ignorer la première colonne)
        ecartSolde.setIdTransaction(getCellValueAsString(row.getCell(1))); // IDTransaction
        ecartSolde.setTelephoneClient(getCellValueAsString(row.getCell(2))); // téléphone client
        ecartSolde.setMontant(getCellValueAsDouble(row.getCell(3))); // montant
        ecartSolde.setService(getCellValueAsString(row.getCell(4))); // Service
        ecartSolde.setAgence(getCellValueAsString(row.getCell(5))); // Agence
        
        // Parser la date
        String dateStr = getCellValueAsString(row.getCell(6));
        LocalDateTime dateTransaction = LocalDateTime.parse(dateStr, formatter);
        ecartSolde.setDateTransaction(dateTransaction);
        
        ecartSolde.setNumeroTransGu(getCellValueAsString(row.getCell(7))); // Numéro Trans GU
        ecartSolde.setPays(getCellValueAsString(row.getCell(8))); // PAYS
        ecartSolde.setStatut("EN_ATTENTE");
        ecartSolde.setDateImport(LocalDateTime.now());
        
        return ecartSolde;
    }
    
    private String getCellValueAsString(Cell cell) {
        if (cell == null) return "";
        
        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue().trim();
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell)) {
                    return cell.getLocalDateTimeCellValue().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.S"));
                } else {
                    return String.valueOf((long) cell.getNumericCellValue());
                }
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            case FORMULA:
                return cell.getCellFormula();
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
            case FORMULA:
                try {
                    return cell.getNumericCellValue();
                } catch (Exception e) {
                    return 0.0;
                }
            default:
                return 0.0;
        }
    }
    
    /**
     * SUPPRIMÉ: Création automatique des frais de transaction pour un écart de solde
     * Cette méthode a été supprimée car les frais ne doivent pas être générés automatiquement
     * pour les écarts de solde selon la demande de l'utilisateur.
     */
    // private void createFraisTransactionForEcartSolde(EcartSoldeEntity ecartSolde) {
    //     // MÉTHODE SUPPRIMÉE
    // }
    
    private EcartSolde convertToModel(EcartSoldeEntity entity) {
        return new EcartSolde(
                entity.getId(),
                entity.getIdTransaction(),
                entity.getTelephoneClient(),
                entity.getMontant(),
                entity.getService(),
                entity.getAgence(),
                entity.getDateTransaction(),
                entity.getNumeroTransGu(),
                entity.getPays(),
                entity.getDateImport(),
                entity.getStatut(),
                entity.getCommentaire()
        );
    }
    
    private EcartSoldeEntity convertToEntity(EcartSolde model) {
        EcartSoldeEntity entity = new EcartSoldeEntity();
        entity.setId(model.getId());
        entity.setIdTransaction(model.getIdTransaction());
        entity.setTelephoneClient(model.getTelephoneClient());
        entity.setMontant(model.getMontant());
        entity.setService(model.getService());
        entity.setAgence(model.getAgence());
        entity.setDateTransaction(model.getDateTransaction());
        entity.setNumeroTransGu(model.getNumeroTransGu());
        entity.setPays(model.getPays());
        entity.setDateImport(model.getDateImport());
        entity.setStatut(model.getStatut());
        entity.setCommentaire(model.getCommentaire());
        return entity;
    }
} 