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
// Filtres pour les résultats de réconciliation (opérations/relevé)
interface ReconFilters {
  typeOperation: string;
  statut: string;
  banque: string;
  search: string; // recherche libre (bénéficiaire/référence/libellé/compte)
  montantMin: number | null;
  montantMax: number | null;
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
  // Popup édition relevé
  showReleveEditPopup = false;
  selectedReleve: (ReleveBancaireRow & { id?: number }) | null = null;
  releveEditForm: any = {
    numeroCompte: '', nomCompte: '', banque: '',
    dateComptable: '', dateValeur: '', libelle: '',
    debit: null as number | null, credit: null as number | null, montant: null as number | null,
    numeroCheque: '', devise: ''
  };

  // Réconciliation banque
  reconPays: string = '';
  reconDate: string = '';
  reconciling = false;
  reconPaysOptions: string[] = [];
  reconView: 'operation' | 'releve' | 'corr_operation' | 'corr_releve' = 'operation';
  // Résultats bruts (incluant BOTH/OPERATION/RELEVE) conservés pour la popup correspondance
  reconciliationResults: Array<{
    date: string;
    montant: number;
    banque: string;
    sensIndex: string; // "debit1" | "credit2" ...
    source: 'OPERATION' | 'RELEVE' | 'BOTH';
    suspens?: 'Suspens BO' | 'Suspens Banque' | '';
  }> = [];

  // Lignes de différences pour l'affichage deux colonnes (gauche: OP, droite: RELEVE)
  reconDiffRows: Array<{
    left?: (OperationBancaireDisplay & { key?: string });
    right?: (ReleveBancaireRow & { key?: string });
  }> = [];
  leftOnlyOperations: OperationBancaireDisplay[] = [];
  rightOnlyReleves: ReleveBancaireRow[] = [];
  matchedOperations: OperationBancaireDisplay[] = [];
  matchedReleves: ReleveBancaireRow[] = [];
  reconPagedResults: Array<{
    left?: (OperationBancaireDisplay & { key?: string });
    right?: (ReleveBancaireRow & { key?: string });
  }> = [];
  reconPage = 1;
  reconPageSize = 10;
  reconTotalPages = 1;
  // Filtres et listes filtrées pour l'affichage
  reconFilters: ReconFilters = {
    typeOperation: '',
    statut: '',
    banque: '',
    search: '',
    montantMin: null,
    montantMax: null
  };
  filteredLeftOps: OperationBancaireDisplay[] = [];
  filteredRightReleves: ReleveBancaireRow[] = [];
  filteredMatchedOps: OperationBancaireDisplay[] = [];
  filteredMatchedReleves: ReleveBancaireRow[] = [];
  // Vue séparée
  pagedLeftOps: OperationBancaireDisplay[] = [];
  pagedRightReleves: ReleveBancaireRow[] = [];
  pagedMatchedOps: OperationBancaireDisplay[] = [];
  pagedMatchedReleves: ReleveBancaireRow[] = [];
  reconOpPage = 1;
  reconRevPage = 1;
  reconCorrOpPage = 1;
  reconCorrRevPage = 1;
  reconOpTotalPages = 1;
  reconRevTotalPages = 1;
  reconCorrOpTotalPages = 1;
  reconCorrRevTotalPages = 1;
  matchedPairs: Array<{
    date: string;
    montant: number;
    banque: string;
    sensIndex: string;
  }> = [];
  showCorrespondancePopup = false;
  correspondanceFilterBanque = '';
  correspondanceFilterMontant: number | null = null;

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
    this.loadLatestReleveBatch();
  }

  // Comptes de catégorie Banque (section Informations)
  comptesBanque: Compte[] = [];
  loadingComptesBanque = false;
  comptesBanqueError = '';
  comptesSearch = '';
  selectedCompteNumero: string | null = null;
  // Popup opérations du compte
  showCompteOpsPopup = false;
  compteOpsNumero: string | null = null;
  compteOpsAll: OperationBancaireDisplay[] = [];
  compteOpsFiltered: OperationBancaireDisplay[] = [];
  compteOpsPaged: OperationBancaireDisplay[] = [];
  compteOpsPage = 1;
  compteOpsPageSize = 10;
  compteOpsTotalPages = 1;
  compteOpsDateFrom = '';
  compteOpsDateTo = '';

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
        this.totalTicketsACreer = list.filter(o => (!o.idGlpi || o.idGlpi.trim() === '') && (((o.statut || '').toLowerCase() === 'en attente') || ((o.statut || '').toLowerCase() === 'en cours'))).length;
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

  openCompteRelevePopup(compte: Compte) {
    const numero = compte?.numeroCompte || '';
    this.compteOpsNumero = numero;
    // Filtrer toutes les opérations par numéro de compte
    this.compteOpsAll = (this.operations || []).filter(op => (op.compteADebiter || '') === numero)
      .sort((a, b) => (b.dateOperation as any).getTime() - (a.dateOperation as any).getTime());
    // Reset filtres et pagination
    this.compteOpsDateFrom = '';
    this.compteOpsDateTo = '';
    this.compteOpsPageSize = 10;
    this.compteOpsPage = 1;
    this.applyCompteOpsFilters();
    this.showCompteOpsPopup = true;
  }

  closeCompteRelevePopup() {
    this.showCompteOpsPopup = false;
  }

  applyCompteOpsFilters() {
    const from = this.compteOpsDateFrom ? new Date(this.compteOpsDateFrom) : null;
    const to = this.compteOpsDateTo ? new Date(this.compteOpsDateTo) : null;
    this.compteOpsFiltered = (this.compteOpsAll || []).filter(op => {
      let ok = true;
      if (from) ok = ok && (op.dateOperation >= from);
      if (to) ok = ok && (op.dateOperation <= to);
      return ok;
    });
    this.compteOpsPage = 1;
    this.updateCompteOpsPaged();
  }

  onCompteOpsPageSizeChange() {
    this.compteOpsPage = 1;
    this.updateCompteOpsPaged();
  }

  updateCompteOpsPaged() {
    const total = this.compteOpsFiltered.length;
    this.compteOpsTotalPages = Math.ceil(total / this.compteOpsPageSize) || 1;
    const start = (this.compteOpsPage - 1) * this.compteOpsPageSize;
    this.compteOpsPaged = this.compteOpsFiltered.slice(start, start + this.compteOpsPageSize);
  }

  compteOpsNextPage() {
    if (this.compteOpsPage < this.compteOpsTotalPages) {
      this.compteOpsPage++;
      this.updateCompteOpsPaged();
    }
  }

  compteOpsPrevPage() {
    if (this.compteOpsPage > 1) {
      this.compteOpsPage--;
      this.updateCompteOpsPaged();
    }
  }

  compteOpsGoToPage(page: number) {
    if (page >= 1 && page <= this.compteOpsTotalPages) {
      this.compteOpsPage = page;
      this.updateCompteOpsPaged();
    }
  }

  getCompteOpsVisiblePages(): number[] {
    const maxVisible = 5;
    const pages: number[] = [];
    const total = this.compteOpsTotalPages;
    const current = this.compteOpsPage;
    if (total <= maxVisible) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      let start = Math.max(1, current - 2);
      let end = Math.min(total, start + maxVisible - 1);
      if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
      for (let i = start; i <= end; i++) pages.push(i);
    }
    return pages;
  }

  // =========================
  // Débit/Crédit affichage (règles métier)
  // =========================
  private getOperationDirection(op: OperationBancaireDisplay): 'debit' | 'credit' {
    const type = (op.typeOperation || '').toLowerCase();
    if (type.includes('appro')) return 'credit';
    if (type.includes('compens')) return 'debit';
    if (type.includes('nivel')) return (op.montant || 0) < 0 ? 'debit' : 'credit';
    return (op.montant || 0) < 0 ? 'debit' : 'credit';
  }

  getDebitForOperation(op: OperationBancaireDisplay): number | null {
    const dir = this.getOperationDirection(op);
    if (dir === 'debit') return Math.abs(op.montant || 0);
    return null;
  }

  getCreditForOperation(op: OperationBancaireDisplay): number | null {
    const dir = this.getOperationDirection(op);
    if (dir === 'credit') return Math.abs(op.montant || 0);
    return null;
  }

  async exportCompteOps() {
    const rows = this.compteOpsFiltered || [];
    const account = this.compteOpsNumero || '';
    const pad = (n: number) => String(n).padStart(2, '0');
    const now = new Date();
    const ts = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
    const filename = `releve_compte_${account || 'NA'}_${ts}.xlsx`;

    const formatDate = (d: Date) => {
      if (!d) return '';
      const dd = pad(d.getDate());
      const mm = pad(d.getMonth()+1);
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    };

    const header = [
      'Compte', 'Date', 'Type', 'Agence', 'Bénéficiaire', 'Débit', 'Crédit', 'Référence', 'Statut'
    ];
    const aoa: any[] = [];
    aoa.push(header);
    rows.forEach(op => {
      const debit = this.getDebitForOperation(op);
      const credit = this.getCreditForOperation(op);
      aoa.push([
        account,
        formatDate(op.dateOperation as Date),
        op.typeOperation || '',
        op.agence || '',
        op.nomBeneficiaire || '',
        debit !== null ? debit : '',
        credit !== null ? credit : '',
        op.reference || '',
        op.statut || ''
      ]);
    });

    const XLSX: any = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Largeur des colonnes
    (ws['!cols'] as any) = [
      { wch: 22 }, { wch: 12 }, { wch: 20 }, { wch: 14 }, { wch: 26 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 14 }
    ];

    // Styles en-tête
    for (let c = 0; c < header.length; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
      if (cell) cell.s = { fill: { fgColor: { rgb: 'D9E1F2' } }, font: { bold: true } };
    }
    // Zebra rows + formats
    for (let r = 1; r < aoa.length; r++) {
      const isAlt = r % 2 === 1;
      for (let c = 0; c < header.length; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = ws[addr];
        if (!cell) continue;
        const style: any = {};
        if (isAlt) style.fill = { fgColor: { rgb: 'F8F9FA' } };
        if (c === 5 || c === 6) {
          style.numFmt = '#,##0';
          style.alignment = { horizontal: 'right' };
        }
        // Appliquer style cumulatif si déjà présent
        cell.s = Object.assign({}, cell.s || {}, style);
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Relevé compte');
    XLSX.writeFile(wb, filename);
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
    this.loadLatestReleveBatch();
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

  // Total pages calculé pour la pagination de l'aperçu
  get releveTotalPages(): number {
    const size = this.relevePageSize || 10;
    const total = this.releveRows ? this.releveRows.length : 0;
    const pages = Math.ceil(total / size);
    return pages > 0 ? pages : 1;
  }

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
        this.releveRows = (res.rows || []).map(r => ({
          ...r,
          dateComptable: r.dateComptable ? new Date(r.dateComptable as any) : undefined,
          dateValeur: r.dateValeur ? new Date(r.dateValeur as any) : undefined
        }));
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
          id: it.id,
          numeroCompte: it.numeroCompte,
          ['nomCompte']: it.nomCompte,
          banque: it.banque,
          dateComptable: it.dateComptable ? new Date(it.dateComptable) : undefined,
          dateValeur: it.dateValeur ? new Date(it.dateValeur) : undefined,
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

  openReleveEdit(row: ReleveBancaireRow) {
    if (!row || !row.id) {
      alert('Cette ligne ne peut pas être modifiée car son identifiant est manquant. Réimportez si nécessaire.');
      return;
    }
    this.selectedReleve = row;
    const toInput = (d: any) => {
      if (!d) return '';
      const dt = d instanceof Date ? d : new Date(d);
      if (isNaN(dt.getTime())) return '';
      const y = dt.getFullYear();
      const m = String(dt.getMonth()+1).padStart(2,'0');
      const dd = String(dt.getDate()).padStart(2,'0');
      return `${y}-${m}-${dd}`;
    };
    this.releveEditForm = {
      numeroCompte: row.numeroCompte || '',
      nomCompte: row.nomCompte || '',
      banque: row.banque || '',
      dateComptable: toInput(row.dateComptable as any),
      dateValeur: toInput(row.dateValeur as any),
      libelle: row.libelle || '',
      debit: row.debit ?? null,
      credit: row.credit ?? null,
      montant: row.montant ?? null,
      numeroCheque: row.numeroCheque || '',
      devise: row.devise || ''
    };
    this.showReleveEditPopup = true;
  }

  closeReleveEdit() {
    this.showReleveEditPopup = false;
    this.selectedReleve = null;
  }

  saveReleveEdit() {
    if (!this.selectedReleve || !this.selectedReleve.id) return;
    const payload: any = {
      numeroCompte: this.releveEditForm.numeroCompte || null,
      nomCompte: this.releveEditForm.nomCompte || null,
      banque: this.releveEditForm.banque || null,
      dateComptable: this.releveEditForm.dateComptable || null,
      dateValeur: this.releveEditForm.dateValeur || null,
      libelle: this.releveEditForm.libelle || null,
      debit: this.releveEditForm.debit,
      credit: this.releveEditForm.credit,
      montant: this.releveEditForm.montant,
      numeroCheque: this.releveEditForm.numeroCheque || null,
      devise: this.releveEditForm.devise || null
    };
    this.releveService.update(this.selectedReleve.id, payload).subscribe({
      next: () => {
        this.closeReleveEdit();
        this.loadLatestReleveBatch();
        alert('✅ Ligne de relevé mise à jour');
      },
      error: (err) => {
        console.error('Erreur MAJ relevé', err);
        alert('❌ Échec de la mise à jour du relevé');
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
        // Pays pour réconciliation basés sur les opérations
        const uniquePays = Array.from(new Set(this.operations.map(o => o.pays).filter(p => !!p))) as string[];
        this.reconPaysOptions = uniquePays.sort((a, b) => a.localeCompare(b));
        if (!this.reconPays && this.reconPaysOptions.length === 1) {
          this.reconPays = this.reconPaysOptions[0];
        }
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

  // =========================
  // Réconciliation - Helpers
  // =========================
  private parseToDate(input: Date | string | number | undefined | null): Date | null {
    if (!input) return null;
    if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
    if (typeof input === 'number') {
      const d = new Date(input);
      return isNaN(d.getTime()) ? null : d;
    }
    const s = String(input).trim();
    // ISO-like format
    const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    }
    // dd/MM/yyyy
    const frMatch = s.match(/^(\d{2})[\/](\d{2})[\/](\d{4})$/);
    if (frMatch) {
      const day = parseInt(frMatch[1], 10);
      const month = parseInt(frMatch[2], 10) - 1;
      const year = parseInt(frMatch[3], 10);
      const d = new Date(year, month, day);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  }

  private normalizeDateToYmd(d: Date | string | number | undefined | null): string {
    const date = this.parseToDate(d);
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private determineSensFromAmount(amount: number | undefined | null): 'debit' | 'credit' {
    if (!amount) return 'credit';
    return amount < 0 ? 'debit' : 'credit';
  }

  private determineOperationSens(op: OperationBancaireDisplay): 'debit' | 'credit' {
    const type = (op.typeOperation || '').toLowerCase();
    if (type.includes('compensation')) {
      return 'debit';
    }
    if (type.includes('appro')) { // Approvisionnement
      return 'credit';
    }
    if (type.includes('nivel')) { // Nivellement
      return this.determineSensFromAmount(op.montant);
    }
    return this.determineSensFromAmount(op.montant);
  }

  getReleveMontant(r: ReleveBancaireRow): number {
    if (!r) return 0;
    if (typeof r.montant === 'number') return r.montant;
    if (typeof r.debit === 'number' && r.debit > 0) return r.debit;
    if (typeof r.credit === 'number' && r.credit > 0) return r.credit;
    return 0;
  }

  getOperationMontantAbs(op?: OperationBancaireDisplay): number {
    if (!op) return 0;
    return Math.abs(op.montant || 0);
  }

  getReleveMontantAbs(r?: ReleveBancaireRow): number {
    if (!r) return 0;
    return Math.abs(this.getReleveMontant(r));
  }

  private buildKeysWithIndexes<T>(items: T[], getBase: (it: T) => { date: string; montantAbs: number; banque: string; sens: 'debit' | 'credit'; }): Array<T & { key: string; sensIndex: string; }> {
    const counters = new Map<string, number>();
    return items.map(it => {
      const base = getBase(it);
      const groupKey = `${base.date}|${base.montantAbs}|${base.banque}|${base.sens}`;
      const current = (counters.get(groupKey) || 0) + 1;
      counters.set(groupKey, current);
      const sensIndex = `${base.sens}${current}`;
      // Construire la clé d'affichage sans séparateurs, sans espaces ni tirets
      const dateNoDash = (base.date || '').replace(/-/g, '');
      const montantDigits = String(base.montantAbs).replace(/\D/g, '');
      const banqueCompact = (base.banque || '').toUpperCase().replace(/[\s-]/g, '');
      const key = `${dateNoDash}${montantDigits}${banqueCompact}${sensIndex}`;
      const augmented: any = Object.assign({}, it as any, { key, sensIndex });
      return augmented;
    });
  }

  // =========================
  // Réconciliation - Actions
  // =========================
  reconcile() {
    if (!this.reconPays) {
      alert('Veuillez choisir un pays. La date est optionnelle.');
      return;
    }
    if (!this.operations || !this.operations.length) {
      alert('Aucune opération bancaire disponible.');
      return;
    }
    if (!this.releveRows || !this.releveRows.length) {
      alert('Aucun relevé bancaire importé. Veuillez importer un relevé.');
      return;
    }

    this.reconciling = true;

    // Préparer les opérations filtrées (par pays + date)
    const ymd = this.reconDate || '';
    const opsFiltered = this.operations.filter(op => (op.pays === this.reconPays) && (!ymd || this.normalizeDateToYmd(op.dateOperation) === ymd));
    const opsWithKey = this.buildKeysWithIndexes(opsFiltered, (op) => {
      const date = this.normalizeDateToYmd(op.dateOperation);
      const montantAbs = Math.abs(op.montant || 0);
      const banque = ((op.bo || '').trim() || '').toUpperCase();
      const sens = this.determineOperationSens(op as OperationBancaireDisplay);
      return { date, montantAbs, banque, sens };
    });

    // Préparer les lignes de relevé filtrées (utiliser dateValeur si dispo, sinon dateComptable)
    const relevéFiltered = this.releveRows.filter(r => {
      if (!ymd) return true;
      const dateToUse = r.dateValeur ? r.dateValeur : r.dateComptable;
      return this.normalizeDateToYmd(dateToUse as any) === ymd;
    });
    const revWithKey = this.buildKeysWithIndexes(relevéFiltered, (r) => {
      const dateToUse = r.dateValeur ? r.dateValeur : r.dateComptable;
      const date = this.normalizeDateToYmd(dateToUse as any);
      const debit = r.debit || 0;
      const credit = r.credit || 0;
      const sens: 'debit' | 'credit' = debit > 0 ? 'debit' : 'credit';
      const montantAbs = debit > 0 ? Math.abs(debit) : Math.abs(credit || (r.montant || 0));
      const banque = ((r.banque || '').trim() || '').toUpperCase();
      return { date, montantAbs, banque, sens };
    });

    const opMap = new Map<string, { op: OperationBancaireDisplay & { key: string; sensIndex: string } }>();
    opsWithKey.forEach(o => opMap.set((o as any).key, { op: o as any }));

    const revMap = new Map<string, { row: ReleveBancaireRow & { key: string; sensIndex: string } }>();
    revWithKey.forEach(r => revMap.set((r as any).key, { row: r as any }));

    const allKeys = new Set<string>([...opMap.keys(), ...revMap.keys()]);
    const results: Array<{ date: string; montant: number; banque: string; sensIndex: string; source: 'OPERATION'|'RELEVE'|'BOTH'; suspens?: 'Suspens BO'|'Suspens Banque'|''; }> = [];
    const pairs: Array<{ date: string; montant: number; banque: string; sensIndex: string; }> = [];

    allKeys.forEach(key => {
      const inOp = opMap.has(key);
      const inRev = revMap.has(key);
      const [date, montantStr, banque, sensIndex] = key.split('|');
      const montant = Number(montantStr);
      if (inOp && inRev) {
        results.push({ date, montant, banque, sensIndex, source: 'BOTH', suspens: '' });
        pairs.push({ date, montant, banque, sensIndex });
      } else if (inOp && !inRev) {
        results.push({ date, montant, banque, sensIndex, source: 'OPERATION', suspens: 'Suspens BO' });
      } else if (!inOp && inRev) {
        results.push({ date, montant, banque, sensIndex, source: 'RELEVE', suspens: 'Suspens Banque' });
      }
    });

    // Trier pour lisibilité
    results.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.banque !== b.banque) return a.banque.localeCompare(b.banque);
      if (a.montant !== b.montant) return a.montant - b.montant;
      return a.sensIndex.localeCompare(b.sensIndex);
    });

    this.reconciliationResults = results;
    this.matchedPairs = pairs;

    // Construire les lignes d'écarts: gauche = opérations seules, droite = relevé seul
    const diffs: Array<{ left?: (OperationBancaireDisplay & { key?: string }); right?: (ReleveBancaireRow & { key?: string }) }> = [];
    const allKeysForDiff = new Set<string>([...opMap.keys(), ...revMap.keys()]);
    allKeysForDiff.forEach(k => {
      const opEntry = opMap.get(k);
      const revEntry = revMap.get(k);
      if (opEntry && !revEntry) {
        const op = opEntry.op as any;
        diffs.push({ left: op });
      } else if (!opEntry && revEntry) {
        const row = revEntry.row as any;
        diffs.push({ right: row });
      }
    });
    // Trier par date (gauche puis droite, avec relevé: dateValeur si dispo sinon dateComptable), banque puis montant si disponibles
    diffs.sort((a, b) => {
      const aRightDate = a.right?.dateValeur ? new Date(a.right.dateValeur as any).getTime() : (a.right?.dateComptable ? new Date(a.right.dateComptable as any).getTime() : 0);
      const bRightDate = b.right?.dateValeur ? new Date(b.right.dateValeur as any).getTime() : (b.right?.dateComptable ? new Date(b.right.dateComptable as any).getTime() : 0);
      const aDate = a.left?.dateOperation ? new Date(a.left.dateOperation).getTime() : aRightDate;
      const bDate = b.left?.dateOperation ? new Date(b.left.dateOperation).getTime() : bRightDate;
      if (aDate !== bDate) return aDate - bDate;
      const aBanque = (a.left?.bo || a.right?.banque || '').toString();
      const bBanque = (b.left?.bo || b.right?.banque || '').toString();
      if (aBanque !== bBanque) return aBanque.localeCompare(bBanque);
      const aMont = (a.left?.montant ?? a.right?.montant ?? 0) as number;
      const bMont = (b.left?.montant ?? b.right?.montant ?? 0) as number;
      return (aMont - bMont);
    });
    this.reconDiffRows = diffs;
    this.leftOnlyOperations = diffs.filter(d => !!d.left).map(d => d.left!) as OperationBancaireDisplay[];
    this.rightOnlyReleves = diffs.filter(d => !!d.right).map(d => d.right!) as ReleveBancaireRow[];

    // Correspondances complètes (toutes colonnes)
    const matchedOps: OperationBancaireDisplay[] = [];
    const matchedRevs: ReleveBancaireRow[] = [];
    pairs.forEach(p => {
      const key = `${p.date}|${p.montant}|${p.banque}|${p.sensIndex}`;
      const opEntry = opMap.get(key);
      const revEntry = revMap.get(key);
      if (opEntry?.op) matchedOps.push(opEntry.op);
      if (revEntry?.row) matchedRevs.push(revEntry.row);
    });
    this.matchedOperations = matchedOps;
    this.matchedReleves = matchedRevs;

    // Choisir la vue par défaut selon la présence d'écarts
    if (this.leftOnlyOperations.length > 0) {
      this.reconView = 'operation';
    } else if (this.rightOnlyReleves.length > 0) {
      this.reconView = 'releve';
    } else {
      this.reconView = 'operation';
    }

    this.reconciling = false;

    // Pagination init
    this.reconPage = 1;
    this.reconOpPage = 1;
    this.reconRevPage = 1;
    this.reconCorrOpPage = 1;
    this.reconCorrRevPage = 1;
    this.updatePagedReconciliationResults();
  }

  openCorrespondance() {
    if (!this.matchedPairs.length) {
      alert('Aucune correspondance trouvée.');
      return;
    }
    this.showCorrespondancePopup = true;
  }

  // Affichage: convertir 'debit1' -> 'Débit1', 'credit2' -> 'Crédit2'
  formatSensIndex(sensIndex: string): string {
    if (!sensIndex) return '';
    if (sensIndex.startsWith('debit')) return 'Débit' + sensIndex.replace('debit', '');
    if (sensIndex.startsWith('credit')) return 'Crédit' + sensIndex.replace('credit', '');
    return sensIndex;
  }

  // Etiquette (sans index)
  formatSensSimple(sensIndex?: string | null): string {
    if (!sensIndex) return '-';
    if (sensIndex.startsWith('debit')) return 'Débit';
    if (sensIndex.startsWith('credit')) return 'Crédit';
    return '-';
  }

  sensBadgeClass(sensIndex?: string | null): any {
    if (!sensIndex) return {};
    return {
      'sens-debit': sensIndex.startsWith('debit'),
      'sens-credit': sensIndex.startsWith('credit'),
    };
  }

  closeCorrespondance() {
    this.showCorrespondancePopup = false;
  }

  get filteredMatchedPairs() {
    let pairs = this.matchedPairs;
    if (this.correspondanceFilterBanque && this.correspondanceFilterBanque.trim()) {
      const b = this.correspondanceFilterBanque.trim().toUpperCase();
      pairs = pairs.filter(p => (p.banque || '').toUpperCase().includes(b));
    }
    if (this.correspondanceFilterMontant !== null && this.correspondanceFilterMontant !== undefined) {
      pairs = pairs.filter(p => p.montant === this.correspondanceFilterMontant);
    }
    return pairs;
  }

  // =========================
  // Réconciliation - Pagination
  // =========================
  updatePagedReconciliationResults() {
    // Appliquer les filtres recon avant pagination
    const f = this.reconFilters;

    const matchAmount = (amount: number | undefined | null) => {
      const a = typeof amount === 'number' ? amount : 0;
      if (f.montantMin !== null && a < f.montantMin) return false;
      if (f.montantMax !== null && a > f.montantMax) return false;
      return true;
    };

    const matchText = (text: string | undefined | null) => {
      const q = (f.search || '').trim().toLowerCase();
      if (!q) return true;
      return (text || '').toLowerCase().includes(q);
    };

    const matchBanque = (banque: string | undefined | null) => {
      const b = (f.banque || '').trim().toLowerCase();
      if (!b) return true;
      return (banque || '').toLowerCase().includes(b);
    };

    // Opérations (écarts seulement gauche)
    this.filteredLeftOps = (this.leftOnlyOperations || []).filter(op => {
      const okType = !f.typeOperation || (op.typeOperation || '') === f.typeOperation;
      const okStatut = !f.statut || (op.statut || '') === f.statut;
      const okBanque = matchBanque(op.bo);
      const okAmount = matchAmount(Math.abs(op.montant || 0));
      const okSearch = [op.nomBeneficiaire, op.reference, op.compteADebiter, op.agence]
        .some(v => matchText(v || ''));
      return okType && okStatut && okBanque && okAmount && okSearch;
    });

    // Relevés (écarts seulement droite)
    this.filteredRightReleves = (this.rightOnlyReleves || []).filter(r => {
      const amount = this.getReleveMontantAbs(r);
      const okBanque = matchBanque(r.banque);
      const okAmount = matchAmount(amount);
      const okSearch = [r.libelle, r.numeroCompte, r.nomCompte, r.numeroCheque]
        .some(v => matchText(v || ''));
      return okBanque && okAmount && okSearch;
    });

    // Correspondances opérations
    this.filteredMatchedOps = (this.matchedOperations || []).filter(op => {
      const okType = !f.typeOperation || (op.typeOperation || '') === f.typeOperation;
      const okStatut = !f.statut || (op.statut || '') === f.statut;
      const okBanque = matchBanque(op.bo);
      const okAmount = matchAmount(Math.abs(op.montant || 0));
      const okSearch = [op.nomBeneficiaire, op.reference, op.compteADebiter, op.agence]
        .some(v => matchText(v || ''));
      return okType && okStatut && okBanque && okAmount && okSearch;
    });

    // Correspondances relevé
    this.filteredMatchedReleves = (this.matchedReleves || []).filter(r => {
      const amount = this.getReleveMontantAbs(r);
      const okBanque = matchBanque(r.banque);
      const okAmount = matchAmount(amount);
      const okSearch = [r.libelle, r.numeroCompte, r.nomCompte, r.numeroCheque]
        .some(v => matchText(v || ''));
      return okBanque && okAmount && okSearch;
    });

    // Global (legacy, non affiché directement ici)
    this.reconTotalPages = Math.ceil(this.reconDiffRows.length / this.reconPageSize) || 1;
    const startIndex = (this.reconPage - 1) * this.reconPageSize;
    this.reconPagedResults = this.reconDiffRows.slice(startIndex, startIndex + this.reconPageSize);

    // View: operations only
    this.reconOpTotalPages = Math.ceil(this.filteredLeftOps.length / this.reconPageSize) || 1;
    const opStart = (this.reconOpPage - 1) * this.reconPageSize;
    this.pagedLeftOps = this.filteredLeftOps.slice(opStart, opStart + this.reconPageSize);

    // View: bank statement only
    this.reconRevTotalPages = Math.ceil(this.filteredRightReleves.length / this.reconPageSize) || 1;
    const revStart = (this.reconRevPage - 1) * this.reconPageSize;
    this.pagedRightReleves = this.filteredRightReleves.slice(revStart, revStart + this.reconPageSize);

    // View: correspondances operations
    this.reconCorrOpTotalPages = Math.ceil(this.filteredMatchedOps.length / this.reconPageSize) || 1;
    const copStart = (this.reconCorrOpPage - 1) * this.reconPageSize;
    this.pagedMatchedOps = this.filteredMatchedOps.slice(copStart, copStart + this.reconPageSize);

    // View: correspondances relevé
    this.reconCorrRevTotalPages = Math.ceil(this.filteredMatchedReleves.length / this.reconPageSize) || 1;
    const crevStart = (this.reconCorrRevPage - 1) * this.reconPageSize;
    this.pagedMatchedReleves = this.filteredMatchedReleves.slice(crevStart, crevStart + this.reconPageSize);
  }

  applyReconFilters() {
    // Revenir à la première page pour chaque vue filtrée
    this.reconOpPage = 1;
    this.reconRevPage = 1;
    this.reconCorrOpPage = 1;
    this.reconCorrRevPage = 1;
    this.updatePagedReconciliationResults();
  }

  clearReconFilters() {
    this.reconFilters = {
      typeOperation: '',
      statut: '',
      banque: '',
      search: '',
      montantMin: null,
      montantMax: null
    };
    this.applyReconFilters();
  }

  onReconPageSizeChange() {
    this.reconPage = 1;
    this.reconOpPage = 1;
    this.reconRevPage = 1;
    this.reconCorrOpPage = 1;
    this.reconCorrRevPage = 1;
    this.updatePagedReconciliationResults();
  }

  reconNextPage() {
    if (this.reconView === 'operation') {
      if (this.reconOpPage < this.reconOpTotalPages) {
        this.reconOpPage++;
        this.updatePagedReconciliationResults();
      }
    } else if (this.reconView === 'releve') {
      if (this.reconRevPage < this.reconRevTotalPages) {
        this.reconRevPage++;
        this.updatePagedReconciliationResults();
      }
    } else if (this.reconView === 'corr_operation') {
      if (this.reconCorrOpPage < this.reconCorrOpTotalPages) {
        this.reconCorrOpPage++;
        this.updatePagedReconciliationResults();
      }
    } else {
      if (this.reconCorrRevPage < this.reconCorrRevTotalPages) {
        this.reconCorrRevPage++;
        this.updatePagedReconciliationResults();
      }
    }
  }

  reconPrevPage() {
    if (this.reconView === 'operation') {
      if (this.reconOpPage > 1) {
        this.reconOpPage--;
        this.updatePagedReconciliationResults();
      }
    } else if (this.reconView === 'releve') {
      if (this.reconRevPage > 1) {
        this.reconRevPage--;
        this.updatePagedReconciliationResults();
      }
    } else if (this.reconView === 'corr_operation') {
      if (this.reconCorrOpPage > 1) {
        this.reconCorrOpPage--;
        this.updatePagedReconciliationResults();
      }
    } else {
      if (this.reconCorrRevPage > 1) {
        this.reconCorrRevPage--;
        this.updatePagedReconciliationResults();
      }
    }
  }

  reconGoToPage(page: number) {
    if (this.reconView === 'operation') {
      if (page >= 1 && page <= this.reconOpTotalPages) {
        this.reconOpPage = page;
        this.updatePagedReconciliationResults();
      }
    } else if (this.reconView === 'releve') {
      if (page >= 1 && page <= this.reconRevTotalPages) {
        this.reconRevPage = page;
        this.updatePagedReconciliationResults();
      }
    } else if (this.reconView === 'corr_operation') {
      if (page >= 1 && page <= this.reconCorrOpTotalPages) {
        this.reconCorrOpPage = page;
        this.updatePagedReconciliationResults();
      }
    } else {
      if (page >= 1 && page <= this.reconCorrRevTotalPages) {
        this.reconCorrRevPage = page;
        this.updatePagedReconciliationResults();
      }
    }
  }

  getReconVisiblePages(): number[] {
    const maxVisible = 5;
    const pages: number[] = [];
    const total = this.reconView === 'operation' ? this.reconOpTotalPages : (this.reconView === 'releve' ? this.reconRevTotalPages : (this.reconView === 'corr_operation' ? this.reconCorrOpTotalPages : this.reconCorrRevTotalPages));
    const current = this.reconView === 'operation' ? this.reconOpPage : (this.reconView === 'releve' ? this.reconRevPage : (this.reconView === 'corr_operation' ? this.reconCorrOpPage : this.reconCorrRevPage));
    if (total <= maxVisible) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      let start = Math.max(1, current - 2);
      let end = Math.min(total, start + maxVisible - 1);
      if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
      for (let i = start; i <= end; i++) pages.push(i);
    }
    return pages;
  }

  setReconView(view: 'operation' | 'releve') {
    if (this.reconView !== view) {
      this.reconView = view;
      this.updatePagedReconciliationResults();
    }
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