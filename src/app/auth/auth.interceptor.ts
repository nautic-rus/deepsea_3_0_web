import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError } from 'rxjs';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    try {
      const token = sessionStorage.getItem('accessToken') ?? localStorage.getItem('accessToken');
      let authReq = req;
      if (token) {
        authReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
      }

      return next.handle(authReq).pipe(
        catchError((err: HttpErrorResponse) => {
          if (err.status === 401) {
            // clear tokens and redirect to login
            try { sessionStorage.removeItem('accessToken'); } catch {}
            try { sessionStorage.removeItem('refreshToken'); } catch {}
            try { localStorage.removeItem('accessToken'); } catch {}
            try { localStorage.removeItem('refreshToken'); } catch {}
            // navigate to login
            try { this.router.navigate(['/login']); } catch (e) { /* ignore */ }
          }
          throw err;
        })
      );
    } catch (e) {
      return next.handle(req);
    }
  }
}
