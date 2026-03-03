import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { InputTextModule } from 'primeng/inputtext';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { UsersService } from '../../../services/users.service';
import { AuthService } from '../../../auth/auth.service';

@Component({
  selector: 'app-profile-notifications',
  standalone: true,
  imports: [CommonModule, TranslateModule, TableModule, ButtonModule, ToolbarModule, InputTextModule, InputIconModule, IconFieldModule],
  templateUrl: './notifications.html',
  styleUrls: ['./notifications.scss']
})
export class ProfileNotificationsComponent {
  selectedNotifications: any[] = [];
  notifications: any[] = [];
  loading = false;

  constructor(private usersService: UsersService, private auth: AuthService) {}

  // basic global filter helper (dt is PrimeNG table reference)
  onGlobalFilter(dt: any, event: any): void {
    try {
      const val = event && event.target ? event.target.value : event;
      dt.filterGlobal(val, 'contains');
    } catch (e) {
      // noop
    }
  }

  ngOnInit(): void {
    this.loading = true;
    this.auth.me().subscribe({
      next: (user) => {
        const id = user?.id;
        if (!id) {
          this.loading = false;
          return;
        }
        this.usersService.getNotificationSettings(id).subscribe({
          next: (res) => {
            this.notifications = res?.data || [];
            this.loading = false;
          },
          error: () => (this.loading = false)
        });
      },
      error: () => (this.loading = false)
    });
  }
}
