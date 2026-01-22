import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { RatingModule } from 'primeng/rating';
import { RippleModule } from 'primeng/ripple';
import { InputTextModule } from 'primeng/inputtext';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SkeletonModule } from 'primeng/skeleton';
import { HttpClient } from '@angular/common/http';

interface User {
  id: number | string;
  username: string;
  email: string;
  phone?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  middle_name?: string | null;
  department?: string | null;
  job_title?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ToolbarModule,
    ButtonModule,
    TableModule,
    RatingModule,
    RippleModule,
    InputTextModule,
    InputIconModule,
      IconFieldModule,
      ProgressSpinnerModule
      ,
      SkeletonModule
  ],
  templateUrl: './users.html',
  styleUrls: ['./users.scss']
})
export class AdminUsersComponent implements OnInit {
  users: User[] = [];
  selectedProducts: User[] = [];
  loading = false;
  error: string | null = null;

  constructor(private http: HttpClient) {
    // keep component lightweight; initial data will be loaded in ngOnInit
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.error = null;
    this.http.get<User[]>('/api/users').subscribe({
      next: (data) => {
        // assign inside microtask to avoid ExpressionChangedAfterItHasBeenCheckedError
        Promise.resolve().then(() => {
          this.users = (data && (data as any).data) ? (data as any).data : (data || []);
          this.loading = false;
        });
      },
      error: (err) => {
        console.error('Failed to load users:', err);
        Promise.resolve().then(() => {
          this.error = (err && err.message) ? err.message : 'Failed to load users';
          this.loading = false;
        });
      }
    });
  }

  // Open new user dialog (stub)
  openNew(): void {
    // TODO: implement opening form/modal
    console.log('openNew called');
  }

  // Delete selected products/users (stub)
  deleteSelectedProducts(): void {
    // TODO: implement deletion logic with confirmation
    console.log('deleteSelectedProducts called', this.selectedProducts);
  }

  // Export CSV (stub)
  exportCSV(): void {
    // TODO: implement export
    console.log('exportCSV called');
  }

  // Edit a single user. Minimal inline editor via prompts for now.
  editProduct(user: User): void {
    if (!user) {
      return;
    }

    // simple prompt-based edit: username and email
    const newUsername = window.prompt('Edit username', user.username);
    if (newUsername === null) {
      // user cancelled
      return;
    }
    const newEmail = window.prompt('Edit email', user.email || '');
    if (newEmail === null) {
      return;
    }

    const payload: Partial<User> = {
      username: newUsername,
      email: newEmail
    };

    this.loading = true;
    this.http.put(`/api/users/${encodeURIComponent(String(user.id))}`, payload).subscribe({
      next: (updated: any) => {
        // API may return { data: user } or user directly
        const updatedUser: User = (updated && updated.data) ? updated.data : (updated || payload as any);
        Promise.resolve().then(() => {
          this.users = this.users.map(u => (u.id === user.id ? { ...u, ...updatedUser } : u));
          this.loading = false;
        });
      },
      error: (err) => {
        console.error('Failed to update user', err);
        Promise.resolve().then(() => {
          this.error = (err && err.message) ? err.message : 'Failed to update user';
          this.loading = false;
        });
      }
    });
  }

  // Delete a single user after confirmation
  deleteProduct(user: User): void {
    if (!user) {
      return;
    }

    const confirmed = window.confirm(`Delete user "${user.username || user.id}"?`);
    if (!confirmed) {
      return;
    }

    this.loading = true;
    this.http.delete(`/api/users/${encodeURIComponent(String(user.id))}`).subscribe({
      next: () => {
        Promise.resolve().then(() => {
          this.users = this.users.filter(u => u.id !== user.id);
          // also remove from selectedProducts if present
          this.selectedProducts = this.selectedProducts.filter(s => s.id !== user.id);
          this.loading = false;
        });
      },
      error: (err) => {
        console.error('Failed to delete user', err);
        Promise.resolve().then(() => {
          this.error = (err && err.message) ? err.message : 'Failed to delete user';
          this.loading = false;
        });
      }
    });
  }
}

