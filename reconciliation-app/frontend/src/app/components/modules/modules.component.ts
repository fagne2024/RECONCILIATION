import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModuleService } from '../../services/module.service';
import { ProfilService } from '../../services/profil.service';
import { Module } from '../../models/module.model';
import { Profil } from '../../models/profil.model';
import { ProfilPermission } from '../../models/profil-permission.model';
import { Permission } from '../../models/permission.model';

@Component({
  selector: 'app-modules',
  templateUrl: './modules.component.html',
  styleUrls: ['./modules.component.scss']
})
export class ModulesComponent implements OnInit {
  modules: Module[] = [];
  filteredModules: Module[] = [];
  profils: Profil[] = [];
  permissions: Permission[] = [];
  profilPermissions: ProfilPermission[] = [];
  showAddForm = false;
  isAdding = false;
  isLoading = false;
  addForm: FormGroup;
  showEditForm = false;
  isEditing = false;
  editingModule: Module | null = null;
  editForm: FormGroup;
  showProfilsModal = false;
  selectedModule: Module | null = null;
  isSavingProfils = false;
  searchTerm = '';

  // Liste de tous les menus de l'application
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
    'Commission',
    'TSOP',
    'Impact OP',
    'TRX SF',
    'BANQUE',
    'Comptabilité',
    'Modèles',
    'Utilisateur',
    'Profil',
    'Module',
    'Permission',
    'Log utilisateur'
  ];

  constructor(
    private moduleService: ModuleService,
    private profilService: ProfilService,
    private formBuilder: FormBuilder
  ) {
    this.addForm = this.formBuilder.group({
      nom: ['', [Validators.required]]
    });

    this.editForm = this.formBuilder.group({
      nom: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.loadModules();
    this.loadProfils();
    this.loadPermissions();
  }

  loadModules(): void {
    this.isLoading = true;
    this.moduleService.getAllModules().subscribe({
      next: (modules) => {
        this.modules = modules;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement des modules:', error);
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    this.filteredModules = this.modules.filter(module => {
      const matchesSearch = !this.searchTerm || 
        module.nom.toLowerCase().includes(this.searchTerm.toLowerCase());
      return matchesSearch;
    });
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.applyFilters();
  }

  loadProfils(): void {
    this.profilService.getProfils().subscribe({
      next: (profils) => {
        this.profils = profils;
        // Charger les associations après avoir chargé les profils
        this.loadProfilPermissions();
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement des profils:', error);
      }
    });
  }

  loadPermissions(): void {
    this.profilService.getPermissions().subscribe({
      next: (permissions) => {
        this.permissions = permissions;
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement des permissions:', error);
      }
    });
  }

  loadProfilPermissions(): void {
    // Réinitialiser les associations seulement si les profils sont chargés
    if (this.profils.length === 0) {
      return;
    }
    
    // Réinitialiser les associations
    this.profilPermissions = [];
    // Charger toutes les associations profil-permission-module
    this.profils.forEach(profil => {
      if (profil.id) {
        this.profilService.getProfilPermissions(profil.id).subscribe({
          next: (pp) => {
            this.profilPermissions.push(...pp);
          },
          error: (error) => {
            console.error(`❌ Erreur lors du chargement des permissions pour le profil ${profil.id}:`, error);
          }
        });
      }
    });
  }

  createModule(): void {
    if (this.addForm.valid) {
      this.isAdding = true;
      const moduleData = this.addForm.value;
      
      this.moduleService.createModule(moduleData).subscribe({
        next: (module) => {
          console.log('✅ Module créé avec succès:', module);
          this.addForm.reset();
          this.showAddForm = false;
          this.isAdding = false;
          this.loadModules();
          this.loadProfilPermissions();
          this.applyFilters();
        },
        error: (error) => {
          console.error('❌ Erreur lors de la création du module:', error);
          this.isAdding = false;
          alert('Erreur lors de la création du module. Veuillez réessayer.');
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

  editModule(module: Module): void {
    this.editingModule = module;
    this.editForm.patchValue({
      nom: module.nom
    });
    this.showEditForm = true;
  }

  updateModule(): void {
    if (this.editForm.valid && this.editingModule) {
      this.isEditing = true;
      const moduleData = { ...this.editingModule, ...this.editForm.value };
      
      this.moduleService.updateModule(moduleData.id!, moduleData).subscribe({
        next: (module) => {
          console.log('✅ Module mis à jour avec succès:', module);
          this.editForm.reset();
          this.showEditForm = false;
          this.isEditing = false;
          this.editingModule = null;
          this.loadModules();
          this.loadProfilPermissions();
          this.applyFilters();
        },
        error: (error) => {
          console.error('❌ Erreur lors de la mise à jour du module:', error);
          this.isEditing = false;
          alert('Erreur lors de la mise à jour du module. Veuillez réessayer.');
        }
      });
    }
  }

  cancelEdit(): void {
    this.editForm.reset();
    this.showEditForm = false;
    this.editingModule = null;
  }

  deleteModule(module: Module): void {
    if (module.id) {
      const confirmed = confirm(`Êtes-vous sûr de vouloir supprimer le module "${module.nom}" ?\n\nCette action est irréversible.`);
      if (confirmed) {
        this.moduleService.deleteModule(module.id).subscribe({
          next: () => {
            console.log('✅ Module supprimé avec succès');
            this.loadModules();
            this.loadProfilPermissions();
            this.applyFilters();
          },
          error: (error) => {
            console.error('❌ Erreur lors de la suppression du module:', error);
            alert('Erreur lors de la suppression du module. Veuillez réessayer.');
          }
        });
      }
    }
  }

  // Gestion des associations modules-profils
  getProfilsForModule(module: Module): Profil[] {
    if (!module.id) return [];
    const moduleProfils = this.profilPermissions
      .filter(pp => pp.module.id === module.id)
      .map(pp => pp.profil);
    // Retourner les profils uniques
    return Array.from(new Map(moduleProfils.map(p => [p.id, p])).values());
  }

  isModuleAssociatedToProfil(module: Module, profil: Profil): boolean {
    if (!module.id || !profil.id) return false;
    return this.profilPermissions.some(
      pp => pp.module.id === module.id && pp.profil.id === profil.id
    );
  }

  openProfilsModal(module: Module): void {
    this.selectedModule = module;
    this.showProfilsModal = true;
  }

  closeProfilsModal(): void {
    this.showProfilsModal = false;
    this.selectedModule = null;
  }

  toggleProfilAssociation(profil: Profil, event: Event): void {
    if (!this.selectedModule || !this.selectedModule.id || !profil.id) return;
    
    const checked = (event.target as HTMLInputElement).checked;
    
    if (checked) {
      // Associer le module au profil en ajoutant toutes les permissions
      this.associateModuleToProfil(this.selectedModule, profil);
    } else {
      // Désassocier le module du profil en supprimant toutes les permissions
      this.disassociateModuleFromProfil(this.selectedModule, profil);
    }
  }

  associateModuleToProfil(module: Module, profil: Profil): void {
    if (!module.id || !profil.id) return;
    
    this.isSavingProfils = true;
    let addedCount = 0;
    const totalPermissions = this.permissions.length;
    
    if (totalPermissions === 0) {
      console.log(`⚠️ Aucune permission disponible pour le module ${module.nom}`);
      this.isSavingProfils = false;
      return;
    }
    
    this.permissions.forEach(permission => {
      if (permission.id) {
        this.profilService.addPermissionToProfil(profil.id!, module.id!, permission.id).subscribe({
          next: (pp) => {
            this.profilPermissions.push(pp);
            addedCount++;
            if (addedCount === totalPermissions) {
              console.log(`✅ Module ${module.nom} associé au profil ${profil.nom}`);
              this.isSavingProfils = false;
            }
          },
          error: (error) => {
            console.error(`❌ Erreur lors de l'association:`, error);
            addedCount++;
            if (addedCount === totalPermissions) {
              this.isSavingProfils = false;
            }
          }
        });
      }
    });
  }

  disassociateModuleFromProfil(module: Module, profil: Profil): void {
    if (!module.id || !profil.id) return;
    
    this.isSavingProfils = true;
    const modulePermissions = this.profilPermissions.filter(
      pp => pp.module.id === module.id && pp.profil.id === profil.id
    );
    
    if (modulePermissions.length === 0) {
      this.isSavingProfils = false;
      return;
    }
    
    let removedCount = 0;
    const totalToRemove = modulePermissions.length;
    
    modulePermissions.forEach(pp => {
      if (pp.id) {
        this.profilService.removePermissionFromProfil(pp.id).subscribe({
          next: () => {
            const index = this.profilPermissions.findIndex(p => p.id === pp.id);
            if (index > -1) {
              this.profilPermissions.splice(index, 1);
            }
            removedCount++;
            if (removedCount === totalToRemove) {
              console.log(`✅ Module ${module.nom} désassocié du profil ${profil.nom}`);
              this.isSavingProfils = false;
            }
          },
          error: (error) => {
            console.error(`❌ Erreur lors de la désassociation:`, error);
            removedCount++;
            if (removedCount === totalToRemove) {
              this.isSavingProfils = false;
            }
          }
        });
      }
    });
  }
} 