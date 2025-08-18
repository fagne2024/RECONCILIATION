import { Component, OnInit } from '@angular/core';

// Interface pour les opérations bancaires
interface OperationBancaire {
  id: number;
  pays: string;
  codePays: string;
  mois: string;
  dateOperation: Date;
  agence: string;
  typeOperation: string;
  nomBeneficiaire: string;
  compteADebiter: string;
  montant: number;
  modePaiement: string;
  reference: string;
  idGlpi: string;
  bo: string;
  statut: string;
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

  // Données des opérations
  operations: OperationBancaire[] = [];
  filteredOperations: OperationBancaire[] = [];
  pagedOperations: OperationBancaire[] = [];

  // Filtres
  filters: FiltresOperation = {
    pays: '',
    typeOperation: '',
    statut: '',
    dateDebut: '',
    dateFin: ''
  };

  // Listes pour les filtres
  paysList: string[] = ['Côte d\'Ivoire', 'Mali', 'Burkina Faso', 'Sénégal', 'Togo'];
  typesOperation: string[] = ['Virement', 'Paiement', 'Retrait', 'Dépôt'];
  statutsList: string[] = ['Validée', 'En attente', 'Rejetée', 'En cours'];

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;

  constructor() { }

  ngOnInit(): void {
    console.log('Composant BANQUE initialisé');
    this.loadOperations();
  }

  // Navigation
  showOperationsTable() {
    this.showOperations = true;
  }

  hideOperationsTable() {
    this.showOperations = false;
  }

  // Chargement des données
  loadOperations() {
    // Données de test - à remplacer par un appel API
    this.operations = [
      {
        id: 1,
        pays: 'Côte d\'Ivoire',
        codePays: 'CI',
        mois: 'Janvier 2024',
        dateOperation: new Date('2024-01-15'),
        agence: 'Abidjan Centre',
        typeOperation: 'Virement',
        nomBeneficiaire: 'Jean Dupont',
        compteADebiter: 'CI0012345678',
        montant: 500000,
        modePaiement: 'Virement bancaire',
        reference: 'REF001',
        idGlpi: 'GLPI001',
        bo: 'BO001',
        statut: 'Validée'
      },
      {
        id: 2,
        pays: 'Mali',
        codePays: 'ML',
        mois: 'Janvier 2024',
        dateOperation: new Date('2024-01-16'),
        agence: 'Bamako Centre',
        typeOperation: 'Paiement',
        nomBeneficiaire: 'Marie Koné',
        compteADebiter: 'ML0098765432',
        montant: 250000,
        modePaiement: 'Chèque',
        reference: 'REF002',
        idGlpi: 'GLPI002',
        bo: 'BO002',
        statut: 'En attente'
      },
      {
        id: 3,
        pays: 'Burkina Faso',
        codePays: 'BF',
        mois: 'Janvier 2024',
        dateOperation: new Date('2024-01-17'),
        agence: 'Ouagadougou Centre',
        typeOperation: 'Retrait',
        nomBeneficiaire: 'Pierre Ouédraogo',
        compteADebiter: 'BF0055667788',
        montant: 100000,
        modePaiement: 'Espèces',
        reference: 'REF003',
        idGlpi: 'GLPI003',
        bo: 'BO003',
        statut: 'Validée'
      },
      {
        id: 4,
        pays: 'Sénégal',
        codePays: 'SN',
        mois: 'Janvier 2024',
        dateOperation: new Date('2024-01-18'),
        agence: 'Dakar Centre',
        typeOperation: 'Dépôt',
        nomBeneficiaire: 'Fatou Diop',
        compteADebiter: 'SN0011223344',
        montant: 750000,
        modePaiement: 'Virement bancaire',
        reference: 'REF004',
        idGlpi: 'GLPI004',
        bo: 'BO004',
        statut: 'En cours'
      },
      {
        id: 5,
        pays: 'Togo',
        codePays: 'TG',
        mois: 'Janvier 2024',
        dateOperation: new Date('2024-01-19'),
        agence: 'Lomé Centre',
        typeOperation: 'Virement',
        nomBeneficiaire: 'Kossi Adjo',
        compteADebiter: 'TG0099887766',
        montant: 300000,
        modePaiement: 'Virement bancaire',
        reference: 'REF005',
        idGlpi: 'GLPI005',
        bo: 'BO005',
        statut: 'Rejetée'
      }
    ];

    this.filteredOperations = [...this.operations];
    this.updatePagedOperations();
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
  viewOperation(operation: OperationBancaire) {
    console.log('Voir opération:', operation);
    // Implémenter la logique pour voir les détails
  }

  editOperation(operation: OperationBancaire) {
    console.log('Modifier opération:', operation);
    // Implémenter la logique pour modifier
  }

  deleteOperation(id: number) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette opération ?')) {
      console.log('Supprimer opération:', id);
      // Implémenter la logique pour supprimer
    }
  }
} 