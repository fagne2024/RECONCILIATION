package com.reconciliation.service;

import com.reconciliation.entity.SopDocumentEntity;
import com.reconciliation.repository.SopDocumentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Optional;

@Service
public class SopDocumentService {

    @Autowired
    private SopDocumentRepository sopDocumentRepository;

    public boolean documentExists(String nodeId, String optionType) {
        return sopDocumentRepository.existsByNodeIdAndOptionType(nodeId, optionType);
    }

    public Optional<SopDocumentEntity> getDocument(String nodeId, String optionType) {
        return sopDocumentRepository.findByNodeIdAndOptionType(nodeId, optionType);
    }

    public SopDocumentEntity saveDocument(String nodeId, String optionType, MultipartFile file, String extractedText) throws IOException {
        SopDocumentEntity document = sopDocumentRepository.findByNodeIdAndOptionType(nodeId, optionType)
                .orElse(new SopDocumentEntity(nodeId, optionType));

        document.setFileName(file.getOriginalFilename());
        document.setFileType(getFileType(file.getOriginalFilename()));
        document.setFileContent(file.getBytes());
        document.setExtractedText(extractedText);

        return sopDocumentRepository.save(document);
    }

    public SopDocumentEntity updateDocument(String nodeId, String optionType, MultipartFile file, String extractedText) throws IOException {
        Optional<SopDocumentEntity> documentOpt = sopDocumentRepository.findByNodeIdAndOptionType(nodeId, optionType);
        
        if (documentOpt.isEmpty()) {
            throw new IllegalArgumentException("Document non trouvé pour nodeId: " + nodeId + " et optionType: " + optionType);
        }

        SopDocumentEntity document = documentOpt.orElseThrow();
        
        if (file != null && !file.isEmpty()) {
            document.setFileName(file.getOriginalFilename());
            document.setFileType(getFileType(file.getOriginalFilename()));
            document.setFileContent(file.getBytes());
        }
        
        if (extractedText != null) {
            document.setExtractedText(extractedText);
        }

        return sopDocumentRepository.save(document);
    }

    @Transactional
    public boolean deleteDocument(String nodeId, String optionType) {
        Optional<SopDocumentEntity> documentOpt = sopDocumentRepository.findByNodeIdAndOptionType(nodeId, optionType);
        if (documentOpt.isPresent()) {
            SopDocumentEntity document = documentOpt.get();
            Long documentId = document.getId();
            sopDocumentRepository.deleteById(documentId);
            sopDocumentRepository.flush(); // Forcer la synchronisation avec la base de données
            // Vérifier que la suppression a bien eu lieu
            return !sopDocumentRepository.existsById(documentId);
        }
        return false;
    }

    private String getFileType(String fileName) {
        if (fileName == null) {
            return "unknown";
        }
        String lower = fileName.toLowerCase();
        if (lower.endsWith(".pdf")) {
            return "pdf";
        } else if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".gif")) {
            return "image";
        } else if (lower.endsWith(".doc") || lower.endsWith(".docx")) {
            return "document";
        }
        return "unknown";
    }
}

