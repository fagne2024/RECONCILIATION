import { Component, Input, OnInit, ChangeDetectorRef, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { ReconciliationResponse, Match } from '../../models/reconciliation-response.model';
import { AppStateService } from '../../services/app-state.service';
import { Router } from '@angular/router';
import { ReconciliationService } from '../../services/reconciliation.service';
import { EcartSoldeService } from '../../services/ecart-solde.service';
import { EcartSolde } from '../../models/ecart-solde.model';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { HttpClient } from '@angular/common/http';
import { Subscription, firstValueFrom } from 'rxjs';

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
                        {{ progressPercentage | number:'1.0-1' }}% terminé
                    </div>
                </div>
                
                <div class="progress-details">
                    <div class="detail-item">
                        <span class="label">Enregistrements traités:</span>
                        <span class="value">{{ processedRecords | number }} / {{ totalRecords | number }}</span>
                    </div>
                    <div class="detail-item">
                        <span class="label">Temps écoulé:</span>
                        <span class="value">{{ formatTime(getElapsedTime()) }}</span>
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
                <h3>📊 Résumé de la réconciliation</h3>
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
                        <div class="stat-value">{{filteredBoOnly.length || 0}}</div>
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
                        ⚠️ ECART BO ({{filteredBoOnly.length || 0}})
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
                        <div class="match-card" *ngFor="let match of getPagedMatches()">
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
                                <div class="data-row" *ngFor="let key of getRecordKeys(record)">
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
                            <button (click)="exportResults()" class="export-button">
                                📥 Exporter les ECART Partenaire
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
                            <div class="data-grid">
                                <div class="info-row">
                                    <span class="label">Volume:</span>
                                    <span class="value">{{getPartnerOnlyVolume(record) | number:'1.0-0'}}</span>
                                </div>
                                <div class="info-row">
                                    <span class="label">Date:</span>
                                    <span class="value">{{getPartnerOnlyDate(record)}}</span>
                                </div>
                                <div class="data-row" *ngFor="let key of getRecordKeys(record)">
                                    <span class="label">{{key}}:</span>
                                    <span class="value">{{record[key]}}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="action-buttons">
                <button class="export-btn" (click)="exportResults()">
                    📥 Exporter les résultats
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
                    <div class="progress" [style.width.%]="exportProgress"></div>
                </div>
                <div class="progress-text">Export en cours... {{exportProgress}}%</div>
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
    isSaving: boolean = false;
    isSavingEcartBo: boolean = false;
    exportProgress = 0;
    isExporting = false;
    
    // Propriétés pour la progression de la réconciliation
    showProgress = false;
    progressPercentage = 0;
    processedRecords = 0;
    totalRecords = 0;
    executionTime = 0;
    startTime = 0;

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

    async saveEcartBoToEcartSolde(): Promise<void> {
        if (!this.response?.boOnly || this.response.boOnly.length === 0) {
            alert('❌ Aucune donnée ECART BO à sauvegarder.');
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
                    idTransaction: getValueWithFallback(['IDTransaction', 'id_transaction', 'ID_TRANSACTION', 'transaction_id', 'TransactionId']),
                    telephoneClient: getValueWithFallback(['téléphone client', 'telephone_client', 'TELEPHONE_CLIENT', 'phone', 'Phone']),
                    montant: parseFloat(getValueWithFallback(['montant', 'Montant', 'MONTANT', 'amount', 'Amount', 'volume', 'Volume'])) || 0,
                    service: agencyInfo.service,
                    agence: agencyInfo.agency,
                    dateTransaction: formatDateForBackend(agencyInfo.date),
                    numeroTransGu: getValueWithFallback(['Numéro Trans GU', 'numero_trans_gu', 'NUMERO_TRANS_GU', 'transaction_number', 'TransactionNumber']),
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
                alert('❌ Aucune donnée valide trouvée pour la sauvegarde.');
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

            if (!confirm(message)) {
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
            
            alert(successMessage);
            
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
            
            alert(errorMessage);
        } finally {
            this.isSavingEcartBo = false;
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

    constructor(
        private cdr: ChangeDetectorRef, 
        private appStateService: AppStateService, 
        private router: Router,
        private reconciliationService: ReconciliationService,
        private ecartSoldeService: EcartSoldeService,
        private http: HttpClient
    ) {}

    ngOnInit() {
        this.subscription.add(
            this.appStateService.getReconciliationResults().subscribe((response: ReconciliationResponse | null) => {
                if (response) {
                    this.response = response;
                    this.initializeFilteredData();
                    
                    // Initialiser les informations de progression
                    if (response.executionTimeMs) {
                        this.executionTime = response.executionTimeMs;
                    }
                    if (response.processedRecords) {
                        this.processedRecords = response.processedRecords;
                    }
                    if (response.progressPercentage) {
                        this.progressPercentage = response.progressPercentage;
                    }
                    
                    // Calculer le total des enregistrements
                    this.totalRecords = response.totalBoRecords + response.totalPartnerRecords;
                    
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
                    this.simulateProgress();
                }
                this.cdr.detectChanges();
            })
        );
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }

    private initializeFilteredData() {
        this.filteredMatches = this.getFilteredMatches();
        this.filteredBoOnly = this.getFilteredBoOnly();
        this.filteredPartnerOnly = this.getFilteredPartnerOnly();
    }

    onSearch() {
        const searchTerm = this.searchKey.toLowerCase();
        
        if (this.activeTab === 'matches') {
            this.filteredMatches = (this.response?.matches || []).filter(match => 
                match.key.toLowerCase().includes(searchTerm)
            );
            this.matchesPage = 1;
        } else if (this.activeTab === 'boOnly') {
            this.filteredBoOnly = (this.response?.boOnly || []).filter(record => 
                Object.values(record).some(value => 
                    value.toString().toLowerCase().includes(searchTerm)
                )
            );
            this.boOnlyPage = 1;
        } else if (this.activeTab === 'partnerOnly') {
            this.filteredPartnerOnly = (this.response?.partnerOnly || []).filter(record => 
                Object.values(record).some(value => 
                    value.toString().toLowerCase().includes(searchTerm)
                )
            );
            this.partnerOnlyPage = 1;
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
        this.activeTab = tab;
        this.agencyPage = 1;
        this.cdr.detectChanges();
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
        return Object.keys(match.boData);
    }

    getPartnerKeys(match: Match): string[] {
        return Object.keys(match.partnerData);
    }

    getRecordKeys(record: Record<string, string>): string[] {
        return Object.keys(record);
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
            
            // Récupérer toutes les clés
            const allKeys = new Set<string>();
            filteredBoOnly.forEach(record => {
                Object.keys(record).forEach(key => allKeys.add(key));
            });
            const keysArray = Array.from(allKeys);
            
            // Définir les colonnes
            const columns = keysArray.map(key => ({ header: key, key: key, width: 15 }));
            worksheet.columns = columns;
            
            // Ajouter les données
            filteredBoOnly.forEach(record => {
                const rowData: any = {};
                keysArray.forEach(key => {
                    rowData[key] = record[key] || '';
                });
                worksheet.addRow(rowData);
            });
            
            // Appliquer les styles
            worksheet.getRow(1).eachCell(cell => {
                cell.style = {
                    font: { bold: true, color: { argb: 'FFFFFFFF' } },
                    fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF4472C4' } },
                    alignment: { vertical: 'middle' as const, horizontal: 'center' as const }
                };
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
            
            // Récupérer toutes les clés
            const allKeys = new Set<string>();
            filteredPartnerOnly.forEach(record => {
                Object.keys(record).forEach(key => allKeys.add(key));
            });
            const keysArray = Array.from(allKeys);
            
            // Définir les colonnes
            const columns = keysArray.map(key => ({ header: key, key: key, width: 15 }));
            worksheet.columns = columns;
            
            // Ajouter les données
            filteredPartnerOnly.forEach(record => {
                const rowData: any = {};
                keysArray.forEach(key => {
                    rowData[key] = record[key] || '';
                });
                worksheet.addRow(rowData);
            });
            
            // Appliquer les styles
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
        const boData = match.boData;
        const agency = boData['Agence'] || '';
        const service = boData['Service'] || '';
        const volume = boData['montant'] ? parseFloat(boData['montant'].toString().replace(',', '.')) : 0;
        const date = boData['Date'] || '';
        const countryColumn = this.findCountryColumn(boData);
        const country = countryColumn ? boData[countryColumn] || 'Non spécifié' : 'Non spécifié';
        return { agency, service, volume, date, country };
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
        const country = countryColumn ? record[countryColumn] || 'Non spécifié' : 'Non spécifié';

        console.log('DEBUG: getBoOnlyAgencyAndService - Valeurs extraites:', {
            agency,
            service,
            volume,
            date,
            country,
            availableKeys: Object.keys(record)
        });

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
        const possibleColumns = ['Pays', 'PAYS', 'Country', 'COUNTRY'];
        for (const column of possibleColumns) {
            if (data[column]) {
                return column;
            }
        }
        // Si aucune colonne exacte n'est trouvée, chercher les colonnes qui contiennent les mots-clés
        const keywords = ['pays', 'country', 'grx'];
        for (const column of Object.keys(data)) {
            const lowerColumn = column.toLowerCase();
            if (keywords.some(keyword => lowerColumn.includes(keyword))) {
                return column;
            }
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
        const boOnly = this.response?.boOnly || [];
        if (!this.selectedService) return boOnly;
        return boOnly.filter(record => (record['Service'] || '') === this.selectedService);
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
                alert('Veuillez sélectionner au moins une ligne à sauvegarder.');
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
            
            alert(message);
            
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
            alert(msg);
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

    private simulateProgress() {
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

    getElapsedTime(): number {
        return this.startTime > 0 ? Date.now() - this.startTime : 0;
    }

    // Utilisation d'une clé unique pour chaque ligne
    getAgencyKey(summary: any): string {
        return `${summary.agency}__${summary.service}__${summary.country}`;
    }
} 