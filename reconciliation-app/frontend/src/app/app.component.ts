import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
    selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  showSidebar = true;
  title = 'reconciliation-app';

  constructor(private router: Router) {}

    ngOnInit() {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event) => {
      this.showSidebar = event.urlAfterRedirects !== '/login';
      // Forcer le recalcul du layout après navigation (corrige le bug d'affichage trop large)
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 50);
    });
    // S'assurer que le scroll fonctionne
    this.enableMouseScroll();
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

  // Les méthodes de navigation ne sont plus nécessaires ici
  // car elles sont gérées par les routerLink dans la sidebar.
} 