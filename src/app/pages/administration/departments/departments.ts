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
import { Select } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { DepartmentsService } from '../../../services/departments.service';
import { UsersService } from '../../../services/users.service';
import { AvatarService } from '../../../services/avatar.service';
import { AvatarModule } from 'primeng/avatar';

interface Department {
 id: number | string;
 name: string;
 manager_id?: number | string | null;
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
 ToastModule,
 Select,
 AvatarModule
 ],
 providers: [ConfirmationService, MessageService],
 templateUrl: './departments.html',
 styleUrls: ['./departments.scss']
})
export class AdminDepartmentsComponent implements OnInit {
 permissions: Department[] = [];
 selectedPermissions: Department[] = [];
 usersOptions: { label: string; value: any; avatar?: string | null }[] = [];
 loading = false;
 error: string | null = null;
 displayDialog = false;
 editModel: Partial<Department> = {};
 isCreating = false;
 formErrors: { name?: string; manager_id?: string } = {};

 constructor(
 private departmentsService: DepartmentsService,
 private usersService: UsersService,
 private avatarService: AvatarService,
 private cd: ChangeDetectorRef,
 private confirmationService: ConfirmationService,
 private messageService: MessageService,
 private translate: TranslateService
 ) {}

 private safeDetect(): void {
 try { this.cd.detectChanges(); } catch (e) { }
 }

loadUsers(): void {
	try {
		this.usersService.getUsers(1, 1000).subscribe({
			next: (res: any) => {
				const items = (res && res.data) ? res.data : (res || []);
				this.usersOptions = (items || []).map((u: any) => {
					const label = this.formatUserFullName(u);
					let avatar: string | null = null;
					if (u.avatar_url || u.avatar || u.avatarUrl) {
						avatar = u.avatar_url || u.avatar || u.avatarUrl || null;
					} else if (u.avatar_id || u.avatarId) {
						const aid = u.avatar_id ?? u.avatarId;
						if (typeof aid === 'number' || (typeof aid === 'string' && String(aid).trim())) {
							avatar = `/api/storage/${String(aid).trim()}/download`;
						}
					}
					return { label, value: u.id, avatar };
				});
				try { this.cd.detectChanges(); } catch (e) { }
			},
			error: (err: any) => { console.warn('Failed to load users', err); this.usersOptions = []; try { this.cd.detectChanges(); } catch (e) { } }
		});
	} catch (e) { console.warn('Failed to load users', e); this.usersOptions = []; try { this.cd.detectChanges(); } catch (err) { } }
}

ngOnInit(): void { this.loadPermissions(); this.loadUsers(); }

 onGlobalFilter(table: any, event: Event): void {
 const val = (event && (event.target as HTMLInputElement)) ? (event.target as HTMLInputElement).value : '';
 try { table.filterGlobal(val, 'contains'); } catch (e) { }
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
 this.error = (err && err.message) ? err.message : 'Failed to load items';
 this.loading = false;
 this.safeDetect();
 }
 });
 }

 openNew(): void {
 this.editModel = { name: '', manager_id: null, description: '' };
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
 const payload: Partial<Department> = { name: this.editModel.name, manager_id: (this.editModel as any).manager_id, description: this.editModel.description };
 if (!this.validateForm()) { try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.CONFIRM') || 'Error', detail: 'Please fix form errors' }); } catch (e) {} return; } // TODO: make reactive (refresh on translate.onLangChange)
 this.loading = true;
 if (this.isCreating) {
 this.departmentsService.createPermission(payload as any).subscribe({
 next: () => { this.displayDialog = false; this.editModel = {} as any; this.loading = false; this.isCreating = false; try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.CREATE') || 'Success', detail: 'Created' }); } catch (e) {} this.loadPermissions(); this.safeDetect(); }, // TODO: make reactive (refresh on translate.onLangChange)
 error: (err: any) => { this.error = (err && err.message) ? err.message : 'Failed to create item'; this.loading = false; try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.CREATE') || 'Create', detail: (err && err.message) ? err.message : 'Failed to create permission' }); } catch (e) {} this.safeDetect(); } // TODO: make reactive (refresh on translate.onLangChange)
 });
 } else {
 this.departmentsService.updatePermission(id as any, payload as any).subscribe({
 next: () => { this.displayDialog = false; this.editModel = {} as any; this.loading = false; try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.SAVE') || 'Success', detail: 'Updated' }); } catch (e) {} this.loadPermissions(); this.safeDetect(); }, // TODO: make reactive (refresh on translate.onLangChange)
 error: (err: any) => { this.error = (err && err.message) ? err.message : 'Failed to update item'; this.loading = false; try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.SAVE') || 'Save', detail: (err && err.message) ? err.message : 'Failed to update permission' }); } catch (e) {} this.safeDetect(); } // TODO: make reactive (refresh on translate.onLangChange)
 });
 }
 }

 confirmDelete(item: Department): void {
 if (!item) return; this.confirmationService.confirm({ message: `${this.translate.instant('components.permissions.confirm.DELETE_QUESTION') || 'Delete item'} "${item.name || item.id}"?`, icon: 'pi pi-exclamation-triangle', accept: () => this.deletePermission(item) }); // TODO: make reactive (refresh on translate.onLangChange)
 }

 deletePermission(item: Department): void {
 if (!item) return; this.loading = true; this.departmentsService.deletePermission(item.id).subscribe({ next: () => { this.permissions = this.permissions.filter(u => u.id !== item.id); this.selectedPermissions = this.selectedPermissions.filter(s => s.id !== item.id); this.loading = false; try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.DELETE') || 'Delete', detail: 'Deleted' }); } catch (e) {} this.safeDetect(); }, error: (err: any) => { this.error = (err && err.message) ? err.message : 'Failed to delete item'; this.loading = false; this.safeDetect(); } }); // TODO: make reactive (refresh on translate.onLangChange)
 }

 exportCSV(): void {
 try { const rows = this.permissions || []; if (!rows.length) { try { this.messageService.add({ severity: 'info', summary: this.translate.instant('MENU.EXPORT') || 'Export', detail: this.translate.instant('MENU.ANY') || 'No users to export' }); } catch (e) {} return; } // TODO: make reactive (refresh on translate.onLangChange)
 const headers = ['ID', this.translate.instant('components.permissions.table.HEADERS.NAME') || 'Name', this.translate.instant('components.departments.table.HEADERS.MANAGER') || 'Manager', this.translate.instant('components.permissions.table.HEADERS.DESCRIPTION') || 'Description', this.translate.instant('components.permissions.table.HEADERS.CREATED_AT') || 'Created At']; // TODO: make reactive (refresh on translate.onLangChange)
 const esc = (v: any) => { if (v === null || v === undefined) return ''; if (typeof v === 'boolean') return v ? (this.translate.instant('MENU.ACTIVE_YES') || 'Active') : (this.translate.instant('MENU.ACTIVE_NO') || 'Inactive'); const s = String(v); return '"' + s.replace(/"/g, '""') + '"'; }; // TODO: make reactive (refresh on translate.onLangChange)
 const lines = [headers.map(h => '"' + String(h).replace(/"/g, '""') + '"').join(',')]; for (const u of rows) { const line = [esc(u.id), esc(u.name), esc((u as any).manager_id), esc((u as any).description), esc(u.created_at)].join(','); lines.push(line); }
 const csv = lines.join('\n'); const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); const filename = `departments_export_${timestamp}.csv`; const link = document.createElement('a'); const url = URL.createObjectURL(blob); link.href = url; link.setAttribute('download', filename); document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url); try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.EXPORT') || 'Export', detail: this.translate.instant('components.permissions.messages.EXPORTED') || 'Export completed' }); } catch (e) {} } catch (err) { try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.EXPORT') || 'Export', detail: 'Export failed' }); } catch (e) {} } // TODO: make reactive (refresh on translate.onLangChange)
 }

 validateForm(): boolean { this.formErrors = {}; const name = (this.editModel && this.editModel.name) ? String(this.editModel.name).trim() : ''; if (!name) this.formErrors.name = (this.translate.instant('components.permissions.form.NAME') || 'Name') + ' is required'; this.safeDetect(); return Object.keys(this.formErrors).length === 0; } // TODO: make reactive (refresh on translate.onLangChange)

 initialsFromName(name?: string | null): string {
  return this.avatarService.initialsFromName(name);
 }

 selectAvatarBg(label?: string | null): string {
  return this.avatarService.selectAvatarBg(label);
 }

 selectAvatarTextColor(label?: string | null): string {
  return this.avatarService.selectAvatarTextColor(label);
 }

formatSurnameInitials(item: any): string { try { return this.avatarService.formatSurnameInitials(item); } catch (e) { return '-'; } }

formatUserFullName(u: any): string {
	try {
		if (!u) return '';
		const full = u.full_name ?? u.fullName ?? null;
		if (full && String(full).trim()) return String(full).trim();
		const surname = String(u.last_name ?? u.surname ?? u.lastName ?? u.family ?? '').trim();
		const name = String(u.first_name ?? u.firstName ?? u.name ?? '').trim();
		const patronymic = String(u.middle_name ?? u.patronymic ?? u.middleName ?? '').trim();
		const parts = [surname, name, patronymic].filter(p => p && p.length);
		if (parts.length) return parts.join(' ');
		if (u.email) return String(u.email);
		return String(u.id ?? '');
	} catch (e) {
		return String(u && (u.full_name || u.name || u.email || u.id) || '');
	}
}

issueAvatarColor(user: any): string { try { return this.avatarService.issueAvatarColor(user); } catch (e) { return ''; } }
issueAvatarTextColor(user: any): string { try { return this.avatarService.issueAvatarTextColor(user); } catch (e) { return ''; } }

managerAvatar(item: any): string | null {
	try {
		if (!item) return null;
		const direct = item.manager_avatar_url || item.manager_avatar || item.manager_avatarUrl || null;
		if (direct) return direct;
		const aid = item.manager_avatar_id ?? item.manager_avatarId ?? item.managerAvatarId ?? null;
		if (aid !== null && aid !== undefined && (typeof aid === 'number' || (typeof aid === 'string' && String(aid).trim()))) {
			return `/api/storage/${String(aid).trim()}/download`;
		}
		const uid = item.manager_id ?? item.managerId ?? null;
		if (uid !== null && uid !== undefined) {
			const found = (this.usersOptions || []).find(u => String(u.value) === String(uid));
			if (found && found.avatar) return found.avatar || null;
		}
		return null;
	} catch (e) { return null; }
}

}

