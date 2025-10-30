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
                    <button class="btn btn-add" (click)="addNewRow()" title="Ajouter une nouvelle ligne">
                        ➕ Nouvelle ligne
                    </button>
                    <button class="btn btn-export" (click)="exportToExcel()" [disabled]="!reportData.length">
                        📥 Exporter Excel
                    </button>
                    <button class="btn btn-save-all" (click)="saveAll()" [disabled]="!filteredReportData.length && !reportData.length">
                        💾 Sauvegarder tout
                    </button>
                    <button class="btn btn-report" (click)="goToReportDashboard()" [disabled]="!filteredReportData.length && !reportData.length">
                        📊 Rapport Avancé
                    </button>
                    <button class="btn btn-dashboard" (click)="goToReconciliationDashboard()" [disabled]="!filteredReportData.length && !reportData.length">
                        📈 Tableau de bord
                    </button>
                    <button class="btn btn-close" (click)="goBack()">
                        ❌ Fermer
                    </button>
                </div>
            </div>

            <div class="report-filters">
                <div class="filter-group">
                    <label>Agence:</label>
                    <div class="filter-inline">
                        <input 
                            type="text" 
                            [(ngModel)]="selectedAgency" 
                            (input)="onAgencyFilterChange()"
                            placeholder="Tapez pour rechercher une agence..."
                            class="filter-input"
                            list="agency-list">
                        <button 
                            type="button" 
                            class="btn-clear-dates" 
                            title="Effacer le filtre agence"
                            (click)="clearAgencyFilter()"
                        >
                            🗑️ Effacer agence
                        </button>
                    </div>
                    <datalist id="agency-list">
                        <option *ngFor="let agency of uniqueAgencies" [value]="agency">{{agency}}</option>
                    </datalist>
                </div>
                <div class="filter-group">
                    <label>Service:</label>
                    <div class="filter-inline">
                        <input 
                            type="text" 
                            [(ngModel)]="selectedService" 
                            (input)="filterReport()"
                            placeholder="Tapez pour rechercher un service..."
                            class="filter-input"
                            list="service-list">
                        <button 
                            type="button" 
                            class="btn-clear-dates" 
                            title="Effacer le filtre service"
                            (click)="clearServiceFilter()"
                        >
                            🗑️ Effacer service
                        </button>
                    </div>
                    <datalist id="service-list">
                        <option *ngFor="let service of filteredServices" [value]="service">{{service}}</option>
                    </datalist>
                </div>
                <div class="filter-group">
                    <label>Date de début:</label>
                    <input 
                        type="date" 
                        [(ngModel)]="selectedDateDebut" 
                        (change)="filterReport()"
                        class="filter-date"
                        placeholder="Date de début">
                </div>
                <div class="filter-group">
                    <label>Date de fin:</label>
                    <div class="filter-inline">
                        <input 
                            type="date" 
                            [(ngModel)]="selectedDateFin" 
                            (change)="filterReport()"
                            class="filter-date"
                            placeholder="Date de fin">
                        <button 
                            type="button" 
                            (click)="clearDateFilters()" 
                            class="btn-clear-dates"
                            title="Effacer les filtres de date">
                            🗑️ Effacer dates
                        </button>
                    </div>
                </div>
                <div class="filter-group">
                    <label>Statut:</label>
                    <select 
                        [(ngModel)]="selectedStatus" 
                        (change)="filterReport()"
                        class="filter-select">
                        <option value="">Tous les statuts</option>
                        <option *ngFor="let status of uniqueStatuses" [value]="status">{{status}}</option>
                    </select>
                </div>
            </div>


            <div class="report-summary">
                <div class="summary-cards">
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
                    <div class="summary-card">
                        <div class="card-icon">⏳</div>
                        <div class="card-content">
                            <div class="card-title">Écarts en cours</div>
                            <div class="card-value">{{inProgressDiscrepancies | number}}</div>
                        </div>
                    </div>
                    <div class="summary-card">
                        <div class="card-icon">✅</div>
                        <div class="card-content">
                            <div class="card-title">Écarts traités</div>
                            <div class="card-value">{{treatedDiscrepancies | number}}</div>
                        </div>
                    </div>
                    <div class="summary-card">
                        <div class="card-icon">🎫</div>
                        <div class="card-content">
                            <div class="card-title">Tickets à créer</div>
                            <div class="card-value">{{ticketsACreer | number}}</div>
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
                            <th class="col-service">Service</th>
                            <th class="col-pays">Pays</th>
                            <th class="col-transactions">Transactions</th>
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
                        <tr *ngFor="let item of paginatedData; trackBy: trackByItem" [class.editing-row]="editingRow === item">
                            <td class="text-cell">
                                <ng-container *ngIf="editingRow !== item; else editDate">
                                    {{formatDate(item.date)}}
                                </ng-container>
                                <ng-template #editDate>
                                    <input [(ngModel)]="item.date" type="date" class="edit-input"/>
                                </ng-template>
                            </td>
                            <td class="text-cell">
                                <ng-container *ngIf="editingRow !== item; else editAgency">
                                    {{item.agency}}
                                </ng-container>
                                <ng-template #editAgency>
                                    <input [(ngModel)]="item.agency" class="edit-input" placeholder="Agence"/>
                                </ng-template>
                            </td>
                            <td class="text-cell col-service">
                                <ng-container *ngIf="editingRow !== item; else editService">
                                    <span class="service-text" [title]="item.service">{{item.service}}</span>
                                </ng-container>
                                <ng-template #editService>
                                    <input [(ngModel)]="item.service" class="edit-input" placeholder="Service"/>
                                </ng-template>
                            </td>
                            <td class="text-cell col-pays">
                                <ng-container *ngIf="editingRow !== item; else editCountry">
                                    <span class="country-text" [title]="item.country">{{item.country}}</span>
                                </ng-container>
                                <ng-template #editCountry>
                                    <input [(ngModel)]="item.country" class="edit-input" placeholder="Pays"/>
                                </ng-template>
                            </td>
                            <td class="col-transactions">
                                <ng-container *ngIf="editingRow !== item; else editTransactions">
                                    {{item.totalTransactions | number}}
                                </ng-container>
                                <ng-template #editTransactions>
                                    <input [(ngModel)]="item.totalTransactions" type="number" class="edit-input"/>
                                </ng-template>
                            </td>
                            <td class="number-cell">
                                <ng-container *ngIf="editingRow !== item; else editVolume">
                                    {{item.totalVolume | number}}
                                </ng-container>
                                <ng-template #editVolume>
                                    <input [(ngModel)]="item.totalVolume" type="number" class="edit-input"/>
                                </ng-template>
                            </td>
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
                                    <ng-container *ngIf="item.glpiId && item.glpiId.trim() && editingRow !== item; else glpiInput">
                                        <a class="glpi-link" [href]="getGlpiTicketUrl(item.glpiId)" target="_blank" rel="noopener noreferrer" title="Ouvrir le ticket GLPI">{{item.glpiId}}</a>
                                    </ng-container>
                                    <ng-template #glpiInput>
                                        <div class="glpi-input-container">
                                            <input [(ngModel)]="item.glpiId" placeholder="ID GLPI" class="edit-input"/>
                                            <button 
                                                *ngIf="!item.glpiId || item.glpiId.trim() === ''" 
                                                class="btn-glpi-create"
                                                (click)="openGlpiCreate()"
                                                title="Créer un ticket GLPI">
                                                <i class="fas fa-plus-circle"></i> Créer
                                            </button>
                                        </div>
                                    </ng-template>
                                </div>
                            </td>
                            <td class="select-cell">
                                <ng-container *ngIf="editingRow !== item; else editStatus">
                                    <span [class]="getStatusClass(item.status)">{{item.status}}</span>
                                </ng-container>
                                <ng-template #editStatus>
                                    <select [(ngModel)]="item.status" class="edit-select">
                                        <option *ngFor="let s of statusOptions" [ngValue]="s">{{s}}</option>
                                    </select>
                                </ng-template>
                            </td>
                            <td class="select-cell">
                                <ng-container *ngIf="editingRow !== item; else editComment">
                                    <span class="comment-text">{{item.comment}}</span>
                                </ng-container>
                                <ng-template #editComment>
                                    <textarea [(ngModel)]="item.comment" class="edit-textarea" placeholder="Commentaire" rows="2"></textarea>
                                </ng-template>
                            </td>
                            <td class="actions-cell">
                                <ng-container *ngIf="editingRow !== item; else editingActions">
                                    <button class="icon-btn icon-edit" title="Modifier" aria-label="Modifier" (click)="startEdit(item)">✏️</button>
                                    <button class="icon-btn icon-delete" title="Supprimer" aria-label="Supprimer" (click)="deleteRow(item)" [disabled]="!item.id">🗑️</button>
                                </ng-container>
                                <ng-template #editingActions>
                                    <button class="icon-btn icon-save" title="Sauvegarder les modifications" aria-label="Sauvegarder" (click)="saveEdit(item)">💾</button>
                                    <button class="icon-btn icon-cancel" title="Annuler" aria-label="Annuler" (click)="cancelEdit(item)">❌</button>
                                </ng-template>
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

        .btn-report {
            background: #6f42c1;
            color: white;
        }

        .btn-report:hover:not(:disabled) {
            background: #5a32a3;
            transform: translateY(-1px);
        }

        .btn-dashboard {
            background: #fd7e14;
            color: white;
        }

        .btn-dashboard:hover:not(:disabled) {
            background: #e8650e;
            transform: translateY(-1px);
        }

        .btn-add {
            background: #17a2b8;
            color: white;
        }

        .btn-add:hover:not(:disabled) {
            background: #138496;
            transform: translateY(-1px);
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

        .filter-inline {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .filter-select {
            padding: 8px 12px;
            border: 1px solid #ced4da;
            border-radius: 6px;
            font-size: 0.9rem;
            background: white;
            min-width: 150px;
            transition: border-color 0.2s ease;
        }

        .filter-select:focus {
            outline: none;
            border-color: #007bff;
            box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        .btn-clear-dates {
            padding: 8px 12px;
            border: 1px solid #dc3545;
            background: #dc3545;
            color: white;
            border-radius: 6px;
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.2s ease;
            white-space: nowrap;
        }

        .btn-clear-dates:hover {
            background: #c82333;
            border-color: #bd2130;
            transform: translateY(-1px);
        }

        .btn-clear-dates:active {
            transform: translateY(0);
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
        .col-number { width: 100px; }
        .col-transactions { width: 100px; text-align: center; }
        .col-select { width: 180px; }
        .col-actions { text-align: left; width: 130px; }
        
        /* Largeur spécifique pour la colonne Service (augmentée) */
        .col-service { width: 300px; min-width: 280px; }
        .col-service input { width: 100%; padding: 6px 8px; box-sizing: border-box; }
        
        /* Largeur spécifique pour la colonne Pays */
        .col-pays { width: 200px; min-width: 180px; }
        .col-pays input { width: 100%; padding: 6px 8px; box-sizing: border-box; }
        
        /* Styles pour le texte des services */
        .service-text {
            display: inline-block;
            max-width: 100%;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-weight: 500;
            color: #495057;
        }
        
        .service-text:hover {
            white-space: normal;
            word-wrap: break-word;
            background: #f8f9fa;
            padding: 2px 4px;
            border-radius: 4px;
            z-index: 10;
            position: relative;
        }
        
        /* Styles pour le texte des pays */
        .country-text {
            display: inline-block;
            max-width: 100%;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            font-weight: 500;
            color: #495057;
        }
        
        .country-text:hover {
            white-space: normal;
            word-wrap: break-word;
            background: #f8f9fa;
            padding: 2px 4px;
            border-radius: 4px;
            z-index: 10;
            position: relative;
        }
        .glpi-cell { display: flex; gap: 8px; align-items: center; }
        .glpi-link { color: #007bff; text-decoration: none; font-weight: 600; }
        .glpi-link:hover { text-decoration: underline; }
        
        .glpi-input-container {
            display: flex;
            gap: 8px;
            align-items: center;
            width: 100%;
        }
        
        .btn-glpi-create {
            background: #28a745;
            color: white;
            border: none;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 4px;
            transition: all 0.2s ease;
            white-space: nowrap;
        }
        
        .btn-glpi-create:hover {
            background: #218838;
            transform: translateY(-1px);
        }
        
        .btn-glpi-create i {
            font-size: 0.7rem;
        }

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

        /* Styles pour l'édition en ligne */
        .editing-row {
            background: #fff3cd !important;
            border: 2px solid #ffc107 !important;
        }

        .editing-row:hover {
            background: #fff3cd !important;
        }

        .edit-input, .edit-select, .edit-textarea {
            width: 100%;
            padding: 6px 8px;
            border: 1px solid #007bff;
            border-radius: 4px;
            background: white;
            font-size: 0.9rem;
            box-sizing: border-box;
        }

        .edit-input:focus, .edit-select:focus, .edit-textarea:focus {
            outline: none;
            border-color: #0056b3;
            box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
        }

        .edit-textarea {
            resize: vertical;
            min-height: 60px;
            font-family: inherit;
        }

        .status-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 600;
            text-align: center;
            min-width: 80px;
        }

        .status-ok {
            background: #d4edda;
            color: #155724;
        }

        .status-nok {
            background: #f8d7da;
            color: #721c24;
        }

        .status-reporting-incomplet {
            background: #fff3cd;
            color: #856404;
        }

        .status-reporting-indisponible {
            background: #d1ecf1;
            color: #0c5460;
        }

        .status-en-cours..... {
            background: #e2e3e5;
            color: #383d41;
        }

        .comment-text {
            font-size: 0.85rem;
            line-height: 1.3;
            max-width: 150px;
            word-wrap: break-word;
        }

        .icon-edit {
            color: #007bff;
        }

        .icon-edit:hover {
            background: rgba(0, 123, 255, 0.1);
        }

        .icon-cancel {
            color: #6c757d;
        }

        .icon-cancel:hover {
            background: rgba(108, 117, 125, 0.1);
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
            
            /* Ajustements pour les colonnes Service et Pays sur mobile */
            .col-service { 
                width: 250px; 
                min-width: 220px; 
            }
            
            .col-pays { 
                width: 150px; 
                min-width: 120px; 
            }
            
            .service-text, .country-text {
                font-size: 0.85rem;
            }
        }
        
        @media (max-width: 480px) {
            .col-service { 
                width: 200px; 
                min-width: 180px; 
            }
            
            .col-pays { 
                width: 120px; 
                min-width: 100px; 
            }
            
            .service-text, .country-text {
                font-size: 0.8rem;
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
    paginatedData: ReconciliationReportData[] = [];
    response: ReconciliationResponse | null = null;
    private subscription = new Subscription();
    private loadedFromDb = false;
    currentSource: 'live' | 'db' = 'db';
    private hasSummary = false;

    reportData: ReconciliationReportData[] = [];
    filteredReportData: ReconciliationReportData[] = [];
    
    selectedAgency: string = '';
    selectedService: string = '';
    selectedDateDebut: string = '';
    selectedDateFin: string = '';
    selectedStatus: string = '';

    uniqueAgencies: string[] = [];
    uniqueServices: string[] = [];
    uniqueDates: string[] = [];
    uniqueStatuses: string[] = [];
    filteredServices: string[] = []; // Services filtrés selon l'agence sélectionnée

    statusOptions: string[] = ['OK', 'NOK', 'REPORTING INCOMPLET', 'REPORTING INDISPONIBLE', 'EN COURS.....'];
    commentOptions: string[] = ['ECARTS TRANSMIS', "PAS D'ECARTS CONSTATES", 'NOK'];
    
    // Propriétés pour l'édition en ligne
    editingRow: ReconciliationReportData | null = null;
    originalData: ReconciliationReportData | null = null;

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
        console.log('🔄 ReconciliationReportComponent - ngOnInit appelé');
        
        // Récupérer les données du résumé depuis le service dédié
        this.subscription.add(
            this.reconciliationSummaryService.agencySummary$.subscribe(summary => {
                console.log('📊 ReconciliationReportComponent - Résumé reçu:', summary);
                if (summary && summary.length > 0) {
                    console.log('📊 ReconciliationReportComponent - Génération du rapport...');
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
                        this.reportData = this.reportData.map((item, index) => {
                            const stats = this.calculateDetailedStatsForSummaryItem({
                                date: item.date,
                                agency: item.agency,
                                service: item.service,
                                country: item.country,
                                totalVolume: item.totalVolume,
                                recordCount: item.totalTransactions
                            } as any);
                            const matchRate = stats.matchRate;
                            
                            // Préserver la valeur partnerOnly originale (calculée dans generateReportDataFromSummary)
                            const preservedPartnerOnly = item.partnerOnly;
                            
                            console.log(`📊 Préservation partnerOnly pour index ${index}:`, {
                                original: preservedPartnerOnly,
                                calculated: stats.partnerOnly
                            });
                            
                            return {
                                ...item,
                                matches: stats.matches,
                                boOnly: stats.boOnly,
                                partnerOnly: preservedPartnerOnly, // Préserver la valeur originale
                                mismatches: stats.mismatches,
                                matchRate,
                                status: this.computeStatusFromCounts(stats.matches, stats.boOnly, preservedPartnerOnly, stats.mismatches, item.totalTransactions),
                                comment: this.buildCommentForCounts(stats.matches, stats.boOnly, preservedPartnerOnly, stats.mismatches)
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
        
        // Calculer le total des écarts partenaires une seule fois
        const totalPartnerOnly = this.calculateTotalPartnerOnly();
        console.log('📊 Total des écarts partenaires calculé:', totalPartnerOnly);
        
        // Convertir les données du résumé en données du rapport
        this.reportData = summary.map((item, index) => {
            // Calculer les statistiques détaillées si possible
            const detailedStats = this.calculateDetailedStatsForSummaryItem(item);
            
            const finalPartnerOnly = index === 0 ? totalPartnerOnly : 0;
            
            console.log(`📊 Rapport final pour index ${index}:`, {
                agency: item.agency,
                service: item.service,
                partnerOnly: finalPartnerOnly,
                totalPartnerOnly: totalPartnerOnly
            });
            
            return {
                date: item.date,
                agency: item.agency,
                service: item.service,
                country: item.country,
                totalTransactions: item.recordCount,
                totalVolume: item.totalVolume,
                matches: detailedStats.matches,
                boOnly: detailedStats.boOnly,
                // Mettre le total des écarts partenaires sur la première ligne seulement
                partnerOnly: finalPartnerOnly,
                mismatches: detailedStats.mismatches,
                matchRate: detailedStats.matchRate,
                status: this.computeStatusFromCounts(
                    detailedStats.matches,
                    detailedStats.boOnly,
                    finalPartnerOnly,
                    detailedStats.mismatches,
                    item.recordCount
                ),
                comment: this.buildCommentForCounts(
                    detailedStats.matches,
                    detailedStats.boOnly,
                    finalPartnerOnly,
                    detailedStats.mismatches
                )
            };
        });
        
        console.log('📊 Rapport final généré - reportData:', this.reportData);
        console.log('📊 Premier élément du rapport:', this.reportData[0]);
    }

    private calculateTotalPartnerOnly(): number {
        // Récupérer tous les écarts partenaires sans filtrage par agence/service
        const filteredPartnerOnly = this.reconciliationTabsService.getFilteredPartnerOnly();
        console.log('📊 Total des écarts partenaires disponibles dans calculateTotalPartnerOnly:', filteredPartnerOnly.length);
        
        return filteredPartnerOnly.length;
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
        
        // Debug structure des données partnerOnly
        if (filteredPartnerOnly.length > 0) {
            console.log('🔍 Structure des données partnerOnly (premier élément):', filteredPartnerOnly[0]);
            console.log('🔍 Colonnes disponibles dans partnerOnly:', Object.keys(filteredPartnerOnly[0]));
        }

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

        // Les écarts partenaires sont maintenant regroupés sur la première ligne
        // Donc on ne les calcule plus par agence/service
        const agencyPartnerOnly: any[] = [];

        // Calculer le total des écarts BO (boOnly + mismatches)
        const totalBoOnly = agencyBoOnly.length + agencyMismatches.length;
        
        // Pour le calcul du taux de correspondance, inclure les écarts partenaires
        // car ils sont maintenant regroupés sur la première ligne
        const totalPartnerOnly = this.calculateTotalPartnerOnly();
        const totalDetailed = agencyMatches.length + totalBoOnly + totalPartnerOnly;
        const matchRate = totalDetailed > 0 ? (agencyMatches.length / totalDetailed) * 100 : 0;

        console.log('📊 Résultats finaux:', {
            matches: agencyMatches.length,
            boOnly: totalBoOnly,
            partnerOnly: 0, // Les écarts partenaires sont maintenant regroupés sur la première ligne
            mismatches: agencyMismatches.length,
            matchRate: matchRate,
            totalDetailed: totalDetailed,
            totalPartnerOnly: totalPartnerOnly
        });

        return {
            matches: agencyMatches.length,
            boOnly: totalBoOnly, // Écarts BO totaux (boOnly + mismatches)
            partnerOnly: 0, // Les écarts partenaires sont maintenant regroupés sur la première ligne
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
            agency: record['Code proprietaire'] || record['Agent'] || record['Agence'] || record['agency'] || record['agence'] || record['AGENCE'] || 'Inconnue',
            service: record['Type Opération'] || record['Service'] || record['service'] || record['SERVICE'] || 'Inconnu',
            country: record['groupe de réseau'] || record['Pays provenance'] || record['country'] || record['pays'] || record['PAYS'] || 'Inconnu',
            date: record['Date opération'] || record['Date'] || record['date'] || record['DATE'] || new Date().toISOString().split('T')[0],
            volume: this.parseAmount(record['Montant'] || record['montant'] || record['amount'] || record['AMOUNT'] || '0')
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
            data.totalVolume += this.parseAmount(record['amount'] || record['montant'] || '0');
        });

        // Calculer les taux de correspondance
        // Le taux de correspondance = (nombre de correspondances / nombre de transactions) * 100
        this.reportData = Array.from(groupedData.values()).map(data => {
            // Calculer le nombre total de transactions (correspondances + écarts BO + écarts partenaires + incohérences)
            const totalTransactions = data.matches + data.boOnly + data.partnerOnly + data.mismatches;
            const rate = totalTransactions > 0 ? (data.matches / totalTransactions) * 100 : 0;
            return {
            ...data,
                totalTransactions: totalTransactions,
                matchRate: rate,
                status: this.computeStatusFromCounts(
                    data.matches,
                    data.boOnly,
                    data.partnerOnly,
                    data.mismatches,
                    totalTransactions
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
        this.uniqueStatuses = [...new Set(this.reportData.map(item => item.status).filter(status => status && status.trim() !== ''))].sort();
        
        // Initialiser les services filtrés avec tous les services
        this.filteredServices = [...this.uniqueServices];
        
        // Initialiser filteredReportData avec toutes les données si pas encore fait
        if (this.filteredReportData.length === 0) {
            this.filteredReportData = [...this.reportData];
            console.log('🔍 Debug extractUniqueValues - Initialisation filteredReportData:', {
                reportDataLength: this.reportData.length,
                filteredReportDataLength: this.filteredReportData.length,
                uniqueDatesFromReportData: this.uniqueDates.length,
                uniqueStatusesFromReportData: this.uniqueStatuses.length
            });
        }
    }

    /**
     * Met à jour la liste des services filtrés selon l'agence sélectionnée
     */
    private updateFilteredServices(): void {
        if (!this.selectedAgency) {
            // Si aucune agence sélectionnée, afficher tous les services
            this.filteredServices = [...this.uniqueServices];
        } else {
            // Filtrer les services selon l'agence sélectionnée
            const servicesForAgency = new Set<string>();
            this.reportData
                .filter(item => item.agency.toLowerCase().includes(this.selectedAgency.toLowerCase()))
                .forEach(item => {
                    servicesForAgency.add(item.service);
                });
            this.filteredServices = Array.from(servicesForAgency).sort();
        }
    }

    /**
     * Gère le changement de filtre agence avec filtrage cloisonné
     */
    onAgencyFilterChange(): void {
        // Réinitialiser le service sélectionné quand l'agence change
        this.selectedService = '';
        
        // Mettre à jour la liste des services disponibles pour cette agence
        this.updateFilteredServices();
        
        this.filterReport();
    }

    clearDateFilters(): void {
        this.selectedDateDebut = '';
        this.selectedDateFin = '';
        this.filterReport();
    }

    clearAgencyFilter(): void {
        this.selectedAgency = '';
        this.updateFilteredServices();
        this.filterReport();
    }

    clearServiceFilter(): void {
        this.selectedService = '';
        this.filterReport();
    }

    filterReport() {
        this.filteredReportData = this.reportData.filter(item => {
            const agencyMatch = !this.selectedAgency || item.agency.toLowerCase().includes(this.selectedAgency.toLowerCase());
            const serviceMatch = !this.selectedService || item.service.toLowerCase().includes(this.selectedService.toLowerCase());
            const statusMatch = !this.selectedStatus || item.status === this.selectedStatus;
            
            // Filtrage par plage de dates
            let dateMatch = true;
            if (this.selectedDateDebut || this.selectedDateFin) {
                const itemDateObj = new Date(item.date);
                
                // Si date de début spécifiée
                if (this.selectedDateDebut) {
                    const dateDebutObj = new Date(this.selectedDateDebut);
                    dateMatch = dateMatch && itemDateObj >= dateDebutObj;
                }
                
                // Si date de fin spécifiée
                if (this.selectedDateFin) {
                    const dateFinObj = new Date(this.selectedDateFin);
                    // Ajouter 1 jour à la date de fin pour inclure toute la journée
                    dateFinObj.setDate(dateFinObj.getDate() + 1);
                    dateMatch = dateMatch && itemDateObj < dateFinObj;
                }
            }
            
            return agencyMatch && serviceMatch && dateMatch && statusMatch;
        });
        
        console.log('🔍 Debug filterReport:', {
            reportDataLength: this.reportData.length,
            filteredReportDataLength: this.filteredReportData.length,
            selectedAgency: this.selectedAgency,
            selectedService: this.selectedService,
            selectedDateDebut: this.selectedDateDebut,
            selectedDateFin: this.selectedDateFin,
            selectedStatus: this.selectedStatus
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

    /**
     * Recalcule les données selon le statut sélectionné
     * Si le statut passe à "OK", les écarts sont réinitialisés à 0 et ajoutés aux correspondances
     */
    private recalculateDataBasedOnStatus(item: ReconciliationReportData): ReconciliationReportData {
        const recalculated = { ...item };

        // Si le statut est "OK", réinitialiser les écarts et les ajouter aux correspondances
        if (item.status === 'OK') {
            console.log('🔄 Recalcul pour statut OK:', {
                avant: {
                    matches: item.matches,
                    boOnly: item.boOnly,
                    partnerOnly: item.partnerOnly,
                    mismatches: item.mismatches,
                    totalTransactions: item.totalTransactions
                }
            });

            // Ajouter tous les écarts aux correspondances
            const totalEcart = item.boOnly + item.partnerOnly + item.mismatches;
            recalculated.matches = item.matches + totalEcart;
            
            // Réinitialiser les écarts à 0
            recalculated.boOnly = 0;
            recalculated.partnerOnly = 0;
            recalculated.mismatches = 0;
            
            // Recalculer le nombre total de transactions et le taux de correspondance
            recalculated.totalTransactions = recalculated.matches + recalculated.boOnly + recalculated.partnerOnly + recalculated.mismatches;
            recalculated.matchRate = recalculated.totalTransactions > 0 ? 
                (recalculated.matches / recalculated.totalTransactions) * 100 : 0;
            
            // Mettre à jour le commentaire
            recalculated.comment = this.buildCommentForCounts(
                recalculated.matches, 
                recalculated.boOnly, 
                recalculated.partnerOnly, 
                recalculated.mismatches
            );

            console.log('🔄 Recalcul pour statut OK:', {
                apres: {
                    matches: recalculated.matches,
                    boOnly: recalculated.boOnly,
                    partnerOnly: recalculated.partnerOnly,
                    mismatches: recalculated.mismatches,
                    totalTransactions: recalculated.totalTransactions,
                    matchRate: recalculated.matchRate,
                    comment: recalculated.comment
                }
            });
        } else {
            // Pour les autres statuts, recalculer le nombre total de transactions et le taux de correspondance normalement
            recalculated.totalTransactions = recalculated.matches + recalculated.boOnly + recalculated.partnerOnly + recalculated.mismatches;
            recalculated.matchRate = recalculated.totalTransactions > 0 ? 
                (recalculated.matches / recalculated.totalTransactions) * 100 : 0;
            
            // Mettre à jour le commentaire
            recalculated.comment = this.buildCommentForCounts(
                recalculated.matches, 
                recalculated.boOnly, 
                recalculated.partnerOnly, 
                recalculated.mismatches
            );
        }

        return recalculated;
    }

    get averageMatchRate(): number {
        if (!this.filteredReportData || this.filteredReportData.length === 0) return 0;
        const total = this.filteredReportData.reduce((sum, item) => sum + item.matchRate, 0);
        return Math.round(total / this.filteredReportData.length * 100) / 100;
    }


    // Compteurs d'écarts
    get inProgressDiscrepancies(): number {
        if (!this.filteredReportData) return 0;
        return this.filteredReportData
            .filter(item => (item.status || '').toUpperCase().includes('EN COURS'))
            .reduce((sum, item) => sum + (item.boOnly || 0) + (item.partnerOnly || 0) + (item.mismatches || 0), 0);
    }

    get treatedDiscrepancies(): number {
        if (!this.filteredReportData) return 0;
        return this.filteredReportData
            .filter(item => !(item.status || '').toUpperCase().includes('EN COURS'))
            .reduce((sum, item) => sum + (item.boOnly || 0) + (item.partnerOnly || 0) + (item.mismatches || 0), 0);
    }

    // Compteur des tickets à créer
    get ticketsACreer(): number {
        if (!this.filteredReportData) return 0;
        
        return this.filteredReportData
            .filter(item => {
                const idGlpiStr = (item.glpiId || '').trim();
                const idGlpiLower = idGlpiStr.toLowerCase();
                const status = (item.status || '').toUpperCase();
                
                // Exclure les tickets qui contiennent "modifier"
                if (idGlpiLower.includes('modifier')) {
                    return false;
                }
                
                // Compter les tickets qui nécessitent une création :
                // 1. ID GLPI vide ET statut NOK (problème nécessitant un ticket)
                // 2. ID GLPI contient "créer" ET statut en cours/attente
                const hasNoIdGlpi = idGlpiStr === '';
                const containsCreer = idGlpiLower.includes('créer');
                const isNok = status === 'NOK';
                const isEnAttenteOuEnCours = status.includes('EN COURS') || status.includes('EN ATTENTE');
                
                return (hasNoIdGlpi && isNok) || (containsCreer && isEnAttenteOuEnCours);
            }).length;
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

    // Ouvrir GLPI pour créer un nouveau ticket
    openGlpiCreate() {
        const glpiCreateUrl = 'https://glpi.intouchgroup.net/glpi/front/ticket.form.php';
        window.open(glpiCreateUrl, '_blank');
    }

    // Obtenir l'URL du ticket GLPI avec l'ID
    getGlpiTicketUrl(idGlpi: string): string {
        return `https://glpi.intouchgroup.net/glpi/front/ticket.form.php?id=${idGlpi}`;
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

        // Recalculer les valeurs selon le statut
        const recalculatedData = this.recalculateDataBasedOnStatus(item);

        const payload = {
            date: recalculatedData.date,
            agency: recalculatedData.agency,
            service: recalculatedData.service,
            country: recalculatedData.country,
            totalTransactions: recalculatedData.totalTransactions,
            totalVolume: recalculatedData.totalVolume,
            matches: recalculatedData.matches,
            boOnly: recalculatedData.boOnly,
            partnerOnly: recalculatedData.partnerOnly,
            mismatches: recalculatedData.mismatches,
            matchRate: recalculatedData.matchRate,
            status: recalculatedData.status,
            comment: recalculatedData.comment,
            glpiId: recalculatedData.glpiId || ''
        };

        fetch('/api/result8rec/' + item.id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(r => r.ok ? r.json() : Promise.reject(r))
        .then(() => {
            this.popupService.showSuccess('Ligne mise à jour avec succès');
            // Rafraîchir les données après la mise à jour
            this.loadSavedReportFromDatabase();
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

        const payload = rowsSource.map(item => {
            // Recalculer les valeurs selon le statut pour chaque item
            const recalculatedData = this.recalculateDataBasedOnStatus(item);
            return {
                date: recalculatedData.date,
                agency: recalculatedData.agency,
                service: recalculatedData.service,
                country: recalculatedData.country,
                glpiId: recalculatedData.glpiId || '',
                totalTransactions: recalculatedData.totalTransactions,
                totalVolume: recalculatedData.totalVolume,
                matches: recalculatedData.matches,
                boOnly: recalculatedData.boOnly,
                partnerOnly: recalculatedData.partnerOnly,
                mismatches: recalculatedData.mismatches,
                matchRate: recalculatedData.matchRate,
                status: recalculatedData.status,
                comment: recalculatedData.comment
            };
        });

        fetch('/api/result8rec/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(async r => {
            console.log('🔍 Debug saveAll response:', {
                status: r.status,
                statusText: r.statusText,
                ok: r.ok,
                contentType: r.headers.get('content-type')
            });
            
            // Lire le corps de la réponse une seule fois
            const responseText = await r.text();
            
            if (!r.ok) {
                console.error('❌ Erreur HTTP:', responseText);
                throw new Error(`HTTP ${r.status}: ${responseText}`);
            }
            
            // Essayer de parser en JSON, sinon utiliser le texte brut
            try {
                const jsonResponse = JSON.parse(responseText);
                console.log('🔍 Debug saveAll JSON response:', jsonResponse);
                return jsonResponse;
            } catch (parseError) {
                console.log('🔍 Debug saveAll - Response is not JSON, using text');
                console.log('🔍 Debug saveAll text response:', responseText);
                return responseText;
            }
        })
        .then((res) => {
            const message = typeof res === 'string' ? res : `${rowsSource.length} ligne(s) sauvegardée(s)`;
            console.log('✅ Sauvegarde bulk réussie:', message);
            this.popupService.showSuccess(message);
        })
        .catch(err => {
            console.error('❌ Erreur de sauvegarde bulk', err);
            this.popupService.showError('Erreur de sauvegarde', `Impossible de sauvegarder les lignes: ${err.message}`);
        });
    }

    goToReportDashboard() {
        window.location.href = '/report-dashboard';
    }

    goToReconciliationDashboard() {
        this.router.navigate(['/reconciliation-dashboard']);
    }


    getRateClass(rate: number): string {
        if (rate >= 95) return 'rate-excellent';
        if (rate >= 85) return 'rate-good';
        if (rate >= 70) return 'rate-average';
        return 'rate-poor';
    }

    private groupDataByAgency(data: ReconciliationReportData[]): any {
        const groupedData: { [key: string]: any } = {};
        
        data.forEach(item => {
            const agency = item.agency;
            
            if (!groupedData[agency]) {
                groupedData[agency] = {
                    agency: agency,
                    services: {},
                    totalTransactions: 0,
                    totalVolume: 0,
                    totalMatches: 0,
                    totalBoOnly: 0,
                    totalPartnerOnly: 0,
                    totalMismatches: 0,
                    averageMatchRate: 0
                };
            }
            
            // Grouper par service dans l'agence
            const service = item.service;
            if (!groupedData[agency].services[service]) {
                groupedData[agency].services[service] = {
                    service: service,
                    transactions: 0,
                    volume: 0,
                    matches: 0,
                    boOnly: 0,
                    partnerOnly: 0,
                    mismatches: 0,
                    matchRate: 0,
                    status: item.status,
                    comment: item.comment,
                    glpiId: item.glpiId
                };
            }
            
            // Accumuler les totaux
            groupedData[agency].totalTransactions += item.totalTransactions;
            groupedData[agency].totalVolume += item.totalVolume;
            groupedData[agency].totalMatches += item.matches;
            groupedData[agency].totalBoOnly += item.boOnly;
            groupedData[agency].totalPartnerOnly += item.partnerOnly;
            groupedData[agency].totalMismatches += item.mismatches;
            
            // Mettre à jour le service
            groupedData[agency].services[service].transactions += item.totalTransactions;
            groupedData[agency].services[service].volume += item.totalVolume;
            groupedData[agency].services[service].matches += item.matches;
            groupedData[agency].services[service].boOnly += item.boOnly;
            groupedData[agency].services[service].partnerOnly += item.partnerOnly;
            groupedData[agency].services[service].mismatches += item.mismatches;
            groupedData[agency].services[service].matchRate = item.matchRate;
            groupedData[agency].services[service].status = item.status;
            groupedData[agency].services[service].comment = item.comment;
            groupedData[agency].services[service].glpiId = item.glpiId;
        });
        
        // Calculer les taux moyens par agence
        Object.keys(groupedData).forEach(agency => {
            const agencyData = groupedData[agency];
            agencyData.averageMatchRate = agencyData.totalTransactions > 0 
                ? (agencyData.totalMatches / agencyData.totalTransactions) * 100 
                : 0;
        });
        
        return groupedData;
    }

    private exportDetailedReportToExcel(reportData: any) {
        const fileName = `rapport_detaille_agences_${new Date().toISOString().slice(0,10)}`;
        
        // Récupérer les données originales pour avoir toutes les lignes individuelles
        const rowsSource = this.filteredReportData.length > 0 ? this.filteredReportData : this.reportData;
        
        // Feuille 1: Résumé par agence
        const agencySummary = Object.values(reportData).map((agency: any) => ({
            'Agence': agency.agency,
            'Total Transactions': agency.totalTransactions,
            'Total Volume': agency.totalVolume,
            'Correspondances': agency.totalMatches,
            'Écarts BO': agency.totalBoOnly,
            'Écarts Partenaire': agency.totalPartnerOnly,
            'Incohérences': agency.totalMismatches,
            'Taux Moyen': `${agency.averageMatchRate.toFixed(2)}%`,
            'Nombre de Services': Object.keys(agency.services).length
        }));
        
        // Feuille 2: Détail complet - une ligne par agence/service/date
        const detailedRows = rowsSource.map(item => ({
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
            'Taux': `${item.matchRate.toFixed(2)}%`,
            'Statut': item.status,
            'Commentaire': item.comment,
            'ID GLPI': item.glpiId
        }));
        
        // Exporter les deux feuilles séparément
        this.exportService.exportExcelOptimized(
            agencySummary, 
            ['Agence', 'Total Transactions', 'Total Volume', 'Correspondances', 'Écarts BO', 'Écarts Partenaire', 'Incohérences', 'Taux Moyen', 'Nombre de Services'], 
            `${fileName}_resume_agences.xlsx`
        );
        
        // Attendre un peu avant le deuxième export
        setTimeout(() => {
            this.exportService.exportExcelOptimized(
                detailedRows, 
                ['Date', 'Agence', 'Service', 'Pays', 'Transactions', 'Volume', 'Correspondances', 'Écarts BO', 'Écarts Partenaire', 'Incohérences', 'Taux', 'Statut', 'Commentaire', 'ID GLPI'], 
                `${fileName}_detail_complet.xlsx`
            );
        }, 1000);
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

    // Méthodes pour l'édition en ligne
    startEdit(item: ReconciliationReportData) {
        // Sauvegarder une copie des données originales
        this.originalData = { ...item };
        this.editingRow = item;
    }

    cancelEdit(item: ReconciliationReportData) {
        if (this.originalData) {
            // Restaurer les données originales
            Object.assign(item, this.originalData);
        }
        this.editingRow = null;
        this.originalData = null;
    }

    async saveEdit(item: ReconciliationReportData) {
        // Valider les données avant sauvegarde
        if (!this.validateEditData(item)) {
            return;
        }

        // Recalculer le taux de correspondance si nécessaire
        this.recalculateMatchRate(item);

        // Si c'est une nouvelle ligne (pas d'ID), sauvegarder
        if (!item.id) {
            await this.confirmAndSave(item);
        } else {
            // Si c'est une ligne existante, mettre à jour
            await this.updateRow(item);
        }

        // Sortir du mode édition
        this.editingRow = null;
        this.originalData = null;
    }

    private validateEditData(item: ReconciliationReportData): boolean {
        if (!item.date || !item.agency || !item.service || !item.country) {
            this.popupService.showError('Données invalides', 'Veuillez remplir tous les champs obligatoires (Date, Agence, Service, Pays)');
            return false;
        }

        if (item.totalTransactions < 0 || item.totalVolume < 0) {
            this.popupService.showError('Données invalides', 'Les valeurs numériques ne peuvent pas être négatives');
            return false;
        }

        return true;
    }

    private recalculateMatchRate(item: ReconciliationReportData) {
        const total = item.matches + item.boOnly + item.partnerOnly + item.mismatches;
        if (total > 0) {
            item.matchRate = (item.matches / total) * 100;
        } else {
            item.matchRate = 0;
        }
        
        // Ne pas écraser le statut et commentaire s'ils ont été modifiés manuellement
        // On les garde tels quels pour respecter les modifications de l'utilisateur
    }

    // Méthode pour créer une nouvelle ligne
    addNewRow() {
        const newRow: ReconciliationReportData = {
            date: new Date().toISOString().split('T')[0],
            agency: '',
            service: '',
            country: '',
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

        // Ajouter au début du tableau
        this.reportData.unshift(newRow);
        
        // Mettre à jour les données filtrées et la pagination
        this.extractUniqueValues();
        this.filterReport();
        
        // Commencer l'édition de la nouvelle ligne
        this.startEdit(newRow);
    }

    // Méthode pour convertir le statut en classe CSS
    getStatusClass(status: string): string {
        if (!status) return 'status-badge';
        const cleanStatus = status.toLowerCase().replace(/\s+/g, '-');
        return `status-badge status-${cleanStatus}`;
    }
}
