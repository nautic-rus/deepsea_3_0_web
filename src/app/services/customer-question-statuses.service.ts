import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CustomerQuestionStatusesService {
  constructor(private http: HttpClient) {}

  getStatuses(): Observable<any> {
    return this.http.get('/api/customer_question_statuses');
  }

  createStatus(payload: any): Observable<any> {
    return this.http.post('/api/customer_question_statuses', payload);
  }

  updateStatus(id: string | number, payload: any): Observable<any> {
    const url = `/api/customer_question_statuses/${encodeURIComponent(String(id))}`;
    return this.http.put(url, payload);
  }

  deleteStatus(id: string | number): Observable<any> {
    const url = `/api/customer_question_statuses/${encodeURIComponent(String(id))}`;
    return this.http.delete(url);
  }
}
