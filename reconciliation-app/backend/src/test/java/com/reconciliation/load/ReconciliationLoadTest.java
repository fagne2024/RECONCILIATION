package com.reconciliation.load;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.reconciliation.dto.ReconciliationRequest;
import com.reconciliation.dto.ColumnComparison;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

/**
 * Test de charge simulant 100 utilisateurs connectés lançant une réconciliation simultanément
 */
@Slf4j
@SpringBootTest
public class ReconciliationLoadTest {

    private static final String BASE_URL = "http://localhost:8080/api/reconciliation";
    private static final int NUMBER_OF_USERS = 100;
    private static final int TIMEOUT_SECONDS = 300; // 5 minutes

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Génère des données de test pour la réconciliation
     */
    private ReconciliationRequest createTestReconciliationRequest(int userId) {
        ReconciliationRequest request = new ReconciliationRequest();
        
        // Créer des données BO avec des enregistrements uniques par utilisateur
        List<Map<String, String>> boData = new ArrayList<>();
        for (int i = 0; i < 50; i++) {
            Map<String, String> record = new HashMap<>();
            record.put("id", "BO_" + userId + "_" + i);
            record.put("montant", String.valueOf(100 + i * 10));
            record.put("date", "2024-01-15");
            record.put("service", "SERVICE_" + (i % 5));
            boData.add(record);
        }
        
        // Créer des données Partenaire avec quelques correspondances
        List<Map<String, String>> partnerData = new ArrayList<>();
        for (int i = 0; i < 45; i++) {
            Map<String, String> record = new HashMap<>();
            record.put("id", "PARTNER_" + userId + "_" + i);
            record.put("montant", String.valueOf(100 + i * 10));
            record.put("date", "2024-01-15");
            record.put("service", "SERVICE_" + (i % 5));
            partnerData.add(record);
        }
        
        // Ajouter quelques correspondances exactes
        for (int i = 0; i < 10; i++) {
            Map<String, String> boRecord = boData.get(i);
            Map<String, String> partnerRecord = new HashMap<>();
            partnerRecord.put("id", boRecord.get("id"));
            partnerRecord.put("montant", boRecord.get("montant"));
            partnerRecord.put("date", boRecord.get("date"));
            partnerRecord.put("service", boRecord.get("service"));
            partnerData.add(partnerRecord);
        }
        
        request.setBoFileContent(boData);
        request.setPartnerFileContent(partnerData);
        request.setBoKeyColumn("id");
        request.setPartnerKeyColumn("id");
        
        // Colonnes de comparaison
        ColumnComparison comparison = new ColumnComparison();
        comparison.setBoColumn("montant");
        comparison.setPartnerColumn("montant");
        request.setComparisonColumns(List.of(comparison));
        
        return request;
    }

    /**
     * Exécute une réconciliation pour un utilisateur
     */
    private TestResult executeReconciliation(int userId) {
        long startTime = System.currentTimeMillis();
        String status = "SUCCESS";
        String errorMessage = null;
        
        try {
            ReconciliationRequest request = createTestReconciliationRequest(userId);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<ReconciliationRequest> entity = new HttpEntity<>(request, headers);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(
                BASE_URL + "/reconcile",
                entity,
                Map.class
            );
            
            long duration = System.currentTimeMillis() - startTime;
            
            if (response.getStatusCode().is2xxSuccessful()) {
                Map<String, Object> body = response.getBody();
                if (body != null) {
                    log.info("✅ Utilisateur {} - Réconciliation réussie en {} ms", userId, duration);
                    return new TestResult(userId, true, duration, null, body);
                } else {
                    status = "ERROR";
                    errorMessage = "Réponse vide";
                }
            } else {
                status = "ERROR";
                errorMessage = "Code HTTP: " + response.getStatusCode();
            }
            
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            status = "ERROR";
            errorMessage = e.getMessage();
            log.error("❌ Utilisateur {} - Erreur après {} ms: {}", userId, duration, e.getMessage());
        }
        
        long duration = System.currentTimeMillis() - startTime;
        return new TestResult(userId, false, duration, errorMessage, null);
    }

    /**
     * Test principal simulant 100 utilisateurs
     */
    @Test
    public void test100UsersSimultaneousReconciliation() throws InterruptedException {
        log.info("🚀 === DÉBUT DU TEST DE CHARGE ===");
        log.info("👥 Nombre d'utilisateurs: {}", NUMBER_OF_USERS);
        log.info("⏱️  Timeout: {} secondes", TIMEOUT_SECONDS);
        
        ExecutorService executor = Executors.newFixedThreadPool(NUMBER_OF_USERS);
        CountDownLatch latch = new CountDownLatch(NUMBER_OF_USERS);
        List<Future<TestResult>> futures = new ArrayList<>();
        
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger errorCount = new AtomicInteger(0);
        List<Long> responseTimes = new CopyOnWriteArrayList<>();
        
        long testStartTime = System.currentTimeMillis();
        
        // Lancer toutes les réconciliations simultanément
        for (int i = 1; i <= NUMBER_OF_USERS; i++) {
            final int userId = i;
            Future<TestResult> future = executor.submit(() -> {
                try {
                    TestResult result = executeReconciliation(userId);
                    if (result.success) {
                        successCount.incrementAndGet();
                    } else {
                        errorCount.incrementAndGet();
                    }
                    responseTimes.add(result.duration);
                    return result;
                } finally {
                    latch.countDown();
                }
            });
            futures.add(future);
        }
        
        // Attendre que toutes les réconciliations soient terminées ou timeout
        boolean completed = latch.await(TIMEOUT_SECONDS, TimeUnit.SECONDS);
        long testEndTime = System.currentTimeMillis();
        long totalTestDuration = testEndTime - testStartTime;
        
        // Récupérer tous les résultats
        List<TestResult> results = new ArrayList<>();
        for (Future<TestResult> future : futures) {
            try {
                if (future.isDone()) {
                    results.add(future.get(1, TimeUnit.SECONDS));
                }
            } catch (Exception e) {
                log.error("Erreur lors de la récupération du résultat: {}", e.getMessage());
            }
        }
        
        executor.shutdown();
        executor.awaitTermination(10, TimeUnit.SECONDS);
        
        // Calculer les statistiques
        calculateAndPrintStatistics(results, responseTimes, totalTestDuration, completed);
    }

    /**
     * Calcule et affiche les statistiques du test
     */
    private void calculateAndPrintStatistics(
            List<TestResult> results,
            List<Long> responseTimes,
            long totalTestDuration,
            boolean completed) {
        
        log.info("\n" + "=".repeat(80));
        log.info("📊 === RÉSULTATS DU TEST DE CHARGE ===");
        log.info("=".repeat(80));
        
        int totalRequests = results.size();
        long successCount = results.stream().filter(r -> r.success).count();
        long errorCount = results.stream().filter(r -> !r.success).count();
        
        log.info("\n📈 STATISTIQUES GÉNÉRALES:");
        log.info("   • Durée totale du test: {} ms ({} secondes)", 
                totalTestDuration, String.format("%.2f", totalTestDuration / 1000.0));
        log.info("   • Nombre total de requêtes: {}", totalRequests);
        log.info("   • Requêtes réussies: {} ({}%)", 
                successCount, String.format("%.2f", successCount * 100.0 / totalRequests));
        log.info("   • Requêtes échouées: {} ({}%)", 
                errorCount, String.format("%.2f", errorCount * 100.0 / totalRequests));
        log.info("   • Test complété: {}", completed ? "OUI" : "NON (timeout)");
        
        if (!responseTimes.isEmpty()) {
            Collections.sort(responseTimes);
            long minTime = responseTimes.get(0);
            long maxTime = responseTimes.get(responseTimes.size() - 1);
            double avgTime = responseTimes.stream().mapToLong(Long::longValue).average().orElse(0);
            long medianTime = responseTimes.get(responseTimes.size() / 2);
            long p95Time = responseTimes.get((int) (responseTimes.size() * 0.95));
            long p99Time = responseTimes.get((int) (responseTimes.size() * 0.99));
            
            log.info("\n⏱️  TEMPS DE RÉPONSE (ms):");
            log.info("   • Minimum: {} ms", minTime);
            log.info("   • Maximum: {} ms", maxTime);
            log.info("   • Moyenne: {} ms", String.format("%.2f", avgTime));
            log.info("   • Médiane: {} ms", medianTime);
            log.info("   • P95 (95ème percentile): {} ms", p95Time);
            log.info("   • P99 (99ème percentile): {} ms", p99Time);
            
            // Calculer le débit (requêtes par seconde)
            double throughput = (totalRequests * 1000.0) / totalTestDuration;
            log.info("\n🚀 DÉBIT:");
            log.info("   • Requêtes par seconde: {} req/s", String.format("%.2f", throughput));
        }
        
        // Afficher les erreurs
        List<TestResult> errors = results.stream()
                .filter(r -> !r.success)
                .collect(Collectors.toList());
        
        if (!errors.isEmpty()) {
            log.info("\n❌ ERREURS DÉTECTÉES ({}):", errors.size());
            Map<String, Long> errorTypes = errors.stream()
                    .collect(Collectors.groupingBy(
                            r -> r.errorMessage != null ? r.errorMessage : "Erreur inconnue",
                            Collectors.counting()));
            
            errorTypes.forEach((error, count) -> {
                log.info("   • {}: {} occurrence(s)", error, count);
            });
            
            // Afficher les 10 premières erreurs en détail
            log.info("\n📋 DÉTAILS DES PREMIÈRES ERREURS:");
            errors.stream().limit(10).forEach(error -> {
                log.info("   • Utilisateur {}: {} (durée: {} ms)", 
                        error.userId, error.errorMessage, error.duration);
            });
        }
        
        // Statistiques par tranche de temps
        log.info("\n📊 RÉPARTITION DES TEMPS DE RÉPONSE:");
        long[] ranges = {100, 500, 1000, 2000, 5000, 10000, Long.MAX_VALUE};
        String[] labels = {"<100ms", "100-500ms", "500ms-1s", "1-2s", "2-5s", "5-10s", ">10s"};
        
        for (int i = 0; i < ranges.length; i++) {
            long max = ranges[i];
            long min = i == 0 ? 0 : ranges[i - 1];
            long count = responseTimes.stream()
                    .filter(t -> t >= min && t < max)
                    .count();
            double percentage = (count * 100.0) / responseTimes.size();
            log.info("   • {}: {} requêtes ({}%)", labels[i], count, String.format("%.2f", percentage));
        }
        
        log.info("\n" + "=".repeat(80));
        log.info("✅ === FIN DU TEST DE CHARGE ===");
        log.info("=".repeat(80) + "\n");
    }

    /**
     * Classe pour stocker les résultats d'un test
     */
    private static class TestResult {
        int userId;
        boolean success;
        long duration;
        String errorMessage;
        Map<String, Object> response;
        
        TestResult(int userId, boolean success, long duration, String errorMessage, Map<String, Object> response) {
            this.userId = userId;
            this.success = success;
            this.duration = duration;
            this.errorMessage = errorMessage;
            this.response = response;
        }
    }
}

