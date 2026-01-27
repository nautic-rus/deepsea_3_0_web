import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Attaches Authorization header from in-memory access token and tries refresh on 401.
 * Refresh token is expected to be stored as HttpOnly cookie by the server.
 */
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private router: Router, private auth: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    try {
      let authReq = req;

      // No client-side access token: server issues HttpOnly access/refresh cookies.
      // authReq remains as original; we'll ensure withCredentials for API calls below.

      // For same-origin API calls ensure cookies are sent so refresh endpoint can work.
      // Accept both relative URLs (/api/...) and absolute URLs that resolve to the same origin.
      try {
        let isApi = false;
        if (typeof req.url === 'string') {
          if (req.url.startsWith('/api')) {
            isApi = true;
          } else {
            // Try to parse absolute URL and compare origin with the app origin
            try {
              const parsed = new URL(req.url, window.location.origin);
              if (parsed.origin === window.location.origin && parsed.pathname.startsWith('/api')) {
                isApi = true;
              }
            } catch (e) {
              // If URL parsing fails, fall back to a simple host check
              if (req.url.includes(window.location.host)) {
                isApi = true;
              }
            }
          }
        }

        if (isApi) {
          authReq = authReq.clone({ withCredentials: true });
        }
      } catch (e) {
        // ignore any window/url parsing errors
      }

      // If this request is the refresh call itself or marked to skip, do not attach refresh logic
      const isRefreshCall = req.headers.has('x-skip-refresh') || (typeof req.url === 'string' && req.url.includes('/api/auth/refresh'));
      const isAuthCall = (typeof req.url === 'string' && (req.url.includes('/api/auth/login') || req.url.includes('/api/auth/logout')));

      return next.handle(authReq).pipe(
        catchError((err: HttpErrorResponse) => {
          // If this request is a refresh/login/logout call, don't attempt refresh to avoid recursion
          if (isRefreshCall || isAuthCall) {
            return throwError(() => err);
          }

          // If 401, try one refresh attempt and then retry the original request
          if (err.status === 401) {
            // Avoid retry loops: if request already had a custom header we set, fail
            const alreadyTried = req.headers.get('x-refresh-tried');
            if (alreadyTried) {
              try { sessionStorage.removeItem('currentUser'); } catch (e) { console.warn('sessionStorage.removeItem failed', e); }
              try { this.router.navigate(['/login']); } catch (e) { console.warn('router.navigate failed', e); }
              return throwError(() => err);
            }

            // Attempt refresh using refresh cookie
            return this.auth.refreshToken().pipe(
              switchMap(success => {
                if (!success) {
                  try { sessionStorage.removeItem('currentUser'); } catch (e) { console.warn('sessionStorage.removeItem failed', e); }
                  try { this.router.navigate(['/login']); } catch (e) { console.warn('router.navigate failed', e); }
                  return throwError(() => err);
                }
                // assume server set new HttpOnly cookies on refresh; retry original request
                const retryReq = req.clone({ headers: req.headers.set('x-refresh-tried', '1'), withCredentials: true });
                return next.handle(retryReq);
              }),
              catchError(e => {
                try { sessionStorage.removeItem('currentUser'); } catch (ee) { console.warn('sessionStorage.removeItem failed', ee); }
                try { this.router.navigate(['/login']); } catch (ee) { console.warn('router.navigate failed', ee); }
                return throwError(() => e);
              })
            );
          }
          return throwError(() => err);
        })
      );
    } catch (e) {
      console.warn('AuthInterceptor failure', e);
      return next.handle(req);
    }
  }
}
