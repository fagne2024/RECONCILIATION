import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Result8RecData {
    id: number;
    date: string;
    agency: string;
    service: string;
    country: string;
    totalTransactions: number;
    totalVolume: number;
    matches: number;
    boOnly: number;
    partnerOnly: number;
    mismatches: number;
    matchRate: number;
    status: string;
    comment: string;
    traitement?: string;
    glpiId: string;
    createdAt: string;
}

export interface CountryServiceMetrics {
    country: string;
    countryCode: string;
    services: {
        [serviceName: string]: {
            bkRecoBanque: number;      // Taux de correspondance global
            bkRecoBO: number;          // Taux de réconciliation BO (matches / total)
            trxReconNet: number;       // Taux de réconciliation nette (matches / (matches + boOnly + mismatches))
            trxReconBrut: number;      // Taux de réconciliation brute (matches / totalTransactions)
            date: string;              // Date de la donnée
        }
    };
}

@Injectable({
    providedIn: 'root'
})
export class DashboardReconciliationService {

    constructor(private http: HttpClient) {}

    /**
     * Récupère toutes les données de la table result8rec
     */
    getResult8RecData(): Observable<Result8RecData[]> {
        return this.http.get<Result8RecData[]>('/api/result8rec');
    }

    /**
     * Calcule les métriques de réconciliation par pays et service
     */
    getDashboardMetrics(): Observable<CountryServiceMetrics[]> {
        return this.getResult8RecData().pipe(
            map(data => this.calculateMetrics(data))
        );
    }

    /**
     * Calcule les métriques à partir des données brutes
     */
    private calculateMetrics(data: Result8RecData[]): CountryServiceMetrics[] {
        console.log('📊 Calcul des métriques à partir des données result8rec:', data);
        
        // Grouper les données par pays et service
        const countryMap = new Map<string, CountryServiceMetrics>();

        data.forEach(item => {
            // Ignorer les entrées sans service valide
            if (!item.service || item.service.trim() === '') {
                console.log('⚠️ Entrée ignorée - service manquant:', item);
                return;
            }

            const countryCode = this.extractCountryCode(item.country || item.agency);
            
            if (!countryMap.has(countryCode)) {
                countryMap.set(countryCode, {
                    country: item.country || 'Inconnu',
                    countryCode: countryCode,
                    services: {}
                });
            }

            const countryData = countryMap.get(countryCode)!;
            
            if (!countryData.services[item.service]) {
                countryData.services[item.service] = {
                    bkRecoBanque: 0,
                    bkRecoBO: 0,
                    trxReconNet: 0,
                    trxReconBrut: 0,
                    date: item.date
                };
            }

            // Calculer les métriques basées sur les vraies données
            const metrics = this.calculateServiceMetrics(item);
            
            // Agréger les données (moyenne pondérée par le nombre de transactions)
            const existingMetrics = countryData.services[item.service];
            const totalWeight = existingMetrics.bkRecoBanque === 0 ? 1 : 2; // Poids pour la moyenne
            
            countryData.services[item.service] = {
                bkRecoBanque: this.calculateWeightedAverage(existingMetrics.bkRecoBanque, metrics.bkRecoBanque, totalWeight),
                bkRecoBO: this.calculateWeightedAverage(existingMetrics.bkRecoBO, metrics.bkRecoBO, totalWeight),
                trxReconNet: this.calculateWeightedAverage(existingMetrics.trxReconNet, metrics.trxReconNet, totalWeight),
                trxReconBrut: this.calculateWeightedAverage(existingMetrics.trxReconBrut, metrics.trxReconBrut, totalWeight),
                date: item.date // Préserver la date la plus récente
            };
        });

        const result = Array.from(countryMap.values());
        console.log('📊 Métriques calculées avec vrais services:', result);
        
        // Afficher les services trouvés pour debug
        result.forEach(country => {
            const services = Object.keys(country.services);
            console.log(`📊 Pays ${country.countryCode}: Services trouvés:`, services);
        });
        
        // Trier les pays par nombre de services décroissant
        const sortedResult = result.sort((a, b) => {
            const servicesCountA = Object.keys(a.services).length;
            const servicesCountB = Object.keys(b.services).length;
            return servicesCountB - servicesCountA; // Décroissant
        });
        
        console.log('📊 Pays triés par nombre de services:', sortedResult.map(c => ({
            country: c.countryCode,
            servicesCount: Object.keys(c.services).length
        })));
        
        return sortedResult;
    }

    /**
     * Calcule les métriques pour un service spécifique
     */
    private calculateServiceMetrics(item: Result8RecData) {
        const totalTransactions = item.totalTransactions || 0;
        const matches = item.matches || 0;
        const boOnly = item.boOnly || 0;
        const partnerOnly = item.partnerOnly || 0;
        const mismatches = item.mismatches || 0;

        // Bk_Reco_Banque : Taux de correspondance global (utilise le matchRate de la base)
        const bkRecoBanque = item.matchRate || 0;

        // Bk_Reco_BO : Taux de réconciliation Back Office
        // (matches + boOnly) / totalTransactions * 100
        const bkRecoBO = totalTransactions > 0 ? ((matches + boOnly) / totalTransactions) * 100 : 0;

        // Trx_Recon_net : Taux de réconciliation nette
        // matches / (matches + boOnly + mismatches) * 100
        const totalReconciled = matches + boOnly + mismatches;
        const trxReconNet = totalReconciled > 0 ? (matches / totalReconciled) * 100 : 0;

        // Trx_Recon_brut : Taux de réconciliation brute
        // matches / totalTransactions * 100
        const trxReconBrut = totalTransactions > 0 ? (matches / totalTransactions) * 100 : 0;

        return {
            bkRecoBanque: Math.round(bkRecoBanque * 100) / 100,
            bkRecoBO: Math.round(bkRecoBO * 100) / 100,
            trxReconNet: Math.round(trxReconNet * 100) / 100,
            trxReconBrut: Math.round(trxReconBrut * 100) / 100
        };
    }

    /**
     * Calcule une moyenne pondérée
     */
    private calculateWeightedAverage(existing: number, newValue: number, weight: number): number {
        if (existing === 0) return newValue;
        return Math.round(((existing + newValue) / weight) * 100) / 100;
    }

    /**
     * Extrait le code pays depuis le nom du pays ou de l'agence
     */
    private extractCountryCode(countryOrAgency: string): string {
        if (!countryOrAgency) return 'XX';
        
        const normalizedName = countryOrAgency.trim().toUpperCase();
        
        // Gérer les variantes spéciales comme "CITCH" qui signifie "CI" (Côte d'Ivoire)
        if (normalizedName === 'CITCH' || normalizedName.startsWith('CITCH')) {
            return 'CI';
        }
        
        // Mapping des codes pays
        const countryMap: {[key: string]: string} = {
            'BURKINA FASO': 'BF',
            'BURKINA': 'BF',
            'BÉNIN': 'BJ',
            'BENIN': 'BJ',
            'CÔTE D\'IVOIRE': 'CI',
            'COTE D\'IVOIRE': 'CI',
            'COTE DIVOIRE': 'CI',
            'CÔTE DIVOIRE': 'CI',
            'CAMEROUN': 'CM',
            'CAMEROON': 'CM',
            'GABON': 'GA',
            'GUINÉE': 'GN',
            'GUINEE': 'GN',
            'KENYA': 'KE',
            'MALI': 'ML',
            'MOZAMBIQUE': 'MZ',
            'NIGERIA': 'NG',
            'SÉNÉGAL': 'SN',
            'SENEGAL': 'SN',
            'TOGO': 'TG',
            'NIGER': 'NE',
            'TCHAD': 'TD'
        };

        // Chercher d'abord dans le mapping (insensible à la casse)
        for (const [country, code] of Object.entries(countryMap)) {
            if (normalizedName.includes(country.toUpperCase())) {
                return code;
            }
        }
        
        // Chercher par contenu (pour gérer les cas comme "Côte d'Ivoire" dans "Côte d'Ivoire - Abidjan")
        if (normalizedName.includes('COTE') || normalizedName.includes('CÔTE') || normalizedName.includes('IVOIRE')) {
            return 'CI';
        }
        if (normalizedName.includes('SENEGAL') || normalizedName.includes('SÉNÉGAL')) {
            return 'SN';
        }
        if (normalizedName.includes('CAMEROUN') || normalizedName.includes('CAMEROON')) {
            return 'CM';
        }
        if (normalizedName.includes('BURKINA')) {
            return 'BF';
        }
        if (normalizedName.includes('MALI')) {
            return 'ML';
        }
        if (normalizedName.includes('BENIN') || normalizedName.includes('BÉNIN')) {
            return 'BJ';
        }
        if (normalizedName.includes('NIGER')) {
            return 'NE';
        }
        if (normalizedName.includes('TCHAD')) {
            return 'TD';
        }
        if (normalizedName.includes('TOGO')) {
            return 'TG';
        }

        // Extraire le code depuis le nom de l'agence si possible
        const codes = ['BF', 'BJ', 'CI', 'CM', 'GA', 'GN', 'KE', 'ML', 'MZ', 'NG', 'SN', 'TG', 'NE', 'TD'];
        
        for (const code of codes) {
            if (normalizedName.includes(code)) {
                return code;
            }
        }
        
        // Si c'est déjà un code (2 lettres), le retourner tel quel
        if (normalizedName.length === 2) {
            return normalizedName;
        }
        
        // Si c'est un code de 4-5 lettres qui commence par un code pays connu, extraire les 2 premières lettres
        if (normalizedName.length >= 4) {
            const firstTwo = normalizedName.substring(0, 2);
            if (codes.includes(firstTwo)) {
                return firstTwo;
            }
        }

        return 'XX';
    }
}
