import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, NavigationEnd } from '@angular/router';
import { AppStateService } from '../../services/app-state.service';
import { UserLogService } from '../../services/user-log.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {

  showParamSubmenu = false;
  showSuiviEcartsSubmenu = false;
  showFraisCommissionsSubmenu = false;
  private _isAdmin: boolean | null = null;

  constructor(
    private http: HttpClient,
    private router: Router,
    private appState: AppStateService,
    private cdr: ChangeDetectorRef,
    private userLogService: UserLogService
  ) { }

  ngOnInit(): void {
    // Réinitialiser le cache au démarrage
    this._isAdmin = null;
    
    // Écouter les changements de navigation pour forcer la mise à jour du menu
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      // Réinitialiser le cache lors des changements de navigation
      this._isAdmin = null;
      this.cdr.detectChanges();
    });
  }

  toggleParamSubmenu() {
    this.showParamSubmenu = !this.showParamSubmenu;
  }

  toggleSuiviEcartsSubmenu() {
    this.showSuiviEcartsSubmenu = !this.showSuiviEcartsSubmenu;
  }

  toggleFraisCommissionsSubmenu() {
    this.showFraisCommissionsSubmenu = !this.showFraisCommissionsSubmenu;
  }

  logout() {
    const username = this.appState.getUsername();
    if (username) {
      this.userLogService.logActivity('deconnexion', 'Authentification', username, 'Déconnexion manuelle');
    }
    this.appState.logout();
    this.router.navigate(['/login']);
  }

  isMenuAllowed(menu: string): boolean {
    if (this.appState.isAdmin()) return true;
    return this.appState.isModuleAllowed(menu);
  }

  get isAdmin(): boolean {
    // Mise en cache pour éviter les recalculs à chaque cycle de détection de changement
    if (this._isAdmin === null) {
      this._isAdmin = this.appState.isAdmin();
    }
    return this._isAdmin;
  }

  getUsername(): string | null {
    return this.appState.getUsername();
  }

  getUserProfil(): string | null {
    const userRights = this.appState.getUserRights();
    return userRights?.profil || null;
  }

  goToProfile(): void {
    this.router.navigate(['/user-profile']);
  }
} 