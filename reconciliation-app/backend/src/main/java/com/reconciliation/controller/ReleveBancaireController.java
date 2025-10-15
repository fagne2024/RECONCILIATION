package com.reconciliation.controller;

import com.reconciliation.service.ReleveBancaireImportService;
import com.reconciliation.repository.ReleveBancaireRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.RequestMethod;

import java.util.List;

@RestController
@RequestMapping("/api/releve-bancaire")
@CrossOrigin(origins = {"*"}, allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.OPTIONS}, allowCredentials = "false")
public class ReleveBancaireController {

    @Autowired
    private ReleveBancaireImportService importService;
    @Autowired
    private ReleveBancaireRepository repository;
    @Autowired
    private ReleveBancaireImportService importServiceService;

    @PostMapping(value = "/upload", consumes = {"multipart/form-data"})
    public ResponseEntity<java.util.Map<String, Object>> upload(@RequestParam("file") MultipartFile file) {
        try {
            var result = importService.parseFileWithAlerts(file);
            // Persiste sans impacts
            String batchId = java.util.UUID.randomUUID().toString();
            var entities = importService.toEntities(result.rows, file.getOriginalFilename());
            for (var e : entities) { e.setBatchId(batchId); }
            repository.saveAll(entities);
            java.util.Map<String, Object> payload = new java.util.HashMap<>();
            payload.put("batchId", batchId);
            payload.put("rows", result.rows);
            payload.put("count", result.rows.size());
            payload.put("totalRead", result.totalRead);
            payload.put("duplicatesIgnored", result.duplicatesIgnored);
            payload.put("unmappedHeaders", result.unmappedHeaders);
            return ResponseEntity.ok(payload);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/list")
    public ResponseEntity<List<com.reconciliation.entity.ReleveBancaireEntity>> list(@RequestParam(value = "batchId", required = false) String batchId) {
        if (batchId == null || batchId.isBlank()) {
            return ResponseEntity.ok(repository.findAll());
        }
        return ResponseEntity.ok(repository.findAll().stream().filter(e -> batchId.equals(e.getBatchId())).toList());
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable("id") Long id, @RequestBody com.reconciliation.entity.ReleveBancaireEntity payload) {
        var opt = repository.findById(id);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        var entity = opt.get();
        // Champs éditables
        entity.setNumeroCompte(payload.getNumeroCompte());
        entity.setNomCompte(payload.getNomCompte());
        entity.setBanque(payload.getBanque());
        entity.setDateComptable(payload.getDateComptable());
        entity.setDateValeur(payload.getDateValeur());
        entity.setLibelle(payload.getLibelle());
        entity.setDebit(payload.getDebit());
        entity.setCredit(payload.getCredit());
        entity.setMontant(payload.getMontant());
        entity.setNumeroCheque(payload.getNumeroCheque());
        entity.setDevise(payload.getDevise());
        entity.setSoldeCourant(payload.getSoldeCourant());
        entity.setSoldeDisponibleCloture(payload.getSoldeDisponibleCloture());
        entity.setSoldeDisponibleOuverture(payload.getSoldeDisponibleOuverture());
        entity.setSoldeComptableOuverture(payload.getSoldeComptableOuverture());
        entity.setSoldeComptableCloture(payload.getSoldeComptableCloture());
        entity.setDepotTotal(payload.getDepotTotal());
        entity.setTotalRetraits(payload.getTotalRetraits());
        // Non modifiés: id, uploadedAt, batchId, sourceFilename
        repository.save(entity);
        return ResponseEntity.ok(entity);
    }

    @PutMapping("/{id}/recon-status")
    public ResponseEntity<?> updateReconStatus(@PathVariable("id") Long id, @RequestParam("status") String status) {
        var opt = repository.findById(id);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();
        var entity = opt.get();
        entity.setReconStatus(status);
        repository.save(entity);
        return ResponseEntity.ok().build();
    }

    @GetMapping(value = "/template", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public ResponseEntity<byte[]> downloadTemplate() {
        try {
            // Générer un classeur simple avec entêtes standard
            org.apache.poi.ss.usermodel.Workbook wb = new org.apache.poi.xssf.usermodel.XSSFWorkbook();
            org.apache.poi.ss.usermodel.Sheet sheet = wb.createSheet("Releve");
            String[] headers = new String[] {
                "Numero de compte", "Nom du compte", "Date comptable", "Date de valeur",
                "Libelle", "Debit", "Credit", "Montant", "Numero cheque", "Devise"
            };
            org.apache.poi.ss.usermodel.Row row0 = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                org.apache.poi.ss.usermodel.Cell cell = row0.createCell(i, org.apache.poi.ss.usermodel.CellType.STRING);
                cell.setCellValue(headers[i]);
                sheet.setColumnWidth(i, 20 * 256);
            }
            java.io.ByteArrayOutputStream bos = new java.io.ByteArrayOutputStream();
            wb.write(bos);
            wb.close();
            byte[] bytes = bos.toByteArray();
            return ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=modele-releve-bancaire.xlsx")
                    .body(bytes);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}


