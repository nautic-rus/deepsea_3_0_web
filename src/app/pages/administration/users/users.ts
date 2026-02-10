import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { RatingModule } from 'primeng/rating';
import { RippleModule } from 'primeng/ripple';
import { InputTextModule } from 'primeng/inputtext';
import { InputMaskModule } from 'primeng/inputmask';
import { MultiSelectModule } from 'primeng/multiselect';
import { DialogModule } from 'primeng/dialog';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SkeletonModule } from 'primeng/skeleton';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { UsersService } from './users.service';
import { Select } from "primeng/select";
import { Avatar } from "primeng/avatar";

interface User {
  id: number | string;
  username: string;
  email: string;
  phone?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  middle_name?: string | null;
  avatar_url?: string | null;
  department?: string | null;
  department_id?: number | null;
  job_title?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    FormsModule,
    ToolbarModule,
    ButtonModule,
    TableModule,
    RatingModule,
    RippleModule,
    InputTextModule,
    InputMaskModule,
    MultiSelectModule,
    DialogModule,
    InputIconModule,
    IconFieldModule,
    ProgressSpinnerModule,
    SkeletonModule,
    Select,
    TagModule,
    ConfirmDialogModule,
    ToastModule,
    Avatar
],
  providers: [ConfirmationService, MessageService],
  templateUrl: './users.html',
  styleUrls: ['./users.scss']
})
export class AdminUsersComponent implements OnInit {
  users: User[] = [];
  selectedProducts: User[] = [];
  loading = false;
  error: string | null = null;
  // dialog / form state
  displayDialog = false;
  editModel: Partial<User & { name?: string; age?: number }> = {};
  // whether the dialog is creating a new user (true) or editing an existing one (false)
  isCreating = false;
  // department dropdown options
  departments: { label: string; value: any }[] = [];
  // departments representation used for column filter (value is label string)
  departmentsFilter: { label: string; value: any }[] = [];
  // status options for filtering (use translation keys for labels)
  statuses: { label: string; value: any }[] = [
    { label: 'MENU.ACTIVE_YES', value: true },
    { label: 'MENU.ACTIVE_NO', value: false }
  ];
  // job title filter options (populated from loaded users)
  jobTitles: { label: string; value: any }[] = [];
  // simple form errors for client-side validation
  formErrors: { email?: string; first_name?: string; last_name?: string } = {};

  constructor(
    private usersService: UsersService,
    private cd: ChangeDetectorRef,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translate: TranslateService
  ) {
    // keep component lightweight; initial data will be loaded in ngOnInit
  }

  // show a confirmation dialog before deleting a user
  confirmDelete(user: User): void {
    if (!user) return;
    this.confirmationService.confirm({
      message: `${this.translate.instant('MENU.DELETE_USER_QUESTION') || 'Delete user'} ${user.first_name} ${user.last_name || ''}?`,
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.deleteProduct(user)
    });
  }

  // Safely run change detection when we updated bound state from async handlers
  private safeDetect(): void {
    try {
      this.cd.detectChanges();
    } catch (e) {
      // detection may fail at some lifecycle moments — log for diagnostics
      console.warn('safeDetect failed', e);
    }
  }

  ngOnInit(): void {
    this.loadUsers();
    this.loadDepartments();
  }

  // global filter helper for p-table caption search
  onGlobalFilter(table: any, event: Event): void {
    const val = (event && (event.target as HTMLInputElement)) ? (event.target as HTMLInputElement).value : '';
    try { table.filterGlobal(val, 'contains'); } catch (e) { console.warn('onGlobalFilter failed', e); }
  }

  // Simple client-side validation
  validateForm(): boolean {
    this.formErrors = {};
    const email = (this.editModel && this.editModel.email) ? String(this.editModel.email).trim() : '';
    const firstName = (this.editModel && this.editModel.first_name) ? String(this.editModel.first_name).trim() : '';
    const lastName = (this.editModel && this.editModel.last_name) ? String(this.editModel.last_name).trim() : '';

    if (!firstName) {
      this.formErrors.first_name = this.translate.instant('MENU.FIRST_NAME') + ' is required';
    }
    if (!lastName) {
      this.formErrors.last_name = this.translate.instant('MENU.LAST_NAME') + ' is required';
    }
    if (!email) {
      this.formErrors.email = this.translate.instant('MENU.EMAIL') + ' is required';
    } else {
      // simple email regex
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(email)) {
        this.formErrors.email = this.translate.instant('MENU.EMAIL') + ' is invalid';
      }
    }

    this.safeDetect();
    return Object.keys(this.formErrors).length === 0;
  }

  loadDepartments(): void {
    // load list of departments and map to dropdown options
    this.usersService.getDepartments().subscribe({
      next: (res) => {
        const items = (res && (res as any).data) ? (res as any).data : (res || []);
        // assign departments and run change detection
        this.departments = (items || []).map((d: any) => ({
          label: d.name || d.title || d.department || String(d.id),
          // keep numeric id as the option value for selects so we send department_id to API
          value: d.id
        }));
        // also prepare a lightweight filter list where value is the label (matches table cell)
        this.departmentsFilter = (this.departments || []).map(d => ({ label: d.label, value: d.label }));
        this.safeDetect();
      },
      error: (err) => {
        console.warn('Failed to load departments', err);
        // set empty departments and detect
        this.departments = [];
        this.safeDetect();
      }
    });
  }

  loadUsers(): void {
    this.loading = true;
    this.error = null;
    this.usersService.getUsers().subscribe({
      next: (data) => {
        // assign users and run change detection
        this.users = (data && (data as any).data) ? (data as any).data : (data || []);
        // Normalize avatar fields so template can depend on `avatar_url`.
        try {
          this.users = (this.users || []).map((u: any) => {
            if (!u) return u;
            // prefer explicit URL fields
            let url: string | null = null;
            if (u.avatar_url || u.avatar || u.avatarUrl) {
              url = u.avatar_url || u.avatar || u.avatarUrl || null;
            } else if (u.avatar_id || u.avatarId) {
              const aid = u.avatar_id ?? u.avatarId;
              try {
                if (typeof aid === 'number' || (typeof aid === 'string' && String(aid).trim())) {
                  url = `/api/storage/${String(aid).trim()}/download`;
                }
              } catch (e) { url = null; }
            }
            // ensure canonical field exists
            (u as any).avatar_url = url;
            return u;
          });
        } catch (e) {
          console.warn('normalize avatars failed', e);
        }
        // derive job titles from users for the job title filter
        const titles = Array.from(new Set((this.users || []).map((u: any) => u.job_title).filter(Boolean)));
        this.jobTitles = (titles || []).map((t: any) => ({ label: t, value: t }));
        this.loading = false;
        this.safeDetect();
      },
      error: (err) => {
        console.error('Failed to load users:', err);
        this.error = (err && err.message) ? err.message : 'Failed to load users';
        this.loading = false;
        this.safeDetect();
      }
    });
  }

  // Format as "LastName I.O." using first_name and middle_name for initials
  formatSurnameInitials(user: User | any): string {
    if (!user) return '-';
    const last = (user.last_name || user.lastName || '').toString().trim();
    const first = (user.first_name || user.firstName || '').toString().trim();
    const middle = (user.middle_name || user.middleName || '').toString().trim();
    const initials: string[] = [];
    if (first) initials.push(first[0].toUpperCase() + '.');
    if (middle) initials.push(middle[0].toUpperCase() + '.');
    if (last) return last + (initials.length ? ' ' + initials.join('') : '');
    // fallback to name parts if last name missing
    const combined = [first, middle].filter(Boolean).join(' ');
    return combined || (user.username || '-') ;
  }

  // Open new user dialog (stub)
  openNew(): void {
    // prepare an empty model for creation and open dialog
    this.editModel = {
      email: '',
      phone: '',
      first_name: '',
      last_name: '',
      middle_name: '',
      department: null,
      job_title: ''
    };
    this.isCreating = true;
    this.displayDialog = true;
  }

  // Delete selected products/users (stub)
  deleteSelectedProducts(): void {
    // TODO: implement deletion logic with confirmation
    try {
      this.messageService.add({ severity: 'info', summary: 'Not implemented', detail: 'Bulk delete is not implemented yet' });
    } catch (e) {
      console.warn('messageService.add failed', e);
    }
  }

  // Export CSV (stub)
  exportCSV(): void {
    try {
      const rows = this.users || [];
      if (!rows.length) {
    try { this.messageService.add({ severity: 'info', summary: this.translate.instant('MENU.EXPORT') || 'Export', detail: this.translate.instant('MENU.ANY') || 'No users to export' }); } catch (e) { console.warn('messageService.add failed', e); }
        return;
      }

      const headers = ['ID', this.translate.instant('MENU.FIRST_NAME') || 'First name', this.translate.instant('MENU.LAST_NAME') || 'Last name', this.translate.instant('MENU.EMAIL') || 'Email', this.translate.instant('MENU.PHONE') || 'Phone', this.translate.instant('MENU.DEPARTMENT') || 'Department', this.translate.instant('MENU.JOB_TITLE') || 'Job title', this.translate.instant('MENU.ACTIVE') || 'Status', 'Created At', 'Updated At'];

      const esc = (v: any) => {
        if (v === null || v === undefined) return '';
        if (typeof v === 'boolean') return v ? (this.translate.instant('MENU.ACTIVE_YES') || 'Active') : (this.translate.instant('MENU.ACTIVE_NO') || 'Inactive');
        const s = String(v);
        // escape double quotes by doubling them
        return '"' + s.replace(/"/g, '""') + '"';
      };

      const lines = [headers.map(h => '"' + String(h).replace(/"/g, '""') + '"').join(',')];
      for (const u of rows) {
        const line = [
          esc(u.id),
          esc(u.first_name),
          esc(u.last_name),
          esc(u.email),
          esc(u.phone),
          esc(u.department),
          esc(u.job_title),
          esc(u.is_active),
          esc(u.created_at),
          esc(u.updated_at)
        ].join(',');
        lines.push(line);
      }

      const csv = lines.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `users_export_${timestamp}.csv`;
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

  try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.EXPORT') || 'Export', detail: this.translate.instant('MENU.USER_CREATED') || 'Export completed' }); } catch (e) { console.warn('messageService.add failed', e); }
    } catch (err) {
      console.error('Export failed', err);
  try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.EXPORT') || 'Export', detail: 'Export failed' }); } catch (e) { console.warn('messageService.add failed', e); }
    }
  }

  // Edit a single user. Minimal inline editor via prompts for now.
  // Open edit dialog and populate model with concrete fields
  openEdit(user: User): void {
    if (!user) return;
    // copy user and normalize department to the department id (if available)
    this.editModel = { ...user } as any;

    // prefer explicit department id fields if present on the user object
    const rawDeptId = (user as any).department_id ?? (user as any).departmentId ?? null;
    if (rawDeptId != null) {
      (this.editModel as any).department = rawDeptId;
    } else if (user.department) {
      // if we only have the department name, try to find its id from loaded departments
      const found = this.departments.find(d => d.label === user.department || String(d.value) === String(user.department));
      if (found) {
        (this.editModel as any).department = found.value;
      }
    }

    this.displayDialog = true;
  }

  // Save edited user from dialog (sends concrete fields)
  saveUser(): void {
    if (!this.editModel) return;
    // when editing an existing user we require an id; for creation id may be absent
    if (!this.isCreating && (this.editModel.id == null)) return;
    const id = (this.editModel.id != null) ? this.editModel.id : null;

    // Ensure we send department as an id. The editModel may contain a name (string)
    // when it was populated from server user data; try to resolve that to the id.
    let departmentId: any = (this.editModel as any).department ?? (this.editModel as any).department_id ?? (this.editModel as any).departmentId ?? null;
    if (departmentId == null && this.editModel.department) {
      departmentId = this.editModel.department;
    }
    // if departmentId is a non-numeric label, try to find corresponding id from departments list
    if (typeof departmentId === 'string' && isNaN(Number(departmentId))) {
      const found = this.departments.find(d => d.label === departmentId || String(d.value) === departmentId);
      if (found) departmentId = found.value;
    }

    const payload: Partial<User> = {
      email: this.editModel.email,
      phone: this.editModel.phone,
      first_name: this.editModel.first_name,
      last_name: this.editModel.last_name,
      middle_name: this.editModel.middle_name,
  // send department id (or null) explicitly
      department_id: departmentId != null && departmentId !== '' ? Number(departmentId) : null,
      job_title: this.editModel.job_title
    };

    // validate form before sending
    if (!this.validateForm()) {
      // validation errors were populated and safeDetect called
      try {
        this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.CONFIRM') || 'Error', detail: 'Please fix form errors' });
      } catch (e) {}
      return;
    }

    // perform save request (update)
    this.loading = true;
    if (this.isCreating) {
      // create new user
      this.usersService.createUser(payload).subscribe({
        next: (created: any) => {
          this.displayDialog = false;
          this.editModel = {};
          this.loading = false;
          this.isCreating = false;
          try {
            this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.CREATE_USER') || 'Success', detail: this.translate.instant('MENU.USER_CREATED') || 'User created' });
          } catch (e) {}
          this.loadUsers();
          this.safeDetect();
        },
        error: (err) => {
          console.error('Failed to create user', err);
          this.error = (err && err.message) ? err.message : 'Failed to create user';
          this.loading = false;
          this.safeDetect();
        }
      });
    } else {
      // update existing user
  this.usersService.updateUser(id as any, payload).subscribe({
        next: (updated: any) => {
          // after successful save, reload users from server to keep canonical state
          this.displayDialog = false;
          this.editModel = {};
          this.loading = false;
          // show success message
          try {
            this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.SAVE') || 'Success', detail: this.translate.instant('MENU.USER_UPDATED') || 'User updated' });
          } catch (e) {
            // ignore messaging errors
          }
          this.loadUsers();
          this.safeDetect();
        },
        error: (err) => {
          console.error('Failed to update user', err);
          this.error = (err && err.message) ? err.message : 'Failed to update user';
          this.loading = false;
          this.safeDetect();
        }
      });
    }
  }

  // Return initials for a user (used when avatar_url is not present)
  getInitials(user: User | any): string {
    if (!user) return '';
    const fn = (user.first_name || '').toString().trim();
    const ln = (user.last_name || '').toString().trim();
    if (fn && ln) return (fn[0] + ln[0]).toUpperCase();
  if (fn) return fn.split(' ').map((s: string) => s[0]).filter(Boolean).slice(0,2).join('').toUpperCase();
    if (ln) return ln[0].toUpperCase();
    if (user.username) return user.username[0].toUpperCase();
    return '?';
  }

  // Deterministic color generator based on user id/username/name
  avatarColor(user: User | any): string {
    const seed = (user && (user.id ?? user.username ?? (user.first_name || '') + (user.last_name || ''))) || '';
    const s = seed.toString();
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      const ch = s.charCodeAt(i);
      hash = ((hash << 5) - hash) + ch;
      hash = hash & hash; // keep 32-bit
    }
    const hue = Math.abs(hash) % 360;
    // return a saturated pastel color
    return `hsl(${hue}, 65%, 45%)`;
  }

  // Choose white or dark text depending on background luminance
  avatarTextColor(user: User | any): string {
    const bg = this.avatarColor(user);
    // parse hsl(h, s%, l%) and use l to determine contrast
    const m = bg.match(/hsl\((\d+),\s*(\d+)%?,\s*(\d+)%?\)/);
    if (!m) return '#fff';
    const lightness = Number(m[3]);
    // if lightness is high -> dark text, else white
    return lightness > 70 ? '#111' : '#fff';
  }

  // Delete a single user after confirmation
  deleteProduct(user: User): void {
    if (!user) {
      return;
    }

    // deletion is confirmed via PrimeNG confirmation dialog (confirmDelete)

    this.loading = true;
    this.usersService.deleteUser(user.id).subscribe({
      next: () => {
        this.users = this.users.filter(u => u.id !== user.id);
        // also remove from selectedProducts if present
        this.selectedProducts = this.selectedProducts.filter(s => s.id !== user.id);
        this.loading = false;
        // show success message
        try {
          this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.DELETE') || 'Success', detail: this.translate.instant('MENU.USER_DELETED') || 'User deleted' });
        } catch (e) {
          // ignore
        }
        this.safeDetect();
      },
      error: (err) => {
        console.error('Failed to delete user', err);
        this.error = (err && err.message) ? err.message : 'Failed to delete user';
        this.loading = false;
        this.safeDetect();
      }
    });
  }
}

