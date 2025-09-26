import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ReconciliationResponse, Match } from '../../models/reconciliation-response.model';
import { AppStateService } from '../../services/app-state.service';
import { ReconciliationSummaryService, AgencySummaryData } from '../../services/reconciliation-summary.service';
import { ExportOptimizationService } from '../../services/export-optimization.service';
import { ReconciliationTabsService } from '../../services/reconciliation-tabs.service';
import { PopupService } from '../../services/popup.service';

export interface ReconciliationReportData {
    id?: number;
    date: string;
    agency: string;
    service: string;
    country: string;
    glpiId?: string;
    totalTransactions: number;
    totalVolume: number;
    matches: number;
    boOnly: number;
    partnerOnly: number;
    mismatches: number;
    matchRate: number;
    status: string;
    comment: string;
}

@Component({
    selector: 'app-reconciliation-report',
    template: `
        <div class="page-header">
            <div class="breadcrumb">
                <a routerLink="/results" class="breadcrumb-link">← Retour aux Résultats</a>
            </div>
        </div>
        <div class="reconciliation-report-container">
            <div class="report-header">
                <h2>📊 Rapport de Réconciliation <span class="badge" [ngClass]="currentSource === 'live' ? 'badge-live' : 'badge-db'">{{ currentSource === 'live' ? 'En cours' : 'Base sauvegardée' }}</span></h2>
                <div class="report-actions">
                    <button class="btn btn-export" (click)="exportToExcel()" [disabled]="!reportData.length">
                        📥 Exporter Excel
                    </button>
                    <button class="btn btn-save-all" (click)="saveAll()" [disabled]="!filteredReportData.length && !reportData.length">
                        💾 Sauvegarder tout
                    </button>
                    <button class="btn btn-close" (click)="goBack()">
                        ❌ Fermer
                    </button>
                </div>
            </div>

            <div class="report-filters">
                <div class="filter-group">
                    <label>Agence:</label>
                    <input 
                        type="text" 
                        [(ngModel)]="selectedAgency" 
                        (input)="filterReport()"
                        placeholder="Tapez pour rechercher une agence..."
                        class="filter-input"
                        list="agency-list">
                    <datalist id="agency-list">
                        <option *ngFor="let agency of uniqueAgencies" [value]="agency">{{agency}}</option>
                    </datalist>
                </div>
                <div class="filter-group">
                    <label>Service:</label>
                    <input 
                        type="text" 
                        [(ngModel)]="selectedService" 
                        (input)="filterReport()"
                        placeholder="Tapez pour rechercher un service..."
                        class="filter-input"
                        list="service-list">
                    <datalist id="service-list">
                        <option *ngFor="let service of uniqueServices" [value]="service">{{service}}</option>
                    </datalist>
                </div>
                <div class="filter-group">
                    <label>Date:</label>
                    <input 
                        type="date" 
                        [(ngModel)]="selectedDate" 
                        (change)="filterReport()"
                        class="filter-date"
                        placeholder="Sélectionner une date">
                </div>
            </div>

            <div class="report-summary">
                <div class="summary-cards">
                    <div class="summary-card">
                        <div class="card-icon">📅</div>
                        <div class="card-content">
                            <div class="card-title">Dates</div>
                            <div class="card-value">{{uniqueFilteredDates}}</div>
                        </div>
                    </div>
                    <div class="summary-card">
                        <div class="card-icon">🏢</div>
                        <div class="card-content">
                            <div class="card-title">Agences</div>
                            <div class="card-value">{{uniqueAgencies.length}}</div>
                        </div>
                    </div>
                    <div class="summary-card">
                        <div class="card-icon">⚙️</div>
                        <div class="card-content">
                            <div class="card-title">Services</div>
                            <div class="card-value">{{uniqueServices.length}}</div>
                        </div>
                    </div>
                    <div class="summary-card">
                        <div class="card-icon">📊</div>
                        <div class="card-content">
                            <div class="card-title">Taux Moyen</div>
                            <div class="card-value">{{averageMatchRate}}%</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="report-table-container">
                <table class="report-table">
                    <thead>
                        <tr>
                            <th class="col-date">Date</th>
                            <th class="col-text">Agence</th>
                            <th class="col-text">Service</th>
                            <th class="col-text">Pays</th>
                            <th class="col-number">Transactions</th>
                            <th class="col-number">Volume</th>
                            <th class="col-number">Correspondances</th>
                            <th class="col-number">Écarts BO</th>
                            <th class="col-number">Écarts Partenaire</th>
                            <th class="col-number">Incohérences</th>
                            <th class="col-number">Taux de Correspondance</th>
                            <th class="col-text">ID GLPI</th>
                            <th class="col-select">Statut</th>
                            <th class="col-select">Commentaire</th>
                            <th class="col-actions">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr *ngFor="let item of paginatedData; trackBy: trackByItem">
                            <td class="text-cell">{{formatDate(item.date)}}</td>
                            <td class="text-cell">{{item.agency}}</td>
                            <td class="text-cell">{{item.service}}</td>
                            <td class="text-cell">{{item.country}}</td>
                            <td class="number-cell">{{item.totalTransactions | number}}</td>
                            <td class="number-cell">{{item.totalVolume | number}}</td>
                            <td class="match-cell">{{item.matches | number}}</td>
                            <td class="bo-only-cell">{{item.boOnly | number}}</td>
                            <td class="partner-only-cell">{{item.partnerOnly | number}}</td>
                            <td class="mismatch-cell">{{item.mismatches | number}}</td>
                            <td class="rate-cell number-cell">
                                <span [class]="getRateClass(item.matchRate)">
                                    {{item.matchRate | number:'1.2-2'}}%
                                </span>
                            </td>
                            <td class="text-cell">
                                <div class="glpi-cell">
                                    <ng-container *ngIf="item.glpiId && item.glpiId.trim(); else glpiInput">
                                        <a class="glpi-link" [href]="glpiBaseUrl + item.glpiId" target="_blank" rel="noopener noreferrer" title="Ouvrir le ticket GLPI">{{item.glpiId}}</a>
                                    </ng-container>
                                    <ng-template #glpiInput>
                                        <input [(ngModel)]="item.glpiId" placeholder="ID GLPI" class="filter-input"/>
                                    </ng-template>
                                </div>
                            </td>
                            <td class="select-cell">
                                <select [(ngModel)]="item.status" class="cell-select">
                                    <option *ngFor="let s of statusOptions" [ngValue]="s">{{s}}</option>
                                </select>
                            </td>
                            <td class="select-cell">
                                <select [(ngModel)]="item.comment" class="cell-select">
                                    <option *ngFor="let c of commentOptions" [ngValue]="c">{{c}}</option>
                                </select>
                            </td>
                            <td class="actions-cell">
                                <button class="icon-btn icon-save" title="Sauvegarder" aria-label="Sauvegarder" (click)="confirmAndSave(item)">💾</button>
                                <button class="icon-btn icon-save" title="Mettre à jour" aria-label="Mettre à jour" (click)="updateRow(item)" [disabled]="!item.id">✅</button>
                                <button class="icon-btn icon-delete" title="Supprimer" aria-label="Supprimer" (click)="deleteRow(item)" [disabled]="!item.id">🗑️</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Contrôles de pagination -->
            <div *ngIf="filteredReportData && filteredReportData.length > 0" class="pagination-container">
                <div class="pagination-info">
                    <span>Affichage de {{getPaginationStartIndex()}} à {{getPaginationEndIndex()}} sur {{filteredReportData?.length || 0}} éléments</span>
                </div>
                <div class="pagination-controls">
                    <button 
                        class="pagination-btn" 
                        (click)="goToPage(1)" 
                        [disabled]="currentPage === 1"
                        title="Première page">
                        ⏮️
                    </button>
                    <button 
                        class="pagination-btn" 
                        (click)="previousPage()" 
                        [disabled]="currentPage === 1"
                        title="Page précédente">
                        ⏪
                    </button>
                    
                    <div class="page-numbers">
                        <button 
                            *ngFor="let page of getPageNumbers()" 
                            class="page-number" 
                            [class.active]="page === currentPage"
                            (click)="goToPage(page)">
                            {{page}}
                        </button>
                    </div>
                    
                    <button 
                        class="pagination-btn" 
                        (click)="nextPage()" 
                        [disabled]="currentPage === totalPages"
                        title="Page suivante">
                        ⏩
                    </button>
                    <button 
                        class="pagination-btn" 
                        (click)="goToPage(totalPages)" 
                        [disabled]="currentPage === totalPages"
                        title="Dernière page">
                        ⏭️
                    </button>
                </div>
            </div>

            <div *ngIf="!filteredReportData || !filteredReportData.length" class="no-data">
                <div class="no-data-icon">📊</div>
                <div class="no-data-message">Aucune donnée de réconciliation disponible</div>
            </div>
        </div>
    `,
    styles: [`
        .page-header {
            background: #f8f9fa;
            padding: 15px 20px;
            border-bottom: 1px solid #dee2e6;
        }

        .breadcrumb {
            display: flex;
            align-items: center;
        }

        .breadcrumb-link {
            color: #007bff;
            text-decoration: none;
            font-weight: 500;
            padding: 8px 12px;
            border-radius: 4px;
            transition: all 0.2s ease;
        }

        .breadcrumb-link:hover {
            background: #e9ecef;
            text-decoration: none;
            color: #0056b3;
        }

        .reconciliation-report-container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            margin: 20px;
            overflow: hidden;
        }

        .report-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .report-header h2 {
            margin: 0;
            font-size: 1.5rem;
            font-weight: 600;
        }

        .report-actions {
            display: flex;
            gap: 10px;
        }

        .badge {
            margin-left: 10px;
            padding: 4px 8px;
            border-radius: 999px;
            font-size: 0.8rem;
            font-weight: 600;
        }
        .badge-live { background: #e6f4ea; color: #1e7e34; }
        .badge-db { background: #e8f0fe; color: #1b6ec2; }

        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9rem;
            font-weight: 500;
            transition: all 0.2s ease;
        }

        .btn-export {
            background: #28a745;
            color: white;
        }

        .btn-export:hover:not(:disabled) {
            background: #218838;
            transform: translateY(-1px);
        }

        .btn-close {
            background: #dc3545;
            color: white;
        }

        .btn-save-all {
            background: #0069d9;
            color: #fff;
        }

        .icon-btn {
            border: none;
            background: transparent;
            cursor: pointer;
            font-size: 18px;
            line-height: 1;
            padding: 4px 6px;
            border-radius: 4px;
        }
        .icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .icon-save { color: #28a745; }
        .icon-save:hover { background: rgba(40,167,69,0.1); }
        .icon-delete { color: #dc3545; }
        .icon-delete:hover { background: rgba(220,53,69,0.1); }

        .btn-close:hover {
            background: #c82333;
            transform: translateY(-1px);
        }

        .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .report-filters {
            padding: 20px;
            background: #f8f9fa;
            border-bottom: 1px solid #dee2e6;
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
        }

        .filter-group {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        .filter-group label {
            font-weight: 600;
            color: #495057;
            font-size: 0.9rem;
        }

        .filter-group select {
            padding: 8px 12px;
            border: 1px solid #ced4da;
            border-radius: 6px;
            font-size: 0.9rem;
            background: white;
            min-width: 150px;
        }

        .filter-input {
            padding: 8px 12px;
            border: 1px solid #ced4da;
            border-radius: 6px;
            font-size: 0.9rem;
            background: white;
            min-width: 200px;
            transition: border-color 0.2s ease;
        }

        .filter-input:focus {
            outline: none;
            border-color: #007bff;
            box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        .filter-date {
            padding: 8px 12px;
            border: 1px solid #ced4da;
            border-radius: 6px;
            font-size: 0.9rem;
            background: white;
            min-width: 150px;
            transition: border-color 0.2s ease;
        }

        .filter-date:focus {
            outline: none;
            border-color: #007bff;
            box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        .report-summary {
            padding: 20px;
            background: #f8f9fa;
        }

        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }

        .summary-card {
            background: white;
            border-radius: 8px;
            padding: 15px;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .card-icon {
            font-size: 1.5rem;
        }

        .card-content {
            flex: 1;
        }

        .card-title {
            font-size: 0.8rem;
            color: #6c757d;
            font-weight: 500;
            margin-bottom: 4px;
        }

        .card-value {
            font-size: 1.2rem;
            font-weight: 700;
            color: #495057;
        }

        .report-table-container {
            overflow-x: auto;
            max-height: 600px;
            overflow-y: auto;
        }

        .report-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.9rem;
            table-layout: fixed;
        }

        .report-table th {
            background: #e9ecef;
            padding: 12px 8px;
            text-align: left;
            font-weight: 600;
            color: #495057;
            border-bottom: 2px solid #dee2e6;
            position: sticky;
            top: 0;
            z-index: 10;
            white-space: nowrap;
        }

        .report-table td {
            padding: 10px 8px;
            border-bottom: 1px solid #dee2e6;
        }

        .report-table tr:hover {
            background: #f8f9fa;
        }

        .number-cell {
            text-align: right;
            font-family: 'Courier New', monospace;
        }

        .text-cell { text-align: left; }

        /* Align headers with numeric columns */
        .col-number { text-align: right; }
        .col-select { text-align: left; }
        .col-text { text-align: left; }
        .col-date { text-align: left; }

        /* Column widths to keep alignment stable */
        .col-date { width: 110px; }
        .col-text { width: 140px; }
        .col-text input { width: 100%; padding: 6px 8px; box-sizing: border-box; }
        .col-number { width: 120px; }
        .col-select { width: 180px; }
        .col-actions { text-align: left; width: 130px; }
        .glpi-cell { display: flex; gap: 8px; align-items: center; }
        .glpi-link { color: #007bff; text-decoration: none; font-weight: 600; }
        .glpi-link:hover { text-decoration: underline; }

        .match-cell {
            text-align: right;
            color: #28a745;
            font-weight: 600;
        }

        .bo-only-cell {
            text-align: right;
            color: #ffc107;
            font-weight: 600;
        }

        .partner-only-cell {
            text-align: right;
            color: #fd7e14;
            font-weight: 600;
        }

        .mismatch-cell {
            text-align: right;
            color: #dc3545;
            font-weight: 600;
        }

        .rate-cell {
            text-align: right;
            font-weight: 600;
        }

        .select-cell { padding: 6px 8px; }
        .cell-select {
            width: 100%;
            padding: 6px 8px;
            border: 1px solid #ced4da;
            border-radius: 4px;
            background: #fff;
            font-size: 0.9rem;
        }

        .rate-excellent {
            color: #28a745;
        }

        .rate-good {
            color: #17a2b8;
        }

        .rate-average {
            color: #ffc107;
        }

        .rate-poor {
            color: #dc3545;
        }

        .no-data {
            text-align: center;
            padding: 60px 20px;
            color: #6c757d;
        }

        .no-data-icon {
            font-size: 3rem;
            margin-bottom: 15px;
        }

        .no-data-message {
            font-size: 1.1rem;
            font-weight: 500;
        }

        /* Styles de pagination */
        .pagination-container {
            padding: 20px;
            background: #f8f9fa;
            border-top: 1px solid #dee2e6;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 15px;
        }

        .pagination-info {
            color: #6c757d;
            font-size: 0.9rem;
            font-weight: 500;
        }

        .pagination-controls {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .pagination-btn {
            padding: 8px 12px;
            border: 1px solid #dee2e6;
            background: white;
            color: #495057;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9rem;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 40px;
            height: 36px;
        }

        .pagination-btn:hover:not(:disabled) {
            background: #e9ecef;
            border-color: #adb5bd;
            transform: translateY(-1px);
        }

        .pagination-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            background: #f8f9fa;
        }

        .page-numbers {
            display: flex;
            gap: 4px;
            margin: 0 8px;
        }

        .page-number {
            padding: 8px 12px;
            border: 1px solid #dee2e6;
            background: white;
            color: #495057;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9rem;
            font-weight: 500;
            transition: all 0.2s ease;
            min-width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .page-number:hover {
            background: #e9ecef;
            border-color: #adb5bd;
            transform: translateY(-1px);
        }

        .page-number.active {
            background: #007bff;
            color: white;
            border-color: #007bff;
            font-weight: 600;
        }

        .page-number.active:hover {
            background: #0056b3;
            border-color: #0056b3;
        }

        @media (max-width: 768px) {
            .report-filters {
                flex-direction: column;
                gap: 15px;
            }
            
            .filter-group select {
                min-width: auto;
                width: 100%;
            }
            
            .summary-cards {
                grid-template-columns: 1fr;
            }

            .pagination-container {
                flex-direction: column;
                gap: 15px;
                text-align: center;
            }

            .pagination-controls {
                justify-content: center;
                flex-wrap: wrap;
            }

            .page-numbers {
                margin: 0 4px;
            }
        }
    `]
})
export class ReconciliationReportComponent implements OnInit, OnDestroy {
    glpiBaseUrl = 'https://glpi.intouchgroup.net/glpi/front/ticket.form.php?id='
    
    // Propriétés de pagination
    currentPage = 1;
    itemsPerPage = 10;
    totalPages = 0;
    paginatedData: ReconciliationReportData[] = [];;
    response: ReconciliationResponse | null = null;
    private subscription = new Subscription();
    private loadedFromDb = false;
    currentSource: 'live' | 'db' = 'db';
    private hasSummary = false;

    reportData: ReconciliationReportData[] = [];
    filteredReportData: ReconciliationReportData[] = [];
    
    selectedAgency: string = '';
    selectedService: string = '';
    selectedDate: string = '';

    uniqueAgencies: string[] = [];
    uniqueServices: string[] = [];
    uniqueDates: string[] = [];

    statusOptions: string[] = ['OK', 'NOK', 'REPORTING INCOMPLET', 'REPORTING INDISPONIBLE', 'EN COURS.....'];
    commentOptions: string[] = ['ECARTS TRANSMIS', "PAS D'ECARTS CONSTATES", 'NOK'];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private appStateService: AppStateService,
        private reconciliationSummaryService: ReconciliationSummaryService,
        private reconciliationTabsService: ReconciliationTabsService,
        private exportService: ExportOptimizationService,
        private popupService: PopupService
    ) {
        // Initialiser filteredReportData pour éviter les erreurs
        this.filteredReportData = [];
    }

    ngOnInit() {
        // Récupérer les données du résumé depuis le service dédié
        this.subscription.add(
            this.reconciliationSummaryService.agencySummary$.subscribe(summary => {
                if (summary && summary.length > 0) {
                    this.generateReportDataFromSummary(summary);
                    this.extractUniqueValues();
                    this.filterReport();
                    this.currentSource = 'live';
                    this.hasSummary = true;
                } else if (!this.response && !this.loadedFromDb) {
                    // Pas de résumé et pas de réponse en cours → charger depuis la base
                    this.loadSavedReportFromDatabase();
                }
            })
        );

        // Également récupérer les données de réconciliation pour les statistiques détaillées
        this.subscription.add(
            this.appStateService.getReconciliationResults().subscribe(response => {
                this.response = response;
                // Toujours recalculer à partir des onglets dès que la réponse est disponible
                if (this.response) {
                    if (this.hasSummary && this.reportData.length > 0) {
                        // Si on a un résumé, on garde les colonnes Agence/Service/Pays du résumé
                        // mais on récupère les compteurs directement des onglets
                        this.reportData = this.reportData.map(item => {
                            const stats = this.calculateDetailedStatsForSummaryItem({
                                date: item.date,
                                agency: item.agency,
                                service: item.service,
                                country: item.country,
                                totalVolume: item.totalVolume,
                                recordCount: item.totalTransactions
                            } as any);
                            const matchRate = stats.matchRate;
                            return {
                                ...item,
                                matches: stats.matches,
                                boOnly: stats.boOnly,
                                partnerOnly: stats.partnerOnly,
                                mismatches: stats.mismatches,
                                matchRate,
                                status: this.computeStatusFromCounts(stats.matches, stats.boOnly, stats.partnerOnly, stats.mismatches, item.totalTransactions),
                                comment: this.buildCommentForCounts(stats.matches, stats.boOnly, stats.partnerOnly, stats.mismatches)
                            };
                        });
                    } else {
                        // Pas de résumé → construire à partir des données en cours
                    this.generateReportData();
                    }
                    this.extractUniqueValues();
                    this.filterReport();
                    this.currentSource = 'live';
                } else if (!this.loadedFromDb) {
                    // Pas de résultat courant → charger depuis la base
                    this.loadSavedReportFromDatabase();
                }
            })
        );
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }

    private generateReportDataFromSummary(summary: AgencySummaryData[]) {
        console.log('📊 Génération du rapport à partir du résumé par agence:', summary);
        
        // Convertir les données du résumé en données du rapport
        this.reportData = summary.map(item => {
            // Calculer les statistiques détaillées si possible
            const detailedStats = this.calculateDetailedStatsForSummaryItem(item);
            
            return {
                date: item.date,
                agency: item.agency,
                service: item.service,
                country: item.country,
                totalTransactions: item.recordCount,
                totalVolume: item.totalVolume,
                matches: detailedStats.matches,
                boOnly: detailedStats.boOnly,
                partnerOnly: detailedStats.partnerOnly,
                mismatches: detailedStats.mismatches,
                matchRate: detailedStats.matchRate,
                status: this.computeStatusFromCounts(
                    detailedStats.matches,
                    detailedStats.boOnly,
                    detailedStats.partnerOnly,
                    detailedStats.mismatches,
                    item.recordCount
                ),
                comment: this.buildCommentForCounts(
                    detailedStats.matches,
                    detailedStats.boOnly,
                    detailedStats.partnerOnly,
                    detailedStats.mismatches
                )
            };
        });
    }

    private calculateDetailedStatsForSummaryItem(summaryItem: AgencySummaryData) {
        if (!this.response) {
            // Si pas de données détaillées, estimer basé sur le résumé
            return {
                matches: Math.floor(summaryItem.recordCount * 0.8), // Estimation 80% de correspondances
                boOnly: Math.floor(summaryItem.recordCount * 0.1),   // Estimation 10% d'écarts BO
                partnerOnly: Math.floor(summaryItem.recordCount * 0.05), // Estimation 5% d'écarts partenaire
                mismatches: Math.floor(summaryItem.recordCount * 0.05), // Estimation 5% d'incohérences
                matchRate: 80 // Estimation de taux
            };
        }

        // Utiliser les données filtrées des onglets pour des statistiques précises
        const filteredMatches = this.reconciliationTabsService.getFilteredMatches();
        const filteredBoOnly = this.reconciliationTabsService.getFilteredBoOnly();
        const filteredPartnerOnly = this.reconciliationTabsService.getFilteredPartnerOnly();
        const filteredMismatches = this.reconciliationTabsService.getFilteredMismatches();

        console.log('🔍 DEBUG calculateDetailedStatsForSummaryItem');
        console.log('📊 Résumé item:', summaryItem);
        console.log('📊 Total matches disponibles:', filteredMatches.length);
        console.log('📊 Total boOnly disponibles:', filteredBoOnly.length);
        console.log('📊 Total partnerOnly disponibles:', filteredPartnerOnly.length);
        console.log('📊 Total mismatches disponibles:', filteredMismatches.length);

        // Limiter les logs aux premiers éléments pour éviter le spam
        let logCount = 0;
        const agencyMatches = filteredMatches.filter(match => {
            const boInfo = this.getBoAgencyAndService(match);
            if (logCount < 3) {
                console.log('🔍 Test match détaillé:', {
                    boInfo: boInfo,
                    summaryItem: {
                        agency: summaryItem.agency,
                        service: summaryItem.service,
                        country: summaryItem.country
                    },
                    agencyMatch: this.flexibleMatch(boInfo.agency, summaryItem.agency),
                    serviceMatch: this.flexibleMatch(boInfo.service, summaryItem.service),
                    countryMatch: this.flexibleMatch(boInfo.country, summaryItem.country),
                    rawBoData: match.boData
                });
                console.log('🔍 Valeurs exactes extraites:', {
                    'boInfo.agency': boInfo.agency,
                    'boInfo.service': boInfo.service,
                    'boInfo.country': boInfo.country,
                    'summaryItem.agency': summaryItem.agency,
                    'summaryItem.service': summaryItem.service,
                    'summaryItem.country': summaryItem.country
                });
                console.log('🔍 Colonnes disponibles dans boData:', Object.keys(match.boData));
                console.log('🔍 Valeurs des colonnes clés:', {
                    'Agence': match.boData['Agence'],
                    'Service': match.boData['Service'],
                    'Pays provenance': match.boData['Pays provenance'],
                    'Date': match.boData['Date']
                });
                logCount++;
            }
            // Si le pays est vide dans les données BO, ne pas l'exiger pour la correspondance
            const countryMatch = boInfo.country === 'Inconnu' || boInfo.country === '' || 
                                this.flexibleMatch(boInfo.country, summaryItem.country);
            const matches = this.flexibleMatch(boInfo.agency, summaryItem.agency) && 
                           this.flexibleMatch(boInfo.service, summaryItem.service) && 
                           countryMatch;
            if (matches) {
                console.log('✅ Match trouvé:', boInfo, 'pour', summaryItem);
            }
            return matches;
        });

        // Les écarts BO incluent les mismatches + boOnly
        const agencyBoOnly = filteredBoOnly.filter(record => {
            const boInfo = this.getBoOnlyAgencyAndService(record);
            const countryMatch = boInfo.country === 'Inconnu' || boInfo.country === '' || 
                                 this.flexibleMatch(boInfo.country, summaryItem.country);
            return this.flexibleMatch(boInfo.agency, summaryItem.agency) && 
                   this.flexibleMatch(boInfo.service, summaryItem.service) && 
                   countryMatch;
        });

        const agencyMismatches = filteredMismatches.filter(record => {
            const mismatchInfo = this.getMismatchAgencyAndService(record);
            const countryMatch = mismatchInfo.country === 'Inconnu' || mismatchInfo.country === '' || 
                                 this.flexibleMatch(mismatchInfo.country, summaryItem.country);
            return this.flexibleMatch(mismatchInfo.agency, summaryItem.agency) && 
                   this.flexibleMatch(mismatchInfo.service, summaryItem.service) && 
                   countryMatch;
        });

        const agencyPartnerOnly = filteredPartnerOnly.filter(record => {
            const partnerInfo = this.getPartnerOnlyAgencyAndService(record);
            const countryMatch = partnerInfo.country === 'Inconnu' || partnerInfo.country === '' || 
                                 this.flexibleMatch(partnerInfo.country, summaryItem.country);
            return this.flexibleMatch(partnerInfo.agency, summaryItem.agency) && 
                   this.flexibleMatch(partnerInfo.service, summaryItem.service) && 
                   countryMatch;
        });

        // Calculer le total des écarts BO (boOnly + mismatches)
        const totalBoOnly = agencyBoOnly.length + agencyMismatches.length;
        
        const totalDetailed = agencyMatches.length + totalBoOnly + agencyPartnerOnly.length;
        const matchRate = totalDetailed > 0 ? (agencyMatches.length / totalDetailed) * 100 : 0;

        console.log('📊 Résultats finaux:', {
            matches: agencyMatches.length,
            boOnly: totalBoOnly,
            partnerOnly: agencyPartnerOnly.length,
            mismatches: agencyMismatches.length,
            matchRate: matchRate
        });

        return {
            matches: agencyMatches.length,
            boOnly: totalBoOnly, // Écarts BO totaux (boOnly + mismatches)
            partnerOnly: agencyPartnerOnly.length,
            mismatches: agencyMismatches.length, // Incohérences séparées
            matchRate: matchRate
        };
    }

    private flexibleMatch(value1: string, value2: string): boolean {
        if (!value1 || !value2) return false;
        // Normaliser les chaînes (supprimer espaces, convertir en minuscules)
        const norm1 = value1.toString().trim().toLowerCase();
        const norm2 = value2.toString().trim().toLowerCase();
        return norm1 === norm2 || norm1.includes(norm2) || norm2.includes(norm1);
    }

    // Méthodes utilitaires pour extraire les informations d'agence/service/pays
    private getBoAgencyAndService(match: Match) {
        const boData = match.boData;
        return {
            agency: boData['Agence'] || boData['agency'] || boData['agence'] || boData['AGENCE'] || 'Inconnue',
            service: boData['Service'] || boData['service'] || boData['SERVICE'] || 'Inconnu',
            country: boData['Pays provenance'] || boData['country'] || boData['pays'] || boData['PAYS'] || 'Inconnu',
            date: boData['Date'] || boData['date'] || boData['DATE'] || new Date().toISOString().split('T')[0],
            volume: this.parseAmount(boData['montant'] || boData['amount'] || boData['AMOUNT'] || '0')
        };
    }

    private getBoOnlyAgencyAndService(record: Record<string, string>) {
        return {
            agency: record['Agence'] || record['agency'] || record['agence'] || record['AGENCE'] || 'Inconnue',
            service: record['Service'] || record['service'] || record['SERVICE'] || 'Inconnu',
            country: record['Pays provenance'] || record['country'] || record['pays'] || record['PAYS'] || 'Inconnu',
            date: record['Date'] || record['date'] || record['DATE'] || new Date().toISOString().split('T')[0],
            volume: this.parseAmount(record['montant'] || record['amount'] || record['AMOUNT'] || '0')
        };
    }

    private getPartnerOnlyAgencyAndService(record: Record<string, string>) {
        return {
            agency: record['Agence'] || record['agency'] || record['agence'] || record['AGENCE'] || 'Inconnue',
            service: record['Service'] || record['service'] || record['SERVICE'] || 'Inconnu',
            country: record['Pays provenance'] || record['country'] || record['pays'] || record['PAYS'] || 'Inconnu',
            date: record['Date'] || record['date'] || record['DATE'] || new Date().toISOString().split('T')[0],
            volume: this.parseAmount(record['montant'] || record['amount'] || record['AMOUNT'] || '0')
        };
    }

    private getMismatchAgencyAndService(record: Record<string, string>) {
        return {
            agency: record['Agence'] || record['agency'] || record['agence'] || record['AGENCE'] || 'Inconnue',
            service: record['Service'] || record['service'] || record['SERVICE'] || 'Inconnu',
            country: record['Pays provenance'] || record['country'] || record['pays'] || record['PAYS'] || 'Inconnu',
            date: record['Date'] || record['date'] || record['DATE'] || new Date().toISOString().split('T')[0],
            volume: this.parseAmount(record['montant'] || record['amount'] || record['AMOUNT'] || '0')
        };
    }

    private generateReportData() {
        if (!this.response) return;

        // Récupérer les données filtrées des onglets
        const filteredMatches = this.reconciliationTabsService.getFilteredMatches();
        const filteredBoOnly = this.reconciliationTabsService.getFilteredBoOnly();
        const filteredPartnerOnly = this.reconciliationTabsService.getFilteredPartnerOnly();
        const filteredMismatches = this.reconciliationTabsService.getFilteredMismatches();

        // Grouper les données par agence, service, pays et date
        const groupedData = new Map<string, ReconciliationReportData>();

        // Traiter les correspondances (onglet matches)
        filteredMatches.forEach(match => {
            const key = this.getGroupKey(match.boData);
            if (!groupedData.has(key)) {
                groupedData.set(key, this.createEmptyReportData(match.boData));
            }
            const data = groupedData.get(key)!;
            data.matches++;
            data.totalTransactions++;
            data.totalVolume += this.parseAmount(match.boData['amount'] || match.boData['montant'] || '0');
        });

        // Traiter les écarts BO (onglet boOnly)
        filteredBoOnly.forEach(record => {
            const key = this.getGroupKey(record);
            if (!groupedData.has(key)) {
                groupedData.set(key, this.createEmptyReportData(record));
            }
            const data = groupedData.get(key)!;
            data.boOnly++;
            data.totalTransactions++;
            data.totalVolume += this.parseAmount(record['amount'] || record['montant'] || '0');
        });

        // Traiter les écarts Partenaire (onglet partnerOnly)
        filteredPartnerOnly.forEach(record => {
            const key = this.getGroupKey(record);
            if (!groupedData.has(key)) {
                groupedData.set(key, this.createEmptyReportData(record));
            }
            const data = groupedData.get(key)!;
            data.partnerOnly++;
            data.totalTransactions++;
            data.totalVolume += this.parseAmount(record['amount'] || record['montant'] || '0');
        });

        // Traiter les incohérences (mismatches - incluses dans les écarts BO)
        filteredMismatches.forEach(record => {
            const key = this.getGroupKey(record);
            if (!groupedData.has(key)) {
                groupedData.set(key, this.createEmptyReportData(record));
            }
            const data = groupedData.get(key)!;
            data.mismatches++;
            data.totalTransactions++;
            data.totalVolume += this.parseAmount(record['amount'] || record['montant'] || '0');
        });

        // Calculer les taux de correspondance
        this.reportData = Array.from(groupedData.values()).map(data => {
            const rate = data.totalTransactions > 0 ? (data.matches / data.totalTransactions) * 100 : 0;
            return {
            ...data,
                matchRate: rate,
                status: this.computeStatusFromCounts(
                    data.matches,
                    data.boOnly,
                    data.partnerOnly,
                    data.mismatches,
                    data.totalTransactions
                ),
                comment: this.buildCommentForCounts(data.matches, data.boOnly, data.partnerOnly, data.mismatches)
            };
        });
        
        // Mettre à jour la pagination après génération des données
        this.updatePagination();
    }

    private getGroupKey(record: Record<string, string>): string {
        const agency = record['agency'] || record['agence'] || 'Inconnue';
        const service = record['service'] || record['type'] || 'Inconnu';
        const country = record['country'] || record['pays'] || 'Inconnu';
        const date = record['date'] || record['transaction_date'] || new Date().toISOString().split('T')[0];
        
        return `${agency}|${service}|${country}|${date}`;
    }

    private createEmptyReportData(record: Record<string, string>): ReconciliationReportData {
        const agency = record['agency'] || record['agence'] || 'Inconnue';
        const service = record['service'] || record['type'] || 'Inconnu';
        const country = record['country'] || record['pays'] || 'Inconnu';
        const date = record['date'] || record['transaction_date'] || new Date().toISOString().split('T')[0];

        return {
            date,
            agency,
            service,
            country,
            glpiId: '',
            totalTransactions: 0,
            totalVolume: 0,
            matches: 0,
            boOnly: 0,
            partnerOnly: 0,
            mismatches: 0,
            matchRate: 0,
            status: '',
            comment: ''
        };
    }

    private parseAmount(amount: string): number {
        if (!amount) return 0;
        const cleaned = amount.replace(/[^\d.-]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
    }

    private extractUniqueValues() {
        this.uniqueAgencies = [...new Set(this.reportData.map(item => item.agency))].sort();
        this.uniqueServices = [...new Set(this.reportData.map(item => item.service))].sort();
        this.uniqueDates = [...new Set(this.reportData.map(item => item.date))].sort();
        
        // Initialiser filteredReportData avec toutes les données si pas encore fait
        if (this.filteredReportData.length === 0) {
            this.filteredReportData = [...this.reportData];
            console.log('🔍 Debug extractUniqueValues - Initialisation filteredReportData:', {
                reportDataLength: this.reportData.length,
                filteredReportDataLength: this.filteredReportData.length,
                uniqueDatesFromReportData: this.uniqueDates.length
            });
        }
    }

    filterReport() {
        this.filteredReportData = this.reportData.filter(item => {
            const agencyMatch = !this.selectedAgency || item.agency.toLowerCase().includes(this.selectedAgency.toLowerCase());
            const serviceMatch = !this.selectedService || item.service.toLowerCase().includes(this.selectedService.toLowerCase());
            
            // Filtrage de date plus flexible
            let dateMatch = true;
            if (this.selectedDate) {
                // Convertir la date sélectionnée en format comparable
                const selectedDateObj = new Date(this.selectedDate);
                const itemDateObj = new Date(item.date);
                
                // Comparer seulement la date (sans l'heure)
                dateMatch = selectedDateObj.toDateString() === itemDateObj.toDateString();
            }
            
            return agencyMatch && serviceMatch && dateMatch;
        });
        
        console.log('🔍 Debug filterReport:', {
            reportDataLength: this.reportData.length,
            filteredReportDataLength: this.filteredReportData.length,
            selectedAgency: this.selectedAgency,
            selectedService: this.selectedService,
            selectedDate: this.selectedDate
        });
        
        // Réinitialiser à la première page et mettre à jour la pagination
        this.currentPage = 1;
        this.updatePagination();
    }

    formatDate(dateStr: string): string {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('fr-FR');
        } catch {
            return dateStr;
        }
    }

    getRateClass(rate: number): string {
        if (rate >= 95) return 'rate-excellent';
        if (rate >= 80) return 'rate-good';
        if (rate >= 60) return 'rate-average';
        return 'rate-poor';
    }

    private computeStatusFromCounts(matches: number, boOnly: number, partnerOnly: number, mismatches: number, totalTransactions: number): string {
        // Indisponible si aucun enregistrement
        if (totalTransactions === 0) return 'REPORTING INDISPONIBLE';
        // En cours si les données détaillées ne sont pas encore disponibles
        if (!this.response) return 'EN COURS.....';
        // OK si aucune anomalie
        if (matches > 0 && boOnly === 0 && partnerOnly === 0 && mismatches === 0) return 'OK';
        // Incomplet si uniquement un côté est présent sans correspondances
        if (matches === 0 && ((boOnly > 0 && partnerOnly === 0) || (partnerOnly > 0 && boOnly === 0))) return 'REPORTING INCOMPLET';
        // Sinon NOK
        return 'NOK';
    }

    private buildCommentForCounts(matches: number, boOnly: number, partnerOnly: number, mismatches: number): string {
        // Si pas d'écarts (correspondances = total transactions), retourner automatiquement "PAS D'ECARTS CONSTATES"
        if (boOnly === 0 && partnerOnly === 0 && mismatches === 0) {
            return "PAS D'ECARTS CONSTATES";
        }
        
        const parts: string[] = [];
        parts.push(`${matches} correspondances`);
        if (boOnly > 0) parts.push(`${boOnly} écart(s) BO`);
        if (partnerOnly > 0) parts.push(`${partnerOnly} écart(s) Partenaire`);
        if (mismatches > 0) parts.push(`${mismatches} incohérence(s)`);
        return parts.join(' • ');
    }

    get averageMatchRate(): number {
        if (!this.filteredReportData || this.filteredReportData.length === 0) return 0;
        const total = this.filteredReportData.reduce((sum, item) => sum + item.matchRate, 0);
        return Math.round(total / this.filteredReportData.length * 100) / 100;
    }

    get uniqueFilteredDates(): number {
        if (!this.filteredReportData || this.filteredReportData.length === 0) return 0;
        
        // Normaliser les dates pour ignorer l'heure
        const normalizedDates = this.filteredReportData.map(item => {
            const date = new Date(item.date);
            return date.toISOString().split('T')[0]; // Format YYYY-MM-DD
        });
        
        const uniqueDates = [...new Set(normalizedDates)];
        console.log('🔍 Debug uniqueFilteredDates:', {
            filteredReportDataLength: this.filteredReportData.length,
            uniqueDates: uniqueDates,
            uniqueCount: uniqueDates.length,
            sampleDates: this.filteredReportData.slice(0, 3).map(item => item.date),
            allDates: this.filteredReportData.map(item => item.date),
            normalizedDates: normalizedDates
        });
        return uniqueDates.length;
    }

    trackByItem(index: number, item: ReconciliationReportData): string {
        return `${item.agency}-${item.service}-${item.date}`;
    }

    exportToExcel() {
        const rowsSource = this.filteredReportData.length > 0 ? this.filteredReportData : this.reportData;
        const columns = [
            'Date',
            'Agence',
            'Service',
            'Pays',
            'Transactions',
            'Volume',
            'Correspondances',
            'Écarts BO',
            'Écarts Partenaire',
            'Incohérences',
            'Taux de Correspondance',
            'ID GLPI',
            'Statut',
            'Commentaire'
        ];

        const rows = rowsSource.map(item => ({
            'Date': this.formatDate(item.date),
            'Agence': item.agency,
            'Service': item.service,
            'Pays': item.country,
            'Transactions': item.totalTransactions,
            'Volume': item.totalVolume,
            'Correspondances': item.matches,
            'Écarts BO': item.boOnly,
            'Écarts Partenaire': item.partnerOnly,
            'Incohérences': item.mismatches,
            'Taux de Correspondance': `${(item.matchRate || 0).toFixed(2)}%`,
            'ID GLPI': item.glpiId || '',
            'Statut': item.status,
            'Commentaire': item.comment
        }));

        const fileName = `rapport_reconciliation_${new Date().toISOString().slice(0,10)}`;
        this.exportService.exportExcelOptimized(rows, columns, fileName, { useWebWorker: true, format: 'xlsx' });
    }

    goBack() {
        this.router.navigate(['/results']);
    }

    private loadSavedReportFromDatabase() {
        this.loadedFromDb = true;
        fetch('/api/result8rec')
        .then(r => r.ok ? r.json() : [])
        .then((rows: any[]) => {
            if (!Array.isArray(rows)) return;
            this.reportData = rows.map(r => ({
                id: r.id,
                date: r.date,
                agency: r.agency,
                service: r.service,
                country: r.country,
                glpiId: r.glpiId || r.glpi_id || '',
                totalTransactions: r.totalTransactions || r.recordCount || 0,
                totalVolume: r.totalVolume || 0,
                matches: r.matches || 0,
                boOnly: r.boOnly || 0,
                partnerOnly: r.partnerOnly || 0,
                mismatches: r.mismatches || 0,
                matchRate: r.matchRate || 0,
                status: r.status || '',
                comment: r.comment || ''
            }));
            this.extractUniqueValues();
            this.filterReport();
            this.currentSource = 'db';
            this.updatePagination();
        })
        .catch(() => {
            // Ignorer silencieusement en cas d'erreur
        });
    }
    saveRow(item: ReconciliationReportData) {
        // Obsolète: remplacé par confirmAndSave
        this.confirmAndSave(item);
    }

    async confirmAndSave(item: ReconciliationReportData) {
        const message = `Confirmer l'enregistrement de la ligne\n\n${this.formatDate(item.date)} | ${item.agency} | ${item.service} | ${item.country}`;
        const confirmed = await this.popupService.showConfirm(message, 'Confirmation de sauvegarde');
        if (!confirmed) return;
        const payload = {
            date: item.date,
            agency: item.agency,
            service: item.service,
            country: item.country,
            glpiId: item.glpiId || '',
            totalTransactions: item.totalTransactions,
            totalVolume: item.totalVolume,
            matches: item.matches,
            boOnly: item.boOnly,
            partnerOnly: item.partnerOnly,
            mismatches: item.mismatches,
            matchRate: item.matchRate,
            status: item.status,
            comment: item.comment
        };
        fetch('/api/result8rec', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(async r => {
            if (r.status === 409) {
                const existing = await r.json();
                alert('Doublon détecté: déjà enregistré (id=' + existing.id + ')');
                return null;
            }
            if (!r.ok) throw r;
            return r.json();
        })
        .then((saved) => {
            if (!saved) return;
            item.id = saved.id;
            this.popupService.showSuccess('Ligne sauvegardée avec succès');
        })
        .catch(err => {
            console.error('❌ Erreur de sauvegarde', err);
            this.popupService.showError('Erreur de sauvegarde', 'Impossible de sauvegarder la ligne');
        });
    }

    async deleteRow(item: ReconciliationReportData) {
        if (!item.id) return;
        const confirmed = await this.popupService.showConfirm(
            `Supprimer l'enregistrement id=${item.id} ?`, 
            'Confirmation de suppression'
        );
        if (!confirmed) return;
        
        fetch('/api/result8rec/' + item.id, { method: 'DELETE' })
        .then(r => {
            if (!r.ok) throw r;
            // Ne pas supprimer la ligne du rapport (qui est calculée) mais juste retirer l'id
            item.id = undefined;
            this.popupService.showSuccess('Enregistrement supprimé avec succès');
            // Actualiser la page/données après suppression
            if (this.currentSource === 'db') {
                this.loadSavedReportFromDatabase();
            }
        })
        .catch(err => {
            console.error('❌ Erreur suppression', err);
            this.popupService.showError('Erreur de suppression', 'Impossible de supprimer l\'enregistrement');
        });
    }

    async updateRow(item: ReconciliationReportData) {
        if (!item.id) return;
        const confirmed = await this.popupService.showConfirm(
            `Confirmer la mise à jour de l'enregistrement id=${item.id} ?`,
            'Confirmation de mise à jour'
        );
        if (!confirmed) return;

        const payload = {
            status: item.status,
            comment: item.comment,
            glpiId: item.glpiId || ''
        };

        fetch('/api/result8rec/' + item.id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(r => r.ok ? r.json() : Promise.reject(r))
        .then(() => {
            this.popupService.showSuccess('Ligne mise à jour avec succès');
        })
        .catch(err => {
            console.error('❌ Erreur de mise à jour', err);
            this.popupService.showError('Erreur de mise à jour', 'Impossible de mettre à jour la ligne');
        });
    }

    async saveAll() {
        const rowsSource = this.filteredReportData.length > 0 ? this.filteredReportData : this.reportData;
        const confirmed = await this.popupService.showConfirm(
            `Confirmer la sauvegarde de ${rowsSource.length} ligne(s) ?`, 
            'Confirmation de sauvegarde en masse'
        );
        if (!confirmed) return;

        const payload = rowsSource.map(item => ({
            date: item.date,
            agency: item.agency,
            service: item.service,
            country: item.country,
            glpiId: item.glpiId || '',
            totalTransactions: item.totalTransactions,
            totalVolume: item.totalVolume,
            matches: item.matches,
            boOnly: item.boOnly,
            partnerOnly: item.partnerOnly,
            mismatches: item.mismatches,
            matchRate: item.matchRate,
            status: item.status,
            comment: item.comment
        }));

        fetch('/api/result8rec/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(r => r.ok ? r.json() : Promise.reject(r))
        .then((res) => {
            const message = typeof res === 'string' ? res : `${rowsSource.length} ligne(s) sauvegardée(s)`;
            this.popupService.showSuccess(message);
        })
        .catch(err => {
            console.error('❌ Erreur de sauvegarde bulk', err);
            this.popupService.showError('Erreur de sauvegarde', 'Impossible de sauvegarder les lignes');
        });
    }

    // Méthodes de pagination
    updatePagination() {
        this.totalPages = Math.ceil(this.filteredReportData.length / this.itemsPerPage);
        if (this.currentPage > this.totalPages && this.totalPages > 0) {
            this.currentPage = this.totalPages;
        }
        if (this.currentPage < 1) {
            this.currentPage = 1;
        }
        
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        this.paginatedData = this.filteredReportData.slice(startIndex, endIndex);
    }

    goToPage(page: number) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.updatePagination();
        }
    }

    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.updatePagination();
        }
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.updatePagination();
        }
    }

    getPageNumbers(): number[] {
        const pages: number[] = [];
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }
        return pages;
    }

    getPaginationEndIndex(): number {
        if (!this.filteredReportData) return 0;
        return Math.min(this.currentPage * this.itemsPerPage, this.filteredReportData.length);
    }

    getPaginationStartIndex(): number {
        return (this.currentPage - 1) * this.itemsPerPage + 1;
    }
}
