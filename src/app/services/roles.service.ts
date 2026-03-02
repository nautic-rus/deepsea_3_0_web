import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class RolesService {
  constructor(private http: HttpClient) {}

  getRoles(page = 1, limit = 1000): Observable<any> {
    return this.http.get(`/api/roles?page=${page}&limit=${limit}`);
  }

  getRole(id: string | number): Observable<any> {
    return this.http.get(`/api/roles/${encodeURIComponent(String(id))}`);
  }

  getRolePermissions(id: string | number): Observable<any> {
    return this.http.get(`/api/roles/${encodeURIComponent(String(id))}/permissions`);
  }

  // Fetch all available permissions
  getPermissions(): Observable<any> {
    return this.http.get('/api/permissions');
  }

  // Add permissions to a role (expects payload like { permissions: [id, ...] } or similar)
  addRolePermissions(roleId: string | number, payload: any): Observable<any> {
    return this.http.post(`/api/roles/${encodeURIComponent(String(roleId))}/permissions`, payload);
  }

  deleteRolePermission(roleId: string | number, permissionId: string | number): Observable<any> {
    return this.http.delete(`/api/roles/${encodeURIComponent(String(roleId))}/permissions/${encodeURIComponent(String(permissionId))}`);
  }

  createRole(payload: any): Observable<any> {
    return this.http.post('/api/roles', payload);
  }

  updateRole(id: string | number, payload: any): Observable<any> {
    return this.http.put(`/api/roles/${encodeURIComponent(String(id))}`, payload);
  }

  deleteRole(id: string | number): Observable<any> {
    return this.http.delete(`/api/roles/${encodeURIComponent(String(id))}`);
  }
}
