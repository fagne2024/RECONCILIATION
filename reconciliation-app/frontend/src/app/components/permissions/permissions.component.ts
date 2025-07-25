import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PermissionService } from '../../services/permission.service';
import { Permission } from '../../models/permission.model';

@Component({
  selector: 'app-permissions',
  templateUrl: './permissions.component.html',
  styleUrls: ['./permissions.component.scss']
})
export class PermissionsComponent implements OnInit {
  permissions: Permission[] = [];
  showAddForm = false;
  isAdding = false;
  isLoading = false;
  addForm: FormGroup;
  showEditForm = false;
  isEditing = false;
  editingPermission: Permission | null = null;
  editForm: FormGroup;

  constructor(
    private permissionService: PermissionService,
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
    this.loadPermissions();
  }

  loadPermissions(): void {
    this.isLoading = true;
    this.permissionService.getAllPermissions().subscribe({
      next: (permissions) => {
        this.permissions = permissions;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des permissions:', error);
        this.isLoading = false;
      }
    });
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
          },
          error: (error) => {
            console.error('❌ Erreur lors de la suppression de la permission:', error);
            alert('Erreur lors de la suppression de la permission. Veuillez réessayer.');
          }
        });
      }
    }
  }
} 