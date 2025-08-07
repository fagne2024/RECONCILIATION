import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { ImpactOP, ImpactOPFilter, ImpactOPValidationResult } from '../../models/impact-op.model';
import { ImpactOPService } from '../../services/impact-op.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-impact-op',
  templateUrl: './impact-op.component.html',
  styleUrls: ['./impact-op.component.scss']
})
export class ImpactOPComponent implements OnInit, OnDestroy {
  impactOPs: ImpactOP[] = [];
  filteredImpactOPs: ImpactOP[] = [];
  isLoading = false;
  isUploading = false;
  currentPage = 1;
  pageSize = 10;
  totalPages = 1;
  Math = Math; // Pour utiliser Math dans le template
  
  // Filtres
  filterForm: FormGroup;
  codeProprietaires: string[] = [];
  typeOperations: string[] = [];
  groupeReseaux: string[] = [];
  statuts = ['EN_ATTENTE', 'TRAITE', 'ERREUR'];
  
  // Upload
  selectedFile: File | null = null;
  uploadMessage: { type: 'success' | 'error', text: string } | null = null;
  fileValidated = false;
  validationResult: ImpactOPValidationResult | null = null;
  uploadError = '';
  
  // Propriétés pour le modal de commentaire
  showCommentModal = false;
  selectedImpactOP: ImpactOP | null = null;
  newStatut = '';
  commentaire = '';
  commentForm: FormGroup;

  // Statistiques
  stats = {
    total: 0,
    enAttente: 0,
    traite: 0,
    erreur: 0,
    montantTotal: 0
  };

  private subscription = new Subscription();

  constructor(
    private impactOPService: ImpactOPService,
    private fb: FormBuilder,
    private route: ActivatedRoute
  ) {
    this.filterForm = this.fb.group({
      codeProprietaire: [''],
      typeOperation: [''],
      groupeReseau: [''],
      statut: [''],
      dateDebut: [''],
      dateFin: [''],
      montantMin: [''],
      montantMax: ['']
    });

    this.commentForm = this.fb.group({
      commentaire: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.loadImpactOPs();
    this.loadFilterOptions();
    this.loadStats();
    this.setupFilterListener();
    
    // Lire les paramètres de l'URL pour appliquer les filtres automatiquement
    this.subscription.add(
      this.route.queryParams.subscribe(params => {
        if (params['codeProprietaire'] || params['dateDebut'] || params['dateFin']) {
          // Appliquer les filtres automatiquement
          if (params['codeProprietaire']) {
            this.filterForm.patchValue({ codeProprietaire: params['codeProprietaire'] });
          }
          if (params['dateDebut']) {
            // Convertir la date pour le format datetime-local
            const dateDebut = new Date(params['dateDebut']);
            const dateDebutString = dateDebut.toISOString().slice(0, 16); // Format YYYY-MM-DDTHH:mm
            this.filterForm.patchValue({ dateDebut: dateDebutString });
          }
          if (params['dateFin']) {
            // Convertir la date pour le format datetime-local
            const dateFin = new Date(params['dateFin']);
            const dateFinString = dateFin.toISOString().slice(0, 16); // Format YYYY-MM-DDTHH:mm
            this.filterForm.patchValue({ dateFin: dateFinString });
          }
          
          // Appliquer les filtres automatiquement
          this.applyFilters();
        }
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  loadImpactOPs() {
    this.isLoading = true;
    this.subscription.add(
      this.impactOPService.getImpactOPs().subscribe({
        next: (data) => {
          this.impactOPs = data;
          this.filteredImpactOPs = [...data];
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

  loadFilterOptions() {
    this.subscription.add(
      this.impactOPService.getFilterOptions().subscribe({
        next: (data) => {
          this.codeProprietaires = data.codeProprietaires;
          this.typeOperations = data.typeOperations;
          this.groupeReseaux = data.groupeReseaux;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des options de filtres:', error);
        }
      })
    );
  }

  loadStats() {
    this.subscription.add(
      this.impactOPService.getImpactOPStats().subscribe({
        next: (data) => {
          this.stats = data;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des statistiques:', error);
        }
      })
    );
  }

  setupFilterListener() {
    this.subscription.add(
      this.filterForm.valueChanges.subscribe(() => {
        this.currentPage = 1;
        this.applyFilters();
      })
    );
  }

  applyFilters() {
    const filterValue = this.filterForm.value;
    const filter: ImpactOPFilter = {};

    if (filterValue.codeProprietaire) {
      filter.codeProprietaire = filterValue.codeProprietaire;
    }
    if (filterValue.typeOperation) {
      filter.typeOperation = filterValue.typeOperation;
    }
    if (filterValue.groupeReseau) {
      filter.groupeReseau = filterValue.groupeReseau;
    }
    if (filterValue.statut) {
      filter.statut = filterValue.statut;
    }
    if (filterValue.dateDebut) {
      filter.dateDebut = filterValue.dateDebut;
    }
    if (filterValue.dateFin) {
      filter.dateFin = filterValue.dateFin;
    }
    if (filterValue.montantMin) {
      filter.montantMin = parseFloat(filterValue.montantMin);
    }
    if (filterValue.montantMax) {
      filter.montantMax = parseFloat(filterValue.montantMax);
    }

    this.isLoading = true;
    this.subscription.add(
      this.impactOPService.getImpactOPs(filter).subscribe({
        next: (data) => {
          this.filteredImpactOPs = data;
          this.calculatePagination();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur lors de l\'application des filtres:', error);
          this.isLoading = false;
        }
      })
    );
  }

  clearFilters() {
    this.filterForm.reset();
    this.applyFilters();
  }

  calculatePagination() {
    this.totalPages = Math.ceil(this.filteredImpactOPs.length / this.pageSize);
  }

  get pagedImpactOPs(): ImpactOP[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.filteredImpactOPs.slice(startIndex, endIndex);
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
      this.impactOPService.validateImpactOPFile(this.selectedFile).subscribe({
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
      this.impactOPService.uploadImpactOPFile(this.selectedFile).subscribe({
        next: (response) => {
          this.uploadMessage = { type: 'success', text: `${response.message} - ${response.count} enregistrements importés` };
          this.selectedFile = null;
          this.fileValidated = false;
          this.validationResult = null;
          this.loadImpactOPs(); // Recharger les données
          this.loadStats(); // Recharger les statistiques
          this.isUploading = false;
        },
        error: (err) => {
          this.uploadMessage = { type: 'error', text: err.error?.error || 'Erreur lors de l\'upload du fichier' };
          this.isUploading = false;
        }
      })
    );
  }

  updateStatut(impactOP: ImpactOP, newStatut: string) {
    if (newStatut === impactOP.statut) return;

    this.subscription.add(
      this.impactOPService.updateImpactOPStatut(impactOP.id!, newStatut).subscribe({
        next: (updatedImpactOP) => {
          // Mettre à jour l'impact OP dans la liste
          const index = this.impactOPs.findIndex(op => op.id === impactOP.id);
          if (index !== -1) {
            this.impactOPs[index] = updatedImpactOP;
          }
          
          const indexFiltered = this.filteredImpactOPs.findIndex(op => op.id === impactOP.id);
          if (indexFiltered !== -1) {
            this.filteredImpactOPs[indexFiltered] = updatedImpactOP;
          }

          this.showTemporaryMessage('success', `Statut mis à jour: ${newStatut}`);
          this.loadStats();
        },
        error: (error) => {
          console.error('Erreur lors de la mise à jour du statut:', error);
          this.showTemporaryMessage('error', 'Erreur lors de la mise à jour du statut');
        }
      })
    );
  }

  private showTemporaryMessage(type: 'success' | 'error', message: string) {
    this.uploadMessage = { type, text: message };
    setTimeout(() => {
      this.uploadMessage = null;
    }, 3000);
  }

  onStatutChange(impactOP: ImpactOP, event: Event) {
    const newStatut = (event.target as HTMLSelectElement).value;
    if (newStatut === 'TRAITE' || newStatut === 'ERREUR') {
      this.openCommentModal(impactOP, newStatut);
    } else {
      this.updateStatut(impactOP, newStatut);
    }
  }

  openCommentModal(impactOP: ImpactOP, newStatut: string) {
    this.selectedImpactOP = impactOP;
    this.newStatut = newStatut;
    this.commentForm.reset();
    this.showCommentModal = true;
  }

  closeCommentModal() {
    this.showCommentModal = false;
    this.selectedImpactOP = null;
    this.newStatut = '';
    this.commentForm.reset();
  }

  confirmStatutChange() {
    if (!this.selectedImpactOP || !this.commentForm.valid) return;

    const commentaire = this.commentForm.get('commentaire')?.value;
    
    this.subscription.add(
      this.impactOPService.updateImpactOPStatut(this.selectedImpactOP.id!, this.newStatut, commentaire).subscribe({
        next: (updatedImpactOP) => {
          // Mettre à jour l'impact OP dans la liste
          const index = this.impactOPs.findIndex(op => op.id === this.selectedImpactOP!.id);
          if (index !== -1) {
            this.impactOPs[index] = updatedImpactOP;
          }
          
          const indexFiltered = this.filteredImpactOPs.findIndex(op => op.id === this.selectedImpactOP!.id);
          if (indexFiltered !== -1) {
            this.filteredImpactOPs[indexFiltered] = updatedImpactOP;
          }

          this.showTemporaryMessage('success', `Statut mis à jour: ${this.newStatut}`);
          this.loadStats();
          this.closeCommentModal();
        },
        error: (error) => {
          console.error('Erreur lors de la mise à jour du statut:', error);
          this.showTemporaryMessage('error', 'Erreur lors de la mise à jour du statut');
        }
      })
    );
  }

  deleteImpactOP(id: number) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet impact OP ?')) {
      this.subscription.add(
        this.impactOPService.deleteImpactOP(id).subscribe({
          next: (success) => {
            if (success) {
              this.impactOPs = this.impactOPs.filter(op => op.id !== id);
              this.filteredImpactOPs = this.filteredImpactOPs.filter(op => op.id !== id);
              this.calculatePagination();
              this.loadStats();
              this.showTemporaryMessage('success', 'Impact OP supprimé avec succès');
            } else {
              this.showTemporaryMessage('error', 'Erreur lors de la suppression');
            }
          },
          error: (error) => {
            console.error('Erreur lors de la suppression:', error);
            this.showTemporaryMessage('error', 'Erreur lors de la suppression');
          }
        })
      );
    }
  }

  saveImpactOP(impactOP: ImpactOP) {
    this.isLoading = true;
    
    if (impactOP.id) {
      // Mise à jour d'un impact existant
      this.subscription.add(
        this.impactOPService.updateImpactOP(impactOP.id, impactOP).subscribe({
          next: (updatedImpact) => {
            this.showTemporaryMessage('success', 'Impact OP mis à jour avec succès');
            this.loadImpactOPs();
            this.loadStats();
          },
          error: (error) => {
            console.error('Erreur lors de la mise à jour:', error);
            this.showTemporaryMessage('error', 'Erreur lors de la mise à jour');
          },
          complete: () => {
            this.isLoading = false;
          }
        })
      );
    } else {
      // Création d'un nouvel impact
      const { id, ...impactWithoutId } = impactOP;
      this.subscription.add(
        this.impactOPService.createImpactOP(impactWithoutId).subscribe({
          next: (newImpact) => {
            this.showTemporaryMessage('success', 'Impact OP créé avec succès');
            this.loadImpactOPs();
            this.loadStats();
          },
          error: (error) => {
            console.error('Erreur lors de la création:', error);
            this.showTemporaryMessage('error', 'Erreur lors de la création');
          },
          complete: () => {
            this.isLoading = false;
          }
        })
      );
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('fr-FR');
  }

  formatMontant(montant: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF'
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

  exportImpactOPs(): void {
    const filterValue = this.filterForm.value;
    const filter: ImpactOPFilter = {};

    if (filterValue.codeProprietaire) {
      filter.codeProprietaire = filterValue.codeProprietaire;
    }
    if (filterValue.typeOperation) {
      filter.typeOperation = filterValue.typeOperation;
    }
    if (filterValue.groupeReseau) {
      filter.groupeReseau = filterValue.groupeReseau;
    }
    if (filterValue.statut) {
      filter.statut = filterValue.statut;
    }
    if (filterValue.dateDebut) {
      filter.dateDebut = filterValue.dateDebut;
    }
    if (filterValue.dateFin) {
      filter.dateFin = filterValue.dateFin;
    }
    if (filterValue.montantMin) {
      filter.montantMin = parseFloat(filterValue.montantMin);
    }
    if (filterValue.montantMax) {
      filter.montantMax = parseFloat(filterValue.montantMax);
    }

    this.subscription.add(
      this.impactOPService.exportImpactOPs(filter).subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `impacts-op-${new Date().toISOString().split('T')[0]}.xlsx`;
          link.click();
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error('Erreur lors de l\'export:', error);
          this.showTemporaryMessage('error', 'Erreur lors de l\'export');
        }
      })
    );
  }
} 