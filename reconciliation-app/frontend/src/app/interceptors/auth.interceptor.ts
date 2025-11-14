import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AppStateService } from '../services/app-state.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(
    private appState: AppStateService,
    private router: Router
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Récupérer le token JWT depuis AppStateService
    const token = this.appState.getToken();
    const username = this.appState.getUsername();

    // Construire les headers à ajouter
    const headers: { [key: string]: string } = {};

    // Si un token JWT existe, ajouter le header Authorization
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Si un utilisateur est connecté, ajouter également le header X-Username (pour compatibilité)
    if (username) {
      headers['X-Username'] = username;
    }

    // Cloner la requête et ajouter les headers
    const clonedRequest = req.clone({
      setHeaders: headers
    });

    // Gérer les erreurs HTTP (notamment 401 Unauthorized)
    return next.handle(clonedRequest).pipe(
      catchError((error: HttpErrorResponse) => {
        // Si erreur 401 (Non autorisé), déconnecter l'utilisateur
        if (error.status === 401) {
          console.warn('Token invalide ou expiré, déconnexion...');
          this.appState.logout();
          this.router.navigate(['/login'], {
            queryParams: { returnUrl: this.router.url }
          });
        }
        return throwError(() => error);
      })
    );
  }
}

