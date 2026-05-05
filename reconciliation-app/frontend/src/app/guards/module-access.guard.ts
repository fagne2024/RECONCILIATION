import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { AppStateService } from '../services/app-state.service';
import { PopupService } from '../services/popup.service';

@Injectable({
  providedIn: 'root'
})
export class ModuleAccessGuard implements CanActivate {
  constructor(
    private appState: AppStateService,
    private router: Router,
    private popupService: PopupService
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (this.appState.isAdmin()) {
      return true;
    }

    const requiredModule = route.data['module'] as string | undefined;
    const requiredPermissions = (route.data['permissions'] as string[] | undefined) ?? [];

    if (!requiredModule) {
      return true;
    }

    if (!this.appState.isModuleAllowed(requiredModule)) {
      this.popupService.showWarning(
        `Vous n'avez pas acces au module '${requiredModule}'.`,
        'Acces refuse'
      );
      this.redirectToFallback(state.url);
      return false;
    }

    if (!this.appState.hasAllModulePermissions(requiredModule, requiredPermissions)) {
      const missing = requiredPermissions.filter(permission =>
        !this.appState.hasModulePermission(requiredModule, permission)
      );

      const message = missing.length === 1
        ? `Vous n'avez pas la permission '${missing[0]}' dans le module '${requiredModule}'.`
        : `Il vous manque les permissions ${missing.map(permission => `'${permission}'`).join(', ')} dans le module '${requiredModule}'.`;

      this.popupService.showWarning(message, 'Permission refusee');
      this.redirectToFallback(state.url);
      return false;
    }

    return true;
  }

  private redirectToFallback(blockedUrl: string): void {
    const preferredFallback = blockedUrl === '/dashboard' ? '/reconciliation-launcher' : '/dashboard';
    this.router.navigateByUrl(this.appState.resolveAccessibleRoute(preferredFallback));
  }
}
