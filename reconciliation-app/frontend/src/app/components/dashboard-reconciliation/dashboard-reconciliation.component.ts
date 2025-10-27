import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { DashboardReconciliationService, CountryServiceMetrics } from '../../services/dashboard-reconciliation.service';

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
    
    // Pagination
    currentPage = 1;
    itemsPerPage = 4; // 4 cartes par page
    
    // Filtres
    selectedCountry: string = '';
    selectedService: string = '';
    selectedDateStart: Date | null = null;
    selectedDateEnd: Date | null = null;
    availableCountries: string[] = [];
    availableServices: string[] = [];
    availableDates: string[] = [];
    filteredServices: string[] = []; // Services filtrés selon le pays sélectionné

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
        
        // Récupérer les données réelles de la table result8rec
        this.subscription.add(
            this.dashboardReconciliationService.getDashboardMetrics().subscribe({
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

    // Méthodes supprimées car elles sont maintenant dans le service

    getServiceEntries(services: {[serviceName: string]: any}): Array<{key: string, value: any}> {
        return Object.entries(services)
            .map(([key, value]) => ({ key, value }))
            .sort((a, b) => a.key.localeCompare(b.key)); // Trier par nom de service
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

        // Filtrer par pays
        if (this.selectedCountry) {
            filtered = filtered.filter(country => country.country === this.selectedCountry);
        }

        // Filtrer par intervalle de dates
        if (this.selectedDateStart || this.selectedDateEnd) {
            filtered = filtered.map(country => {
                const filteredServices: {[serviceName: string]: any} = {};
                Object.entries(country.services).forEach(([serviceName, serviceData]) => {
                    if (serviceData.date) {
                        const serviceDate = new Date(serviceData.date.split(' ')[0]); // Prendre seulement la partie date
                        
                        let dateMatch = true;
                        
                        // Vérifier la date de début
                        if (this.selectedDateStart) {
                            dateMatch = dateMatch && serviceDate >= this.selectedDateStart;
                        }
                        
                        // Vérifier la date de fin
                        if (this.selectedDateEnd) {
                            dateMatch = dateMatch && serviceDate <= this.selectedDateEnd;
                        }
                        
                        if (dateMatch) {
                            filteredServices[serviceName] = serviceData;
                        }
                    }
                });
                return {
                    ...country,
                    services: filteredServices
                };
            }).filter(country => Object.keys(country.services).length > 0);
        }

        // Filtrer par service (après le filtrage par pays et date)
        if (this.selectedService) {
            filtered = filtered.map(country => {
                const filteredServices: {[serviceName: string]: any} = {};
                if (country.services[this.selectedService]) {
                    filteredServices[this.selectedService] = country.services[this.selectedService];
                }
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
        // Réinitialiser le service sélectionné quand le pays change
        this.selectedService = '';
        
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
        if (!this.selectedCountry) {
            // Si aucun pays sélectionné, afficher tous les services
            this.filteredServices = [...this.availableServices];
        } else {
            // Filtrer les services selon le pays sélectionné
            const servicesForCountry = new Set<string>();
            this.countryServiceData
                .filter(country => country.country === this.selectedCountry)
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
        this.selectedCountry = '';
        this.selectedService = '';
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
