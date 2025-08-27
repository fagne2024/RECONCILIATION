import { Injectable } from '@angular/core';

export interface KeySuggestion {
    boColumn: string;
    partnerColumn: string;
    confidence: number;
    reason: string;
    sampleValues: string[];
    transformation?: {
        type: 'remove_suffix' | 'remove_prefix' | 'remove_pattern';
        pattern: string;
        description: string;
    };
}

export interface KeyAnalysisResult {
    suggestions: KeySuggestion[];
    overallConfidence: number;
    recommendedKeys: string[];
}

@Injectable({
    providedIn: 'root'
})
export class KeySuggestionService {

    constructor() { }

    /**
     * Analyse les données et suggère les meilleures clés de réconciliation
     */
    analyzeAndSuggestKeys(boData: Record<string, string>[], partnerData: Record<string, string>[]): KeyAnalysisResult {
        console.log('🔍 Début de l\'analyse des clés de réconciliation...');
        
        const suggestions: KeySuggestion[] = [];
        const boColumns = boData.length > 0 ? Object.keys(boData[0]) : [];
        const partnerColumns = partnerData.length > 0 ? Object.keys(partnerData[0]) : [];
        
        console.log('📊 Colonnes BO:', boColumns);
        console.log('📊 Colonnes Partner:', partnerColumns);
        
        // Log des colonnes importantes
        const importantBoCols = boColumns.filter(col => 
            col.toLowerCase().includes('id') || 
            col.toLowerCase().includes('transaction') || 
            col.toLowerCase().includes('cle') ||
            col.toLowerCase().includes('montant')
        );
        const importantPartnerCols = partnerColumns.filter(col => 
            col.toLowerCase().includes('id') || 
            col.toLowerCase().includes('transaction') || 
            col.toLowerCase().includes('amount') ||
            col.toLowerCase().includes('external')
        );
        
        console.log('🎯 Colonnes BO importantes:', importantBoCols);
        console.log('🎯 Colonnes Partner importantes:', importantPartnerCols);
        
        // Log des premières lignes de données pour debug
        if (boData.length > 0) {
            console.log('📊 Première ligne BO:', boData[0]);
        }
        if (partnerData.length > 0) {
            console.log('📊 Première ligne Partner:', partnerData[0]);
        }
        
        // Analyser chaque paire de colonnes
        for (const boCol of boColumns) {
            for (const partnerCol of partnerColumns) {
                // Log spécial pour les colonnes importantes
                if ((boCol.toLowerCase().includes('id') || boCol.toLowerCase().includes('transaction')) &&
                    (partnerCol.toLowerCase().includes('id') || partnerCol.toLowerCase().includes('transaction'))) {
                    console.log(`🔍 ANALYSE IMPORTANTE: "${boCol}" vs "${partnerCol}"`);
                }
                
                const suggestion = this.analyzeColumnPair(boCol, partnerCol, boData, partnerData);
                if (suggestion.confidence > 0.3) { // Seuil de confiance minimum
                    suggestions.push(suggestion);
                }
            }
        }
        
        // Trier par confiance décroissante
        suggestions.sort((a, b) => b.confidence - a.confidence);
        
        // Prendre seulement les suggestions avec une confiance élevée (clés principales)
        const highConfidenceSuggestions = suggestions.filter(s => s.confidence > 0.5); // Seuil réduit pour debug
        const topSuggestions = highConfidenceSuggestions.slice(0, 5); // Plus de suggestions pour debug
        
        console.log('🔍 DEBUG - Toutes les suggestions:', suggestions.map(s => ({
            pair: `${s.boColumn} ↔ ${s.partnerColumn}`,
            confidence: s.confidence,
            reason: s.reason,
            transformation: s.transformation ? s.transformation.description : 'Aucune'
        })));
        
        // Log détaillé des suggestions importantes
        const importantSuggestions = suggestions.filter(s => 
            s.boColumn.toLowerCase().includes('id') || s.partnerColumn.toLowerCase().includes('id') ||
            s.boColumn.toLowerCase().includes('transaction') || s.partnerColumn.toLowerCase().includes('transaction')
        );
        console.log('🎯 Suggestions importantes:', importantSuggestions.map(s => ({
            pair: `${s.boColumn} ↔ ${s.partnerColumn}`,
            confidence: s.confidence,
            reason: s.reason,
            transformation: s.transformation ? s.transformation.description : 'Aucune'
        })));
        
        // Calculer la confiance globale
        const overallConfidence = topSuggestions.length > 0 
            ? topSuggestions.reduce((sum, s) => sum + s.confidence, 0) / topSuggestions.length 
            : 0;
        
        // Recommander les clés principales
        const recommendedKeys = topSuggestions
            .map(s => `${s.boColumn} ↔ ${s.partnerColumn}`);
        
        console.log('✅ Analyse terminée:', {
            suggestionsCount: suggestions.length,
            topSuggestions: topSuggestions.length,
            overallConfidence: overallConfidence,
            recommendedKeys: recommendedKeys
        });
        
        return {
            suggestions: topSuggestions,
            overallConfidence,
            recommendedKeys
        };
    }

    /**
     * Analyse une paire de colonnes pour déterminer leur compatibilité
     */
    private analyzeColumnPair(
        boColumn: string, 
        partnerColumn: string, 
        boData: Record<string, string>[], 
        partnerData: Record<string, string>[]
    ): KeySuggestion {
        
        // Extraire les valeurs uniques des colonnes
        const boValues = this.getUniqueValues(boData, boColumn);
        const partnerValues = this.getUniqueValues(partnerData, partnerColumn);
        
        // Log des échantillons pour debug
        const boSample = Array.from(boValues).slice(0, 5);
        const partnerSample = Array.from(partnerValues).slice(0, 5);
        console.log(`🔍 Échantillons "${boColumn}":`, boSample);
        console.log(`🔍 Échantillons "${partnerColumn}":`, partnerSample);
        
        // Log détaillé si les colonnes sont importantes
        if (boColumn.toLowerCase().includes('id') || partnerColumn.toLowerCase().includes('id') ||
            boColumn.toLowerCase().includes('transaction') || partnerColumn.toLowerCase().includes('transaction')) {
            console.log(`🔍 DEBUG IMPORTANT - "${boColumn}" vs "${partnerColumn}":`, {
                boValuesCount: boValues.size,
                partnerValuesCount: partnerValues.size,
                boSample: boSample,
                partnerSample: partnerSample
            });
        }
        
        // Analyser les transformations possibles
        const transformation = this.analyzeTransformation(boValues, partnerValues);
        
        // Calculer différents scores de compatibilité
        const nameSimilarity = this.calculateNameSimilarity(boColumn, partnerColumn);
        const valueOverlap = this.calculateValueOverlap(boValues, partnerValues);
        const formatCompatibility = this.calculateFormatCompatibility(boValues, partnerValues);
        const uniquenessScore = this.calculateUniquenessScore(boValues, partnerValues, boData.length, partnerData.length);
        
        // Ajuster la confiance si une transformation est trouvée
        let confidence = (nameSimilarity * 0.3 + valueOverlap * 0.4 + formatCompatibility * 0.2 + uniquenessScore * 0.1);
        
        if (transformation) {
            confidence += 0.3; // Bonus plus important pour la transformation
            console.log(`🔧 Transformation détectée pour "${boColumn}" ↔ "${partnerColumn}": ${transformation.description}`);
        }
        
        // Log détaillé pour debug
        console.log(`📊 Scores pour "${boColumn}" ↔ "${partnerColumn}":`, {
            nameSimilarity: nameSimilarity.toFixed(2),
            valueOverlap: valueOverlap.toFixed(2),
            formatCompatibility: formatCompatibility.toFixed(2),
            uniquenessScore: uniquenessScore.toFixed(2),
            transformation: transformation ? transformation.description : 'Aucune',
            confidence: confidence.toFixed(2)
        });
        
        // Générer la raison
        const reason = this.generateReason(nameSimilarity, valueOverlap, formatCompatibility, uniquenessScore, transformation);
        
        // Échantillon de valeurs communes
        const sampleValues = this.getSampleCommonValues(boValues, partnerValues);
        
        return {
            boColumn,
            partnerColumn,
            confidence,
            reason,
            sampleValues,
            transformation
        };
    }

    /**
     * Analyse les transformations possibles entre deux ensembles de valeurs
     */
    private analyzeTransformation(boValues: Set<string>, partnerValues: Set<string>): {
        type: 'remove_suffix' | 'remove_prefix' | 'remove_pattern';
        pattern: string;
        description: string;
    } | null {
        if (boValues.size === 0 || partnerValues.size === 0) return null;
        
        const boArray = Array.from(boValues);
        const partnerArray = Array.from(partnerValues);
        
        // Analyser les suffixes communs dans les valeurs BO
        const suffixPatterns = this.findCommonSuffixes(boArray, partnerArray);
        if (suffixPatterns.length > 0) {
            const bestSuffix = suffixPatterns[0];
            return {
                type: 'remove_suffix',
                pattern: bestSuffix,
                description: `Supprimer le suffixe "${bestSuffix}" des valeurs BO`
            };
        }
        
        // Analyser les préfixes communs dans les valeurs BO
        const prefixPatterns = this.findCommonPrefixes(boArray, partnerArray);
        if (prefixPatterns.length > 0) {
            const bestPrefix = prefixPatterns[0];
            return {
                type: 'remove_prefix',
                pattern: bestPrefix,
                description: `Supprimer le préfixe "${bestPrefix}" des valeurs BO`
            };
        }
        
        // Analyser les patterns spécifiques (comme _CM, _FR, etc.)
        const specificPatterns = this.findSpecificPatterns(boArray, partnerArray);
        if (specificPatterns.length > 0) {
            const bestPattern = specificPatterns[0];
            return {
                type: 'remove_pattern',
                pattern: bestPattern,
                description: `Supprimer le pattern "${bestPattern}" des valeurs BO`
            };
        }
        
        return null;
    }

    /**
     * Trouve les suffixes communs qui améliorent la correspondance
     */
    private findCommonSuffixes(boArray: string[], partnerArray: string[]): string[] {
        const suffixes: { suffix: string; score: number }[] = [];
        
        // Analyser les suffixes de 2 à 10 caractères
        for (let length = 2; length <= 10; length++) {
            const suffixCount = new Map<string, number>();
            
            for (const boValue of boArray) {
                if (boValue.length > length) {
                    const suffix = boValue.slice(-length);
                    const withoutSuffix = boValue.slice(0, -length);
                    
                    // Vérifier si la valeur sans suffixe existe dans partner
                    if (partnerArray.includes(withoutSuffix)) {
                        suffixCount.set(suffix, (suffixCount.get(suffix) || 0) + 1);
                    }
                }
            }
            
            // Calculer le score pour chaque suffixe
            for (const [suffix, count] of suffixCount) {
                const score = count / boArray.length;
                console.log(`📊 Suffixe "${suffix}": ${count}/${boArray.length} = ${(score * 100).toFixed(1)}%`);
                if (score > 0.1) { // Seuil plus bas pour détecter plus de suffixes
                    suffixes.push({ suffix, score });
                }
            }
        }
        
        return suffixes
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .map(s => s.suffix);
    }

    /**
     * Trouve les préfixes communs qui améliorent la correspondance
     */
    private findCommonPrefixes(boArray: string[], partnerArray: string[]): string[] {
        const prefixes: { prefix: string; score: number }[] = [];
        
        // Analyser les préfixes de 2 à 10 caractères
        for (let length = 2; length <= 10; length++) {
            const prefixCount = new Map<string, number>();
            
            for (const boValue of boArray) {
                if (boValue.length > length) {
                    const prefix = boValue.slice(0, length);
                    const withoutPrefix = boValue.slice(length);
                    
                    // Vérifier si la valeur sans préfixe existe dans partner
                    if (partnerArray.includes(withoutPrefix)) {
                        prefixCount.set(prefix, (prefixCount.get(prefix) || 0) + 1);
                    }
                }
            }
            
            // Calculer le score pour chaque préfixe
            for (const [prefix, count] of prefixCount) {
                const score = count / boArray.length;
                if (score > 0.3) { // Au moins 30% des valeurs
                    prefixes.push({ prefix, score });
                }
            }
        }
        
        return prefixes
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .map(p => p.prefix);
    }

    /**
     * Trouve les patterns spécifiques (comme _CM, _FR, etc.)
     */
    private findSpecificPatterns(boArray: string[], partnerArray: string[]): string[] {
        const patterns: { pattern: string; score: number }[] = [];
        
        // Patterns courants à tester
        const commonPatterns = [
            /_[A-Z]{2}$/, // _CM, _FR, _US, etc.
            /_[A-Z]{3}$/, // _USA, _EUR, etc.
            /_[0-9]{2}$/, // _01, _02, etc.
            /_[A-Z0-9]{2,4}$/, // _CM1, _FR2, etc.
            /_[A-Z0-9]{1,5}$/, // Patterns plus généraux
        ];
        
        for (const regex of commonPatterns) {
            const patternCount = new Map<string, number>();
            
            for (const boValue of boArray) {
                const match = boValue.match(regex);
                if (match) {
                    const pattern = match[0];
                    const withoutPattern = boValue.replace(regex, '');
                    
                    // Vérifier si la valeur sans pattern existe dans partner
                    if (partnerArray.includes(withoutPattern)) {
                        patternCount.set(pattern, (patternCount.get(pattern) || 0) + 1);
                        console.log(`🔍 Pattern trouvé: "${boValue}" → "${withoutPattern}" (pattern: "${pattern}")`);
                    }
                }
            }
            
            // Calculer le score pour chaque pattern
            for (const [pattern, count] of patternCount) {
                const score = count / boArray.length;
                console.log(`📊 Pattern "${pattern}": ${count}/${boArray.length} = ${(score * 100).toFixed(1)}%`);
                if (score > 0.1) { // Seuil plus bas pour détecter plus de patterns
                    patterns.push({ pattern, score });
                }
            }
        }
        
        return patterns
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .map(p => p.pattern);
    }

    /**
     * Calcule la similarité des noms de colonnes
     */
    private calculateNameSimilarity(boColumn: string, partnerColumn: string): number {
        const boLower = boColumn.toLowerCase();
        const partnerLower = partnerColumn.toLowerCase();
        
        console.log(`🔍 Comparaison: "${boColumn}" vs "${partnerColumn}"`);
        
        // Correspondances exactes ou très similaires
        if (boLower === partnerLower) return 1.0;
        if (boLower.includes('cle') && partnerLower.includes('cle')) return 0.95;
        if (boLower.includes('id') && partnerLower.includes('id')) return 0.9;
        if (boLower.includes('transaction') && partnerLower.includes('transaction')) return 0.9;
        if (boLower.includes('montant') && partnerLower.includes('montant')) return 0.9;
        if (boLower.includes('telephone') && partnerLower.includes('telephone')) return 0.9;
        if (boLower.includes('date') && partnerLower.includes('date')) return 0.8;
        if (boLower.includes('operation') && partnerLower.includes('operation')) return 0.8;
        
        // Correspondances partielles
        if (boLower.includes('id') || partnerLower.includes('id')) return 0.6;
        if (boLower.includes('ref') || partnerLower.includes('ref')) return 0.6;
        if (boLower.includes('num') || partnerLower.includes('num')) return 0.5;
        
        return 0.1;
    }

    /**
     * Calcule le chevauchement des valeurs
     */
    private calculateValueOverlap(boValues: Set<string>, partnerValues: Set<string>): number {
        if (boValues.size === 0 || partnerValues.size === 0) return 0;
        
        const intersection = new Set([...boValues].filter(x => partnerValues.has(x)));
        const union = new Set([...boValues, ...partnerValues]);
        
        return intersection.size / union.size;
    }

    /**
     * Calcule la compatibilité des formats
     */
    private calculateFormatCompatibility(boValues: Set<string>, partnerValues: Set<string>): number {
        const boFormats = this.analyzeFormats(Array.from(boValues));
        const partnerFormats = this.analyzeFormats(Array.from(partnerValues));
        
        // Vérifier si les formats sont compatibles
        if (boFormats.isNumeric && partnerFormats.isNumeric) return 0.9;
        if (boFormats.isDate && partnerFormats.isDate) return 0.9;
        if (boFormats.isPhone && partnerFormats.isPhone) return 0.8;
        if (boFormats.isAlphanumeric && partnerFormats.isAlphanumeric) return 0.7;
        
        return 0.3;
    }

    /**
     * Calcule le score d'unicité
     */
    private calculateUniquenessScore(boValues: Set<string>, partnerValues: Set<string>, boTotal: number, partnerTotal: number): number {
        const boUniqueness = boValues.size / boTotal;
        const partnerUniqueness = partnerValues.size / partnerTotal;
        
        // Plus les valeurs sont uniques, mieux c'est pour une clé
        return (boUniqueness + partnerUniqueness) / 2;
    }

    /**
     * Analyse les formats des valeurs
     */
    private analyzeFormats(values: string[]): {
        isNumeric: boolean;
        isDate: boolean;
        isPhone: boolean;
        isAlphanumeric: boolean;
    } {
        const numericCount = values.filter(v => /^\d+$/.test(v)).length;
        const dateCount = values.filter(v => /^\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}/.test(v)).length;
        const phoneCount = values.filter(v => /^\d{9,15}$/.test(v)).length;
        const alphanumericCount = values.filter(v => /^[a-zA-Z0-9]+$/.test(v)).length;
        
        const total = values.length;
        
        return {
            isNumeric: numericCount / total > 0.8,
            isDate: dateCount / total > 0.5,
            isPhone: phoneCount / total > 0.7,
            isAlphanumeric: alphanumericCount / total > 0.8
        };
    }

    /**
     * Génère une raison pour la suggestion
     */
    private generateReason(
        nameSimilarity: number, 
        valueOverlap: number, 
        formatCompatibility: number, 
        uniquenessScore: number,
        transformation?: { type: string; pattern: string; description: string } | null
    ): string {
        const reasons: string[] = [];
        
        if (nameSimilarity > 0.8) reasons.push('Noms de colonnes très similaires');
        if (valueOverlap > 0.3) reasons.push('Valeurs communes détectées');
        if (formatCompatibility > 0.7) reasons.push('Formats compatibles');
        if (uniquenessScore > 0.8) reasons.push('Valeurs très uniques');
        if (transformation) reasons.push(transformation.description);
        
        if (reasons.length === 0) return 'Correspondance faible';
        
        return reasons.join(', ');
    }

    /**
     * Obtient les valeurs uniques d'une colonne
     */
    private getUniqueValues(data: Record<string, string>[], column: string): Set<string> {
        return new Set(data.map(row => row[column]).filter(val => val && val.trim() !== ''));
    }

    /**
     * Obtient un échantillon de valeurs communes
     */
    private getSampleCommonValues(boValues: Set<string>, partnerValues: Set<string>): string[] {
        const common = Array.from(boValues).filter(v => partnerValues.has(v));
        return common.slice(0, 3); // Retourner max 3 exemples
    }
}
