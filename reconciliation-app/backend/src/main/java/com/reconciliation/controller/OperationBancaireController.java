package com.reconciliation.controller;

import com.reconciliation.model.OperationBancaire;
import com.reconciliation.service.OperationBancaireService;
import com.reconciliation.dto.OperationBancaireCreateRequest;
import com.reconciliation.dto.OperationBancaireUpdateRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/operations-bancaires")
@CrossOrigin(origins = "http://localhost:4200")
public class OperationBancaireController {
    
    @Autowired
    private OperationBancaireService operationBancaireService;
    @Autowired
    private com.reconciliation.service.OperationBancaireImportService importService;
    @Autowired
    private com.reconciliation.repository.OperationBancaireRepository operationBancaireRepository;
    @Autowired
    private com.reconciliation.service.OperationService operationService;
    
    
    // Récupérer toutes les opérations bancaires
    @GetMapping
    public ResponseEntity<List<OperationBancaire>> getAllOperationsBancaires() {
        List<OperationBancaire> operations = operationBancaireService.getAllOperationsBancaires();
        return ResponseEntity.ok(operations);
    }

    // Mise à jour en lot des statuts
    @PutMapping("/bulk-statut")
    public ResponseEntity<Integer> bulkUpdateStatut(@RequestBody com.reconciliation.dto.BulkUpdateStatutRequest request) {
        int updated = operationBancaireService.bulkUpdateStatut(request.getIds(), request.getStatut());
        return ResponseEntity.ok(updated);
    }
    
    // Récupérer une opération bancaire par ID
    @GetMapping("/{id}")
    public ResponseEntity<OperationBancaire> getOperationBancaireById(@PathVariable Long id) {
        Optional<OperationBancaire> operation = operationBancaireService.getOperationBancaireById(id);
        return operation.map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    // Récupérer les opérations bancaires par pays
    @GetMapping("/pays/{pays}")
    public ResponseEntity<List<OperationBancaire>> getOperationsBancairesByPays(@PathVariable String pays) {
        List<OperationBancaire> operations = operationBancaireService.getOperationsBancairesByPays(pays);
        return ResponseEntity.ok(operations);
    }
    
    // Récupérer les opérations bancaires par agence
    @GetMapping("/agence/{agence}")
    public ResponseEntity<List<OperationBancaire>> getOperationsBancairesByAgence(@PathVariable String agence) {
        List<OperationBancaire> operations = operationBancaireService.getOperationsBancairesByAgence(agence);
        return ResponseEntity.ok(operations);
    }
    
    // Récupérer les opérations bancaires par statut
    @GetMapping("/statut/{statut}")
    public ResponseEntity<List<OperationBancaire>> getOperationsBancairesByStatut(@PathVariable String statut) {
        List<OperationBancaire> operations = operationBancaireService.getOperationsBancairesByStatut(statut);
        return ResponseEntity.ok(operations);
    }
    
    // Récupérer les opérations bancaires par plage de dates
    @GetMapping("/date-range")
    public ResponseEntity<List<OperationBancaire>> getOperationsBancairesByDateRange(
            @RequestParam String dateDebut,
            @RequestParam String dateFin) {
        LocalDateTime debut = LocalDateTime.parse(dateDebut);
        LocalDateTime fin = LocalDateTime.parse(dateFin);
        List<OperationBancaire> operations = operationBancaireService.getOperationsBancairesByDateRange(debut, fin);
        return ResponseEntity.ok(operations);
    }
    
    // Filtrer les opérations bancaires
    @GetMapping("/filter")
    public ResponseEntity<List<OperationBancaire>> filterOperationsBancaires(
            @RequestParam(required = false) String pays,
            @RequestParam(required = false) String codePays,
            @RequestParam(required = false) String mois,
            @RequestParam(required = false) String agence,
            @RequestParam(required = false) String typeOperation,
            @RequestParam(required = false) String statut,
            @RequestParam(required = false) String dateDebut,
            @RequestParam(required = false) String dateFin,
            @RequestParam(required = false) String reference) {
        
        LocalDateTime debut = null;
        LocalDateTime fin = null;
        
        if (dateDebut != null && !dateDebut.isEmpty()) {
            debut = LocalDateTime.parse(dateDebut);
        }
        if (dateFin != null && !dateFin.isEmpty()) {
            fin = LocalDateTime.parse(dateFin);
        }
        
        List<OperationBancaire> operations = operationBancaireService.filterOperationsBancaires(
                pays, codePays, mois, agence, typeOperation, statut, debut, fin, reference);
        return ResponseEntity.ok(operations);
    }
    
    // Créer une nouvelle opération bancaire
    @PostMapping
    public ResponseEntity<OperationBancaire> createOperationBancaire(@RequestBody OperationBancaireCreateRequest request) {
        try {
            OperationBancaire operation = operationBancaireService.createOperationBancaire(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(operation);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    // Mettre à jour une opération bancaire
    @PutMapping("/{id}")
    public ResponseEntity<OperationBancaire> updateOperationBancaire(
            @PathVariable Long id,
            @RequestBody OperationBancaireUpdateRequest request) {
        try {
            OperationBancaire operation = operationBancaireService.updateOperationBancaire(id, request);
            return ResponseEntity.ok(operation);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    // Supprimer une opération bancaire
    @DeleteMapping("/{id}")
    public ResponseEntity<Boolean> deleteOperationBancaire(@PathVariable Long id) {
        boolean deleted = operationBancaireService.deleteOperationBancaire(id);
        if (deleted) {
            return ResponseEntity.ok(true);
        }
        return ResponseEntity.notFound().build();
    }
    
    // Récupérer les opérations bancaires récentes
    @GetMapping("/recent")
    public ResponseEntity<List<OperationBancaire>> getRecentOperationsBancaires(
            @RequestParam(defaultValue = "10") int limit) {
        List<OperationBancaire> operations = operationBancaireService.getAllOperationsBancaires();
        if (operations.size() > limit) {
            operations = operations.subList(0, limit);
        }
        return ResponseEntity.ok(operations);
    }
    
    // Récupérer la liste des pays distincts
    @GetMapping("/pays/list")
    public ResponseEntity<List<String>> getDistinctPays() {
        List<String> pays = operationBancaireService.getDistinctPays();
        return ResponseEntity.ok(pays);
    }
    
    // Récupérer la liste des agences distinctes
    @GetMapping("/agence/list")
    public ResponseEntity<List<String>> getDistinctAgences() {
        List<String> agences = operationBancaireService.getDistinctAgences();
        return ResponseEntity.ok(agences);
    }
    
    // Récupérer la liste des types d'opération distincts
    @GetMapping("/type-operation/list")
    public ResponseEntity<List<String>> getDistinctTypesOperation() {
        List<String> types = operationBancaireService.getDistinctTypesOperation();
        return ResponseEntity.ok(types);
    }

    // Mettre à jour le recon_status (OK/KO)
    @PutMapping("/{id}/recon-status")
    public ResponseEntity<?> updateReconStatus(@PathVariable Long id, @RequestParam("status") String status) {
        return operationBancaireRepository.findById(id)
                .map(entity -> {
                    entity.setReconStatus(status);
                    operationBancaireRepository.save(entity);
                    return ResponseEntity.ok().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // Mettre à jour le statut d'une opération bancaire
    @PutMapping("/{id}/statut")
    public ResponseEntity<?> updateStatut(@PathVariable Long id, @RequestBody String nouveauStatut) {
        return operationBancaireRepository.findById(id)
                .map(entity -> {
                    System.out.println("🔍 Opération bancaire ID: " + id + ", Statut actuel: " + entity.getStatut() + ", Nouveau statut: " + nouveauStatut);
                    
                    // Vérifier si le statut actuel n'est pas déjà "Validée"
                    if (!"Validée".equals(entity.getStatut())) {
                        System.out.println("✅ Mise à jour du statut de l'opération bancaire " + id + " vers " + nouveauStatut);
                        entity.setStatut(nouveauStatut);
                        operationBancaireRepository.save(entity);
                        
                        // Si l'opération bancaire est liée à une opération, mettre à jour le statut de l'opération
                        if (entity.getOperationId() != null) {
                            try {
                                System.out.println("🔗 Mise à jour de l'opération liée ID: " + entity.getOperationId());
                                // Utiliser le service OperationService pour mettre à jour le statut et appliquer l'impact
                                boolean updated = operationService.updateOperationStatut(entity.getOperationId(), nouveauStatut);
                                System.out.println("📊 Résultat de la mise à jour de l'opération: " + updated);
                            } catch (Exception e) {
                                // Log l'erreur mais ne pas faire échouer la mise à jour du statut bancaire
                                System.err.println("❌ Erreur lors de la mise à jour du statut de l'opération liée: " + e.getMessage());
                                e.printStackTrace();
                            }
                        } else {
                            System.out.println("⚠️ Aucune opération liée trouvée pour l'opération bancaire " + id);
                        }
                    } else {
                        System.out.println("ℹ️ L'opération bancaire " + id + " est déjà au statut 'Validée' - Aucune action nécessaire");
                        // Si déjà validée, on ne fait rien (pas d'impact supplémentaire)
                    }
                    return ResponseEntity.ok().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
    // Import Excel/CSV d'opérations bancaires
    @PostMapping(value = "/upload", consumes = {"multipart/form-data"})
    public ResponseEntity<java.util.Map<String, Object>> upload(@RequestParam("file") MultipartFile file) {
        try {
            var res = importService.importFile(file);
            java.util.Map<String, Object> payload = new java.util.HashMap<>();
            payload.put("totalRead", res.totalRead);
            payload.put("saved", res.saved);
            payload.put("errors", res.errors);
            return ResponseEntity.ok(payload);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    // Télécharger le modèle Excel à utiliser
    @GetMapping(value = "/template", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public ResponseEntity<byte[]> downloadTemplate() {
        try {
            byte[] bytes = importService.generateTemplate();
            return ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=modele-operations-bancaires.xlsx")
                    .body(bytes);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}

