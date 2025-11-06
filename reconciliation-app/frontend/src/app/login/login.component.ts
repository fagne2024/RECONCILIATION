import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { AppStateService } from '../services/app-state.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  loading = false;
  error: string | null = null;
  adminExists = true; // Par défaut, on suppose que l'admin existe
  hidePassword = true; // Pour toggle afficher/masquer mot de passe
  particles = Array(10).fill(0).map((_, i) => i + 1); // Pour les particules animées en arrière-plan

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private appState: AppStateService
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
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
          // Stocker les droits dans AppStateService
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
          }, response.username);
          
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
    // TODO: Implémenter la fonctionnalité de mot de passe oublié
    alert('Fonctionnalité de réinitialisation de mot de passe à implémenter');
  }
}
