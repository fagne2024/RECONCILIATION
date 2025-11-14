import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TwoFactorAuthService } from '../../services/two-factor-auth.service';
import { AppStateService } from '../../services/app-state.service';
import { PopupService } from '../../services/popup.service';

@Component({
  selector: 'app-two-factor-auth',
  templateUrl: './two-factor-auth.component.html',
  styleUrls: ['./two-factor-auth.component.scss']
})
export class TwoFactorAuthComponent implements OnInit {
  twoFactorForm: FormGroup;
  validationForm: FormGroup;
  loading = false;
  
  is2FAEnabled = false;
  hasSecret = false;
  username: string | null = null;
  
  qrCodeBase64: string | null = null;
  secret: string | null = null;
  otpAuthUrl: string | null = null;
  showQRCode = false;
  showValidationForm = false;

  constructor(
    private fb: FormBuilder,
    private twoFactorService: TwoFactorAuthService,
    private appState: AppStateService,
    private popupService: PopupService
  ) {
    this.twoFactorForm = this.fb.group({});
    this.validationForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
    });
  }

  ngOnInit() {
    // Vérifier si un paramètre 'user' est présent dans l'URL (pour les admins)
    const urlParams = new URLSearchParams(window.location.search);
    const targetUser = urlParams.get('user');
    
    if (targetUser) {
      // Si un utilisateur est spécifié dans l'URL, vérifier si l'utilisateur connecté est admin
      const currentUser = this.appState.getUsername();
      const isAdmin = this.appState.isAdmin();
      
      if (!isAdmin || !currentUser) {
        this.popupService.showError('Vous devez être administrateur pour configurer le 2FA pour d\'autres utilisateurs', 'Accès refusé');
        return;
      }
      
      // Utiliser l'utilisateur cible spécifié
      this.username = targetUser;
    } else {
      // Sinon, utiliser l'utilisateur connecté
      this.username = this.appState.getUsername();
      if (!this.username) {
        this.popupService.showError('Vous devez être connecté pour gérer le 2FA', 'Authentification requise');
        return;
      }
    }
    
    this.load2FAStatus();
  }

  /**
   * Charge le statut du 2FA pour l'utilisateur connecté
   */
  load2FAStatus() {
    if (!this.username) return;
    
    this.loading = true;
    
    this.twoFactorService.get2FAStatus(this.username).subscribe({
      next: (status) => {
        this.loading = false;
        this.is2FAEnabled = status.enabled;
        this.hasSecret = status.hasSecret;
      },
      error: async (err) => {
        this.loading = false;
        await this.popupService.showError('Erreur lors du chargement du statut du 2FA', 'Erreur');
        console.error('Error loading 2FA status:', err);
      }
    });
  }

  /**
   * Génère une nouvelle clé secrète et un QR code
   */
  setup2FA() {
    if (!this.username) return;
    
    this.loading = true;
    this.qrCodeBase64 = null;
    this.secret = null;
    this.showQRCode = false;
    this.showValidationForm = false;
    
    this.twoFactorService.setup2FA(this.username).subscribe({
      next: async (response) => {
        this.loading = false;
        this.qrCodeBase64 = response.qrCode;
        this.secret = response.secret;
        this.otpAuthUrl = response.otpAuthUrl;
        this.showQRCode = true;
        this.showValidationForm = true;
        await this.popupService.showSuccess('Scannez le QR code avec Google Authenticator, puis entrez un code pour activer le 2FA', 'Configuration 2FA');
      },
      error: async (err) => {
        this.loading = false;
        const errorMsg = err.error?.error || 'Erreur lors de la génération de la clé secrète';
        await this.popupService.showError(errorMsg, 'Erreur');
        console.error('Error setting up 2FA:', err);
      }
    });
  }

  /**
   * Active le 2FA après validation d'un code
   */
  async enable2FA() {
    if (!this.username || this.validationForm.invalid) return;
    
    const code = this.validationForm.value.code;
    this.loading = true;
    
    this.twoFactorService.enable2FA(this.username, code).subscribe({
      next: async (response) => {
        this.loading = false;
        const message = response.message || 'Authentification à deux facteurs activée avec succès';
        await this.popupService.showSuccess(message, '2FA activé');
        this.is2FAEnabled = true;
        this.hasSecret = true;
        this.showQRCode = false;
        this.showValidationForm = false;
        this.validationForm.reset();
        // Recharger le statut
        setTimeout(() => {
          this.load2FAStatus();
        }, 1000);
      },
      error: async (err) => {
        this.loading = false;
        const errorMsg = err.error?.error || 'Code invalide. Veuillez réessayer.';
        await this.popupService.showError(errorMsg, 'Code invalide');
        this.validationForm.patchValue({ code: '' });
        console.error('Error enabling 2FA:', err);
      }
    });
  }

  /**
   * Désactive le 2FA
   */
  async disable2FA() {
    if (!this.username) return;
    
    const confirmed = await this.popupService.showConfirmDialog(
      'Êtes-vous sûr de vouloir désactiver l\'authentification à deux facteurs ?\n\nVotre compte sera moins sécurisé sans cette protection.',
      'Désactivation du 2FA'
    );
    
    if (!confirmed) {
      return;
    }
    
    this.loading = true;
    
    this.twoFactorService.disable2FA(this.username).subscribe({
      next: async (response) => {
        this.loading = false;
        const message = response.message || 'Authentification à deux facteurs désactivée';
        await this.popupService.showSuccess(message, '2FA désactivé');
        this.is2FAEnabled = false;
        this.hasSecret = false;
        this.showQRCode = false;
        this.showValidationForm = false;
        this.validationForm.reset();
        // Recharger le statut
        setTimeout(() => {
          this.load2FAStatus();
        }, 1000);
      },
      error: async (err) => {
        this.loading = false;
        const errorMsg = err.error?.error || 'Erreur lors de la désactivation du 2FA';
        await this.popupService.showError(errorMsg, 'Erreur');
        console.error('Error disabling 2FA:', err);
      }
    });
  }

  /**
   * Annule le processus d'activation
   */
  cancelSetup() {
    this.showQRCode = false;
    this.showValidationForm = false;
    this.qrCodeBase64 = null;
    this.secret = null;
    this.otpAuthUrl = null;
    this.validationForm.reset();
  }

  /**
   * Copie la clé secrète dans le presse-papiers
   */
  async copySecret() {
    if (!this.secret) return;
    
    try {
      await navigator.clipboard.writeText(this.secret);
      await this.popupService.showSuccess('Clé secrète copiée dans le presse-papiers', 'Copié');
    } catch {
      await this.popupService.showError('Impossible de copier la clé secrète', 'Erreur');
    }
  }

  /**
   * Copie l'URL OTP Auth dans le presse-papiers
   */
  async copyOtpAuthUrl() {
    if (!this.otpAuthUrl) return;
    
    try {
      await navigator.clipboard.writeText(this.otpAuthUrl);
      await this.popupService.showSuccess('URL copiée dans le presse-papiers', 'Copié');
    } catch {
      await this.popupService.showError('Impossible de copier l\'URL', 'Erreur');
    }
  }
}

