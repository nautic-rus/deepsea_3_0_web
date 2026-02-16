import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../auth/auth.service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { RippleModule } from 'primeng/ripple';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-password-reset',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule, ButtonModule, InputTextModule, PasswordModule, RippleModule],
  templateUrl: './password-reset.html',
  styleUrls: ['./password-reset.scss']
})
export class PasswordResetComponent implements OnInit {
  email: string = '';
  loading: boolean = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  // when token is present in query params we show new-password form
  token: string | null = null;
  password: string = '';
  confirmPassword: string = '';

  // language selector state (mirrors LoginComponent behavior)
  currentLang = 'en';

  constructor(private authService: AuthService, private router: Router, private route: ActivatedRoute, private translate: TranslateService) {
    this.currentLang = (localStorage.getItem('lang') || this.translate.currentLang || this.translate.getDefaultLang() || 'en');
    try { this.translate.use(this.currentLang); } catch (e) {}
  }

  ngOnInit(): void {
    // read token from query params, if present show new-password form
    try {
      this.token = this.route.snapshot.queryParamMap.get('token');
    } catch (e) {
      this.token = null;
    }
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
      this.errorMessage = this.translate.instant('components.passwordReset.ERROR_ENTER_EMAIL'); // TODO: make reactive (refresh on translate.onLangChange)
      return;
    }

    this.loading = true;
    this.authService.requestPasswordReset(this.email).subscribe({
      next: (_res) => {
        this.loading = false;
        this.successMessage = this.translate.instant('components.passwordReset.MSG_SENT_IF_EXISTS'); // TODO: make reactive (refresh on translate.onLangChange)
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
  this.errorMessage = (err.error?.message ?? err.error?.error ?? this.translate.instant('components.passwordReset.ERROR_SENDING')) || null; // TODO: make reactive (refresh on translate.onLangChange)
        console.error('Password reset error', err);
      }
    });
  }

  submitNewPassword(): void {
    this.successMessage = null;
    this.errorMessage = null;
    if (!this.token) {
      this.errorMessage = this.translate.instant('components.passwordReset.ERROR_NO_TOKEN') || 'Missing token';
      return;
    }
    if (!this.password) {
      this.errorMessage = this.translate.instant('components.passwordReset.ERROR_ENTER_PASSWORD') || 'Enter password';
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.errorMessage = this.translate.instant('components.passwordReset.ERROR_PASSWORDS_MISMATCH') || 'Passwords do not match';
      return;
    }

    this.loading = true;
    this.authService.resetPassword(this.token, this.password).subscribe({
      next: (_res) => {
        this.loading = false;
        this.successMessage = this.translate.instant('components.passwordReset.MSG_PASSWORD_UPDATED') || 'Password updated successfully';
        // optionally navigate to login after a short delay
        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
  this.errorMessage = (err.error?.message ?? err.error?.error ?? this.translate.instant('components.passwordReset.ERROR_UPDATING')) || 'Error while updating password';
        console.error('Password reset (set new) error', err);
      }
    });
  }

  backToLogin(): void {
    this.router.navigate(['/login']);
  }
}
