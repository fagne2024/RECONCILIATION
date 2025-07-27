import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModuleService } from '../../services/module.service';
import { Module } from '../../models/module.model';

@Component({
  selector: 'app-modules',
  templateUrl: './modules.component.html',
  styleUrls: ['./modules.component.scss']
})
export class ModulesComponent implements OnInit {
  modules: Module[] = [];
  showAddForm = false;
  isAdding = false;
  isLoading = false;
  addForm: FormGroup;
  showEditForm = false;
  isEditing = false;
  editingModule: Module | null = null;
  editForm: FormGroup;

  constructor(
    private moduleService: ModuleService,
    private formBuilder: FormBuilder
  ) {
    this.addForm = this.formBuilder.group({
      nom: ['', [Validators.required, Validators.minLength(2)]]
    });

    this.editForm = this.formBuilder.group({
      nom: ['', [Validators.required, Validators.minLength(2)]]
    });
  }

  ngOnInit(): void {
    this.loadModules();
  }

  loadModules(): void {
    this.isLoading = true;
    this.moduleService.getAllModules().subscribe({
      next: (modules) => {
        this.modules = modules;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement des modules:', error);
        this.isLoading = false;
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
          },
          error: (error) => {
            console.error('❌ Erreur lors de la suppression du module:', error);
            alert('Erreur lors de la suppression du module. Veuillez réessayer.');
          }
        });
      }
    }
  }
} 