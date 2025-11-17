package com.reconciliation.controller;

import com.reconciliation.entity.UserLogEntity;
import com.reconciliation.service.UserLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/log-utilisateur")
@CrossOrigin(origins = {"http://localhost:4200", "http://172.214.108.8:4200"})
public class UserLogController {

    @Autowired
    private UserLogService userLogService;

    /**
     * Récupérer tous les logs avec filtres optionnels
     */
    @GetMapping
    public ResponseEntity<List<UserLogEntity>> getLogs(
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String module,
            @RequestParam(required = false) String permission,
            @RequestParam(required = false) String dateDebut,
            @RequestParam(required = false) String dateFin) {
        
        try {
            List<UserLogEntity> logs = userLogService.getLogsWithFilters(username, module, permission, dateDebut, dateFin);
            return ResponseEntity.ok(logs);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Récupérer un log par ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<UserLogEntity> getLogById(@PathVariable Long id) {
        try {
            return userLogService.getAllLogs().stream()
                    .filter(log -> log.getId().equals(id))
                    .findFirst()
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}

