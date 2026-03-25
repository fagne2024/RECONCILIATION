import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ReconciliationResponse } from '../../models/reconciliation-response.model';
import { AppStateService } from '../../services/app-state.service';
import { EcartBoSummaryService, EcartBoSummaryPrefill, EcartBoSummaryPendingLine } from '../../services/ecart-bo-summary.service';
import { PopupService } from '../../services/popup.service';
import { fixGarbledCharacters } from '../../utils/encoding-fixer';
import { ModernPopupComponent } from '../modern-popup/modern-popup.component';
import { RECONCILIATION_ENV_OPTIONS } from '../../constants/reconciliation-env-options';

export interface EcartBoSummaryItem {
  id?: number; // ID si l'item est sauvegardé
  date: string;
  agence: string;
  service: string;
  pays: string;
  nombre: number; // Nombre de lignes/transactions
  montant: number; // Montant total (pour référence)
  statut: 'ok' | 'en cours';
  /** Plateforme : BO ou Partenaire (données en plateforme partenaire) */
  env?: 'BO' | 'PARTENAIRE';
  /** Environnement technique : BET, HT, PROD, etc. */
  envCode?: string;
  originalRecords: Record<string, string>[]; // Tous les enregistrements pour ce service
  isManual?: boolean; // Indique si la ligne a été créée manuellement
  commentaire?: string; // Commentaire pour identifier l'origine
  linkedId?: number; // ID de la ligne liée (paire BO/PARTENAIRE)
  token?: string; // Lien entre lignes BO et PARTENAIRE (statut OK) pour recherche rapide
}

@Component({
  selector: 'app-ecart-bo-summary',
  templateUrl: './ecart-bo-summary.component.html',
  styleUrls: ['./ecart-bo-summary.component.scss']
})
export class EcartBoSummaryComponent implements OnInit, OnDestroy {
  response: ReconciliationResponse | null = null;
  summaryItems: EcartBoSummaryItem[] = [];
  filteredItems: EcartBoSummaryItem[] = [];
  private subscription = new Subscription();
  
  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalPages = 1;
  
  // Recherche
  searchKey: string = '';
  
  // Filtres
  selectedAgence: string = '';
  selectedService: string = '';
  selectedPays: string = '';
  selectedStatut: string = '';
  /** Filtre plateforme BO / PARTENAIRE */
  selectedEnv: string = '';
  /** Filtre ENV technique (BET, HT, …) */
  selectedEnvCode: string = '';
  selectedDateFrom: string = '';
  selectedDateTo: string = '';
  selectedToken: string = '';

  // Liste des valeurs uniques pour les filtres
  uniqueAgencies: string[] = [];
  uniqueServices: string[] = [];
  uniquePays: string[] = [];
  /** Valeurs pour le filtre / listes ENV (BET, HT, …) */
  uniqueEnvCodes: string[] = [];
  readonly envCodePresetOptions: readonly string[] = [...RECONCILIATION_ENV_OPTIONS];

  isLoading = false;
  isSaving = false;
  isDeleting = false;
  deletingItemId: number | null = null;
  isBulkDeleting = false;
  isExporting = false;
  /** IDs des lignes sélectionnées pour suppression en masse */
  selectedIds = new Set<number>();
  
  // Édition
  showEditModal = false;
  editingItem: EcartBoSummaryItem | null = null;
  editForm: {
    date: string;
    agence: string;
    service: string;
    pays: string;
    nombre: number;
    volume: number;
    statut: 'ok' | 'en cours';
    env: 'BO' | 'PARTENAIRE';
    envCode: string;
    token: string;
  } = {
    date: '',
    agence: '',
    service: '',
    pays: '',
    nombre: 0,
    volume: 0,
    statut: 'en cours',
    env: 'BO',
    envCode: '',
    token: ''
  };
  isUpdating = false;

  // Ajout
  showAddModal = false;
  addForm: {
    date: string;
    agence: string;
    service: string;
    pays: string;
    nombre: number;
    volume: number;
    statut: 'ok' | 'en cours';
    env: 'BO' | 'PARTENAIRE';
    envCode: string;
    token: string;
  } = {
    date: '',
    agence: '',
    service: '',
    pays: '',
    nombre: 0,
    volume: 0,
    statut: 'en cours',
    env: 'PARTENAIRE',
    envCode: '',
    token: ''
  };
  isAdding = false;

  /** True tant que l'utilisateur n'a pas choisi l'ENV (réconciliation ou lignes en attente écarts BO). */
  awaitingEnvChoice = false;
  /** Sélection temporaire dans le panneau pré-chargement. */
  pendingEnvSelection = '';
  /** ENV appliqué aux lignes générées (réconciliation / pending) et défaut du formulaire Ajouter. */
  sessionDefaultEnvCode = '';
  private pendingLinesBuffer: EcartBoSummaryPendingLine[] | null = null;
  private prefillBuffer: EcartBoSummaryPrefill | null = null;

  constructor(
    private appStateService: AppStateService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ecartBoSummaryService: EcartBoSummaryService,
    private popupService: PopupService
  ) {}

  ngOnInit(): void {
    this.refreshUniqueEnvCodes();
    const pendingLines = this.ecartBoSummaryService.getAndClearPendingLinesFromEcartBo();
    const prefill = this.ecartBoSummaryService.getAndClearPrefillFromMatches();

    this.subscription.add(
      this.appStateService.getReconciliationResults().subscribe((response: ReconciliationResponse | null) => {
        if (pendingLines && pendingLines.length > 0) {
          this.pendingLinesBuffer = pendingLines;
          this.prefillBuffer = prefill;
          this.awaitingEnvChoice = true;
          this.pendingEnvSelection = this.sessionDefaultEnvCode || '';
          this.cdr.markForCheck();
          return;
        }
        if (response) {
          this.response = response;
          this.prefillBuffer = prefill;
          this.awaitingEnvChoice = true;
          this.pendingEnvSelection = this.sessionDefaultEnvCode || '';
          this.cdr.markForCheck();
          return;
        }
        this.loadSavedSummaryData();
        if (prefill) {
          this.popupService
            .showSuccess(
              'Données prêtes. Le formulaire Écart BO Summary sera prérempli ; vous pouvez modifier et ajouter la ligne.'
            )
            .then(() => {
              this.openAddModalWithPrefill(prefill);
              this.cdr.markForCheck();
            });
        }
      })
    );
  }

  get envPreloadHint(): string {
    if (this.pendingLinesBuffer && this.pendingLinesBuffer.length > 0) {
      return `${this.pendingLinesBuffer.length} ligne(s) en attente depuis les écarts BO.`;
    }
    return 'Les écarts issus de la réconciliation en cours vont être chargés dans le tableau.';
  }

  /**
   * Après choix de l'ENV : construit les lignes (réconciliation ou pending) et éventuellement ouvre le préremplissage matches.
   */
  confirmEnvAndLoadData(): void {
    this.sessionDefaultEnvCode = (this.pendingEnvSelection || '').trim();
    this.awaitingEnvChoice = false;
    const prefill = this.prefillBuffer;
    this.prefillBuffer = null;

    if (this.pendingLinesBuffer && this.pendingLinesBuffer.length > 0) {
      const lines = this.pendingLinesBuffer;
      this.pendingLinesBuffer = null;
      this.applyPendingLinesFromEcartBo(lines);
      this.popupService.showSuccess(
        `${lines.length} ligne(s) prêtes (ENV : ${this.sessionDefaultEnvCode || 'T-E / non renseigné'}). Utilisez « Sauvegarder » pour enregistrer.`
      );
    } else if (this.response) {
      this.loadSummaryData();
    }

    if (prefill) {
      this.popupService
        .showSuccess(
          'Données prêtes. Le formulaire Écart BO Summary sera prérempli ; vous pouvez modifier et ajouter la ligne.'
        )
        .then(() => {
          this.openAddModalWithPrefill(prefill);
          this.cdr.markForCheck();
        });
    }
    this.cdr.markForCheck();
  }

  /** Lignes générées : env_code = choix session (vide = agrégat T-E côté relevé). */
  private getEnvCodeForNewRows(): string | undefined {
    const v = this.sessionDefaultEnvCode?.trim();
    return v || undefined;
  }

  /** Applique les lignes en attente venues de la page écarts BO (aucun enregistrement : l'utilisateur clique sur Sauvegarder pour enregistrer). */
  private applyPendingLinesFromEcartBo(pending: EcartBoSummaryPendingLine[]): void {
    this.summaryItems = pending.map(line => ({
      date: line.date || new Date().toISOString().split('T')[0],
      agence: line.agence || '',
      service: line.service || '',
      pays: line.pays || '',
      nombre: line.nombreTransactions ?? 1,
      montant: line.montant ?? 0,
      statut: 'en cours' as const,
      env: 'BO' as const,
      envCode: this.getEnvCodeForNewRows(),
      originalRecords: [],
      token: undefined
    } as EcartBoSummaryItem));
    this.uniqueAgencies = [...new Set(this.summaryItems.map(i => i.agence).filter(Boolean))].sort();
    this.uniqueServices = [...new Set(this.summaryItems.map(i => i.service).filter(Boolean))].sort();
    this.uniquePays = [...new Set(this.summaryItems.map(i => i.pays).filter(Boolean))].sort();
    this.refreshUniqueEnvCodes();
    this.filteredItems = [...this.summaryItems];
    this.updatePagination();
    this.cdr.markForCheck();
  }

  private refreshUniqueEnvCodes(): void {
    const fromItems = this.summaryItems
      .map(i => (i.envCode || '').trim())
      .filter((c): c is string => !!c);
    this.uniqueEnvCodes = [...new Set([...this.envCodePresetOptions, ...fromItems])].sort((a, b) =>
      a.localeCompare(b, 'fr')
    );
  }

  loadByToken(): void {
    const t = this.selectedToken?.trim();
    if (!t) {
      this.popupService.showWarning('❌ Saisissez un token pour rechercher.');
      return;
    }
    this.isLoading = true;
    this.cdr.markForCheck();
    this.ecartBoSummaryService.getEcartBoSummaries({ token: t }).pipe(
      finalize(() => {
        this.isLoading = false;
        this.cdr.markForCheck();
      })
    ).subscribe({
      next: (savedData) => {
        this.applySavedDataToSummary(savedData);
        this.filteredItems = [...this.summaryItems];
        this.updatePagination();
        this.popupService.showSuccess(`✅ ${this.summaryItems.length} ligne(s) trouvée(s) pour le token.`);
      },
      error: (err) => {
        console.error('Erreur recherche par token:', err);
        this.popupService.showError('❌ Erreur lors de la recherche par token.');
      }
    });
  }

  private applySavedDataToSummary(savedData: any[]): void {
    this.summaryItems = savedData.map(item => {
      const commentaire = item.commentaire || '';
      const isManual = commentaire.includes('Ajout manuel') || commentaire.includes('ajout manuel');
      const mapped: any = {
        id: item.id,
        date: item.dateTransaction || '',
        agence: item.agence || 'Non spécifié',
        service: item.service || 'Non spécifié',
        pays: item.pays || 'Non spécifié',
        nombre: item.nombreTransactions || 0,
        montant: item.montantTotal || 0,
        statut: (item.statut === 'OK' ? 'ok' : 'en cours') as 'ok' | 'en cours',
        env: (item.env === 'BO' ? 'BO' : (item.env === 'PARTENAIRE' ? 'PARTENAIRE' : 'BO')) as 'BO' | 'PARTENAIRE',
        envCode: item.envCode != null && String(item.envCode).trim() !== '' ? String(item.envCode).trim() : undefined,
        originalRecords: [],
        isManual,
        commentaire,
        token: item.token || undefined
      };
      // Snapshots pour éviter des updates "inutiles" (rafales) lors du linking automatique
      mapped.__originalStatut = mapped.statut;
      mapped.__originalToken = mapped.token;
      return mapped as EcartBoSummaryItem;
    });
    this.uniqueAgencies = [...new Set(this.summaryItems.map(i => i.agence).filter(Boolean))].sort();
    this.uniqueServices = [...new Set(this.summaryItems.map(i => i.service).filter(Boolean))].sort();
    this.uniquePays = [...new Set(this.summaryItems.map(i => i.pays).filter(Boolean))].sort();
    this.refreshUniqueEnvCodes();
    this.linkMatchingPairs();
  }

  loadSavedSummaryData(): void {
    this.awaitingEnvChoice = false;
    this.pendingLinesBuffer = null;
    this.prefillBuffer = null;
    this.isLoading = true;
    this.cdr.markForCheck();

    this.ecartBoSummaryService.getEcartBoSummaries().subscribe({
      next: (savedData) => {
        console.log('Données sauvegardées chargées:', savedData);
        this.applySavedDataToSummary(savedData);
        this.filteredItems = [...this.summaryItems];
        this.updatePagination();
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des données sauvegardées:', error);
        this.isLoading = false;
        this.cdr.markForCheck();
        // En cas d'erreur, essayer de charger depuis les données de réconciliation
        if (this.response) {
          this.loadSummaryData();
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    // Nettoyer le timer de debounce
    if (this.updateLinkedItemsStatusDebounceTimer) {
      clearTimeout(this.updateLinkedItemsStatusDebounceTimer);
      this.updateLinkedItemsStatusDebounceTimer = null;
    }
    // Vider la liste des mises à jour en attente
    this.pendingStatusUpdates = [];
  }

  private loadSummaryData(): void {
    this.isLoading = true;
    this.cdr.markForCheck();
    
    try {
      const mismatches = this.response?.mismatches || [];
      const boOnly = this.response?.boOnly || [];
      const allData = [...mismatches, ...boOnly];
      
      // Fonction helper pour extraire les valeurs
      const getValue = (record: Record<string, string>, keys: string[]): string => {
        for (const key of keys) {
          const originalKey = Object.keys(record).find(k => 
            fixGarbledCharacters(k).toLowerCase() === key.toLowerCase() || 
            k.toLowerCase() === key.toLowerCase()
          );
          if (originalKey && record[originalKey]) {
            return record[originalKey].toString();
          }
          if (record[key]) {
            return record[key].toString();
          }
        }
        return '';
      };

      // Regrouper par agence + service + pays : une ligne par combinaison (agrégat nombre + volume)
      const dateKeys = ['Date', 'date', 'DATE', 'jour', 'Jour', 'JOUR', 'dateTransaction', 'DateTransaction'];
      const montantKeys = ['montant', 'Montant', 'MONTANT', 'amount', 'Amount', 'volume', 'Volume', 'VOLUME'];
      const agenceKeys = ['Agence', 'agence', 'AGENCE', 'agency', 'Agency'];
      const serviceKeys = ['Service', 'service', 'SERVICE', 'serv', 'Serv'];
      const paysKeys = ['Pays', 'pays', 'PAYS', 'country', 'Country', 'GRX', 'grx'];

      const groupedByAgence = new Map<string, {
        agence: string;
        service: string;
        pays: string;
        date: string;
        records: Record<string, string>[];
        totalMontant: number;
      }>();

      allData.forEach(record => {
        const agence = getValue(record, agenceKeys) || 'Non spécifié';
        const service = getValue(record, serviceKeys) || 'Non spécifié';
        const pays = getValue(record, paysKeys) || 'Non spécifié';
        const date = getValue(record, dateKeys) || '';
        const montantStr = getValue(record, montantKeys);
        const montant = montantStr ? parseFloat(montantStr.toString().replace(',', '.')) : 0;
        const key = `${agence}|${service}|${pays}`;

        if (!groupedByAgence.has(key)) {
          groupedByAgence.set(key, {
            agence,
            service,
            pays,
            date,
            records: [],
            totalMontant: 0
          });
        }
        const group = groupedByAgence.get(key)!;
        group.records.push(record);
        group.totalMontant += isNaN(montant) ? 0 : montant;
      });

      // Pour multiAgence : une ligne par enregistrement (pas de regroupement). Sinon : une ligne par groupe.
      const items: EcartBoSummaryItem[] = [];
      for (const group of groupedByAgence.values()) {
        if (group.agence === 'multiAgence' && group.records.length > 0) {
          for (const record of group.records) {
            const agence = getValue(record, agenceKeys) || group.agence;
            const service = getValue(record, serviceKeys) || group.service;
            const pays = getValue(record, paysKeys) || group.pays;
            const date = getValue(record, dateKeys) || group.date;
            const montantStr = getValue(record, montantKeys);
            const montant = montantStr ? parseFloat(montantStr.toString().replace(',', '.')) : 0;
            items.push({
              date,
              agence,
              service,
              pays,
              nombre: 1,
              montant,
              statut: 'en cours',
              env: 'BO',
              envCode: this.getEnvCodeForNewRows(),
              originalRecords: [record],
              token: undefined
            } as EcartBoSummaryItem);
          }
        } else {
          items.push({
            date: group.date,
            agence: group.agence,
            service: group.service,
            pays: group.pays,
            nombre: group.records.length,
            montant: group.totalMontant,
            statut: 'en cours',
            env: 'BO',
            envCode: this.getEnvCodeForNewRows(),
            originalRecords: group.records,
            token: undefined
          } as EcartBoSummaryItem);
        }
      }
      this.summaryItems = items;

      // Lier les paires correspondantes (BO/PARTENAIRE) et mettre à jour les statuts
      this.linkMatchingPairs();

      // Extraire les valeurs uniques pour les filtres
      this.uniqueAgencies = [...new Set(this.summaryItems.map(item => item.agence).filter(a => a))].sort();
      this.uniqueServices = [...new Set(this.summaryItems.map(item => item.service).filter(s => s))].sort();
      this.uniquePays = [...new Set(this.summaryItems.map(item => item.pays).filter(p => p))].sort();
      this.refreshUniqueEnvCodes();

      this.filteredItems = [...this.summaryItems];
      this.updatePagination();
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
    }
  }

  onSearch(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = [...this.summaryItems];

    // Filtre par recherche textuelle
    if (this.searchKey && this.searchKey.trim()) {
      const searchTerm = this.searchKey.toLowerCase().trim();
      filtered = filtered.filter(item =>
        item.date.toLowerCase().includes(searchTerm) ||
        item.agence.toLowerCase().includes(searchTerm) ||
        item.service.toLowerCase().includes(searchTerm) ||
        item.pays.toLowerCase().includes(searchTerm) ||
        item.statut.toLowerCase().includes(searchTerm) ||
        (item.env || '').toLowerCase().includes(searchTerm) ||
        (item.envCode || '').toLowerCase().includes(searchTerm) ||
        item.nombre.toString().includes(searchTerm) ||
        (item.token || '').toLowerCase().includes(searchTerm)
      );
    }

    // Filtre par token (recherche rapide liaison BO / Partenaire)
    if (this.selectedToken && this.selectedToken.trim()) {
      const tokenTerm = this.selectedToken.trim().toLowerCase();
      filtered = filtered.filter(item => (item.token || '').toLowerCase().includes(tokenTerm));
    }

    // Filtre par agence
    if (this.selectedAgence) {
      filtered = filtered.filter(item => item.agence === this.selectedAgence);
    }

    // Filtre par service
    if (this.selectedService) {
      filtered = filtered.filter(item => item.service === this.selectedService);
    }

    // Filtre par pays
    if (this.selectedPays) {
      filtered = filtered.filter(item => item.pays === this.selectedPays);
    }

    // Filtre par statut
    if (this.selectedStatut) {
      filtered = filtered.filter(item => item.statut === this.selectedStatut);
    }

    // Filtre plateforme (BO / PARTENAIRE)
    if (this.selectedEnv) {
      filtered = filtered.filter(item => item.env === this.selectedEnv);
    }

    // Filtre ENV technique (BET, HT, …)
    if (this.selectedEnvCode) {
      filtered = filtered.filter(item => (item.envCode || '').trim() === this.selectedEnvCode);
    }

    // Filtre par date (du - au)
    if (this.selectedDateFrom) {
      const dateFrom = new Date(this.selectedDateFrom);
      filtered = filtered.filter(item => {
        if (!item.date) return false;
        const itemDate = new Date(item.date.split('T')[0]); // Prendre seulement la partie date
        return itemDate >= dateFrom;
      });
    }

    if (this.selectedDateTo) {
      const dateTo = new Date(this.selectedDateTo);
      dateTo.setHours(23, 59, 59, 999); // Fin de journée
      filtered = filtered.filter(item => {
        if (!item.date) return false;
        const itemDate = new Date(item.date.split('T')[0]); // Prendre seulement la partie date
        return itemDate <= dateTo;
      });
    }

    this.filteredItems = filtered;
    this.currentPage = 1;
    this.updatePagination();
  }

  onStatutChange(item: EcartBoSummaryItem, newStatut: 'ok' | 'en cours'): void {
    item.statut = newStatut;
    
    // Si la ligne est liée, mettre à jour aussi la ligne liée
    if (item.linkedId) {
      const linkedItem = this.summaryItems.find(i => i.id === item.linkedId);
      if (linkedItem) {
        linkedItem.statut = newStatut;
      }
    }
    
    this.cdr.markForCheck();
    // Ici vous pouvez ajouter une logique pour sauvegarder le changement si nécessaire
  }

  /**
   * Lie les paires de lignes correspondantes (BO et PARTENAIRE) avec les mêmes infos
   * et un intervalle de date de 1 jour maximum, puis met leur statut à "OK"
   * Gère aussi les correspondances un-à-plusieurs pour multiAgence
   */
  linkMatchingPairs(): void {
    const itemsToUpdate: EcartBoSummaryItem[] = [];
    
    // Étape 1: Correspondance un-à-un (logique existante)
    for (let i = 0; i < this.summaryItems.length; i++) {
      const item1 = this.summaryItems[i];
      
      // Ignorer si déjà lié ou pas d'ENV (autoriser sans id pour affichage en mémoire)
      if (item1.linkedId || !item1.env) {
        continue;
      }
      
      for (let j = i + 1; j < this.summaryItems.length; j++) {
        const item2 = this.summaryItems[j];
        
        // Ignorer si déjà lié ou pas d'ENV
        if (item2.linkedId || !item2.env) {
          continue;
        }
        
        // Vérifier si les deux lignes ont des ENV différents
        if (item1.env === item2.env) {
          continue;
        }
        
        // Vérifier si les informations correspondent (agence, service, pays, nombre)
        if (item1.agence === item2.agence &&
            item1.service === item2.service &&
            item1.pays === item2.pays &&
            item1.nombre === item2.nombre) {
          
          // Vérifier l'intervalle de date (1 jour calendaire maximum, pas 24h)
          const date1 = this.parseDate(item1.date);
          const date2 = this.parseDate(item2.date);
          
          if (date1 && date2) {
            // Extraire les jours calendaires (ignorer l'heure)
            const day1 = this.getCalendarDay(date1);
            const day2 = this.getCalendarDay(date2);
            
            // Calculer la différence en jours calendaires
            const diffCalendarDays = Math.abs(day1 - day2);
            
            if (diffCalendarDays <= 1) {
              item1.linkedId = item2.id;
              item2.linkedId = item1.id;
              const linkToken = (item1.token && item2.token && item1.token === item2.token)
                ? item1.token
                : `LINK-${Date.now()}-${item1.id ?? 'A'}-${item2.id ?? 'B'}`;
              item1.token = linkToken;
              item2.token = linkToken;

              if (item1.statut !== 'ok') item1.statut = 'ok';
              if (item2.statut !== 'ok') item2.statut = 'ok';
              const item1Any: any = item1 as any;
              const item2Any: any = item2 as any;
              const item1Changed = item1Any.__originalStatut !== item1.statut || item1Any.__originalToken !== item1.token;
              const item2Changed = item2Any.__originalStatut !== item2.statut || item2Any.__originalToken !== item2.token;
              if (item1Changed && item1.id) itemsToUpdate.push(item1);
              if (item2Changed && item2.id) itemsToUpdate.push(item2);

              console.log(`✅ Lignes liées: ${item1.id} (${item1.env}) <-> ${item2.id} (${item2.env}) token=${linkToken}`);
              break;
            }
          }
        }
      }
    }
    
    // Étape 2: Correspondance un-à-plusieurs pour multiAgence
    // Une ligne PARTENAIRE (multiAgence) peut correspondre à plusieurs lignes BO
    const usedBoItemIds = new Set<number>();
    const usedBoItemRefs = new Set<EcartBoSummaryItem>(); // pour les lignes sans id (affichage en mémoire)
    
    for (const partenaireItem of this.summaryItems) {
      if (partenaireItem.linkedId || partenaireItem.env !== 'PARTENAIRE') {
        continue;
      }
      
      const matchingBoItems: EcartBoSummaryItem[] = [];
      let totalNombre = 0;
      
      console.log(`🔍 Recherche correspondance pour PARTENAIRE: ID=${partenaireItem.id}, Date=${partenaireItem.date}, Service=${partenaireItem.service}, Pays=${partenaireItem.pays}, Nombre=${partenaireItem.nombre}`);
      
      for (const boItem of this.summaryItems) {
        const boAlreadyUsed = boItem.id ? usedBoItemIds.has(boItem.id) : usedBoItemRefs.has(boItem);
        if (boItem.linkedId || boItem.env !== 'BO' || boAlreadyUsed) {
          continue;
        }
        
        // Vérifier service et pays
        if (boItem.service === partenaireItem.service && 
            boItem.pays === partenaireItem.pays) {
          
          // Vérifier la date (j+1 : la date BO doit être exactement 1 jour après la date PARTENAIRE)
          const partenaireDate = this.parseDate(partenaireItem.date);
          const boDate = this.parseDate(boItem.date);
          
          if (partenaireDate && boDate) {
            const partenaireDay = this.getCalendarDay(partenaireDate);
            const boDay = this.getCalendarDay(boDate);
            
            // La date BO doit être j+1 par rapport à la date PARTENAIRE (BO = PARTENAIRE + 1 jour)
            const diffCalendarDays = boDay - partenaireDay;
            
            console.log(`  📅 BO candidat: ID=${boItem.id}, Date=${boItem.date}, Nombre=${boItem.nombre}, Diff=${diffCalendarDays} jours (BO - PARTENAIRE)`);
            
            if (diffCalendarDays === 1) {
              // Cette ligne BO est candidate
              matchingBoItems.push(boItem);
              totalNombre += boItem.nombre;
              console.log(`    ✅ Ajouté comme candidat (Total actuel: ${totalNombre})`);
            }
          }
        }
      }
      
      console.log(`📊 Résultat pour PARTENAIRE ${partenaireItem.id}: ${matchingBoItems.length} ligne(s) BO trouvée(s), Total nombre=${totalNombre}, Attendu=${partenaireItem.nombre}`);
      
      if (matchingBoItems.length > 0 && totalNombre === partenaireItem.nombre) {
        const boIds = matchingBoItems.map(i => i.id).filter((id): id is number => id != null).join('-') || 'x';
        const existing = partenaireItem.token && matchingBoItems.every(b => b.token === partenaireItem.token)
          ? partenaireItem.token
          : null;
        const linkToken = existing || `LINK-${Date.now()}-P${partenaireItem.id ?? 'x'}-B${boIds}`;
        partenaireItem.token = linkToken;
        if (partenaireItem.statut !== 'ok') partenaireItem.statut = 'ok';
        const partenaireAny: any = partenaireItem as any;
        const partenaireChanged = partenaireAny.__originalStatut !== partenaireItem.statut || partenaireAny.__originalToken !== partenaireItem.token;
        if (partenaireChanged && partenaireItem.id) itemsToUpdate.push(partenaireItem);

        for (const boItem of matchingBoItems) {
          boItem.token = linkToken;
          if (boItem.statut !== 'ok') boItem.statut = 'ok';
          const boAny: any = boItem as any;
          const boChanged = boAny.__originalStatut !== boItem.statut || boAny.__originalToken !== boItem.token;
          if (boChanged && boItem.id) itemsToUpdate.push(boItem);
          if (boItem.id) usedBoItemIds.add(boItem.id);
          else usedBoItemRefs.add(boItem);
        }

        console.log(`✅ Correspondance un-à-plusieurs: ${partenaireItem.id} (PARTENAIRE) <-> ${matchingBoItems.length} ligne(s) BO (${boIds}) token=${linkToken}`);
      } else if (matchingBoItems.length > 0) {
        console.log(`⚠️ Correspondance partielle trouvée mais total ne correspond pas: ${totalNombre} ≠ ${partenaireItem.nombre}`);
      }
    }
    
    // Sauvegarder les changements de statut en base de données
    if (itemsToUpdate.length > 0) {
      this.updateLinkedItemsStatus(itemsToUpdate);
    }
  }

  /**
   * Parse une date depuis différents formats
   */
  private parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;
    
    try {
      // Essayer différents formats
      if (dateStr.includes('T')) {
        return new Date(dateStr);
      }
      
      // Format YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        return new Date(dateStr);
      }
      
      // Format avec heures
      if (dateStr.includes(' ')) {
        return new Date(dateStr.replace(' ', 'T'));
      }
      
      return new Date(dateStr);
    } catch (e) {
      console.error('Erreur lors du parsing de la date:', dateStr, e);
      return null;
    }
  }

  /**
   * Obtient le numéro du jour calendaire (nombre de jours depuis l'époque)
   * Utilisé pour comparer les dates en jours calendaires plutôt qu'en heures
   */
  private getCalendarDay(date: Date): number {
    // Créer une date à minuit pour normaliser
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    // Retourner le nombre de jours depuis l'époque (1er janvier 1970)
    return Math.floor(normalizedDate.getTime() / (1000 * 60 * 60 * 24));
  }

  // Debounce pour éviter les appels répétés
  private updateLinkedItemsStatusDebounceTimer: any = null;
  private pendingStatusUpdates: EcartBoSummaryItem[] = [];

  /**
   * Met à jour le statut des lignes liées en base de données
   * Avec debounce et gestion du rate limiting
   */
  private async updateLinkedItemsStatus(items: EcartBoSummaryItem[]): Promise<void> {
    const validItems = items.filter(item => item.id && item.id > 0);
    
    if (validItems.length === 0) {
      return; // Aucun item valide à mettre à jour
    }

    // Ajouter les items à la liste des mises à jour en attente
    this.pendingStatusUpdates.push(...validItems);
    
    // Débouncer les appels pour éviter les requêtes excessives
    if (this.updateLinkedItemsStatusDebounceTimer) {
      clearTimeout(this.updateLinkedItemsStatusDebounceTimer);
    }
    
    this.updateLinkedItemsStatusDebounceTimer = setTimeout(async () => {
      await this.processPendingStatusUpdates();
    }, 900); // Laisser retomber les rafales avant les PUT
  }

  /**
   * Traite les mises à jour de statut en attente avec gestion du rate limiting
   */
  private async processPendingStatusUpdates(): Promise<void> {
    if (this.pendingStatusUpdates.length === 0) {
      return;
    }

    // Dédupliquer les items par ID
    const uniqueItems = new Map<number, EcartBoSummaryItem>();
    for (const item of this.pendingStatusUpdates) {
      if (item.id && !uniqueItems.has(item.id)) {
        uniqueItems.set(item.id, item);
      }
    }
    
    const itemsToUpdate = Array.from(uniqueItems.values());
    this.pendingStatusUpdates = []; // Vider la liste des mises à jour en attente

    // Un PUT à la fois + pause (évite 429 : le filtre backend compte chaque requête)
    const throttleMs = 350;
    for (let i = 0; i < itemsToUpdate.length; i++) {
      await this.updateSingleItemStatus(itemsToUpdate[i]);
      if (i < itemsToUpdate.length - 1) {
        await new Promise(resolve => setTimeout(resolve, throttleMs));
      }
    }
  }

  /**
   * Met à jour le statut d'un seul item (retry 429 géré dans EcartBoSummaryService).
   */
  private async updateSingleItemStatus(item: EcartBoSummaryItem): Promise<void> {
    if (!item.id || item.id <= 0) {
      return;
    }

    try {
      const updateData: any = {
        statut: 'OK',
        env: item.env || 'BO'
      };
      if (item.envCode != null && String(item.envCode).trim() !== '') {
        updateData.envCode = String(item.envCode).trim();
      }
      if (item.token) {
        updateData.token = item.token;
      }

      await firstValueFrom(
        this.ecartBoSummaryService.updateEcartBoSummary(item.id, updateData)
      );

      const itemAny = item as any;
      itemAny.__originalStatut = item.statut;
      itemAny.__originalToken = item.token;
      console.log(`✅ Statut${item.token ? ' et token' : ''} mis à jour pour la ligne ${item.id}`);
    } catch (error: any) {
      if (error.status === 404) {
        return;
      }
      console.error(`❌ Erreur lors de la mise à jour du statut pour la ligne ${item.id}:`, error);
    }
  }

  getPagedItems(): EcartBoSummaryItem[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredItems.slice(start, start + this.pageSize);
  }

  updatePagination(): void {
    this.totalPages = Math.max(1, Math.ceil(this.filteredItems.length / this.pageSize));
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.cdr.markForCheck();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.cdr.markForCheck();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.cdr.markForCheck();
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    
    if (this.totalPages <= maxVisible) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      let start = Math.max(1, this.currentPage - 2);
      let end = Math.min(this.totalPages, start + maxVisible - 1);
      
      if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1);
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.updatePagination();
    this.cdr.markForCheck();
  }

  // Exposer Math pour le template
  Math = Math;

  /**
   * Calcule le total de la colonne "nombre" pour les items filtrés
   */
  getTotalNombre(): number {
    return this.filteredItems.reduce((total, item) => total + (item.nombre || 0), 0);
  }

  /**
   * Calcule le total de la colonne "volume" pour les items filtrés
   */
  getTotalVolume(): number {
    return this.filteredItems.reduce((total, item) => total + (item.montant || 0), 0);
  }

  clearFilters(): void {
    this.searchKey = '';
    this.selectedAgence = '';
    this.selectedService = '';
    this.selectedPays = '';
    this.selectedStatut = '';
    this.selectedEnv = '';
    this.selectedEnvCode = '';
    this.selectedDateFrom = '';
    this.selectedDateTo = '';
    this.selectedToken = '';
    this.applyFilters();
  }

  goBack(): void {
    this.router.navigate(['/ecart-bo']);
  }

  getStatutClass(statut: string): string {
    return statut === 'ok' ? 'statut-ok' : 'statut-en-cours';
  }

  /**
   * Affiche uniquement la partie timestamp du token (ex. LINK-1769214369692-1-2 → 1769214369692).
   * Si le token n'est pas au format LINK-*, on affiche le token complet.
   */
  getTokenDisplay(token: string | undefined): string {
    if (!token || !token.trim()) return '-';
    const t = token.trim();
    if (t.startsWith('LINK-')) {
      const parts = t.split('-');
      return parts[1] ?? t;
    }
    return t;
  }

  openEditModal(item: EcartBoSummaryItem): void {
    this.editingItem = item;
    this.editForm = {
      date: item.date || '',
      agence: item.agence || '',
      service: item.service || '',
      pays: item.pays || '',
      nombre: item.nombre || 0,
      volume: item.montant || 0,
      statut: item.statut || 'en cours',
      env: item.env || 'BO',
      envCode: item.envCode || '',
      token: item.token || ''
    };
    this.showEditModal = true;
    this.cdr.markForCheck();
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingItem = null;
    this.editForm = { date: '', agence: '', service: '', pays: '', nombre: 0, volume: 0, statut: 'en cours', env: 'BO', envCode: '', token: '' };
    this.cdr.markForCheck();
  }

  async updateItem(): Promise<void> {
    if (!this.editingItem) {
      return;
    }

    // Validation
    if (!this.editForm.agence || !this.editForm.service || !this.editForm.pays) {
      this.popupService.showWarning('❌ Veuillez remplir tous les champs obligatoires.');
      return;
    }

    this.isUpdating = true;
    this.cdr.markForCheck();

    try {
      // Si c'est un item sauvegardé (avec ID), mettre à jour via l'API
      if (this.editingItem.id) {
        // Formater la date pour le backend
        const formatDateForBackend = (dateStr: string): string => {
          if (!dateStr) return new Date().toISOString();
          if (dateStr.includes('T')) return dateStr;
          if (dateStr.includes('-')) {
            const cleanedDate = dateStr.replace(/\.\d+$/, '');
            return cleanedDate.replace(' ', 'T');
          }
          const parsedDate = new Date(dateStr);
          if (!isNaN(parsedDate.getTime())) {
            return parsedDate.toISOString();
          }
          return new Date().toISOString();
        };

        const updatedData: any = {
          dateTransaction: formatDateForBackend(this.editForm.date),
          agence: this.editForm.agence,
          service: this.editForm.service,
          pays: this.editForm.pays,
          nombreTransactions: this.editForm.nombre,
          montantTotal: this.editForm.volume || 0,
          statut: this.editForm.statut === 'ok' ? 'OK' : 'EN_COURS',
          env: this.editForm.env || 'BO',
          envCode: this.editForm.envCode != null && this.editForm.envCode.trim() !== '' ? this.editForm.envCode.trim() : ''
        };
        if (this.editForm.token !== undefined) {
          updatedData.token = this.editForm.token && this.editForm.token.trim() ? this.editForm.token.trim() : null;
        }

        const updated = await firstValueFrom(this.ecartBoSummaryService.updateEcartBoSummary(this.editingItem.id, updatedData));
        
        this.editingItem.date = updated.dateTransaction || this.editForm.date;
        this.editingItem.agence = updated.agence || this.editForm.agence;
        this.editingItem.service = updated.service || this.editForm.service;
        this.editingItem.pays = updated.pays || this.editForm.pays;
        this.editingItem.nombre = updated.nombreTransactions || this.editForm.nombre;
        this.editingItem.montant = updated.montantTotal || this.editForm.volume || 0;
        this.editingItem.statut = (updated.statut === 'OK' ? 'ok' : 'en cours') as 'ok' | 'en cours';
        this.editingItem.token = updated.token || undefined;
        this.editingItem.envCode =
          updated.envCode != null && String(updated.envCode).trim() !== ''
            ? String(updated.envCode).trim()
            : undefined;
        
        // Mettre à jour aussi dans summaryItems
        const index = this.summaryItems.findIndex(item => item.id === this.editingItem!.id);
        if (index >= 0) {
          this.summaryItems[index] = { ...this.editingItem };
        }
        
        // Vérifier si la ligne modifiée peut être liée à une autre
        this.linkMatchingPairs();
        this.refreshUniqueEnvCodes();
      } else {
        // Si c'est un item non sauvegardé (données de réconciliation), mettre à jour localement
        this.editingItem.date = this.editForm.date;
        this.editingItem.agence = this.editForm.agence;
        this.editingItem.service = this.editForm.service;
        this.editingItem.pays = this.editForm.pays;
        this.editingItem.nombre = this.editForm.nombre;
        this.editingItem.montant = this.editForm.volume || 0;
        this.editingItem.statut = this.editForm.statut;
        this.editingItem.env = this.editForm.env;
        this.editingItem.envCode =
          this.editForm.envCode != null && this.editForm.envCode.trim() !== ''
            ? this.editForm.envCode.trim()
            : undefined;
        
        // Vérifier si la ligne modifiée peut être liée à une autre
        this.linkMatchingPairs();
        
        // Mettre à jour aussi dans summaryItems
        const index = this.summaryItems.findIndex(item => 
          item.agence === this.editingItem!.agence && 
          item.service === this.editingItem!.service && 
          item.pays === this.editingItem!.pays &&
          !item.id
        );
        if (index >= 0) {
          this.summaryItems[index] = { ...this.editingItem };
        }
        this.refreshUniqueEnvCodes();
      }
      
      // Réappliquer les filtres après modification
      this.applyFilters();

      this.popupService.showSuccess('✅ Ligne modifiée avec succès !');
      this.closeEditModal();
    } catch (error: any) {
      console.error('Erreur lors de la modification:', error);
      this.popupService.showError(`❌ Erreur: ${error.message || 'Erreur inconnue lors de la modification'}`);
    } finally {
      this.isUpdating = false;
      this.cdr.markForCheck();
    }
  }

  async saveData(): Promise<void> {
    // Sauvegarder uniquement les lignes affichées sur la page courante
    const displayedItems = this.getPagedItems();
    if (displayedItems.length === 0) {
      this.popupService.showWarning('❌ Aucune donnée à sauvegarder.');
      return;
    }

    const itemsToSave = displayedItems.filter(item => item.statut === 'en cours');
    
    if (itemsToSave.length === 0) {
      this.popupService.showWarning('❌ Aucun écart avec statut "en cours" parmi les lignes affichées.');
      return;
    }

    // Date par défaut : J-1 (hier)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const defaultDate = yesterday.toISOString().split('T')[0];
    
    const selectedDate = await this.popupService.showDateInput(
      `Veuillez sélectionner la date à appliquer aux ${itemsToSave.length} ligne(s) affichée(s) (page courante) :`,
      'Sélection de la date pour la sauvegarde',
      defaultDate
    );

    if (!selectedDate) {
      return;
    }

    const confirmed = await this.popupService.showConfirm(
      `📋 ${itemsToSave.length} ligne(s) affichée(s) (page courante) seront sauvegardées avec la date ${selectedDate}. Continuer ?`,
      'Confirmation de sauvegarde'
    );

    if (!confirmed) return;

    this.isSaving = true;
    this.cdr.markForCheck();

    try {
      // Préparer les données regroupées par agence + service + pays pour la sauvegarde
      const serviceSummaryData = itemsToSave.map((item) => ({
        agence: item.agence,
        service: item.service,
        pays: item.pays,
        montant: item.montant, // Montant total
        date: item.date,
        statut: item.statut === 'ok' ? 'OK' : 'EN_COURS',
        nombreTransactions: item.nombre, // Nombre de lignes/transactions
        env: item.env || 'BO',
        ...(item.envCode != null && String(item.envCode).trim() !== ''
          ? { envCode: String(item.envCode).trim() }
          : {})
      }));

      if (serviceSummaryData.length === 0) {
        this.popupService.showWarning('❌ Aucune donnée valide trouvée pour la sauvegarde.');
        return;
      }

      // Fonction pour formater la date au format ISO
      const formatDateForBackend = (dateStr: string): string => {
        if (!dateStr) return new Date().toISOString();
        
        // Si la date contient déjà des caractères de format date (tirets, T, espaces suivis de chiffres)
        if (dateStr.includes('-') || dateStr.includes('T') || /\d{4}/.test(dateStr)) {
          // Si la date est déjà au format ISO, la retourner
          if (dateStr.includes('T')) return dateStr;
          
          // Convertir le format "2025-07-09 12:40:18.0" en "2025-07-09T12:40:18"
          const cleanedDate = dateStr.replace(/\.\d+$/, ''); // Enlever les millisecondes
          return cleanedDate.replace(' ', 'T');
        }
        
        // Vérifier si c'est un numéro de série Excel pur
        const numValue = parseFloat(dateStr);
        if (!isNaN(numValue) && numValue > 0 && numValue < 100000) {
          // C'est probablement un numéro de série Excel
          const excelEpoch = new Date(1900, 0, 1).getTime();
          const millisecondsPerDay = 86400000;
          const jsDate = new Date(excelEpoch + (numValue - 2) * millisecondsPerDay);
          return jsDate.toISOString();
        }
        
        // Essayer de parser la date normalement
        const parsedDate = new Date(dateStr);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate.toISOString();
        }
        
        // Par défaut, retourner la date actuelle
        return new Date().toISOString();
      };

      // Formater les dates dans les données - utiliser la date sélectionnée pour toutes les lignes
      const formattedData = serviceSummaryData.map(item => ({
        ...item,
        date: formatDateForBackend(selectedDate) // Utiliser la date sélectionnée au lieu de item.date
      }));

      const result = await this.ecartBoSummaryService.saveEcartBoSummary(formattedData);
      
      // Construire le message de résultat avec les informations sur les doublons
      if (result.duplicates > 0) {
        let message = `⚠️ DOUBLONS DÉTECTÉS LORS DE LA SAUVEGARDE\n\n`;
        message += `📊 Résumé:\n`;
        message += `  ✅ Enregistrements créés: ${result.count}\n`;
        message += `  ❌ Doublons détectés: ${result.duplicates}\n`;
        message += `  📥 Total reçu: ${result.totalReceived}\n\n`;
        message += `📋 DÉTAILS DES DOUBLONS:\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        
        if (result.duplicateRecords && result.duplicateRecords.length > 0) {
          result.duplicateRecords.forEach((dup, index) => {
            message += `${index + 1}. ${dup.message}\n`;
            if (index < result.duplicateRecords.length - 1) {
              message += `\n`;
            }
          });
        }
        
        message += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `ℹ️ Les doublons sont détectés sur la base de:\n`;
        message += `   • Date de transaction\n`;
        message += `   • Agence\n`;
        message += `   • Service\n`;
        message += `   • Pays\n`;
        message += `   • Nombre de transactions`;
        
        // Afficher un message d'avertissement avec les détails
        await this.popupService.showWarning(message, '⚠️ Doublons détectés');
      } else {
        const count = itemsToSave.length;
        const message = `✅ ${count} ligne(s) affichée(s) (page courante) sauvegardée(s) avec succès !`;
        await this.popupService.showSuccess(message);
      }
      
      // Optionnel: recharger les données sauvegardées après la sauvegarde
      // this.loadSavedSummaryData();
      
      this.cdr.markForCheck();
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      this.popupService.showError(`❌ Erreur: ${error.message || 'Erreur inconnue lors de la sauvegarde'}`);
    } finally {
      this.isSaving = false;
      this.cdr.markForCheck();
    }
  }

  openAddModal(): void {
    const today = new Date();
    const defaultEnv = this.ecartBoSummaryService.getDefaultEnvForAddModal();
    this.addForm = {
      date: today.toISOString().split('T')[0],
      agence: '',
      service: '',
      pays: '',
      nombre: 0,
      volume: 0,
      statut: 'en cours',
      env: defaultEnv,
      envCode: this.sessionDefaultEnvCode || '',
      token: ''
    };
    this.showAddModal = true;
    this.cdr.markForCheck();
  }

  /**
   * Ouvre le formulaire "Ajouter une nouvelle ligne" prérempli avec les données venant de /matches.
   * Le mode manuel reste disponible (l'utilisateur peut modifier avant d'ajouter).
   */
  openAddModalWithPrefill(prefill: EcartBoSummaryPrefill): void {
    const defaultEnv = this.ecartBoSummaryService.getDefaultEnvForAddModal();
    this.addForm = {
      date: prefill.date || new Date().toISOString().split('T')[0],
      agence: prefill.agence || '',
      service: prefill.service || '',
      pays: prefill.pays || '',
      nombre: prefill.nombre ?? 0,
      volume: prefill.volume ?? 0,
      statut: 'en cours',
      env: defaultEnv,
      envCode: this.sessionDefaultEnvCode || '',
      token: ''
    };
    this.showAddModal = true;
    this.cdr.markForCheck();
  }

  closeAddModal(): void {
    this.showAddModal = false;
    const defaultEnv = this.ecartBoSummaryService.getDefaultEnvForAddModal();
    this.addForm = {
      date: '',
      agence: '',
      service: '',
      pays: '',
      nombre: 0,
      volume: 0,
      statut: 'en cours',
      env: defaultEnv,
      envCode: this.sessionDefaultEnvCode || '',
      token: ''
    };
    this.cdr.markForCheck();
  }

  async addItem(): Promise<void> {
    // Validation
    if (!this.addForm.agence || !this.addForm.service || !this.addForm.pays) {
      this.popupService.showWarning('❌ Veuillez remplir tous les champs obligatoires.');
      return;
    }

    if (this.addForm.nombre < 0) {
      this.popupService.showWarning('❌ Le nombre de transactions doit être positif.');
      return;
    }

    if (!this.addForm.date) {
      this.popupService.showWarning('❌ La date est obligatoire.');
      return;
    }

    this.isAdding = true;
    this.cdr.markForCheck();

    try {
      // Formater la date pour le backend
      let formattedDate = this.addForm.date;
      if (formattedDate && !formattedDate.includes('T')) {
        formattedDate = formattedDate + 'T00:00:00';
      }

      // Créer l'objet pour le backend
      const summaryData: any = {
        dateTransaction: formattedDate,
        agence: this.addForm.agence,
        service: this.addForm.service,
        pays: this.addForm.pays,
        nombreTransactions: this.addForm.nombre,
        montantTotal: this.addForm.volume || 0,
        statut: this.addForm.statut === 'ok' ? 'OK' : 'EN_COURS',
        env: this.addForm.env || this.ecartBoSummaryService.getDefaultEnvForAddModal(),
        commentaire: `Ajout manuel - ${this.addForm.nombre} transaction(s)`
      };
      if (this.addForm.envCode != null && this.addForm.envCode.trim() !== '') {
        summaryData.envCode = this.addForm.envCode.trim();
      }
      if (this.addForm.token && this.addForm.token.trim()) {
        summaryData.token = this.addForm.token.trim();
      }

      // Sauvegarder en base de données
      await firstValueFrom(this.ecartBoSummaryService.createEcartBoSummary(summaryData));
      
      // Recharger les données sauvegardées pour afficher la nouvelle ligne
      this.loadSavedSummaryData();
      
      this.popupService.showSuccess('✅ Ligne ajoutée et sauvegardée avec succès !');
      this.closeAddModal();
    } catch (error: any) {
      console.error('Erreur lors de l\'ajout:', error);
      this.popupService.showError(`❌ Erreur: ${error.message || 'Erreur inconnue lors de l\'ajout'}`);
    } finally {
      this.isAdding = false;
      this.cdr.markForCheck();
    }
  }

  async deleteItem(item: EcartBoSummaryItem): Promise<void> {
    if (!item.id) {
      this.popupService.showWarning('❌ Cette ligne ne peut pas être supprimée car elle n\'a pas d\'ID.');
      return;
    }

    // Demander confirmation avec popup moderne
    const message = `Êtes-vous sûr de vouloir supprimer cette ligne ?\n\n` +
      `📅 Date: ${item.date || '-'}\n` +
      `🏢 Agence: ${item.agence}\n` +
      `🔧 Service: ${item.service}\n` +
      `🌍 Pays: ${item.pays}\n` +
      `📊 Nombre: ${item.nombre}`;
    
    const confirmed = await ModernPopupComponent.showConfirm(
      message,
      '🗑️ Confirmation de suppression'
    );
    
    if (!confirmed) {
      return;
    }

    this.isDeleting = true;
    this.deletingItemId = item.id;
    this.cdr.markForCheck();

    try {
      // Supprimer en base de données
      await firstValueFrom(this.ecartBoSummaryService.deleteEcartBoSummary(item.id));
      
      // Retirer l'item de la liste locale
      this.summaryItems = this.summaryItems.filter(i => i.id !== item.id);
      
      // Réappliquer les filtres
      this.applyFilters();
      
      this.popupService.showSuccess('✅ Ligne supprimée avec succès !');
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      this.popupService.showError(`❌ Erreur: ${error.message || 'Erreur inconnue lors de la suppression'}`);
    } finally {
      this.isDeleting = false;
      this.deletingItemId = null;
      this.cdr.markForCheck();
    }
  }

  /** Éléments de la page courante qui ont un id (pour affichage checkbox). */
  getSelectableItemsOnPage(): EcartBoSummaryItem[] {
    return this.getPagedItems().filter(item => item.id != null);
  }

  /** Tous les éléments filtrés (toutes les pages) qui ont un id et sont supprimables. */
  getSelectableItemsFiltered(): EcartBoSummaryItem[] {
    return this.filteredItems.filter(item => item.id != null);
  }

  isSelected(item: EcartBoSummaryItem): boolean {
    return item.id != null && this.selectedIds.has(item.id);
  }

  toggleSelection(item: EcartBoSummaryItem): void {
    if (item.id == null) return;
    if (this.selectedIds.has(item.id)) {
      this.selectedIds.delete(item.id);
    } else {
      this.selectedIds.add(item.id);
    }
    this.cdr.markForCheck();
  }

  /** True si tous les éléments sélectionnables (toutes les pages / filtrés) sont sélectionnés. */
  get isAllSelectedFiltered(): boolean {
    const selectable = this.getSelectableItemsFiltered();
    return selectable.length > 0 && selectable.every(item => this.selectedIds.has(item.id!));
  }

  /** True si au moins une ligne (et pas toutes) parmi les filtrées est sélectionnée (checkbox indéterminée). */
  get isSomeSelectedFiltered(): boolean {
    const selectable = this.getSelectableItemsFiltered();
    if (selectable.length === 0) return false;
    const selectedCount = selectable.filter(item => this.selectedIds.has(item.id!)).length;
    return selectedCount > 0 && selectedCount < selectable.length;
  }

  /** Sélectionne ou désélectionne tous les éléments sélectionnables (toutes les pages en cours). */
  toggleSelectAllFiltered(): void {
    const selectable = this.getSelectableItemsFiltered();
    if (this.isAllSelectedFiltered) {
      selectable.forEach(item => this.selectedIds.delete(item.id!));
    } else {
      selectable.forEach(item => this.selectedIds.add(item.id!));
    }
    this.cdr.markForCheck();
  }

  clearSelection(): void {
    this.selectedIds.clear();
    this.cdr.markForCheck();
  }

  async deleteSelected(): Promise<void> {
    if (this.selectedIds.size === 0) {
      this.popupService.showWarning('Aucune ligne sélectionnée.');
      return;
    }
    const count = this.selectedIds.size;
    const confirmed = await ModernPopupComponent.showConfirm(
      `Êtes-vous sûr de vouloir supprimer les ${count} ligne(s) sélectionnée(s) ?`,
      '🗑️ Suppression en masse'
    );
    if (!confirmed) return;

    this.isBulkDeleting = true;
    this.cdr.markForCheck();
    const ids = Array.from(this.selectedIds);
    let successCount = 0;
    let errorCount = 0;
    try {
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        try {
          await firstValueFrom(this.ecartBoSummaryService.deleteEcartBoSummary(id));
          this.summaryItems = this.summaryItems.filter(item => item.id !== id);
          this.selectedIds.delete(id);
          successCount++;
        } catch {
          errorCount++;
        }
        if (i < ids.length - 1) {
          await new Promise(r => setTimeout(r, 250));
        }
      }
      this.applyFilters();
      if (errorCount === 0) {
        this.popupService.showSuccess(`✅ ${successCount} ligne(s) supprimée(s) avec succès.`);
      } else {
        this.popupService.showWarning(`${successCount} supprimée(s), ${errorCount} erreur(s).`);
      }
    } finally {
      this.isBulkDeleting = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Exporte les données filtrées en CSV
   */
  exportData(): void {
    if (this.filteredItems.length === 0) {
      this.popupService.showWarning('❌ Aucune donnée à exporter.');
      return;
    }

    this.isExporting = true;
    this.cdr.markForCheck();

    try {
      const columns = ['Date', 'Agence', 'Service', 'Pays', 'Plateforme', 'ENV', 'Token', 'Nombre', 'Volume', 'Statut'];
      
      // Fonction pour échapper les valeurs CSV
      const escapeCsvValue = (value: any): string => {
        if (value === null || value === undefined) {
          return '';
        }
        const str = String(value);
        if (str.includes(';') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      // Créer les lignes CSV
      const csvRows: string[] = [];
      
      // En-têtes
      csvRows.push(columns.map(col => escapeCsvValue(col)).join(';'));
      
      // Données
      for (const item of this.filteredItems) {
        const row = [
          item.date || '',
          item.agence || '',
          item.service || '',
          item.pays || '',
          item.env || 'BO',
          item.envCode || '',
          item.token || '',
          item.nombre || 0,
          item.montant || 0,
          item.statut || 'en cours'
        ];
        csvRows.push(row.map(val => escapeCsvValue(val)).join(';'));
      }

      // Créer le contenu CSV
      const csvContent = csvRows.join('\r\n');
      
      // Générer le nom de fichier avec la date actuelle
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
      const fileName = `ecart-bo-summary_${dateStr}_${timeStr}.csv`;
      
      // Créer et télécharger le fichier
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM pour Excel
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.popupService.showSuccess(`✅ Export réussi: ${fileName} (${this.filteredItems.length} ligne(s))`);
    } catch (error: any) {
      console.error('Erreur lors de l\'export:', error);
      this.popupService.showError(`❌ Erreur lors de l'export: ${error.message || 'Erreur inconnue'}`);
    } finally {
      this.isExporting = false;
      this.cdr.markForCheck();
    }
  }
}

