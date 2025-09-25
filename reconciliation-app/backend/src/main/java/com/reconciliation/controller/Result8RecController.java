package com.reconciliation.controller;

import com.reconciliation.entity.Result8RecEntity;
import com.reconciliation.repository.Result8RecRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/result8rec")
@RequiredArgsConstructor
@Slf4j
public class Result8RecController {

    private final Result8RecRepository repository;

    @PostMapping
    public ResponseEntity<?> save(@RequestBody Result8RecEntity body) {
        if (repository.existsByDateAndAgencyAndServiceAndCountry(body.getDate(), body.getAgency(), body.getService(), body.getCountry())) {
            Result8RecEntity existing = repository.findFirstByDateAndAgencyAndServiceAndCountryOrderByIdDesc(
                    body.getDate(), body.getAgency(), body.getService(), body.getCountry()
            );
            log.info("❌ Doublon détecté result8rec {}/{}/{}/{}", body.getDate(), body.getAgency(), body.getService(), body.getCountry());
            return ResponseEntity.status(HttpStatus.CONFLICT).body(existing);
        }
        body.setCreatedAt(Instant.now().toString());
        Result8RecEntity saved = repository.save(body);
        log.info("✅ result8rec sauvegardé id={}", saved.getId());
        return ResponseEntity.ok(saved);
    }

    @GetMapping
    public ResponseEntity<List<Result8RecEntity>> list() {
        List<Result8RecEntity> all = repository.findAll();
        return ResponseEntity.ok(all);
    }

    @PostMapping("/bulk")
    public ResponseEntity<?> saveBulk(@RequestBody List<Result8RecEntity> rows) {
        int duplicates = 0;
        for (Result8RecEntity r : rows) {
            if (repository.existsByDateAndAgencyAndServiceAndCountry(r.getDate(), r.getAgency(), r.getService(), r.getCountry())) {
                duplicates++;
                continue;
            }
            r.setCreatedAt(Instant.now().toString());
            repository.save(r);
        }
        log.info("✅ bulk result8rec: {} lignes, {} doublons", rows.size(), duplicates);
        return ResponseEntity.ok().body("Saved=" + (rows.size() - duplicates) + ", Duplicates=" + duplicates);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!repository.existsById(id)) return ResponseEntity.notFound().build();
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Result8RecEntity body) {
        return repository.findById(id)
                .map(existing -> {
                    existing.setStatus(body.getStatus());
                    existing.setComment(body.getComment());
                    existing.setGlpiId(body.getGlpiId());
                    Result8RecEntity saved = repository.save(existing);
                    log.info("✅ result8rec mis à jour id={}", saved.getId());
                    return ResponseEntity.ok(saved);
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}


