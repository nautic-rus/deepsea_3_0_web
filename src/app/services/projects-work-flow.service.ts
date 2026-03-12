import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProjectsWorkFlowService {
  constructor(private http: HttpClient) {}

  getDocumentWorkFlows(projectId?: number): Observable<any> {
    const q = projectId ? `?project_id=${encodeURIComponent(String(projectId))}` : '';
    return this.http.get(`/api/document_work_flows${q}`);
  }

  getCustomerQuestionWorkFlows(projectId?: number): Observable<any> {
    const q = projectId ? `?project_id=${encodeURIComponent(String(projectId))}` : '';
    return this.http.get(`/api/customer_question_work_flows${q}`);
  }

  getIssueWorkFlows(projectId?: number, issueTypeId?: number): Observable<any> {
    const params: string[] = [];
    if (projectId !== undefined) params.push(`project_id=${encodeURIComponent(String(projectId))}`);
    if (issueTypeId !== undefined) params.push(`issue_type_id=${encodeURIComponent(String(issueTypeId))}`);
    const q = params.length ? `?${params.join('&')}` : '';
    return this.http.get(`/api/issue_work_flows${q}`);
  }

  createDocumentWorkFlow(payload: any): Observable<any> {
    return this.http.post('/api/document_work_flows', payload);
  }

  createCustomerQuestionWorkFlow(payload: any): Observable<any> {
    return this.http.post('/api/customer_question_work_flows', payload);
  }

  createIssueWorkFlow(payload: any): Observable<any> {
    return this.http.post('/api/issue_work_flows', payload);
  }

  updateDocumentWorkFlow(id: string | number, payload: any): Observable<any> {
    return this.http.put(`/api/document_work_flows/${encodeURIComponent(String(id))}`, payload);
  }

  updateCustomerQuestionWorkFlow(id: string | number, payload: any): Observable<any> {
    return this.http.put(`/api/customer_question_work_flows/${encodeURIComponent(String(id))}`, payload);
  }

  updateIssueWorkFlow(id: string | number, payload: any): Observable<any> {
    return this.http.put(`/api/issue_work_flows/${encodeURIComponent(String(id))}`, payload);
  }

  deleteDocumentWorkFlow(id: string | number): Observable<any> {
    return this.http.delete(`/api/document_work_flows/${encodeURIComponent(String(id))}`);
  }

  deleteCustomerQuestionWorkFlow(id: string | number): Observable<any> {
    return this.http.delete(`/api/customer_question_work_flows/${encodeURIComponent(String(id))}`);
  }

  deleteIssueWorkFlow(id: string | number): Observable<any> {
    return this.http.delete(`/api/issue_work_flows/${encodeURIComponent(String(id))}`);
  }
}
