import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class JobTitlesService {
  private baseUrl = '/api/job_titles';

  constructor(private http: HttpClient) {}

  getJobTitles(page = 1, limit = 1000): Observable<any> {
    let params = new HttpParams();
    if (page != null) params = params.set('page', String(page));
    if (limit != null) params = params.set('limit', String(limit));
    return this.http.get<any>(this.baseUrl, { params }).pipe(
      catchError((err) => throwError(() => err))
    );
  }

  createJobTitle(payload: any): Observable<any> {
    return this.http.post<any>(this.baseUrl, payload).pipe(
      catchError((err) => throwError(() => err))
    );
  }

  updateJobTitle(id: string | number, payload: any): Observable<any> {
    const url = `${this.baseUrl}/${id}`;
    return this.http.put<any>(url, payload).pipe(
      catchError((err) => throwError(() => err))
    );
  }

  deleteJobTitle(id: string | number): Observable<any> {
    const url = `${this.baseUrl}/${id}`;
    return this.http.delete<any>(url).pipe(
      catchError((err) => throwError(() => err))
    );
  }
}
