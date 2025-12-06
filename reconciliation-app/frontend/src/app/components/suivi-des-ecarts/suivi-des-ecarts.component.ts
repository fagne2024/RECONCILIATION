import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SuiviEcart } from '../../models/suivi-ecart.model';
import { SuiviEcartService } from '../../services/suivi-ecart.service';
import { PopupService } from '../../services/popup.service';
import { AppStateService } from '../../services/app-state.service';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

@Component({
  selector: 'app-suivi-des-ecarts',
  templateUrl: './suivi-des-ecarts.component.html',
  styleUrls: ['./suivi-des-ecarts.component.scss']
})
export class SuiviDesEcartsComponent implements OnInit, OnDestroy {
  suiviEcarts: SuiviEcart[] = [];
  filteredEcarts: SuiviEcart[] = [];
  isLoading = false;
  isUploading = false;
  currentPage = 1;
  pageSize = 20;
  totalPages = 1;

  // Upload
  selectedFile: File | null = null;
  uploadMessage: { type: 'success' | 'error', text: string } | null = null;

  // Formulaire d'ajout/édition
  showAddModal = false;
  showEditModal = false;
  editingItem: SuiviEcart | null = null;
  form: FormGroup;

  // Édition inline
  editingStatusRow: SuiviEcart | null = null;
  editingTraitementRow: SuiviEcart | null = null;

  // Options pour les listes déroulantes
  statutOptions = ['En cours...', 'OK'];
  traitementOptions = ['Niveau Support', 'Niveau partenaire', 'Niveau group', 'Terminé'];

  // Filtres
  selectedDateDebut: string = '';
  selectedDateFin: string = '';
  selectedAgence: string = '';
  selectedService: string = '';
  selectedPays: string = '';
  selectedStatut: string = '';
  selectedTraitement: string = '';
  selectedToken: string = '';
  selectedIdPartenaire: string = '';

  // Liste des valeurs uniques pour les filtres
  uniqueAgencies: string[] = [];
  uniqueServices: string[] = [];
  uniquePays: string[] = [];
  filteredAgencies: string[] = [];
  filteredServices: string[] = [];

  // Gestion des sauvegardes automatiques de l'ID TICKET
  private glpiAutoSaveTimers = new Map<SuiviEcart, any>();
  private lastSavedGlpiIds = new Map<SuiviEcart, string>();

  private subscription = new Subscription();

  constructor(
    private suiviEcartService: SuiviEcartService,
    private fb: FormBuilder,
    private router: Router,
    private popupService: PopupService,
    private appStateService: AppStateService,
    private http: HttpClient
  ) {
    this.form = this.fb.group({
      date: ['', Validators.required],
      agence: ['', Validators.required],
      service: ['', Validators.required],
      pays: ['', Validators.required],
      montant: [0, [Validators.required, Validators.min(0)]],
      token: ['', Validators.required],
      idPartenaire: ['', Validators.required],
      statut: ['', Validators.required],
      traitement: ['']
    });
  }

  ngOnInit() {
    this.loadData();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  loadData() {
    this.isLoading = true;
    this.subscription.add(
      this.suiviEcartService.getAll().subscribe({
        next: (data) => {
          this.suiviEcarts = data;
          this.syncLastSavedGlpiValues(data);
          this.extractUniqueValues();
          this.applyFilters();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Erreur de chargement des écarts', err);
          this.popupService.showError('Erreur lors du chargement des données');
          this.isLoading = false;
        }
      })
    );
  }

  extractUniqueValues() {
    this.uniqueAgencies = [...new Set(this.suiviEcarts.map(e => e.agence).filter(Boolean))].sort();
    this.uniqueServices = [...new Set(this.suiviEcarts.map(e => e.service).filter(Boolean))].sort();
    this.uniquePays = [...new Set(this.suiviEcarts.map(e => e.pays).filter(Boolean))].sort();
    this.filteredAgencies = [...this.uniqueAgencies];
    this.filteredServices = [...this.uniqueServices];
  }

  applyFilters() {
    this.filteredEcarts = this.suiviEcarts.filter(item => {
      // Filtre par date
      if (this.selectedDateDebut) {
        const itemDate = new Date(item.date);
        const dateDebut = new Date(this.selectedDateDebut);
        if (itemDate < dateDebut) return false;
      }
      if (this.selectedDateFin) {
        const itemDate = new Date(item.date);
        const dateFin = new Date(this.selectedDateFin);
        dateFin.setHours(23, 59, 59, 999); // Fin de journée
        if (itemDate > dateFin) return false;
      }

      // Filtre par agence
      if (this.selectedAgence && item.agence !== this.selectedAgence) return false;

      // Filtre par service
      if (this.selectedService && item.service !== this.selectedService) return false;

      // Filtre par pays
      if (this.selectedPays && item.pays !== this.selectedPays) return false;

      // Filtre par statut
      if (this.selectedStatut && item.statut !== this.selectedStatut) return false;

      // Filtre par traitement
      if (this.selectedTraitement && item.traitement !== this.selectedTraitement) return false;

      // Filtre par token
      if (this.selectedToken && item.token && !item.token.toLowerCase().includes(this.selectedToken.toLowerCase())) return false;

      // Filtre par IDPartenaire
      if (this.selectedIdPartenaire && item.idPartenaire && !item.idPartenaire.toLowerCase().includes(this.selectedIdPartenaire.toLowerCase())) return false;

      return true;
    });

    this.currentPage = 1;
    this.calculatePagination();
  }

  onAgenceFilterChange() {
    const searchTerm = this.selectedAgence.toLowerCase();
    this.filteredAgencies = this.uniqueAgencies.filter(a => 
      a.toLowerCase().includes(searchTerm)
    );
    this.applyFilters();
  }

  onServiceFilterChange() {
    const searchTerm = this.selectedService.toLowerCase();
    this.filteredServices = this.uniqueServices.filter(s => 
      s.toLowerCase().includes(searchTerm)
    );
    this.applyFilters();
  }

  clearAgenceFilter() {
    this.selectedAgence = '';
    this.applyFilters();
  }

  clearServiceFilter() {
    this.selectedService = '';
    this.applyFilters();
  }

  clearDateFilters() {
    this.selectedDateDebut = '';
    this.selectedDateFin = '';
    this.applyFilters();
  }

  clearAllFilters() {
    this.selectedDateDebut = '';
    this.selectedDateFin = '';
    this.selectedAgence = '';
    this.selectedService = '';
    this.selectedPays = '';
    this.selectedStatut = '';
    this.selectedTraitement = '';
    this.selectedToken = '';
    this.selectedIdPartenaire = '';
    this.applyFilters();
  }

  clearTokenFilter() {
    this.selectedToken = '';
    this.applyFilters();
  }

  clearIdPartenaireFilter() {
    this.selectedIdPartenaire = '';
    this.applyFilters();
  }

  calculatePagination() {
    this.totalPages = Math.ceil(this.filteredEcarts.length / this.pageSize);
  }

  get pagedItems(): SuiviEcart[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.filteredEcarts.slice(startIndex, endIndex);
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

  openAddModal() {
    this.form.reset();
    this.showAddModal = true;
  }

  closeAddModal() {
    this.showAddModal = false;
    this.form.reset();
  }

  openEditModal(item: SuiviEcart) {
    this.editingItem = item;
    // Convertir la date au format YYYY-MM-DD pour l'input type="date"
    const dateValue = item.date ? new Date(item.date).toISOString().split('T')[0] : '';
    this.form.patchValue({
      date: dateValue,
      agence: item.agence,
      service: item.service,
      pays: item.pays,
      montant: item.montant,
      token: item.token,
      idPartenaire: item.idPartenaire,
      statut: item.statut,
      traitement: item.traitement || ''
    });
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
    this.editingItem = null;
    this.form.reset();
  }

  async saveItem() {
    if (this.form.invalid) {
      await this.popupService.showError('Veuillez remplir tous les champs requis');
      return;
    }

    const formValue = this.form.value;
    const username = this.appStateService.getUsername();
    const item: SuiviEcart = {
      ...formValue,
      id: this.editingItem?.id,
      username: username || undefined
    };

    this.isLoading = true;
    const operation = this.editingItem
      ? this.suiviEcartService.update(this.editingItem.id!, item)
      : this.suiviEcartService.create(item);

    this.subscription.add(
      operation.subscribe({
        next: async () => {
          await this.popupService.showSuccess(
            this.editingItem ? 'Écart modifié avec succès' : 'Écart ajouté avec succès'
          );
          this.loadData();
          this.closeAddModal();
          this.closeEditModal();
          this.isLoading = false;
        },
        error: async (err) => {
          console.error('Erreur lors de la sauvegarde', err);
          await this.popupService.showError(err.error?.message || 'Erreur lors de la sauvegarde');
          this.isLoading = false;
        }
      })
    );
  }

  async confirmDelete(item: SuiviEcart) {
    const confirmed = await this.popupService.showConfirm(
      `Êtes-vous sûr de vouloir supprimer cet écart ?\n\nAgence: ${item.agence}\nService: ${item.service}\nPays: ${item.pays}`,
      'Confirmation de suppression'
    );

    if (confirmed) {
      this.deleteItem(item);
    }
  }

  deleteItem(item: SuiviEcart) {
    if (!item?.id) return;

    this.isLoading = true;
    this.subscription.add(
      this.suiviEcartService.delete(item.id).subscribe({
        next: async () => {
          await this.popupService.showSuccess('Écart supprimé avec succès');
          this.loadData();
          this.isLoading = false;
        },
        error: async (err) => {
          console.error('Erreur lors de la suppression', err);
          await this.popupService.showError(err.error?.message || 'Erreur lors de la suppression');
          this.isLoading = false;
        }
      })
    );
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.uploadMessage = null;
    }
  }

  uploadFile() {
    if (!this.selectedFile) return;

    this.isUploading = true;
    this.uploadMessage = null;

    this.subscription.add(
      this.suiviEcartService.uploadFile(this.selectedFile).subscribe({
        next: (response: any) => {
          this.uploadMessage = { 
            type: 'success', 
            text: response.message || 'Fichier uploadé avec succès' 
          };
          this.selectedFile = null;
          this.loadData();
          this.isUploading = false;
        },
        error: (err) => {
          this.uploadMessage = { 
            type: 'error', 
            text: err.error?.message || 'Erreur lors de l\'upload du fichier' 
          };
          this.isUploading = false;
        }
      })
    );
  }

  downloadTemplate() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Modèle Suivi Écarts');

    // En-têtes
    worksheet.addRow(['Date', 'Agence', 'Service', 'Pays', 'Montant', 'Token', 'IDPartenaire', 'Statut', 'Traitement', 'ID TICKET']);

    // Style des en-têtes
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Exemple de ligne
    worksheet.addRow([
      new Date(),
      'Exemple Agence',
      'Exemple Service',
      'Exemple Pays',
      1000,
      'TOKEN123',
      'PART001',
      'En cours...',
      'Niveau Support',
      ''
    ]);

    // Ajuster les largeurs de colonnes
    worksheet.columns.forEach(column => {
      column.width = 15;
    });

    // Générer le fichier
    workbook.xlsx.writeBuffer().then((buffer) => {
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, 'modele-suivi-ecarts.xlsx');
    });
  }

  goBack() {
    this.router.navigate(['/reconciliation-report']);
  }

  // Méthodes pour l'édition inline du statut
  startEditStatus(item: SuiviEcart) {
    this.editingStatusRow = item;
  }

  stopEditStatus() {
    this.editingStatusRow = null;
  }

  onStatusChange(item: SuiviEcart) {
    if (!item.id) {
      this.stopEditStatus();
      return;
    }

    this.subscription.add(
      this.suiviEcartService.update(item.id, item).subscribe({
        next: async () => {
          await this.popupService.showSuccess('Statut mis à jour avec succès');
          this.stopEditStatus();
        },
        error: async (err) => {
          console.error('Erreur lors de la mise à jour du statut', err);
          await this.popupService.showError(err.error?.message || 'Erreur lors de la mise à jour du statut');
          this.loadData(); // Recharger pour restaurer l'ancienne valeur
        }
      })
    );
  }

  // Méthodes pour l'édition inline du traitement
  startEditTraitement(item: SuiviEcart) {
    this.editingTraitementRow = item;
  }

  stopEditTraitement() {
    this.editingTraitementRow = null;
  }

  onTraitementChange(item: SuiviEcart) {
    if (!item.id) {
      this.stopEditTraitement();
      return;
    }

    this.subscription.add(
      this.suiviEcartService.update(item.id, item).subscribe({
        next: async () => {
          await this.popupService.showSuccess('Traitement mis à jour avec succès');
          this.stopEditTraitement();
        },
        error: async (err) => {
          console.error('Erreur lors de la mise à jour du traitement', err);
          await this.popupService.showError(err.error?.message || 'Erreur lors de la mise à jour du traitement');
          this.loadData(); // Recharger pour restaurer l'ancienne valeur
        }
      })
    );
  }

  // Méthodes pour les classes CSS
  getStatusClass(statut?: string): string {
    if (!statut) return 'status-badge';
    const cleanStatus = statut.toLowerCase().replace(/\s+/g, '-').replace('...', '');
    return `status-badge status-${cleanStatus}`;
  }

  getTraitementClass(traitement?: string): string {
    if (!traitement) return 'traitement-badge';
    const cleanTraitement = traitement.toLowerCase().replace(/\s+/g, '-');
    return `traitement-badge traitement-${cleanTraitement}`;
  }

  // Fonctions pour gérer les tickets GLPI
  openGlpiCreate() {
    const glpiCreateUrl = 'https://glpi.intouchgroup.net/glpi/front/ticket.form.php';
    window.open(glpiCreateUrl, '_blank');
  }

  getGlpiTicketUrl(idGlpi: string): string {
    return `https://glpi.intouchgroup.net/glpi/front/ticket.form.php?id=${idGlpi}`;
  }

  getBometierTicketUrl(idGlpi: string): string {
    return `https://bometier.intouchgroup.net/bometier/front/ticket.form.php?id=${idGlpi}`;
  }

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

    overlay.addEventListener('click', (e: any) => {
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

  onGlpiIdInputChange(item: SuiviEcart, value: string) {
    if (!item || !item.id) {
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

  onGlpiIdInputBlur(item: SuiviEcart) {
    if (!item) return;
    if (!item.id) {
      if ((item.glpiId || '').trim()) {
        this.popupService.showWarning('Ligne non sauvegardée', 'Veuillez sauvegarder la ligne avant de renseigner un ID TICKET.');
      }
      return;
    }
    this.triggerGlpiAutoSave(item, true);
  }

  onGlpiIdInputEnter(item: SuiviEcart) {
    if (!item) return;
    if (!item.id) {
      if ((item.glpiId || '').trim()) {
        this.popupService.showWarning('Ligne non sauvegardée', 'Veuillez sauvegarder la ligne avant de renseigner un ID TICKET.');
      }
      return;
    }
    this.triggerGlpiAutoSave(item, true);
  }

  private triggerGlpiAutoSave(item: SuiviEcart, force = false) {
    this.clearGlpiAutoSaveTimer(item);

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

  private saveGlpiIdAutomatically(item: SuiviEcart, glpiId: string) {
    if (!item.id) {
      return;
    }

    const payload = { ...item, glpiId };
    this.http.put<any>(`/api/suivi-ecart/${item.id}`, payload)
      .subscribe({
        next: () => {
          item.glpiId = glpiId;
          this.lastSavedGlpiIds.set(item, glpiId);
          this.popupService.showSuccess('ID TICKET enregistré automatiquement');
        },
        error: (err: HttpErrorResponse) => {
          console.error('Erreur lors de la sauvegarde automatique de l\'ID TICKET', err);
          this.popupService.showError('Erreur', 'Impossible d\'enregistrer automatiquement l\'ID TICKET.');
        }
      });
  }

  private clearGlpiAutoSaveTimer(item: SuiviEcart) {
    const timer = this.glpiAutoSaveTimers.get(item);
    if (timer) {
      clearTimeout(timer);
      this.glpiAutoSaveTimers.delete(item);
    }
  }

  private syncLastSavedGlpiValues(items: SuiviEcart[]) {
    if (!items || !items.length) {
      return;
    }
    items.forEach(row => {
      this.lastSavedGlpiIds.set(row, (row.glpiId || '').trim());
    });
  }

}
