import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class IssuesService {
  constructor(private http: HttpClient) {}

  getIssues(filters: any): Observable<any> {
    let params = new HttpParams();

    const pushValue = (key: string, val: any) => {
      if (val === null || val === undefined || val === '') return;
      if (Array.isArray(val)) {
        for (const v of val) {
          if (v === null || v === undefined || v === '') continue;
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

    pushValue('is_closed', filters.is_closed);
    pushValue('is_active', filters.is_active);
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
    pushValue('page', filters.page);
    pushValue('limit', filters.limit);
    if (filters.search) pushValue('search', filters.search);

    return this.http.get('/api/issues', { params });
  }
}
