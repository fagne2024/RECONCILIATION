import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AppStateService } from '../../services/app-state.service';

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
    private appState: AppStateService
  ) { }

  ngOnInit(): void {
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
    return this.appState.isAdmin();
  }

  getUsername(): string | null {
    return this.appState.getUsername();
  }

  getUserProfil(): string | null {
    const userRights = this.appState.getUserRights();
    return userRights?.profil || null;
  }
} 