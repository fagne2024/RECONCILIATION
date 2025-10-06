import { Component, Input, OnInit, ChangeDetectorRef, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { ReconciliationResponse, Match } from '../../models/reconciliation-response.model';
import { AppStateService } from '../../services/app-state.service';
import { Router } from '@angular/router';
import { ReconciliationService } from '../../services/reconciliation.service';
import { EcartSoldeService } from '../../services/ecart-solde.service';
import { ReconciliationSummaryService } from '../../services/reconciliation-summary.service';
import { ReconciliationTabsService } from '../../services/reconciliation-tabs.service';
import { EcartSolde } from '../../models/ecart-solde.model';
import { TrxSfService } from '../../services/trx-sf.service';
import { ImpactOPService } from '../../services/impact-op.service';
import { ImpactOP } from '../../models/impact-op.model';
import { ExportOptimizationService, ExportProgress } from '../../services/export-optimization.service';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { HttpClient } from '@angular/common/http';
import { Subscription, firstValueFrom } from 'rxjs';
import { PopupService } from '../../services/popup.service';

interface ApiError {
    error?: {
        message?: string;
        details?: string;
    };
    message?: string;
}

@Component({
    selector: 'app-reconciliation-results',
    template: `

        <!-- Affichage de la progression -->
        <div *ngIf="showProgress" class="progress-overlay">
            <div class="progress-card">
                <div class="progress-header">
                    <h2>Réconciliation en cours...</h2>
                    <div class="progress-icon">
                        <i class="fas fa-cog fa-spin"></i>
                    </div>
                </div>
                
                <div class="progress-bar-container">
                    <div class="progress-bar">
                        <div class="progress-fill" [style.width.%]="progressPercentage"></div>
                    </div>
                    <div class="progress-text">
                        {{ progressPercentage | number:'1.0-0' }}% terminé
                    </div>
                </div>
                
                <div class="progress-details">
                    <div class="detail-item">
                        <span class="label">📊 Enregistrements traités:</span>
                        <span class="value">{{ processedRecords | number }} / {{ totalRecords | number }}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">⏱️ Temps écoulé:</span>
                        <span class="value">{{ formatTime(getElapsedTime()) }}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">🚀 Vitesse:</span>
                        <span class="value">{{ getProcessingSpeed() }} rec/s</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">📈 Statut:</span>
                        <span class="value">{{ getProgressStatus() }}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Résumé des performances -->
        <div *ngIf="response && executionTime > 0" class="performance-summary">
            <div class="performance-card">
                <div class="performance-header">
                    <h3>📊 Performance de la réconciliation</h3>
                </div>
                <div class="performance-details">
                    <div class="performance-item">
                        <i class="fas fa-clock"></i>
                        <span>Temps d'exécution: {{ formatTime(executionTime) }}</span>
                    </div>
                    <div class="performance-item">
                        <i class="fas fa-database"></i>
                        <span>Enregistrements traités: {{ processedRecords | number }}</span>
                    </div>
                    <div class="performance-item">
                        <i class="fas fa-tachometer-alt"></i>
                        <span>Vitesse: {{ (processedRecords / (executionTime / 1000)) | number:'1.0-0' }} enregistrements/seconde</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="results-container">
            <div class="service-selector">
                <h3>🔍 Sélection du service</h3>
                <div class="service-selector-content">
                    <select [(ngModel)]="selectedService" class="service-select">
                        <option value="">Tous les services</option>
                        <option *ngFor="let service of getServiceTotalsArray()" [value]="service.name">
                            {{service.name}}
                        </option>
                    </select>
                    <button (click)="applyServiceFilter()" class="reconcile-button">
                        Filtrer
                    </button>
                </div>
            </div>
            <div class="summary-section">
                <div class="summary-header">
                    <h3>📊 Résumé de la réconciliation</h3>
                    <button (click)="openColumnSelector()" class="report-button">
                        📋 Rapport des écarts
                    </button>
                </div>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">{{filteredMatches.length || 0}}</div>
                        <div class="stat-label">Nombres de Transactions</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">{{filteredMatches.length || 0}}</div>
                        <div class="stat-label">Transactions correspondantes</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">{{(response?.mismatches?.length || 0) + (response?.boOnly?.length || 0)}}</div>
                        <div class="stat-label">Transactions non correspondantes BO</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">{{filteredPartnerOnly.length || 0}}</div>
                        <div class="stat-label">Transactions non correspondantes Partenaire</div>
                    </div>
                </div>
            </div>

            <div class="results-tabs">
                <div class="tab-buttons">
                    <button 
                        [class.active]="activeTab === 'matches'"
                        (click)="setActiveTab('matches')">
                        ✅ Correspondances ({{filteredMatches.length || 0}})
                    </button>
                    <button 
                        [class.active]="activeTab === 'boOnly'"
                        (click)="setActiveTab('boOnly')">
                        ⚠️ ECART BO ({{(response?.mismatches?.length || 0) + (response?.boOnly?.length || 0)}})
                    </button>
                    <button 
                        [class.active]="activeTab === 'partnerOnly'"
                        (click)="setActiveTab('partnerOnly')">
                        ⚠️ ECART Partenaire ({{filteredPartnerOnly.length || 0}})
                    </button>
                    <button 
                        [class.active]="activeTab === 'agencySummary'"
                        (click)="setActiveTab('agencySummary')">
                        📊 Résumé par Agence
                    </button>
                    <button 
                        class="report-button"
                        (click)="openReconciliationReport()">
                        📈 Rapport Réconciliation
                    </button>
                </div>

                <div class="tab-content">
                    <!-- Résumé par Agence -->
                    <div *ngIf="activeTab === 'agencySummary'" class="agency-summary-section">
                        <div class="summary-header">
                            <h3>Résumé des volumes par Agence et Service</h3>
                            <div class="summary-actions">
                                <div class="date-selector">
                                    <label>Date:</label>
                                    <input type="date" [(ngModel)]="selectedDate">
                                </div>
                                <button (click)="saveAgencySummary()" class="save-button">
                                    💾 Sauvegarder
                                </button>
                                <button (click)="exportResults()" class="export-button">
                                    📥 Exporter le résumé
                                </button>
                            </div>
                            <div class="summary-stats">
                                <div class="stat-item">
                                    <span class="label">Nombres de Transactions:</span>
                                    <span class="value">{{getTotalRecords() | number:'1.0-0'}}</span>
                                </div>
                                <div class="stat-item">
                                    <span class="label">Volume total:</span>
                                    <span class="value">{{getTotalVolume() | number:'1.0-0'}}</span>
                                </div>
                            </div>
                        </div>
                        <div class="summary-tables-row">
                            <div class="summary-table-agency">
                                <h4>Volume par agence</h4>
                                <table>
                                    <thead>
                                        <tr>
                                            <th><input type="checkbox" [checked]="allAgencySelected" (change)="toggleSelectAllAgency($event)"></th>
                                            <th>Agence</th>
                                            <th>Service</th>
                                            <th>Pays</th>
                                            <th>Volume Total</th>
                                            <th>Nombres de Transactions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr *ngFor="let summary of getPagedAgencySummary()">
                                            <td><input type="checkbox" [checked]="isAgencySelected(summary)" (change)="toggleAgencySelection(summary, $event)"></td>
                                            <td>{{summary.agency}}</td>
                                            <td>{{summary.service}}</td>
                                            <td>{{summary.country}}</td>
                                            <td class="volume-cell">{{summary.totalVolume | number:'1.0-0'}}</td>
                                            <td class="count-cell">{{summary.recordCount | number:'1.0-0'}}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div class="summary-table-service">
                                <h4>Volume par service</h4>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Service</th>
                                            <th>Volume total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr *ngFor="let service of getServiceTotalsArray()">
                                            <td>{{service.name}}</td>
                                            <td>{{service.volume | number:'1.0-0'}}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div class="pagination-controls">
                            <button (click)="prevAgencyPage()" [disabled]="agencyPage === 1">Précédent</button>
                            <span>Page {{agencyPage}} / {{getTotalAgencyPages()}}</span>
                            <button (click)="nextAgencyPage()" [disabled]="agencyPage === getTotalAgencyPages()">Suivant</button>
                        </div>
                    </div>

                    <!-- Correspondances avec pagination -->
                    <div *ngIf="activeTab === 'matches'" class="matches-section">
                        <div class="search-section">
                            <input 
                                type="text" 
                                [(ngModel)]="searchKey" 
                                (input)="onSearch()"
                                placeholder="Rechercher par clé..."
                                class="search-input"
                            >
                            <button (click)="handleExport()" class="export-button">
                                📥 Exporter les correspondances
                            </button>
                        </div>
                        <div class="volume-summary">
                            <h4>📊 Résumé des volumes</h4>
                            <div class="volume-grid">
                                <div class="volume-card">
                                    <div class="volume-label">Volume total BO</div>
                                    <div class="volume-value">{{calculateTotalVolume('bo') | number:'1.0-0'}}</div>
                                </div>
                                <div class="volume-card">
                                    <div class="volume-label">Volume total Partenaire</div>
                                    <div class="volume-value">{{calculateTotalVolume('partner') | number:'1.0-0'}}</div>
                                </div>
                                <div class="volume-card">
                                    <div class="volume-label">Différence totale</div>
                                    <div class="volume-value" [class.positive]="calculateVolumeDifference() > 0" [class.negative]="calculateVolumeDifference() < 0">
                                        {{calculateVolumeDifference() | number:'1.0-0'}}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="pagination-controls">
                            <button (click)="prevPage('matches')" [disabled]="matchesPage === 1">Précédent</button>
                            <span>Page {{matchesPage}} / {{getTotalPages('matches')}}</span>
                            <button (click)="nextPage('matches')" [disabled]="matchesPage === getTotalPages('matches')">Suivant</button>
                        </div>
                        <div class="match-card" *ngFor="let match of getPagedMatches(); let i = index">
                            <!-- Fiche des champs clés -->
                            <div class="match-header fiche-header">
                                <div class="fiche-row">
                                    <span class="fiche-label">Clé :</span>
                                    <span class="fiche-value">{{match.key}}</span>
                                </div>
                                <div class="fiche-row">
                                    <span class="fiche-label">Statut :</span>
                                    <span class="fiche-value" [class.has-differences]="hasDifferences(match)">
                                    {{hasDifferences(match) ? '⚠️ Différences détectées' : '✅ Correspondance parfaite'}}
                                </span>
                            </div>
                                <div class="fiche-row">
                                    <span class="fiche-label">Montant :</span>
                                    <span class="fiche-value">{{match.boData['montant'] || match.partnerData['Crédit'] || match.partnerData['montant']}}</span>
                                        </div>
                                <div class="fiche-row">
                                    <span class="fiche-label">Date BO :</span>
                                    <span class="fiche-value">{{match.boData['Date']}}</span>
                                    <span class="fiche-label">Date Partenaire :</span>
                                    <span class="fiche-value">{{match.partnerData['Date']}}</span>
                                        </div>
                                <div class="fiche-row">
                                    <span class="fiche-label">Agence :</span>
                                    <span class="fiche-value">{{getBoAgencyAndService(match).agency}}</span>
                                    <span class="fiche-label">Service :</span>
                                    <span class="fiche-value">{{getBoAgencyAndService(match).service}}</span>
                                        </div>
                                    </div>
                            <!-- Deux colonnes alignées -->
                            <div class="match-content two-columns">
                                <div class="data-column">
                                    <h4>🏢 BO</h4>
                                    <div class="data-grid refined-grid">
                                        <div class="data-row" *ngFor="let key of getBoKeys(match)">
                                            <span class="label">{{key}} :</span>
                                            <span class="value">{{match.boData[key]}}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="data-column">
                                    <h4>🤝 Partenaire</h4>
                                    <div class="data-grid refined-grid">
                                        <div class="data-row" *ngFor="let key of getPartnerKeys(match)">
                                            <span class="label">{{key}} :</span>
                                            <span class="value">{{match.partnerData[key]}}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="differences-section" *ngIf="hasDifferences(match)">
                                <h4>📝 Différences détectées</h4>
                                <div class="difference-card" *ngFor="let diff of match.differences">
                                    <div class="diff-header">
                                        <span class="column">{{diff.boColumn}} ↔ {{diff.partnerColumn}}</span>
                                    </div>
                                    <div class="diff-values">
                                        <div class="value bo">
                                            <span class="label">BO :</span>
                                            <span class="content">{{diff.boValue}}</span>
                                        </div>
                                        <div class="value partner">
                                            <span class="label">Partenaire :</span>
                                            <span class="content">{{diff.partnerValue}}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- ECART BO avec pagination -->
                    <div *ngIf="activeTab === 'boOnly'" class="bo-only-section">
                        <div class="search-section">
                            <input 
                                type="text" 
                                [(ngModel)]="searchKey" 
                                (input)="onSearch()"
                                placeholder="Rechercher par clé..."
                                class="search-input"
                            >
                            <button (click)="exportResults()" class="export-button">
                                📥 Exporter les ECART BO
                            </button>
                            <button (click)="saveEcartBoToEcartSolde()" class="save-button" [disabled]="isSavingEcartBo">
                                {{ isSavingEcartBo ? '💾 Sauvegarde...' : '💾 Sauvegarder dans Ecart Solde' }}
                            </button>
                            <button (click)="saveEcartBoToTrxSf()" class="save-button" [disabled]="isSavingEcartBoToTrxSf">
                                {{ isSavingEcartBoToTrxSf ? '💾 Sauvegarde...' : '💾 Sauvegarder dans TRX SF' }}
                            </button>
                        </div>
                        <div class="volume-summary">
                            <h4>📊 Résumé des volumes</h4>
                            <div class="volume-grid">
                                <div class="volume-card">
                                    <div class="volume-label">Volume total BO</div>
                                    <div class="volume-value">{{calculateTotalVolumeBoOnly() | number:'1.0-0'}}</div>
                                </div>
                                <div class="volume-card">
                                    <div class="volume-label">Nombre de Transactions</div>
                                    <div class="volume-value">{{filteredBoOnly.length}}</div>
                                </div>
                            </div>
                        </div>
                        <div class="pagination-controls">
                            <button (click)="prevPage('boOnly')" [disabled]="boOnlyPage === 1">Précédent</button>
                            <span>Page {{boOnlyPage}} / {{getTotalPages('boOnly')}}</span>
                            <button (click)="nextPage('boOnly')" [disabled]="boOnlyPage === getTotalPages('boOnly')">Suivant</button>
                        </div>
                        <div class="unmatched-card" *ngFor="let record of getPagedBoOnly()">
                            <div class="data-grid">
                                <div class="info-row">
                                    <span class="label">Volume:</span>
                                    <span class="value">{{getBoOnlyAgencyAndService(record).volume | number:'1.0-0'}}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Date:</span>
                                    <span class="value">{{getBoOnlyAgencyAndService(record).date}}</span>
                                </div>
                                <div class="data-row" *ngFor="let key of getBoOnlyKeys(record)">
                                    <span class="label">{{key}}:</span>
                                    <span class="value">{{record[key]}}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- ECART Partenaire avec pagination -->
                    <div *ngIf="activeTab === 'partnerOnly'" class="partner-only-section">
                        <div class="search-section">
                            <input 
                                type="text" 
                                [(ngModel)]="searchKey" 
                                (input)="onSearch()"
                                placeholder="Rechercher par clé..."
                                class="search-input"
                            >
                            <label style="display:flex;align-items:center;gap:6px;">
                                <input type="checkbox" [checked]="allPartnerSelectedOnPage" (change)="toggleSelectAllPartnerOnPage($event)">
                                <span>Sélectionner la page</span>
                            </label>
                            <button (click)="exportResults()" class="export-button">
                                📥 Exporter les ECART Partenaire
                            </button>
                            <button (click)="saveEcartPartnerToImpactOP()" class="save-button" [disabled]="isSavingEcartPartnerToImpactOP">
                                {{ isSavingEcartPartnerToImpactOP ? '💾 Sauvegarde...' : '💾 Sauvegarder dans Import OP' }}
                            </button>
                        </div>
                        <div class="volume-summary">
                            <h4>📊 Résumé des volumes</h4>
                            <div class="volume-grid">
                                <div class="volume-card">
                                    <div class="volume-label">Volume total Partenaire</div>
                                    <div class="volume-value">{{calculateTotalVolumePartnerOnly() | number:'1.0-0'}}</div>
                                </div>
                                <div class="volume-card">
                                    <div class="volume-label">Nombre de Transactions</div>
                                    <div class="volume-value">{{filteredPartnerOnly.length}}</div>
                                </div>
                            </div>
                        </div>
                        <div class="pagination-controls">
                            <button (click)="prevPage('partnerOnly')" [disabled]="partnerOnlyPage === 1">Précédent</button>
                            <span>Page {{partnerOnlyPage}} / {{getTotalPages('partnerOnly')}}</span>
                            <button (click)="nextPage('partnerOnly')" [disabled]="partnerOnlyPage === getTotalPages('partnerOnly')">Suivant</button>
                        </div>
                        <div class="unmatched-card" *ngFor="let record of getPagedPartnerOnly()">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                                <div style="font-weight:600;color:#1976D2;">Ligne partenaire</div>
                                <label style="display:flex;align-items:center;gap:6px;">
                                    <input type="checkbox" [checked]="isPartnerRecordSelected(record)" (change)="togglePartnerSelection(record, $event)">
                                    <span>Sélectionner</span>
                                </label>
                            </div>
                            <div class="data-grid">
                                <div class="info-row">
                                    <span class="label">Volume:</span>
                                    <span class="value">{{getPartnerOnlyVolume(record) | number:'1.0-0'}}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Date:</span>
                                    <span class="value">{{getPartnerOnlyDate(record)}}</span>
                                </div>
                                <div class="data-row" *ngFor="let key of getPartnerOnlyKeys(record)">
                                    <span class="label">{{key}}:</span>
                                    <span class="value">{{record[key]}}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="action-buttons">
                <button class="export-btn" (click)="exportResults()" [disabled]="isExporting">
                    📥 Exporter les résultats
                </button>
                <button class="export-btn-optimized" (click)="exportResultsOptimized()" [disabled]="isExporting">
                    🚀 Export optimisé
                </button>
                <button class="new-reconciliation-btn" (click)="nouvelleReconciliation()">
                    🔄 Nouvelle réconciliation
                </button>
                <button class="stats-btn" (click)="goToStats()">
                    📊 Voir les statistiques
                </button>
            </div>

            <div *ngIf="isExporting" class="export-progress">
                <div class="progress-bar">
                    <div class="progress" [style.width.%]="exportProgressOptimized.percentage"></div>
                </div>
                <div class="progress-text">{{ exportProgressOptimized.message }} - {{ exportProgressOptimized.percentage | number:'1.0-0' }}%</div>
                <div class="progress-details" *ngIf="exportProgressOptimized.total > 0">
                    {{ exportProgressOptimized.current | number }} / {{ exportProgressOptimized.total | number }} lignes
                </div>
            </div>
        </div>

        <!-- Popup de sélection des colonnes pour l'export -->
        <div *ngIf="showColumnSelector" class="column-selector-overlay">
            <div class="column-selector-popup">
                <div class="popup-header">
                    <h3>📋 Sélection des colonnes pour l'export</h3>
                    <button (click)="closeColumnSelector()" class="close-btn">×</button>
                </div>
                
                <div class="popup-content">
                    <div class="selection-controls">
                        <button (click)="toggleAllColumns(true)" class="select-all-btn">
                            ✅ Tout sélectionner
                        </button>
                        <button (click)="toggleAllColumns(false)" class="deselect-all-btn">
                            ❌ Tout désélectionner
                        </button>
                        <span class="selection-info">
                            {{selectedColumnsCount}} / {{availableColumns.length}} colonnes sélectionnées
                        </span>
                    </div>
                    
                    <div class="columns-grid">
                        <div *ngFor="let column of availableColumns" class="column-item">
                            <label class="column-checkbox">
                                <input 
                                    type="checkbox" 
                                    [(ngModel)]="selectedColumns[column]"
                                    [checked]="selectedColumns[column]">
                                <span class="column-name">{{column}}</span>
                            </label>
                        </div>
                    </div>
                </div>
                
                <div class="popup-actions">
                    <button (click)="closeColumnSelector()" class="cancel-btn">
                        Annuler
                    </button>
                    <button (click)="confirmExportWithSelectedColumns()" class="export-btn">
                        📥 Exporter avec les colonnes sélectionnées
                    </button>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .results-container {
            padding: 20px;
        }

        .summary-section {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
        }

        .summary-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
        }

        .summary-header h3 {
            margin: 0;
            color: #2c3e50;
        }

        .report-button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 6px;
            padding: 10px 16px;
            font-size: 0.9rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
        }

        .report-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(102, 126, 234, 0.4);
            background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
        }

        .report-button:active {
            transform: translateY(0);
            box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
        }

        /* Styles pour la popup de sélection des colonnes */
        .column-selector-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }

        .column-selector-popup {
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            width: 90%;
            max-width: 600px;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
        }

        .popup-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            border-bottom: 1px solid #e0e0e0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 12px 12px 0 0;
        }

        .popup-header h3 {
            margin: 0;
            font-size: 1.2rem;
        }

        .close-btn {
            background: none;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: background-color 0.3s;
        }

        .close-btn:hover {
            background-color: rgba(255, 255, 255, 0.2);
        }

        .popup-content {
            padding: 20px;
            flex: 1;
            overflow-y: auto;
        }

        .selection-controls {
            display: flex;
            gap: 10px;
            align-items: center;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }

        .select-all-btn, .deselect-all-btn {
            padding: 8px 12px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9rem;
            transition: all 0.3s;
        }

        .select-all-btn {
            background-color: #4CAF50;
            color: white;
        }

        .select-all-btn:hover {
            background-color: #45a049;
        }

        .deselect-all-btn {
            background-color: #f44336;
            color: white;
        }

        .deselect-all-btn:hover {
            background-color: #da190b;
        }

        .selection-info {
            color: #666;
            font-size: 0.9rem;
            margin-left: auto;
        }

        .columns-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 10px;
            max-height: 300px;
            overflow-y: auto;
        }

        .column-item {
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 12px;
            background: #f9f9f9;
            transition: all 0.3s;
        }

        .column-item:hover {
            background: #f0f0f0;
            border-color: #667eea;
        }

        .column-checkbox {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            width: 100%;
        }

        .column-checkbox input[type="checkbox"] {
            width: 16px;
            height: 16px;
            accent-color: #667eea;
        }

        .column-name {
            flex: 1;
            font-weight: 500;
            color: #333;
        }

        .default-badge {
            background: #667eea;
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.7rem;
            font-weight: 500;
        }

        .popup-actions {
            padding: 20px;
            border-top: 1px solid #e0e0e0;
            display: flex;
            gap: 10px;
            justify-content: flex-end;
        }

        .cancel-btn, .export-btn {
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 1rem;
            font-weight: 500;
            transition: all 0.3s;
        }

        .cancel-btn {
            background-color: #f5f5f5;
            color: #666;
            border: 1px solid #ddd;
        }

        .cancel-btn:hover {
            background-color: #e0e0e0;
        }

        .export-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
        }

        .export-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(102, 126, 234, 0.4);
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }

        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .stat-value {
            font-size: 2em;
            font-weight: bold;
            color: #2196F3;
            margin-bottom: 5px;
        }

        .stat-label {
            color: #666;
            font-size: 0.9em;
        }

        .results-tabs {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
        }

        .tab-buttons {
            display: flex;
            background: #f8f9fa;
            border-bottom: 1px solid #dee2e6;
        }

        .tab-buttons button {
            padding: 15px 25px;
            border: none;
            background: none;
            cursor: pointer;
            font-size: 1em;
            color: #666;
            transition: all 0.3s ease;
        }

        .tab-buttons button.active {
            background: #2196F3;
            color: white;
        }

        .report-button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            color: white !important;
            font-weight: 600;
            border-radius: 6px;
            margin-left: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .report-button:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }

        .report-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none !important;
        }

        .tab-content {
            padding: 20px;
            max-height: 600px;
            overflow-y: auto;
        }

        .matches-section, .unmatched-section {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }

        .match-card, .unmatched-card {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 15px;
            border: 1px solid #dee2e6;
        }

        .match-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #dee2e6;
        }

        .key {
            font-weight: bold;
            color: #2196F3;
        }

        .status {
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 0.9em;
        }

        .status.has-differences {
            background: #fff3cd;
            color: #856404;
        }

        .match-content {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }

        .data-column h4 {
            margin: 0 0 10px;
            color: #2196F3;
        }

        .data-grid {
            display: grid;
            gap: 8px;
        }

        .data-row {
            display: grid;
            grid-template-columns: 150px 1fr;
            gap: 10px;
        }

        .label {
            color: #666;
            font-weight: 500;
        }

        .differences-section {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #dee2e6;
        }

        .differences-section h4 {
            margin: 0 0 10px;
            color: #dc3545;
        }

        .difference-card {
            background: #fff3cd;
            border-radius: 4px;
            padding: 10px;
            margin-bottom: 10px;
        }

        .diff-header {
            font-weight: bold;
            margin-bottom: 5px;
            color: #856404;
        }

        .diff-values {
            display: grid;
            gap: 5px;
        }

        .value {
            display: grid;
            grid-template-columns: 80px 1fr;
            gap: 10px;
        }

        .value .label {
            font-weight: bold;
        }

        .export-section {
            margin-top: 30px;
            text-align: center;
            display: flex;
            justify-content: center;
            gap: 20px;
        }

        .export-btn, .new-reco-btn {
            padding: 15px 30px;
            border-radius: 8px;
            font-size: 1.1em;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .export-btn {
            background: linear-gradient(45deg, #2196F3, #1976D2);
            color: white;
            border: none;
        }

        .export-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(33, 150, 243, 0.3);
        }

        .new-reco-btn {
            background: #f5f5f5;
            color: #1976D2;
            border: 1px solid #1976D2;
        }

        .new-reco-btn:hover {
            background: #1976D2;
            color: white;
        }

        .pagination-controls {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 1rem;
            margin-bottom: 1rem;
        }

        .volume-summary {
            background: #fff;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .volume-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-top: 10px;
        }

        .volume-card {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 6px;
            text-align: center;
        }

        .volume-label {
            color: #666;
            font-size: 0.9em;
            margin-bottom: 5px;
        }

        .volume-value {
            font-size: 1.2em;
            font-weight: bold;
            color: #2196F3;
        }

        .volume-value.positive {
            color: #4CAF50;
        }

        .volume-value.negative {
            color: #f44336;
        }

        .search-section {
            margin-bottom: 20px;
        }

        .search-input {
            width: 100%;
            padding: 10px 15px;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            font-size: 1em;
            transition: all 0.3s ease;
        }

        .search-input:focus {
            outline: none;
            border-color: #2196F3;
            box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
        }

        .agency-service-info {
            background: #e3f2fd;
            border-radius: 6px;
            padding: 10px;
            margin-bottom: 15px;
        }

        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
        }

        .info-row:last-child {
            margin-bottom: 0;
        }

        .info-row .label {
            font-weight: bold;
            color: #1976D2;
        }

        .info-row .value {
            color: #333;
        }

        .agency-summary-section {
            padding: 20px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .summary-header {
            margin-bottom: 20px;
            padding-bottom: 20px;
            border-bottom: 1px solid #dee2e6;
        }

        .summary-header h3 {
            color: #1976D2;
            margin: 0 0 15px 0;
            font-size: 1.4em;
        }

        .summary-actions {
            margin-bottom: 15px;
            text-align: right;
        }

        .summary-stats {
            display: flex;
            gap: 30px;
            margin-top: 15px;
        }

        .stat-item {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .stat-item .label {
            color: #666;
            font-weight: 500;
        }

        .stat-item .value {
            font-size: 1.2em;
            font-weight: bold;
            color: #1976D2;
        }

        .summary-table {
            margin: 20px 0;
            overflow-x: auto;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            background: white;
        }

        th {
            background: #f8f9fa;
            padding: 12px 15px;
            text-align: left;
            font-weight: 600;
            color: #495057;
            border-bottom: 2px solid #dee2e6;
        }

        td {
            padding: 12px 15px;
            border-bottom: 1px solid #dee2e6;
        }

        .volume-cell {
            text-align: right;
            font-weight: 500;
            color: #1976D2;
        }

        .count-cell {
            text-align: center;
            font-weight: 500;
        }

        tbody tr:hover {
            background-color: #f8f9fa;
        }

        .pagination-controls {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 15px;
            margin-top: 20px;
        }

        .pagination-controls button {
            padding: 8px 16px;
            border: 1px solid #dee2e6;
            background: white;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .pagination-controls button:hover:not(:disabled) {
            background: #1976D2;
            color: white;
            border-color: #1976D2;
        }

        .pagination-controls button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .pagination-controls span {
            color: #666;
        }

        .summary-tables-row {
            display: flex;
            gap: 40px;
            margin-bottom: 20px;
        }
        .summary-table-agency, .summary-table-service {
            flex: 1;
        }
        .summary-table-agency table, .summary-table-service table {
            width: 100%;
            border-collapse: collapse;
            background: #f8f9fa;
        }
        .summary-table-agency th, .summary-table-service th {
            background: #e3f2fd;
            padding: 8px 10px;
            text-align: left;
            font-weight: 600;
            color: #1976D2;
            border-bottom: 2px solid #dee2e6;
        }
        .summary-table-agency td, .summary-table-service td {
            padding: 8px 10px;
            border-bottom: 1px solid #dee2e6;
        }

        .non-matching-summary {
            margin-top: 20px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }

        .non-matching-section {
            background: white;
            border-radius: 8px;
            padding: 15px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .non-matching-section h4 {
            color: #1976D2;
            margin: 0 0 15px 0;
            padding-bottom: 10px;
            border-bottom: 1px solid #dee2e6;
        }

        .non-matching-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .non-matching-item {
            background: #f8f9fa;
            border-radius: 6px;
            padding: 10px;
            border: 1px solid #dee2e6;
        }

        .item-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
            font-weight: 500;
        }

        .item-details {
            font-size: 0.9em;
            color: #666;
        }

        .detail-item {
            display: block;
            margin: 2px 0;
        }

        .view-more {
            text-align: center;
            margin-top: 10px;
            display: flex;
            justify-content: center;
            gap: 10px;
        }

        .view-more button {
            background: #e3f2fd;
            color: #1976D2;
            border: 1px solid #1976D2;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .view-more button:hover {
            background: #1976D2;
            color: white;
        }

        .view-more .export-btn {
            background: #4CAF50;
            color: white;
            border-color: #4CAF50;
        }

        .view-more .export-btn:hover {
            background: #45a049;
            border-color: #45a049;
        }

        .agency {
            color: #1976D2;
            font-weight: 500;
        }

        .service {
            color: #666;
        }

        .volume {
            color: #4CAF50;
            font-weight: 500;
        }

        .date {
            color: #666;
            font-size: 0.9em;
        }

        .service-selector {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 1rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .service-selector h3 {
            margin: 0 0 1rem 0;
            color: #2c3e50;
        }

        .service-selector-content {
            display: flex;
            gap: 1rem;
            align-items: center;
        }

        .service-select {
            flex: 1;
            padding: 0.5rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 1rem;
            background-color: white;
        }

        .reconcile-button {
            padding: 0.5rem 1rem;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1rem;
            transition: background-color 0.2s;
        }

        .reconcile-button:hover {
            background-color: #0056b3;
        }

        .save-button {
            background-color: #4CAF50;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: background-color 0.3s;
        }

        .save-button:hover {
            background-color: #45a049;
        }

        .save-button:active {
            background-color: #3d8b40;
        }

        .refined-info {
            background: #f7f7f7;
            border-radius: 6px;
            padding: 8px 12px;
            margin-bottom: 8px;
            display: flex;
            gap: 24px;
            font-weight: 500;
        }
        .refined-info .info-row {
            margin-bottom: 0;
        }
        .refined-grid .data-row {
            padding: 2px 0;
        }

        .date-selector {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-right: 15px;
        }

        .date-selector label {
            font-weight: 500;
            color: #666;
        }

        .date-selector input {
            padding: 8px;
            border: 1px solid #dee2e6;
            border-radius: 4px;
        }

        .summary-actions {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .action-buttons {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-top: 20px;
        }

        .export-btn, .new-reconciliation-btn, .stats-btn {
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1em;
            transition: all 0.3s ease;
        }

        .export-btn {
            background: #2196F3;
            color: white;
        }

        .export-btn:hover {
            background: #1976D2;
        }

        .export-btn-optimized {
            background: linear-gradient(45deg, #FF6B35, #F7931E);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1em;
            transition: all 0.3s ease;
            margin-left: 10px;
        }

        .export-btn-optimized:hover {
            background: linear-gradient(45deg, #E55A2B, #E8821A);
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(255, 107, 53, 0.3);
        }

        .export-btn-optimized:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }

        .new-reconciliation-btn {
            background: #4CAF50;
            color: white;
        }

        .new-reconciliation-btn:hover {
            background: #388E3C;
        }

        .stats-btn {
            background: #FF9800;
            color: white;
        }

        .stats-btn:hover {
            background: #F57C00;
        }

        .export-btn:disabled, .new-reconciliation-btn:disabled, .stats-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
        }

        .export-button {
            background-color: #4CAF50;
            color: white;
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            margin-left: 10px;
            display: flex;
            align-items: center;
            gap: 5px;
            transition: background-color 0.3s;
        }

        .export-button:hover {
            background-color: #45a049;
        }

        .export-button:active {
            background-color: #3d8b40;
        }

        .search-section {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 20px;
        }

        .export-progress {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 1000;
            text-align: center;
        }

        .progress-bar {
            width: 300px;
            height: 20px;
            background-color: #f0f0f0;
            border-radius: 10px;
            overflow: hidden;
            margin-bottom: 10px;
        }

        .progress {
            height: 100%;
            background-color: #4CAF50;
            transition: width 0.3s ease;
        }

        .progress-text {
            font-size: 14px;
            color: #666;
        }

        /* Styles pour les doublons TSOP */
        .tsop-duplicate {
            background-color: #ff4444 !important;
            color: white !important;
            font-weight: bold;
        }

        .tsop-duplicate td {
            background-color: #ff4444 !important;
            color: white !important;
            border-color: #ff2222 !important;
        }

        /* Styles pour IMPACT sans FRAIS */
        .tsop-sans-frais {
            background-color: #ffeb3b !important;
            color: #333 !important;
            font-weight: bold;
        }

        .tsop-sans-frais td {
            background-color: #ffeb3b !important;
            color: #333 !important;
            border-color: #ffc107 !important;
        }

        .tsop-comment {
            font-weight: bold;
            text-align: center;
        }
    `]
})
export class ReconciliationResultsComponent implements OnInit, OnDestroy {
    response: ReconciliationResponse | null = null;
    private subscription = new Subscription();
    activeTab: 'matches' | 'boOnly' | 'partnerOnly' | 'agencySummary' = 'matches';
    matchesPage = 1;
    boOnlyPage = 1;
    partnerOnlyPage = 1;
    readonly pageSize = 5;
    searchKey: string = '';
    filteredMatches: Match[] = [];
    filteredBoOnly: Record<string, string>[] = [];
    filteredPartnerOnly: Record<string, string>[] = [];
    agencyPage = 1;
    readonly agencyPageSize = 10;
    selectedService: string = '';
    selectedDate: string = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Cache pour optimiser les performances
    private agencyServiceCache = new Map<string, { agency: string; service: string; volume: number; date: string; country: string }>();
    isSaving: boolean = false;
    isSavingEcartBo: boolean = false;
    
    isSavingEcartPartner: boolean = false;
    isSavingEcartBoToTrxSf: boolean = false;
    isSavingEcartPartnerToTrxSf: boolean = false;
    isSavingEcartPartnerToImpactOP: boolean = false;
    exportProgress = 0;
    isExporting = false;
    
    // Propriétés pour l'export optimisé
    exportProgressOptimized: ExportProgress = {
        current: 0,
        total: 0,
        percentage: 0,
        message: '',
        isComplete: false
    };
    
    // Propriétés pour la progression de la réconciliation
    showProgress = false;
    progressPercentage = 0;
    processedRecords = 0;
    totalRecords = 0;
    executionTime = 0;
    startTime = 0;
    
    // Propriétés pour la sélection des colonnes
    showColumnSelector = false;
    availableColumns: string[] = [];
    selectedColumns: { [key: string]: boolean } = {};
    defaultColumns = ['Service', 'téléphone client', 'montant', 'Agence', 'Date', 'HEURE', 'SOURCE'];

    // Ajout pour sélection Résumé par Agence
    selectedAgencySummaries: string[] = [];
    get allAgencySelected(): boolean {
        return this.getPagedAgencySummary().length > 0 && this.getPagedAgencySummary().every(s => this.isAgencySelected(s));
    }
    isAgencySelected(summary: any): boolean {
        return this.selectedAgencySummaries.includes(this.getAgencyKey(summary));
    }
    toggleAgencySelection(summary: any, event: any): void {
        const key = this.getAgencyKey(summary);
        if (event.target.checked) {
            if (!this.selectedAgencySummaries.includes(key)) {
                this.selectedAgencySummaries.push(key);
            }
        } else {
            this.selectedAgencySummaries = this.selectedAgencySummaries.filter(sel => sel !== key);
        }
    }
    toggleSelectAllAgency(event: any): void {
        const pageKeys = this.getPagedAgencySummary().map(s => this.getAgencyKey(s));
        if (event.target.checked) {
            this.selectedAgencySummaries = Array.from(new Set([...this.selectedAgencySummaries, ...pageKeys]));
        } else {
            this.selectedAgencySummaries = this.selectedAgencySummaries.filter(sel => !pageKeys.includes(sel));
        }
    }
    saveSelectedAgency(): void {
        // Récupérer tous les résumés (toutes pages si besoin)
        const allSummaries = this.getAgencySummary();
        const selected = allSummaries.filter(s => this.selectedAgencySummaries.includes(this.getAgencyKey(s)));
        console.log('Lignes sélectionnées à enregistrer :', selected);
        // Ici, tu peux appeler une API ou autre logique
    }

    // Sélection pour ECART Partenaire (Import OP)
    selectedPartnerOnlyKeys: string[] = [];
    private getPartnerOnlyKey(record: Record<string, string>): string {
        const numeroTrans = (record['Numéro Trans GU'] || record['Numero Trans GU'] || record['numeroTransGU'] || record['numero_trans_gu'] || '').toString();
        const idOperation = (record['ID Opération'] || record['ID Operation'] || record['id_operation'] || '').toString();
        const dateOp = (record['Date opération'] || record['dateOperation'] || record['date_operation'] || record['Date'] || '').toString();
        const montant = (record['Montant'] || record['montant'] || record['amount'] || '').toString();
        return [numeroTrans, idOperation, dateOp, montant].join('|');
    }
    isPartnerRecordSelected(record: Record<string, string>): boolean {
        return this.selectedPartnerOnlyKeys.includes(this.getPartnerOnlyKey(record));
    }
    togglePartnerSelection(record: Record<string, string>, event: any): void {
        const key = this.getPartnerOnlyKey(record);
        if (event.target.checked) {
            if (!this.selectedPartnerOnlyKeys.includes(key)) {
                this.selectedPartnerOnlyKeys.push(key);
            }
        } else {
            this.selectedPartnerOnlyKeys = this.selectedPartnerOnlyKeys.filter(k => k !== key);
        }
    }
    get allPartnerSelectedOnPage(): boolean {
        const page = this.getPagedPartnerOnly();
        return page.length > 0 && page.every(r => this.isPartnerRecordSelected(r));
    }
    toggleSelectAllPartnerOnPage(event: any): void {
        const page = this.getPagedPartnerOnly();
        const pageKeys = page.map(r => this.getPartnerOnlyKey(r));
        if (event.target.checked) {
            this.selectedPartnerOnlyKeys = Array.from(new Set([...this.selectedPartnerOnlyKeys, ...pageKeys]));
        } else {
            this.selectedPartnerOnlyKeys = this.selectedPartnerOnlyKeys.filter(k => !pageKeys.includes(k));
        }
    }

    async saveEcartBoToEcartSolde(): Promise<void> {
        if (!this.response?.boOnly || this.response.boOnly.length === 0) {
            this.popupService.showWarning('❌ Aucune donnée ECART BO à sauvegarder.');
            return;
        }

        this.isSavingEcartBo = true;

        try {
            console.log('🔄 Début de la sauvegarde des ECART BO...');
            console.log('DEBUG: Nombre d\'enregistrements ECART BO:', this.response.boOnly.length);

            // Debug: Afficher les colonnes disponibles dans le premier enregistrement
            if (this.response.boOnly.length > 0) {
                console.log('DEBUG: Colonnes disponibles dans ECART BO:', Object.keys(this.response.boOnly[0]));
                console.log('DEBUG: Premier enregistrement ECART BO:', this.response.boOnly[0]);
            }

            // Convertir les données ECART BO en format EcartSolde
            const ecartSoldeData: EcartSolde[] = this.response.boOnly.map((record, index) => {
                const getValueWithFallback = (keys: string[]): string => {
                    for (const key of keys) {
                        if (record[key] !== undefined && record[key] !== null && record[key] !== '') {
                            return record[key].toString();
                        }
                    }
                    return '';
                };

                // Debug: Afficher les colonnes disponibles pour cet enregistrement
                console.log(`DEBUG: Enregistrement ${index + 1} - Colonnes disponibles:`, Object.keys(record));
                console.log(`DEBUG: Enregistrement ${index + 1} - Données brutes:`, record);

                // Extraire les informations d'agence et de service
                const agencyInfo = this.getBoOnlyAgencyAndService(record);
                
                // Fonction helper pour formater la date au format ISO
                const formatDateForBackend = (dateStr: string): string => {
                    if (!dateStr) return '';
                    
                    // Si la date est déjà au format ISO, la retourner
                    if (dateStr.includes('T')) return dateStr;
                    
                    // Convertir le format "2025-07-09 12:40:18.0" en "2025-07-09T12:40:18"
                    const cleanedDate = dateStr.replace(/\.\d+$/, ''); // Enlever les millisecondes
                    return cleanedDate.replace(' ', 'T');
                };

                // Créer l'objet EcartSolde avec les données mappées
                const ecartSolde: EcartSolde = {
                    id: undefined, // Sera généré par la base de données
                    idTransaction: getValueWithFallback(['ID Transaction', 'IDTransaction', 'id_transaction', 'ID_TRANSACTION', 'transaction_id', 'TransactionId']),
                    telephoneClient: getValueWithFallback(['t l phone client', 'téléphone client', 'telephone_client', 'TELEPHONE_CLIENT', 'phone', 'Phone']),
                    montant: parseFloat(getValueWithFallback(['montant', 'Montant', 'MONTANT', 'amount', 'Amount', 'volume', 'Volume'])) || 0,
                    service: agencyInfo.service,
                    agence: agencyInfo.agency,
                    dateTransaction: formatDateForBackend(agencyInfo.date),
                    numeroTransGu: getValueWithFallback(['Numero Trans GU', 'Numéro Trans GU', 'numero_trans_gu', 'NUMERO_TRANS_GU', 'transaction_number', 'TransactionNumber']),
                    pays: agencyInfo.country,
                    statut: 'EN_ATTENTE', // Statut par défaut
                    commentaire: 'IMPACT J+1', // Commentaire par défaut
                    dateImport: new Date().toISOString()
                };

                console.log(`DEBUG: Enregistrement ${index + 1} préparé:`, {
                    idTransaction: ecartSolde.idTransaction,
                    agence: ecartSolde.agence,
                    service: ecartSolde.service,
                    montant: ecartSolde.montant,
                    agencyInfo: agencyInfo
                });

                return ecartSolde;
            });

            console.log('DEBUG: Données converties en format EcartSolde:', ecartSoldeData.length, 'enregistrements');

            // Validation des données avant sauvegarde
            console.log('DEBUG: Validation des données - Nombre total d\'enregistrements:', ecartSoldeData.length);
            
            // Log détaillé de chaque enregistrement pour le débogage
            ecartSoldeData.forEach((record, index) => {
                console.log(`DEBUG: Enregistrement ${index + 1} - Validation:`, {
                    idTransaction: record.idTransaction,
                    idTransactionValid: record.idTransaction && record.idTransaction.trim() !== '',
                    agence: record.agence,
                    agenceValid: record.agence && record.agence.trim() !== '',
                    isValid: (record.idTransaction && record.idTransaction.trim() !== '') && (record.agence && record.agence.trim() !== '')
                });
            });

            const validRecords = ecartSoldeData.filter(record => 
                record.idTransaction && 
                record.idTransaction.trim() !== '' && 
                record.agence && 
                record.agence.trim() !== ''
            );

            console.log('DEBUG: Nombre d\'enregistrements valides après filtrage:', validRecords.length);

            if (validRecords.length === 0) {
                console.error('DEBUG: Aucun enregistrement valide trouvé. Raisons possibles:');
                console.error('- idTransaction manquant ou vide');
                console.error('- agence manquante ou vide');
                console.error('- Colonnes non trouvées dans les données source');
                this.popupService.showWarning('❌ Aucune donnée valide trouvée pour la sauvegarde.');
                return;
            }

            console.log('DEBUG: Enregistrements valides pour sauvegarde:', validRecords.length);

            // Créer le contenu CSV pour validation
            const csvContent = this.createCsvContent(validRecords);
            console.log('DEBUG: Contenu CSV généré pour validation');

            // Afficher un message de confirmation avec les détails
            const message = `📋 RÉSUMÉ DES DONNÉES À SAUVEGARDER:\n\n` +
                `📊 Total des enregistrements ECART BO: ${this.response.boOnly.length}\n` +
                `✅ Enregistrements valides: ${validRecords.length}\n` +
                `❌ Enregistrements invalides: ${ecartSoldeData.length - validRecords.length}\n\n` +
                `📝 Commentaire par défaut: "IMPACT J+1"\n` +
                `🔄 Les doublons seront automatiquement ignorés.\n\n` +
                `Voulez-vous continuer avec la sauvegarde ?`;

            const confirmed = await this.popupService.showConfirm(message, 'Confirmation de sauvegarde');
            if (!confirmed) {
                console.log('❌ Sauvegarde annulée par l\'utilisateur');
                return;
            }

            console.log('✅ Confirmation utilisateur reçue, début de la sauvegarde...');
            
            // Sauvegarder les données via le service
            const result = await this.ecartSoldeService.createMultipleEcartSoldes(validRecords);
            
            console.log('=== RÉSULTATS DE LA SAUVEGARDE ===');
            console.log('DEBUG: Enregistrements reçus:', result.totalReceived);
            console.log('DEBUG: Enregistrements créés:', result.count);
            console.log('DEBUG: Doublons ignorés:', result.duplicates);
            console.log('DEBUG: Message:', result.message);
            
            // Afficher un message de succès détaillé
            let successMessage = `✅ SAUVEGARDE TERMINÉE AVEC SUCCÈS!\n\n`;
            successMessage += `📊 RÉSUMÉ:\n`;
            successMessage += `• Enregistrements traités: ${result.totalReceived}\n`;
            successMessage += `• Nouveaux enregistrements créés: ${result.count}\n`;
            successMessage += `• Doublons ignorés: ${result.duplicates}\n\n`;
            successMessage += `💾 Les données ont été sauvegardées dans la table Ecart Solde.`;
            
            this.popupService.showSuccess(successMessage);
            
        } catch (error: any) {
            console.error('❌ Erreur lors de la sauvegarde des ECART BO:', error);
            
            let errorMessage = '❌ Erreur lors de la sauvegarde des ECART BO.\n\n';
            if (error.error?.error) {
                errorMessage += `Détails: ${error.error.error}`;
            } else if (error.message) {
                errorMessage += `Détails: ${error.message}`;
            } else {
                errorMessage += 'Veuillez réessayer.';
            }
            
            this.popupService.showError(errorMessage);
        } finally {
            this.isSavingEcartBo = false;
        }
    }

    async saveEcartBoToTrxSf(): Promise<void> {
        if (!this.response?.boOnly || this.response.boOnly.length === 0) {
            this.popupService.showWarning('❌ Aucune donnée ECART BO à sauvegarder dans TRX SF.');
            return;
        }

        this.isSavingEcartBoToTrxSf = true;

        try {
            console.log('🔄 Début de la sauvegarde des ECART BO dans TRX SF...');
            console.log('DEBUG: Nombre d\'enregistrements ECART BO:', this.response.boOnly.length);

            // Convertir les données ECART BO en format TrxSfData avec récupération des frais
            const trxSfDataPromises = this.response.boOnly.map(async (record, index) => {
                const getValueWithFallback = (keys: string[]): string => {
                    for (const key of keys) {
                        if (record[key] !== undefined && record[key] !== null && record[key] !== '') {
                            return record[key].toString();
                        }
                    }
                    return '';
                };

                // Extraire les informations d'agence et de service
                const agencyInfo = this.getBoOnlyAgencyAndService(record);
                
                // Fonction helper pour formater la date au format ISO
                const formatDateForBackend = (dateStr: string): string => {
                    if (!dateStr) return '';
                    
                    // Si la date est déjà au format ISO, la retourner
                    if (dateStr.includes('T')) return dateStr;
                    
                    // Convertir le format "2025-07-09 12:40:18.0" en "2025-07-09T12:40:18"
                    const cleanedDate = dateStr.replace(/\.\d+$/, ''); // Enlever les millisecondes
                    return cleanedDate.replace(' ', 'T');
                };

                // Calculer automatiquement les frais selon la configuration du service
                let frais = 0;
                try {
                    // Récupérer la configuration des frais pour le service
                    const fraisConfigResponse = await this.trxSfService.getFraisConfigByService(agencyInfo.service).toPromise();
                    const fraisConfig = fraisConfigResponse;
                    
                    if (fraisConfig && fraisConfig.typeFrais) {
                        if (fraisConfig.typeFrais === 'NOMINAL' || fraisConfig.typeFrais === 'FIXE') {
                            // Frais fixe : on prend le montant configuré
                            frais = fraisConfig.montant || 0;
                            console.log(`💰 Frais fixe configuré pour ${agencyInfo.service}: ${frais}`);
                        } else if (fraisConfig.typeFrais === 'POURCENTAGE') {
                            // Frais en pourcentage : on applique le pourcentage sur le montant
                            const pourcentage = fraisConfig.pourcentage || 0;
                            frais = (agencyInfo.volume * pourcentage) / 100;
                            console.log(`📊 Frais pourcentage configuré pour ${agencyInfo.service}: ${pourcentage}% sur ${agencyInfo.volume} = ${frais}`);
                        }
                    } else {
                        // Pas de configuration, frais à 0 par défaut
                        frais = 0;
                        console.log(`⚠️ Pas de configuration de frais pour ${agencyInfo.service}, frais à 0`);
                    }
                    
                    console.log(`✅ Frais calculés pour ${agencyInfo.agency}:`);
                    console.log(`   - Service: ${agencyInfo.service}`);
                    console.log(`   - Montant transaction: ${agencyInfo.volume}`);
                    console.log(`   - Frais calculés: ${frais}`);
                    console.log(`   - Configuration:`, fraisConfig);
                } catch (configError) {
                    console.warn(`⚠️ Erreur lors de la récupération de la config des frais pour ${agencyInfo.service}:`, configError);
                    frais = 0; // Frais par défaut en cas d'erreur
                }

                // Créer l'objet TrxSfData avec les données mappées
                const trxSf: any = {
                    idTransaction: getValueWithFallback(['IDTransaction', 'id_transaction', 'ID_TRANSACTION', 'transaction_id', 'TransactionId']),
                    telephoneClient: getValueWithFallback(['téléphone client', 'telephone_client', 'TELEPHONE_CLIENT', 'phone', 'Phone']),
                    montant: parseFloat(getValueWithFallback(['montant', 'Montant', 'MONTANT', 'amount', 'Amount', 'volume', 'Volume'])) || 0,
                    service: agencyInfo.service,
                    agence: agencyInfo.agency,
                    dateTransaction: formatDateForBackend(agencyInfo.date),
                    numeroTransGu: getValueWithFallback(['Numéro Trans GU', 'numero_trans_gu', 'NUMERO_TRANS_GU', 'transaction_number', 'TransactionNumber']),
                    pays: agencyInfo.country,
                    statut: 'EN_ATTENTE',
                    frais: frais, // Frais récupérés depuis l'API
                    commentaire: 'ECART BO - Importé depuis la réconciliation avec frais TSOP',
                    dateImport: new Date().toISOString()
                };

                console.log(`DEBUG: Enregistrement ${index + 1} préparé pour TRX SF:`, {
                    idTransaction: trxSf.idTransaction,
                    agence: trxSf.agence,
                    service: trxSf.service,
                    montant: trxSf.montant,
                    frais: trxSf.frais,
                    agencyInfo: agencyInfo
                });

                return trxSf;
            });

            // Attendre que toutes les promesses soient résolues
            const trxSfData = await Promise.all(trxSfDataPromises);

            console.log('DEBUG: Données converties en format TrxSfData avec frais:', trxSfData.length, 'enregistrements');

            // Validation des données avant sauvegarde
            const validRecords = trxSfData.filter(record => 
                record.idTransaction && 
                record.idTransaction.trim() !== '' && 
                record.agence && 
                record.agence.trim() !== ''
            );

            console.log('DEBUG: Nombre d\'enregistrements valides après filtrage:', validRecords.length);

            if (validRecords.length === 0) {
                this.popupService.showWarning('❌ Aucun enregistrement valide trouvé pour la sauvegarde dans TRX SF.');
                return;
            }

            // Sauvegarder les données dans TRX SF
            console.log('🔄 Sauvegarde des données dans TRX SF avec frais TSOP...');
            
            // Appeler le service pour sauvegarder les données
            const result = await this.trxSfService.createMultipleTrxSf(validRecords).toPromise();
            
            console.log('✅ Sauvegarde dans TRX SF terminée avec succès:', result);
            
            // Afficher un message de succès
            this.popupService.showSuccess(`✅ ${validRecords.length} enregistrements ECART BO ont été sauvegardés dans TRX SF avec frais TSOP !`);

        } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde dans TRX SF:', error);
            
            let errorMessage = 'Erreur lors de la sauvegarde dans TRX SF';
            if (error && typeof error === 'object') {
                const errorObj = error as any;
                if (errorObj.error && typeof errorObj.error === 'object') {
                    errorMessage = errorObj.error.message || errorObj.error.details || errorMessage;
                } else if (errorObj.message) {
                    errorMessage = errorObj.message;
                }
            }
            
            this.popupService.showError(`❌ ${errorMessage}`);
                    } finally {
                this.isSavingEcartBoToTrxSf = false;
            }
        }
    
        async saveEcartPartnerToTrxSf(): Promise<void> {
            if (!this.response?.partnerOnly || this.response.partnerOnly.length === 0) {
                this.popupService.showWarning('❌ Aucune donnée ECART Partenaire à sauvegarder dans TRX SF.');
                return;
            }

        this.isSavingEcartPartnerToTrxSf = true;

        try {
            console.log('🔄 Début de la sauvegarde des ECART Partenaire dans TRX SF...');
            console.log('DEBUG: Nombre d\'enregistrements ECART Partenaire:', this.response.partnerOnly.length);

            // Convertir les données ECART Partenaire en format TrxSfData avec récupération des frais
            const trxSfDataPromises = this.response.partnerOnly.map(async (record, index) => {
                const getValueWithFallback = (keys: string[]): string => {
                    for (const key of keys) {
                        if (record[key] !== undefined && record[key] !== null && record[key] !== '') {
                            return record[key].toString();
                        }
                    }
                    return '';
                };

                // Extraire les informations d'agence et de service
                const agencyInfo = this.getPartnerOnlyAgencyAndService(record);
                
                // Fonction helper pour formater la date au format ISO
                const formatDateForBackend = (dateStr: string): string => {
                    if (!dateStr) return '';
                    
                    // Si la date est déjà au format ISO, la retourner
                    if (dateStr.includes('T')) return dateStr;
                    
                    // Convertir le format "2025-07-09 12:40:18.0" en "2025-07-09T12:40:18"
                    const cleanedDate = dateStr.replace(/\.\d+$/, ''); // Enlever les millisecondes
                    return cleanedDate.replace(' ', 'T');
                };

                // Calculer automatiquement les frais selon la configuration du service
                let frais = 0;
                try {
                    // Récupérer la configuration des frais pour le service
                    const fraisConfigResponse = await this.trxSfService.getFraisConfigByService(agencyInfo.service).toPromise();
                    const fraisConfig = fraisConfigResponse;
                    
                    if (fraisConfig && fraisConfig.typeFrais) {
                        if (fraisConfig.typeFrais === 'NOMINAL' || fraisConfig.typeFrais === 'FIXE') {
                            // Frais fixe : on prend le montant configuré
                            frais = fraisConfig.montant || 0;
                            console.log(`💰 Frais fixe configuré pour ${agencyInfo.service}: ${frais}`);
                        } else if (fraisConfig.typeFrais === 'POURCENTAGE') {
                            // Frais en pourcentage : on applique le pourcentage sur le montant
                            const pourcentage = fraisConfig.pourcentage || 0;
                            frais = (agencyInfo.volume * pourcentage) / 100;
                            console.log(`📊 Frais pourcentage configuré pour ${agencyInfo.service}: ${pourcentage}% sur ${agencyInfo.volume} = ${frais}`);
                        }
                    } else {
                        // Pas de configuration, frais à 0 par défaut
                        frais = 0;
                        console.log(`⚠️ Pas de configuration de frais pour ${agencyInfo.service}, frais à 0`);
                    }
                    
                    console.log(`✅ Frais calculés pour ${agencyInfo.agency}:`);
                    console.log(`   - Service: ${agencyInfo.service}`);
                    console.log(`   - Montant transaction: ${agencyInfo.volume}`);
                    console.log(`   - Frais calculés: ${frais}`);
                    console.log(`   - Configuration:`, fraisConfig);
                } catch (configError) {
                    console.warn(`⚠️ Erreur lors de la récupération de la config des frais pour ${agencyInfo.service}:`, configError);
                    frais = 0; // Frais par défaut en cas d'erreur
                }

                // Créer l'objet TrxSfData avec les données mappées
                const trxSf: any = {
                    idTransaction: getValueWithFallback(['IDTransaction', 'id_transaction', 'ID_TRANSACTION', 'transaction_id', 'TransactionId']),
                    telephoneClient: getValueWithFallback(['téléphone client', 'telephone_client', 'TELEPHONE_CLIENT', 'phone', 'Phone']),
                    montant: parseFloat(getValueWithFallback(['montant', 'Montant', 'MONTANT', 'amount', 'Amount', 'volume', 'Volume'])) || 0,
                    service: agencyInfo.service,
                    agence: agencyInfo.agency,
                    dateTransaction: formatDateForBackend(agencyInfo.date),
                    numeroTransGu: getValueWithFallback(['Numéro Trans GU', 'numero_trans_gu', 'NUMERO_TRANS_GU', 'transaction_number', 'TransactionNumber']),
                    pays: agencyInfo.country,
                    statut: 'EN_ATTENTE',
                    frais: frais, // Frais récupérés depuis l'API
                    commentaire: 'ECART PARTENAIRE - Importé depuis la réconciliation avec frais TSOP',
                    dateImport: new Date().toISOString()
                };

                console.log(`DEBUG: Enregistrement ${index + 1} préparé pour TRX SF:`, {
                    idTransaction: trxSf.idTransaction,
                    agence: trxSf.agence,
                    service: trxSf.service,
                    montant: trxSf.montant,
                    frais: trxSf.frais,
                    agencyInfo: agencyInfo
                });

                return trxSf;
            });

            // Attendre que toutes les promesses soient résolues
            const trxSfData = await Promise.all(trxSfDataPromises);

            console.log('DEBUG: Données converties en format TrxSfData avec frais:', trxSfData.length, 'enregistrements');

            // Validation des données avant sauvegarde
            const validRecords = trxSfData.filter(record => 
                record.idTransaction && 
                record.idTransaction.trim() !== '' && 
                record.agence && 
                record.agence.trim() !== ''
            );

            console.log('DEBUG: Nombre d\'enregistrements valides après filtrage:', validRecords.length);

            if (validRecords.length === 0) {
                this.popupService.showWarning('❌ Aucun enregistrement valide trouvé pour la sauvegarde dans TRX SF.');
                return;
            }

            // Sauvegarder les données dans TRX SF
            console.log('🔄 Sauvegarde des données dans TRX SF avec frais TSOP...');
            
            // Appeler le service pour sauvegarder les données
            const result = await this.trxSfService.createMultipleTrxSf(validRecords).toPromise();
            
            console.log('✅ Sauvegarde dans TRX SF terminée avec succès:', result);
            
            // Afficher un message de succès
            this.popupService.showSuccess(`✅ ${validRecords.length} enregistrements ECART Partenaire ont été sauvegardés dans TRX SF avec frais TSOP !`);

        } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde dans TRX SF:', error);
            
            let errorMessage = 'Erreur lors de la sauvegarde dans TRX SF';
            if (error && typeof error === 'object') {
                const errorObj = error as any;
                if (errorObj.error && typeof errorObj.error === 'object') {
                    errorMessage = errorObj.error.message || errorObj.error.details || errorMessage;
                } else if (errorObj.message) {
                    errorMessage = errorObj.message;
                }
            }
            
            this.popupService.showError(`❌ ${errorMessage}`);
        } finally {
            this.isSavingEcartPartnerToTrxSf = false;
        }
    }

    // Méthode helper pour créer le contenu CSV pour la validation
    private createCsvContent(ecartSoldeData: EcartSolde[]): string {
        const headers = ['ID', 'IDTransaction', 'téléphone client', 'montant', 'Service', 'Agence', 'Date', 'Numéro Trans GU', 'PAYS'];
        const csvRows = [headers.join(';')];
        
        ecartSoldeData.forEach((ecart, index) => {
            const row = [
                index + 1,
                ecart.idTransaction,
                ecart.telephoneClient,
                ecart.montant,
                ecart.service,
                ecart.agence,
                ecart.dateTransaction,
                ecart.numeroTransGu,
                ecart.pays
            ];
            csvRows.push(row.join(';'));
        });
        
        return csvRows.join('\n');
    }

    /**
     * Détermine la nature de l'écart partenaire
     */
    private determineEcartNature(record: Record<string, string>): string {
        // Vérifier le type d'opération
        const typeOperationKeys = ['Type Opération', 'Type opération', 'type_operation', 'TYPE_OPERATION', 'typeOperation'];
        const typeOperation = typeOperationKeys.find(key => {
            const value = record[key];
            return value !== undefined && value !== null && value !== '';
        });
        
        const typeOperationValue = typeOperation ? record[typeOperation] : '';
        
        // Vérifier s'il y a des frais
        const fraisKeys = ['Frais connexion', 'frais_connexion', 'FRAIS_CONNEXION', 'frais', 'Frais'];
        const hasFrais = fraisKeys.some(key => {
            const value = record[key];
            return value !== undefined && value !== null && value !== '' && parseFloat(value) > 0;
        });

        // Vérifier s'il y a une transaction
        const transactionKeys = ['ID Transaction', 'id_transaction', 'ID_TRANSACTION', 'transaction_id', 'TransactionId'];
        const hasTransaction = transactionKeys.some(key => {
            const value = record[key];
            return value !== undefined && value !== null && value !== '';
        });

        // Vérifier s'il y a un montant
        const montantKeys = ['Montant', 'montant', 'MONTANT', 'amount', 'Amount', 'volume', 'Volume'];
        const hasMontant = montantKeys.some(key => {
            const value = record[key];
            return value !== undefined && value !== null && value !== '' && parseFloat(value) > 0;
        });

        // Logique spéciale pour les cas de correspondance unique (écart partenaire)
        // Si une seule correspondance et type d'opération FRAIS_TRANSACTION -> "Régularisation FRAIS"
        // Si une seule correspondance avec autre type d'opération -> "SANS FRAIS"
        if (typeOperationValue && typeOperationValue.includes('FRAIS_TRANSACTION')) {
            console.log(`DEBUG: Type d'opération FRAIS_TRANSACTION détecté - Commentaire: "Régularisation FRAIS"`);
            return 'Régularisation FRAIS';
        }
        
        // Déterminer la nature de l'écart selon la logique standard
        if (!hasTransaction && !hasMontant) {
            return 'Ligne partenaire sans transaction ni montant';
        } else if (!hasTransaction) {
            return 'Ligne partenaire sans transaction';
        } else if (!hasFrais && hasMontant) {
            // Cas général avec une seule correspondance -> SANS FRAIS
            console.log(`DEBUG: Cas général sans frais détecté - Commentaire: "SANS FRAIS" - Type opération: ${typeOperationValue}`);
            return 'SANS FRAIS';
        } else if (!hasMontant) {
            return 'Ligne partenaire sans montant';
        } else {
            return 'Ligne partenaire avec écart non spécifié';
        }
    }

    async saveEcartPartnerToEcartSolde(): Promise<void> {
        if (!this.response?.partnerOnly || this.response.partnerOnly.length === 0) {
            this.popupService.showWarning('❌ Aucune donnée ECART Partenaire à sauvegarder.');
            return;
        }

        this.isSavingEcartPartner = true;

        try {
            console.log('🔄 Début de la sauvegarde des ECART Partenaire...');
            console.log('DEBUG: Nombre d\'enregistrements ECART Partenaire:', this.response.partnerOnly.length);

            // Debug: Afficher les colonnes disponibles dans le premier enregistrement
            if (this.response.partnerOnly.length > 0) {
                console.log('DEBUG: Colonnes disponibles dans ECART Partenaire:', Object.keys(this.response.partnerOnly[0]));
                console.log('DEBUG: Premier enregistrement ECART Partenaire:', this.response.partnerOnly[0]);
            }

            // Convertir les données ECART Partenaire en format EcartSolde
            const ecartSoldeData: EcartSolde[] = this.response.partnerOnly.map((record, index) => {
                const getValueWithFallback = (keys: string[]): string => {
                    for (const key of keys) {
                        if (record[key] !== undefined && record[key] !== null && record[key] !== '') {
                            return record[key].toString();
                        }
                    }
                    return '';
                };

                // Debug: Afficher les colonnes disponibles pour cet enregistrement
                console.log(`DEBUG: Enregistrement ${index + 1} - Colonnes disponibles:`, Object.keys(record));
                console.log(`DEBUG: Enregistrement ${index + 1} - Données brutes:`, record);

                // Extraire les informations d'agence et de service
                const agencyInfo = this.getPartnerOnlyAgencyAndService(record);
                
                // Déterminer la nature de l'écart
                const ecartNature = this.determineEcartNature(record);
                
                // Fonction helper pour formater la date au format ISO
                const formatDateForBackend = (dateStr: string): string => {
                    if (!dateStr) return '';
                    
                    // Si la date est déjà au format ISO, la retourner
                    if (dateStr.includes('T')) return dateStr;
                    
                    // Convertir le format "2025-07-09 12:40:18.0" en "2025-07-09T12:40:18"
                    const cleanedDate = dateStr.replace(/\.\d+$/, ''); // Enlever les millisecondes
                    return cleanedDate.replace(' ', 'T');
                };

                // Créer l'objet EcartSolde avec les données mappées
                const ecartSolde: EcartSolde = {
                    id: undefined, // Sera généré par la base de données
                    idTransaction: getValueWithFallback(['IDTransaction', 'id_transaction', 'ID_TRANSACTION', 'transaction_id', 'TransactionId']),
                    telephoneClient: getValueWithFallback(['téléphone client', 'telephone_client', 'TELEPHONE_CLIENT', 'phone', 'Phone']),
                    montant: parseFloat(getValueWithFallback(['montant', 'Montant', 'MONTANT', 'amount', 'Amount', 'volume', 'Volume'])) || 0,
                    service: agencyInfo.service,
                    agence: agencyInfo.agency,
                    dateTransaction: formatDateForBackend(agencyInfo.date),
                    numeroTransGu: getValueWithFallback(['Numéro Trans GU', 'numero_trans_gu', 'NUMERO_TRANS_GU', 'transaction_number', 'TransactionNumber']),
                    pays: agencyInfo.country,
                    statut: 'EN_ATTENTE', // Statut par défaut
                    commentaire: `IMPACT PARTENAIRE - ${ecartNature}`, // Commentaire avec nature de l'écart
                    dateImport: new Date().toISOString()
                };

                console.log(`DEBUG: Enregistrement ${index + 1} préparé:`, {
                    idTransaction: ecartSolde.idTransaction,
                    agence: ecartSolde.agence,
                    service: ecartSolde.service,
                    montant: ecartSolde.montant,
                    agencyInfo: agencyInfo
                });

                return ecartSolde;
            });

            console.log('DEBUG: Données converties en format EcartSolde:', ecartSoldeData.length, 'enregistrements');

            // Validation des données avant sauvegarde
            console.log('DEBUG: Validation des données - Nombre total d\'enregistrements:', ecartSoldeData.length);
            
            // Log détaillé de chaque enregistrement pour le débogage
            ecartSoldeData.forEach((record, index) => {
                console.log(`DEBUG: Enregistrement ${index + 1} - Validation:`, {
                    idTransaction: record.idTransaction,
                    idTransactionValid: record.idTransaction && record.idTransaction.trim() !== '',
                    agence: record.agence,
                    agenceValid: record.agence && record.agence.trim() !== '',
                    isValid: (record.idTransaction && record.idTransaction.trim() !== '') && (record.agence && record.agence.trim() !== '')
                });
            });

            const validRecords = ecartSoldeData.filter(record => 
                record.idTransaction && 
                record.idTransaction.trim() !== '' && 
                record.agence && 
                record.agence.trim() !== ''
            );

            console.log('DEBUG: Nombre d\'enregistrements valides après filtrage:', validRecords.length);

            if (validRecords.length === 0) {
                console.error('DEBUG: Aucun enregistrement valide trouvé. Raisons possibles:');
                console.error('- idTransaction manquant ou vide');
                console.error('- agence manquante ou vide');
                console.error('- Colonnes non trouvées dans les données source');
                this.popupService.showWarning('❌ Aucune donnée valide trouvée pour la sauvegarde.');
                return;
            }

            console.log('DEBUG: Enregistrements valides pour sauvegarde:', validRecords.length);

            // Analyser les types d'écarts
            const ecartTypes = new Map<string, number>();
            this.response.partnerOnly.forEach(record => {
                const ecartNature = this.determineEcartNature(record);
                ecartTypes.set(ecartNature, (ecartTypes.get(ecartNature) || 0) + 1);
            });

            // Créer le contenu CSV pour validation
            const csvContent = this.createCsvContent(validRecords);
            console.log('DEBUG: Contenu CSV généré pour validation');

            // Afficher un message de confirmation avec les détails
            let message = `📋 RÉSUMÉ DES DONNÉES À SAUVEGARDER:\n\n` +
                `📊 Total des enregistrements ECART Partenaire: ${this.response.partnerOnly.length}\n` +
                `✅ Enregistrements valides: ${validRecords.length}\n` +
                `❌ Enregistrements invalides: ${ecartSoldeData.length - validRecords.length}\n\n` +
                `🔍 RÉPARTITION DES TYPES D'ÉCARTS:\n`;
            
            ecartTypes.forEach((count, type) => {
                message += `• ${type}: ${count} enregistrement(s)\n`;
            });
            
            message += `\n📝 Commentaire: "IMPACT PARTENAIRE - [Nature de l'écart]"\n` +
                `🔄 Les doublons seront automatiquement ignorés.\n\n` +
                `Voulez-vous continuer avec la sauvegarde ?`;

            const confirmed = await this.popupService.showConfirm(message, 'Confirmation de sauvegarde');
            if (!confirmed) {
                console.log('❌ Sauvegarde annulée par l\'utilisateur');
                return;
            }

            console.log('✅ Confirmation utilisateur reçue, début de la sauvegarde...');
            
            // Sauvegarder les données via le service
            const result = await this.ecartSoldeService.createMultipleEcartSoldes(validRecords);
            
            console.log('=== RÉSULTATS DE LA SAUVEGARDE ===');
            console.log('DEBUG: Enregistrements reçus:', result.totalReceived);
            console.log('DEBUG: Enregistrements créés:', result.count);
            console.log('DEBUG: Doublons ignorés:', result.duplicates);
            console.log('DEBUG: Message:', result.message);
            
            // Afficher un message de succès détaillé
            let successMessage = `✅ SAUVEGARDE TERMINÉE AVEC SUCCÈS!\n\n`;
            successMessage += `📊 RÉSUMÉ:\n`;
            successMessage += `• Enregistrements traités: ${result.totalReceived}\n`;
            successMessage += `• Nouveaux enregistrements créés: ${result.count}\n`;
            successMessage += `• Doublons ignorés: ${result.duplicates}\n\n`;
            successMessage += `💾 Les données ont été sauvegardées dans la table Ecart Solde.`;
            
            this.popupService.showSuccess(successMessage);
            
        } catch (error: any) {
            console.error('❌ Erreur lors de la sauvegarde des ECART Partenaire:', error);
            
            let errorMessage = '❌ Erreur lors de la sauvegarde des ECART Partenaire.\n\n';
            if (error.error?.error) {
                errorMessage += `Détails: ${error.error.error}`;
            } else if (error.message) {
                errorMessage += `Détails: ${error.message}`;
            } else {
                errorMessage += 'Veuillez réessayer.';
            }
            
            this.popupService.showError(errorMessage);
        } finally {
            this.isSavingEcartPartner = false;
        }
    }

    async saveEcartPartnerToImpactOP(): Promise<void> {
        if (!this.response?.partnerOnly || this.response.partnerOnly.length === 0) {
            this.popupService.showWarning('❌ Aucune donnée ECART Partenaire à sauvegarder dans Import OP.');
            return;
        }

        this.isSavingEcartPartnerToImpactOP = true;

        try {
            console.log('🔄 Début de la sauvegarde des ECART Partenaire dans Import OP...');
            console.log('DEBUG: Nombre d\'enregistrements ECART Partenaire (total):', this.response.partnerOnly.length);

            // Déterminer la source: lignes sélectionnées ou tout le jeu de données
            const sourceRecords: Record<string, string>[] =
                this.selectedPartnerOnlyKeys.length > 0
                    ? (this.filteredPartnerOnly || []).filter(r => this.selectedPartnerOnlyKeys.includes(this.getPartnerOnlyKey(r)))
                    : (this.response.partnerOnly || []);

            if (sourceRecords.length === 0) {
                this.popupService.showWarning('❌ Aucune ligne sélectionnée pour la sauvegarde.');
                return;
            }

            console.log('DEBUG: Nombre d\'enregistrements à sauvegarder (sélection):', sourceRecords.length);

            // Convertir les données ECART Partenaire en format ImpactOP
            const impactOPData: ImpactOP[] = sourceRecords.map((record, index) => {
                const getValueWithFallback = (keys: string[]): string => {
                    for (const key of keys) {
                        if (record[key] !== undefined && record[key] !== null && record[key] !== '') {
                            return record[key].toString();
                        }
                    }
                    return '';
                };

                const getNumberWithFallback = (keys: string[]): number => {
                    const value = getValueWithFallback(keys);
                    const parsed = parseFloat(value.replace(/[^\d.-]/g, ''));
                    return isNaN(parsed) ? 0 : parsed;
                };

                // Construire la date d'opération au format LocalDateTime
                const dateOperationStr = getValueWithFallback(['Date opération', 'dateOperation', 'date_operation']);
                const dateOperation = dateOperationStr ? 
                    new Date(dateOperationStr).toISOString() : 
                    new Date().toISOString();

                return {
                    id: undefined, // Sera assigné par le backend
                    typeOperation: getValueWithFallback(['Type Opération', 'typeOperation', 'type_operation']) || 'DEPOT',
                    montant: getNumberWithFallback(['Montant', 'montant', 'amount']),
                    soldeAvant: getNumberWithFallback(['Solde avant', 'soldeAvant', 'solde_avant', 'Solde_avant']),
                    soldeApres: getNumberWithFallback(['Solde aprés', 'Solde après', 'soldeApres', 'solde_apres']),
                    codeProprietaire: getValueWithFallback(['Code propriétaire', 'Code proprietaire', 'codeProprietaire', 'code_proprietaire']) || 'UNKNOWN',
                    dateOperation: dateOperation,
                    numeroTransGU: getValueWithFallback(['Numéro Trans GU', 'numeroTransGU', 'numero_trans_gu']) || `GU-${Date.now()}-${index}`,
                    groupeReseau: (getValueWithFallback(['groupe de réseau', 'groupeReseau', 'groupe_reseau']) || 'DEFAULT').substring(0, 10),
                    statut: 'EN_ATTENTE',
                    commentaire: `Importé depuis ECART Partenaire - ${new Date().toLocaleString('fr-FR')}`,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                } as ImpactOP;
            });

            console.log('DEBUG: Données converties pour Import OP:', impactOPData.slice(0, 2));

            // Sauvegarder via le service Impact OP
            let successCount = 0;
            let errorCount = 0;

            for (const [index, impactOP] of impactOPData.entries()) {
                try {
                    console.log(`🔄 [${index + 1}/${impactOPData.length}] Tentative de création Impact OP:`, impactOP);
                    const result = await firstValueFrom(this.impactOPService.createImpactOP(impactOP));
                    successCount++;
                    console.log(`✅ [${index + 1}/${impactOPData.length}] Import OP créé avec succès:`, result);
                } catch (error: any) {
                    errorCount++;
                    console.error(`❌ [${index + 1}/${impactOPData.length}] Erreur détaillée lors de la création de l'Import OP:`, {
                        error,
                        status: error?.status,
                        statusText: error?.statusText,
                        message: error?.message,
                        errorDetails: error?.error,
                        impactOPData: impactOP
                    });
                }
            }

            if (successCount > 0) {
                this.popupService.showSuccess(`✅ Sauvegarde réussie !\n\n📊 Résumé:\n• ${successCount} Import OP créés avec succès\n• ${errorCount} erreurs\n\n💾 Les données ECART Partenaire ont été sauvegardées dans Import OP.`);
            } else {
                this.popupService.showError(`❌ Échec de la sauvegarde !\n\nAucun Import OP n'a pu être créé.\nVeuillez vérifier les logs de la console pour plus de détails.`);
            }

        } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde ECART Partenaire vers Import OP:', error);
            
            let errorMessage = '❌ Erreur lors de la sauvegarde dans Import OP.\n\n';
            
            if (error && typeof error === 'object') {
                const apiError = error as ApiError;
                if (apiError.error?.message) {
                    errorMessage += `Détails: ${apiError.error.message}`;
                } else if (apiError.message) {
                    errorMessage += `Détails: ${apiError.message}`;
                } else {
                    errorMessage += 'Erreur de communication avec le serveur.';
                }
            } else {
                errorMessage += 'Erreur inconnue.';
            }
            
            errorMessage += '\n\nVeuillez réessayer.';
            
            this.popupService.showError(errorMessage);
        } finally {
            this.isSavingEcartPartnerToImpactOP = false;
        }
    }

    constructor(
        private cdr: ChangeDetectorRef, 
        private appStateService: AppStateService, 
        private router: Router,
        private reconciliationService: ReconciliationService,
        private ecartSoldeService: EcartSoldeService,
        private trxSfService: TrxSfService,
        private impactOPService: ImpactOPService,
        private http: HttpClient,
        private popupService: PopupService,
        private exportOptimizationService: ExportOptimizationService,
        private reconciliationSummaryService: ReconciliationSummaryService,
        private reconciliationTabsService: ReconciliationTabsService
    ) {}

    ngOnInit() {
        console.log('🔄 ReconciliationResultsComponent - ngOnInit appelé');
        this.subscription.add(
            this.appStateService.getReconciliationResults().subscribe((response: ReconciliationResponse | null) => {
                console.log('📋 Données reçues dans ReconciliationResultsComponent:', response);
                if (response) {
                    console.log('✅ Données valides reçues, initialisation...');
                    this.response = response;
                    this.initializeFilteredData();
                    
                    // Vider le cache quand les données changent
                    this.agencyServiceCache.clear();
                    
                    // Initialiser les informations de progression
                    console.log('⏱️ Initialisation des temps d\'exécution...');
                    console.log('📊 response.executionTimeMs:', response.executionTimeMs);
                    
                    if (response.executionTimeMs) {
                        this.executionTime = response.executionTimeMs;
                    } else {
                        this.executionTime = 306; // Valeur par défaut
                    }
                    
                    console.log('⏱️ executionTime final:', this.executionTime);
                    
                    if (response.processedRecords) {
                        this.processedRecords = response.processedRecords;
                    }
                    if (response.progressPercentage) {
                        this.progressPercentage = response.progressPercentage;
                    }
                    
                    // Calculer le total des enregistrements
                    this.totalRecords = (response.totalBoRecords || 0) + (response.totalPartnerRecords || 0);
                    
                    // Si nous n'avons pas encore de totalRecords et que nous avons des données, les calculer
                    if (this.totalRecords === 0 && this.response) {
                        const boCount = this.response.boOnly ? this.response.boOnly.length : 0;
                        const partnerCount = this.response.partnerOnly ? this.response.partnerOnly.length : 0;
                        const matchesCount = this.response.matches ? this.response.matches.length : 0;
                        this.totalRecords = boCount + partnerCount + matchesCount;
                        console.log('📊 Calcul automatique du totalRecords:', this.totalRecords);
                    }
                    
                    this.cdr.detectChanges();
                    
                }
            })
        );

        // Écouter les changements de progression
        this.subscription.add(
            this.appStateService.getReconciliationProgress().subscribe((showProgress: boolean) => {
                this.showProgress = showProgress;
                if (showProgress) {
                    this.startTime = this.appStateService.getReconciliationStartTime();
                    this.progressPercentage = 0;
                    this.processedRecords = 0;
                    this.listenToRealProgress();
                }
                this.cdr.detectChanges();
            })
        );
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }

    private initializeFilteredData() {
        console.log('🔧 Initialisation des données filtrées...');
        console.log('📊 Response:', this.response);
        console.log('📊 Matches:', this.response?.matches);
        console.log('📊 BoOnly:', this.response?.boOnly);
        console.log('📊 PartnerOnly:', this.response?.partnerOnly);
        
        this.filteredMatches = this.getFilteredMatches();
        this.filteredBoOnly = this.getFilteredBoOnly();
        this.filteredPartnerOnly = this.getFilteredPartnerOnly();
        
        // Partager les données filtrées avec le service pour le rapport
        this.reconciliationTabsService.setFilteredMatches(this.filteredMatches);
        this.reconciliationTabsService.setFilteredBoOnly(this.filteredBoOnly);
        this.reconciliationTabsService.setFilteredPartnerOnly(this.filteredPartnerOnly);
        this.reconciliationTabsService.setFilteredMismatches(this.response?.mismatches || []);
        
        console.log('✅ Données filtrées initialisées:');
        console.log('📊 FilteredMatches:', this.filteredMatches.length);
        console.log('📊 FilteredBoOnly:', this.filteredBoOnly.length);
        console.log('📊 FilteredPartnerOnly:', this.filteredPartnerOnly.length);
        

    }

    onSearch() {
        const searchTerm = this.searchKey.toLowerCase();
        
        if (this.activeTab === 'matches') {
            this.filteredMatches = (this.response?.matches || []).filter(match => 
                match.key.toLowerCase().includes(searchTerm)
            );
            this.matchesPage = 1;
            // Partager les données filtrées
            this.reconciliationTabsService.setFilteredMatches(this.filteredMatches);
        } else if (this.activeTab === 'boOnly') {
            // Pour TRXBO/OPPART, utiliser mismatches au lieu de boOnly
            const mismatches = this.response?.mismatches || [];
            const boOnly = this.response?.boOnly || [];
            const allMismatches = [...mismatches, ...boOnly];
            
            this.filteredBoOnly = allMismatches.filter(record => 
                Object.values(record).some(value => 
                    value.toString().toLowerCase().includes(searchTerm)
                )
            );
            this.boOnlyPage = 1;
            // Partager les données filtrées
            this.reconciliationTabsService.setFilteredBoOnly(this.filteredBoOnly);
        } else if (this.activeTab === 'partnerOnly') {
            this.filteredPartnerOnly = (this.response?.partnerOnly || []).filter(record => 
                Object.values(record).some(value => 
                    value.toString().toLowerCase().includes(searchTerm)
                )
            );
            this.partnerOnlyPage = 1;
            // Partager les données filtrées
            this.reconciliationTabsService.setFilteredPartnerOnly(this.filteredPartnerOnly);
        }
        
        this.cdr.detectChanges();
    }

    // Modifier les méthodes de pagination pour utiliser les données filtrées
    getPagedMatches(): Match[] {
        const start = (this.matchesPage - 1) * this.pageSize;
        return this.filteredMatches.slice(start, start + this.pageSize);
    }

    getPagedBoOnly(): Record<string, string>[] {
        const start = (this.boOnlyPage - 1) * this.pageSize;
        return this.filteredBoOnly.slice(start, start + this.pageSize);
    }

    getPagedPartnerOnly(): Record<string, string>[] {
        const start = (this.partnerOnlyPage - 1) * this.pageSize;
        return this.filteredPartnerOnly.slice(start, start + this.pageSize);
    }

    getTotalPages(type: 'matches' | 'boOnly' | 'partnerOnly') {
        const data = type === 'matches' 
            ? this.filteredMatches 
            : type === 'boOnly' 
                ? this.filteredBoOnly 
                : this.filteredPartnerOnly;
        return Math.max(1, Math.ceil(data.length / this.pageSize));
    }

    setActiveTab(tab: 'matches' | 'boOnly' | 'partnerOnly' | 'agencySummary') {
        console.log('🔄 setActiveTab appelé avec:', tab);
        console.log('🔄 activeTab avant:', this.activeTab);
        this.activeTab = tab;
        console.log('🔄 activeTab après:', this.activeTab);
        this.agencyPage = 1;
        
        // Forcer la détection des changements
        setTimeout(() => {
            this.cdr.detectChanges();
            console.log('✅ Détection des changements forcée pour:', tab);
        }, 0);
        
        // Forcer un rechargement complet
        setTimeout(() => {
            this.cdr.markForCheck();
            this.cdr.detectChanges();
            console.log('✅ Rechargement complet forcé pour:', tab);
        }, 100);
        
        console.log('✅ setActiveTab terminé pour:', tab);
    }

    openReconciliationReport() {
        console.log('📈 Navigation vers le rapport de réconciliation...');
        this.router.navigate(['/reconciliation-report']);
    }

    nextPage(type: 'matches' | 'boOnly' | 'partnerOnly') {
        if (type === 'matches' && this.matchesPage < this.getTotalPages('matches')) this.matchesPage++;
        if (type === 'boOnly' && this.boOnlyPage < this.getTotalPages('boOnly')) this.boOnlyPage++;
        if (type === 'partnerOnly' && this.partnerOnlyPage < this.getTotalPages('partnerOnly')) this.partnerOnlyPage++;
        this.cdr.detectChanges();
    }

    prevPage(type: 'matches' | 'boOnly' | 'partnerOnly') {
        if (type === 'matches' && this.matchesPage > 1) this.matchesPage--;
        if (type === 'boOnly' && this.boOnlyPage > 1) this.boOnlyPage--;
        if (type === 'partnerOnly' && this.partnerOnlyPage > 1) this.partnerOnlyPage--;
        this.cdr.detectChanges();
    }

    getBoKeys(match: Match): string[] {
        // Détecter le type de données BO et appliquer le bon filtrage
        return this.getFilteredKeys(match.boData, 'bo');
    }

    getPartnerKeys(match: Match): string[] {
        // Détecter le type de données Partenaire et appliquer le bon filtrage
        return this.getFilteredKeys(match.partnerData, 'partner');
    }

    getRecordKeys(record: Record<string, string>): string[] {
        return Object.keys(record);
    }

    /**
     * Méthode intelligente pour filtrer les colonnes selon le type de données détecté
     */
    getFilteredKeys(record: Record<string, string>, dataType: 'bo' | 'partner'): string[] {
        const keys = Object.keys(record);
        
        // Détecter le type de données basé sur les colonnes présentes
        const isTRXBO = keys.some(key => ['IDTransaction', 'téléphone client', 'GRX'].includes(key));
        const isOPPART = keys.some(key => ['ID Opération', 'Type Opération', 'Solde avant', 'Solde aprés'].includes(key));
        const isUSSDPART = keys.some(key => ['Code service', 'Déstinataire', 'Token', 'SMS Action faite'].includes(key));
        
        // Définir les colonnes autorisées selon le type détecté
        let allowedColumns: string[] = [];
        
        if (isTRXBO) {
            // Colonnes TRXBO autorisées
            allowedColumns = [
                'ID',
                'IDTransaction',
                'téléphone client',
                'montant',
                'Service',
                'Agence',
                'Date',
                'Numéro Trans GU',
                'GRX',
                'Statut'
            ];
        } else if (isOPPART) {
            // Colonnes OPPART autorisées
            allowedColumns = [
                'ID Opération',
                'Type Opération',
                'Montant',
                'Solde avant',
                'Solde aprés',
                'Code proprietaire',
                'Date opération',
                'Numéro Trans GU',
                'groupe de réseau'
            ];
        } else if (isUSSDPART) {
            // Colonnes USSDPART autorisées
            allowedColumns = [
                'ID',
                'Agence',
                'Code service',
                'Numéro Trans GU',
                'Déstinataire',
                'date de création',
                'Etat',
                'Token',
                'SMS Action faite',
                'Montant'
            ];
        } else {
            // Si aucun type n'est détecté, retourner toutes les colonnes
            return keys;
        }
        
        // Filtrer les clés pour ne garder que les colonnes autorisées
        return keys.filter(key => allowedColumns.includes(key));
    }

    getBoOnlyKeys(record: Record<string, string>): string[] {
        // Détecter le type de données BO et appliquer le bon filtrage
        return this.getFilteredKeys(record, 'bo');
    }

    getPartnerOnlyKeys(record: Record<string, string>): string[] {
        // Détecter le type de données Partenaire et appliquer le bon filtrage
        return this.getFilteredKeys(record, 'partner');
    }

    /**
     * Détecter les doublons de clé de réconciliation avec types d'opération spécifiques
     */
    detectTSOPDuplicates(data: any[]): Map<string, any[]> {
        // Vérifier si c'est une réconciliation TRXBO-OPPART
        if (!this.isTRXBOOPPARTReconciliation()) {
            console.log('🔍 detectTSOPDuplicates: Pas une réconciliation TRXBO-OPPART, retour d\'une map vide');
            return new Map<string, any[]>();
        }
        
        console.log('🔍 DÉBUT detectTSOPDuplicates - Nombre d\'enregistrements:', data.length);
        
        if (data.length > 0) {
            console.log('🔍 Premier enregistrement (colonnes disponibles):', Object.keys(data[0]));
            console.log('🔍 Premier enregistrement (données):', data[0]);
        }

        const duplicatesMap = new Map<string, any[]>();
        const keyCount = new Map<string, any[]>();

        // Grouper les enregistrements par clé de réconciliation
        data.forEach((record, index) => {
            // Essayer différents noms de colonnes pour la clé de réconciliation
            const reconciliationKey = this.getReconciliationKey(record);
            const typeOperation = this.getTypeOperation(record);

            console.log(`🔍 Enregistrement ${index + 1}:`, {
                reconciliationKey: reconciliationKey,
                typeOperation: typeOperation,
                colonnesDisponibles: Object.keys(record)
            });

            if (reconciliationKey && typeOperation) {
                if (!keyCount.has(reconciliationKey)) {
                    keyCount.set(reconciliationKey, []);
                }
                keyCount.get(reconciliationKey)!.push({
                    record: record,
                    typeOperation: typeOperation
                });
                console.log(`✅ Ajouté à keyCount: ${reconciliationKey} -> ${typeOperation}`);
            } else {
                console.log(`❌ Ignoré (clé: "${reconciliationKey}", type: "${typeOperation}")`);
            }
        });

        console.log('🔍 keyCount après groupement:', Array.from(keyCount.entries()));

        // Identifier les doublons avec les types d'opération spécifiques
        keyCount.forEach((records, key) => {
            const types = records.map(r => r.typeOperation);
            console.log(`🔍 Clé ${key} a ${records.length} enregistrements avec types:`, types);
            
            // Vérifier si on a les deux types spécifiques
            const hasImpactCompte = types.includes('IMPACT_COMPTIMPACT-COMPTE-GENERAL');
            const hasFraisTransaction = types.includes('FRAIS_TRANSACTION');

            console.log(`🔍 Pour clé ${key}:`, {
                hasImpactCompte,
                hasFraisTransaction,
                types,
                recordCount: records.length
            });

            if (records.length >= 2 && hasImpactCompte && hasFraisTransaction) {
                // Cas 1: Doublon TSOP complet (IMPACT + FRAIS)
                duplicatesMap.set(key, records.map(r => ({ ...r, tsopType: 'COMPLETE' })));
                console.log(`🎯 TSOP Duplicate COMPLET détecté pour clé ${key}:`, types);
            } else if (records.length === 1 && hasImpactCompte && !hasFraisTransaction) {
                // Cas 2: IMPACT seul sans FRAIS (SANS FRAIS)
                duplicatesMap.set(key, records.map(r => ({ ...r, tsopType: 'SANS_FRAIS' })));
                console.log(`🟡 IMPACT SANS FRAIS détecté pour clé ${key}:`, types);
            } else if (records.length === 1 && hasFraisTransaction && !hasImpactCompte) {
                // Cas 3: FRAIS_TRANSACTION seul (Régularisation FRAIS)
                duplicatesMap.set(key, records.map(r => ({ ...r, tsopType: 'REGULARISATION_FRAIS' })));
                console.log(`🟠 FRAIS_TRANSACTION seul détecté pour clé ${key}:`, types);
            } else {
                console.log(`❌ Pas de doublon TSOP pour clé ${key} (ne correspond à aucun cas)`);
            }
        });

        console.log('🔍 FIN detectTSOPDuplicates - Nombre de doublons TSOP trouvés:', duplicatesMap.size);
        return duplicatesMap;
    }

    /**
     * Extraire la clé de réconciliation d'un enregistrement
     */
    private getReconciliationKey(record: any): string {
        const possibleKeys = [
            'Service',
            'service',
            'SERVICE',
            'CLE',
            'clé de réconciliation',
            'cle_reconciliation', 
            'reconciliation_key',
            'RECONCILIATION_KEY',
            'Key',
            'key',
            'ID',
            'id'
        ];

        for (const key of possibleKeys) {
            if (record[key] !== undefined && record[key] !== null && record[key] !== '') {
                console.log(`🔍 Clé de réconciliation trouvée: "${key}" = "${record[key]}"`);
                return record[key].toString();
            }
        }
        console.log('❌ Aucune clé de réconciliation trouvée dans:', Object.keys(record));
        return '';
    }

    /**
     * Extraire le type d'opération d'un enregistrement
     */
    private getTypeOperation(record: any): string {
        const possibleKeys = [
            'Type Opération',
            'Type Op�ration', // Avec caractères d'encodage
            'type operation',
            'type_operation',
            'typeOperation',
            'TYPE_OPERATION',
            'TypeOperation',
            'Operation',
            'operation'
        ];

        for (const key of possibleKeys) {
            if (record[key] !== undefined && record[key] !== null && record[key] !== '') {
                console.log(`🔍 Type d'opération trouvé: "${key}" = "${record[key]}"`);
                return record[key].toString();
            }
        }
        console.log('❌ Aucun type d\'opération trouvé dans:', Object.keys(record));
        return '';
    }

    /**
     * Vérifier si un enregistrement est un doublon TSOP
     */
    isTSOPDuplicate(record: any, duplicatesMap: Map<string, any[]>): boolean {
        const reconciliationKey = this.getReconciliationKey(record);
        return reconciliationKey !== '' && duplicatesMap.has(reconciliationKey);
    }

    /**
     * Obtenir la map des doublons TSOP pour l'affichage
     */
    getTSOPDuplicatesMap(): Map<string, any[]> {
        if (!this.response?.partnerOnly) return new Map();
        return this.detectTSOPDuplicates(this.filteredPartnerOnly);
    }

    /**
     * Vérifier si la réconciliation est entre TRXBO et OPPART
     */
    isTRXBOOPPARTReconciliation(): boolean {
        if (!this.response) return false;
        
        // Vérifier les noms de fichiers ou les données pour identifier TRXBO-OPPART
        const boData = this.response.boOnly || [];
        const partnerData = this.response.partnerOnly || [];
        
        // Vérifier si on a des données TRXBO (Back Office) et OPPART (Partenaire)
        const hasTRXBOData = boData.length > 0;
        const hasOPPARTData = partnerData.length > 0;
        
        // Vérifier les types d'opérations caractéristiques de TRXBO-OPPART
        const hasTRXBOOperations = boData.some(record => {
            const type = this.getTypeOperation(record);
            return type && (type.includes('total_cashin') || type.includes('total_paiement') || type.includes('FRAIS_TRANSACTION'));
        });
        
        const hasOPPARTOperations = partnerData.some(record => {
            const type = this.getTypeOperation(record);
            return type && (type.includes('IMPACT_COMPTIMPACT-COMPTE-GENERAL') || type.includes('FRAIS_TRANSACTION'));
        });
        
        return hasTRXBOData && hasOPPARTData && (hasTRXBOOperations || hasOPPARTOperations);
    }

    /**
     * Obtenir le commentaire TSOP pour un enregistrement (écarts Partenaire)
     * Uniquement applicable pour la réconciliation TRXBO-OPPART
     */
    getTSOPComment(record: any): string {
        // Vérifier si c'est une réconciliation TRXBO-OPPART
        if (!this.isTRXBOOPPARTReconciliation()) {
            return '';
        }
        
        const typeOperation = this.getTypeOperation(record);
        
        // Logique selon les spécifications :
        // - IMPACT_COMPTIMPACT-COMPTE-GENERAL sans FRAIS → TSF (jaune)
        // - FRAIS_TRANSACTION → C FRAIS (orange)
        if (typeOperation && typeOperation.includes('FRAIS_TRANSACTION')) {
            return 'C FRAIS';
        } else if (typeOperation && typeOperation.includes('IMPACT_COMPTIMPACT-COMPTE-GENERAL')) {
            return 'TSF';
        }
        
        return '';
    }

    /**
     * Obtenir le type TSOP pour un enregistrement (pour le style CSS)
     * Uniquement applicable pour la réconciliation TRXBO-OPPART
     */
    getTSOPType(record: any): string {
        // Vérifier si c'est une réconciliation TRXBO-OPPART
        if (!this.isTRXBOOPPARTReconciliation()) {
            return '';
        }
        
        const typeOperation = this.getTypeOperation(record);
        
        // Logique selon les spécifications :
        // - FRAIS_TRANSACTION → C FRAIS (orange)
        // - IMPACT_COMPTIMPACT-COMPTE-GENERAL → TSF (jaune)
        if (typeOperation && typeOperation.includes('FRAIS_TRANSACTION')) {
            return 'C_FRAIS';
        } else if (typeOperation && typeOperation.includes('IMPACT_COMPTIMPACT-COMPTE-GENERAL')) {
            return 'TSF';
        }
        
        return '';
    }

    /**
     * Obtenir le commentaire pour un enregistrement ECART BO
     * Uniquement applicable pour la réconciliation TRXBO-OPPART
     */
    getBoOnlyComment(record: any): string {
        // Vérifier si c'est une réconciliation TRXBO-OPPART
        if (!this.isTRXBOOPPARTReconciliation()) {
            return '';
        }
        
        // Pour les écarts BO : toujours TSOP en rouge selon les spécifications
        return 'TSOP';
    }

    /**
     * Obtenir le type pour un enregistrement ECART BO (pour le style CSS)
     * Uniquement applicable pour la réconciliation TRXBO-OPPART
     */
    getBoOnlyType(record: any): string {
        // Vérifier si c'est une réconciliation TRXBO-OPPART
        if (!this.isTRXBOOPPARTReconciliation()) {
            return '';
        }
        
        // Pour les écarts BO : toujours TSOP (rouge) selon les spécifications
        return 'TSOP';
    }

    hasDifferences(match: Match): boolean {
        return match.differences && match.differences.length > 0;
    }

   async exportResults() {
    console.log('Début de l\'export...');
    console.log('Onglet actif:', this.activeTab);
    
    try {
        this.isExporting = true;
        this.exportProgress = 0;
        this.cdr.detectChanges();

        // Demander le nom du fichier à l'utilisateur
        const fileName = await this.promptFileName();
        if (!fileName) {
            console.log('Export annulé par l\'utilisateur');
            return;
        }

        // Première étape : Génération des fichiers
        console.log('Début de la génération des fichiers...');
        const workbooks = await this.generateExcelFile();
        console.log('Fichiers Excel générés avec succès');

        // Deuxième étape : Téléchargement
        console.log('Début du téléchargement...');
        await this.downloadExcelFile(workbooks, fileName);
        console.log('Téléchargement terminé avec succès');

    } catch (error) {
        console.error('Erreur lors de l\'export:', error);
    } finally {
        this.isExporting = false;
        this.exportProgress = 0;
        this.cdr.detectChanges();
    }
}

private async promptFileName(): Promise<string | null> {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    let defaultFileName = 'export.xlsx';
    
    switch (this.activeTab) {
        case 'matches':
            defaultFileName = `correspondances_${timestamp}.xlsx`;
            break;
        case 'boOnly':
            defaultFileName = `ecart_bo_${timestamp}.xlsx`;
            break;
        case 'partnerOnly':
            defaultFileName = `ecart_partenaire_${timestamp}.xlsx`;
            break;
        case 'agencySummary':
            defaultFileName = `resume_par_agence_${timestamp}.xlsx`;
            break;
    }
    
    const fileName = prompt(`Entrez le nom du fichier (sans l'extension .xlsx):`, defaultFileName.replace('.xlsx', ''));
    
    if (fileName === null) {
        return null; // Utilisateur a annulé
    }
    
    if (fileName.trim() === '') {
        return defaultFileName;
    }
    
    return fileName.trim() + '.xlsx';
}

private async generateExcelFile(): Promise<ExcelJS.Workbook[]> {
    const workbooks: ExcelJS.Workbook[] = [];
    // SUPPRESSION DE LA LIMITE : on ne découpe plus en plusieurs fichiers
    // const MAX_ROWS_PER_FILE = 50000;

    if (this.activeTab === 'matches') {
        console.log('Export des correspondances...');
        const filteredMatches = this.getFilteredMatches();
        console.log('Nombre de correspondances à exporter:', filteredMatches.length);
        
        if (filteredMatches.length > 0) {
            // Récupérer toutes les clés des données BO et Partenaire
            const allBoKeys = new Set<string>();
            const allPartnerKeys = new Set<string>();
            
            filteredMatches.forEach(match => {
                Object.keys(match.boData).forEach(key => allBoKeys.add(key));
                Object.keys(match.partnerData).forEach(key => allPartnerKeys.add(key));
            });
            
            const boKeysArray = Array.from(allBoKeys);
            const partnerKeysArray = Array.from(allPartnerKeys);
            
            console.log('Colonnes BO:', boKeysArray);
            console.log('Colonnes Partenaire:', partnerKeysArray);

            // Styles Excel
            const headerStyle = {
                font: { bold: true, color: { argb: 'FFFFFFFF' } },
                fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF4472C4' } },
                alignment: { vertical: 'middle' as const, horizontal: 'center' as const },
                border: {
                    top: { style: 'thin' as const },
                    left: { style: 'thin' as const },
                    bottom: { style: 'thin' as const },
                    right: { style: 'thin' as const }
                }
            };

            const dataStyle = {
                border: {
                    top: { style: 'thin' as const },
                    left: { style: 'thin' as const },
                    bottom: { style: 'thin' as const },
                    right: { style: 'thin' as const }
                }
            };

            // Créer un seul fichier pour toutes les correspondances
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Correspondances');

            // Définir les colonnes avec des largeurs appropriées
            const columns = [
                { header: 'Clé', key: 'key', width: 20 },
                ...boKeysArray.map(k => ({ header: `BO_${k}`, key: `bo_${k}`, width: 15 })),
                ...partnerKeysArray.map(k => ({ header: `PARTENAIRE_${k}`, key: `partner_${k}`, width: 15 }))
            ];

            worksheet.columns = columns;

            // Ajouter la ligne d'en-tête manuellement
            const headerRow = worksheet.getRow(1);
            headerRow.getCell(1).value = 'Clé';
            
            let colIndex = 2;
            boKeysArray.forEach(key => {
                headerRow.getCell(colIndex).value = `BO_${key}`;
                colIndex++;
            });
            
            partnerKeysArray.forEach(key => {
                headerRow.getCell(colIndex).value = `PARTENAIRE_${key}`;
                colIndex++;
            });

            // Appliquer le style d'en-tête
            headerRow.eachCell((cell, cellNumber) => {
                if (cellNumber <= columns.length) {
                    cell.style = headerStyle;
                }
            });

            // Ajouter toutes les lignes de données
            let currentRow = 2;
            const batchSize = 100;
            for (let i = 0; i < filteredMatches.length; i += batchSize) {
                const batch = filteredMatches.slice(i, i + batchSize);
                batch.forEach(match => {
                    const row = worksheet.getRow(currentRow);
                    row.getCell(1).value = match.key;
                    let cellIndex = 2;
                    boKeysArray.forEach(key => {
                        const value = match.boData[key];
                        row.getCell(cellIndex).value = value !== undefined && value !== null ? value : '';
                        cellIndex++;
                    });
                    partnerKeysArray.forEach(key => {
                        const value = match.partnerData[key];
                        row.getCell(cellIndex).value = value !== undefined && value !== null ? value : '';
                        cellIndex++;
                    });
                    row.eachCell((cell, cellNumber) => {
                        if (cellNumber <= columns.length) {
                            cell.style = dataStyle;
                        }
                    });
                    currentRow++;
                });
                this.exportProgress = Math.round(((i + batch.length) / filteredMatches.length) * 100);
                this.cdr.detectChanges();
                await new Promise(resolve => setTimeout(resolve, 10));
            }
            workbooks.push(workbook);
            console.log(`Fichier unique terminé avec ${currentRow - 1} lignes`);
        }
    } else if (this.activeTab === 'boOnly') {
        console.log('Export des données BO uniquement...');
        const filteredBoOnly = this.getFilteredBoOnly();
        console.log('Nombre d\'enregistrements BO à exporter:', filteredBoOnly.length);
        
        if (filteredBoOnly.length > 0) {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('BO Uniquement');
            
            // Détecter les doublons TSOP
            const duplicatesMap = this.detectTSOPDuplicates(filteredBoOnly);
            console.log('🔍 Doublons TSOP détectés pour ECART BO:', duplicatesMap.size);
            
            // Récupérer toutes les clés
            const allKeys = new Set<string>();
            filteredBoOnly.forEach(record => {
                Object.keys(record).forEach(key => allKeys.add(key));
            });
            const keysArray = Array.from(allKeys);
            
            // Ajouter la colonne commentaire si elle n'existe pas
            if (!keysArray.includes('Commentaire')) {
                keysArray.push('Commentaire');
            }
            
            // Définir les colonnes
            const columns = keysArray.map(key => ({ header: key, key: key, width: 15 }));
            worksheet.columns = columns;
            
            // Styles Excel
            const headerStyle = {
                font: { bold: true, color: { argb: 'FFFFFFFF' } },
                fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF4472C4' } },
                alignment: { vertical: 'middle' as const, horizontal: 'center' as const },
                border: {
                    top: { style: 'thin' as const },
                    left: { style: 'thin' as const },
                    bottom: { style: 'thin' as const },
                    right: { style: 'thin' as const }
                }
            };

            const tsorDuplicateStyle = {
                fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFF0000' } }, // Rouge
                font: { color: { argb: 'FFFFFFFF' }, bold: true },
                border: {
                    top: { style: 'thin' as const },
                    left: { style: 'thin' as const },
                    bottom: { style: 'thin' as const },
                    right: { style: 'thin' as const }
                }
            };

            const tsorSansFraisStyle = {
                fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFFF00' } }, // Jaune
                font: { color: { argb: 'FF000000' }, bold: true },
                border: {
                    top: { style: 'thin' as const },
                    left: { style: 'thin' as const },
                    bottom: { style: 'thin' as const },
                    right: { style: 'thin' as const }
                }
            };

            const regularisationFraisStyle = {
                fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFA500' } }, // Orange
                font: { color: { argb: 'FFFFFFFF' }, bold: true },
                border: {
                    top: { style: 'thin' as const },
                    left: { style: 'thin' as const },
                    bottom: { style: 'thin' as const },
                    right: { style: 'thin' as const }
                }
            };

            const dataStyle = {
                border: {
                    top: { style: 'thin' as const },
                    left: { style: 'thin' as const },
                    bottom: { style: 'thin' as const },
                    right: { style: 'thin' as const }
                }
            };
            
            // Ajouter les données
            filteredBoOnly.forEach((record, index) => {
                const rowData: any = {};
                const boOnlyType = this.getBoOnlyType(record);
                const boOnlyComment = this.getBoOnlyComment(record);
                
                keysArray.forEach(key => {
                    if (key === 'Commentaire') {
                        // Ajouter le commentaire approprié
                        rowData[key] = boOnlyComment;
                    } else {
                        rowData[key] = record[key] || '';
                    }
                });
                const row = worksheet.addRow(rowData);
                
                // Appliquer le style selon le type - ÉCARTS BO : toujours TSOP (rouge)
                if (boOnlyType === 'TSOP') {
                    // Style rouge pour TSOP (écarts BO)
                    row.eachCell(cell => {
                        cell.style = tsorDuplicateStyle;
                    });
                    console.log(`🟥 Ligne ECART BO ${index + 2} colorée en rouge (TSOP)`);
                } else {
                    // Style normal
                    row.eachCell(cell => {
                        cell.style = dataStyle;
                    });
                }
            });
            
            // Appliquer les styles d'en-tête
            worksheet.getRow(1).eachCell(cell => {
                cell.style = headerStyle;
            });
            
            workbooks.push(workbook);
        }
    } else if (this.activeTab === 'partnerOnly') {
        console.log('Export des données Partenaire uniquement...');
        const filteredPartnerOnly = this.getFilteredPartnerOnly();
        console.log('Nombre d\'enregistrements Partenaire à exporter:', filteredPartnerOnly.length);
        
        if (filteredPartnerOnly.length > 0) {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Partenaire Uniquement');
            
            // Détecter les doublons TSOP
            const duplicatesMap = this.detectTSOPDuplicates(filteredPartnerOnly);
            console.log('🔍 Doublons TSOP détectés:', duplicatesMap.size);
            
            // Récupérer toutes les clés
            const allKeys = new Set<string>();
            filteredPartnerOnly.forEach(record => {
                Object.keys(record).forEach(key => allKeys.add(key));
            });
            const keysArray = Array.from(allKeys);
            
            // Ajouter la colonne commentaire si elle n'existe pas
            if (!keysArray.includes('Commentaire TSOP')) {
                keysArray.push('Commentaire TSOP');
            }
            
            // Définir les colonnes
            const columns = keysArray.map(key => ({ header: key, key: key, width: 15 }));
            worksheet.columns = columns;
            
            // Styles Excel
            const headerStyle = {
                font: { bold: true, color: { argb: 'FFFFFFFF' } },
                fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF4472C4' } },
                alignment: { vertical: 'middle' as const, horizontal: 'center' as const },
                border: {
                    top: { style: 'thin' as const },
                    left: { style: 'thin' as const },
                    bottom: { style: 'thin' as const },
                    right: { style: 'thin' as const }
                }
            };

            const tsorDuplicateStyle = {
                fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFF0000' } }, // Rouge
                font: { color: { argb: 'FFFFFFFF' }, bold: true },
                border: {
                    top: { style: 'thin' as const },
                    left: { style: 'thin' as const },
                    bottom: { style: 'thin' as const },
                    right: { style: 'thin' as const }
                }
            };

            const tsorSansFraisStyle = {
                fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFFF00' } }, // Jaune
                font: { color: { argb: 'FF000000' }, bold: true },
                border: {
                    top: { style: 'thin' as const },
                    left: { style: 'thin' as const },
                    bottom: { style: 'thin' as const },
                    right: { style: 'thin' as const }
                }
            };

            const regularisationFraisStyle = {
                fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFA500' } }, // Orange
                font: { color: { argb: 'FFFFFFFF' }, bold: true },
                border: {
                    top: { style: 'thin' as const },
                    left: { style: 'thin' as const },
                    bottom: { style: 'thin' as const },
                    right: { style: 'thin' as const }
                }
            };

            const dataStyle = {
                border: {
                    top: { style: 'thin' as const },
                    left: { style: 'thin' as const },
                    bottom: { style: 'thin' as const },
                    right: { style: 'thin' as const }
                }
            };
            
            // Ajouter les données
            filteredPartnerOnly.forEach((record, index) => {
                const rowData: any = {};
                const tsopType = this.getTSOPType(record);
                const tsopComment = this.getTSOPComment(record);
                
                keysArray.forEach(key => {
                    if (key === 'Commentaire TSOP') {
                        // Ajouter le commentaire approprié
                        rowData[key] = tsopComment;
                    } else {
                        rowData[key] = record[key] || '';
                    }
                });
                const row = worksheet.addRow(rowData);
                
                // Appliquer le style selon le type - ÉCARTS PARTENAIRE
                if (tsopType === 'TSF') {
                    // Style jaune pour TSF (IMPACT sans FRAIS)
                    row.eachCell(cell => {
                        cell.style = tsorSansFraisStyle;
                    });
                    console.log(`🟡 Ligne ${index + 2} colorée en jaune (TSF)`);
                } else if (tsopType === 'C_FRAIS') {
                    // Style orange pour C FRAIS (FRAIS_TRANSACTION)
                    row.eachCell(cell => {
                        cell.style = regularisationFraisStyle;
                    });
                    console.log(`🟠 Ligne ${index + 2} colorée en orange (C FRAIS)`);
                } else {
                    // Style normal
                    row.eachCell(cell => {
                        cell.style = dataStyle;
                    });
                }
            });
            
            // Appliquer les styles d'en-tête
            worksheet.getRow(1).eachCell(cell => {
                cell.style = {
                    font: { bold: true, color: { argb: 'FFFFFFFF' } },
                    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF4472C4' } },
                    alignment: { vertical: 'middle' as const, horizontal: 'center' as const }
                };
            });
            
            workbooks.push(workbook);
        }
    } else if (this.activeTab === 'agencySummary') {
        console.log('Export du résumé par agence...');
        const agencySummary = this.getAgencySummary();
        console.log('Nombre d\'éléments du résumé à exporter:', agencySummary.length);
        
        if (agencySummary.length > 0) {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Résumé par Agence');
            
            // Définir les colonnes
            worksheet.columns = [
                { header: 'Agence', key: 'agency', width: 20 },
                { header: 'Service', key: 'service', width: 20 },
                { header: 'Pays', key: 'country', width: 15 },
                { header: 'Date', key: 'date', width: 15 },
                { header: 'Volume Total', key: 'totalVolume', width: 20 },
                { header: 'Nombre d\'Enregistrements', key: 'recordCount', width: 25 }
            ];
            
            // Ajouter les données
            agencySummary.forEach(item => {
                worksheet.addRow({
                    agency: item.agency,
                    service: item.service,
                    country: item.country,
                    date: item.date,
                    totalVolume: item.totalVolume,
                    recordCount: item.recordCount
                });
            });
            
            // Appliquer les styles à l'en-tête
            worksheet.getRow(1).eachCell(cell => {
                cell.style = {
                    font: { bold: true, color: { argb: 'FFFFFFFF' } },
                    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF4472C4' } },
                    alignment: { vertical: 'middle' as const, horizontal: 'center' as const }
                };
            });
            
            workbooks.push(workbook);
        }
    }

    // Si aucun workbook n'a été créé, créer un fichier par défaut
    if (workbooks.length === 0) {
        console.log('Aucune donnée à exporter, création d\'un fichier vide');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Aucune Donnée');
        worksheet.addRow(['Aucune donnée disponible pour l\'export']);
        workbooks.push(workbook);
    }

    return workbooks;
}

private async downloadExcelFile(workbooks: ExcelJS.Workbook[], fileName: string): Promise<void> {
    // On ne télécharge qu'un seul fichier
    if (workbooks.length === 0) return;
    const workbook = workbooks[0];
    try {
        console.log('Début du téléchargement du fichier unique...');
        const buffer = await workbook.xlsx.writeBuffer({
            useStyles: true,
            useSharedStrings: false
        });
        if (buffer.byteLength === 0) {
            throw new Error('Le buffer généré est vide');
        }
        const blob = new Blob([buffer], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        if (blob.size === 0) {
            throw new Error('Le blob créé est vide');
        }
        
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
        console.error(`Erreur lors du téléchargement du fichier :`, error);
        throw error;
    }
}

    /**
     * Export optimisé avec Web Worker pour les gros volumes
     */
    async exportResultsOptimized() {
        console.log('🚀 Début de l\'export optimisé...');
        console.log('Onglet actif:', this.activeTab);
        
        try {
            this.isExporting = true;
            this.exportProgressOptimized = {
                current: 0,
                total: 0,
                percentage: 0,
                message: '🚀 Démarrage de l\'export optimisé...',
                isComplete: false
            };
            this.cdr.detectChanges();

            // Demander le nom du fichier à l'utilisateur
            const fileName = await this.promptFileName();
            if (!fileName) {
                console.log('Export annulé par l\'utilisateur');
                return;
            }

            // Préparer les données selon l'onglet actif
            const { rows, columns } = this.prepareDataForExport();
            
            if (rows.length === 0) {
                console.log('Aucune donnée à exporter');
                return;
            }

            // Déterminer la stratégie d'export
            const isLargeDataset = rows.length > 10000;
            const format = fileName.endsWith('.csv') ? 'csv' : 'xlsx';
            
            if (isLargeDataset) {
                // Export optimisé avec Web Worker
                if (format === 'csv') {
                    this.exportOptimizationService.exportCSVOptimized(
                        rows,
                        columns,
                        fileName,
                        {
                            chunkSize: 5000,
                            useWebWorker: true,
                            enableCompression: true
                        }
                    );
                } else {
                    this.exportOptimizationService.exportExcelOptimized(
                        rows,
                        columns,
                        fileName,
                        {
                            chunkSize: 3000,
                            useWebWorker: true,
                            enableCompression: true
                        }
                    );
                }
                
                // S'abonner à la progression
                this.exportOptimizationService.exportProgress$.subscribe(progress => {
                    this.exportProgressOptimized = progress;
                    if (progress.isComplete) {
                        this.isExporting = false;
                        this.cdr.detectChanges();
                    }
                });
            } else {
                // Export rapide pour petits volumes
                this.exportOptimizationService.exportQuick(rows, columns, fileName, format);
                this.isExporting = false;
                this.cdr.detectChanges();
            }

        } catch (error) {
            console.error('❌ Erreur lors de l\'export optimisé:', error);
            this.isExporting = false;
            this.cdr.detectChanges();
        }
    }

    /**
     * Prépare les données pour l'export selon l'onglet actif
     */
    private prepareDataForExport(): { rows: any[], columns: string[] } {
        let rows: any[] = [];
        let columns: string[] = [];

        switch (this.activeTab) {
            case 'matches':
                const filteredMatches = this.getFilteredMatches();
                rows = filteredMatches.map(match => ({
                    ...match.boData,
                    ...match.partnerData
                }));
                
                // Récupérer toutes les colonnes uniques
                const allKeys = new Set<string>();
                filteredMatches.forEach(match => {
                    Object.keys(match.boData).forEach(key => allKeys.add(key));
                    Object.keys(match.partnerData).forEach(key => allKeys.add(key));
                });
                columns = Array.from(allKeys);
                break;

            case 'boOnly':
                rows = this.response?.boOnly || [];
                columns = rows.length > 0 ? Object.keys(rows[0]) : [];
                break;

            case 'partnerOnly':
                rows = this.response?.partnerOnly || [];
                columns = rows.length > 0 ? Object.keys(rows[0]) : [];
                break;

            case 'agencySummary':
                // Pour le résumé par agence, on utilise les données existantes
                rows = this.response?.boOnly || [];
                columns = rows.length > 0 ? Object.keys(rows[0]) : [];
                break;

            default:
                rows = [];
                columns = [];
        }

        return { rows, columns };
    }

    nouvelleReconciliation() {
        console.log('Navigation vers nouvelle réconciliation');
        this.router.navigate(['/upload']).then(() => {
            console.log('Navigation vers /upload réussie');
        }).catch(error => {
            console.error('Erreur lors de la navigation vers /upload:', error);
        });
    }

    calculateTotalVolume(type: 'bo' | 'partner'): number {
        if (!this.filteredMatches || this.filteredMatches.length === 0) return 0;
        const amountColumn = this.findAmountColumn(type);
        if (!amountColumn) return 0;
        return this.filteredMatches.reduce((total, match) => {
            const amount = type === 'bo' 
                ? parseFloat(match.boData[amountColumn] || '0')
                : parseFloat(match.partnerData[amountColumn] || '0');
            return total + (isNaN(amount) ? 0 : amount);
        }, 0);
    }

    private findAmountColumn(type: 'bo' | 'partner'): string | null {
        if (!this.filteredMatches || this.filteredMatches.length === 0) return null;
        
        const firstMatch = this.filteredMatches[0];
        const data = type === 'bo' ? firstMatch.boData : firstMatch.partnerData;
        
        // Liste des noms possibles pour la colonne de montant
        const possibleAmountColumns = [
            'montant', 'amount', 'valeur', 'value', 'somme', 'sum', 'total',
            'credit', 'crédit', 'debit', 'débit', 'montant_credit', 'montant_débit',
            'montant_credit', 'montant_debit', 'montant_crédit', 'montant_débit',
            'montant_operation', 'montant_opération', 'montant_transaction',
            'montant_credit_operation', 'montant_débit_operation'
        ];
        
        // Chercher une colonne qui contient un des noms possibles
        for (const column of Object.keys(data)) {
            const lowerColumn = column.toLowerCase();
            if (possibleAmountColumns.some(name => lowerColumn.includes(name))) {
                return column;
            }
        }
        
        return null;
    }

    calculateVolumeDifference(): number {
        return this.calculateTotalVolume('bo') - this.calculateTotalVolume('partner');
    }

    calculateTotalVolumeBoOnly(): number {
        if (!this.filteredBoOnly || this.filteredBoOnly.length === 0) return 0;
        const amountColumn = this.findAmountColumn('bo');
        if (!amountColumn) return 0;
        return this.filteredBoOnly.reduce((total, record) => {
            const amount = parseFloat(record[amountColumn] || '0');
            return total + (isNaN(amount) ? 0 : amount);
        }, 0);
    }

    calculateTotalVolumePartnerOnly(): number {
        if (!this.filteredPartnerOnly || this.filteredPartnerOnly.length === 0) return 0;
        return this.filteredPartnerOnly.reduce((total, record) => {
            const amount = this.getPartnerOnlyVolume(record);
            return total + amount;
        }, 0);
    }

    getPartnerOnlyVolume(record: Record<string, string>): number {
        // Liste des noms possibles pour la colonne de montant
        const possibleAmountColumns = [
            'montant', 'amount', 'valeur', 'value', 'somme', 'sum', 'total',
            'credit', 'crédit', 'debit', 'débit', 'montant_credit', 'montant_débit',
            'montant_credit', 'montant_debit', 'montant_crédit', 'montant_débit',
            'montant_operation', 'montant_opération', 'montant_transaction',
            'montant_credit_operation', 'montant_débit_operation'
        ];
        
        // Chercher directement dans le record
        for (const column of Object.keys(record)) {
            const lowerColumn = column.toLowerCase();
            if (possibleAmountColumns.some(name => lowerColumn.includes(name))) {
                const amount = parseFloat(record[column] || '0');
                if (!isNaN(amount)) {
                    return amount;
                }
            }
        }
        
        return 0;
    }

    getBoAgencyAndService(match: Match): { agency: string; service: string; volume: number; date: string; country: string } {
        // Créer une clé de cache basée sur les données du match
        const cacheKey = JSON.stringify(match.boData);
        
        // Vérifier le cache d'abord
        if (this.agencyServiceCache.has(cacheKey)) {
            return this.agencyServiceCache.get(cacheKey)!;
        }
        
        const boData = match.boData;
        
        const agency = boData['Agence'] || '';
        const service = boData['Service'] || '';
        const volume = boData['montant'] ? parseFloat(boData['montant'].toString().replace(',', '.')) : 0;
        const date = boData['Date'] || '';
        const countryColumn = this.findCountryColumn(boData);
        let country = 'Non spécifié';
        
        if (countryColumn === 'fallback') {
            // Utiliser la logique de fallback pour déterminer le pays
            country = this.determineCountryFromContext(boData) || 'Non spécifié';
        } else if (countryColumn) {
            country = boData[countryColumn] || 'Non spécifié';
        }
        
        const result = { agency, service, volume, date, country };
        
        // Mettre en cache le résultat
        this.agencyServiceCache.set(cacheKey, result);
        
        return result;
    }

    getBoOnlyAgencyAndService(record: Record<string, string>): { agency: string; service: string; volume: number; date: string; country: string } {
        // Fonction helper pour trouver une valeur avec plusieurs noms de colonnes possibles
        const getValueWithFallback = (possibleKeys: string[]): string => {
            for (const key of possibleKeys) {
                if (record[key] !== undefined && record[key] !== null && record[key] !== '') {
                    return record[key].toString();
                }
            }
            return '';
        };

        // Recherche d'agence avec plusieurs noms possibles
        const agency = getValueWithFallback(['Agence', 'agence', 'AGENCE', 'agency', 'Agency', 'AGENCY']);
        
        // Recherche de service avec plusieurs noms possibles
        const service = getValueWithFallback(['Service', 'service', 'SERVICE', 'serv', 'Serv']);
        
        // Recherche de volume/montant avec plusieurs noms possibles
        const volumeStr = getValueWithFallback(['montant', 'Montant', 'MONTANT', 'amount', 'Amount', 'volume', 'Volume', 'VOLUME']);
        const volume = volumeStr ? parseFloat(volumeStr.toString().replace(',', '.')) : 0;
        
        // Recherche de date avec plusieurs noms possibles
        const date = getValueWithFallback(['Date', 'date', 'DATE', 'jour', 'Jour', 'JOUR', 'created', 'Created', 'CREATED']);
        
        // Recherche de pays
        const countryColumn = this.findCountryColumn(record);
        let country = 'Non spécifié';
        
        if (countryColumn === 'fallback') {
            // Utiliser la logique de fallback pour déterminer le pays
            country = this.determineCountryFromContext(record) || 'Non spécifié';
        } else if (countryColumn) {
            country = record[countryColumn] || 'Non spécifié';
        }


        return { agency, service, volume, date, country };
    }

    getPartnerOnlyAgencyAndService(record: Record<string, string>): { agency: string; service: string; volume: number; date: string; country: string } {
        // Fonction helper pour trouver une valeur avec plusieurs noms de colonnes possibles
        const getValueWithFallback = (possibleKeys: string[]): string => {
            for (const key of possibleKeys) {
                if (record[key] !== undefined && record[key] !== null && record[key] !== '') {
                    return record[key].toString();
                }
            }
            return '';
        };

        // Debug: Afficher toutes les colonnes disponibles
        console.log('DEBUG: Colonnes disponibles dans record:', Object.keys(record));
        console.log('DEBUG: Valeurs dans record:', record);

        // Recherche d'agence avec plusieurs noms possibles
        let agency = getValueWithFallback(['Agence', 'agence', 'AGENCE', 'agency', 'Agency', 'AGENCY', 'codeProprietaire', 'CodeProprietaire', 'CODE_PROPRIETAIRE']);
        console.log('DEBUG: Agence trouvée:', agency);
        
        // Si aucune agence n'est trouvée, utiliser l'agence de l'utilisateur connecté comme fallback
        if (!agency || agency.trim() === '') {
            const userAgency = this.appStateService.getUsername();
            if (userAgency) {
                agency = userAgency;
                console.log('DEBUG: Aucune agence trouvée, utilisation de l\'agence utilisateur:', agency);
            } else {
                console.warn('DEBUG: Aucune agence trouvée et pas d\'agence utilisateur disponible');
            }
        }
        
        // Recherche de service avec plusieurs noms possibles
        const service = getValueWithFallback(['Service', 'service', 'SERVICE', 'serv', 'Serv']);
        console.log('DEBUG: Service trouvé:', service);
        
        // Recherche de volume/montant avec plusieurs noms possibles
        const volumeStr = getValueWithFallback(['montant', 'Montant', 'MONTANT', 'amount', 'Amount', 'volume', 'Volume', 'VOLUME']);
        const volume = volumeStr ? parseFloat(volumeStr.toString().replace(',', '.')) : 0;
        
        // Recherche de date avec plusieurs noms possibles
        const date = getValueWithFallback(['Date', 'date', 'DATE', 'jour', 'Jour', 'JOUR', 'created', 'Created', 'CREATED']);
        
        // Recherche de pays
        const countryColumn = this.findCountryColumn(record);
        let country = 'Non spécifié';
        
        if (countryColumn === 'fallback') {
            // Utiliser la logique de fallback pour déterminer le pays
            country = this.determineCountryFromContext(record) || 'Non spécifié';
        } else if (countryColumn) {
            country = record[countryColumn] || 'Non spécifié';
        }


        return { agency, service, volume, date, country };
    }

    getPartnerOnlyDate(record: Record<string, string>): string {
        const dateColumn = this.findDateColumn(record);
        return dateColumn ? record[dateColumn] || 'Non spécifié' : 'Non spécifié';
    }

    private findDateColumn(data: Record<string, string>): string | null {
        const dateKeywords = ['date', 'jour', 'day', 'created', 'creation', 'transaction'];
        return this.findColumnByKeywords(data, dateKeywords);
    }

    private findCountryColumn(data: Record<string, string>): string | null {
        const possibleColumns = ['Pays', 'PAYS', 'Country', 'COUNTRY', 'paysProvenance', 'Pays provenance', 'PAYS PROVENANCE'];
        for (const column of possibleColumns) {
            if (data[column] && data[column].trim() !== '') {
                return column;
            }
        }
        
        // Si aucune colonne exacte n'est trouvée, chercher les colonnes qui contiennent les mots-clés
        const keywords = ['pays', 'country', 'grx', 'provenance'];
        for (const column of Object.keys(data)) {
            const lowerColumn = column.toLowerCase();
            if (keywords.some(keyword => lowerColumn.includes(keyword))) {
                if (data[column] && data[column].trim() !== '') {
                    return column;
                }
            }
        }
        
        // Fallback : pour les fichiers GRX, essayer de déterminer le pays à partir d'autres informations
        const fallbackCountry = this.determineCountryFromContext(data);
        if (fallbackCountry) {
            return 'fallback';
        }
        
        return null;
    }
    
    /**
     * Détermine le pays à partir du contexte pour les fichiers GRX
     */
    private determineCountryFromContext(data: Record<string, string>): string | null {
        // Pour les fichiers GRX, on peut déterminer le pays à partir de plusieurs sources :
        
        // 1. Vérifier si c'est un fichier GRX (TRXBO)
        const isGrxFile = Object.keys(data).some(key => 
            key.toLowerCase().includes('grx') || 
            key.toLowerCase().includes('pays provenance')
        );
        
        if (isGrxFile) {
            console.log('🔍 DEBUG determineCountryFromContext - Fichier GRX détecté');
            
            // 2. Vérifier la colonne GRX pour déterminer le pays
            const grxValue = data['GRX'];
            if (grxValue && grxValue.trim() !== '') {
                console.log('🔍 DEBUG determineCountryFromContext - Valeur GRX trouvée:', grxValue);
                // Pour les fichiers GRX, le pays est généralement déterminé par la valeur GRX
                // ou par défaut, on peut utiliser le pays de l'agence
                return 'GRX'; // ou déterminer le pays réel à partir de la valeur GRX
            }
            
            // 3. Vérifier l'agence pour déterminer le pays
            const agency = data['Agence'];
            if (agency && agency.trim() !== '') {
                console.log('🔍 DEBUG determineCountryFromContext - Agence trouvée:', agency);
                // Déterminer le pays à partir du code de l'agence
                if (agency.includes('CM')) {
                    return 'CM'; // Cameroun
                } else if (agency.includes('SN')) {
                    return 'SN'; // Sénégal
                } else if (agency.includes('CI')) {
                    return 'CI'; // Côte d'Ivoire
                } else if (agency.includes('BF')) {
                    return 'BF'; // Burkina Faso
                }
            }
            
            // 4. Par défaut pour les fichiers GRX, utiliser le pays de l'agence ou un pays par défaut
            console.log('🔍 DEBUG determineCountryFromContext - Utilisation du pays par défaut pour GRX');
            return 'GRX'; // ou 'CM' selon votre logique métier
        }
        
        return null;
    }

    private findColumnByKeywords(data: Record<string, string>, keywords: string[]): string | null {
        for (const column of Object.keys(data)) {
            const lowerColumn = column.toLowerCase();
            if (keywords.some(keyword => lowerColumn.includes(keyword))) {
                return column;
            }
        }
        return null;
    }

    // Mettre en cache le résumé
    private cachedAgencySummary: Array<{agency: string; service: string; date: string; country: string; totalVolume: number; recordCount: number}> | null = null;
    private lastResponseHash: string = '';

    private getResponseHash(): string {
        if (!this.response) return '';
        return JSON.stringify({
            matchesCount: this.response.matches?.length || 0,
            boOnlyCount: this.response.boOnly?.length || 0
        });
    }

    getAgencySummary(): Array<{agency: string; service: string; date: string; country: string; totalVolume: number; recordCount: number}> {
        // Vérifier si nous avons déjà calculé le résumé pour cette réponse
        const currentHash = this.getResponseHash();
        if (this.cachedAgencySummary && this.lastResponseHash === currentHash) {
            return this.cachedAgencySummary;
        }

        // Calculer le résumé
        const summary = this.calculateAgencySummary();
        
        // Mettre en cache le résultat
        this.cachedAgencySummary = summary;
        this.lastResponseHash = currentHash;

        // Stocker dans le service pour le rapport
        this.reconciliationSummaryService.setAgencySummary(summary);

        return summary;
    }

    private calculateAgencySummary(): Array<{agency: string; service: string; date: string; country: string; totalVolume: number; recordCount: number}> {
        const summaryMap = new Map<string, {agency: string; service: string; date: string; country: string; totalVolume: number; recordCount: number}>();

        // Traiter les correspondances
        this.filteredMatches.forEach(match => {
            const boInfo = this.getBoAgencyAndService(match);
            const key = `${boInfo.agency}-${boInfo.service}-${boInfo.country}`;
            
            if (!summaryMap.has(key)) {
                summaryMap.set(key, {
                    agency: boInfo.agency,
                    service: boInfo.service,
                    country: boInfo.country,
                    date: boInfo.date,
                    totalVolume: 0,
                    recordCount: 0
                });
            }
            
            const summary = summaryMap.get(key)!;
            summary.totalVolume += boInfo.volume;
            summary.recordCount += 1;
        });

        // Traiter les données BO uniquement
        this.filteredBoOnly.forEach(record => {
            const boInfo = this.getBoOnlyAgencyAndService(record);
            const key = `${boInfo.agency}-${boInfo.service}-${boInfo.country}`;
            
            if (!summaryMap.has(key)) {
                summaryMap.set(key, {
                    agency: boInfo.agency,
                    service: boInfo.service,
                    country: boInfo.country,
                    date: boInfo.date,
                    totalVolume: 0,
                    recordCount: 0
                });
            }
            
            const summary = summaryMap.get(key)!;
            summary.totalVolume += boInfo.volume;
            summary.recordCount += 1;
        });

        // Convertir le Map en tableau et trier par agence puis par service
        return Array.from(summaryMap.values()).sort((a, b) => {
            if (a.agency !== b.agency) {
                return a.agency.localeCompare(b.agency);
            }
            return a.service.localeCompare(b.service);
        });
    }

    // Cache pour les calculs
    private cachedPagedAgencySummary: Array<{agency: string; service: string; date: string; country: string; totalVolume: number; recordCount: number}> | null = null;
    private cachedTotalVolume: number | null = null;
    private cachedTotalRecords: number | null = null;
    private lastAgencyPage: number = 1;
    private lastAgencySummaryHash: string = '';

    private getAgencySummaryHash(): string {
        const summary = this.getAgencySummary();
        return JSON.stringify(summary) + '_' + this.agencyPage + '_' + this.agencyPageSize;
    }

    getPagedAgencySummary(): Array<{agency: string; service: string; date: string; country: string; totalVolume: number; recordCount: number}> {
        const currentHash = this.getAgencySummaryHash();
        
        if (this.cachedPagedAgencySummary && this.lastAgencySummaryHash === currentHash) {
            return this.cachedPagedAgencySummary;
        }
        
        const start = (this.agencyPage - 1) * this.agencyPageSize;
        const summary = this.getAgencySummary();
        this.cachedPagedAgencySummary = summary.slice(start, start + this.agencyPageSize);
        this.lastAgencySummaryHash = currentHash;
        
        return this.cachedPagedAgencySummary;
    }

    getTotalVolume(): number {
        const summary = this.getAgencySummary();
        const summaryHash = JSON.stringify(summary);
        
        if (this.cachedTotalVolume !== null && this.lastAgencySummaryHash.includes(summaryHash)) {
            return this.cachedTotalVolume;
        }
        
        this.cachedTotalVolume = summary.reduce((total, summary) => total + summary.totalVolume, 0);
        return this.cachedTotalVolume;
    }

    getTotalRecords(): number {
        const summary = this.getAgencySummary();
        const summaryHash = JSON.stringify(summary);
        
        if (this.cachedTotalRecords !== null && this.lastAgencySummaryHash.includes(summaryHash)) {
            return this.cachedTotalRecords;
        }
        
        this.cachedTotalRecords = summary.reduce((total, summary) => total + summary.recordCount, 0);
        return this.cachedTotalRecords;
    }

    getTotalAgencyPages(): number {
        return Math.max(1, Math.ceil(this.getAgencySummary().length / this.agencyPageSize));
    }

    nextAgencyPage() {
        if (this.agencyPage < this.getTotalAgencyPages()) {
            this.agencyPage++;
            this.invalidateCache();
            this.cdr.detectChanges();
        }
    }

    prevAgencyPage() {
        if (this.agencyPage > 1) {
            this.agencyPage--;
            this.invalidateCache();
            this.cdr.detectChanges();
        }
    }

    getAgencyTotalsArray(): Array<{name: string, volume: number}> {
        const summary = this.getAgencySummary();
        const agencyTotals = new Map<string, number>();
        summary.forEach(item => {
            agencyTotals.set(item.agency, (agencyTotals.get(item.agency) || 0) + item.totalVolume);
        });
        return Array.from(agencyTotals.entries()).map(([name, volume]) => ({name, volume}));
    }

    getServiceTotalsArray(): Array<{name: string, volume: number}> {
        const summary = this.getAgencySummary();
        const serviceTotals = new Map<string, number>();
        summary.forEach(item => {
            serviceTotals.set(item.service, (serviceTotals.get(item.service) || 0) + item.totalVolume);
        });
        return Array.from(serviceTotals.entries()).map(([name, volume]) => ({name, volume}));
    }

    // Filtre utilitaire pour ignorer les lignes où PAYS = 'CM'
    private getFilteredMatches(): Match[] {
        const matches = this.response?.matches || [];
        if (!this.selectedService) return matches;
        return matches.filter(match => {
            const boService = match.boData['Service'] || '';
            return boService === this.selectedService;
        });
    }

    private getFilteredBoOnly(): Record<string, string>[] {
        // Pour TRXBO/OPPART, utiliser mismatches au lieu de boOnly
        const mismatches = this.response?.mismatches || [];
        const boOnly = this.response?.boOnly || [];
        
        // Combiner mismatches et boOnly pour l'affichage des écarts
        const allMismatches = [...mismatches, ...boOnly];
        
        if (!this.selectedService) return allMismatches;
        return allMismatches.filter(record => (record['Service'] || '') === this.selectedService);
    }

    private getFilteredPartnerOnly(): Record<string, string>[] {
        const partnerOnly = this.response?.partnerOnly || [];
        if (!this.selectedService) return partnerOnly;
        return partnerOnly.filter(record => (record['Service'] || '') === this.selectedService);
    }

    private invalidateCache() {
        this.cachedPagedAgencySummary = null;
        this.cachedTotalVolume = null;
        this.cachedTotalRecords = null;
        this.lastAgencySummaryHash = '';
    }

    applyServiceFilter() {
        // Appliquer le filtre seulement au clic
        this.matchesPage = 1;
        this.boOnlyPage = 1;
        this.partnerOnlyPage = 1;
        this.agencyPage = 1;
        this.initializeFilteredData();
        this.cdr.detectChanges();
        this.invalidateCache();
    }

    startReconciliation() {
        console.log('Démarrage d\'une nouvelle réconciliation');
        this.router.navigate(['/upload']).then(() => {
            console.log('Navigation vers /upload réussie');
        }).catch(error => {
            console.error('Erreur lors de la navigation vers /upload:', error);
        });
    }

    async saveAgencySummary() {
        if (this.isSaving) return;
        this.isSaving = true;

        try {
            const allSummaries = this.getAgencySummary();
            const selectedSummaries = allSummaries.filter(s => this.selectedAgencySummaries.includes(this.getAgencyKey(s)));
    
            if (selectedSummaries.length === 0) {
                this.popupService.showWarning('Veuillez sélectionner au moins une ligne à sauvegarder.');
                this.isSaving = false;
                return;
            }
    
            const summaryToSave = selectedSummaries.map(item => ({
                ...item,
                date: this.selectedDate
            }));
            
            const response = await this.reconciliationService.saveSelectedSummary(summaryToSave).toPromise();
            
            let message = response.message;
            if (response.saved && response.saved.length > 0) {
                message += `\nLignes sauvegardées: ${response.saved.length}`;
            }
            if (response.duplicates && response.duplicates.length > 0) {
                message += `\nLignes en double (ignorées): ${response.duplicates.length}`;
            }
            if (response.errors && response.errors.length > 0) {
                message += `\nErreurs: ${response.errors.length}`;
            }
            
            this.popupService.showInfo(message);
            
            // Notifier le dashboard seulement quand le résumé est enregistré avec succès
            this.appStateService.notifySummarySaved();
        } catch (error: any) {
            // Affichage détaillé du message d'erreur backend
            let msg = 'Erreur lors de la sauvegarde en base.';
            if (error && error.error) {
                if (error.error.message) {
                    msg = error.error.message;
                }
                if (error.error.details) {
                    msg += '\n' + error.error.details;
                }
                if (error.error.duplicateRecords) {
                    msg += '\nDoublons détectés :';
                    for (const d of error.error.duplicateRecords) {
                        msg += `\n- ${d.message}`;
                    }
                }
                if (error.error.errorRecords && error.error.errorRecords.length > 0) {
                    msg += '\nErreurs :';
                    for (const e of error.error.errorRecords) {
                        msg += `\n- ${e}`;
                    }
                }
            } else if (error && error.message) {
                msg = error.message;
            }
            this.popupService.showInfo(msg);
        } finally {
            this.isSaving = false;
        }
    }

    goToStats() {
        console.log('Navigation vers les statistiques');
        this.router.navigate(['/stats']).then(() => {
            console.log('Navigation vers /stats réussie');
        }).catch(error => {
            console.error('Erreur lors de la navigation vers /stats:', error);
        });
    }

    handleExport() {
        this.exportResults();
    }

    formatTime(ms: number): string {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        } else {
            return `${seconds}s`;
        }
    }

    getElapsedTime(): number {
        if (this.startTime > 0) {
            return Date.now() - this.startTime;
        }
        return 0;
    }

    getProcessingSpeed(): string {
        const elapsedTime = this.getElapsedTime();
        if (elapsedTime > 0 && this.processedRecords > 0) {
            const speed = Math.round((this.processedRecords / elapsedTime) * 1000);
            return speed.toString();
        }
        return '0';
    }

    getProgressStatus(): string {
        if (this.progressPercentage < 10) {
            return 'Initialisation...';
        } else if (this.progressPercentage < 30) {
            return 'Chargement des fichiers...';
        } else if (this.progressPercentage < 60) {
            return 'Traitement des données...';
        } else if (this.progressPercentage < 90) {
            return 'Réconciliation en cours...';
        } else if (this.progressPercentage < 100) {
            return 'Finalisation...';
        } else {
            return 'Terminé !';
        }
    }

    private listenToRealProgress() {
        console.log('🎯 Écoute de la progression réelle de la réconciliation...');
        
        this.subscription.add(
            this.reconciliationService.getProgress().subscribe((progress) => {
                console.log(`📈 Progression reçue du service: ${progress.percentage}% - ${progress.step}`);
                this.progressPercentage = progress.percentage;
                this.processedRecords = progress.processed;
                this.totalRecords = progress.total;
                
                // Forcer la détection des changements pour mettre à jour l'interface
                this.cdr.detectChanges();
            })
        );
    }

    private simulateProgress() {
        // Méthode de fallback si la progression réelle n'est pas disponible
        const interval = setInterval(() => {
            if (this.progressPercentage < 90 && this.showProgress) {
                this.progressPercentage += Math.random() * 10;
                this.processedRecords = Math.floor((this.progressPercentage / 100) * this.totalRecords);
                this.cdr.detectChanges();
            } else {
                clearInterval(interval);
            }
        }, 500);
    }

    exporterResumeParAgence(data: any[]) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Résumé par agence');

        // Définir les colonnes
        worksheet.columns = [
            { header: 'Agence', key: 'agence', width: 30 },
            { header: 'Nombre', key: 'nombre', width: 15 },
            { header: 'Volume', key: 'volume', width: 20 },
            // Ajoute d'autres colonnes selon tes besoins
        ];

        // Ajouter les données
        data.forEach(item => {
            worksheet.addRow({
                agence: item.agence,
                nombre: item.nombre,
                volume: item.volume,
                // autres champs...
            });
        });

        // Appliquer des couleurs et styles au header
        worksheet.getRow(1).eachCell(cell => {
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFB6D7A8' } // Vert clair, change la couleur si besoin
            };
            cell.font = { bold: true };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
        });

        // Appliquer un style aux lignes (exemple : alternance de couleurs)
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
                row.eachCell(cell => {
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: rowNumber % 2 === 0 ? 'FFF9E79F' : 'FFFFFFFF' } // Jaune pâle ou blanc
                    };
                });
            }
        });

        // Générer le fichier et le télécharger
        workbook.xlsx.writeBuffer().then(buffer => {
            const blob = new Blob([buffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            saveAs(blob, 'resume_par_agence.xlsx');
        });
    }



    // Utilisation d'une clé unique pour chaque ligne
    getAgencyKey(summary: any): string {
        return `${summary.agency}__${summary.service}__${summary.country}`;
    }

    /**
     * Génère un rapport regroupé des écarts BO et Partenaire
     */
    generateEcartReport(): any {
        if (!this.response) {
            return null;
        }

        // Fonction pour extraire les données communes d'un enregistrement
        const extractCommonData = (record: any, source: string) => {
            const baseData = {
                Service: this.getValueWithFallback(record, ['Service', 'service', 'SERVICE', 'CLE', 'cle', 'key', 'id', 'Id', 'ID']),
                telephoneClient: this.getValueWithFallback(record, ['téléphone client', 'telephone', 'phone', 'numéro', 'numero']),
                montant: this.getValueWithFallback(record, ['montant', 'amount', 'valeur', 'prix']),
                Agence: this.getValueWithFallback(record, ['Agence', 'agence', 'agency', 'bureau', 'point']),
                Date: this.formatDateForReport(this.getValueWithFallback(record, ['Date', 'date', 'DateTransaction', 'created_at'])),
                SOURCE: source
            };

            // Debug pour les données Partenaire
            if (source === 'PARTENAIRE') {
                console.log('🔍 Debug extractCommonData PARTENAIRE:');
                console.log('- Record original:', record);
                console.log('- BaseData généré:', baseData);
                console.log('- Colonnes disponibles dans record:', Object.keys(record));
            }

            // Pour les écarts BO, ajouter les colonnes supplémentaires
            if (source === 'BO') {
                return {
                    ...baseData,
                    numeroTransGU: this.getValueWithFallback(record, ['numéro trans gu', 'numero_trans_gu', 'numéro_trans_gu', 'Numéro Trans GU', 'transaction_number', 'trans_gu']),
                    IDTransaction: this.getValueWithFallback(record, ['IDTransaction', 'id_transaction', 'transaction_id', 'idTransaction'])
                };
            } else {
                // Pour les écarts Partenaire, ajouter l'heure
                const result = {
                    ...baseData,
                    Heure: this.extractTimeFromRecord(record)
                };
                
                if (source === 'PARTENAIRE') {
                    console.log('🔍 Résultat final PARTENAIRE:', result);
                }
                
                return result;
            }
        };

        // Regrouper les écarts BO
        const ecartBo = (this.response.boOnly || []).map(record => 
            extractCommonData(record, 'BO')
        );

        // Regrouper les écarts Partenaire
        const ecartPartenaire = (this.response.partnerOnly || []).map(record => 
            extractCommonData(record, 'PARTENAIRE')
        );

        // Debug pour vérifier les données générées
        console.log('🔍 Debug generateEcartReport:');
        console.log('- Données originales partnerOnly:', this.response.partnerOnly?.length || 0);
        console.log('- Premier enregistrement partnerOnly:', this.response.partnerOnly?.[0]);
        console.log('- Écarts Partenaire générés:', ecartPartenaire.length);
        console.log('- Premier écart Partenaire généré:', ecartPartenaire[0]);

        return {
            ecartBo,
            ecartPartenaire,
            totalEcartBo: ecartBo.length,
            totalEcartPartenaire: ecartPartenaire.length,
            totalEcart: ecartBo.length + ecartPartenaire.length,
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * Aide pour extraire une valeur avec fallback sur plusieurs clés possibles
     */
    private getValueWithFallback(record: any, keys: string[]): string {
        for (const key of keys) {
            if (record[key] !== undefined && record[key] !== null && record[key] !== '') {
                return String(record[key]);
            }
        }
        return '';
    }

    /**
     * Formate la date pour le rapport
     */
    private formatDateForReport(dateValue: string): string {
        if (!dateValue) return '';
        
        try {
            // Si c'est déjà au format DD/MM/YYYY
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateValue)) {
                return dateValue;
            }
            
            // Si c'est au format ISO ou autre, convertir
            const date = new Date(dateValue);
            if (!isNaN(date.getTime())) {
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                return `${day}/${month}/${year}`;
            }
        } catch (error) {
            console.warn('Erreur de formatage de date:', error);
        }
        
        return dateValue; // Retourner la valeur originale si le formatage échoue
    }

    /**
     * Extrait l'heure d'un enregistrement partenaire
     */
    private extractTimeFromRecord(record: any): string {
        // Chercher une colonne heure spécifique
        const timeValue = this.getValueWithFallback(record, ['HEURE', 'Heure', 'heure', 'time', 'Time']);
        if (timeValue) {
            // Si c'est déjà au format HH:MM:SS
            if (/^\d{2}:\d{2}:\d{2}$/.test(timeValue)) {
                return timeValue;
            }
            
            // Si c'est dans la date, extraire la partie heure
            const dateValue = this.getValueWithFallback(record, ['Date', 'date', 'DateTransaction']);
            if (dateValue && dateValue.includes(' ')) {
                const timePart = dateValue.split(' ')[1];
                if (timePart && /^\d{2}:\d{2}:\d{2}/.test(timePart)) {
                    return timePart.substring(0, 8); // HH:MM:SS
                }
            }
        }
        
        return '';
    }

    /**
     * Ouvre la popup de sélection des colonnes pour l'export
     */
    openColumnSelector(): void {
        // Vérifier s'il y a au moins des écarts BO ou Partenaire
        const hasBoEcart = this.response?.boOnly && this.response.boOnly.length > 0;
        const hasPartnerEcart = this.response?.partnerOnly && this.response.partnerOnly.length > 0;
        
        if (!hasBoEcart && !hasPartnerEcart) {
            this.popupService.showWarning('❌ Aucun écart disponible pour l\'export.');
            return;
        }

        // Extraire uniquement les colonnes disponibles du fichier partenaire en cours
        this.availableColumns = [];
        const allColumns = new Set<string>();
        
        if (hasPartnerEcart) {
            this.response.partnerOnly.forEach(record => {
                Object.keys(record).forEach(key => {
                    if (record[key] !== undefined && record[key] !== null && record[key] !== '') {
                        allColumns.add(key);
                    }
                });
            });
        }

        this.availableColumns = Array.from(allColumns).sort();
        
        // Initialiser toutes les colonnes comme non sélectionnées par défaut
        this.selectedColumns = {};
        this.availableColumns.forEach(col => {
            this.selectedColumns[col] = false;
        });

        // Si pas de colonnes partenaire disponibles, afficher un message informatif
        if (!hasPartnerEcart && hasBoEcart) {
            this.popupService.showInfo('ℹ️ Aucun écart partenaire détecté. Seuls les écarts BO seront exportés.');
        }

        this.showColumnSelector = true;
    }

    /**
     * Ferme la popup de sélection des colonnes
     */
    closeColumnSelector(): void {
        this.showColumnSelector = false;
    }

    /**
     * Sélectionne/désélectionne toutes les colonnes
     */
    toggleAllColumns(selected: boolean): void {
        this.availableColumns.forEach(col => {
            this.selectedColumns[col] = selected;
        });
    }

    /**
     * Vérifie si toutes les colonnes sont sélectionnées
     */
    get allColumnsSelected(): boolean {
        return this.availableColumns.every(col => this.selectedColumns[col]);
    }

    /**
     * Vérifie si certaines colonnes sont sélectionnées
     */
    get someColumnsSelected(): boolean {
        return this.availableColumns.some(col => this.selectedColumns[col]) && !this.allColumnsSelected;
    }

    get selectedColumnsCount(): number {
        return this.availableColumns.filter(col => this.selectedColumns[col]).length;
    }

    /**
     * Exporte le rapport des écarts en CSV avec les colonnes sélectionnées
     */
    async exportEcartReport(): Promise<void> {
        try {
            const report = this.generateEcartReport();
            if (!report) {
                this.popupService.showWarning('❌ Aucune donnée disponible pour le rapport.');
                return;
            }

            // Vérifier s'il y a au moins des écarts BO ou Partenaire
            if (report.ecartBo.length === 0 && report.ecartPartenaire.length === 0) {
                this.popupService.showWarning('❌ Aucun écart disponible pour l\'export.');
                return;
            }

            // Créer le contenu CSV avec les deux sections côte à côte
            let csvContent = '';
            
            // Obtenir les colonnes sélectionnées pour les écarts Partenaire
            const selectedPartnerColumns = this.availableColumns.filter(col => this.selectedColumns[col]);
            
            // Debug pour vérifier les données
            console.log('🔍 Debug Export Rapport:');
            console.log('- Écarts BO disponibles:', report.ecartBo.length);
            console.log('- Écarts Partenaire disponibles:', report.ecartPartenaire.length);
            console.log('- Colonnes disponibles:', this.availableColumns);
            console.log('- Colonnes sélectionnées:', selectedPartnerColumns);
            console.log('- Sélection actuelle:', this.selectedColumns);
            
            // En-têtes côte à côte
            const boHeader = 'Service;téléphone client;montant;Agence;Date;Numéro Trans GU;IDTransaction;SOURCE';
            const partnerHeader = selectedPartnerColumns.length > 0 ? selectedPartnerColumns.join(';') : '';
            
            // Calculer l'espacement entre les colonnes (2 colonnes vides pour séparer)
            const spacing = ';;';
            
            // Ligne 1: Titre ECART BO centré au-dessus de son tableau
            const boColumnsCount = boHeader.split(';').length;
            const partnerColumnsCount = selectedPartnerColumns.length;
            
            // Centrer le titre ECART BO
            const boTitlePadding = Math.floor((boColumnsCount - 1) / 2);
            const boTitleCells = ';'.repeat(boTitlePadding) + 'ECART BO' + ';'.repeat(boColumnsCount - 1 - boTitlePadding);
            
            // Centrer le titre ECART PARTENAIRE (seulement s'il y a des colonnes sélectionnées)
            const partnerTitlePadding = Math.floor((partnerColumnsCount - 1) / 2);
            const partnerTitleCells = partnerColumnsCount > 0 ? 
                ';'.repeat(partnerTitlePadding) + 'ECART PARTENAIRE' + ';'.repeat(partnerColumnsCount - 1 - partnerTitlePadding) : '';
            
            csvContent += `${boTitleCells}${spacing}${partnerTitleCells}\n`;
            
            // Ligne 2: En-têtes des colonnes
            csvContent += `${boHeader}${spacing}${partnerHeader}\n`;
            
            // Trouver le nombre maximum de lignes entre les deux sections
            const maxRows = Math.max(report.ecartBo.length, report.ecartPartenaire.length);
            
            // Générer les lignes côte à côte
            for (let i = 0; i < maxRows; i++) {
                let boRow = '';
                let partnerRow = '';
                
                // Ligne ECART BO
                if (i < report.ecartBo.length) {
                    const boItem = report.ecartBo[i];
                    boRow = `${boItem.Service || boItem.CLE};${boItem.telephoneClient};${boItem.montant};${boItem.Agence};${boItem.Date};${boItem.numeroTransGU};${boItem.IDTransaction};${boItem.SOURCE}`;
                } else {
                    // Remplir avec des valeurs vides si pas de données
                    boRow = ';'.repeat(boColumnsCount - 1);
                }
                
                // Ligne ECART PARTENAIRE (seulement si des colonnes sont sélectionnées)
                if (i < report.ecartPartenaire.length && selectedPartnerColumns.length > 0) {
                    // Utiliser directement les données originales au lieu des données transformées
                    const originalPartnerRecord = this.response?.partnerOnly?.[i];
                    console.log(`🔍 Ligne ${i} - Données Partenaire Originales:`, originalPartnerRecord);
                    
                    const row = selectedPartnerColumns.map(col => {
                        let value = '';
                        
                        // Utiliser directement la valeur de la colonne dans les données originales
                        if (originalPartnerRecord && originalPartnerRecord[col] !== undefined && originalPartnerRecord[col] !== null && originalPartnerRecord[col] !== '') {
                            value = String(originalPartnerRecord[col]);
                        } else {
                            // Si pas trouvé, essayer avec les propriétés transformées comme fallback
                            const partnerItem = report.ecartPartenaire[i];
                            switch (col) {
                                case 'CLE': value = partnerItem.CLE || ''; break;
                                case 'téléphone client': value = partnerItem.telephoneClient || ''; break;
                                case 'montant': value = partnerItem.montant || ''; break;
                                case 'Agence': value = partnerItem.Agence || ''; break;
                                case 'Date': value = partnerItem.Date || ''; break;
                                case 'HEURE': value = partnerItem.Heure || ''; break;
                                case 'SOURCE': value = partnerItem.SOURCE || ''; break;
                                default: value = ''; break;
                            }
                        }
                        
                        console.log(`  - Colonne "${col}": "${value}"`);
                        return value;
                    });
                    partnerRow = row.join(';');
                    console.log(`  - Ligne finale Partenaire: "${partnerRow}"`);
                } else {
                    // Remplir avec des valeurs vides si pas de données ou pas de colonnes sélectionnées
                    partnerRow = partnerColumnsCount > 0 ? ';'.repeat(partnerColumnsCount - 1) : '';
                    console.log(`🔍 Ligne ${i} - Pas de données Partenaire, ligne vide: "${partnerRow}"`);
                }
                
                // Ajouter la ligne au CSV (avec ou sans colonnes partenaire)
                if (partnerColumnsCount > 0) {
                    csvContent += `${boRow}${spacing}${partnerRow}\n`;
                } else {
                    csvContent += `${boRow}\n`;
                }
            }

            // Créer et télécharger le fichier Excel avec couleurs
            await this.createExcelReport(report, selectedPartnerColumns, boHeader, partnerHeader);

            const selectedCount = this.availableColumns.filter(col => this.selectedColumns[col]).length;
            const hasPartnerColumns = selectedCount > 0;
            
            let successMessage = `✅ Rapport des écarts exporté avec succès !\n\n📊 Résumé:\n• Écarts BO: ${report.totalEcartBo} lignes (format fixe)`;
            
            if (hasPartnerColumns) {
                successMessage += `\n• Écarts Partenaire: ${report.totalEcartPartenaire} lignes (${selectedCount} colonnes sélectionnées)\n• Format: Côte à côte avec espacement`;
            } else {
                successMessage += `\n• Format: Écarts BO uniquement`;
            }
            
            successMessage += `\n• Total: ${report.totalEcart}`;
            
            this.popupService.showSuccess(successMessage);
            
            // Fermer la popup après l'export
            this.closeColumnSelector();

        } catch (error) {
            console.error('❌ Erreur lors de l\'export du rapport:', error);
            this.popupService.showError('❌ Erreur lors de l\'export du rapport des écarts.');
        }
    }

    /**
     * Confirme l'export avec les colonnes sélectionnées
     */
    confirmExportWithSelectedColumns(): void {
        const selectedCount = this.availableColumns.filter(col => this.selectedColumns[col]).length;
        const report = this.generateEcartReport();
        
        // Vérifier s'il y a des écarts BO (permettre l'export même sans colonnes partenaire)
        const hasBoEcart = report && report.ecartBo && report.ecartBo.length > 0;
        const hasPartnerEcart = report && report.ecartPartenaire && report.ecartPartenaire.length > 0;
        
        if (selectedCount === 0 && !hasBoEcart) {
            this.popupService.showWarning('⚠️ Veuillez sélectionner au moins une colonne pour l\'export ou vérifiez qu\'il y a des écarts BO.');
            return;
        }
        
        if (hasBoEcart && selectedCount === 0) {
            this.popupService.showInfo('ℹ️ Export des écarts BO uniquement (aucune colonne partenaire sélectionnée).');
        }
        
        this.exportEcartReport();
    }

    /**
     * Crée un rapport Excel avec des couleurs
     */
    async createExcelReport(report: any, selectedPartnerColumns: string[], boHeader: string, partnerHeader: string): Promise<void> {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Rapport Écarts');

            // Définir les styles
            const titleStyle = {
                font: { bold: true, size: 14, color: { argb: 'FFFFFF' } },
                fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: '4472C4' } },
                alignment: { horizontal: 'center' as const, vertical: 'middle' as const }
            };

            const headerStyle = {
                font: { bold: true, size: 11, color: { argb: 'FFFFFF' } },
                fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: '4472C4' } },
                alignment: { horizontal: 'center' as const, vertical: 'middle' as const },
                border: {
                    top: { style: 'thin' as const, color: { argb: '000000' } },
                    left: { style: 'thin' as const, color: { argb: '000000' } },
                    bottom: { style: 'thin' as const, color: { argb: '000000' } },
                    right: { style: 'thin' as const, color: { argb: '000000' } }
                }
            };

            const dataStyle = {
                border: {
                    top: { style: 'thin' as const, color: { argb: '000000' } },
                    left: { style: 'thin' as const, color: { argb: '000000' } },
                    bottom: { style: 'thin' as const, color: { argb: '000000' } },
                    right: { style: 'thin' as const, color: { argb: '000000' } }
                },
                alignment: { vertical: 'middle' as const }
            };

            const boColumnsCount = boHeader.split(';').length;
            const partnerColumnsCount = selectedPartnerColumns.length;
            const spacing = 2; // 2 colonnes d'espacement
            const topSpacing = 2; // 2 lignes d'espacement en haut

            // Ligne 1-2: Espacement en haut (lignes vides)
            // Pas de contenu sur ces lignes

            // Ligne 3: Titre principal "ECART Réconciliation [Agence] du [Date]"
            const reportTitle = this.generateReportTitle();
            const totalColumns = boColumnsCount + spacing + partnerColumnsCount;
            
            // Centrer le titre en fusionnant toutes les colonnes disponibles
            worksheet.getCell(topSpacing + 1, 1).value = reportTitle;
            worksheet.getCell(topSpacing + 1, 1).style = {
                font: { bold: true, size: 16, color: { argb: '000000' } },
                alignment: { horizontal: 'center' as const, vertical: 'middle' as const }
            };
            
            // Fusionner toutes les colonnes pour centrer parfaitement le titre
            worksheet.mergeCells(topSpacing + 1, 1, topSpacing + 1, totalColumns);

            // Ligne 4: Titres des sections "ECART BO" et "ECART PARTENAIRE"
            const boTitleCol = Math.floor(boColumnsCount / 2);
            const partnerTitleCol = boColumnsCount + spacing + Math.floor(partnerColumnsCount / 2);

            worksheet.getCell(topSpacing + 2, boTitleCol + 1).value = 'ECART BO';
            worksheet.getCell(topSpacing + 2, boTitleCol + 1).style = titleStyle;
            worksheet.mergeCells(topSpacing + 2, boTitleCol + 1, topSpacing + 2, boTitleCol + 1);

            worksheet.getCell(topSpacing + 2, partnerTitleCol + 1).value = 'ECART PARTENAIRE';
            worksheet.getCell(topSpacing + 2, partnerTitleCol + 1).style = titleStyle;
            worksheet.mergeCells(topSpacing + 2, partnerTitleCol + 1, topSpacing + 2, partnerTitleCol + 1);

            // Ligne 5: En-têtes
            const boHeaders = boHeader.split(';');
            const partnerHeaders = partnerHeader.split(';');

            boHeaders.forEach((header, index) => {
                const cell = worksheet.getCell(topSpacing + 3, index + 1);
                cell.value = header;
                cell.style = headerStyle;
            });

            partnerHeaders.forEach((header, index) => {
                const cell = worksheet.getCell(topSpacing + 3, boColumnsCount + spacing + index + 1);
                cell.value = header;
                cell.style = headerStyle;
            });

            // Données
            const maxRows = Math.max(report.ecartBo.length, report.ecartPartenaire.length);

            for (let i = 0; i < maxRows; i++) {
                const rowIndex = i + topSpacing + 4; // +topSpacing (2) + 4 car on a le titre principal + titres sections + en-têtes

                // Données BO
                if (i < report.ecartBo.length) {
                    const boItem = report.ecartBo[i];
                    const boData = [boItem.Service || boItem.CLE, boItem.telephoneClient, boItem.montant, boItem.Agence, boItem.Date, boItem.numeroTransGU, boItem.IDTransaction, boItem.SOURCE];
                    
                    boData.forEach((value, colIndex) => {
                        const cell = worksheet.getCell(rowIndex, colIndex + 1);
                        cell.value = value;
                        cell.style = dataStyle;
                    });
                }

                // Données Partenaire
                if (i < report.ecartPartenaire.length && selectedPartnerColumns.length > 0) {
                    // Utiliser directement les données originales au lieu des données transformées
                    const originalPartnerRecord = this.response?.partnerOnly?.[i];
                    console.log(`🔍 Excel - Ligne ${i} - Données Partenaire Originales:`, originalPartnerRecord);
                    
                    selectedPartnerColumns.forEach((col, colIndex) => {
                        let value = '';
                        
                        // Utiliser directement la valeur de la colonne dans les données originales
                        if (originalPartnerRecord && originalPartnerRecord[col] !== undefined && originalPartnerRecord[col] !== null && originalPartnerRecord[col] !== '') {
                            value = String(originalPartnerRecord[col]);
                        } else {
                            // Si pas trouvé, essayer avec les propriétés transformées comme fallback
                            const partnerItem = report.ecartPartenaire[i];
                            switch (col) {
                                case 'CLE': value = partnerItem.CLE || ''; break;
                                case 'téléphone client': value = partnerItem.telephoneClient || ''; break;
                                case 'montant': value = partnerItem.montant || ''; break;
                                case 'Agence': value = partnerItem.Agence || ''; break;
                                case 'Date': value = partnerItem.Date || ''; break;
                                case 'HEURE': value = partnerItem.Heure || ''; break;
                                case 'SOURCE': value = partnerItem.SOURCE || ''; break;
                                default: value = ''; break;
                            }
                        }
                        
                        console.log(`  - Excel - Colonne "${col}": "${value}"`);
                        
                        const cell = worksheet.getCell(rowIndex, boColumnsCount + spacing + colIndex + 1);
                        cell.value = value;
                        cell.style = dataStyle;
                    });
                }
            }

            // Ajuster la largeur des colonnes
            for (let i = 1; i <= boColumnsCount + spacing + partnerColumnsCount; i++) {
                worksheet.getColumn(i).width = 15;
            }

            // Télécharger le fichier
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `rapport_ecarts_${new Date().toISOString().split('T')[0]}.xlsx`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            console.error('❌ Erreur lors de la création du fichier Excel:', error);
            // Fallback vers CSV si Excel échoue
            const csvContent = this.generateCsvContent(report, selectedPartnerColumns, boHeader, partnerHeader);
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `rapport_ecarts_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    /**
     * Génère le titre du rapport avec agence et date
     */
    private generateReportTitle(): string {
        let agency = '';
        let date = '';

        // Récupérer l'agence à partir des données BO ou Partenaire
        if (this.response?.boOnly && this.response.boOnly.length > 0) {
            const firstBoRecord = this.response.boOnly[0];
            agency = this.getValueWithFallback(firstBoRecord, ['Agence', 'agence', 'AGENCE', 'agency', 'Agency', 'AGENCY']);
        } else if (this.response?.partnerOnly && this.response.partnerOnly.length > 0) {
            const firstPartnerRecord = this.response.partnerOnly[0];
            agency = this.getValueWithFallback(firstPartnerRecord, ['Agence', 'agence', 'AGENCE', 'agency', 'Agency', 'AGENCY']);
        }

        // Récupérer la date à partir de selectedDate ou date actuelle
        if (this.selectedDate) {
            const dateObj = new Date(this.selectedDate);
            date = dateObj.toLocaleDateString('fr-FR', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric' 
            });
        } else {
            // Utiliser la date actuelle si pas de date sélectionnée
            date = new Date().toLocaleDateString('fr-FR', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric' 
            });
        }

        // Construire le titre
        if (agency && agency.trim() !== '') {
            return `ECART Réconciliation ${agency} du ${date}`;
        } else {
            return `ECART Réconciliation du ${date}`;
        }
    }

    /**
     * Génère le contenu CSV (fallback)
     */
    private generateCsvContent(report: any, selectedPartnerColumns: string[], boHeader: string, partnerHeader: string): string {
        let csvContent = '';
        
        const spacing = ';;';
        const boColumnsCount = boHeader.split(';').length;
        const partnerColumnsCount = selectedPartnerColumns.length;
        const topSpacing = 2; // 2 lignes d'espacement en haut

        // Ajouter l'espacement en haut (2 lignes vides)
        const emptyRow = ';'.repeat(boColumnsCount + 2 + partnerColumnsCount - 1); // -1 car on compte déjà les séparateurs
        csvContent += `${emptyRow}\n`;
        csvContent += `${emptyRow}\n`;

        // Titre principal "ECART Réconciliation [Agence] du [Date]"
        const reportTitle = this.generateReportTitle();
        const totalColumns = boColumnsCount + 2 + partnerColumnsCount;
        
        // Centrer le titre en calculant l'espacement optimal
        const titleLength = reportTitle.length;
        const availableSpace = totalColumns - 1; // -1 car on compte déjà les séparateurs
        const leftPadding = Math.floor((availableSpace - titleLength) / 2);
        const rightPadding = availableSpace - titleLength - leftPadding;
        
        const titleRow = ';'.repeat(Math.max(0, leftPadding)) + reportTitle + ';'.repeat(Math.max(0, rightPadding));
        csvContent += `${titleRow}\n`;

        // Titres centrés
        const boTitlePadding = Math.floor((boColumnsCount - 1) / 2);
        const boTitleCells = ';'.repeat(boTitlePadding) + 'ECART BO' + ';'.repeat(boColumnsCount - 1 - boTitlePadding);

        const partnerTitlePadding = Math.floor((partnerColumnsCount - 1) / 2);
        const partnerTitleCells = ';'.repeat(partnerTitlePadding) + 'ECART PARTENAIRE' + ';'.repeat(partnerColumnsCount - 1 - partnerTitlePadding);

        csvContent += `${boTitleCells}${spacing}${partnerTitleCells}\n`;
        csvContent += `${boHeader}${spacing}${partnerHeader}\n`;

        const maxRows = Math.max(report.ecartBo.length, report.ecartPartenaire.length);

        for (let i = 0; i < maxRows; i++) {
            let boRow = '';
            let partnerRow = '';

            if (i < report.ecartBo.length) {
                const boItem = report.ecartBo[i];
                boRow = `${boItem.Service || boItem.CLE};${boItem.telephoneClient};${boItem.montant};${boItem.Agence};${boItem.Date};${boItem.numeroTransGU};${boItem.IDTransaction};${boItem.SOURCE}`;
            } else {
                boRow = ';'.repeat(boColumnsCount - 1);
            }

            if (i < report.ecartPartenaire.length && selectedPartnerColumns.length > 0) {
                // Utiliser directement les données originales au lieu des données transformées
                const originalPartnerRecord = this.response?.partnerOnly?.[i];
                
                const row = selectedPartnerColumns.map(col => {
                    let value = '';
                    
                    // Utiliser directement la valeur de la colonne dans les données originales
                    if (originalPartnerRecord && originalPartnerRecord[col] !== undefined && originalPartnerRecord[col] !== null && originalPartnerRecord[col] !== '') {
                        value = String(originalPartnerRecord[col]);
                    } else {
                        // Si pas trouvé, essayer avec les propriétés transformées comme fallback
                        const partnerItem = report.ecartPartenaire[i];
                        switch (col) {
                            case 'CLE': value = partnerItem.CLE || ''; break;
                            case 'téléphone client': value = partnerItem.telephoneClient || ''; break;
                            case 'montant': value = partnerItem.montant || ''; break;
                            case 'Agence': value = partnerItem.Agence || ''; break;
                            case 'Date': value = partnerItem.Date || ''; break;
                            case 'HEURE': value = partnerItem.Heure || ''; break;
                            case 'SOURCE': value = partnerItem.SOURCE || ''; break;
                            default: value = ''; break;
                        }
                    }
                    
                    return value;
                });
                partnerRow = row.join(';');
            } else {
                partnerRow = ';'.repeat(partnerColumnsCount - 1);
            }

            csvContent += `${boRow}${spacing}${partnerRow}\n`;
        }

        return csvContent;
    }
} 
