import { Component, OnInit } from '@angular/core';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user.model';
import { Profil } from '../../models/profil.model';
import { ProfilService } from '../../services/profil.service';
import { TwoFactorAuthService } from '../../services/two-factor-auth.service';
import { User2FADialogComponent } from './user-2fa-dialog.component';
import { PopupService } from '../../services/popup.service';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  profils: Profil[] = [];
  newUser: User = { username: '', email: '' };
  editingUser: User | null = null;
  showCreateForm = false; // Ajouté pour afficher/masquer le formulaire
  isCreating = false; // Sert uniquement à désactiver le bouton pendant la création
  isEditing = false;
  errorMessage = '';
  successMessage = '';
  searchTerm = '';
  selectedProfilFilter: number | '' = '';
  isLoading = false;
  user2FAStatus: Map<number, { enabled: boolean; hasSecret: boolean }> = new Map();
  loading2FAStatus: Set<number> = new Set();

  constructor(
    private userService: UserService, 
    private profilService: ProfilService,
    private twoFactorService: TwoFactorAuthService,
    private popupService: PopupService
  ) { }

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
        // Charger le statut 2FA pour chaque utilisateur
        this.loadAllUsers2FAStatus();
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

  async createUser(): Promise<void> {
    if (!this.newUser.username || !this.newUser.email) {
      await this.popupService.showError('Veuillez remplir tous les champs requis (nom d\'utilisateur et email)', 'Champs requis');
      return;
    }

    this.isCreating = true;
    // Ne pas envoyer le password car il sera généré automatiquement
    const userToCreate = { ...this.newUser };
    delete userToCreate.password;
    
    this.userService.createUser(userToCreate).subscribe({
      next: async (user) => {
        this.users.push(user);
        this.newUser = { username: '', email: '' };
        this.isCreating = false;
        this.showCreateForm = false; // Masquer le formulaire après création
        await this.popupService.showSuccess('Utilisateur créé avec succès. Le mot de passe a été envoyé par email.', 'Succès');
        this.applyFilters();
      },
      error: async (error) => {
        this.isCreating = false;
        const errorMsg = error.error?.error || error.message || 'Erreur lors de la création de l\'utilisateur';
        await this.popupService.showError(errorMsg, 'Erreur de création');
        console.error('Error creating user:', error);
      }
    });
  }

  editUser(user: User): void {
    this.editingUser = { ...user };
    this.isEditing = true;
  }

  async updateUser(): Promise<void> {
    if (!this.editingUser || !this.editingUser.username) {
      await this.popupService.showError('Veuillez remplir tous les champs', 'Champs requis');
      return;
    }

    this.userService.updateUser(this.editingUser.id!, this.editingUser).subscribe({
      next: async (updatedUser) => {
        const index = this.users.findIndex(u => u.id === updatedUser.id);
        if (index !== -1) {
          this.users[index] = updatedUser;
        }
        this.applyFilters();
        this.cancelEdit();
        await this.popupService.showSuccess('Utilisateur mis à jour avec succès', 'Succès');
        // Recharger le statut 2FA si nécessaire
        this.loadUser2FAStatus(updatedUser.id!, updatedUser.username);
      },
      error: async (error) => {
        const errorMsg = error.error?.error || error.message || 'Erreur lors de la mise à jour de l\'utilisateur';
        await this.popupService.showError(errorMsg, 'Erreur de mise à jour');
        console.error('Error updating user:', error);
      }
    });
  }

  async resetUserPassword(user: User): Promise<void> {
    if (!user.email) {
      await this.popupService.showError('Cet utilisateur n\'a pas d\'adresse email configurée', 'Erreur');
      return;
    }

    const confirmed = await this.popupService.showConfirmDialog(
      `Êtes-vous sûr de vouloir réinitialiser le mot de passe de l'utilisateur "${user.username}" ?\n\nUn nouveau mot de passe sera généré et envoyé à : ${user.email}`,
      'Confirmation de réinitialisation'
    );
    
    if (confirmed) {
      this.userService.resetPassword(user.id!).subscribe({
        next: async () => {
          await this.popupService.showSuccess('Le mot de passe a été réinitialisé et envoyé par email avec succès', 'Succès');
        },
        error: async (error) => {
          const errorMsg = error.error?.error || error.message || 'Erreur lors de la réinitialisation du mot de passe';
          await this.popupService.showError(errorMsg, 'Erreur de réinitialisation');
          console.error('Error resetting password:', error);
        }
      });
    }
  }

  async deleteUser(user: User): Promise<void> {
    const confirmed = await this.popupService.showConfirmDialog(
      `Êtes-vous sûr de vouloir supprimer l'utilisateur "${user.username}" ?`,
      'Confirmation de suppression'
    );
    
    if (confirmed) {
      this.userService.deleteUser(user.id!).subscribe({
        next: async (success) => {
          if (success) {
            this.users = this.users.filter(u => u.id !== user.id);
            this.user2FAStatus.delete(user.id!); // Supprimer aussi le statut 2FA
            this.applyFilters();
            await this.popupService.showSuccess('Utilisateur supprimé avec succès', 'Succès');
          } else {
            await this.popupService.showError('Impossible de supprimer cet utilisateur', 'Erreur');
          }
        },
        error: async (error) => {
          const errorMsg = error.error?.error || error.message || 'Erreur lors de la suppression de l\'utilisateur';
          await this.popupService.showError(errorMsg, 'Erreur de suppression');
          console.error('Error deleting user:', error);
        }
      });
    }
  }

  cancelEdit(): void {
    this.editingUser = null;
    this.isEditing = false;
  }

  private clearMessages(): void {
    // Les messages sont maintenant gérés par les popups modernes
    // Cette méthode est conservée pour la compatibilité mais peut être supprimée
    setTimeout(() => {
      this.errorMessage = '';
      this.successMessage = '';
    }, 3000);
  }

  /**
   * Charge le statut 2FA pour tous les utilisateurs
   */
  loadAllUsers2FAStatus(): void {
    this.users.forEach(user => {
      if (user.id && user.username) {
        this.loadUser2FAStatus(user.id, user.username);
      }
    });
  }

  /**
   * Charge le statut 2FA pour un utilisateur spécifique
   */
  loadUser2FAStatus(userId: number, username: string): void {
    this.loading2FAStatus.add(userId);
    this.twoFactorService.get2FAStatus(username).subscribe({
      next: (status) => {
        this.user2FAStatus.set(userId, status);
        this.loading2FAStatus.delete(userId);
      },
      error: (err) => {
        console.error('Error loading 2FA status for user:', username, err);
        this.loading2FAStatus.delete(userId);
      }
    });
  }

  /**
   * Obtient le statut 2FA d'un utilisateur
   */
  getUser2FAStatus(userId: number | undefined): { enabled: boolean; hasSecret: boolean } | null {
    if (!userId) return null;
    return this.user2FAStatus.get(userId) || null;
  }

  /**
   * Active ou désactive le 2FA pour un utilisateur
   */
  async toggle2FA(user: User): Promise<void> {
    if (!user.username || !user.id) return;

    const currentStatus = this.getUser2FAStatus(user.id);
    const isEnabled = currentStatus?.enabled || false;

    if (isEnabled) {
      // Désactiver le 2FA
      const confirmed = await this.popupService.showConfirmDialog(
        `Êtes-vous sûr de vouloir désactiver l'authentification à deux facteurs pour "${user.username}" ?`,
        'Désactivation du 2FA'
      );
      
      if (!confirmed) {
        return;
      }

      this.loading2FAStatus.add(user.id);
      this.twoFactorService.disable2FA(user.username).subscribe({
        next: async () => {
          this.loadUser2FAStatus(user.id!, user.username);
          await this.popupService.showSuccess(
            `2FA désactivé pour ${user.username}. La clé secrète est conservée pour permettre une réactivation avec le même compte Google Authenticator.`,
            '2FA désactivé'
          );
        },
        error: async (err) => {
          this.loading2FAStatus.delete(user.id!);
          const errorMsg = err.error?.error || 'Erreur inconnue';
          await this.popupService.showError(`Erreur lors de la désactivation du 2FA: ${errorMsg}`, 'Erreur');
        }
      });
    } else {
      // Activer le 2FA
      const confirmed = await this.popupService.showConfirmDialog(
        `Activer l'authentification à deux facteurs pour "${user.username}" ?\n\nL'utilisateur devra scanner un QR code lors de sa prochaine connexion.`,
        'Activation du 2FA'
      );
      
      if (!confirmed) {
        return;
      }

      this.loading2FAStatus.add(user.id);
      // Activer le 2FA directement (sans validation de code)
      this.twoFactorService.activate2FA(user.username).subscribe({
        next: async (response) => {
          this.loadUser2FAStatus(user.id!, user.username);
          // Vérifier si on réutilise une clé existante
          const usingExistingSecret = response.usingExistingSecret || false;
          const message = usingExistingSecret
            ? `2FA réactivé pour ${user.username}. L'utilisateur peut continuer à utiliser le même compte Google Authenticator.`
            : `2FA activé pour ${user.username}. L'utilisateur devra scanner le QR code à la prochaine connexion.`;
          await this.popupService.showSuccess(message, '2FA activé');
        },
        error: async (err) => {
          this.loading2FAStatus.delete(user.id!);
          const errorMsg = err.error?.error || 'Erreur inconnue';
          await this.popupService.showError(`Erreur lors de l'activation du 2FA: ${errorMsg}`, 'Erreur');
        }
      });
    }
  }

  /**
   * Réinitialise le 2FA pour un utilisateur (génère une nouvelle clé secrète mais garde le 2FA actif)
   */
  async reset2FA(user: User): Promise<void> {
    if (!user.username || !user.id) return;

    const confirmed = await this.popupService.showConfirmDialog(
      `Êtes-vous sûr de vouloir réinitialiser l'authentification à deux facteurs pour "${user.username}" ?\n\nCette action générera une nouvelle clé secrète. Le 2FA restera actif mais l'utilisateur devra scanner un nouveau QR code lors de sa prochaine connexion.`,
      'Réinitialisation du 2FA'
    );
    
    if (!confirmed) {
      return;
    }

    this.loading2FAStatus.add(user.id);
    this.twoFactorService.reset2FA(user.username).subscribe({
      next: async (response) => {
        this.loadUser2FAStatus(user.id!, user.username);
        await this.popupService.showSuccess(
          `2FA réinitialisé pour ${user.username}. Une nouvelle clé secrète a été générée. Le 2FA reste actif et l'utilisateur devra scanner le nouveau QR code lors de sa prochaine connexion.`,
          '2FA réinitialisé'
        );
      },
      error: async (err) => {
        this.loading2FAStatus.delete(user.id!);
        const errorMsg = err.error?.error || 'Erreur inconnue';
        await this.popupService.showError(`Erreur lors de la réinitialisation du 2FA: ${errorMsg}`, 'Erreur');
      }
    });
  }
} 