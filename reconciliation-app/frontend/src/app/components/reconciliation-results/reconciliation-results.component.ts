import { Component, Input, OnInit, ChangeDetectorRef, OnChanges, SimpleChanges, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { ReconciliationResponse, Match } from '../../models/reconciliation-response.model';
import { AppStateService } from '../../services/app-state.service';
import { Router, ActivatedRoute } from '@angular/router';
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
import { CompteService } from '../../services/compte.service';
import { OperationService } from '../../services/operation.service';
import { OperationCreateRequest } from '../../models/operation.model';
import { fixGarbledCharacters } from '../../utils/encoding-fixer';

interface ApiError {
    error?: {
        message?: string;
        details?: string;
    };
    message?: string;
}

@Component({
    selector: 'app-reconciliation-results',
    changeDetection: ChangeDetectionStrategy.OnPush,
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

        <div class="results-container">
            <div class="summary-section">
                <div class="summary-header">
                    <h3>📊 Résumé de la réconciliation</h3>
                    <button (click)="openColumnSelector()" class="report-button">
                        📋 Rapport des écarts
                    </button>
                </div>
                <div class="stats-grid">
                    <div class="stat-card stat-card-total">
                        <div class="stat-icon">📊</div>
                        <div class="stat-value">{{totalTransactions}}</div>
                        <div class="stat-label">Nombres de Transactions</div>
                    </div>
                    <div class="stat-card stat-card-matched">
                        <div class="stat-icon">✅</div>
                        <div class="stat-value">{{filteredMatchesCount}}</div>
                        <div class="stat-label">Transactions correspondantes</div>
                    </div>
                    <div class="stat-card stat-card-bo">
                        <div class="stat-icon">⚠️</div>
                        <div class="stat-value">{{filteredBoOnlyCount}}</div>
                        <div class="stat-label">Transactions non correspondantes BO</div>
                    </div>
                    <div class="stat-card stat-card-partner">
                        <div class="stat-icon">⚠️</div>
                        <div class="stat-value">{{filteredPartnerOnlyCount}}</div>
                        <div class="stat-label">Transactions non correspondantes Partenaire</div>
                    </div>
                </div>
            </div>

            <div class="results-tabs">
                <div class="tab-buttons">
                    <button 
                        class="matches-button"
                        (click)="goToMatches()">
                        ✅ Voir les Correspondances ({{filteredMatchesCount}})
                    </button>
                    <button 
                        class="ecart-bo-button"
                        (click)="goToEcartBo()">
                        ⚠️ Voir les ECART BO ({{filteredBoOnlyCount}})
                    </button>
                    <button 
                        class="ecart-partner-button"
                        (click)="goToEcartPartner()">
                        ⚠️ Voir les ECART Partenaire ({{filteredPartnerOnlyCount}})
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
                    <!-- Les correspondances sont maintenant sur une page séparée -->
                    
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
                        <!-- Indicateur de chargement avec progression -->
                        <div *ngIf="isLoadingMatches" class="loading-indicator">
                            <div class="spinner"></div>
                            <div class="loading-progress">
                                <span>Chargement des correspondances...</span>
                                <div *ngIf="loadingProgress.matches.total > 0" class="progress-info">
                                    <div class="progress-bar-mini">
                                        <div class="progress-fill-mini" [style.width.%]="loadingProgress.matches.percentage"></div>
                                    </div>
                                    <span class="progress-text-mini">
                                        {{loadingProgress.matches.current | number}} / {{loadingProgress.matches.total | number}} 
                                        ({{loadingProgress.matches.percentage}}%)
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div class="search-section" *ngIf="!isLoadingMatches">
                            <input 
                                type="text" 
                                [(ngModel)]="searchKey" 
                                (input)="onSearch()"
                                placeholder="Rechercher par clé..."
                                class="search-input"
                            >
                            <button (click)="showVolumeSummary = !showVolumeSummary" class="toggle-volume-btn" [class.active]="showVolumeSummary">
                                {{ showVolumeSummary ? '📊 Masquer les volumes' : '📊 Afficher les volumes' }}
                            </button>
                            <button (click)="showMatchesList = !showMatchesList" class="toggle-matches-btn" [class.active]="showMatchesList">
                                {{ showMatchesList ? '📋 Masquer la liste' : '📋 Afficher la liste' }}
                            </button>
                            <button (click)="handleExport()" class="export-button">
                                📥 Exporter les correspondances
                            </button>
                        </div>
                        <div class="volume-summary" *ngIf="showVolumeSummary">
                            <h4>📊 Résumé des volumes</h4>
                            <div class="volume-grid">
                                <div class="volume-card">
                                    <div class="volume-label">Volume total BO</div>
                                    <div class="volume-value">{{totalVolumeBo | number:'1.0-0'}}</div>
                                </div>
                                <div class="volume-card">
                                    <div class="volume-label">Volume total Partenaire</div>
                                    <div class="volume-value">{{totalVolumePartner | number:'1.0-0'}}</div>
                                </div>
                                <div class="volume-card">
                                    <div class="volume-label">Différence totale</div>
                                    <div class="volume-value" [class.positive]="volumeDifference > 0" [class.negative]="volumeDifference < 0">
                                        {{volumeDifference | number:'1.0-0'}}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="matches-list-section" *ngIf="showMatchesList && !isLoadingMatches">
                            <div *ngIf="filteredMatchesCount === 0 && matchesLoaded" class="no-data-message">
                                <p>Aucune correspondance trouvée</p>
                            </div>
                            <div *ngIf="filteredMatchesCount > 0">
                                <div class="pagination-controls">
                                    <button (click)="prevPage('matches')" [disabled]="matchesPage === 1">Précédent</button>
                                    <span>Page {{matchesPage}} / {{totalMatchesPages}}</span>
                                    <button (click)="nextPage('matches')" [disabled]="matchesPage === totalMatchesPages">Suivant</button>
                                </div>
                                <div class="match-card" *ngFor="let match of pagedMatches; trackBy: trackByMatchKey">
                            <!-- Fiche des champs clés -->
                            <div class="match-header fiche-header">
                                <div class="fiche-row">
                                    <span class="fiche-label">Clé :</span>
                                    <span class="fiche-value">{{match.key}}</span>
                                </div>
                                <div class="fiche-row">
                                    <span class="fiche-label">Statut :</span>
                                    <span class="fiche-value" [class.has-differences]="getCachedHasDifferences(match)">
                                    {{getCachedHasDifferences(match) ? '⚠️ Différences détectées' : '✅ Correspondance parfaite'}}
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
                                    <span class="fiche-value">{{getCachedBoAgencyAndService(match).agency}}</span>
                                    <span class="fiche-label">Service :</span>
                                    <span class="fiche-value">{{getCachedBoAgencyAndService(match).service}}</span>
                                        </div>
                                    </div>
                            <!-- Deux colonnes alignées -->
                            <div class="match-content two-columns">
                                <div class="data-column">
                                    <h4>🏢 BO</h4>
                                    <div class="data-grid refined-grid">
                                        <div class="data-row" *ngFor="let key of getCachedBoKeys(match); trackBy: trackByString">
                                            <span class="label">{{key}} :</span>
                                            <span class="value">{{getBoValue(match, key)}}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="data-column">
                                    <h4>🤝 Partenaire</h4>
                                    <div class="data-grid refined-grid">
                                        <div class="data-row" *ngFor="let key of getCachedPartnerKeys(match); trackBy: trackByString">
                                            <span class="label">{{key}} :</span>
                                            <span class="value">{{getPartnerValue(match, key)}}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="differences-section" *ngIf="getCachedHasDifferences(match)">
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
                        </div>
                    </div>

                    <!-- Les écarts BO sont maintenant sur une page séparée -->

                    <!-- ECART Partenaire avec pagination -->
                    <div *ngIf="activeTab === 'partnerOnly'" class="partner-only-section">
                        <!-- Indicateur de chargement avec progression -->
                        <div *ngIf="isLoadingPartnerOnly" class="loading-indicator">
                            <div class="spinner"></div>
                            <div class="loading-progress">
                                <span>Chargement des écarts partenaire...</span>
                                <div *ngIf="loadingProgress.partnerOnly.total > 0" class="progress-info">
                                    <div class="progress-bar-mini">
                                        <div class="progress-fill-mini" [style.width.%]="loadingProgress.partnerOnly.percentage"></div>
                                    </div>
                                    <span class="progress-text-mini">
                                        {{loadingProgress.partnerOnly.current | number}} / {{loadingProgress.partnerOnly.total | number}} 
                                        ({{loadingProgress.partnerOnly.percentage}}%)
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div class="search-section" *ngIf="!isLoadingPartnerOnly">
                            <input 
                                type="text" 
                                [(ngModel)]="searchKey" 
                                (input)="onSearch()"
                                placeholder="Rechercher par clé..."
                                class="search-input"
                            >
                            <button (click)="showVolumeSummary = !showVolumeSummary" class="toggle-volume-btn" [class.active]="showVolumeSummary">
                                {{ showVolumeSummary ? '📊 Masquer les volumes' : '📊 Afficher les volumes' }}
                            </button>
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
                        <div class="volume-summary" *ngIf="showVolumeSummary">
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
                        <div *ngIf="filteredPartnerOnlyCount === 0 && partnerOnlyLoaded" class="no-data-message">
                            <p>Aucun écart partenaire trouvé</p>
                        </div>
                        <div *ngIf="filteredPartnerOnlyCount > 0">
                            <div class="pagination-controls">
                                <button (click)="prevPage('partnerOnly')" [disabled]="partnerOnlyPage === 1">Précédent</button>
                                <span>Page {{partnerOnlyPage}} / {{totalPartnerOnlyPages}}</span>
                                <button (click)="nextPage('partnerOnly')" [disabled]="partnerOnlyPage === totalPartnerOnlyPages">Suivant</button>
                            </div>
                            <div class="unmatched-card" *ngFor="let record of getPagedPartnerOnly(); trackBy: trackByRecordKey">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;gap:8px;">
                                <div style="display:flex;align-items:center;gap:10px;">
                                    <div style="font-weight:600;color:#1976D2;">Ligne partenaire</div>
                                    <button (click)="createOperationFromPartnerRecord(record)" class="save-button" [disabled]="!isPartnerRecordEligible(record)" title="Créer OP">➕ Créer OP</button>
                                </div>
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
                                <div class="info-row">
                                    <span class="label">Source:</span>
                                    <span class="value" style="display:flex;align-items:center;gap:6px;">
                                        <input type="checkbox" checked disabled>
                                        {{ record['SOURCE'] || 'PARTENAIRE' }}
                                    </span>
                                </div>
                                <div class="data-row" *ngFor="let key of getPartnerOnlyKeys(record)">
                                    <span class="label">{{key}}:</span>
                                    <span class="value">{{getRecordValue(record, key)}}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Section informative en bas -->
            <div class="bottom-info-section" *ngIf="response">
                <div class="info-section-grid">
                    <div class="info-card">
                        <div class="info-card-header">
                            <div class="info-icon">📈</div>
                            <h4>Taux de correspondance</h4>
                        </div>
                        <div class="info-card-content">
                            <div class="match-rate">
                                <div class="match-rate-value">{{matchRate | number:'1.1-1'}}%</div>
                                <div class="match-rate-bar">
                                    <div class="match-rate-fill" [style.width.%]="matchRate"></div>
                                </div>
                            </div>
                            <div class="info-details">
                                <span>{{filteredMatchesCount}} / {{totalTransactions}} transactions</span>
                            </div>
                        </div>
                    </div>

                    <div class="info-card">
                        <div class="info-card-header">
                            <div class="info-icon">⚖️</div>
                            <h4>Équilibre des volumes</h4>
                        </div>
                        <div class="info-card-content">
                            <div class="volume-comparison">
                                <div class="volume-item">
                                    <span class="volume-item-label">BO</span>
                                    <span class="volume-item-value">{{totalVolumeBo | number:'1.0-0'}}</span>
                                </div>
                                <div class="volume-separator">↔</div>
                                <div class="volume-item">
                                    <span class="volume-item-label">Partenaire</span>
                                    <span class="volume-item-value">{{totalVolumePartner | number:'1.0-0'}}</span>
                                </div>
                            </div>
                            <div class="volume-diff" [class.positive]="volumeDifference > 0" [class.negative]="volumeDifference < 0" [class.neutral]="volumeDifference === 0">
                                <span>Différence: {{volumeDifference | number:'1.0-0'}}</span>
                            </div>
                        </div>
                    </div>

                    <div class="info-card">
                        <div class="info-card-header">
                            <div class="info-icon">🔍</div>
                            <h4>Statut de la réconciliation</h4>
                        </div>
                        <div class="info-card-content">
                            <div class="status-indicators">
                                <div class="status-item" [class.has-issues]="(response?.mismatches?.length || 0) + (response?.boOnly?.length || 0) > 0">
                                    <span class="status-dot"></span>
                                    <span>Écarts BO: {{(response?.mismatches?.length || 0) + (response?.boOnly?.length || 0)}}</span>
                                </div>
                                <div class="status-item" [class.has-issues]="filteredPartnerOnlyCount > 0">
                                    <span class="status-dot"></span>
                                    <span>Écarts Partenaire: {{filteredPartnerOnlyCount}}</span>
                                </div>
                                <div class="status-item" [class.success]="filteredMatchesCount > 0">
                                    <span class="status-dot"></span>
                                    <span>Correspondances: {{filteredMatchesCount}}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="info-card">
                        <div class="info-card-header">
                            <div class="info-icon">💡</div>
                            <h4>Actions rapides</h4>
                        </div>
                        <div class="info-card-content">
                            <div class="quick-actions">
                                <button class="quick-action-btn" (click)="goToMatches()" [disabled]="filteredMatchesCount === 0">
                                    ✅ Correspondances
                                </button>
                                <button class="quick-action-btn" (click)="goToEcartBo()" [disabled]="filteredBoOnlyCount === 0">
                                    ⚠️ Écarts BO
                                </button>
                                <button class="quick-action-btn" (click)="goToEcartPartner()" [disabled]="filteredPartnerOnlyCount === 0">
                                    ⚠️ Écarts Partenaire
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="action-buttons">
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
            padding: 24px;
            width: 100%;
            min-height: 100vh;
            box-sizing: border-box;
        }

        .summary-section {
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            border-radius: 16px;
            padding: 28px;
            margin-bottom: 32px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
            border: 1px solid rgba(0, 0, 0, 0.05);
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
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
            gap: 20px;
            margin-top: 24px;
            margin-bottom: 24px;
        }

        .stat-card {
            background: white;
            padding: 28px 24px;
            border-radius: 16px;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
            transition: all 0.3s ease;
            border: 1px solid rgba(0, 0, 0, 0.05);
            position: relative;
            overflow: hidden;
        }

        .stat-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        }

        .stat-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        }

        .stat-card-total::before {
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        }

        .stat-card-matched::before {
            background: linear-gradient(90deg, #28a745 0%, #20c997 100%);
        }

        .stat-card-bo::before {
            background: linear-gradient(90deg, #ffc107 0%, #ff9800 100%);
        }

        .stat-card-partner::before {
            background: linear-gradient(90deg, #dc3545 0%, #c82333 100%);
        }

        .stat-icon {
            font-size: 2.5em;
            margin-bottom: 12px;
            display: block;
        }

        .stat-value {
            font-size: 2.8em;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 8px;
            line-height: 1.2;
        }

        .stat-card-total .stat-value {
            color: #667eea;
        }

        .stat-card-matched .stat-value {
            color: #28a745;
        }

        .stat-card-bo .stat-value {
            color: #ff9800;
        }

        .stat-card-partner .stat-value {
            color: #dc3545;
        }

        .stat-label {
            color: #6c757d;
            font-size: 1em;
            font-weight: 500;
            line-height: 1.4;
            margin-top: 8px;
        }

        .results-tabs {
            background: white;
            border-radius: 16px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
            overflow: hidden;
            margin-bottom: 32px;
            border: 1px solid rgba(0, 0, 0, 0.05);
            min-height: 400px;
        }

        .tab-content {
            min-height: 300px;
            width: 100%;
            box-sizing: border-box;
        }

        .matches-section, .partner-only-section {
            width: 100%;
            padding: 20px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        .tab-buttons {
            display: flex;
            gap: 15px;
            padding: 10px;
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

        .matches-button {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%) !important;
            color: white !important;
            font-weight: 600;
            border-radius: 6px;
            transition: all 0.3s ease;
        }

        .matches-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(40, 167, 69, 0.4);
            background: linear-gradient(135deg, #218838 0%, #1ea085 100%) !important;
        }

        .ecart-bo-button {
            background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%) !important;
            color: white !important;
            font-weight: 600;
            border-radius: 6px;
            transition: all 0.3s ease;
        }

        .ecart-bo-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(255, 152, 0, 0.4);
            background: linear-gradient(135deg, #f57c00 0%, #e65100 100%) !important;
        }

        .ecart-partner-button {
            background: linear-gradient(135deg, #dc3545 0%, #c82333 100%) !important;
            color: white !important;
            font-weight: 600;
            border-radius: 6px;
            transition: all 0.3s ease;
        }

        .ecart-partner-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(220, 53, 69, 0.4);
            background: linear-gradient(135deg, #c82333 0%, #bd2130 100%) !important;
        }

        .report-button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            color: white !important;
            font-weight: 600;
            border-radius: 6px;
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
            border-radius: 12px;
            padding: 20px;
            border: 1px solid #dee2e6;
            width: 100%;
            box-sizing: border-box;
            margin-bottom: 16px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            transition: all 0.3s ease;
        }

        .match-card:hover, .unmatched-card:hover {
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            transform: translateY(-2px);
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
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 24px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            border: 1px solid rgba(0, 0, 0, 0.05);
            animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .volume-summary h4 {
            margin: 0 0 16px 0;
            color: #2c3e50;
            font-size: 1.1em;
            font-weight: 600;
        }

        .volume-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin-top: 10px;
        }

        .volume-card {
            background: white;
            padding: 18px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
            transition: all 0.3s ease;
            border: 1px solid rgba(0, 0, 0, 0.05);
        }

        .volume-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
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
            flex: 1;
            padding: 12px 18px;
            border: 2px solid #dee2e6;
            border-radius: 10px;
            font-size: 1em;
            transition: all 0.3s ease;
            background: white;
        }

        .search-input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
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

        /* Section informative en bas */
        .bottom-info-section {
            margin-top: 40px;
            margin-bottom: 30px;
            padding: 30px;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 16px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
            width: 100%;
            box-sizing: border-box;
        }

        .info-section-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 24px;
            width: 100%;
        }

        .info-card {
            background: white;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
            transition: all 0.3s ease;
            border: 1px solid rgba(0, 0, 0, 0.05);
        }

        .info-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .info-card-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
            padding-bottom: 16px;
            border-bottom: 2px solid #f0f0f0;
        }

        .info-icon {
            font-size: 1.8em;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 48px;
            height: 48px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 12px;
            color: white;
        }

        .info-card-header h4 {
            margin: 0;
            font-size: 1.1em;
            font-weight: 600;
            color: #2c3e50;
        }

        .info-card-content {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .match-rate {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .match-rate-value {
            font-size: 2.2em;
            font-weight: 700;
            color: #28a745;
            text-align: center;
        }

        .match-rate-bar {
            width: 100%;
            height: 12px;
            background: #e9ecef;
            border-radius: 6px;
            overflow: hidden;
        }

        .match-rate-fill {
            height: 100%;
            background: linear-gradient(90deg, #28a745 0%, #20c997 100%);
            border-radius: 6px;
            transition: width 0.5s ease;
        }

        .info-details {
            text-align: center;
            color: #6c757d;
            font-size: 0.9em;
        }

        .volume-comparison {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 16px;
            background: #f8f9fa;
            border-radius: 8px;
        }

        .volume-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            flex: 1;
        }

        .volume-item-label {
            font-size: 0.85em;
            color: #6c757d;
            font-weight: 500;
        }

        .volume-item-value {
            font-size: 1.5em;
            font-weight: 700;
            color: #2196F3;
        }

        .volume-separator {
            font-size: 1.5em;
            color: #667eea;
            font-weight: bold;
        }

        .volume-diff {
            text-align: center;
            padding: 10px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 0.95em;
        }

        .volume-diff.positive {
            background: #d4edda;
            color: #155724;
        }

        .volume-diff.negative {
            background: #f8d7da;
            color: #721c24;
        }

        .volume-diff.neutral {
            background: #e2e3e5;
            color: #383d41;
        }

        .status-indicators {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .status-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px;
            border-radius: 6px;
            background: #f8f9fa;
            transition: all 0.3s ease;
        }

        .status-item.has-issues {
            background: #fff3cd;
            border-left: 3px solid #ffc107;
        }

        .status-item.success {
            background: #d4edda;
            border-left: 3px solid #28a745;
        }

        .status-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #6c757d;
            flex-shrink: 0;
        }

        .status-item.has-issues .status-dot {
            background: #ffc107;
        }

        .status-item.success .status-dot {
            background: #28a745;
        }

        .status-item span:last-child {
            flex: 1;
            font-size: 0.9em;
            color: #2c3e50;
        }

        .quick-actions {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .quick-action-btn {
            padding: 10px 16px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.9em;
            font-weight: 500;
            transition: all 0.3s ease;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: left;
        }

        .quick-action-btn:hover:not(:disabled) {
            transform: translateX(4px);
            box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
        }

        .quick-action-btn:disabled {
            background: #e9ecef;
            color: #adb5bd;
            cursor: not-allowed;
            transform: none;
        }

        .action-buttons {
            display: flex;
            gap: 16px;
            justify-content: center;
            margin-top: 30px;
            margin-bottom: 20px;
        }

        .export-btn, .new-reconciliation-btn, .stats-btn {
            padding: 14px 28px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-size: 1em;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .export-btn:hover, .new-reconciliation-btn:hover, .stats-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
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
            gap: 12px;
            margin-bottom: 24px;
            padding: 16px;
            background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
            border: 1px solid rgba(0, 0, 0, 0.05);
            flex-wrap: wrap;
        }

        .toggle-volume-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 10px 18px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.9em;
            font-weight: 500;
            transition: all 0.3s ease;
            box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
            white-space: nowrap;
        }

        .toggle-volume-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(102, 126, 234, 0.4);
            background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
        }

        .toggle-volume-btn.active {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            box-shadow: 0 2px 4px rgba(40, 167, 69, 0.3);
        }

        .toggle-volume-btn.active:hover {
            background: linear-gradient(135deg, #218838 0%, #1ea080 100%);
            box-shadow: 0 4px 8px rgba(40, 167, 69, 0.4);
        }

        .toggle-matches-btn {
            background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
            color: white;
            padding: 10px 18px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.9em;
            font-weight: 500;
            transition: all 0.3s ease;
            box-shadow: 0 2px 4px rgba(33, 150, 243, 0.3);
            white-space: nowrap;
        }

        .toggle-matches-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(33, 150, 243, 0.4);
            background: linear-gradient(135deg, #1976D2 0%, #1565C0 100%);
        }

        .toggle-matches-btn.active {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            box-shadow: 0 2px 4px rgba(40, 167, 69, 0.3);
        }

        .toggle-matches-btn.active:hover {
            background: linear-gradient(135deg, #218838 0%, #1ea080 100%);
            box-shadow: 0 4px 8px rgba(40, 167, 69, 0.4);
        }

        .matches-list-section {
            animation: slideDown 0.3s ease-out;
            width: 100%;
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

        /* Styles pour les indicateurs de chargement */
        .loading-indicator {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 40px;
            gap: 16px;
            color: #667eea;
            font-size: 1.1em;
            font-weight: 500;
        }

        .loading-progress {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
            width: 100%;
            max-width: 400px;
        }

        .progress-info {
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .progress-bar-mini {
            width: 100%;
            height: 8px;
            background-color: #e0e0e0;
            border-radius: 4px;
            overflow: hidden;
        }

        .progress-fill-mini {
            height: 100%;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            border-radius: 4px;
            transition: width 0.3s ease;
        }

        .progress-text-mini {
            font-size: 0.9em;
            color: #666;
            text-align: center;
        }

        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .no-data-message {
            text-align: center;
            padding: 40px;
            color: #666;
            font-size: 1.1em;
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
    
    // Propriétés pour le chargement à la demande (Lazy Loading)
    private currentJobId: string | null = null;
    matchesLoaded: boolean = false;
    boOnlyLoaded: boolean = false;
    partnerOnlyLoaded: boolean = false;
    isLoadingMatches: boolean = false;
    isLoadingBoOnly: boolean = false;
    isLoadingPartnerOnly: boolean = false;
    
    // Cache pour éviter les recalculs
    private matchesCache: Match[] | null = null;
    private boOnlyCache: Record<string, string>[] | null = null;
    private partnerOnlyCache: Record<string, string>[] | null = null;
    private cacheKey: string | null = null;
    
    // Prévention des doublons : un seul chargement à la fois par onglet
    private loadingPromises: Map<string, Promise<any>> = new Map();
    
    // Feedback utilisateur : progression en temps réel
    loadingProgress: {
        matches: { current: number; total: number; percentage: number };
        boOnly: { current: number; total: number; percentage: number };
        partnerOnly: { current: number; total: number; percentage: number };
    } = {
        matches: { current: 0, total: 0, percentage: 0 },
        boOnly: { current: 0, total: 0, percentage: 0 },
        partnerOnly: { current: 0, total: 0, percentage: 0 }
    };
    
    // Configuration du traitement par chunks
    private readonly CHUNK_SIZE = 1000; // Taille des chunks pour le chargement réseau
    private readonly PROCESSING_CHUNK_SIZE = 100; // Taille des chunks pour le traitement local
    private readonly YIELD_INTERVAL = 50; // Intervalle en ms pour yield au navigateur
    
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
    selectedPartnerImportOpDate: string | null = null;
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
    
    // Propriété pour afficher/masquer le résumé des volumes
    showVolumeSummary = false;

    // Propriété pour afficher/masquer la liste des correspondances (false par défaut - masquée)
    showMatchesList = false;
    
    // Propriétés calculées pour éviter les recalculs dans le template (optimisation performance)
    filteredMatchesCount: number = 0;
    filteredBoOnlyCount: number = 0;
    filteredPartnerOnlyCount: number = 0;
    totalMatchesPages: number = 1;
    totalBoOnlyPages: number = 1;
    totalPartnerOnlyPages: number = 1;
    
    // Cache pour les volumes calculés (évite les recalculs coûteux)
    private cachedTotalVolumeBo: number | null = null;
    private cachedTotalVolumePartner: number | null = null;
    private cachedVolumeDifference: number | null = null;
    private isCalculatingVolumes: boolean = false;
    
    // Propriétés publiques pour le template (évite les appels de fonctions)
    totalVolumeBo: number = 0;
    totalVolumePartner: number = 0;
    volumeDifference: number = 0;
    
    // Cache pour les statistiques (évite les appels répétés depuis le template)
    private cachedTotalTransactions: number | null = null;
    private cachedMatchRate: number | null = null;
    totalTransactions: number = 0; // Propriété publique pour le template
    matchRate: number = 0; // Propriété publique pour le template
    
    // Propriétés paginées pour éviter les appels répétés dans le template
    pagedMatches: Match[] = [];
    pagedBoOnly: Record<string, string>[] = [];
    pagedPartnerOnly: Record<string, string>[] = [];
    
    // Cache pour les clés de chaque match (évite les recalculs dans *ngFor)
    private matchKeysCache = new Map<string, { boKeys: string[]; partnerKeys: string[]; hasDifferences: boolean }>();
    
    // Flag pour éviter les recalculs pendant l'initialisation
    private isInitializing: boolean = false;
    
    // Flag pour éviter les appels multiples de updateKeysCache
    private isUpdatingKeysCache: boolean = false;
    private keysCacheUpdatePromise: Promise<void> | null = null;

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

    // Sélection pour ECART BO
    selectedBoOnlyKeys: string[] = [];
    private getBoOnlyKey(record: Record<string, string>): string {
        const parts = [
            this.getFromRecord(record, ['CLE', 'clé de réconciliation', 'cle_reconciliation', 'reconciliation_key', 'Key', 'key', 'ID', 'id']),
            this.getFromRecord(record, ['ID Opération', 'ID Operation', 'id_operation', 'idOperation', 'ID OPERATION']),
            this.getFromRecord(record, ['Numéro Trans GU', 'Numero Trans GU', 'numeroTransGU', 'numero_trans_gu']),
            this.getFromRecord(record, ['Référence', 'Reference', 'reference']),
            this.getFromRecord(record, ['Date opération', 'Date', 'dateOperation', 'date_operation', 'DATE']),
            this.getFromRecord(record, ['Montant', 'montant', 'amount', 'Amount', 'volume', 'Volume']),
            this.getFromRecord(record, ['Service', 'service', 'SERVICE']),
            this.getFromRecord(record, ['Agence', 'agence', 'AGENCE', 'agency'])
        ].map(value => value?.toString().trim()).filter(value => !!value);

        if (parts.length === 0) {
            return Object.values(record).join('|');
        }

        return parts.join('|');
    }
    isBoRecordSelected(record: Record<string, string>): boolean {
        return this.selectedBoOnlyKeys.includes(this.getBoOnlyKey(record));
    }
    toggleBoSelection(record: Record<string, string>, event: any): void {
        const key = this.getBoOnlyKey(record);
        if (event.target.checked) {
            if (!this.selectedBoOnlyKeys.includes(key)) {
                this.selectedBoOnlyKeys.push(key);
            }
        } else {
            this.selectedBoOnlyKeys = this.selectedBoOnlyKeys.filter(k => k !== key);
        }
    }
    get allBoSelectedOnPage(): boolean {
        const page = this.getPagedBoOnly();
        return page.length > 0 && page.every(r => this.isBoRecordSelected(r));
    }
    toggleSelectAllBoOnPage(event: any): void {
        const page = this.getPagedBoOnly();
        const pageKeys = page.map(r => this.getBoOnlyKey(r));
        if (event.target.checked) {
            this.selectedBoOnlyKeys = Array.from(new Set([...this.selectedBoOnlyKeys, ...pageKeys]));
        } else {
            this.selectedBoOnlyKeys = this.selectedBoOnlyKeys.filter(k => !pageKeys.includes(k));
        }
    }
    private getBoSelectionDataset(): Record<string, string>[] {
        if (this.filteredBoOnly && this.filteredBoOnly.length > 0) {
            return this.filteredBoOnly;
        }
        if (this.response?.boOnly && this.response.boOnly.length > 0) {
            return this.response.boOnly;
        }
        return [];
    }
    private getBoRecordsForAction(): Record<string, string>[] {
        const dataset = this.getBoSelectionDataset();
        if (this.selectedBoOnlyKeys.length === 0) {
            return dataset;
        }
        const keySet = new Set(this.selectedBoOnlyKeys);
        return dataset.filter(record => keySet.has(this.getBoOnlyKey(record)));
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
        const availableRecords = this.getBoSelectionDataset();
        if (availableRecords.length === 0) {
            this.popupService.showWarning('❌ Aucune donnée ECART BO à sauvegarder.');
            return;
        }

        const sourceRecords = this.getBoRecordsForAction();
        if (sourceRecords.length === 0) {
            this.popupService.showWarning('❌ Aucune ligne sélectionnée pour la sauvegarde.');
            return;
        }

        this.isSavingEcartBo = true;

        try {
            console.log('🔄 Début de la sauvegarde des ECART BO...');
            console.log('DEBUG: Nombre d\'enregistrements ECART BO (disponibles):', availableRecords.length);
            console.log('DEBUG: Nombre d\'enregistrements ECART BO (à sauvegarder):', sourceRecords.length);

            // Debug: Afficher les colonnes disponibles dans le premier enregistrement
            if (sourceRecords.length > 0) {
                console.log('DEBUG: Colonnes disponibles dans ECART BO:', Object.keys(sourceRecords[0]));
                console.log('DEBUG: Premier enregistrement ECART BO:', sourceRecords[0]);
            }

            // Convertir les données ECART BO en format EcartSolde
            const ecartSoldeData: EcartSolde[] = sourceRecords.map((record, index) => {
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
                
                // Fonction helper pour convertir les dates (y compris format Excel) au format ISO
                const formatDateForBackend = (dateStr: string): string => {
                    if (!dateStr) return '';
                    
                    // Si la date contient déjà des caractères de format date (tirets, T, espaces suivis de chiffres), ne pas traiter comme Excel
                    if (dateStr.includes('-') || dateStr.includes('T') || /\d{4}/.test(dateStr)) {
                        // Si la date est déjà au format ISO, la retourner
                        if (dateStr.includes('T')) return dateStr;
                        
                        // Convertir le format "2025-07-09 12:40:18.0" en "2025-07-09T12:40:18"
                        const cleanedDate = dateStr.replace(/\.\d+$/, ''); // Enlever les millisecondes
                        return cleanedDate.replace(' ', 'T');
                    }
                    
                    // Vérifier si c'est un numéro de série Excel pur (nombre décimal sans autre caractère)
                    const numValue = parseFloat(dateStr);
                    const numStr = numValue.toString();
                    // Vérifier que la conversion en nombre et retour en string donne la même chose (ou presque)
                    if (!isNaN(numValue) && numValue > 0 && numValue < 100000 && Math.abs(parseFloat(dateStr) - numValue) < 0.0001) {
                        // C'est probablement un numéro de série Excel
                        const excelEpoch = new Date(1900, 0, 1).getTime();
                        const millisecondsPerDay = 86400000;
                        const jsDate = new Date(excelEpoch + (numValue - 2) * millisecondsPerDay);
                        console.log(`📅 Conversion Excel → JS: ${dateStr} → ${jsDate.toISOString()}`);
                        return jsDate.toISOString();
                    }
                    
                    // Par défaut, retourner la chaîne telle quelle
                    return dateStr;
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
                    // Forcer montant négatif si service contient CASHIN
                    montant: (() => {
                        const s = (ecartSolde.service || '').toLowerCase();
                        const m = Number(ecartSolde.montant) || 0;
                        return s.includes('cashin') ? -Math.abs(m) : m;
                    })(),
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
            const selectionSummary = this.selectedBoOnlyKeys.length > 0
                ? `🎯 Lignes sélectionnées: ${sourceRecords.length}\n`
                : '';
            const message = `📋 RÉSUMÉ DES DONNÉES À SAUVEGARDER:\n\n` +
                `📊 Total des enregistrements ECART BO: ${availableRecords.length}\n` +
                selectionSummary +
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
        const availableRecords = this.getBoSelectionDataset();
        if (availableRecords.length === 0) {
            this.popupService.showWarning('❌ Aucune donnée ECART BO à sauvegarder dans TRX SF.');
            return;
        }

        const sourceRecords = this.getBoRecordsForAction();
        if (sourceRecords.length === 0) {
            this.popupService.showWarning('❌ Aucune ligne sélectionnée pour la sauvegarde.');
            return;
        }

        this.isSavingEcartBoToTrxSf = true;

        try {
            console.log('🔄 Début de la sauvegarde des ECART BO dans TRX SF...');
            console.log('DEBUG: Nombre d\'enregistrements ECART BO (disponibles):', availableRecords.length);
            console.log('DEBUG: Nombre d\'enregistrements ECART BO (à sauvegarder):', sourceRecords.length);

            // Convertir les données ECART BO en format TrxSfData avec récupération des frais
            const trxSfDataPromises = sourceRecords.map(async (record, index) => {
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
                
                // Fonction helper pour convertir les dates (y compris format Excel) au format ISO
                const formatDateForBackend = (dateStr: string): string => {
                    if (!dateStr) return '';
                    
                    // Si la date contient déjà des caractères de format date (tirets, T, espaces suivis de chiffres), ne pas traiter comme Excel
                    if (dateStr.includes('-') || dateStr.includes('T') || /\d{4}/.test(dateStr)) {
                        // Si la date est déjà au format ISO, la retourner
                        if (dateStr.includes('T')) return dateStr;
                        
                        // Convertir le format "2025-07-09 12:40:18.0" en "2025-07-09T12:40:18"
                        const cleanedDate = dateStr.replace(/\.\d+$/, ''); // Enlever les millisecondes
                        return cleanedDate.replace(' ', 'T');
                    }
                    
                    // Vérifier si c'est un numéro de série Excel pur (nombre décimal sans autre caractère)
                    const numValue = parseFloat(dateStr);
                    const numStr = numValue.toString();
                    // Vérifier que la conversion en nombre et retour en string donne la même chose (ou presque)
                    if (!isNaN(numValue) && numValue > 0 && numValue < 100000 && Math.abs(parseFloat(dateStr) - numValue) < 0.0001) {
                        // C'est probablement un numéro de série Excel
                        const excelEpoch = new Date(1900, 0, 1).getTime();
                        const millisecondsPerDay = 86400000;
                        const jsDate = new Date(excelEpoch + (numValue - 2) * millisecondsPerDay);
                        console.log(`📅 Conversion Excel → JS: ${dateStr} → ${jsDate.toISOString()}`);
                        return jsDate.toISOString();
                    }
                    
                    // Par défaut, retourner la chaîne telle quelle
                    return dateStr;
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
                
                // Fonction helper pour convertir les dates (y compris format Excel) au format ISO
                const formatDateForBackend = (dateStr: string): string => {
                    if (!dateStr) return '';
                    
                    // Si la date contient déjà des caractères de format date (tirets, T, espaces suivis de chiffres), ne pas traiter comme Excel
                    if (dateStr.includes('-') || dateStr.includes('T') || /\d{4}/.test(dateStr)) {
                        // Si la date est déjà au format ISO, la retourner
                        if (dateStr.includes('T')) return dateStr;
                        
                        // Convertir le format "2025-07-09 12:40:18.0" en "2025-07-09T12:40:18"
                        const cleanedDate = dateStr.replace(/\.\d+$/, ''); // Enlever les millisecondes
                        return cleanedDate.replace(' ', 'T');
                    }
                    
                    // Vérifier si c'est un numéro de série Excel pur (nombre décimal sans autre caractère)
                    const numValue = parseFloat(dateStr);
                    const numStr = numValue.toString();
                    // Vérifier que la conversion en nombre et retour en string donne la même chose (ou presque)
                    if (!isNaN(numValue) && numValue > 0 && numValue < 100000 && Math.abs(parseFloat(dateStr) - numValue) < 0.0001) {
                        // C'est probablement un numéro de série Excel
                        const excelEpoch = new Date(1900, 0, 1).getTime();
                        const millisecondsPerDay = 86400000;
                        const jsDate = new Date(excelEpoch + (numValue - 2) * millisecondsPerDay);
                        console.log(`📅 Conversion Excel → JS: ${dateStr} → ${jsDate.toISOString()}`);
                        return jsDate.toISOString();
                    }
                    
                    // Par défaut, retourner la chaîne telle quelle
                    return dateStr;
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
                
                // Fonction helper pour convertir les dates (y compris format Excel) au format ISO
                const formatDateForBackend = (dateStr: string): string => {
                    if (!dateStr) return '';
                    
                    // Si la date contient déjà des caractères de format date (tirets, T, espaces suivis de chiffres), ne pas traiter comme Excel
                    if (dateStr.includes('-') || dateStr.includes('T') || /\d{4}/.test(dateStr)) {
                        // Si la date est déjà au format ISO, la retourner
                        if (dateStr.includes('T')) return dateStr;
                        
                        // Convertir le format "2025-07-09 12:40:18.0" en "2025-07-09T12:40:18"
                        const cleanedDate = dateStr.replace(/\.\d+$/, ''); // Enlever les millisecondes
                        return cleanedDate.replace(' ', 'T');
                    }
                    
                    // Vérifier si c'est un numéro de série Excel pur (nombre décimal sans autre caractère)
                    const numValue = parseFloat(dateStr);
                    const numStr = numValue.toString();
                    // Vérifier que la conversion en nombre et retour en string donne la même chose (ou presque)
                    if (!isNaN(numValue) && numValue > 0 && numValue < 100000 && Math.abs(parseFloat(dateStr) - numValue) < 0.0001) {
                        // C'est probablement un numéro de série Excel
                        const excelEpoch = new Date(1900, 0, 1).getTime();
                        const millisecondsPerDay = 86400000;
                        const jsDate = new Date(excelEpoch + (numValue - 2) * millisecondsPerDay);
                        console.log(`📅 Conversion Excel → JS: ${dateStr} → ${jsDate.toISOString()}`);
                        return jsDate.toISOString();
                    }
                    
                    // Par défaut, retourner la chaîne telle quelle
                    return dateStr;
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
                    // Forcer montant négatif si service contient CASHIN
                    montant: (() => {
                        const s = (ecartSolde.service || '').toLowerCase();
                        const m = Number(ecartSolde.montant) || 0;
                        return s.includes('cashin') ? -Math.abs(m) : m;
                    })(),
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

            const defaultDateCandidate = this.selectedPartnerImportOpDate
                || this.extractIsoDay(this.getFromRecord(sourceRecords[0], ['Date opération', 'Date', 'dateOperation', 'date_operation']))
                || this.extractIsoDay(this.getPartnerOnlyDate(sourceRecords[0]))
                || this.toIsoLocalDate(new Date().toISOString());

            const dateInput = await this.popupService.showDateInput(
                'Sélectionnez la date d\'opération à appliquer pour les Import OP générés.',
                'Date Import OP',
                defaultDateCandidate
            );

            if (dateInput === null) {
                await this.popupService.showInfo('Sauvegarde Import OP annulée.');
                return;
            }

            const normalizedDateInput = this.toIsoLocalDate(dateInput || defaultDateCandidate);
            if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDateInput)) {
                await this.popupService.showWarning('Date d\'opération invalide. Sauvegarde annulée.');
                return;
            }

            this.selectedPartnerImportOpDate = normalizedDateInput;
            const overrideDateIso = this.makeIsoDateTime(normalizedDateInput);

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

                // Fonction helper pour convertir les numéros de série Excel en dates JavaScript
                const parseExcelDate = (dateValue: string): Date => {
                    // Si la valeur est vide, retourner la date actuelle
                    if (!dateValue || dateValue.trim() === '') {
                        return new Date();
                    }
                    
                    // Si la date contient déjà des caractères de format date, la parser normalement
                    if (dateValue.includes('-') || dateValue.includes('T') || dateValue.includes('/') || /\d{4}/.test(dateValue)) {
                        const parsedDate = new Date(dateValue);
                        if (!isNaN(parsedDate.getTime())) {
                            console.log(`📅 Date texte parsée: ${dateValue} → ${parsedDate.toISOString()}`);
                            return parsedDate;
                        }
                    }
                    
                    // Vérifier si c'est un numéro de série Excel pur (nombre décimal)
                    const numValue = parseFloat(dateValue);
                    if (!isNaN(numValue) && numValue > 0 && numValue < 100000 && Math.abs(parseFloat(dateValue) - numValue) < 0.0001) {
                        // C'est probablement un numéro de série Excel
                        // Excel epoch: 1er janvier 1900 (avec correction pour le bug du 29 février 1900)
                        const excelEpoch = new Date(1900, 0, 1).getTime();
                        const millisecondsPerDay = 86400000;
                        // Soustraire 2 pour corriger le bug Excel (29/02/1900) et l'index qui commence à 1
                        const jsDate = new Date(excelEpoch + (numValue - 2) * millisecondsPerDay);
                        console.log(`📅 Conversion Excel → JS: ${dateValue} → ${jsDate.toISOString()}`);
                        return jsDate;
                    }
                    
                    // Si tout échoue, retourner la date actuelle
                    console.warn(`⚠️ Date non reconnue: "${dateValue}", utilisation de la date actuelle`);
                    return new Date();
                };
                
                // Construire la date d'opération au format LocalDateTime
                const dateOperationStr = getValueWithFallback(['Date opération', 'dateOperation', 'date_operation']);
                const parsedDate = parseExcelDate(dateOperationStr);
                const dateOperation = overrideDateIso || parsedDate.toISOString();

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
        private route: ActivatedRoute,
        private reconciliationService: ReconciliationService,
        private ecartSoldeService: EcartSoldeService,
        private trxSfService: TrxSfService,
        private impactOPService: ImpactOPService,
        private http: HttpClient,
        private popupService: PopupService,
        private exportOptimizationService: ExportOptimizationService,
        private reconciliationSummaryService: ReconciliationSummaryService,
        private reconciliationTabsService: ReconciliationTabsService,
        private compteService: CompteService,
        private operationService: OperationService
    ) {}

    ngOnInit() {
        const initStartTime = performance.now();
        (window as any).pageLoadTime = initStartTime;
        console.log('🔴 [NGONINIT] ============================================');
        console.log('🔴 [NGONINIT] ReconciliationResultsComponent - ngOnInit appelé', `[${new Date().toISOString()}]`);
        console.log('🔴 [NGONINIT] Timestamp absolu:', initStartTime);
        console.log('🔴 [NGONINIT] État actuel:', {
            'matchesLoaded': this.matchesLoaded,
            'boOnlyLoaded': this.boOnlyLoaded,
            'partnerOnlyLoaded': this.partnerOnlyLoaded,
            'filteredMatchesCount': this.filteredMatches.length,
            'filteredBoOnlyCount': this.filteredBoOnly.length,
            'filteredPartnerOnlyCount': this.filteredPartnerOnly.length,
            'hasResponse': !!this.response,
            'activeTab': this.activeTab
        });
        
        // Vérifier si les données sont déjà présentes pour éviter une réinitialisation complète
        const hasExistingData = this.response && (
            (this.response.matches && this.response.matches.length > 0) ||
            (this.response.boOnly && this.response.boOnly.length > 0) ||
            (this.response.partnerOnly && this.response.partnerOnly.length > 0)
        );
        
        if (hasExistingData && this.matchesLoaded && this.boOnlyLoaded && this.partnerOnlyLoaded) {
            console.log('✅ [NGONINIT] Données déjà chargées, skip réinitialisation complète');
            const skipInitDuration = performance.now() - initStartTime;
            console.log('⏱️ [NGONINIT] Skip réinitialisation:', `${skipInitDuration.toFixed(2)}ms`);
            return;
        }
        
        // Récupérer le jobId depuis les queryParams
        this.subscription.add(
            this.route.queryParams.subscribe(params => {
                const jobIdStartTime = performance.now();
                if (params['jobId']) {
                    this.currentJobId = params['jobId'];
                    console.log('📋 JobId récupéré depuis queryParams:', this.currentJobId, `[${(performance.now() - jobIdStartTime).toFixed(2)}ms]`);
                } else {
                    // Essayer de récupérer depuis le service
                    this.currentJobId = this.reconciliationService.getCurrentJobId();
                    console.log('📋 JobId récupéré depuis le service:', this.currentJobId, `[${(performance.now() - jobIdStartTime).toFixed(2)}ms]`);
                }
            })
        );
        
        this.subscription.add(
            this.appStateService.getReconciliationResults().subscribe((response: ReconciliationResponse | null) => {
                const dataReceiveStartTime = performance.now();
                console.log('📋 [NGONINIT] Données reçues dans ReconciliationResultsComponent:', {
                    hasResponse: !!response,
                    matchesCount: response?.matches?.length || 0,
                    boOnlyCount: response?.boOnly?.length || 0,
                    partnerOnlyCount: response?.partnerOnly?.length || 0,
                    mismatchesCount: response?.mismatches?.length || 0,
                    timestamp: new Date().toISOString()
                });
                
                // Vérifier si les données sont identiques pour éviter une réinitialisation inutile
                const isSameData = this.response && response && 
                    this.response.matches?.length === response.matches?.length &&
                    this.response.boOnly?.length === response.boOnly?.length &&
                    this.response.partnerOnly?.length === response.partnerOnly?.length;
                
                if (isSameData && this.matchesLoaded && this.boOnlyLoaded && this.partnerOnlyLoaded) {
                    console.log('✅ [NGONINIT] Données identiques déjà chargées, skip réinitialisation');
                    const skipDuration = performance.now() - dataReceiveStartTime;
                    console.log('⏱️ [NGONINIT] Skip réinitialisation (données identiques):', `${skipDuration.toFixed(2)}ms`);
                    return;
                }
                
                if (response) {
                    const initDataStartTime = performance.now();
                    console.log('✅ [NGONINIT] Données valides reçues, initialisation...', `[${(performance.now() - dataReceiveStartTime).toFixed(2)}ms depuis réception]`);
                    
                    this.response = response;
                    
                    // S'assurer que l'onglet actif est bien défini pour afficher les résultats
                    if (!this.activeTab || this.activeTab === 'matches') {
                        this.activeTab = 'matches'; // Onglet par défaut pour afficher les correspondances
                        console.log('🟢 [NGONINIT] Onglet actif défini à:', this.activeTab);
                    }
                    
                    // La liste des correspondances est masquée par défaut
                    this.showMatchesList = false;
                    console.log('🟢 [NGONINIT] showMatchesList masqué par défaut');
                    
                    const filterStartTime = performance.now();
                    this.initializeFilteredData();
                    const filterDuration = performance.now() - filterStartTime;
                    console.log('⏱️ initializeFilteredData terminé:', `${filterDuration.toFixed(2)}ms`);
                    
                    // Vider le cache quand les données changent
                    const cacheStartTime = performance.now();
                    this.agencyServiceCache.clear();
                    console.log('⏱️ Cache vidé:', `${(performance.now() - cacheStartTime).toFixed(2)}ms`);
                    
                    // Initialiser les informations de progression
                    const progressStartTime = performance.now();
                    console.log('⏱️ Initialisation des temps d\'exécution...');
                    console.log('📊 response.executionTimeMs:', response.executionTimeMs);
                    
                    if (response.executionTimeMs) {
                        this.executionTime = response.executionTimeMs;
                    } else {
                        this.executionTime = 306; // Valeur par défaut
                    }
                    
                    console.log('⏱️ executionTime final:', this.executionTime, `[${(performance.now() - progressStartTime).toFixed(2)}ms]`);
                    
                    if (response.processedRecords) {
                        this.processedRecords = response.processedRecords;
                    }
                    if (response.progressPercentage) {
                        this.progressPercentage = response.progressPercentage;
                    }
                    
                    // Calculer le total des enregistrements
                    const totalStartTime = performance.now();
                    this.totalRecords = (response.totalBoRecords || 0) + (response.totalPartnerRecords || 0);
                    
                    // Si nous n'avons pas encore de totalRecords et que nous avons des données, les calculer
                    if (this.totalRecords === 0 && this.response) {
                        const boCount = this.response.boOnly ? this.response.boOnly.length : 0;
                        const partnerCount = this.response.partnerOnly ? this.response.partnerOnly.length : 0;
                        const matchesCount = this.response.matches ? this.response.matches.length : 0;
                        this.totalRecords = boCount + partnerCount + matchesCount;
                        console.log('📊 Calcul automatique du totalRecords:', this.totalRecords);
                    }
                    console.log('⏱️ Calcul totalRecords:', `${(performance.now() - totalStartTime).toFixed(2)}ms`);
                    
                    // Calculer et mettre en cache les statistiques immédiatement
                    const statsStartTime = performance.now();
                    this.getTotalTransactions(); // Calcule et met en cache
                    this.getMatchRate(); // Calcule et met en cache
                    console.log('⏱️ Calcul statistiques:', `${(performance.now() - statsStartTime).toFixed(2)}ms`);
                    
                    // NE PAS précharger automatiquement - Lazy Loading uniquement à l'activation de l'onglet
                    // Cela évite de charger des données inutiles si l'utilisateur ne visite pas tous les onglets
                    console.log('📦 Lazy Loading activé - Les données seront chargées uniquement à l\'activation des onglets');
                    
                    // Forcer l'affichage immédiat des résultats après l'initialisation
                    console.log('🟢 [NGONINIT] ============================================');
                    console.log('🟢 [NGONINIT] Forçage de l\'affichage des résultats...');
                    const detectChangesStartTime = performance.now();
                    
                    // Vérifier que les données paginées sont bien initialisées
                    console.log('🟢 [NGONINIT] Vérification des données avant rendu:', {
                        filteredMatchesCount: this.filteredMatchesCount,
                        filteredBoOnlyCount: this.filteredBoOnlyCount,
                        filteredPartnerOnlyCount: this.filteredPartnerOnlyCount,
                        pagedMatches: this.pagedMatches?.length || 0,
                        pagedBoOnly: this.pagedBoOnly?.length || 0,
                        pagedPartnerOnly: this.pagedPartnerOnly?.length || 0,
                        activeTab: this.activeTab,
                        showMatchesList: this.showMatchesList,
                        matchesLoaded: this.matchesLoaded
                    });
                    
                    // Forcer le rendu immédiatement (sans attendre requestAnimationFrame)
                    // Avec OnPush, on doit forcer detectChanges() pour garantir le rendu
                    console.log('🟢 [NGONINIT] Appel markForCheck()...');
                    this.cdr.markForCheck();
                    console.log('🟢 [NGONINIT] Appel detectChanges()...');
                    this.cdr.detectChanges();
                    console.log('🟢 [NGONINIT] Rendu immédiat effectué');
                    
                    // Utiliser requestAnimationFrame pour un rendu supplémentaire après le cycle actuel
                    requestAnimationFrame(() => {
                        console.log('🟢 [NGONINIT] Rendu supplémentaire dans RAF...');
                        this.cdr.markForCheck();
                        this.cdr.detectChanges();
                        const detectChangesDuration = performance.now() - detectChangesStartTime;
                        console.log(`🟢 [NGONINIT] Rendu forcé terminé: ${detectChangesDuration.toFixed(2)}ms`);
                        console.log('🟢 [NGONINIT] État final pour affichage:', {
                            filteredMatchesCount: this.filteredMatchesCount,
                            filteredBoOnlyCount: this.filteredBoOnlyCount,
                            filteredPartnerOnlyCount: this.filteredPartnerOnlyCount,
                            pagedMatches: this.pagedMatches?.length || 0,
                            activeTab: this.activeTab,
                            showMatchesList: this.showMatchesList
                        });
                        console.log('🟢 [NGONINIT] ============================================');
                    });
                    
                    const totalInitDuration = performance.now() - initDataStartTime;
                    console.log('⏱️ ⏱️ ⏱️ TEMPS TOTAL D\'INITIALISATION:', `${totalInitDuration.toFixed(2)}ms`, `(${(totalInitDuration / 1000).toFixed(2)}s)`);
                    console.log('📊 Détail des temps:', {
                        'Réception données': `${(dataReceiveStartTime - initStartTime).toFixed(2)}ms`,
                        'Filtrage': `${filterDuration.toFixed(2)}ms`,
                        'Vidage cache': `${(performance.now() - cacheStartTime).toFixed(2)}ms`,
                        'Progression': `${(performance.now() - progressStartTime).toFixed(2)}ms`,
                        'Total records': `${(performance.now() - totalStartTime).toFixed(2)}ms`
                    });
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
        const startTime = performance.now();
        console.log('🔧 [INITFILTERED] Initialisation des données filtrées...', `[${new Date().toISOString()}]`);
        console.log('📊 [INITFILTERED] Response:', {
            hasResponse: !!this.response,
            matchesCount: this.response?.matches?.length || 0,
            boOnlyCount: this.response?.boOnly?.length || 0,
            partnerOnlyCount: this.response?.partnerOnly?.length || 0,
            mismatchesCount: this.response?.mismatches?.length || 0
        });
        
        // Récupérer le jobId depuis le service
        const jobIdStartTime = performance.now();
        this.currentJobId = this.reconciliationService.getCurrentJobId();
        console.log('⏱️ Récupération jobId:', `${(performance.now() - jobIdStartTime).toFixed(2)}ms`);
        
        // Pour les fichiers volumineux, initialiser les tableaux vides
        // Les données détaillées seront chargées à la demande
        const initArraysStartTime = performance.now();
        this.filteredMatches = [];
        this.filteredBoOnly = [];
        this.filteredPartnerOnly = [];
        
        // Réinitialiser les flags de chargement
        this.matchesLoaded = false;
        this.boOnlyLoaded = false;
        this.partnerOnlyLoaded = false;
        console.log('⏱️ Initialisation tableaux:', `${(performance.now() - initArraysStartTime).toFixed(2)}ms`);
        
        // Si les données sont déjà présentes dans la réponse (petits fichiers), les utiliser et mettre en cache
        const filterMatchesStartTime = performance.now();
        if (this.response?.matches && this.response.matches.length > 0) {
            console.log('🔄 Filtrage des matches...', `(${this.response.matches.length} matches à traiter)`);
            this.filteredMatches = this.getFilteredMatches();
            this.matchesLoaded = true;
            this.setCache('matches', this.filteredMatches);
            this.updateCalculatedProperties(true); // Skip pagedDataUpdate (sera fait à la fin)
            console.log('⏱️ Filtrage matches terminé:', `${(performance.now() - filterMatchesStartTime).toFixed(2)}ms`, `(${this.filteredMatchesCount} matches filtrés)`);
        } else {
            this.updateCalculatedProperties(true); // Skip pagedDataUpdate (sera fait à la fin)
            console.log('⏱️ Pas de matches à filtrer:', `${(performance.now() - filterMatchesStartTime).toFixed(2)}ms`);
        }
        
        const filterBoOnlyStartTime = performance.now();
        if ((this.response?.mismatches && this.response.mismatches.length > 0) || 
            (this.response?.boOnly && this.response.boOnly.length > 0)) {
            const totalBoOnly = (this.response?.mismatches?.length || 0) + (this.response?.boOnly?.length || 0);
            console.log('🔄 Filtrage des boOnly...', `(${totalBoOnly} éléments à traiter)`);
            this.filteredBoOnly = this.getFilteredBoOnly();
            this.boOnlyLoaded = true;
            this.setCache('boOnly', this.filteredBoOnly);
            this.updateCalculatedProperties(true); // Skip pagedDataUpdate (sera fait à la fin)
            console.log('⏱️ Filtrage boOnly terminé:', `${(performance.now() - filterBoOnlyStartTime).toFixed(2)}ms`, `(${this.filteredBoOnlyCount} éléments filtrés)`);
        } else {
            this.updateCalculatedProperties(true); // Skip pagedDataUpdate (sera fait à la fin)
            console.log('⏱️ Pas de boOnly à filtrer:', `${(performance.now() - filterBoOnlyStartTime).toFixed(2)}ms`);
        }
        
        const filterPartnerOnlyStartTime = performance.now();
        if (this.response?.partnerOnly && this.response.partnerOnly.length > 0) {
            console.log('🔄 Filtrage des partnerOnly...', `(${this.response.partnerOnly.length} éléments à traiter)`);
            this.filteredPartnerOnly = this.getFilteredPartnerOnly();
            this.partnerOnlyLoaded = true;
            this.setCache('partnerOnly', this.filteredPartnerOnly);
            this.updateCalculatedProperties(true); // Skip pagedDataUpdate (sera fait à la fin)
            console.log('⏱️ Filtrage partnerOnly terminé:', `${(performance.now() - filterPartnerOnlyStartTime).toFixed(2)}ms`, `(${this.filteredPartnerOnlyCount} éléments filtrés)`);
        } else {
            this.updateCalculatedProperties(true); // Skip pagedDataUpdate (sera fait à la fin)
            console.log('⏱️ Pas de partnerOnly à filtrer:', `${(performance.now() - filterPartnerOnlyStartTime).toFixed(2)}ms`);
        }
        
        // Partager les données filtrées avec le service pour le rapport
        const shareDataStartTime = performance.now();
        this.reconciliationTabsService.setFilteredMatches(this.filteredMatches);
        this.reconciliationTabsService.setFilteredBoOnly(this.filteredBoOnly);
        this.reconciliationTabsService.setFilteredPartnerOnly(this.filteredPartnerOnly);
        this.reconciliationTabsService.setFilteredMismatches(this.response?.mismatches || []);
        console.log('⏱️ Partage données avec service:', `${(performance.now() - shareDataStartTime).toFixed(2)}ms`);
        
        const totalDuration = performance.now() - startTime;
        console.log('✅ Données filtrées initialisées:', `${totalDuration.toFixed(2)}ms au total`);
        console.log('📊 Résultats:', {
            FilteredMatches: this.filteredMatches.length,
            FilteredBoOnly: this.filteredBoOnly.length,
            FilteredPartnerOnly: this.filteredPartnerOnly.length,
            JobId: this.currentJobId
        });
        console.log('📊 Détail des temps de filtrage:', {
            'Récupération jobId': `${(jobIdStartTime - startTime).toFixed(2)}ms`,
            'Init tableaux': `${(initArraysStartTime - jobIdStartTime).toFixed(2)}ms`,
            'Filtrage matches': `${(filterMatchesStartTime - initArraysStartTime).toFixed(2)}ms`,
            'Filtrage boOnly': `${(filterBoOnlyStartTime - filterMatchesStartTime).toFixed(2)}ms`,
            'Filtrage partnerOnly': `${(filterPartnerOnlyStartTime - filterBoOnlyStartTime).toFixed(2)}ms`,
            'Partage données': `${(shareDataStartTime - filterPartnerOnlyStartTime).toFixed(2)}ms`
        });
        
        // Désactiver le flag d'initialisation
        this.isInitializing = false;
        
        // Invalider les caches de volumes pour forcer le recalcul
        this.cachedTotalVolumeBo = null;
        this.cachedTotalVolumePartner = null;
        this.cachedVolumeDifference = null;
        
        // Invalider les caches de statistiques pour forcer le recalcul
        this.cachedTotalTransactions = null;
        this.cachedMatchRate = null;
        
        // Mettre à jour les données paginées une seule fois à la fin de l'initialisation
        // Pour tous les volumes, différer le calcul du cache des clés pour un affichage instantané
        const updatePagedStartTime = performance.now();
        console.log('🟢 [INITFILTERED] ============================================');
        console.log('🟢 [INITFILTERED] Mise à jour des données paginées pour affichage immédiat...');
        console.log('🟢 [INITFILTERED] État avant updatePagedData:', {
            filteredMatches: this.filteredMatches.length,
            filteredBoOnly: this.filteredBoOnly.length,
            filteredPartnerOnly: this.filteredPartnerOnly.length,
            matchesPage: this.matchesPage,
            activeTab: this.activeTab
        });
        
        this.updatePagedData(true); // Skip keys cache (sera calculé de manière asynchrone en arrière-plan)
        const updatePagedDuration = performance.now() - updatePagedStartTime;
        console.log(`🟢 [INITFILTERED] updatePagedData terminé: ${updatePagedDuration.toFixed(2)}ms`);
        console.log('🟢 [INITFILTERED] Données paginées initialisées:', {
            pagedMatches: this.pagedMatches?.length || 0,
            pagedBoOnly: this.pagedBoOnly?.length || 0,
            pagedPartnerOnly: this.pagedPartnerOnly?.length || 0,
            activeTab: this.activeTab,
            showMatchesList: this.showMatchesList
        });
        
        // Forcer l'affichage immédiat des résultats (sans attendre les calculs de volumes)
        const forceRenderStartTime = performance.now();
        console.log('🟢 [INITFILTERED] Forçage du rendu IMMÉDIAT pour affichage (volumes calculés en arrière-plan)...');
        // Forcer le rendu immédiatement (sans attendre requestAnimationFrame)
        this.cdr.markForCheck();
        this.cdr.detectChanges();
        
        // Démarrer le calcul asynchrone des volumes en arrière-plan
        console.log('🟢 [INITFILTERED] Démarrage du calcul asynchrone des volumes...');
        this.calculateVolumesAsync();
        
        // Utiliser requestAnimationFrame pour un rendu supplémentaire après le cycle actuel
        requestAnimationFrame(() => {
            this.cdr.markForCheck();
            this.cdr.detectChanges();
            const forceRenderDuration = performance.now() - forceRenderStartTime;
            console.log(`🟢 [INITFILTERED] Rendu forcé terminé: ${forceRenderDuration.toFixed(2)}ms`);
            console.log('🟢 [INITFILTERED] ============================================');
        });
        
        const totalInitDuration = performance.now() - startTime;
        console.log('✅ [INITFILTERED] initializeFilteredData terminé:', `${totalInitDuration.toFixed(2)}ms`);
    }
    
    /**
     * Génère une clé de cache basée sur les données de réponse
     */
    private generateCacheKey(): string {
        if (!this.response) return '';
        return `${this.response.totalMatches}_${this.response.totalBoOnly}_${this.response.totalPartnerOnly}_${this.response.totalMismatches}`;
    }
    
    /**
     * Vérifie si le cache est valide
     */
    private isCacheValid(): boolean {
        const newCacheKey = this.generateCacheKey();
        return this.cacheKey === newCacheKey && 
               this.matchesCache !== null && 
               this.boOnlyCache !== null && 
               this.partnerOnlyCache !== null;
    }
    
    /**
     * Récupère les données depuis le cache si disponible
     */
    private getFromCache(type: 'matches' | 'boOnly' | 'partnerOnly'): any[] | null {
        if (!this.isCacheValid()) {
            return null;
        }
        
        switch (type) {
            case 'matches':
                return this.matchesCache;
            case 'boOnly':
                return this.boOnlyCache;
            case 'partnerOnly':
                return this.partnerOnlyCache;
            default:
                return null;
        }
    }
    
    /**
     * Met en cache les données
     */
    private setCache(type: 'matches' | 'boOnly' | 'partnerOnly', data: any[]): void {
        this.cacheKey = this.generateCacheKey();
        switch (type) {
            case 'matches':
                this.matchesCache = data;
                break;
            case 'boOnly':
                this.boOnlyCache = data;
                break;
            case 'partnerOnly':
                this.partnerOnlyCache = data;
                break;
        }
    }

    onSearch() {
        const searchStartTime = performance.now();
        const searchTerm = this.searchKey.toLowerCase();
        
        if (this.activeTab === 'matches') {
            this.filteredMatches = (this.response?.matches || []).filter(match => 
                match.key.toLowerCase().includes(searchTerm)
            );
            this.matchesPage = 1;
            this.cachedPagedMatches = null; // Invalider le cache
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
            this.cachedPagedBoOnly = null; // Invalider le cache
            // Partager les données filtrées
            this.reconciliationTabsService.setFilteredBoOnly(this.filteredBoOnly);
        } else if (this.activeTab === 'partnerOnly') {
            this.filteredPartnerOnly = (this.response?.partnerOnly || []).filter(record => 
                Object.values(record).some(value => 
                    value.toString().toLowerCase().includes(searchTerm)
                )
            );
            this.partnerOnlyPage = 1;
            this.cachedPagedPartnerOnly = null; // Invalider le cache
            // Partager les données filtrées
            this.reconciliationTabsService.setFilteredPartnerOnly(this.filteredPartnerOnly);
        }
        
        // Mettre à jour les propriétés calculées une seule fois à la fin
        this.updateCalculatedProperties();
        
        const searchDuration = performance.now() - searchStartTime;
        console.log('⏱️ Recherche terminée:', `${searchDuration.toFixed(2)}ms`);
        this.cdr.markForCheck();
    }

    // Cache pour les pages paginées (évite les recalculs)
    private cachedPagedMatches: Match[] | null = null;
    private cachedPagedBoOnly: Record<string, string>[] | null = null;
    private cachedPagedPartnerOnly: Record<string, string>[] | null = null;
    private cachedMatchesPage: number = -1;
    private cachedBoOnlyPage: number = -1;
    private cachedPartnerOnlyPage: number = -1;
    
    /**
     * Met à jour les propriétés calculées pour éviter les recalculs dans le template
     * @param skipPagedDataUpdate Si true, ne met pas à jour les données paginées (pour éviter les recalculs multiples pendant l'initialisation)
     */
    private updateCalculatedProperties(skipPagedDataUpdate: boolean = false): void {
        const updateStartTime = performance.now();
        console.log('🟣 [UPDATE_CALCULATED] ============================================');
        console.log('🟣 [UPDATE_CALCULATED] Début updateCalculatedProperties()', `[${new Date().toISOString()}]`);
        console.log('🟣 [UPDATE_CALCULATED] Paramètres:', {
            skipPagedDataUpdate,
            isInitializing: this.isInitializing
        });
        
        const step1Start = performance.now();
        console.log('🟣 [UPDATE_CALCULATED] Étape 1: Calcul des compteurs...');
        this.filteredMatchesCount = this.filteredMatches.length;
        this.filteredBoOnlyCount = this.filteredBoOnly.length;
        this.filteredPartnerOnlyCount = this.filteredPartnerOnly.length;
        const step1Duration = performance.now() - step1Start;
        console.log(`🟣 [UPDATE_CALCULATED] Étape 1 terminée: ${step1Duration.toFixed(2)}ms`);
        console.log('🟣 [UPDATE_CALCULATED] Compteurs:', {
            filteredMatchesCount: this.filteredMatchesCount,
            filteredBoOnlyCount: this.filteredBoOnlyCount,
            filteredPartnerOnlyCount: this.filteredPartnerOnlyCount
        });
        
        const step2Start = performance.now();
        console.log('🟣 [UPDATE_CALCULATED] Étape 2: Calcul des pages totales...');
        this.totalMatchesPages = Math.max(1, Math.ceil(this.filteredMatchesCount / this.pageSize));
        this.totalBoOnlyPages = Math.max(1, Math.ceil(this.filteredBoOnlyCount / this.pageSize));
        this.totalPartnerOnlyPages = Math.max(1, Math.ceil(this.filteredPartnerOnlyCount / this.pageSize));
        const step2Duration = performance.now() - step2Start;
        console.log(`🟣 [UPDATE_CALCULATED] Étape 2 terminée: ${step2Duration.toFixed(2)}ms`);
        console.log('🟣 [UPDATE_CALCULATED] Pages totales:', {
            totalMatchesPages: this.totalMatchesPages,
            totalBoOnlyPages: this.totalBoOnlyPages,
            totalPartnerOnlyPages: this.totalPartnerOnlyPages,
            pageSize: this.pageSize
        });
        
        // Étape 2.5: Mettre à jour matchRate et totalTransactions
        const step2_5Start = performance.now();
        console.log('🟣 [UPDATE_CALCULATED] Étape 2.5: Mise à jour matchRate et totalTransactions...');
        // Invalider le cache pour forcer le recalcul
        this.cachedMatchRate = null;
        this.cachedTotalTransactions = null;
        // Appeler les méthodes pour calculer et mettre à jour les propriétés
        this.getTotalTransactions();
        this.getMatchRate();
        const step2_5Duration = performance.now() - step2_5Start;
        console.log(`🟣 [UPDATE_CALCULATED] Étape 2.5 terminée: ${step2_5Duration.toFixed(2)}ms`);
        console.log('🟣 [UPDATE_CALCULATED] Statistiques:', {
            totalTransactions: this.totalTransactions,
            matchRate: this.matchRate.toFixed(2) + '%',
            filteredMatchesCount: this.filteredMatchesCount
        });
        
        // Mettre à jour les pages paginées uniquement si demandé (évite les recalculs multiples pendant l'initialisation)
        if (!skipPagedDataUpdate && !this.isInitializing) {
            const step3Start = performance.now();
            console.log('🟣 [UPDATE_CALCULATED] Étape 3: Appel updatePagedData()...');
            this.updatePagedData();
            const step3Duration = performance.now() - step3Start;
            console.log(`🟣 [UPDATE_CALCULATED] Étape 3 terminée: ${step3Duration.toFixed(2)}ms`);
        } else {
            console.log('🟣 [UPDATE_CALCULATED] Étape 3: updatePagedData() ignoré (skipPagedDataUpdate ou isInitializing)');
        }
        
        const updateDuration = performance.now() - updateStartTime;
        console.log(`🟣 [UPDATE_CALCULATED] Durée totale: ${updateDuration.toFixed(2)}ms`, skipPagedDataUpdate ? '(sans updatePagedData)' : '');
        console.log('🟣 [UPDATE_CALCULATED] ============================================');
    }
    
    /**
     * Met à jour les données paginées et précalcule les clés pour chaque match
     * @param skipKeysCache Si true, ne calcule pas le cache des clés (pour l'initialisation rapide)
     */
    private updatePagedData(skipKeysCache: boolean = false): void {
        const updateStartTime = performance.now();
        console.log('🔵 [UPDATE_PAGED_DATA] ============================================');
        console.log('🔵 [UPDATE_PAGED_DATA] Début updatePagedData()', `[${new Date().toISOString()}]`);
        console.log('🔵 [UPDATE_PAGED_DATA] Paramètres:', {
            skipKeysCache,
            activeTab: this.activeTab,
            matchesPage: this.matchesPage,
            boOnlyPage: this.boOnlyPage,
            partnerOnlyPage: this.partnerOnlyPage,
            filteredMatchesLength: this.filteredMatches?.length || 0,
            filteredBoOnlyLength: this.filteredBoOnly?.length || 0,
            filteredPartnerOnlyLength: this.filteredPartnerOnly?.length || 0
        });
        
        // Mettre à jour les pages paginées
        const step1Start = performance.now();
        console.log('🔵 [UPDATE_PAGED_DATA] Étape 1: Mise à jour des données paginées...');
        console.log('🔵 [UPDATE_PAGED_DATA] Avant getPagedMatches:', {
            filteredMatches: this.filteredMatches?.length || 0,
            matchesPage: this.matchesPage,
            pageSize: this.pageSize
        });
        
        // Initialiser directement les données paginées pour un affichage immédiat
        const matchesStart = (this.matchesPage - 1) * this.pageSize;
        const matchesEnd = matchesStart + this.pageSize;
        this.pagedMatches = (this.filteredMatches || []).slice(matchesStart, matchesEnd);
        this.cachedPagedMatches = this.pagedMatches;
        this.cachedMatchesPage = this.matchesPage;
        
        const boOnlyStart = (this.boOnlyPage - 1) * this.pageSize;
        const boOnlyEnd = boOnlyStart + this.pageSize;
        this.pagedBoOnly = (this.filteredBoOnly || []).slice(boOnlyStart, boOnlyEnd);
        this.cachedPagedBoOnly = this.pagedBoOnly;
        this.cachedBoOnlyPage = this.boOnlyPage;
        
        const partnerOnlyStart = (this.partnerOnlyPage - 1) * this.pageSize;
        const partnerOnlyEnd = partnerOnlyStart + this.pageSize;
        this.pagedPartnerOnly = (this.filteredPartnerOnly || []).slice(partnerOnlyStart, partnerOnlyEnd);
        this.cachedPagedPartnerOnly = this.pagedPartnerOnly;
        this.cachedPartnerOnlyPage = this.partnerOnlyPage;
        
        const step1Duration = performance.now() - step1Start;
        console.log(`🔵 [UPDATE_PAGED_DATA] Étape 1 terminée: ${step1Duration.toFixed(2)}ms`);
        console.log('🔵 [UPDATE_PAGED_DATA] Données paginées mises à jour DIRECTEMENT:', {
            pagedMatches: this.pagedMatches?.length || 0,
            pagedBoOnly: this.pagedBoOnly?.length || 0,
            pagedPartnerOnly: this.pagedPartnerOnly?.length || 0,
            showMatchesList: this.showMatchesList,
            activeTab: this.activeTab,
            'Slice matches': `${matchesStart}-${matchesEnd}`,
            'Slice boOnly': `${boOnlyStart}-${boOnlyEnd}`,
            'Slice partnerOnly': `${partnerOnlyStart}-${partnerOnlyEnd}`
        });
        
        // Précalculer les clés pour chaque match de la page actuelle (évite les recalculs dans *ngFor)
        // Pour les gros volumes, différer ce calcul pour ne pas bloquer l'UI
        if (!skipKeysCache && !this.isUpdatingKeysCache) {
            // Utiliser un seul setTimeout pour éviter les appels multiples
            if (!this.keysCacheUpdatePromise) {
                this.isUpdatingKeysCache = true;
                this.keysCacheUpdatePromise = new Promise<void>((resolve) => {
                    setTimeout(async () => {
                        await this.updateKeysCache();
                        this.isUpdatingKeysCache = false;
                        this.keysCacheUpdatePromise = null;
                        resolve();
                    }, 0);
                });
            }
        }
        
        const totalDuration = performance.now() - updateStartTime;
        console.log(`🔵 [UPDATE_PAGED_DATA] Durée totale: ${totalDuration.toFixed(2)}ms`);
        console.log('🔵 [UPDATE_PAGED_DATA] ============================================');
        
        // Forcer le rendu IMMÉDIAT après la mise à jour des données paginées (sans attendre requestAnimationFrame)
        console.log('🔵 [UPDATE_PAGED_DATA] Forçage du rendu IMMÉDIAT...');
        this.cdr.markForCheck();
        this.cdr.detectChanges(); // Forcer immédiatement le rendu
        
        // Utiliser requestAnimationFrame pour un rendu supplémentaire après le cycle actuel
        requestAnimationFrame(() => {
            this.cdr.markForCheck();
            this.cdr.detectChanges();
            console.log('🔵 [UPDATE_PAGED_DATA] Rendu supplémentaire effectué (dans RAF)');
        });
    }
    
    /**
     * Met à jour le cache des clés pour les matches de la page actuelle
     * Utilise un traitement par chunks pour ne pas bloquer l'UI
     * Prévention des appels multiples avec un flag
     */
    private async updateKeysCache(): Promise<void> {
        // Vérifier si une mise à jour est déjà en cours
        if (this.isUpdatingKeysCache) {
            return;
        }
        
        this.isUpdatingKeysCache = true;
        const cacheStartTime = performance.now();
        
        // Ne pas nettoyer le cache immédiatement, seulement les entrées obsolètes
        const matchesToCache = this.pagedMatches;
        
        // Si pas de matches, ne rien faire
        if (matchesToCache.length === 0) {
            this.isUpdatingKeysCache = false;
            return;
        }
        
        // Nettoyer uniquement les entrées qui ne sont plus dans la page actuelle
        const currentMatchKeys = new Set(matchesToCache.map(m => m.key || JSON.stringify(m.boData)));
        for (const [key] of this.matchKeysCache) {
            if (!currentMatchKeys.has(key)) {
                this.matchKeysCache.delete(key);
            }
        }
        
        const CACHE_CHUNK_SIZE = 5; // Réduire la taille du chunk pour plus de réactivité
        
        try {
            for (let i = 0; i < matchesToCache.length; i += CACHE_CHUNK_SIZE) {
                const chunk = matchesToCache.slice(i, i + CACHE_CHUNK_SIZE);
                
                // Traiter le chunk
                for (const match of chunk) {
                    const matchKey = match.key || JSON.stringify(match.boData);
                    if (!this.matchKeysCache.has(matchKey)) {
                        this.matchKeysCache.set(matchKey, {
                            boKeys: this.getBoKeys(match),
                            partnerKeys: this.getPartnerKeys(match),
                            hasDifferences: this.hasDifferences(match)
                        });
                    }
                }
                
                // Yield au navigateur après chaque chunk pour maintenir la réactivité
                if (i + CACHE_CHUNK_SIZE < matchesToCache.length) {
                    await this.yieldToBrowser();
                }
            }
        } finally {
            this.isUpdatingKeysCache = false;
        }
        
        const cacheDuration = performance.now() - cacheStartTime;
        if (cacheDuration > 1) {
            console.log('⏱️ [KEYS_CACHE] updateKeysCache terminé:', {
                'Durée': `${cacheDuration.toFixed(2)}ms`,
                'Matches paginés': matchesToCache.length
            });
        }
        
        // Marquer pour détection de changement uniquement si nécessaire
        if (matchesToCache.length > 0) {
            requestAnimationFrame(() => {
                this.cdr.markForCheck();
            });
        }
    }
    
    /**
     * Récupère les clés BO depuis le cache
     */
    getCachedBoKeys(match: Match): string[] {
        const matchKey = match.key || JSON.stringify(match.boData);
        const cached = this.matchKeysCache.get(matchKey);
        return cached?.boKeys || this.getBoKeys(match);
    }
    
    /**
     * Récupère les clés Partenaire depuis le cache
     */
    getCachedPartnerKeys(match: Match): string[] {
        const matchKey = match.key || JSON.stringify(match.boData);
        const cached = this.matchKeysCache.get(matchKey);
        return cached?.partnerKeys || this.getPartnerKeys(match);
    }
    
    /**
     * Récupère hasDifferences depuis le cache
     */
    getCachedHasDifferences(match: Match): boolean {
        const matchKey = match.key || JSON.stringify(match.boData);
        const cached = this.matchKeysCache.get(matchKey);
        return cached?.hasDifferences ?? this.hasDifferences(match);
    }
    
    // Modifier les méthodes de pagination pour utiliser les données filtrées avec cache
    getPagedMatches(): Match[] {
        // Vérifier le cache
        if (this.cachedPagedMatches && this.cachedMatchesPage === this.matchesPage) {
            return this.cachedPagedMatches;
        }
        
        const start = (this.matchesPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        this.cachedPagedMatches = (this.filteredMatches || []).slice(start, end);
        this.cachedMatchesPage = this.matchesPage;
        
        // Log pour debug
        if (this.cachedPagedMatches.length > 0) {
            console.log(`🔵 [GET_PAGED_MATCHES] Page ${this.matchesPage}: ${this.cachedPagedMatches.length} matches (de ${start} à ${end})`);
        }
        
        return this.cachedPagedMatches;
    }

    getPagedBoOnly(): Record<string, string>[] {
        // Vérifier le cache
        if (this.cachedPagedBoOnly && this.cachedBoOnlyPage === this.boOnlyPage) {
            return this.cachedPagedBoOnly;
        }
        
        const start = (this.boOnlyPage - 1) * this.pageSize;
        this.cachedPagedBoOnly = this.filteredBoOnly.slice(start, start + this.pageSize);
        this.cachedBoOnlyPage = this.boOnlyPage;
        return this.cachedPagedBoOnly;
    }

    getPagedPartnerOnly(): Record<string, string>[] {
        // Vérifier le cache
        if (this.cachedPagedPartnerOnly && this.cachedPartnerOnlyPage === this.partnerOnlyPage) {
            return this.cachedPagedPartnerOnly;
        }
        
        const start = (this.partnerOnlyPage - 1) * this.pageSize;
        this.cachedPagedPartnerOnly = this.filteredPartnerOnly.slice(start, start + this.pageSize);
        this.cachedPartnerOnlyPage = this.partnerOnlyPage;
        return this.cachedPagedPartnerOnly;
    }
    
    // TrackBy functions pour optimiser *ngFor
    trackByMatchKey(index: number, match: Match): string {
        return match.key || `match-${index}`;
    }
    
    trackByRecordKey(index: number, record: Record<string, string>): string {
        const key = record['IDTransaction'] || record['Référence'] || record['CLE'] || `record-${index}`;
        return key.toString();
    }
    
    trackByString(index: number, item: string): string {
        return item;
    }

    getTotalPages(type: 'matches' | 'boOnly' | 'partnerOnly') {
        // Utiliser les propriétés calculées au lieu de recalculer
        switch (type) {
            case 'matches':
                return this.totalMatchesPages;
            case 'boOnly':
                return this.totalBoOnlyPages;
            case 'partnerOnly':
                return this.totalPartnerOnlyPages;
            default:
                return 1;
        }
    }

    setActiveTab(tab: 'matches' | 'boOnly' | 'partnerOnly' | 'agencySummary') {
        const tabSwitchStartTime = performance.now();
        console.log('🔄 [SETACTIVETAB] setActiveTab appelé avec:', tab, `[${new Date().toISOString()}]`);
        
        const setActiveTabStartTime = performance.now();
        this.activeTab = tab;
        this.agencyPage = 1;
        const setActiveTabDuration = performance.now() - setActiveTabStartTime;
        console.log('⏱️ [SETACTIVETAB] Initialisation activeTab et agencyPage:', `${setActiveTabDuration.toFixed(2)}ms`);
        
        // Lazy Loading : Charger les données uniquement à l'activation de l'onglet
        // Prévention des doublons : vérifier qu'un chargement n'est pas déjà en cours
        if (tab === 'matches' && !this.matchesLoaded && !this.isLoadingMatches) {
            const lazyLoadStartTime = performance.now();
            const cacheKey = 'matches';
            console.log('🔍 [SETACTIVETAB] Vérification cache pour matches...');
            
            const cacheCheckStartTime = performance.now();
            const cachedData = this.getFromCache('matches');
            const cacheCheckDuration = performance.now() - cacheCheckStartTime;
            console.log('⏱️ [SETACTIVETAB] Vérification cache matches:', `${cacheCheckDuration.toFixed(2)}ms`, cachedData ? '(données trouvées)' : '(cache vide)');
            
            if (cachedData) {
                const cacheLoadStartTime = performance.now();
                console.log('✅ [SETACTIVETAB] Données matches récupérées depuis le cache');
                this.filteredMatches = cachedData;
                this.matchesLoaded = true;
                
                const updatePropsStartTime = performance.now();
                this.updateCalculatedProperties(); // Mettre à jour les propriétés calculées
                const updatePropsDuration = performance.now() - updatePropsStartTime;
                console.log('⏱️ [SETACTIVETAB] updateCalculatedProperties pour matches:', `${updatePropsDuration.toFixed(2)}ms`);
                
                const shareDataStartTime = performance.now();
                this.reconciliationTabsService.setFilteredMatches(this.filteredMatches);
                const shareDataDuration = performance.now() - shareDataStartTime;
                console.log('⏱️ [SETACTIVETAB] Partage données matches avec service:', `${shareDataDuration.toFixed(2)}ms`);
                
                const cacheLoadDuration = performance.now() - cacheLoadStartTime;
                console.log('⏱️ [SETACTIVETAB] Chargement depuis cache matches terminé:', `${cacheLoadDuration.toFixed(2)}ms`);
            } else if (!this.loadingPromises.has(cacheKey)) {
                const asyncLoadStartTime = performance.now();
                console.log('🔄 [SETACTIVETAB] Démarrage chargement asynchrone matches...');
                // Créer une promesse de chargement pour éviter les doublons
                const loadPromise = this.loadMatchesDataLazy();
                this.loadingPromises.set(cacheKey, loadPromise);
                loadPromise.finally(() => {
                    this.loadingPromises.delete(cacheKey);
                    const asyncLoadDuration = performance.now() - asyncLoadStartTime;
                    console.log('✅ [SETACTIVETAB] Chargement asynchrone matches terminé:', `${asyncLoadDuration.toFixed(2)}ms`);
                });
            } else {
                console.log('⏳ [SETACTIVETAB] Chargement matches déjà en cours, attente...');
                this.loadingPromises.get(cacheKey)?.then(() => {
                    console.log('✅ [SETACTIVETAB] Chargement matches terminé');
                });
            }
            const lazyLoadDuration = performance.now() - lazyLoadStartTime;
            console.log('⏱️ [SETACTIVETAB] Lazy loading matches total:', `${lazyLoadDuration.toFixed(2)}ms`);
        } else if (tab === 'boOnly' && !this.boOnlyLoaded && !this.isLoadingBoOnly) {
            const lazyLoadStartTime = performance.now();
            const cacheKey = 'boOnly';
            console.log('🔍 [SETACTIVETAB] Vérification cache pour boOnly...');
            
            const cacheCheckStartTime = performance.now();
            const cachedData = this.getFromCache('boOnly');
            const cacheCheckDuration = performance.now() - cacheCheckStartTime;
            console.log('⏱️ [SETACTIVETAB] Vérification cache boOnly:', `${cacheCheckDuration.toFixed(2)}ms`, cachedData ? '(données trouvées)' : '(cache vide)');
            
            if (cachedData) {
                const cacheLoadStartTime = performance.now();
                console.log('✅ [SETACTIVETAB] Données boOnly récupérées depuis le cache');
                this.filteredBoOnly = cachedData;
                this.boOnlyLoaded = true;
                
                const updatePropsStartTime = performance.now();
                this.updateCalculatedProperties(); // Mettre à jour les propriétés calculées
                const updatePropsDuration = performance.now() - updatePropsStartTime;
                console.log('⏱️ [SETACTIVETAB] updateCalculatedProperties pour boOnly:', `${updatePropsDuration.toFixed(2)}ms`);
                
                const shareDataStartTime = performance.now();
                this.reconciliationTabsService.setFilteredBoOnly(this.filteredBoOnly);
                const shareDataDuration = performance.now() - shareDataStartTime;
                console.log('⏱️ [SETACTIVETAB] Partage données boOnly avec service:', `${shareDataDuration.toFixed(2)}ms`);
                
                const cacheLoadDuration = performance.now() - cacheLoadStartTime;
                console.log('⏱️ [SETACTIVETAB] Chargement depuis cache boOnly terminé:', `${cacheLoadDuration.toFixed(2)}ms`);
            } else if (!this.loadingPromises.has(cacheKey)) {
                const asyncLoadStartTime = performance.now();
                console.log('🔄 [SETACTIVETAB] Démarrage chargement asynchrone boOnly...');
                const loadPromise = this.loadBoOnlyDataLazy();
                this.loadingPromises.set(cacheKey, loadPromise);
                loadPromise.finally(() => {
                    this.loadingPromises.delete(cacheKey);
                    const asyncLoadDuration = performance.now() - asyncLoadStartTime;
                    console.log('✅ [SETACTIVETAB] Chargement asynchrone boOnly terminé:', `${asyncLoadDuration.toFixed(2)}ms`);
                });
            }
            const lazyLoadDuration = performance.now() - lazyLoadStartTime;
            console.log('⏱️ [SETACTIVETAB] Lazy loading boOnly total:', `${lazyLoadDuration.toFixed(2)}ms`);
        } else if (tab === 'partnerOnly' && !this.partnerOnlyLoaded && !this.isLoadingPartnerOnly) {
            const lazyLoadStartTime = performance.now();
            const cacheKey = 'partnerOnly';
            console.log('🔍 [SETACTIVETAB] Vérification cache pour partnerOnly...');
            
            const cacheCheckStartTime = performance.now();
            const cachedData = this.getFromCache('partnerOnly');
            const cacheCheckDuration = performance.now() - cacheCheckStartTime;
            console.log('⏱️ [SETACTIVETAB] Vérification cache partnerOnly:', `${cacheCheckDuration.toFixed(2)}ms`, cachedData ? '(données trouvées)' : '(cache vide)');
            
            if (cachedData) {
                const cacheLoadStartTime = performance.now();
                console.log('✅ [SETACTIVETAB] Données partnerOnly récupérées depuis le cache');
                this.filteredPartnerOnly = cachedData;
                this.partnerOnlyLoaded = true;
                
                const updatePropsStartTime = performance.now();
                this.updateCalculatedProperties(); // Mettre à jour les propriétés calculées
                const updatePropsDuration = performance.now() - updatePropsStartTime;
                console.log('⏱️ [SETACTIVETAB] updateCalculatedProperties pour partnerOnly:', `${updatePropsDuration.toFixed(2)}ms`);
                
                const shareDataStartTime = performance.now();
                this.reconciliationTabsService.setFilteredPartnerOnly(this.filteredPartnerOnly);
                const shareDataDuration = performance.now() - shareDataStartTime;
                console.log('⏱️ [SETACTIVETAB] Partage données partnerOnly avec service:', `${shareDataDuration.toFixed(2)}ms`);
                
                const cacheLoadDuration = performance.now() - cacheLoadStartTime;
                console.log('⏱️ [SETACTIVETAB] Chargement depuis cache partnerOnly terminé:', `${cacheLoadDuration.toFixed(2)}ms`);
            } else if (!this.loadingPromises.has(cacheKey)) {
                const asyncLoadStartTime = performance.now();
                console.log('🔄 [SETACTIVETAB] Démarrage chargement asynchrone partnerOnly...');
                const loadPromise = this.loadPartnerOnlyDataLazy();
                this.loadingPromises.set(cacheKey, loadPromise);
                loadPromise.finally(() => {
                    this.loadingPromises.delete(cacheKey);
                    const asyncLoadDuration = performance.now() - asyncLoadStartTime;
                    console.log('✅ [SETACTIVETAB] Chargement asynchrone partnerOnly terminé:', `${asyncLoadDuration.toFixed(2)}ms`);
                });
            }
            const lazyLoadDuration = performance.now() - lazyLoadStartTime;
            console.log('⏱️ [SETACTIVETAB] Lazy loading partnerOnly total:', `${lazyLoadDuration.toFixed(2)}ms`);
        }
        
        const markForCheckStartTime = performance.now();
        // Détection des changements immédiate pour un affichage instantané
        // Avec OnPush, markForCheck() est suffisant et plus rapide
        this.cdr.markForCheck();
        const markForCheckDuration = performance.now() - markForCheckStartTime;
        console.log('⏱️ [SETACTIVETAB] markForCheck:', `${markForCheckDuration.toFixed(2)}ms`);
        
        const tabSwitchDuration = performance.now() - tabSwitchStartTime;
        console.log('✅ [SETACTIVETAB] setActiveTab terminé pour:', tab, `[${tabSwitchDuration.toFixed(2)}ms]`);
    }
    
    /**
     * Charge les données de matches avec lazy loading et traitement par chunks
     */
    private async loadMatchesDataLazy(): Promise<void> {
        const loadStartTime = performance.now();
        console.log('🔄 loadMatchesDataLazy démarré (Lazy Loading)', `[${new Date().toISOString()}]`);
        
        // Vérifier le cache d'abord
        const cachedData = this.getFromCache('matches');
        if (cachedData) {
            console.log('✅ Données matches récupérées depuis le cache');
            this.filteredMatches = cachedData;
            this.matchesLoaded = true;
            this.reconciliationTabsService.setFilteredMatches(this.filteredMatches);
            return;
        }
        
        // Si les données sont déjà dans la réponse (petits fichiers), les utiliser
        if (this.response?.matches && this.response.matches.length > 0) {
            console.log('✅ Données matches déjà présentes dans la réponse');
            this.filteredMatches = this.getFilteredMatches();
            this.matchesLoaded = true;
            this.setCache('matches', this.filteredMatches);
            this.reconciliationTabsService.setFilteredMatches(this.filteredMatches);
            return;
        }
        
        if (!this.currentJobId) {
            this.currentJobId = this.reconciliationService.getCurrentJobId();
        }
        
        if (!this.currentJobId) {
            console.warn('⚠️ Aucun jobId disponible pour charger les matches');
            return;
        }
        
        this.isLoadingMatches = true;
        this.loadingProgress.matches = { current: 0, total: 0, percentage: 0 };
        this.cdr.detectChanges();
        
        try {
            // Charger toutes les pages avec traitement par chunks
            await this.loadAllMatchesChunked(0, [], loadStartTime);
        } catch (error) {
            console.error('❌ Erreur lors du chargement lazy des matches:', error);
            this.isLoadingMatches = false;
            this.cdr.detectChanges();
        }
    }
    
    /**
     * Charge toutes les matches par pages avec traitement asynchrone par chunks
     */
    private async loadAllMatchesChunked(page: number, accumulatedMatches: Match[], overallStartTime: number): Promise<void> {
        const pageStartTime = performance.now();
        console.log(`📥 Chargement page ${page + 1} des matches (chunk ${this.CHUNK_SIZE})...`);
        
        return new Promise((resolve, reject) => {
            this.reconciliationService.getMatches(this.currentJobId!, page, this.CHUNK_SIZE).subscribe({
                next: async (response) => {
                    const receiveTime = performance.now();
                    const networkDuration = receiveTime - pageStartTime;
                    
                    // Mettre à jour la progression
                    this.loadingProgress.matches.total = response.total;
                    this.loadingProgress.matches.current = accumulatedMatches.length + response.matches.length;
                    this.loadingProgress.matches.percentage = Math.round((this.loadingProgress.matches.current / this.loadingProgress.matches.total) * 100);
                    
                    // Traitement par chunks avec yield au navigateur
                    const processStartTime = performance.now();
                    await this.processChunked(response.matches, accumulatedMatches, 'matches');
                    const processDuration = performance.now() - processStartTime;
                    
                    console.log(`⏱️ Page ${page + 1}/${response.totalPages} chargée:`, {
                        'Durée réseau': `${networkDuration.toFixed(2)}ms`,
                        'Durée traitement': `${processDuration.toFixed(2)}ms`,
                        'Matches reçus': response.matches.length,
                        'Total accumulé': accumulatedMatches.length,
                        'Progression': `${this.loadingProgress.matches.percentage}%`
                    });
                    
                    // Mettre à jour l'UI périodiquement
                    if (page % 5 === 0 || page + 1 >= response.totalPages) {
                        requestAnimationFrame(() => {
                            this.cdr.markForCheck();
                            this.cdr.detectChanges();
                        });
                    }
                    
                    if (page + 1 < response.totalPages) {
                        // Yield au navigateur avant de charger la page suivante
                        await this.yieldToBrowser();
                        await this.loadAllMatchesChunked(page + 1, accumulatedMatches, overallStartTime);
                        resolve();
                    } else {
                        // Toutes les données sont chargées
                        const finalizeStartTime = performance.now();
                        this.response = {
                            ...this.response!,
                            matches: accumulatedMatches
                        };
                        
                        const filterStartTime = performance.now();
                        this.filteredMatches = this.getFilteredMatches();
                        const filterDuration = performance.now() - filterStartTime;
                        
                        // Mettre en cache
                        this.setCache('matches', this.filteredMatches);
                        
                        this.matchesLoaded = true;
                        this.isLoadingMatches = false;
                        this.updateCalculatedProperties(); // Mettre à jour les propriétés calculées
                        
                        const shareStartTime = performance.now();
                        this.reconciliationTabsService.setFilteredMatches(this.filteredMatches);
                        const shareDuration = performance.now() - shareStartTime;
                        
                        const totalDuration = performance.now() - overallStartTime;
                        console.log(`✅ ${accumulatedMatches.length} matches chargés en ${totalDuration.toFixed(2)}ms (${(totalDuration / 1000).toFixed(2)}s)`);
                        console.log('📊 Détail finalisation:', {
                            'Filtrage': `${filterDuration.toFixed(2)}ms`,
                            'Partage données': `${shareDuration.toFixed(2)}ms`
                        });
                        
                        // Dernière mise à jour UI
                        requestAnimationFrame(() => {
                            this.cdr.markForCheck();
                            this.cdr.detectChanges();
                        });
                        
                        resolve();
                    }
                },
                error: (error) => {
                    const errorDuration = performance.now() - pageStartTime;
                    console.error(`❌ Erreur lors du chargement de la page ${page + 1} des matches (après ${errorDuration.toFixed(2)}ms):`, error);
                    this.isLoadingMatches = false;
                    this.cdr.detectChanges();
                    reject(error);
                }
            });
        });
    }
    
    /**
     * Traite les données par chunks avec yield au navigateur
     */
    private async processChunked<T>(data: T[], accumulator: T[], type: 'matches' | 'boOnly' | 'partnerOnly'): Promise<void> {
        for (let i = 0; i < data.length; i += this.PROCESSING_CHUNK_SIZE) {
            const chunk = data.slice(i, i + this.PROCESSING_CHUNK_SIZE);
            accumulator.push(...chunk);
            
            // Yield au navigateur tous les YIELD_INTERVAL ms
            if (i % (this.PROCESSING_CHUNK_SIZE * 2) === 0) {
                await this.yieldToBrowser();
            }
        }
    }
    
    /**
     * Yield au navigateur pour permettre le rendu
     */
    private yieldToBrowser(): Promise<void> {
        return new Promise(resolve => {
            setTimeout(() => {
                requestAnimationFrame(() => {
                    resolve();
                });
            }, this.YIELD_INTERVAL);
        });
    }
    
    /**
     * Charge toutes les matches par pages
     */
    private loadAllMatches(page: number, accumulatedMatches: Match[], overallStartTime: number): void {
        const pageStartTime = performance.now();
        console.log(`📥 Chargement page ${page + 1} des matches...`);
        
        this.reconciliationService.getMatches(this.currentJobId!, page, 1000).subscribe({
            next: (response) => {
                const receiveTime = performance.now();
                const networkDuration = receiveTime - pageStartTime;
                
                const pushStartTime = performance.now();
                accumulatedMatches.push(...response.matches);
                const pushDuration = performance.now() - pushStartTime;
                
                console.log(`⏱️ Page ${page + 1}/${response.totalPages} chargée:`, {
                    'Durée réseau': `${networkDuration.toFixed(2)}ms`,
                    'Durée push': `${pushDuration.toFixed(2)}ms`,
                    'Matches reçus': response.matches.length,
                    'Total accumulé': accumulatedMatches.length
                });
                
                if (page + 1 < response.totalPages) {
                    // Charger la page suivante
                    this.loadAllMatches(page + 1, accumulatedMatches, overallStartTime);
                } else {
                    // Toutes les données sont chargées
                    const finalizeStartTime = performance.now();
                    this.response = {
                        ...this.response!,
                        matches: accumulatedMatches
                    };
                    
                    const filterStartTime = performance.now();
                    this.filteredMatches = this.getFilteredMatches();
                    const filterDuration = performance.now() - filterStartTime;
                    
                    this.matchesLoaded = true;
                    this.isLoadingMatches = false;
                    
                    const shareStartTime = performance.now();
                    // Partager les données filtrées
                    this.reconciliationTabsService.setFilteredMatches(this.filteredMatches);
                    const shareDuration = performance.now() - shareStartTime;
                    
                    const detectChangesStartTime = performance.now();
                    this.cdr.detectChanges();
                    const detectChangesDuration = performance.now() - detectChangesStartTime;
                    
                    const totalDuration = performance.now() - overallStartTime;
                    console.log(`✅ ${accumulatedMatches.length} matches chargés en ${totalDuration.toFixed(2)}ms (${(totalDuration / 1000).toFixed(2)}s)`);
                    console.log('📊 Détail finalisation:', {
                        'Mise à jour response': `${(filterStartTime - finalizeStartTime).toFixed(2)}ms`,
                        'Filtrage': `${filterDuration.toFixed(2)}ms`,
                        'Partage données': `${shareDuration.toFixed(2)}ms`,
                        'DetectChanges': `${detectChangesDuration.toFixed(2)}ms`
                    });
                }
            },
            error: (error) => {
                const errorDuration = performance.now() - pageStartTime;
                console.error(`❌ Erreur lors du chargement de la page ${page + 1} des matches (après ${errorDuration.toFixed(2)}ms):`, error);
                this.isLoadingMatches = false;
                this.cdr.detectChanges();
            }
        });
    }
    
    /**
     * Charge les données de boOnly avec lazy loading et traitement par chunks
     */
    private async loadBoOnlyDataLazy(): Promise<void> {
        const loadStartTime = performance.now();
        console.log('🔄 loadBoOnlyDataLazy démarré (Lazy Loading)', `[${new Date().toISOString()}]`);
        
        // Vérifier le cache d'abord
        const cachedData = this.getFromCache('boOnly');
        if (cachedData) {
            console.log('✅ Données boOnly récupérées depuis le cache');
            this.filteredBoOnly = cachedData;
            this.boOnlyLoaded = true;
            this.reconciliationTabsService.setFilteredBoOnly(this.filteredBoOnly);
            return;
        }
        
        // Si les données sont déjà dans la réponse, les utiliser
        if ((this.response?.mismatches && this.response.mismatches.length > 0) || 
            (this.response?.boOnly && this.response.boOnly.length > 0)) {
            console.log('✅ Données boOnly déjà présentes dans la réponse');
            this.filteredBoOnly = this.getFilteredBoOnly();
            this.boOnlyLoaded = true;
            this.setCache('boOnly', this.filteredBoOnly);
            this.reconciliationTabsService.setFilteredBoOnly(this.filteredBoOnly);
            return;
        }
        
        if (!this.currentJobId) {
            this.currentJobId = this.reconciliationService.getCurrentJobId();
        }
        
        if (!this.currentJobId) {
            console.warn('⚠️ Aucun jobId disponible pour charger les boOnly');
            return;
        }
        
        this.isLoadingBoOnly = true;
        this.loadingProgress.boOnly = { current: 0, total: 0, percentage: 0 };
        this.cdr.detectChanges();
        
        try {
            // Charger boOnly et mismatches en parallèle avec traitement par chunks
            await Promise.all([
                this.loadAllBoOnlyChunked(0, [], loadStartTime),
                this.loadAllMismatchesChunked(0, [], loadStartTime)
            ]);
        } catch (error) {
            console.error('❌ Erreur lors du chargement lazy des boOnly:', error);
            this.isLoadingBoOnly = false;
            this.cdr.detectChanges();
        }
    }
    
    /**
     * Charge toutes les boOnly par pages avec traitement asynchrone par chunks
     */
    private async loadAllBoOnlyChunked(page: number, accumulatedBoOnly: Record<string, string>[], overallStartTime: number): Promise<void> {
        const pageStartTime = performance.now();
        console.log(`📥 Chargement page ${page + 1} des boOnly (chunk ${this.CHUNK_SIZE})...`);
        
        return new Promise((resolve, reject) => {
            this.reconciliationService.getBoOnly(this.currentJobId!, page, this.CHUNK_SIZE).subscribe({
                next: async (response) => {
                    const receiveTime = performance.now();
                    const networkDuration = receiveTime - pageStartTime;
                    
                    // Mettre à jour la progression
                    this.loadingProgress.boOnly.total = response.total;
                    this.loadingProgress.boOnly.current = accumulatedBoOnly.length + response.boOnly.length;
                    this.loadingProgress.boOnly.percentage = Math.round((this.loadingProgress.boOnly.current / this.loadingProgress.boOnly.total) * 100);
                    
                    // Traitement par chunks avec yield au navigateur
                    const processStartTime = performance.now();
                    await this.processChunked(response.boOnly, accumulatedBoOnly, 'boOnly');
                    const processDuration = performance.now() - processStartTime;
                    
                    console.log(`⏱️ Page ${page + 1}/${response.totalPages} boOnly chargée:`, {
                        'Durée réseau': `${networkDuration.toFixed(2)}ms`,
                        'Durée traitement': `${processDuration.toFixed(2)}ms`,
                        'BoOnly reçus': response.boOnly.length,
                        'Total accumulé': accumulatedBoOnly.length,
                        'Progression': `${this.loadingProgress.boOnly.percentage}%`
                    });
                    
                    if (page + 1 < response.totalPages) {
                        await this.yieldToBrowser();
                        await this.loadAllBoOnlyChunked(page + 1, accumulatedBoOnly, overallStartTime);
                        resolve();
                    } else {
                        // Mettre à jour la réponse avec les boOnly chargés
                        this.response = {
                            ...this.response!,
                            boOnly: accumulatedBoOnly
                        };
                        
                        // Vérifier si les mismatches sont aussi chargés avant de finaliser
                        if (this.response.mismatches && this.response.mismatches.length > 0) {
                            const filterStartTime = performance.now();
                            this.filteredBoOnly = this.getFilteredBoOnly();
                            const filterDuration = performance.now() - filterStartTime;
                            
                            // Mettre en cache
                            this.setCache('boOnly', this.filteredBoOnly);
                            
                            this.boOnlyLoaded = true;
                            this.isLoadingBoOnly = false;
                            
                            this.reconciliationTabsService.setFilteredBoOnly(this.filteredBoOnly);
                            
                            requestAnimationFrame(() => {
                                this.cdr.markForCheck();
                                this.cdr.detectChanges();
                            });
                            
                            console.log(`✅ ${accumulatedBoOnly.length} boOnly chargés`);
                        }
                        resolve();
                    }
                },
                error: (error) => {
                    const errorDuration = performance.now() - pageStartTime;
                    console.error(`❌ Erreur lors du chargement de la page ${page + 1} des boOnly (après ${errorDuration.toFixed(2)}ms):`, error);
                    reject(error);
                }
            });
        });
    }
    
    /**
     * Charge toutes les mismatches par pages avec traitement asynchrone par chunks
     */
    private async loadAllMismatchesChunked(page: number, accumulatedMismatches: Record<string, string>[], overallStartTime: number): Promise<void> {
        const pageStartTime = performance.now();
        console.log(`📥 Chargement page ${page + 1} des mismatches (chunk ${this.CHUNK_SIZE})...`);
        
        return new Promise((resolve, reject) => {
            this.reconciliationService.getMismatches(this.currentJobId!, page, this.CHUNK_SIZE).subscribe({
                next: async (response) => {
                    const receiveTime = performance.now();
                    const networkDuration = receiveTime - pageStartTime;
                    
                    // Traitement par chunks avec yield au navigateur
                    const processStartTime = performance.now();
                    await this.processChunked(response.mismatches, accumulatedMismatches, 'boOnly');
                    const processDuration = performance.now() - processStartTime;
                    
                    console.log(`⏱️ Page ${page + 1}/${response.totalPages} mismatches chargée:`, {
                        'Durée réseau': `${networkDuration.toFixed(2)}ms`,
                        'Durée traitement': `${processDuration.toFixed(2)}ms`,
                        'Mismatches reçus': response.mismatches.length,
                        'Total accumulé': accumulatedMismatches.length
                    });
                    
                    if (page + 1 < response.totalPages) {
                        await this.yieldToBrowser();
                        await this.loadAllMismatchesChunked(page + 1, accumulatedMismatches, overallStartTime);
                        resolve();
                    } else {
                        // Mettre à jour la réponse avec les mismatches chargés
                        this.response = {
                            ...this.response!,
                            mismatches: accumulatedMismatches
                        };
                        
                        // Vérifier si les boOnly sont aussi chargés avant de finaliser
                        if (this.response.boOnly && this.response.boOnly.length > 0) {
                            const filterStartTime = performance.now();
                            this.filteredBoOnly = this.getFilteredBoOnly();
                            const filterDuration = performance.now() - filterStartTime;
                            
                            // Mettre en cache
                            this.setCache('boOnly', this.filteredBoOnly);
                            
                            this.boOnlyLoaded = true;
                            this.isLoadingBoOnly = false;
                            
                            this.reconciliationTabsService.setFilteredBoOnly(this.filteredBoOnly);
                            
                            requestAnimationFrame(() => {
                                this.cdr.markForCheck();
                                this.cdr.detectChanges();
                            });
                            
                            console.log(`✅ ${accumulatedMismatches.length} mismatches chargés`);
                        }
                        resolve();
                    }
                },
                error: (error) => {
                    const errorDuration = performance.now() - pageStartTime;
                    console.error(`❌ Erreur lors du chargement de la page ${page + 1} des mismatches (après ${errorDuration.toFixed(2)}ms):`, error);
                    // Continuer même si les mismatches échouent
                    if (this.response?.boOnly && this.response.boOnly.length > 0) {
                        this.filteredBoOnly = this.getFilteredBoOnly();
                        this.boOnlyLoaded = true;
                        this.isLoadingBoOnly = false;
                        this.cdr.detectChanges();
                    }
                    resolve(); // Résoudre quand même pour ne pas bloquer
                }
            });
        });
    }
    
    /**
     * Charge toutes les boOnly par pages
     */
    private loadAllBoOnly(page: number, accumulatedBoOnly: Record<string, string>[], overallStartTime: number): void {
        const pageStartTime = performance.now();
        console.log(`📥 Chargement page ${page + 1} des boOnly...`);
        
        this.reconciliationService.getBoOnly(this.currentJobId!, page, 1000).subscribe({
            next: (response) => {
                const receiveTime = performance.now();
                const networkDuration = receiveTime - pageStartTime;
                
                const pushStartTime = performance.now();
                accumulatedBoOnly.push(...response.boOnly);
                const pushDuration = performance.now() - pushStartTime;
                
                console.log(`⏱️ Page ${page + 1}/${response.totalPages} boOnly chargée:`, {
                    'Durée réseau': `${networkDuration.toFixed(2)}ms`,
                    'Durée push': `${pushDuration.toFixed(2)}ms`,
                    'BoOnly reçus': response.boOnly.length,
                    'Total accumulé': accumulatedBoOnly.length
                });
                
                if (page + 1 < response.totalPages) {
                    this.loadAllBoOnly(page + 1, accumulatedBoOnly, overallStartTime);
                } else {
                    // Mettre à jour la réponse avec les boOnly chargés
                    const finalizeStartTime = performance.now();
                    this.response = {
                        ...this.response!,
                        boOnly: accumulatedBoOnly
                    };
                    
                    // Vérifier si les mismatches sont aussi chargés
                    if (this.response.mismatches && this.response.mismatches.length > 0) {
                        const filterStartTime = performance.now();
                        this.filteredBoOnly = this.getFilteredBoOnly();
                        const filterDuration = performance.now() - filterStartTime;
                        
                        this.boOnlyLoaded = true;
                        this.isLoadingBoOnly = false;
                        
                        const shareStartTime = performance.now();
                        this.reconciliationTabsService.setFilteredBoOnly(this.filteredBoOnly);
                        const shareDuration = performance.now() - shareStartTime;
                        
                        const totalDuration = performance.now() - overallStartTime;
                        console.log(`✅ ${accumulatedBoOnly.length} boOnly chargés en ${totalDuration.toFixed(2)}ms`);
                        console.log('📊 Détail finalisation boOnly:', {
                            'Filtrage': `${filterDuration.toFixed(2)}ms`,
                            'Partage données': `${shareDuration.toFixed(2)}ms`
                        });
                        
                        // Différer detectChanges pour éviter de bloquer l'UI
                        setTimeout(() => {
                            requestAnimationFrame(() => {
                                const detectChangesStartTime = performance.now();
                                this.cdr.markForCheck();
                                this.cdr.detectChanges();
                                const detectChangesDuration = performance.now() - detectChangesStartTime;
                                console.log('⏱️ detectChanges (après chargement boOnly):', `${detectChangesDuration.toFixed(2)}ms`);
                            });
                        }, 0);
                    }
                }
            },
            error: (error) => {
                const errorDuration = performance.now() - pageStartTime;
                console.error(`❌ Erreur lors du chargement de la page ${page + 1} des boOnly (après ${errorDuration.toFixed(2)}ms):`, error);
                this.isLoadingBoOnly = false;
                this.cdr.detectChanges();
            }
        });
    }
    
    /**
     * Charge toutes les mismatches par pages
     */
    private loadAllMismatches(page: number, accumulatedMismatches: Record<string, string>[], overallStartTime: number): void {
        const pageStartTime = performance.now();
        console.log(`📥 Chargement page ${page + 1} des mismatches...`);
        
        this.reconciliationService.getMismatches(this.currentJobId!, page, 1000).subscribe({
            next: (response) => {
                const receiveTime = performance.now();
                const networkDuration = receiveTime - pageStartTime;
                
                const pushStartTime = performance.now();
                accumulatedMismatches.push(...response.mismatches);
                const pushDuration = performance.now() - pushStartTime;
                
                console.log(`⏱️ Page ${page + 1}/${response.totalPages} mismatches chargée:`, {
                    'Durée réseau': `${networkDuration.toFixed(2)}ms`,
                    'Durée push': `${pushDuration.toFixed(2)}ms`,
                    'Mismatches reçus': response.mismatches.length,
                    'Total accumulé': accumulatedMismatches.length
                });
                
                if (page + 1 < response.totalPages) {
                    this.loadAllMismatches(page + 1, accumulatedMismatches, overallStartTime);
                } else {
                    // Mettre à jour la réponse avec les mismatches chargés
                    const finalizeStartTime = performance.now();
                    this.response = {
                        ...this.response!,
                        mismatches: accumulatedMismatches
                    };
                    
                    // Vérifier si les boOnly sont aussi chargés
                    if (this.response.boOnly && this.response.boOnly.length > 0) {
                        const filterStartTime = performance.now();
                        this.filteredBoOnly = this.getFilteredBoOnly();
                        const filterDuration = performance.now() - filterStartTime;
                        
                        this.boOnlyLoaded = true;
                        this.isLoadingBoOnly = false;
                        
                        const shareStartTime = performance.now();
                        this.reconciliationTabsService.setFilteredBoOnly(this.filteredBoOnly);
                        const shareDuration = performance.now() - shareStartTime;
                        
                        const totalDuration = performance.now() - overallStartTime;
                        console.log(`✅ ${accumulatedMismatches.length} mismatches chargés en ${totalDuration.toFixed(2)}ms`);
                        console.log('📊 Détail finalisation mismatches:', {
                            'Filtrage': `${filterDuration.toFixed(2)}ms`,
                            'Partage données': `${shareDuration.toFixed(2)}ms`
                        });
                        
                        // Différer detectChanges pour éviter de bloquer l'UI
                        setTimeout(() => {
                            requestAnimationFrame(() => {
                                const detectChangesStartTime = performance.now();
                                this.cdr.markForCheck();
                                this.cdr.detectChanges();
                                const detectChangesDuration = performance.now() - detectChangesStartTime;
                                console.log('⏱️ detectChanges (après chargement mismatches):', `${detectChangesDuration.toFixed(2)}ms`);
                            });
                        }, 0);
                    }
                }
            },
            error: (error) => {
                const errorDuration = performance.now() - pageStartTime;
                console.error(`❌ Erreur lors du chargement de la page ${page + 1} des mismatches (après ${errorDuration.toFixed(2)}ms):`, error);
                // Continuer même si les mismatches échouent
                if (this.response?.boOnly && this.response.boOnly.length > 0) {
                    this.filteredBoOnly = this.getFilteredBoOnly();
                    this.boOnlyLoaded = true;
                    this.isLoadingBoOnly = false;
                    this.cdr.detectChanges();
                }
            }
        });
    }
    
    /**
     * Charge les données de partnerOnly avec lazy loading et traitement par chunks
     */
    private async loadPartnerOnlyDataLazy(): Promise<void> {
        const loadStartTime = performance.now();
        console.log('🔄 loadPartnerOnlyDataLazy démarré (Lazy Loading)', `[${new Date().toISOString()}]`);
        
        // Vérifier le cache d'abord
        const cachedData = this.getFromCache('partnerOnly');
        if (cachedData) {
            console.log('✅ Données partnerOnly récupérées depuis le cache');
            this.filteredPartnerOnly = cachedData;
            this.partnerOnlyLoaded = true;
            this.reconciliationTabsService.setFilteredPartnerOnly(this.filteredPartnerOnly);
            return;
        }
        
        // Si les données sont déjà dans la réponse, les utiliser
        if (this.response?.partnerOnly && this.response.partnerOnly.length > 0) {
            console.log('✅ Données partnerOnly déjà présentes dans la réponse');
            this.filteredPartnerOnly = this.getFilteredPartnerOnly();
            this.partnerOnlyLoaded = true;
            this.setCache('partnerOnly', this.filteredPartnerOnly);
            this.reconciliationTabsService.setFilteredPartnerOnly(this.filteredPartnerOnly);
            return;
        }
        
        if (!this.currentJobId) {
            this.currentJobId = this.reconciliationService.getCurrentJobId();
        }
        
        if (!this.currentJobId) {
            console.warn('⚠️ Aucun jobId disponible pour charger les partnerOnly');
            return;
        }
        
        this.isLoadingPartnerOnly = true;
        this.loadingProgress.partnerOnly = { current: 0, total: 0, percentage: 0 };
        this.cdr.detectChanges();
        
        try {
            await this.loadAllPartnerOnlyChunked(0, [], loadStartTime);
        } catch (error) {
            console.error('❌ Erreur lors du chargement lazy des partnerOnly:', error);
            this.isLoadingPartnerOnly = false;
            this.cdr.detectChanges();
        }
    }
    
    /**
     * Charge toutes les partnerOnly par pages avec traitement asynchrone par chunks
     */
    private async loadAllPartnerOnlyChunked(page: number, accumulatedPartnerOnly: Record<string, string>[], overallStartTime: number): Promise<void> {
        const pageStartTime = performance.now();
        console.log(`📥 Chargement page ${page + 1} des partnerOnly (chunk ${this.CHUNK_SIZE})...`);
        
        return new Promise((resolve, reject) => {
            this.reconciliationService.getPartnerOnly(this.currentJobId!, page, this.CHUNK_SIZE).subscribe({
                next: async (response) => {
                    const receiveTime = performance.now();
                    const networkDuration = receiveTime - pageStartTime;
                    
                    // Mettre à jour la progression
                    this.loadingProgress.partnerOnly.total = response.total;
                    this.loadingProgress.partnerOnly.current = accumulatedPartnerOnly.length + response.partnerOnly.length;
                    this.loadingProgress.partnerOnly.percentage = Math.round((this.loadingProgress.partnerOnly.current / this.loadingProgress.partnerOnly.total) * 100);
                    
                    // Traitement par chunks avec yield au navigateur
                    const processStartTime = performance.now();
                    await this.processChunked(response.partnerOnly, accumulatedPartnerOnly, 'partnerOnly');
                    const processDuration = performance.now() - processStartTime;
                    
                    console.log(`⏱️ Page ${page + 1}/${response.totalPages} partnerOnly chargée:`, {
                        'Durée réseau': `${networkDuration.toFixed(2)}ms`,
                        'Durée traitement': `${processDuration.toFixed(2)}ms`,
                        'PartnerOnly reçus': response.partnerOnly.length,
                        'Total accumulé': accumulatedPartnerOnly.length,
                        'Progression': `${this.loadingProgress.partnerOnly.percentage}%`
                    });
                    
                    // Mettre à jour l'UI périodiquement
                    if (page % 5 === 0 || page + 1 >= response.totalPages) {
                        requestAnimationFrame(() => {
                            this.cdr.markForCheck();
                            this.cdr.detectChanges();
                        });
                    }
                    
                    if (page + 1 < response.totalPages) {
                        // Yield au navigateur avant de charger la page suivante
                        await this.yieldToBrowser();
                        await this.loadAllPartnerOnlyChunked(page + 1, accumulatedPartnerOnly, overallStartTime);
                        resolve();
                    } else {
                        // Toutes les données sont chargées
                        const finalizeStartTime = performance.now();
                        this.response = {
                            ...this.response!,
                            partnerOnly: accumulatedPartnerOnly
                        };
                        
                        const filterStartTime = performance.now();
                        this.filteredPartnerOnly = this.getFilteredPartnerOnly();
                        const filterDuration = performance.now() - filterStartTime;
                        
                        // Mettre en cache
                        this.setCache('partnerOnly', this.filteredPartnerOnly);
                        
                        this.partnerOnlyLoaded = true;
                        this.isLoadingPartnerOnly = false;
                        
                        const shareStartTime = performance.now();
                        this.reconciliationTabsService.setFilteredPartnerOnly(this.filteredPartnerOnly);
                        const shareDuration = performance.now() - shareStartTime;
                        
                        const totalDuration = performance.now() - overallStartTime;
                        console.log(`✅ ${accumulatedPartnerOnly.length} partnerOnly chargés en ${totalDuration.toFixed(2)}ms (${(totalDuration / 1000).toFixed(2)}s)`);
                        console.log('📊 Détail finalisation partnerOnly:', {
                            'Filtrage': `${filterDuration.toFixed(2)}ms`,
                            'Partage données': `${shareDuration.toFixed(2)}ms`
                        });
                        
                        // Dernière mise à jour UI
                        requestAnimationFrame(() => {
                            this.cdr.markForCheck();
                            this.cdr.detectChanges();
                        });
                        
                        resolve();
                    }
                },
                error: (error) => {
                    const errorDuration = performance.now() - pageStartTime;
                    console.error(`❌ Erreur lors du chargement de la page ${page + 1} des partnerOnly (après ${errorDuration.toFixed(2)}ms):`, error);
                    this.isLoadingPartnerOnly = false;
                    this.cdr.detectChanges();
                    reject(error);
                }
            });
        });
    }
    
    /**
     * Charge toutes les partnerOnly par pages
     */
    private loadAllPartnerOnly(page: number, accumulatedPartnerOnly: Record<string, string>[], overallStartTime: number): void {
        const pageStartTime = performance.now();
        console.log(`📥 Chargement page ${page + 1} des partnerOnly...`);
        
        this.reconciliationService.getPartnerOnly(this.currentJobId!, page, 1000).subscribe({
            next: (response) => {
                const receiveTime = performance.now();
                const networkDuration = receiveTime - pageStartTime;
                
                const pushStartTime = performance.now();
                accumulatedPartnerOnly.push(...response.partnerOnly);
                const pushDuration = performance.now() - pushStartTime;
                
                console.log(`⏱️ Page ${page + 1}/${response.totalPages} partnerOnly chargée:`, {
                    'Durée réseau': `${networkDuration.toFixed(2)}ms`,
                    'Durée push': `${pushDuration.toFixed(2)}ms`,
                    'PartnerOnly reçus': response.partnerOnly.length,
                    'Total accumulé': accumulatedPartnerOnly.length
                });
                
                if (page + 1 < response.totalPages) {
                    this.loadAllPartnerOnly(page + 1, accumulatedPartnerOnly, overallStartTime);
                } else {
                    // Toutes les données sont chargées
                    const finalizeStartTime = performance.now();
                    this.response = {
                        ...this.response!,
                        partnerOnly: accumulatedPartnerOnly
                    };
                    
                    const filterStartTime = performance.now();
                    this.filteredPartnerOnly = this.getFilteredPartnerOnly();
                    const filterDuration = performance.now() - filterStartTime;
                    
                    this.partnerOnlyLoaded = true;
                    this.isLoadingPartnerOnly = false;
                    
                    const shareStartTime = performance.now();
                    // Partager les données filtrées
                    this.reconciliationTabsService.setFilteredPartnerOnly(this.filteredPartnerOnly);
                    const shareDuration = performance.now() - shareStartTime;
                    
                    const totalDuration = performance.now() - overallStartTime;
                    console.log(`✅ ${accumulatedPartnerOnly.length} partnerOnly chargés en ${totalDuration.toFixed(2)}ms (${(totalDuration / 1000).toFixed(2)}s)`);
                    console.log('📊 Détail finalisation partnerOnly:', {
                        'Mise à jour response': `${(filterStartTime - finalizeStartTime).toFixed(2)}ms`,
                        'Filtrage': `${filterDuration.toFixed(2)}ms`,
                        'Partage données': `${shareDuration.toFixed(2)}ms`
                    });
                    
                    // Différer detectChanges pour éviter de bloquer l'UI
                    setTimeout(() => {
                        requestAnimationFrame(() => {
                            const detectChangesStartTime = performance.now();
                            this.cdr.markForCheck();
                            this.cdr.detectChanges();
                            const detectChangesDuration = performance.now() - detectChangesStartTime;
                            console.log('⏱️ detectChanges (après chargement partnerOnly):', `${detectChangesDuration.toFixed(2)}ms`);
                        });
                    }, 0);
                }
            },
            error: (error) => {
                const errorDuration = performance.now() - pageStartTime;
                console.error(`❌ Erreur lors du chargement de la page ${page + 1} des partnerOnly (après ${errorDuration.toFixed(2)}ms):`, error);
                this.isLoadingPartnerOnly = false;
                this.cdr.detectChanges();
            }
        });
    }

    openReconciliationReport() {
        console.log('📈 Ouverture du rapport de réconciliation...');
        
        // 1. Vérifier si un résumé par agence existe déjà dans le service
        const existingSummary = this.reconciliationSummaryService.getAgencySummary();
        if (existingSummary && existingSummary.length > 0) {
            console.log('✅ Résumé existant trouvé, navigation immédiate vers le rapport');
            this.router.navigate(['/reconciliation-report']);
            return;
        }
        
        // 2. Vérifier si les données sont déjà chargées dans les onglets
        if (this.response && (this.filteredMatches.length > 0 || this.filteredBoOnly.length > 0 || this.filteredPartnerOnly.length > 0)) {
            console.log('📊 Données disponibles, construction rapide du résumé...');
            // Construire le résumé rapidement
            const summary = this.getAgencySummary();
            console.log('✅ Résumé construit:', summary.length, 'éléments');
            // Le résumé est automatiquement stocké dans le service par getAgencySummary()
            this.router.navigate(['/reconciliation-report']);
            return;
        }
        
        // 3. Sinon, naviguer immédiatement (les données seront chargées en arrière-plan)
        console.log('⏳ Pas de données disponibles, navigation immédiate (chargement en arrière-plan)');
        this.router.navigate(['/reconciliation-report']);
    }

    nextPage(type: 'matches' | 'boOnly' | 'partnerOnly') {
        const pageStartTime = performance.now();
        console.log(`🟢 [NEXT_PAGE] ============================================`);
        console.log(`🟢 [NEXT_PAGE] nextPage(${type}) appelé`, `[${new Date().toISOString()}]`);
        console.log(`🟢 [NEXT_PAGE] Page actuelle:`, {
            matches: this.matchesPage,
            boOnly: this.boOnlyPage,
            partnerOnly: this.partnerOnlyPage
        });
        console.log(`🟢 [NEXT_PAGE] Total pages:`, {
            matches: this.getTotalPages('matches'),
            boOnly: this.getTotalPages('boOnly'),
            partnerOnly: this.getTotalPages('partnerOnly')
        });
        console.log(`🟢 [NEXT_PAGE] Données disponibles:`, {
            filteredMatches: this.filteredMatches?.length || 0,
            filteredBoOnly: this.filteredBoOnly?.length || 0,
            filteredPartnerOnly: this.filteredPartnerOnly?.length || 0
        });
        
        if (type === 'matches' && this.matchesPage < this.getTotalPages('matches')) {
            const step1Start = performance.now();
            console.log(`🟢 [NEXT_PAGE] Étape 1: Incrémentation page matches...`);
            this.matchesPage++;
            this.cachedPagedMatches = null; // Invalider le cache
            const step1Duration = performance.now() - step1Start;
            console.log(`🟢 [NEXT_PAGE] Étape 1 terminée: ${step1Duration.toFixed(2)}ms (page: ${this.matchesPage})`);
            
            const step2Start = performance.now();
            console.log(`🟢 [NEXT_PAGE] Étape 2: Calcul slice sur filteredMatches...`);
            console.log(`🟢 [NEXT_PAGE] filteredMatches.length: ${this.filteredMatches?.length || 0}`);
            console.log(`🟢 [NEXT_PAGE] pageSize: ${this.pageSize}`);
            const start = (this.matchesPage - 1) * this.pageSize;
            const end = start + this.pageSize;
            console.log(`🟢 [NEXT_PAGE] Slice de ${start} à ${end}`);
            this.pagedMatches = (this.filteredMatches || []).slice(start, end);
            this.cachedPagedMatches = this.pagedMatches;
            this.cachedMatchesPage = this.matchesPage;
            const step2Duration = performance.now() - step2Start;
            console.log(`🟢 [NEXT_PAGE] Étape 2 terminée: ${step2Duration.toFixed(2)}ms (${this.pagedMatches.length} éléments)`);
            
            const step3Start = performance.now();
            console.log(`🟢 [NEXT_PAGE] Étape 3: Planification updateKeysCache...`);
            requestAnimationFrame(() => {
                const cacheStart = performance.now();
                console.log(`🟢 [NEXT_PAGE] updateKeysCache démarré (dans RAF)`);
                this.updateKeysCache();
                const cacheDuration = performance.now() - cacheStart;
                console.log(`🟢 [NEXT_PAGE] updateKeysCache terminé: ${cacheDuration.toFixed(2)}ms`);
            });
            const step3Duration = performance.now() - step3Start;
            console.log(`🟢 [NEXT_PAGE] Étape 3 terminée: ${step3Duration.toFixed(2)}ms (planifié)`);
        }
        if (type === 'boOnly' && this.boOnlyPage < this.getTotalPages('boOnly')) {
            const step1Start = performance.now();
            console.log(`🟢 [NEXT_PAGE] Étape 1: Incrémentation page boOnly...`);
            this.boOnlyPage++;
            this.cachedPagedBoOnly = null;
            const start = (this.boOnlyPage - 1) * this.pageSize;
            this.pagedBoOnly = (this.filteredBoOnly || []).slice(start, start + this.pageSize);
            this.cachedPagedBoOnly = this.pagedBoOnly;
            this.cachedBoOnlyPage = this.boOnlyPage;
            const step1Duration = performance.now() - step1Start;
            console.log(`🟢 [NEXT_PAGE] boOnly terminé: ${step1Duration.toFixed(2)}ms`);
        }
        if (type === 'partnerOnly' && this.partnerOnlyPage < this.getTotalPages('partnerOnly')) {
            const step1Start = performance.now();
            console.log(`🟢 [NEXT_PAGE] Étape 1: Incrémentation page partnerOnly...`);
            this.partnerOnlyPage++;
            this.cachedPagedPartnerOnly = null;
            const start = (this.partnerOnlyPage - 1) * this.pageSize;
            this.pagedPartnerOnly = (this.filteredPartnerOnly || []).slice(start, start + this.pageSize);
            this.cachedPagedPartnerOnly = this.pagedPartnerOnly;
            this.cachedPartnerOnlyPage = this.partnerOnlyPage;
            const step1Duration = performance.now() - step1Start;
            console.log(`🟢 [NEXT_PAGE] partnerOnly terminé: ${step1Duration.toFixed(2)}ms`);
        }
        const pageDuration = performance.now() - pageStartTime;
        console.log(`🟢 [NEXT_PAGE] Durée totale nextPage(${type}): ${pageDuration.toFixed(2)}ms`);
        
        const step4Start = performance.now();
        console.log(`🟢 [NEXT_PAGE] Étape 4: Planification markForCheck...`);
        requestAnimationFrame(() => {
            const markStart = performance.now();
            console.log(`🟢 [NEXT_PAGE] markForCheck appelé (dans RAF)`);
            this.cdr.markForCheck();
            const markDuration = performance.now() - markStart;
            console.log(`🟢 [NEXT_PAGE] markForCheck terminé: ${markDuration.toFixed(2)}ms`);
        });
        const step4Duration = performance.now() - step4Start;
        console.log(`🟢 [NEXT_PAGE] Étape 4 terminée: ${step4Duration.toFixed(2)}ms (planifié)`);
        console.log(`🟢 [NEXT_PAGE] ============================================`);
    }

    prevPage(type: 'matches' | 'boOnly' | 'partnerOnly') {
        const pageStartTime = performance.now();
        if (type === 'matches' && this.matchesPage > 1) {
            this.matchesPage--;
            this.cachedPagedMatches = null; // Invalider le cache
            // Mettre à jour directement les données paginées SANS attendre de filtrage
            // Utiliser directement filteredMatches qui est déjà filtré, pas besoin de refiltrer
            const start = (this.matchesPage - 1) * this.pageSize;
            this.pagedMatches = (this.filteredMatches || []).slice(start, start + this.pageSize);
            this.cachedPagedMatches = this.pagedMatches;
            this.cachedMatchesPage = this.matchesPage;
            // Différer la mise à jour du cache des clés pour ne pas bloquer l'UI
            requestAnimationFrame(() => {
                this.updateKeysCache();
            });
        }
        if (type === 'boOnly' && this.boOnlyPage > 1) {
            this.boOnlyPage--;
            this.cachedPagedBoOnly = null; // Invalider le cache
            // Mettre à jour directement sans attendre de filtrage
            const start = (this.boOnlyPage - 1) * this.pageSize;
            this.pagedBoOnly = (this.filteredBoOnly || []).slice(start, start + this.pageSize);
            this.cachedPagedBoOnly = this.pagedBoOnly;
            this.cachedBoOnlyPage = this.boOnlyPage;
        }
        if (type === 'partnerOnly' && this.partnerOnlyPage > 1) {
            this.partnerOnlyPage--;
            this.cachedPagedPartnerOnly = null; // Invalider le cache
            // Mettre à jour directement sans attendre de filtrage
            const start = (this.partnerOnlyPage - 1) * this.pageSize;
            this.pagedPartnerOnly = (this.filteredPartnerOnly || []).slice(start, start + this.pageSize);
            this.cachedPagedPartnerOnly = this.pagedPartnerOnly;
            this.cachedPartnerOnlyPage = this.partnerOnlyPage;
        }
        const pageDuration = performance.now() - pageStartTime;
        if (pageDuration > 1) {
            console.log(`⏱️ prevPage(${type}):`, `${pageDuration.toFixed(2)}ms`);
        }
        // Utiliser requestAnimationFrame pour un rendu plus fluide
        requestAnimationFrame(() => {
            this.cdr.markForCheck();
        });
    }

    getBoKeys(match: Match): string[] {
        // Détecter le type de données BO et appliquer le bon filtrage
        return this.getFilteredKeys(match.boData, 'bo');
    }

    getPartnerKeys(match: Match): string[] {
        // Détecter le type de données Partenaire et appliquer le bon filtrage
        return this.getFilteredKeys(match.partnerData, 'partner');
    }

    /**
     * Obtient la valeur BO à partir d'une clé corrigée
     */
    getBoValue(match: Match, correctedKey: string): string {
        const originalKey = this.getOriginalKey(match.boData, correctedKey);
        return match.boData[originalKey] || '';
    }

    /**
     * Obtient la valeur Partenaire à partir d'une clé corrigée
     */
    getPartnerValue(match: Match, correctedKey: string): string {
        const originalKey = this.getOriginalKey(match.partnerData, correctedKey);
        return match.partnerData[originalKey] || '';
    }

    /**
     * Obtient la valeur d'un enregistrement à partir d'une clé corrigée
     */
    getRecordValue(record: Record<string, string>, correctedKey: string): string {
        const originalKey = this.getOriginalKey(record, correctedKey);
        return record[originalKey] || '';
    }

    getRecordKeys(record: Record<string, string>): string[] {
        return Object.keys(record);
    }

    /**
     * Méthode intelligente pour filtrer les colonnes selon le type de données détecté
     * Corrige également les noms de colonnes mal encodés
     */
    getFilteredKeys(record: Record<string, string>, dataType: 'bo' | 'partner'): string[] {
        const keys = Object.keys(record);
        
        // Corriger les noms de colonnes mal encodés
        const correctedKeys = keys.map(key => fixGarbledCharacters(key));
        
        // Créer un mapping entre les clés originales et corrigées pour l'accès aux données
        const keyMapping = new Map<string, string>();
        keys.forEach((originalKey, index) => {
            keyMapping.set(correctedKeys[index], originalKey);
        });
        
        // Détecter le type de données basé sur les colonnes présentes (avec clés corrigées)
        const isTRXBO = correctedKeys.some(key => ['IDTransaction', 'téléphone client', 'GRX'].includes(key));
        const isOPPART = correctedKeys.some(key => ['ID Opération', 'Type Opération', 'Solde avant', 'Solde aprés'].includes(key));
        const isUSSDPART = correctedKeys.some(key => ['Code service', 'Déstinataire', 'Token', 'SMS Action faite'].includes(key));
        
        // Définir les colonnes autorisées selon le type détecté
        let allowedColumns: string[] = [];
        
        if (isTRXBO) {
            // Colonnes TRXBO autorisées (logique de filtrage originale)
            // Inclure les variations pour gérer les différences d'encodage
            allowedColumns = [
                'ID',
                'IDTransaction',
                'téléphone client',
                'telephone client',
                'montant',
                'Service',
                'Agence',
                'Date',
                'Numéro Trans GU',
                'Numero Trans GU',
                'GRX',
                'Statut'
            ];
        } else if (isOPPART) {
            // Colonnes OPPART autorisées (logique de filtrage originale)
            // Inclure les variations pour gérer les différences d'encodage
            allowedColumns = [
                'ID Opération',
                'ID Operation',
                'Type Opération',
                'Type Operation',
                'Montant',
                'Solde avant',
                'Solde aprés',
                'Solde apres',
                'Code proprietaire',
                'Date opération',
                'Date Opération',
                'Date operation',
                'Numéro Trans GU',
                'Numero Trans GU',
                'groupe de réseau',
                'groupe de reseau'
            ];
        } else if (isUSSDPART) {
            // Colonnes USSDPART autorisées (logique de filtrage originale)
            // Inclure les variations pour gérer les différences d'encodage
            allowedColumns = [
                'ID',
                'Agence',
                'Code service',
                'Numéro Trans GU',
                'Numero Trans GU',
                'Déstinataire',
                'Destinataire',
                'date de création',
                'Etat',
                'Token',
                'SMS Action faite',
                'Montant'
            ];
        } else {
            // Si aucun type n'est détecté, retourner toutes les colonnes corrigées
            return correctedKeys;
        }
        
        // Filtrer les clés corrigées pour ne garder que les colonnes autorisées
        // Utiliser une correspondance flexible pour gérer les variations (avec/sans accents, etc.)
        const filteredKeys = correctedKeys.filter(key => {
            // Vérifier correspondance exacte d'abord
            if (allowedColumns.includes(key)) {
                return true;
            }
            
            // Vérifier correspondance insensible à la casse et aux accents
            const normalizedKey = key.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
            const match = allowedColumns.some(allowed => {
                const normalizedAllowed = allowed.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
                return normalizedKey === normalizedAllowed;
            });
            
            if (match) {
                return true;
            }
            
            // Correspondance partielle pour gérer les cas comme "Numero Trans GU" vs "Numéro Trans GU"
            // ou "Type Operation" vs "Type Opération"
            return allowedColumns.some(allowed => {
                // Normaliser les deux chaînes pour comparaison
                const keyWords = normalizedKey.split(/\s+/);
                const allowedWords = allowed.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/\s+/);
                
                // Si les mots principaux correspondent (ignorant les accents)
                if (keyWords.length === allowedWords.length) {
                    return keyWords.every((word, idx) => {
                        const allowedWord = allowedWords[idx];
                        return word === allowedWord || word.includes(allowedWord) || allowedWord.includes(word);
                    });
                }
                
                return false;
            });
        });
        
        return filteredKeys;
    }
    
    /**
     * Obtient la clé originale à partir d'une clé corrigée pour accéder aux données
     */
    private getOriginalKey(record: Record<string, string>, correctedKey: string): string {
        // Chercher la clé originale qui correspond à la clé corrigée
        const originalKey = Object.keys(record).find(key => fixGarbledCharacters(key) === correctedKey);
        return originalKey || correctedKey;
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
            return new Map<string, any[]>();
        }

        const duplicatesMap = new Map<string, any[]>();
        const keyCount = new Map<string, any[]>();

        // Grouper les enregistrements par clé de réconciliation
        data.forEach((record) => {
            // Essayer différents noms de colonnes pour la clé de réconciliation
            const reconciliationKey = this.getReconciliationKey(record);
            const typeOperation = this.getTypeOperation(record);

            if (reconciliationKey && typeOperation) {
                if (!keyCount.has(reconciliationKey)) {
                    keyCount.set(reconciliationKey, []);
                }
                keyCount.get(reconciliationKey)!.push({
                    record: record,
                    typeOperation: typeOperation
                });
            }
        });

        // Identifier les doublons avec les types d'opération spécifiques
        keyCount.forEach((records, key) => {
            const types = records.map(r => r.typeOperation);
            
            // Vérifier si on a les deux types spécifiques
            const hasImpactCompte = types.includes('IMPACT_COMPTIMPACT-COMPTE-GENERAL');
            const hasFraisTransaction = types.includes('FRAIS_TRANSACTION');

            if (records.length >= 2 && hasImpactCompte && hasFraisTransaction) {
                // Cas 1: Doublon TSOP complet (IMPACT + FRAIS)
                duplicatesMap.set(key, records.map(r => ({ ...r, tsopType: 'COMPLETE' })));
            } else if (records.length === 1 && hasImpactCompte && !hasFraisTransaction) {
                // Cas 2: IMPACT seul sans FRAIS (SANS FRAIS)
                duplicatesMap.set(key, records.map(r => ({ ...r, tsopType: 'SANS_FRAIS' })));
            } else if (records.length === 1 && hasFraisTransaction && !hasImpactCompte) {
                // Cas 3: FRAIS_TRANSACTION seul (Régularisation FRAIS)
                duplicatesMap.set(key, records.map(r => ({ ...r, tsopType: 'REGULARISATION_FRAIS' })));
            }
        });
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
                return record[key].toString();
            }
        }
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
                return record[key].toString();
            }
        }
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
        
        // Utiliser le commentaire ajouté par le backend
        const commentaire = record['Commentaire'] || record['commentaire'] || '';
        
        // Si le backend a ajouté un commentaire, l'utiliser
        if (commentaire === 'TSOP' || commentaire === 'TRXSF') {
            return commentaire;
        }
        
        // Par défaut, TSOP pour les écarts BO
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
        
        // Utiliser le commentaire ajouté par le backend
        const commentaire = record['Commentaire'] || record['commentaire'] || '';
        
        // Si le backend a ajouté un commentaire, l'utiliser
        if (commentaire === 'TSOP') {
            return 'TSOP';
        } else if (commentaire === 'TRXSF') {
            return 'TRXSF';
        }
        
        // Par défaut, TSOP pour les écarts BO
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
                Object.keys(match.boData).forEach(key => {
                    // Corriger le nom de colonne mal encodé
                    const correctedKey = fixGarbledCharacters(key);
                    allBoKeys.add(correctedKey);
                });
                Object.keys(match.partnerData).forEach(key => {
                    // Corriger le nom de colonne mal encodé
                    const correctedKey = fixGarbledCharacters(key);
                    allPartnerKeys.add(correctedKey);
                });
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

            const trxsfStyle = {
                fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF00FF00' } }, // Vert
                font: { color: { argb: 'FF000000' }, bold: true },
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
                
                // Appliquer le style selon le type
                if (boOnlyType === 'TSOP') {
                    // Style rouge pour TSOP (écarts BO sans correspondance)
                    row.eachCell(cell => {
                        cell.style = tsorDuplicateStyle;
                    });
                    console.log(`🟥 Ligne ECART BO ${index + 2} colorée en rouge (TSOP)`);
                } else if (boOnlyType === 'TRXSF') {
                    // Style vert pour TRXSF (écarts BO avec une seule correspondance)
                    row.eachCell(cell => {
                        cell.style = trxsfStyle;
                    });
                    console.log(`🟩 Ligne ECART BO ${index + 2} colorée en vert (TRXSF)`);
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

            const trxsfStyle = {
                fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF00FF00' } }, // Vert
                font: { color: { argb: 'FF000000' }, bold: true },
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
                const commentaire = record['Commentaire'] || record['commentaire'] || '';
                
                keysArray.forEach(key => {
                    rowData[key] = record[key] || '';
                });
                const row = worksheet.addRow(rowData);
                
                // Appliquer le style selon le type - ÉCARTS PARTENAIRE
                // Priorité: Commentaire du backend (Ecart, TRXSF) > Type Opération (TSF, C_FRAIS)
                if (commentaire === 'Ecart') {
                    // Style orange pour tous les Ecart
                    row.eachCell(cell => {
                        cell.style = regularisationFraisStyle;
                    });
                    console.log(`🟠 Ligne ${index + 2} colorée en orange (Écart)`);
                } else if (commentaire === 'TRXSF') {
                    // Style vert pour TRXSF
                    row.eachCell(cell => {
                        cell.style = trxsfStyle;
                    });
                    console.log(`🟩 Ligne ${index + 2} colorée en vert (TRXSF)`);
                } else if (tsopType === 'TSF') {
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

    private calculateTotalVolumeCallCount = 0;
    calculateTotalVolume(type: 'bo' | 'partner'): number {
        this.calculateTotalVolumeCallCount++;
        const startTime = performance.now();
        if (this.calculateTotalVolumeCallCount <= 5) {
            console.log(`🔴 [TEMPLATE] calculateTotalVolume(${type}) appelé (${this.calculateTotalVolumeCallCount} fois)`, `[${new Date().toISOString()}]`);
        }
        
        // Utiliser le cache si disponible pour éviter les recalculs coûteux
        if (type === 'bo' && this.cachedTotalVolumeBo !== null) {
            const duration = performance.now() - startTime;
            if (this.calculateTotalVolumeCallCount <= 5) {
                console.log(`🔴 [TEMPLATE] calculateTotalVolume(${type}) depuis cache: ${duration.toFixed(2)}ms (résultat: ${this.cachedTotalVolumeBo})`);
            }
            return this.cachedTotalVolumeBo;
        }
        
        if (type === 'partner' && this.cachedTotalVolumePartner !== null) {
            const duration = performance.now() - startTime;
            if (this.calculateTotalVolumeCallCount <= 5) {
                console.log(`🔴 [TEMPLATE] calculateTotalVolume(${type}) depuis cache: ${duration.toFixed(2)}ms (résultat: ${this.cachedTotalVolumePartner})`);
            }
            return this.cachedTotalVolumePartner;
        }
        
        // Si pas de cache, retourner 0 temporairement et calculer en arrière-plan
        if (type === 'partner' && !this.isCalculatingVolumes) {
            console.log(`🔴 [TEMPLATE] calculateTotalVolume(${type}) - Calcul différé en arrière-plan pour ne pas bloquer l'affichage`);
            this.calculateVolumesAsync();
            return 0; // Retourner 0 temporairement pendant le calcul
        }
        
        let result: number;
        if (type === 'partner') {
            // Pour le volume partenaire, inclure les correspondances ET les écarts partenaire
            const matchesVolume = this.calculateTotalVolumePartnerMatches();
            const partnerOnlyVolume = this.calculateTotalVolumePartnerOnly();
            result = matchesVolume + partnerOnlyVolume;
            this.cachedTotalVolumePartner = result; // Mettre en cache
        } else {
            // Pour le volume BO, utiliser la logique originale
            if (!this.filteredMatches || this.filteredMatches.length === 0) {
                result = 0;
            } else {
                const amountColumn = this.findAmountColumn(type);
                if (!amountColumn) {
                    result = 0;
                } else {
                    result = this.filteredMatches.reduce((total, match) => {
                        const amount = parseFloat(match.boData[amountColumn] || '0');
                        return total + (isNaN(amount) ? 0 : amount);
                    }, 0);
                }
            }
            this.cachedTotalVolumeBo = result; // Mettre en cache
        }
        
        const duration = performance.now() - startTime;
        if (duration > 1 || this.calculateTotalVolumeCallCount <= 5) {
            console.log(`🔴 [TEMPLATE] calculateTotalVolume(${type}) terminé: ${duration.toFixed(2)}ms (résultat: ${result})`);
        }
        return result;
    }
    
    /**
     * Calcule les volumes de manière asynchrone en arrière-plan pour ne pas bloquer l'affichage
     */
    private calculateVolumesAsync(): void {
        if (this.isCalculatingVolumes) {
            return; // Déjà en cours
        }
        
        this.isCalculatingVolumes = true;
        console.log('🟡 [VOLUMES] Début calcul asynchrone des volumes en arrière-plan...');
        
        // Calculer en arrière-plan avec yield au navigateur
        setTimeout(async () => {
            const startTime = performance.now();
            
            // Calculer le volume BO (rapide)
            const boStart = performance.now();
            if (!this.filteredMatches || this.filteredMatches.length === 0) {
                this.cachedTotalVolumeBo = 0;
            } else {
                const amountColumn = this.findAmountColumn('bo');
                if (amountColumn) {
                    this.cachedTotalVolumeBo = this.filteredMatches.reduce((total, match) => {
                        const amount = parseFloat(match.boData[amountColumn] || '0');
                        return total + (isNaN(amount) ? 0 : amount);
                    }, 0);
                } else {
                    this.cachedTotalVolumeBo = 0;
                }
            }
            const boDuration = performance.now() - boStart;
            console.log(`🟡 [VOLUMES] Volume BO calculé: ${boDuration.toFixed(2)}ms (${this.cachedTotalVolumeBo})`);
            
            // Calculer le volume Partner (lent - par chunks)
            const partnerStart = performance.now();
            const matchesVolume = await this.calculateTotalVolumePartnerMatchesAsync();
            const partnerOnlyVolume = this.calculateTotalVolumePartnerOnly();
            this.cachedTotalVolumePartner = matchesVolume + partnerOnlyVolume;
            const partnerDuration = performance.now() - partnerStart;
            console.log(`🟡 [VOLUMES] Volume Partner calculé: ${partnerDuration.toFixed(2)}ms (${this.cachedTotalVolumePartner})`);
            
            // Calculer la différence
            this.cachedVolumeDifference = (this.cachedTotalVolumeBo || 0) - (this.cachedTotalVolumePartner || 0);
            
            // Mettre à jour les propriétés publiques pour le template
            this.totalVolumeBo = this.cachedTotalVolumeBo || 0;
            this.totalVolumePartner = this.cachedTotalVolumePartner || 0;
            this.volumeDifference = this.cachedVolumeDifference;
            
            const totalDuration = performance.now() - startTime;
            console.log(`🟡 [VOLUMES] Calcul des volumes terminé: ${totalDuration.toFixed(2)}ms`);
            console.log('🟡 [VOLUMES] Résultats:', {
                bo: this.cachedTotalVolumeBo,
                partner: this.cachedTotalVolumePartner,
                difference: this.cachedVolumeDifference
            });
            
            this.isCalculatingVolumes = false;
            
            // Forcer le rendu pour mettre à jour l'affichage avec les valeurs calculées
            this.cdr.markForCheck();
            this.cdr.detectChanges();
        }, 0);
    }
    
    /**
     * Calcule le volume partenaire des correspondances de manière asynchrone par chunks
     */
    private async calculateTotalVolumePartnerMatchesAsync(): Promise<number> {
        if (!this.filteredMatches || this.filteredMatches.length === 0) return 0;
        
        let total = 0;
        const CHUNK_SIZE = 1000; // Traiter 1000 matches à la fois
        
        for (let i = 0; i < this.filteredMatches.length; i += CHUNK_SIZE) {
            const chunk = this.filteredMatches.slice(i, i + CHUNK_SIZE);
            
            for (const match of chunk) {
                const partnerData = match.partnerData || {};
                let recordTotal = 0;
                
                // Liste exhaustive des colonnes qui peuvent contenir des montants
                const possibleAmountColumns = [
                    'amount', 'Amount', 'AMOUNT',
                    'montant', 'Montant', 'MONTANT',
                    'debit', 'Debit', 'DEBIT', 'débit', 'Débit', 'DÉBIT',
                    'credit', 'Credit', 'CREDIT', 'crédit', 'Crédit', 'CRÉDIT',
                    'valeur', 'Valeur', 'VALEUR',
                    'value', 'Value', 'VALUE',
                    'somme', 'Somme', 'SOMME',
                    'sum', 'Sum', 'SUM',
                    'total', 'Total', 'TOTAL',
                    'montant_credit', 'montant_debit', 'montant_débit', 'montant_crédit',
                    'montant_operation', 'montant_opération', 'montant_transaction',
                    'montant_credit_operation', 'montant_débit_operation',
                    'external_amount', 'External amount', 'EXTERNAL_AMOUNT',
                    'externalAmount', 'ExternalAmount',
                    'balance', 'Balance', 'BALANCE'
                ];
                
                // Parcourir toutes les colonnes et sommer tous les montants trouvés en valeur absolue
                for (const column of Object.keys(partnerData)) {
                    const lowerColumn = column.toLowerCase();
                    if (possibleAmountColumns.some(name => lowerColumn.includes(name.toLowerCase()))) {
                        const amount = parseFloat(partnerData[column] || '0');
                        if (!isNaN(amount)) {
                            recordTotal += Math.abs(amount);
                        }
                    }
                }
                
                total += recordTotal;
            }
            
            // Yield au navigateur après chaque chunk pour ne pas bloquer
            if (i + CHUNK_SIZE < this.filteredMatches.length) {
                await this.yieldToBrowser();
            }
        }
        
        return total;
    }

    /**
     * Calcule le volume partenaire des correspondances en sommant TOUS les montants possibles
     * (Amount, debit, credit, etc.) en valeur absolue
     */
    calculateTotalVolumePartnerMatches(): number {
        if (!this.filteredMatches || this.filteredMatches.length === 0) return 0;
        
        return this.filteredMatches.reduce((total, match) => {
            const partnerData = match.partnerData || {};
            let recordTotal = 0;
            
            // Liste exhaustive des colonnes qui peuvent contenir des montants
            const possibleAmountColumns = [
                'amount', 'Amount', 'AMOUNT',
                'montant', 'Montant', 'MONTANT',
                'debit', 'Debit', 'DEBIT', 'débit', 'Débit', 'DÉBIT',
                'credit', 'Credit', 'CREDIT', 'crédit', 'Crédit', 'CRÉDIT',
                'valeur', 'Valeur', 'VALEUR',
                'value', 'Value', 'VALUE',
                'somme', 'Somme', 'SOMME',
                'sum', 'Sum', 'SUM',
                'total', 'Total', 'TOTAL',
                'montant_credit', 'montant_debit', 'montant_débit', 'montant_crédit',
                'montant_operation', 'montant_opération', 'montant_transaction',
                'montant_credit_operation', 'montant_débit_operation',
                'external_amount', 'External amount', 'EXTERNAL_AMOUNT',
                'externalAmount', 'ExternalAmount',
                'balance', 'Balance', 'BALANCE'
            ];
            
            // Parcourir toutes les colonnes et sommer tous les montants trouvés en valeur absolue
            for (const column of Object.keys(partnerData)) {
                const lowerColumn = column.toLowerCase();
                if (possibleAmountColumns.some(name => lowerColumn.includes(name.toLowerCase()))) {
                    const amount = parseFloat(partnerData[column] || '0');
                    if (!isNaN(amount)) {
                        recordTotal += Math.abs(amount);
                    }
                }
            }
            
            return total + recordTotal;
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

    private calculateVolumeDifferenceCallCount = 0;
    calculateVolumeDifference(): number {
        this.calculateVolumeDifferenceCallCount++;
        const startTime = performance.now();
        if (this.calculateVolumeDifferenceCallCount <= 5) {
            console.log(`🔴 [TEMPLATE] calculateVolumeDifference() appelé (${this.calculateVolumeDifferenceCallCount} fois)`, `[${new Date().toISOString()}]`);
        }
        
        // Utiliser le cache si disponible
        if (this.cachedVolumeDifference !== null) {
            const duration = performance.now() - startTime;
            if (this.calculateVolumeDifferenceCallCount <= 5) {
                console.log(`🔴 [TEMPLATE] calculateVolumeDifference() depuis cache: ${duration.toFixed(2)}ms (résultat: ${this.cachedVolumeDifference})`);
            }
            return this.cachedVolumeDifference;
        }
        
        // Si pas de cache, calculer (mais cela déclenchera le calcul asynchrone)
        const boVolume = this.calculateTotalVolume('bo');
        const partnerVolume = this.calculateTotalVolume('partner');
        const result = boVolume - partnerVolume;
        
        // Mettre en cache si les deux volumes sont calculés
        if (this.cachedTotalVolumeBo !== null && this.cachedTotalVolumePartner !== null) {
            this.cachedVolumeDifference = result;
        }
        
        const duration = performance.now() - startTime;
        if (duration > 1 || this.calculateVolumeDifferenceCallCount <= 5) {
            console.log(`🔴 [TEMPLATE] calculateVolumeDifference() terminé: ${duration.toFixed(2)}ms (résultat: ${result})`);
        }
        return result;
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
        
        // Pour OPPART, faire la somme uniquement des lignes IMPACT_COMPTIMPACT-COMPTE-GENERAL
        if (this.isTRXBOOPPARTReconciliation()) {
            return this.filteredPartnerOnly.reduce((total, record) => {
                const typeOperation = this.getTypeOperation(record);
                // Ne sommer que les lignes avec IMPACT_COMPTIMPACT-COMPTE-GENERAL
                if (typeOperation && typeOperation.includes('IMPACT_COMPTIMPACT-COMPTE-GENERAL')) {
                    const amount = this.getPartnerOnlyVolume(record);
                    // Utiliser la valeur absolue pour tous les fichiers partenaire
                    return total + Math.abs(amount);
                }
                return total;
            }, 0);
        }
        
        // Pour les autres cas, utiliser la valeur absolue du montant
        return this.filteredPartnerOnly.reduce((total, record) => {
            const amount = this.getPartnerOnlyVolume(record);
            // Utiliser la valeur absolue pour tous les fichiers partenaire
            return total + Math.abs(amount);
        }, 0);
    }

    getPartnerOnlyVolume(record: Record<string, string>): number {
        // Liste exhaustive des colonnes qui peuvent contenir des montants
        const possibleAmountColumns = [
            'amount', 'Amount', 'AMOUNT',
            'montant', 'Montant', 'MONTANT',
            'debit', 'Debit', 'DEBIT', 'débit', 'Débit', 'DÉBIT',
            'credit', 'Credit', 'CREDIT', 'crédit', 'Crédit', 'CRÉDIT',
            'valeur', 'Valeur', 'VALEUR',
            'value', 'Value', 'VALUE',
            'somme', 'Somme', 'SOMME',
            'sum', 'Sum', 'SUM',
            'total', 'Total', 'TOTAL',
            'montant_credit', 'montant_debit', 'montant_débit', 'montant_crédit',
            'montant_operation', 'montant_opération', 'montant_transaction',
            'montant_credit_operation', 'montant_débit_operation',
            'external_amount', 'External amount', 'EXTERNAL_AMOUNT',
            'externalAmount', 'ExternalAmount',
            'balance', 'Balance', 'BALANCE'
        ];
        
        let total = 0;
        
        // Parcourir toutes les colonnes et sommer tous les montants trouvés en valeur absolue
        for (const column of Object.keys(record)) {
            const lowerColumn = column.toLowerCase();
            if (possibleAmountColumns.some(name => lowerColumn.includes(name.toLowerCase()))) {
                const amount = parseFloat(record[column] || '0');
                if (!isNaN(amount)) {
                    total += Math.abs(amount);
                }
            }
        }
        
        return total;
    }

    // Cache pour getBoAgencyAndService par match key (évite les recalculs dans le template)
    private boAgencyServiceCacheByKey = new Map<string, { agency: string; service: string; volume: number; date: string; country: string }>();
    
    /**
     * Version optimisée avec cache par clé de match pour le template
     */
    getCachedBoAgencyAndService(match: Match): { agency: string; service: string; volume: number; date: string; country: string } {
        const matchKey = match.key || JSON.stringify(match.boData);
        
        // Vérifier le cache d'abord
        if (this.boAgencyServiceCacheByKey.has(matchKey)) {
            return this.boAgencyServiceCacheByKey.get(matchKey)!;
        }
        
        // Calculer et mettre en cache
        const result = this.getBoAgencyAndService(match);
        this.boAgencyServiceCacheByKey.set(matchKey, result);
        return result;
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

    getPartnerOnlyDate(record: Record<string, string>): string {
        const dateColumn = this.findDateColumn(record);
        return dateColumn ? record[dateColumn] || 'Non spécifié' : 'Non spécifié';
    }

    private findDateColumn(data: Record<string, string>): string | null {
        const dateKeywords = ['date', 'jour', 'day', 'created', 'creation', 'transaction'];
        return this.findColumnByKeywords(data, dateKeywords);
    }

    private findCountryColumn(data: Record<string, string>): string | null {
        const possibleColumns = ['GRX', 'grx', 'GRX', 'Pays', 'PAYS', 'Country', 'COUNTRY', 'paysProvenance', 'Pays provenance', 'PAYS PROVENANCE'];
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

    private getPagedAgencySummaryCallCount = 0;
    getPagedAgencySummary(): Array<{agency: string; service: string; date: string; country: string; totalVolume: number; recordCount: number}> {
        this.getPagedAgencySummaryCallCount++;
        const startTime = performance.now();
        if (this.getPagedAgencySummaryCallCount <= 5) {
            console.log(`🔴 [TEMPLATE] getPagedAgencySummary() appelé (${this.getPagedAgencySummaryCallCount} fois)`, `[${new Date().toISOString()}]`);
        }
        
        const currentHash = this.getAgencySummaryHash();
        
        if (this.cachedPagedAgencySummary && this.lastAgencySummaryHash === currentHash) {
            const duration = performance.now() - startTime;
            if (this.getPagedAgencySummaryCallCount <= 5) {
                console.log(`🔴 [TEMPLATE] getPagedAgencySummary() (cache): ${duration.toFixed(2)}ms`);
            }
            return this.cachedPagedAgencySummary;
        }
        
        const start = (this.agencyPage - 1) * this.agencyPageSize;
        const summary = this.getAgencySummary();
        this.cachedPagedAgencySummary = summary.slice(start, start + this.agencyPageSize);
        this.lastAgencySummaryHash = currentHash;
        
        const duration = performance.now() - startTime;
        if (duration > 1 || this.getPagedAgencySummaryCallCount <= 5) {
            console.log(`🔴 [TEMPLATE] getPagedAgencySummary() terminé: ${duration.toFixed(2)}ms (${this.cachedPagedAgencySummary.length} éléments)`);
        }
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

    private getTotalTransactionsCallCount = 0;
    getTotalTransactions(): number {
        // Utiliser le cache si disponible
        if (this.cachedTotalTransactions !== null) {
            return this.cachedTotalTransactions;
        }
        
        this.getTotalTransactionsCallCount++;
        const startTime = performance.now();
        if (this.getTotalTransactionsCallCount <= 5) {
            console.log(`🔴 [TEMPLATE] getTotalTransactions() appelé (${this.getTotalTransactionsCallCount} fois)`, `[${new Date().toISOString()}]`);
        }
        
        // Nombre de transactions = correspondances + écarts BO
        // CORRECTION: Utiliser directement les données de la réponse au lieu des versions filtrées
        // pour garantir que le nombre total de transactions est toujours correct
        const matches = this.response?.matches?.length || 0;
        const boMismatches = this.response?.boOnly?.length || 0;
        const result = matches + boMismatches;
        
        // Mettre en cache et mettre à jour la propriété publique
        this.cachedTotalTransactions = result;
        this.totalTransactions = result;
        
        const duration = performance.now() - startTime;
        if (duration > 0.1 || this.getTotalTransactionsCallCount <= 5) {
            console.log(`🔴 [TEMPLATE] getTotalTransactions() terminé: ${duration.toFixed(2)}ms (résultat: ${result}, matches: ${matches}, boOnly: ${boMismatches})`);
        }
        return result;
    }

    private getMatchRateCallCount = 0;
    getMatchRate(): number {
        // Utiliser le cache si disponible
        if (this.cachedMatchRate !== null) {
            return this.cachedMatchRate;
        }
        
        this.getMatchRateCallCount++;
        const startTime = performance.now();
        if (this.getMatchRateCallCount <= 5) {
            console.log(`🔴 [TEMPLATE] getMatchRate() appelé (${this.getMatchRateCallCount} fois)`, `[${new Date().toISOString()}]`);
        }
        
        const total = this.getTotalTransactions();
        if (total === 0) {
            const duration = performance.now() - startTime;
            if (this.getMatchRateCallCount <= 5) {
                console.log(`🔴 [TEMPLATE] getMatchRate() terminé: ${duration.toFixed(2)}ms (résultat: 0)`);
            }
            // Mettre en cache et mettre à jour la propriété publique
            this.cachedMatchRate = 0;
            this.matchRate = 0;
            return 0;
        }
        const matches = this.filteredMatches.length || 0;
        const result = (matches / total) * 100;
        
        // Mettre en cache et mettre à jour la propriété publique
        this.cachedMatchRate = result;
        this.matchRate = result;
        
        const duration = performance.now() - startTime;
        if (duration > 0.1 || this.getMatchRateCallCount <= 5) {
            console.log(`🔴 [TEMPLATE] getMatchRate() terminé: ${duration.toFixed(2)}ms (résultat: ${result.toFixed(2)}%)`);
        }
        return result;
    }

    getTotalVolumeAll(): number {
        // Volume des correspondances (BO)
        const matchesVolume = this.calculateTotalVolume('bo');
        
        // Volume des écarts BO
        const boOnlyVolume = this.calculateTotalVolumeBoOnly();
        
        // Volume des écarts Partenaire
        const partnerOnlyVolume = this.calculateTotalVolumePartnerOnly();
        
        return matchesVolume + boOnlyVolume + partnerOnlyVolume;
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
        const startTime = performance.now();
        console.log('🟡 [GET_FILTERED_MATCHES] ============================================');
        console.log('🟡 [GET_FILTERED_MATCHES] Début getFilteredMatches()', `[${new Date().toISOString()}]`);
        
        const step1Start = performance.now();
        const matches = this.response?.matches || [];
        const totalMatches = matches.length;
        const step1Duration = performance.now() - step1Start;
        console.log(`🟡 [GET_FILTERED_MATCHES] Étape 1: Récupération matches: ${step1Duration.toFixed(2)}ms (${totalMatches} matches)`);

        if (!this.selectedService) {
            const totalDuration = performance.now() - startTime;
            console.log(`🟡 [GET_FILTERED_MATCHES] Pas de filtre service, retour direct: ${totalDuration.toFixed(2)}ms`);
            console.log('🟡 [GET_FILTERED_MATCHES] ============================================');
            return matches;
        }

        const step2Start = performance.now();
        console.log(`🟡 [GET_FILTERED_MATCHES] Étape 2: Filtrage par service "${this.selectedService}"...`);
        console.log(`🟡 [GET_FILTERED_MATCHES] Filtrage de ${totalMatches} matches...`);
        const filtered = matches.filter(match => {
            const boService = match.boData['Service'] || '';
            return boService === this.selectedService;
        });
        const step2Duration = performance.now() - step2Start;
        const totalDuration = performance.now() - startTime;

        console.log(`🟡 [GET_FILTERED_MATCHES] Étape 2 terminée: ${step2Duration.toFixed(2)}ms`);
        console.log('🟡 [GET_FILTERED_MATCHES] Résultats:', {
            'Durée totale': `${totalDuration.toFixed(2)}ms`,
            'Durée filtrage': `${step2Duration.toFixed(2)}ms`,
            'Total matches': totalMatches,
            'Matches filtrés': filtered.length,
            'Service sélectionné': this.selectedService,
            'Taux de filtrage': totalMatches > 0 ? `${((filtered.length / totalMatches) * 100).toFixed(2)}%` : '0%'
        });
        console.log('🟡 [GET_FILTERED_MATCHES] ============================================');

        return filtered;
    }

    private getFilteredBoOnlyCallCount = 0;
    private getFilteredBoOnly(): Record<string, string>[] {
        this.getFilteredBoOnlyCallCount++;
        const startTime = performance.now();
        console.log(`🟠 [TEMPLATE] getFilteredBoOnly() appelé (${this.getFilteredBoOnlyCallCount} fois)`, `[${new Date().toISOString()}]`);
        console.trace('🟠 [TEMPLATE] Stack trace getFilteredBoOnly()'); // Pour voir d'où vient l'appel
        
        // Pour TRXBO/OPPART, utiliser mismatches au lieu de boOnly
        const mismatches = this.response?.mismatches || [];
        const boOnly = this.response?.boOnly || [];

        const combineStartTime = performance.now();
        // Combiner mismatches et boOnly pour l'affichage des écarts
        const allMismatches = [...mismatches, ...boOnly];
        const combineDuration = performance.now() - combineStartTime;

        if (!this.selectedService) {
            const totalDuration = performance.now() - startTime;
            console.log(`🟠 [TEMPLATE] getFilteredBoOnly (pas de filtre): ${totalDuration.toFixed(2)}ms (${allMismatches.length} éléments)`);
            return allMismatches;
        }

        const filterStartTime = performance.now();
        const filtered = allMismatches.filter(record => (record['Service'] || '') === this.selectedService);
        const filterDuration = performance.now() - filterStartTime;
        const totalDuration = performance.now() - startTime;
        
        console.log(`🟠 [TEMPLATE] getFilteredBoOnly (avec filtre): ${totalDuration.toFixed(2)}ms`, {
            'Durée combinaison': `${combineDuration.toFixed(2)}ms`,
            'Durée filtrage': `${filterDuration.toFixed(2)}ms`,
            'Total mismatches': mismatches.length,
            'Total boOnly': boOnly.length,
            'Total combiné': allMismatches.length,
            'Éléments filtrés': filtered.length,
            'Service sélectionné': this.selectedService
        });

        return filtered;
    }

    private getFilteredPartnerOnly(): Record<string, string>[] {
        const startTime = performance.now();
        const partnerOnly = this.response?.partnerOnly || [];
        const totalPartnerOnly = partnerOnly.length;
        
        if (!this.selectedService) {
            console.log('⏱️ getFilteredPartnerOnly (pas de filtre):', `${(performance.now() - startTime).toFixed(2)}ms`, `(${totalPartnerOnly} éléments)`);
            return partnerOnly;
        }
        
        const filterStartTime = performance.now();
        const filtered = partnerOnly.filter(record => (record['Service'] || '') === this.selectedService);
        const filterDuration = performance.now() - filterStartTime;
        const totalDuration = performance.now() - startTime;
        
        console.log('⏱️ getFilteredPartnerOnly:', {
            'Durée totale': `${totalDuration.toFixed(2)}ms`,
            'Durée filtrage': `${filterDuration.toFixed(2)}ms`,
            'Total partnerOnly': totalPartnerOnly,
            'Éléments filtrés': filtered.length,
            'Service sélectionné': this.selectedService
        });
        
        return filtered;
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

    goToMatches() {
        const buttonClickStartTime = performance.now();
        console.log('🔵 [BOUTON] goToMatches() - Clic détecté', `[${new Date().toISOString()}]`);
        
        const setActiveTabStartTime = performance.now();
        // Utiliser setActiveTab pour avoir le même comportement que les autres boutons
        // Cela garantit un comportement cohérent et une navigation immédiate
        this.setActiveTab('matches');
        const setActiveTabDuration = performance.now() - setActiveTabStartTime;
        console.log('⏱️ [BOUTON] goToMatches - setActiveTab terminé:', `${setActiveTabDuration.toFixed(2)}ms`);
        
        const navigateStartTime = performance.now();
        // Navigation immédiate - les données se chargeront en arrière-plan si nécessaire
        this.router.navigate(['/matches']).then(() => {
            const navigateDuration = performance.now() - navigateStartTime;
            const totalDuration = performance.now() - buttonClickStartTime;
            console.log('✅ [BOUTON] goToMatches - Navigation vers /matches réussie:', {
                'Durée navigation': `${navigateDuration.toFixed(2)}ms`,
                'Durée totale': `${totalDuration.toFixed(2)}ms`
            });
        }).catch(err => {
            const navigateDuration = performance.now() - navigateStartTime;
            const totalDuration = performance.now() - buttonClickStartTime;
            console.error('❌ [BOUTON] goToMatches - Erreur lors de la navigation vers /matches:', {
                'Erreur': err,
                'Durée navigation': `${navigateDuration.toFixed(2)}ms`,
                'Durée totale': `${totalDuration.toFixed(2)}ms`
            });
        });
        
        const beforeReturnDuration = performance.now() - buttonClickStartTime;
        console.log('⏱️ [BOUTON] goToMatches - Retour de la fonction:', `${beforeReturnDuration.toFixed(2)}ms`);
    }

    goToEcartBo() {
        const buttonClickStartTime = performance.now();
        console.log('🟡 [BOUTON] goToEcartBo() - Clic détecté', `[${new Date().toISOString()}]`);
        
        const setActiveTabStartTime = performance.now();
        // Utiliser setActiveTab pour avoir le même comportement que les autres boutons
        // Cela garantit un comportement cohérent et une navigation immédiate
        this.setActiveTab('boOnly');
        const setActiveTabDuration = performance.now() - setActiveTabStartTime;
        console.log('⏱️ [BOUTON] goToEcartBo - setActiveTab terminé:', `${setActiveTabDuration.toFixed(2)}ms`);
        
        const navigateStartTime = performance.now();
        // Navigation immédiate - les données se chargeront en arrière-plan si nécessaire
        this.router.navigate(['/ecart-bo']).then(() => {
            const navigateDuration = performance.now() - navigateStartTime;
            const totalDuration = performance.now() - buttonClickStartTime;
            console.log('✅ [BOUTON] goToEcartBo - Navigation vers /ecart-bo réussie:', {
                'Durée navigation': `${navigateDuration.toFixed(2)}ms`,
                'Durée totale': `${totalDuration.toFixed(2)}ms`
            });
        }).catch(err => {
            const navigateDuration = performance.now() - navigateStartTime;
            const totalDuration = performance.now() - buttonClickStartTime;
            console.error('❌ [BOUTON] goToEcartBo - Erreur lors de la navigation vers /ecart-bo:', {
                'Erreur': err,
                'Durée navigation': `${navigateDuration.toFixed(2)}ms`,
                'Durée totale': `${totalDuration.toFixed(2)}ms`
            });
        });
        
        const beforeReturnDuration = performance.now() - buttonClickStartTime;
        console.log('⏱️ [BOUTON] goToEcartBo - Retour de la fonction:', `${beforeReturnDuration.toFixed(2)}ms`);
    }

    goToEcartPartner() {
        const buttonClickStartTime = performance.now();
        console.log('🟢 [BOUTON] goToEcartPartner() - Clic détecté', `[${new Date().toISOString()}]`);
        
        const setActiveTabStartTime = performance.now();
        // Utiliser setActiveTab pour avoir le même comportement que les autres boutons
        // Cela garantit un comportement cohérent et une navigation immédiate
        this.setActiveTab('partnerOnly');
        const setActiveTabDuration = performance.now() - setActiveTabStartTime;
        console.log('⏱️ [BOUTON] goToEcartPartner - setActiveTab terminé:', `${setActiveTabDuration.toFixed(2)}ms`);
        
        const navigateStartTime = performance.now();
        // Navigation immédiate - les données se chargeront en arrière-plan si nécessaire
        this.router.navigate(['/ecart-partner']).then(() => {
            const navigateDuration = performance.now() - navigateStartTime;
            const totalDuration = performance.now() - buttonClickStartTime;
            console.log('✅ [BOUTON] goToEcartPartner - Navigation vers /ecart-partner réussie:', {
                'Durée navigation': `${navigateDuration.toFixed(2)}ms`,
                'Durée totale': `${totalDuration.toFixed(2)}ms`
            });
        }).catch(err => {
            const navigateDuration = performance.now() - navigateStartTime;
            const totalDuration = performance.now() - buttonClickStartTime;
            console.error('❌ [BOUTON] goToEcartPartner - Erreur lors de la navigation vers /ecart-partner:', {
                'Erreur': err,
                'Durée navigation': `${navigateDuration.toFixed(2)}ms`,
                'Durée totale': `${totalDuration.toFixed(2)}ms`
            });
        });
        
        const beforeReturnDuration = performance.now() - buttonClickStartTime;
        console.log('⏱️ [BOUTON] goToEcartPartner - Retour de la fonction:', `${beforeReturnDuration.toFixed(2)}ms`);
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
                        // Corriger le nom de colonne mal encodé
                        const correctedKey = fixGarbledCharacters(key);
                        allColumns.add(correctedKey);
                    }
                });
            });
        }

        // Forcer l'inclusion de la colonne SOURCE pour identification d'origine
        allColumns.add('SOURCE');
        this.availableColumns = Array.from(allColumns).sort();
        
        // Initialiser toutes les colonnes comme non sélectionnées par défaut
        this.selectedColumns = {};
        this.availableColumns.forEach(col => {
            // Cocher par défaut les colonnes définies dans defaultColumns
            this.selectedColumns[col] = this.defaultColumns.includes(col);
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
            let selectedPartnerColumns = this.availableColumns.filter(col => this.selectedColumns[col]);
            // Forcer SOURCE en dernière position s'il est sélectionné
            if (selectedPartnerColumns.includes('SOURCE')) {
                selectedPartnerColumns = selectedPartnerColumns.filter(c => c !== 'SOURCE');
                selectedPartnerColumns.push('SOURCE');
            }
            
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
                                case 'SOURCE': value = partnerItem.SOURCE || 'PARTENAIRE'; break;
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
            // Forcer SOURCE en dernière position pour Excel également
            if (selectedPartnerColumns.includes('SOURCE')) {
                selectedPartnerColumns = selectedPartnerColumns.filter(c => c !== 'SOURCE');
                selectedPartnerColumns.push('SOURCE');
            }
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
            const partnerHeaders = partnerHeader ? partnerHeader.split(';') : [];

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
                                case 'SOURCE': value = partnerItem.SOURCE || 'PARTENAIRE'; break;
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
            // S'assurer que SOURCE est en dernière position aussi pour le fallback CSV
            let csvCols = [...selectedPartnerColumns];
            if (csvCols.includes('SOURCE')) {
                csvCols = csvCols.filter(c => c !== 'SOURCE');
                csvCols.push('SOURCE');
            }
            const csvContent = this.generateCsvContent(report, csvCols, boHeader, csvCols.join(';'));
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
                            case 'SOURCE': value = partnerItem.SOURCE || 'PARTENAIRE'; break;
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

    // === Création OP depuis ECART Partenaire ===
    isPartnerRecordEligible(record: Record<string, string>): boolean {
        const rawType = this.getFromRecord(record, ['Type Opération', 'typeOperation', 'type_operation']);
        const t = this.normalizeType(rawType);
        return ['compens','appro','nivel','regularis'].some(p => t.includes(p));
    }

    async createOperationFromPartnerRecord(record: Record<string, string>) {
        try {
            const rawType = this.getFromRecord(record, ['Type Opération', 'typeOperation', 'type_operation']);
            const normalized = this.normalizeType(rawType);
            const typeOperation = normalized.includes('compens') ? 'Compense_client'
                                  : normalized.includes('appro') ? 'Appro_client'
                                  : normalized.includes('nivel') ? 'nivellement'
                                  : normalized.includes('regularis') ? 'régularisation_solde'
                                  : rawType || 'ajustement';

            const { agency } = this.getPartnerOnlyAgencyAndService(record);
            const codeProprietaire = (this.getFromRecord(record, ['Agence','agency','Code propriétaire','Code proprietaire','codeProprietaire','code_proprietaire']) || agency || '').trim();
            if (!codeProprietaire) {
                await this.popupService.showWarning('Code propriétaire introuvable pour cette ligne');
                return;
            }

            // Nettoyer les séparateurs de milliers pour éviter d'obtenir 200 au lieu de 200000000
            const rawAmountStr = this.getFromRecord(record, ['Montant','montant','amount']) || String(this.getPartnerOnlyVolume(record) || '0');
            const normalizedAmount = parseFloat(String(rawAmountStr).replace(/[,\s]/g, '')) || 0;
            const montant = Math.abs(normalizedAmount);
            const rawDate = this.getFromRecord(record, ['Date opération','Date','dateOperation','date_operation','DATE']);
            const defaultDateCandidate = this.selectedPartnerImportOpDate
                || this.extractIsoDay(rawDate)
                || this.extractIsoDay(this.getPartnerOnlyDate(record))
                || this.toIsoLocalDate(new Date().toISOString());

            const dateInput = await this.popupService.showDateInput(
                'Sélectionnez la date d\'opération pour cette création Import OP.',
                'Créer OP - Date d\'opération',
                defaultDateCandidate
            );

            if (dateInput === null) {
                await this.popupService.showInfo('Création de l\'opération annulée.');
                return;
            }

            const normalizedDate = this.toIsoLocalDate(dateInput || defaultDateCandidate);
            if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
                await this.popupService.showWarning('Date d\'opération invalide. Création annulée.');
                return;
            }

            this.selectedPartnerImportOpDate = normalizedDate;
            const nomBordereau = this.getFromRecord(record, ['Numéro Trans GU','Numero Trans GU','numeroTransGU','numero_trans_gu']);

            const banqueInput = await this.popupService.showTextInput('Banque (code propriétaire) :', 'Créer OP', codeProprietaire, 'Ex: CIELCM0001');
            const banque = (banqueInput || '').trim();
            if (!banque) {
                await this.popupService.showWarning('Banque obligatoire');
                return;
            }

            // Demander le type de référence (Standard/Cross Border/Nivellement)
            console.log('🔧 Affichage du popup de sélection du type de référence...');
            const referenceTypeInput = await this.popupService.showSelectInput(
                'Type de référence :', 
                'Sélectionner le type', 
                ['STANDARD', 'CROSS_BORDER', 'NIVELLEMENT'], 
                'STANDARD'
            );
            const referenceType = referenceTypeInput || 'STANDARD';
            console.log('✅ Type de référence sélectionné:', referenceType);

            // Si NIVELLEMENT est sélectionné, forcer le type d'opération à "nivellement"
            let finalTypeOperation = typeOperation;
            if (referenceType === 'NIVELLEMENT') {
                finalTypeOperation = 'nivellement';
                console.log('🔄 Type d\'opération changé vers "nivellement" pour utiliser la logique de nivellement');
            }

            const comptes = await this.compteService.getComptesByCodeProprietaire(codeProprietaire).toPromise();
            if (!comptes || !comptes.length) {
                await this.popupService.showError(`Aucun compte trouvé pour le code propriétaire: ${codeProprietaire}`);
                return;
            }
            const compteId = comptes[0].id!;

            // Vérification de doublon temporairement désactivée pour éviter les erreurs 400
            /*
            try {
                const day = this.extractIsoDay(dateStr) || this.toIsoLocalDate(dateStr);
                const dateDebut = `${day} 00:00:00`;
                const dateFin = `${day} 23:59:59`;
                const existing = await this.operationService.getOperationsByCompte(codeProprietaire, dateDebut, dateFin, typeOperation).toPromise();
                const hasDuplicate = (existing || []).some(op => (op.nomBordereau || '') === (nomBordereau || ''));
                if (hasDuplicate) {
                    await this.popupService.showWarning('Cette opération existe déjà (doublon détecté)');
                    return;
                }
            } catch (e) {
                console.warn('Vérification de doublon échouée, poursuite prudente', e);
            }
            */

            const payload: OperationCreateRequest = {
                compteId,
                typeOperation: finalTypeOperation,
                montant,
                banque,
                nomBordereau: nomBordereau || undefined,
                dateOperation: normalizedDate,
                referenceType: referenceType
            };

            await new Promise<void>((resolve, reject) => {
                this.operationService.createOperation(payload).subscribe({
                    next: async () => { await this.popupService.showSuccess('Opération créée'); resolve(); },
                    error: async (err) => { console.error(err); await this.popupService.showError("Échec de création de l'opération"); reject(err); }
                });
            });
        } catch (e) {
            console.error(e);
            await this.popupService.showError('Erreur lors de la création de l\'opération');
        }
    }

    private extractIsoDay(input: string): string {
        const s = String(input || '').trim();
        if (!s) return '';
        let m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (m) return `${m[1]}-${m[2]}-${m[3]}`;
        m = s.match(/(\d{2})-(\d{2})-(\d{4})/);
        if (m) return `${m[3]}-${m[2]}-${m[1]}`;
        m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (m) return `${m[3]}-${m[2]}-${m[1]}`;
        m = s.match(/(\d{4})\/(\d{2})\/(\d{2})/);
        if (m) return `${m[1]}-${m[2]}-${m[3]}`;
        return '';
    }

    private getFromRecord(record: Record<string, string>, keys: string[]): string {
        for (const k of keys) {
            const v = record[k];
            if (v !== undefined && v !== null && String(v).trim() !== '') return String(v);
        }
        return '';
    }

    private normalizeType(input: string): string {
        return (input || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    private toIsoLocalDate(input: string): string {
        try {
            const d = new Date(input);
            if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
        } catch {}
        return input;
    }

    private makeIsoDateTime(datePart: string): string {
        try {
            if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
                return new Date(`${datePart}T00:00:00`).toISOString();
            }
        } catch {}
        return new Date().toISOString();
    }

    private formatCurrency(amount: number): string {
        return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 2 }).format(amount || 0);
    }
} 
