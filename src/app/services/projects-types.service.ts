import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProjectsTypesService {
  constructor(private http: HttpClient) {}

  getIssueTypes(): Observable<any> {
    return this.http.get('/api/issue_types');
  }

  getDocumentTypes(): Observable<any> {
    return this.http.get('/api/document_types');
  }

  createType(payload: any, issue = true): Observable<any> {
    const url = issue ? '/api/issue_types' : '/api/document_types';
    return this.http.post(url, payload);
  }

  updateType(id: string | number, payload: any, issue = true): Observable<any> {
    const url = issue ? `/api/issue_types/${encodeURIComponent(String(id))}` : `/api/document_types/${encodeURIComponent(String(id))}`;
    return this.http.put(url, payload);
  }

  deleteType(id: string | number, issue = true): Observable<any> {
    const url = issue ? `/api/issue_types/${encodeURIComponent(String(id))}` : `/api/document_types/${encodeURIComponent(String(id))}`;
    return this.http.delete(url);
  }
}
