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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
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

    /**
     * Liste des saisies manuelles relevé (trx traité / trx remboursé) sur une plage de dates,
     * pour agrégation dashboard (statistiques réconciliation).
     */
    @GetMapping("/manual-trx/range")
    public ResponseEntity<?> listManualTrxByRange(
            @RequestParam("startDate") String startDateStr,
            @RequestParam("endDate") String endDateStr,
            @RequestParam(value = "country", required = false) String countryFilter,
            @RequestParam(value = "service", required = false) List<String> servicesFilter,
            @RequestParam(value = "env", required = false) String envFilter
    ) {
        try {
            LocalDate start = LocalDate.parse(startDateStr);
            LocalDate end = LocalDate.parse(endDateStr);
            if (end.isBefore(start)) {
                return ResponseEntity.badRequest().body(Map.of("error", "endDate must be >= startDate"));
            }

            List<ReleveManualEntity> rows = releveManualRepository.findByDateBetween(start, end);
            String country = (countryFilter == null || countryFilter.isBlank()) ? null : countryFilter.trim();
            List<String> serviceAllowList = null;
            if (servicesFilter != null && !servicesFilter.isEmpty()) {
                serviceAllowList = servicesFilter.stream()
                        .filter(s -> s != null && !s.isBlank())
                        .map(String::trim)
                        .distinct()
                        .toList();
                if (serviceAllowList.isEmpty()) {
                    serviceAllowList = null;
                }
            }
            String envNorm = normalizeEnvForRangeFilter(envFilter);

            List<Map<String, Object>> out = new ArrayList<>();
            for (ReleveManualEntity e : rows) {
                if (country != null && !country.equals(e.getCountry())) {
                    continue;
                }
                if (serviceAllowList != null && !serviceAllowList.contains(e.getService())) {
                    continue;
                }
                if (envNorm != null && !envNorm.equals(normalizeStoredEnvForRange(e.getEnv()))) {
                    continue;
                }
                Map<String, Object> m = new HashMap<>();
                m.put("date", e.getDate().toString());
                m.put("service", e.getService());
                m.put("country", e.getCountry());
                m.put("env", e.getEnv());
                m.put("manualNombre", e.getManualNombre() != null ? e.getManualNombre() : 0L);
                m.put("manualVolume", e.getManualVolume() != null ? e.getManualVolume() : 0.0);
                m.put("rembourseNombre", e.getRembourseNombre() != null ? e.getRembourseNombre() : 0L);
                m.put("rembourseVolume", e.getRembourseVolume() != null ? e.getRembourseVolume() : 0.0);
                out.add(m);
            }
            return ResponseEntity.ok(out);
        } catch (DateTimeParseException ex) {
            log.warn("Invalid date in /manual-trx/range: {} {}", startDateStr, endDateStr, ex);
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid date format, expected YYYY-MM-DD"));
        } catch (Exception e) {
            log.error("Error in listManualTrxByRange", e);
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    /** Paramètre requête : ALL → pas de filtre env ; sinon clé comparable aux lignes stockées. */
    private static String normalizeEnvForRangeFilter(String env) {
        if (env == null || env.isBlank() || "ALL".equalsIgnoreCase(env.trim())) {
            return null;
        }
        return normalizeStoredEnvForRange(env);
    }

    /** Ligne releve_manual : env null / TOTAL / T-E regroupés comme le front (T-E). */
    private static String normalizeStoredEnvForRange(String env) {
        if (env == null || env.isBlank()) {
            return "T-E";
        }
        String u = env.trim().toUpperCase();
        if ("TOTAL".equals(u) || "T-E".equals(u) || "T_E".equals(u)) {
            return "T-E";
        }
        return u;
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

