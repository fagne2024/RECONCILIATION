import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AppStateService } from '../../services/app-state.service';
import { ReconciliationTabsService } from '../../services/reconciliation-tabs.service';
import { ReconciliationService } from '../../services/reconciliation.service';
import { PopupService } from '../../services/popup.service';
import { AutoProcessingService } from '../../services/auto-processing.service';
import { Subscription } from 'rxjs';
import * as Papa from 'papaparse';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-reconciliation-launcher',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="reconciliation-launcher-page">
      <nav class="topnav">
        <div class="nav-brand">
          <div class="nav-brand-dot"></div>
          ReconciliApp
        </div>
        <div class="nav-sep"></div>
        <div class="nav-path">
          <strong>Lanceur de Réconciliation</strong>
        </div>
        <div class="nav-spacer"></div>
      </nav>

      <div class="page-header-launcher">
        <div class="ph-left">
          <div class="ph-eyebrow"><span></span>Réconciliation</div>
          <h1 class="ph-title-launcher">Réconciliation de <em>Données</em></h1>
        </div>
      </div>

      <div class="main">
        <div class="reconciliation-launcher-container">
          <div class="header">
            <h2>🔄 Réconciliation de Données</h2>
            <p class="description">Choisissez votre mode de réconciliation préféré</p>
          </div>

      <!-- Options de réconciliation -->
      <div class="reconciliation-options">
        <h3>🎯 Choisissez votre mode de réconciliation</h3>
        
        <div class="options-grid">
          <!-- Option 1: Manuel -->
          <div class="option-card" 
               [class.selected]="selectedMode === 'manual'"
               (click)="$event.stopPropagation()">
            <div class="option-header">
              <i class="fas fa-hand-paper"></i>
              <h4>Mode Manuel</h4>
            </div>
            <div class="option-description">
              <p>Vous sélectionnez manuellement les colonnes clés et les colonnes à comparer.</p>
              <ul>
                <li>Contrôle total sur la configuration</li>
                <li>Idéal pour des réconciliations spécifiques</li>
                <li>Configuration étape par étape</li>
              </ul>
            </div>
            <button class="select-option-btn" 
                    [class.active]="selectedMode === 'manual'"
                    (click)="selectMode('manual')">
              Choisir ce mode
            </button>
          </div>

          <!-- Option 2: Assisté -->
          <div class="option-card" [class.selected]="selectedMode === 'assisted'">
            <div class="option-header">
              <i class="fas fa-magic"></i>
              <h4>Mode Assisté</h4>
            </div>
            <div class="option-description">
              <p>Uploadez vos fichiers BO et Partenaire : le système applique les patterns des modèles de traitement et lance la réconciliation automatiquement.</p>
              <ul>
                <li>Reconnaissance des modèles et lancement auto de la réconciliation</li>
                <li>Bouton « Traitement de fichier » si les fichiers ne sont pas encore normalisés</li>
                <li>Formatage, upload automatique puis réconciliation</li>
              </ul>
            </div>
            <button class="select-option-btn" 
                    [class.active]="selectedMode === 'assisted'"
                    (click)="selectMode('assisted')">
              Choisir ce mode
            </button>
          </div>

          <!-- Option 3: Magique -->
          <div class="option-card" [class.selected]="selectedMode === 'magic'">
            <div class="option-header">
              <i class="fas fa-wand-magic-sparkles"></i>
              <h4>Mode Magique</h4>
            </div>
            <div class="option-description">
              <p>Réconciliation en un clic ! Le système trouve automatiquement les meilleures clés et lance la réconciliation.</p>
              <ul>
                <li>Configuration automatique</li>
                <li>Lancement immédiat</li>
                <li>Résultats rapides</li>
              </ul>
            </div>
            <button class="select-option-btn magic-btn" 
                    (click)="selectMode('magic')">
              🚀 Lancer la Réconciliation Magique
            </button>
          </div>
        </div>
      </div>

      <!-- Bouton de progression -->
      <div class="proceed-section" *ngIf="selectedMode && selectedMode !== 'magic'">
        <button class="proceed-btn" 
                [disabled]="!selectedMode"
                (click)="proceedWithSelectedMode()">
          <i class="fas fa-arrow-right"></i>
          Continuer avec le mode {{ getModeDisplayName(selectedMode) }}
        </button>
      </div>

      <!-- Bouton de réinitialisation -->
      <div class="reset-section">
        <button class="reset-btn" 
                [disabled]="!hasDataToReset"
                (click)="resetData()"
                title="Réinitialiser le mode sélectionné et les données en mémoire">
          <i class="fas fa-trash-alt"></i>
          Réinitialiser les données
        </button>
      </div>

      <!-- Popup : sélection des agences (BO TRXBO - étape 1) -->
      <div class="selection-overlay" *ngIf="showAgencySelection">
        <div class="selection-modal">
          <div class="selection-header">
            <span class="badge-text">Agences disponibles (BO) : {{ availableAgencies.length }}</span>
          </div>
          <div class="selection-content">
            <div class="search-wrap">
              <input type="text" class="search-input" placeholder="Rechercher une agence..." [(ngModel)]="agencySearchFilter">
            </div>
            <div class="selection-controls">
              <button class="sel-btn" (click)="selectAllAgencies()">Tout sélectionner</button>
              <button class="sel-btn" (click)="deselectAllAgencies()">Tout désélectionner</button>
            </div>
            <div class="selection-grid">
              <div class="sel-card" *ngFor="let agency of filteredAvailableAgencies">
                <input type="checkbox" [id]="'lnc-agency-'+agency" [checked]="selectedAgencies.includes(agency)" (change)="onAgencySelectionChange($event, agency)">
                <label [for]="'lnc-agency-'+agency">{{ agency }} <span class="count">({{ getAgencyCount(agency) }})</span></label>
              </div>
            </div>
          </div>
          <div class="selection-actions">
            <button class="btn-cancel" (click)="cancelAgencySelection()">Annuler</button>
            <button class="btn-confirm" [disabled]="selectedAgencies.length === 0" (click)="confirmAgencySelection()">Confirmer</button>
          </div>
        </div>
      </div>

      <!-- Popup : sélection des services BO (étape 2 - mode auto) -->
      <div class="selection-overlay" *ngIf="showServiceSelection">
        <div class="selection-modal">
          <div class="selection-header">
            <span class="badge-text">Services disponibles (BO) : {{ availableServices.length }}</span>
          </div>
          <div class="selection-content">
            <div class="search-wrap">
              <input type="text" class="search-input" placeholder="Rechercher un service..." [(ngModel)]="serviceSearchFilter">
            </div>
            <div class="selection-controls">
              <button class="sel-btn" (click)="selectAllServices()">Tout sélectionner</button>
              <button class="sel-btn" (click)="deselectAllServices()">Tout désélectionner</button>
            </div>
            <div class="selection-grid">
              <div class="sel-card" *ngFor="let service of filteredAvailableServices">
                <input type="checkbox" [id]="'lnc-svc-'+service" [checked]="selectedServices.includes(service)" (change)="onServiceSelectionChange($event, service)">
                <label [for]="'lnc-svc-'+service">{{ service }} <span class="count">({{ getServiceCount(service) }})</span></label>
              </div>
            </div>
          </div>
          <div class="selection-actions">
            <button class="btn-cancel" (click)="cancelServiceSelection()">Annuler</button>
            <button class="btn-confirm" [disabled]="selectedServices.length === 0" (click)="confirmServiceSelection()">Confirmer</button>
          </div>
        </div>
      </div>

      <!-- Popup : sélection des services BO (étape 2 - mode manuel) -->
      <div class="selection-overlay" *ngIf="showManualServiceSelection">
        <div class="selection-modal">
          <div class="selection-header">
            <span class="badge-text">Services disponibles (BO) : {{ manualAvailableServices.length }}</span>
          </div>
          <div class="selection-content">
            <div class="search-wrap">
              <input type="text" class="search-input" placeholder="Rechercher un service..." [(ngModel)]="manualServiceSearchFilter">
            </div>
            <div class="selection-controls">
              <button class="sel-btn" (click)="selectAllManualServices()">Tout sélectionner</button>
              <button class="sel-btn" (click)="deselectAllManualServices()">Tout désélectionner</button>
            </div>
            <div class="selection-grid">
              <div class="sel-card" *ngFor="let service of filteredManualAvailableServices">
                <input type="checkbox" [id]="'lnc-msvc-'+service" [checked]="manualSelectedServices.includes(service)" (change)="onManualServiceSelectionChange($event, service)">
                <label [for]="'lnc-msvc-'+service">{{ service }} <span class="count">({{ getManualServiceCount(service) }})</span></label>
              </div>
            </div>
          </div>
          <div class="selection-actions">
            <button class="btn-cancel" (click)="cancelManualServiceSelection()">Annuler</button>
            <button class="btn-confirm" [disabled]="manualSelectedServices.length === 0" (click)="confirmManualServiceSelection()">Confirmer</button>
          </div>
        </div>
      </div>

      <!-- Popup : sélection des statuts BO (étape 3 - mode manuel) -->
      <div class="selection-overlay" *ngIf="showManualStatusSelection">
        <div class="selection-modal">
          <div class="selection-header">
            <span class="badge-text">Statuts disponibles (BO) : {{ manualAvailableStatuses.length }}</span>
          </div>
          <div class="selection-content">
            <div class="search-wrap">
              <input type="text" class="search-input" placeholder="Rechercher un statut..." [(ngModel)]="manualStatusSearchFilter">
            </div>
            <div class="selection-controls">
              <button class="sel-btn" (click)="selectAllManualStatuses()">Tout sélectionner</button>
              <button class="sel-btn" (click)="deselectAllManualStatuses()">Tout désélectionner</button>
            </div>
            <div class="selection-grid">
              <div class="sel-card" *ngFor="let status of filteredManualAvailableStatuses">
                <input type="checkbox" [id]="'lnc-st-'+status" [checked]="manualSelectedStatuses.includes(status)" (change)="onManualStatusSelectionChange($event, status)">
                <label [for]="'lnc-st-'+status">{{ status }} <span class="count">({{ getManualStatusCount(status) }})</span></label>
              </div>
            </div>
          </div>
          <div class="selection-actions">
            <button class="btn-cancel" (click)="cancelManualStatusSelection()">← Retour</button>
            <button class="btn-confirm" [disabled]="manualSelectedStatuses.length === 0" (click)="confirmManualStatusSelection()">Confirmer</button>
          </div>
        </div>
      </div>

      <!-- Popup : sélection des services Partenaire (étape 1) -->
      <div class="selection-overlay" *ngIf="showPartnerServiceSelection">
        <div class="selection-modal">
          <div class="selection-header">
            <span class="badge-text">Services disponibles (Partenaire) : {{ partnerAvailableServices.length }}</span>
          </div>
          <div class="selection-content">
            <div class="search-wrap">
              <input type="text" class="search-input" placeholder="Rechercher un service..." [(ngModel)]="partnerServiceSearchFilter">
            </div>
            <div class="selection-controls">
              <button class="sel-btn" (click)="selectAllPartnerServices()">Tout sélectionner</button>
              <button class="sel-btn" (click)="deselectAllPartnerServices()">Tout désélectionner</button>
            </div>
            <div class="selection-grid">
              <div class="sel-card" *ngFor="let service of filteredPartnerAvailableServices">
                <input type="checkbox" [id]="'lnc-psvc-'+service" [checked]="partnerSelectedServices.includes(service)" (change)="onPartnerServiceSelectionChange($event, service)">
                <label [for]="'lnc-psvc-'+service">{{ service }} <span class="count">({{ getPartnerServiceCount(service) }})</span></label>
              </div>
            </div>
          </div>
          <div class="selection-actions">
            <button class="btn-cancel" (click)="cancelPartnerServiceSelection()">Annuler</button>
            <button class="btn-confirm" [disabled]="partnerSelectedServices.length === 0" (click)="confirmPartnerServiceSelection()">Confirmer</button>
          </div>
        </div>
      </div>

      <!-- Popup : sélection des statuts Partenaire (étape 2) -->
      <div class="selection-overlay" *ngIf="showPartnerStatusSelection">
        <div class="selection-modal">
          <div class="selection-header">
            <span class="badge-text">Statuts disponibles (Partenaire) : {{ partnerAvailableStatuses.length }}</span>
          </div>
          <div class="selection-content">
            <div class="search-wrap">
              <input type="text" class="search-input" placeholder="Rechercher un statut..." [(ngModel)]="partnerStatusSearchFilter">
            </div>
            <div class="selection-controls">
              <button class="sel-btn" (click)="selectAllPartnerStatuses()">Tout sélectionner</button>
              <button class="sel-btn" (click)="deselectAllPartnerStatuses()">Tout désélectionner</button>
            </div>
            <div class="selection-grid">
              <div class="sel-card" *ngFor="let status of filteredPartnerAvailableStatuses">
                <input type="checkbox" [id]="'lnc-pst-'+status" [checked]="partnerSelectedStatuses.includes(status)" (change)="onPartnerStatusSelectionChange($event, status)">
                <label [for]="'lnc-pst-'+status">{{ status }} <span class="count">({{ getPartnerStatusCount(status) }})</span></label>
              </div>
            </div>
          </div>
          <div class="selection-actions">
            <button class="btn-cancel" (click)="cancelPartnerStatusSelection()">← Retour</button>
            <button class="btn-confirm" [disabled]="partnerSelectedStatuses.length === 0" (click)="confirmPartnerStatusSelection()">Confirmer</button>
          </div>
        </div>
      </div>

      <!-- Popup : sélection des paiements Partenaire (étape 3) -->
      <div class="selection-overlay" *ngIf="showPartnerPaymentSelection">
        <div class="selection-modal">
          <div class="selection-header">
            <span class="badge-text">Paiements disponibles (Partenaire) : {{ partnerAvailablePayments.length }}</span>
          </div>
          <div class="selection-content">
            <div class="search-wrap">
              <input type="text" class="search-input" placeholder="Rechercher un paiement..." [(ngModel)]="partnerPaymentSearchFilter">
            </div>
            <div class="selection-controls">
              <button class="sel-btn" (click)="selectAllPartnerPayments()">Tout sélectionner</button>
              <button class="sel-btn" (click)="deselectAllPartnerPayments()">Tout désélectionner</button>
            </div>
            <div class="selection-grid">
              <div class="sel-card" *ngFor="let payment of filteredPartnerAvailablePayments">
                <input type="checkbox" [id]="'lnc-pay-'+payment" [checked]="partnerSelectedPayments.includes(payment)" (change)="onPartnerPaymentSelectionChange($event, payment)">
                <label [for]="'lnc-pay-'+payment">{{ payment }} <span class="count">({{ getPartnerPaymentCount(payment) }})</span></label>
              </div>
            </div>
          </div>
          <div class="selection-actions">
            <button class="btn-cancel" (click)="cancelPartnerPaymentSelection()">← Retour</button>
            <button class="btn-confirm" [disabled]="partnerSelectedPayments.length === 0" (click)="confirmPartnerPaymentSelection()">Confirmer</button>
          </div>
        </div>
      </div>

        </div>
      </div>
    </div>
  `,
  styleUrls: ['./reconciliation-launcher.component.scss']
})
export class ReconciliationLauncherComponent implements OnInit, OnDestroy {
  boFile: File | null = null;
  partnerFile: File | null = null;
  selectedMode: 'manual' | 'assisted' | 'magic' | null = 'manual';
  isLoading: boolean = false;

  // Données parsées
  boData: Record<string, string>[] = [];
  partnerData: Record<string, string>[] = [];

  // Sélection agences BO (étape 1)
  showAgencySelection = false;
  availableAgencies: string[] = [];
  selectedAgencies: string[] = [];
  agencySearchFilter = '';
  agencySelectionData: Record<string, string>[] = [];
  agencyColumn: string | null = null;

  // Sélection services BO auto (étape 2 auto)
  showServiceSelection = false;
  availableServices: string[] = [];
  selectedServices: string[] = [];
  serviceSearchFilter = '';
  serviceSelectionData: Record<string, string>[] = [];

  // Sélection services BO manuel (étape 2 manuel)
  showManualServiceSelection = false;
  manualAvailableServices: string[] = [];
  manualSelectedServices: string[] = [];
  manualServiceSearchFilter = '';
  manualServiceSelectionData: Record<string, string>[] = [];
  manualStatusColumn: string | null = null;

  // Sélection statuts BO manuel (étape 3 manuel)
  showManualStatusSelection = false;
  manualAvailableStatuses: string[] = [];
  manualSelectedStatuses: string[] = [];
  manualStatusSearchFilter = '';
  manualStatusSelectionData: Record<string, string>[] = [];

  // Sélection services Partenaire
  showPartnerServiceSelection = false;
  partnerAvailableServices: string[] = [];
  partnerSelectedServices: string[] = [];
  partnerServiceSearchFilter = '';
  partnerServiceSelectionData: Record<string, string>[] = [];
  partnerServiceColumn: string | null = null;
  partnerStatusColumn: string | null = null;

  // Sélection statuts Partenaire
  showPartnerStatusSelection = false;
  partnerAvailableStatuses: string[] = [];
  partnerSelectedStatuses: string[] = [];
  partnerStatusSearchFilter = '';
  partnerStatusSelectionData: Record<string, string>[] = [];

  // Sélection paiements Partenaire
  showPartnerPaymentSelection = false;
  partnerAvailablePayments: string[] = [];
  partnerSelectedPayments: string[] = [];
  partnerPaymentSearchFilter = '';
  partnerPaymentSelectionData: Record<string, string>[] = [];
  partnerPaymentColumn: string | null = null;

  private subscriptions: Subscription[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private appStateService: AppStateService,
    private reconciliationTabsService: ReconciliationTabsService,
    private reconciliationService: ReconciliationService,
    private popupService: PopupService,
    private autoProcessingService: AutoProcessingService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.refreshFilesFromState();
    const mode = this.route.snapshot.queryParamMap.get('mode');
    if (mode === 'assisted' || mode === 'manual') {
      this.selectedMode = mode;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private refreshFilesFromState(): void {
    const existingFiles = this.appStateService.getUploadedFiles();
    this.boFile = existingFiles.boFile;
    this.partnerFile = existingFiles.partnerFile;
  }

  get canProceed(): boolean {
    return !!(this.boFile && this.partnerFile);
  }

  private ensureFilesOrRedirectToUpload(mode?: string): boolean {
    this.refreshFilesFromState();
    if (this.canProceed) {
      return true;
    }
    this.router.navigate(['/upload'], mode ? { queryParams: { mode } } : undefined);
    return false;
  }

  // Méthodes de gestion des fichiers (conservées pour compatibilité état / flux magique)
  selectBoFile(): void {
    const input = document.querySelector('#boFileInput') as HTMLInputElement;
    if (input) input.click();
  }

  selectPartnerFile(): void {
    const input = document.querySelector('#partnerFileInput') as HTMLInputElement;
    if (input) input.click();
  }

  onFileSelected(event: any, type: 'bo' | 'partner'): void {
    const file = event.target.files[0];
    if (file) {
      if (type === 'bo') {
        this.boFile = file;
        this.boData = [];
        this.clearBoSelections();
        this.parseFile(file, true);
      } else {
        this.partnerFile = file;
        this.partnerData = [];
        this.clearPartnerSelections();
        this.parseFile(file, false);
      }
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent, type: 'bo' | 'partner'): void {
    event.preventDefault();
    event.stopPropagation();
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (type === 'bo') {
        this.boFile = file;
        this.boData = [];
        this.clearBoSelections();
        this.parseFile(file, true);
      } else {
        this.partnerFile = file;
        this.partnerData = [];
        this.clearPartnerSelections();
        this.parseFile(file, false);
      }
    }
  }

  removeFile(type: 'bo' | 'partner'): void {
    if (type === 'bo') {
      this.boFile = null;
      this.boData = [];
      this.clearBoSelections();
    } else {
      this.partnerFile = null;
      this.partnerData = [];
      this.clearPartnerSelections();
    }
  }

  private clearBoSelections(): void {
    this.showAgencySelection = false;
    this.showServiceSelection = false;
    this.showManualServiceSelection = false;
    this.showManualStatusSelection = false;
    this.availableAgencies = [];
    this.selectedAgencies = [];
    this.agencySelectionData = [];
    this.agencyColumn = null;
    this.availableServices = [];
    this.selectedServices = [];
    this.serviceSelectionData = [];
    this.manualAvailableServices = [];
    this.manualSelectedServices = [];
    this.manualServiceSelectionData = [];
    this.manualStatusColumn = null;
    this.manualAvailableStatuses = [];
    this.manualSelectedStatuses = [];
    this.manualStatusSelectionData = [];
  }

  private clearPartnerSelections(): void {
    this.showPartnerServiceSelection = false;
    this.showPartnerStatusSelection = false;
    this.showPartnerPaymentSelection = false;
    this.partnerAvailableServices = [];
    this.partnerSelectedServices = [];
    this.partnerServiceSelectionData = [];
    this.partnerServiceColumn = null;
    this.partnerStatusColumn = null;
    this.partnerAvailableStatuses = [];
    this.partnerSelectedStatuses = [];
    this.partnerStatusSelectionData = [];
    this.partnerAvailablePayments = [];
    this.partnerSelectedPayments = [];
    this.partnerPaymentSelectionData = [];
    this.partnerPaymentColumn = null;
  }

  // Méthodes de sélection du mode
  selectMode(mode: 'manual' | 'assisted' | 'magic'): void {
    console.log('🎯 Mode sélectionné:', mode);
    this.selectedMode = mode;

    if (mode === 'magic') {
      if (!this.ensureFilesOrRedirectToUpload('magic')) {
        return;
      }
      this.launchMagicReconciliation();
    }
  }

  getModeDisplayName(mode: string): string {
    const names = {
      'manual': 'Manuel',
      'assisted': 'Assisté',
      'magic': 'Magique'
    };
    return names[mode as keyof typeof names] || mode;
  }

  // Méthodes de progression
  proceedWithSelectedMode(): void {
    if (!this.selectedMode) return;

    if (this.selectedMode === 'manual') {
      this.router.navigate(['/column-selection'], { queryParams: { mode: 'manual' } });
      return;
    }

    if (this.selectedMode === 'assisted') {
      this.router.navigate(['/upload-assisted']);
      return;
    }
  }

  // Méthode pour la réconciliation magique
  private async launchMagicReconciliation(): Promise<void> {
    if (!this.ensureFilesOrRedirectToUpload('magic')) {
      return;
    }

    this.isLoading = true;

    console.log('🚀 Lancement de la réconciliation magique (flux robuste)...');

    // Sauvegarder les fichiers dans l'état
    this.appStateService.setUploadedFiles({
      boFile: this.boFile!,
      partnerFile: this.partnerFile!
    });

    // Récupérer les modèles et leurs règles de traitement
    console.log('🔍 Récupération des modèles et règles de traitement...');
    let columnProcessingRules: any[] = [];
    
    try {
      const models = await this.autoProcessingService.getAllModels('Réconciliation');
      
      // Trouver les modèles correspondants aux fichiers
      const boModel = models.find(m => 
        m.fileType === 'bo' && 
        this.matchesFilePattern(this.boFile?.name || '', m.filePattern)
      );
      
      const partnerModel = models.find(m => 
        m.fileType === 'partner' && 
        this.matchesFilePattern(this.partnerFile?.name || '', m.filePattern)
      );
      
      console.log('📋 Modèle BO trouvé:', boModel?.name);
      console.log('📋 Modèle Partenaire trouvé:', partnerModel?.name);
      
      // Récupérer les règles de traitement
      if (boModel?.modelId) {
        try {
          const boRules = await this.autoProcessingService.getColumnProcessingRules(boModel.modelId, 'Réconciliation');
          console.log('🔧 Règles BO récupérées:', boRules.length);
          columnProcessingRules.push(...boRules);
        } catch (error) {
          console.warn('⚠️ Erreur lors de la récupération des règles BO:', error);
        }
      }
      
      if (partnerModel?.modelId) {
        try {
          const partnerRules = await this.autoProcessingService.getColumnProcessingRules(partnerModel.modelId, 'Réconciliation');
          console.log('🔧 Règles Partenaire récupérées:', partnerRules.length);
          columnProcessingRules.push(...partnerRules);
        } catch (error) {
          console.warn('⚠️ Erreur lors de la récupération des règles Partenaire:', error);
        }
      }
      
      console.log(`✅ ${columnProcessingRules.length} règles de traitement prêtes à appliquer`);
      if (columnProcessingRules.length > 0) {
        console.log('📋 Règles de traitement à appliquer:');
        columnProcessingRules.forEach((rule, index) => {
          console.log(`  ${index + 1}. Colonne: ${rule.sourceColumn}`);
          console.log(`     - Supprimer caractères spéciaux: ${rule.removeSpecialChars}`);
          console.log(`     - Nettoyer espaces: ${rule.trimSpaces}`);
          console.log(`     - Majuscules: ${rule.toUpperCase}`);
          console.log(`     - Minuscules: ${rule.toLowerCase}`);
          console.log(`     - Supprimer accents: ${rule.removeAccents}`);
        });
      }
    } catch (error) {
      console.warn('⚠️ Erreur lors de la récupération des modèles:', error);
      // Fallback: règles par défaut
      columnProcessingRules = [
        {
          sourceColumn: 'Numéro Trans GU',
          removeSpecialChars: true,
          trimSpaces: true,
          toUpperCase: false,
          toLowerCase: false,
          removeAccents: false
        }
      ];
    }

    // Créer un FormData avec les fichiers
    const formData = new FormData();
    formData.append('boFile', this.boFile!);
    formData.append('partnerFile', this.partnerFile!);

    try {
      // Étape 1: Analyse des clés de réconciliation
      console.log('🔍 Étape 1: Analyse des clés de réconciliation...');
      const analysisResponse = await this.reconciliationService.analyzeReconciliationKeys(formData).toPromise();
      
      if (!analysisResponse || !analysisResponse.suggestions || analysisResponse.suggestions.length === 0) {
        throw new Error('Aucune suggestion de clé trouvée lors de l\'analyse');
      }
      
             // Vérifier d'abord si la colonne CLE existe dans les deux fichiers (meilleure option connue)
       const hasCLE = analysisResponse.suggestions.some(suggestion => 
         suggestion.boColumn === 'CLE' || suggestion.partnerColumn === 'CLE'
       );
       
       console.log(`🔍 Vérification de la clé CLE: ${hasCLE ? 'Trouvée' : 'Non trouvée dans les suggestions'}`);
       
       // Prendre la meilleure suggestion basée sur le score de confiance
       const bestSuggestion = analysisResponse.suggestions.reduce((best, current) => 
         (current.confidence || current.confidenceScore || 0) > (best.confidence || best.confidenceScore || 0) ? current : best
       );
      
             console.log('🎯 Meilleure suggestion trouvée:', bestSuggestion);
       console.log('📊 Toutes les suggestions d\'analyse:', analysisResponse.suggestions);
       console.log('📊 Réponse complète du backend:', analysisResponse);
       console.log('📊 Nombre total de suggestions:', analysisResponse.suggestions?.length);
       
              // Afficher toutes les suggestions avec leurs scores
       if (analysisResponse.suggestions) {
         analysisResponse.suggestions.forEach((suggestion, index) => {
           console.log(`📊 Suggestion ${index + 1}:`, {
             boColumn: suggestion.boColumn,
             partnerColumn: suggestion.partnerColumn,
             confidence: suggestion.confidence || suggestion.confidenceScore,
             isCLE: suggestion.boColumn === 'CLE' || suggestion.partnerColumn === 'CLE'
           });
         });
       }
       
       // Étape 2: Décision intelligente basée sur les meilleures pratiques
       const confidence = bestSuggestion.confidence || bestSuggestion.confidenceScore || 0;
       console.log(`🎯 Meilleure clé détectée: ${bestSuggestion.boColumn} ↔ ${bestSuggestion.partnerColumn} (confiance: ${(confidence * 100).toFixed(1)}%)`);
       
       // Vérifier s'il y a une transformation disponible pour améliorer la correspondance
       let finalBoKey = bestSuggestion.boColumn;
       let finalPartnerKey = bestSuggestion.partnerColumn;
       let transformationToApply = bestSuggestion.transformation;
       
       console.log(`🔍 Transformation disponible:`, transformationToApply ? transformationToApply.description : 'Aucune');
       
       // Si CLE n'est pas dans les suggestions mais qu'on sait qu'elle existe, l'utiliser
       if (!hasCLE && confidence < 0.85) {
         console.log('⚠️ Confiance modérée et CLE non détectée - vérification des en-têtes de fichiers...');
         
         // Vérifier si CLE existe dans les deux fichiers en lisant les en-têtes
         const boHeaders = await this.getFileHeaders(this.boFile!);
         const partnerHeaders = await this.getFileHeaders(this.partnerFile!);
         
         if (boHeaders.includes('CLE') && partnerHeaders.includes('CLE')) {
           console.log('✅ CLE trouvée dans les deux fichiers - utilisation prioritaire');
           finalBoKey = 'CLE';
           finalPartnerKey = 'CLE';
           transformationToApply = null; // Pas de transformation pour CLE
         } else {
           console.log('❌ CLE non trouvée dans les fichiers');
         }
       }
       
       // Test intelligent avec différents formats pour améliorer la correspondance
       // Toujours essayer d'améliorer, même avec une confiance élevée
       console.log('🔍 Test de formatage intelligent pour améliorer la correspondance...');
       const bestFormattedMatch = await this.testFormattingForBetterMatch(
         this.boFile!,
         this.partnerFile!,
         finalBoKey,
         finalPartnerKey,
         bestSuggestion
       );
       
       if (bestFormattedMatch) {
         console.log('✅ Meilleur match trouvé avec formatage:', bestFormattedMatch);
         finalBoKey = bestFormattedMatch.boKey;
         finalPartnerKey = bestFormattedMatch.partnerKey;
         transformationToApply = bestFormattedMatch.transformation;
       }
       
       // Logique stricte : besoin d'une confiance >70% pour la réconciliation
       if (confidence < 0.70) {
         console.log('🔍 Confiance insuffisante (<70%), tentative d\'amélioration agressive...');
         console.log('🚨 APPEL DE findImprovedMatch - Test spécifique IDTransaction ↔ Id');
         
         // Essayer d'autres stratégies de correspondance
         const improvedMatch = await this.findImprovedMatch(analysisResponse.suggestions);
         
         if (improvedMatch && improvedMatch.confidence >= 0.70) {
           console.log('✅ Correspondance améliorée trouvée avec confiance suffisante:', improvedMatch);
           finalBoKey = improvedMatch.boKey;
           finalPartnerKey = improvedMatch.partnerKey;
           transformationToApply = improvedMatch.transformation;
         } else {
           console.warn('⚠️ Aucune amélioration suffisante trouvée (confiance <70%)');
           this.popupService.showWarning(`Échec de la détection automatique : Confiance insuffisante (${(confidence * 100).toFixed(1)}%). Une confiance >70% est requise. Veuillez utiliser le Mode Assisté pour choisir les clés manuellement.`);
           this.isLoading = false;
           return;
         }
       }
       
       console.log(`✅ Utilisation de la clé: ${finalBoKey} ↔ ${finalPartnerKey}`);
       
       // Créer la configuration de réconciliation
       const config: any = {
         boFile: this.boFile,
         partnerFile: this.partnerFile,
         boReconciliationKey: finalBoKey,
         partnerReconciliationKey: finalPartnerKey,
         additionalKeys: [],
         tolerance: 0.01,
         transformation: transformationToApply
       };
        
               console.log('⚙️ Configuration créée:', config);
       
       // Appliquer la transformation si nécessaire avant la réconciliation
       if (transformationToApply) {
         console.log('🔧 Application de la transformation avant réconciliation...');
         console.log(`📋 Type de transformation: ${transformationToApply.type}`);
         console.log(`📋 Description: ${transformationToApply.description}`);
         
         const transformedData = await this.applyTransformationToFile(
           this.boFile!,
           finalBoKey,
           transformationToApply
         );
         config.boFileContent = transformedData;
         console.log('✅ Transformation appliquée aux données BO');
         
         // Afficher quelques exemples de transformation
         if (transformedData.length > 0) {
           const sampleOriginal = await this.readFileContent(this.boFile!);
           console.log('🔍 Exemples de transformations:');
           for (let i = 0; i < Math.min(3, transformedData.length); i++) {
             const original = sampleOriginal[i][finalBoKey];
             const transformed = transformedData[i][finalBoKey];
             console.log(`  "${original}" → "${transformed}"`);
           }
           
           // Afficher des statistiques de formatage
           if (transformationToApply && transformationToApply.type === 'format') {
             console.log(`📊 Formatage appliqué: ${transformationToApply.format}`);
             console.log(`🎯 Amélioration de correspondance détectée automatiquement`);
           }
         }
       }
       
       // Appliquer les règles de traitement des colonnes aux données
       console.log('🔧 Application des règles de traitement des colonnes...');
       let processedBoData = await this.readFileContent(this.boFile!);
       let processedPartnerData = await this.readFileContent(this.partnerFile!);
       
       if (columnProcessingRules.length > 0) {
         console.log('📋 Application des règles de traitement...');
         
         // Appliquer les règles aux données BO
         processedBoData = this.applyColumnProcessingRules(processedBoData, columnProcessingRules);
         console.log('✅ Règles appliquées aux données BO');
         
         // Appliquer les règles aux données Partenaire
         processedPartnerData = this.applyColumnProcessingRules(processedPartnerData, columnProcessingRules);
         console.log('✅ Règles appliquées aux données Partenaire');
         
         // Afficher quelques exemples de transformation
         console.log('🔍 Exemples de transformations appliquées:');
         const originalBoData = await this.readFileContent(this.boFile!);
         const originalPartnerData = await this.readFileContent(this.partnerFile!);
         
         for (let i = 0; i < Math.min(3, processedBoData.length); i++) {
           columnProcessingRules.forEach(rule => {
             const originalBoValue = originalBoData[i][rule.sourceColumn];
             const processedBoValue = processedBoData[i][rule.sourceColumn];
             const originalPartnerValue = originalPartnerData[i][rule.sourceColumn];
             const processedPartnerValue = processedPartnerData[i][rule.sourceColumn];
             
             if (originalBoValue !== processedBoValue) {
               console.log(`  BO "${originalBoValue}" → "${processedBoValue}"`);
             }
             if (originalPartnerValue !== processedPartnerValue) {
               console.log(`  Partner "${originalPartnerValue}" → "${processedPartnerValue}"`);
             }
           });
         }
       }
       
       // Lancer la réconciliation avec les données traitées
       let reconciliationResponse;
       console.log('🚀 Lancement de la réconciliation avec données traitées...');
       
       const reconciliationRequest = {
         boFileContent: processedBoData,
         partnerFileContent: processedPartnerData,
         boKeyColumn: finalBoKey,
         partnerKeyColumn: finalPartnerKey,
         comparisonColumns: [],
         additionalKeys: [],
         tolerance: 0.01
       };
       
       reconciliationResponse = await this.reconciliationService.reconcile(reconciliationRequest).toPromise();
         
         if (reconciliationResponse) {
           console.log('✅ Réconciliation terminée avec succès:', reconciliationResponse);
           this.reconciliationTabsService.clearAllData();
           // Stocker les résultats dans l'état et naviguer directement vers les résultats
           this.appStateService.setReconciliationResults(reconciliationResponse);
           this.router.navigate(['/results']);
        } else {
           throw new Error('Aucun résultat reçu lors de la réconciliation');
         }
       
     } catch (error) {
       console.error('❌ Erreur lors du démarrage du mode magique:', error);
       this.popupService.showError('Erreur lors du démarrage du mode magique: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
        this.isLoading = false;
      }
  }


   
   // Méthode pour lire les en-têtes d'un fichier
   private getFileHeaders(file: File): Promise<string[]> {
     return new Promise((resolve, reject) => {
       const reader = new FileReader();
       reader.onload = (e) => {
         try {
           const content = e.target?.result as string;
           const lines = content.split('\n');
           const firstLine = lines[0];
           
           // Détecter le séparateur
           let separator = ',';
           if (firstLine.includes(';')) {
             separator = ';';
           }
           
           const headers = firstLine.split(separator).map(h => h.trim().replace(/"/g, ''));
           resolve(headers);
         } catch (error) {
           reject(error);
         }
       };
       reader.onerror = reject;
       reader.readAsText(file);
     });
   }
   
   // Méthode pour lire le contenu d'un fichier
   private readFileContent(file: File): Promise<Record<string, string>[]> {
     return new Promise((resolve, reject) => {
       const reader = new FileReader();
       reader.onload = (e) => {
         try {
           const content = e.target?.result as string;
           const lines = content.split('\n');
           
           // Détecter le séparateur
           let separator = ',';
           if (lines[0].includes(';')) {
             separator = ';';
           }
           
           const headers = lines[0].split(separator).map(h => h.trim().replace(/"/g, ''));
           
           // Lire les données
           const data = lines.slice(1)
             .filter(line => line.trim())
             .map(line => {
               const values = line.split(separator);
               const row: Record<string, string> = {};
               
               headers.forEach((header, index) => {
                 row[header] = values[index] ? values[index].trim().replace(/"/g, '') : '';
               });
               
               return row;
             });
           
           resolve(data);
         } catch (error) {
           reject(error);
         }
       };
       reader.onerror = reject;
       reader.readAsText(file);
     });
   }
   
   // Méthode pour tester différents formats et trouver la meilleure correspondance
   private async testFormattingForBetterMatch(
     boFile: File,
     partnerFile: File,
     boKey: string,
     partnerKey: string,
     originalSuggestion: any
   ): Promise<{ boKey: string; partnerKey: string; transformation: any; confidence: number } | null> {
     console.log('🔧 Test de formatage intelligent...');
     
     // Lire les données originales
     const boData = await this.readFileContent(boFile);
     const partnerData = await this.readFileContent(partnerFile);
     
            // Formats à tester pour améliorer la correspondance
       const formattingTests = [
         { name: 'trimSpaces', transform: this.applyTrimSpaces },
         { name: 'toLowerCase', transform: this.applyToLowerCase },
         { name: 'toUpperCase', transform: this.applyToUpperCase },
         { name: 'removeSeparators', transform: this.applyRemoveSeparators },
         { name: 'cleanAmounts', transform: this.applyCleanAmounts },
         { name: 'normalizeNumbers', transform: this.applyNormalizeNumbers },
         { name: 'removeDashesAndCommas', transform: this.applyRemoveDashesAndCommas },
         { name: 'removeSuffix_CM', transform: this.applyRemoveSuffixCM },
         { name: 'removeSuffix_MTN', transform: this.applyRemoveSuffixMTN },
         { name: 'removeSuffix_OM', transform: this.applyRemoveSuffixOM },
         { name: 'removeSpaces', transform: this.applyRemoveSpaces },
         { name: 'removeSpecialChars', transform: this.applyRemoveSpecialChars },
         { name: 'normalizeDates', transform: this.applyNormalizeDates },
         { name: 'extractNumbers', transform: this.applyExtractNumbers },
         { name: 'removeCurrencySymbols', transform: this.applyRemoveCurrencySymbols }
       ];
     
     let bestMatch = {
       boKey,
       partnerKey,
       transformation: null,
       confidence: originalSuggestion.confidence || originalSuggestion.confidenceScore || 0
     };
     
     // Tester chaque format
     for (const test of formattingTests) {
       try {
         console.log(`🔍 Test du formatage: ${test.name}`);
         
         // Appliquer le formatage aux données BO
         const formattedBoData = test.transform(boData, boKey);
         
         // Calculer la correspondance après formatage
         const matchCount = this.calculateMatchCount(formattedBoData, partnerData, boKey, partnerKey);
         const confidence = matchCount / Math.max(boData.length, partnerData.length);
         
         console.log(`📊 Formatage ${test.name}: ${matchCount} correspondances (confiance: ${(confidence * 100).toFixed(1)}%)`);
         
         if (confidence > bestMatch.confidence) {
           bestMatch = {
             boKey,
             partnerKey,
             transformation: { type: 'format', format: test.name },
             confidence
           };
           console.log(`✅ Amélioration détectée avec ${test.name}!`);
         }
         
       } catch (error) {
         console.warn(`⚠️ Erreur lors du test ${test.name}:`, error);
       }
     }
     
     // Retourner la meilleure amélioration trouvée, même si elle est minime
     if (bestMatch.confidence > (originalSuggestion.confidence || originalSuggestion.confidenceScore || 0)) {
       console.log(`🎯 Amélioration de confiance: ${((bestMatch.confidence - (originalSuggestion.confidence || originalSuggestion.confidenceScore || 0)) * 100).toFixed(1)}%`);
       return bestMatch;
     }
     
     // Si aucune amélioration, retourner quand même le meilleur match trouvé
     if (bestMatch.confidence > 0.05) { // Seuil très bas pour accepter des correspondances faibles
       console.log(`⚠️ Aucune amélioration trouvée, mais utilisation du meilleur match disponible (confiance: ${(bestMatch.confidence * 100).toFixed(1)}%)`);
       return bestMatch;
     }
     
     return null;
   }
   
   // Méthodes de formatage
   private applyTrimSpaces(data: Record<string, string>[], columnName: string): Record<string, string>[] {
     return data.map(row => ({
       ...row,
       [columnName]: row[columnName] ? row[columnName].trim() : ''
     }));
   }
   
   private applyToLowerCase(data: Record<string, string>[], columnName: string): Record<string, string>[] {
     return data.map(row => ({
       ...row,
       [columnName]: row[columnName] ? row[columnName].toLowerCase() : ''
     }));
   }
   
   private applyToUpperCase(data: Record<string, string>[], columnName: string): Record<string, string>[] {
     return data.map(row => ({
       ...row,
       [columnName]: row[columnName] ? row[columnName].toUpperCase() : ''
     }));
   }
   
   private applyRemoveSeparators(data: Record<string, string>[], columnName: string): Record<string, string>[] {
     return data.map(row => ({
       ...row,
       [columnName]: row[columnName] ? row[columnName].replace(/[,;]/g, '') : ''
     }));
   }
   
   private applyCleanAmounts(data: Record<string, string>[], columnName: string): Record<string, string>[] {
     return data.map(row => {
       let value = row[columnName] || '';
       // Enlever les espaces
       value = value.replace(/\s/g, '');
       // Enlever ",00" ou ",0" à la fin
       value = value.replace(/[,]00?$/, '');
       return {
         ...row,
         [columnName]: value
       };
     });
   }
   
   private applyNormalizeNumbers(data: Record<string, string>[], columnName: string): Record<string, string>[] {
     return data.map(row => {
       let value = row[columnName] || '';
       // Supprimer les espaces et caractères spéciaux
       value = value.replace(/[^\d.,-]/g, '');
       // Remplacer les virgules par des points
       value = value.replace(',', '.');
       return {
         ...row,
         [columnName]: value
       };
     });
   }
   
   private applyRemoveDashesAndCommas(data: Record<string, string>[], columnName: string): Record<string, string>[] {
     return data.map(row => ({
       ...row,
       [columnName]: row[columnName] ? row[columnName].replace(/[-,_]/g, '') : ''
     }));
   }
   
   private applyRemoveSuffixCM(data: Record<string, string>[], columnName: string): Record<string, string>[] {
     return data.map(row => ({
       ...row,
       [columnName]: row[columnName] ? row[columnName].replace(/_CM$/, '') : ''
     }));
   }
   
   private applyRemoveSuffixMTN(data: Record<string, string>[], columnName: string): Record<string, string>[] {
     return data.map(row => ({
       ...row,
       [columnName]: row[columnName] ? row[columnName].replace(/_MTN$/, '') : ''
     }));
   }
   
   private applyRemoveSuffixOM(data: Record<string, string>[], columnName: string): Record<string, string>[] {
     return data.map(row => ({
       ...row,
       [columnName]: row[columnName] ? row[columnName].replace(/_OM$/, '') : ''
     }));
   }

   private applyRemoveSpaces(data: Record<string, string>[], columnName: string): Record<string, string>[] {
     return data.map(row => ({
       ...row,
       [columnName]: row[columnName] ? row[columnName].replace(/\s/g, '') : ''
     }));
   }

   private applyRemoveSpecialChars(data: Record<string, string>[], columnName: string): Record<string, string>[] {
     return data.map(row => ({
       ...row,
       [columnName]: row[columnName] ? row[columnName].replace(/[^a-zA-Z0-9]/g, '') : ''
     }));
   }

   private applyNormalizeDates(data: Record<string, string>[], columnName: string): Record<string, string>[] {
     return data.map(row => ({
       ...row,
       [columnName]: row[columnName] ? this.normalizeDate(row[columnName]) : ''
     }));
   }

   private applyExtractNumbers(data: Record<string, string>[], columnName: string): Record<string, string>[] {
     return data.map(row => ({
       ...row,
       [columnName]: row[columnName] ? row[columnName].replace(/[^\d]/g, '') : ''
     }));
   }

   private applyRemoveCurrencySymbols(data: Record<string, string>[], columnName: string): Record<string, string>[] {
     return data.map(row => ({
       ...row,
       [columnName]: row[columnName] ? row[columnName].replace(/[€$£¥₦₨₩₪₫₭₮₯₰₱₲₳₴₵₶₷₸₹₺₻₼₽₾₿]/g, '') : ''
     }));
   }



   // Méthode pour tester des combinaisons de transformations
   private async testCombinedTransformations(
     boFile: File,
     partnerFile: File,
     boKey: string,
     partnerKey: string
   ): Promise<{ boKey: string; partnerKey: string; transformation: any; confidence: number } | null> {
     console.log('🔧 Test de combinaisons de transformations...');
     
     const boData = await this.readFileContent(boFile);
     const partnerData = await this.readFileContent(partnerFile);
     
     // Combinaisons de transformations à tester
     const combinations = [
       ['trimSpaces', 'toLowerCase', 'removeSpecialChars'],
       ['trimSpaces', 'removeSpaces', 'extractNumbers'],
       ['normalizeNumbers', 'removeCurrencySymbols', 'trimSpaces'],
       ['toUpperCase', 'removeDashesAndCommas', 'trimSpaces'],
       ['cleanAmounts', 'normalizeNumbers', 'removeSpaces']
     ];
     
     let bestCombination = null;
     let bestConfidence = 0;
     
     for (const combination of combinations) {
       console.log(`🔧 Test de la combinaison: ${combination.join(' + ')}`);
       
       // Appliquer la combinaison de transformations
       let transformedBoData = [...boData];
       let transformedPartnerData = [...partnerData];
       
       for (const transformName of combination) {
         const transformMethod = this.getTransformMethod(transformName);
         if (transformMethod) {
           transformedBoData = transformMethod(transformedBoData, boKey);
           transformedPartnerData = transformMethod(transformedPartnerData, partnerKey);
         }
       }
       
       // Calculer la confiance après transformation
       const matchCount = this.calculateMatchCount(transformedBoData, transformedPartnerData, boKey, partnerKey);
       const confidence = matchCount / Math.max(transformedBoData.length, transformedPartnerData.length);
       
       console.log(`📊 Combinaison ${combination.join(' + ')}: ${(confidence * 100).toFixed(1)}%`);
       
       if (confidence > bestConfidence) {
         bestConfidence = confidence;
         bestCombination = {
           boKey,
           partnerKey,
           transformation: { type: 'combined', transforms: combination },
           confidence
         };
       }
       
                // Si on atteint >70%, on s'arrête
         if (confidence >= 0.70) {
           console.log('🎯 Confiance >70% atteinte avec combinaison!');
           break;
         }
     }
     
     return bestCombination;
   }

   // Méthode pour obtenir une méthode de transformation par nom
   private getTransformMethod(transformName: string): any {
     const transformMethods: { [key: string]: any } = {
       'trimSpaces': this.applyTrimSpaces,
       'toLowerCase': this.applyToLowerCase,
       'toUpperCase': this.applyToUpperCase,
       'removeSeparators': this.applyRemoveSeparators,
       'cleanAmounts': this.applyCleanAmounts,
       'normalizeNumbers': this.applyNormalizeNumbers,
       'removeDashesAndCommas': this.applyRemoveDashesAndCommas,
       'removeSuffix_CM': this.applyRemoveSuffixCM,
       'removeSuffix_MTN': this.applyRemoveSuffixMTN,
       'removeSuffix_OM': this.applyRemoveSuffixOM,
       'removeSpaces': this.applyRemoveSpaces,
       'removeSpecialChars': this.applyRemoveSpecialChars,
       'normalizeDates': this.applyNormalizeDates,
       'extractNumbers': this.applyExtractNumbers,
       'removeCurrencySymbols': this.applyRemoveCurrencySymbols
     };
     
     return transformMethods[transformName];
   }

   // Méthode pour trouver des correspondances de dernier recours
   private async findLastResortMatch(boData: any[], partnerData: any[]): Promise<{ boKey: string; partnerKey: string; transformation: any; confidence: number } | null> {
     console.log('🔍 Stratégies de dernier recours...');
     
     const boHeaders = Object.keys(boData[0] || {});
     const partnerHeaders = Object.keys(partnerData[0] || {});
     
     // Stratégies de dernier recours
     const lastResortStrategies = [
       // Stratégie spécifique pour IDTransaction ↔ Id avec suppression _CM
       {
         name: 'IDTransaction ↔ Id (dernier recours)',
         test: (boCol: string, partnerCol: string) => {
           const boLower = boCol.toLowerCase();
           const partnerLower = partnerCol.toLowerCase();
           
           // Test spécifique pour IDTransaction ↔ Id
           return (boLower.includes('idtransaction') || boLower.includes('id_transaction')) && 
                  (partnerLower === 'id' || partnerLower.includes('id'));
         },
         specialTransform: 'removeSuffix_CM'
       },
       // Chercher des colonnes avec des IDs uniques
       {
         name: 'IDs uniques',
         test: (boCol: string, partnerCol: string) => {
           const boSample = boData.slice(0, 50).map(row => row[boCol]).filter(val => val && val.trim());
           const partnerSample = partnerData.slice(0, 50).map(row => row[partnerCol]).filter(val => val && val.trim());
           
           const boUnique = new Set(boSample).size;
           const partnerUnique = new Set(partnerSample).size;
           
           // Si les deux colonnes ont beaucoup de valeurs uniques, c'est probablement un ID
           return boUnique > boSample.length * 0.8 && partnerUnique > partnerSample.length * 0.8;
         }
       },
       // Chercher des colonnes avec des dates
       {
         name: 'Dates',
         test: (boCol: string, partnerCol: string) => {
           const dateKeywords = ['date', 'time', 'heure', 'timestamp'];
           const boLower = boCol.toLowerCase();
           const partnerLower = partnerCol.toLowerCase();
           return dateKeywords.some(keyword => boLower.includes(keyword) || partnerLower.includes(keyword));
         }
       },
       // Chercher des colonnes avec des montants
       {
         name: 'Montants',
         test: (boCol: string, partnerCol: string) => {
           const amountKeywords = ['montant', 'amount', 'somme', 'total', 'prix', 'price'];
           const boLower = boCol.toLowerCase();
           const partnerLower = partnerCol.toLowerCase();
           return amountKeywords.some(keyword => boLower.includes(keyword) || partnerLower.includes(keyword));
         }
       }
     ];
     
     for (const strategy of lastResortStrategies) {
       for (const boCol of boHeaders) {
         for (const partnerCol of partnerHeaders) {
           if (strategy.test(boCol, partnerCol)) {
             console.log(`🔍 Test stratégie de dernier recours "${strategy.name}": ${boCol} ↔ ${partnerCol}`);
             
             // Si c'est la stratégie spéciale IDTransaction ↔ Id, appliquer directement la transformation _CM
             if (strategy.specialTransform === 'removeSuffix_CM') {
               console.log('🔧 Application de la transformation spéciale _CM dans le dernier recours');
               
               // Appliquer la transformation _CM aux données BO
               const transformedBoData = this.applyRemoveSuffixCM(boData, boCol);
               
               // Calculer la confiance avec les données transformées
               const matchCount = this.calculateMatchCount(transformedBoData, partnerData, boCol, partnerCol);
               const confidence = matchCount / Math.max(transformedBoData.length, partnerData.length);
               
               console.log(`📊 Confiance avec transformation _CM: ${(confidence * 100).toFixed(1)}%`);
               
               if (confidence >= 0.70) {
                 console.log(`🎯 Correspondance >70% trouvée avec transformation _CM!`);
                 return {
                   boKey: boCol,
                   partnerKey: partnerCol,
                   transformation: { type: 'remove_suffix', pattern: '_CM' },
                   confidence
                 };
               }
             } else {
               // Tester avec transformations agressives pour les autres stratégies
               const result = await this.testCombinedTransformations(
                 this.boFile!,
                 this.partnerFile!,
                 boCol,
                 partnerCol
               );
               
               if (result && result.confidence >= 0.70) {
                 console.log(`🎯 Correspondance trouvée avec stratégie de dernier recours!`);
                 return result;
               }
             }
           }
         }
       }
     }
     
     return null;
   }
   
   // Méthode pour calculer le nombre de correspondances
   private calculateMatchCount(boData: Record<string, string>[], partnerData: Record<string, string>[], boKey: string, partnerKey: string): number {
     const boValues = new Set(boData.map(row => row[boKey]).filter(v => v && v.trim()));
     const partnerValues = partnerData.map(row => row[partnerKey]).filter(v => v && v.trim());
     
     return partnerValues.filter(value => boValues.has(value)).length;
   }
   
   // Méthode pour trouver une correspondance améliorée avec des stratégies avancées
   private async findImprovedMatch(suggestions: any[]): Promise<{ boKey: string; partnerKey: string; transformation: any; confidence: number } | null> {
     console.log('🚨 ===== DÉBUT findImprovedMatch =====');
     console.log('🔍 Recherche de correspondance améliorée...');
     console.log('🚨 ATTENTION: Cette méthode devrait donner 73% comme le mode assisté!');
     
     // Lire les données des deux fichiers
     const boData = await this.readFileContent(this.boFile!);
     const partnerData = await this.readFileContent(this.partnerFile!);
     
     // Obtenir les en-têtes
     const boHeaders = Object.keys(boData[0] || {});
     const partnerHeaders = Object.keys(partnerData[0] || {});
     
     console.log('📊 En-têtes BO:', boHeaders);
     console.log('📊 En-têtes Partenaire:', partnerHeaders);
     console.log('🔍 Recherche de colonnes IDTransaction et Id...');
     
     // 🚨 TEST SPÉCIFIQUE IDTransaction ↔ Id EN PREMIER (PRIORITÉ MAXIMALE)
     console.log('🚨 ===== TEST SPÉCIFIQUE IDTransaction ↔ Id (PRIORITÉ MAXIMALE) =====');
     console.log('🔍 Test spécifique pour IDTransaction ↔ Id...');
     console.log('🚨 ATTENTION: Ce test devrait donner 73% comme le mode assisté!');
     const idTransactionCol = boHeaders.find(col => col.toLowerCase().includes('idtransaction'));
     const idCol = partnerHeaders.find(col => col.toLowerCase() === 'id');
     
     console.log('🔍 Recherche des colonnes:');
     console.log('  - Colonnes BO disponibles:', boHeaders);
     console.log('  - Colonnes Partenaire disponibles:', partnerHeaders);
     console.log('  - IDTransaction trouvé:', idTransactionCol);
     console.log('  - Id trouvé:', idCol);
       
     console.log('📊 Colonnes trouvées:');
     console.log('  - IDTransaction:', idTransactionCol);
     console.log('  - Id:', idCol);
         
     // Test spécifique IDTransaction ↔ Id en PRIORITÉ
     if (idTransactionCol && idCol) {
       console.log(`🎯 Test spécifique PRIORITAIRE: ${idTransactionCol} ↔ ${idCol}`);
       
       // Afficher quelques exemples de données
       console.log('📊 Exemples de données BO:');
       const boSample = boData.slice(0, 5).map(row => row[idTransactionCol]);
       boSample.forEach((value, index) => console.log(`  ${index + 1}: "${value}"`));
       
       console.log('📊 Exemples de données Partenaire:');
       const partnerSample = partnerData.slice(0, 5).map(row => row[idCol]);
       partnerSample.forEach((value, index) => console.log(`  ${index + 1}: "${value}"`));
       
       // Test SANS transformation _CM (comme dans le mode assisté)
       const dataMatchScore = this.calculateDataMatchScore(boData, partnerData, idTransactionCol, idCol);
       
       console.log(`📊 Score IDTransaction ↔ Id SANS _CM: ${(dataMatchScore * 100).toFixed(1)}%`);
       
       // Si on atteint >70% sans transformation, c'est parfait !
       if (dataMatchScore >= 0.70) {
         console.log(`🎯 SUCCÈS! Confiance >70% atteinte SANS transformation: ${(dataMatchScore * 100).toFixed(1)}%`);
         return {
           boKey: idTransactionCol,
           partnerKey: idCol,
           transformation: null, // Pas de transformation
           confidence: dataMatchScore
         };
       }
       
       // Test AVEC transformation _CM pour comparaison
       const transformedBoData = this.applyRemoveSuffixCM(boData, idTransactionCol);
       const dataMatchScoreWithCM = this.calculateDataMatchScore(transformedBoData, partnerData, idTransactionCol, idCol);
       
       console.log(`📊 Score IDTransaction ↔ Id AVEC _CM: ${(dataMatchScoreWithCM * 100).toFixed(1)}%`);
       
       // Si on atteint >70% avec transformation, c'est parfait !
       if (dataMatchScoreWithCM >= 0.70) {
         console.log(`🎯 SUCCÈS! Confiance >70% atteinte AVEC transformation _CM: ${(dataMatchScoreWithCM * 100).toFixed(1)}%`);
         return {
           boKey: idTransactionCol,
           partnerKey: idCol,
           transformation: { type: 'remove_suffix', pattern: '_CM' },
           confidence: dataMatchScoreWithCM
         };
       }
       
       // Prendre le meilleur des deux scores même si <70%
       const bestScore = Math.max(dataMatchScore, dataMatchScoreWithCM);
       const bestTransformation = dataMatchScoreWithCM > dataMatchScore ? 
         { type: 'remove_suffix', pattern: '_CM' } : null;
       
       console.log(`📊 Meilleur score IDTransaction ↔ Id: ${(bestScore * 100).toFixed(1)}%`);
       
       // Retourner le meilleur résultat trouvé pour IDTransaction ↔ Id
       return {
         boKey: idTransactionCol,
         partnerKey: idCol,
         transformation: bestTransformation,
         confidence: bestScore
       };
     } else {
       console.log('❌ Colonnes IDTransaction ou Id non trouvées');
     }
     
     // Stratégies de correspondance avancées
     const strategies = [
       // Stratégie 1: Correspondance exacte des noms de colonnes
       {
         name: 'Correspondance exacte',
         test: (boCol: string, partnerCol: string) => boCol.toLowerCase() === partnerCol.toLowerCase(),
         priority: 10
       },
       // Stratégie 2: Correspondance partielle (contient)
       {
         name: 'Correspondance partielle',
         test: (boCol: string, partnerCol: string) => 
           boCol.toLowerCase().includes(partnerCol.toLowerCase()) || 
           partnerCol.toLowerCase().includes(boCol.toLowerCase()),
         priority: 8
       },
       // Stratégie 3: Correspondance par mots-clés
       {
         name: 'Mots-clés',
         test: (boCol: string, partnerCol: string) => {
           const keywords = ['id', 'reference', 'montant', 'amount', 'date', 'transaction', 'compte', 'account'];
           const boLower = boCol.toLowerCase();
           const partnerLower = partnerCol.toLowerCase();
           return keywords.some(keyword => boLower.includes(keyword) && partnerLower.includes(keyword));
         },
         priority: 7
       },
       // Stratégie 4: Correspondance spécifique IDTransaction ↔ Id (avec suppression _CM)
       {
         name: 'IDTransaction ↔ Id (sans _CM)',
         test: (boCol: string, partnerCol: string) => {
           const boLower = boCol.toLowerCase();
           const partnerLower = partnerCol.toLowerCase();
           
           // Test spécifique pour IDTransaction ↔ Id
           if ((boLower.includes('idtransaction') || boLower.includes('id_transaction')) && 
               (partnerLower === 'id' || partnerLower.includes('id'))) {
             return true;
           }
           
           // Test pour d'autres variations d'ID
           if ((boLower.includes('id') && boLower.includes('transaction')) && 
               (partnerLower === 'id' || partnerLower.includes('id'))) {
             return true;
           }
           
           return false;
         },
         priority: 9, // Priorité élevée car c'est souvent la bonne correspondance
         specialTransform: 'removeSuffix_CM' // Transformation spéciale à appliquer
       },
       // Stratégie 5: Correspondance par type de données
       {
         name: 'Type de données',
         test: (boCol: string, partnerCol: string) => {
           // Analyser le type de données des colonnes
           const boSample = boData.slice(0, 10).map(row => row[boCol]).filter(val => val && val.trim());
           const partnerSample = partnerData.slice(0, 10).map(row => row[partnerCol]).filter(val => val && val.trim());
           
           if (boSample.length === 0 || partnerSample.length === 0) return false;
           
           // Vérifier si les deux colonnes contiennent principalement des nombres
           const boNumeric = boSample.filter(val => !isNaN(Number(val))).length / boSample.length;
           const partnerNumeric = partnerSample.filter(val => !isNaN(Number(val))).length / partnerSample.length;
           
           return boNumeric > 0.7 && partnerNumeric > 0.7;
         },
         priority: 6
       }
     ];
     
     let bestMatch = null;
     let bestScore = 0;
     
     // Tester toutes les combinaisons de colonnes
     for (const boCol of boHeaders) {
       for (const partnerCol of partnerHeaders) {
         console.log(`🔍 Test de correspondance: ${boCol} ↔ ${partnerCol}`);
         for (const strategy of strategies) {
           const testResult = strategy.test(boCol, partnerCol);
           if (testResult) {
             console.log(`✅ Stratégie "${strategy.name}" détectée pour ${boCol} ↔ ${partnerCol}`);
             console.log(`🔍 Test ${strategy.name}: ${boCol} ↔ ${partnerCol}`);
             
             // Si c'est la stratégie spéciale IDTransaction ↔ Id, appliquer la transformation _CM
             if (strategy.specialTransform === 'removeSuffix_CM') {
               console.log('🔧 Application de la transformation spéciale: suppression _CM');
               
               // Appliquer la transformation _CM aux données BO
               const transformedBoData = this.applyRemoveSuffixCM(boData, boCol);
               
               // Calculer le score avec les données transformées
               const dataMatchScore = this.calculateDataMatchScore(transformedBoData, partnerData, boCol, partnerCol);
               const totalScore = strategy.priority * dataMatchScore;
               
               console.log(`📊 Score avec transformation _CM: ${(dataMatchScore * 100).toFixed(1)}% (total: ${totalScore.toFixed(3)})`);
               
               if (totalScore > bestScore) {
                 bestScore = totalScore;
                 bestMatch = {
                   boKey: boCol,
                   partnerKey: partnerCol,
                   transformation: { type: 'remove_suffix', pattern: '_CM' },
                   confidence: dataMatchScore // Utiliser directement le score de correspondance
                 };
                 
                 console.log(`✅ Nouvelle meilleure correspondance trouvée avec transformation _CM!`);
               }
             } else {
               // Calculer un score basé sur la stratégie et la correspondance des données
               const dataMatchScore = this.calculateDataMatchScore(boData, partnerData, boCol, partnerCol);
               const totalScore = strategy.priority * dataMatchScore;
               
               console.log(`📊 Score sans transformation: ${(dataMatchScore * 100).toFixed(1)}% (total: ${totalScore.toFixed(3)})`);
               
               if (totalScore > bestScore) {
                 bestScore = totalScore;
                 bestMatch = {
                   boKey: boCol,
                   partnerKey: partnerCol,
                   transformation: null,
                   confidence: dataMatchScore
                 };
               }
             }
           }
         }
       }
     }
     

     
     // Si on a trouvé une correspondance, essayer d'améliorer avec des transformations
     if (bestMatch && bestMatch.confidence > 0.1) {
       console.log('🔧 Tentative d\'amélioration agressive avec transformations...');
       
       // Essayer toutes les transformations possibles pour atteindre >90%
       const improvedWithTransform = await this.testFormattingForBetterMatch(
         this.boFile!,
         this.partnerFile!,
         bestMatch.boKey,
         bestMatch.partnerKey,
         { confidence: bestMatch.confidence }
       );
       
       if (improvedWithTransform && improvedWithTransform.confidence > bestMatch.confidence) {
         console.log('✅ Amélioration trouvée avec transformation');
         
         // Si on atteint >70%, c'est parfait
         if (improvedWithTransform.confidence >= 0.70) {
           console.log('🎯 Confiance >70% atteinte avec transformation!');
           return improvedWithTransform;
         }
         
         // Sinon, essayer des combinaisons de transformations
         const superImproved = await this.testCombinedTransformations(
           this.boFile!,
           this.partnerFile!,
           bestMatch.boKey,
           bestMatch.partnerKey
         );
         
         if (superImproved && superImproved.confidence >= 0.70) {
           console.log('🎯 Confiance >70% atteinte avec combinaison de transformations!');
           return superImproved;
         }
         
         return improvedWithTransform;
       }
     }
     
     // Si aucune correspondance trouvée, essayer des stratégies de dernier recours
     console.log('🔍 Tentative de stratégies de dernier recours...');
     const lastResortMatch = await this.findLastResortMatch(boData, partnerData);
     
     console.log('🚨 ===== FIN findImprovedMatch =====');
     console.log('🎯 Résultat final:', lastResortMatch || bestMatch);
     
     return lastResortMatch || bestMatch;
   }
   
   // Méthode pour calculer le score de correspondance des données (version améliorée)
   private calculateDataMatchScore(boData: any[], partnerData: any[], boCol: string, partnerCol: string): number {
     if (boData.length === 0 || partnerData.length === 0) return 0;
     
     // Utiliser TOUTES les données (comme le mode assisté)
     const boValues = boData.map(row => row[boCol]).filter(val => val && val.trim());
     const partnerValues = partnerData.map(row => row[partnerCol]).filter(val => val && val.trim());
     
     if (boValues.length === 0 || partnerValues.length === 0) return 0;
     
     // Calculer le nombre de correspondances exactes
     const boSet = new Set(boValues);
     const matches = partnerValues.filter(val => boSet.has(val)).length;
     
     // Score de base basé sur les correspondances exactes (comme le mode assisté)
     // Le mode assisté privilégie la correspondance côté BO (plus petit dataset)
     const exactMatchScore = matches / Math.min(boValues.length, partnerValues.length);
     
     // Score de similarité des noms de colonnes
     const nameSimilarity = this.calculateNameSimilarity(boCol, partnerCol);
     
     // Score de format de données
     const formatScore = this.calculateFormatCompatibility(boValues, partnerValues);
     
     // Score d'unicité
     const uniquenessScore = this.calculateUniquenessScore(boValues, partnerValues);
     
     // Score combiné (pondération similaire au mode assisté)
     const combinedScore = (
       exactMatchScore * 0.4 +      // 40% pour les correspondances exactes
       nameSimilarity * 0.2 +       // 20% pour la similarité des noms
       formatScore * 0.2 +          // 20% pour la compatibilité des formats
       uniquenessScore * 0.2        // 20% pour l'unicité
     );
     
     // Logs détaillés pour le débogage
     console.log(`🔍 Calcul de correspondance amélioré ${boCol} ↔ ${partnerCol}:`);
     console.log(`  - Total BO: ${boValues.length} valeurs`);
     console.log(`  - Total Partenaire: ${partnerValues.length} valeurs`);
     console.log(`  - Correspondances exactes: ${matches}`);
     console.log(`  - Score exact: ${(exactMatchScore * 100).toFixed(1)}%`);
     console.log(`  - Similarité des noms: ${(nameSimilarity * 100).toFixed(1)}%`);
     console.log(`  - Compatibilité format: ${(formatScore * 100).toFixed(1)}%`);
     console.log(`  - Score d'unicité: ${(uniquenessScore * 100).toFixed(1)}%`);
     console.log(`  - Score combiné: ${(combinedScore * 100).toFixed(1)}%`);
     
     return combinedScore;
   }
   
   // Méthode pour calculer la similarité des noms de colonnes
   private calculateNameSimilarity(boCol: string, partnerCol: string): number {
     const boLower = boCol.toLowerCase();
     const partnerLower = partnerCol.toLowerCase();
     
     // Correspondance exacte
     if (boLower === partnerLower) return 1.0;
     
     // Correspondance partielle
     if (boLower.includes(partnerLower) || partnerLower.includes(boLower)) return 0.8;
     
     // Mots-clés communs
     const boWords = boLower.split(/[\s_]+/);
     const partnerWords = partnerLower.split(/[\s_]+/);
     const commonWords = boWords.filter(word => partnerWords.includes(word));
     
     if (commonWords.length > 0) {
       return Math.min(0.6, commonWords.length * 0.3);
     }
     
     return 0.1;
   }
   
   // Méthode pour calculer la compatibilité des formats
   private calculateFormatCompatibility(boSample: string[], partnerSample: string[]): number {
     if (boSample.length === 0 || partnerSample.length === 0) return 0;
     
     // Analyser les formats des données
     const boFormats = this.analyzeDataFormats(boSample);
     const partnerFormats = this.analyzeDataFormats(partnerSample);
     
     // Comparer les formats
     let compatibility = 0;
     
     // Même type de données
     if (boFormats.isNumeric === partnerFormats.isNumeric) compatibility += 0.3;
     if (boFormats.isAlphanumeric === partnerFormats.isAlphanumeric) compatibility += 0.3;
     if (boFormats.hasSpecialChars === partnerFormats.hasSpecialChars) compatibility += 0.2;
     if (boFormats.avgLength === partnerFormats.avgLength) compatibility += 0.2;
     
     return Math.min(1.0, compatibility);
   }
   
   // Méthode pour analyser les formats de données
   private analyzeDataFormats(sample: string[]): any {
     const numericCount = sample.filter(val => /^\d+$/.test(val)).length;
     const alphanumericCount = sample.filter(val => /^[a-zA-Z0-9]+$/.test(val)).length;
     const specialCharsCount = sample.filter(val => /[^a-zA-Z0-9\s]/.test(val)).length;
     const avgLength = sample.reduce((sum, val) => sum + val.length, 0) / sample.length;
     
     return {
       isNumeric: numericCount / sample.length > 0.7,
       isAlphanumeric: alphanumericCount / sample.length > 0.7,
       hasSpecialChars: specialCharsCount / sample.length > 0.3,
       avgLength: Math.round(avgLength)
     };
   }
   
   // Méthode pour calculer le score d'unicité
   private calculateUniquenessScore(boSample: string[], partnerSample: string[]): number {
     const boUnique = new Set(boSample).size;
     const partnerUnique = new Set(partnerSample).size;
     
     const boUniqueness = boUnique / boSample.length;
     const partnerUniqueness = partnerUnique / partnerSample.length;
     
     // Si les deux colonnes ont une forte unicité, c'est probablement un ID
     if (boUniqueness > 0.8 && partnerUniqueness > 0.8) {
       return 0.9;
     }
     
     // Si une seule colonne a une forte unicité
     if (boUniqueness > 0.8 || partnerUniqueness > 0.8) {
       return 0.5;
     }
     
     return 0.1;
   }
   
   // Méthode helper pour normaliser les dates
   private normalizeDate(dateStr: string): string {
     if (!dateStr || typeof dateStr !== 'string') return dateStr;
     
     try {
       // Essayer de parser la date
       const date = new Date(dateStr);
       if (isNaN(date.getTime())) return dateStr;
       
       // Retourner au format ISO
       return date.toISOString().split('T')[0];
     } catch (error) {
       return dateStr;
     }
   }

   // Méthode pour appliquer une transformation aux données d'un fichier
   private applyTransformationToFile(file: File, columnName: string, transformation: any): Promise<Record<string, string>[]> {
     return new Promise((resolve, reject) => {
       const reader = new FileReader();
       reader.onload = (e) => {
         try {
           const content = e.target?.result as string;
           const lines = content.split('\n');
           
           // Détecter le séparateur
           let separator = ',';
           if (lines[0].includes(';')) {
             separator = ';';
           }
           
           const headers = lines[0].split(separator).map(h => h.trim().replace(/"/g, ''));
           
           // Trouver l'index de la colonne
           const columnIndex = headers.indexOf(columnName);
           if (columnIndex === -1) {
             reject(new Error(`Colonne ${columnName} non trouvée dans le fichier`));
             return;
           }
           
           // Appliquer la transformation aux données
           const data = lines.slice(1)
             .filter(line => line.trim())
             .map(line => {
               const values = line.split(separator);
               const row: Record<string, string> = {};
               
               headers.forEach((header, index) => {
                 let value = values[index] ? values[index].trim().replace(/"/g, '') : '';
                 
                 // Appliquer la transformation à la colonne spécifique
                 if (index === columnIndex && transformation && value) {
                   const originalValue = value;
                   
                   switch (transformation.type) {
                     case 'remove_suffix':
                       if (value.endsWith(transformation.pattern)) {
                         value = value.slice(0, -transformation.pattern.length);
                       }
                       break;
                     case 'remove_prefix':
                       if (value.startsWith(transformation.pattern)) {
                         value = value.slice(transformation.pattern.length);
                       }
                       break;
                     case 'remove_pattern':
                       const pattern = new RegExp(transformation.pattern + '$');
                       value = value.replace(pattern, '');
                       break;
                     case 'format':
                       // Appliquer les formats intelligents détectés
                       switch (transformation.format) {
                         case 'trimSpaces':
                           value = value.trim();
                           break;
                         case 'toLowerCase':
                           value = value.toLowerCase();
                           break;
                         case 'toUpperCase':
                           value = value.toUpperCase();
                           break;
                         case 'removeSeparators':
                           value = value.replace(/[,;]/g, '');
                           break;
                         case 'cleanAmounts':
                           value = value.replace(/\s/g, '').replace(/[,]00?$/, '');
                           break;
                         case 'normalizeNumbers':
                           value = value.replace(/[^\d.,-]/g, '').replace(',', '.');
                           break;
                         case 'removeDashesAndCommas':
                           value = value.replace(/[-,_]/g, '');
                           break;
                       }
                       break;
                   }
                   
                   console.log(`🔧 Transformation: "${originalValue}" → "${value}"`);
                 }
                 
                 row[header] = value;
               });
               
               return row;
             });
           
           resolve(data);
         } catch (error) {
           reject(error);
         }
       };
       reader.onerror = reject;
       reader.readAsText(file);
     });
   }

   /**
    * Applique les règles de traitement des colonnes aux données
    */
   private applyColumnProcessingRules(data: Record<string, string>[], rules: any[]): Record<string, string>[] {
     console.log('🔧 Application des règles de traitement des colonnes...');
     
     return data.map(row => {
       const processedRow = { ...row };
       
       rules.forEach(rule => {
         const columnName = rule.sourceColumn;
         if (processedRow[columnName]) {
           let value = processedRow[columnName];
           const originalValue = value;
           
           // Appliquer les transformations dans l'ordre optimal pour garantir une suppression correcte des caractères
           // (même ordre que le backend pour cohérence)
           
           // 1. Suppression des accents AVANT la suppression des caractères spéciaux
           //    (pour normaliser les caractères accentués avant qu'ils ne soient supprimés)
           if (rule.removeAccents) {
             value = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
           }
           
           // 2. Suppression de chaînes spécifiques (ex: _CM, _ML, etc.)
           if (rule.stringToRemove && rule.stringToRemove.trim() !== '') {
             // Supprimer toutes les occurrences de la chaîne spécifiée
             value = value.replace(new RegExp(rule.stringToRemove.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
           }
           
           // 3. Suppression des caractères spéciaux (après normalisation des accents)
           if (rule.removeSpecialChars) {
             // Supprimer tous les caractères qui ne sont pas des lettres, chiffres ou espaces
             value = value.replace(/[^a-zA-Z0-9\s]/g, '');
           }
           
           // 4. Transformations de casse (après nettoyage des caractères)
           if (rule.toUpperCase) {
             value = value.toUpperCase();
           }
           
           if (rule.toLowerCase) {
             value = value.toLowerCase();
           }
           
           // 5. Trim des espaces EN DERNIER pour nettoyer les espaces restants après toutes les suppressions
           if (rule.trimSpaces) {
             value = value.trim();
           }
           
           // Mettre à jour la valeur si elle a changé
           if (value !== originalValue) {
             processedRow[columnName] = value;
             console.log(`🔧 Transformation ${columnName}: "${originalValue}" → "${value}"`);
           }
         }
       });
       
       return processedRow;
     });
   }

   /**
    * Vérifie s'il y a des données à réinitialiser
    */
   get hasDataToReset(): boolean {
     return !!this.selectedMode;
   }

     /**
   * Réinitialise toutes les données et fichiers
   */
  async resetData(): Promise<void> {
    // Demander confirmation à l'utilisateur
    const confirmed = await this.popupService.showConfirm(
      'Êtes-vous sûr de vouloir réinitialiser toutes les données ? Cette action ne peut pas être annulée.',
      'Confirmation de réinitialisation'
    );
    
    if (confirmed) {
      console.log('🔄 Réinitialisation des données...');
      
      // Réinitialiser le mode sélectionné
      this.selectedMode = null;

      // Réinitialiser l'état de l'application
      this.appStateService.clearUploadedFiles();
      this.appStateService.clearReconciliationData();
      
      // Réinitialiser les données de réconciliation
      this.reconciliationService.clearData();
      
      this.boFile = null;
      this.partnerFile = null;
      this.boData = [];
      this.partnerData = [];
      this.clearBoSelections();
      this.clearPartnerSelections();
      
      console.log('✅ Données réinitialisées avec succès');
      
      // Afficher un message de confirmation
      this.popupService.showSuccess('Données réinitialisées avec succès');
    }
  }

  // ─── Parsing ──────────────────────────────────────────────────────────────

  private parseFile(file: File, isBo: boolean): void {
    const name = file.name.toLowerCase();
    if (name.endsWith('.csv')) {
      this.parseCSV(file, isBo);
    } else if (['.xls','.xlsx','.xlsm','.xlsb','.xlt','.xltx','.xltm'].some(e => name.endsWith(e))) {
      this.parseXLSX(file, isBo);
    }
  }

  private parseCSV(file: File, isBo: boolean): void {
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      let text = e.target?.result as string;
      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
      const lines = text.split('\n').filter(l => l.trim());
      if (!lines.length) return;
      const first = lines[0];
      const delimiter = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
      Papa.parse(text, {
        header: true,
        delimiter,
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data as Record<string, string>[];
          this.onFileParsed(data, isBo);
        }
      });
    };
    reader.readAsText(file, 'UTF-8');
  }

  private parseXLSX(file: File, isBo: boolean): void {
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const ab = e.target?.result as ArrayBuffer;
      const wb = XLSX.read(ab, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
      const data: Record<string, string>[] = rows.map(r => {
        const row: Record<string, string> = {};
        Object.keys(r).forEach(k => { row[k] = r[k] !== null && r[k] !== undefined ? String(r[k]) : ''; });
        return row;
      });
      this.onFileParsed(data, isBo);
    };
    reader.readAsArrayBuffer(file);
  }

  private onFileParsed(data: Record<string, string>[], isBo: boolean): void {
    if (isBo) {
      this.boData = data;
      this.cdr.detectChanges();
      setTimeout(() => {
        if (this.boData.length > 0) {
          if (this.detectTRXBOAndExtractServices(this.boData)) {
            if (this.availableAgencies.length > 0) {
              this.showAgencySelectionStep();
            } else if (this.selectedMode === 'manual' || this.selectedMode === 'assisted') {
              this.showManualServiceSelectionStep();
            } else {
              this.showServiceSelectionStep();
            }
          }
        }
        this.cdr.detectChanges();
      }, 100);
    } else {
      this.partnerData = data;
      this.cdr.detectChanges();
      setTimeout(() => {
        if (this.partnerData.length > 0) {
          if (this.detectPartnerServiceTypeAndStatus(this.partnerData)) {
            this.showPartnerServiceSelectionStep();
          }
        }
        this.cdr.detectChanges();
      }, 100);
    }
  }

  // ─── Détection TRXBO ───────────────────────────────────────────────────────

  private detectTRXBOAndExtractServices(data: Record<string, string>[]): boolean {
    if (!data?.length) return false;
    const columns = Object.keys(data[0]);
    const hasService = columns.some(c => c.toLowerCase().includes('service') || c.toLowerCase().includes('serv'));
    if (!hasService) return false;

    const agencyCol = columns.find(c => c.toLowerCase().includes('agence') || c.toLowerCase().includes('agency'));
    if (agencyCol) {
      this.availableAgencies = [...new Set(data.map(r => r[agencyCol]).filter(v => v?.toString().trim()))].sort();
      this.agencySelectionData = data;
      this.agencyColumn = agencyCol;
      return true;
    }
    return this.extractServicesFromTRXBO(data);
  }

  private extractServicesFromTRXBO(data: Record<string, string>[]): boolean {
    if (!data?.length) return false;
    const columns = Object.keys(data[0]);
    const serviceCol = columns.find(c => c.toLowerCase().includes('service') || c.toLowerCase().includes('serv'));
    if (!serviceCol) return false;
    this.availableServices = [...new Set(data.map(r => r[serviceCol]).filter(v => v?.trim()))].sort();
    this.serviceSelectionData = data;
    return true;
  }

  private extractServicesForManual(data: Record<string, string>[]): boolean {
    if (!data?.length) return false;
    const columns = Object.keys(data[0]);
    const serviceCol = columns.find(c => c.toLowerCase().includes('service') || c.toLowerCase().includes('serv'));
    if (!serviceCol) return false;
    const statusCol = columns.find(c => {
      const l = c.toLowerCase();
      return l.includes('statut') || l.includes('status') || l.includes('état') || l.includes('state');
    });
    this.manualAvailableServices = [...new Set(data.map(r => r[serviceCol]).filter(v => v?.trim()))].sort();
    this.manualServiceSelectionData = data;
    this.manualStatusColumn = statusCol || null;
    return true;
  }

  private detectPartnerServiceTypeAndStatus(data: Record<string, string>[]): boolean {
    if (!data?.length) return false;
    const columns = Object.keys(data[0]);
    const serviceCol = columns.find(c => {
      const l = c.toLowerCase();
      return l.includes('service') || l.includes('serv') || l.includes('type');
    });
    const statusCol = columns.find(c => {
      const l = c.toLowerCase();
      return l.includes('statut') || l.includes('status') || l.includes('état') || l.includes('généré le') || l.includes('genere le');
    });
    if (!serviceCol) return false;
    this.partnerAvailableServices = [...new Set(data.map(r => r[serviceCol]).filter(v => v?.toString().trim()))].sort();
    this.partnerServiceSelectionData = data;
    this.partnerServiceColumn = serviceCol;
    this.partnerStatusColumn = statusCol || null;
    return true;
  }

  // ─── Popup steps ──────────────────────────────────────────────────────────

  private showAgencySelectionStep(): void {
    this.showAgencySelection = true;
    this.agencySearchFilter = '';
    this.selectedAgencies = [...this.availableAgencies];
    this.cdr.detectChanges();
  }

  private showServiceSelectionStep(): void {
    this.showServiceSelection = true;
    this.serviceSearchFilter = '';
    this.selectedServices = [...this.availableServices];
    this.cdr.detectChanges();
  }

  private showManualServiceSelectionStep(): void {
    this.showManualServiceSelection = true;
    this.manualServiceSearchFilter = '';
    this.manualSelectedServices = [...this.manualAvailableServices];
    this.cdr.detectChanges();
  }

  private showManualStatusSelectionStep(): void {
    this.showManualStatusSelection = true;
    this.manualStatusSearchFilter = '';
    this.manualSelectedStatuses = [...this.manualAvailableStatuses];
    this.cdr.detectChanges();
  }

  private showPartnerServiceSelectionStep(): void {
    this.showPartnerServiceSelection = true;
    this.partnerServiceSearchFilter = '';
    this.partnerSelectedServices = [...this.partnerAvailableServices];
    this.cdr.detectChanges();
  }

  private showPartnerStatusSelectionStep(): void {
    this.showPartnerStatusSelection = true;
    this.partnerStatusSearchFilter = '';
    this.partnerSelectedStatuses = [...this.partnerAvailableStatuses];
    this.cdr.detectChanges();
  }

  private showPartnerPaymentSelectionStep(): void {
    this.showPartnerPaymentSelection = true;
    this.partnerPaymentSearchFilter = '';
    this.partnerSelectedPayments = [...this.partnerAvailablePayments];
    this.cdr.detectChanges();
  }

  // ─── Confirmations BO ──────────────────────────────────────────────────────

  confirmAgencySelection(): void {
    if (!this.selectedAgencies.length || !this.agencyColumn) return;
    const filtered = this.agencySelectionData.filter(r => this.selectedAgencies.includes(r[this.agencyColumn!]));
    this.showAgencySelection = false;
    const isManual = this.selectedMode === 'manual' || this.selectedMode === 'assisted';
    if (isManual) {
      if (this.extractServicesForManual(filtered)) this.showManualServiceSelectionStep();
    } else {
      if (this.extractServicesFromTRXBO(filtered)) this.showServiceSelectionStep();
    }
  }

  cancelAgencySelection(): void {
    this.showAgencySelection = false;
    this.boData = [];
    this.boFile = null;
    this.clearBoSelections();
    this.cdr.detectChanges();
  }

  confirmServiceSelection(): void {
    if (!this.selectedServices.length) return;
    const serviceCol = Object.keys(this.serviceSelectionData[0]).find(c => c.toLowerCase().includes('service') || c.toLowerCase().includes('serv'))!;
    this.boData = this.serviceSelectionData.filter(r => this.selectedServices.includes(r[serviceCol]));
    this.showServiceSelection = false;
    this.cdr.detectChanges();
  }

  cancelServiceSelection(): void {
    this.showServiceSelection = false;
    this.boData = [];
    this.boFile = null;
    this.clearBoSelections();
    this.cdr.detectChanges();
  }

  confirmManualServiceSelection(): void {
    if (!this.manualSelectedServices.length) return;
    const serviceCol = Object.keys(this.manualServiceSelectionData[0]).find(c => c.toLowerCase().includes('service') || c.toLowerCase().includes('serv'))!;
    const filtered = this.manualServiceSelectionData.filter(r => this.manualSelectedServices.includes(r[serviceCol]));
    if (this.manualStatusColumn && filtered.length > 0) {
      const statuses = [...new Set(filtered.map(r => r[this.manualStatusColumn!]).filter(v => v?.toString().trim()))].sort();
      this.manualAvailableStatuses = statuses;
      this.manualStatusSelectionData = filtered;
      this.showManualServiceSelection = false;
      this.showManualStatusSelectionStep();
    } else {
      this.boData = filtered;
      this.showManualServiceSelection = false;
      this.cdr.detectChanges();
    }
  }

  cancelManualServiceSelection(): void {
    this.showManualServiceSelection = false;
    this.boData = [];
    this.boFile = null;
    this.clearBoSelections();
    this.cdr.detectChanges();
  }

  confirmManualStatusSelection(): void {
    if (!this.manualSelectedStatuses.length || !this.manualStatusColumn) return;
    this.boData = this.manualStatusSelectionData.filter(r => this.manualSelectedStatuses.includes(r[this.manualStatusColumn!]));
    this.showManualStatusSelection = false;
    this.cdr.detectChanges();
  }

  cancelManualStatusSelection(): void {
    this.showManualStatusSelection = false;
    this.showManualServiceSelection = true;
    this.cdr.detectChanges();
  }

  // ─── Confirmations Partenaire ──────────────────────────────────────────────

  confirmPartnerServiceSelection(): void {
    if (!this.partnerSelectedServices.length || !this.partnerServiceColumn) return;
    const filtered = this.partnerServiceSelectionData.filter(r => this.partnerSelectedServices.includes(r[this.partnerServiceColumn!]));
    if (this.partnerStatusColumn && filtered.length > 0) {
      const statuses = [...new Set(filtered.map(r => r[this.partnerStatusColumn!]).filter(v => v?.toString().trim()))].sort();
      this.partnerAvailableStatuses = statuses;
      this.partnerStatusSelectionData = filtered;
      this.showPartnerServiceSelection = false;
      this.showPartnerStatusSelectionStep();
    } else {
      this.partnerData = filtered;
      this.showPartnerServiceSelection = false;
      this.cdr.detectChanges();
    }
  }

  cancelPartnerServiceSelection(): void {
    this.showPartnerServiceSelection = false;
    this.partnerData = [];
    this.partnerFile = null;
    this.clearPartnerSelections();
    this.cdr.detectChanges();
  }

  confirmPartnerStatusSelection(): void {
    if (!this.partnerSelectedStatuses.length || !this.partnerStatusColumn) return;
    const filtered = this.partnerStatusSelectionData.filter(r => this.partnerSelectedStatuses.includes(r[this.partnerStatusColumn!]));
    // Chercher colonne paiement
    const paymentCol = Object.keys(filtered[0] || {}).find(c => {
      const l = c.toLowerCase();
      return l.includes('paiement') || l.includes('payment') || l.includes('application');
    });
    if (paymentCol && filtered.length > 0) {
      this.partnerAvailablePayments = [...new Set(filtered.map(r => r[paymentCol]).filter(v => v?.toString().trim()))].sort();
      this.partnerPaymentSelectionData = filtered;
      this.partnerPaymentColumn = paymentCol;
      this.partnerAvailableStatuses = [];
      this.partnerStatusSelectionData = [];
      this.partnerSelectedStatuses = [];
      this.showPartnerStatusSelection = false;
      this.showPartnerPaymentSelectionStep();
    } else {
      this.partnerData = filtered;
      this.showPartnerStatusSelection = false;
      this.cdr.detectChanges();
    }
  }

  cancelPartnerStatusSelection(): void {
    this.showPartnerStatusSelection = false;
    this.showPartnerServiceSelection = true;
    this.cdr.detectChanges();
  }

  confirmPartnerPaymentSelection(): void {
    if (!this.partnerSelectedPayments.length || !this.partnerPaymentColumn) return;
    this.partnerData = this.partnerPaymentSelectionData.filter(r => this.partnerSelectedPayments.includes(r[this.partnerPaymentColumn!]));
    this.showPartnerPaymentSelection = false;
    this.partnerPaymentColumn = null;
    this.partnerPaymentSelectionData = [];
    this.partnerAvailablePayments = [];
    this.partnerSelectedPayments = [];
    this.cdr.detectChanges();
  }

  cancelPartnerPaymentSelection(): void {
    this.showPartnerPaymentSelection = false;
    this.showPartnerStatusSelection = true;
    this.cdr.detectChanges();
  }

  // ─── Checkbox handlers ─────────────────────────────────────────────────────

  onAgencySelectionChange(event: Event, agency: string): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) { if (!this.selectedAgencies.includes(agency)) this.selectedAgencies.push(agency); }
    else { this.selectedAgencies = this.selectedAgencies.filter(a => a !== agency); }
  }

  onServiceSelectionChange(event: Event, service: string): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) { if (!this.selectedServices.includes(service)) this.selectedServices.push(service); }
    else { this.selectedServices = this.selectedServices.filter(s => s !== service); }
  }

  onManualServiceSelectionChange(event: Event, service: string): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) { if (!this.manualSelectedServices.includes(service)) this.manualSelectedServices.push(service); }
    else { this.manualSelectedServices = this.manualSelectedServices.filter(s => s !== service); }
  }

  onManualStatusSelectionChange(event: Event, status: string): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) { if (!this.manualSelectedStatuses.includes(status)) this.manualSelectedStatuses.push(status); }
    else { this.manualSelectedStatuses = this.manualSelectedStatuses.filter(s => s !== status); }
  }

  onPartnerServiceSelectionChange(event: Event, service: string): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) { if (!this.partnerSelectedServices.includes(service)) this.partnerSelectedServices.push(service); }
    else { this.partnerSelectedServices = this.partnerSelectedServices.filter(s => s !== service); }
  }

  onPartnerStatusSelectionChange(event: Event, status: string): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) { if (!this.partnerSelectedStatuses.includes(status)) this.partnerSelectedStatuses.push(status); }
    else { this.partnerSelectedStatuses = this.partnerSelectedStatuses.filter(s => s !== status); }
  }

  onPartnerPaymentSelectionChange(event: Event, payment: string): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) { if (!this.partnerSelectedPayments.includes(payment)) this.partnerSelectedPayments.push(payment); }
    else { this.partnerSelectedPayments = this.partnerSelectedPayments.filter(p => p !== payment); }
  }

  // ─── Select/Deselect all ──────────────────────────────────────────────────

  selectAllAgencies(): void { this.selectedAgencies = [...this.filteredAvailableAgencies]; }
  deselectAllAgencies(): void { const f = this.filteredAvailableAgencies; this.selectedAgencies = this.selectedAgencies.filter(a => !f.includes(a)); }

  selectAllServices(): void { this.selectedServices = [...this.filteredAvailableServices]; }
  deselectAllServices(): void { const f = this.filteredAvailableServices; this.selectedServices = this.selectedServices.filter(s => !f.includes(s)); }

  selectAllManualServices(): void { this.manualSelectedServices = [...this.filteredManualAvailableServices]; }
  deselectAllManualServices(): void { const f = this.filteredManualAvailableServices; this.manualSelectedServices = this.manualSelectedServices.filter(s => !f.includes(s)); }

  selectAllManualStatuses(): void { this.manualSelectedStatuses = [...this.filteredManualAvailableStatuses]; }
  deselectAllManualStatuses(): void { const f = this.filteredManualAvailableStatuses; this.manualSelectedStatuses = this.manualSelectedStatuses.filter(s => !f.includes(s)); }

  selectAllPartnerServices(): void { this.partnerSelectedServices = [...this.filteredPartnerAvailableServices]; }
  deselectAllPartnerServices(): void { const f = this.filteredPartnerAvailableServices; this.partnerSelectedServices = this.partnerSelectedServices.filter(s => !f.includes(s)); }

  selectAllPartnerStatuses(): void { this.partnerSelectedStatuses = [...this.filteredPartnerAvailableStatuses]; }
  deselectAllPartnerStatuses(): void { const f = this.filteredPartnerAvailableStatuses; this.partnerSelectedStatuses = this.partnerSelectedStatuses.filter(s => !f.includes(s)); }

  selectAllPartnerPayments(): void { this.partnerSelectedPayments = [...this.filteredPartnerAvailablePayments]; }
  deselectAllPartnerPayments(): void { const f = this.filteredPartnerAvailablePayments; this.partnerSelectedPayments = this.partnerSelectedPayments.filter(p => !f.includes(p)); }

  // ─── Getters filtrés ──────────────────────────────────────────────────────

  get filteredAvailableAgencies(): string[] {
    const t = this.agencySearchFilter?.trim().toLowerCase() || '';
    return t ? this.availableAgencies.filter(a => a.toLowerCase().includes(t)) : this.availableAgencies;
  }

  get filteredAvailableServices(): string[] {
    const t = this.serviceSearchFilter?.trim().toLowerCase() || '';
    return t ? this.availableServices.filter(s => s.toLowerCase().includes(t)) : this.availableServices;
  }

  get filteredManualAvailableServices(): string[] {
    const t = this.manualServiceSearchFilter?.trim().toLowerCase() || '';
    return t ? this.manualAvailableServices.filter(s => s.toLowerCase().includes(t)) : this.manualAvailableServices;
  }

  get filteredManualAvailableStatuses(): string[] {
    const t = this.manualStatusSearchFilter?.trim().toLowerCase() || '';
    return t ? this.manualAvailableStatuses.filter(s => s.toLowerCase().includes(t)) : this.manualAvailableStatuses;
  }

  get filteredPartnerAvailableServices(): string[] {
    const t = this.partnerServiceSearchFilter?.trim().toLowerCase() || '';
    return t ? this.partnerAvailableServices.filter(s => s.toLowerCase().includes(t)) : this.partnerAvailableServices;
  }

  get filteredPartnerAvailableStatuses(): string[] {
    const t = this.partnerStatusSearchFilter?.trim().toLowerCase() || '';
    return t ? this.partnerAvailableStatuses.filter(s => s.toLowerCase().includes(t)) : this.partnerAvailableStatuses;
  }

  get filteredPartnerAvailablePayments(): string[] {
    const t = this.partnerPaymentSearchFilter?.trim().toLowerCase() || '';
    return t ? this.partnerAvailablePayments.filter(p => p.toLowerCase().includes(t)) : this.partnerAvailablePayments;
  }

  // ─── Compteurs lignes ─────────────────────────────────────────────────────

  getAgencyCount(agency: string): number {
    if (!this.agencySelectionData.length || !this.agencyColumn) return 0;
    return this.agencySelectionData.filter(r => r[this.agencyColumn!] === agency).length;
  }

  getServiceCount(service: string): number {
    if (!this.serviceSelectionData.length) return 0;
    const col = Object.keys(this.serviceSelectionData[0]).find(c => c.toLowerCase().includes('service') || c.toLowerCase().includes('serv'));
    return col ? this.serviceSelectionData.filter(r => r[col] === service).length : 0;
  }

  getManualServiceCount(service: string): number {
    if (!this.manualServiceSelectionData.length) return 0;
    const col = Object.keys(this.manualServiceSelectionData[0]).find(c => c.toLowerCase().includes('service') || c.toLowerCase().includes('serv'));
    return col ? this.manualServiceSelectionData.filter(r => r[col] === service).length : 0;
  }

  getManualStatusCount(status: string): number {
    if (!this.manualStatusSelectionData.length || !this.manualStatusColumn) return 0;
    return this.manualStatusSelectionData.filter(r => r[this.manualStatusColumn!] === status).length;
  }

  getPartnerServiceCount(service: string): number {
    if (!this.partnerServiceSelectionData.length || !this.partnerServiceColumn) return 0;
    return this.partnerServiceSelectionData.filter(r => r[this.partnerServiceColumn!] === service).length;
  }

  getPartnerStatusCount(status: string): number {
    if (!this.partnerStatusSelectionData.length || !this.partnerStatusColumn) return 0;
    return this.partnerStatusSelectionData.filter(r => r[this.partnerStatusColumn!] === status).length;
  }

  getPartnerPaymentCount(payment: string): number {
    if (!this.partnerPaymentSelectionData.length || !this.partnerPaymentColumn) return 0;
    return this.partnerPaymentSelectionData.filter(r => r[this.partnerPaymentColumn!] === payment).length;
  }

  /**
   * Vérifie si un nom de fichier correspond à un pattern
   * Supporte plusieurs modes de détection :
   * 1. Patterns avec wildcards (* et ?) - comportement classique
   * 2. Patterns avec extension - correspondance exacte avec extension
   * 3. Patterns simples - détection par inclusion (ex: "TRXBO" détecte "TRXBO_02082025.xlsx")
   * 4. Détection par préfixe - détection par début de nom
   */
  private matchesFilePattern(fileName: string, pattern: string): boolean {
    if (!pattern || !fileName) return false;
    
    console.log(`🔍 Test de correspondance: "${fileName}" vs pattern "${pattern}"`);
    
    const lowerName = fileName.toLowerCase();
    const lowerPattern = pattern.toLowerCase();
    
    // Extensions acceptées comme équivalentes
    const acceptedExtensions = ['.csv', '.xls', '.xlsx'];
    
    // Extraire les extensions
    const getExtension = (name: string): string => {
      const match = name.match(/\.[^/.]+$/);
      return match ? match[0] : '';
    };
    
    const fileNameExt = getExtension(lowerName);
    const patternExt = getExtension(lowerPattern);
    
    // Noms sans extension
    const nameNoExt = lowerName.replace(/\.[^/.]+$/, '');
    const patternNoExt = lowerPattern.replace(/\.[^/.]+$/, '');
    
    // Mode 1: Pattern avec wildcards
    if (patternNoExt.includes('*') || patternNoExt.includes('?')) {
      // Construire le regex à partir du pattern sans extension
      const regexPattern = patternNoExt
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      
      try {
        const regex = new RegExp(`^${regexPattern}$`, 'i');
        const matches = regex.test(nameNoExt);
        
        if (matches) {
          // Si le pattern a une extension, vérifier que l'extension du fichier est acceptée
          if (patternExt && acceptedExtensions.includes(patternExt)) {
            // Le pattern spécifie une extension, accepter les extensions équivalentes
            const fileExtAccepted = acceptedExtensions.includes(fileNameExt);
            console.log(`🔍 Test wildcard (sans extension): ✅ - Extension fichier: ${fileNameExt}, Extension acceptée: ${fileExtAccepted ? '✅' : '❌'}`);
            return fileExtAccepted;
          } else {
            // Le pattern n'a pas d'extension spécifique, accepter n'importe quelle extension
            console.log(`🔍 Test wildcard (sans extension): ✅`);
            return true;
          }
        } else {
          console.log(`🔍 Test wildcard (sans extension): ❌`);
          return false;
        }
      } catch (error) {
        console.warn('⚠️ Pattern wildcard invalide:', pattern);
        return false;
      }
    }
    
    // Mode 2: Pattern avec extension - correspondance exacte (insensible à la casse)
    // Exemple: pattern "pmmoovbf.xlsx" détecte "PMMOOVBF.xlsx" ou "PMMOOVBF.csv"
    if (patternExt && acceptedExtensions.includes(patternExt)) {
      // Si le pattern a une extension acceptée, tester sans extension puis vérifier l'extension
      if (nameNoExt === patternNoExt) {
        // Correspondance exacte du nom, vérifier que l'extension est acceptée
        const fileExtAccepted = acceptedExtensions.includes(fileNameExt);
        console.log(`🔍 Test correspondance exacte avec extension: ${fileExtAccepted ? '✅' : '❌'}`);
        return fileExtAccepted;
      }
    } else if (patternExt) {
      // Extension non standard, correspondance exacte stricte
      const exactMatch = lowerName === lowerPattern;
      console.log(`🔍 Test correspondance exacte avec extension: ${exactMatch ? '✅' : '❌'}`);
      if (exactMatch) {
        return true;
      }
    }
    
    // Mode 3: Pattern simple - détection par inclusion (sans extension)
    // Exemple: pattern "TRXBO" détecte "TRXBO_02082025.xlsx"
    const containsPattern = nameNoExt.includes(patternNoExt);
    console.log(`🔍 Test inclusion (sans extension): "${nameNoExt}" contient "${patternNoExt}": ${containsPattern ? '✅' : '❌'}`);
    
    if (containsPattern) {
      // Si le pattern avait une extension acceptée, vérifier que l'extension du fichier est aussi acceptée
      if (patternExt && acceptedExtensions.includes(patternExt)) {
        const fileExtAccepted = acceptedExtensions.includes(fileNameExt);
        return fileExtAccepted;
      }
      return true;
    }
    
    // Mode 4: Détection par préfixe (optionnel, pour plus de flexibilité)
    // Exemple: pattern "TRXBO" détecte "TRXBO_02082025.xlsx"
    const startsWithPattern = nameNoExt.startsWith(patternNoExt);
    console.log(`🔍 Test préfixe (sans extension): "${nameNoExt}" commence par "${patternNoExt}": ${startsWithPattern ? '✅' : '❌'}`);
    
    if (startsWithPattern) {
      // Si le pattern avait une extension acceptée, vérifier que l'extension du fichier est aussi acceptée
      if (patternExt && acceptedExtensions.includes(patternExt)) {
        const fileExtAccepted = acceptedExtensions.includes(fileNameExt);
        return fileExtAccepted;
      }
      return true;
    }
    
    return false;
  }

}
