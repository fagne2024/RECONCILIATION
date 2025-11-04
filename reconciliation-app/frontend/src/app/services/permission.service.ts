import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Permission } from '../models/permission.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private apiUrl = `${environment.apiUrl}/profils/permissions`;
  private baseUrl = `${environment.apiUrl}/profils`;

  constructor(private http: HttpClient) { }

  getAllPermissions(): Observable<Permission[]> {
    return this.http.get<Permission[]>(this.apiUrl);
  }

  createPermission(permission: Permission): Observable<Permission> {
    return this.http.post<Permission>(this.apiUrl, permission);
  }

  updatePermission(id: number, permission: Permission): Observable<Permission> {
    return this.http.put<Permission>(`${this.apiUrl}/${id}`, permission);
  }

  deletePermission(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  /**
   * Génère automatiquement les permissions à partir des contrôleurs
   */
  generatePermissions(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/permissions/generate`, {});
  }

  /**
   * Analyse toutes les actions disponibles par module
   */
  analyzeAllModuleActions(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/actions/analyse`);
  }

  /**
   * Récupère toutes les actions disponibles pour un module spécifique
   */
  getActionsForModule(moduleName: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/actions/module/${encodeURIComponent(moduleName)}`);
  }

  /**
   * Récupère toutes les permissions groupées par module
   */
  getPermissionsGroupedByModule(): Observable<{ [key: string]: Permission[] }> {
    return this.http.get<{ [key: string]: Permission[] }>(`${this.baseUrl}/permissions/by-module`);
  }
} 