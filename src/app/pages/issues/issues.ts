import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { RippleModule } from 'primeng/ripple';
import { InputTextModule } from 'primeng/inputtext';
import { InputMaskModule } from 'primeng/inputmask';
import { DialogModule } from 'primeng/dialog';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MultiSelectModule } from 'primeng/multiselect';
import { DatePickerModule } from 'primeng/datepicker';
import { CheckboxModule } from 'primeng/checkbox';
import { AvatarModule } from 'primeng/avatar';
import { EditorModule } from 'primeng/editor';
import { DragDropModule } from 'primeng/dragdrop';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { UsersService } from '../administration/users/users.service';
import { IssuesService } from './issues.service';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { Select } from 'primeng/select';

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
  selector: 'app-issues',
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
    InputMaskModule,
    DialogModule,
    InputIconModule,
    IconFieldModule,
    ProgressSpinnerModule,
    MultiSelectModule,
    DatePickerModule,
    CheckboxModule,
    DragDropModule,
    AvatarModule,
  EditorModule,
    Select,
    TagModule,
    ConfirmDialogModule,
    ToastModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './issues.html',
  styleUrls: ['./issues.scss']
})
export class IssuesComponent implements OnInit {
  // issue-scoped list (kept empty intentionally)
  issuesItems: User[] = [];
  selectedIssues: User[] = [];
  loading = false;
  error: string | null = null;
  displayDialog = false;
  // issue edit/create model — use a flexible shape matching issue payload
  editModel: any = {};
  isCreating = false;
  departments: { label: string; value: any }[] = [];
  departmentsFilter: { label: string; value: any }[] = [];
  statuses: { label: string; value: any }[] = [
    { label: 'MENU.ACTIVE_YES', value: true },
    { label: 'MENU.ACTIVE_NO', value: false }
  ];
  jobTitles: { label: string; value: any }[] = [];
  formErrors: { title?: string; project_id?: string } = {};
  // query dialog state and filters
  queryDialogVisible = false;
  // bulk edit dialog state
  bulkEditDialogVisible = false;
  bulkEditModel: { status_id: any; assignee_id: any } = { status_id: null, assignee_id: null };
  // current form values (bound to dialog inputs)
  filters: any = {
    is_closed: null as boolean | null,
    is_active: null as boolean | null,
    project_id: [] as any[],
    status_id: [] as any[],
    assignee_id: [] as any[],
    author_id: [] as any[],
    type_id: null as number | null,
    priority: [] as any[],
    estimated_hours: null as number | null,
    estimated_hours_min: null as number | null,
    estimated_hours_max: null as number | null,
    start_date_from: null as Date | null,
    start_date_to: null as Date | null,
    due_date_from: null as Date | null,
    due_date_to: null as Date | null,
    page: 1,
    limit: 25,
    search: ''
  };
  // last applied filters (can be used to fetch data)
  appliedFilters: any = {};
  // options loaded from server
  projectOptions: { label: string; value: any }[] = [];
  statusOptions: { label: string; value: any }[] = [];
  // priority options will be localized in ngOnInit
  priorityOptions: { label: string; value: any }[] = [];
  usersOptions: { label: string; value: any; avatar?: string | null }[] = [];
  // issue type options (select)
  typeOptions: { label: string; value: any }[] = [];

  // column toggle support
  columns: { field: string; headerKey: string; visible: boolean }[] = [
    { field: 'id', headerKey: 'MENU.ID', visible: true },
    { field: 'project_name', headerKey: 'components.issues.table.PROJECT', visible: true },
    { field: 'title', headerKey: 'components.issues.table.TITLE', visible: true },
    { field: 'assignee_name', headerKey: 'components.issues.table.ASSIGNEE', visible: true },
    { field: 'author_name', headerKey: 'components.issues.table.AUTHOR', visible: true },
    { field: 'status_name', headerKey: 'components.issues.table.STATUS', visible: true },
    { field: 'priority_text', headerKey: 'components.issues.table.PRIORITY', visible: true },
    { field: 'estimated_hours', headerKey: 'components.issues.table.ESTIMATED_HOURS', visible: true },
    { field: 'start_date', headerKey: 'components.issues.table.START_DATE', visible: true },
    { field: 'due_date', headerKey: 'components.issues.table.DUE_DATE', visible: true },
    { field: 'created_at', headerKey: 'components.issues.table.CREATED_AT', visible: true }
  ];

  columnsOptions: { label: string; value: string }[] = [];
  selectedColumns: string[] = [];
  // storage key for columns visibility/order
  private readonly COLUMNS_STORAGE_KEY = 'issues_columns_v1';

  private resizeTimeout: any = null;

  @ViewChild('tableContainer', { static: true }) tableContainer?: ElementRef;

  constructor(
    private usersService: UsersService,
    private cd: ChangeDetectorRef,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translate: TranslateService,
    private http: HttpClient,
    private issuesService: IssuesService
    , private router: Router
  ) {}

  // Navigate to issue detail page when a table row is clicked
  onRowClick(issue: any, event?: Event): void {
    try {
      // prevent navigation when clicking interactive elements inside the row (checkboxes, buttons, inputs, links)
      const target = event && (event.target as HTMLElement);
      if (target && target.closest) {
        const interactive = target.closest('button, a, input, textarea, select, .p-tablecheckbox, .p-checkbox, .p-button');
        if (interactive) return;
      }
      if (!issue || (issue.id == null)) return;
      // navigate to /issues/:id (router will handle route matching)
      this.router.navigate(['/issues', issue.id]);
    } catch (e) {
      console.warn('onRowClick failed', e);
    }
  }

  private safeDetect(): void {
    try { this.cd.detectChanges(); } catch (e) { console.warn('safeDetect failed', e); }
  }

  ngOnInit(): void {
    // intentionally keep the issues table empty; still prepare department list
    this.loadDepartments();
    this.loadIssues();
    // preload options for multiselects
    this.loadProjects();
    this.loadStatuses();
    this.loadTypes();
    // initialize localized priority labels
    this.priorityOptions = [
      { label: this.translate.instant('components.issues.priority.HIGH') || 'High', value: 'high' },
      { label: this.translate.instant('components.issues.priority.MEDIUM') || 'Medium', value: 'medium' },
      { label: this.translate.instant('components.issues.priority.LOW') || 'Low', value: 'low' }
    ];

    // initialize column toggle options
    this.columnsOptions = (this.columns || []).map(c => ({ label: this.translate.instant(c.headerKey) || c.headerKey, value: c.field }));
    this.selectedColumns = (this.columns || []).filter(c => c.visible).map(c => c.field);
  // restore columns visibility/order if present
  try { this.loadColumnsFromStorage(); } catch (e) { console.warn('loadColumnsFromStorage failed', e); }
    // restore previously applied filters from localStorage and execute query after reload
    const restored = this.loadFiltersFromStorage();
    if (restored) {
      // if we restored filters, execute the query silently (no toast)
      // small timeout to allow other init tasks to settle
      setTimeout(() => this.applyQuery(true), 50);
    }
  }

  isColumnVisible(field: string): boolean {
    return this.selectedColumns.includes(field);
  }

  onColumnsChange(): void {
    // keep columns[].visible in sync if needed elsewhere
    for (const c of this.columns) c.visible = this.selectedColumns.includes(c.field);
    this.safeDetect();
    try { this.saveColumnsToStorage(); } catch (e) { console.warn('saveColumnsToStorage failed', e); }
  }

  // called when user reorders columns via drag/drop
  onColumnsReordered(event: any): void {
    try {
      // PrimeNG onColReorder event usually provides dragIndex and dropIndex
      // We'll reorder visible columns array using these indexes which is more reliable than DOM queries
      const dragIndex = (event && event.dragIndex != null) ? Number(event.dragIndex) : null;
      const dropIndex = (event && event.dropIndex != null) ? Number(event.dropIndex) : null;
      // Compute visible columns in current order
      const visible = this.columns.filter(c => this.selectedColumns.includes(c.field));
      if (dragIndex == null || dropIndex == null || dragIndex < 0 || dropIndex < 0 || dragIndex >= visible.length || dropIndex > visible.length) {
        // fallback: try to persist current order (no-op) and exit
        console.warn('onColumnsReordered: invalid indices', { dragIndex, dropIndex, visibleLength: visible.length });
        this.saveColumnsToStorage();
        return;
      }

      // move element within visible array
      const moved = visible.splice(dragIndex, 1)[0];
      visible.splice(dropIndex, 0, moved);

      // now reconstruct full this.columns preserving hidden columns positions by placing visible ones in same relative order as before,
      // but we'll place visible columns in the order of 'visible' where they appear in the old columns sequence
      const newOrder: any[] = [];
      // iterate old columns and replace visible entries in sequence from 'visible' array
      let vi = 0;
      for (const c of this.columns) {
        if (this.selectedColumns.includes(c.field)) {
          const next = visible[vi++];
          if (next) newOrder.push(next);
        } else {
          newOrder.push(c);
        }
      }
      this.columns = newOrder;
      this.columnsOptions = (this.columns || []).map(c => ({ label: this.translate.instant(c.headerKey) || c.headerKey, value: c.field }));
      this.saveColumnsToStorage();
      this.safeDetect();
    } catch (e) {
      console.warn('onColumnsReordered failed', e);
    }
  }

  onColumnResized(event: any): void {
    try {
      if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => {
        // when resizing finishes, save current columns + sizes together
        this.saveColumnsToStorage();
      }, 200);
    } catch (e) {
      console.warn('onColumnResized failed', e);
    }
  }

  // read widths from DOM th[data-field] and return widths object
  private saveColumnSizesFromDOM(): { [k: string]: string } {
    const widths: { [k: string]: string } = {};
    try {
      if (!this.tableContainer) return widths;
      const container = this.tableContainer.nativeElement as HTMLElement;
      const ths = container.querySelectorAll('th[data-field]');
      ths.forEach((th: any) => {
        const f = th.getAttribute('data-field');
        if (!f) return;
        // prefer explicit style width if set, otherwise measured px width
        const styleW = th.style && th.style.width ? th.style.width : '';
        const w = styleW || (th.getBoundingClientRect ? Math.round(th.getBoundingClientRect().width) + 'px' : '');
        if (w) widths[f] = w;
      });
    } catch (e) {
      console.warn('saveColumnSizesFromDOM failed', e);
    }
    return widths;
  }

  // load projects for project_id multiselect from /api/my_projects
  loadProjects(): void {
    this.http.get('/api/my_projects').subscribe({
      next: (res: any) => {
        const items = (res && res.data) ? res.data : (res || []);
        this.projectOptions = (items || []).map((p: any) => ({ label: p.name || p.title || String(p.id), value: p.id }));
        // collect participants across projects to populate assignee/author options
  const map = new Map<number | string, { label: string; value: any; avatar?: string | null }>();
        for (const p of (items || [])) {
          const parts = p.participants || [];
          for (const part of (parts || [])) {
            const id = part.id;
            if (id == null) continue;
            const label = part.full_name || part.fullName || part.name || part.email || String(id);
            const avatar = part.avatar_url || part.avatar || part.avatarUrl || null;
            if (!map.has(id)) map.set(id, { label: label, value: id, avatar });
          }
        }
        this.usersOptions = Array.from(map.values());
        this.safeDetect();
      },
      error: (err) => { console.warn('Failed to load projects', err); this.projectOptions = []; this.usersOptions = []; this.safeDetect(); }
    });
  }

  // load statuses for status_id multiselect from /api/issue_statuses
  loadStatuses(): void {
    this.http.get('/api/issue_statuses').subscribe({
      next: (res: any) => {
        const items = (res && res.data) ? res.data : (res || []);
        this.statusOptions = (items || []).map((s: any) => ({ label: s.name || s.title || String(s.id), value: s.id }));
        this.safeDetect();
      },
      error: (err) => { console.warn('Failed to load statuses', err); this.statusOptions = []; this.safeDetect(); }
    });
  }

    

  // load issue types from server (fallbacks provided)
  loadTypes(): void {
    this.http.get('/api/issue_types').subscribe({
      next: (res: any) => {
        const items = (res && res.data) ? res.data : (res || []);
        this.typeOptions = (items || []).map((t: any) => ({ label: t.name || t.title || String(t.id), value: t.id }));
        // ensure there's at least a sensible default list
        if (!this.typeOptions.length) this.typeOptions = [
          { label: 'Bug', value: 1 },
          { label: 'Task', value: 2 },
          { label: 'Feature', value: 3 }
        ];
        this.safeDetect();
      },
      error: (err) => {
        // fallback types
        this.typeOptions = [
          { label: 'Bug', value: 1 },
          { label: 'Task', value: 2 },
          { label: 'Feature', value: 3 }
        ];
        this.safeDetect();
      }
    });
  }

  // ...existing code... (methods below remain unchanged)

  // Query dialog controls
  openQueryDialog(): void {
    this.queryDialogVisible = true;
  }

  // Bulk edit dialog handlers
  openBulkEditDialog(): void {
    if (!this.selectedIssues || !this.selectedIssues.length) {
      try { this.messageService.add({ severity: 'info', summary: this.translate.instant('MENU.BULK_EDIT') || 'Bulk edit', detail: this.translate.instant('components.issues.bulk.NO_SELECTION') || 'No issues selected' }); } catch (e) {}
      return;
    }
    // reset model
    this.bulkEditModel = { status_id: null, assignee_id: null };
    this.bulkEditDialogVisible = true;
  }

  closeBulkEditDialog(): void {
    this.bulkEditDialogVisible = false;
  }

  applyBulkEdit(): void {
    if (!this.selectedIssues || !this.selectedIssues.length) {
      try { this.messageService.add({ severity: 'info', summary: this.translate.instant('MENU.BULK_EDIT') || 'Bulk edit', detail: this.translate.instant('components.issues.bulk.NO_SELECTION') || 'No issues selected' }); } catch (e) {}
      return;
    }
    const ids = (this.selectedIssues || []).map((s: any) => s.id).filter(Boolean);
    if (!ids.length) {
      try { this.messageService.add({ severity: 'warn', summary: this.translate.instant('MENU.BULK_EDIT') || 'Bulk edit', detail: this.translate.instant('components.issues.bulk.NO_IDS') || 'No valid issue ids selected' }); } catch (e) {}
      return;
    }

    const payload: any = { ids };
    if (this.bulkEditModel.status_id !== null && this.bulkEditModel.status_id !== undefined) payload.status_id = this.bulkEditModel.status_id;
    if (this.bulkEditModel.assignee_id !== null && this.bulkEditModel.assignee_id !== undefined) payload.assignee_id = this.bulkEditModel.assignee_id;

    this.loading = true;
    this.http.post('/api/issues/bulk_update', payload).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.bulkEditDialogVisible = false;
        try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.BULK_EDIT') || 'Bulk edit', detail: this.translate.instant('components.issues.bulk.SUCCESS') || 'Bulk update applied' }); } catch (e) {}
        // refresh issues list using current filters if present
        if (this.appliedFilters && Object.keys(this.appliedFilters).length) {
          try { this.applyQuery(true); } catch (e) { this.loadIssues(); }
        } else {
          this.loadIssues();
        }
        this.safeDetect();
      },
      error: (err: any) => {
        console.error('Bulk update failed', err);
        this.loading = false;
        try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.BULK_EDIT') || 'Bulk edit', detail: this.translate.instant('components.issues.bulk.ERROR') || 'Bulk update failed' }); } catch (e) {}
        this.safeDetect();
      }
    });
  }

  closeQueryDialog(): void {
    this.queryDialogVisible = false;
  }

  resetQuery(): void {
    this.filters = {
      is_closed: null,
      is_active: null,
      project_id: [],
      status_id: [],
      assignee_id: [],
      author_id: [],
      type_id: null,
      priority: [],
      estimated_hours: null,
      estimated_hours_min: null,
      estimated_hours_max: null,
      start_date_from: null,
      start_date_to: null,
      due_date_from: null,
      due_date_to: null,
      page: 1,
      limit: 25,
      search: ''
    };
    // remove persisted filters
    this.removeFiltersFromStorage();
  }

  applyQuery(silent = false): void {
    // store filters and delegate network call to IssuesService
    this.appliedFilters = { ...(this.filters || {}) };
    this.queryDialogVisible = false;
    this.loading = true;
    this.error = null;
    // persist filters so they survive reloads
    try { this.saveFiltersToStorage(); } catch (e) { console.warn('Failed to save filters to storage', e); }

    this.issuesService.getIssues(this.filters).subscribe({
      next: (res: any) => {
        const items = (res && res.data) ? res.data : (res || []);
        this.issuesItems = Array.isArray(items) ? items : (items.items || []);
        this.loading = false;
        if (!silent) {
          try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.QUERY') || 'Query', detail: this.translate.instant('components.issues.filters.FILTERS_APPLIED') || 'Filters applied' }); } catch (e) {}
        }
        this.safeDetect();
      },
      error: (err) => {
        console.error('Failed to fetch issues', err);
        this.error = (err && err.message) ? err.message : 'Failed to fetch issues';
        this.loading = false;
        if (!silent) {
          try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.QUERY') || 'Query', detail: this.translate.instant('components.issues.filters.FILTERS_APPLY_ERROR') || 'Failed to apply filters' }); } catch (e) {}
        }
        this.safeDetect();
      }
    });
  }

  // Persist filters to localStorage as JSON
  private readonly FILTERS_STORAGE_KEY = 'issues_query_filters_v1';

  private saveFiltersToStorage(): void {
    try {
      const copy = { ...(this.filters || {}) };
      // Dates -> ISO strings
      ['start_date_from', 'start_date_to', 'due_date_from', 'due_date_to'].forEach(k => {
        const v = (copy as any)[k];
        if (v instanceof Date) (copy as any)[k] = v.toISOString();
      });
      localStorage.setItem(this.FILTERS_STORAGE_KEY, JSON.stringify(copy));
    } catch (e) {
      console.warn('saveFiltersToStorage failed', e);
    }
  }

  // Persist selected columns order/visibility to localStorage
  private saveColumnsToStorage(): void {
    try {
      // read current widths from DOM
      const widths = this.saveColumnSizesFromDOM();
      const payload = {
        selectedColumns: Array.isArray(this.selectedColumns) ? this.selectedColumns : [],
        order: (this.columns || []).map(c => c.field),
        widths
      };
      localStorage.setItem(this.COLUMNS_STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('saveColumnsToStorage failed', e);
    }
  }

  private loadColumnsFromStorage(): boolean {
    try {
      const raw = localStorage.getItem(this.COLUMNS_STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (parsed) {
        if (Array.isArray(parsed.selectedColumns)) {
          this.selectedColumns = parsed.selectedColumns.filter((f: string) => (this.columns || []).some(c => c.field === f));
          for (const c of this.columns) c.visible = this.selectedColumns.includes(c.field);
        }
        if (Array.isArray(parsed.order) && parsed.order.length) {
          const byField = new Map(this.columns.map(c => [c.field, c]));
          const newCols: any[] = [];
          for (const f of parsed.order) {
            const entry = byField.get(f);
            if (entry) { newCols.push(entry); byField.delete(f); }
          }
          for (const [, v] of byField) newCols.push(v);
          this.columns = newCols;
          this.columnsOptions = (this.columns || []).map(c => ({ label: this.translate.instant(c.headerKey) || c.headerKey, value: c.field }));
          // apply saved widths after a short delay to allow DOM to render
          if (parsed.widths && typeof parsed.widths === 'object') {
            setTimeout(() => this.applyColumnSizesToDOM(parsed.widths), 50);
          }
        }
        return true;
      }
      return false;
    } catch (e) {
      console.warn('loadColumnsFromStorage failed', e);
      return false;
    }
  }

  private applyColumnSizesToDOM(widths: { [k: string]: string } | any): void {
    try {
      if (!widths || !this.tableContainer) return;
      const container = this.tableContainer.nativeElement as HTMLElement;
      const ths = container.querySelectorAll('th[data-field]');
      ths.forEach((th: any) => {
        const f = th.getAttribute('data-field');
        if (f && widths[f]) {
          try { th.style.width = widths[f]; } catch (e) { /* ignore */ }
        }
      });
      // Also apply widths to <col> elements if PrimeNG rendered a colgroup (scrollable tables)
      try {
        const visibleFields = (this.columns || []).filter(c => this.selectedColumns.includes(c.field)).map(c => c.field);
        const colgroups = container.querySelectorAll('colgroup');
        colgroups.forEach((cg: any) => {
          const cols = cg.querySelectorAll('col');
          cols.forEach((col: any, idx: number) => {
            const f = visibleFields[idx];
            if (f && widths[f]) {
              try { col.style.width = widths[f]; } catch (e) { /* ignore */ }
            }
          });
        });
      } catch (e) {
        /* non-critical */
      }
    } catch (e) {
      console.warn('applyColumnSizesToDOM failed', e);
    }
  }

  private loadFiltersFromStorage(): boolean {
    try {
      const raw = localStorage.getItem(this.FILTERS_STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      // convert date strings back to Date objects
      ['start_date_from', 'start_date_to', 'due_date_from', 'due_date_to'].forEach(k => {
        const v = parsed[k];
        if (v && typeof v === 'string') {
          const d = new Date(v);
          if (!isNaN(d.getTime())) parsed[k] = d;
        }
      });
      // ensure array fields exist
      ['project_id', 'status_id', 'assignee_id', 'author_id', 'priority'].forEach(k => {
        if (!Array.isArray(parsed[k])) parsed[k] = [];
      });
      this.filters = { ...(this.filters || {}), ...(parsed || {}) };
      return true;
    } catch (e) {
      console.warn('loadFiltersFromStorage failed', e);
      return false;
    }
  }

  private removeFiltersFromStorage(): void {
    try { localStorage.removeItem(this.FILTERS_STORAGE_KEY); } catch (e) { /* ignore */ }
  }

  // search helper (issue-scoped)
  onGlobalFilterIssue(table: any, event: Event): void {
    const val = (event && (event.target as HTMLInputElement)) ? (event.target as HTMLInputElement).value : '';
    try { table.filterGlobal(val, 'contains'); } catch (e) { console.warn('onGlobalFilterIssue failed', e); }
  }

  validateIssueForm(): boolean {
    this.formErrors = {};
    const title = (this.editModel && this.editModel.title) ? String(this.editModel.title).trim() : '';
    const projectId = (this.editModel && (this.editModel.project_id != null)) ? this.editModel.project_id : null;

    if (!title) this.formErrors.title = this.translate.instant('components.issues.form.TITLE') + ' is required';
    if (projectId === null || projectId === undefined || projectId === '') this.formErrors.project_id = this.translate.instant('components.issues.form.PROJECT') + ' is required';

    this.safeDetect();
    return Object.keys(this.formErrors).length === 0;
  }

  loadDepartments(): void {
    this.usersService.getDepartments().subscribe({
      next: (res) => {
        const items = (res && (res as any).data) ? (res as any).data : (res || []);
        this.departments = (items || []).map((d: any) => ({ label: d.name || d.title || d.department || String(d.id), value: d.id }));
        this.departmentsFilter = (this.departments || []).map(d => ({ label: d.label, value: d.label }));
        this.safeDetect();
      },
      error: (err) => { console.warn('Failed to load departments', err); this.departments = []; this.safeDetect(); }
    });
  }

  // intentionally empty the table values — this method keeps the signature but clears items
  loadIssues(): void {
    this.loading = false;
    this.error = null;
    // keep empty by design
    this.issuesItems = [];
    this.jobTitles = [];
    this.safeDetect();
  }

  openNewIssue(): void {
    this.editModel = { project_id: null, title: '', description: '', assignee_id: null, type_id: 1, priority: 'medium' };
    this.isCreating = true;
    this.displayDialog = true;
  }

  deleteSelectedIssues(): void {
    try {
      this.messageService.add({ severity: 'info', summary: 'Not implemented', detail: 'Bulk delete (issues) is not implemented yet' });
    } catch (e) { console.warn('messageService.add failed', e); }
  }

  exportIssuesCSV(): void {
    try {
      const rows = this.issuesItems || [];
      if (!rows.length) {
        try { this.messageService.add({ severity: 'info', summary: this.translate.instant('MENU.EXPORT') || 'Export', detail: this.translate.instant('MENU.ANY') || 'No entries to export' }); } catch (e) { console.warn('messageService.add failed', e); }
        return;
      }
      // export logic (kept similar to users export if later needed)
    } catch (err) {
      console.error('Export failed', err);
      try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.EXPORT') || 'Export', detail: 'Export failed' }); } catch (e) { console.warn('messageService.add failed', e); }
    }
  }

  openEditIssue(user: User): void {
    if (!user) return;
    // copy issue fields into editModel (assume server returns issue-shaped object)
    this.editModel = { ...(user as any) } as any;
    this.displayDialog = true;
  }

  saveIssue(): void {
    if (!this.editModel) return;
    if (!this.isCreating && (this.editModel.id == null)) return;
    const id = (this.editModel.id != null) ? this.editModel.id : null;

    const payload: any = {
      project_id: (this.editModel.project_id != null && this.editModel.project_id !== '') ? Number(this.editModel.project_id) : 0,
      title: String(this.editModel.title || ''),
      description: (this.editModel.description != null) ? String(this.editModel.description) : '',
      assignee_id: (this.editModel.assignee_id != null && this.editModel.assignee_id !== '') ? this.editModel.assignee_id : null,
      type_id: (this.editModel.type_id != null) ? Number(this.editModel.type_id) : 1,
      priority: String(this.editModel.priority || 'medium')
    };

    if (!this.validateIssueForm()) {
      try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.CONFIRM') || 'Error', detail: 'Please fix form errors' }); } catch (e) {}
      return;
    }

    this.loading = true;
    if (this.isCreating) {
      this.issuesService.createIssue(payload).subscribe({
        next: (created: any) => {
          this.displayDialog = false;
          this.editModel = {};
          this.loading = false;
          this.isCreating = false;
          try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.CREATE_ISSUE') || 'Success', detail: this.translate.instant('components.issues.form.CREATED') || 'Created' }); } catch (e) {}
          // refresh list
          if (this.appliedFilters && Object.keys(this.appliedFilters).length) {
            try { this.applyQuery(true); } catch (e) { this.loadIssues(); }
          } else {
            this.loadIssues();
          }
          this.safeDetect();
        },
        error: (err) => { console.error('Failed to create issue', err); this.error = (err && err.message) ? err.message : 'Failed to create'; this.loading = false; this.safeDetect(); }
      });
    } else {
      this.issuesService.updateIssue(id as any, payload).subscribe({
        next: () => {
          this.displayDialog = false;
          this.editModel = {};
          this.loading = false;
          try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.SAVE') || 'Success', detail: this.translate.instant('components.issues.form.UPDATED') || 'Updated' }); } catch (e) {}
          if (this.appliedFilters && Object.keys(this.appliedFilters).length) {
            try { this.applyQuery(true); } catch (e) { this.loadIssues(); }
          } else {
            this.loadIssues();
          }
          this.safeDetect();
        },
        error: (err) => { console.error('Failed to update issue', err); this.error = (err && err.message) ? err.message : 'Failed to update'; this.loading = false; this.safeDetect(); }
      });
    }
  }

  getIssueInitials(user: User | any): string {
    if (!user) return '';
    const fn = (user.first_name || '').toString().trim();
    const ln = (user.last_name || '').toString().trim();
    if (fn && ln) return (fn[0] + ln[0]).toUpperCase();
    if (fn) return fn.split(' ').map((s: string) => s[0]).filter(Boolean).slice(0,2).join('').toUpperCase();
    if (ln) return ln[0].toUpperCase();
    if (user.username) return user.username[0].toUpperCase();
    return '?';
  }

  // derive initials from a single full-name string
  initialsFromName(name?: string | null): string {
    if (!name) return '';
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '';
    if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  issueAvatarColor(user: User | any): string {
    const seed = (user && (user.id ?? user.username ?? (user.first_name || '') + (user.last_name || ''))) || '';
    const s = seed.toString();
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      const ch = s.charCodeAt(i);
      hash = ((hash << 5) - hash) + ch;
      hash = hash & hash;
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 65%, 45%)`;
  }

  issueAvatarTextColor(user: User | any): string {
    const bg = this.issueAvatarColor(user);
    const m = bg.match(/hsl\((\d+),\s*(\d+)%?,\s*(\d+)%?\)/);
    if (!m) return '#fff';
    const lightness = Number(m[3]);
    return lightness > 70 ? '#111' : '#fff';
  }

  // Helpers for select-option avatars (compute from label string)
  selectAvatarBg(label?: string | null): string {
    const s = (label || '').toString();
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      const ch = s.charCodeAt(i);
      hash = ((hash << 5) - hash) + ch;
      hash = hash & hash;
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 65%, 45%)`;
  }

  selectAvatarTextColor(label?: string | null): string {
    const bg = this.selectAvatarBg(label);
    const m = bg.match(/hsl\((\d+),\s*(\d+)%?,\s*(\d+)%?\)/);
    if (!m) return '#fff';
    const lightness = Number(m[3]);
    return lightness > 70 ? '#111' : '#fff';
  }

  confirmDeleteIssue(user: User): void {
    if (!user) return;
    this.confirmationService.confirm({
      message: `${this.translate.instant('MENU.DELETE_USER_QUESTION') || 'Delete'} ${user.first_name} ${user.last_name || ''}?`,
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.deleteIssue(user)
    });
  }

  deleteIssue(user: User): void {
    if (!user) return;
    this.loading = true;
    this.usersService.deleteUser(user.id).subscribe({
      next: () => {
        this.issuesItems = this.issuesItems.filter(u => u.id !== user.id);
        this.selectedIssues = this.selectedIssues.filter(s => s.id !== user.id);
        this.loading = false;
        try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.DELETE') || 'Success', detail: this.translate.instant('MENU.USER_DELETED') || 'Deleted' }); } catch (e) {}
        this.safeDetect();
      },
      error: (err) => { console.error('Failed to delete', err); this.error = (err && err.message) ? err.message : 'Failed to delete'; this.loading = false; this.safeDetect(); }
    });
  }
}
