import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../auth/auth.service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { RippleModule } from 'primeng/ripple';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-password-reset',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule, ButtonModule, InputTextModule, RippleModule],
  templateUrl: './password-reset.html',
  styleUrls: ['./password-reset.scss']
})
export class PasswordResetComponent {
  email: string = '';
  loading: boolean = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  // language selector state (mirrors LoginComponent behavior)
  currentLang = 'en';

  constructor(private authService: AuthService, private router: Router, private translate: TranslateService) {
    this.currentLang = (localStorage.getItem('lang') || this.translate.currentLang || this.translate.getDefaultLang() || 'en');
    try { this.translate.use(this.currentLang); } catch (e) {}
  }

  changeLanguage(lang: string): void {
    if (!lang) return;
    this.currentLang = lang;
    try { this.translate.use(lang); } catch (e) {}
    try { localStorage.setItem('lang', lang); } catch (e) {}
  }

  sendReset(): void {
    this.successMessage = null;
    this.errorMessage = null;
    if (!this.email) {
      this.errorMessage = this.translate.instant('components.passwordReset.ERROR_ENTER_EMAIL');
      return;
    }

    this.loading = true;
    this.authService.requestPasswordReset(this.email).subscribe({
      next: (_res) => {
        this.loading = false;
        this.successMessage = this.translate.instant('components.passwordReset.MSG_SENT_IF_EXISTS');
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.errorMessage = err.error?.message ?? err.error?.error ?? this.translate.instant('components.passwordReset.ERROR_SENDING');
        console.error('Password reset error', err);
      }
    });
  }

  backToLogin(): void {
    this.router.navigate(['/login']);
  }
}
