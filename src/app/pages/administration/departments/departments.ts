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
import { DepartmentsService } from './departments.service';

interface Department {
  id: number | string;
  name: string;
  code?: string;
  description?: string | null;
  created_at?: string | null;
}

@Component({
  selector: 'app-admin-departments',
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
  templateUrl: './departments.html',
  styleUrls: ['./departments.scss']
})
export class AdminDepartmentsComponent implements OnInit {
  permissions: Department[] = [];
  selectedPermissions: Department[] = [];
  loading = false;
  error: string | null = null;
  displayDialog = false;
  editModel: Partial<Department> = {};
  isCreating = false;
  formErrors: { name?: string; code?: string } = {};

  constructor(
    private departmentsService: DepartmentsService,
    private cd: ChangeDetectorRef,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translate: TranslateService
  ) {}

  private safeDetect(): void {
    try { this.cd.detectChanges(); } catch (e) { console.warn('safeDetect failed', e); }
  }

  ngOnInit(): void { this.loadPermissions(); }

  onGlobalFilter(table: any, event: Event): void {
    const val = (event && (event.target as HTMLInputElement)) ? (event.target as HTMLInputElement).value : '';
    try { table.filterGlobal(val, 'contains'); } catch (e) { console.warn('onGlobalFilter failed', e); }
  }

  loadPermissions(): void {
    this.loading = true;
    this.error = null;
    this.departmentsService.getPermissions().subscribe({
      next: (data: any) => {
        this.permissions = (data && (data as any).data) ? (data as any).data : (data || []);
        this.loading = false;
        this.safeDetect();
      },
      error: (err: any) => {
        console.error('Failed to load departments:', err);
        this.error = (err && err.message) ? err.message : 'Failed to load items';
        this.loading = false;
        this.safeDetect();
      }
    });
  }

  openNew(): void {
    this.editModel = { name: '', code: '', description: '' };
    this.isCreating = true; this.displayDialog = true;
  }

  deleteSelectedPermissions(): void {
    if (!this.selectedPermissions || !this.selectedPermissions.length) return;
    try { this.messageService.add({ severity: 'info', summary: 'Not implemented', detail: 'Bulk delete is not implemented yet' }); } catch (e) {}
  }

  openEdit(item: Department): void { if (!item) return; this.editModel = { ...item } as any; this.isCreating = false; this.displayDialog = true; }

  savePermission(): void {
    if (!this.editModel) return;
    if (!this.isCreating && (this.editModel.id == null)) return;
    const id = (this.editModel.id != null) ? this.editModel.id : null;
    const payload: Partial<Department> = { name: this.editModel.name, code: (this.editModel as any).code, description: this.editModel.description };
    if (!this.validateForm()) { try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.CONFIRM') || 'Error', detail: 'Please fix form errors' }); } catch (e) {} return; } // TODO: make reactive (refresh on translate.onLangChange)
    this.loading = true;
    if (this.isCreating) {
      this.departmentsService.createPermission(payload as any).subscribe({
        next: (_res: any) => { this.displayDialog = false; this.editModel = {} as any; this.loading = false; this.isCreating = false; try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.CREATE') || 'Success', detail: 'Created' }); } catch (e) {} this.loadPermissions(); this.safeDetect(); }, // TODO: make reactive (refresh on translate.onLangChange)
        error: (err: any) => { console.error('Failed to create item', err); this.error = (err && err.message) ? err.message : 'Failed to create item'; this.loading = false; try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.CREATE') || 'Create', detail: (err && err.message) ? err.message : 'Failed to create permission' }); } catch (e) {} this.safeDetect(); } // TODO: make reactive (refresh on translate.onLangChange)
      });
    } else {
      this.departmentsService.updatePermission(id as any, payload as any).subscribe({
        next: (_res: any) => { this.displayDialog = false; this.editModel = {} as any; this.loading = false; try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.SAVE') || 'Success', detail: 'Updated' }); } catch (e) {} this.loadPermissions(); this.safeDetect(); }, // TODO: make reactive (refresh on translate.onLangChange)
        error: (err: any) => { console.error('Failed to update item', err); this.error = (err && err.message) ? err.message : 'Failed to update item'; this.loading = false; try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.SAVE') || 'Save', detail: (err && err.message) ? err.message : 'Failed to update permission' }); } catch (e) {} this.safeDetect(); } // TODO: make reactive (refresh on translate.onLangChange)
      });
    }
  }

  confirmDelete(item: Department): void {
    if (!item) return; this.confirmationService.confirm({ message: `${this.translate.instant('components.permissions.confirm.DELETE_QUESTION') || 'Delete item'} "${item.name || item.id}"?`, icon: 'pi pi-exclamation-triangle', accept: () => this.deletePermission(item) }); // TODO: make reactive (refresh on translate.onLangChange)
  }

  deletePermission(item: Department): void {
  if (!item) return; this.loading = true; this.departmentsService.deletePermission(item.id).subscribe({ next: (_res: any) => { this.permissions = this.permissions.filter(u => u.id !== item.id); this.selectedPermissions = this.selectedPermissions.filter(s => s.id !== item.id); this.loading = false; try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.DELETE') || 'Delete', detail: 'Deleted' }); } catch (e) {} this.safeDetect(); }, error: (err: any) => { console.error('Failed to delete item', err); this.error = (err && err.message) ? err.message : 'Failed to delete item'; this.loading = false; this.safeDetect(); } }); // TODO: make reactive (refresh on translate.onLangChange)
  }

  exportCSV(): void {
    try { const rows = this.permissions || []; if (!rows.length) { try { this.messageService.add({ severity: 'info', summary: this.translate.instant('MENU.EXPORT') || 'Export', detail: this.translate.instant('MENU.ANY') || 'No users to export' }); } catch (e) {} return; } // TODO: make reactive (refresh on translate.onLangChange)
    const headers = ['ID', this.translate.instant('components.permissions.table.HEADERS.NAME') || 'Name', this.translate.instant('components.permissions.table.HEADERS.CODE') || 'Code', this.translate.instant('components.permissions.table.HEADERS.DESCRIPTION') || 'Description', this.translate.instant('components.permissions.table.HEADERS.CREATED_AT') || 'Created At']; // TODO: make reactive (refresh on translate.onLangChange)
    const esc = (v: any) => { if (v === null || v === undefined) return ''; if (typeof v === 'boolean') return v ? (this.translate.instant('MENU.ACTIVE_YES') || 'Active') : (this.translate.instant('MENU.ACTIVE_NO') || 'Inactive'); const s = String(v); return '"' + s.replace(/"/g, '""') + '"'; }; // TODO: make reactive (refresh on translate.onLangChange)
    const lines = [headers.map(h => '"' + String(h).replace(/"/g, '""') + '"').join(',')]; for (const u of rows) { const line = [esc(u.id), esc(u.name), esc((u as any).code), esc((u as any).description), esc(u.created_at)].join(','); lines.push(line); }
    const csv = lines.join('\n'); const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); const filename = `departments_export_${timestamp}.csv`; const link = document.createElement('a'); const url = URL.createObjectURL(blob); link.href = url; link.setAttribute('download', filename); document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url); try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.EXPORT') || 'Export', detail: this.translate.instant('components.permissions.messages.EXPORTED') || 'Export completed' }); } catch (e) {} } catch (err) { console.error('Export failed', err); try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.EXPORT') || 'Export', detail: 'Export failed' }); } catch (e) {} } // TODO: make reactive (refresh on translate.onLangChange)
  }

  validateForm(): boolean { this.formErrors = {}; const name = (this.editModel && this.editModel.name) ? String(this.editModel.name).trim() : ''; const code = (this.editModel && (this.editModel as any).code) ? String((this.editModel as any).code).trim() : ''; if (!name) this.formErrors.name = (this.translate.instant('components.permissions.form.NAME') || 'Name') + ' is required'; if (!code) this.formErrors.code = (this.translate.instant('components.permissions.form.CODE') || 'Code') + ' is required'; this.safeDetect(); return Object.keys(this.formErrors).length === 0; } // TODO: make reactive (refresh on translate.onLangChange)
}
