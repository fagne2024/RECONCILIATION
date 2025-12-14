import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { ReconciliationResponse, Match } from '../../models/reconciliation-response.model';
import { AppStateService } from '../../services/app-state.service';
import { ReconciliationSummaryService, AgencySummaryData } from '../../services/reconciliation-summary.service';
import { ExportOptimizationService } from '../../services/export-optimization.service';
import { ReconciliationTabsService } from '../../services/reconciliation-tabs.service';
import { PopupService } from '../../services/popup.service';
import { PaysService } from '../../services/pays.service';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

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
    traitement?: string;
    username?: string;
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
                    <button class="btn btn-toggle-source" (click)="toggleDataSource()" [title]="currentSource === 'live' ? 'Basculer vers les données en base' : 'Basculer vers les données en cours'">
                        🔄 {{ currentSource === 'live' ? 'Voir données en base' : 'Voir données en cours' }}
                    </button>
                    <button class="btn btn-add" (click)="addNewRow()" title="Ajouter une nouvelle ligne">
                        ➕ Nouvelle ligne
                    </button>
                    <button class="btn btn-export" (click)="exportToExcel()" [disabled]="!reportData.length">
                        📥 Exporter Excel
                    </button>
                    <button class="btn btn-save-all" (click)="saveAll()" [disabled]="!filteredReportData.length && !reportData.length">
                        💾 Sauvegarder tout
                    </button>
                    <button class="btn btn-dashboard" (click)="goToReconciliationDashboard()" [disabled]="!filteredReportData.length && !reportData.length">
                        📈 Tableau de bord
                    </button>
                    <button class="btn btn-suivi-ecarts" (click)="goToSuiviEcarts()" title="Ouvrir le suivi remboursement">
                        📋 Suivi remboursement
                    </button>
                    <button class="btn btn-toggle-actions" (click)="toggleActionsColumn()" [title]="showActionsColumn ? 'Masquer la colonne Actions' : 'Afficher la colonne Actions'">
                        {{ showActionsColumn ? '👁️ Masquer Actions' : '👁️‍🗨️ Afficher Actions' }}
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
                        <option *ngFor="let agency of filteredAgencies" [value]="agency">{{agency}}</option>
                    </datalist>
                </div>
                <div class="filter-group">
                    <label>Pays:</label>
                    <div class="filter-inline">
                        <input 
                            type="text" 
                            [(ngModel)]="selectedCountry" 
                            (input)="onCountryFilterChange()"
                            placeholder="Tapez pour rechercher un pays..."
                            class="filter-input"
                            list="country-list">
                        <button 
                            type="button" 
                            class="btn-clear-dates" 
                            title="Effacer le filtre pays"
                            (click)="clearCountryFilter()"
                        >
                            🗑️ Effacer pays
                        </button>
                    </div>
                    <datalist id="country-list">
                        <option *ngFor="let country of uniqueCountries" [value]="country">{{country}}</option>
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
                <div class="filter-group bulk-status-group" *ngIf="hasSelectedRows()">
                    <label>Changer le statut des lignes sélectionnées:</label>
                    <div class="bulk-status-controls">
                        <select 
                            [(ngModel)]="bulkStatusSelection" 
                            class="filter-select bulk-status-select">
                            <option value="">Sélectionner un statut</option>
                            <option *ngFor="let status of statusOptions" [value]="status">{{status}}</option>
                        </select>
                        <button 
                            class="btn btn-bulk-status" 
                            (click)="applyBulkStatusChange()" 
                            [disabled]="!bulkStatusSelection">
                            ✅ Appliquer
                        </button>
                        <button 
                            class="btn btn-clear-selection" 
                            (click)="clearSelection()">
                            🗑️ Désélectionner
                        </button>
                        <span class="selection-count">
                            {{getSelectedRowsCount()}} ligne(s) sélectionnée(s)
                        </span>
                    </div>
                </div>
                <div class="filter-group">
                    <label>Traitement:</label>
                    <div class="filter-inline">
                        <select 
                            [(ngModel)]="selectedTraitement" 
                            (change)="filterReport()"
                            class="filter-select">
                            <option value="">Tous les traitements</option>
                            <option *ngFor="let traitement of traitementOptions" [value]="traitement">{{traitement}}</option>
                        </select>
                        <button 
                            type="button" 
                            class="btn-clear-dates" 
                            title="Effacer le filtre traitement"
                            (click)="clearTraitementFilter()">
                            🗑️ Effacer traitement
                        </button>
                    </div>
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
                    <div class="summary-card clickable-card" 
                         [class.active]="activeCardFilter === 'inProgress'"
                         (click)="filterByInProgress()"
                         title="Cliquer pour filtrer les écarts en cours">
                        <div class="card-icon">⏳</div>
                        <div class="card-content">
                            <div class="card-title">Écarts en cours</div>
                            <div class="card-value">{{inProgressDiscrepancies | number}}</div>
                        </div>
                    </div>
                    <div class="summary-card clickable-card" 
                         [class.active]="activeCardFilter === 'treated'"
                         (click)="filterByTreated()"
                         title="Cliquer pour filtrer les écarts traités">
                        <div class="card-icon">✅</div>
                        <div class="card-content">
                            <div class="card-title">Écarts traités</div>
                            <div class="card-value">{{treatedDiscrepancies | number}}</div>
                        </div>
                    </div>
                    <div class="summary-card clickable-card" 
                         [class.active]="activeCardFilter === 'ticketsToCreate'"
                         (click)="filterByTicketsToCreate()"
                         title="Cliquer pour filtrer les tickets à créer">
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
                            <th class="col-checkbox">
                                <input 
                                    type="checkbox" 
                                    [checked]="isAllSelected()" 
                                    [indeterminate]="isSomeSelected()"
                                    (change)="toggleSelectAll($event)"
                                    title="Sélectionner/Désélectionner tout">
                            </th>
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
                            <th class="col-text">ID TICKET</th>
                            <th class="col-select">Statut</th>
                            <th class="col-select">Commentaire</th>
                            <th class="col-select">Traitement</th>
                            <th class="col-text">Utilisateur</th>
                            <th *ngIf="showActionsColumn" class="col-actions">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr *ngFor="let item of paginatedData; trackBy: trackByItem" [class.editing-row]="editingRow === item" [class.row-selected]="isRowSelected(item)">
                            <td class="checkbox-cell">
                                <input 
                                    type="checkbox" 
                                    [checked]="isRowSelected(item)"
                                    (change)="toggleRowSelection(item, $event)"
                                    [disabled]="isRowLocked(item)"
                                    [title]="isRowLocked(item) ? 'Ligne verrouillée (OK + Terminé)' : 'Sélectionner cette ligne'">
                            </td>
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
                            <td class="match-cell">
                                <ng-container *ngIf="editingRow !== item; else editMatches">
                                    {{getDisplayMatches(item) | number}}
                                </ng-container>
                                <ng-template #editMatches>
                                    <input 
                                        [(ngModel)]="item.matches" 
                                        type="number" 
                                        min="0" 
                                        class="edit-input" 
                                        inputmode="decimal" 
                                        placeholder="Correspondances"/>
                                </ng-template>
                            </td>
                            <td class="bo-only-cell">
                                <div class="ecart-cell-container">
                                    <ng-container *ngIf="editingRow !== item; else editBoOnly">
                                        <span class="ecart-value">{{item.boOnly | number}}</span>
                                        <button 
                                            *ngIf="item.boOnly > 0"
                                            class="btn-transfer-ecart" 
                                            (click)="transferEcartToMatches(item, 'boOnly')"
                                            [disabled]="isRowLocked(item)"
                                            [title]="isRowLocked(item) ? 'Ligne verrouillée (OK + Terminé)' : 'Transférer une partie des écarts BO vers les correspondances'">
                                            ➕
                                        </button>
                                    </ng-container>
                                    <ng-template #editBoOnly>
                                        <input 
                                            [(ngModel)]="item.boOnly" 
                                            type="number" 
                                            min="0" 
                                            class="edit-input" 
                                            inputmode="decimal" 
                                            placeholder="Écarts BO"/>
                                    </ng-template>
                                </div>
                            </td>
                            <td class="partner-only-cell">
                                <div class="ecart-cell-container">
                                    <ng-container *ngIf="editingRow !== item; else editPartnerOnly">
                                        <span class="ecart-value">{{item.partnerOnly | number}}</span>
                                        <button 
                                            *ngIf="item.partnerOnly > 0"
                                            class="btn-transfer-ecart" 
                                            (click)="transferEcartToMatches(item, 'partnerOnly')"
                                            [disabled]="isRowLocked(item)"
                                            [title]="isRowLocked(item) ? 'Ligne verrouillée (OK + Terminé)' : 'Transférer une partie des écarts Partenaire vers les correspondances'">
                                            ➕
                                        </button>
                                    </ng-container>
                                    <ng-template #editPartnerOnly>
                                        <input 
                                            [(ngModel)]="item.partnerOnly" 
                                            type="number" 
                                            min="0" 
                                            class="edit-input" 
                                            inputmode="decimal" 
                                            placeholder="Écarts partenaire"/>
                                    </ng-template>
                                </div>
                            </td>
                            <td class="mismatch-cell">{{item.mismatches | number}}</td>
                            <td class="rate-cell number-cell">
                                <span [class]="getRateClass(item.matchRate)">
                                    {{item.matchRate | number:'1.2-2'}}%
                                </span>
                            </td>
                            <td class="text-cell">
                                <div class="glpi-cell">
                                    <ng-container *ngIf="item.glpiId && item.glpiId.trim() && editingRow !== item; else glpiInput">
                                        <span class="glpi-link" (click)="showTicketOptionsPopup(item.glpiId)" title="Choisir une option pour ouvrir le ticket" style="cursor: pointer;">{{item.glpiId}}</span>
                                    </ng-container>
                                    <ng-template #glpiInput>
                                        <div class="glpi-input-container" [class.glpi-disabled]="item.status === 'OK'">
                                            <input 
                                                [(ngModel)]="item.glpiId" 
                                                placeholder="ID TICKET" 
                                                class="edit-input" 
                                                [disabled]="item.status === 'OK'"
                                                (ngModelChange)="onGlpiIdInputChange(item, $event)"
                                                (blur)="onGlpiIdInputBlur(item)"
                                                (keyup.enter)="onGlpiIdInputEnter(item)"/>
                                            <button 
                                                *ngIf="!item.glpiId || item.glpiId.trim() === ''" 
                                                class="btn-glpi-create"
                                                (click)="openGlpiCreate()"
                                                [disabled]="item.status === 'OK'"
                                                title="Créer un ticket GLPI">
                                                <i class="fas fa-plus-circle"></i> Créer
                                            </button>
                                        </div>
                                    </ng-template>
                                </div>
                            </td>
                            <td class="select-cell">
                                <ng-container *ngIf="editingStatusRow !== item; else editStatus">
                                    <span [class]="getStatusClass(item.status)" 
                                          class="status-badge" 
                                          [class.locked]="isRowLocked(item)"
                                          (click)="!isRowLocked(item) && startEditStatus(item)" 
                                          [style.cursor]="isRowLocked(item) ? 'not-allowed' : 'pointer'"
                                          [title]="isRowLocked(item) ? 'Ligne verrouillée (OK + Terminé)' : 'Cliquer pour modifier'">
                                        {{getDisplayStatus(item.status)}}
                                    </span>
                                </ng-container>
                                <ng-template #editStatus>
                                    <select [(ngModel)]="item.status" class="edit-select" (change)="onStatusChange(item)" (blur)="stopEditStatus()">
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
                            <td class="select-cell traitement-cell">
                                <ng-container *ngIf="editingTraitementRow !== item; else editTraitement">
                                    <span [class]="getTraitementClass(item.traitement)" 
                                          class="traitement-badge" 
                                          [class.locked]="isRowLocked(item)"
                                          (click)="!isRowLocked(item) && startEditTraitement(item)" 
                                          [style.cursor]="isRowLocked(item) ? 'not-allowed' : 'pointer'"
                                          [title]="isRowLocked(item) ? 'Ligne verrouillée (OK + Terminé)' : 'Cliquer pour modifier'">
                                        {{item.traitement || '-'}}
                                    </span>
                                </ng-container>
                                <ng-template #editTraitement>
                                    <select [(ngModel)]="item.traitement" class="edit-select" (change)="onTraitementChange(item)" (blur)="stopEditTraitement()">
                                        <option [ngValue]="undefined">-</option>
                                        <option *ngFor="let t of traitementOptions" [ngValue]="t">{{t}}</option>
                                    </select>
                                </ng-template>
                            </td>
                            <td class="text-cell">
                                {{item.username || '-'}}
                            </td>
                            <td *ngIf="showActionsColumn" class="actions-cell">
                                <ng-container *ngIf="editingRow !== item; else editingActions">
                                    <button class="icon-btn icon-edit" 
                                            title="Modifier" 
                                            aria-label="Modifier" 
                                            (click)="startEdit(item)"
                                            [disabled]="isRowLocked(item)">
                                        ✏️
                                    </button>
                                    <button class="icon-btn icon-delete" 
                                            title="Supprimer" 
                                            aria-label="Supprimer" 
                                            (click)="deleteRow(item)" 
                                            [disabled]="!item.id || isRowLocked(item)">
                                        🗑️
                                    </button>
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

        .btn-suivi-ecarts {
            background: #6f42c1;
            color: white;
        }

        .btn-suivi-ecarts:hover:not(:disabled) {
            background: #5a32a3;
            transform: translateY(-1px);
        }

        .btn-toggle-source {
            background: #6c757d;
            color: white;
        }

        .btn-toggle-source:hover:not(:disabled) {
            background: #5a6268;
            transform: translateY(-1px);
        }

        .btn-toggle-actions {
            background: #795548;
            color: white;
        }

        .btn-toggle-actions:hover:not(:disabled) {
            background: #6d4c41;
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
            gap: 15px;
            flex-wrap: nowrap;
            align-items: flex-end;
            overflow-x: auto;
        }

        .filter-group {
            display: flex;
            flex-direction: column;
            gap: 5px;
            flex-shrink: 0;
            min-width: 0;
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
            min-width: 120px;
            width: 100%;
            max-width: 180px;
        }

        .bulk-status-group {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            border: 2px solid #dee2e6;
            margin-top: 20px;
        }

        .bulk-status-controls {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
        }

        .bulk-status-select {
            flex: 1;
            min-width: 200px;
            max-width: 300px;
        }

        .btn-bulk-status {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            border: none;
            padding: 8px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s ease;
        }

        .btn-bulk-status:hover:not(:disabled) {
            background: linear-gradient(135deg, #218838 0%, #1ea085 100%);
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(40, 167, 69, 0.3);
        }

        .btn-bulk-status:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .btn-clear-selection {
            background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
            color: white;
            border: none;
            padding: 8px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s ease;
        }

        .btn-clear-selection:hover:not(:disabled) {
            background: linear-gradient(135deg, #5a6268 0%, #495057 100%);
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(108, 117, 125, 0.3);
        }

        .btn-clear-selection:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .selection-count {
            color: #495057;
            font-weight: 600;
            padding: 8px 15px;
            background: #e9ecef;
            border-radius: 6px;
            font-size: 0.9rem;
        }

        .filter-input {
            padding: 8px 12px;
            border: 1px solid #ced4da;
            border-radius: 6px;
            font-size: 0.9rem;
            background: white;
            min-width: 140px;
            width: 100%;
            max-width: 180px;
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
            min-width: 140px;
            width: 100%;
            max-width: 160px;
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
            min-width: 120px;
            width: 100%;
            max-width: 180px;
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

        .summary-card.clickable-card {
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .summary-card.clickable-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.15);
            background: #f8f9fa;
        }

        .summary-card.clickable-card.active {
            background: #e3f2fd;
            border: 2px solid #2196f3;
            box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
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
            max-height: calc(100vh - 400px);
            min-height: 600px;
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
        .col-checkbox { width: 40px; text-align: center; }
        .checkbox-cell { text-align: center; padding: 8px; }
        .checkbox-cell input[type="checkbox"] {
            width: 18px;
            height: 18px;
            cursor: pointer;
        }
        .row-selected {
            background-color: #e3f2fd !important;
        }
        .row-selected:hover {
            background-color: #bbdefb !important;
        }
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
        .glpi-input-container.glpi-disabled {
            opacity: 0.7;
        }
        .glpi-input-container.glpi-disabled .btn-glpi-create {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .glpi-input-container.glpi-disabled .edit-input {
            background-color: #e9ecef;
            color: #6c757d;
            cursor: not-allowed;
        }
        
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

        .ecart-cell-container {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 8px;
        }

        .ecart-value {
            flex: 0 0 auto;
        }

        .btn-transfer-ecart {
            background: #28a745;
            color: white;
            border: none;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.9rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            min-width: 28px;
            height: 24px;
            flex: 0 0 auto;
        }

        .btn-transfer-ecart:hover {
            background: #218838;
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .btn-transfer-ecart:active {
            transform: translateY(0);
        }

        .btn-transfer-ecart:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            background: #6c757d;
        }

        .btn-transfer-ecart:disabled:hover {
            background: #6c757d;
            transform: none;
            box-shadow: none;
        }

        .status-badge.locked,
        .traitement-badge.locked {
            opacity: 0.6;
            cursor: not-allowed !important;
            pointer-events: none;
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

        .traitement-cell {
            min-width: 150px;
            
            .traitement-badge {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 12px;
                font-size: 0.85rem;
                font-weight: 500;
                white-space: nowrap;
                transition: all 0.2s;
                
                &:hover {
                    opacity: 0.8;
                    transform: scale(1.05);
                }
            }
            
            .edit-select {
                width: 100%;
                padding: 4px 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 0.9rem;
                background: white;
                
                &:focus {
                    outline: none;
                    border-color: #4caf50;
                }
            }
        }

        .traitement-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 600;
            text-align: center;
            min-width: 100px;
        }

        .traitement-niveau-support {
            background: #fff3cd;
            color: #856404;
        }

        .traitement-niveau-group {
            background: #d1ecf1;
            color: #0c5460;
        }

        .traitement-terminé {
            background: #d4edda;
            color: #155724;
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
                flex-wrap: wrap;
                gap: 10px;
            }
            
            .filter-group {
                flex: 1 1 auto;
                min-width: 140px;
            }
            
            .filter-group select,
            .filter-input,
            .filter-date,
            .filter-select {
                min-width: auto;
                max-width: none;
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
    itemsPerPage = 15;
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
    selectedCountry: string = '';
    selectedDateDebut: string = '';
    selectedDateFin: string = '';
    selectedStatus: string = '';
    selectedTraitement: string = '';
    activeCardFilter: 'inProgress' | 'treated' | 'ticketsToCreate' | null = null;
    
    // Sélection multiple pour changement de statut
    selectedRows: Set<ReconciliationReportData> = new Set();
    bulkStatusSelection: string = '';

    uniqueAgencies: string[] = [];
    uniqueServices: string[] = [];
    uniqueCountries: string[] = [];
    uniqueDates: string[] = [];
    uniqueStatuses: string[] = [];
    filteredAgencies: string[] = []; // Agences filtrées selon le pays sélectionné
    filteredServices: string[] = []; // Services filtrés selon l'agence/pays sélectionnés

    statusOptions: string[] = ['OK', 'NOK', 'REPORTING INCOMPLET', 'REPORTING INDISPONIBLE', 'EN COURS.....'];
    commentOptions: string[] = ['ECARTS TRANSMIS', "PAS D'ECARTS CONSTATES", 'NOK'];
    traitementOptions: string[] = ['Niveau Support', 'Niveau Group', 'Terminé'];
    
    // Propriétés pour l'édition en ligne
    editingRow: ReconciliationReportData | null = null;
    originalData: ReconciliationReportData | null = null;
    
    // Propriété pour l'édition directe du traitement (comme dans banque)
    editingTraitementRow: ReconciliationReportData | null = null;
    
    // Propriété pour l'édition directe du statut
    editingStatusRow: ReconciliationReportData | null = null;
    
    // Propriété pour contrôler l'affichage de la colonne Actions
    showActionsColumn = false;

    // Pays autorisés pour le cloisonnement
    private allowedCountryCodes: string[] | null = null;
    private readonly DEFAULT_STATUS = 'EN COURS.....';

    // Gestion des sauvegardes automatiques de l'ID TICKET
    private glpiAutoSaveTimers = new WeakMap<ReconciliationReportData, ReturnType<typeof setTimeout>>();
    private lastSavedGlpiIds = new WeakMap<ReconciliationReportData, string>();

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private http: HttpClient,
        private appStateService: AppStateService,
        private reconciliationSummaryService: ReconciliationSummaryService,
        private reconciliationTabsService: ReconciliationTabsService,
        private exportService: ExportOptimizationService,
        private popupService: PopupService,
        private paysService: PaysService
    ) {
        // Initialiser filteredReportData pour éviter les erreurs
        this.filteredReportData = [];
        // Charger les pays autorisés
        this.loadAllowedCountries();
    }

    ngOnInit() {
        console.log('🔄 ReconciliationReportComponent - ngOnInit appelé');
        
        // Réinitialiser les données pour éviter le cache du navigateur
        this.reportData = [];
        this.filteredReportData = [];
        this.loadedFromDb = false;
        this.currentSource = null;
        
        // Vérifier immédiatement si on a des données en cours disponibles
        // Si oui, afficher la vue 'live' par défaut et charger les données immédiatement
        const summary = this.reconciliationSummaryService.getAgencySummary();
        
        if (summary && summary.length > 0) {
            this.currentSource = 'live';
            console.log('✅ Résumé disponible, vue "live" par défaut - chargement immédiat');
            // Charger immédiatement les données du résumé
            this.generateReportDataFromSummary(summary);
            this.extractUniqueValues();
            this.filterReport();
            this.hasSummary = true;
        } else {
            // Vérifier les résultats de réconciliation
            this.appStateService.getReconciliationResults().pipe(take(1)).subscribe(response => {
                if (response) {
                    this.currentSource = 'live';
                    console.log('✅ Résultats de réconciliation disponibles, vue "live" par défaut - chargement immédiat');
                    // Charger immédiatement les données de réconciliation
                    this.response = response;
                    this.generateReportData();
                    this.extractUniqueValues();
                    this.filterReport();
                }
            });
        }
        
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
                } else if (!this.response && !this.loadedFromDb && this.currentSource !== 'live') {
                    // Pas de résumé et pas de réponse en cours → charger depuis la base
                    // Mais seulement si on n'est pas déjà en mode 'live'
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
                            
                            // Définir le traitement par défaut selon la présence d'écarts
                            // Convertir en nombres pour s'assurer que les valeurs sont numériques
                            const boOnlyNum = Number(stats.boOnly) || 0;
                            const partnerOnlyNum = Number(preservedPartnerOnly) || 0;
                            const mismatchesNum = Number(stats.mismatches) || 0;
                            const totalEcarts = boOnlyNum + partnerOnlyNum + mismatchesNum;
                            
                            // Forcer le recalcul du traitement selon les écarts réels (sauf si "Terminé")
                            const traitementAttendu = totalEcarts > 0 ? 'Niveau Support' : 'Niveau Group';
                            const traitementFinal = (item.traitement === 'Terminé') 
                                ? item.traitement 
                                : traitementAttendu;
                            
                            return {
                                ...item,
                                matches: stats.matches,
                                boOnly: stats.boOnly,
                                partnerOnly: preservedPartnerOnly, // Préserver la valeur originale
                                mismatches: stats.mismatches,
                                // matchRate et comment seront recalculés par recalculateMatchRate
                                status: this.computeStatusFromCounts(
                                    stats.matches,
                                    stats.boOnly,
                                    preservedPartnerOnly,
                                    stats.mismatches,
                                    item.totalTransactions
                                ),
                                traitement: traitementFinal
                            };
                        });
                        this.enforceDefaultStatusForReportData();

                        // Appliquer la règle métier de recalcul sur les lignes issues du résumé
                        this.reportData.forEach(item => {
                            this.recalculateMatchRate(item);
                            this.syncCommentWithValues(item);
                        });
                    } else {
                        // Pas de résumé → construire à partir des données en cours
                    this.generateReportData();
                    }
                    this.syncLastSavedGlpiValues(this.reportData);
                    this.extractUniqueValues();
                    this.filterReport();
                    this.currentSource = 'live';
                } else if (!this.loadedFromDb && this.currentSource !== 'live') {
                    // Pas de résultat courant → charger depuis la base
                    // Mais seulement si on n'est pas déjà en mode 'live'
                    this.loadSavedReportFromDatabase();
                }
            })
        );
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }

    private loadAllowedCountries(): void {
        const username = this.appStateService.getUsername();
        if (!username || username === 'admin') {
            // Admin a accès à tous les pays
            this.allowedCountryCodes = null;
            console.log('🌍 Cloisonnement Frontend: Admin détecté, accès à tous les pays');
            return;
        }

        // Récupérer les pays autorisés depuis le backend
        this.paysService.getAllowedPaysCodesForCurrentUser().subscribe({
            next: (response) => {
                if (response.isGlobal) {
                    // GNL ou admin : tous les pays
                    this.allowedCountryCodes = null;
                    console.log('🌍 Cloisonnement Frontend: Utilisateur a accès à GNL (tous les pays)');
                } else {
                    // Pays spécifiques
                    this.allowedCountryCodes = response.codes || [];
                    console.log('🌍 Cloisonnement Frontend: Pays autorisés pour ' + username + ':', this.allowedCountryCodes);
                }
            },
            error: (error) => {
                console.error('❌ Erreur lors de la récupération des pays autorisés:', error);
                // En cas d'erreur, appliquer un filtrage strict (liste vide)
                this.allowedCountryCodes = [];
            }
        });
    }

    private shouldIncludeCountry(country: string): boolean {
        // Si allowedCountryCodes est null, cela signifie tous les pays (admin ou GNL ou backend gère déjà)
        if (this.allowedCountryCodes === null) {
            return true;
        }

        // Si la liste est vide, aucun pays autorisé
        if (this.allowedCountryCodes.length === 0) {
            return false;
        }

        // Vérifier si le pays est dans la liste autorisée
        // Convertir le nom du pays en code pays si nécessaire
        const countryCode = this.getCountryCode(country);
        return this.allowedCountryCodes.includes(countryCode);
    }

    private getCountryCode(countryName: string): string {
        if (!countryName) return '';
        
        const normalizedName = countryName.trim().toUpperCase();
        
        // Gérer les variantes spéciales comme "CITCH" qui signifie "CI" (Côte d'Ivoire)
        if (normalizedName === 'CITCH' || normalizedName.startsWith('CITCH')) {
            return 'CI';
        }
        
        // Mapping des noms de pays vers leurs codes
        const countryMap: { [key: string]: string } = {
            'CAMEROUN': 'CM',
            'CAMEROON': 'CM',
            'CÔTE D\'IVOIRE': 'CI',
            'COTE D\'IVOIRE': 'CI',
            'COTE DIVOIRE': 'CI',
            'CÔTE DIVOIRE': 'CI',
            'SÉNÉGAL': 'SN',
            'SENEGAL': 'SN',
            'BURKINA FASO': 'BF',
            'BURKINA': 'BF',
            'MALI': 'ML',
            'BÉNIN': 'BJ',
            'BENIN': 'BJ',
            'NIGER': 'NE',
            'TCHAD': 'TD',
            'TOGO': 'TG'
        };

        // Chercher par nom exact (insensible à la casse)
        for (const [name, code] of Object.entries(countryMap)) {
            if (name.toLowerCase() === normalizedName.toLowerCase()) {
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

        // Si c'est déjà un code (2 lettres), le retourner tel quel
        if (normalizedName.length === 2) {
            return normalizedName;
        }
        
        // Si c'est un code de 4-5 lettres qui commence par un code pays connu, extraire les 2 premières lettres
        if (normalizedName.length >= 4) {
            const firstTwo = normalizedName.substring(0, 2);
            const validCodes = ['CM', 'CI', 'SN', 'BF', 'ML', 'BJ', 'NE', 'TD', 'TG'];
            if (validCodes.includes(firstTwo)) {
                return firstTwo;
            }
        }

        // Sinon, retourner le nom tel quel pour comparaison
        return normalizedName;
    }

    private generateReportDataFromSummary(summary: AgencySummaryData[]) {
        console.log('📊 Génération du rapport à partir du résumé par agence:', summary);
        
        // Filtrer par pays autorisés avant de générer le rapport
        const filteredSummary = summary.filter(item => {
            if (!item.country) return false;
            return this.shouldIncludeCountry(item.country);
        });

        console.log('📊 Résumé filtré par pays:', {
            total: summary.length,
            filtered: filteredSummary.length,
            allowedCountryCodes: this.allowedCountryCodes
        });
        
        // Calculer le total des écarts partenaires une seule fois
        const totalPartnerOnly = this.calculateTotalPartnerOnly();
        console.log('📊 Total des écarts partenaires calculé:', totalPartnerOnly);
        
        // Détecter si on est sur une réconciliation avec plusieurs agences
        const uniqueAgencies = new Set(filteredSummary.map(item => item.agency));
        const hasMultipleAgencies = uniqueAgencies.size > 1;
        console.log('📊 Détection multi-agences:', {
            uniqueAgencies: Array.from(uniqueAgencies),
            hasMultipleAgencies: hasMultipleAgencies,
            totalPartnerOnly: totalPartnerOnly
        });
        
        // Convertir les données du résumé en données du rapport
        this.reportData = filteredSummary.map((item, index) => {
            // Calculer les statistiques détaillées si possible
            const detailedStats = this.calculateDetailedStatsForSummaryItem(item);
            
            // Si on a une seule agence, attribuer les écarts partenaires à cette agence (première ligne)
            // Si on a plusieurs agences, ne pas mettre les écarts partenaires sur les lignes d'agence (ils iront sur une ligne séparée)
            const finalPartnerOnly = (!hasMultipleAgencies && index === 0) ? totalPartnerOnly : 0;
            
            console.log(`📊 Rapport final pour index ${index}:`, {
                agency: item.agency,
                service: item.service,
                partnerOnly: finalPartnerOnly,
                totalPartnerOnly: totalPartnerOnly,
                hasMultipleAgencies: hasMultipleAgencies
            });
            
            const boOnly = detailedStats.boOnly;
            const partnerOnly = finalPartnerOnly;
            const mismatches = detailedStats.mismatches;
            
            // Définir le traitement par défaut selon la présence d'écarts
            // Convertir en nombres pour s'assurer que les valeurs sont numériques
            const boOnlyNum = Number(boOnly) || 0;
            const partnerOnlyNum = Number(partnerOnly) || 0;
            const mismatchesNum = Number(mismatches) || 0;
            const totalEcarts = boOnlyNum + partnerOnlyNum + mismatchesNum;
            const traitementDefault = totalEcarts > 0 ? 'Niveau Support' : 'Niveau Group';
            
            console.log(`🔍 Traitement pour ${item.agency}/${item.service}:`, {
                boOnly: boOnlyNum,
                partnerOnly: partnerOnlyNum,
                mismatches: mismatchesNum,
                totalEcarts: totalEcarts,
                traitement: traitementDefault
            });
            
            // Assurer la cohérence: totalTransactions = matches + boOnly + partnerOnly + mismatches
            const matches = detailedStats.matches;
            const calculatedTotal = matches + boOnly + partnerOnly + mismatches;
            const totalTransactions = calculatedTotal > 0 ? calculatedTotal : item.recordCount;
            
            const reportItem: ReconciliationReportData = {
                date: item.date,
                agency: item.agency,
                service: item.service,
                country: item.country,
                totalTransactions: totalTransactions,
                totalVolume: item.totalVolume,
                matches: matches,
                boOnly: boOnly,
                partnerOnly: partnerOnly,
                mismatches: mismatches,
                matchRate: totalTransactions > 0 ? (matches / totalTransactions) * 100 : 0,
                status: this.computeStatusFromCounts(
                    matches,
                    boOnly,
                    partnerOnly,
                    mismatches,
                    totalTransactions
                ),
                comment: '',
                traitement: traitementDefault
            };
            this.updateCommentFromCounts(
                reportItem,
                detailedStats.matches,
                boOnly,
                partnerOnly,
                mismatches,
                { force: true }
            );
            return reportItem;
        });
        
        // Si on a plusieurs agences et des écarts partenaires, créer une ligne supplémentaire pour le service
        if (hasMultipleAgencies && totalPartnerOnly > 0 && filteredSummary.length > 0) {
            const firstItem = filteredSummary[0];
            const servicePartnerOnlyRow: ReconciliationReportData = {
                date: firstItem.date,
                agency: '', // Agence vide
                service: firstItem.service, // Service de la première ligne
                country: firstItem.country,
                totalTransactions: totalPartnerOnly, // Total transactions = écarts partenaires
                totalVolume: 0, // Volume vide
                matches: 0, // Correspondances vides
                boOnly: 0, // Écart BO vide
                partnerOnly: totalPartnerOnly, // Écart partenaire attribué au service
                mismatches: 0,
                matchRate: 0,
                status: this.computeStatusFromCounts(0, 0, totalPartnerOnly, 0, totalPartnerOnly),
                comment: '',
                traitement: totalPartnerOnly > 0 ? 'Niveau Support' : 'Niveau Group'
            };
            this.updateCommentFromCounts(
                servicePartnerOnlyRow,
                0,
                0,
                totalPartnerOnly,
                0,
                { force: true }
            );
            this.reportData.push(servicePartnerOnlyRow);
            console.log('📊 Ligne supplémentaire créée pour écarts partenaires (multi-agences):', servicePartnerOnlyRow);
        }
        
        this.enforceDefaultStatusForReportData();

        // Appliquer la règle de recalcul (transactions / écarts / correspondances)
        this.reportData.forEach(item => {
            this.recalculateMatchRate(item);
            this.syncCommentWithValues(item);
        });
        
        // Trier par date décroissante (les plus récentes en premier)
        this.reportData.sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return dateB - dateA; // Décroissant (plus récent en premier)
        });
        
        console.log('📊 Rapport final généré - reportData:', this.reportData);
        console.log('📊 Premier élément du rapport:', this.reportData[0]);

        this.syncLastSavedGlpiValues(this.reportData);
    }

    private calculateTotalPartnerOnly(): number {
        // Récupérer tous les écarts partenaires sans filtrage par agence/service
        const filteredPartnerOnly = this.reconciliationTabsService.getFilteredPartnerOnly();
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

        // Filtrer les matches sans logs répétitifs pour améliorer les performances
        const agencyMatches = filteredMatches.filter(match => {
            const boInfo = this.getBoAgencyAndService(match);
            // Si le pays est vide dans les données BO, ne pas l'exiger pour la correspondance
            const countryMatch = boInfo.country === 'Inconnu' || boInfo.country === '' || 
                                this.flexibleMatch(boInfo.country, summaryItem.country);
            const matches = this.flexibleMatch(boInfo.agency, summaryItem.agency) && 
                           this.flexibleMatch(boInfo.service, summaryItem.service) && 
                           countryMatch;
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
            country: boData['GRX'] || boData['grx'] || boData['Pays provenance'] || boData['country'] || boData['pays'] || boData['PAYS'] || 'Inconnu',
            date: boData['Date'] || boData['date'] || boData['DATE'] || new Date().toISOString().split('T')[0],
            volume: this.parseAmount(boData['montant'] || boData['amount'] || boData['AMOUNT'] || '0')
        };
    }

    private getBoOnlyAgencyAndService(record: Record<string, string>) {
        return {
            agency: record['Agence'] || record['agency'] || record['agence'] || record['AGENCE'] || 'Inconnue',
            service: record['Service'] || record['service'] || record['SERVICE'] || 'Inconnu',
            country: record['GRX'] || record['grx'] || record['Pays provenance'] || record['country'] || record['pays'] || record['PAYS'] || 'Inconnu',
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
            country: record['GRX'] || record['grx'] || record['Pays provenance'] || record['country'] || record['pays'] || record['PAYS'] || 'Inconnu',
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

        // Calculer les taux de correspondance (valeur initiale)
        this.reportData = Array.from(groupedData.values()).map(data => {
            // Calculer le nombre total de transactions (correspondances + écarts BO + écarts partenaires + incohérences)
            const totalTransactions = data.matches + data.boOnly + data.partnerOnly + data.mismatches;
            const rate = totalTransactions > 0 ? (data.matches / totalTransactions) * 100 : 0;

            // Définir le traitement par défaut selon la présence d'écarts
            // Convertir en nombres pour s'assurer que les valeurs sont numériques
            const boOnlyNum = Number(data.boOnly) || 0;
            const partnerOnlyNum = Number(data.partnerOnly) || 0;
            const mismatchesNum = Number(data.mismatches) || 0;
            const totalEcarts = boOnlyNum + partnerOnlyNum + mismatchesNum;
            const traitementDefault = totalEcarts > 0 ? 'Niveau Support' : 'Niveau Group';
            
            const reportItem: ReconciliationReportData = {
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
                comment: '',
                traitement: traitementDefault
            };
            this.updateCommentFromCounts(
                reportItem,
                data.matches,
                data.boOnly,
                data.partnerOnly,
                data.mismatches,
                { force: true }
            );
            return reportItem;
        });
        this.enforceDefaultStatusForReportData();

        // Appliquer la règle métier de recalcul sur chaque ligne
        this.reportData.forEach(item => {
            this.recalculateMatchRate(item);
            this.syncCommentWithValues(item);
        });
        
        // Trier par date décroissante (les plus récentes en premier)
        this.reportData.sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return dateB - dateA; // Décroissant (plus récent en premier)
        });
        
        // Mettre à jour la pagination après génération des données
        this.updatePagination();

        this.syncLastSavedGlpiValues(this.reportData);
    }

    private getGroupKey(record: Record<string, string>): string {
        // Harmoniser la récupération des métadonnées (Agence / Service / Pays / Date)
        // avec la page de résultats (`/results`) pour éviter les valeurs "Inconnue"
        // et surtout pour que la date utilisée pour le regroupement soit la même.
        const agency =
            record['agency'] ||
            record['agence'] ||
            record['Agence'] ||
            record['AGENCE'] ||
            '';

        const service =
            record['service'] ||
            record['Service'] ||
            record['SERVICE'] ||
            record['type'] ||
            '';

        const country =
            record['GRX'] ||
            record['grx'] ||
            record['country'] ||
            record['Pays'] ||
            record['PAYS'] ||
            record['pays'] ||
            record['Pays provenance'] ||
            '';

        // La page `/results` utilise principalement :
        // ['Date opération', 'Date', 'dateOperation', 'date_operation', 'DATE']
        // On réutilise la même logique ici avant de tomber sur les champs techniques.
        const rawDate =
            record['Date opération'] ||
            record['Date'] ||
            record['dateOperation'] ||
            record['date_operation'] ||
            record['DATE'] ||
            record['date'] ||
            record['transaction_date'] ||
            '';

        const date = rawDate && String(rawDate).trim() !== ''
            ? String(rawDate)
            : new Date().toISOString().split('T')[0];

        const safeAgency = agency || 'Inconnue';
        const safeService = service || 'Inconnu';
        const safeCountry = country || 'Inconnu';
        
        return `${safeAgency}|${safeService}|${safeCountry}|${date}`;
    }

    private createEmptyReportData(record: Record<string, string>): ReconciliationReportData {
        const agency =
            record['agency'] ||
            record['agence'] ||
            record['Agence'] ||
            record['AGENCE'] ||
            '';

        const service =
            record['service'] ||
            record['Service'] ||
            record['SERVICE'] ||
            record['type'] ||
            '';

        const country =
            record['GRX'] ||
            record['grx'] ||
            record['country'] ||
            record['Pays'] ||
            record['PAYS'] ||
            record['pays'] ||
            record['Pays provenance'] ||
            '';

        const rawDate =
            record['Date opération'] ||
            record['Date'] ||
            record['dateOperation'] ||
            record['date_operation'] ||
            record['DATE'] ||
            record['date'] ||
            record['transaction_date'] ||
            '';

        const date = rawDate && String(rawDate).trim() !== ''
            ? String(rawDate)
            : new Date().toISOString().split('T')[0];

        const safeAgency = agency || 'Inconnue';
        const safeService = service || 'Inconnu';
        const safeCountry = country || 'Inconnu';

        return {
            date,
            agency: safeAgency,
            service: safeService,
            country: safeCountry,
            glpiId: '',
            totalTransactions: 0,
            totalVolume: 0,
            matches: 0,
            boOnly: 0,
            partnerOnly: 0,
            mismatches: 0,
            matchRate: 0,
            status: this.DEFAULT_STATUS,
            comment: '',
            traitement: undefined
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
        this.uniqueCountries = [...new Set(this.reportData.map(item => item.country).filter(country => country && country.trim() !== ''))].sort();
        this.uniqueDates = [...new Set(this.reportData.map(item => item.date))].sort();
        this.uniqueStatuses = [...new Set(this.reportData.map(item => item.status).filter(status => status && status.trim() !== ''))].sort();
        
        // Initialiser les listes filtrées
        this.filteredAgencies = [...this.uniqueAgencies];
        this.filteredServices = [...this.uniqueServices];
        this.updateFilteredAgencies();
        this.updateFilteredServices();
        
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
     * Met à jour la liste des agences filtrées selon le pays sélectionné
     */
    private updateFilteredAgencies(): void {
        const normalizedCountry = this.selectedCountry?.trim() ?? '';

        if (!normalizedCountry) {
            this.filteredAgencies = [...this.uniqueAgencies];
            return;
        }

        const countrySearch = normalizedCountry.toLowerCase();
        const agenciesForCountry = new Set<string>();
        this.reportData
            .filter(item => item.country?.toLowerCase().includes(countrySearch))
            .forEach(item => agenciesForCountry.add(item.agency));
        
        this.filteredAgencies = Array.from(agenciesForCountry).sort();
    }

    /**
     * Met à jour la liste des services filtrés selon l'agence/pays sélectionnés
     */
    private updateFilteredServices(): void {
        const agencySearch = this.selectedAgency ? this.selectedAgency.trim().toLowerCase() : null;
        const countrySearch = this.selectedCountry ? this.selectedCountry.trim().toLowerCase() : null;

        if (!agencySearch && !countrySearch) {
            this.filteredServices = [...this.uniqueServices];
            return;
        }

        const servicesForSelection = new Set<string>();
        this.reportData
            .filter(item => {
                const matchesCountry = !countrySearch || item.country?.toLowerCase().includes(countrySearch);
                const matchesAgency = !agencySearch || item.agency?.toLowerCase().includes(agencySearch);
                return matchesCountry && matchesAgency;
            })
            .forEach(item => servicesForSelection.add(item.service));

        this.filteredServices = Array.from(servicesForSelection).sort();
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

    /**
     * Gère le changement de filtre pays avec cloisonnement agence/service
     */
    onCountryFilterChange(): void {
        this.updateFilteredAgencies();

        if (this.selectedAgency) {
            const normalizedAgency = this.selectedAgency.toLowerCase();
            const agencyStillAvailable = this.filteredAgencies.some(agency => agency.toLowerCase() === normalizedAgency);
            if (!agencyStillAvailable) {
                this.selectedAgency = '';
            }
        }

        this.updateFilteredServices();

        if (this.selectedService) {
            const normalizedService = this.selectedService.toLowerCase();
            const serviceStillAvailable = this.filteredServices.some(service => service.toLowerCase() === normalizedService);
            if (!serviceStillAvailable) {
                this.selectedService = '';
            }
        }

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

    clearCountryFilter(): void {
        this.selectedCountry = '';
        this.updateFilteredAgencies();
        this.updateFilteredServices();
        this.filterReport();
    }

    clearTraitementFilter(): void {
        this.selectedTraitement = '';
        this.filterReport();
    }

    filterByInProgress(): void {
        if (this.activeCardFilter === 'inProgress') {
            // Si déjà actif, désactiver le filtre
            this.activeCardFilter = null;
        } else {
            this.activeCardFilter = 'inProgress';
        }
        this.filterReport();
    }

    filterByTreated(): void {
        if (this.activeCardFilter === 'treated') {
            // Si déjà actif, désactiver le filtre
            this.activeCardFilter = null;
        } else {
            this.activeCardFilter = 'treated';
        }
        this.filterReport();
    }

    filterByTicketsToCreate(): void {
        if (this.activeCardFilter === 'ticketsToCreate') {
            // Si déjà actif, désactiver le filtre
            this.activeCardFilter = null;
        } else {
            this.activeCardFilter = 'ticketsToCreate';
        }
        this.filterReport();
    }

    filterReport() {
        this.filteredReportData = this.reportData.filter(item => {
            // Filtrage par pays autorisés (cloisonnement)
            const countryMatch = this.shouldIncludeCountry(item.country || '');
            if (!countryMatch) {
                return false;
            }

            const agencyMatch = !this.selectedAgency || item.agency.toLowerCase().includes(this.selectedAgency.toLowerCase());
            const serviceMatch = !this.selectedService || item.service.toLowerCase().includes(this.selectedService.toLowerCase());
            const countryFilterMatch = !this.selectedCountry || item.country?.toLowerCase().includes(this.selectedCountry.toLowerCase());
            const statusMatch = !this.selectedStatus || item.status === this.selectedStatus;
            const traitementMatch = !this.selectedTraitement || item.traitement === this.selectedTraitement;
            
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
            
            const baseMatch = agencyMatch && serviceMatch && countryFilterMatch && dateMatch && statusMatch && traitementMatch;
            
            // Appliquer le filtre de card actif si défini
            if (this.activeCardFilter === 'inProgress') {
                // Filtrer les items avec des écarts en cours (partnerOnly > 0)
                return baseMatch && (item.partnerOnly || 0) > 0;
            } else if (this.activeCardFilter === 'treated') {
                // Filtrer les items avec des écarts traités : statut OK et au moins un écart BO ou Partenaire dans le commentaire
                const status = (item.status || '').trim().toUpperCase();
                const isOk = status === 'OK';
                
                if (!isOk) {
                    return false;
                }
                
                // Extraire les écarts depuis le commentaire
                const { boCount, partnerCount } = this.extractDiscrepanciesFromComment(item.comment);
                const hasEcarts = boCount > 0 || partnerCount > 0;
                
                return baseMatch && hasEcarts;
            } else if (this.activeCardFilter === 'ticketsToCreate') {
                // Filtrer selon la même logique que ticketsACreer
                const idGlpiStr = (item.glpiId || '').trim();
                const idGlpiLower = idGlpiStr.toLowerCase();
                const status = (item.status || '').toUpperCase();
                
                // Exclure les tickets qui contiennent "modifier"
                if (idGlpiLower.includes('modifier')) {
                    return false;
                }
                
                // Compter les tickets qui nécessitent une création
                const hasNoIdGlpi = idGlpiStr === '';
                const containsCreer = idGlpiLower.includes('créer');
                const isNok = status === 'NOK';
                const isEnAttenteOuEnCours = status.includes('EN COURS') || status.includes('EN ATTENTE');
                
                const needsTicket = (hasNoIdGlpi && isNok) || (containsCreer && isEnAttenteOuEnCours);
                return baseMatch && needsTicket;
            }
            
            return baseMatch;
        });
        
        // Recalculer le traitement pour chaque ligne filtrée selon les écarts réels
        this.filteredReportData = this.filteredReportData.map(item => {
            const boOnly = Number(item.boOnly) || 0;
            const partnerOnly = Number(item.partnerOnly) || 0;
            const mismatches = Number(item.mismatches) || 0;
            const totalEcarts = boOnly + partnerOnly + mismatches;
            
            // Recalculer le traitement selon les écarts réels (sauf si "Terminé")
            const traitementAttendu = totalEcarts > 0 ? 'Niveau Support' : 'Niveau Group';
            const traitementFinal = (item.traitement === 'Terminé') 
                ? item.traitement 
                : traitementAttendu;
            
            return {
                ...item,
                traitement: traitementFinal
            };
        });
        
        // Trier par date décroissante (les plus récentes en premier)
        this.filteredReportData.sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return dateB - dateA; // Décroissant (plus récent en premier)
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

        // ✅ OK si 100% de correspondances (aucun écart)
        if (boOnly === 0 && partnerOnly === 0 && mismatches === 0 && matches === totalTransactions) {
            return 'OK';
        }

        // ✅ Par défaut, toute ligne avec écart doit être "EN COURS"
        if (boOnly > 0 || partnerOnly > 0 || mismatches > 0) {
            return 'EN COURS.....';
        }

        // En cours si les données détaillées ne sont pas encore disponibles
        if (!this.response) return 'EN COURS.....';

        // Incomplet si uniquement un côté est présent sans correspondances
        if (matches === 0 && ((boOnly > 0 && partnerOnly === 0) || (partnerOnly > 0 && boOnly === 0))) return 'REPORTING INCOMPLET';

        // Sinon statut par défaut "EN COURS"
        return this.DEFAULT_STATUS;
    }

    private buildCommentForCounts(matches: number, boOnly: number, partnerOnly: number, mismatches: number, totalTransactions?: number): string {
        // Calculer le total des transactions si non fourni
        const total = totalTransactions !== undefined ? totalTransactions : (matches + boOnly + partnerOnly + mismatches);
        
        // Si pas d'écarts OU si toutes les transactions sont des correspondances, retourner le commentaire par défaut
        if ((boOnly === 0 && partnerOnly === 0 && mismatches === 0) || (total > 0 && matches === total)) {
            return "PAS D'ECARTS CONSTATES";
        }

        // Afficher les valeurs réelles dans le commentaire (sans soustraction)
        const parts: string[] = [];
        parts.push(`${matches} correspondances`);
        if (boOnly > 0) parts.push(`${boOnly} écart(s) BO`);
        if (partnerOnly > 0) parts.push(`${partnerOnly} écart(s) Partenaire`);
        if (mismatches > 0) parts.push(`${mismatches} incohérence(s)`);
        return parts.join(' • ');
    }

    private shouldAutoUpdateComment(item: ReconciliationReportData | null | undefined, options?: { force?: boolean }): boolean {
        return !!options?.force;
    }

    private updateCommentFromCounts(
        item: ReconciliationReportData,
        matches: number,
        boOnly: number,
        partnerOnly: number,
        mismatches: number,
        options?: { force?: boolean }
    ): void {
        if (!item) {
            return;
        }
        
        // Si la ligne a un id (sauvegardée en base) et un commentaire non vide, préserver le commentaire
        // Le commentaire sété en base doit rester inchangé même si la ligne est modifiée
        // Sauf si force est activé (pour les nouvelles lignes ou les lignes sans commentaire)
        if (item.id && item.comment && item.comment.trim() !== '' && !options?.force) {
            console.log('🔒 updateCommentFromCounts: Commentaire préservé (sauvegardé en base) pour item', item.id, item.agency, item.service);
            return;
        }
        
        // Si la ligne est "sété" (sauvegardée avec un ID), préserver TOUJOURS le commentaire
        // SAUF si force est activé explicitement
        if (this.isRowSete(item) && !options?.force) {
            console.log('🔒 updateCommentFromCounts: Commentaire préservé pour ligne sété', item.id);
            return;
        }
        
        // Vérifier s'il n'y a vraiment pas d'écarts
        const hasNoEcarts = boOnly === 0 && partnerOnly === 0 && mismatches === 0;
        const totalTransactions = this.normalizeNumericValue(item.totalTransactions);
        const allMatches = totalTransactions > 0 && matches === totalTransactions;
        
        if (!this.shouldAutoUpdateComment(item, options)) {
            return;
        }
        // Passer totalTransactions pour vérifier la cohérence
        item.comment = this.buildCommentForCounts(matches, boOnly, partnerOnly, mismatches, item.totalTransactions);
    }

    /**
     * Synchronise le commentaire avec les valeurs réelles de l'item.
     * Cette méthode est appelée après le chargement des données pour s'assurer
     * que le commentaire correspond toujours aux valeurs affichées.
     * Pour les lignes "sété", préserve le commentaire SAUF s'il n'y a vraiment pas d'écarts
     * (pour corriger les commentaires incorrects).
     * 
     * @param item L'item à synchroniser
     * @param preserveComment Si true, préserve toujours le commentaire (utilisé lors d'un changement de statut)
     */
    private syncCommentWithValues(item: ReconciliationReportData, preserveComment: boolean = false): void {
        if (!item) {
            return;
        }
        
        // Si on doit préserver le commentaire (lors d'un changement de statut), ne rien faire
        // Ne JAMAIS modifier le commentaire si preserveComment est true
        if (preserveComment) {
            console.log('🔒 syncCommentWithValues: Commentaire préservé pour item', item.id, item.agency, item.service);
            return;
        }
        
        // Si la ligne a un id (sauvegardée en base) et un commentaire non vide, préserver le commentaire
        // Le commentaire sété en base doit rester inchangé même si la ligne est modifiée
        if (item.id && item.comment && item.comment.trim() !== '') {
            console.log('🔒 syncCommentWithValues: Commentaire préservé (sauvegardé en base) pour item', item.id, item.agency, item.service);
            return;
        }
        
        const matches = this.normalizeNumericValue(item.matches);
        const boOnly = this.normalizeNumericValue(item.boOnly);
        const partnerOnly = this.normalizeNumericValue(item.partnerOnly);
        const mismatches = this.normalizeNumericValue(item.mismatches);
        const totalTransactions = this.normalizeNumericValue(item.totalTransactions);
        
        // Assurer la cohérence: totalTransactions = matches + boOnly + partnerOnly + mismatches
        const calculatedTotal = matches + boOnly + partnerOnly + mismatches;
        if (totalTransactions !== calculatedTotal && calculatedTotal > 0) {
            // Mettre à jour totalTransactions pour assurer la cohérence
            item.totalTransactions = calculatedTotal;
        }
        
        // Si la ligne est "sété" (sauvegardée avec un ID), préserver TOUJOURS le commentaire
        if (this.isRowSete(item)) {
            console.log('🔒 syncCommentWithValues: Commentaire préservé pour ligne sété', item.id);
            return;
        }
        
        // Vérifier s'il n'y a vraiment pas d'écarts
        const hasNoEcarts = boOnly === 0 && partnerOnly === 0 && mismatches === 0;
        const allMatches = totalTransactions > 0 && matches === totalTransactions;
        
        // Recalculer le commentaire pour qu'il corresponde aux valeurs réelles
        item.comment = this.buildCommentForCounts(matches, boOnly, partnerOnly, mismatches, item.totalTransactions);
    }

    private normalizeStatus(status?: string | null): string {
        const value = (status ?? '').trim();
        return value === '' ? this.DEFAULT_STATUS : value;
    }

    private applyDefaultStatus(item: ReconciliationReportData): ReconciliationReportData {
        if (!item) {
            return item;
        }
        item.status = this.normalizeStatus(item.status);
        return item;
    }

    private enforceDefaultStatusForReportData(): void {
        this.reportData = this.reportData.map(item => this.applyDefaultStatus(item));
    }

    getDisplayStatus(status?: string | null): string {
        return this.normalizeStatus(status);
    }

    /**
     * Recalcule les données selon le statut sélectionné.
     * Si le statut passe à "OK", seules les correspondances sont alignées sur le total
     * tout en conservant les écarts visibles pour l'utilisateur.
     */
    private recalculateDataBasedOnStatus(item: ReconciliationReportData): ReconciliationReportData {
        const matches = this.normalizeNumericValue(item.matches);
        const boOnly = this.normalizeNumericValue(item.boOnly);
        const partnerOnly = this.normalizeNumericValue(item.partnerOnly);
        const mismatches = this.normalizeNumericValue(item.mismatches);
        const totalTransactions = this.normalizeNumericValue(item.totalTransactions);

        const recalculated = { 
            ...item,
            matches,
            boOnly,
            partnerOnly,
            mismatches
        };
        const previousComment = item.comment ?? '';

        const totalEcart = boOnly + partnerOnly + mismatches;
        const effectiveTotalTransactions = totalTransactions > 0 ? totalTransactions : matches + totalEcart;

        // Si la ligne est "sété", préserver le commentaire existant
        const isSete = this.isRowSete(item);
        
        // Si la ligne a un id (sauvegardée en base) et un commentaire non vide, TOUJOURS préserver le commentaire
        // Le commentaire sété en base doit rester inchangé même lors d'un changement de statut
        const hasSavedComment = item.id && previousComment && previousComment.trim() !== '';

        // Si le statut est "OK", aligner les correspondances sur le total et solder les écarts
        if (item.status === 'OK') {
            console.log('🔄 Recalcul pour statut OK:', {
                avant: {
                    matches: item.matches,
                    boOnly: item.boOnly,
                    partnerOnly: item.partnerOnly,
                    mismatches: item.mismatches,
                    totalTransactions: item.totalTransactions,
                    hasSavedComment: hasSavedComment
                }
            });

            // Les correspondances doivent refléter la totalité des transactions
            recalculated.matches = effectiveTotalTransactions;
            
            // Les écarts sont soldés (remis à zéro) puisque la ligne est finalisée
            recalculated.boOnly = 0;
            recalculated.partnerOnly = 0;
            recalculated.mismatches = 0;
            
            // Recalculer le nombre total de transactions et le taux de correspondance
            recalculated.totalTransactions = effectiveTotalTransactions;
            recalculated.matchRate = effectiveTotalTransactions > 0 ? 
                (recalculated.matches / effectiveTotalTransactions) * 100 : 0;
            
            // TOUJOURS préserver le commentaire sauvegardé en base, même lors d'un changement de statut vers OK
            if (hasSavedComment) {
                recalculated.comment = previousComment;
                console.log('🔒 recalculateDataBasedOnStatus: Commentaire préservé (sauvegardé en base) pour statut OK');
            } else {
                // Pour les nouvelles lignes sans commentaire sauvegardé, préserver quand même le commentaire existant
                recalculated.comment = previousComment;
            }
            
            console.log('🔄 Recalcul pour statut OK:', {
                apres: {
                    matches: recalculated.matches,
                    boOnly: recalculated.boOnly,
                    partnerOnly: recalculated.partnerOnly,
                    mismatches: recalculated.mismatches,
                    totalTransactions: recalculated.totalTransactions,
                    matchRate: recalculated.matchRate,
                    comment: recalculated.comment,
                    isSete: isSete,
                    hasSavedComment: hasSavedComment
                }
            });
        } else {
            // Pour les autres statuts, conserver les valeurs saisies mais fiabiliser les totaux
            recalculated.totalTransactions = effectiveTotalTransactions;
            recalculated.matchRate = effectiveTotalTransactions > 0 ? 
                (recalculated.matches / effectiveTotalTransactions) * 100 : 0;
            
            // TOUJOURS préserver le commentaire sauvegardé en base
            if (hasSavedComment) {
                recalculated.comment = previousComment;
                console.log('🔒 recalculateDataBasedOnStatus: Commentaire préservé (sauvegardé en base) pour autre statut');
            } else {
                // Pour les nouvelles lignes sans commentaire sauvegardé, préserver quand même le commentaire existant
                recalculated.comment = previousComment;
            }
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
        // Afficher le total de la colonne "Écarts Partenaire" comme demandé
        return this.filteredReportData.reduce((sum, item) => sum + (item.partnerOnly || 0), 0);
    }

    /**
     * Extrait les écarts BO et Partenaire depuis le commentaire
     * Format attendu: "206 correspondances • 4 écart(s) BO • 5 écart(s) Partenaire"
     */
    private extractDiscrepanciesFromComment(comment?: string): { boCount: number; partnerCount: number } {
        if (!comment) {
            return { boCount: 0, partnerCount: 0 };
        }

        // Normaliser le texte pour gérer les accents
        const normalized = comment.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        
        // Extraire les écarts BO (format: "X écart(s) BO" ou "X écart(s) BO")
        const boMatch = normalized.match(/(\d+)\s*ecart\(s\)\s*bo/i);
        
        // Extraire les écarts Partenaire (format: "X écart(s) Partenaire" ou "X écart(s) Partenaire")
        const partnerMatch = normalized.match(/(\d+)\s*ecart\(s\)\s*partenaire/i);

        const boCount = boMatch ? parseInt(boMatch[1], 10) : 0;
        const partnerCount = partnerMatch ? parseInt(partnerMatch[1], 10) : 0;

        return { boCount, partnerCount };
    }

    get treatedDiscrepancies(): number {
        if (!this.filteredReportData) return 0;
        
        let total = 0;
        
        this.filteredReportData.forEach(item => {
            // Compter uniquement les lignes avec statut OK
            const status = (item.status || '').trim().toUpperCase();
            const isOk = status === 'OK';
            
            if (isOk) {
                // Extraire les écarts depuis le commentaire
                const { boCount, partnerCount } = this.extractDiscrepanciesFromComment(item.comment);
                total += boCount + partnerCount;
            }
        });
        
        return total;
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
                // 1. ID TICKET vide ET statut NOK (problème nécessitant un ticket)
                // 2. ID TICKET contient "créer" ET statut en cours/attente
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

    async exportToExcel() {
        const rowsSource = this.filteredReportData.length > 0 ? this.filteredReportData : this.reportData;
        
        if (!rowsSource || rowsSource.length === 0) {
            this.popupService.showError('Erreur', 'Aucune donnée à exporter');
            return;
        }

        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Rapport de Réconciliation');

            // Définir les colonnes
            worksheet.columns = [
                { header: 'Date', key: 'date', width: 12 },
                { header: 'Agence', key: 'agency', width: 20 },
                { header: 'Service', key: 'service', width: 20 },
                { header: 'Pays', key: 'country', width: 15 },
                { header: 'Transactions', key: 'transactions', width: 15 },
                { header: 'Volume', key: 'volume', width: 15 },
                { header: 'Correspondances', key: 'matches', width: 15 },
                { header: 'Écarts BO', key: 'boOnly', width: 12 },
                { header: 'Écarts Partenaire', key: 'partnerOnly', width: 18 },
                { header: 'Incohérences', key: 'mismatches', width: 15 },
                { header: 'Taux de Correspondance', key: 'matchRate', width: 20 },
                { header: 'ID TICKET', key: 'glpiId', width: 15 },
                { header: 'Statut', key: 'status', width: 15 },
                { header: 'Commentaire', key: 'comment', width: 30 },
                { header: 'Traitement', key: 'traitement', width: 18 }
            ];

            // Style de l'en-tête avec fond bleu foncé et texte blanc
            worksheet.getRow(1).eachCell(cell => {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF2C3E50' } // Bleu foncé
                };
                cell.font = { 
                    color: { argb: 'FFFFFFFF' }, 
                    bold: true,
                    size: 11
                };
                cell.alignment = { 
                    horizontal: 'center', 
                    vertical: 'middle',
                    wrapText: true
                };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FF1A252F' } },
                    bottom: { style: 'thin', color: { argb: 'FF1A252F' } },
                    left: { style: 'thin', color: { argb: 'FF1A252F' } },
                    right: { style: 'thin', color: { argb: 'FF1A252F' } }
                };
            });

            // Hauteur de l'en-tête
            worksheet.getRow(1).height = 30;

            // Ajouter les données avec couleurs conditionnelles
            rowsSource.forEach((item, idx) => {
                const matchRate = item.matchRate || 0;
                const row = worksheet.addRow({
                    date: this.formatDate(item.date),
                    agency: item.agency,
                    service: item.service,
                    country: item.country,
                    transactions: item.totalTransactions,
                    volume: item.totalVolume,
                    matches: item.matches,
                    boOnly: item.boOnly,
                    partnerOnly: item.partnerOnly,
                    mismatches: item.mismatches,
                    matchRate: `${matchRate.toFixed(2)}%`,
                    glpiId: item.glpiId || '',
                    status: item.status,
                    comment: item.comment,
                    traitement: item.traitement || ''
                });

                // Couleur de fond pour toute la ligne selon le taux de correspondance
                let rowFillColor = 'FFFFFFFF'; // Blanc par défaut
                let rowTextColor = 'FF000000'; // Noir par défaut

                if (matchRate >= 95) {
                    // 🟢 Vert : Taux excellents (≥95%)
                    rowFillColor = 'FFD4EDDA'; // Vert clair
                    rowTextColor = 'FF155724'; // Vert foncé
                } else if (matchRate >= 80) {
                    // 🔵 Bleu : Taux bons (80-94%)
                    rowFillColor = 'FFD1ECF1'; // Bleu clair
                    rowTextColor = 'FF0C5460'; // Bleu foncé
                } else if (matchRate >= 60) {
                    // 🟡 Jaune : Taux moyens (60-79%)
                    rowFillColor = 'FFFFF3CD'; // Jaune clair
                    rowTextColor = 'FF856404'; // Jaune foncé
                } else {
                    // 🔴 Rouge : Taux faibles (<60%)
                    rowFillColor = 'FFF8D7DA'; // Rouge clair
                    rowTextColor = 'FF721C24'; // Rouge foncé
                }

                // Appliquer la couleur de fond à toute la ligne
                row.eachCell(cell => {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: rowFillColor }
                    };
                    cell.font = { 
                        color: { argb: rowTextColor },
                        size: 10
                    };
                    cell.alignment = { 
                        horizontal: 'left', 
                        vertical: 'middle',
                        wrapText: true
                    };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFE9ECEF' } },
                        bottom: { style: 'thin', color: { argb: 'FFE9ECEF' } },
                        left: { style: 'thin', color: { argb: 'FFE9ECEF' } },
                        right: { style: 'thin', color: { argb: 'FFE9ECEF' } }
                    };
                });

                // Styles spécifiques pour certaines colonnes
                // Correspondances - toujours vert
                const matchesCell = row.getCell('matches');
                matchesCell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFD4EDDA' }
                };
                matchesCell.font = { 
                    color: { argb: 'FF155724' },
                    bold: true,
                    size: 10
                };

                // Écarts BO - Jaune
                const boOnlyCell = row.getCell('boOnly');
                if (item.boOnly > 0) {
                    boOnlyCell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFFFF3CD' }
                    };
                    boOnlyCell.font = { 
                        color: { argb: 'FF856404' },
                        bold: true,
                        size: 10
                    };
                }

                // Écarts Partenaire - Orange
                const partnerOnlyCell = row.getCell('partnerOnly');
                if (item.partnerOnly > 0) {
                    partnerOnlyCell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFFFE0B2' } // Orange clair
                    };
                    partnerOnlyCell.font = { 
                        color: { argb: 'FFE65100' }, // Orange foncé
                        bold: true,
                        size: 10
                    };
                }

                // Incohérences - Rouge
                const mismatchesCell = row.getCell('mismatches');
                if (item.mismatches > 0) {
                    mismatchesCell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFF8D7DA' }
                    };
                    mismatchesCell.font = { 
                        color: { argb: 'FF721C24' },
                        bold: true,
                        size: 10
                    };
                }

                // Taux de Correspondance - Style selon la valeur
                const matchRateCell = row.getCell('matchRate');
                matchRateCell.font = { 
                    color: { argb: rowTextColor },
                    bold: true,
                    size: 11
                };
                matchRateCell.alignment = { 
                    horizontal: 'center', 
                    vertical: 'middle'
                };

                // Alignement numérique pour Transactions, Volume
                row.getCell('transactions').alignment = { horizontal: 'right', vertical: 'middle' };
                row.getCell('volume').alignment = { horizontal: 'right', vertical: 'middle' };
                row.getCell('matches').alignment = { horizontal: 'right', vertical: 'middle' };
                row.getCell('boOnly').alignment = { horizontal: 'right', vertical: 'middle' };
                row.getCell('partnerOnly').alignment = { horizontal: 'right', vertical: 'middle' };
                row.getCell('mismatches').alignment = { horizontal: 'right', vertical: 'middle' };
            });

            // Générer le fichier Excel
            const buffer = await workbook.xlsx.writeBuffer();
            const fileName = `rapport_reconciliation_${new Date().toISOString().slice(0,10)}.xlsx`;
            saveAs(new Blob([buffer]), fileName);
            
            this.popupService.showSuccess('Export réussi', `Le fichier ${fileName} a été téléchargé avec succès.`);
        } catch (error) {
            console.error('❌ Erreur lors de l\'export Excel:', error);
            this.popupService.showError('Erreur d\'export', 'Une erreur est survenue lors de l\'export Excel.');
        }
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

    getBometierTicketUrl(idGlpi: string): string {
        return `https://bometier.gutouch.net/details-ticket/${idGlpi}`;
    }

    // Afficher un popup pour choisir entre GLPI et BOMETIER
    async showTicketOptionsPopup(ticketId: string): Promise<void> {
        const message = `Choisissez la plateforme pour ouvrir le ticket ${ticketId}:`;
        const title = 'Ouvrir le ticket';
        
        // Créer un popup personnalisé avec deux boutons
        const overlay = document.createElement('div');
        overlay.className = 'modern-popup-overlay';
        overlay.innerHTML = `
            <div class="modern-popup popup-type-info">
                <div class="popup-header">
                    <div class="popup-title-wrapper">
                        <span class="popup-icon">🎫</span>
                        <h3 class="popup-title">${title}</h3>
                    </div>
                    <button class="popup-close" aria-label="Fermer">×</button>
                </div>
                <div class="popup-content">
                    <p class="popup-message">${message}</p>
                </div>
                <div class="popup-actions popup-actions-two-buttons">
                    <button class="popup-btn popup-btn-glpi">
                        🔵 GLPI
                    </button>
                    <button class="popup-btn popup-btn-bometier">
                        🟢 BOMETIER
                    </button>
                </div>
            </div>
        `;

        // Ajouter les styles si nécessaire
        const style = document.createElement('style');
        style.textContent = `
            .modern-popup-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(4px);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
                animation: fadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .modern-popup {
                background: white;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.05);
                max-width: 450px;
                width: 90%;
                animation: slideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                overflow: hidden;
                border-top: 4px solid #007bff;
            }
            .popup-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 24px 24px 16px 24px;
                background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
            }
            .popup-title-wrapper {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .popup-icon {
                font-size: 24px;
                line-height: 1;
            }
            .popup-title {
                margin: 0;
                font-size: 20px;
                font-weight: 700;
                color: #212529;
            }
            .popup-close {
                background: rgba(0, 0, 0, 0.05);
                border: none;
                font-size: 22px;
                cursor: pointer;
                color: #6c757d;
                padding: 0;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: all 0.2s;
            }
            .popup-close:hover {
                background: rgba(0, 0, 0, 0.1);
                color: #212529;
                transform: rotate(90deg);
            }
            .popup-content {
                padding: 20px 24px;
            }
            .popup-message {
                margin: 0;
                color: #495057;
                line-height: 1.6;
                font-size: 15px;
            }
            .popup-actions-two-buttons {
                display: flex;
                justify-content: center;
                gap: 12px;
                padding: 16px 24px 24px 24px;
                background: #f8f9fa;
                border-top: 1px solid #e9ecef;
            }
            .popup-btn {
                padding: 12px 24px;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                font-size: 14px;
                transition: all 0.2s;
                min-width: 140px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            .popup-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
            }
            .popup-btn-glpi {
                background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
                color: white;
            }
            .popup-btn-glpi:hover {
                background: linear-gradient(135deg, #0056b3 0%, #004085 100%);
            }
            .popup-btn-bometier {
                background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%);
                color: white;
            }
            .popup-btn-bometier:hover {
                background: linear-gradient(135deg, #1e7e34 0%, #155724 100%);
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideIn {
                from { 
                    opacity: 0;
                    transform: translateY(-30px) scale(0.9);
                }
                to { 
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';

        const cleanup = () => {
            document.body.style.overflow = 'auto';
            if (style.parentNode) {
                style.parentNode.removeChild(style);
            }
            overlay.remove();
        };

        // Gérer la fermeture
        const closeBtn = overlay.querySelector('.popup-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', cleanup);
        }

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                cleanup();
            }
        });

        // Gérer Escape
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                cleanup();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);

        // Gérer les clics sur les boutons
        const glpiBtn = overlay.querySelector('.popup-btn-glpi');
        const bometierBtn = overlay.querySelector('.popup-btn-bometier');

        if (glpiBtn) {
            glpiBtn.addEventListener('click', () => {
                cleanup();
                document.removeEventListener('keydown', handleEscape);
                this.openGlpiTicket(ticketId);
            });
        }

        if (bometierBtn) {
            bometierBtn.addEventListener('click', () => {
                cleanup();
                document.removeEventListener('keydown', handleEscape);
                this.openBometierTicket(ticketId);
            });
        }
    }

    // Ouvrir le ticket dans GLPI
    openGlpiTicket(ticketId: string): void {
        const url = this.getGlpiTicketUrl(ticketId);
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    // Ouvrir le ticket dans BOMETIER
    openBometierTicket(ticketId: string): void {
        const url = this.getBometierTicketUrl(ticketId);
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    onGlpiIdInputChange(item: ReconciliationReportData, value: string) {
        if (!item || !item.id || this.editingRow === item) {
            return;
        }

        const trimmed = (value || '').trim();
        if (!trimmed) {
            this.clearGlpiAutoSaveTimer(item);
            return;
        }

        this.clearGlpiAutoSaveTimer(item);
        const timer = setTimeout(() => this.triggerGlpiAutoSave(item), 800);
        this.glpiAutoSaveTimers.set(item, timer);
    }

    onGlpiIdInputBlur(item: ReconciliationReportData) {
        if (!item) return;
        if (!item.id) {
            if ((item.glpiId || '').trim()) {
                this.popupService.showWarning('Ligne non sauvegardée', 'Veuillez sauvegarder la ligne avant de renseigner un ID TICKET.');
            }
            return;
        }
        this.triggerGlpiAutoSave(item, true);
    }

    onGlpiIdInputEnter(item: ReconciliationReportData) {
        if (!item) return;
        if (!item.id) {
            if ((item.glpiId || '').trim()) {
                this.popupService.showWarning('Ligne non sauvegardée', 'Veuillez sauvegarder la ligne avant de renseigner un ID TICKET.');
            }
            return;
        }
        this.triggerGlpiAutoSave(item, true);
    }

    private triggerGlpiAutoSave(item: ReconciliationReportData, force = false) {
        this.clearGlpiAutoSaveTimer(item);

        if (this.editingRow === item) {
            return;
        }

        const glpiValue = (item.glpiId || '').trim();
        if (!glpiValue) {
            return;
        }

        const lastSaved = this.lastSavedGlpiIds.get(item) || '';
        if (!force && glpiValue === lastSaved) {
            return;
        }

        this.saveGlpiIdAutomatically(item, glpiValue);
    }

    private saveGlpiIdAutomatically(item: ReconciliationReportData, glpiId: string) {
        if (!item.id) {
            return;
        }

        const payload = this.buildUpdatePayload(item, { glpiId });
        this.http.put<any>(`/api/result8rec/${item.id}`, payload)
            .subscribe({
                next: () => {
                    item.glpiId = glpiId;
                    this.lastSavedGlpiIds.set(item, glpiId);
                    this.popupService.showSuccess('ID TICKET enregistré automatiquement');
                },
                error: (err: HttpErrorResponse) => {
                    console.error('❌ Erreur lors de la sauvegarde automatique de l\'ID TICKET', err);
                    this.popupService.showError('Erreur', 'Impossible d\'enregistrer automatiquement l\'ID TICKET.');
                }
            });
    }

    private clearGlpiAutoSaveTimer(item: ReconciliationReportData) {
        const timer = this.glpiAutoSaveTimers.get(item);
        if (timer) {
            clearTimeout(timer);
            this.glpiAutoSaveTimers.delete(item);
        }
    }

    private syncLastSavedGlpiValues(items: ReconciliationReportData[]) {
        if (!items || !items.length) {
            return;
        }
        items.forEach(row => {
            this.lastSavedGlpiIds.set(row, (row.glpiId || '').trim());
        });
    }

    private buildUpdatePayload(item: ReconciliationReportData, overrides: Partial<ReconciliationReportData> = {}) {
        const data = { ...item, ...overrides };
        const traitementValue = typeof data.traitement === 'string' ? data.traitement.trim() : '';
        const traitement = traitementValue !== '' ? data.traitement : this.determineDefaultTraitement(data);

        return {
            date: data.date,
            agency: data.agency,
            service: data.service,
            country: data.country,
            totalTransactions: data.totalTransactions,
            totalVolume: data.totalVolume,
            matches: data.matches,
            boOnly: data.boOnly,
            partnerOnly: data.partnerOnly,
            mismatches: data.mismatches,
            matchRate: data.matchRate,
            status: data.status,
            comment: data.comment,
            traitement,
            glpiId: data.glpiId || ''
        };
    }

    private loadSavedReportFromDatabase(preserveComments: Map<number, string> = new Map()) {
        // Ne pas charger depuis la base si on a déjà des données en cours disponibles
        if (this.currentSource === 'live') {
            console.log('ℹ️ Données en cours disponibles, chargement depuis la base ignoré');
            return;
        }
        
        this.loadedFromDb = true;
        
        // Headers pour désactiver le cache du navigateur
        const headers = new HttpHeaders({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        
        // Paramètre de cache-busting pour forcer le rechargement
        const cacheBuster = new Date().getTime();
        const url = `/api/result8rec?_t=${cacheBuster}`;
        
        console.log('🔄 Chargement des données depuis la base avec cache-busting:', cacheBuster);
        
        this.http.get<any[]>(url, { headers })
        .subscribe({
            next: (rows: any[]) => {
                if (!Array.isArray(rows) || rows.length === 0) {
                    return;
                }
                this.reportData = rows.map(r => {
                    // Calculer les écarts
                    const boOnly = Number(r.boOnly) || 0;
                    const partnerOnly = Number(r.partnerOnly) || 0;
                    const mismatches = Number(r.mismatches) || 0;
                    const totalEcarts = boOnly + partnerOnly + mismatches;
                    
                    // Recalculer le traitement selon les écarts réels si non défini ou incorrect
                    let traitement = r.traitement;
                    if (!traitement || traitement.trim() === '') {
                        traitement = totalEcarts > 0 ? 'Niveau Support' : 'Niveau Group';
                    } else {
                        // Vérifier si le traitement actuel correspond aux écarts réels
                        const traitementAttendu = totalEcarts > 0 ? 'Niveau Support' : 'Niveau Group';
                        // Si le traitement ne correspond pas aux écarts, le corriger
                        if (traitement !== 'Terminé' && traitement !== traitementAttendu) {
                            traitement = traitementAttendu;
                        }
                    }
                    
                    // Initialiser le commentaire
                    let comment = r.comment || '';
                    
                    // Si un commentaire préservé existe pour cet ID, l'utiliser en priorité et ne pas le modifier
                    if (preserveComments.has(r.id)) {
                        comment = preserveComments.get(r.id)!;
                        // Ne pas modifier le commentaire si il est préservé
                    } else {
                        // Vérifier si la ligne est "sété" (statut OK ou traitement Terminé)
                        const isSete = (r.status === 'OK' || (r.traitement && r.traitement.trim() === 'Terminé'));
                        
                        // Si la ligne est "sété", préserver le commentaire existant
                        if (isSete && comment && comment.trim() !== '') {
                            // Préserver le commentaire existant
                        } else if (r.status === 'OK') {
                            // Si le statut est "OK" mais pas encore "sété", mettre à jour le commentaire si tous les écarts sont à 0
                            if (boOnly === 0 && partnerOnly === 0 && mismatches === 0) {
                                const totalTransactions = r.totalTransactions || r.recordCount || 0;
                                comment = this.buildCommentForCounts(
                                    r.matches || 0,
                                    boOnly,
                                    partnerOnly,
                                    mismatches,
                                    totalTransactions
                                );
                            }
                            // Sinon, préserver le commentaire existant
                        } else {
                            // Recalculer le commentaire pour qu'il corresponde aux valeurs réelles
                            const totalTransactions = r.totalTransactions || r.recordCount || 0;
                            if (!comment || comment.trim() === '') {
                                // Si le commentaire est vide, le générer
                                if (totalEcarts === 0) {
                                    comment = "PAS D'ECARTS CONSTATES";
                                } else {
                                    comment = this.buildCommentForCounts(
                                        r.matches || 0,
                                        boOnly,
                                        partnerOnly,
                                        mismatches,
                                        totalTransactions
                                    );
                                }
                            } else {
                                // Si le commentaire existe, le recalculer pour qu'il corresponde aux valeurs
                                comment = this.buildCommentForCounts(
                                    r.matches || 0,
                                    boOnly,
                                    partnerOnly,
                                    mismatches,
                                    totalTransactions
                                );
                            }
                        }
                    }
                    
                    return {
                        id: r.id,
                        date: r.date,
                        agency: r.agency,
                        service: r.service,
                        country: r.country,
                        glpiId: r.glpiId || r.glpi_id || '',
                        totalTransactions: r.totalTransactions || r.recordCount || 0,
                        totalVolume: r.totalVolume || 0,
                        matches: r.matches || 0,
                        boOnly: boOnly,
                        partnerOnly: partnerOnly,
                        mismatches: mismatches,
                        matchRate: r.matchRate || 0,
                        status: r.status || '',
                        comment: comment,
                        traitement: traitement,
                        username: r.username || ''
                    };
                });
                // Détecter si on a plusieurs agences et des écarts partenaires à regrouper
                // Exclure les lignes avec agence vide (qui sont déjà des lignes de service)
                const uniqueAgenciesInDb = new Set(
                    this.reportData
                        .filter(item => item.agency && item.agency.trim() !== '')
                        .map(item => item.agency)
                );
                const hasMultipleAgenciesInDb = uniqueAgenciesInDb.size > 1;
                
                // Calculer le total des écarts partenaires dans les données de la base
                // Exclure les lignes avec agence vide (qui sont déjà des lignes de service créées précédemment)
                const totalPartnerOnlyInDb = this.reportData
                    .filter(item => item.agency && item.agency.trim() !== '')
                    .reduce((sum, item) => sum + (item.partnerOnly || 0), 0);
                
                console.log('📊 Détection multi-agences dans DB:', {
                    uniqueAgencies: Array.from(uniqueAgenciesInDb),
                    hasMultipleAgencies: hasMultipleAgenciesInDb,
                    totalPartnerOnlyInDb: totalPartnerOnlyInDb
                });
                
                // Vérifier s'il existe déjà une ligne avec agence vide (ligne de service créée précédemment)
                const existingServiceRow = this.reportData.find(item => 
                    (!item.agency || item.agency.trim() === '') && 
                    item.service && 
                    item.service.trim() !== '' &&
                    (item.partnerOnly || 0) > 0
                );
                
                // IMPORTANT: Ne pas modifier les données déjà sauvegardées en base
                // Les données chargées depuis la base doivent être respectées telles quelles
                // La logique de regroupement ne s'applique que lors de la génération depuis le résumé
                // Si une ligne de service existe déjà, c'est qu'elle a été créée lors d'une génération précédente
                // Si des lignes d'agence ont des écarts partenaires sauvegardés, c'est qu'ils leur ont été attribués spécifiquement
                
                // Ne créer une ligne supplémentaire QUE si :
                // 1. On a plusieurs agences
                // 2. Il y a des écarts partenaires
                // 3. Il n'existe PAS déjà de ligne de service
                // 4. ET qu'aucune ligne d'agence n'a d'écarts partenaires sauvegardés (sinon ils ont été attribués spécifiquement)
                const hasAgencyRowsWithPartnerGaps = this.reportData.some(item => 
                    item.agency && 
                    item.agency.trim() !== '' && 
                    (item.partnerOnly || 0) > 0
                );
                
                if (hasMultipleAgenciesInDb && totalPartnerOnlyInDb > 0 && !existingServiceRow && !hasAgencyRowsWithPartnerGaps) {
                    // Trouver la première ligne avec un service valide pour créer la ligne supplémentaire
                    const firstItemWithService = this.reportData.find(item => item.service && item.service.trim() !== '');
                    
                    if (firstItemWithService) {
                        // Créer la ligne supplémentaire pour le service
                        const servicePartnerOnlyRow: ReconciliationReportData = {
                            date: firstItemWithService.date,
                            agency: '', // Agence vide
                            service: firstItemWithService.service,
                            country: firstItemWithService.country,
                            totalTransactions: totalPartnerOnlyInDb,
                            totalVolume: 0, // Volume vide
                            matches: 0, // Correspondances vides
                            boOnly: 0, // Écart BO vide
                            partnerOnly: totalPartnerOnlyInDb, // Écart partenaire attribué au service
                            mismatches: 0,
                            matchRate: 0,
                            status: this.computeStatusFromCounts(0, 0, totalPartnerOnlyInDb, 0, totalPartnerOnlyInDb),
                            comment: '',
                            traitement: totalPartnerOnlyInDb > 0 ? 'Niveau Support' : 'Niveau Group'
                        };
                        this.updateCommentFromCounts(
                            servicePartnerOnlyRow,
                            0,
                            0,
                            totalPartnerOnlyInDb,
                            0,
                            { force: true }
                        );
                        
                        // Retirer les écarts partenaires de toutes les lignes d'agence
                        this.reportData.forEach(item => {
                            if (item.agency && item.agency.trim() !== '') {
                                item.partnerOnly = 0;
                                // Recalculer le commentaire et le statut sans les écarts partenaires
                                const matches = item.matches || 0;
                                const boOnly = item.boOnly || 0;
                                const mismatches = item.mismatches || 0;
                                const totalTransactions = matches + boOnly + mismatches;
                                item.totalTransactions = totalTransactions;
                                item.matchRate = totalTransactions > 0 ? (matches / totalTransactions) * 100 : 0;
                                item.status = this.computeStatusFromCounts(matches, boOnly, 0, mismatches, totalTransactions);
                                // Ne forcer la mise à jour du commentaire que pour les lignes NON sauvegardées
                                if (!item.id) {
                                    this.updateCommentFromCounts(item, matches, boOnly, 0, mismatches, { force: true });
                                }
                            }
                        });
                        
                        // Ajouter la ligne supplémentaire
                        this.reportData.push(servicePartnerOnlyRow);
                        console.log('📊 Ligne supplémentaire créée pour écarts partenaires (multi-agences DB):', servicePartnerOnlyRow);
                    }
                } else {
                    if (existingServiceRow) {
                        console.log('📊 Ligne de service existante trouvée, pas de création de nouvelle ligne:', existingServiceRow);
                    }
                    if (hasAgencyRowsWithPartnerGaps) {
                        console.log('📊 Des lignes d\'agence ont des écarts partenaires sauvegardés, préservation des données:', hasAgencyRowsWithPartnerGaps);
                    }
                }
                
                this.enforceDefaultStatusForReportData();

                // Appliquer la logique de recalcul sur les données chargées depuis la base
                this.reportData.forEach(item => {
                    // Si un commentaire préservé existe, ne pas le modifier
                    const hasPreservedComment = preserveComments.has(item.id!);
                    const preservedComment = hasPreservedComment ? preserveComments.get(item.id!)! : null;
                    
                    if (hasPreservedComment && preservedComment) {
                        console.log('🔒 loadSavedReportFromDatabase: Commentaire préservé pour item', item.id, item.agency, item.service, 'commentaire:', preservedComment);
                        // Sauvegarder le commentaire préservé AVANT tout recalcul
                        item.comment = preservedComment;
                    }
                    
                    // Recalculer le taux sans modifier le commentaire si préservé
                    this.recalculateMatchRate(item, hasPreservedComment);
                    
                    // Synchroniser le commentaire avec les valeurs réelles seulement si pas de commentaire préservé
                    // Passer preserveComment=true pour les lignes avec commentaire préservé
                    this.syncCommentWithValues(item, hasPreservedComment);
                    
                    // Si un commentaire préservé existe, le restaurer après syncCommentWithValues (sécurité supplémentaire)
                    if (hasPreservedComment && preservedComment) {
                        const commentBeforeRestore = item.comment;
                        item.comment = preservedComment;
                        if (commentBeforeRestore !== preservedComment) {
                            console.log('⚠️ loadSavedReportFromDatabase: Commentaire modifié détecté et restauré pour item', item.id, 'avant:', commentBeforeRestore, 'après:', preservedComment);
                        }
                    }
                });
                
                this.syncLastSavedGlpiValues(this.reportData);
                
                // Trier par date décroissante (les plus récentes en premier)
                this.reportData.sort((a, b) => {
                    const dateA = new Date(a.date).getTime();
                    const dateB = new Date(b.date).getTime();
                    return dateB - dateA; // Décroissant (plus récent en premier)
                });
                
                // Restaurer les commentaires préservés APRÈS le tri (sécurité supplémentaire)
                preserveComments.forEach((preservedComment, itemId) => {
                    const item = this.reportData.find(r => r.id === itemId);
                    if (item) {
                        item.comment = preservedComment;
                        console.log('🔒 Commentaire restauré après tri pour item', itemId, item.agency, item.service, 'commentaire:', preservedComment);
                    }
                });
                
                this.extractUniqueValues();
                this.filterReport();
                
                // Restaurer les commentaires préservés APRÈS filterReport (sécurité supplémentaire)
                preserveComments.forEach((preservedComment, itemId) => {
                    const item = this.reportData.find(r => r.id === itemId);
                    const filteredItem = this.filteredReportData.find(r => r.id === itemId);
                    if (item) {
                        item.comment = preservedComment;
                    }
                    if (filteredItem) {
                        filteredItem.comment = preservedComment;
                    }
                    console.log('🔒 Commentaire restauré après filterReport pour item', itemId, 'commentaire:', preservedComment);
                });
                
                this.currentSource = 'db';
                this.updatePagination();
            },
            error: (err: HttpErrorResponse) => {
                // Si 404, le backend n'est probablement pas démarré - c'est normal en développement
                if (err.status === 404) {
                    console.log('ℹ️ Backend non disponible - les données sauvegardées ne seront pas chargées');
                }
                // Ignorer silencieusement en cas d'erreur réseau (backend non démarré)
                // Ne pas afficher d'erreur dans la console pour éviter le bruit
            }
        });
    }
    saveRow(item: ReconciliationReportData) {
        // Obsolète: remplacé par confirmAndSave
        this.confirmAndSave(item);
    }

    /**
     * Force un rechargement complet de la page sans cache (équivalent à Shift+F5)
     */
    private forceReload(): void {
        // Attendre un court délai pour laisser le message de succès s'afficher
        setTimeout(() => {
            // Forcer le rechargement sans cache en ajoutant un paramètre unique à l'URL
            const url = new URL(window.location.href);
            url.searchParams.set('_reload', Date.now().toString());
            window.location.href = url.toString();
        }, 500);
    }

    /**
     * Détermine le traitement par défaut selon la présence d'écarts
     * - Si écarts > 0 : "Niveau Support"
     * - Si pas d'écarts (tous à 0) : "Niveau Group"
     */
    private determineDefaultTraitement(item: ReconciliationReportData): string {
        // Convertir en nombres et s'assurer que les valeurs null/undefined sont traitées comme 0
        const boOnly = this.normalizeNumericValue(item.boOnly);
        const partnerOnly = this.normalizeNumericValue(item.partnerOnly);
        const mismatches = this.normalizeNumericValue(item.mismatches);
        
        const totalEcarts = boOnly + partnerOnly + mismatches;
        
        // Seulement "Niveau Support" si on a AU MOINS un écart
        return totalEcarts > 0 ? 'Niveau Support' : 'Niveau Group';
    }

    async confirmAndSave(item: ReconciliationReportData) {
        const message = `Confirmer l'enregistrement de la ligne\n\n${this.formatDate(item.date)} | ${item.agency} | ${item.service} | ${item.country}`;
        const confirmed = await this.popupService.showConfirm(message, 'Confirmation de sauvegarde');
        if (!confirmed) return;
        
        // Définir le traitement par défaut si non spécifié
        const traitement = item.traitement && item.traitement.trim() !== '' 
            ? item.traitement 
            : this.determineDefaultTraitement(item);
        
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
            comment: item.comment,
            traitement: traitement
        };
        this.http.post<any>('/api/result8rec', payload)
        .subscribe({
            next: (saved) => {
                item.id = saved.id;
                this.popupService.showSuccess('Ligne sauvegardée avec succès');
                // Forcer le rechargement sans cache après sauvegarde
                this.forceReload();
            },
            error: (err: HttpErrorResponse) => {
                if (err.status === 409) {
                    const existing = err.error;
                    this.popupService.showWarning(`Doublon détecté : déjà enregistré (id=${existing.id})`, 'Conflit de duplication');
                } else {
                    console.error('❌ Erreur de sauvegarde', err);
                    this.popupService.showError('Erreur de sauvegarde', 'Impossible de sauvegarder la ligne');
                }
            }
        });
    }

    async deleteRow(item: ReconciliationReportData) {
        if (!item.id) return;
        const confirmed = await this.popupService.showConfirm(
            `Supprimer l'enregistrement id=${item.id} ?`, 
            'Confirmation de suppression'
        );
        if (!confirmed) return;
        
        this.http.delete('/api/result8rec/' + item.id)
        .subscribe({
            next: () => {
                // Ne pas supprimer la ligne du rapport (qui est calculée) mais juste retirer l'id
                item.id = undefined;
                this.popupService.showSuccess('Enregistrement supprimé avec succès');
                // Actualiser la page/données après suppression
                if (this.currentSource === 'db') {
                    this.loadSavedReportFromDatabase();
                }
            },
            error: (err: HttpErrorResponse) => {
                console.error('❌ Erreur suppression', err);
                this.popupService.showError('Erreur de suppression', 'Impossible de supprimer l\'enregistrement');
            }
        });
    }

    async updateRow(item: ReconciliationReportData) {
        if (!item.id) return;
        const confirmed = await this.popupService.showConfirm(
            `Confirmer la mise à jour de l'enregistrement id=${item.id} ?`,
            'Confirmation de mise à jour'
        );
        if (!confirmed) return;

        // Sauvegarder le commentaire AVANT toute modification pour le préserver
        const savedComment = item.comment ?? '';

        // Recalculer les valeurs selon le statut
        // ⚠️ Pour le statut OK, les données (matches, écarts, commentaire) ont déjà été
        // recalculées dans recalculateDataBasedOnStatus lors du changement de statut.
        // On réutilise donc directement l'item courant pour ne pas perdre la mémoire des écarts.
        const recalculatedData = item.status === 'OK'
            ? { ...item }
            : this.recalculateDataBasedOnStatus(item);
        
        // S'assurer que le commentaire préservé est utilisé dans les données recalculées
        // et dans l'item original également
        recalculatedData.comment = savedComment;
        item.comment = savedComment;

        // Définir le traitement par défaut si non spécifié
        const traitement = recalculatedData.traitement && recalculatedData.traitement.trim() !== ''
            ? recalculatedData.traitement
            : this.determineDefaultTraitement(recalculatedData);

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
            comment: savedComment, // Utiliser le commentaire préservé
            traitement: traitement,
            glpiId: recalculatedData.glpiId || ''
        };
        
        this.http.put<any>('/api/result8rec/' + item.id, payload)
        .subscribe({
            next: () => {
                this.popupService.showSuccess('Ligne mise à jour avec succès');
                // Mettre à jour localement l'item avec le commentaire préservé
                item.comment = savedComment;
                // Forcer le rechargement sans cache après mise à jour
                this.forceReload();
                
                // Créer une map pour préserver les commentaires lors du rechargement
                const preserveComments = new Map<number, string>();
                if (item.id) {
                    preserveComments.set(item.id, savedComment);
                }
                
                // Rafraîchir les données après la mise à jour en préservant les commentaires
                this.loadSavedReportFromDatabase(preserveComments);
                
                // Après le rechargement, restaurer le commentaire préservé pour cette ligne
                setTimeout(() => {
                    const updatedItem = this.reportData.find(r => r.id === item.id);
                    const filteredItem = this.filteredReportData.find(r => r.id === item.id);
                    
                    if (item.id && preserveComments.has(item.id)) {
                        const preservedComment = preserveComments.get(item.id)!;
                        // Restaurer dans reportData
                        if (updatedItem) {
                            updatedItem.comment = preservedComment;
                        }
                        // Restaurer dans filteredReportData
                        if (filteredItem) {
                            filteredItem.comment = preservedComment;
                        }
                        // Restaurer dans l'item original
                        item.comment = preservedComment;
                    }
                    // Mettre à jour la pagination pour refléter les changements
                    this.updatePagination();
                }, 200);
            },
            error: (err: HttpErrorResponse) => {
                console.error('❌ Erreur de mise à jour', err);
                this.popupService.showError('Erreur de mise à jour', 'Impossible de mettre à jour la ligne');
            }
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
            
            // Définir le traitement par défaut si non spécifié
            const traitement = recalculatedData.traitement && recalculatedData.traitement.trim() !== ''
                ? recalculatedData.traitement
                : this.determineDefaultTraitement(recalculatedData);
            
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
                comment: recalculatedData.comment,
                traitement: traitement
            };
        });

        this.http.post<any>('/api/result8rec/bulk', payload, { responseType: 'text' as 'json' })
        .subscribe({
            next: (res: any) => {
                // La réponse peut être une string ou un objet JSON
                const message = typeof res === 'string' ? res : `${rowsSource.length} ligne(s) sauvegardée(s)`;
                console.log('✅ Sauvegarde bulk réussie:', message);
                this.popupService.showSuccess(message);
                // Forcer le rechargement sans cache après sauvegarde en masse
                this.forceReload();
            },
            error: (err: HttpErrorResponse) => {
                console.error('❌ Erreur de sauvegarde bulk', err);
                const errorMessage = err.error?.message || err.message || 'Erreur inconnue';
                this.popupService.showError('Erreur de sauvegarde', `Impossible de sauvegarder les lignes: ${errorMessage}`);
            }
        });
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
                    traitement: item.traitement,
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
            groupedData[agency].services[service].traitement = item.traitement;
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
            'Traitement': item.traitement || '',
            'ID TICKET': item.glpiId
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
                ['Date', 'Agence', 'Service', 'Pays', 'Transactions', 'Volume', 'Correspondances', 'Écarts BO', 'Écarts Partenaire', 'Incohérences', 'Taux', 'Statut', 'Commentaire', 'Traitement', 'ID TICKET'], 
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
        // Vérifier si la ligne est verrouillée
        if (this.isRowLocked(item)) {
            this.popupService.showWarning('Ligne verrouillée', 'Cette ligne ne peut pas être modifiée car le statut est OK et le traitement est Terminé.');
            return;
        }
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

    private normalizeNumericValue(value: number | string | null | undefined): number {
        if (value === null || value === undefined) {
            return 0;
        }

        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed === '') {
                return 0;
            }
            const parsed = Number(trimmed);
            return isNaN(parsed) ? 0 : parsed;
        }

        const parsed = Number(value);
        return isNaN(parsed) ? 0 : parsed;
    }

    private validateEditData(item: ReconciliationReportData): boolean {
        if (!item.date || !item.agency || !item.service || !item.country) {
            this.popupService.showError('Données invalides', 'Veuillez remplir tous les champs obligatoires (Date, Agence, Service, Pays)');
            return false;
        }

        const numericFields: Array<{ key: keyof ReconciliationReportData; label: string }> = [
            { key: 'totalTransactions', label: 'Nombre de transactions' },
            { key: 'totalVolume', label: 'Volume total' },
            { key: 'matches', label: 'Correspondances' },
            { key: 'boOnly', label: 'Écarts BO' },
            { key: 'partnerOnly', label: 'Écarts partenaire' },
            { key: 'mismatches', label: 'Incohérences' }
        ];

        for (const field of numericFields) {
            const rawValue = item[field.key];
            const numericValue = Number(rawValue);
            if (isNaN(numericValue) || numericValue < 0) {
                this.popupService.showError('Données invalides', `${field.label} doit être un nombre positif ou nul`);
                return false;
            }
            (item as any)[field.key] = numericValue;
        }

        return true;
    }

    private recalculateMatchRate(item: ReconciliationReportData, preserveComment: boolean = false) {
        // Sauvegarder le commentaire si on doit le préserver
        const savedComment = preserveComment ? (item.comment ?? '') : null;
        
        // Normaliser toutes les valeurs numériques
        let totalTransactions = this.normalizeNumericValue(item.totalTransactions);
        let matches = this.normalizeNumericValue(item.matches);
        const boOnly = this.normalizeNumericValue(item.boOnly);
        const partnerOnly = this.normalizeNumericValue(item.partnerOnly);
        const mismatches = this.normalizeNumericValue(item.mismatches);

        // Assurer la cohérence: totalTransactions = matches + boOnly + partnerOnly + mismatches
        const calculatedTotal = matches + boOnly + partnerOnly + mismatches;
        if (calculatedTotal > 0) {
            // Si le total calculé diffère du totalTransactions, utiliser le total calculé
            if (totalTransactions !== calculatedTotal) {
                totalTransactions = calculatedTotal;
            }
        }

        if (totalTransactions > 0) {
            // Calculer l'écart Partenaire effectif en tenant compte des écarts BO déjà pris en compte
            // Si les deux types d'écarts existent et que partnerOnly > boOnly, 
            // on soustrait boOnly de partnerOnly pour obtenir les écarts partenaires excédentaires
            // Sinon, on affiche les deux séparément car ils représentent des écarts différents
            const effectivePartnerOnly =
                boOnly > 0 && partnerOnly > 0 && partnerOnly > boOnly
                    ? partnerOnly - boOnly
                    : partnerOnly;

            const totalEcarts = boOnly + effectivePartnerOnly + mismatches;

            if (totalEcarts > 0) {
                // Correspondances = Transactions - (Écarts BO + Écarts Partenaire restants + Incohérences)
                matches = Math.max(0, totalTransactions - totalEcarts);
            } else {
                // Aucun écart : 100% de correspondance
                matches = totalTransactions;
            }
        } else {
            // Pas de transactions, donc pas de correspondances
            matches = 0;
        }

        // Réaffecter les valeurs recalculées
        item.totalTransactions = totalTransactions;
        item.matches = matches;
        item.boOnly = boOnly;
        item.partnerOnly = partnerOnly;
        item.mismatches = mismatches;

        // Calcul du taux de correspondance basé sur Transactions et Correspondances
        if (totalTransactions > 0) {
            if (boOnly === 0 && partnerOnly === 0 && mismatches === 0) {
                // Cas "aucun écart" : taux forcé à 100%
                item.matchRate = 100;
            } else {
                item.matchRate = (matches / totalTransactions) * 100;
            }
        } else {
            item.matchRate = 0;
        }
        
        // Si on doit préserver le commentaire, le restaurer maintenant
        if (preserveComment && savedComment !== null) {
            item.comment = savedComment;
        } else if (!this.isRowSete(item)) {
            // Seulement pour les lignes NON sauvegardées, mettre à jour le commentaire
            this.updateCommentFromCounts(item, matches, boOnly, partnerOnly, mismatches, { force: false });
        }
        // Pour les lignes sauvegardées (isRowSete), ne jamais modifier le commentaire
    }

    /**
     * Calcule le nombre de correspondances à afficher selon les règles métier,
     * sans dépendre des valeurs éventuellement incohérentes venant de la base.
     */
    getDisplayMatches(item: ReconciliationReportData): number {
        const totalTransactions = this.normalizeNumericValue(item.totalTransactions);
        const boOnly = this.normalizeNumericValue(item.boOnly);
        const partnerOnly = this.normalizeNumericValue(item.partnerOnly);
        const mismatches = this.normalizeNumericValue(item.mismatches);
        let matches = this.normalizeNumericValue(item.matches);

        if (totalTransactions <= 0) {
            return 0;
        }

        // Calculer l'écart Partenaire effectif en tenant compte des écarts BO déjà pris en compte
        const effectivePartnerOnly =
            boOnly > 0 && partnerOnly > 0
                ? (partnerOnly > boOnly ? partnerOnly - boOnly : partnerOnly)
                : partnerOnly;

        const totalEcarts = boOnly + effectivePartnerOnly + mismatches;

        if (totalEcarts <= 0) {
            // Aucun écart : correspondances = transactions
            return totalTransactions;
        }

        // Correspondances affichées = Transactions - (Écarts BO + Écarts Partenaire restants + Incohérences)
        matches = Math.max(0, totalTransactions - totalEcarts);
        return matches;
    }

    // Méthode pour transférer une partie des écarts vers les correspondances
    async transferEcartToMatches(item: ReconciliationReportData, ecartType: 'boOnly' | 'partnerOnly') {
        // Vérifier si la ligne est verrouillée
        if (this.isRowLocked(item)) {
            this.popupService.showWarning('Ligne verrouillée', 'Cette ligne ne peut pas être modifiée car le statut est OK et le traitement est Terminé.');
            return;
        }

        const currentEcart = this.normalizeNumericValue(item[ecartType]);
        
        if (currentEcart <= 0) {
            this.popupService.showWarning('Aucun écart disponible', `Il n'y a pas d'écart ${ecartType === 'boOnly' ? 'BO' : 'Partenaire'} à transférer.`);
            return;
        }

        const ecartLabel = ecartType === 'boOnly' ? 'BO' : 'Partenaire';
        const message = `Entrez le nombre d'écarts ${ecartLabel} à transférer vers les correspondances (maximum: ${currentEcart}):`;
        
        const userInput = await this.popupService.showTextInput(
            message,
            `Transfert d'écarts ${ecartLabel}`,
            '',
            `Nombre entre 1 et ${currentEcart}`
        );
        
        if (userInput === null || userInput.trim() === '') {
            // L'utilisateur a annulé ou n'a rien saisi
            return;
        }

        const transferAmount = Number(userInput.trim());
        
        // Validation
        if (isNaN(transferAmount) || transferAmount <= 0) {
            this.popupService.showError('Valeur invalide', 'Veuillez entrer un nombre positif.');
            return;
        }

        if (transferAmount > currentEcart) {
            this.popupService.showError('Valeur trop élevée', `Le nombre à transférer (${transferAmount}) ne peut pas être supérieur à l'écart actuel (${currentEcart}).`);
            return;
        }

        // Effectuer le transfert
        const newEcart = currentEcart - transferAmount;
        const newMatches = this.normalizeNumericValue(item.matches) + transferAmount;

        item[ecartType] = newEcart;
        item.matches = newMatches;

        // Recalculer le taux de correspondance
        this.recalculateMatchRate(item);

        // Sauvegarder si la ligne existe déjà en base
        if (item.id) {
            // Recalculer les valeurs selon le statut (commentaire inclus)
            const recalculatedData = this.recalculateDataBasedOnStatus(item);
            
            // Définir le traitement par défaut si non spécifié
            const traitement = recalculatedData.traitement && recalculatedData.traitement.trim() !== ''
                ? recalculatedData.traitement
                : this.determineDefaultTraitement(recalculatedData);

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
                traitement: traitement,
                glpiId: recalculatedData.glpiId || ''
            };

            this.http.put<any>('/api/result8rec/' + item.id, payload)
            .subscribe({
                next: () => {
                    this.popupService.showSuccess(
                        'Transfert effectué',
                        `${transferAmount} écart(s) ${ecartLabel} transféré(s) vers les correspondances.`
                    );
                    // Rafraîchir les données après la mise à jour
                    this.loadSavedReportFromDatabase();
                },
                error: (err: HttpErrorResponse) => {
                    console.error('Erreur lors de la sauvegarde:', err);
                    this.popupService.showError('Erreur de sauvegarde', 'Le transfert a été effectué localement mais la sauvegarde a échoué.');
                }
            });
        } else {
            this.popupService.showSuccess(
                'Transfert effectué',
                `${transferAmount} écart(s) ${ecartLabel} transféré(s) vers les correspondances. N'oubliez pas de sauvegarder la ligne.`
            );
        }
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
            status: this.DEFAULT_STATUS,
            comment: "PAS D'ECARTS CONSTATES",
            traitement: undefined
        };

        // Ajouter au début du tableau
        this.reportData.unshift(newRow);
        this.lastSavedGlpiIds.set(newRow, '');
        
        // Mettre à jour les données filtrées et la pagination
        this.extractUniqueValues();
        this.filterReport();
        
        // Commencer l'édition de la nouvelle ligne
        this.startEdit(newRow);
    }

    // Méthode pour convertir le statut en classe CSS
    getStatusClass(status?: string | null): string {
        const normalizedStatus = this.normalizeStatus(status);
        const cleanStatus = normalizedStatus.toLowerCase().replace(/\s+/g, '-');
        return `status-badge status-${cleanStatus}`;
    }

    getTraitementClass(traitement?: string): string {
        if (!traitement) return 'traitement-badge';
        const cleanTraitement = traitement.toLowerCase().replace(/\s+/g, '-');
        return `traitement-badge traitement-${cleanTraitement}`;
    }

    // Vérifier si une ligne est verrouillée (statut OK + traitement Terminé)
    isRowLocked(item: ReconciliationReportData): boolean {
        return item.status === 'OK' && item.traitement === 'Terminé';
    }

    /**
     * Vérifie si une ligne est "sété" (sauvegardée) et ne doit plus être modifiée
     * Une ligne est considérée comme "sété" si elle a un ID (sauvegardée en base)
     */
    private isRowSete(item: ReconciliationReportData): boolean {
        if (!item) {
            return false;
        }
        return !!item.id;
    }

    // Méthodes pour l'édition directe du traitement (comme dans banque)
    startEditTraitement(item: ReconciliationReportData) {
        this.editingTraitementRow = item;
    }

    stopEditTraitement() {
        this.editingTraitementRow = null;
    }

    onTraitementChange(item: ReconciliationReportData) {
        if (!item.id) {
            // Si la ligne n'a pas d'ID, elle n'est pas encore sauvegardée
            // On peut juste mettre à jour localement
            this.stopEditTraitement();
            return;
        }

        // Sauvegarder le traitement via l'API
        const payload = {
            date: item.date,
            agency: item.agency,
            service: item.service,
            country: item.country,
            totalTransactions: item.totalTransactions,
            totalVolume: item.totalVolume,
            matches: item.matches,
            boOnly: item.boOnly,
            partnerOnly: item.partnerOnly,
            mismatches: item.mismatches,
            matchRate: item.matchRate,
            status: item.status,
            comment: item.comment,
            traitement: item.traitement || undefined,
            glpiId: item.glpiId || ''
        };

        this.http.put<any>('/api/result8rec/' + item.id, payload)
        .subscribe({
            next: (updated) => {
                // Mettre à jour l'item avec les données retournées
                if (updated.traitement !== undefined) {
                    item.traitement = updated.traitement;
                }
                this.stopEditTraitement();
                // Optionnel: afficher un message de succès discret
                console.log('✅ Traitement mis à jour avec succès');
            },
            error: (err: HttpErrorResponse) => {
                console.error('❌ Erreur lors de la mise à jour du traitement', err);
                // Restaurer la valeur précédente en cas d'erreur
                // On pourrait aussi afficher un message d'erreur
                this.popupService.showError('Erreur', 'Impossible de mettre à jour le traitement');
            }
        });
    }

    // Méthodes pour la sélection multiple et changement de statut en masse
    isRowSelected(item: ReconciliationReportData): boolean {
        return this.selectedRows.has(item);
    }

    toggleRowSelection(item: ReconciliationReportData, event: Event): void {
        const checkbox = event.target as HTMLInputElement;
        if (checkbox.checked) {
            if (!this.isRowLocked(item)) {
                this.selectedRows.add(item);
            } else {
                checkbox.checked = false;
            }
        } else {
            this.selectedRows.delete(item);
        }
    }

    isAllSelected(): boolean {
        if (this.paginatedData.length === 0) return false;
        const unlockableItems = this.paginatedData.filter(item => !this.isRowLocked(item));
        if (unlockableItems.length === 0) return false;
        return unlockableItems.every(item => this.isRowSelected(item));
    }

    isSomeSelected(): boolean {
        const selectedCount = this.paginatedData.filter(item => this.isRowSelected(item)).length;
        return selectedCount > 0 && selectedCount < this.paginatedData.filter(item => !this.isRowLocked(item)).length;
    }

    toggleSelectAll(event: Event): void {
        const checkbox = event.target as HTMLInputElement;
        if (checkbox.checked) {
            // Sélectionner toutes les lignes non verrouillées
            this.paginatedData.forEach(item => {
                if (!this.isRowLocked(item)) {
                    this.selectedRows.add(item);
                }
            });
        } else {
            // Désélectionner toutes les lignes
            this.paginatedData.forEach(item => {
                this.selectedRows.delete(item);
            });
        }
    }

    hasSelectedRows(): boolean {
        return this.selectedRows.size > 0;
    }

    getSelectedRowsCount(): number {
        return this.selectedRows.size;
    }

    clearSelection(): void {
        this.selectedRows.clear();
        this.bulkStatusSelection = '';
    }

    async applyBulkStatusChange(): Promise<void> {
        if (!this.bulkStatusSelection || this.selectedRows.size === 0) {
            return;
        }

        const selectedItems = Array.from(this.selectedRows);
        const unlockedItems = selectedItems.filter(item => !this.isRowLocked(item));

        if (unlockedItems.length === 0) {
            this.popupService.showWarning('Aucune ligne modifiable', 'Toutes les lignes sélectionnées sont verrouillées (OK + Terminé).');
            this.clearSelection();
            return;
        }

        // Confirmer le changement avec popup moderne
        const confirmMessage = `Voulez-vous changer le statut de ${unlockedItems.length} ligne(s) en "${this.bulkStatusSelection}" ?`;
        const confirmed = await this.popupService.showConfirm(confirmMessage, 'Confirmation de changement de statut');
        if (!confirmed) {
            return;
        }

        let successCount = 0;
        let errorCount = 0;

        // Appliquer le changement de statut à toutes les lignes sélectionnées
        const savePromises = unlockedItems.map(async (item) => {
            const oldStatus = item.status;
            item.status = this.bulkStatusSelection;
            
            // Recalculer les données selon le nouveau statut
            const recalculatedData = this.recalculateDataBasedOnStatus(item);
            
            try {
                // Sauvegarder via l'API
                await this.saveItemStatus(recalculatedData, oldStatus);
                successCount++;
            } catch (error) {
                errorCount++;
                // Revenir à l'ancien statut en cas d'erreur
                item.status = oldStatus;
                console.error('❌ Erreur lors de la sauvegarde du statut:', error);
            }
        });

        // Attendre que toutes les sauvegardes soient terminées
        await Promise.all(savePromises);

        // Vider la sélection
        this.clearSelection();
        
        // Rafraîchir les données après la sauvegarde
        if (this.currentSource === 'db') {
            // Si on est en mode base de données, recharger depuis la DB
            this.loadSavedReportFromDatabase();
        } else {
            // Si on est en mode live, re-filtrer les données
            this.filterReport();
            this.updatePagination();
        }
        
        // Afficher les résultats
        if (successCount > 0) {
            this.popupService.showSuccess(`Statut modifié pour ${successCount} ligne(s)`, 'Changement de statut en masse réussi');
        }
        if (errorCount > 0) {
            this.popupService.showError(`Erreur lors de la modification de ${errorCount} ligne(s)`, 'Certaines modifications ont échoué');
        }
    }

    private async saveItemStatus(item: ReconciliationReportData, oldStatus: string): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!item.id) {
                console.error('❌ Impossible de sauvegarder: ID manquant pour', item);
                reject(new Error('ID manquant'));
                return;
            }

            const payload = {
                date: item.date,
                agency: item.agency,
                service: item.service,
                country: item.country,
                totalTransactions: item.totalTransactions,
                totalVolume: item.totalVolume,
                matches: item.matches,
                boOnly: item.boOnly,
                partnerOnly: item.partnerOnly,
                mismatches: item.mismatches,
                matchRate: item.matchRate,
                status: item.status,
                comment: item.comment,
                traitement: item.traitement || '',
                glpiId: item.glpiId || ''
            };

            this.http.put<any>(`/api/result8rec/${item.id}`, payload).subscribe({
                next: (updated) => {
                    console.log(`✅ Statut sauvegardé pour ${item.agency} - ${item.service}`);
                    // Mettre à jour l'item avec les données retournées
                    if (updated.status !== undefined) {
                        item.status = updated.status;
                    }
                    if (updated.traitement !== undefined) {
                        item.traitement = updated.traitement;
                    }
                    resolve();
                },
                error: (error: HttpErrorResponse) => {
                    console.error('❌ Erreur lors de la sauvegarde du statut:', error);
                    reject(error);
                }
            });
        });
    }

    // Méthodes pour l'édition directe du statut (comme pour le traitement)
    startEditStatus(item: ReconciliationReportData) {
        if (this.isRowLocked(item)) {
            this.popupService.showWarning('Ligne verrouillée', 'Cette ligne ne peut pas être modifiée car le statut est OK et le traitement est Terminé.');
            return;
        }
        this.editingStatusRow = item;
    }

    stopEditStatus() {
        this.editingStatusRow = null;
    }

    onStatusChange(item: ReconciliationReportData) {
        // Sauvegarder le commentaire avant toute modification
        const previousComment = item.comment ?? '';
        
        // Si le statut est "OK", appliquer le même comportement que saveEdit
        if (item.status === 'OK') {
            // Valider les données avant sauvegarde
            if (!this.validateEditData(item)) {
                this.stopEditStatus();
                return;
            }

            // Recalculer le taux de correspondance si nécessaire (sans modifier le commentaire)
            // Passer preserveComment=true pour préserver le commentaire lors d'un changement de statut
            this.recalculateMatchRate(item, true);

            // Recalculer les données selon le statut (logique centralisée dans recalculateDataBasedOnStatus)
            const recalculatedData = this.recalculateDataBasedOnStatus(item);
            
            // S'assurer que le commentaire est préservé (recalculateDataBasedOnStatus devrait déjà le faire, mais on le force)
            recalculatedData.comment = previousComment;

            // Mettre à jour l'item avec les données recalculées
            Object.assign(item, recalculatedData);
            
            // S'assurer une dernière fois que le commentaire est préservé après Object.assign
            item.comment = previousComment;

            // Si c'est une nouvelle ligne (pas d'ID), sauvegarder
            if (!item.id) {
                // S'assurer que le commentaire préservé est utilisé
                item.comment = previousComment;
                this.confirmAndSave(item).then(() => {
                    // Après la sauvegarde, s'assurer que le commentaire est toujours préservé
                    if (item.id) {
                        item.comment = previousComment;
                    }
                    this.stopEditStatus();
                });
            } else {
                // Si c'est une ligne existante, mettre à jour
                // S'assurer que le commentaire préservé est utilisé avant updateRow
                item.comment = previousComment;
                this.updateRow(item).then(() => {
                    // Après la mise à jour, s'assurer que le commentaire est toujours préservé
                    item.comment = previousComment;
                    this.stopEditStatus();
                });
            }
        } else {
            // Pour les autres statuts, préserver le commentaire également
            // Sauvegarder le commentaire avant toute modification
            const savedCommentForOtherStatus = item.comment ?? '';
            
            // Pour les autres statuts, comportement normal
            if (!item.id) {
                // Si la ligne n'a pas d'ID, elle n'est pas encore sauvegardée
                // On peut juste mettre à jour localement
                // S'assurer que le commentaire est préservé
                item.comment = savedCommentForOtherStatus;
                this.stopEditStatus();
                return;
            }

            // Sauvegarder le statut via l'API
            const payload = {
                date: item.date,
                agency: item.agency,
                service: item.service,
                country: item.country,
                totalTransactions: item.totalTransactions,
                totalVolume: item.totalVolume,
                matches: item.matches,
                boOnly: item.boOnly,
                partnerOnly: item.partnerOnly,
                mismatches: item.mismatches,
                matchRate: item.matchRate,
                status: item.status,
                comment: savedCommentForOtherStatus, // Utiliser le commentaire préservé
                traitement: item.traitement || undefined,
                glpiId: item.glpiId || ''
            };

            this.http.put<any>('/api/result8rec/' + item.id, payload)
            .subscribe({
                next: (updated) => {
                    // Mettre à jour l'item avec les données retournées
                    if (updated.status !== undefined) {
                        item.status = updated.status;
                    }
                    // S'assurer que le commentaire est préservé après la mise à jour
                    item.comment = savedCommentForOtherStatus;
                    this.stopEditStatus();
                    console.log('✅ Statut mis à jour avec succès');
                },
                error: (err: HttpErrorResponse) => {
                    console.error('❌ Erreur lors de la mise à jour du statut', err);
                    this.popupService.showError('Erreur', 'Impossible de mettre à jour le statut');
                }
            });
        }
    }

    // Méthode pour basculer entre les données en cours et les données en base
    toggleDataSource() {
        if (this.currentSource === 'live') {
            // Basculer vers les données en base
            this.currentSource = 'db';
            this.loadSavedReportFromDatabase();
        } else {
            // Basculer vers les données en cours
            this.currentSource = 'live';
            this.loadLiveData();
        }
    }

    toggleActionsColumn() {
        this.showActionsColumn = !this.showActionsColumn;
    }

    goToSuiviEcarts() {
        this.router.navigate(['/suivi-des-ecarts']);
    }

    // Méthode pour charger les données en cours
    private loadLiveData() {
        this.loadedFromDb = false;
        this.hasSummary = false;
        
        // Réinitialiser les données
        this.reportData = [];
        this.filteredReportData = [];
        
        // Recharger depuis les services
        const summary = this.reconciliationSummaryService.getAgencySummary();
        if (summary && summary.length > 0) {
            this.generateReportDataFromSummary(summary);
            this.extractUniqueValues();
            this.filterReport();
            this.currentSource = 'live';
            this.hasSummary = true;
            this.updatePagination();
        } else {
            // Essayer de charger depuis les résultats de réconciliation via l'observable
            // Prendre la dernière valeur du BehaviorSubject en s'abonnant une fois
            this.appStateService.getReconciliationResults().pipe(
                take(1)
            ).subscribe(response => {
                if (response) {
                    this.response = response;
                    this.generateReportData();
                    this.extractUniqueValues();
                    this.filterReport();
                    this.currentSource = 'live';
                    this.updatePagination();
                } else {
                    // Pas de données en cours disponibles
                    this.popupService.showError('Données indisponibles', 'Aucune donnée en cours disponible. Veuillez effectuer une réconciliation d\'abord.');
                    // Revenir aux données en base
                    this.currentSource = 'db';
                    this.loadSavedReportFromDatabase();
                }
            });
        }
    }
}
