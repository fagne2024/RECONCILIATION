export interface ReconciliationRequest {
    boFileContent: Record<string, string>[];
    partnerFileContent: Record<string, string>[];
    boKeyColumn: string;
    partnerKeyColumn: string;
    comparisonColumns: {
        boColumn: string;
        partnerColumn: string;
    }[];
    selectedService?: string;
    
    // Filtres BO pour la réconciliation
    boColumnFilters?: BOColumnFilter[];
}

export interface BOColumnFilter {
    modelId: string;
    modelName: string;
    columnName: string;
    selectedValues: string[];
    appliedAt: string;
} 