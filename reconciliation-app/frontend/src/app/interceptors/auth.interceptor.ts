import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppStateService } from '../services/app-state.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private appState: AppStateService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Récupérer le nom d'utilisateur depuis AppStateService
    const username = this.appState.getUsername();

    // Si un utilisateur est connecté, ajouter le header X-Username
    if (username) {
      const clonedRequest = req.clone({
        setHeaders: {
          'X-Username': username
        }
      });
      return next.handle(clonedRequest);
    }

    // Sinon, passer la requête sans modification
    return next.handle(req);
  }
}

