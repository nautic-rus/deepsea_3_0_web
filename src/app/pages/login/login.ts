import { Component, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { HttpClient, HttpErrorResponse, HttpClientModule } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { RippleModule } from 'primeng/ripple';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    RouterModule,
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    PasswordModule,
    RippleModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  rememberMe: boolean = false;
  loading: boolean = false;
  errorMessage: string | null = null;

  constructor(private router: Router, private http: HttpClient, private cdr: ChangeDetectorRef) {}

  onLogin(): void {
    this.errorMessage = null;
    if (!this.email || !this.password) {
      this.errorMessage = 'Пожалуйста, введите email и пароль';
      return;
    }

    this.loading = true;
    const payload = { username: this.email, password: this.password };

    this.http.post<any>('/api/auth/login', payload).subscribe({
      next: (res) => {
        this.saveTokens(res);
        if (res.user) {
          try { this.getStorage().setItem('currentUser', JSON.stringify(res.user)); } catch { }
        }
  this.loading = false;
  this.cdr.detectChanges();
  this.router.navigate(['/dashboard']);
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.errorMessage = this.getErrorMessage(err) ?? (err.status === 401 ? 'Неверный логин или пароль.' : 'Ошибка входа. Пожалуйста, попробуйте позже.');
        console.error('Login error', err);
        // Force detect changes so message appears immediately
        this.cdr.detectChanges();
      }
    });
  }

  private getStorage(): Storage {
    return this.rememberMe ? localStorage : sessionStorage;
  }

  private saveTokens(res: any): void {
    const access = res.access_token ?? res.token ?? res.accessToken ?? null;
    const refresh = res.refresh_token ?? res.refreshToken ?? null;
    const expiresAt = res.expires_at ?? res.expiresAt ?? null;
    const storage = this.getStorage();
    const other = this.rememberMe ? sessionStorage : localStorage;

    if (access) {
      storage.setItem('accessToken', access);
      other.removeItem('accessToken');
    }
    if (refresh) {
      storage.setItem('refreshToken', refresh);
      other.removeItem('refreshToken');
    }
    if (expiresAt) {
      storage.setItem('expiresAt', expiresAt);
      other.removeItem('expiresAt');
    }
  }

  private getErrorMessage(err: HttpErrorResponse): string | null {
    if (!err || !err.error) { return null; }
    const e = err.error;
    const translate = (s: string) => {
      const key = s.trim().toLowerCase().replace(/\.+$/g, '');
      const map: Record<string, string> = {
        'invalid credentials': 'Неверный логин или пароль.',
        'unauthorized': 'Требуется авторизация.',
        'forbidden': 'Доступ запрещён.'
      };
      return map[key] ?? s;
    };

    if (typeof e === 'string') { return translate(e); }
    if (e.message) { return translate(e.message); }
    if (e.error) { return translate(e.error); }
    if (Array.isArray(e.messages)) { return e.messages.join('; '); }
    if (typeof e === 'object') {
      const parts: string[] = [];
      for (const k of Object.keys(e)) {
        const v = e[k];
        if (Array.isArray(v)) { parts.push(`${k}: ${v.join(', ')}`); }
        else if (typeof v === 'string') { parts.push(`${k}: ${v}`); }
      }
      return parts.length ? parts.join('; ') : null;
    }
    return null;
  }
}
