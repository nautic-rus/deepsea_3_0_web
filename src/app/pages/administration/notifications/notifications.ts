import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { RippleModule } from 'primeng/ripple';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { InputMaskModule } from 'primeng/inputmask';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SkeletonModule } from 'primeng/skeleton';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { NotificationsService } from '../../../services/notifications.service';

interface NotificationItem {
  id: number | string;
  name: string;
  description?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

@Component({
  selector: 'app-admin-notifications',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    ToolbarModule,
    ButtonModule,
    TableModule,
    RippleModule,
    InputTextModule,
    DialogModule,
    InputMaskModule,
    MultiSelectModule,
    InputIconModule,
    IconFieldModule,
    ProgressSpinnerModule,
    SkeletonModule,
    TagModule,
    ConfirmDialogModule,
    ToastModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './notifications.html',
  styleUrls: ['./notifications.scss']
})
export class AdminNotificationsComponent implements OnInit {
  activeTab: 'events' | 'methods' = 'events';
  notificationEvents: NotificationItem[] = [];
  selectedNotificationEvents: NotificationItem[] = [];
  loading = false;
  error: string | null = null;
  displayEventDialog = false;
  editEventModel: Partial<NotificationItem> = {};
  isCreatingEvent = false;
  formErrors: { name?: string } = {};

  notificationMethods: NotificationItem[] = [];
  selectedNotificationMethods: NotificationItem[] = [];
  loadingMethods = false;
  displayMethodDialog = false;
  editMethodModel: Partial<NotificationItem> = {};
  isCreatingMethod = false;

  constructor(
    private notificationsService: NotificationsService,
    private cd: ChangeDetectorRef,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translate: TranslateService
  ) {}

  private safeDetect(): void { try { this.cd.detectChanges(); } catch (e) { } }

  ngOnInit(): void { this.loadNotificationEvents(); this.loadNotificationMethods(); }

  onGlobalFilterEvents(table: any, event: Event): void { const val = (event && (event.target as HTMLInputElement)) ? (event.target as HTMLInputElement).value : ''; try { table.filterGlobal(val, 'contains'); } catch (e) { } }
  onGlobalFilterMethods(table: any, event: Event): void { const val = (event && (event.target as HTMLInputElement)) ? (event.target as HTMLInputElement).value : ''; try { table.filterGlobal(val, 'contains'); } catch (e) { } }

  loadNotificationEvents(): void {
    this.loading = true; this.error = null;
    this.notificationsService.getNotificationEvents().subscribe({
      next: (data: any) => { this.notificationEvents = (data && data.data) ? data.data : (data || []); this.loading = false; this.safeDetect(); },
      error: (err: any) => { this.error = (err && err.message) ? err.message : 'Failed to load items'; this.loading = false; this.safeDetect(); }
    });
  }

  loadNotificationMethods(): void {
    this.loadingMethods = true;
    this.notificationsService.getNotificationMethods().subscribe({
      next: (data: any) => { this.notificationMethods = (data && data.data) ? data.data : (data || []); this.loadingMethods = false; this.safeDetect(); },
      error: (err: any) => { this.error = (err && err.message) ? err.message : 'Failed to load methods'; this.loadingMethods = false; this.safeDetect(); }
    });
  }

  openNewEvent(): void { this.editEventModel = { name: '', description: '' }; this.isCreatingEvent = true; this.displayEventDialog = true; }

  openNewMethod(): void { this.editMethodModel = { name: '', description: '' }; this.isCreatingMethod = true; this.displayMethodDialog = true; }

  deleteSelectedNotificationEvents(): void { if (!this.selectedNotificationEvents || !this.selectedNotificationEvents.length) return; try { this.messageService.add({ severity: 'info', summary: 'Not implemented', detail: 'Bulk delete is not implemented yet' }); } catch (e) {} }

  openEditEvent(item: NotificationItem): void { if (!item) return; this.editEventModel = { ...item } as any; this.isCreatingEvent = false; this.displayEventDialog = true; }

  saveNotificationEvent(): void {
    if (!this.editEventModel) return;
    if (!this.isCreatingEvent && (this.editEventModel.id == null)) return;
    const id = (this.editEventModel.id != null) ? this.editEventModel.id : null;
    const payload: Partial<NotificationItem> = { name: this.editEventModel.name, description: this.editEventModel.description };

    if (!this.validateEventForm()) {
      try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.CONFIRM') || 'Error', detail: 'Please fix form errors' }); } catch (e) {}
      return;
    }

    this.loading = true;
    if (this.isCreatingEvent) {
      this.notificationsService.createNotificationEvent(payload as any).subscribe({
        next: () => {
          this.displayEventDialog = false; this.editEventModel = {} as any; this.loading = false; this.isCreatingEvent = false;
          try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.CREATE') || 'Success', detail: 'Created' }); } catch (e) {}
          this.loadNotificationEvents(); this.safeDetect();
        },
        error: (err: any) => {
          this.error = (err && err.message) ? err.message : 'Failed to create item'; this.loading = false;
          try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.CREATE') || 'Create', detail: (err && err.message) ? err.message : 'Failed to create' }); } catch (e) {}
          this.safeDetect();
        }
      });
    } else {
      this.notificationsService.updateNotificationEvent(id as any, payload as any).subscribe({
        next: () => {
          this.displayEventDialog = false; this.editEventModel = {} as any; this.loading = false; try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.SAVE') || 'Success', detail: 'Updated' }); } catch (e) {}
          this.loadNotificationEvents(); this.safeDetect();
        },
        error: (err: any) => { this.error = (err && err.message) ? err.message : 'Failed to update item'; this.loading = false; try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.SAVE') || 'Save', detail: (err && err.message) ? err.message : 'Failed to update' }); } catch (e) {} this.safeDetect(); }
      });
    }
  }

  confirmDeleteEvent(item: NotificationItem): void { if (!item) return; this.confirmationService.confirm({ message: `${this.translate.instant('MENU.DELETE') || 'Delete'} "${item.name || item.id}"?`, icon: 'pi pi-exclamation-triangle', accept: () => this.deleteNotificationEvent(item) }); }

  deleteNotificationEvent(item: NotificationItem): void { if (!item) return; this.loading = true; this.notificationsService.deleteNotificationEvent(item.id).subscribe({ next: () => { this.notificationEvents = this.notificationEvents.filter(u => u.id !== item.id); this.selectedNotificationEvents = (this.selectedNotificationEvents || []).filter(s => s.id !== item.id); this.loading = false; try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.DELETE') || 'Delete', detail: 'Deleted' }); } catch (e) {} this.safeDetect(); }, error: (err: any) => { this.error = (err && err.message) ? err.message : 'Failed to delete item'; this.loading = false; this.safeDetect(); } }); }

  exportEventsCSV(): void {
    try {
      const rows = this.notificationEvents || [];
      if (!rows.length) { try { this.messageService.add({ severity: 'info', summary: this.translate.instant('MENU.EXPORT') || 'Export', detail: this.translate.instant('MENU.ANY') || 'No items to export' }); } catch (e) {} return; }

      const headers = [ 'ID', this.translate.instant('components.permissions.table.HEADERS.NAME') || 'Name', this.translate.instant('components.permissions.table.HEADERS.DESCRIPTION') || 'Description', this.translate.instant('components.permissions.table.HEADERS.CREATED_AT') || 'Created At' ];

      const esc = (v: any) => { if (v === null || v === undefined) return ''; if (typeof v === 'boolean') return v ? (this.translate.instant('MENU.ACTIVE_YES') || 'Active') : (this.translate.instant('MENU.ACTIVE_NO') || 'Inactive'); const s = String(v); return '"' + s.replace(/"/g, '""') + '"'; };

      const lines = [headers.map(h => '"' + String(h).replace(/"/g, '""') + '"').join(',')];
      for (const u of rows) { const line = [esc(u.id), esc(u.name), esc((u as any).description), esc(u.created_at)].join(','); lines.push(line); }

      const csv = lines.join('\n'); const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); const filename = `notification_events_export_${timestamp}.csv`; const link = document.createElement('a'); const url = URL.createObjectURL(blob); link.href = url; link.setAttribute('download', filename); document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);

      try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.EXPORT') || 'Export', detail: this.translate.instant('components.permissions.messages.EXPORTED') || 'Export completed' }); } catch (e) {}
    } catch (err) { try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.EXPORT') || 'Export', detail: 'Export failed' }); } catch (e) {} }
  }

  exportMethodsCSV(): void {
    try {
      const rows = this.notificationMethods || [];
      if (!rows.length) { try { this.messageService.add({ severity: 'info', summary: this.translate.instant('MENU.EXPORT') || 'Export', detail: this.translate.instant('MENU.ANY') || 'No items to export' }); } catch (e) {} return; }

      const headers = [ 'ID', this.translate.instant('components.permissions.table.HEADERS.NAME') || 'Name', this.translate.instant('components.permissions.table.HEADERS.DESCRIPTION') || 'Description', this.translate.instant('components.permissions.table.HEADERS.CREATED_AT') || 'Created At' ];

      const esc = (v: any) => { if (v === null || v === undefined) return ''; if (typeof v === 'boolean') return v ? (this.translate.instant('MENU.ACTIVE_YES') || 'Active') : (this.translate.instant('MENU.ACTIVE_NO') || 'Inactive'); const s = String(v); return '"' + s.replace(/"/g, '""') + '"'; };

      const lines = [headers.map(h => '"' + String(h).replace(/"/g, '""') + '"').join(',')];
      for (const u of rows) { const line = [esc(u.id), esc(u.name), esc((u as any).description), esc(u.created_at)].join(','); lines.push(line); }

      const csv = lines.join('\n'); const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); const filename = `notification_methods_export_${timestamp}.csv`; const link = document.createElement('a'); const url = URL.createObjectURL(blob); link.href = url; link.setAttribute('download', filename); document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);

      try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.EXPORT') || 'Export', detail: this.translate.instant('components.permissions.messages.EXPORTED') || 'Export completed' }); } catch (e) {}
    } catch (err) { try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.EXPORT') || 'Export', detail: 'Export failed' }); } catch (e) {} }
  }

  /* Methods handlers */
  openEditMethod(item: NotificationItem): void { if (!item) return; this.editMethodModel = { ...item } as any; this.isCreatingMethod = false; this.displayMethodDialog = true; }

  saveNotificationMethod(): void {
    if (!this.editMethodModel) return; if (!this.isCreatingMethod && (this.editMethodModel.id == null)) return;
    const id = (this.editMethodModel.id != null) ? this.editMethodModel.id : null;
    const payload: Partial<NotificationItem> = { name: this.editMethodModel.name, description: this.editMethodModel.description };

    this.loadingMethods = true;
    if (this.isCreatingMethod) {
      this.notificationsService.createNotificationMethod(payload as any).subscribe({ next: () => { this.displayMethodDialog = false; this.editMethodModel = {} as any; this.loadingMethods = false; this.isCreatingMethod = false; try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.CREATE') || 'Success', detail: 'Created' }); } catch (e) {} this.loadNotificationMethods(); this.safeDetect(); }, error: (err: any) => { this.error = (err && err.message) ? err.message : 'Failed to create method'; this.loadingMethods = false; try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.CREATE') || 'Create', detail: (err && err.message) ? err.message : 'Failed to create' }); } catch (e) {} this.safeDetect(); } });
    } else {
      this.notificationsService.updateNotificationMethod(id as any, payload as any).subscribe({ next: () => { this.displayMethodDialog = false; this.editMethodModel = {} as any; this.loadingMethods = false; try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.SAVE') || 'Success', detail: 'Updated' }); } catch (e) {} this.loadNotificationMethods(); this.safeDetect(); }, error: (err: any) => { this.error = (err && err.message) ? err.message : 'Failed to update method'; this.loadingMethods = false; try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.SAVE') || 'Save', detail: (err && err.message) ? err.message : 'Failed to update' }); } catch (e) {} this.safeDetect(); } });
    }
  }

  confirmDeleteMethod(item: NotificationItem): void { if (!item) return; this.confirmationService.confirm({ message: `${this.translate.instant('MENU.DELETE') || 'Delete'} "${item.name || item.id}"?`, icon: 'pi pi-exclamation-triangle', accept: () => this.deleteNotificationMethod(item) }); }

  deleteNotificationMethod(item: NotificationItem): void { if (!item) return; this.loadingMethods = true; this.notificationsService.deleteNotificationMethod(item.id).subscribe({ next: () => { this.notificationMethods = this.notificationMethods.filter(u => u.id !== item.id); this.selectedNotificationMethods = (this.selectedNotificationMethods || []).filter(s => s.id !== item.id); this.loadingMethods = false; try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.DELETE') || 'Delete', detail: 'Deleted' }); } catch (e) {} this.safeDetect(); }, error: (err: any) => { this.error = (err && err.message) ? err.message : 'Failed to delete method'; this.loadingMethods = false; this.safeDetect(); } }); }

  validateEventForm(): boolean {
    this.formErrors = {};
    const name = (this.editEventModel && this.editEventModel.name) ? String(this.editEventModel.name).trim() : '';
    if (!name) { this.formErrors.name = (this.translate.instant('components.permissions.form.NAME') || 'Name') + ' is required'; }
    this.safeDetect();
    return Object.keys(this.formErrors).length === 0;
  }
}

