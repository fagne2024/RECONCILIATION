import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PermissionService } from '../../services/permission.service';
import { Permission } from '../../models/permission.model';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-permissions',
  templateUrl: './permissions.component.html',
  styleUrls: ['./permissions.component.scss']
})
export class PermissionsComponent implements OnInit {
  permissions: Permission[] = [];
  filteredPermissions: Permission[] = [];
  pagedPermissions: Permission[] = [];
  showAddForm = false;
  isAdding = false;
  isLoading = false;
  isGenerating = false;
  addForm: FormGroup;
  showEditForm = false;
  isEditing = false;
  editingPermission: Permission | null = null;
  editForm: FormGroup;
  generationResult: any = null;
  searchTerm = '';

  // Propriétés pour la pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;

  constructor(
    private permissionService: PermissionService,
    private formBuilder: FormBuilder,
    private http: HttpClient
  ) {
    this.addForm = this.formBuilder.group({
      nom: ['', [Validators.required, Validators.minLength(2)]]
    });

    this.editForm = this.formBuilder.group({
      nom: ['', [Validators.required, Validators.minLength(2)]]
    });
  }

  ngOnInit(): void {
    this.loadPermissions();
  }

  loadPermissions(): void {
    this.isLoading = true;
    this.permissionService.getAllPermissions().subscribe({
      next: (permissions) => {
        this.permissions = permissions;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des permissions:', error);
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    this.filteredPermissions = this.permissions.filter(permission => {
      const matchesSearch = !this.searchTerm || 
        permission.nom.toLowerCase().includes(this.searchTerm.toLowerCase());
      return matchesSearch;
    });
    this.updatePagination();
  }

  // Méthodes de pagination
  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredPermissions.length / this.itemsPerPage);
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = 1;
    }
    this.updatePagedPermissions();
  }

  updatePagedPermissions(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.pagedPermissions = this.filteredPermissions.slice(startIndex, endIndex);
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagedPermissions();
    }
  }

  onItemsPerPageChange(): void {
    this.currentPage = 1;
    this.updatePagination();
  }

  getStartIndex(): number {
    return (this.currentPage - 1) * this.itemsPerPage;
  }

  getEndIndex(): number {
    const endIndex = this.currentPage * this.itemsPerPage;
    return Math.min(endIndex, this.filteredPermissions.length);
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

  clearFilters(): void {
    this.searchTerm = '';
    this.applyFilters();
  }

  createPermission(): void {
    if (this.addForm.valid) {
      this.isAdding = true;
      const permissionData = this.addForm.value;
      
      this.permissionService.createPermission(permissionData).subscribe({
        next: (permission) => {
          console.log('✅ Permission créée avec succès:', permission);
          this.addForm.reset();
          this.showAddForm = false;
          this.isAdding = false;
          this.loadPermissions();
          this.applyFilters();
        },
        error: (error) => {
          console.error('❌ Erreur lors de la création de la permission:', error);
          this.isAdding = false;
          alert('Erreur lors de la création de la permission. Veuillez réessayer.');
        }
      });
    }
  }

  cancelAdd(): void {
    this.addForm.reset();
    this.showAddForm = false;
  }

  closeAddModal(): void {
    this.showAddForm = false;
  }

  editPermission(permission: Permission): void {
    this.editingPermission = permission;
    this.editForm.patchValue({
      nom: permission.nom
    });
    this.showEditForm = true;
  }

  updatePermission(): void {
    if (this.editForm.valid && this.editingPermission) {
      this.isEditing = true;
      const permissionData = { ...this.editingPermission, ...this.editForm.value };
      
      this.permissionService.updatePermission(permissionData.id!, permissionData).subscribe({
        next: (permission) => {
          console.log('✅ Permission mise à jour avec succès:', permission);
          this.editForm.reset();
          this.showEditForm = false;
          this.isEditing = false;
          this.editingPermission = null;
          this.loadPermissions();
          this.applyFilters();
        },
        error: (error) => {
          console.error('❌ Erreur lors de la mise à jour de la permission:', error);
          this.isEditing = false;
          alert('Erreur lors de la mise à jour de la permission. Veuillez réessayer.');
        }
      });
    }
  }

  cancelEdit(): void {
    this.editForm.reset();
    this.showEditForm = false;
    this.editingPermission = null;
  }

  deletePermission(permission: Permission): void {
    if (permission.id) {
      const confirmed = confirm(`Êtes-vous sûr de vouloir supprimer la permission "${permission.nom}" ?\n\nCette action est irréversible.`);
      if (confirmed) {
        this.permissionService.deletePermission(permission.id).subscribe({
          next: () => {
            console.log('✅ Permission supprimée avec succès');
            this.loadPermissions();
            this.applyFilters();
          },
          error: (error) => {
            console.error('❌ Erreur lors de la suppression de la permission:', error);
            console.error('❌ Structure de l\'erreur:', {
              error: error.error,
              status: error.status,
              statusText: error.statusText,
              message: error.message
            });
            
            // Extraire le message d'erreur du backend si disponible
            let errorMessage = 'Erreur lors de la suppression de la permission. Veuillez réessayer.';
            
            // Essayer différentes structures de réponse
            if (error.error) {
              if (typeof error.error === 'object') {
                // Structure: { error: "message" }
                if (error.error.error) {
                  errorMessage = error.error.error;
                } else if (error.error.message) {
                  errorMessage = error.error.message;
                } else if (Object.keys(error.error).length > 0) {
                  // Prendre la première valeur de l'objet
                  errorMessage = Object.values(error.error)[0] as string;
                }
              } else if (typeof error.error === 'string') {
                errorMessage = error.error;
              }
            } else if (error.message) {
              errorMessage = error.message;
            }
            
            alert(errorMessage);
          }
        });
      }
    }
  }

  generatePermissions(): void {
    const confirmed = confirm('Voulez-vous générer automatiquement les permissions à partir des contrôleurs de l\'application ?\n\nCette opération va analyser tous les endpoints et créer les permissions correspondantes.');
    if (confirmed) {
      this.isGenerating = true;
      this.generationResult = null;
      
      this.http.post<any>('http://localhost:8080/api/profils/permissions/generate', {}).subscribe({
        next: (result) => {
          console.log('✅ Génération des permissions terminée:', result);
          this.generationResult = result;
          this.isGenerating = false;
          // Recharger les permissions après génération
          this.loadPermissions();
          this.applyFilters();
        },
        error: (error) => {
          console.error('❌ Erreur lors de la génération des permissions:', error);
          this.isGenerating = false;
          let errorMessage = 'Erreur lors de la génération des permissions. Veuillez réessayer.';
          if (error.error && error.error.error) {
            errorMessage = error.error.error;
          } else if (error.error && typeof error.error === 'string') {
            errorMessage = error.error;
          }
          alert(errorMessage);
        }
      });
    }
  }
} 