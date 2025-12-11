import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DashboardReconciliationService, CountryServiceMetrics, DashboardStatusFilter } from '../../services/dashboard-reconciliation.service';

// Interface supprimée car elle est maintenant dans le service

@Component({
    selector: 'app-dashboard-reconciliation',
    templateUrl: './dashboard-reconciliation.component.html',
    styleUrls: ['./dashboard-reconciliation.component.scss']
})
export class DashboardReconciliationComponent implements OnInit, OnDestroy {
    countryServiceData: CountryServiceMetrics[] = [];
    filteredCountryServiceData: CountryServiceMetrics[] = [];
    private subscription = new Subscription();
    loading = true;
    error: string | null = null;
    
    // Affichage des services (par pays): par défaut, afficher 4, avec bascule "plus/moins"
    showAllServicesByCountry: { [countryCode: string]: boolean } = {};

    // Affichage des filtres (masqués par défaut)
    showFilters: boolean = false;

    // Erreurs de chargement de drapeaux images
    private flagLoadError: { [countryCode: string]: boolean } = {};
    
    // Pagination
    currentPage = 1;
    itemsPerPage = 4; // 4 cartes par page
    
    // Filtres
    selectedCountry: string[] = [];
    selectedService: string[] = [];
    selectedDateStart: Date | null = null;
    selectedDateEnd: Date | null = null;
    availableCountries: string[] = [];
    availableServices: string[] = [];
    availableDates: string[] = [];
    filteredServices: string[] = []; // Services filtrés selon le pays sélectionné
    statusView: DashboardStatusFilter = 'encours';

    constructor(
        private router: Router,
        private dashboardReconciliationService: DashboardReconciliationService
    ) {}

    ngOnInit() {
        // Charger les données de réconciliation
        this.loadReconciliationData();
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }

    private loadReconciliationData() {
        this.loading = true;
        this.error = null;
        this.subscription.unsubscribe();
        this.subscription = new Subscription();
        
        // Récupérer les données réelles de la table result8rec
        this.subscription.add(
            this.dashboardReconciliationService.getDashboardMetrics(this.statusView).subscribe({
                next: (data) => {
                    this.countryServiceData = data;
                    this.initializeFilters();
                    this.applyFilters();
                    this.loading = false;
                    console.log('📊 Données du tableau de bord chargées:', data);
                },
                error: (error) => {
                    console.error('❌ Erreur lors du chargement des données:', error);
                    this.error = 'Erreur lors du chargement des données de réconciliation';
                    this.loading = false;
                }
            })
        );
    }

    changeStatusView(view: DashboardStatusFilter): void {
        if (this.statusView === view) {
            return;
        }
        this.statusView = view;
        this.currentPage = 1;
        this.loadReconciliationData();
    }

    // Méthodes supprimées car elles sont maintenant dans le service

    getServiceEntries(services: {[serviceName: string]: any}): Array<{key: string, value: any}> {
        return Object.entries(services)
            .map(([key, value]) => ({ key, value }))
            .sort((a, b) => a.key.localeCompare(b.key)); // Trier par nom de service
    }

    /**
     * Retourne les services à afficher pour un pays (limitée à 4 par défaut)
     */
    getLimitedServiceEntries(countryData: CountryServiceMetrics): Array<{key: string, value: any}> {
        const entries = this.getServiceEntries(countryData.services);
        const showAll = this.showAllServicesByCountry[countryData.countryCode] === true;
        if (!showAll && entries.length > 4) {
            return entries.slice(0, 4);
        }
        return entries;
    }

    /**
     * Bascule l'affichage complet/limité des services pour un pays
     */
    toggleShowMore(countryCode: string): void {
        this.showAllServicesByCountry[countryCode] = !(this.showAllServicesByCountry[countryCode] === true);
    }

    isShowingAll(countryCode: string): boolean {
        return this.showAllServicesByCountry[countryCode] === true;
    }

    /**
     * Liste des codes pays valides pour lesquels des drapeaux existent
     */
    private readonly validCountryCodes = new Set([
        'BF', 'BJ', 'CI', 'CM', 'GA', 'GN', 'KE', 'ML', 'MZ', 'NG', 'SN', 'TG',
        'CF', 'TD', 'CG', 'CD', 'GQ', 'ST', 'AO',
        'NE', 'GW', 'SL', 'LR', 'GH', 'MR', 'GM', 'CV',
        'TZ', 'UG', 'RW', 'BI', 'ET', 'SO', 'DJ', 'ER', 'SS', 'SD', 'SC', 'MU', 'KM', 'MG',
        'EG', 'ZA'
    ]);

    /**
     * Retourne le drapeau (emoji) d'un pays à partir de son code
     */
    getCountryFlag(countryCode: string): string {
        const flagMap: { [key: string]: string } = {
            'BF': '🇧🇫', 'BJ': '🇧🇯', 'CI': '🇨🇮', 'CM': '🇨🇲', 'GA': '🇬🇦', 'GN': '🇬🇳', 'KE': '🇰🇪', 'ML': '🇲🇱', 'MZ': '🇲🇿', 'NG': '🇳🇬', 'SN': '🇸🇳', 'TG': '🇹🇬',
            'CF': '🇨🇫', 'TD': '🇹🇩', 'CG': '🇨🇬', 'CD': '🇨🇩', 'GQ': '🇬🇶', 'ST': '🇸🇹', 'AO': '🇦🇴',
            'NE': '🇳🇪', 'GW': '🇬🇼', 'SL': '🇸🇱', 'LR': '🇱🇷', 'GH': '🇬🇭', 'MR': '🇲🇷', 'GM': '🇬🇲', 'CV': '🇨🇻',
            'TZ': '🇹🇿', 'UG': '🇺🇬', 'RW': '🇷🇼', 'BI': '🇧🇮', 'ET': '🇪🇹', 'SO': '🇸🇴', 'DJ': '🇩🇯', 'ER': '🇪🇷', 'SS': '🇸🇸', 'SD': '🇸🇩', 'SC': '🇸🇨', 'MU': '🇲🇺', 'KM': '🇰🇲', 'MG': '🇲🇬',
            'EG': '🇪🇬', 'ZA': '🇿🇦'
        };
        return flagMap[(countryCode || '').toUpperCase()] || '🌍';
    }

    /**
     * URL du drapeau SVG dans les assets (fallback vers emoji si indisponible)
     */
    getCountryFlagUrl(countryCode: string): string | null {
        const normalizedCode = (countryCode || '').toUpperCase();
        const code = normalizedCode.toLowerCase();
        if (!code) return null;
        
        // Ne retourner une URL que pour les codes pays valides
        if (!this.validCountryCodes.has(normalizedCode)) {
            return null;
        }
        
        if (this.flagLoadError[code]) return null;
        return `assets/flags/${code}.svg`;
    }

    onFlagError(event: Event, countryCode: string): void {
        const code = (countryCode || '').toLowerCase();
        this.flagLoadError[code] = true;
    }

    /**
     * Retourne le nom du pays à partir du code si le libellé est manquant
     */
    getCountryName(countryCode: string): string {
        const names: { [key: string]: string } = {
            'BF': 'Burkina Faso', 'BJ': 'Bénin', 'CI': 'Côte d\'Ivoire', 'CM': 'Cameroun', 'GA': 'Gabon', 'GN': 'Guinée', 'KE': 'Kenya', 'ML': 'Mali', 'MZ': 'Mozambique', 'NG': 'Nigeria', 'SN': 'Sénégal', 'TG': 'Togo',
            'CF': 'Centrafrique', 'TD': 'Tchad', 'CG': 'Congo', 'CD': 'RDC', 'GQ': 'Guinée Équatoriale', 'ST': 'Sao Tomé', 'AO': 'Angola',
            'NE': 'Niger', 'GW': 'Guinée-Bissau', 'SL': 'Sierra Leone', 'LR': 'Liberia', 'GH': 'Ghana', 'MR': 'Mauritanie', 'GM': 'Gambie', 'CV': 'Cap-Vert',
            'TZ': 'Tanzanie', 'UG': 'Ouganda', 'RW': 'Rwanda', 'BI': 'Burundi', 'ET': 'Éthiopie', 'SO': 'Somalie', 'DJ': 'Djibouti', 'ER': 'Érythrée', 'SS': 'Soudan du Sud', 'SD': 'Soudan', 'SC': 'Seychelles', 'MU': 'Maurice', 'KM': 'Comores', 'MG': 'Madagascar'
        };
        return names[(countryCode || '').toUpperCase()] || countryCode;
    }

    getRateClass(rate: number): string {
        if (rate === 0 || isNaN(rate)) return 'rate-empty';
        if (rate >= 99) return 'rate-excellent';      // Vert : 99% et plus
        if (rate >= 95 && rate < 99) return 'rate-good';  // Orange : entre 95% et 98.99%
        return 'rate-poor';                           // Rouge : moins de 95%
    }

    formatPercentage(rate: number): string {
        if (rate === 0 || isNaN(rate)) return '(Vide)';
        return `${rate.toFixed(2)}%`;
    }

    formatDiscrepancyPercentage(rate?: number): string {
        if (rate === undefined || rate === null || isNaN(rate)) return '--';
        return `${rate.toFixed(2)}%`;
    }

    getDiscrepancyRateClass(rate?: number): string {
        if (rate === undefined || rate === null || isNaN(rate)) return 'rate-empty';
        if (rate >= 60) return 'rate-critical';
        if (rate >= 30) return 'rate-alert';
        return 'rate-ok';
    }

    getPositiveValueClass(value?: number | null): string {
        if (value === undefined || value === null || isNaN(value)) {
            return '';
        }
        return value > 0 ? 'metric-positive' : 'metric-zero';
    }

    getTotalDiscrepancies(serviceMetrics: any): number {
        if (!serviceMetrics) {
            return 0;
        }
        return (serviceMetrics.boDiscrepancyCount || 0) + (serviceMetrics.partnerDiscrepancyCount || 0);
    }

    isTraiteView(): boolean {
        return this.statusView === 'traite';
    }

    goBackToReport() {
        this.router.navigate(['/reconciliation-report']);
    }

    /**
     * Retourne le nombre total de services trouvés
     */
    getTotalServicesCount(): number {
        let total = 0;
        this.countryServiceData.forEach(country => {
            total += Object.keys(country.services).length;
        });
        return total;
    }

    /**
     * Retourne la liste de tous les services uniques
     */
    getAllUniqueServices(): string[] {
        const services = new Set<string>();
        this.countryServiceData.forEach(country => {
            Object.keys(country.services).forEach(service => {
                services.add(service);
            });
        });
        return Array.from(services).sort();
    }


    /**
     * Page précédente
     */
    previousPage(): void {
        if (this.currentPage > 1) {
            this.currentPage--;
        }
    }

    /**
     * Page suivante
     */
    nextPage(): void {
        if (this.currentPage < this.getTotalPages()) {
            this.currentPage++;
        }
    }

    /**
     * Initialise les listes de filtres disponibles
     */
    private initializeFilters(): void {
        // Extraire tous les pays uniques
        this.availableCountries = [...new Set(this.countryServiceData.map(country => country.country))].sort();
        
        // Extraire tous les services uniques
        const allServices = new Set<string>();
        this.countryServiceData.forEach(country => {
            Object.keys(country.services).forEach(service => {
                allServices.add(service);
            });
        });
        this.availableServices = Array.from(allServices).sort();
        
        // Extraire toutes les dates uniques (format YYYY-MM-DD)
        const allDates = new Set<string>();
        this.countryServiceData.forEach(country => {
            Object.values(country.services).forEach(serviceData => {
                if (serviceData.date) {
                    // Extraire la date au format YYYY-MM-DD
                    const dateStr = serviceData.date.split(' ')[0]; // Prendre seulement la partie date
                    allDates.add(dateStr);
                }
            });
        });
        this.availableDates = Array.from(allDates).sort().reverse(); // Plus récent en premier
        
        // Initialiser les services filtrés avec tous les services
        this.filteredServices = [...this.availableServices];
    }

    /**
     * Applique les filtres sélectionnés
     */
    applyFilters(): void {
        let filtered = [...this.countryServiceData];

        // Filtrer par pays (multi)
        if (this.selectedCountry && this.selectedCountry.length > 0) {
            filtered = filtered.filter(country => this.selectedCountry.includes(country.country));
        }

        // Filtrer par intervalle de dates
        if (this.selectedDateStart || this.selectedDateEnd) {
            // Normaliser les dates de filtrage
            let normalizedStart: Date | null = null;
            let normalizedEnd: Date | null = null;
            
            if (this.selectedDateStart) {
                // Créer une nouvelle date pour éviter les problèmes de référence
                normalizedStart = new Date(this.selectedDateStart.getFullYear(), this.selectedDateStart.getMonth(), this.selectedDateStart.getDate());
                normalizedStart.setHours(0, 0, 0, 0); // Début de journée
            }
            
            if (this.selectedDateEnd) {
                // Créer une nouvelle date pour éviter les problèmes de référence
                normalizedEnd = new Date(this.selectedDateEnd.getFullYear(), this.selectedDateEnd.getMonth(), this.selectedDateEnd.getDate());
                normalizedEnd.setHours(23, 59, 59, 999); // Fin de journée pour inclure toute la journée
            }
            
            console.log('[DEBUG] Filtrage par dates:', {
                selectedDateStart: this.selectedDateStart,
                selectedDateEnd: this.selectedDateEnd,
                normalizedStart: normalizedStart,
                normalizedEnd: normalizedEnd
            });
            
            filtered = filtered.map(country => {
                const filteredServices: {[serviceName: string]: any} = {};
                Object.entries(country.services).forEach(([serviceName, serviceData]) => {
                    if (serviceData.date) {
                        // Extraire et normaliser la date du service
                        const dateStr = serviceData.date.split(' ')[0]; // Prendre seulement la partie date
                        let serviceDate: Date;
                        
                        // Parser la date selon le format (YYYY-MM-DD ou autre)
                        if (dateStr.includes('-')) {
                            // Format ISO: YYYY-MM-DD
                            const [year, month, day] = dateStr.split('-').map(Number);
                            serviceDate = new Date(year, month - 1, day);
                        } else if (dateStr.includes('/')) {
                            // Format avec slash: DD/MM/YYYY ou MM/DD/YYYY
                            const parts = dateStr.split('/').map(Number);
                            // Supposer format DD/MM/YYYY (format français)
                            serviceDate = new Date(parts[2], parts[1] - 1, parts[0]);
                        } else {
                            // Essayer de parser directement
                            serviceDate = new Date(dateStr);
                        }
                        
                        // Vérifier que la date est valide
                        if (isNaN(serviceDate.getTime())) {
                            console.log('[DEBUG] Date invalide ignorée:', { serviceName, dateStr, serviceData });
                            return; // Ignorer cette entrée si la date est invalide
                        }
                        
                        serviceDate.setHours(0, 0, 0, 0); // Normaliser à minuit
                        
                        let dateMatch = true;
                        
                        // Vérifier la date de début
                        if (normalizedStart) {
                            const isAfterStart = serviceDate >= normalizedStart;
                            dateMatch = dateMatch && isAfterStart;
                            if (!isAfterStart) {
                                console.log('[DEBUG] Service exclu (avant date début):', {
                                    serviceName,
                                    serviceDate: serviceDate.toISOString(),
                                    normalizedStart: normalizedStart.toISOString()
                                });
                            }
                        }
                        
                        // Vérifier la date de fin
                        if (normalizedEnd) {
                            const isBeforeEnd = serviceDate <= normalizedEnd;
                            dateMatch = dateMatch && isBeforeEnd;
                            if (!isBeforeEnd) {
                                console.log('[DEBUG] Service exclu (après date fin):', {
                                    serviceName,
                                    serviceDate: serviceDate.toISOString(),
                                    normalizedEnd: normalizedEnd.toISOString()
                                });
                            }
                        }
                        
                        if (dateMatch) {
                            console.log('[DEBUG] Service inclus:', {
                                serviceName,
                                serviceDate: serviceDate.toISOString(),
                                dateStr,
                                normalizedStart: normalizedStart?.toISOString(),
                                normalizedEnd: normalizedEnd?.toISOString()
                            });
                            filteredServices[serviceName] = serviceData;
                        }
                    } else {
                        // Exclure les services sans date si un filtre de date est actif
                        console.log('[DEBUG] Service exclu (pas de date):', serviceName);
                        // Ne pas ajouter ce service aux résultats filtrés
                    }
                });
                return {
                    ...country,
                    services: filteredServices
                };
            }).filter(country => Object.keys(country.services).length > 0);
        }

        // Filtrer par services (multi) après pays/date
        if (this.selectedService && this.selectedService.length > 0) {
            filtered = filtered.map(country => {
                const filteredServices: {[serviceName: string]: any} = {};
                Object.keys(country.services).forEach(serviceName => {
                    if (this.selectedService.includes(serviceName)) {
                        filteredServices[serviceName] = country.services[serviceName];
                    }
                });
                return {
                    ...country,
                    services: filteredServices
                };
            }).filter(country => Object.keys(country.services).length > 0);
        }

        this.filteredCountryServiceData = filtered;
        this.currentPage = 1; // Réinitialiser à la première page
    }

    /**
     * Gère le changement de filtre pays
     */
    onCountryFilterChange(): void {
        // Réinitialiser les services sélectionnés quand le pays change
        this.selectedService = [];
        
        // Mettre à jour la liste des services disponibles pour ce pays
        this.updateFilteredServices();
        
        this.applyFilters();
    }

    /**
     * Gère le changement de filtre service
     */
    onServiceFilterChange(): void {
        this.applyFilters();
    }

    /**
     * Gère le changement de filtre date de début
     */
    onDateStartChange(): void {
        this.applyFilters();
    }

    /**
     * Gère le changement de filtre date de fin
     */
    onDateEndChange(): void {
        this.applyFilters();
    }

    /**
     * Met à jour la liste des services filtrés selon le pays sélectionné
     */
    private updateFilteredServices(): void {
        if (!this.selectedCountry || this.selectedCountry.length === 0) {
            // Si aucun pays sélectionné, afficher tous les services
            this.filteredServices = [...this.availableServices];
        } else {
            // Filtrer les services selon le pays sélectionné
            const servicesForCountry = new Set<string>();
            this.countryServiceData
                .filter(country => this.selectedCountry.includes(country.country))
                .forEach(country => {
                    Object.keys(country.services).forEach(service => {
                        servicesForCountry.add(service);
                    });
                });
            this.filteredServices = Array.from(servicesForCountry).sort();
        }
    }

    /**
     * Réinitialise tous les filtres
     */
    resetFilters(): void {
        this.selectedCountry = [];
        this.selectedService = [];
        this.selectedDateStart = null;
        this.selectedDateEnd = null;
        this.filteredServices = [...this.availableServices];
        this.applyFilters();
    }

    /**
     * Retourne les pays filtrés de la page courante
     */
    getPagedCountries(): CountryServiceMetrics[] {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        return this.filteredCountryServiceData.slice(startIndex, endIndex);
    }

    /**
     * Retourne le nombre total de pages pour les données filtrées
     */
    getTotalPages(): number {
        return Math.ceil(this.filteredCountryServiceData.length / this.itemsPerPage);
    }
}
