import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { UserLog, UserLogFilter } from '../models/user-log.model';

@Injectable({
  providedIn: 'root'
})
export class UserLogService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Récupérer tous les logs avec filtres optionnels
  getLogs(filter?: UserLogFilter): Observable<UserLog[]> {
    let params = new HttpParams();
    
    if (filter) {
      if (filter.username) {
        params = params.set('username', filter.username);
      }
      if (filter.module) {
        params = params.set('module', filter.module);
      }
      if (filter.permission) {
        params = params.set('permission', filter.permission);
      }
      if (filter.dateDebut) {
        params = params.set('dateDebut', filter.dateDebut);
      }
      if (filter.dateFin) {
        params = params.set('dateFin', filter.dateFin);
      }
    }

    return this.http.get<UserLog[]>(`${this.apiUrl}/log-utilisateur`, { params }).pipe(
      catchError(() => of([]))
    );
  }

  // Récupérer un log par ID
  getLog(id: number): Observable<UserLog | null> {
    return this.http.get<UserLog>(`${this.apiUrl}/log-utilisateur/${id}`).pipe(
      catchError(() => of(null))
    );
  }
}

