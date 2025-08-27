import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { KeyAnalysisResponse, KeySuggestion } from '../../models/key-analysis.model';
import { ReconciliationService } from '../../services/reconciliation.service';

@Component({
    selector: 'app-key-analysis',
    templateUrl: './key-analysis.component.html',
    styleUrls: ['./key-analysis.component.scss']
})
export class KeyAnalysisComponent implements OnInit {
    @Input() analysisResult: KeyAnalysisResponse | null = null;
    @Input() isLoading = false;
    @Input() error: string | null = null;
    
    @Output() suggestionSelected = new EventEmitter<KeySuggestion>();
    @Output() retryAnalysis = new EventEmitter<void>();

    constructor(private reconciliationService: ReconciliationService) {}

    ngOnInit(): void {
        console.log('🔍 KeyAnalysisComponent initialisé');
    }

    /**
     * Sélectionne une suggestion de clé
     */
    selectSuggestion(suggestion: KeySuggestion): void {
        console.log('✅ Suggestion sélectionnée:', suggestion);
        this.suggestionSelected.emit(suggestion);
    }

    /**
     * Relance l'analyse
     */
    retry(): void {
        console.log('🔄 Relance de l\'analyse...');
        this.retryAnalysis.emit();
    }

    /**
     * Formate le score de confiance en pourcentage
     */
    formatConfidence(score: number): string {
        return `${(score * 100).toFixed(1)}%`;
    }

    /**
     * Formate le taux d'unicité en pourcentage
     */
    formatUniqueness(rate: number): string {
        return `${(rate * 100).toFixed(1)}%`;
    }

    /**
     * Obtient la classe CSS pour le score de confiance
     */
    getConfidenceClass(score: number): string {
        if (score >= 0.8) return 'high-confidence';
        if (score >= 0.6) return 'medium-confidence';
        if (score >= 0.4) return 'low-confidence';
        return 'very-low-confidence';
    }

    /**
     * Obtient la classe CSS pour le taux d'unicité
     */
    getUniquenessClass(rate: number): string {
        if (rate >= 0.9) return 'high-uniqueness';
        if (rate >= 0.7) return 'medium-uniqueness';
        if (rate >= 0.5) return 'low-uniqueness';
        return 'very-low-uniqueness';
    }

    /**
     * Limite le nombre d'éléments dans un tableau
     */
    limitArray(array: string[], maxItems: number): string[] {
        return array.slice(0, maxItems);
    }
}
