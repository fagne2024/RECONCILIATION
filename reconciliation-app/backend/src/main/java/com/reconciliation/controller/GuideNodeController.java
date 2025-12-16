package com.reconciliation.controller;

import com.reconciliation.entity.GuideNodeEntity;
import com.reconciliation.service.GuideNodeService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/guide-nodes")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class GuideNodeController {

    @Autowired
    private GuideNodeService guideNodeService;

    @GetMapping("/structure")
    public ResponseEntity<Map<String, Object>> getStructure() {
        try {
            log.info("📋 Requête GET /api/guide-nodes/structure reçue");
            Map<String, Object> structure = guideNodeService.getStructure();
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("structure", structure);
            log.info("✅ Structure des guides retournée avec succès");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("❌ Erreur lors de la récupération de la structure: {}", e.getMessage(), e);
            try {
                Map<String, Object> defaultStructure = guideNodeService.getDefaultStructure();
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("structure", defaultStructure);
                response.put("warning", "Structure par défaut utilisée (base de données non disponible)");
                return ResponseEntity.ok(response);
            } catch (Exception fallbackError) {
                log.error("❌ Erreur même avec le fallback: {}", fallbackError.getMessage());
                Map<String, Object> error = new HashMap<>();
                error.put("success", false);
                error.put("error", "Erreur lors de la récupération de la structure: " + e.getMessage());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
            }
        }
    }

    @PostMapping("/create")
    public ResponseEntity<Map<String, Object>> createNode(
            @RequestParam String nodeId,
            @RequestParam String label,
            @RequestParam(required = false) String parentNodeId,
            @RequestParam(required = false) Integer displayOrder) {
        try {
            log.info("📝 Création nœud guide - nodeId: {}, label: {}, parentNodeId: {}", nodeId, label, parentNodeId);
            
            GuideNodeEntity createdNode = guideNodeService.createNode(nodeId, label, parentNodeId, displayOrder);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Guide créé avec succès");
            response.put("nodeId", createdNode.getNodeId());
            response.put("label", createdNode.getLabel());
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.error("❌ Erreur lors de la création: {}", e.getMessage());
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        } catch (Exception e) {
            log.error("❌ Erreur lors de la création: {}", e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "Erreur lors de la création: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @RequestMapping(value = "/update", method = {RequestMethod.PUT, RequestMethod.POST})
    public ResponseEntity<Map<String, Object>> updateNode(
            @RequestParam String nodeId,
            @RequestParam(required = false) String label,
            @RequestParam(required = false) String route,
            @RequestParam(required = false) String description) {
        try {
            log.info("📝 Requête PUT/POST /api/guide-nodes/update reçue - nodeId: {}, label: {}", nodeId, label);
            
            if (guideNodeService == null) {
                log.error("❌ GuideNodeService n'est pas injecté!");
                Map<String, Object> error = new HashMap<>();
                error.put("success", false);
                error.put("error", "Service non disponible");
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
            }
            
            GuideNodeEntity updatedNode = guideNodeService.updateNode(nodeId, label, route, description);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Guide modifié avec succès");
            response.put("nodeId", updatedNode.getNodeId());
            response.put("label", updatedNode.getLabel());
            log.info("✅ Guide mis à jour avec succès");
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.error("❌ Erreur lors de la mise à jour: {}", e.getMessage());
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        } catch (Exception e) {
            log.error("❌ Erreur lors de la mise à jour: {}", e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "Erreur lors de la mise à jour: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @DeleteMapping("/delete")
    public ResponseEntity<Map<String, Object>> deleteNode(@RequestParam String nodeId) {
        try {
            log.info("🗑️ Suppression nœud guide - nodeId: {}", nodeId);
            
            boolean deleted = guideNodeService.deleteNode(nodeId);
            
            Map<String, Object> response = new HashMap<>();
            if (deleted) {
                response.put("success", true);
                response.put("message", "Guide supprimé avec succès");
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("error", "Guide non trouvé");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
        } catch (IllegalArgumentException e) {
            log.error("❌ Erreur lors de la suppression: {}", e.getMessage());
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        } catch (Exception e) {
            log.error("❌ Erreur lors de la suppression: {}", e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "Erreur lors de la suppression: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @PostMapping("/initialize")
    public ResponseEntity<Map<String, Object>> initializeStructure() {
        try {
            log.info("🔧 Requête POST /api/guide-nodes/initialize reçue");
            guideNodeService.initializeDefaultStructure();
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Structure des guides initialisée avec succès");
            log.info("✅ Structure des guides initialisée");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("❌ Erreur lors de l'initialisation: {}", e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "Erreur lors de l'initialisation: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }
}
