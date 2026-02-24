import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { InputTextModule } from 'primeng/inputtext';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';

@Component({
  selector: 'app-profile-notifications',
  standalone: true,
  imports: [CommonModule, TranslateModule, TableModule, ButtonModule, ToolbarModule, InputTextModule, InputIconModule, IconFieldModule],
  templateUrl: './notifications.html',
  styleUrls: ['./notifications.scss']
})
export class ProfileNotificationsComponent {
  selectedNotifications: any[] = [];

  // basic global filter helper (dt is PrimeNG table reference)
  onGlobalFilter(dt: any, event: any): void {
    try {
      const val = event && event.target ? event.target.value : event;
      dt.filterGlobal(val, 'contains');
    } catch (e) {
      // noop
    }
  }
}
