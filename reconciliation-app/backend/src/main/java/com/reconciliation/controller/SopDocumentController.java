package com.reconciliation.controller;

import com.reconciliation.entity.SopDocumentEntity;
import com.reconciliation.service.SopDocumentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/sop-documents")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class SopDocumentController {

    @Autowired
    private SopDocumentService sopDocumentService;

    @GetMapping("/exists")
    public ResponseEntity<Map<String, Object>> checkDocumentExists(
            @RequestParam String nodeId,
            @RequestParam String optionType) {
        boolean exists = sopDocumentService.documentExists(nodeId, optionType);
        Map<String, Object> response = new HashMap<>();
        response.put("exists", exists);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/content")
    public ResponseEntity<Map<String, Object>> getDocumentContent(
            @RequestParam String nodeId,
            @RequestParam String optionType) {
        Optional<SopDocumentEntity> documentOpt = sopDocumentService.getDocument(nodeId, optionType);
        
        if (documentOpt.isPresent()) {
            SopDocumentEntity document = documentOpt.get();
            Map<String, Object> response = new HashMap<>();
            response.put("exists", true);
            response.put("fileName", document.getFileName());
            response.put("fileType", document.getFileType());
            response.put("extractedText", document.getExtractedText());
            response.put("createdAt", document.getCreatedAt());
            return ResponseEntity.ok(response);
        } else {
            Map<String, Object> response = new HashMap<>();
            response.put("exists", false);
            return ResponseEntity.ok(response);
        }
    }

    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam String nodeId,
            @RequestParam String optionType,
            @RequestParam(required = false) String extractedText) {
        try {
            if (file.isEmpty()) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", "Le fichier est vide");
                return ResponseEntity.badRequest().body(error);
            }

            SopDocumentEntity savedDocument = sopDocumentService.saveDocument(
                    nodeId, 
                    optionType, 
                    file, 
                    extractedText != null ? extractedText : ""
            );

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Document uploadé avec succès");
            response.put("documentId", savedDocument.getId());
            response.put("fileName", savedDocument.getFileName());
            response.put("extractedText", savedDocument.getExtractedText());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Erreur lors de l'upload: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @GetMapping("/download")
    public ResponseEntity<byte[]> downloadDocument(
            @RequestParam String nodeId,
            @RequestParam String optionType) {
        Optional<SopDocumentEntity> documentOpt = sopDocumentService.getDocument(nodeId, optionType);
        
        if (documentOpt.isPresent()) {
            SopDocumentEntity document = documentOpt.get();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDispositionFormData("attachment", document.getFileName());
            return new ResponseEntity<>(document.getFileContent(), headers, HttpStatus.OK);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/update")
    public ResponseEntity<Map<String, Object>> updateDocument(
            @RequestParam String nodeId,
            @RequestParam String optionType,
            @RequestParam(required = false) MultipartFile file,
            @RequestParam(required = false) String extractedText) {
        try {
            SopDocumentEntity updatedDocument = sopDocumentService.updateDocument(
                    nodeId,
                    optionType,
                    file,
                    extractedText
            );

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Document modifié avec succès");
            response.put("documentId", updatedDocument.getId());
            response.put("fileName", updatedDocument.getFileName());
            response.put("extractedText", updatedDocument.getExtractedText());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Erreur lors de la modification: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @DeleteMapping("/delete")
    public ResponseEntity<Map<String, Object>> deleteDocument(
            @RequestParam String nodeId,
            @RequestParam String optionType) {
        try {
            boolean deleted = sopDocumentService.deleteDocument(nodeId, optionType);
            Map<String, Object> response = new HashMap<>();
            if (deleted) {
                response.put("success", true);
                response.put("message", "Document supprimé avec succès");
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("error", "Document non trouvé");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "Erreur lors de la suppression: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }
}

