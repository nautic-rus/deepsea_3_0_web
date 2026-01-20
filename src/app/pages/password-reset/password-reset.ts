import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule, HttpErrorResponse } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { RippleModule } from 'primeng/ripple';

@Component({
  selector: 'app-password-reset',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, ButtonModule, InputTextModule, RippleModule],
  templateUrl: './password-reset.html',
  styleUrls: ['./password-reset.scss']
})
export class PasswordResetComponent {
  email: string = '';
  loading: boolean = false;
  successMessage: string | null = null;
  errorMessage: string | null = null;

  constructor(private http: HttpClient, private router: Router) {}

  sendReset(): void {
    this.successMessage = null;
    this.errorMessage = null;
    if (!this.email) {
      this.errorMessage = 'Пожалуйста, введите email';
      return;
    }

    this.loading = true;
    this.http.post<any>('/api/auth/request_password_reset', { email: this.email }).subscribe({
      next: (_res) => {
        this.loading = false;
        this.successMessage = 'Письмо с инструкциями отправлено, если указанный email существует в системе.';
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.errorMessage = err.error?.message ?? err.error?.error ?? 'Ошибка при отправке запроса. Попробуйте позже.';
        console.error('Password reset error', err);
      }
    });
  }

  backToLogin(): void {
    this.router.navigate(['/login']);
  }
}
