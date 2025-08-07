import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ImpactOP } from '../../models/impact-op.model';
import { ImpactOPService } from '../../services/impact-op.service';

@Component({
  selector: 'app-impact-op-tab',
  templateUrl: './impact-op-tab.component.html',
  styleUrls: ['./impact-op-tab.component.scss']
})
export class ImpactOPTabComponent implements OnInit, OnDestroy {
  @Input() agence: string = '';
  @Input() dateTransaction: string = '';

  impactOPs: ImpactOP[] = [];
  isLoading = false;
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  Math = Math;

  private subscription = new Subscription();

  constructor(private impactOPService: ImpactOPService) {}

  ngOnInit() {
    this.loadImpactOPs();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  loadImpactOPs() {
    if (!this.agence || !this.dateTransaction) return;

    this.isLoading = true;
    
    // Formater la date correctement pour le filtrage précis
    // La date du relevé est au format "YYYY-MM-DD", on doit la convertir en format datetime
    const dateDebut = this.dateTransaction + ' 00:00:00';
    const dateFin = this.dateTransaction + ' 23:59:59';
    
    // Créer les filtres pour la date et l'agence
    const filter = {
      codeProprietaire: this.agence,
      dateDebut: dateDebut,
      dateFin: dateFin
    };

    console.log('Filtrage Impact OP:', filter); // Debug

    this.subscription.add(
      this.impactOPService.getImpactOPs(filter).subscribe({
        next: (impacts) => {
          console.log('Impacts OP récupérés:', impacts.length); // Debug
          this.impactOPs = impacts;
          this.calculatePagination();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des impacts OP:', error);
          this.isLoading = false;
        }
      })
    );
  }

  calculatePagination() {
    this.totalPages = Math.ceil(this.impactOPs.length / this.pageSize);
    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages || 1;
    }
  }

  get pagedImpactOPs(): ImpactOP[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.impactOPs.slice(start, end);
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
    const maxVisible = 5;
    const start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(this.totalPages, start + maxVisible - 1);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatMontant(montant: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 2
    }).format(montant);
  }

  getStatutClass(statut: string): string {
    switch (statut) {
      case 'EN_ATTENTE':
        return 'statut-en-attente';
      case 'TRAITE':
        return 'statut-traite';
      case 'ERREUR':
        return 'statut-erreur';
      default:
        return '';
    }
  }

  getStatutLabel(statut: string): string {
    switch (statut) {
      case 'EN_ATTENTE':
        return 'En attente';
      case 'TRAITE':
        return 'Traité';
      case 'ERREUR':
        return 'Erreur';
      default:
        return statut;
    }
  }

  calculateTotalMontant(): number {
    return this.impactOPs.reduce((total, impact) => total + (impact.montant || 0), 0);
  }

  formatTotalMontant(): string {
    return this.formatMontant(this.calculateTotalMontant());
  }
} 