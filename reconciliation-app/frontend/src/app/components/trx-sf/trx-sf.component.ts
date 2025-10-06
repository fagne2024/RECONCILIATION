import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TrxSfService, TrxSfData, TrxSfStatistics, ValidationResult } from '../../services/trx-sf.service';
import { AppStateService } from '../../services/app-state.service';
import { PopupService } from '../../services/popup.service';

@Component({
  selector: 'app-trx-sf',
  templateUrl: './trx-sf.component.html',
  styleUrls: ['./trx-sf.component.scss']
})
export class TrxSfComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  @ViewChild('fileInput') fileInput!: ElementRef;
  
  trxSfData: TrxSfData[] = [];
  filteredTrxSfData: TrxSfData[] = [];
  isLoading = false;
  
  // Upload
  selectedFile: File | null = null;
  fileType: 'full' | 'statut' | null = null; // 'full' = 9 colonnes, 'statut' = 2 colonnes
  isUploading = false;
  isChangingStatut = false;
  uploadMessage: { type: 'success' | 'error', text: string } | null = null;
  validationResult: any = null;
  
  // Filtres
  filterForm: FormGroup;
  agences: string[] = [];
  services: string[] = [];
  pays: string[] = [];
  numeroTransGUs: string[] = [];
  statuts: string[] = ['EN_ATTENTE', 'TRAITE', 'ERREUR'];
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 20;
  totalPages = 1;
  
  // Statistiques
  totalMontant = 0;
  
  // Sélection multiple
  selectedItems: Set<number> = new Set();
  isSelectAll = false;
  isSelectionMode = false;
  selectedStatut = 'EN_ATTENTE';
  isUpdatingMultipleStatuts = false;
  
  // Vérification FRAIS
  isVerifyingFrais = false;
  
  // Gestion des doublons
  duplicates: TrxSfData[] = [];
  isLoadingDuplicates = false;
  isRemovingDuplicates = false;
  
  // Informations utilisateur
  isAdminUser = false;
  userAgency = '';
  
  // Gestion du type de fichier
  showFileTypeSelector = false;
  
  constructor(
    private trxSfService: TrxSfService,
    private fb: FormBuilder,
    private appState: AppStateService,
    private popupService: PopupService
  ) {
    this.filterForm = this.fb.group({
      agence: [''],
      service: [''],
      pays: [''],
      numeroTransGu: [''],
      statut: [''],
      dateDebut: [''],
      dateFin: ['']
    });
  }

  ngOnInit(): void {
    this.loadTrxSfData();
    
    // Écouter les changements de filtres
    this.filterForm.valueChanges.subscribe(() => {
      this.applyFilters();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTrxSfData(): void {
    this.isLoading = true;
    
    // Vérifier si l'utilisateur est admin ou a une agence spécifique
    const username = this.appState.getUsername();
    const isAdmin = this.appState.isAdmin();
    
    // Mettre à jour les propriétés pour l'affichage
    this.isAdminUser = isAdmin;
    this.userAgency = username || '';
    
    if (isAdmin) {
      // Admin : charger toutes les données
      this.trxSfService.getTrxSfs()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (data) => {
            this.trxSfData = data;
            this.initializeFilterLists();
            this.applyFilters();
            this.isLoading = false;
          },
          error: (error) => {
            console.error('Erreur lors du chargement des données:', error);
            this.isLoading = false;
            // En cas d'erreur, on utilise des données fictives pour la démo
          this.trxSfData = this.generateMockData();
          this.initializeFilterLists();
          this.applyFilters();
        }
      });
    } else {
      // Utilisateur non-admin : utiliser l'username comme agence
      const userAgency = username;
      if (userAgency) {
        this.trxSfService.getTrxSfByAgence(userAgency)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (data) => {
              this.trxSfData = data;
              this.initializeFilterLists();
              this.applyFilters();
              this.isLoading = false;
            },
            error: (error) => {
              console.error(`Erreur lors du chargement des données pour l'agence ${userAgency}:`, error);
              this.isLoading = false;
              // En cas d'erreur, on utilise des données fictives pour la démo
              this.trxSfData = this.generateMockData().filter(item => item.agence === userAgency);
              this.initializeFilterLists();
              this.applyFilters();
            }
          });
      } else {
        // Pas d'agence définie, charger des données vides
        this.trxSfData = [];
        this.initializeFilterLists();
        this.applyFilters();
        this.isLoading = false;
      }
    }
  }

  private   initializeFilterLists(): void {
    this.agences = this.getUniqueAgences();
    this.services = this.getUniqueServices();
    this.pays = this.getUniquePays();
    this.numeroTransGUs = this.getUniqueNumeroTransGUs();
  }

  private generateMockData(): TrxSfData[] {
    const mockData: TrxSfData[] = [];
    const agences = ['AGENCE_A', 'AGENCE_B', 'AGENCE_C'];
    const services = ['TRANSFERT', 'PAIEMENT', 'VIREMENT', 'RETRAIT'];
    const pays = ['SENEGAL', 'MALI', 'BURKINA FASO', 'COTE D\'IVOIRE'];
    const statuts: ('EN_ATTENTE' | 'TRAITE' | 'ERREUR')[] = ['EN_ATTENTE', 'TRAITE', 'ERREUR'];
    
    for (let i = 1; i <= 50; i++) {
      mockData.push({
        idTransaction: `TRX_SF_${String(i).padStart(6, '0')}`,
        telephoneClient: `+221${Math.floor(Math.random() * 90000000) + 10000000}`,
        montant: Math.floor(Math.random() * 1000000) / 100,
        service: services[Math.floor(Math.random() * services.length)],
        agence: agences[Math.floor(Math.random() * agences.length)],
        dateTransaction: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString(),
        numeroTransGu: `GU_${String(Math.floor(Math.random() * 1000000)).padStart(8, '0')}`,
        pays: pays[Math.floor(Math.random() * pays.length)],
        statut: statuts[Math.floor(Math.random() * statuts.length)],
        frais: Math.floor(Math.random() * 5000) / 100,
        commentaire: `Transaction SF ${i} - ${Math.random() > 0.5 ? 'Crédit' : 'Débit'}`,
        dateImport: new Date().toISOString()
      });
    }
    
    return mockData;
  }

  applyFilters(): void {
    let filtered = [...this.trxSfData];
    const filters = this.filterForm.value;
    
    if (filters.agence) {
      filtered = filtered.filter(item => item.agence === filters.agence);
    }
    
    if (filters.service) {
      filtered = filtered.filter(item => item.service === filters.service);
    }
    
    if (filters.pays) {
      filtered = filtered.filter(item => item.pays === filters.pays);
    }
    
    if (filters.numeroTransGu) {
      filtered = filtered.filter(item => item.numeroTransGu === filters.numeroTransGu);
    }
    
    if (filters.statut) {
      filtered = filtered.filter(item => item.statut === filters.statut);
    }
    
    if (filters.dateDebut) {
      filtered = filtered.filter(item => new Date(item.dateTransaction) >= new Date(filters.dateDebut));
    }
    
    if (filters.dateFin) {
      filtered = filtered.filter(item => new Date(item.dateTransaction) <= new Date(filters.dateFin));
    }
    
    this.filteredTrxSfData = filtered;
    this.calculateTotalMontant();
    this.calculateTotalPages();
    this.currentPage = 1;
  }

  clearFilters(): void {
    this.filterForm.reset();
    this.applyFilters();
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.uploadMessage = null;
      this.validationResult = null;
      this.fileType = null;
      this.showFileTypeSelector = false;
      
      // Détecter automatiquement le type de fichier
      this.detectFileType(file);
    }
  }
  
  private detectFileType(file: File): void {
    console.log('🔍 Détection du type de fichier:', file.name);
    
    // Pour les fichiers Excel, on ne peut pas facilement détecter le nombre de colonnes
    // sans parser le fichier. On va permettre à l'utilisateur de choisir le type.
    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xls') || fileName.endsWith('.xlsx');
    
    if (isExcel) {
      // Pour les fichiers Excel, on laisse l'utilisateur choisir
      // Par défaut, on assume que c'est un fichier complet
      this.fileType = 'full';
      console.log('✅ Fichier Excel détecté - Type par défaut: Fichier complet (9 colonnes)');
      return;
    }
    
    // Pour les fichiers CSV, on peut analyser le contenu
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const content = e.target.result;
      const lines = content.split('\n');
      
      if (lines.length > 0) {
        const firstLine = lines[0];
        const columns = firstLine.split(/[,;]/); // Détecter le séparateur
        
        console.log('🔍 Détection du type de fichier CSV:');
        console.log('   - Nombre de colonnes détectées:', columns.length);
        console.log('   - Première ligne:', firstLine);
        
        if (columns.length >= 8 && columns.length <= 10) {
          // Fichier complet (9 colonnes ± 1)
          this.fileType = 'full';
          console.log('✅ Type détecté: Fichier complet (9 colonnes)');
        } else if (columns.length >= 2 && columns.length <= 4) {
          // Fichier de statut (2 colonnes ± 2)
          this.fileType = 'statut';
          console.log('✅ Type détecté: Fichier de statut (2 colonnes)');
        } else {
          // Type indéterminé - par défaut, on assume que c'est un fichier complet
          this.fileType = 'full';
          console.log('❓ Type indéterminé, nombre de colonnes:', columns.length, '- Par défaut: Fichier complet');
        }
      }
    };
    reader.readAsText(file);
  }

  toggleFileType(): void {
    this.showFileTypeSelector = !this.showFileTypeSelector;
  }

  onFileTypeChange(type: 'full' | 'statut'): void {
    this.fileType = type;
    this.showFileTypeSelector = false;
    this.validationResult = null;
    this.uploadMessage = null;
    console.log('🔄 Type de fichier changé manuellement vers:', type);
  }

  validateFile(): void {
    if (!this.selectedFile) {
      this.uploadMessage = { type: 'error', text: 'Aucun fichier sélectionné' };
      return;
    }

    this.isUploading = true;
    this.uploadMessage = null;
    this.validationResult = null;

    this.trxSfService.validateFile(this.selectedFile)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.validationResult = result;
          this.isUploading = false;
        },
        error: (error) => {
          console.error('Erreur lors de la validation:', error);
          this.uploadMessage = { type: 'error', text: 'Erreur lors de la validation du fichier' };
          this.isUploading = false;
        }
      });
  }

  uploadFile(): void {
    if (!this.selectedFile) {
      this.uploadMessage = { type: 'error', text: 'Aucun fichier sélectionné' };
      return;
    }

    this.isUploading = true;
    this.uploadMessage = null;

    this.trxSfService.uploadFile(this.selectedFile)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.isUploading = false;
          this.uploadMessage = { 
            type: 'success', 
            text: `Fichier uploadé avec succès. ${result.count} transactions importées.` 
          };
          this.selectedFile = null;
          this.validationResult = null;
          this.loadTrxSfData(); // Recharger les données
        },
        error: (error) => {
          console.error('Erreur lors de l\'upload:', error);
          this.isUploading = false;
          this.uploadMessage = { type: 'error', text: 'Erreur lors de l\'upload du fichier' };
        }
      });
  }
  
  changeStatutFile(): void {
    if (!this.selectedFile) {
      this.uploadMessage = { type: 'error', text: 'Aucun fichier sélectionné' };
      return;
    }

    this.isChangingStatut = true;
    this.uploadMessage = null;
    this.validationResult = null;

    this.trxSfService.changeStatutFromFile(this.selectedFile)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isChangingStatut = false;
          
          let message = `Changement de statut terminé - `;
          message += `Total: ${response.totalLines}, `;
          message += `Traitées: ${response.processedLines}, `;
          message += `Mises à jour: ${response.updatedLines}`;
          
          if (response.errorLines > 0) {
            message += `, Erreurs: ${response.errorLines}`;
          }
          
          this.uploadMessage = { 
            type: response.success ? 'success' : 'error', 
            text: message 
          };
          
          this.selectedFile = null;
          this.validationResult = null;
          this.loadTrxSfData(); // Recharger les données
        },
        error: (error) => {
          console.error('Erreur lors du changement de statut:', error);
          this.isChangingStatut = false;
          this.uploadMessage = { 
            type: 'error', 
            text: error.error?.error || error.error?.message || 'Erreur lors du changement de statut' 
          };
        }
      });
  }

  calculateTotalMontant(): void {
    this.totalMontant = this.filteredTrxSfData.reduce((sum, item) => sum + item.montant, 0);
  }

  calculateTotalPages(): void {
    this.totalPages = Math.ceil(this.filteredTrxSfData.length / this.itemsPerPage);
  }

  getPaginatedData(): TrxSfData[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredTrxSfData.slice(startIndex, endIndex);
  }

  getStatutCount(statut: string): number {
    return this.filteredTrxSfData.filter(item => item.statut === statut).length;
  }

  formatMontant(montant: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(montant);
  }

  formatMontantTotal(): string {
    return this.formatMontant(this.totalMontant);
  }

  formatFraisTotal(): string {
    const totalFrais = this.filteredTrxSfData.reduce((sum, item) => sum + (item.frais || 0), 0);
    return this.formatMontant(totalFrais);
  }

  getStatutClass(statut: string): string {
    switch (statut) {
      case 'EN_ATTENTE': return 'statut-en-attente';
      case 'TRAITE': return 'statut-traite';
      case 'ERREUR': return 'statut-erreur';
      default: return '';
    }
  }

  getStatutLabel(statut: string): string {
    switch (statut) {
      case 'EN_ATTENTE': return 'En attente';
      case 'TRAITE': return 'Traité';
      case 'ERREUR': return 'Erreur';
      default: return statut;
    }
  }

  onPageChange(page: number): void {
    this.currentPage = page;
  }

  getUniqueAgences(): string[] {
    return [...new Set(this.trxSfData.map(item => item.agence))].sort();
  }

  getUniqueServices(): string[] {
    return [...new Set(this.trxSfData.map(item => item.service))].sort();
  }

  getUniquePays(): string[] {
    return [...new Set(this.trxSfData.map(item => item.pays))].sort();
  }

  getUniqueNumeroTransGUs(): string[] {
    return [...new Set(this.trxSfData.map(item => item.numeroTransGu))].sort();
  }

  formatDate(date: string): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR');
  }

  formatMontantFrais(montant: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(montant);
  }

  onStatutChange(item: TrxSfData, event: any): void {
    const target = event.target as HTMLSelectElement;
    const newStatut = target.value;
    
    if (newStatut && newStatut !== item.statut && item.id) {
      // Sauvegarder l'ancien statut pour pouvoir le restaurer en cas d'erreur
      const oldStatut = item.statut;
      
      // Mettre à jour immédiatement l'interface pour une meilleure UX
      item.statut = newStatut as 'EN_ATTENTE' | 'TRAITE' | 'ERREUR';

      this.trxSfService.updateStatut(item.id, newStatut)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (result) => {
            console.log(`Statut mis à jour avec succès: ${oldStatut} → ${newStatut}`, result);
            this.showTemporaryMessage('success', `Statut mis à jour: ${newStatut}`);
          },
          error: (error) => {
            console.error('Erreur lors de la mise à jour du statut:', error);
            
            // Restaurer l'ancien statut en cas d'erreur
            item.statut = oldStatut;
            target.value = oldStatut || 'EN_ATTENTE';
            
            this.showTemporaryMessage('error', 'Erreur lors de la mise à jour du statut');
          }
        });
    }
  }

  deleteTrxSf(id: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette transaction ?')) {
      this.trxSfService.deleteTrxSf(id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.trxSfData = this.trxSfData.filter(item => item.id !== id);
            this.applyFilters();
            console.log('Transaction supprimée avec succès');
          },
          error: (error) => {
            console.error('Erreur lors de la suppression:', error);
          }
        });
    }
  }

  getVisiblePages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    const start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(this.totalPages, start + maxVisible - 1);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  exportTrxSfData(): void {
    // TODO: Implémenter l'export Excel
    console.log('Export TRX SF data');
  }

  refreshData(): void {
    this.loadTrxSfData();
  }

  // Méthodes pour la sélection multiple
  toggleSelectionMode(): void {
    this.isSelectionMode = !this.isSelectionMode;
    if (!this.isSelectionMode) {
      this.clearSelection();
    }
  }

  toggleSelectAll(): void {
    if (this.isSelectAll) {
      this.clearSelection();
    } else {
      this.selectAll();
    }
  }

  selectAll(): void {
    this.selectedItems.clear();
    // Sélectionner TOUTES les lignes filtrées, pas seulement celles de la page courante
    this.filteredTrxSfData.forEach(item => {
      if (item.id) {
        this.selectedItems.add(item.id);
      }
    });
    this.isSelectAll = true;
  }

  clearSelection(): void {
    this.selectedItems.clear();
    this.isSelectAll = false;
  }

  toggleItemSelection(item: TrxSfData): void {
    if (item.id) {
      if (this.selectedItems.has(item.id)) {
        this.selectedItems.delete(item.id);
      } else {
        this.selectedItems.add(item.id);
      }
      this.updateSelectAllState();
    }
  }

  updateSelectAllState(): void {
    // Vérifier si TOUTES les lignes filtrées sont sélectionnées, pas seulement la page courante
    const allFilteredItems = this.filteredTrxSfData;
    const selectedCount = allFilteredItems.filter(item => item.id && this.selectedItems.has(item.id)).length;
    this.isSelectAll = selectedCount === allFilteredItems.length && allFilteredItems.length > 0;
  }

  getSelectedCount(): number {
    return this.selectedItems.size;
  }

  isItemSelected(item: TrxSfData): boolean {
    return item.id ? this.selectedItems.has(item.id) : false;
  }

  updateMultipleStatuts(): void {
    if (this.selectedItems.size === 0) {
      this.popupService.showWarning('Veuillez sélectionner au moins une transaction.', 'Sélection Requise');
      return;
    }

    this.isUpdatingMultipleStatuts = true;
    const selectedIds = Array.from(this.selectedItems);
    
    // Créer les promesses pour mettre à jour chaque transaction
    const updatePromises = selectedIds.map(id => 
      this.trxSfService.updateStatut(id, this.selectedStatut).toPromise()
    );

    Promise.all(updatePromises)
      .then(() => {
        console.log(`${selectedIds.length} transactions mises à jour avec le statut ${this.selectedStatut}`);
        this.clearSelection();
        this.loadTrxSfData(); // Recharger les données
        this.isUpdatingMultipleStatuts = false;
      })
      .catch(error => {
        console.error('Erreur lors de la mise à jour multiple:', error);
        this.isUpdatingMultipleStatuts = false;
        this.popupService.showError('Erreur lors de la mise à jour des statuts.', 'Erreur de Mise à Jour');
      });
  }

  // Méthodes pour la gestion des doublons
  loadDuplicates(): void {
    this.isLoadingDuplicates = true;
    
    this.trxSfService.getDuplicates()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (duplicates) => {
          this.duplicates = duplicates;
          this.isLoadingDuplicates = false;
          console.log(`🔍 ${duplicates.length} doublon(s) trouvé(s)`);
        },
        error: (error) => {
          console.error('Erreur lors de la recherche des doublons:', error);
          this.isLoadingDuplicates = false;
          this.popupService.showError('Erreur lors de la recherche des doublons.', 'Erreur de Recherche');
        }
      });
  }

  async removeDuplicates(): Promise<void> {
    if (this.duplicates.length === 0) {
      this.popupService.showInfo('Aucun doublon à supprimer.', 'Aucun Doublon');
      return;
    }

    const confirmed = await this.popupService.showConfirm(
      `Êtes-vous sûr de vouloir supprimer ${this.duplicates.length} doublon(s) ?`,
      'Confirmation de Suppression'
    );
    if (!confirmed) {
      return;
    }

    this.isRemovingDuplicates = true;
    
    this.trxSfService.removeDuplicates()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isRemovingDuplicates = false;
          this.duplicates = [];
          console.log(`✅ ${response.removedCount} doublon(s) supprimé(s)`);
          this.popupService.showSuccess(`${response.removedCount} doublon(s) supprimé(s) avec succès.`, 'Suppression Réussie');
          this.loadTrxSfData(); // Recharger les données
        },
        error: (error) => {
          console.error('Erreur lors de la suppression des doublons:', error);
          this.isRemovingDuplicates = false;
          this.popupService.showError('Erreur lors de la suppression des doublons.', 'Erreur de Suppression');
        }
      });
  }

  // Méthode helper pour afficher des messages temporaires
  private showTemporaryMessage(type: 'success' | 'error', message: string) {
    // Créer un élément de message temporaire
    const messageElement = document.createElement('div');
    messageElement.className = `temp-message ${type}`;
    messageElement.textContent = message;
    messageElement.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 15px;
      border-radius: 4px;
      color: white;
      font-weight: bold;
      z-index: 1000;
      ${type === 'success' ? 'background-color: #28a745;' : 'background-color: #dc3545;'}
    `;
    
    document.body.appendChild(messageElement);
    
    // Supprimer le message après 3 secondes
    setTimeout(() => {
      if (document.body.contains(messageElement)) {
        document.body.removeChild(messageElement);
      }
    }, 3000);
  }

  verifierFrais(): void {
    // Créer un input file invisible pour sélectionner le fichier
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv,.xlsx,.xls';
    fileInput.style.display = 'none';
    
    fileInput.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        this.traiterFichierFrais(file);
      }
    };
    
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
  }

  private traiterFichierFrais(file: File): void {
    if (this.filteredTrxSfData.length === 0) {
      this.popupService.showError('❌ Aucune transaction TRX SF chargée.', 'Aucune Donnée');
      return;
    }

    this.isVerifyingFrais = true;

    try {
      console.log('🔄 Début du traitement du fichier de vérification FRAIS...', file.name);

      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          let donneesFichier: any[] = [];

          if (file.name.toLowerCase().endsWith('.csv')) {
            // Traitement fichier CSV
            const csvText = e.target.result;
            const lignes = csvText.split('\n').filter((ligne: string) => ligne.trim());
            
            if (lignes.length < 2) {
              throw new Error('Le fichier CSV doit contenir au moins un en-tête et une ligne de données');
            }

            const entetes = lignes[0].split(';').map((h: string) => h.trim().toLowerCase());
            console.log('📋 En-têtes CSV détectés:', entetes);

            // Vérifier les colonnes requises
            const colonneRequises = ['type operation', 'code proprietaire', 'numero trans gu'];
            const colonnesManquantes = colonneRequises.filter(col => !entetes.includes(col));
            
            if (colonnesManquantes.length > 0) {
              throw new Error(`Colonnes manquantes dans le fichier: ${colonnesManquantes.join(', ')}\nColonnes attendues: ${colonneRequises.join(', ')}`);
            }

            // Traiter les données
            for (let i = 1; i < lignes.length; i++) {
              const valeurs = lignes[i].split(';').map((v: string) => v.trim());
              if (valeurs.length >= entetes.length) {
                const ligne: any = {};
                entetes.forEach((entete: string, index: number) => {
                  ligne[entete] = valeurs[index] || '';
                });
                donneesFichier.push(ligne);
              }
            }

          } else if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
            // Pour les fichiers Excel, on doit utiliser une bibliothèque comme SheetJS
            this.popupService.showError('❌ Les fichiers Excel ne sont pas encore supportés. Veuillez utiliser un fichier CSV avec des séparateurs point-virgule (;)', 'Format Non Supporté');
            this.isVerifyingFrais = false;
            return;
          }

          console.log(`📊 ${donneesFichier.length} lignes trouvées dans le fichier`);
          this.verifierEtMettreAJourStatuts(donneesFichier);

        } catch (error) {
          console.error('❌ Erreur lors du parsing du fichier:', error);
          this.popupService.showError(`❌ Erreur lors du traitement du fichier:\n${error}`, 'Erreur de Traitement');
          this.isVerifyingFrais = false;
        }
      };

      reader.onerror = () => {
        this.popupService.showError('❌ Erreur lors de la lecture du fichier', 'Erreur de Lecture');
        this.isVerifyingFrais = false;
      };

      reader.readAsText(file, 'UTF-8');

    } catch (error) {
      console.error('❌ Erreur lors du traitement du fichier:', error);
      this.popupService.showError(`❌ Erreur lors du traitement du fichier: ${error}`, 'Erreur de Traitement');
      this.isVerifyingFrais = false;
    }
  }

  private verifierEtMettreAJourStatuts(donneesFichier: any[]): void {
    try {
      console.log('🔄 Début de la vérification et mise à jour des statuts...');

      let transactionsTrouvees = 0;
      let transactionsNonTrouvees = 0;
      let transactionsMisesAJour = 0;
      let transactionsErreur = 0;
      const detailsNonTrouvees: string[] = [];
      const detailsErreurs: string[] = [];

      // Créer un index des transactions TRX SF par numeroTransGu
      const indexTrxSf = new Map<string, TrxSfData>();
      this.filteredTrxSfData.forEach(trx => {
        if (trx.numeroTransGu) {
          indexTrxSf.set(trx.numeroTransGu.trim().toLowerCase(), trx);
        }
      });

      console.log(`📋 Index créé avec ${indexTrxSf.size} transactions TRX SF`);

      // Vérifier chaque ligne du fichier
      donneesFichier.forEach((ligne, index) => {
        const numeroTransGu = ligne['numero trans gu']?.trim();
        const typeOperation = ligne['type operation']?.trim();
        const codeProprietaire = ligne['code proprietaire']?.trim();

        console.log(`🔍 [${index + 1}] Recherche: ${numeroTransGu} | Type: ${typeOperation} | Code: ${codeProprietaire}`);

        if (!numeroTransGu) {
          console.warn(`⚠️ [${index + 1}] Numero Trans GU manquant`);
          return;
        }

        // Chercher la transaction correspondante
        const transactionTrxSf = indexTrxSf.get(numeroTransGu.toLowerCase());

        if (transactionTrxSf) {
          transactionsTrouvees++;
          console.log(`✅ [${index + 1}] Transaction trouvée: ID ${transactionTrxSf.id}`);

          // Mettre à jour le statut à TRAITE
          if (transactionTrxSf.statut !== 'TRAITE') {
            try {
              // Mise à jour via le service
              this.trxSfService.updateStatut(transactionTrxSf.id!, 'TRAITE')
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                  next: (result) => {
                    transactionTrxSf.statut = 'TRAITE';
                    transactionsMisesAJour++;
                    console.log(`✅ Statut mis à jour pour ID ${transactionTrxSf.id}: ${result?.statut || 'TRAITE'}`);
                  },
                  error: (error) => {
                    transactionsErreur++;
                    const msgErreur = `ID ${transactionTrxSf.id}: ${error.message || 'Erreur inconnue'}`;
                    detailsErreurs.push(msgErreur);
                    console.error(`❌ Erreur mise à jour ID ${transactionTrxSf.id}:`, error);
                  }
                });
            } catch (error) {
              transactionsErreur++;
              const msgErreur = `ID ${transactionTrxSf.id}: ${error}`;
              detailsErreurs.push(msgErreur);
              console.error(`❌ Erreur lors de la mise à jour ID ${transactionTrxSf.id}:`, error);
            }
          } else {
            console.log(`ℹ️ [${index + 1}] Transaction déjà TRAITE: ID ${transactionTrxSf.id}`);
          }
        } else {
          transactionsNonTrouvees++;
          const detail = `${numeroTransGu} | ${typeOperation} | ${codeProprietaire}`;
          detailsNonTrouvees.push(detail);
          console.warn(`❌ [${index + 1}] Transaction NON trouvée: ${detail}`);
        }
      });

      // Attendre un peu pour les mises à jour asynchrones
      setTimeout(() => {
        // Générer le rapport
        let rapport = `📊 RAPPORT DE VÉRIFICATION ET MISE À JOUR\n\n`;
        rapport += `📋 Fichier traité: ${donneesFichier.length} lignes\n`;
        rapport += `✅ Transactions trouvées: ${transactionsTrouvees}\n`;
        rapport += `❌ Transactions non trouvées: ${transactionsNonTrouvees}\n`;
        rapport += `🔄 Transactions mises à jour: ${transactionsMisesAJour}\n`;
        rapport += `⚠️ Erreurs de mise à jour: ${transactionsErreur}\n\n`;

        if (detailsNonTrouvees.length > 0) {
          rapport += `📋 DÉTAILS - Transactions non trouvées:\n`;
          detailsNonTrouvees.slice(0, 10).forEach((detail, i) => {
            rapport += `${i + 1}. ${detail}\n`;
          });
          if (detailsNonTrouvees.length > 10) {
            rapport += `... et ${detailsNonTrouvees.length - 10} autre(s)\n`;
          }
          rapport += `\n`;
        }

        if (detailsErreurs.length > 0) {
          rapport += `⚠️ DÉTAILS - Erreurs de mise à jour:\n`;
          detailsErreurs.slice(0, 5).forEach((erreur, i) => {
            rapport += `${i + 1}. ${erreur}\n`;
          });
          if (detailsErreurs.length > 5) {
            rapport += `... et ${detailsErreurs.length - 5} autre(s)\n`;
          }
        }

        this.popupService.showInfo(rapport, 'Rapport de Vérification');

        // Log complet dans la console
        console.log('📊 Rapport complet:', {
          fichierLignes: donneesFichier.length,
          transactionsTrouvees,
          transactionsNonTrouvees,
          transactionsMisesAJour,
          transactionsErreur,
          detailsNonTrouvees,
          detailsErreurs
        });

        this.showTemporaryMessage('success', `Traitement terminé: ${transactionsMisesAJour} statut(s) mis à jour`);
        
        // Recharger les données pour refléter les changements
        this.loadTrxSfData();
        
        this.isVerifyingFrais = false;
      }, 2000); // Attendre 2 secondes pour les mises à jour asynchrones

    } catch (error) {
      console.error('❌ Erreur lors de la vérification:', error);
      this.popupService.showError(`❌ Erreur lors de la vérification: ${error}`, 'Erreur de Vérification');
      this.isVerifyingFrais = false;
    }
  }
}
