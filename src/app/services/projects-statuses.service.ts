import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProjectsStatusesService {
  constructor(private http: HttpClient) {}

  getStatuses(): Observable<any> {
    return this.http.get('/api/issue_statuses');
  }

  getDocumentStatuses(): Observable<any> {
    return this.http.get('/api/document_statuses');
  }

  createStatus(payload: any, issue = true): Observable<any> {
    const url = issue ? '/api/issue_statuses' : '/api/document_statuses';
    return this.http.post(url, payload);
  }

  updateStatus(id: string | number, payload: any, issue = true): Observable<any> {
    const url = issue ? `/api/issue_statuses/${encodeURIComponent(String(id))}` : `/api/document_statuses/${encodeURIComponent(String(id))}`;
    return this.http.put(url, payload);
  }

  deleteStatus(id: string | number, issue = true): Observable<any> {
    const url = issue ? `/api/issue_statuses/${encodeURIComponent(String(id))}` : `/api/document_statuses/${encodeURIComponent(String(id))}`;
    return this.http.delete(url);
  }
}
