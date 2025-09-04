import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { EcartSolde, EcartSoldeFilter } from '../../models/ecart-solde.model';
import { EcartSoldeService } from '../../services/ecart-solde.service';
import { PopupService } from '../../services/popup.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-ecart-solde',
  templateUrl: './ecart-solde.component.html',
  styleUrls: ['./ecart-solde.component.scss']
})
export class EcartSoldeComponent implements OnInit, OnDestroy {
  ecartSoldes: EcartSolde[] = [];
  filteredEcartSoldes: EcartSolde[] = [];
  isLoading = false;
  isUploading = false;
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  Math = Math; // Pour utiliser Math dans le template
  
  // Filtres
  filterForm: FormGroup;
  agences: string[] = [];
  services: string[] = [];
  pays: string[] = [];
  numeroTransGUs: string[] = [];
  statuts = ['EN_ATTENTE', 'TRAITE', 'ERREUR'];
  
  // Upload
  selectedFile: File | null = null;
  uploadMessage: { type: 'success' | 'error', text: string } | null = null;
  fileValidated = false;
  validationResult: {
    validLines: number;
    errorLines: number;
    duplicates: number;
    newRecords: number;
    hasErrors: boolean;
  } | null = null;
  uploadError = '';
  
  // Sélection multiple
  selectedItems: Set<number> = new Set();
  isSelectAll = false;
  isSelectionMode = false;
  selectedStatut = 'EN_ATTENTE';
  isUpdatingMultipleStatuts = false;
  
  // Propriétés pour le modal de commentaire
  showCommentModal = false;
  selectedEcartSolde: EcartSolde | null = null;
  newStatut = '';
  commentaire = '';
  commentForm: FormGroup;

  private subscription = new Subscription();

  constructor(
    private ecartSoldeService: EcartSoldeService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
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

    this.commentForm = this.fb.group({
      commentaire: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.loadEcartSoldes();
    this.loadFilterOptions();
    this.setupFilterListener();
    
    // Lire les paramètres de l'URL pour appliquer les filtres automatiquement
    this.subscription.add(
      this.route.queryParams.subscribe(params => {
        if (params['agence'] || params['dateTransaction']) {
          // Appliquer les filtres automatiquement
          if (params['agence']) {
            this.filterForm.patchValue({ agence: params['agence'] });
          }
          if (params['dateTransaction']) {
            // Convertir la date pour le format datetime-local
            const date = new Date(params['dateTransaction']);
            const dateString = date.toISOString().slice(0, 16); // Format YYYY-MM-DDTHH:mm
            this.filterForm.patchValue({ 
              dateDebut: dateString,
              dateFin: dateString
            });
          }
          
          // Appliquer les filtres
          this.applyFilters();
        }
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  loadEcartSoldes() {
    this.isLoading = true;
    this.subscription.add(
      this.ecartSoldeService.getEcartSoldes().subscribe({
        next: (data) => {
          this.ecartSoldes = data;
          this.filteredEcartSoldes = [...data];
          
          // Trier par date décroissante (du plus récent au plus ancien)
          this.filteredEcartSoldes.sort((a, b) => new Date(b.dateTransaction).getTime() - new Date(a.dateTransaction).getTime());
          
          this.calculatePagination();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Erreur de chargement des écarts de solde', err);
          this.isLoading = false;
        }
      })
    );
  }

  loadFilterOptions() {
    // Charger les agences
    this.subscription.add(
      this.ecartSoldeService.getDistinctAgences().subscribe({
        next: (agences) => this.agences = agences,
        error: (err) => console.error('Erreur de chargement des agences', err)
      })
    );

    // Charger les services
    this.subscription.add(
      this.ecartSoldeService.getDistinctServices().subscribe({
        next: (services) => this.services = services,
        error: (err) => console.error('Erreur de chargement des services', err)
      })
    );

    // Charger les pays
    this.subscription.add(
      this.ecartSoldeService.getDistinctPays().subscribe({
        next: (pays) => this.pays = pays,
        error: (err) => console.error('Erreur de chargement des pays', err)
      })
    );

    // Charger les numéros Trans GU
    this.subscription.add(
      this.ecartSoldeService.getDistinctNumeroTransGu().subscribe({
        next: (numeroTransGUs) => this.numeroTransGUs = numeroTransGUs,
        error: (err) => console.error('Erreur de chargement des numéros Trans GU', err)
      })
    );
  }

  setupFilterListener() {
    this.subscription.add(
      this.filterForm.valueChanges.subscribe(() => {
        this.applyFilters();
      })
    );
  }

  applyFilters() {
    const filters = this.filterForm.value;
    this.filteredEcartSoldes = this.ecartSoldes.filter(ecart => {
      let match = true;
      
      if (filters.agence && ecart.agence !== filters.agence) {
        match = false;
      }
      
      if (filters.service && ecart.service !== filters.service) {
        match = false;
      }
      
      if (filters.pays && ecart.pays !== filters.pays) {
        match = false;
      }
      
      if (filters.numeroTransGu && ecart.numeroTransGu !== filters.numeroTransGu) {
        match = false;
      }
      
      if (filters.statut && ecart.statut !== filters.statut) {
        match = false;
      }
      
      if (filters.dateDebut && ecart.dateTransaction < filters.dateDebut) {
        match = false;
      }
      
      if (filters.dateFin && ecart.dateTransaction > filters.dateFin) {
        match = false;
      }
      
      return match;
    });
    
    // Trier par date décroissante (du plus récent au plus ancien)
    this.filteredEcartSoldes.sort((a, b) => new Date(b.dateTransaction).getTime() - new Date(a.dateTransaction).getTime());
    
    this.currentPage = 1;
    this.calculatePagination();
  }

  clearFilters() {
    this.filterForm.reset();
    this.filteredEcartSoldes = [...this.ecartSoldes];
    this.currentPage = 1;
    this.calculatePagination();
  }

  calculatePagination() {
    this.totalPages = Math.ceil(this.filteredEcartSoldes.length / this.pageSize);
  }

  get pagedEcartSoldes(): EcartSolde[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.filteredEcartSoldes.slice(startIndex, endIndex);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  getVisiblePages(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.fileValidated = false;
      this.validationResult = null;
      this.uploadMessage = null;
    }
  }

  validateFile() {
    if (!this.selectedFile) return;
    
    this.isUploading = true;
    this.validationResult = null;
    
    this.subscription.add(
      this.ecartSoldeService.validateFile(this.selectedFile).subscribe({
        next: (result) => {
          this.validationResult = result;
          this.fileValidated = true;
          this.isUploading = false;
          
          if (result.hasErrors) {
            this.uploadMessage = { 
              type: 'error', 
              text: `Validation terminée avec ${result.errorLines} erreurs détectées` 
            };
          } else {
            this.uploadMessage = { 
              type: 'success', 
              text: `Validation réussie : ${result.newRecords} nouveaux enregistrements prêts à être importés` 
            };
          }
        },
        error: (err) => {
          this.uploadMessage = { 
            type: 'error', 
            text: err.error?.error || 'Erreur lors de la validation du fichier' 
          };
          this.isUploading = false;
        }
      })
    );
  }

  uploadFile() {
    if (!this.selectedFile) return;
    
    this.isUploading = true;
    this.uploadMessage = null;
    this.validationResult = null;

    this.subscription.add(
      this.ecartSoldeService.uploadCsvFile(this.selectedFile).subscribe({
        next: (response) => {
          this.uploadMessage = { type: 'success', text: `${response.message} - ${response.count} enregistrements importés` };
          this.selectedFile = null;
          this.fileValidated = false;
          this.validationResult = null;
          this.loadEcartSoldes(); // Recharger les données
          this.isUploading = false;
        },
        error: (err) => {
          this.uploadMessage = { type: 'error', text: err.error?.error || 'Erreur lors de l\'upload du fichier' };
          this.isUploading = false;
        }
      })
    );
  }

  updateStatut(ecartSolde: EcartSolde, newStatut: string) {
    if (!ecartSolde.id) {
      console.error('ID de l\'écart de solde manquant');
      this.showTemporaryMessage('error', 'ID de l\'écart de solde manquant');
      return;
    }

    // Sauvegarder l'ancien statut pour pouvoir le restaurer en cas d'erreur
    const oldStatut = ecartSolde.statut;
    
    // Mettre à jour immédiatement l'interface pour une meilleure UX
    ecartSolde.statut = newStatut;

    console.log(`🔄 Tentative de mise à jour du statut: ID=${ecartSolde.id}, ${oldStatut} → ${newStatut}`);

    this.subscription.add(
      this.ecartSoldeService.updateStatut(ecartSolde.id, newStatut).subscribe({
        next: (response) => {
          console.log(`✅ Statut mis à jour avec succès: ${oldStatut} → ${newStatut}`, response);
          this.showTemporaryMessage('success', `Statut mis à jour: ${newStatut}`);
        },
        error: (err) => {
          console.error('❌ Erreur lors de la mise à jour du statut', err);
          
          // Restaurer l'ancien statut en cas d'erreur
          ecartSolde.statut = oldStatut;
          
          // Afficher un message d'erreur détaillé
          let errorMessage = 'Erreur lors de la mise à jour du statut';
          if (err.error?.message) {
            errorMessage += `: ${err.error.message}`;
          } else if (err.error?.error) {
            errorMessage += `: ${err.error.error}`;
          } else if (err.message) {
            errorMessage += `: ${err.message}`;
          } else if (err.status) {
            errorMessage += ` (HTTP ${err.status})`;
          }
          
          this.showTemporaryMessage('error', errorMessage);
        }
      })
    );
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

  onStatutChange(ecartSolde: EcartSolde, event: Event) {
    const target = event.target as HTMLSelectElement;
    const newStatut = target.value;
    
    if (newStatut && newStatut !== ecartSolde.statut && ecartSolde.id) {
      // Sauvegarder l'ancien statut pour pouvoir le restaurer en cas d'erreur
      const oldStatut = ecartSolde.statut;
      
      // Mettre à jour immédiatement l'interface pour une meilleure UX
      ecartSolde.statut = newStatut;

      this.subscription.add(
        this.ecartSoldeService.updateStatut(ecartSolde.id, newStatut).subscribe({
          next: (response) => {
            console.log(`Statut mis à jour avec succès: ${oldStatut} → ${newStatut}`, response);
            this.showTemporaryMessage('success', `Statut mis à jour: ${newStatut}`);
          },
          error: (error) => {
            console.error('Erreur lors de la mise à jour du statut:', error);
            
            // Restaurer l'ancien statut en cas d'erreur
            ecartSolde.statut = oldStatut;
            target.value = oldStatut || 'EN_ATTENTE';
            
            this.showTemporaryMessage('error', 'Erreur lors de la mise à jour du statut');
          }
        })
      );
    }
  }

  openCommentModal(ecartSolde: EcartSolde, newStatut: string) {
    this.selectedEcartSolde = ecartSolde;
    this.newStatut = newStatut;
    this.commentaire = '';
    this.commentForm.reset();
    this.showCommentModal = true;
  }

  closeCommentModal() {
    this.showCommentModal = false;
    this.selectedEcartSolde = null;
    this.newStatut = '';
    this.commentaire = '';
    this.commentForm.reset();
  }

  confirmStatutChange() {
    if (this.commentForm.valid && this.selectedEcartSolde) {
      this.commentaire = this.commentForm.get('commentaire')?.value;
      this.updateStatutWithComment(this.selectedEcartSolde, this.newStatut, this.commentaire);
      this.closeCommentModal();
    }
  }

  updateStatutWithComment(ecartSolde: EcartSolde, newStatut: string, commentaire: string) {
    if (!ecartSolde.id) {
      console.error('ID de l\'écart de solde manquant');
      this.showTemporaryMessage('error', 'ID de l\'écart de solde manquant');
      return;
    }

    // Sauvegarder l'ancien statut pour pouvoir le restaurer en cas d'erreur
    const oldStatut = ecartSolde.statut;
    
    // Mettre à jour immédiatement l'interface pour une meilleure UX
    ecartSolde.statut = newStatut;

    console.log(`🔄 Tentative de mise à jour du statut: ID=${ecartSolde.id}, ${oldStatut} → ${newStatut}, Commentaire: ${commentaire}`);

    this.subscription.add(
      this.ecartSoldeService.updateStatutWithComment(ecartSolde.id, newStatut, commentaire).subscribe({
        next: (response) => {
          console.log(`✅ Statut mis à jour avec succès: ${oldStatut} → ${newStatut}`, response);
          this.showTemporaryMessage('success', `Statut mis à jour: ${newStatut}`);
        },
        error: (err) => {
          console.error('❌ Erreur lors de la mise à jour du statut', err);
          
          // Restaurer l'ancien statut en cas d'erreur
          ecartSolde.statut = oldStatut;
          
          // Afficher un message d'erreur détaillé
          let errorMessage = 'Erreur lors de la mise à jour du statut';
          if (err.error?.message) {
            errorMessage += `: ${err.error.message}`;
          } else if (err.error?.error) {
            errorMessage += `: ${err.error.error}`;
          } else if (err.message) {
            errorMessage += `: ${err.message}`;
          } else if (err.status) {
            errorMessage += ` (HTTP ${err.status})`;
          }
          
          this.showTemporaryMessage('error', errorMessage);
        }
      })
    );
  }

  deleteEcartSolde(id: number) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet écart de solde ?')) {
      this.subscription.add(
        this.ecartSoldeService.deleteEcartSolde(id).subscribe({
          next: () => {
            this.loadEcartSoldes();
          },
          error: (err) => {
            console.error('Erreur lors de la suppression', err);
          }
        })
      );
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('fr-FR');
  }

  formatMontant(montant: number): string {
    if (montant === null || montant === undefined) return '0 F CFA';
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(montant) + ' F CFA';
  }

  formatMontantFrais(montant: number): string {
    if (montant === null || montant === undefined) return '0,00 F CFA';
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(montant) + ' F CFA';
  }

  getStatutClass(statut: string): string {
    switch (statut) {
      case 'TRAITE':
        return 'status-traite';
      case 'ERREUR':
        return 'status-erreur';
      default:
        return 'status-attente';
    }
  }

  // Méthodes pour l'affichage des frais
  getFraisTypeClass(typeCalcul: string): string {
    switch (typeCalcul) {
      case 'POURCENTAGE':
        return 'frais-type-percentage';
      case 'NOMINAL':
        return 'frais-type-nominal';
      default:
        return 'frais-type-default';
    }
  }

  getFraisTypeLabel(typeCalcul: string): string {
    switch (typeCalcul) {
      case 'POURCENTAGE':
        return 'Pourcentage';
      case 'NOMINAL':
        return 'Fixe';
      default:
        return 'Standard';
    }
  }

  exportEcartSoldes(): void {
    if (this.filteredEcartSoldes.length === 0) {
      this.popupService.showInfo('Aucune donnée à exporter', 'Aucune Donnée');
      return;
    }

    const exportData: any[] = this.filteredEcartSoldes.map(ecart => ({
      'ID Transaction': ecart.idTransaction,
      'Téléphone Client': ecart.telephoneClient || '',
      'Montant': ecart.montant,
      'Service': ecart.service || '',
      'Agence': ecart.agence || '',
      'Date Transaction': ecart.dateTransaction ? new Date(ecart.dateTransaction).toLocaleDateString('fr-FR') : '',
      'Numéro Trans GU': ecart.numeroTransGu || '',
      'Pays': ecart.pays || '',
      'Statut': ecart.statut || 'EN_ATTENTE',
      'Frais': ecart.fraisAssocie ? ecart.fraisAssocie.montant : 0,
      'Type Frais': ecart.fraisAssocie ? this.getFraisTypeLabel(ecart.fraisAssocie.typeCalcul) : '',
      'Pourcentage Frais': ecart.fraisAssocie?.pourcentage || '',
      'Commentaire': ecart.commentaire || '',
      'Date Import': ecart.dateImport ? new Date(ecart.dateImport).toLocaleDateString('fr-FR') : ''
    }));

    this.createExcelWithColors(exportData);
  }

  private createExcelWithColors(data: any[]): void {
    const workbook = XLSX.utils.book_new();
    
    const exportData = data.map(row => ({
      'ID Transaction': row['ID Transaction'],
      'Téléphone Client': row['Téléphone Client'],
      'Montant': row['Montant'],
      'Service': row['Service'],
      'Agence': row['Agence'],
      'Date Transaction': row['Date Transaction'],
      'Numéro Trans GU': row['Numéro Trans GU'],
      'Pays': row['Pays'],
      'Statut': row['Statut'],
      'Frais': row['Frais'],
      'Type Frais': row['Type Frais'],
      'Pourcentage Frais': row['Pourcentage Frais'],
      'Commentaire': row['Commentaire'],
      'Date Import': row['Date Import']
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    const columnWidths = [
      { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 },
      { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 15 }
    ];
    worksheet['!cols'] = columnWidths;

    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    
    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!worksheet[cellAddress]) continue;
        
        const cell = worksheet[cellAddress];
        const header = exportData[0] ? Object.keys(exportData[0])[C] : '';
        const value = cell.v;
        
        if (R === 0) { // Header row
          cell.s = {
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '2C3E50' } },
            alignment: { horizontal: 'center' }
          };
        } else { // Data rows
          let style: any = {
            font: { size: 11 },
            alignment: { horizontal: 'left' }
          };

          if (header === 'Montant' && typeof value === 'number') {
            style.font = { ...style.font, bold: true, color: { rgb: '28A745' } };
            style.fill = { fgColor: { rgb: 'D4EDDA' } };
          } else if (header === 'Statut') {
            if (value === 'EN_ATTENTE') {
              style.fill = { fgColor: { rgb: 'FFF3CD' } };
              style.font = { ...style.font, color: { rgb: '856404' } };
            } else if (value === 'TRAITE') {
              style.fill = { fgColor: { rgb: 'D4EDDA' } };
              style.font = { ...style.font, color: { rgb: '155724' } };
            } else if (value === 'ERREUR') {
              style.fill = { fgColor: { rgb: 'F8D7DA' } };
              style.font = { ...style.font, color: { rgb: '721C24' } };
            }
          } else if (header === 'Frais' && typeof value === 'number' && value > 0) {
            style.font = { ...style.font, bold: true, color: { rgb: 'DC3545' } };
            style.fill = { fgColor: { rgb: 'FFF5F5' } };
          } else if (header === 'Service') {
            style.font = { ...style.font, bold: true, color: { rgb: '6F42C1' } };
          } else if (header === 'Agence') {
            style.font = { ...style.font, bold: true, color: { rgb: 'FD7E14' } };
          } else if (header === 'Commentaire' && value) {
            style.font = { ...style.font, italic: true, color: { rgb: '007BFF' } };
            style.fill = { fgColor: { rgb: 'E8F4FD' } };
          }
          cell.s = style;
        }
      }
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Écarts de Solde');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ecarts-solde-${new Date().toISOString().split('T')[0]}.xlsx`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Méthodes pour les statistiques
  getStatutCount(statut: string): number {
    return this.filteredEcartSoldes.filter(ecart => ecart.statut === statut).length;
  }

  formatMontantTotal(): string {
    const total = this.filteredEcartSoldes.reduce((sum, ecart) => sum + ecart.montant, 0);
    return this.formatMontant(total);
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
    this.filteredEcartSoldes.forEach(item => {
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

  toggleItemSelection(item: EcartSolde): void {
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
    const allFilteredItems = this.filteredEcartSoldes;
    const selectedCount = allFilteredItems.filter(item => item.id && this.selectedItems.has(item.id)).length;
    this.isSelectAll = selectedCount === allFilteredItems.length && allFilteredItems.length > 0;
  }

  getSelectedCount(): number {
    return this.selectedItems.size;
  }

  isItemSelected(item: EcartSolde): boolean {
    return item.id ? this.selectedItems.has(item.id) : false;
  }

  updateMultipleStatuts(): void {
    if (this.selectedItems.size === 0) {
      this.popupService.showWarning('Veuillez sélectionner au moins un écart de solde.', 'Sélection Requise');
      return;
    }

    this.isUpdatingMultipleStatuts = true;
    const selectedIds = Array.from(this.selectedItems);
    
    // Créer les promesses pour mettre à jour chaque écart de solde
    const updatePromises = selectedIds.map(id => 
      this.ecartSoldeService.updateStatut(id, this.selectedStatut).toPromise()
    );

    Promise.all(updatePromises)
      .then(() => {
        console.log(`${selectedIds.length} écarts de solde mis à jour avec le statut ${this.selectedStatut}`);
        this.clearSelection();
        this.loadEcartSoldes(); // Recharger les données
        this.isUpdatingMultipleStatuts = false;
        this.showTemporaryMessage('success', `${selectedIds.length} écart(s) de solde mis à jour avec succès`);
      })
      .catch(error => {
        console.error('Erreur lors de la mise à jour multiple:', error);
        this.isUpdatingMultipleStatuts = false;
        this.showTemporaryMessage('error', 'Erreur lors de la mise à jour des statuts.');
      });
  }
} 