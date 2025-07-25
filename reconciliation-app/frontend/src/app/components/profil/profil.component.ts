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
} 