export interface KeyAnalysisResponse {
    success: boolean;
    suggestions: KeySuggestion[];
    totalAnalyzed: number;
    overallConfidence: number;
    error?: string;
    message?: string;
}

export interface KeySuggestion {
    boColumn: string;
    partnerColumn: string;
    confidenceScore: number;
    uniqueness: {
        bo: number;
        partner: number;
    };
    sampleData: {
        bo: string[];
        partner: string[];
    };
    transformation?: {
        type: 'remove_suffix' | 'remove_prefix' | 'remove_pattern';
        pattern: string;
        description: string;
    };
    appliedTreatments?: string[];
    reason?: string;
}

export interface UniquenessInfo {
    bo: number;
    partner: number;
}

export interface SampleDataInfo {
    bo: string[];
    partner: string[];
}
