import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
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
    private appState: AppStateService
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
      rememberMe: [true], // Option mémoriser activée par défaut
      additionalOption: [false] // Option supplémentaire
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
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.loading = false;
          this.error = err.error || 'Erreur de connexion';
        }
      });
  }

  ngOnInit() {
    // Rediriger si déjà connecté
    if (this.appState.getUserRights() && this.appState.getUsername()) {
      this.router.navigate(['/dashboard']);
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
