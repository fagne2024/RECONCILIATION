import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, NavigationEnd } from '@angular/router';
import { AppStateService } from '../../services/app-state.service';
import { UserLogService } from '../../services/user-log.service';
import { filter } from 'rxjs/operators';

interface SidebarSubmenu {
  showKey: keyof SidebarComponent;
  routes: string[];
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {

  showReconciliationSubmenu = false;
  showResultatsSubmenu = false;
  showStatistiquesSubmenu = false;
  showComptesSubmenu = false;
  showFraisCommissionsSubmenu = false;
  showSuiviEcartsSubmenu = false;
  showBanqueSubmenu = false;
  showAideSubmenu = false;
  showParamSubmenu = false;

  readonly reconciliationRoutes = [
    '/reconciliation-launcher',
    '/reconciliation',
    '/upload',
    '/upload-assisted',
    '/column-selection',
    '/certification-solde'
  ];
  readonly resultatsRoutes = [
    '/results',
    '/matches',
    '/ecart-bo',
    '/ecart-partner',
    '/ecart-bo-summary',
    '/reconciliation-report',
    '/rapport-reconciliation-bo-partenaire',
    '/reconciliation-dashboard',
    '/reconciliation-global-preview',
    '/report-dashboard'
  ];
  readonly statistiquesRoutes = ['/stats', '/stats-report', '/stats-report-graph', '/agency-summary'];
  readonly comptesRoutes = ['/comptes', '/redevance-loterie', '/service-balance', '/predictions', '/predictions-old'];
  readonly fraisCommissionsRoutes = ['/frais', '/commission', '/charge'];
  readonly suiviEcartsRoutes = ['/ecart-solde', '/impact-op', '/trx-sf', '/suivi-des-ecarts'];
  readonly banqueRoutes = ['/banque', '/banque-dashboard'];
  readonly aideRoutes = ['/aide', '/sop-operation', '/sop-reconciliation-trx', '/guide-utilisation'];
  readonly paramRoutes = ['/users', '/profils', '/modules', '/permissions', '/log-utilisateur', '/two-factor-auth'];

  private readonly submenuConfig: SidebarSubmenu[] = [
    { showKey: 'showReconciliationSubmenu', routes: this.reconciliationRoutes },
    { showKey: 'showResultatsSubmenu', routes: this.resultatsRoutes },
    { showKey: 'showStatistiquesSubmenu', routes: this.statistiquesRoutes },
    { showKey: 'showComptesSubmenu', routes: this.comptesRoutes },
    { showKey: 'showFraisCommissionsSubmenu', routes: this.fraisCommissionsRoutes },
    { showKey: 'showSuiviEcartsSubmenu', routes: this.suiviEcartsRoutes },
    { showKey: 'showBanqueSubmenu', routes: this.banqueRoutes },
    { showKey: 'showAideSubmenu', routes: this.aideRoutes },
    { showKey: 'showParamSubmenu', routes: this.paramRoutes }
  ];

  private _isAdmin: boolean | null = null;

  constructor(
    private http: HttpClient,
    private router: Router,
    private appState: AppStateService,
    private cdr: ChangeDetectorRef,
    private userLogService: UserLogService
  ) { }

  ngOnInit(): void {
    this._isAdmin = null;
    this.updateExpandedSubmenus(this.router.url);

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this._isAdmin = null;
      this.updateExpandedSubmenus(event.urlAfterRedirects);
      this.cdr.detectChanges();
    });
  }

  private updateExpandedSubmenus(url: string): void {
    const path = url.split('?')[0];
    for (const config of this.submenuConfig) {
      if (this.isPathInGroup(path, config.routes)) {
        (this[config.showKey] as boolean) = true;
      }
    }
  }

  isPathInGroup(path: string, routes: string[]): boolean {
    return routes.some(route => path === route || path.startsWith(route + '/'));
  }

  isOnSection(routes: string[]): boolean {
    return this.isPathInGroup(this.router.url.split('?')[0], routes);
  }

  toggleSubmenu(flag: keyof SidebarComponent): void {
    const current = this[flag] as boolean;
    (this[flag] as boolean) = !current;
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
