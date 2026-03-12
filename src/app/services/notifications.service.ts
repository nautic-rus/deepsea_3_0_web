import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private eventsUrl = '/api/notification_events';
  private methodsUrl = '/api/notification_methods';

  constructor(private http: HttpClient) {}

  getNotificationEvents(page = 1, limit = 1000): Observable<any> {
    let params = new HttpParams();
    if (page != null) params = params.set('page', String(page));
    if (limit != null) params = params.set('limit', String(limit));
    return this.http.get<any>(this.eventsUrl, { params }).pipe(
      catchError((err) => throwError(() => err))
    );
  }

  createNotificationEvent(payload: any): Observable<any> {
    return this.http.post<any>(this.eventsUrl, payload).pipe(
      catchError((err) => throwError(() => err))
    );
  }

  updateNotificationEvent(id: string | number, payload: any): Observable<any> {
    const url = `${this.eventsUrl}/${encodeURIComponent(String(id))}`;
    return this.http.put<any>(url, payload).pipe(
      catchError((err) => throwError(() => err))
    );
  }

  deleteNotificationEvent(id: string | number): Observable<any> {
    const url = `${this.eventsUrl}/${encodeURIComponent(String(id))}`;
    return this.http.delete<any>(url).pipe(
      catchError((err) => throwError(() => err))
    );
  }

  /* Notification methods */
  getNotificationMethods(page = 1, limit = 1000): Observable<any> {
    let params = new HttpParams();
    if (page != null) params = params.set('page', String(page));
    if (limit != null) params = params.set('limit', String(limit));
    return this.http.get<any>(this.methodsUrl, { params }).pipe(
      catchError((err) => throwError(() => err))
    );
  }

  createNotificationMethod(payload: any): Observable<any> {
    return this.http.post<any>(this.methodsUrl, payload).pipe(
      catchError((err) => throwError(() => err))
    );
  }

  updateNotificationMethod(id: string | number, payload: any): Observable<any> {
    const url = `${this.methodsUrl}/${encodeURIComponent(String(id))}`;
    return this.http.put<any>(url, payload).pipe(
      catchError((err) => throwError(() => err))
    );
  }

  deleteNotificationMethod(id: string | number): Observable<any> {
    const url = `${this.methodsUrl}/${encodeURIComponent(String(id))}`;
    return this.http.delete<any>(url).pipe(
      catchError((err) => throwError(() => err))
    );
  }
}
