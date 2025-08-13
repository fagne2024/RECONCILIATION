package com.reconciliation.controller;

import com.reconciliation.model.Operation;
import com.reconciliation.service.OperationService;
import com.reconciliation.service.OperationBusinessService;
import com.reconciliation.dto.OperationUpdateRequest;
import com.reconciliation.dto.OperationCreateRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.HashMap;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/operations")
@CrossOrigin(origins = "http://localhost:4200")
public class OperationController {
    
    private static final Logger logger = LoggerFactory.getLogger(OperationController.class);
    
    @Autowired
    private OperationService operationService;
    
    @Autowired
    private OperationBusinessService operationBusinessService;
    
    @GetMapping
    public ResponseEntity<List<Operation>> getAllOperations() {
        List<Operation> operations = operationService.getAllOperations();
        return ResponseEntity.ok(operations);
    }
    
    @GetMapping("/with-frais")
    public ResponseEntity<List<Operation>> getAllOperationsWithFrais() {
        try {
            List<Operation> operations = operationService.getAllOperationsWithFrais();
            return ResponseEntity.ok(operations);
        } catch (Exception e) {
            logger.error("[API] Erreur dans /operations/with-frais: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<Operation> getOperationById(@PathVariable Long id) {
        Optional<Operation> operation = operationService.getOperationById(id);
        return operation.map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @GetMapping("/{id}/with-frais")
    public ResponseEntity<Operation> getOperationByIdWithFrais(@PathVariable Long id) {
        try {
            Optional<Operation> operation = operationService.getOperationByIdWithFrais(id);
            return operation.map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            logger.error("[API] Erreur dans /operations/{}/with-frais: {}", id, e.getMessage(), e);
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/compte/{compteId}")
    public ResponseEntity<List<Operation>> getOperationsByCompteId(@PathVariable Long compteId) {
        List<Operation> operations = operationService.getOperationsByCompteId(compteId);
        return ResponseEntity.ok(operations);
    }
    
    @GetMapping("/compte/numero")
    public ResponseEntity<List<Operation>> getOperationsByCompte(
            @RequestParam String numeroCompte,
            @RequestParam(required = false) String dateDebut,
            @RequestParam(required = false) String dateFin,
            @RequestParam(required = false) String typeOperation) {
        try {
            logger.info("[API] /operations/compte/numero appelée avec numeroCompte={}, dateDebut={}, dateFin={}, typeOperation={}", 
                       numeroCompte, dateDebut, dateFin, typeOperation);
            
            LocalDateTime debut = null;
            LocalDateTime fin = null;
            
            if (dateDebut != null && !dateDebut.isEmpty()) {
                debut = LocalDateTime.parse(dateDebut + (dateDebut.length() == 10 ? "T00:00:00" : ""));
            }
            if (dateFin != null && !dateFin.isEmpty()) {
                fin = LocalDateTime.parse(dateFin + (dateFin.length() == 10 ? "T23:59:59" : ""));
            }
            
            List<Operation> operations = operationService.getOperationsByCompte(numeroCompte, debut, fin, typeOperation);
            logger.info("[API] /operations/compte/numero retourne {} opérations", operations.size());
            return ResponseEntity.ok(operations);
        } catch (Exception e) {
            logger.error("[API] Erreur dans /operations/compte/numero: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/compte/numero/releve")
    public ResponseEntity<List<Operation>> getOperationsByCompteForReleve(
            @RequestParam String numeroCompte,
            @RequestParam(required = false) String dateDebut,
            @RequestParam(required = false) String dateFin,
            @RequestParam(required = false) String typeOperation) {
        try {
            logger.info("[API] /operations/compte/numero/releve appelée avec numeroCompte={}, dateDebut={}, dateFin={}, typeOperation={}", 
                       numeroCompte, dateDebut, dateFin, typeOperation);
            
            LocalDateTime debut = null;
            LocalDateTime fin = null;
            
            if (dateDebut != null && !dateDebut.isEmpty()) {
                debut = LocalDateTime.parse(dateDebut + (dateDebut.length() == 10 ? "T00:00:00" : ""));
            }
            if (dateFin != null && !dateFin.isEmpty()) {
                fin = LocalDateTime.parse(dateFin + (dateFin.length() == 10 ? "T23:59:59" : ""));
            }
            
            List<Operation> operations = operationService.getOperationsByCompteForReleve(numeroCompte, debut, fin, typeOperation);
            logger.info("[API] /operations/compte/numero/releve retourne {} opérations", operations.size());
            return ResponseEntity.ok(operations);
        } catch (Exception e) {
            logger.error("[API] Erreur dans /operations/compte/numero/releve: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/type/{typeOperation}")
    public ResponseEntity<List<Operation>> getOperationsByType(@PathVariable String typeOperation) {
        List<Operation> operations = operationService.getOperationsByType(typeOperation);
        return ResponseEntity.ok(operations);
    }
    
    @GetMapping("/pays/{pays}")
    public ResponseEntity<List<Operation>> getOperationsByPays(@PathVariable String pays) {
        List<Operation> operations = operationService.getOperationsByPays(pays);
        return ResponseEntity.ok(operations);
    }
    
    @GetMapping("/statut/{statut}")
    public ResponseEntity<List<Operation>> getOperationsByStatut(@PathVariable String statut) {
        List<Operation> operations = operationService.getOperationsByStatut(statut);
        return ResponseEntity.ok(operations);
    }
    
    @GetMapping("/banque/{banque}")
    public ResponseEntity<List<Operation>> getOperationsByBanque(@PathVariable String banque) {
        List<Operation> operations = operationService.getOperationsByBanque(banque);
        return ResponseEntity.ok(operations);
    }
    
    @GetMapping("/service/{service}")
    public ResponseEntity<List<Operation>> getOperationsByService(@PathVariable String service) {
        List<Operation> operations = operationService.getOperationsByService(service);
        return ResponseEntity.ok(operations);
    }
    
    @GetMapping("/montant/{montantMin}")
    public ResponseEntity<List<Operation>> getOperationsByMontantSuperieurA(@PathVariable Double montantMin) {
        List<Operation> operations = operationService.getOperationsByMontantSuperieurA(montantMin);
        return ResponseEntity.ok(operations);
    }
    
    @GetMapping("/proprietaire/{codeProprietaire}")
    public ResponseEntity<List<Operation>> getOperationsByCodeProprietaire(@PathVariable String codeProprietaire) {
        List<Operation> operations = operationService.getOperationsByCodeProprietaire(codeProprietaire);
        return ResponseEntity.ok(operations);
    }
    
    @GetMapping("/bordereau/{nomBordereau}")
    public ResponseEntity<List<Operation>> getOperationsByNomBordereau(@PathVariable String nomBordereau) {
        List<Operation> operations = operationService.getOperationsByNomBordereau(nomBordereau);
        return ResponseEntity.ok(operations);
    }
    
    @GetMapping("/date-range")
    public ResponseEntity<List<Operation>> getOperationsByDateRange(
            @RequestParam String dateDebut, 
            @RequestParam String dateFin) {
        try {
            logger.info("[API] /operations/date-range appelée avec dateDebut={} et dateFin={}", dateDebut, dateFin);
            LocalDateTime debut = LocalDateTime.parse(dateDebut + (dateDebut.length() == 10 ? "T00:00:00" : ""));
            LocalDateTime fin = LocalDateTime.parse(dateFin + (dateFin.length() == 10 ? "T23:59:59" : ""));
            logger.info("[API] dateDebut convertie: {} | dateFin convertie: {}", debut, fin);
            List<Operation> operations = operationService.getOperationsByDateRange(debut, fin);
            logger.info("[API] /operations/date-range retourne {} opérations", operations.size());
            return ResponseEntity.ok(operations);
        } catch (Exception e) {
            logger.error("[API] Erreur dans /operations/date-range: {}", e.getMessage(), e);
            return ResponseEntity.badRequest().build();
        }
    }
    
    @PostMapping
    public ResponseEntity<Operation> createOperation(@RequestBody OperationCreateRequest request) {
        try {
            Operation savedOperation = operationService.createOperation(request);
            return ResponseEntity.ok(savedOperation);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(null);
        }
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<Operation> updateOperation(@PathVariable Long id, @RequestBody OperationUpdateRequest request) {
        try {
            Operation updatedOperation = operationService.updateOperation(id, request);
            return ResponseEntity.ok(updatedOperation);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @PutMapping("/{id}/statut")
    public ResponseEntity<Boolean> updateOperationStatut(@PathVariable Long id, @RequestBody String nouveauStatut) {
        boolean updated = operationService.updateOperationStatut(id, nouveauStatut);
        return updated ? ResponseEntity.ok(true) : ResponseEntity.notFound().build();
    }
    
    @PutMapping("/{id}/validate")
    public ResponseEntity<Boolean> validateOperation(@PathVariable Long id) {
        boolean validated = operationBusinessService.validateOperation(id);
        return validated ? ResponseEntity.ok(true) : ResponseEntity.notFound().build();
    }
    
    @PutMapping("/{id}/reject")
    public ResponseEntity<Boolean> rejectOperation(@PathVariable Long id) {
        boolean rejected = operationBusinessService.rejectOperation(id);
        return rejected ? ResponseEntity.ok(true) : ResponseEntity.notFound().build();
    }
    
    @PutMapping("/{id}/cancel")
    public ResponseEntity<Boolean> cancelOperation(@PathVariable Long id) {
        boolean cancelled = operationBusinessService.cancelOperation(id);
        return cancelled ? ResponseEntity.ok(true) : ResponseEntity.notFound().build();
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Boolean> deleteOperation(@PathVariable Long id) {
        boolean deleted = operationService.deleteOperation(id);
        return deleted ? ResponseEntity.ok(true) : ResponseEntity.notFound().build();
    }
    
    @GetMapping("/{id}/can-process")
    public ResponseEntity<Boolean> canProcessOperation(
            @PathVariable Long id,
            @RequestParam String typeOperation,
            @RequestParam Double montant) {
        boolean canProcess = operationBusinessService.canProcessOperation(id, typeOperation, montant);
        return ResponseEntity.ok(canProcess);
    }
    
    @GetMapping("/{id}/solde-impact")
    public ResponseEntity<Double> getSoldeImpact(
            @PathVariable Long id,
            @RequestParam String typeOperation,
            @RequestParam Double montant) {
        double impact = operationBusinessService.calculateSoldeImpact(typeOperation, montant);
        return ResponseEntity.ok(impact);
    }
    
    @GetMapping("/stats/by-type")
    public ResponseEntity<Map<String, Object>> getStatsByType() {
        try {
            Map<String, Object> stats = operationService.getStatsByType();
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/stats/by-type/filtered")
    public ResponseEntity<Map<String, Object>> getStatsByTypeWithFilters(
            @RequestParam(required = false) String pays,
            @RequestParam(required = false) Long compteId) {
        try {
            Map<String, Object> stats = operationService.getStatsByTypeWithFilters(pays, compteId);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @PostMapping("/correct-frais-parent")
    public ResponseEntity<Map<String, Object>> correctFraisParentOperationId() {
        try {
            int correctedCount = operationService.correctFraisParentOperationId();
            Map<String, Object> response = new HashMap<>();
            response.put("correctedCount", correctedCount);
            response.put("message", correctedCount + " frais ont été corrigés avec succès.");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Erreur lors de la correction des frais: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }
    
    @GetMapping("/code-proprietaire/list")
    public ResponseEntity<List<String>> getDistinctCodeProprietaire() {
        List<String> codes = operationService.getDistinctCodeProprietaire();
        return ResponseEntity.ok(codes);
    }
    
    @GetMapping("/banque/list")
    public ResponseEntity<List<String>> getDistinctBanque() {
        List<String> banques = operationService.getDistinctBanque();
        return ResponseEntity.ok(banques);
    }
    
    @GetMapping("/service/list")
    public ResponseEntity<List<String>> getDistinctService() {
        List<String> services = operationService.getDistinctService();
        return ResponseEntity.ok(services);
    }
    
    @GetMapping("/filter")
    public ResponseEntity<List<Operation>> filterOperations(
            @RequestParam(required = false) Long compteId,
            @RequestParam(required = false) String typeOperation,
            @RequestParam(required = false) String pays,
            @RequestParam(required = false) String statut,
            @RequestParam(required = false) String banque,
            @RequestParam(required = false) String codeProprietaire,
            @RequestParam(required = false) String service,
            @RequestParam(required = false) String nomBordereau,
            @RequestParam(required = false) String dateDebut,
            @RequestParam(required = false) String dateFin) {
        
        LocalDateTime debut = null;
        LocalDateTime fin = null;
        
        try {
            if (dateDebut != null && !dateDebut.isEmpty()) {
                debut = LocalDateTime.parse(dateDebut);
            }
            if (dateFin != null && !dateFin.isEmpty()) {
                fin = LocalDateTime.parse(dateFin);
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
        
        List<Operation> operations = operationService.filterOperations(
                compteId, typeOperation, pays, statut, banque, codeProprietaire, service, nomBordereau, debut, fin);
        return ResponseEntity.ok(operations);
    }
    
    @PostMapping("/test-create-operation")
    public ResponseEntity<Map<String, Object>> testCreateOperation(@RequestBody OperationCreateRequest request) {
        try {
            System.out.println("=== TEST CREATE OPERATION ===");
            System.out.println("Request: " + request);
            
            Operation createdOperation = operationService.createOperation(request);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("operation", createdOperation);
            response.put("message", "Operation created successfully");
            
            // Check if a fee operation was created
            List<Operation> feeOperations = operationService.getOperationsByType("FRAIS_TRANSACTION");
            List<Operation> recentFeeOperations = feeOperations.stream()
                .filter(op -> op.getNomBordereau() != null && op.getNomBordereau().contains("FEES_SUMMARY"))
                .filter(op -> op.getDateOperation().equals(createdOperation.getDateOperation()))
                .collect(Collectors.toList());
            
            response.put("feeOperationsCreated", recentFeeOperations.size());
            response.put("feeOperations", recentFeeOperations);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            System.out.println("ERROR in test-create-operation: " + e.getMessage());
            e.printStackTrace();
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    @GetMapping("/compte/{compteId}/with-frais")
    public ResponseEntity<List<Operation>> getOperationsByCompteIdWithFrais(@PathVariable Long compteId) {
        try {
            List<Operation> operations = operationService.getOperationsByCompteIdWithFrais(compteId);
            return ResponseEntity.ok(operations);
        } catch (Exception e) {
            logger.error("[API] Erreur dans /operations/compte/{}/with-frais: {}", compteId, e.getMessage(), e);
            return ResponseEntity.badRequest().build();
        }
    }
    

} 