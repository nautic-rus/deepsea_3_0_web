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
import { PermissionsService } from './permissions.service';

interface Permission {
  id: number | string;
  name: string;
  code: string;
  description?: string | null;
  created_at?: string | null;
}

@Component({
  selector: 'app-admin-permissions',
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
  templateUrl: './permissions.html',
  styleUrls: ['./permissions.scss']
})
export class AdminPermissionsComponent implements OnInit {
  permissions: Permission[] = [];
  selectedPermissions: Permission[] = [];
  loading = false;
  error: string | null = null;
  // dialog / form state (reused if you want to edit users from permissions)
  displayDialog = false;
  editModel: Partial<Permission> = {};
  isCreating = false;
  // form errors for permission fields
  formErrors: { name?: string; code?: string } = {};

  constructor(
    private permissionsService: PermissionsService,
    private cd: ChangeDetectorRef,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translate: TranslateService
  ) {}

  private safeDetect(): void {
    try {
      this.cd.detectChanges();
    } catch (e) { console.warn('safeDetect failed', e); }
  }

  ngOnInit(): void {
    this.loadPermissions();
  }

  // global filter helper for p-table caption search
  onGlobalFilter(table: any, event: Event): void {
    const val = (event && (event.target as HTMLInputElement)) ? (event.target as HTMLInputElement).value : '';
    try { table.filterGlobal(val, 'contains'); } catch (e) { console.warn('onGlobalFilter failed', e); }
  }

  // load permissions list from API
  loadPermissions(): void {
    this.loading = true;
    this.error = null;
    this.permissionsService.getPermissions().subscribe({
      next: (data) => {
        // expect the API to return an array of permission-like objects
        this.permissions = (data && (data as any).data) ? (data as any).data : (data || []);
        this.loading = false;
        this.safeDetect();
      },
      error: (err) => {
        console.error('Failed to load permissions:', err);
        this.error = (err && err.message) ? err.message : 'Failed to load items';
        this.loading = false;
        this.safeDetect();
      }
    });
  }

  // Open new user dialog
  openNew(): void {
    this.editModel = {
      name: '',
      code: '',
      description: ''
    };
    this.isCreating = true;
    this.displayDialog = true;
  }

  // Delete selected permissions (stub)
  deleteSelectedPermissions(): void {
    if (!this.selectedPermissions || !this.selectedPermissions.length) return;
    const ids = this.selectedPermissions.map(s => s.id).join(', ');
    try {
      this.messageService.add({ severity: 'info', summary: 'Not implemented', detail: 'Bulk delete for permissions is not implemented yet' });
    } catch (e) { console.warn('messageService.add failed', e); }
  }

  // Edit existing permission
  openEdit(item: Permission): void {
    if (!item) return;
    this.editModel = { ...item } as any;
    this.isCreating = false;
    this.displayDialog = true;
  }

  // Save edited or created permission
  savePermission(): void {
    if (!this.editModel) return;
    if (!this.isCreating && (this.editModel.id == null)) return;
    const id = (this.editModel.id != null) ? this.editModel.id : null;

    const payload: Partial<Permission> = {
      name: this.editModel.name,
      code: this.editModel.code,
      description: this.editModel.description
    };

    if (!this.validateForm()) {
      try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.CONFIRM') || 'Error', detail: 'Please fix form errors' }); } catch (e) {}
      return;
    }

    this.loading = true;
    if (this.isCreating) {
      // reuse createUser endpoint if backend supports creating permissions; otherwise adapt
  this.permissionsService.createPermission(payload as any).subscribe({
        next: (created: any) => {
          this.displayDialog = false;
          this.editModel = {} as any;
          this.loading = false;
          this.isCreating = false;
          try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.CREATE') || 'Success', detail: this.translate.instant('components.permissions.messages.CREATED') || 'Created' }); } catch (e) {}
          this.loadPermissions();
          this.safeDetect();
        },
        error: (err) => {
          console.error('Failed to create item', err);
          this.error = (err && err.message) ? err.message : 'Failed to create item';
          this.loading = false;
          try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.CREATE') || 'Create', detail: (err && err.message) ? err.message : 'Failed to create permission' }); } catch (e) {}
          this.safeDetect();
        }
      });
    } else {
  this.permissionsService.updatePermission(id as any, payload as any).subscribe({
        next: (updated: any) => {
          this.displayDialog = false;
          this.editModel = {} as any;
          this.loading = false;
          try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.SAVE') || 'Success', detail: this.translate.instant('components.permissions.messages.UPDATED') || 'Updated' }); } catch (e) {}
          this.loadPermissions();
          this.safeDetect();
        },
        error: (err) => {
          console.error('Failed to update item', err);
          this.error = (err && err.message) ? err.message : 'Failed to update item';
          this.loading = false;
          try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.SAVE') || 'Save', detail: (err && err.message) ? err.message : 'Failed to update permission' }); } catch (e) {}
          this.safeDetect();
        }
      });
      }
  }

  confirmDelete(item: Permission): void {
    if (!item) return;
    this.confirmationService.confirm({
  message: `${this.translate.instant('components.permissions.confirm.DELETE_QUESTION') || 'Delete item'} "${item.name || item.id}"?`,
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.deletePermission(item)
    });
  }
  deletePermission(item: Permission): void {
    if (!item) return;
    this.loading = true;
    this.permissionsService.deletePermission(item.id).subscribe({
      next: () => {
        this.permissions = this.permissions.filter(u => u.id !== item.id);
        this.selectedPermissions = this.selectedPermissions.filter(s => s.id !== item.id);
        this.loading = false;
  try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.DELETE') || 'Delete', detail: this.translate.instant('components.permissions.messages.DELETED') || 'Deleted' }); } catch (e) {}
        this.safeDetect();
      },
      error: (err) => {
        console.error('Failed to delete item', err);
        this.error = (err && err.message) ? err.message : 'Failed to delete item';
        this.loading = false;
        this.safeDetect();
      }
    });
  }

  exportCSV(): void {
    try {
      const rows = this.permissions || [];
      if (!rows.length) {
        try { this.messageService.add({ severity: 'info', summary: this.translate.instant('MENU.EXPORT') || 'Export', detail: this.translate.instant('MENU.ANY') || 'No users to export' }); } catch (e) {}
        return;
      }
  const headers = ['ID', this.translate.instant('components.permissions.table.HEADERS.NAME') || 'Name', this.translate.instant('components.permissions.table.HEADERS.CODE') || 'Code', this.translate.instant('components.permissions.table.HEADERS.DESCRIPTION') || 'Description', this.translate.instant('components.permissions.table.HEADERS.CREATED_AT') || 'Created At'];
      const esc = (v: any) => {
        if (v === null || v === undefined) return '';
        if (typeof v === 'boolean') return v ? (this.translate.instant('MENU.ACTIVE_YES') || 'Active') : (this.translate.instant('MENU.ACTIVE_NO') || 'Inactive');
        const s = String(v);
        return '"' + s.replace(/"/g, '""') + '"';
      };
      const lines = [headers.map(h => '"' + String(h).replace(/"/g, '""') + '"').join(',')];
      for (const u of rows) {
        const line = [esc(u.id), esc(u.name), esc(u.code), esc(u.description), esc(u.created_at)].join(',');
        lines.push(line);
      }
      const csv = lines.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `permissions_export_${timestamp}.csv`;
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.EXPORT') || 'Export', detail: this.translate.instant('components.permissions.messages.EXPORTED') || 'Export completed' }); } catch (e) {}
    } catch (err) {
      console.error('Export failed', err);
      try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.EXPORT') || 'Export', detail: 'Export failed' }); } catch (e) {}
    }
  }

  // basic client-side validation (reused)
  validateForm(): boolean {
    this.formErrors = {};
    const name = (this.editModel && this.editModel.name) ? String(this.editModel.name).trim() : '';
    const code = (this.editModel && this.editModel.code) ? String(this.editModel.code).trim() : '';
  if (!name) this.formErrors.name = (this.translate.instant('components.permissions.form.NAME') || 'Name') + ' is required';
  if (!code) this.formErrors.code = (this.translate.instant('components.permissions.form.CODE') || 'Code') + ' is required';
    this.safeDetect();
    return Object.keys(this.formErrors).length === 0;
  }
}
