package com.reconciliation.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sql")
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:3000"})
public class SqlController {

    @Autowired
    private EntityManager entityManager;

    /**
     * Endpoint pour exécuter des commandes SQL de correction
     */
    @PostMapping("/execute")
    public ResponseEntity<Map<String, Object>> executeSql(@RequestBody Map<String, String> request) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            String sql = request.get("sql");
            String operation = request.get("operation");
            
            System.out.println("=== EXÉCUTION SQL ===");
            System.out.println("Opération: " + operation);
            System.out.println("SQL: " + sql);
            
            Query query = entityManager.createNativeQuery(sql);
            
            if (operation != null && operation.equalsIgnoreCase("SELECT")) {
                List<Object[]> results = query.getResultList();
                response.put("success", true);
                response.put("operation", operation);
                response.put("results", results);
                response.put("message", "Requête SELECT exécutée avec succès");
            } else {
                int affectedRows = query.executeUpdate();
                response.put("success", true);
                response.put("operation", "UPDATE");
                response.put("affectedRows", affectedRows);
                response.put("message", "Requête UPDATE exécutée avec succès. " + affectedRows + " lignes affectées");
            }
            
            System.out.println("✅ SQL exécuté avec succès");
            
        } catch (Exception e) {
            System.out.println("❌ Erreur lors de l'exécution SQL: " + e.getMessage());
            response.put("success", false);
            response.put("error", e.getMessage());
            response.put("message", "Erreur lors de l'exécution de la requête SQL");
        }
        
        return ResponseEntity.ok(response);
    }

    /**
     * Endpoint spécifique pour corriger les frais CELCM0001
     */
    @PostMapping("/correct-frais-celcm0001")
    public ResponseEntity<Map<String, Object>> correctFraisCelcm0001() {
        Map<String, Object> response = new HashMap<>();
        
        try {
            System.out.println("=== CORRECTION FRAIS CELCM0001 ===");
            
            // 1. Vérifier l'état avant correction
            String checkQuery = "SELECT id, type_operation, montant, nom_bordereau, date_operation, service, code_proprietaire FROM operation WHERE nom_bordereau LIKE 'FEES_SUMMARY_2025-07-%_CELCM0001' AND type_operation = 'FRAIS_TRANSACTION' AND service = 'CASHINMTNCMPART'";
            Query checkQueryObj = entityManager.createNativeQuery(checkQuery);
            List<Object[]> beforeResults = checkQueryObj.getResultList();
            
            response.put("beforeCorrection", beforeResults);
            
            // 2. Correction pour 01/07/2025
            String correction1Query = "UPDATE operation SET montant = 31800.0 WHERE nom_bordereau = 'FEES_SUMMARY_2025-07-01_CELCM0001' AND type_operation = 'FRAIS_TRANSACTION' AND service = 'CASHINMTNCMPART' AND montant = 3776700.0";
            Query correction1QueryObj = entityManager.createNativeQuery(correction1Query);
            int affectedRows1 = correction1QueryObj.executeUpdate();
            
            // 3. Correction pour 02/07/2025
            String correction2Query = "UPDATE operation SET montant = 31800.0 WHERE nom_bordereau = 'FEES_SUMMARY_2025-07-02_CELCM0001' AND type_operation = 'FRAIS_TRANSACTION' AND service = 'CASHINMTNCMPART' AND montant = 3776700.0";
            Query correction2QueryObj = entityManager.createNativeQuery(correction2Query);
            int affectedRows2 = correction2QueryObj.executeUpdate();
            
            // 4. Vérifier l'état après correction
            Query afterQueryObj = entityManager.createNativeQuery(checkQuery);
            List<Object[]> afterResults = afterQueryObj.getResultList();
            
            response.put("success", true);
            response.put("affectedRows1", affectedRows1);
            response.put("affectedRows2", affectedRows2);
            response.put("afterCorrection", afterResults);
            response.put("message", "Corrections appliquées avec succès. " + affectedRows1 + " + " + affectedRows2 + " lignes modifiées");
            
            System.out.println("✅ Corrections appliquées: " + affectedRows1 + " + " + affectedRows2 + " lignes");
            
        } catch (Exception e) {
            System.out.println("❌ Erreur lors de la correction: " + e.getMessage());
            response.put("success", false);
            response.put("error", e.getMessage());
            response.put("message", "Erreur lors de la correction des frais");
        }
        
        return ResponseEntity.ok(response);
    }
} 