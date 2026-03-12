import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CustomerQuestionTypesService {
  constructor(private http: HttpClient) {}

  getTypes(): Observable<any> {
    return this.http.get('/api/customer_question_types');
  }

  createType(payload: any): Observable<any> {
    return this.http.post('/api/customer_question_types', payload);
  }

  updateType(id: string | number, payload: any): Observable<any> {
    return this.http.put(`/api/customer_question_types/${encodeURIComponent(String(id))}`, payload);
  }

  deleteType(id: string | number): Observable<any> {
    return this.http.delete(`/api/customer_question_types/${encodeURIComponent(String(id))}`);
  }
}
