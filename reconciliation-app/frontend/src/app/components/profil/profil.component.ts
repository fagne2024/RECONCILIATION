import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProfilService } from '../../services/profil.service';
import { PaysService } from '../../services/pays.service';
import { Profil } from '../../models/profil.model';
import { Module } from '../../models/module.model';
import { Permission } from '../../models/permission.model';
import { ProfilPermission } from '../../models/profil-permission.model';
import { Pays, ProfilPays } from '../../models/pays.model';

@Component({
  selector: 'app-profil',
  templateUrl: './profil.component.html',
  styleUrls: ['./profil.component.scss']
})
export class ProfilComponent implements OnInit {
  profils: Profil[] = [];
  filteredProfils: Profil[] = [];
  pagedProfils: Profil[] = [];
  modules: Module[] = [];
  permissions: Permission[] = [];
  profilPermissions: ProfilPermission[] = [];
  selectedProfil: Profil | null = null;
  searchTerm = '';
  newProfilName = '';
  newModuleName = '';
  newPermissionName = '';
  selectedPermissionName = '';
  selectedModuleId: number | '' = '';
  availableModulePermissions: Permission[] = [];
  loadingModulePermissions = false;
  modulePermissionsCache: { [moduleId: number]: Permission[] } = {};

  // Propriétés pour la pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;
  
  // Propriété pour contrôler l'affichage de la vue d'ensemble
  showOverview = false;
  
  // Nombre de permissions à afficher par défaut dans la liste
  defaultPermissionsDisplayCount = 10;
  
  // Propriétés pour la gestion des pays et drapeaux
  flagLoadError: { [key: string]: boolean } = {};
  
  // Propriétés pour la gestion des pays
  pays: Pays[] = [];
  profilPays: ProfilPays[] = [];
  showPaysModal = false;
  selectedProfilForPays: Profil | null = null;
  isSavingPays = false;

  // Propriétés pour le formulaire d'ajout
  showAddForm = false;
  isAdding = false;
  isDeleting = false;
  isLoading = false;
  addForm: FormGroup;

  // Liste statique des menus principaux de l'application
  appMenus = [
    'Dashboard',
    'Traitement',
    'Réconciliation',
    'Résultats',
    'Statistiques',
    'Classements',
    'Comptes',
    'Opérations',
    'Frais',
    'Utilisateur',
    'Profil',
    'Log utilisateur'
  ];
  selectedMenuName = '';

  constructor(
    private profilService: ProfilService,
    private paysService: PaysService,
    private fb: FormBuilder,
    private cd: ChangeDetectorRef
  ) {
    this.addForm = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      moduleId: ['']
    });
    this.editForm = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2)]],
      description: ['']
    });
  }

  ngOnInit(): void {
    this.loadProfils();
    this.loadModules();
    this.loadPermissions();
    this.loadPays();
  }

  loadProfils() {
    this.isLoading = true;
    this.profilService.getProfils().subscribe({
      next: (p) => {
        this.profils = p;
        this.applyFilters();
        // Charger les permissions pour tous les profils afin d'avoir les décomptes corrects
        this.loadAllProfilPermissions();
        // Charger les pays associés pour tous les profils
        this.loadAllProfilPays();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des profils:', error);
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    this.filteredProfils = this.profils.filter(profil => {
      const matchesSearch = !this.searchTerm || 
        profil.nom.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (profil.description && profil.description.toLowerCase().includes(this.searchTerm.toLowerCase()));
      return matchesSearch;
    });
    this.updatePagination();
  }

  // Méthodes de pagination
  updatePagination(): void {
    this.totalPages = Math.ceil(this.filteredProfils.length / this.itemsPerPage);
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = 1;
    }
    this.updatePagedProfils();
  }

  updatePagedProfils(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.pagedProfils = this.filteredProfils.slice(startIndex, endIndex);
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagedProfils();
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
    return Math.min(endIndex, this.filteredProfils.length);
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

  loadAllProfilPermissions() {
    // Charger les permissions pour tous les profils
    this.profils.forEach(profil => {
      if (profil.id) {
        this.profilService.getProfilPermissions(profil.id).subscribe({
          next: (pp) => {
            // Ajouter les permissions chargées à la liste globale
            pp.forEach(newPp => {
              // Vérifier si cette permission n'existe pas déjà
              if (!this.profilPermissions.some(existing => 
                existing.id === newPp.id || 
                (existing.profil && existing.profil.id === newPp.profil?.id &&
                 existing.module && existing.module.id === newPp.module?.id &&
                 existing.permission && existing.permission.id === newPp.permission?.id)
              )) {
                this.profilPermissions.push(newPp);
              }
            });
            this.cd.detectChanges();
          },
          error: (error) => {
            console.error(`Erreur lors du chargement des permissions pour le profil ${profil.id}:`, error);
          }
        });
      }
    });
  }
  loadModules() {
    this.profilService.getModules().subscribe(m => this.modules = m);
  }
  loadPermissions() {
    this.profilService.getPermissions().subscribe(a => this.permissions = a);
  }

  selectProfil(profil: Profil) {
    // Si le profil est déjà sélectionné, le désélectionner (masquer les infos)
    if (this.selectedProfil && this.selectedProfil.id === profil.id) {
      this.selectedProfil = null;
      this.profilPermissions = [];
      this.modulePermissionsCache = {}; // Nettoyer le cache
    } else {
      // Sinon, sélectionner le profil et charger ses permissions
      this.selectedProfil = profil;
      this.modulePermissionsCache = {}; // Réinitialiser le cache
      this.profilService.getProfilPermissions(profil.id!).subscribe(pp => {
        this.profilPermissions = pp;
        // Charger les permissions pour tous les modules associés
        this.preloadModulePermissions();
      });
    }
  }

  /**
   * Précharge les permissions pour tous les modules associés au profil
   */
  preloadModulePermissions(): void {
    if (!this.selectedProfil) return;
    
    const associatedModules = this.getAssociatedModules();
    associatedModules.forEach(module => {
      if (module.id && !this.modulePermissionsCache[module.id]) {
        this.loadModulePermissionsForDisplay(module);
      }
    });
  }

  createProfil() {
    if (this.addForm.valid) {
      this.isAdding = true;
      const newProfil = {
        nom: this.addForm.get('nom')?.value,
        description: this.addForm.get('description')?.value || ''
      };
      const selectedModuleId = this.addForm.get('moduleId')?.value;
      
      this.profilService.createProfil(newProfil).subscribe({
        next: (response) => {
          // Si un module est sélectionné, l'associer au profil avec toutes les permissions
          if (response.id && selectedModuleId) {
            this.associateModuleToNewProfil(response.id, selectedModuleId);
          } else {
            this.addForm.reset();
            this.showAddForm = false;
            this.loadProfils();
            // Recharger les permissions pour mettre à jour les décomptes
            this.loadAllProfilPermissions();
            // Recharger les pays associés
            this.loadAllProfilPays();
            this.isAdding = false;
          }
        },
        error: (error) => {
          console.error('Erreur lors de la création du profil:', error);
          this.isAdding = false;
        }
      });
    }
  }

  associateModuleToNewProfil(profilId: number, moduleId: number): void {
    if (this.permissions.length === 0) {
      console.log('⚠️ Aucune permission disponible pour associer au module');
      this.addForm.reset();
      this.showAddForm = false;
      this.loadProfils();
      this.isAdding = false;
      return;
    }

    let addedCount = 0;
    const totalPermissions = this.permissions.length;

    this.permissions.forEach(permission => {
      if (permission.id) {
        this.profilService.addPermissionToProfil(profilId, moduleId, permission.id).subscribe({
          next: (pp) => {
            addedCount++;
            if (addedCount === totalPermissions) {
              console.log(`✅ Module associé au nouveau profil`);
              this.addForm.reset();
              this.showAddForm = false;
              this.loadProfils();
              // Recharger les permissions pour mettre à jour les décomptes
              this.loadAllProfilPermissions();
              // Recharger les permissions si un profil est sélectionné
              if (this.selectedProfil && this.selectedProfil.id === profilId) {
                this.profilService.getProfilPermissions(profilId).subscribe(pp => this.profilPermissions = pp);
              }
              this.isAdding = false;
            }
          },
          error: (error) => {
            console.error(`❌ Erreur lors de l'association de la permission:`, error);
            addedCount++;
            if (addedCount === totalPermissions) {
              this.addForm.reset();
              this.showAddForm = false;
              this.loadProfils();
              // Recharger les permissions si un profil est sélectionné
              if (this.selectedProfil && this.selectedProfil.id === profilId) {
                this.profilService.getProfilPermissions(profilId).subscribe(pp => this.profilPermissions = pp);
              }
              this.isAdding = false;
            }
          }
        });
      }
    });
  }

  cancelAdd() {
    this.addForm.reset();
    this.showAddForm = false;
  }

  closeAddModal(event: Event) {
    if (event.target === event.currentTarget) {
      this.cancelAdd();
    }
  }

  // Propriétés pour l'édition
  showEditForm = false;
  isEditing = false;
  editingProfil: Profil | null = null;
  editForm: FormGroup;

  editProfil(profil: Profil) {
    this.editingProfil = profil;
    this.editForm = this.fb.group({
      nom: [profil.nom, [Validators.required, Validators.minLength(2)]],
      description: [profil.description || '']
    });
    this.showEditForm = true;
  }

  updateProfil() {
    if (this.editForm.valid && this.editingProfil) {
      this.isEditing = true;
      const updatedProfil = {
        ...this.editingProfil,
        nom: this.editForm.get('nom')?.value,
        description: this.editForm.get('description')?.value || ''
      };
      
      this.profilService.updateProfil(this.editingProfil.id!, updatedProfil).subscribe({
        next: (response) => {
          this.editForm.reset();
          this.showEditForm = false;
          this.editingProfil = null;
          this.loadProfils();
          // Recharger les permissions pour mettre à jour les décomptes
          this.loadAllProfilPermissions();
          this.isEditing = false;
        },
        error: (error) => {
          console.error('Erreur lors de la modification du profil:', error);
          this.isEditing = false;
        }
      });
    }
  }

  cancelEdit() {
    this.editForm.reset();
    this.showEditForm = false;
    this.editingProfil = null;
  }

  isDeletingProfil(profilId: number): boolean {
    return this.isDeleting;
  }

  deleteProfil(profil: Profil) {
    console.log('🗑️ Tentative de suppression du profil:', profil);
    
    if (profil.id) {
      const confirmed = confirm(`Êtes-vous sûr de vouloir supprimer le profil "${profil.nom}" ?\n\nCette action est irréversible.`);
      
      if (confirmed) {
        console.log('✅ Confirmation reçue, suppression du profil ID:', profil.id);
        this.isDeleting = true;
        
        this.profilService.deleteProfil(profil.id).subscribe({
          next: (response) => {
            console.log('✅ Profil supprimé avec succès');
            // Si le profil supprimé était sélectionné, désélectionner
            if (this.selectedProfil && this.selectedProfil.id === profil.id) {
              this.selectedProfil = null;
            }
            this.loadProfils();
            // Recharger les permissions pour mettre à jour les décomptes
            this.loadAllProfilPermissions();
            this.isDeleting = false;
            alert('Profil supprimé avec succès.');
          },
          error: (error) => {
            console.error('❌ Erreur lors de la suppression du profil:', error);
            console.error('Détails de l\'erreur:', error.status, error.message);
            this.isDeleting = false;

            // Extraire le message d'erreur du backend
            let errorMessage = 'Erreur lors de la suppression du profil.';
            if (error.error && error.error.error) {
              errorMessage = error.error.error;
            } else if (error.error && typeof error.error === 'string') {
              errorMessage = error.error;
            } else if (error.message) {
              errorMessage = error.message;
            }

            alert(errorMessage);
          },
          complete: () => {
            console.log('✅ Requête DELETE terminée');
          }
        });
      } else {
        console.log('❌ Suppression annulée par l\'utilisateur');
      }
    } else {
      console.error('❌ Impossible de supprimer: ID du profil manquant');
    }
  }

  createModule() {
    if (this.selectedMenuName && !this.modules.some(m => m.nom === this.selectedMenuName) && this.selectedProfil) {
      this.profilService.createModule({ nom: this.selectedMenuName }).subscribe(module => {
        this.selectedMenuName = '';
        this.loadModules();
        // Associer toutes les permissions existantes à ce profil pour ce module
        this.permissions.forEach(permission => {
          this.profilService.addPermissionToProfil(this.selectedProfil!.id!, module.id!, permission.id!).subscribe(pp => {
            this.profilPermissions.push(pp);
          });
        });
      });
    }
  }

  deleteModule(module: Module) {
    // À implémenter côté backend si besoin, ici on retire juste du tableau pour la démo
    if (confirm('Supprimer ce menu ?')) {
      // Si un endpoint delete existe côté backend, décommentez la ligne suivante :
      // this.profilService.deleteModule(module.id!).subscribe(() => this.loadModules());
      this.modules = this.modules.filter(m => m.id !== module.id);
    }
  }

  createPermission() {
    if (this.newPermissionName.trim()) {
      this.profilService.createPermission({ nom: this.newPermissionName }).subscribe(() => {
        this.newPermissionName = '';
        this.loadPermissions();
      });
    }
  }

  permissionExists(name: string): boolean {
    return this.permissions.some(p => p.nom.toLowerCase() === name.toLowerCase());
  }

  addExistingPermission() {
    if (this.selectedPermissionName && !this.permissionExists(this.selectedPermissionName)) {
      this.profilService.createPermission({ nom: this.selectedPermissionName }).subscribe(() => {
        this.selectedPermissionName = '';
        this.loadPermissions();
      });
    }
  }

  permissionExistsForModule(name: string): boolean {
    if (!this.selectedModuleId) return false;
    const module = this.modules.find(m => m.id === +this.selectedModuleId);
    const permission = this.availableModulePermissions.find(p => p.nom.toLowerCase() === name.toLowerCase());
    if (!module || !permission || !module.id || !permission.id) return false;
    return this.profilPermissions.some(pp => 
      pp.module && pp.module.id && pp.permission && pp.permission.id &&
      pp.module.id === module.id && pp.permission.id === permission.id
    );
  }

  addExistingPermissionToModule() {
    if (this.selectedProfil && this.selectedModuleId && this.selectedPermissionName) {
      const profilId = this.selectedProfil.id!;
      const module = this.modules.find(m => m.id === +this.selectedModuleId);
      const permission = this.availableModulePermissions.find(p => p.nom === this.selectedPermissionName);
      if (module && permission && !this.permissionExistsForModule(permission.nom)) {
        this.profilService.addPermissionToProfil(profilId, module.id!, permission.id!).subscribe(pp => {
          this.profilPermissions.push(pp);
          // Rafraîchir la liste des permissions du profil
          this.profilService.getProfilPermissions(profilId).subscribe(pp => this.profilPermissions = pp);
        });
      }
      this.selectedPermissionName = '';
    }
  }

  createPermissionForModule() {
    if (this.selectedProfil && this.selectedModuleId && this.newPermissionName) {
      const profilId = this.selectedProfil.id!;
      this.profilService.createPermission({ nom: this.newPermissionName }).subscribe(permission => {
        const module = this.modules.find(m => m.id === +this.selectedModuleId);
        if (module && permission) {
          this.profilService.addPermissionToProfil(profilId, module.id!, permission.id!).subscribe(pp => {
            this.profilPermissions.push(pp);
            // Rafraîchir les listes
            this.loadPermissions();
            this.profilService.getProfilPermissions(profilId).subscribe(pp => this.profilPermissions = pp);
            // Recharger les permissions du module
            this.onModuleChange();
          });
        }
        this.newPermissionName = '';
      });
    }
  }

  hasPermission(module: Module, permission: Permission): boolean {
    return this.profilPermissions.some(pp =>
      pp.module && pp.module.id && pp.permission && pp.permission.id &&
      pp.module.id === module.id && pp.permission.id === permission.id
    );
  }

  togglePermission(module: Module, permission: Permission, event: Event) {
    if (!this.selectedProfil || !module.id || !permission.id) return;
    
    const checked = (event.target as HTMLInputElement).checked;
    const existing = this.profilPermissions.find(pp =>
      pp.module && pp.module.id && pp.permission && pp.permission.id &&
      pp.profil && pp.profil.id &&
      pp.module.id === module.id && 
      pp.permission.id === permission.id &&
      pp.profil.id === this.selectedProfil.id
    );
    
    if (checked && !existing) {
      // Ajouter la permission
      console.log(`➕ Ajout de la permission "${permission.nom}" pour le module "${module.nom}"`);
      this.profilService.addPermissionToProfil(this.selectedProfil.id!, module.id!, permission.id!).subscribe({
        next: (pp) => {
          // Vérifier qu'elle n'existe pas déjà avant d'ajouter
          if (!this.profilPermissions.some(existing => 
            existing.id === pp.id || 
            (existing.module && existing.module.id === pp.module?.id && 
             existing.permission && existing.permission.id === pp.permission?.id &&
             existing.profil && existing.profil.id === pp.profil?.id)
          )) {
            this.profilPermissions.push(pp);
          }
          this.cd.detectChanges();
          console.log(`✅ Permission "${permission.nom}" ajoutée avec succès`);
          // Recharger toutes les permissions pour mettre à jour les décomptes dans le tableau
          this.loadAllProfilPermissions();
        },
        error: (error) => {
          console.error(`❌ Erreur lors de l'ajout de la permission:`, error);
          // Recharger les permissions en cas d'erreur
          this.reloadProfilData();
        }
      });
    } else if (!checked && existing && existing.id) {
      // Supprimer la permission
      console.log(`➖ Suppression de la permission "${permission.nom}" pour le module "${module.nom}"`);
      this.profilService.removePermissionFromProfil(existing.id).subscribe({
        next: () => {
          // Supprimer immédiatement de la liste
          this.profilPermissions = this.profilPermissions.filter(pp => pp.id !== existing.id);
          this.cd.detectChanges();
          console.log(`✅ Permission "${permission.nom}" supprimée avec succès`);
          // Recharger toutes les permissions pour mettre à jour les décomptes dans le tableau
          this.loadAllProfilPermissions();
        },
        error: (error) => {
          console.error(`❌ Erreur lors de la suppression de la permission:`, error);
          // Recharger les permissions en cas d'erreur
          this.reloadProfilData();
        }
      });
    }
  }

  menuExists(menu: string): boolean {
    return this.modules.some(m => m.nom === menu);
  }

  getAssociatedModules(): Module[] {
    if (!this.selectedProfil) return [];
    
    // Utiliser la même logique que isModuleAssociated
    const associatedModuleIds = new Set(
      this.profilPermissions
        .filter(pp => pp.profil && pp.profil.id === this.selectedProfil!.id && pp.module && pp.module.id)
        .map(pp => pp.module!.id!)
    );
    
    return this.modules.filter(m => m.id && associatedModuleIds.has(m.id));
  }

  getAssociatedModulesForProfil(profil: Profil): Module[] {
    // Utiliser la même logique que getAssociatedModules mais pour un profil spécifique
    const associatedModuleIds = new Set(
      this.profilPermissions
        .filter(pp => pp.profil && pp.profil.id === profil.id && pp.module && pp.module.id)
        .map(pp => pp.module!.id!)
    );
    
    return this.modules.filter(m => m.id && associatedModuleIds.has(m.id));
  }

  getProfilPermissionsCount(profil: Profil): number {
    // Compter les permissions pour un profil spécifique
    return this.profilPermissions.filter(pp => pp.profil && pp.profil.id === profil.id).length;
  }

  onModuleChange() {
    // Réinitialiser la sélection de permission
    this.selectedPermissionName = '';
    
    if (this.selectedModuleId) {
      console.log('Chargement des permissions pour le module:', this.selectedModuleId);
      this.loadingModulePermissions = true;
      this.profilService.getPermissionsForModule(+this.selectedModuleId).subscribe({
        next: (perms) => {
          console.log('Permissions chargées:', perms);
          this.availableModulePermissions = perms;
          this.loadingModulePermissions = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des permissions:', error);
          // En cas d'erreur, utiliser toutes les permissions disponibles
          this.availableModulePermissions = this.permissions;
          this.loadingModulePermissions = false;
        }
      });
    } else {
      this.availableModulePermissions = [];
      this.loadingModulePermissions = false;
    }
  }

  // Nouvelles méthodes pour améliorer la vue des droits
  getPermissionUsageCount(permission: Permission): number {
    if (!permission || !permission.id) return 0;
    return this.profilPermissions.filter(pp => pp.permission && pp.permission.id === permission.id).length;
  }

  getModulePermissionsCount(module: Module): number {
    if (!module || !module.id) return 0;
    return this.profilPermissions.filter(pp => pp.module && pp.module.id === module.id).length;
  }

  hasAllPermissions(module: Module): boolean {
    return this.permissions.every(permission => this.hasPermission(module, permission));
  }

  hasAnyPermission(module: Module): boolean {
    return this.permissions.some(permission => this.hasPermission(module, permission));
  }

  selectAllPermissions(module: Module) {
    if (!this.selectedProfil) return;
    
    this.permissions.forEach(permission => {
      if (!this.hasPermission(module, permission)) {
        this.profilService.addPermissionToProfil(this.selectedProfil!.id!, module.id!, permission.id!).subscribe(pp => {
          this.profilPermissions.push(pp);
        });
      }
    });
  }

  deselectAllPermissions(module: Module) {
    if (!module || !module.id) return;
    const modulePermissions = this.profilPermissions.filter(pp => pp.module && pp.module.id === module.id);
    
    modulePermissions.forEach(pp => {
      if (pp.id) {
        this.profilService.removePermissionFromProfil(pp.id).subscribe(() => {
          this.profilPermissions = this.profilPermissions.filter(p => p.id !== pp.id);
        });
      }
    });
  }

  // Nouvelles propriétés pour les dropdowns
  showModuleDropdown = false;
  showMenuDropdown = false;
  selectedPermissions: Permission[] = [];

  // Nouvelles méthodes pour l'interface améliorée
  toggleModuleDropdown() {
    this.showModuleDropdown = !this.showModuleDropdown;
    if (this.showModuleDropdown) {
      this.showMenuDropdown = false;
    }
  }

  toggleMenuDropdown() {
    this.showMenuDropdown = !this.showMenuDropdown;
    if (this.showMenuDropdown) {
      this.showModuleDropdown = false;
    }
  }

  selectModule(module: Module) {
    this.selectedModuleId = module.id!;
    this.showModuleDropdown = false;
    this.onModuleChange();
  }

  selectMenu(menu: string) {
    this.selectedMenuName = menu;
    this.showMenuDropdown = false;
  }

  getSelectedModuleName(): string {
    const module = this.modules.find(m => m.id === this.selectedModuleId);
    return module ? module.nom : '';
  }

  getSelectedModule(): Module | undefined {
    return this.modules.find(m => m.id === this.selectedModuleId);
  }

  isModuleAssociated(module: Module | undefined): boolean {
    if (!module || !this.selectedProfil || !module.id) return false;
    
    // Vérifier si le module a des permissions associées dans ce profil
    const hasPermissions = this.profilPermissions.some(pp => 
      pp.module && pp.module.id && pp.profil && pp.profil.id &&
      pp.module.id === module.id && pp.profil.id === this.selectedProfil!.id
    );
    
    return hasPermissions;
  }

  associateModule() {
    if (!this.selectedProfil || !this.selectedModuleId) return;
    
    const module = this.getSelectedModule();
    if (module && !this.isModuleAssociated(module)) {
      // Associer toutes les permissions existantes à ce module pour ce profil
      this.permissions.forEach(permission => {
        this.profilService.addPermissionToProfil(this.selectedProfil!.id!, module.id!, permission.id!).subscribe(pp => {
          this.profilPermissions.push(pp);
        });
      });
      
      // Recharger les données
      this.loadProfils();
      this.loadModules();
    }
  }

  togglePermissionSelection(permission: Permission) {
    const index = this.selectedPermissions.findIndex(p => p.id === permission.id);
    if (index > -1) {
      this.selectedPermissions.splice(index, 1);
    } else {
      this.selectedPermissions.push(permission);
    }
  }

  hasSelectedPermissions(): boolean {
    return this.selectedPermissions.length > 0;
  }

  addSelectedPermissions() {
    if (!this.selectedProfil || !this.selectedModuleId || this.selectedPermissions.length === 0) return;
    
    const module = this.getSelectedModule();
    if (module) {
      this.selectedPermissions.forEach(permission => {
        if (!this.permissionExistsForModule(permission.nom)) {
          this.profilService.addPermissionToProfil(this.selectedProfil!.id!, module.id!, permission.id!).subscribe(pp => {
            this.profilPermissions.push(pp);
          });
        }
      });
      
      // Vider la sélection
      this.selectedPermissions = [];
      
      // Recharger les données
      this.loadProfils();
      this.loadModules();
    }
  }

  getDeletableModulesCount(): number {
    return this.modules.filter(module => !this.isModuleAssociated(module)).length;
  }

  // Nouvelles méthodes pour l'interface améliorée
  associateModuleDirectly(module: Module) {
    if (!this.selectedProfil) return;
    
    // Associer toutes les permissions existantes à ce module pour ce profil
    this.permissions.forEach(permission => {
      this.profilService.addPermissionToProfil(this.selectedProfil!.id!, module.id!, permission.id!).subscribe(pp => {
        this.profilPermissions.push(pp);
      });
    });
    
    // Recharger les données
    this.loadProfils();
    this.loadModules();
  }

  viewModulePermissions(module: Module) {
    // Sélectionner le module pour afficher ses permissions
    this.selectedModuleId = module.id!;
    this.onModuleChange();
  }

  getModulePermissions(module: Module): Permission[] {
    if (!module || !module.id) return [];
    const modulePermissions = this.profilPermissions.filter(pp => pp.module && pp.module.id === module.id && pp.permission);
    return modulePermissions.map(pp => pp.permission).filter(p => p !== undefined) as Permission[];
  }

  /**
   * Retourne les permissions à afficher pour un module
   * Retourne uniquement les permissions disponibles pour ce module spécifique depuis le backend
   */
  getDisplayedPermissions(module: Module): Permission[] {
    if (!module || !module.id) return [];
    
    // Si on a déjà les permissions en cache pour ce module, les retourner
    if (this.modulePermissionsCache[module.id]) {
      return this.modulePermissionsCache[module.id];
    }
    
    // Sinon, charger les permissions depuis le backend et les mettre en cache
    this.loadModulePermissionsForDisplay(module);
    
    // Retourner un tableau vide temporairement pendant le chargement
    return [];
  }

  /**
   * Charge les permissions disponibles pour un module depuis le backend
   */
  loadModulePermissionsForDisplay(module: Module): void {
    if (!module || !module.id) return;
    
    // Si déjà en cache, ne pas recharger
    if (this.modulePermissionsCache[module.id]) return;
    
    this.profilService.getPermissionsForModule(module.id).subscribe({
      next: (perms) => {
        // Mettre en cache les permissions pour ce module
        this.modulePermissionsCache[module.id] = perms;
        // Forcer la détection des changements pour mettre à jour l'affichage
        this.cd.detectChanges();
      },
      error: (error) => {
        console.error(`Erreur lors du chargement des permissions pour le module ${module.nom}:`, error);
        // En cas d'erreur, utiliser un tableau vide pour éviter d'afficher toutes les permissions
        this.modulePermissionsCache[module.id] = [];
      }
    });
  }

  manageModulePermissions(module: Module) {
    // Sélectionner le module pour permettre la gestion des permissions
    this.selectedModuleId = module.id!;
    this.onModuleChange();
  }

  toggleModuleAssociation(module: Module, event: Event) {
    if (!this.selectedProfil) return;
    
    const checked = (event.target as HTMLInputElement).checked;
    console.log(`🔄 Toggle module association: ${module.nom} - ${checked ? 'activé' : 'désactivé'}`);
    
    if (checked) {
      // Associer le module avec toutes les permissions existantes
      console.log(`➕ Association du module ${module.nom} au profil ${this.selectedProfil.nom}`);
      
      // Vérifier si le module n'est pas déjà associé
      if (this.isModuleAssociated(module)) {
        console.log(`⚠️ Module ${module.nom} déjà associé`);
        return;
      }
      
      // Ajouter toutes les permissions existantes
      let addedCount = 0;
      const totalPermissions = this.permissions.length;
      
      if (totalPermissions === 0) {
        console.log(`⚠️ Aucune permission disponible pour ajouter au module ${module.nom}`);
        console.log(`ℹ️ Le module ${module.nom} sera associé sans permissions actives`);
        
        // Créer une permission spéciale "aucune" pour marquer l'association du module
        // Cela permet au module d'apparaître comme associé même sans permissions actives
        const aucunePermission = this.permissions.find(p => p.nom === 'aucune' || p.nom === 'module_associé');
        
        if (aucunePermission && aucunePermission.id) {
          // Utiliser la permission "aucune" existante
          this.profilService.addPermissionToProfil(this.selectedProfil!.id!, module.id!, aucunePermission.id).subscribe({
            next: (pp) => {
              if (!this.profilPermissions.some(existing => 
                existing.id === pp.id || 
                (existing.module && existing.module.id === pp.module?.id && 
                 existing.permission && existing.permission.id === pp.permission?.id &&
                 existing.profil && existing.profil.id === pp.profil?.id)
              )) {
                this.profilPermissions.push(pp);
              }
              console.log(`✅ Module ${module.nom} associé sans permissions actives`);
              this.cd.detectChanges();
            },
            error: (error) => {
              console.error(`❌ Erreur lors de l'association du module sans permissions:`, error);
              this.cd.detectChanges();
            }
          });
        } else {
          // Créer une permission "aucune" si elle n'existe pas
          this.profilService.createPermission({ nom: 'module_associé' }).subscribe({
            next: (newPermission) => {
              console.log(`✅ Permission spéciale créée: ${newPermission.nom}`);
              // Ajouter cette permission au profil pour ce module
              if (newPermission.id) {
                this.profilService.addPermissionToProfil(this.selectedProfil!.id!, module.id!, newPermission.id).subscribe({
                  next: (pp) => {
                    if (!this.profilPermissions.some(existing => 
                      existing.id === pp.id || 
                      (existing.module && existing.module.id === pp.module?.id && 
                       existing.permission && existing.permission.id === pp.permission?.id &&
                       existing.profil && existing.profil.id === pp.profil?.id)
                    )) {
                      this.profilPermissions.push(pp);
                    }
                    // Recharger les permissions pour inclure la nouvelle
                    this.loadPermissions();
                    console.log(`✅ Module ${module.nom} associé sans permissions actives`);
                    this.cd.detectChanges();
                  },
                  error: (error) => {
                    console.error(`❌ Erreur lors de l'association du module:`, error);
                    this.cd.detectChanges();
                  }
                });
              }
            },
            error: (error) => {
              console.error(`❌ Erreur lors de la création de la permission spéciale:`, error);
              // En cas d'erreur, recharger quand même pour mettre à jour l'UI
              this.reloadProfilData();
              this.cd.detectChanges();
            }
          });
        }
        return;
      }
      
      this.permissions.forEach(permission => {
        if (permission.id) {
          this.profilService.addPermissionToProfil(this.selectedProfil!.id!, module.id!, permission.id).subscribe({
            next: (pp) => {
              // Ajouter immédiatement à la liste pour mise à jour instantanée de la vue
              if (!this.profilPermissions.some(existing => 
                existing.id === pp.id || 
                (existing.module && existing.module.id === pp.module?.id && 
                 existing.permission && existing.permission.id === pp.permission?.id &&
                 existing.profil && existing.profil.id === pp.profil?.id)
              )) {
                this.profilPermissions.push(pp);
              }
              addedCount++;
              console.log(`✅ Permission ${permission.nom} ajoutée au module ${module.nom} (${addedCount}/${totalPermissions})`);
              
              // Forcer la détection des changements après chaque ajout
              this.cd.detectChanges();
              
              // Si c'est la dernière permission, recharger les données pour synchronisation complète
              if (addedCount === totalPermissions) {
                console.log(`✅ Toutes les permissions ajoutées pour le module ${module.nom}`);
                // Attendre un peu pour s'assurer que la base de données est à jour
                setTimeout(() => {
                  // Recharger toutes les permissions pour mettre à jour les décomptes dans le tableau
                  this.loadAllProfilPermissions();
                  if (this.selectedProfil && this.selectedProfil.id) {
                    this.profilService.getProfilPermissions(this.selectedProfil.id).subscribe({
                      next: (allPermissions) => {
                        console.log(`🔄 Rechargement: ${allPermissions.length} permissions trouvées`);
                        this.profilPermissions = allPermissions;
                        // Vérifier que le module est bien associé
                        const moduleAssociated = allPermissions.some(pp => 
                          pp.module && pp.module.id === module.id && 
                          pp.profil && pp.profil.id === this.selectedProfil!.id
                        );
                        console.log(`🔍 Module ${module.nom} associé après rechargement: ${moduleAssociated}`);
                        // Sélectionner automatiquement le module qui vient d'être associé
                        if (module.id) {
                          this.selectedModuleId = module.id;
                          this.onModuleChange();
                        }
                        // Forcer la détection des changements
                        this.cd.detectChanges();
                      },
                      error: (error) => {
                        console.error('❌ Erreur lors du rechargement:', error);
                        this.cd.detectChanges();
                      }
                    });
                  }
                }, 300); // Attendre 300ms pour laisser le temps à la base de données
              }
            },
            error: (error) => {
              console.error(`❌ Erreur lors de l'ajout de la permission ${permission.nom}:`, error);
              addedCount++;
              // Continuer même en cas d'erreur pour une permission
              if (addedCount === totalPermissions) {
                // Recharger les données même en cas d'erreur partielle
                if (this.selectedProfil && this.selectedProfil.id) {
                  this.profilService.getProfilPermissions(this.selectedProfil.id).subscribe({
                    next: (allPermissions) => {
                      this.profilPermissions = allPermissions;
                      this.cd.detectChanges();
                    },
                    error: (err) => {
                      console.error('❌ Erreur lors du rechargement:', err);
                    }
                  });
                }
              }
            }
          });
        }
      });
    } else {
      // Désassocier le module en supprimant toutes ses permissions
      console.log(`➖ Désassociation du module ${module.nom} du profil ${this.selectedProfil.nom}`);
      
      if (!module.id) return;
      const modulePermissions = this.profilPermissions.filter(pp => pp.module && pp.module.id === module.id);
      console.log(`🗑️ Suppression de ${modulePermissions.length} permissions pour le module ${module.nom}`);
      
      if (modulePermissions.length === 0) {
        console.log(`⚠️ Aucune permission à supprimer pour le module ${module.nom}`);
        // Même sans permissions à supprimer, recharger pour s'assurer de la cohérence
        this.reloadProfilData();
        return;
      }
      
      let removedCount = 0;
      const totalToRemove = modulePermissions.length;
      
      modulePermissions.forEach(pp => {
        if (pp.id) {
          this.profilService.removePermissionFromProfil(pp.id).subscribe({
            next: () => {
              this.profilPermissions = this.profilPermissions.filter(p => p.id !== pp.id);
              removedCount++;
              console.log(`✅ Permission supprimée (${removedCount}/${totalToRemove})`);
              
              // Si c'est la dernière permission supprimée, recharger les données
              if (removedCount === totalToRemove) {
                console.log(`✅ Toutes les permissions supprimées pour le module ${module.nom}`);
                // Recharger toutes les permissions pour mettre à jour les décomptes dans le tableau
                this.loadAllProfilPermissions();
                this.reloadProfilData();
              }
            },
            error: (error) => {
              console.error(`❌ Erreur lors de la suppression de la permission:`, error);
              removedCount++;
              // Continuer même en cas d'erreur
              if (removedCount === totalToRemove) {
                this.reloadProfilData();
              }
            }
          });
        } else {
          // Si pas d'ID, supprimer directement de la liste locale
          this.profilPermissions = this.profilPermissions.filter(p => p.id !== pp.id);
          removedCount++;
          if (removedCount === totalToRemove) {
            this.reloadProfilData();
          }
        }
      });
    }
  }

  // Méthode pour recharger les données du profil
  private reloadProfilData() {
    console.log('🔄 Rechargement des données du profil...');
    
    // Recharger les permissions du profil
    if (this.selectedProfil) {
      this.profilService.getProfilPermissions(this.selectedProfil.id!).subscribe({
        next: (pp) => {
          this.profilPermissions = pp;
          console.log(`✅ ${pp.length} permissions rechargées pour le profil ${this.selectedProfil!.nom}`);
          
          // Forcer la détection des changements
          this.cd.detectChanges();
        },
        error: (error) => {
          console.error('❌ Erreur lors du rechargement des permissions:', error);
        }
      });
    }
    
    // Recharger les profils et modules
    this.loadProfils();
    this.loadModules();
  }

  // Méthodes pour la gestion des pays
  loadPays() {
    this.paysService.getPays().subscribe({
      next: (pays) => {
        this.pays = pays;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des pays:', error);
      }
    });
  }

  loadAllProfilPays() {
    // Charger les associations pays pour tous les profils
    if (this.profils.length === 0) return;
    
    this.profils.forEach(profil => {
      if (profil.id) {
        this.paysService.getPaysForProfil(profil.id).subscribe({
          next: (pp) => {
            // Supprimer les anciennes associations pour ce profil
            this.profilPays = this.profilPays.filter(existing => 
              !existing.profil || existing.profil.id !== profil.id
            );
            // Ajouter les nouvelles associations
            this.profilPays.push(...pp);
            this.cd.detectChanges();
          },
          error: (error) => {
            console.error(`Erreur lors du chargement des pays pour le profil ${profil.id}:`, error);
          }
        });
      }
    });
  }

  getPaysForProfil(profil: Profil): Pays[] {
    if (!profil.id) return [];
    return this.profilPays
      .filter(pp => pp.profil && pp.profil.id === profil.id && pp.pays)
      .map(pp => pp.pays!)
      .filter(p => p !== undefined);
  }

  getPaysDisplayForProfil(profil: Profil): string {
    const paysList = this.getPaysForProfil(profil);
    if (paysList.length === 0) {
      return 'Aucun pays';
    }
    // Vérifier si GNL est présent
    const hasGNL = paysList.some(p => p.code === 'GNL');
    if (hasGNL) {
      return 'GNL (Tous les pays)';
    }
    if (paysList.length === 1) {
      return paysList[0].nom;
    }
    return `${paysList.length} pays`;
  }

  /**
   * Retourne l'URL du drapeau SVG pour un code pays
   */
  getCountryFlagUrl(countryCode: string): string | null {
    const code = (countryCode || '').toLowerCase();
    if (!code) return null;
    // Si le pays est GNL (tous les pays), ne pas afficher de drapeau
    if (code === 'gnl') return null;
    if (this.flagLoadError[code]) return null;
    return `assets/flags/${code}.svg`;
  }

  /**
   * Gère l'erreur de chargement d'un drapeau
   */
  onFlagError(event: Event, countryCode: string): void {
    const code = (countryCode || '').toLowerCase();
    if (code) {
      this.flagLoadError[code] = true;
    }
  }

  /**
   * Retourne les pays associés à un profil (limités pour l'affichage)
   */
  getPaysForProfilDisplay(profil: Profil): Pays[] {
    const paysList = this.getPaysForProfil(profil);
    // Exclure GNL de la liste des drapeaux (il sera affiché avec une icône globe)
    const paysWithoutGNL = paysList.filter(p => p.code !== 'GNL');
    // Limiter à 5 pays pour l'affichage dans le tableau
    return paysWithoutGNL.slice(0, 5);
  }

  /**
   * Retourne le nombre de pays supplémentaires (au-delà des 5 premiers)
   */
  getAdditionalPaysCount(profil: Profil): number {
    const paysList = this.getPaysForProfil(profil);
    // Exclure GNL du comptage
    const paysWithoutGNL = paysList.filter(p => p.code !== 'GNL');
    return Math.max(0, paysWithoutGNL.length - 5);
  }

  /**
   * Vérifie si un profil a GNL (tous les pays)
   */
  hasGNL(profil: Profil): boolean {
    const paysList = this.getPaysForProfil(profil);
    return paysList.some(p => p.code === 'GNL');
  }

  openPaysModal(profil: Profil) {
    this.selectedProfilForPays = profil;
    this.showPaysModal = true;
    // Charger les pays associés à ce profil
    if (profil.id) {
      this.paysService.getPaysForProfil(profil.id).subscribe({
        next: (pp) => {
          this.profilPays = this.profilPays.filter(p => !p.profil || p.profil.id !== profil.id);
          this.profilPays.push(...pp);
          this.cd.detectChanges();
        }
      });
    }
  }

  closePaysModal() {
    this.showPaysModal = false;
    this.selectedProfilForPays = null;
  }

  isPaysSelectedForProfil(pays: Pays, profil: Profil): boolean {
    if (!profil.id) return false;
    return this.profilPays.some(pp => 
      pp.profil && pp.profil.id === profil.id && 
      pp.pays && pp.pays.id === pays.id
    );
  }

  togglePaysAssociation(pays: Pays, event: Event) {
    if (!this.selectedProfilForPays || !this.selectedProfilForPays.id) return;
    
    const checked = (event.target as HTMLInputElement).checked;
    const profilId = this.selectedProfilForPays.id;
    
    if (checked) {
      // Si on sélectionne GNL, désélectionner tous les autres pays
      if (pays.code === 'GNL') {
        const otherPays = this.pays.filter(p => p.code !== 'GNL' && p.id);
        otherPays.forEach(p => {
          if (p.id && this.isPaysSelectedForProfil(p, this.selectedProfilForPays!)) {
            this.paysService.disassociatePaysFromProfil(profilId, p.id).subscribe({
              next: () => {
                this.profilPays = this.profilPays.filter(pp => 
                  !(pp.profil && pp.profil.id === profilId && pp.pays && pp.pays.id === p.id)
                );
                this.cd.detectChanges();
              }
            });
          }
        });
      } else {
        // Si on sélectionne un pays autre que GNL, désélectionner GNL
        const gnlPays = this.pays.find(p => p.code === 'GNL');
        if (gnlPays && gnlPays.id && this.isPaysSelectedForProfil(gnlPays, this.selectedProfilForPays)) {
          this.paysService.disassociatePaysFromProfil(profilId, gnlPays.id).subscribe({
            next: () => {
              this.profilPays = this.profilPays.filter(pp => 
                !(pp.profil && pp.profil.id === profilId && pp.pays && pp.pays.id === gnlPays.id)
              );
              this.cd.detectChanges();
            }
          });
        }
      }
      
      // Associer le pays sélectionné
      if (pays.id) {
        this.paysService.associatePaysToProfil(profilId, pays.id).subscribe({
          next: (pp) => {
            if (!this.profilPays.some(existing => existing.id === pp.id)) {
              this.profilPays.push(pp);
            }
            this.cd.detectChanges();
          },
          error: (error) => {
            console.error('Erreur lors de l\'association du pays:', error);
          }
        });
      }
    } else {
      // Désassocier le pays
      if (pays.id) {
        this.paysService.disassociatePaysFromProfil(profilId, pays.id).subscribe({
          next: () => {
            this.profilPays = this.profilPays.filter(pp => 
              !(pp.profil && pp.profil.id === profilId && pp.pays && pp.pays.id === pays.id)
            );
            this.cd.detectChanges();
          },
          error: (error) => {
            console.error('Erreur lors de la désassociation du pays:', error);
          }
        });
      }
    }
  }

  savePaysForProfil() {
    if (!this.selectedProfilForPays || !this.selectedProfilForPays.id) return;
    
    this.isSavingPays = true;
    const selectedPaysIds = this.pays
      .filter(p => this.isPaysSelectedForProfil(p, this.selectedProfilForPays!))
      .map(p => p.id!)
      .filter(id => id !== undefined && id !== null);
    
    console.log('💾 Sauvegarde des pays pour le profil:', this.selectedProfilForPays.id);
    console.log('📋 Pays sélectionnés (IDs):', selectedPaysIds);
    
    this.paysService.setPaysForProfil(this.selectedProfilForPays.id, selectedPaysIds).subscribe({
      next: () => {
        console.log('✅ Pays sauvegardés avec succès');
        // Recharger les associations
        this.loadAllProfilPays();
        this.closePaysModal();
        this.isSavingPays = false;
      },
      error: (error) => {
        console.error('❌ Erreur lors de la sauvegarde des pays:', error);
        console.error('❌ Détails de l\'erreur:', JSON.stringify(error, null, 2));
        let errorMessage = 'Erreur lors de la sauvegarde des pays.';
        if (error.error) {
          if (error.error.error) {
            errorMessage = error.error.error;
          } else if (error.error.message) {
            errorMessage = error.error.message;
          } else if (typeof error.error === 'string') {
            errorMessage = error.error;
          }
        } else if (error.message) {
          errorMessage = error.message;
        }
        alert('Erreur: ' + errorMessage);
        this.isSavingPays = false;
      }
    });
  }
} 