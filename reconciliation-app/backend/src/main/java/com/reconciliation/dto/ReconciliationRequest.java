package com.reconciliation.dto;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class ReconciliationRequest {
    private List<Map<String, String>> boFileContent;
    private List<Map<String, String>> partnerFileContent;
    private String boKeyColumn;
    private String partnerKeyColumn;
    private List<ColumnComparison> comparisonColumns;
    
    // Filtres BO pour la réconciliation
    private List<BOColumnFilter> boColumnFilters;
    
    // Type de réconciliation (1-1, 1-2, 1-3, 1-4, 1-5)
    private String reconciliationType = "1-1";
    
    @Data
    public static class BOColumnFilter {
        private String modelId;
        private String modelName;
        private String columnName;
        private List<String> selectedValues;
        private String appliedAt;
    }
} 