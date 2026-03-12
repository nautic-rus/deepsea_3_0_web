import { Component, OnInit, AfterViewInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe, NgIf } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { InputIconModule } from 'primeng/inputicon';
import { ProjectsStorageTypesService } from '../../../services/projects-storage-types.service';
import { UsersService } from '../../../services/users.service';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../auth/auth.service';
import { AvatarService } from '../../../services/avatar.service';
import { IconFieldModule } from 'primeng/iconfield';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { AvatarModule } from 'primeng/avatar';
import { AppMessageService } from '../../../services/message.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-projects-storage-types',
  standalone: true,
  imports: [DatePipe, NgIf, TranslateModule, FormsModule, ToolbarModule, ButtonModule, TableModule, InputTextModule, InputIconModule, IconFieldModule, DialogModule, ToastModule, TagModule, ConfirmDialogModule, AvatarModule],
  providers: [ConfirmationService],
  templateUrl: './storage-types.html',
  styleUrls: ['./storage-types.scss']
})
export class ProjectsStorageTypesComponent implements OnInit, AfterViewInit {
  projects: any[] = [];
  loading = false;
  selectedProjects: any[] = [];
  ownerNames: Record<string, string> = {};
  currentUserId: string | number | null = null;
  displayDialog = false;
  editModel: any = {};
  isCreating = false;
  error: string | null = null;
  usersOptions: { label: string; value: any; avatar?: string | null }[] = [];
  statuses: { label: string; value: any }[] = [];

  constructor(private svc: ProjectsStorageTypesService, private cd: ChangeDetectorRef, private translate: TranslateService, private usersService: UsersService, private confirmationService: ConfirmationService, private auth: AuthService, private avatarService: AvatarService,
    private appMsg: AppMessageService
  ) {}

  initialsFromName(name?: string | null): string { try { return this.avatarService.initialsFromName(name); } catch (e) { return ''; } }
  selectAvatarBg(label?: string | null): string { try { return this.avatarService.selectAvatarBg(label); } catch (e) { return ''; } }
  selectAvatarTextColor(label?: string | null): string { try { return this.avatarService.selectAvatarTextColor(label); } catch (e) { return '#fff'; } }
  private safeDetect(): void { try { this.cd.detectChanges(); } catch (e) { /* noop */ } }

  ngOnInit(): void {
    try { this.auth.me().subscribe({ next: (res: any) => { const user = (res && (res as any).data) ? (res as any).data : res; if (user && (user.id !== undefined && user.id !== null)) { this.currentUserId = user.id; this.ownerNames[String(this.currentUserId)] = this.formatUserName(user) || String(this.currentUserId); } }, error: () => {} }); } catch (e) {}
    try { this.statuses = [ { label: this.translate.instant('MENU.ACTIVE_YES') || 'Active', value: 'active' }, { label: this.translate.instant('MENU.ACTIVE_NO') || 'Inactive', value: 'inactive' }, { label: this.translate.instant('components.projects.STATUS_COMPLETED') || 'Completed', value: 'completed' } ]; } catch (e) { this.statuses = [{ label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }, { label: 'Completed', value: 'completed' }]; }
    this.loadUsersForSelect();
    this.loadStorageTypes();
  }

  ngAfterViewInit(): void { setTimeout(() => { this.safeDetect(); }, 0); }

  private loadUsersForSelect(): void { try { this.usersService.getUsers(1, 1000).subscribe({ next: (res: any) => { const list = (res && res.data) ? res.data : (Array.isArray(res) ? res : (res || [])); this.usersOptions = (list || []).map((u: any) => { let avatar: string | null = null; if (u.avatar_url || u.avatar || u.avatarUrl) { avatar = u.avatar_url || u.avatar || u.avatarUrl || null; } else if (u.avatar_id || u.avatarId) { const aid = u.avatar_id ?? u.avatarId; if (typeof aid === 'number' || (typeof aid === 'string' && String(aid).trim())) { avatar = `/api/storage/${String(aid).trim()}/download`; } } return { label: this.formatUserName(u) || (u.email || String(u.id)), value: u.id, avatar }; }); this.safeDetect(); }, error: () => {} }); } catch (e) {} }

  private loadStorageTypes(): void {
    this.loading = true;
    try {
      this.svc.getStorageTypes().subscribe({ next: (res: any) => {
        const list = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);
        this.projects = list || [];
        this.loadOwnerNames();
        this.loading = false;
        this.safeDetect();
      }, error: () => { this.projects = []; this.loading = false; this.safeDetect(); } });
    } catch (e) { this.projects = []; this.loading = false; }
  }

  private loadOwnerNames(): void { try { const ids = Array.from(new Set((this.projects || []).map(p => p?.owner_id).filter(Boolean))); const idsToFetch = ids.filter(id => !this.ownerNames[String(id)]); if (!idsToFetch.length) return; const calls = idsToFetch.map(id => this.usersService.getUser(id)); forkJoin(calls).subscribe({ next: (responses: any[]) => { responses.forEach((resp: any, idx: number) => { const id = idsToFetch[idx]; const user = (resp && (resp as any).data) ? (resp as any).data : resp; this.ownerNames[String(id)] = this.formatUserName(user) || String(id); }); this.safeDetect(); }, error: () => {} }); } catch (e) {} }

  private formatUserName(user: any): string { if (!user) return ''; const parts = [user.last_name, user.first_name, user.middle_name].filter((s: any) => !!s).map((s: any) => String(s).trim()); return parts.join(' ').trim(); }

  getOwnerName(id: any): string { if (!id && id !== 0) return '—'; return this.ownerNames[String(id)] || String(id); }

  openEdit(item: any): void { if (!item) return; this.editModel = { ...item }; this.isCreating = false; this.displayDialog = true; this.error = null; }

  confirmDelete(item: any): void { if (!item) return; try { this.confirmationService.confirm({ message: `${this.translate.instant('components.projects.confirm.DELETE_QUESTION') || 'Attention! Do you really want to delete project'} ${item.name || item.id}?`, icon: 'pi pi-exclamation-triangle', accept: () => this.deleteItem(item) }); } catch (e) { this.deleteItem(item); } }

  deleteItem(item: any): void { if (!item || !item.id) return; this.loading = true; this.svc.deleteStorageType(item.id).subscribe({ next: () => { this.appMsg.success(this.translate.instant('components.projects.messages.DELETED') || 'Deleted'); this.loadStorageTypes(); this.safeDetect(); this.loading = false; }, error: (err: any) => { this.appMsg.error((err && err.message) ? err.message : 'Failed to delete'); this.loading = false; this.safeDetect(); } }); }

  openNew(): void { this.editModel = { name: '', code: '', description: '' }; this.isCreating = true; this.displayDialog = true; this.error = null; }

  validateForm(): boolean { if (!this.editModel || !this.editModel.name) { this.error = 'Name is required'; return false; } this.error = null; return true; }

  getSeverity(status: any): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' { if (!status) return 'info'; const s = String(status).toLowerCase(); if (s === 'active' || s === 'активный' || s.includes('актив')) return 'success'; if (s === 'inactive' || s === 'disabled' || s === 'завершён' || s === 'завершен' || s.includes('заверш')) return 'danger'; if (s === 'info' || s.includes('info')) return 'info'; return 'warn'; }

  saveProject(): void {
    if (!this.validateForm()) return;
    this.loading = true;
    const payload: any = { name: this.editModel.name, code: this.editModel.code };
    if (this.editModel.description !== undefined) payload.description = this.editModel.description;
    if (this.isCreating) {
      this.svc.createStorageType(payload).subscribe({ next: () => { this.displayDialog = false; this.editModel = {}; this.loading = false; this.isCreating = false; this.appMsg.success(this.translate.instant('components.projects.messages.CREATED') || 'Created'); this.loadStorageTypes(); this.safeDetect(); }, error: (err: any) => { this.error = (err && err.message) ? err.message : 'Failed to create'; this.loading = false; this.appMsg.error(this.error || ''); this.safeDetect(); } });
    } else {
      const id = this.editModel && (this.editModel.id || this.editModel._id || this.editModel.ID);
      if (!id) { this.error = 'id is missing'; this.loading = false; this.safeDetect(); return; }
      if (this.editModel.status !== undefined) payload.status = this.editModel.status;
      if (this.editModel.owner_id !== undefined) payload.owner_id = this.editModel.owner_id;
      this.svc.updateStorageType(id, payload).subscribe({ next: () => { this.displayDialog = false; this.editModel = {}; this.loading = false; this.isCreating = false; this.appMsg.success(this.translate.instant('components.projects.messages.UPDATED') || 'Updated'); this.loadStorageTypes(); this.safeDetect(); }, error: (err: any) => { this.error = (err && err.message) ? err.message : 'Failed to update'; this.loading = false; this.appMsg.error(this.error || ''); this.safeDetect(); } });
    }
  }

  onGlobalFilter(dt: any, event: any): void {
    try {
      const value = event && event.target ? event.target.value : event;
      if (dt && typeof dt.filterGlobal === 'function') dt.filterGlobal(value, 'contains');
    } catch (e) { /* noop */ }
  }

}
