import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private router: Router, private auth: AuthService) {}

  canActivate(): Observable<boolean | UrlTree> {
    // If we have a cached user allow immediately
    const cached = sessionStorage.getItem('currentUser');
    if (cached) { return of(true); }

    // First try to call /me directly (works if access cookie valid)
    return this.auth.me().pipe(
      map((u) => {
        if (u) {
          try { sessionStorage.setItem('currentUser', JSON.stringify(u)); } catch (e) { console.warn('sessionStorage.setItem failed', e); }
          return true;
        }
        return this.router.parseUrl('/login');
      }),
      catchError(() => {
        // If /me failed (access cookie expired), try refresh then /me again
        return this.auth.refreshToken().pipe(
          switchMap((ok) => {
            if (!ok) return of(this.router.parseUrl('/login'));
            return this.auth.me().pipe(
              map(u => {
                if (u) {
                  try { sessionStorage.setItem('currentUser', JSON.stringify(u)); } catch (e) { console.warn('sessionStorage.setItem failed', e); }
                  return true;
                }
                return this.router.parseUrl('/login');
              }),
              catchError(() => of(this.router.parseUrl('/login')))
            );
          }),
          catchError(() => of(this.router.parseUrl('/login')))
        );
      })
    );
  }
}
