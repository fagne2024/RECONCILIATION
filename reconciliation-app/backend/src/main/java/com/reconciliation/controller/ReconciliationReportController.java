package com.reconciliation.controller;

import com.reconciliation.dto.ReleveManualDto;
import com.reconciliation.entity.ReleveManualEntity;
import com.reconciliation.repository.ReleveManualRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Slf4j
@RestController
@RequestMapping("/api/reconciliation-report")
@RequiredArgsConstructor
public class ReconciliationReportController {

    private final ReleveManualRepository releveManualRepository;

    @GetMapping("/manual-trx")
    public ResponseEntity<?> getManualTrx(
            @RequestParam("date") String dateStr,
            @RequestParam("service") String service,
            @RequestParam("country") String country,
            @RequestParam(value = "env", required = false) String envStr
    ) {
        try {
            LocalDate date = LocalDate.parse(dateStr);
            String env = (envStr == null || envStr.isBlank()) ? "TOTAL" : envStr.trim();
            Optional<ReleveManualEntity> opt = releveManualRepository.findByReleveKey(date, service, country, env);

            Map<String, Object> body = new HashMap<>();
            if (opt.isPresent()) {
                ReleveManualEntity e = opt.get();
                body.put("manualNombre", e.getManualNombre() != null ? e.getManualNombre() : 0L);
                body.put("manualVolume", e.getManualVolume() != null ? e.getManualVolume() : 0.0);
                body.put("rembourseNombre", e.getRembourseNombre() != null ? e.getRembourseNombre() : 0L);
                body.put("rembourseVolume", e.getRembourseVolume() != null ? e.getRembourseVolume() : 0.0);
                body.put("env", e.getEnv());
            } else {
                body.put("manualNombre", 0L);
                body.put("manualVolume", 0.0);
                body.put("rembourseNombre", 0L);
                body.put("rembourseVolume", 0.0);
            }
            return ResponseEntity.ok(body);
        } catch (DateTimeParseException ex) {
            log.warn("Invalid date format for /manual-trx: {}", dateStr, ex);
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid date format, expected YYYY-MM-DD"));
        } catch (Exception e) {
            log.error("Error in getManualTrx", e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/manual-trx")
    public ResponseEntity<?> saveManualTrx(@RequestBody ReleveManualDto dto) {
        if (dto == null || dto.date == null || dto.service == null || dto.country == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "date, service and country are required"));
        }

        try {
            LocalDate date = LocalDate.parse(dto.date);
            String normalizedEnv = (dto.env == null || dto.env.isBlank()) ? "TOTAL" : dto.env.trim();

            ReleveManualEntity entity = releveManualRepository
                    .findByReleveKey(date, dto.service, dto.country, normalizedEnv)
                    .orElseGet(ReleveManualEntity::new);

            entity.setDate(date);
            entity.setService(dto.service);
            entity.setCountry(dto.country);
            entity.setEnv(normalizedEnv);
            entity.setManualNombre(dto.manualNombre != null ? dto.manualNombre : 0L);
            entity.setManualVolume(dto.manualVolume != null ? dto.manualVolume : 0.0);
            entity.setRembourseNombre(dto.rembourseNombre != null ? dto.rembourseNombre : 0L);
            entity.setRembourseVolume(dto.rembourseVolume != null ? dto.rembourseVolume : 0.0);
            entity.setUpdatedAt(LocalDateTime.now());

            ReleveManualEntity saved = releveManualRepository.save(entity);

            Map<String, Object> body = new HashMap<>();
            body.put("id", saved.getId());
            body.put("manualNombre", saved.getManualNombre());
            body.put("manualVolume", saved.getManualVolume());
            body.put("rembourseNombre", saved.getRembourseNombre());
            body.put("rembourseVolume", saved.getRembourseVolume());

            return ResponseEntity.ok(body);
        } catch (DateTimeParseException ex) {
            log.warn("Invalid date format for /manual-trx save: {}", dto.date, ex);
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid date format, expected YYYY-MM-DD"));
        } catch (Exception e) {
            log.error("Error in saveManualTrx", e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}

