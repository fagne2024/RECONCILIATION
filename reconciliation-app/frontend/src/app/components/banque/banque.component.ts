import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { OperationBancaire } from '../../models/operation-bancaire.model';
import { OperationBancaireService } from '../../services/operation-bancaire.service';
import { Compte } from '../../models/compte.model';
import { CompteService } from '../../services/compte.service';
import { OperationService } from '../../services/operation.service';
import { ReleveBancaireService } from '../../services/releve-bancaire.service';
import { ReleveBancaireRow } from '../../models/releve-bancaire.model';

// Interface locale pour les opérations bancaires avec Date
interface OperationBancaireDisplay extends Omit<OperationBancaire, 'dateOperation'> {
  dateOperation: Date;
}

// Interface pour les filtres
interface FiltresOperation {
  pays: string;
  typeOperation: string;
  statut: string;
  dateDebut: string;
  dateFin: string;
}

@Component({
  selector: 'app-banque',
  templateUrl: './banque.component.html',
  styleUrls: ['./banque.component.scss']
})
export class BanqueComponent implements OnInit {
  // État d'affichage
  showOperations = false;
  activeSection: 'home' | 'operations' | 'comptes' | 'rapports' | 'securite' = 'home';

  // Données des opérations
  operations: OperationBancaireDisplay[] = [];
  filteredOperations: OperationBancaireDisplay[] = [];
  pagedOperations: OperationBancaireDisplay[] = [];

  // Filtres
  filters: FiltresOperation = {
    pays: '',
    typeOperation: '',
    statut: '',
    dateDebut: '',
    dateFin: ''
  };

  // Listes pour les filtres
  paysList: string[] = ['Côte d\'Ivoire', 'Mali', 'Burkina Faso', 'Sénégal', 'Togo', 'Cameroun'];
  typesOperation: string[] = ['Compensation Client', 'Approvisionnement', 'Nivellement', 'Virement', 'Paiement', 'Retrait', 'Dépôt'];
  statutsList: string[] = ['Validée', 'En attente', 'Rejetée', 'En cours'];
  modesPaiement: string[] = ['Virement bancaire', 'Chèque', 'Espèces', 'Mobile Money'];

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  // Popups
  showDetailPopup = false;
  showEditPopup = false;
  selectedOperation: OperationBancaireDisplay | null = null;

  // Formulaire d'édition
  editForm: any = {
    pays: '',
    codePays: '',
    mois: '',
    dateOperation: '',
    agence: '',
    typeOperation: '',
    nomBeneficiaire: '',
    compteADebiter: '',
    montant: 0,
    modePaiement: '',
    reference: '',
    idGlpi: '',
    bo: '',
    statut: ''
  };

  constructor(
    private router: Router,
    private operationBancaireService: OperationBancaireService,
    private compteService: CompteService,
    private operationService: OperationService,
    private releveService: ReleveBancaireService
  ) { }

  ngOnInit(): void {
    console.log('Composant BANQUE initialisé');
    this.loadOperations();
    this.loadComptesBanque();
    this.loadDashboardStats();
  }

  // Comptes de catégorie Banque (section Informations)
  comptesBanque: Compte[] = [];
  loadingComptesBanque = false;
  comptesBanqueError = '';
  comptesSearch = '';
  selectedCompteNumero: string | null = null;

  loadComptesBanque() {
    this.loadingComptesBanque = true;
    this.comptesBanqueError = '';
    this.compteService.filterComptes({ categorie: ['Banque'] }).subscribe({
      next: (comptes) => {
        this.comptesBanque = (comptes || []).sort((a, b) => (a.codeProprietaire || '').localeCompare(b.codeProprietaire || ''));
        this.loadingComptesBanque = false;
      },
      error: (err) => {
        console.error('Erreur chargement comptes Banque', err);
        this.comptesBanqueError = 'Erreur lors du chargement des comptes Banque';
        this.loadingComptesBanque = false;
      }
    });
  }

  // Dashboard stats
  totalSoldeComptes = 0;
  totalOperations = 0;
  totalComptes = 0;
  totalEnAttente = 0;
  totalTicketsACreer = 0; // Opérations bancaires sans ID GLPI

  loadDashboardStats() {
    // Comptes Banque uniquement
    this.compteService.filterComptes({ categorie: 'Banque' }).subscribe({
      next: (comptes) => {
        const list = comptes || [];
        this.totalComptes = list.length;
        this.totalSoldeComptes = list.reduce((sum, c) => sum + (c.solde || 0), 0);
      }
    });

    // Opérations bancaires uniquement
    this.operationBancaireService.getAllOperationsBancaires().subscribe({
      next: (ops) => {
        const list = ops || [];
        this.totalOperations = list.length;
        this.totalEnAttente = list.filter(o => (o.statut || '').toLowerCase() === 'en attente' || (o.statut || '').toLowerCase() === 'en cours').length;
        this.totalTicketsACreer = list.filter(o => !o.idGlpi || o.idGlpi.trim() === '').length;
      }
    });
  }

  get comptesBanqueDisplayed(): Compte[] {
    const term = (this.comptesSearch || '').toLowerCase().trim();
    if (!term) return this.comptesBanque;
    return this.comptesBanque.filter(c =>
      (c.numeroCompte || '').toLowerCase().includes(term) ||
      (c.codeProprietaire || '').toLowerCase().includes(term) ||
      (c.pays || '').toLowerCase().includes(term) ||
      (c.type || '').toLowerCase().includes(term) ||
      (c.categorie || '').toLowerCase().includes(term)
    );
  }

  copyToClipboard(value: string | undefined) {
    if (!value) return;
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(value).then(() => {
        console.log('Copié:', value);
      });
    }
  }

  toggleCompte(compte: Compte) {
    const num = compte.numeroCompte;
    this.selectedCompteNumero = this.selectedCompteNumero === num ? null : num;
  }

  // Navigation
  showOperationsTable() {
    this.showOperations = true;
    this.activeSection = 'operations';
  }

  hideOperationsTable() {
    this.showOperations = false;
    this.activeSection = 'home';
  }

  goToComptes() {
    this.activeSection = 'comptes';
    this.router.navigate(['/comptes'], { queryParams: { filterCategorie: 'Banque' } });
  }

  openRapports() {
    this.activeSection = 'rapports';
    this.loadLatestReleveBatch();
  }

  openSecurite() {
    this.activeSection = 'securite';
  }

  // Met en avant et reste sur la liste des comptes Banque dans la page Banque
  highlightBankAccounts() {
    // Reste sur la page Banque et affiche la section Comptes de Banque
    this.activeSection = 'home';
    this.showOperations = false;
    // Si la liste est vide, charger; sinon, faire un petit scroll
    if (!this.comptesBanque || this.comptesBanque.length === 0) {
      this.loadComptesBanque();
    }
    setTimeout(() => {
      const el = document.querySelector('.section-header h2');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 0);
  }

  // Relevé bancaire import
  releveSelectedFile: File | null = null;
  releveUploading = false;
  releveBatchId: string | null = null;
  releveRows: ReleveBancaireRow[] = [];
  // Pagination Relevé
  relevePage = 1;
  relevePageSize = 10;
  releveMessage: string | null = null;
  releveMessageKind: 'info' | 'success' | 'error' = 'info';

  onReleveFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.releveSelectedFile = input.files && input.files.length ? input.files[0] : null;
    if (this.releveSelectedFile) {
      this.releveMessageKind = 'info';
      this.releveMessage = `Fichier sélectionné: ${this.releveSelectedFile.name}`;
    }
  }

  uploadReleve() {
    if (!this.releveSelectedFile) return;
    this.releveUploading = true;
    this.releveBatchId = null;
    this.releveRows = [];
    this.releveMessageKind = 'info';
    this.releveMessage = 'Import en cours...';
    this.releveService.upload(this.releveSelectedFile).subscribe({
      next: (res) => {
        this.releveBatchId = res.batchId;
        this.releveRows = res.rows || [];
        this.releveUploading = false;
        this.releveMessageKind = 'success';
        const baseMsg = `Fichier importé avec succès (${res.count} lignes).`;
        const dupMsg = res.duplicatesIgnored ? ` ${res.duplicatesIgnored} doublon(s) ignoré(s).` : '';
        this.releveMessage = `${baseMsg}${dupMsg} Batch: ${this.releveBatchId}`;
        // Alerts
        const msgs: string[] = [];
        if (res.duplicatesIgnored) msgs.push(`${res.duplicatesIgnored} doublon(s) ignoré(s)`);
        if (res.unmappedHeaders && res.unmappedHeaders.length) msgs.push(`Colonnes non reconnues: ${res.unmappedHeaders.join(', ')}`);
        if (res.totalRead && res.count !== undefined) msgs.push(`Lues: ${res.totalRead}, conservées: ${res.count}`);
        if (msgs.length) {
          this.releveMessage += ` | ${msgs.join(' | ')}`;
        }
      },
      error: () => {
        this.releveUploading = false;
        this.releveMessageKind = 'error';
        this.releveMessage = 'Import du relevé bancaire échoué';
      }
    });
  }

  loadLatestReleveBatch() {
    this.releveService.list().subscribe({
      next: (all) => {
        const rows = Array.isArray(all) ? all : [];
        if (!rows.length) { this.releveRows = []; this.releveBatchId = null; return; }
        // Grouper par batchId
        const groups: Record<string, any[]> = {};
        rows.forEach((r: any) => {
          const bid = r.batchId || 'default';
          if (!groups[bid]) groups[bid] = [];
          groups[bid].push(r);
        });
        // Trouver le batch le plus récent via uploadedAt
        let latestBatchId = Object.keys(groups)[0];
        let latestDate = new Date(0);
        Object.entries(groups).forEach(([bid, items]) => {
          const d = items.reduce((max: Date, it: any) => {
            const cur = it.uploadedAt ? new Date(it.uploadedAt) : new Date(0);
            return cur > max ? cur : max;
          }, new Date(0));
          if (d > latestDate) { latestDate = d; latestBatchId = bid; }
        });
        this.releveBatchId = latestBatchId;
        // Convertir vers modèle d'affichage
        this.releveRows = groups[latestBatchId].map((it: any) => ({
          numeroCompte: it.numeroCompte,
          ['nomCompte']: it.nomCompte,
          dateComptable: it.dateComptable,
          dateValeur: it.dateValeur,
          libelle: it.libelle,
          debit: it.debit,
          credit: it.credit,
          montant: it.montant,
          numeroCheque: it.numeroCheque,
          devise: it.devise,
          soldeCourant: it.soldeCourant,
          soldeDisponibleCloture: it.soldeDisponibleCloture,
          soldeDisponibleOuverture: it.soldeDisponibleOuverture
        } as ReleveBancaireRow));
        this.relevePage = 1;
      },
      error: () => {
        // silencieux pour ne pas gêner l'ouverture
      }
    });
  }

  // Chargement des données
  loadOperations() {
    // Charger les opérations bancaires depuis le service
    this.operationBancaireService.getAllOperationsBancaires().subscribe({
      next: (operations) => {
        // Convertir les dates string en objets Date
        this.operations = operations.map(op => ({
          ...op,
          dateOperation: new Date(op.dateOperation)
        }));
        this.filteredOperations = [...this.operations];
        this.updatePagedOperations();
        console.log('Opérations bancaires chargées:', this.operations.length);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des opérations bancaires:', error);
        this.operations = [];
        this.filteredOperations = [];
        this.updatePagedOperations();
      }
    });
  }

  // Filtrage
  applyFilters() {
    this.filteredOperations = this.operations.filter(operation => {
      const matchPays = !this.filters.pays || operation.pays === this.filters.pays;
      const matchType = !this.filters.typeOperation || operation.typeOperation === this.filters.typeOperation;
      const matchStatut = !this.filters.statut || operation.statut === this.filters.statut;
      
      let matchDate = true;
      if (this.filters.dateDebut) {
        const dateDebut = new Date(this.filters.dateDebut);
        matchDate = matchDate && operation.dateOperation >= dateDebut;
      }
      if (this.filters.dateFin) {
        const dateFin = new Date(this.filters.dateFin);
        matchDate = matchDate && operation.dateOperation <= dateFin;
      }

      return matchPays && matchType && matchStatut && matchDate;
    });

    this.currentPage = 1;
    this.updatePagedOperations();
  }

  clearFilters() {
    this.filters = {
      pays: '',
      typeOperation: '',
      statut: '',
      dateDebut: '',
      dateFin: ''
    };
    this.filteredOperations = [...this.operations];
    this.currentPage = 1;
    this.updatePagedOperations();
  }

  // Pagination
  updatePagedOperations() {
    this.totalPages = Math.ceil(this.filteredOperations.length / this.pageSize);
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.pagedOperations = this.filteredOperations.slice(startIndex, startIndex + this.pageSize);
  }

  onPageSizeChange() {
    this.currentPage = 1; // Retour à la première page lors du changement de taille
    this.updatePagedOperations();
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagedOperations();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagedOperations();
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagedOperations();
    }
  }

  getVisiblePages(): number[] {
    const maxVisible = 5;
    const pages: number[] = [];
    
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

  // Actions sur les opérations
  viewOperation(operation: OperationBancaireDisplay) {
    this.selectedOperation = operation;
    this.showDetailPopup = true;
  }

  closeDetailPopup() {
    this.showDetailPopup = false;
    this.selectedOperation = null;
  }

  editOperation(operation: OperationBancaireDisplay) {
    this.selectedOperation = operation;
    // Pré-remplir le formulaire
    this.editForm = {
      pays: operation.pays || '',
      codePays: operation.codePays || '',
      mois: operation.mois || '',
      dateOperation: this.formatDateForInput(operation.dateOperation),
      agence: operation.agence || '',
      typeOperation: operation.typeOperation || '',
      nomBeneficiaire: operation.nomBeneficiaire || '',
      compteADebiter: operation.compteADebiter || '',
      montant: operation.montant || 0,
      modePaiement: operation.modePaiement || '',
      reference: operation.reference || '',
      idGlpi: operation.idGlpi || '',
      bo: operation.bo || '',
      statut: operation.statut || 'En attente'
    };
    this.showEditPopup = true;
  }

  closeEditPopup() {
    this.showEditPopup = false;
    this.selectedOperation = null;
  }

  saveOperation() {
    if (!this.selectedOperation || !this.selectedOperation.id) return;

    const updateData = {
      pays: this.editForm.pays,
      codePays: this.editForm.codePays,
      mois: this.editForm.mois,
      dateOperation: this.editForm.dateOperation,
      agence: this.editForm.agence,
      typeOperation: this.editForm.typeOperation,
      nomBeneficiaire: this.editForm.nomBeneficiaire,
      compteADebiter: this.editForm.compteADebiter,
      montant: this.editForm.montant,
      modePaiement: this.editForm.modePaiement,
      reference: this.editForm.reference,
      idGlpi: this.editForm.idGlpi,
      bo: this.editForm.bo,
      statut: this.editForm.statut
    };

    this.operationBancaireService.updateOperationBancaire(this.selectedOperation.id, updateData).subscribe({
      next: () => {
        console.log('Opération bancaire modifiée avec succès');
        this.loadOperations();
        this.closeEditPopup();
        alert('✅ Opération bancaire modifiée avec succès');
      },
      error: (error) => {
        console.error('Erreur lors de la modification:', error);
        alert('❌ Erreur lors de la modification de l\'opération bancaire');
      }
    });
  }

  deleteOperation(id: number) {
    const operation = this.operations.find(op => op.id === id);
    const confirmMessage = operation 
      ? `Êtes-vous sûr de vouloir supprimer cette opération bancaire ?\n\nType: ${operation.typeOperation}\nAgence: ${operation.agence}\nMontant: ${operation.montant} FCFA`
      : 'Êtes-vous sûr de vouloir supprimer cette opération bancaire ?';

    if (confirm(confirmMessage)) {
      this.operationBancaireService.deleteOperationBancaire(id).subscribe({
        next: (success) => {
          if (success) {
            console.log('Opération bancaire supprimée avec succès');
            this.loadOperations();
            alert('✅ Opération bancaire supprimée avec succès');
          }
        },
        error: (error) => {
          console.error('Erreur lors de la suppression de l\'opération bancaire:', error);
          alert('❌ Erreur lors de la suppression de l\'opération bancaire');
        }
      });
    }
  }

  // Helper pour formater la date pour l'input
  private formatDateForInput(date: Date): string {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
} 