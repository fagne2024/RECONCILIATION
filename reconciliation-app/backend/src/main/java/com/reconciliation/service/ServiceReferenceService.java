package com.reconciliation.service;

import com.reconciliation.dto.ServiceReferenceDashboardDto;
import com.reconciliation.entity.Result8RecEntity;
import com.reconciliation.entity.ServiceReferenceEntity;
import com.reconciliation.repository.AgencySummaryRepository;
import com.reconciliation.repository.Result8RecRepository;
import com.reconciliation.repository.ServiceReferenceRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
public class ServiceReferenceService {

    @Autowired
    private ServiceReferenceRepository repository;

    @Autowired
    private PaysFilterService paysFilterService;

    @Autowired
    private AgencySummaryRepository agencySummaryRepository;

    @Autowired
    private Result8RecRepository result8RecRepository;

    public List<ServiceReferenceEntity> getAll(String username) {
        List<String> allowedPays = getAllowedPays(username);
        if (allowedPays == null) {
            return applyComputedStatus(repository.findAll());
        }
        if (allowedPays.isEmpty()) {
            return Collections.emptyList();
        }
        return applyComputedStatus(repository.findByPaysIn(allowedPays));
    }

    public Optional<ServiceReferenceEntity> getById(Long id, String username) {
        return repository.findById(id)
                .filter(entity -> canAccessPays(username, entity.getPays()))
                .map(this::refreshStatusFromAgencySummary);
    }

    public List<ServiceReferenceEntity> getByPays(String pays, String username) {
        if (!canAccessPays(username, pays)) {
            return Collections.emptyList();
        }
        return applyComputedStatus(repository.findByPays(pays));
    }

    public Optional<ServiceReferenceEntity> getByCodeReco(String codeReco, String username) {
        return repository.findByCodeReco(codeReco)
                .filter(entity -> canAccessPays(username, entity.getPays()))
                .map(this::refreshStatusFromAgencySummary);
    }

    public ServiceReferenceEntity create(ServiceReferenceEntity entity, String username) {
        if (!canAccessPays(username, entity.getPays())) {
            throw new SecurityException("Utilisateur non autorisé pour ce pays");
        }
        validateUniqueCombination(entity.getPays(), entity.getCodeReco(), null);
        ensureStatusDefault(entity);
        return repository.save(entity);
    }

    public ServiceReferenceEntity update(Long id, ServiceReferenceEntity payload, String username) {
        ServiceReferenceEntity existing = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Référence introuvable"));

        if (!canAccessPays(username, existing.getPays())) {
            throw new SecurityException("Utilisateur non autorisé pour ce pays");
        }

        if (payload.getPays() != null && !payload.getPays().equals(existing.getPays())) {
            if (!canAccessPays(username, payload.getPays())) {
                throw new SecurityException("Utilisateur non autorisé pour ce pays");
            }
            existing.setPays(payload.getPays());
        }

        if (payload.getCodeService() != null) {
            existing.setCodeService(payload.getCodeService());
        }
        if (payload.getServiceLabel() != null) {
            existing.setServiceLabel(payload.getServiceLabel());
        }
        if (payload.getCodeReco() != null) {
            existing.setCodeReco(payload.getCodeReco());
        }
        if (payload.getServiceType() != null) {
            existing.setServiceType(payload.getServiceType());
        }
        if (payload.getOperateur() != null) {
            existing.setOperateur(payload.getOperateur());
        }
        if (payload.getReseau() != null) {
            existing.setReseau(payload.getReseau());
        }
        if (payload.getReconciliable() != null) {
            existing.setReconciliable(payload.getReconciliable());
        }
        if (payload.getMotif() != null) {
            existing.setMotif(payload.getMotif());
        }
        if (payload.getRetenuOperateur() != null) {
            existing.setRetenuOperateur(payload.getRetenuOperateur());
        }

        validateUniqueCombination(existing.getPays(), existing.getCodeReco(), existing.getId());
        ensureStatusDefault(existing);

        return repository.save(existing);
    }

    public void delete(Long id, String username) {
        ServiceReferenceEntity existing = repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Référence introuvable"));
        if (!canAccessPays(username, existing.getPays())) {
            throw new SecurityException("Utilisateur non autorisé pour ce pays");
        }
        repository.delete(existing);
    }

    public List<ServiceReferenceDashboardDto> getDashboardStats(String username) {
        List<String> allowedPays = normalizePays(getAllowedPays(username));
        if (allowedPays != null && allowedPays.isEmpty()) {
            return Collections.emptyList();
        }

        // Récupérer les données agrégées par pays depuis AgencySummaryEntity pour trx_recon_brut
        List<Object[]> agencySummaryByCountry = agencySummaryRepository.aggregateByCountry(allowedPays);
        
        // Récupérer les données agrégées par pays et service depuis AgencySummaryEntity
        List<Object[]> agencySummaryByCountryAndService = agencySummaryRepository.aggregateByCountryAndService(allowedPays);
        
        // Construire la map des services actifs et réconciliables
        Map<String, Boolean> activeReconcilableServices = buildActiveReconcilableServiceMap(allowedPays);

        Map<String, DashboardAccumulator> accumulatorMap = new HashMap<>();

        // Traiter les données par pays pour trx_recon_brut (tous les services depuis agency_summary)
        for (Object[] row : agencySummaryByCountry) {
            String country = (String) row[0];
            if (country == null || country.isEmpty()) {
                continue;
            }
            if (allowedPays != null && !allowedPays.contains(country)) {
                continue;
            }

            DashboardAccumulator accumulator = accumulatorMap.computeIfAbsent(country, c -> new DashboardAccumulator());
            Double totalVolume = ((Number) row[1]).doubleValue();
            Long totalTransactions = ((Number) row[2]).longValue();

            // Volume total depuis agency_summary_entity (tous les services) - base pour trx_recon_brut
            accumulator.totalVolume = totalVolume;
            accumulator.totalTransactions = totalTransactions;
        }

        // Traiter les données par pays et service pour trx_recon_net (services actifs et réconciliables uniquement)
        for (Object[] row : agencySummaryByCountryAndService) {
            String country = (String) row[0];
            String service = (String) row[1];
            if (country == null || country.isEmpty() || service == null || service.isEmpty()) {
                continue;
            }
            if (allowedPays != null && !allowedPays.contains(country)) {
                continue;
            }

            // Vérifier si le service est actif et réconciliable (réconciliable = OUI)
            if (!isActiveReconcilableService(service, activeReconcilableServices)) {
                continue;
            }

            DashboardAccumulator accumulator = accumulatorMap.get(country);
            if (accumulator == null) {
                accumulator = new DashboardAccumulator();
                accumulatorMap.put(country, accumulator);
            }

            Double volume = ((Number) row[2]).doubleValue();
            // SUM() peut retourner BigInteger, on convertit en long
            Number transactionsNumber = (Number) row[3];
            long transactions = transactionsNumber != null ? transactionsNumber.longValue() : 0L;

            // Volume total depuis agency_summary_entity (services actifs et réconciliables uniquement) - base pour trx_recon_net
            accumulator.reconcilableVolume += volume;
            accumulator.reconcilableTransactions += transactions;
        }

        List<ServiceReferenceDashboardDto> response = new ArrayList<>();
        for (Map.Entry<String, DashboardAccumulator> entry : accumulatorMap.entrySet()) {
            DashboardAccumulator accumulator = entry.getValue();
            ServiceReferenceDashboardDto dto = new ServiceReferenceDashboardDto();
            dto.setCountry(entry.getKey());
            dto.setTotalVolume(round(accumulator.totalVolume));
            dto.setTotalTransactions(accumulator.totalTransactions);
            dto.setReconcilableVolume(round(accumulator.reconcilableVolume));
            dto.setReconcilableTransactions(accumulator.reconcilableTransactions);
            
            // Volume non réconciliable = volume total - volume réconciliable
            double nonReconcilableVolume = accumulator.totalVolume - accumulator.reconcilableVolume;
            dto.setNonReconcilableVolume(round(nonReconcilableVolume));
            
            // Transactions non réconciliables = transactions totales - transactions réconciliables
            long nonReconcilableTransactions = accumulator.totalTransactions - accumulator.reconcilableTransactions;
            dto.setNonReconcilableTransactions(nonReconcilableTransactions);
            
            // trx_recon_brut = 100% (toujours, c'est la base de référence)
            dto.setTrxReconBrut(100.0);
            
            // trx_recon_net = (volume réconciliable / volume total brut) * 100
            // Représente le pourcentage du volume brut qui est réconciliable
            dto.setTrxReconNet(calculatePercentage(accumulator.reconcilableVolume, accumulator.totalVolume));
            
            response.add(dto);
        }

        response.sort((a, b) -> a.getCountry().compareToIgnoreCase(b.getCountry()));
        return response;
    }

    private List<String> getAllowedPays(String username) {
        if (username == null || username.isBlank()) {
            return null;
        }
        return paysFilterService.getAllowedPaysCodes(username);
    }

    private boolean canAccessPays(String username, String pays) {
        return username == null || username.isBlank() || paysFilterService.canAccessPays(username, pays);
    }

    private void validateUniqueCombination(String pays, String codeReco, Long excludeId) {
        repository.findByPaysAndCodeReco(pays, codeReco).ifPresent(duplicate -> {
            if (excludeId == null || !duplicate.getId().equals(excludeId)) {
                throw new IllegalArgumentException(
                    String.format("Une référence existe déjà pour le pays %s et le code RECO %s", pays, codeReco)
                );
            }
        });
    }

    private void ensureStatusDefault(ServiceReferenceEntity entity) {
        entity.setStatus(computeStatusFromAgencySummary(entity.getCodeService()));
    }

    private List<ServiceReferenceEntity> applyComputedStatus(List<ServiceReferenceEntity> entities) {
        refreshStatusesFromAgencySummary(entities);
        return entities;
    }

    private ServiceReferenceEntity refreshStatusFromAgencySummary(ServiceReferenceEntity entity) {
        if (entity == null) {
            return null;
        }
        String computedStatus = computeStatusFromAgencySummary(entity.getCodeService());
        if (!computedStatus.equals(entity.getStatus())) {
            entity.setStatus(computedStatus);
            repository.save(entity);
        }
        return entity;
    }

    private void refreshStatusesFromAgencySummary(List<ServiceReferenceEntity> entities) {
        if (entities == null || entities.isEmpty()) {
            return;
        }
        List<ServiceReferenceEntity> toUpdate = new java.util.ArrayList<>();
        java.util.Map<String, String> statusByCode = computeStatusesForCodes(entities);
        for (ServiceReferenceEntity entity : entities) {
            if (entity == null) {
                continue;
            }
            String normalized = normalizeCode(entity.getCodeService());
            if (normalized.isEmpty()) {
                continue;
            }
            String computedStatus = statusByCode.getOrDefault(normalized, "INACTIF");
            if (!computedStatus.equals(entity.getStatus())) {
                entity.setStatus(computedStatus);
                toUpdate.add(entity);
            }
        }
        if (!toUpdate.isEmpty()) {
            repository.saveAll(toUpdate);
        }
    }

    private java.util.Map<String, String> computeStatusesForCodes(List<ServiceReferenceEntity> entities) {
        java.util.Set<String> normalizedCodes = new java.util.HashSet<>();
        for (ServiceReferenceEntity entity : entities) {
            String normalized = normalizeCode(entity.getCodeService());
            if (!normalized.isEmpty()) {
                normalizedCodes.add(normalized);
            }
        }
        if (normalizedCodes.isEmpty()) {
            return java.util.Collections.emptyMap();
        }
        java.util.List<String> existing = agencySummaryRepository.findExistingServicesIgnoreCase(new java.util.ArrayList<>(normalizedCodes));
        java.util.Set<String> used = new java.util.HashSet<>();
        for (String value : existing) {
            if (value != null) {
                used.add(value.toLowerCase());
            }
        }

        java.util.Map<String, String> statusByCode = new java.util.HashMap<>();
        for (String code : normalizedCodes) {
            statusByCode.put(code, used.contains(code) ? "ACTIF" : "INACTIF");
        }
        return statusByCode;
    }

    private String computeStatusFromAgencySummary(String codeService) {
        if (codeService == null || codeService.isBlank()) {
            return "INACTIF";
        }
        boolean exists = agencySummaryRepository.existsByServiceIgnoreCase(codeService);
        return exists ? "ACTIF" : "INACTIF";
    }

    private String normalizeCode(String code) {
        return code == null ? "" : code.trim().toLowerCase();
    }

    private String normalizeCountryCode(String country) {
        return country == null ? "" : country.trim().toUpperCase();
    }

    private List<String> normalizePays(List<String> pays) {
        if (pays == null) {
            return null;
        }
        List<String> normalized = new ArrayList<>();
        for (String value : pays) {
            if (value != null && !value.isBlank()) {
                normalized.add(value.trim().toUpperCase());
            }
        }
        return normalized;
    }

    private List<Result8RecEntity> fetchReconciliationData(List<String> allowedPays) {
        if (allowedPays == null) {
            return result8RecRepository.findAll();
        }
        List<String> normalized = new ArrayList<>();
        for (String pays : allowedPays) {
            normalized.add(pays.toLowerCase());
        }
        return result8RecRepository.findByCountryCodes(normalized);
    }

    private Map<String, Boolean> buildReconcilableServiceMap(List<String> allowedPays) {
        List<ServiceReferenceEntity> references;
        if (allowedPays == null) {
            references = repository.findAll();
        } else if (allowedPays.isEmpty()) {
            return Collections.emptyMap();
        } else {
            references = repository.findByPaysIn(allowedPays);
        }

        Map<String, Boolean> map = new HashMap<>();
        for (ServiceReferenceEntity reference : references) {
            boolean reconcilable = Boolean.TRUE.equals(reference.getReconciliable());
            addServiceKey(map, reference.getCodeService(), reconcilable);
            addServiceKey(map, reference.getServiceLabel(), reconcilable);
        }
        return map;
    }

    private Map<String, Boolean> buildActiveReconcilableServiceMap(List<String> allowedPays) {
        List<ServiceReferenceEntity> references;
        if (allowedPays == null) {
            references = repository.findAll();
        } else if (allowedPays.isEmpty()) {
            return Collections.emptyMap();
        } else {
            references = repository.findByPaysIn(allowedPays);
        }

        // S'assurer que les statuts sont à jour
        refreshStatusesFromAgencySummary(references);

        Map<String, Boolean> map = new HashMap<>();
        for (ServiceReferenceEntity reference : references) {
            // Vérifier que le service est actif ET réconciliable
            boolean isActive = "ACTIF".equalsIgnoreCase(reference.getStatus());
            boolean isReconcilable = Boolean.TRUE.equals(reference.getReconciliable());
            if (isActive && isReconcilable) {
                addServiceKey(map, reference.getCodeService(), true);
                addServiceKey(map, reference.getServiceLabel(), true);
            }
        }
        return map;
    }

    private boolean isActiveReconcilableService(String service, Map<String, Boolean> activeReconcilableMap) {
        if (service == null) {
            return false;
        }
        Boolean isActiveReconcilable = activeReconcilableMap.get(normalizeCode(service));
        return Boolean.TRUE.equals(isActiveReconcilable);
    }

    private Map<String, Set<String>> buildServicesByCountryMap(List<Object[]> agencySummaryByCountryAndService) {
        Map<String, Set<String>> map = new HashMap<>();
        for (Object[] row : agencySummaryByCountryAndService) {
            String country = (String) row[0];
            String service = (String) row[1];
            if (country == null || country.isEmpty() || service == null || service.isEmpty()) {
                continue;
            }
            String normalizedCountry = normalizeCountryCode(country);
            String normalizedService = normalizeCode(service);
            map.computeIfAbsent(normalizedCountry, k -> new HashSet<>()).add(normalizedService);
        }
        return map;
    }


    private void addServiceKey(Map<String, Boolean> map, String key, boolean value) {
        String normalized = normalizeCode(key);
        if (!normalized.isEmpty()) {
            map.put(normalized, value);
        }
    }

    private boolean isReconcilableService(String service, Map<String, Boolean> reconcilableMap) {
        if (service == null) {
            return false;
        }
        Boolean reconcilable = reconcilableMap.get(normalizeCode(service));
        return Boolean.TRUE.equals(reconcilable);
    }

    private double computeVolumePortion(double totalVolume, int portionCount, int totalCount) {
        if (totalVolume <= 0 || totalCount <= 0 || portionCount <= 0) {
            return 0;
        }
        return totalVolume * ((double) portionCount / totalCount);
    }

    private double calculatePercentage(double value, double base) {
        if (base <= 0 || value <= 0) {
            return 0;
        }
        return Math.round((value / base) * 10000d) / 100d;
    }

    private double round(double value) {
        return Math.round(value * 100d) / 100d;
    }

    private static class DashboardAccumulator {
        double totalVolume = 0;
        long totalTransactions = 0;
        double matchedVolume = 0;
        double reconcilableVolume = 0;
        long reconcilableTransactions = 0;
        double netMatchedVolume = 0;
    }
}

