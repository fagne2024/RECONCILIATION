import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { AppStateService } from '../../services/app-state.service';
import { DataNormalizationService } from '../../services/data-normalization.service';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { AgencySummaryService } from '../../services/agency-summary.service';
import * as ExcelJS from 'exceljs';
// @ts-ignore
import * as FileSaver from 'file-saver';
import { MatSelect } from '@angular/material/select';

@Component({
    selector: 'app-stats',
    templateUrl: './stats.component.html',
    styleUrls: ['./stats.component.scss']
})
export class StatsComponent implements OnInit, OnDestroy {
    private readonly BATCH_SIZE = 1000;
    private readonly BATCH_DELAY = 20;
    private readonly CACHE_EXPIRY = 5 * 60 * 1000;

    filterForm: FormGroup;
    agencySummaries: any[] = [];
    filteredData: any[] = [];
    statsPage: number = 1;
    statsPageSize: number = 10;
    isLoading: boolean = false;
    // Supprimer la propriété pagedStats et la méthode updatePagedStats
    totalPages: number = 1;
    errorMessage: string | null = null;

    private cache: {
        [key: string]: {
            data: any[];
            timestamp: number;
        }
    } = {};

    private subscription: Subscription = new Subscription();

    // Ajout des contrôles de recherche et des variables de sélection
    agenceSearchCtrl = new FormControl('');
    serviceSearchCtrl = new FormControl('');
    paysSearchCtrl = new FormControl('');
    // Supprimer selectedAgency, selectedService, selectedCountry
    filteredAgencies: string[] = [];
    filteredServices: string[] = [];
    filteredCountries: string[] = [];

    @ViewChild('agenceSelect') agenceSelect!: MatSelect;
    @ViewChild('serviceSelect') serviceSelect!: MatSelect;
    @ViewChild('paysSelect') paysSelect!: MatSelect;

    constructor(
        private appStateService: AppStateService,
        private dataNormalizationService: DataNormalizationService,
        private fb: FormBuilder,
        private router: Router,
        private agencySummaryService: AgencySummaryService
    ) {
        this.filterForm = this.fb.group({
            agency: [[]],
            service: [[]],
            country: [[]],
            startDate: [''],
            endDate: ['']
        });
    }

    async ngOnInit() {
        console.log('StatsComponent initialisé');
        this.filterForm = this.fb.group({
            agency: [[]],
            service: [[]],
            country: [[]],
            startDate: [''],
            endDate: ['']
        });

        // Ajouter des listeners pour les changements de filtres
        this.filterForm.valueChanges.subscribe(() => {
            this.applyFilters();
        });

        this.loadData();

        // Initialisation des listes filtrées
        // SUPPRIMER l'initialisation des listes filtrées ici
        // this.filteredAgencies = this.getAllAgencies();
        // this.filteredServices = this.getAllServices();
        // this.filteredCountries = this.getAllCountries();
        this.agenceSearchCtrl.setValue('');
        this.serviceSearchCtrl.setValue('');
        this.paysSearchCtrl.setValue('');
        // Gestion de la recherche dynamique
        this.agenceSearchCtrl.valueChanges.subscribe((search: string | null) => {
            const s = (search || '').toLowerCase();
            const availableAgencies = this.getFilteredAgencies();
            this.filteredAgencies = availableAgencies.filter(a => a.toLowerCase().includes(s));
            if (this.filteredAgencies.length === 1 && !this.filterForm.value.agency.includes(this.filteredAgencies[0])) {
                this.filterForm.controls['agency'].setValue([this.filteredAgencies[0]]);
                if (this.agenceSelect) { this.agenceSelect.close(); }
                this.onFilterChange();
            }
        });
        this.serviceSearchCtrl.valueChanges.subscribe((search: string | null) => {
            const s = (search || '').toLowerCase();
            const availableServices = this.getFilteredServices();
            this.filteredServices = availableServices.filter(a => a.toLowerCase().includes(s));
            if (this.filteredServices.length === 1 && !this.filterForm.value.service.includes(this.filteredServices[0])) {
                this.filterForm.controls['service'].setValue([this.filteredServices[0]]);
                if (this.serviceSelect) { this.serviceSelect.close(); }
                this.onFilterChange();
            }
        });
        this.paysSearchCtrl.valueChanges.subscribe((search: string | null) => {
            const s = (search || '').toLowerCase();
            const availableCountries = this.getFilteredCountries();
            this.filteredCountries = availableCountries.filter(a => a.toLowerCase().includes(s));
            if (this.filteredCountries.length === 1 && !this.filterForm.value.country.includes(this.filteredCountries[0])) {
                this.filterForm.controls['country'].setValue([this.filteredCountries[0]]);
                if (this.paysSelect) { this.paysSelect.close(); }
                this.onFilterChange();
            }
        });
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }

    private loadData() {
        this.isLoading = true;
        this.agencySummaryService.getAllSummaries().subscribe({
            next: (data) => {
                console.log('Données reçues de l\'API agency-summary:', data);
                this.agencySummaries = data;
                // Initialiser les listes filtrées avec cloisonnement
                this.updateFilteredLists();
                this.applyFilters();
                this.isLoading = false;
            },
            error: (error) => {
                console.error('Erreur lors du chargement des données:', error);
                this.errorMessage = 'Erreur lors du chargement des données';
                this.isLoading = false;
            }
        });
    }

    getFilteredAgencies(): string[] {
        let data = this.agencySummaries;
        // Filtrer par service si sélectionné
        if (this.filterForm.value.service && this.filterForm.value.service.length > 0) {
            data = data.filter(s => this.filterForm.value.service.includes(s.service));
        }
        // Filtrer par pays si sélectionné
        if (this.filterForm.value.country && this.filterForm.value.country.length > 0) {
            data = data.filter(s => this.filterForm.value.country.includes(s.country));
        }
        const agencies = [...new Set(data.map(s => s.agency))];
        return agencies.sort();
    }

    getFilteredServices(): string[] {
        let data = this.agencySummaries;
        // Filtrer par agence si sélectionnée (cloisonnement principal)
        if (this.filterForm.value.agency && this.filterForm.value.agency.length > 0) {
            data = data.filter(s => this.filterForm.value.agency.includes(s.agency));
        }
        // Filtrer par pays si sélectionné
        if (this.filterForm.value.country && this.filterForm.value.country.length > 0) {
            data = data.filter(s => this.filterForm.value.country.includes(s.country));
        }
        const services = [...new Set(data.map(s => s.service))];
        return services.sort();
    }

    getFilteredCountries(): string[] {
        let data = this.agencySummaries;
        // Filtrer par agence si sélectionnée (cloisonnement principal)
        if (this.filterForm.value.agency && this.filterForm.value.agency.length > 0) {
            data = data.filter(s => this.filterForm.value.agency.includes(s.agency));
        }
        // Filtrer par service si sélectionné
        if (this.filterForm.value.service && this.filterForm.value.service.length > 0) {
            data = data.filter(s => this.filterForm.value.service.includes(s.service));
        }
        const countries = [...new Set(data.map(s => s.country))];
        return countries.sort();
    }

    // Harmonisation de la méthode de filtrage
    applyFilters() {
        console.log('applyFilters() appelé');
        console.log('Filtres actuels:', this.filterForm.value);
        console.log('agencySummaries length:', this.agencySummaries.length);
        
        const filters = this.filterForm.value;
        this.filteredData = this.agencySummaries.filter(summary => {
            const summaryDate = new Date(summary.date);
            const afterStart = !filters.startDate || summaryDate >= new Date(filters.startDate);
            const beforeEnd = !filters.endDate || summaryDate <= new Date(filters.endDate);
            const agencyMatch = !filters.agency || filters.agency.length === 0 || filters.agency.includes(summary.agency);
            const serviceMatch = !filters.service || filters.service.length === 0 || filters.service.includes(summary.service);
            const countryMatch = !filters.country || filters.country.length === 0 || filters.country.includes(summary.country);
            
            const match = agencyMatch && serviceMatch && countryMatch && afterStart && beforeEnd;
            
            // Log pour diagnostiquer le filtrage par service
            if (filters.service && filters.service.length > 0) {
                console.log('Filtrage service:', {
                    summaryService: summary.service,
                    selectedServices: filters.service,
                    serviceMatch,
                    match
                });
            }
            
            return match;
        });
        
        // Trier par date décroissante (du plus récent au plus ancien)
        this.filteredData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        console.log('Données après filtrage et tri:', this.filteredData.length);
        console.log('Sample des données filtrées:', this.filteredData.slice(0, 3));
        this.totalPages = Math.ceil(this.filteredData.length / this.statsPageSize);
    }

    // Méthode appelée lors d'un changement de filtre
    onFilterChange() {
        // Mettre à jour les listes filtrées pour le cloisonnement
        this.updateFilteredLists();
        
        this.applyFilters();
        
        // Fermer automatiquement les dropdowns après un choix
        setTimeout(() => {
            if (this.agenceSelect) this.agenceSelect.close();
            if (this.serviceSelect) this.serviceSelect.close();
            if (this.paysSelect) this.paysSelect.close();
        }, 100);
    }

    // Méthode pour mettre à jour les listes filtrées avec cloisonnement
    updateFilteredLists() {
        // Mettre à jour les services disponibles selon l'agence sélectionnée
        this.filteredServices = this.getFilteredServices();
        
        // Mettre à jour les pays disponibles selon l'agence sélectionnée
        this.filteredCountries = this.getFilteredCountries();
        
        // Mettre à jour les agences disponibles selon les autres filtres
        this.filteredAgencies = this.getFilteredAgencies();
        
        // Nettoyer les sélections qui ne sont plus valides
        this.cleanInvalidSelections();
    }

    // Méthode pour nettoyer les sélections invalides
    cleanInvalidSelections() {
        const currentAgency = this.filterForm.value.agency;
        const currentService = this.filterForm.value.service;
        const currentCountry = this.filterForm.value.country;

        // Nettoyer les services si l'agence a changé
        if (currentService && currentService.length > 0) {
            const validServices = currentService.filter((service: string) => 
                this.filteredServices.includes(service)
            );
            if (validServices.length !== currentService.length) {
                this.filterForm.patchValue({ service: validServices });
            }
        }

        // Nettoyer les pays si l'agence a changé
        if (currentCountry && currentCountry.length > 0) {
            const validCountries = currentCountry.filter((country: string) => 
                this.filteredCountries.includes(country)
            );
            if (validCountries.length !== currentCountry.length) {
                this.filterForm.patchValue({ country: validCountries });
            }
        }

        // Nettoyer les agences si les autres filtres ont changé
        if (currentAgency && currentAgency.length > 0) {
            const validAgencies = currentAgency.filter((agency: string) => 
                this.filteredAgencies.includes(agency)
            );
            if (validAgencies.length !== currentAgency.length) {
                this.filterForm.patchValue({ agency: validAgencies });
            }
        }
    }

    /**
     * Agrège les statistiques en soustrayant les annulations des types d'origine
     */
    getAggregatedStats() {
        console.log('getAggregatedStats() appelé');
        console.log('filteredData length:', this.filteredData.length);
        console.log('filteredData sample:', this.filteredData.slice(0, 3));
        
        // Map: { [type]: { volume: number, count: number, agency, service, country, date }[] }
        const aggregation: { [key: string]: any[] } = {};
        // On regroupe par type/service/pays/agence/date
        for (const summary of this.filteredData) {
            const type = summary.service;
            const isAnnulation = type && type.startsWith('annulation_');
            let typeOrigine = type;
            if (isAnnulation) {
                typeOrigine = type.replace('annulation_', '');
            }
            // Clé d'agrégation : type d'origine + agence + pays + date
            const key = `${typeOrigine}|${summary.agency}|${summary.country}|${summary.date}`;
            if (!aggregation[key]) {
                aggregation[key] = [];
            }
            aggregation[key].push({
                ...summary,
                isAnnulation
            });
        }
        
        console.log('Nombre de groupes d\'agrégation:', Object.keys(aggregation).length);
        
        // Calculer les totaux corrigés
        const result: any[] = [];
        for (const key in aggregation) {
            const group = aggregation[key];
            const type = group[0].service;
            // Exclure les annulations des types spécifiques
            const excludedAnnulationTypes = [
                'annulation_total_paiement',
                'annulation_total_cashin',
                'annulation_annulation_bo',
                'annulation_annulation_partenaire',
                'annulation_FRAIS_TRANSACTION',
                'annulation_compense',
                'annulation_ajustement',
                'annulation_approvisionnement'
            ];
            if (excludedAnnulationTypes.includes(type)) {
                console.log('Type exclu:', type);
                continue;
            }
            

            // On additionne les volumes et nombres, puis on soustrait les annulations
            let totalVolume = 0;
            let recordCount = 0;
            let agency = group[0].agency;
            let service = group[0].service;
            let country = group[0].country;
            let date = group[0].date;
            for (const item of group) {
                if (item.isAnnulation) {
                    totalVolume -= item.totalVolume;
                    recordCount -= item.recordCount;
                } else {
                    totalVolume += item.totalVolume;
                    recordCount += item.recordCount;
                }
            }
            // On n'affiche que si le total est positif ou non nul
            if (recordCount !== 0 || totalVolume !== 0) {
                result.push({ agency, service, country, date, totalVolume, recordCount });
            } else {
                console.log('Groupe exclu car total nul:', { service, agency, country, date, totalVolume, recordCount });
            }
        }
        
        console.log('Nombre de résultats après agrégation:', result.length);
        console.log('Résultats sample:', result.slice(0, 3));
        
        // Trier par date décroissante
        return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    // Remplacer pagedStats par l'agrégation intelligente
    get pagedStats() {
        const aggregated = this.getAggregatedStats();
        const start = (this.statsPage - 1) * this.statsPageSize;
        const end = start + this.statsPageSize;
        return aggregated.slice(start, end);
    }

    // Adapter les totaux globaux
    getTotalRecords(): number {
        return this.getAggregatedStats().reduce((total, summary) => total + summary.recordCount, 0);
    }

    getTotalVolume(): number {
        return this.getAggregatedStats().reduce((total, summary) => total + summary.totalVolume, 0);
    }

    nextStatsPage() {
        if (this.statsPage < this.totalPages) {
            this.statsPage++;
        }
    }

    prevStatsPage() {
        if (this.statsPage > 1) {
            this.statsPage--;
        }
    }

    goToStatsPage(page: number) {
        if (page >= 1 && page <= this.totalPages) {
            this.statsPage = page;
        }
    }

    getVisibleStatsPages(): number[] {
        const maxVisible = 5;
        const pages: number[] = [];
        
        if (this.totalPages <= maxVisible) {
            // Si moins de 5 pages, afficher toutes
            for (let i = 1; i <= this.totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Si plus de 5 pages, afficher intelligemment
            let start = Math.max(1, this.statsPage - 2);
            let end = Math.min(this.totalPages, start + maxVisible - 1);
            
            // Ajuster si on est près de la fin
            if (end - start < maxVisible - 1) {
                start = Math.max(1, end - maxVisible + 1);
            }
            
            for (let i = start; i <= end; i++) {
                pages.push(i);
            }
        }
        
        return pages;
    }

    goBack() {
        console.log('Navigation vers /results');
        try {
            this.router.navigate(['/results']).then(() => {
                console.log('Navigation vers /results réussie');
            }).catch(error => {
                console.error('Erreur lors de la navigation vers /results:', error);
            });
        } catch (error) {
            console.error('Erreur dans goBack():', error);
        }
    }

    startNewReconciliation() {
        console.log('Navigation vers /upload');
        try {
            this.router.navigate(['/upload']).then(() => {
                console.log('Navigation vers /upload réussie');
            }).catch(error => {
                console.error('Erreur lors de la navigation vers /upload:', error);
            });
        } catch (error) {
            console.error('Erreur dans startNewReconciliation():', error);
        }
    }

    async exportStats() {
        this.isLoading = true;
        try {
            // Utiliser les données agrégées au lieu de filteredData
            const aggregatedData = this.getAggregatedStats();
            const data = aggregatedData.map(item => ({
                Client: item.agency,
                Service: item.service,
                Pays: item.country,
                Date: this.formatDateWithTime(item.date),
                Volume: Number(item.totalVolume),
                Transactions: Number(item.recordCount)
            }));

            if (data.length === 0) {
                this.errorMessage = 'Aucune donnée à exporter';
                return;
            }

            // Demander le nom du fichier à l'utilisateur
            const fileName = await this.promptFileName();
            if (!fileName) {
                console.log('Export annulé par l\'utilisateur');
                return;
            }

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Statistiques');

            worksheet.columns = [
                { header: 'Client', key: 'Client', width: 20 },
                { header: 'Service', key: 'Service', width: 20 },
                { header: 'Pays', key: 'Pays', width: 20 },
                { header: 'Date', key: 'Date', width: 20 },
                { header: 'Volume', key: 'Volume', width: 15, style: { numFmt: '#,##0' } },
                { header: 'Transactions', key: 'Transactions', width: 18, style: { numFmt: '#,##0' } }
            ];

            worksheet.getRow(1).eachCell(cell => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF1976D2' }
                };
                cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
            });

            data.forEach((row, idx) => {
                const excelRow = worksheet.addRow(row);
                if (idx % 2 === 1) {
                    excelRow.eachCell(cell => {
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFE3F2FD' }
                        };
                    });
                }
            });

            // Calcul des totaux
            const totalVolume = data.reduce((sum, row) => sum + Number(row.Volume), 0);
            const totalTransactions = data.reduce((sum, row) => sum + Number(row.Transactions), 0);

            // Ajoute la ligne de totaux
            const totalRow = worksheet.addRow({
                Client: 'TOTAL',
                Service: '',
                Pays: '',
                Date: '',
                Volume: totalVolume,
                Transactions: totalTransactions
            });
            totalRow.eachCell((cell, colNumber) => {
                cell.font = { bold: true };
                if (colNumber === 1 || colNumber === 5 || colNumber === 6) {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFB3E5FC' }
                    };
                }
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { 
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
            });
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            console.log(`Fichier téléchargé avec succès : ${fileName}`);
        } catch (error) {
            console.error('Erreur lors de l\'export:', error);
            this.errorMessage = 'Erreur lors de l\'export des données';
        } finally {
            this.isLoading = false;
        }
    }

    private async promptFileName(): Promise<string | null> {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const defaultFileName = `statistiques_${timestamp}.xlsx`;
        
        const fileName = prompt(`Entrez le nom du fichier (sans l'extension .xlsx):`, defaultFileName.replace('.xlsx', ''));
        
        if (fileName === null) {
            return null; // Utilisateur a annulé
        }
        
        if (fileName.trim() === '') {
            return defaultFileName;
        }
        
        return fileName.trim() + '.xlsx';
    }

    formatDateWithTime(date: string): string {
        try {
            const dateObj = new Date(date);
            if (isNaN(dateObj.getTime())) {
                return date; // Retourne la date originale si elle n'est pas valide
            }
            
            const formattedDate = dateObj.toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
            
            const formattedTime = dateObj.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            
            return `${formattedDate} ${formattedTime}`;
        } catch (error) {
            console.error('Erreur lors du formatage de la date:', error);
            return date; // Retourne la date originale en cas d'erreur
        }
    }

    // Méthodes utilitaires pour récupérer toutes les valeurs uniques
    getAllAgencies(): string[] {
        return Array.from(new Set(this.agencySummaries.map(s => s.agency))).sort();
    }
    getAllServices(): string[] {
        return Array.from(new Set(this.agencySummaries.map(s => s.service))).sort();
    }
    getAllCountries(): string[] {
        return Array.from(new Set(this.agencySummaries.map(s => s.country))).sort();
    }
} 