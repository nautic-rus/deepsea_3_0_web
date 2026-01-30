import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { InputIconModule } from 'primeng/inputicon';
import { ProjectsUsersService } from './projects-users.service';
import { Injectable } from '@angular/core';
import { UsersService } from '../../administration/users/users.service';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../auth/auth.service';
import { IconFieldModule } from 'primeng/iconfield';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Select } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';

@Component({
  selector: 'app-projects-users',
  standalone: true,
  imports: [CommonModule, TranslateModule, FormsModule, ToolbarModule, ButtonModule, TableModule, InputTextModule, InputIconModule, IconFieldModule, DialogModule, ToastModule, TagModule, ConfirmDialogModule, Select, MultiSelectModule],
  providers: [MessageService, ConfirmationService],
  templateUrl: './projects-users.html',
  styleUrls: ['./projects-users.scss']
})
export class ProjectsUsersComponent implements OnInit {
  projects: any[] = [];
  loading = false;
  selectedProjects: any[] = [];
  // Cache of owner id -> display name (ФИО)
  ownerNames: Record<string, string> = {};
  // current logged in user id (used as default owner_id)
  currentUserId: string | number | null = null;
  // dialog / form state
  displayDialog = false;
  editModel: any = {};
  isCreating = false;
  error: string | null = null;
  // options for owner select
  usersOptions: { label: string; value: any }[] = [];
  // status options for select (populated in ngOnInit to support translations)
  statuses: { label: string; value: any }[] = [];
  // roles options for multi-select
  rolesOptions: { label: string; value: any }[] = [];
  // selector bound to projects
  projectOptions: { label: string; value: any }[] = [];
  selectedProject: any | undefined;
  // assignments for selected project
  assignments: any[] = [];

  // assign dialog state
  assignDialog = false;
  assignModel: { project_id?: any; user_id: any[]; roles: any[] } = { user_id: [], roles: [] };

  constructor(private svc: ProjectsUsersService, private cd: ChangeDetectorRef, private messageService: MessageService, private translate: TranslateService, private usersService: UsersService, private confirmationService: ConfirmationService, private auth: AuthService) {}

  private safeDetect(): void {
    try { this.cd.detectChanges(); } catch (e) { /* noop */ }
  }

  ngOnInit(): void {
    // get current user id for owner defaults
    try {
      this.auth.me().subscribe({
        next: (res: any) => {
          const user = (res && (res as any).data) ? (res as any).data : res;
          if (user && (user.id !== undefined && user.id !== null)) {
            this.currentUserId = user.id;
            // also cache current user's name for owner display
            this.ownerNames[String(this.currentUserId)] = this.formatUserName(user) || String(this.currentUserId);
          }
        },
        error: () => {
          // ignore — fallback to null
        }
      });
    } catch (e) {
      console.warn('Failed to get current user', e);
    }
    // prepare status options with translations
    try {
      this.statuses = [
        { label: this.translate.instant('MENU.ACTIVE_YES') || 'Active', value: 'active' },
        { label: this.translate.instant('MENU.ACTIVE_NO') || 'Inactive', value: 'inactive' },
        { label: this.translate.instant('components.projects.STATUS_COMPLETED') || 'Completed', value: 'completed' }
      ];
    } catch (e) {
      this.statuses = [{ label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }, { label: 'Completed', value: 'completed' }];
    }

    // projectOptions will be populated when projects are loaded

    // preload users for owner select
    this.loadUsersForSelect();

  // load roles for assign dialog
  this.loadRoles();

    this.loadProjects();
  }

  private loadRoles(): void {
    try {
      this.svc.getRoles().subscribe({
        next: (res: any) => {
          const list = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);
          this.rolesOptions = (list || []).map((r: any) => ({ label: (r && r.name) ? r.name : String(r?.id), value: r?.id }));
          this.safeDetect();
        },
        error: (err: any) => {
          console.warn('Failed to load roles', err);
        }
      });
    } catch (e) { console.warn('loadRoles failed', e); }
  }

  onProjectChange(projectId: any): void {
    // normalize event shapes: PrimeNG onChange passes { originalEvent, value }
    let id = projectId;
    try {
      if (projectId && typeof projectId === 'object' && projectId.hasOwnProperty('value')) {
        id = projectId.value;
      }
    } catch (e) { /* ignore */ }
    console.debug('onProjectChange ->', id);
    this.selectedProject = id;
    if (id === undefined || id === null || id === '') {
      this.assignments = [];
      return;
    }
    this.loadAssignments(id);
  }

  private loadAssignments(projectId: any): void {
    try {
      this.loading = true;
      this.svc.getAssignments(projectId).subscribe({
        next: (res: any) => {
          const list = (res && Array.isArray(res.data)) ? res.data : (Array.isArray(res) ? res : []);
            this.assignments = list || [];
            // assignments now include user info (full_name, first_name, last_name).
            // Use those fields to populate ownerNames cache and avoid extra requests to /api/users/.
            try {
              (this.assignments || []).forEach((a: any) => {
                const uid = a && (a.user_id || a.user || a.userId);
                if (uid !== undefined && uid !== null && !this.ownerNames[String(uid)]) {
                  const full = a?.full_name || [a?.last_name, a?.first_name, a?.middle_name].filter((s: any) => !!s).map((s: any) => String(s).trim()).join(' ');
                  this.ownerNames[String(uid)] = full || String(uid);
                }
              });
            } catch (e) {
              // ignore any formatting errors
            }
            this.loading = false;
            this.safeDetect();
        },
        error: (err: any) => {
          console.error('Failed to load assignments', err);
          this.assignments = [];
          this.loading = false;
          this.safeDetect();
        }
      });
    } catch (e) {
      console.warn('loadAssignments failed', e);
      this.assignments = [];
      this.loading = false;
    }
  }

  private loadUsersForSelect(): void {
    try {
      this.usersService.getUsers(1, 1000).subscribe({
        next: (res: any) => {
          const list = (res && res.data) ? res.data : (Array.isArray(res) ? res : (res || []));
          this.usersOptions = (list || []).map((u: any) => ({ label: this.formatUserName(u) || (u.email || String(u.id)), value: u.id }));
          this.safeDetect();
        },
        error: (err: any) => {
          console.warn('Failed to load users for owner select', err);
        }
      });
    } catch (e) {
      console.warn('loadUsersForSelect failed', e);
    }
  }

  // global filter helper for p-table caption search
  onGlobalFilter(table: any, event: Event): void {
    const val = (event && (event.target as HTMLInputElement)) ? (event.target as HTMLInputElement).value : '';
    try { table.filterGlobal(val, 'contains'); } catch (e) { console.warn('onGlobalFilter failed', e); }
  }

  private loadProjects(): void {
    this.loading = true;
    this.svc.getProjects().subscribe({
      next: (res: any) => {
        // Accept both array responses and { data: [] } shapes
        if (Array.isArray(res)) {
          this.projects = res;
        } else if (res && Array.isArray(res.data)) {
          this.projects = res.data;
        } else {
          this.projects = [];
        }
        // populate select options from loaded projects
        try {
          this.projectOptions = (this.projects || []).map((p: any) => {
            const name = (p && p.name) ? String(p.name).trim() : '';
            const code = (p && p.code) ? String(p.code).trim() : '';
            let label = '';
            if (name && code) label = `${name} (${code})`;
            else if (name) label = name;
            else if (code) label = code;
            else label = String(p?.id || '');
            return { label, value: p?.id };
          });
        } catch (e) { this.projectOptions = []; }
        // After loading projects, ensure we have owner names cached
        this.loadOwnerNames();
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Failed to load projects', err);
        this.projects = [];
        this.loading = false;
        this.safeDetect();
      }
    });
  }

  // Load owner (user) names for all projects and cache them to avoid repeated calls.
  private loadOwnerNames(): void {
    try {
      const ids = Array.from(new Set((this.projects || []).map(p => p?.owner_id).filter(Boolean)));
      const idsToFetch = ids.filter(id => !this.ownerNames[String(id)]);
      if (!idsToFetch.length) return;
      const calls = idsToFetch.map(id => this.usersService.getUser(id));
      forkJoin(calls).subscribe({
        next: (responses: any[]) => {
          responses.forEach((resp: any, idx: number) => {
            const id = idsToFetch[idx];
            // Accept either direct user object or { data: user }
            const user = (resp && (resp as any).data) ? (resp as any).data : resp;
            this.ownerNames[String(id)] = this.formatUserName(user) || String(id);
          });
          this.safeDetect();
        },
        error: (err: any) => {
          console.warn('Failed to load owner names', err);
        }
      });
    } catch (e) {
      console.warn('loadOwnerNames failed', e);
    }
  }

  // Return label/name for the currently selected project (falls back to id)
  getSelectedProjectLabel(): string {
    const id = this.selectedProject;
    if (id === undefined || id === null || id === '') return '';
    try {
      const found = (this.projectOptions || []).find(p => String(p.value) === String(id));
      if (found && found.label) return found.label;
      const proj = (this.projects || []).find(p => String(p?.id) === String(id));
      if (proj) return String(proj.name || proj.title || proj.code || proj.id);
    } catch (e) { /* ignore */ }
    return String(id);
  }

  // Format user object to ФИО (Lastname Firstname Middlename) trimmed
  private formatUserName(user: any): string {
    if (!user) return '';
    const parts = [user.last_name, user.first_name, user.middle_name].filter((s: any) => !!s).map((s: any) => String(s).trim());
    return parts.join(' ').trim();
  }

  getOwnerName(id: any): string {
    if (!id && id !== 0) return '—';
    return this.ownerNames[String(id)] || String(id);
  }

  // Build a display label for an assignment: "Фамилия Имя (Role)" or fallback id/role
  private getAssignmentLabel(a: any): string {
    if (!a) return '';
    const userId = a && (a.user_id || a.user || a.userId);
    // Prefer explicit full_name from assignment, then cached ownerNames, then formatted fields
    let name = '';
    if (a.full_name) name = a.full_name;
    else if (userId !== undefined && userId !== null && this.ownerNames[String(userId)]) name = this.ownerNames[String(userId)];
    else name = this.formatUserName(a) || (userId !== undefined && userId !== null ? String(userId) : '—');

    // Determine role display: prefer role_name then lookup in rolesOptions by id
    const roleId = a && (a.role_id || a.role || a.roleId);
    let roleLabel = '';
    if (a.role_name) roleLabel = a.role_name;
    else if (roleId !== undefined && roleId !== null) {
      const found = (this.rolesOptions || []).find(r => String(r.value) === String(roleId));
      roleLabel = found ? String(found.label) : String(roleId);
    }

    if (roleLabel) return `${name} (${roleLabel})`;
    return name;
  }

  // Open assign dialog for the currently selected project
  openAssignDialog(): void {
    if (!this.selectedProject) {
  this.messageService.add({ severity: 'warn', summary: '', detail: this.translate.instant('components.projects.users.SELECT_PROJECT.TEXT') || 'Select a project first' });
      return;
    }
    this.assignModel = { project_id: this.selectedProject, user_id: [], roles: [] };
    this.assignDialog = true;
  }

  // Save assignments (bulk) for selected project
  saveAssignments(): void {
    if (!this.selectedProject) {
  this.messageService.add({ severity: 'error', summary: '', detail: this.translate.instant('components.projects.users.SELECT_PROJECT.TEXT') || 'Select a project' });
      return;
    }
    const payload = { project_id: this.selectedProject, user_id: this.assignModel.user_id || [], roles: this.assignModel.roles || [] };
    this.loading = true;
  this.svc.createAssignments(payload).subscribe({
      next: (res: any) => {
  try { this.messageService.add({ severity: 'success', summary: this.translate.instant('components.projects.users.messages.SUMMARY_CREATE') || 'Create', detail: this.translate.instant('components.projects.users.messages.CREATED') || 'Assigned' }); } catch (e) {}
        this.assignDialog = false;
        // reload assignments to reflect new entries
        this.loadAssignments(this.selectedProject);
        this.loading = false;
        this.safeDetect();
      },
      error: (err: any) => {
        console.error('Failed to create assignments', err);
      try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.projects.users.messages.SUMMARY_CREATE') || 'Create', detail: (err && err.message) ? err.message : 'Failed to assign' }); } catch (e) {}
        this.loading = false;
        this.safeDetect();
      }
    });
  }

  validateForm(): boolean {
    if (!this.editModel || !this.editModel.name) {
      this.error = 'Name is required';
      return false;
    }
    this.error = null;
    return true;
  }

  saveProject(): void {
    if (!this.validateForm()) return;
    this.loading = true;
  const payload: any = { name: this.editModel.name, code: this.editModel.code };
  // include optional description
  if (this.editModel.description !== undefined) payload.description = this.editModel.description;
    // If creating a new project => POST, otherwise update existing via PUT /api/projects/{id}
    if (this.isCreating) {
      this.svc.createProject(payload).subscribe({
        next: (created: any) => {
          this.displayDialog = false;
          this.editModel = {};
          this.loading = false;
          this.isCreating = false;
          try { this.messageService.add({ severity: 'success', summary: this.translate.instant('components.projects.messages.SUMMARY_CREATE') || 'Create', detail: this.translate.instant('components.projects.messages.CREATED') || 'Project created' }); } catch (e) {}
          this.loadProjects();
          this.safeDetect();
        },
        error: (err: any) => {
          console.error('Failed to create project', err);
          this.error = (err && err.message) ? err.message : 'Failed to create project';
          this.loading = false;
          try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.projects.messages.SUMMARY_CREATE') || 'Create', detail: this.error || '' }); } catch (e) {}
          this.safeDetect();
        }
      });
    } else {
      // update existing project
      const id = this.editModel && (this.editModel.id || this.editModel._id || this.editModel.ID);
      if (!id) {
        this.error = 'Project id is missing';
        this.loading = false;
        this.safeDetect();
        return;
      }
      // include optional status/owner if present in editModel
      if (this.editModel.status !== undefined) payload.status = this.editModel.status;
      if (this.editModel.owner_id !== undefined) payload.owner_id = this.editModel.owner_id;

      this.svc.updateProject(id, payload).subscribe({
        next: (updated: any) => {
          this.displayDialog = false;
          this.editModel = {};
          this.loading = false;
          this.isCreating = false;
          try { this.messageService.add({ severity: 'success', summary: this.translate.instant('components.projects.messages.SUMMARY_EDIT') || 'Edit', detail: this.translate.instant('components.projects.messages.UPDATED') || 'Project updated' }); } catch (e) {}
          this.loadProjects();
          this.safeDetect();
        },
        error: (err: any) => {
          console.error('Failed to update project', err);
          this.error = (err && err.message) ? err.message : 'Failed to update project';
          this.loading = false;
          try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.projects.messages.SUMMARY_EDIT') || 'Edit', detail: this.error || '' }); } catch (e) {}
          this.safeDetect();
        }
      });
    }
  }

  // Ask for confirmation and delete an assignment
  confirmDeleteAssignment(a: any): void {
    if (!a || !a.id) return;
    const projectId = this.selectedProject;
    if (!projectId) {
  this.messageService.add({ severity: 'warn', summary: '', detail: this.translate.instant('components.projects.users.SELECT_PROJECT.TEXT') || 'Select a project first' });
      return;
    }

    // Build payload similar to bulk delete: include user_id and/or roles arrays
    const userId = a && (a.user_id || a.user || a.userId);
    const roleId = a && (a.role_id || a.role || a.roleId);
    const payload: any = {};
    if (userId) payload.user_id = [userId];
    if (roleId) payload.roles = [roleId];
    if (!payload.user_id && !payload.roles) return;

    try {
      this.confirmationService.confirm({
        message: `${this.translate.instant('components.projects.users.confirm.DELETE_QUESTION') } ${this.getAssignmentLabel(a)}`,
        icon: 'pi pi-exclamation-triangle',
        accept: () => {
          this.loading = true;
          this.svc.deleteAssignments(projectId, payload).subscribe({
            next: () => {
              try { this.messageService.add({ severity: 'success', summary: this.translate.instant('components.projects.users.messages.SUMMARY_DELETE') || 'Delete', detail: this.translate.instant('components.projects.users.messages.DELETED') || 'Assignments deleted' }); } catch (e) {}
              // refresh assignments
              this.selectedProjects = [];
              this.loadAssignments(projectId);
              this.loading = false;
              this.safeDetect();
            },
            error: (err: any) => {
              console.error('Failed to delete assignment', err);
              try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.projects.users.messages.SUMMARY_DELETE') || 'Delete', detail: (err && err.message) ? err.message : 'Failed to delete assignment' }); } catch (e) {}
              this.loading = false;
              this.safeDetect();
            }
          });
        }
      });
    } catch (e) {
      // fallback: perform deletion immediately
      this.loading = true;
      this.svc.deleteAssignments(projectId, payload).subscribe({
        next: () => {
          try { this.messageService.add({ severity: 'success', summary: this.translate.instant('components.projects.users.messages.SUMMARY_DELETE') || 'Delete', detail: this.translate.instant('components.projects.users.messages.DELETED') || 'Assignments deleted' }); } catch (e) {}
          this.selectedProjects = [];
          this.loadAssignments(projectId);
          this.loading = false;
          this.safeDetect();
        },
        error: (err: any) => {
          console.error('Failed to delete assignment', err);
          try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.projects.users.messages.SUMMARY_DELETE') || 'Delete', detail: (err && err.message) ? err.message : 'Failed to delete assignment' }); } catch (e) {}
          this.loading = false;
          this.safeDetect();
        }
      });
    }
  }

  // Confirm and delete all selected assignments (bulk)
  confirmDeleteSelected(): void {
    const items = this.selectedProjects || [];
    if (!items || !items.length) return;
    try {
      const listStr = this.getAssignmentList(items);
      const question = this.translate.instant('components.projects.users.confirm.DELETE_QUESTION') || 'Attention! Do you really want to delete selected assignments?';
      const message = listStr ? `${question} ${listStr}` : `${question} (${items.length})`;
      this.confirmationService.confirm({
        message,
        icon: 'pi pi-exclamation-triangle',
        accept: () => this.deleteSelectedAssignments()
      });
    } catch (e) {
      this.deleteSelectedAssignments();
    }
  }

  // Build a comma-separated list of assignment labels for display in confirmation dialogs.
  // Truncates with a "... и ещё N" suffix when too long.
  private getAssignmentList(items: any[]): string {
    if (!items || !items.length) return '';
    const labels = items.map(it => this.getAssignmentLabel(it) || (it && (it.user_id || it.user || it.id) ? String(it.user_id || it.user || it.id) : '—'));
    const full = labels.join(', ');
    const MAX = 300; // max length for the confirmation message
    if (full.length <= MAX) return full;
    // otherwise include as many labels as fit and indicate remaining count
    let out: string[] = [];
    let len = 0;
    for (let i = 0; i < labels.length; i++) {
      const lab = labels[i];
      const addLen = (out.length ? 2 : 0) + lab.length; // account for ', '
      if (len + addLen > MAX) break;
      out.push(lab);
      len += addLen;
    }
    const remaining = labels.length - out.length;
    return out.join(', ') + (remaining > 0 ? `, ... и ещё ${remaining}` : '');
  }

  // Perform bulk delete using service.deleteAssignments(projectId, ids)
  private deleteSelectedAssignments(): void {
    const items = this.selectedProjects || [];
    const projectId = this.selectedProject;
    if (!projectId || !items.length) return;

    // Build unique arrays for user_id and roles expected by API
    const userIds = Array.from(new Set(items.map((it: any) => it && (it.user_id || it.user || it.userId)).filter(Boolean)));
    const roleIds = Array.from(new Set(items.map((it: any) => it && (it.role_id || it.role || it.roleId)).filter(Boolean)));

    const payload: any = {};
    if (userIds.length) payload.user_id = userIds;
    if (roleIds.length) payload.roles = roleIds;

    if (!payload.user_id && !payload.roles) return;

    this.loading = true;
    this.svc.deleteAssignments(projectId, payload).subscribe({
      next: () => {
          try { this.messageService.add({ severity: 'success', summary: this.translate.instant('components.projects.users.messages.SUMMARY_DELETE') || 'Delete', detail: this.translate.instant('components.projects.users.messages.DELETED') || 'Assignments deleted' }); } catch (e) {}
        // reload assignments from server to get canonical state
        this.selectedProjects = [];
        this.loadAssignments(projectId);
        this.loading = false;
        this.safeDetect();
      },
      error: (err: any) => {
        console.error('Failed to bulk delete assignments', err);
        try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.projects.users.messages.SUMMARY_DELETE') || 'Delete', detail: (err && err.message) ? err.message : 'Failed to delete assignments' }); } catch (e) {}
        this.loading = false;
        this.safeDetect();
      }
    });
  }
}

