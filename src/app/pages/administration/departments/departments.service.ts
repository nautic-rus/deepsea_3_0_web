import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DepartmentsService {
  constructor(private http: HttpClient) {}

  getPermissions(page = 1, limit = 1000): Observable<any> {
    return this.http.get(`/api/departments?page=${page}&limit=${limit}`);
  }

  updatePermission(id: string | number, payload: any): Observable<any> {
    return this.http.put(`/api/departments/${encodeURIComponent(String(id))}`, payload);
  }

  createPermission(payload: any): Observable<any> {
    return this.http.post('/api/departments', payload);
  }

  deletePermission(id: string | number): Observable<any> {
    return this.http.delete(`/api/departments/${encodeURIComponent(String(id))}`);
  }
}
