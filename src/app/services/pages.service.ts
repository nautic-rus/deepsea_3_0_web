import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PagesService {
  constructor(private http: HttpClient) {}

  // Get pages/menu available to current user (uses cookie auth)
  getUserPages(): Observable<any> {
    return this.http.get<any>('/api/user/pages', { withCredentials: true });
  }

  // Generic pages CRUD
  getPages(): Observable<any> {
    return this.http.get<any>('/api/pages');
  }

  createPage(payload: any): Observable<any> {
    return this.http.post<any>('/api/pages', payload);
  }

  updatePage(id: any, payload: any): Observable<any> {
    return this.http.put<any>(`/api/pages/${id}`, payload);
  }

  deletePage(id: any): Observable<any> {
    return this.http.delete<any>(`/api/pages/${id}`);
  }

  // Permissions
  getPermissions(): Observable<any> {
    return this.http.get<any>('/api/permissions');
  }

  // Page-permissions links
  getPagePermissions(pageId: any): Observable<any> {
    return this.http.get<any>(`/api/page_permissions?page_id=${encodeURIComponent(String(pageId))}`);
  }

  createPagePermission(pageId: any, permissionId: any): Observable<any> {
    return this.http.post<any>('/api/page_permissions', { page_id: pageId, permission_id: permissionId });
  }

  deletePagePermission(id: any): Observable<any> {
    return this.http.delete<any>(`/api/page_permissions/${id}`);
  }
}
