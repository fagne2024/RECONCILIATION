import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { ReconciliationResponse } from '../../models/reconciliation-response.model';
import { AppStateService } from '../../services/app-state.service';
import { EcartBoSummaryService } from '../../services/ecart-bo-summary.service';
import { PopupService } from '../../services/popup.service';
import { fixGarbledCharacters } from '../../utils/encoding-fixer';
import { ModernPopupComponent } from '../modern-popup/modern-popup.component';

export interface EcartBoSummaryItem {
  id?: number; // ID si l'item est sauvegardé
  date: string;
  agence: string;
  service: string;
  pays: string;
  nombre: number; // Nombre de lignes/transactions
  montant: number; // Montant total (pour référence)
  statut: 'ok' | 'en cours';
  env?: 'BO' | 'PARTENAIRE'; // Environnement : BO ou PARTENAIRE
  originalRecords: Record<string, string>[]; // Tous les enregistrements pour ce service
  isManual?: boolean; // Indique si la ligne a été créée manuellement
  commentaire?: string; // Commentaire pour identifier l'origine
  linkedId?: number; // ID de la ligne liée (paire BO/PARTENAIRE)
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
  selectedDateFrom: string = '';
  selectedDateTo: string = '';
  
  // Liste des valeurs uniques pour les filtres
  uniqueAgencies: string[] = [];
  uniqueServices: string[] = [];
  uniquePays: string[] = [];
  
  isLoading = false;
  isSaving = false;
  isDeleting = false;
  deletingItemId: number | null = null;
  
  // Édition
  showEditModal = false;
  editingItem: EcartBoSummaryItem | null = null;
  editForm: {
    date: string;
    agence: string;
    service: string;
    pays: string;
    nombre: number;
    statut: 'ok' | 'en cours';
    env: 'BO' | 'PARTENAIRE';
  } = {
    date: '',
    agence: '',
    service: '',
    pays: '',
    nombre: 0,
    statut: 'en cours',
    env: 'BO'
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
    statut: 'ok' | 'en cours';
    env: 'BO' | 'PARTENAIRE';
  } = {
    date: '',
    agence: '',
    service: '',
    pays: '',
    nombre: 0,
    statut: 'en cours',
      env: 'PARTENAIRE'
  };
  isAdding = false;

  constructor(
    private appStateService: AppStateService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ecartBoSummaryService: EcartBoSummaryService,
    private popupService: PopupService
  ) {}

  ngOnInit(): void {
    // Charger les données de réconciliation en cours par défaut
    this.subscription.add(
      this.appStateService.getReconciliationResults().subscribe((response: ReconciliationResponse | null) => {
        if (response) {
          this.response = response;
          this.loadSummaryData(); // Charger les données de réconciliation en cours
        } else {
          // Si pas de données de réconciliation, charger les données sauvegardées
          this.loadSavedSummaryData();
        }
      })
    );
  }

  loadSavedSummaryData(): void {
    this.isLoading = true;
    this.cdr.markForCheck();
    
    this.ecartBoSummaryService.getEcartBoSummaries().subscribe({
      next: (savedData) => {
        console.log('Données sauvegardées chargées:', savedData);
        
        this.summaryItems = savedData.map(item => {
          const commentaire = item.commentaire || '';
          const isManual = commentaire.includes('Ajout manuel') || commentaire.includes('ajout manuel');
          
          return {
            id: item.id, // ID pour pouvoir mettre à jour
            date: item.dateTransaction || '',
            agence: item.agence || 'Non spécifié',
            service: item.service || 'Non spécifié',
            pays: item.pays || 'Non spécifié',
            nombre: item.nombreTransactions || 0,
            montant: item.montantTotal || 0,
            statut: (item.statut === 'OK' ? 'ok' : 'en cours') as 'ok' | 'en cours',
            env: (item.env === 'BO' ? 'BO' : (item.env === 'PARTENAIRE' ? 'PARTENAIRE' : 'BO')) as 'BO' | 'PARTENAIRE',
            originalRecords: [], // Les enregistrements originaux ne sont plus disponibles après sauvegarde
            isManual: isManual,
            commentaire: commentaire
          };
        });

        // Extraire les valeurs uniques pour les filtres
        this.uniqueAgencies = [...new Set(this.summaryItems.map(item => item.agence).filter(a => a))].sort();
        this.uniqueServices = [...new Set(this.summaryItems.map(item => item.service).filter(s => s))].sort();
        this.uniquePays = [...new Set(this.summaryItems.map(item => item.pays).filter(p => p))].sort();

        // Lier les paires correspondantes (BO/PARTENAIRE) et mettre à jour les statuts
        this.linkMatchingPairs();

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

      // Regrouper par agence + service + pays
      const groupedByService = new Map<string, {
        agence: string;
        service: string;
        pays: string;
        date: string;
        records: Record<string, string>[];
        totalMontant: number;
      }>();

      allData.forEach(record => {
        const agence = getValue(record, ['Agence', 'agence', 'AGENCE', 'agency', 'Agency']) || 'Non spécifié';
        const service = getValue(record, ['Service', 'service', 'SERVICE', 'serv', 'Serv']) || 'Non spécifié';
        const pays = getValue(record, ['Pays', 'pays', 'PAYS', 'country', 'Country', 'GRX', 'grx']) || 'Non spécifié';
        const date = getValue(record, ['Date', 'date', 'DATE', 'jour', 'Jour', 'JOUR']) || '';
        const montantStr = getValue(record, ['montant', 'Montant', 'MONTANT', 'amount', 'Amount', 'volume', 'Volume', 'VOLUME']);
        const montant = montantStr ? parseFloat(montantStr.toString().replace(',', '.')) : 0;

        const key = `${agence}|${service}|${pays}`;
        
        if (!groupedByService.has(key)) {
          groupedByService.set(key, {
            agence,
            service,
            pays,
            date,
            records: [],
            totalMontant: 0
          });
        }

        const group = groupedByService.get(key)!;
        group.records.push(record);
        group.totalMontant += isNaN(montant) ? 0 : montant;
      });

      // Convertir en tableau d'items
      this.summaryItems = Array.from(groupedByService.values()).map(group => ({
        date: group.date,
        agence: group.agence,
        service: group.service,
        pays: group.pays,
        nombre: group.records.length, // Nombre de lignes/transactions
        montant: group.totalMontant, // Montant total (pour référence)
        statut: 'en cours' as 'ok' | 'en cours',
        env: 'BO' as 'BO' | 'PARTENAIRE', // Par défaut BO pour les données de réconciliation
        originalRecords: group.records
      }));

      // Lier les paires correspondantes (BO/PARTENAIRE) et mettre à jour les statuts
      this.linkMatchingPairs();

      // Extraire les valeurs uniques pour les filtres
      this.uniqueAgencies = [...new Set(this.summaryItems.map(item => item.agence).filter(a => a))].sort();
      this.uniqueServices = [...new Set(this.summaryItems.map(item => item.service).filter(s => s))].sort();
      this.uniquePays = [...new Set(this.summaryItems.map(item => item.pays).filter(p => p))].sort();

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
        item.nombre.toString().includes(searchTerm)
      );
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
      
      // Ignorer si déjà lié ou si pas d'ID (données non sauvegardées)
      if (item1.linkedId || !item1.id || !item1.env) {
        continue;
      }
      
      for (let j = i + 1; j < this.summaryItems.length; j++) {
        const item2 = this.summaryItems[j];
        
        // Ignorer si déjà lié ou si pas d'ID (données non sauvegardées)
        if (item2.linkedId || !item2.id || !item2.env) {
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
              // Les lignes correspondent : les lier et mettre à jour les statuts
              item1.linkedId = item2.id;
              item2.linkedId = item1.id;
              
              // Mettre les statuts à "OK"
              if (item1.statut !== 'ok') {
                item1.statut = 'ok';
                itemsToUpdate.push(item1);
              }
              if (item2.statut !== 'ok') {
                item2.statut = 'ok';
                itemsToUpdate.push(item2);
              }
              
              console.log(`✅ Lignes liées: ${item1.id} (${item1.env}) <-> ${item2.id} (${item2.env})`);
              break; // Ne pas chercher d'autres correspondances pour item1
            }
          }
        }
      }
    }
    
    // Étape 2: Correspondance un-à-plusieurs pour multiAgence
    // Une ligne PARTENAIRE (multiAgence) peut correspondre à plusieurs lignes BO
    // Ensemble pour suivre les lignes BO déjà utilisées dans cette étape
    const usedBoItemIds = new Set<number>();
    
    for (const partenaireItem of this.summaryItems) {
      // Ignorer si déjà lié, pas d'ID, ou pas PARTENAIRE
      if (partenaireItem.linkedId || !partenaireItem.id || partenaireItem.env !== 'PARTENAIRE') {
        continue;
      }
      
      // Chercher des lignes BO non liées avec le même service et pays
      const matchingBoItems: EcartBoSummaryItem[] = [];
      let totalNombre = 0;
      
      console.log(`🔍 Recherche correspondance pour PARTENAIRE: ID=${partenaireItem.id}, Date=${partenaireItem.date}, Service=${partenaireItem.service}, Pays=${partenaireItem.pays}, Nombre=${partenaireItem.nombre}`);
      
      for (const boItem of this.summaryItems) {
        // Ignorer si déjà lié, pas d'ID, pas BO, ou déjà utilisé dans une correspondance un-à-plusieurs
        if (boItem.linkedId || !boItem.id || boItem.env !== 'BO' || usedBoItemIds.has(boItem.id)) {
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
      
      // Si la somme des nombres des lignes BO correspond au nombre de la ligne PARTENAIRE
      if (matchingBoItems.length > 0 && totalNombre === partenaireItem.nombre) {
        // Marquer toutes les lignes comme "ok"
        if (partenaireItem.statut !== 'ok') {
          partenaireItem.statut = 'ok';
          itemsToUpdate.push(partenaireItem);
        }
        
        for (const boItem of matchingBoItems) {
          if (boItem.statut !== 'ok') {
            boItem.statut = 'ok';
            itemsToUpdate.push(boItem);
          }
          // Marquer cette ligne BO comme utilisée pour éviter les doublons
          usedBoItemIds.add(boItem.id);
        }
        
        console.log(`✅ Correspondance un-à-plusieurs: ${partenaireItem.id} (PARTENAIRE) <-> ${matchingBoItems.length} ligne(s) BO (${matchingBoItems.map(i => i.id).join(', ')})`);
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

  /**
   * Met à jour le statut des lignes liées en base de données
   */
  private async updateLinkedItemsStatus(items: EcartBoSummaryItem[]): Promise<void> {
    // Filtrer uniquement les items avec un ID valide
    const validItems = items.filter(item => item.id && item.id > 0);
    
    if (validItems.length === 0) {
      return; // Aucun item valide à mettre à jour
    }
    
    for (const item of validItems) {
      try {
        const updateData: any = {
          statut: 'OK',
          env: item.env || 'BO'
        };
        
        await firstValueFrom(
          this.ecartBoSummaryService.updateEcartBoSummary(item.id!, updateData)
        );
        
        console.log(`✅ Statut mis à jour pour la ligne ${item.id}`);
      } catch (error: any) {
        // Gérer gracieusement les erreurs 404 (item n'existe plus en base)
        // Ne pas afficher de warning pour les 404 car c'est une situation normale
        // (lignes supprimées entre-temps)
        if (error.status === 404) {
          // Item supprimé entre-temps, ignorer silencieusement
          // Optionnel: retirer l'item de la liste locale si nécessaire
          const index = this.summaryItems.findIndex(i => i.id === item.id);
          if (index >= 0) {
            // Optionnel: marquer comme supprimé ou retirer de la liste
            // Pour l'instant, on garde l'item mais on ne le met pas à jour
          }
        } else {
          // Autres erreurs: les logger
          console.error(`❌ Erreur lors de la mise à jour du statut pour la ligne ${item.id}:`, error);
        }
      }
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

  clearFilters(): void {
    this.searchKey = '';
    this.selectedAgence = '';
    this.selectedService = '';
    this.selectedPays = '';
    this.selectedStatut = '';
    this.selectedDateFrom = '';
    this.selectedDateTo = '';
    this.applyFilters();
  }

  goBack(): void {
    this.router.navigate(['/ecart-bo']);
  }

  getStatutClass(statut: string): string {
    return statut === 'ok' ? 'statut-ok' : 'statut-en-cours';
  }

  openEditModal(item: EcartBoSummaryItem): void {
    this.editingItem = item;
    this.editForm = {
      date: item.date || '',
      agence: item.agence || '',
      service: item.service || '',
      pays: item.pays || '',
      nombre: item.nombre || 0,
      statut: item.statut || 'en cours',
      env: item.env || 'BO'
    };
    this.showEditModal = true;
    this.cdr.markForCheck();
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingItem = null;
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
          montantTotal: this.editingItem.montant, // Conserver le montant existant
          statut: this.editForm.statut === 'ok' ? 'OK' : 'EN_COURS',
          env: this.editForm.env || 'BO'
        };

        const updated = await firstValueFrom(this.ecartBoSummaryService.updateEcartBoSummary(this.editingItem.id, updatedData));
        
        // Mettre à jour l'item local avec les données retournées
        this.editingItem.date = updated.dateTransaction || this.editForm.date;
        this.editingItem.agence = updated.agence || this.editForm.agence;
        this.editingItem.service = updated.service || this.editForm.service;
        this.editingItem.pays = updated.pays || this.editForm.pays;
        this.editingItem.nombre = updated.nombreTransactions || this.editForm.nombre;
        this.editingItem.statut = (updated.statut === 'OK' ? 'ok' : 'en cours') as 'ok' | 'en cours';
        
        // Mettre à jour aussi dans summaryItems
        const index = this.summaryItems.findIndex(item => item.id === this.editingItem!.id);
        if (index >= 0) {
          this.summaryItems[index] = { ...this.editingItem };
        }
        
        // Vérifier si la ligne modifiée peut être liée à une autre
        this.linkMatchingPairs();
      } else {
        // Si c'est un item non sauvegardé (données de réconciliation), mettre à jour localement
        this.editingItem.date = this.editForm.date;
        this.editingItem.agence = this.editForm.agence;
        this.editingItem.service = this.editForm.service;
        this.editingItem.pays = this.editForm.pays;
        this.editingItem.nombre = this.editForm.nombre;
        this.editingItem.statut = this.editForm.statut;
        this.editingItem.env = this.editForm.env;
        
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
    if (this.filteredItems.length === 0) {
      this.popupService.showWarning('❌ Aucune donnée à sauvegarder.');
      return;
    }

    // Filtrer seulement les éléments avec statut "en cours" ou demander confirmation pour tous
    const itemsToSave = this.filteredItems.filter(item => item.statut === 'en cours');
    
    if (itemsToSave.length === 0) {
      this.popupService.showWarning('❌ Aucun écart avec statut "en cours" à sauvegarder.');
      return;
    }

    // Afficher un popup pour choisir la date à appliquer
    // Date par défaut : J-1 (hier)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const defaultDate = yesterday.toISOString().split('T')[0];
    
    const selectedDate = await this.popupService.showDateInput(
      `Veuillez sélectionner la date à appliquer aux ${itemsToSave.length} écart(s) BO :`,
      'Sélection de la date pour la sauvegarde',
      defaultDate // Date par défaut : J-1
    );

    if (!selectedDate) {
      // L'utilisateur a annulé la sélection de date
      return;
    }

    const confirmed = await this.popupService.showConfirm(
      `📋 ${itemsToSave.length} écart(s) BO seront sauvegardés avec la date ${selectedDate}. Continuer ?`,
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
        env: 'BO' // Prérempli avec BO pour le bouton sauvegarder
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
      this.popupService.showSuccess(`✅ ${result.count} résumé(s) sauvegardé(s) avec succès !`);
      
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
    // Initialiser le formulaire avec la date du jour
    const today = new Date();
    this.addForm = {
      date: today.toISOString().split('T')[0],
      agence: '',
      service: '',
      pays: '',
      nombre: 0,
      statut: 'en cours',
      env: 'PARTENAIRE' // Prérempli avec PARTENAIRE pour le formulaire
    };
    this.showAddModal = true;
    this.cdr.markForCheck();
  }

  closeAddModal(): void {
    this.showAddModal = false;
    this.addForm = {
      date: '',
      agence: '',
      service: '',
      pays: '',
      nombre: 0,
      statut: 'en cours',
      env: 'PARTENAIRE'
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
        montantTotal: 0,
        statut: this.addForm.statut === 'ok' ? 'OK' : 'EN_COURS',
        env: this.addForm.env || 'PARTENAIRE', // PARTENAIRE pour le formulaire
        commentaire: `Ajout manuel - ${this.addForm.nombre} transaction(s)`
      };

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
}

