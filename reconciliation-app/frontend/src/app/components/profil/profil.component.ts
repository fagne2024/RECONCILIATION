import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProfilService } from '../../services/profil.service';
import { Profil } from '../../models/profil.model';
import { Module } from '../../models/module.model';
import { Permission } from '../../models/permission.model';
import { ProfilPermission } from '../../models/profil-permission.model';

@Component({
  selector: 'app-profil',
  templateUrl: './profil.component.html',
  styleUrls: ['./profil.component.scss']
})
export class ProfilComponent implements OnInit {
  profils: Profil[] = [];
  modules: Module[] = [];
  permissions: Permission[] = [];
  profilPermissions: ProfilPermission[] = [];
  selectedProfil: Profil | null = null;
  newProfilName = '';
  newModuleName = '';
  newPermissionName = '';
  selectedPermissionName = '';
  selectedModuleId: number | '' = '';
  availableModulePermissions: Permission[] = [];
  loadingModulePermissions = false;

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
    private fb: FormBuilder
  ) {
    this.addForm = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2)]],
      description: ['']
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
  }

  loadProfils() {
    this.isLoading = true;
    this.profilService.getProfils().subscribe({
      next: (p) => {
        this.profils = p;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des profils:', error);
        this.isLoading = false;
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
    this.selectedProfil = profil;
    this.profilService.getProfilPermissions(profil.id!).subscribe(pp => this.profilPermissions = pp);
  }

  createProfil() {
    if (this.addForm.valid) {
      this.isAdding = true;
      const newProfil = {
        nom: this.addForm.get('nom')?.value,
        description: this.addForm.get('description')?.value || ''
      };
      
      this.profilService.createProfil(newProfil).subscribe({
        next: (response) => {
          this.addForm.reset();
          this.showAddForm = false;
          this.loadProfils();
          this.isAdding = false;
        },
        error: (error) => {
          console.error('Erreur lors de la création du profil:', error);
          this.isAdding = false;
        }
      });
    }
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
            this.isDeleting = false;
          },
          error: (error) => {
            console.error('❌ Erreur lors de la suppression du profil:', error);
            console.error('Détails de l\'erreur:', error.status, error.message);
            this.isDeleting = false;
            alert('Erreur lors de la suppression du profil. Veuillez réessayer.');
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
    if (!module || !permission) return false;
    return this.profilPermissions.some(pp => pp.module.id === module.id && pp.permission.id === permission.id);
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
      pp.module.id === module.id && pp.permission.id === permission.id
    );
  }

  togglePermission(module: Module, permission: Permission, event: Event) {
    if (!this.selectedProfil) return;
    const checked = (event.target as HTMLInputElement).checked;
    const existing = this.profilPermissions.find(pp =>
      pp.module.id === module.id && pp.permission.id === permission.id
    );
    if (checked && !existing) {
      this.profilService.addPermissionToProfil(this.selectedProfil.id!, module.id!, permission.id!).subscribe(pp => {
        this.profilPermissions.push(pp);
      });
    } else if (!checked && existing && existing.id) {
      this.profilService.removePermissionFromProfil(existing.id).subscribe(() => {
        this.profilPermissions = this.profilPermissions.filter(pp => pp.id !== existing.id);
      });
    }
  }

  menuExists(menu: string): boolean {
    return this.modules.some(m => m.nom === menu);
  }

  getAssociatedModules(): Module[] {
    const moduleIds = new Set(this.profilPermissions.map(pp => pp.module.id));
    return this.modules.filter(m => moduleIds.has(m.id));
  }

  getAssociatedModulesForProfil(profil: Profil): Module[] {
    // Pour l'instant, retourner les modules associés au profil sélectionné
    // TODO: Implémenter une méthode pour récupérer les modules d'un profil spécifique
    if (this.selectedProfil && this.selectedProfil.id === profil.id) {
      return this.getAssociatedModules();
    }
    return [];
  }

  getProfilPermissionsCount(profil: Profil): number {
    // Pour l'instant, retourner le nombre de permissions du profil sélectionné
    // TODO: Implémenter une méthode pour récupérer les permissions d'un profil spécifique
    if (this.selectedProfil && this.selectedProfil.id === profil.id) {
      return this.profilPermissions.length;
    }
    return 0;
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
    return this.profilPermissions.filter(pp => pp.permission.id === permission.id).length;
  }

  getModulePermissionsCount(module: Module): number {
    return this.profilPermissions.filter(pp => pp.module.id === module.id).length;
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
    const modulePermissions = this.profilPermissions.filter(pp => pp.module.id === module.id);
    
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
    if (!module) return false;
    return this.getAssociatedModules().some(m => m.id === module.id);
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
    const modulePermissions = this.profilPermissions.filter(pp => pp.module.id === module.id);
    return modulePermissions.map(pp => pp.permission);
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
      this.permissions.forEach(permission => {
        this.profilService.addPermissionToProfil(this.selectedProfil!.id!, module.id!, permission.id!).subscribe({
          next: (pp) => {
            this.profilPermissions.push(pp);
            addedCount++;
            console.log(`✅ Permission ${permission.nom} ajoutée au module ${module.nom}`);
            
            // Si c'est la dernière permission, recharger les données
            if (addedCount === this.permissions.length) {
              this.reloadProfilData();
            }
          },
          error: (error) => {
            console.error(`❌ Erreur lors de l'ajout de la permission ${permission.nom}:`, error);
          }
        });
      });
    } else {
      // Désassocier le module en supprimant toutes ses permissions
      console.log(`➖ Désassociation du module ${module.nom} du profil ${this.selectedProfil.nom}`);
      
      const modulePermissions = this.profilPermissions.filter(pp => pp.module.id === module.id);
      console.log(`🗑️ Suppression de ${modulePermissions.length} permissions pour le module ${module.nom}`);
      
      if (modulePermissions.length === 0) {
        console.log(`⚠️ Aucune permission à supprimer pour le module ${module.nom}`);
        return;
      }
      
      let removedCount = 0;
      modulePermissions.forEach(pp => {
        if (pp.id) {
          this.profilService.removePermissionFromProfil(pp.id).subscribe({
            next: () => {
              this.profilPermissions = this.profilPermissions.filter(p => p.id !== pp.id);
              removedCount++;
              console.log(`✅ Permission supprimée (${removedCount}/${modulePermissions.length})`);
              
              // Si c'est la dernière permission supprimée, recharger les données
              if (removedCount === modulePermissions.length) {
                this.reloadProfilData();
              }
            },
            error: (error) => {
              console.error(`❌ Erreur lors de la suppression de la permission:`, error);
            }
          });
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
} 