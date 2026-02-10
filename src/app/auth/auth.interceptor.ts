import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * HTTP Interceptor for authentication handling:
 * - Attaches withCredentials for API calls (HttpOnly cookies)
 * - Handles 401 errors with automatic token refresh and retry
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private router: Router,
    private auth: AuthService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let authReq = req;

    // Attach withCredentials for API calls
    if (this.isApiRequest(req.url)) {
      authReq = authReq.clone({ withCredentials: true });
    }

    const isRefreshCall = this.isRefreshRequest(req);
    const isAuthCall = this.isAuthRequest(req.url);

    return next.handle(authReq).pipe(
      catchError((err: HttpErrorResponse) => {
        // Don't attempt refresh for auth-related calls to avoid recursion
        if (isRefreshCall || isAuthCall) {
          return throwError(() => err);
        }

        // Handle 401 with refresh attempt
        if (err.status === 401) {
          return this.handle401Error(req, next, err);
        }

        return throwError(() => err);
      })
    );
  }

  /** Check if URL is an API request */
  private isApiRequest(url: string): boolean {
    if (!url) return false;

    if (url.startsWith('/api')) return true;

    try {
      const parsed = new URL(url, window.location.origin);
      return parsed.origin === window.location.origin && parsed.pathname.startsWith('/api');
    } catch {
      return url.includes(window.location.host);
    }
  }

  /** Check if request is a refresh token call */
  private isRefreshRequest(req: HttpRequest<any>): boolean {
    return req.headers.has('x-skip-refresh') || req.url?.includes('/api/auth/refresh');
  }

  /** Check if request is an auth-related call (should not trigger refresh on 401) */
  private isAuthRequest(url: string): boolean {
    return url?.includes('/api/auth/login')
      || url?.includes('/api/auth/logout')
      || url?.includes('/api/auth/me');
  }

  /** Handle 401 error with token refresh */
  private handle401Error(req: HttpRequest<any>, next: HttpHandler, err: HttpErrorResponse): Observable<HttpEvent<any>> {
    // Prevent retry loops
    if (req.headers.get('x-refresh-tried')) {
      this.clearSessionAndRedirect();
      return throwError(() => err);
    }

    return this.auth.refreshToken().pipe(
      switchMap((success) => {
        if (!success) {
          this.clearSessionAndRedirect();
          return throwError(() => err);
        }

        // Retry request with marker to prevent infinite loops
        const retryReq = req.clone({
          headers: req.headers.set('x-refresh-tried', '1'),
          withCredentials: true
        });
        return next.handle(retryReq);
      }),
      catchError((refreshErr) => {
        this.clearSessionAndRedirect();
        return throwError(() => refreshErr);
      })
    );
  }

  /** Clear session storage and redirect to login */
  private clearSessionAndRedirect(): void {
    sessionStorage.removeItem('currentUser');
    this.router.navigate(['/login']);
  }
}
