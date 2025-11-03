import { Component, OnInit } from '@angular/core';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user.model';
import { Profil } from '../../models/profil.model';
import { ProfilService } from '../../services/profil.service';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  profils: Profil[] = [];
  newUser: User = { username: '', password: '' };
  editingUser: User | null = null;
  showCreateForm = false; // Ajouté pour afficher/masquer le formulaire
  isCreating = false; // Sert uniquement à désactiver le bouton pendant la création
  isEditing = false;
  errorMessage = '';
  successMessage = '';
  searchTerm = '';
  selectedProfilFilter: number | '' = '';
  isLoading = false;

  constructor(private userService: UserService, private profilService: ProfilService) { }

  ngOnInit(): void {
    this.loadUsers();
    this.loadProfils();
  }

  loadUsers(): void {
    this.isLoading = true;
    console.log('Chargement des utilisateurs...');
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        console.log('Utilisateurs chargés:', users);
        this.users = users;
        this.applyFilters();
        this.isLoading = false;
        if (users.length === 0) {
          this.errorMessage = 'Aucun utilisateur trouvé dans la base de données. Vérifiez que les migrations ont été exécutées.';
        }
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.errorMessage = `Erreur lors du chargement des utilisateurs: ${error.message || 'Erreur de connexion au serveur'}`;
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    this.filteredUsers = this.users.filter(user => {
      const matchesSearch = !this.searchTerm || 
        user.username.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesProfil = !this.selectedProfilFilter || 
        (user.profil && user.profil.id === Number(this.selectedProfilFilter));
      return matchesSearch && matchesProfil;
    });
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedProfilFilter = '';
    this.applyFilters();
  }

  loadProfils(): void {
    this.profilService.getProfils().subscribe(profils => this.profils = profils);
  }

  createUser(): void {
    if (!this.newUser.username || !this.newUser.password) {
      this.errorMessage = 'Veuillez remplir tous les champs';
      return;
    }

    this.isCreating = true;
    this.userService.createUser(this.newUser).subscribe({
      next: (user) => {
        this.users.push(user);
        this.newUser = { username: '', password: '' };
        this.isCreating = false;
        this.showCreateForm = false; // Masquer le formulaire après création
        this.successMessage = 'Utilisateur créé avec succès';
        this.applyFilters();
        this.clearMessages();
      },
      error: (error) => {
        this.isCreating = false;
        this.errorMessage = 'Erreur lors de la création de l\'utilisateur';
        console.error('Error creating user:', error);
        this.clearMessages();
      }
    });
  }

  editUser(user: User): void {
    this.editingUser = { ...user };
    this.isEditing = true;
  }

  updateUser(): void {
    if (!this.editingUser || !this.editingUser.username) {
      this.errorMessage = 'Veuillez remplir tous les champs';
      return;
    }

    this.userService.updateUser(this.editingUser.id!, this.editingUser).subscribe({
      next: (updatedUser) => {
        const index = this.users.findIndex(u => u.id === updatedUser.id);
        if (index !== -1) {
          this.users[index] = updatedUser;
        }
        this.applyFilters();
        this.cancelEdit();
        this.successMessage = 'Utilisateur mis à jour avec succès';
        this.clearMessages();
      },
      error: (error) => {
        this.errorMessage = 'Erreur lors de la mise à jour de l\'utilisateur';
        console.error('Error updating user:', error);
        this.clearMessages();
      }
    });
  }

  deleteUser(user: User): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur "${user.username}" ?`)) {
      this.userService.deleteUser(user.id!).subscribe({
        next: (success) => {
          if (success) {
            this.users = this.users.filter(u => u.id !== user.id);
            this.applyFilters();
            this.successMessage = 'Utilisateur supprimé avec succès';
            this.clearMessages();
          } else {
            this.errorMessage = 'Impossible de supprimer cet utilisateur';
            this.clearMessages();
          }
        },
        error: (error) => {
          this.errorMessage = 'Erreur lors de la suppression de l\'utilisateur';
          console.error('Error deleting user:', error);
          this.clearMessages();
        }
      });
    }
  }

  cancelEdit(): void {
    this.editingUser = null;
    this.isEditing = false;
  }

  private clearMessages(): void {
    setTimeout(() => {
      this.errorMessage = '';
      this.successMessage = '';
    }, 3000);
  }
} 