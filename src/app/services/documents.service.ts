import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DocumentsService {
  constructor(private http: HttpClient) {}

  getDocuments(filters: any): Observable<any> {
    let params = new HttpParams();
    const csvArrayKeys = new Set<string>([
      'project_id'
    ]);
    const pushValue = (key: string, val: any) => {
      if (val === null || val === undefined || val === '') return;
      if (Array.isArray(val)) {
        const filtered = (val || []).filter((v: any) => v !== null && v !== undefined && v !== '');
        if (!filtered.length) return;
        if (csvArrayKeys.has(key)) {
          const csv = filtered.map((v: any) => String(v)).join(',');
          params = params.append(key, csv);
          return;
        }
        for (const v of filtered) params = params.append(key, String(v));
        return;
      }
      if (val instanceof Date) { params = params.append(key, val.toISOString()); return; }
      if (typeof val === 'boolean') { params = params.append(key, val ? 'true' : 'false'); return; }
      params = params.append(key, String(val));
    };

    pushValue('project_id', filters.project_id);
    if (filters.search) pushValue('search', filters.search);
    // Always request only active documents by default
    params = params.append('is_active', 'true');
    return this.http.get('/api/documents', { params });
  }

  createDocument(payload: any): Observable<any> {
    return this.http.post('/api/documents', payload);
  }

  updateDocument(id: any, payload: any): Observable<any> {
    return this.http.put(`/api/documents/${id}`, payload);
  }

  postMessage(id: any, payload: any): Observable<any> {
    return this.http.post(`/api/documents/${id}/messages`, payload);
  }

  getMessages(id: any): Observable<any> {
    return this.http.get(`/api/documents/${id}/messages`);
  }

  getHistory(id: any): Observable<any> {
    return this.http.get(`/api/documents/${id}/history`);
  }

  getDocument(id: any): Observable<any> {
    if (id === null || id === undefined) return this.http.get('/api/documents/0');
    return this.http.get(`/api/documents/${id}`);
  }

  deleteDocument(id: any): Observable<any> {
    return this.http.delete(`/api/documents/${id}`);
  }
}
