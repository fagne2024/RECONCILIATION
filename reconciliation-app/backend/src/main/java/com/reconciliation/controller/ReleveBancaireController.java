package com.reconciliation.controller;

import com.reconciliation.dto.ReleveBancaireRow;
import com.reconciliation.service.ReleveBancaireImportService;
import com.reconciliation.repository.ReleveBancaireRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/releve-bancaire")
@CrossOrigin(origins = "*")
public class ReleveBancaireController {

    @Autowired
    private ReleveBancaireImportService importService;
    @Autowired
    private ReleveBancaireRepository repository;

    @PostMapping("/upload")
    public ResponseEntity<java.util.Map<String, Object>> upload(@RequestParam("file") MultipartFile file) {
        try {
            List<ReleveBancaireRow> rows = importService.parseFile(file);
            // Persiste sans impacts
            String batchId = java.util.UUID.randomUUID().toString();
            var entities = importService.toEntities(rows, file.getOriginalFilename());
            for (var e : entities) { e.setBatchId(batchId); }
            repository.saveAll(entities);
            java.util.Map<String, Object> payload = new java.util.HashMap<>();
            payload.put("batchId", batchId);
            payload.put("rows", rows);
            payload.put("count", rows.size());
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
}


