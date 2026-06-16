package com.reconciliation.service;

import com.reconciliation.dto.BoPartenaireControleInterneDto;
import com.reconciliation.dto.BoPartenaireControleInterneValidateRequest;
import com.reconciliation.entity.BoPartenaireControleInterneEntity;
import com.reconciliation.exception.ControleInterneAccessDeniedException;
import com.reconciliation.repository.BoPartenaireControleInterneRepository;
import com.reconciliation.service.PermissionCheckService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class BoPartenaireControleInterneService {

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final BoPartenaireControleInterneRepository repository;
    private final PermissionCheckService permissionCheckService;

    public BoPartenaireControleInterneService(
        BoPartenaireControleInterneRepository repository,
        PermissionCheckService permissionCheckService
    ) {
        this.repository = repository;
        this.permissionCheckService = permissionCheckService;
    }

    public List<BoPartenaireControleInterneDto> list(
        String country,
        String env,
        String startMonth,
        String endMonth
    ) {
        String normalizedCountry = normalize(country);
        String normalizedEnv = normalizeEnv(env);
        String start = normalizeMonth(startMonth);
        String end = normalizeMonth(endMonth);

        return repository
            .findByCountryAndEnvAndMonthYyyyMmBetween(normalizedCountry, normalizedEnv, start, end)
            .stream()
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    @Transactional
    public BoPartenaireControleInterneDto validate(
        BoPartenaireControleInterneValidateRequest request,
        String username
    ) {
        assertCanValidate(username);

        if (request == null) {
            throw new IllegalArgumentException("Corps de requête manquant");
        }

        String month = normalizeMonth(request.getMonthYyyyMm());
        String country = normalize(request.getCountry());
        String env = normalizeEnv(request.getEnv());
        String service = normalize(request.getService());

        if (month.isEmpty() || country.isEmpty() || service.isEmpty()) {
            throw new IllegalArgumentException("Mois, pays et service sont obligatoires");
        }

        BoPartenaireControleInterneEntity entity = repository
            .findByMonthYyyyMmAndCountryAndEnvAndService(month, country, env, service)
            .orElseGet(BoPartenaireControleInterneEntity::new);

        entity.setMonthYyyyMm(month);
        entity.setCountry(country);
        entity.setEnv(env);
        entity.setService(service);
        entity.setStatut(BoPartenaireControleInterneEntity.STATUT_VALIDE);
        entity.setValidatedBy(username != null && !username.isBlank() ? username.trim() : "system");
        entity.setValidatedAt(LocalDateTime.now());

        return toDto(repository.save(entity));
    }

    @Transactional
    public BoPartenaireControleInterneDto revoke(
        BoPartenaireControleInterneValidateRequest request,
        String username
    ) {
        assertCanRevoke(username);

        if (request == null) {
            throw new IllegalArgumentException("Corps de requête manquant");
        }

        String month = normalizeMonth(request.getMonthYyyyMm());
        String country = normalize(request.getCountry());
        String env = normalizeEnv(request.getEnv());
        String service = normalize(request.getService());

        if (month.isEmpty() || country.isEmpty() || service.isEmpty()) {
            throw new IllegalArgumentException("Mois, pays et service sont obligatoires");
        }

        BoPartenaireControleInterneEntity entity = repository
            .findByMonthYyyyMmAndCountryAndEnvAndService(month, country, env, service)
            .orElseThrow(() -> new IllegalArgumentException("Aucune validation trouvée pour cette ligne"));

        entity.setStatut(BoPartenaireControleInterneEntity.STATUT_EN_COURS);
        entity.setValidatedBy(null);
        entity.setValidatedAt(null);

        return toDto(repository.save(entity));
    }

    private void assertCanValidate(String username) {
        if (!permissionCheckService.canValidateBoPartenaireControleInterne(username)) {
            throw new ControleInterneAccessDeniedException(
                "Seuls un administrateur ou un profil Contrôle Interne peuvent valider."
            );
        }
    }

    private void assertCanRevoke(String username) {
        if (!permissionCheckService.canRevokeBoPartenaireControleInterne(username)) {
            throw new ControleInterneAccessDeniedException(
                "Seul un administrateur peut annuler une validation."
            );
        }
    }

    private BoPartenaireControleInterneDto toDto(BoPartenaireControleInterneEntity e) {
        BoPartenaireControleInterneDto dto = new BoPartenaireControleInterneDto();
        dto.setId(e.getId());
        dto.setMonthYyyyMm(e.getMonthYyyyMm());
        dto.setCountry(e.getCountry());
        dto.setEnv(e.getEnv());
        dto.setService(e.getService());
        dto.setStatut(e.getStatut());
        dto.setValidatedBy(e.getValidatedBy());
        if (e.getValidatedAt() != null) {
            dto.setValidatedAt(e.getValidatedAt().format(ISO));
        }
        return dto;
    }

    private String normalize(String value) {
        return value != null ? value.trim() : "";
    }

    private String normalizeEnv(String env) {
        String v = normalize(env);
        return v.isEmpty() ? "ALL" : v.toUpperCase();
    }

    private String normalizeMonth(String month) {
        String v = normalize(month);
        if (v.length() >= 7) {
            return v.substring(0, 7);
        }
        return v;
    }
}
