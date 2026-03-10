import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProjectsStorageTypesService {
  constructor(private http: HttpClient) {}

  getStorageTypes(): Observable<any> {
    return this.http.get('/api/document_storage_types');
  }

  createStorageType(payload: any): Observable<any> {
    return this.http.post('/api/document_storage_types', payload);
  }

  updateStorageType(id: string | number, payload: any): Observable<any> {
    return this.http.put(`/api/document_storage_types/${encodeURIComponent(String(id))}`, payload);
  }

  deleteStorageType(id: string | number): Observable<any> {
    return this.http.delete(`/api/document_storage_types/${encodeURIComponent(String(id))}`);
  }
}
