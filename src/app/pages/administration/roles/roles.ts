import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { RolesService } from './roles.service';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

interface Role {
  id: number | string;
  name: string;
  description?: string | null;
  created_at?: string | null;
}

@Component({
  selector: 'app-admin-roles',
  standalone: true,
  imports: [
  CommonModule,
    TranslateModule,
    FormsModule,
    ToolbarModule,
    ButtonModule,
    TableModule,
    InputTextModule,
    DialogModule,
    ConfirmDialogModule,
    ToastModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './roles.html',
  styleUrls: ['./roles.scss']
})
export class AdminRolesComponent implements OnInit {
  roles: Role[] = [];
  selectedRoles: Role[] = [];
  loading = false;
  error: string | null = null;
  roleDialogVisible = false;
  roleModel: Partial<Role> = {};
  isCreatingRole = false;
  // form errors for role fields
  formErrors: { name?: string } = {};
  // selected role and its permissions (shown in right card)
  selectedRole: Role | null = null;
  rolePermissions: any[] = [];
  permissionsLoading = false;

  constructor(
    private cd: ChangeDetectorRef,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translate: TranslateService,
    private rolesService: RolesService
  ) {}

  private safeDetect(): void {
    try { this.cd.detectChanges(); } catch (e) { console.warn('safeDetect failed', e); }
  }

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles(page = 1, limit = 1000): void {
    this.loading = true;
    this.error = null;
    this.rolesService.getRoles(page, limit).subscribe({
      next: (res: any) => {
        this.roles = (res && res.data) ? res.data : (Array.isArray(res) ? res : (res || []));
        this.loading = false;
        this.safeDetect();
      },
      error: (err) => {
        console.error('Failed to load roles:', err);
        this.error = (err && err.message) ? err.message : 'Failed to load roles';
        this.loading = false;
        this.safeDetect();
      }
    });
  }

  openNew(): void {
    this.roleModel = { name: '', description: '' };
    this.isCreatingRole = true;
    this.roleDialogVisible = true;
  }

  // kept for template compatibility: triggers the create-role flow
  openCreateRole(): void {
    this.openNew();
  }

  openEditRole(r: Role): void {
    if (!r) return;
    this.roleModel = { ...r };
    this.isCreatingRole = false;
    this.roleDialogVisible = true;
  }

  // select a role and load its permissions
  selectRole(r: Role): void {
    if (!r) return;
    this.selectedRole = r;
    this.loadRolePermissions(r.id);
  }

  loadRolePermissions(roleId: string | number): void {
    this.permissionsLoading = true;
    this.rolePermissions = [];
    this.rolesService.getRolePermissions(roleId).subscribe({
      next: (res: any) => {
        this.rolePermissions = (res && res.data) ? res.data : (Array.isArray(res) ? res : (res || []));
        this.permissionsLoading = false;
        this.safeDetect();
      },
      error: (err) => {
        console.error('Failed to load role permissions:', err);
        try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.EXPORT') || 'Error', detail: (err && err.message) ? err.message : 'Failed to load permissions' }); } catch (e) {}
        this.permissionsLoading = false;
        this.safeDetect();
      }
    });
  }

  saveRole(): void {
    if (!this.roleModel) return;
    const payload: Partial<Role> = {
      name: this.roleModel.name,
      description: this.roleModel.description
    };

    if (!this.validateRoleForm()) {
      try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.CONFIRM') || 'Error', detail: 'Please fix form errors' }); } catch (e) {}
      return;
    }

    this.loading = true;
    if (this.isCreatingRole) {
      this.rolesService.createRole(payload as any).subscribe({
        next: (created: any) => {
          const item = created && created.data ? created.data : (created || payload);
          const newRole: Role = { id: item.id ?? item._id ?? (this.roles.length ? Math.max(...this.roles.map(x => Number(x.id))) + 1 : 1), name: item.name, description: item.description || '', created_at: item.created_at || new Date().toISOString() };
          this.roles = [newRole, ...this.roles];
          try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.CREATE') || 'Create', detail: this.translate.instant('components.permissions.messages.CREATED') || 'Role created' }); } catch (e) { console.warn('messageService.add failed', e); }
          this.roleDialogVisible = false;
          this.roleModel = {};
          this.isCreatingRole = false;
          this.loading = false;
          this.safeDetect();
        },
        error: (err) => {
          console.error('Failed to create role', err);
          try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.CREATE') || 'Create', detail: (err && err.message) ? err.message : 'Failed to create role' }); } catch (e) {}
          this.loading = false;
          this.safeDetect();
        }
      });
    } else {
      const id = this.roleModel.id as any;
      this.rolesService.updateRole(id, payload as any).subscribe({
        next: (updated: any) => {
          const item = updated && updated.data ? updated.data : (updated || payload);
          this.roles = this.roles.map(r => (r.id === id ? { ...r, ...item } as Role : r));
          try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.SAVE') || 'Save', detail: this.translate.instant('components.permissions.messages.UPDATED') || 'Role updated' }); } catch (e) {}
          this.roleDialogVisible = false;
          this.roleModel = {};
          this.loading = false;
          this.safeDetect();
        },
        error: (err) => {
          console.error('Failed to update role', err);
          try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.SAVE') || 'Save', detail: (err && err.message) ? err.message : 'Failed to update role' }); } catch (e) {}
          this.loading = false;
          this.safeDetect();
        }
      });
    }
  }

    // basic client-side validation (similar to permissions)
    validateRoleForm(): boolean {
      this.formErrors = {};
      const name = (this.roleModel && this.roleModel.name) ? String(this.roleModel.name).trim() : '';
      if (!name) this.formErrors.name = (this.translate.instant('components.permissions.form.NAME') || 'Name') + ' is required';
      this.safeDetect();
      return Object.keys(this.formErrors).length === 0;
    }

  confirmDeleteRole(role: Role): void {
    if (!role) return;
    this.confirmationService.confirm({
      message: `Delete role "${role.name}"?`,
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.deleteRole(role)
    });
  }

  deleteRole(role: Role): void {
    if (!role) return;
    this.loading = true;
    this.rolesService.deleteRole(role.id).subscribe({
      next: () => {
        this.roles = this.roles.filter(r => r.id !== role.id);
        try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.DELETE') || 'Delete', detail: 'Role deleted' }); } catch (e) {}
        this.loading = false;
        this.safeDetect();
      },
      error: (err) => {
        console.error('Failed to delete role', err);
        try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.DELETE') || 'Delete', detail: (err && err.message) ? err.message : 'Failed to delete role' }); } catch (e) {}
        this.loading = false;
        this.safeDetect();
      }
    });
  }

  // bulk delete stub
  deleteSelectedRoles(): void {
    if (!this.selectedRoles || !this.selectedRoles.length) return;
    const ids = this.selectedRoles.map(s => s.id).join(', ');
    try {
      this.messageService.add({ severity: 'info', summary: 'Not implemented', detail: 'Bulk delete for roles is not implemented yet' });
    } catch (e) { console.warn('messageService.add failed', e); }
  }

  exportCSV(): void {
    try {
      const rows = this.roles || [];
      if (!rows.length) {
        try { this.messageService.add({ severity: 'info', summary: this.translate.instant('MENU.EXPORT') || 'Export', detail: this.translate.instant('MENU.ANY') || 'No items to export' }); } catch (e) {}
        return;
      }
      const headers = ['ID', 'Name', 'Description', 'Created At'];
      const esc = (v: any) => {
        if (v === null || v === undefined) return '';
        const s = String(v);
        return '"' + s.replace(/"/g, '""') + '"';
      };
      const lines = [headers.map(h => '"' + String(h).replace(/"/g, '""') + '"').join(',')];
      for (const r of rows) {
        const line = [esc(r.id), esc(r.name), esc(r.description), esc(r.created_at)].join(',');
        lines.push(line);
      }
      const csv = lines.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `roles_export_${timestamp}.csv`;
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.EXPORT') || 'Export', detail: 'Export completed' }); } catch (e) {}
    } catch (err) {
      console.error('Export failed', err);
      try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.EXPORT') || 'Export', detail: 'Export failed' }); } catch (e) {}
    }
  }

  removePermissionFromRole(perm: any): void {
    if (!this.selectedRole || !perm) return;
    this.permissionsLoading = true;
    this.rolesService.deleteRolePermission(this.selectedRole.id as any, perm.id as any).subscribe({
      next: () => {
        this.rolePermissions = this.rolePermissions.filter(p => p.id !== perm.id);
        try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.DELETE') || 'Delete', detail: 'Permission removed from role' }); } catch (e) {}
        this.permissionsLoading = false;
        this.safeDetect();
      },
      error: (err) => {
        console.error('Failed to remove permission from role', err);
        try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.DELETE') || 'Delete', detail: (err && err.message) ? err.message : 'Failed to remove permission' }); } catch (e) {}
        this.permissionsLoading = false;
        this.safeDetect();
      }
    });
  }
}
