import { Component, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { HttpClient } from '@angular/common/http';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { InputTextModule } from 'primeng/inputtext';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { UsersService } from '../../../services/users.service';
import { AuthService } from '../../../auth/auth.service';
import { AppMessageService } from '../../../services/message.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-profile-notifications',
  standalone: true,
  imports: [NgFor, FormsModule, TranslateModule, TableModule, CheckboxModule, Select, ButtonModule, ToolbarModule, InputTextModule, InputIconModule, IconFieldModule, ToastModule],
  providers: [],
  templateUrl: './notifications.html',
  styleUrls: ['./notifications.scss']
})
export class ProfileNotificationsComponent {
  selectedNotifications: any[] = [];
  notifications: any[] = [];
  matrix: any[] = [];
  methods: any[] = [];
  events: any[] = [];
  projectOptions: any[] = [];
  selectedProject: any = null;
  loading = false;

  constructor(private usersService: UsersService, private auth: AuthService, private http: HttpClient, private cd: ChangeDetectorRef,
    private appMsg: AppMessageService
  ) {}

  private safeDetect(): void {
    try {
      this.cd.detectChanges();
    } catch (e) {
      // noop
    }
  }

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
        this.loadProjects();
      },
      error: () => (this.loading = false)
    });
  }

  loadProjects(): void {
    this.http.get('/api/my_projects').subscribe({
      next: (res: any) => {
        const items = (res && res.data) ? res.data : (res || []);
        this.projectOptions = (items || []).map((p: any) => ({
          label: ((p.code || p.key) ? ('[' + (p.code || p.key) + '] ') : '') + (p.name || p.title || String(p.id)),
          value: p.id,
          code: p.code || p.key || ''
        }));
        if (this.projectOptions.length > 0) {
          this.selectedProject = this.projectOptions[0].value;
        }
        // defer change detection to avoid ExpressionChangedAfterItHasBeenCheckedError
        setTimeout(() => {
          this.safeDetect();
          this.loadNotificationSettings(this.selectedProject);
        }, 0);
      },
      error: () => {
        this.projectOptions = [];
        this.selectedProject = null;
        setTimeout(() => {
          this.safeDetect();
          this.loadNotificationSettings(null);
        }, 0);
      }
    });
  }

  loadNotificationSettings(projectId?: number | null): void {
    this.loading = true;
    this.usersService.getNotificationSettings(projectId || undefined).subscribe({
      next: (res: any) => {
        const data = res || {};
        this.events = data.events || [];
        this.methods = data.methods || [];
        this.matrix = data.matrix || [];
        this.loading = false;
        // ensure view is stable after async update
        setTimeout(() => this.safeDetect(), 0);
      },
      error: () => (this.loading = false)
    });
  }

  onToggleMethod(eventObj: any, methodEntry: any, enabled: boolean, row: any, index: number): void {
    const payload = {
      project_id: this.selectedProject ?? null,
      event_id: eventObj?.id,
      method_id: methodEntry?.method?.id || methodEntry?.method_id || methodEntry?.id,
      enabled: !!enabled
    };
    // optimistic UI already applied via ngModel; send update
    this.usersService.createNotificationSetting(payload).subscribe({
      next: () => {
        this.appMsg.success('Настройки уведомлений обновлены');
      },
      error: (err: any) => {
        // revert change on error
        try {
          row.methods[index].enabled = !enabled;
        } catch (e) {}
        this.appMsg.error((err && err.message) ? err.message : 'Failed to update');
        this.safeDetect();
      }
    });
  }

  onProjectChange(projectId: any): void {
    this.selectedProject = projectId;
    this.loadNotificationSettings(projectId);
  }

  trackByMethodId(index: number, m: any): any { return m.id ?? index; }
  trackByIndex(index: number): number { return index; }
}
