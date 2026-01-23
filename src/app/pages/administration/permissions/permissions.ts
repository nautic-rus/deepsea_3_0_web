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
import { HttpClient } from '@angular/common/http';
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
  selectedProducts: Permission[] = [];
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
    private http: HttpClient,
    private cd: ChangeDetectorRef,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translate: TranslateService
  ) {}

  private safeDetect(): void {
    try {
      this.cd.detectChanges();
    } catch (e) {}
  }

  ngOnInit(): void {
    this.loadPermissions();
  }
  loadUsers(): void {
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
        console.error('Failed to load users:', err);
        this.error = (err && err.message) ? err.message : 'Failed to load items';
        this.loading = false;
        this.safeDetect();
      }
    });
  }

  // kept name for compatibility with existing template bindings
  loadPermissions(): void {
    this.loadUsers();
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

  // Delete selected users (stub)
  deleteSelectedProducts(): void {
    if (!this.selectedProducts || !this.selectedProducts.length) return;
    const ids = this.selectedProducts.map(s => s.id).join(', ');
    console.log('bulk delete requested for', ids);
  }

  // Edit existing user
  openEdit(item: Permission): void {
    if (!item) return;
    this.editModel = { ...item } as any;
    this.isCreating = false;
    this.displayDialog = true;
  }

  // Save edited or created user
  saveUser(): void {
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
          try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.CREATE') || 'Success', detail: this.translate.instant('PERMISSIONS.CREATED') || 'Created' }); } catch (e) {}
          this.loadPermissions();
          this.safeDetect();
        },
        error: (err) => {
          console.error('Failed to create item', err);
          this.error = (err && err.message) ? err.message : 'Failed to create item';
          this.loading = false;
          this.safeDetect();
        }
      });
    } else {
  this.permissionsService.updatePermission(id as any, payload as any).subscribe({
        next: (updated: any) => {
          this.displayDialog = false;
          this.editModel = {} as any;
          this.loading = false;
          try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.SAVE') || 'Success', detail: this.translate.instant('PERMISSIONS.UPDATED') || 'Updated' }); } catch (e) {}
          this.loadPermissions();
          this.safeDetect();
        },
        error: (err) => {
          console.error('Failed to update item', err);
          this.error = (err && err.message) ? err.message : 'Failed to update item';
          this.loading = false;
          this.safeDetect();
        }
      });
    }
  }

  confirmDelete(item: Permission): void {
    if (!item) return;
    this.confirmationService.confirm({
      message: `${this.translate.instant('PERMISSIONS.DELETE_QUESTION') || 'Delete item'} "${item.name || item.id}"?`,
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.deleteProduct(item)
    });
  }

  deleteProduct(item: Permission): void {
    if (!item) return;
    this.loading = true;
  this.permissionsService.deletePermission(item.id).subscribe({
      next: () => {
        this.permissions = this.permissions.filter(u => u.id !== item.id);
        this.selectedProducts = this.selectedProducts.filter(s => s.id !== item.id);
        this.loading = false;
        try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.DELETE') || 'Delete', detail: this.translate.instant('PERMISSIONS.DELETED') || 'Deleted' }); } catch (e) {}
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
      const headers = ['ID', this.translate.instant('PERMISSIONS.NAME') || 'Name', this.translate.instant('PERMISSIONS.CODE') || 'Code', this.translate.instant('PERMISSIONS.DESCRIPTION') || 'Description', this.translate.instant('PERMISSIONS.CREATED_AT') || 'Created At'];
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
  try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.EXPORT') || 'Export', detail: this.translate.instant('PERMISSIONS.EXPORTED') || 'Export completed' }); } catch (e) {}
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
    if (!name) this.formErrors.name = (this.translate.instant('PERMISSIONS.NAME') || 'Name') + ' is required';
    if (!code) this.formErrors.code = (this.translate.instant('PERMISSIONS.CODE') || 'Code') + ' is required';
    this.safeDetect();
    return Object.keys(this.formErrors).length === 0;
  }
}
