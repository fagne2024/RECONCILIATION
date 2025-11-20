package com.reconciliation.controller;

import com.reconciliation.dto.ServiceReferenceDashboardDto;
import com.reconciliation.entity.ServiceReferenceEntity;
import com.reconciliation.service.ServiceReferenceService;
import com.reconciliation.util.RequestContextUtil;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/service-references")
@CrossOrigin(origins = {"http://localhost:4200", "http://172.214.108.8:4200"})
public class ServiceReferenceController {

    @Autowired
    private ServiceReferenceService serviceReferenceService;

    @GetMapping
    public ResponseEntity<List<ServiceReferenceEntity>> listAll() {
        String username = RequestContextUtil.getUsernameFromRequest();
        return ResponseEntity.ok(serviceReferenceService.getAll(username));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ServiceReferenceEntity> getById(@PathVariable Long id) {
        String username = RequestContextUtil.getUsernameFromRequest();
        return serviceReferenceService.getById(id, username)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/pays/{pays}")
    public ResponseEntity<List<ServiceReferenceEntity>> getByPays(@PathVariable String pays) {
        String username = RequestContextUtil.getUsernameFromRequest();
        return ResponseEntity.ok(serviceReferenceService.getByPays(pays, username));
    }

    @GetMapping("/code-reco/{codeReco}")
    public ResponseEntity<ServiceReferenceEntity> getByCodeReco(@PathVariable String codeReco) {
        String username = RequestContextUtil.getUsernameFromRequest();
        return serviceReferenceService.getByCodeReco(codeReco, username)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody ServiceReferenceEntity payload) {
        String username = RequestContextUtil.getUsernameFromRequest();
        try {
            ServiceReferenceEntity created = serviceReferenceService.create(payload, username);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody ServiceReferenceEntity payload) {
        String username = RequestContextUtil.getUsernameFromRequest();
        try {
            ServiceReferenceEntity updated = serviceReferenceService.update(id, payload, username);
            return ResponseEntity.ok(updated);
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        String username = RequestContextUtil.getUsernameFromRequest();
        try {
            serviceReferenceService.delete(id, username);
            return ResponseEntity.noContent().build();
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        }
    }

    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboardStats() {
        String username = RequestContextUtil.getUsernameFromRequest();
        try {
            List<ServiceReferenceDashboardDto> stats = serviceReferenceService.getDashboardStats(username);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Impossible de récupérer le dashboard: " + e.getMessage());
        }
    }
}

