import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class IssuesService {
  constructor(private http: HttpClient) {}

  getIssues(filters: any): Observable<any> {
    let params = new HttpParams();
    // keys that should be sent as comma-separated lists when provided as arrays
    const csvArrayKeys = new Set<string>([
      'project_id',
      'status_id',
      'assignee_id',
      'author_id',
      'type_id',
      'priority'
    ]);

    const pushValue = (key: string, val: any) => {
      if (val === null || val === undefined || val === '') return;
      if (Array.isArray(val)) {
        // if this key expects CSV, join values into single comma-separated param
        const filtered = (val || []).filter((v: any) => v !== null && v !== undefined && v !== '');
        if (!filtered.length) return;
        if (csvArrayKeys.has(key)) {
          const csv = filtered.map((v: any) => String(v)).join(',');
          params = params.append(key, csv);
          return;
        }
        // otherwise append multiple params with same key
        for (const v of filtered) {
          params = params.append(key, String(v));
        }
        return;
      }
      if (val instanceof Date) {
        params = params.append(key, val.toISOString());
        return;
      }
      if (typeof val === 'boolean') {
        params = params.append(key, val ? 'true' : 'false');
        return;
      }
      params = params.append(key, String(val));
    };

    // special handling for is_closed: if both true and false are present, skip this filter
    const isClosedVal = filters.is_closed;
    if (Array.isArray(isClosedVal)) {
      const uniq = Array.from(new Set(isClosedVal.map((v: any) => String(v))));
      const hasTrue = uniq.includes('true');
      const hasFalse = uniq.includes('false');
      if (!(hasTrue && hasFalse)) {
        for (const v of isClosedVal) {
          if (v === null || v === undefined || v === '') continue;
          params = params.append('is_closed', String(v));
        }
      }
    } else {
      pushValue('is_closed', isClosedVal);
    }

    // use my_issue parameter instead of is_active (true or omitted)
    pushValue('my_issue', filters.my_issue);
    pushValue('project_id', filters.project_id);
    pushValue('status_id', filters.status_id);
    pushValue('assignee_id', filters.assignee_id);
    pushValue('author_id', filters.author_id);
    pushValue('type_id', filters.type_id);
    pushValue('priority', filters.priority);
    pushValue('estimated_hours', filters.estimated_hours);
    pushValue('estimated_hours_min', filters.estimated_hours_min);
    pushValue('estimated_hours_max', filters.estimated_hours_max);
    pushValue('start_date_from', filters.start_date_from);
    pushValue('start_date_to', filters.start_date_to);
    pushValue('due_date_from', filters.due_date_from);
    pushValue('due_date_to', filters.due_date_to);
  // pagination handled client-side / by server defaults — do not send page/limit here
    if (filters.search) pushValue('search', filters.search);

    // Always request only active issues by default
    params = params.append('is_active', 'true');
    return this.http.get('/api/issues', { params });
  }

  createIssue(payload: any): Observable<any> {
    return this.http.post('/api/issues', payload);
  }

  updateIssue(id: any, payload: any): Observable<any> {
    // use PUT for updating an issue (replace resource) per API contract
    return this.http.put(`/api/issues/${id}`, payload);
  }

  postMessage(id: any, payload: any): Observable<any> {
    // POST a message for a given issue. Expected body: { content: string }
    return this.http.post(`/api/issues/${id}/messages`, payload);
  }

  getMessages(id: any): Observable<any> {
    // Retrieve messages for an issue
    return this.http.get(`/api/issues/${id}/messages`);
  }

  getHistory(id: any): Observable<any> {
    // Retrieve history entries for an issue (audit log, status changes, etc.)
    return this.http.get(`/api/issues/${id}/history`);
  }

  getIssue(id: any): Observable<any> {
    if (id === null || id === undefined) return this.http.get('/api/issues/0');
    return this.http.get(`/api/issues/${id}`);
  }

  deleteIssue(id: any): Observable<any> {
    return this.http.delete(`/api/issues/${id}`);
  }
}
