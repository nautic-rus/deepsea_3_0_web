import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { PagesService } from '../services/pages.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  /** Cache allowed paths to avoid repeated API calls within one session */
  private cachedPaths: string[] | null = null;
  /** User identity for whom cachedPaths was fetched */
  private cachedUserKey: string | null = null;

  constructor(
    private router: Router,
    private auth: AuthService,
    private pagesService: PagesService
  ) {}

  canActivate(
    route?: ActivatedRouteSnapshot,
    state?: RouterStateSnapshot
  ): Observable<boolean | UrlTree> {
    const targetUrl = state?.url ?? (route?.routeConfig?.path ? '/' + route.routeConfig.path : '/');

    // If we have a cached user, validate page access
    if (sessionStorage.getItem('currentUser')) {
      return this.checkPagesForUrl(targetUrl);
    }

    // Try to call /me directly (works if access cookie is valid)
    return this.auth.me().pipe(
      switchMap((user) => {
        if (user) {
          this.cacheUser(user);
          return this.checkPagesForUrl(targetUrl);
        }
        return of(this.router.parseUrl('/login'));
      }),
      catchError(() => this.tryRefreshAndRetry(targetUrl))
    );
  }

  /** Attempt token refresh and retry /me */
  private tryRefreshAndRetry(targetUrl: string): Observable<boolean | UrlTree> {
    return this.auth.refreshToken().pipe(
      switchMap((ok) => {
        if (!ok) {
          return of(this.router.parseUrl('/login'));
        }
        return this.auth.me().pipe(
          switchMap((user) => {
            if (user) {
              this.cacheUser(user);
              return this.checkPagesForUrl(targetUrl);
            }
            return of(this.router.parseUrl('/login'));
          }),
          catchError(() => of(this.router.parseUrl('/login')))
        );
      }),
      catchError(() => of(this.router.parseUrl('/login')))
    );
  }

  /** Check if the target URL is in the user's allowed pages */
  private checkPagesForUrl(url: string): Observable<boolean | UrlTree> {
    const normalized = (url || '/').split('?')[0].replace(/\/+$/, '') || '/';

    // Use cached paths if available
    if (this.cachedPaths) {
      return of(this.isPathAllowed(normalized, this.cachedPaths));
    }

    return this.pagesService.getUserPages().pipe(
      map((resp: any) => {
        const raw = this.normalizeResponse(resp);
        const paths = this.collectPaths(raw);
        this.cachedPaths = paths;
        return this.isPathAllowed(normalized, paths);
      }),
      catchError(() => of(this.router.parseUrl('/access')))
    );
  }

  /** Normalize server response to array of pages */
  private normalizeResponse(resp: any): any[] {
    if (Array.isArray(resp)) return resp;
    if (resp?.pages) return resp.pages;
    if (resp?.data) return resp.data;
    return [];
  }

  /** Recursively collect all paths from pages tree */
  private collectPaths(items: any[]): string[] {
    if (!Array.isArray(items)) return [];

    const paths: string[] = [];
    for (const item of items) {
      if (!item) continue;

      const path = (item.path || item.url || '').toString().trim();
      if (path) {
        paths.push(path.startsWith('/') ? path : '/' + path);
      }

      // Check for nested children
      const children = item.children ?? item.items;
      if (Array.isArray(children)) {
        paths.push(...this.collectPaths(children));
      }
    }
    return paths;
  }

  /** Check if normalized URL matches any allowed path */
  private isPathAllowed(normalized: string, paths: string[]): boolean | UrlTree {
    const allowed = paths.some((p) => {
      if (!p) return false;
      const cleanPath = p.replace(/\/+$/, '') || '/';
      return normalized === cleanPath || normalized.startsWith(cleanPath + '/');
    });
    return allowed ? true : this.router.parseUrl('/access');
  }

  /** Cache user in sessionStorage and invalidate paths cache if user changed */
  private cacheUser(user: any): void {
    try {
      const key = user?.id ?? user?.email ?? JSON.stringify(user);
      if (this.cachedUserKey && this.cachedUserKey !== key) {
        // Different user — drop stale page permissions
        this.cachedPaths = null;
      }
      this.cachedUserKey = key;
      sessionStorage.setItem('currentUser', JSON.stringify(user));
    } catch (e) {
      console.warn('Failed to cache user:', e);
    }
  }

  /** Clear cached paths (call on logout or when pages may have changed) */
  clearCache(): void {
    this.cachedPaths = null;
    this.cachedUserKey = null;
  }
}
