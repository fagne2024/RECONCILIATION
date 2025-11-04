import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PermissionService } from '../../services/permission.service';
import { Permission } from '../../models/permission.model';
import { HttpClient } from '@angular/common/http';
import { PopupService } from '../../services/popup.service';

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
  
  // Propriétés pour l'analyse des actions
  showActionsAnalysis = false;
  isAnalyzing = false;
  actionsAnalysis: any = null;
  selectedModule: string | null = null;
  moduleActions: any[] = [];
  isLoadingModuleActions = false;

  // Propriétés pour la pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;

  constructor(
    private permissionService: PermissionService,
    private formBuilder: FormBuilder,
    private http: HttpClient,
    private popupService: PopupService
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
        
        // Gestion d'erreur plus explicite
        if (error.status === 0) {
          this.popupService.showError(
            'Impossible de se connecter au serveur backend.\n\n' +
            'Veuillez vérifier que le backend est démarré sur le port 8080.\n\n' +
            'Pour démarrer le backend:\n' +
            'cd reconciliation-app/backend\n' +
            'mvn spring-boot:run',
            'Erreur de connexion'
          );
        } else if (error.status === 404) {
          this.popupService.showWarning(
            'Endpoint non trouvé. Vérifiez que le backend est à jour.',
            'Endpoint non trouvé'
          );
        } else {
          this.popupService.showError(
            `Erreur lors du chargement des permissions: ${error.message || 'Erreur inconnue'}`,
            'Erreur'
          );
        }
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
          this.popupService.showSuccess(
            `La permission "${permission.nom}" a été créée avec succès.`,
            'Permission créée'
          );
          this.addForm.reset();
          this.showAddForm = false;
          this.isAdding = false;
          this.loadPermissions();
          this.applyFilters();
        },
        error: (error) => {
          console.error('❌ Erreur lors de la création de la permission:', error);
          this.isAdding = false;
          this.popupService.showError(
            'Erreur lors de la création de la permission. Veuillez réessayer.',
            'Erreur de création'
          );
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
          this.popupService.showSuccess(
            `La permission "${permission.nom}" a été mise à jour avec succès.`,
            'Permission mise à jour'
          );
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
          this.popupService.showError(
            'Erreur lors de la mise à jour de la permission. Veuillez réessayer.',
            'Erreur de mise à jour'
          );
        }
      });
    }
  }

  cancelEdit(): void {
    this.editForm.reset();
    this.showEditForm = false;
    this.editingPermission = null;
  }

  async deletePermission(permission: Permission): Promise<void> {
    if (permission.id) {
      const confirmed = await this.popupService.showConfirm(
        `Êtes-vous sûr de vouloir supprimer la permission "${permission.nom}" ?\n\nCette action est irréversible.`,
        'Confirmation de suppression'
      );
      if (confirmed) {
        this.permissionService.deletePermission(permission.id).subscribe({
          next: () => {
            console.log('✅ Permission supprimée avec succès');
            this.popupService.showSuccess(
              `La permission "${permission.nom}" a été supprimée avec succès.`,
              'Permission supprimée'
            );
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
            
            this.popupService.showError(errorMessage, 'Erreur de suppression');
          }
        });
      }
    }
  }

  async generatePermissions(): Promise<void> {
    const confirmed = await this.popupService.showConfirm(
      'Voulez-vous générer automatiquement les permissions à partir des contrôleurs de l\'application ?\n\nCette opération va analyser tous les endpoints et créer les permissions correspondantes.',
      'Génération automatique'
    );
    if (confirmed) {
      this.isGenerating = true;
      this.generationResult = null;
      
      this.permissionService.generatePermissions().subscribe({
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
          this.popupService.showError(errorMessage, 'Erreur de génération');
        }
      });
    }
  }

  /**
   * Analyse toutes les actions disponibles par module
   */
  analyzeModuleActions(): void {
    this.isAnalyzing = true;
    this.actionsAnalysis = null;
    this.showActionsAnalysis = true;
    
    this.permissionService.analyzeAllModuleActions().subscribe({
      next: (result) => {
        console.log('✅ Analyse des actions terminée:', result);
        this.actionsAnalysis = result;
        this.isAnalyzing = false;
      },
      error: (error) => {
        console.error('❌ Erreur lors de l\'analyse des actions:', error);
        this.isAnalyzing = false;
        let errorMessage = 'Erreur lors de l\'analyse des actions. Veuillez réessayer.';
        if (error.error && error.error.error) {
          errorMessage = error.error.error;
        } else if (error.error && typeof error.error === 'string') {
          errorMessage = error.error;
        }
        this.popupService.showError(errorMessage, 'Erreur d\'analyse');
      }
    });
  }

  /**
   * Charge les actions d'un module spécifique
   */
  loadModuleActions(moduleName: string): void {
    this.selectedModule = moduleName;
    this.isLoadingModuleActions = true;
    this.moduleActions = [];
    
    this.permissionService.getActionsForModule(moduleName).subscribe({
      next: (actions) => {
        console.log(`✅ Actions chargées pour le module ${moduleName}:`, actions);
        this.moduleActions = actions;
        this.isLoadingModuleActions = false;
      },
      error: (error) => {
        console.error(`❌ Erreur lors du chargement des actions pour ${moduleName}:`, error);
        this.isLoadingModuleActions = false;
        this.popupService.showError(
          `Erreur lors du chargement des actions pour le module ${moduleName}`,
          'Erreur de chargement'
        );
      }
    });
  }

  /**
   * Ferme l'analyse des actions
   */
  closeActionsAnalysis(): void {
    this.showActionsAnalysis = false;
    this.actionsAnalysis = null;
    this.selectedModule = null;
    this.moduleActions = [];
  }

  /**
   * Retourne les modules disponibles dans l'analyse
   */
  getAvailableModules(): string[] {
    if (!this.actionsAnalysis || !this.actionsAnalysis.modules) {
      return [];
    }
    return Object.keys(this.actionsAnalysis.modules);
  }

  /**
   * Retourne le nombre d'actions pour un module
   */
  getActionCountForModule(moduleName: string): number {
    if (!this.actionsAnalysis || !this.actionsAnalysis.actionCounts) {
      return 0;
    }
    return this.actionsAnalysis.actionCounts[moduleName] || 0;
  }
} 