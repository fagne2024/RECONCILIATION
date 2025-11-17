package com.reconciliation.controller;

import com.reconciliation.model.Statistics;
import com.reconciliation.service.StatisticsService;
import com.reconciliation.util.RequestContextUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/statistics")
@CrossOrigin(origins = {"http://localhost:4200", "http://172.214.108.8:4200"}, allowCredentials = "true")
public class StatisticsController {
    private static final Logger logger = LoggerFactory.getLogger(StatisticsController.class);
    
    private final StatisticsService statisticsService;

    @Autowired
    public StatisticsController(StatisticsService statisticsService) {
        this.statisticsService = statisticsService;
    }

    @PostMapping("/save")
    public ResponseEntity<?> saveStatistics(@RequestBody List<Statistics> statistics, HttpServletRequest request) {
        logger.info("=== STATISTICS SAVE REQUEST RECEIVED ===");
        logger.info("Method: {}", request.getMethod());
        logger.info("Origin: {}", request.getHeader("Origin"));
        logger.info("Content-Type: {}", request.getContentType());
        logger.info("Number of statistics records: {}", statistics.size());
        
        try {
            if (statistics == null || statistics.isEmpty()) {
                logger.warn("Received empty statistics list");
                return ResponseEntity.badRequest().body("Statistics list cannot be empty");
            }

            logger.debug("Processing statistics records:");
            for (Statistics stat : statistics) {
                logger.debug("Record: agency={}, service={}, date={}, totalVolume={}, recordCount={}",
                    stat.getAgency(), stat.getService(), stat.getDate(), 
                    stat.getTotalVolume(), stat.getRecordCount());
            }

            List<Statistics> savedStats = statisticsService.saveStatistics(statistics);
            logger.info("Successfully saved {} statistics records", savedStats.size());
            return ResponseEntity.ok(savedStats);
        } catch (Exception e) {
            logger.error("Error saving statistics: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                .body("Failed to save statistics: " + e.getMessage());
        }
    }

    @GetMapping("/by-date")
    public ResponseEntity<?> getStatisticsByDate(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            HttpServletRequest request) {
        logger.info("=== STATISTICS BY DATE REQUEST RECEIVED ===");
        logger.info("Method: {}", request.getMethod());
        logger.info("Origin: {}", request.getHeader("Origin"));
        logger.info("Date parameter: {}", date);
        
        try {
            String username = RequestContextUtil.getUsernameFromRequest();
            List<Statistics> stats = statisticsService.getStatisticsByDate(date, username);
            logger.info("Found {} statistics records for date {}", stats.size(), date);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            logger.error("Error fetching statistics by date {}: {}", date, e.getMessage(), e);
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                .body("Failed to fetch statistics: " + e.getMessage());
        }
    }

    @GetMapping("/by-filters")
    public ResponseEntity<?> getStatisticsByFilters(
            @RequestParam(required = false) String agency,
            @RequestParam(required = false) String service,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            HttpServletRequest request) {
        logger.info("=== STATISTICS BY FILTERS REQUEST RECEIVED ===");
        logger.info("Method: {}", request.getMethod());
        logger.info("Origin: {}", request.getHeader("Origin"));
        logger.info("Filters: agency={}, service={}, startDate={}, endDate={}", 
            agency, service, startDate, endDate);
        
        try {
            String username = RequestContextUtil.getUsernameFromRequest();
            List<Statistics> stats = statisticsService.getStatisticsByFilters(agency, service, startDate, endDate, username);
            logger.info("Found {} statistics records matching filters", stats.size());
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            logger.error("Error fetching statistics with filters: {}", e.getMessage(), e);
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                .body("Failed to fetch statistics: " + e.getMessage());
        }
    }

    @GetMapping("/dashboard-metrics")
    public ResponseEntity<?> getDashboardMetrics(HttpServletRequest request) {
        logger.info("=== DASHBOARD METRICS REQUEST RECEIVED ===");
        logger.info("Method: {}", request.getMethod());
        logger.info("Origin: {}", request.getHeader("Origin"));
        
        try {
            String username = RequestContextUtil.getUsernameFromRequest();
            Map<String, Object> metrics = statisticsService.getDashboardMetrics(username);
            logger.info("Dashboard metrics calculated successfully");
            return ResponseEntity.ok(metrics);
        } catch (Exception e) {
            logger.error("Error fetching dashboard metrics: {}", e.getMessage(), e);
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                .body("Failed to fetch dashboard metrics: " + e.getMessage());
        }
    }

    @GetMapping("/filter-options")
    public ResponseEntity<?> getFilterOptions(HttpServletRequest request) {
        logger.info("=== FILTER OPTIONS REQUEST RECEIVED ===");
        logger.info("Method: {}", request.getMethod());
        logger.info("Origin: {}", request.getHeader("Origin"));
        
        try {
            String username = RequestContextUtil.getUsernameFromRequest();
            Map<String, Object> filterOptions = statisticsService.getFilterOptions(username);
            logger.info("Filter options retrieved successfully");
            return ResponseEntity.ok(filterOptions);
        } catch (Exception e) {
            logger.error("Error fetching filter options: {}", e.getMessage(), e);
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                .body("Failed to fetch filter options: " + e.getMessage());
        }
    }

    @GetMapping("/detailed-metrics")
    public ResponseEntity<?> getDetailedMetrics(
            @RequestParam(required = false) List<String> agency,
            @RequestParam(required = false) List<String> service,
            @RequestParam(required = false) List<String> country,
            @RequestParam(required = false) String timeFilter,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            HttpServletRequest request) {
        logger.info("=== DETAILED METRICS REQUEST RECEIVED ===");
        logger.info("Method: {}", request.getMethod());
        logger.info("Origin: {}", request.getHeader("Origin"));
        logger.info("Filters: agency={}, service={}, country={}, timeFilter={}, startDate={}, endDate={}", 
            agency, service, country, timeFilter, startDate, endDate);
        
        try {
            String username = RequestContextUtil.getUsernameFromRequest();
            Map<String, Object> metrics = statisticsService.getDetailedMetrics(agency, service, country, timeFilter, startDate, endDate, username);
            logger.info("Detailed metrics calculated successfully");
            return ResponseEntity.ok(metrics);
        } catch (Exception e) {
            logger.error("Error fetching detailed metrics: {}", e.getMessage(), e);
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                .body("Failed to fetch detailed metrics: " + e.getMessage());
        }
    }

    @GetMapping("/transaction-created-stats")
    public ResponseEntity<?> getTransactionCreatedStatsByService(
            @RequestParam(required = false) List<String> agency,
            @RequestParam(required = false) List<String> service,
            @RequestParam(required = false) List<String> country,
            @RequestParam(required = false) String timeFilter,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            HttpServletRequest request) {
        logger.info("=== TRANSACTION CREATED STATS REQUEST RECEIVED ===");
        logger.info("Method: {}", request.getMethod());
        logger.info("Origin: {}", request.getHeader("Origin"));
        logger.info("Filters: agency={}, service={}, country={}, timeFilter={}, startDate={}, endDate={}", 
            agency, service, country, timeFilter, startDate, endDate);
        
        try {
            String username = RequestContextUtil.getUsernameFromRequest();
            Map<String, Object> stats = statisticsService.getTransactionCreatedStatsByService(agency, service, country, timeFilter, startDate, endDate, username);
            logger.info("Transaction created stats calculated successfully");
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            logger.error("Error fetching transaction created stats: {}", e.getMessage(), e);
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                .body("Failed to fetch transaction created stats: " + e.getMessage());
        }
    }
} 