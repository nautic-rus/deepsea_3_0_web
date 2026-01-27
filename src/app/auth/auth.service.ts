import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, throwError, shareReplay, finalize } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // single-flight holder for an ongoing refresh request
  private refreshInProgress: Observable<boolean> | null = null;

  constructor(private http: HttpClient) {}

  // Attempt to refresh access token using HttpOnly refresh cookie.
  // Server is expected to set new HttpOnly access (and optionally refresh) cookies.
  refreshToken(): Observable<boolean> {
    // If a refresh is already in progress, return the same observable so callers share the single network request.
    if (this.refreshInProgress) {
      return this.refreshInProgress;
    }

    // mark this request so the interceptor won't try to refresh again for the refresh call
    const req$ = this.http.post<any>('/api/auth/refresh', {}, { withCredentials: true, headers: { 'x-skip-refresh': '1' } }).pipe(
      map(_res => true),
      catchError(err => {
        // propagate the error to subscribers; caller (interceptor/guard) will handle navigation/cleanup
        return throwError(() => err);
      }),
      finalize(() => {
        // clear the in-progress marker when finished (success or error)
        this.refreshInProgress = null;
      }),
      // share the single HTTP call among concurrent subscribers
      shareReplay(1)
    );

    this.refreshInProgress = req$;
    return req$;
  }

  // Convenience: call /me to get current user (with credentials)
  me(): Observable<any> {
    return this.http.get<any>('/api/auth/me', { withCredentials: true });
  }

  logout(): Observable<any> {
    // server should clear refresh/access cookies
    return this.http.post<any>('/api/auth/logout', {}, { withCredentials: true }).pipe(
      map(res => {
        try { sessionStorage.removeItem('currentUser'); } catch (e) { console.warn('sessionStorage.removeItem failed', e); }
        return res;
      })
    );
  }
}

