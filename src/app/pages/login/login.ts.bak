import { Component, ChangeDetectorRef } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../auth/auth.service';
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
  RouterModule,
  TranslateModule,
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
  // language selector
  languages = [
    { code: 'en', label: 'EN' },
    { code: 'ru', label: 'RU' }
  ];
  currentLang = 'en';
  // note: langOptions removed (using simple buttons as a toggle)

  constructor(private router: Router, private authService: AuthService, private cdr: ChangeDetectorRef, private translate: TranslateService) {
    // initialize language from translate service or localStorage
    this.currentLang = (localStorage.getItem('lang') || this.translate.currentLang || this.translate.getDefaultLang() || 'en');
    try { this.translate.use(this.currentLang); } catch (e) {}
  }

  changeLanguage(lang: string): void {
    if (!lang) return;
    this.currentLang = lang;
    try { this.translate.use(lang); } catch (e) {}
    try { localStorage.setItem('lang', lang); } catch (e) {}
  }

  onLogin(): void {
    this.errorMessage = null;
    if (!this.email || !this.password) {
      this.errorMessage = this.translate.instant('components.login.ERROR_ENTER_CREDENTIALS');
      return;
    }

    this.loading = true;
    const payload = { username: this.email, password: this.password };

    // Delegate to AuthService which performs the HTTP call (withCredentials)
    this.authService.login(payload).subscribe({
      next: (res) => {
        if (res && res.user) {
          try { sessionStorage.setItem('currentUser', JSON.stringify(res.user)); } catch (e) { console.warn('store currentUser failed', e); }
        }
        this.loading = false;
        this.cdr.detectChanges();
        this.router.navigate(['/dashboard']);
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.errorMessage = this.getErrorMessage(err) ?? (err.status === 401 ? this.translate.instant('components.login.ERROR_INVALID_CREDENTIALS') : this.translate.instant('components.login.ERROR_LOGIN_FAILED'));
        console.error('Login error', err);
        this.cdr.detectChanges();
      }
    });
  }


  private getErrorMessage(err: HttpErrorResponse): string | null {
    if (!err || !err.error) { return null; }
    const e = err.error;
    const translate = (s: string) => {
      const key = s.trim().toLowerCase().replace(/\.+$/g, '');
      const map: Record<string, string> = {
        'invalid credentials': this.translate.instant('components.login.ERROR_INVALID_CREDENTIALS'),
        'unauthorized': this.translate.instant('components.login.ERROR_UNAUTHORIZED'),
        'forbidden': this.translate.instant('components.login.ERROR_FORBIDDEN')
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
