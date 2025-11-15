import { Component, OnInit } from '@angular/core';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user.model';
import { AppStateService } from '../../services/app-state.service';
import { PopupService } from '../../services/popup.service';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss']
})
export class UserProfileComponent implements OnInit {
  user: User | null = null;
  isLoading = false;
  errorMessage = '';
  
  // Formulaire de changement de mot de passe
  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  isChangingPassword = false;
  showPasswordForm = false;

  constructor(
    private userService: UserService,
    private appState: AppStateService,
    private popupService: PopupService
  ) { }

  ngOnInit(): void {
    this.loadUserInfo();
  }

  loadUserInfo(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.userService.getCurrentUser().subscribe({
      next: (user) => {
        this.user = user;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading user info:', error);
        this.errorMessage = 'Erreur lors du chargement des informations utilisateur';
        this.isLoading = false;
        this.popupService.showError('Erreur lors du chargement des informations utilisateur', 'Erreur');
      }
    });
  }

  togglePasswordForm(): void {
    this.showPasswordForm = !this.showPasswordForm;
    if (!this.showPasswordForm) {
      this.resetPasswordForm();
    }
  }

  resetPasswordForm(): void {
    this.passwordForm = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
  }

  async changePassword(): Promise<void> {
    // Validation
    if (!this.passwordForm.currentPassword || !this.passwordForm.newPassword || !this.passwordForm.confirmPassword) {
      await this.popupService.showError('Veuillez remplir tous les champs', 'Champs requis');
      return;
    }

    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      await this.popupService.showError('Les nouveaux mots de passe ne correspondent pas', 'Erreur de validation');
      return;
    }

    if (this.passwordForm.newPassword.length < 6) {
      await this.popupService.showError('Le nouveau mot de passe doit contenir au moins 6 caractères', 'Erreur de validation');
      return;
    }

    this.isChangingPassword = true;

    this.userService.changePassword(
      this.passwordForm.currentPassword,
      this.passwordForm.newPassword
    ).subscribe({
      next: async () => {
        await this.popupService.showSuccess('Mot de passe modifié avec succès', 'Succès');
        this.resetPasswordForm();
        this.showPasswordForm = false;
        this.isChangingPassword = false;
      },
      error: async (error) => {
        console.error('Error changing password:', error);
        const errorMessage = error.error?.error || 'Erreur lors de la modification du mot de passe';
        await this.popupService.showError(errorMessage, 'Erreur');
        this.isChangingPassword = false;
      }
    });
  }

  getProfilName(): string {
    return this.user?.profil?.nom || 'Non défini';
  }
}

