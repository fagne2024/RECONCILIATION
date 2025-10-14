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
@CrossOrigin(origins = {"*"}, allowedHeaders = "*", methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.OPTIONS}, allowCredentials = "false")
public class ReleveBancaireController {

    @Autowired
    private ReleveBancaireImportService importService;
    @Autowired
    private ReleveBancaireRepository repository;

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
}


