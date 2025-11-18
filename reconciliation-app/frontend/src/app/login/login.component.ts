import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { AppStateService } from '../services/app-state.service';
import { UserService } from '../services/user.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  twoFactorForm: FormGroup;
  forgotPasswordForm: FormGroup;
  loading = false;
  error: string | null = null;
  success: string | null = null;
  adminExists = true; // Par défaut, on suppose que l'admin existe
  hidePassword = true; // Pour toggle afficher/masquer mot de passe
  particles = Array(10).fill(0).map((_, i) => i + 1); // Pour les particules animées en arrière-plan
  requires2FA = false; // Indique si le 2FA est requis
  showForgotPassword = false; // Afficher le formulaire de mot de passe oublié
  currentUsername: string | null = null; // Username pour la validation 2FA
  showQRCode = false; // Afficher le QR code lors de la connexion
  qrCodeBase64: string | null = null; // QR code en base64
  secret: string | null = null; // Clé secrète
  otpAuthUrl: string | null = null; // URL OTP Auth

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private appState: AppStateService,
    private userService: UserService
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
    
    this.twoFactorForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
    });
    
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit() {
    if (this.loginForm.invalid) return;
    const username = this.loginForm.value.username;
    const password = this.loginForm.value.password;
    this.loading = true;
    this.error = null;
    this.http.post<any>('/api/auth/login', { username, password })
      .subscribe({
        next: (response: any) => {
          this.loading = false;
          
          // Vérifier si le 2FA est requis
          if (response.requires2FA === true) {
            this.requires2FA = true;
            this.currentUsername = response.username;
            this.error = null;
            // Afficher le QR code uniquement si c'est la première connexion
            if (response.showQRCode === true && response.qrCode) {
              this.showQRCode = true;
              this.qrCodeBase64 = response.qrCode;
              this.secret = response.secret || null;
              this.otpAuthUrl = response.otpAuthUrl || null;
            } else {
              this.showQRCode = false;
              this.qrCodeBase64 = null;
              this.secret = null;
              this.otpAuthUrl = null;
            }
            // Masquer le formulaire de login et afficher le formulaire 2FA
            return;
          }
          
          // Vérifier si un token JWT est présent dans la réponse
          const token = response.token || null;
          if (!token) {
            this.error = 'Token d\'authentification manquant dans la réponse du serveur.';
            return;
          }
          
          // Stocker les droits et le token dans AppStateService
          const modules: string[] = Array.from(new Set(response.droits.map((d: any) => d.module)));
          const permissions: { [module: string]: string[] } = {};
          response.droits.forEach((d: any) => {
            if (!permissions[d.module]) permissions[d.module] = [];
            permissions[d.module].push(d.permission);
          });
          this.appState.setUserRights({
            profil: response.profil,
            modules,
            permissions
          }, response.username, token);
          
          // Rediriger vers l'URL demandée ou vers le dashboard par défaut
          const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
          this.router.navigate([returnUrl]);
        },
        error: (err) => {
          this.loading = false;
          if (err.status === 401 || err.status === 403) {
            // Le backend renvoie {"error": "Identifiants invalides"} ou un message similaire
            if (err.error && err.error.error) {
              this.error = err.error.error;
            } else {
              this.error = 'Nom d\'utilisateur ou mot de passe incorrect. Veuillez vérifier vos identifiants.';
            }
          } else if (err.status === 0) {
            this.error = 'Impossible de se connecter au serveur. Vérifiez votre connexion réseau.';
          } else if (err.error && typeof err.error === 'string') {
            this.error = err.error;
          } else if (err.error && err.error.message) {
            this.error = err.error.message;
          } else if (err.error && err.error.error) {
            this.error = err.error.error;
          } else {
            this.error = 'Une erreur est survenue lors de la connexion. Veuillez réessayer.';
          }
        }
      });
  }

  ngOnInit() {
    // Rediriger si déjà connecté
    if (this.appState.getUserRights() && this.appState.getUsername()) {
      const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
      this.router.navigate([returnUrl]);
      return;
    }
    // Vérifier si l'utilisateur admin existe
    this.checkAdminExists();
  }

  checkAdminExists() {
    this.http.get<boolean>('/api/users/check-admin').subscribe({
      next: (exists) => {
        this.adminExists = exists;
        if (!exists) {
          this.error = 'L\'utilisateur admin n\'existe pas. Veuillez créer un compte administrateur.';
        }
      },
      error: (err) => {
        console.warn('Impossible de vérifier l\'existence de l\'admin:', err);
        // En cas d'erreur, on garde la valeur par défaut (true)
      }
    });
  }

  togglePasswordVisibility() {
    this.hidePassword = !this.hidePassword;
  }

  onForgotPassword() {
    this.showForgotPassword = true;
    this.error = null;
    this.success = null;
    this.forgotPasswordForm.reset();
  }

  onSubmitForgotPassword() {
    if (this.forgotPasswordForm.invalid) {
      return;
    }
    
    const email = this.forgotPasswordForm.value.email;
    this.loading = true;
    this.error = null;
    this.success = null;
    
    this.userService.forgotPassword(email).subscribe({
      next: (response: any) => {
        this.loading = false;
        this.success = response.message || 'Si cette adresse email est associée à un compte, un nouveau mot de passe sera envoyé par email.';
        // Réinitialiser le formulaire après 3 secondes
        setTimeout(() => {
          this.showForgotPassword = false;
          this.success = null;
          this.forgotPasswordForm.reset();
        }, 5000);
      },
      error: (err) => {
        this.loading = false;
        if (err.error && err.error.error) {
          this.error = err.error.error;
        } else {
          this.error = 'Une erreur est survenue. Veuillez réessayer plus tard.';
        }
      }
    });
  }

  backToLoginFromForgotPassword() {
    this.showForgotPassword = false;
    this.error = null;
    this.success = null;
    this.forgotPasswordForm.reset();
  }

  onVerify2FA() {
    if (this.twoFactorForm.invalid || !this.currentUsername) {
      return;
    }
    
    const code = this.twoFactorForm.value.code;
    this.loading = true;
    this.error = null;
    
    this.http.post<any>('/api/auth/verify-2fa', {
      username: this.currentUsername,
      code: code
    }).subscribe({
      next: (response: any) => {
        this.loading = false;
        
        // Vérifier si un token JWT est présent dans la réponse
        const token = response.token || null;
        if (!token) {
          this.error = 'Token d\'authentification manquant dans la réponse du serveur.';
          return;
        }
        
        // Stocker les droits et le token dans AppStateService
        const modules: string[] = Array.from(new Set(response.droits.map((d: any) => d.module)));
        const permissions: { [module: string]: string[] } = {};
        response.droits.forEach((d: any) => {
          if (!permissions[d.module]) permissions[d.module] = [];
          permissions[d.module].push(d.permission);
        });
        this.appState.setUserRights({
          profil: response.profil,
          modules,
          permissions
        }, response.username, token);
        
        // Rediriger vers l'URL demandée ou vers le dashboard par défaut
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';
        this.router.navigate([returnUrl]);
      },
      error: (err) => {
        this.loading = false;
        if (err.status === 401) {
          this.error = err.error?.error || 'Code d\'authentification invalide. Veuillez réessayer.';
          // Réinitialiser le formulaire 2FA
          this.twoFactorForm.patchValue({ code: '' });
        } else {
          this.error = 'Une erreur est survenue lors de la vérification du code. Veuillez réessayer.';
        }
      }
    });
  }

  backToLogin() {
    this.requires2FA = false;
    this.currentUsername = null;
    this.showQRCode = false;
    this.qrCodeBase64 = null;
    this.secret = null;
    this.otpAuthUrl = null;
    this.twoFactorForm.reset();
    this.error = null;
  }

  /**
   * Copie la clé secrète dans le presse-papiers
   */
  copySecret() {
    if (!this.secret) return;
    
    navigator.clipboard.writeText(this.secret).then(() => {
      this.error = null; // Réinitialiser l'erreur
      // Afficher un message de succès temporaire
      setTimeout(() => {
        // Le message disparaîtra automatiquement
      }, 3000);
    }).catch(() => {
      this.error = 'Impossible de copier la clé secrète';
    });
  }
}
