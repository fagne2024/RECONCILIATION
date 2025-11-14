import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AppStateService } from '../services/app-state.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private appState: AppStateService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    // Vérifier si l'utilisateur est connecté
    const userRights = this.appState.getUserRights();
    const username = this.appState.getUsername();

    if (userRights && username) {
      // L'utilisateur est connecté, autoriser l'accès
      return true;
    }

    // L'utilisateur n'est pas connecté, rediriger vers la page de login
    // Enregistrer l'URL demandée pour rediriger après la connexion
    this.router.navigate(['/login'], { 
      queryParams: { returnUrl: state.url } 
    });
    return false;
  }
}

