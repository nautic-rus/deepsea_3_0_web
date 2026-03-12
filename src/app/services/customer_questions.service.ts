import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CustomerQuestionsService {
  constructor(private http: HttpClient) {}

  getQuestions(filters: any): Observable<any> {
    let params = new HttpParams();
    if (!filters) filters = {};
    
    const pushValue = (key: string, val: any) => {
      if (val === null || val === undefined || val === '') return;
      if (Array.isArray(val)) {
        const filtered = (val || []).filter((v: any) => v !== null && v !== undefined && v !== '');
        if (!filtered.length) return;
        for (const v of filtered) params = params.append(key, String(v));
        return;
      }
      if (val instanceof Date) { params = params.append(key, val.toISOString()); return; }
      if (typeof val === 'boolean') { params = params.append(key, val ? 'true' : 'false'); return; }
      params = params.append(key, String(val));
    };

    // Support all filters from swagger.json
    if (filters.search) pushValue('search', filters.search);
    if (filters.project_id) pushValue('project_id', filters.project_id);
    if (filters.document_id) pushValue('document_id', filters.document_id);
    if (filters.status) pushValue('status', filters.status);
    if (filters.priority) pushValue('priority', filters.priority);
    if (filters.asked_by) pushValue('asked_by', filters.asked_by);
    if (filters.answered_by) pushValue('answered_by', filters.answered_by);
    if (filters.asked_at_from) pushValue('asked_at_from', filters.asked_at_from);
    if (filters.asked_at_to) pushValue('asked_at_to', filters.asked_at_to);
    if (filters.answered_at_from) pushValue('answered_at_from', filters.answered_at_from);
    if (filters.answered_at_to) pushValue('answered_at_to', filters.answered_at_to);
    if (filters.due_date_from) pushValue('due_date_from', filters.due_date_from);
    if (filters.due_date_to) pushValue('due_date_to', filters.due_date_to);
    if (filters.page) pushValue('page', filters.page);
    if (filters.limit) pushValue('limit', filters.limit);
    
    return this.http.get('/api/customer_questions', { params });
  }

  createQuestion(payload: any): Observable<any> {
    return this.http.post('/api/customer_questions', payload);
  }

  getQuestion(id: any): Observable<any> {
    return this.http.get(`/api/customer_questions/${id}`);
  }

  updateQuestion(id: any, payload: any): Observable<any> {
    return this.http.put(`/api/customer_questions/${id}`, payload);
  }

  deleteQuestion(id: any): Observable<any> {
    return this.http.delete(`/api/customer_questions/${id}`);
  }
}


