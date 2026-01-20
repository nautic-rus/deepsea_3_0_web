import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean | UrlTree {
    // Check both storages for existing access token
    const token = sessionStorage.getItem('accessToken') ?? localStorage.getItem('accessToken');
    if (token) { return true; }
    // Redirect to login if not authenticated
    return this.router.parseUrl('/login');
  }
}
