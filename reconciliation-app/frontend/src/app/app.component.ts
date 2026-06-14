import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AppStateService } from './services/app-state.service';
import { UserLogService } from './services/user-log.service';

@Component({
    selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  showSidebar = true;
  isLoginPage = false;
  title = 'reconciliation-app';

  private readonly routeLabels: { [path: string]: string } = {
    '/reconciliation-launcher': 'Lanceur de Réconciliation',
    '/reconciliation': 'Réconciliation',
    '/upload-assisted': 'Mode Assisté — Upload',
    '/upload': 'Upload de fichiers',
    '/column-selection': 'Sélection de colonnes',
    '/stats': 'Statistiques',
    '/agency-summary': 'Résumé Agences',
    '/results': 'Résultats',
    '/matches': 'Correspondances',
    '/ecart-bo': 'Écarts BO',
    '/ecart-partner': 'Écarts Partenaire',
    '/dashboard': 'Dashboard',
    '/comptes': 'Comptes',
    '/operations': 'Opérations',
    '/frais': 'Frais',
    '/commission': 'Commissions',
    '/users': 'Utilisateurs',
    '/ranking': 'Classements',
    '/traitement': 'Traitement',
    '/profils': 'Profils',
    '/modules': 'Modules',
    '/permissions': 'Permissions',
    '/ecart-solde': 'Écart Solde',
    '/trx-sf': 'TRX SF',
    '/impact-op': 'Impact OP',
    '/service-balance': 'Service Balance',
    '/service-references': 'Références Services',
    '/auto-processing-models': 'Modèles Auto-Processing',
    '/banque': 'Banque',
    '/comptabilite': 'Comptabilité',
    '/reconciliation-report': 'Rapport Réconciliation',
    '/rapport-reconciliation-bo-partenaire': 'Rapport BO vs Partenaire',
    '/report-dashboard': 'Dashboard Rapport',
    '/reconciliation-dashboard': 'Dashboard Réconciliation',
    '/reconciliation-global-preview': 'Aperçu Global Réconciliation',
    '/banque-dashboard': 'Dashboard Banque',
    '/log-utilisateur': 'Journal Utilisateur',
    '/predictions': 'Prédictions',
    '/two-factor-auth': 'Authentification 2FA',
    '/user-profile': 'Profil Utilisateur',
    '/aide': 'Aide',
    '/sop-operation': 'Opérations SOP',
    '/sop-reconciliation-trx': 'Réconciliation SOP TRX',
    '/guide-utilisation': 'Guide Utilisation',
    '/suivi-des-ecarts': 'Suivi des Écarts',
    '/ecart-bo-summary': 'Résumé Écarts BO',
    '/certification-solde': 'Certification de solde',
    '/redevance-loterie': 'Redevance Loterie'
  };

  constructor(
    private router: Router,
    private appState: AppStateService,
    private userLogService: UserLogService
  ) {}

    ngOnInit() {
    // Vérifier l'URL initiale pour masquer le sidebar si on est sur la page de login
    this.updateSidebarVisibility(this.router.url);
    
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event) => {
      this.updateSidebarVisibility(event.urlAfterRedirects);
      this.logPageView(event.urlAfterRedirects);
      // Forcer le recalcul du layout après navigation (corrige le bug d'affichage trop large)
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 50);
    });
    // S'assurer que le scroll fonctionne
    this.enableMouseScroll();
  }

  private logPageView(url: string): void {
    if (url === '/login' || url.startsWith('/login')) return;
    const username = this.appState.getUsername();
    if (!username) return;
    const basePath = url.split('?')[0];
    const label = this.routeLabels[basePath] || basePath;
    this.userLogService.logActivity('vue_page', 'Navigation', username, `Page: ${label} (${basePath})`);
  }

  private updateSidebarVisibility(url: string): void {
    this.isLoginPage = url === '/login' || url.startsWith('/login');
    this.showSidebar = !this.isLoginPage;
  }

  private enableMouseScroll() {
    // Détecter Chrome
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    
    // Styles de base pour tous les navigateurs
    document.body.style.overflowY = 'auto';
    document.body.style.overflowX = 'hidden';
    
    // Spécifique Chrome
    if (isChrome) {
      document.documentElement.style.overflowY = 'auto';
      
      // Correction après un délai pour Chrome
      setTimeout(() => {
        document.body.style.overflowY = 'auto';
        document.documentElement.style.overflowY = 'auto';
        
        // S'assurer que tous les éléments sont scrollables
        const allElements = document.querySelectorAll('*');
        allElements.forEach((element: any) => {
          if (element && element.style && element.style.overflowY === 'hidden') {
            element.style.overflowY = 'auto';
          }
        });
      }, 1000);
    }
  }

  toggleSidebar() {
    this.showSidebar = !this.showSidebar;
    // Forcer le recalcul du layout après toggle
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 50);
  }

  // Les méthodes de navigation ne sont plus nécessaires ici
  // car elles sont gérées par les routerLink dans la sidebar.
} 