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
    public ResponseEntity<List<ReleveBancaireRow>> upload(@RequestParam("file") MultipartFile file) {
        try {
            List<ReleveBancaireRow> rows = importService.parseFile(file);
            // Persiste sans impacts
            var entities = importService.toEntities(rows, file.getOriginalFilename());
            repository.saveAll(entities);
            return ResponseEntity.ok(rows);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
}


