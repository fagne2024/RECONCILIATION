import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, NavigationEnd } from '@angular/router';
import { AppStateService } from '../../services/app-state.service';
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

  constructor(
    private http: HttpClient,
    private router: Router,
    private appState: AppStateService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    // Écouter les changements de navigation pour forcer la mise à jour du menu
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
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
    this.appState.logout();
    // Rediriger vers la page de login
    this.router.navigate(['/login']);
  }

  isMenuAllowed(menu: string): boolean {
    if (this.appState.isAdmin()) return true;
    return this.appState.isModuleAllowed(menu);
  }

  isAdmin(): boolean {
    const result = this.appState.isAdmin();
    const userRights = this.appState.getUserRights();
    console.log('[DEBUG] SidebarComponent.isAdmin: result =', result, 'userRights =', userRights, 'profil =', userRights?.profil);
    return result;
  }

  getUsername(): string | null {
    return this.appState.getUsername();
  }

  getUserProfil(): string | null {
    const userRights = this.appState.getUserRights();
    return userRights?.profil || null;
  }
} 