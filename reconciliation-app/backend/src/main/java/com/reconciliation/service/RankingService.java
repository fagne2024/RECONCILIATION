package com.reconciliation.service;

import com.reconciliation.model.Operation;
import com.reconciliation.entity.AgencySummaryEntity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.WeekFields;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class RankingService {
    
    @Autowired
    private com.reconciliation.service.OperationService operationService;
    
    @Autowired
    private com.reconciliation.repository.AgencySummaryRepository agencySummaryRepository;
    
    @Autowired
    private com.reconciliation.repository.CompteRepository compteRepository;
    
    private static final Map<String, String> COUNTRY_KEYWORDS = initCountryKeywordMap();
    
    /**
     * Récupérer le classement des agences par nombre de transactions (via recordCount)
     */
    public List<Map<String, Object>> getAgencyRankingByTransactions(List<String> countries, String period, String startDate, String endDate) {
        // Filtrer les données selon la période temporelle
        List<AgencySummaryEntity> allSummaries = agencySummaryRepository.findAll();
        List<AgencySummaryEntity> summaries = filterSummariesByPeriod(allSummaries, period, startDate, endDate);
        
        // Filtrer par pays si spécifié
        if (countries != null && !countries.isEmpty()) {
            summaries = summaries.stream().filter(s -> matchesCountryFilter(s.getCountry(), countries)).collect(Collectors.toList());
        }
        
        List<Operation> allOperations = operationService.getAllOperationsWithFrais();
        // Filtrer les opérations selon la période temporelle
        allOperations = filterOperationsByPeriod(allOperations, period, startDate, endDate);
        
        // Filtrer par pays si spécifié
        if (countries != null && !countries.isEmpty()) {
            allOperations = allOperations.stream().filter(op -> matchesCountryFilter(op.getPays(), countries)).collect(Collectors.toList());
        }
        // Grouper par agence
        Map<String, List<AgencySummaryEntity>> byAgency = summaries.stream()
                .filter(s -> s.getAgency() != null && !s.getAgency().isEmpty())
                .collect(Collectors.groupingBy(AgencySummaryEntity::getAgency));
        List<Map<String, Object>> ranking = new ArrayList<>();
        for (Map.Entry<String, List<AgencySummaryEntity>> entry : byAgency.entrySet()) {
            String agency = entry.getKey();
            List<AgencySummaryEntity> list = entry.getValue();
            long transactionCount = list.stream().mapToLong(AgencySummaryEntity::getRecordCount).sum();
            double totalVolume = list.stream().mapToDouble(AgencySummaryEntity::getTotalVolume).sum();
            // Somme des frais pour cette agence
            double totalFees = allOperations.stream()
                .filter(op -> agency.equals(op.getCodeProprietaire()))
                .mapToDouble(op -> op.getMontantFrais() != null ? op.getMontantFrais() : 0.0)
                .sum();
            
            // Calcul des moyennes selon la période
            double averageVolume = calculateAverageVolumeByPeriod(list, period);
            double averageFees = calculateAverageFeesByPeriod(allOperations, agency, period);
            
            // Récupérer les pays distincts pour cette agence
            String countryList = getDistinctCountries(list);
            
            Map<String, Object> agencyData = new HashMap<>();
            agencyData.put("agency", agency);
            agencyData.put("country", countryList);
            agencyData.put("transactionCount", transactionCount);
            agencyData.put("totalVolume", totalVolume);
            agencyData.put("totalFees", totalFees);
            agencyData.put("averageVolume", averageVolume);
            agencyData.put("averageFees", averageFees);
            ranking.add(agencyData);
        }
        // Trier par nombre de transactions (décroissant)
        ranking.sort((a, b) -> Long.compare((Long) b.get("transactionCount"), (Long) a.get("transactionCount")));
        return ranking;
    }
    
    /**
     * Calculer le volume moyen selon la période pour une agence
     */
    private double calculateAverageVolumeByPeriod(List<AgencySummaryEntity> summaries, String period) {
        if (summaries.isEmpty()) {
            return 0.0;
        }
        
        // Grouper selon la période
        Map<String, List<AgencySummaryEntity>> byPeriod = summaries.stream()
            .filter(s -> s.getDate() != null && !s.getDate().isEmpty())
            .collect(Collectors.groupingBy(s -> {
                try {
                    LocalDate date = LocalDate.parse(s.getDate(), DateTimeFormatter.ofPattern("yyyy-MM-dd"));
                    return getPeriodKey(date, period);
                } catch (Exception e) {
                    return "unknown";
                }
            }));
        
        if (byPeriod.isEmpty()) {
            return 0.0;
        }
        
        // Calculer le volume total par période
        List<Double> periodVolumes = byPeriod.values().stream()
            .map(periodSummaries -> periodSummaries.stream()
                .mapToDouble(AgencySummaryEntity::getTotalVolume)
                .sum())
            .collect(Collectors.toList());
        
        // Retourner la moyenne des volumes par période
        return periodVolumes.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
    }
    
    /**
     * Calculer les frais moyens selon la période pour une agence
     */
    private double calculateAverageFeesByPeriod(List<Operation> allOperations, String agency, String period) {
        // Filtrer les opérations de cette agence
        List<Operation> agencyOperations = allOperations.stream()
            .filter(op -> agency.equals(op.getCodeProprietaire()))
            .collect(Collectors.toList());
        
        if (agencyOperations.isEmpty()) {
            return 0.0;
        }
        
        // Grouper selon la période
        Map<String, List<Operation>> byPeriod = agencyOperations.stream()
            .filter(op -> op.getDateOperation() != null)
            .collect(Collectors.groupingBy(op -> 
                getPeriodKey(op.getDateOperation().toLocalDate(), period)
            ));
        
        if (byPeriod.isEmpty()) {
            return 0.0;
        }
        
        // Calculer les frais totaux par période
        List<Double> periodFees = byPeriod.values().stream()
            .map(periodOperations -> periodOperations.stream()
                .mapToDouble(op -> op.getMontantFrais() != null ? op.getMontantFrais() : 0.0)
                .sum())
            .collect(Collectors.toList());
        
        // Retourner la moyenne des frais par période
        return periodFees.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
    }
    
    /**
     * Obtenir la clé de période selon le type demandé
     */
    private String getPeriodKey(LocalDate date, String period) {
        switch (period != null ? period.toLowerCase() : "month") {
            case "day":
                return date.format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
            case "week":
                int weekOfYear = date.get(WeekFields.ISO.weekOfWeekBasedYear());
                int year = date.getYear();
                return String.format("%d-W%02d", year, weekOfYear);
            case "month":
            default:
                return date.format(DateTimeFormatter.ofPattern("yyyy-MM"));
        }
    }
    
    /**
     * Récupérer le classement des agences par volume
     */
    public List<Map<String, Object>> getAgencyRankingByVolume(List<String> countries, String period, String startDate, String endDate) {
        List<Map<String, Object>> ranking = getAgencyRankingByTransactions(countries, period, startDate, endDate);
        ranking.sort((a, b) -> Double.compare((Double) b.get("totalVolume"), (Double) a.get("totalVolume")));
        return ranking;
    }
    
    /**
     * Récupérer le classement des agences par frais
     */
    public List<Map<String, Object>> getAgencyRankingByFees(List<String> countries, String period, String startDate, String endDate) {
        List<Map<String, Object>> ranking = getAgencyRankingByTransactions(countries, period, startDate, endDate);
        ranking.sort((a, b) -> Double.compare((Double) b.get("totalFees"), (Double) a.get("totalFees")));
        return ranking;
    }
    
    /**
     * Récupérer le classement des services par nombre de transactions (via recordCount)
     */
    public List<Map<String, Object>> getServiceRankingByTransactions(List<String> countries, String period, String startDate, String endDate) {
        // Filtrer les données selon la période temporelle
        List<AgencySummaryEntity> allSummaries = agencySummaryRepository.findAll();
        List<AgencySummaryEntity> summaries = filterSummariesByPeriod(allSummaries, period, startDate, endDate);
        
        // Filtrer par pays si spécifié
        if (countries != null && !countries.isEmpty()) {
            summaries = summaries.stream().filter(s -> matchesCountryFilter(s.getCountry(), countries)).collect(Collectors.toList());
        }
        
        List<Operation> allOperations = operationService.getAllOperationsWithFrais();
        // Filtrer les opérations selon la période temporelle
        allOperations = filterOperationsByPeriod(allOperations, period, startDate, endDate);
        
        // Filtrer par pays si spécifié
        if (countries != null && !countries.isEmpty()) {
            allOperations = allOperations.stream().filter(op -> matchesCountryFilter(op.getPays(), countries)).collect(Collectors.toList());
        }
        // Grouper par service
        Map<String, List<AgencySummaryEntity>> byService = summaries.stream()
                .filter(s -> s.getService() != null && !s.getService().isEmpty())
                .collect(Collectors.groupingBy(AgencySummaryEntity::getService));
        List<Map<String, Object>> ranking = new ArrayList<>();
        for (Map.Entry<String, List<AgencySummaryEntity>> entry : byService.entrySet()) {
            String service = entry.getKey();
            List<AgencySummaryEntity> list = entry.getValue();
            long transactionCount = list.stream().mapToLong(AgencySummaryEntity::getRecordCount).sum();
            double totalVolume = list.stream().mapToDouble(AgencySummaryEntity::getTotalVolume).sum();
            double totalFees = allOperations.stream()
                .filter(op -> service.equals(op.getService()))
                .mapToDouble(op -> op.getMontantFrais() != null ? op.getMontantFrais() : 0.0)
                .sum();
            long uniqueAgencies = list.stream().map(AgencySummaryEntity::getAgency).distinct().count();
            
            // Calcul des moyennes selon la période
            double averageVolume = calculateAverageVolumeByPeriodForService(list, period);
            double averageFees = calculateAverageFeesByPeriodForService(allOperations, service, period);
            
            // Récupérer les pays distincts pour ce service
            String countryList = getDistinctCountries(list);
            
            Map<String, Object> serviceData = new HashMap<>();
            serviceData.put("service", service);
            serviceData.put("country", countryList);
            serviceData.put("transactionCount", transactionCount);
            serviceData.put("totalVolume", totalVolume);
            serviceData.put("totalFees", totalFees);
            serviceData.put("uniqueAgencies", uniqueAgencies);
            serviceData.put("averageVolume", averageVolume);
            serviceData.put("averageFees", averageFees);
            ranking.add(serviceData);
        }
        // Trier par nombre de transactions (décroissant)
        ranking.sort((a, b) -> Long.compare((Long) b.get("transactionCount"), (Long) a.get("transactionCount")));
        return ranking;
    }
    
    /**
     * Calculer le volume moyen selon la période pour un service
     */
    private double calculateAverageVolumeByPeriodForService(List<AgencySummaryEntity> summaries, String period) {
        if (summaries.isEmpty()) {
            return 0.0;
        }
        
        // Grouper selon la période
        Map<String, List<AgencySummaryEntity>> byPeriod = summaries.stream()
            .filter(s -> s.getDate() != null && !s.getDate().isEmpty())
            .collect(Collectors.groupingBy(s -> {
                try {
                    LocalDate date = LocalDate.parse(s.getDate(), DateTimeFormatter.ofPattern("yyyy-MM-dd"));
                    return getPeriodKey(date, period);
                } catch (Exception e) {
                    return "unknown";
                }
            }));
        
        if (byPeriod.isEmpty()) {
            return 0.0;
        }
        
        // Calculer le volume total par période
        List<Double> periodVolumes = byPeriod.values().stream()
            .map(periodSummaries -> periodSummaries.stream()
                .mapToDouble(AgencySummaryEntity::getTotalVolume)
                .sum())
            .collect(Collectors.toList());
        
        // Retourner la moyenne des volumes par période
        return periodVolumes.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
    }
    
    /**
     * Calculer les frais moyens selon la période pour un service
     */
    private double calculateAverageFeesByPeriodForService(List<Operation> allOperations, String service, String period) {
        // Filtrer les opérations de ce service
        List<Operation> serviceOperations = allOperations.stream()
            .filter(op -> service.equals(op.getService()))
            .collect(Collectors.toList());
        
        if (serviceOperations.isEmpty()) {
            return 0.0;
        }
        
        // Grouper selon la période
        Map<String, List<Operation>> byPeriod = serviceOperations.stream()
            .filter(op -> op.getDateOperation() != null)
            .collect(Collectors.groupingBy(op -> 
                getPeriodKey(op.getDateOperation().toLocalDate(), period)
            ));
        
        if (byPeriod.isEmpty()) {
            return 0.0;
        }
        
        // Calculer les frais totaux par période
        List<Double> periodFees = byPeriod.values().stream()
            .map(periodOperations -> periodOperations.stream()
                .mapToDouble(op -> op.getMontantFrais() != null ? op.getMontantFrais() : 0.0)
                .sum())
            .collect(Collectors.toList());
        
        // Retourner la moyenne des frais par période
        return periodFees.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
    }
    
    /**
     * Récupérer le classement des services par volume
     */
    public List<Map<String, Object>> getServiceRankingByVolume(List<String> countries, String period, String startDate, String endDate) {
        List<Map<String, Object>> ranking = getServiceRankingByTransactions(countries, period, startDate, endDate);
        ranking.sort((a, b) -> Double.compare((Double) b.get("totalVolume"), (Double) a.get("totalVolume")));
        return ranking;
    }
    
    /**
     * Récupérer le classement des services par frais
     */
    public List<Map<String, Object>> getServiceRankingByFees(List<String> countries, String period, String startDate, String endDate) {
        List<Map<String, Object>> ranking = getServiceRankingByTransactions(countries, period, startDate, endDate);
        ranking.sort((a, b) -> Double.compare((Double) b.get("totalFees"), (Double) a.get("totalFees")));
        return ranking;
    }
    
    /**
     * Récupérer tous les classements (agences et services)
     */
    public Map<String, Object> getAllRankings(String period) {
        Map<String, Object> rankings = new HashMap<>();
        rankings.put("agenciesByTransactions", getAgencyRankingByTransactions(null, period, null, null));
        rankings.put("agenciesByVolume", getAgencyRankingByVolume(null, period, null, null));
        rankings.put("agenciesByFees", getAgencyRankingByFees(null, period, null, null));
        rankings.put("servicesByTransactions", getServiceRankingByTransactions(null, period, null, null));
        rankings.put("servicesByVolume", getServiceRankingByVolume(null, period, null, null));
        rankings.put("servicesByFees", getServiceRankingByFees(null, period, null, null));
        return rankings;
    }
    
    /**
     * Filtrer les AgencySummaryEntity selon la période temporelle
     */
    private List<AgencySummaryEntity> filterSummariesByPeriod(List<AgencySummaryEntity> summaries, String period, String customStartDate, String customEndDate) {
        LocalDate today = LocalDate.now();
        LocalDate startDate;
        LocalDate endDate;
        
        if ("custom".equals(period) && customStartDate != null && customEndDate != null) {
            // Période personnalisée
            try {
                startDate = LocalDate.parse(customStartDate);
                endDate = LocalDate.parse(customEndDate);
            } catch (Exception e) {
                // En cas d'erreur de parsing, utiliser le mois en cours
                startDate = today.withDayOfMonth(1);
                endDate = today.withDayOfMonth(today.lengthOfMonth());
            }
        } else {
            switch (period != null ? period.toLowerCase() : "month") {
                case "all":
                    // Toute la période - pas de filtrage temporel
                    return summaries; // Retourner toutes les données sans filtrage
                case "day":
                    // J-1 (hier)
                    startDate = today.minusDays(1);
                    endDate = today.minusDays(1);
                    break;
                case "week":
                    // Dernière semaine (lundi au dimanche)
                    startDate = today.minusWeeks(1).with(java.time.DayOfWeek.MONDAY);
                    endDate = startDate.plusDays(6);
                    break;
                case "thisyear":
                    // Cette année (1er janvier au 31 décembre)
                    startDate = today.withDayOfYear(1);
                    endDate = today.withDayOfYear(today.lengthOfYear());
                    break;
                case "lastyear":
                    // Année dernière (1er janvier au 31 décembre de l'année précédente)
                    startDate = today.minusYears(1).withDayOfYear(1);
                    endDate = today.minusYears(1).withDayOfYear(today.minusYears(1).lengthOfYear());
                    break;
                case "lastmonth":
                    // Mois dernier (1er au dernier jour du mois précédent)
                    startDate = today.minusMonths(1).withDayOfMonth(1);
                    endDate = today.minusMonths(1).withDayOfMonth(today.minusMonths(1).lengthOfMonth());
                    break;
                case "month":
                default:
                    // Mois en cours
                    startDate = today.withDayOfMonth(1);
                    endDate = today.withDayOfMonth(today.lengthOfMonth());
                    break;
            }
        }
        
        final LocalDate finalStartDate = startDate;
        final LocalDate finalEndDate = endDate;
        
        return summaries.stream()
            .filter(s -> {
                if (s.getDate() == null || s.getDate().isEmpty()) {
                    return false;
                }
                try {
                    LocalDate summaryDate = LocalDate.parse(s.getDate(), DateTimeFormatter.ofPattern("yyyy-MM-dd"));
                    return !summaryDate.isBefore(finalStartDate) && !summaryDate.isAfter(finalEndDate);
                } catch (Exception e) {
                    return false;
                }
            })
            .collect(Collectors.toList());
    }
    
    /**
     * Filtrer les opérations selon la période temporelle
     */
    private List<Operation> filterOperationsByPeriod(List<Operation> operations, String period, String customStartDate, String customEndDate) {
        LocalDate today = LocalDate.now();
        LocalDate startDate;
        LocalDate endDate;
        
        if ("custom".equals(period) && customStartDate != null && customEndDate != null) {
            // Période personnalisée
            try {
                startDate = LocalDate.parse(customStartDate);
                endDate = LocalDate.parse(customEndDate);
            } catch (Exception e) {
                // En cas d'erreur de parsing, utiliser le mois en cours
                startDate = today.withDayOfMonth(1);
                endDate = today.withDayOfMonth(today.lengthOfMonth());
            }
        } else {
            switch (period != null ? period.toLowerCase() : "month") {
                case "all":
                    // Toute la période - pas de filtrage temporel
                    return operations; // Retourner toutes les opérations sans filtrage
                case "day":
                    // J-1 (hier)
                    startDate = today.minusDays(1);
                    endDate = today.minusDays(1);
                    break;
                case "week":
                    // Dernière semaine (lundi au dimanche)
                    startDate = today.minusWeeks(1).with(java.time.DayOfWeek.MONDAY);
                    endDate = startDate.plusDays(6);
                    break;
                case "thisyear":
                    // Cette année (1er janvier au 31 décembre)
                    startDate = today.withDayOfYear(1);
                    endDate = today.withDayOfYear(today.lengthOfYear());
                    break;
                case "lastyear":
                    // Année dernière (1er janvier au 31 décembre de l'année précédente)
                    startDate = today.minusYears(1).withDayOfYear(1);
                    endDate = today.minusYears(1).withDayOfYear(today.minusYears(1).lengthOfYear());
                    break;
                case "lastmonth":
                    // Mois dernier (1er au dernier jour du mois précédent)
                    startDate = today.minusMonths(1).withDayOfMonth(1);
                    endDate = today.minusMonths(1).withDayOfMonth(today.minusMonths(1).lengthOfMonth());
                    break;
                case "month":
                default:
                    // Mois en cours
                    startDate = today.withDayOfMonth(1);
                    endDate = today.withDayOfMonth(today.lengthOfMonth());
                    break;
            }
        }
        
        final LocalDate finalStartDate = startDate;
        final LocalDate finalEndDate = endDate;
        
        return operations.stream()
            .filter(op -> {
                if (op.getDateOperation() == null) {
                    return false;
                }
                LocalDate operationDate = op.getDateOperation().toLocalDate();
                return !operationDate.isBefore(finalStartDate) && !operationDate.isAfter(finalEndDate);
            })
            .collect(Collectors.toList());
    }
    
    /**
     * Vérifie si un pays correspond aux filtres de pays sélectionnés
     * Gère les cas spéciaux comme CI et CICTH qui doivent être traités de la même manière
     */
    private boolean matchesCountryFilter(String country, List<String> filterCountries) {
        if (country == null || country.trim().isEmpty()) {
            return false;
        }
        
        // Normaliser le pays à vérifier
        String normalizedCountry = normalizeCountryCode(country);
        
        if (normalizedCountry.isEmpty()) {
            return false;
        }
        
        // Vérifier si le pays normalisé correspond à l'un des filtres (normalisés aussi)
        for (String filterCountry : filterCountries) {
            if (filterCountry == null || filterCountry.trim().isEmpty()) {
                continue;
            }
            String normalizedFilter = normalizeCountryCode(filterCountry);
            
            // Correspondance après normalisation (CI et CICTH seront tous les deux normalisés en CI)
            if (normalizedCountry.equals(normalizedFilter)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * Normalise un code pays pour le filtrage
     * CI et CICTH sont traités de la même manière
     */
    private String normalizeCountryCode(String countryCode) {
        if (countryCode == null || countryCode.trim().isEmpty()) {
            return "";
        }
        
        String trimmed = countryCode.trim();
        if (trimmed.isEmpty()) {
            return "";
        }
        
        String normalized = Normalizer.normalize(trimmed, Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "")
            .toUpperCase();
        String normalizedWithSpaces = normalized.replaceAll("[^A-Z0-9 ]", " ").replaceAll("\\s+", " ").trim();
        String lettersOnly = normalized.replaceAll("[^A-Z0-9]", "");
        
        if (lettersOnly.isEmpty()) {
            return "";
        }
        
        // Gérer les variantes spéciales : CICTH est équivalent à CI
        if (lettersOnly.startsWith("CICTH")) {
            return "CI";
        }
        
        // Si c'est déjà un code à 2 lettres, le retourner tel quel
        if (lettersOnly.length() == 2) {
            return lettersOnly;
        }
        
        for (Map.Entry<String, String> entry : COUNTRY_KEYWORDS.entrySet()) {
            if (normalizedWithSpaces.contains(entry.getKey())) {
                return entry.getValue();
            }
        }
        
        // Fallback : retourner les deux premières lettres si disponibles
        if (lettersOnly.length() >= 2) {
            return lettersOnly.substring(0, 2);
        }
        
        return lettersOnly;
    }
    
    /**
     * Récupère les pays distincts depuis une liste de summaries
     * Retourne une chaîne avec les pays séparés par des virgules
     */
    private String getDistinctCountries(List<AgencySummaryEntity> summaries) {
        if (summaries == null || summaries.isEmpty()) {
            return "";
        }
        
        List<String> countries = summaries.stream()
            .map(AgencySummaryEntity::getCountry)
            .map(this::normalizeCountryCode)
            .filter(country -> country != null && !country.isEmpty())
            .distinct()
            .sorted()
            .collect(Collectors.toList());
        
        if (countries.isEmpty()) {
            return "";
        }
        
        // Si un seul pays, le retourner tel quel
        if (countries.size() == 1) {
            return countries.get(0);
        }
        
        // Sinon, les concaténer avec des virgules
        return String.join(", ", countries);
    }
    
    /**
     * Récupère la liste des pays distincts normalisés pour le dropdown
     * Normalise les variantes comme CI et CICTH en un seul CI
     */
    public List<String> getNormalizedDistinctCountries() {
        List<String> allCountries = compteRepository.findDistinctPays();
        
        // Normaliser et dédupliquer les pays
        return allCountries.stream()
            .filter(country -> country != null && !country.trim().isEmpty())
            .map(this::normalizeCountryCode)
            .filter(normalized -> !normalized.isEmpty())
            .distinct()
            .sorted()
            .collect(Collectors.toList());
    }
    
    private static Map<String, String> initCountryKeywordMap() {
        Map<String, String> map = new LinkedHashMap<>();
        map.put("COTE D IVOIRE", "CI");
        map.put("COTE IVOIRE", "CI");
        map.put("COTE DIVOIRE", "CI");
        map.put("COTE DIVOIRES", "CI");
        map.put("SENEGAL", "SN");
        map.put("CAMEROUN", "CM");
        map.put("CAMEROON", "CM");
        map.put("BURKINA FASO", "BF");
        map.put("BURKINA", "BF");
        map.put("MALI", "ML");
        map.put("BENIN", "BJ");
        map.put("GUINEE", "GN");
        map.put("GUINEA", "GN");
        map.put("GABON", "GA");
        map.put("TOGO", "TG");
        map.put("TCHAD", "TD");
        map.put("CHAD", "TD");
        map.put("NIGERIA", "NG");
        map.put("NIGER", "NE");
        map.put("KENYA", "KE");
        map.put("MOZAMBIQUE", "MZ");
        map.put("MOZAMBIC", "MZ");
        return map;
    }
} 