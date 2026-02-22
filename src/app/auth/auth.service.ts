import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, catchError, shareReplay, finalize, tap } from 'rxjs';

export interface LoginPayload {
  username: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API_BASE = '/api/auth';

  /** Single-flight holder for ongoing refresh request */
  private refreshInProgress$: Observable<boolean> | null = null;
  /** Cached current user observable to avoid duplicate /me requests */
  private meCache$: Observable<any> | null = null;

  constructor(private http: HttpClient) {}

  /**
   * Attempt to refresh access token using HttpOnly refresh cookie.
   * Server is expected to set new HttpOnly access (and optionally refresh) cookies.
   * Uses single-flight pattern to prevent concurrent refresh requests.
   */
  refreshToken(): Observable<boolean> {
    if (this.refreshInProgress$) {
      return this.refreshInProgress$;
    }

    this.refreshInProgress$ = this.http
      .post<any>(`${this.API_BASE}/refresh`, {}, {
        withCredentials: true,
        headers: { 'x-skip-refresh': '1' }
      })
      .pipe(
        map(() => true),
        catchError(() => of(false)),
        finalize(() => (this.refreshInProgress$ = null)),
        shareReplay(1)
      );

    return this.refreshInProgress$;
  }

  /** Get current authenticated user */
  me(): Observable<any> {
    // Single-flight + cache: reuse ongoing observable and replay last value to new subscribers.
    if (this.meCache$) {
      return this.meCache$;
    }

    this.meCache$ = this.http.get<any>(`${this.API_BASE}/me`, { withCredentials: true }).pipe(
      // cache the most recent value for subsequent subscribers
      shareReplay(1)
    );

    return this.meCache$;
  }

  /** Perform login (server expected to set HttpOnly cookies) */
  login(payload: LoginPayload): Observable<any> {
    return this.http.post<any>(`${this.API_BASE}/login`, payload, { withCredentials: true });
  }

  /** Logout and clear session */
  logout(): Observable<any> {
    return this.http
      .post<any>(`${this.API_BASE}/logout`, {}, { withCredentials: true })
      .pipe(tap(() => {
        sessionStorage.removeItem('currentUser');
        // clear cached /me so next authenticated session refetches
        this.meCache$ = null;
      }));
  }

  /** Request password reset email */
  requestPasswordReset(email: string): Observable<any> {
    return this.http.post<any>(`${this.API_BASE}/request_password_reset`, { email });
  }

  /** Reset password using token from email */
  resetPassword(token: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.API_BASE}/reset_password`, { token, password });
  }
}

