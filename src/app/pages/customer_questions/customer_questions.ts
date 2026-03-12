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
import { ChipModule } from 'primeng/chip';
import { DragDropModule } from 'primeng/dragdrop';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CustomerQuestionsService } from '../../services/customer_questions.service';
import { HttpClient, HttpParams } from '@angular/common/http';
import { lastValueFrom, forkJoin } from 'rxjs';
import { Router } from '@angular/router';
import { Select } from 'primeng/select';
import { AvatarService } from '../../services/avatar.service';
import { LinksService } from '../../services/links.service';

@Component({
  selector: 'app-customer-questions',
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
    ChipModule,
    Select,
    TagModule,
    ConfirmDialogModule,
    ToastModule
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './customer_questions.html',
  styleUrls: ['../../_quill-snow.scss', './customer_questions.scss']
})
export class CustomerQuestionsComponent implements OnInit {
  questionsItems: any[] = [];
  selectedQuestions: any[] = [];
  loading = false;
  error: string | null = null;
  displayDialog = false;
  editModel: any = {};
  isCreating = false;
  formErrors: { question_title?: string } = {};
  queryDialogVisible = false;
  bulkEditDialogVisible = false;
  bulkEditModel: {
    status_id: any;
    answered_by: any;
    priority?: any;
    due_date?: Date | null;
  } = { status_id: null, answered_by: null, priority: null, due_date: null };
  filters: any = {
    // project_id removed: filtering by project disabled
    document_id: null as number | null,
    status: [] as any[],
    priority: [] as any[],
    asked_by: [] as any[],
    answered_by: [] as any[],
    asked_at_from: null as Date | null,
    asked_at_to: null as Date | null,
    answered_at_from: null as Date | null,
    answered_at_to: null as Date | null,
    due_date_from: null as Date | null,
    due_date_to: null as Date | null,
    page: 1,
    limit: 25,
    search: ''
  };
  appliedFilters: any = {};
  projectOptions: { label: string; value: any }[] = [];
  documentsOptions: { label: string; value: any }[] = [];
  typeOptions: { label: string; value: any }[] = [];
  statusOptions: { label: string; value: any }[] = [];
  priorityOptions: { label: string; value: any }[] = [];
  usersOptions: { label: string; value: any; avatar?: string | null }[] = [];
  // Prefer backend-provided full name fields; UI will display formatted surname+initials.
  columns: { field: string; headerKey: string; visible: boolean }[] = [
    { field: 'id', headerKey: 'MENU.ID', visible: true },
    { field: 'project_code', headerKey: 'components.customer_questions.table.PROJECT_CODE', visible: true },
    { field: 'question_title', headerKey: 'components.customer_questions.table.QUESTION_TITLE', visible: true },
    { field: 'type_name', headerKey: 'components.customer_questions.table.TYPE', visible: true },
    { field: 'asked_by_full_name', headerKey: 'components.customer_questions.table.ASKED_BY', visible: true },
    { field: 'answered_by_full_name', headerKey: 'components.customer_questions.table.ANSWERED_BY', visible: true },
    { field: 'status_name', headerKey: 'components.customer_questions.table.STATUS', visible: true },
    { field: 'priority', headerKey: 'components.customer_questions.table.PRIORITY', visible: true },
    { field: 'due_date', headerKey: 'components.customer_questions.table.DUE_DATE', visible: true },
    { field: 'created_at', headerKey: 'components.customer_questions.table.CREATED_AT', visible: true }
  ];
  columnsOptions: { label: string; value: string }[] = [];
  selectedColumns: string[] = [];
  private readonly COLUMNS_STORAGE_KEY = 'customer_questions_columns_v1';
  private readonly FILTERS_STORAGE_KEY = 'customer_questions_query_filters_v1';
  private resizeTimeout: any = null;

  @ViewChild('tableContainer', { static: true }) tableContainer?: ElementRef;

  constructor(
    private qsService: CustomerQuestionsService,
    private cd: ChangeDetectorRef,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private translate: TranslateService,
    private http: HttpClient,
    private router: Router,
    private avatarService: AvatarService,
    private linksService: LinksService
  ) {}

  onRowClick(question: any, event?: Event): void {
    try {
      const target = event && (event.target as HTMLElement);
      if (target && target.closest) {
        const interactive = target.closest('button, a, input, textarea, select, .p-tablecheckbox, .p-checkbox, .p-button');
        if (interactive) return;
      }
      if (!question || (question.id == null)) return;
      this.router.navigate(['/questions', question.id]);
    } catch (e) {
      try { this.router.navigate(['/error']); } catch (er) { }
    }
  }

  projectCode(question: any): string | null {
    try {
      if (!question) return null;
      const direct = question.project_code ?? question.project_key ?? question.projectCode ?? question.projectKey;
      if (direct) return String(direct);
      const pid = question.project_id ?? question.projectId ?? question.project;
      if (pid == null) return question.project_name || null;
      const found = (this.projectOptions || []).find(p => p && (p.value === pid || String(p.value) === String(pid)));
      const foundCode = found ? (found as any).code : null;
      if (foundCode) return foundCode;
      const pn = question.project_name || '';
      const m = pn.match(/^\s*\[([^\]]+)\]\s*/);
      if (m && m[1]) return m[1];
      return question.project_name || null;
    } catch (e) {
      return question && question.project_name ? String(question.project_name) : null;
    }
  }

  private safeDetect(): void {
    try { this.cd.detectChanges(); } catch (e) { }
  }

  ngOnInit(): void {
    this.loadQuestions();
    this.loadProjects();
    // preload global workflow/types (may be filtered later by project)
    try { this.loadQuestionTypes(); } catch (e) {}
    this.loadStatuses();
    this.priorityOptions = [
      { label: this.translate.instant('components.customer_questions.priority.HIGH') || 'High', value: 'high' },
      { label: this.translate.instant('components.customer_questions.priority.MEDIUM') || 'Medium', value: 'medium' },
      { label: this.translate.instant('components.customer_questions.priority.LOW') || 'Low', value: 'low' }
    ];
    this.columnsOptions = (this.columns || []).map(c => ({ label: this.translate.instant(c.headerKey) || c.headerKey, value: c.field }));
    this.selectedColumns = (this.columns || []).filter(c => c.visible).map(c => c.field);
    try { this.loadColumnsFromStorage(); } catch (e) { }
    const restored = this.loadFiltersFromStorage();
    if (restored) {
      setTimeout(() => this.applyQuery(true), 50);
    }
  }

  isColumnVisible(field: string): boolean {
    return this.selectedColumns.includes(field);
  }

  onColumnsChange(): void {
    for (const c of this.columns) c.visible = this.selectedColumns.includes(c.field);
    this.safeDetect();
    try { this.saveColumnsToStorage(); } catch (e) { }
  }

  onColumnsReordered(event: any): void {
    try {
      const dragIndex = (event && event.dragIndex != null) ? Number(event.dragIndex) : null;
      const dropIndex = (event && event.dropIndex != null) ? Number(event.dropIndex) : null;
      const visible = this.columns.filter(c => this.selectedColumns.includes(c.field));
      if (dragIndex == null || dropIndex == null || dragIndex < 0 || dropIndex < 0 || dragIndex >= visible.length || dropIndex > visible.length) {
        this.saveColumnsToStorage();
        return;
      }
      const moved = visible.splice(dragIndex, 1)[0];
      visible.splice(dropIndex, 0, moved);
      const newOrder: any[] = [];
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
    }
  }

  onColumnResized(_event?: any): void {
    try {
      if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => {
        this.saveColumnsToStorage();
      }, 200);
    } catch (e) {
    }
  }

  private saveColumnSizesFromDOM(): { [k: string]: string } {
    const widths: { [k: string]: string } = {};
    try {
      if (!this.tableContainer) return widths;
      const container = this.tableContainer.nativeElement as HTMLElement;
      const ths = container.querySelectorAll('th[data-field]');
      ths.forEach((th: any) => {
        const f = th.getAttribute('data-field');
        if (!f) return;
        const styleW = th.style && th.style.width ? th.style.width : '';
        const w = styleW || (th.getBoundingClientRect ? Math.round(th.getBoundingClientRect().width) + 'px' : '');
        if (w) widths[f] = w;
      });
    } catch (e) {
    }
    return widths;
  }

  loadProjects(): void {
    this.http.get('/api/my_projects').subscribe({
      next: (res: any) => {
        const items = (res && res.data) ? res.data : (res || []);
        this.projectOptions = (items || []).map((p: any) => ({
          label: ((p.code || p.key) ? ('[' + (p.code || p.key) + '] ') : '') + (p.name || p.title || String(p.id)),
          value: p.id,
          code: p.code || p.key || ''
        }));
        const map = new Map<number | string, { label: string; value: any; avatar?: string | null }>();
        for (const p of (items || [])) {
          const parts = p.participants || [];
          for (const part of (parts || [])) {
            const id = part.id;
            if (id == null) continue;
            const label = part.full_name || part.fullName || part.name || part.email || String(id);
            let avatar: string | null = null;
            if (part.avatar_url || part.avatar || part.avatarUrl) {
              avatar = part.avatar_url || part.avatar || part.avatarUrl || null;
            } else if (part.avatar_id || part.avatarId) {
              const aid = part.avatar_id ?? part.avatarId;
              try {
                if (typeof aid === 'number' || (typeof aid === 'string' && String(aid).trim())) {
                  avatar = `/api/storage/${String(aid).trim()}/download`;
                }
              } catch (e) { avatar = null; }
            }
            if (!map.has(id)) map.set(id, { label, value: id, avatar });
          }
        }
        this.usersOptions = Array.from(map.values());
        this.safeDetect();
      },
      error: (err) => { console.warn('Failed to load projects', err); this.projectOptions = []; this.usersOptions = []; this.safeDetect(); }
    });
  }

  loadStatuses(): void {
    this.http.get('/api/customer_question_statuses').subscribe({
      next: (res: any) => {
        const items = (res && res.data) ? res.data : (res || []);
        this.statusOptions = (items || []).map((s: any) => ({ label: s.name || s.title || String(s.id), value: s.id }));
        this.safeDetect();
      },
      error: (err) => { console.warn('Failed to load statuses', err); this.statusOptions = []; this.safeDetect(); }
    });
  }

  openQueryDialog(): void {
    this.queryDialogVisible = true;
  }

  openBulkEditDialog(): void {
    if (!this.selectedQuestions || !this.selectedQuestions.length) {
      try { this.messageService.add({ severity: 'info', summary: this.translate.instant('MENU.BULK_EDIT') || 'Bulk edit', detail: this.translate.instant('components.customer_questions.bulk.NO_SELECTION') || 'No questions selected' }); } catch (e) {}
      return;
    }
    this.bulkEditModel = { status_id: null, answered_by: null, priority: null, due_date: null };
    this.bulkEditDialogVisible = true;
  }

  closeBulkEditDialog(): void {
    this.bulkEditDialogVisible = false;
  }

  async applyBulkEdit(): Promise<void> {
    if (!this.selectedQuestions || !this.selectedQuestions.length) {
      try { this.messageService.add({ severity: 'info', summary: this.translate.instant('MENU.BULK_EDIT') || 'Bulk edit', detail: this.translate.instant('components.customer_questions.bulk.NO_SELECTION') || 'No questions selected' }); } catch (e) {}
      return;
    }
    const ids = (this.selectedQuestions || []).map((s: any) => s.id).filter(Boolean);
    if (!ids.length) {
      try { this.messageService.add({ severity: 'warn', summary: this.translate.instant('MENU.BULK_EDIT') || 'Bulk edit', detail: this.translate.instant('components.customer_questions.bulk.NO_IDS') || 'No valid ids selected' }); } catch (e) {}
      return;
    }
    const fields: any = {};
    if (this.bulkEditModel.status_id !== null && this.bulkEditModel.status_id !== undefined) fields.status_id = this.bulkEditModel.status_id;
    if (this.bulkEditModel.answered_by !== null && this.bulkEditModel.answered_by !== undefined) fields.answered_by = this.bulkEditModel.answered_by;
    // project_id removed from bulk edit
    if (this.bulkEditModel.priority !== null && this.bulkEditModel.priority !== undefined) fields.priority = this.bulkEditModel.priority;
    if (this.bulkEditModel.due_date !== null && this.bulkEditModel.due_date !== undefined) {
      const d = this.bulkEditModel.due_date;
      fields.due_date = (d instanceof Date) ? d.toISOString() : String(d);
    }
    if (!Object.keys(fields).length) {
      try { this.messageService.add({ severity: 'info', summary: this.translate.instant('MENU.BULK_EDIT') || 'Bulk edit', detail: this.translate.instant('components.customer_questions.bulk.NOTHING_TO_APPLY') || 'Nothing to apply' }); } catch (e) {}
      return;
    }
    this.loading = true;
    const promises = ids.map(id => lastValueFrom(this.qsService.updateQuestion(id, fields)));
    const results = await Promise.allSettled(promises);
    this.loading = false;
    const failed = results.filter(r => r.status === 'rejected');
    if (failed.length) {
      try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.BULK_EDIT') || 'Bulk edit', detail: this.translate.instant('components.customer_questions.bulk.PARTIAL_ERROR')?.replace('{n}', String(failed.length)) || (String(failed.length) + ' updates failed') }); } catch (e) {}
    } else {
      try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.BULK_EDIT') || 'Bulk edit', detail: this.translate.instant('components.customer_questions.bulk.SUCCESS') || 'Bulk update applied' }); } catch (e) {}
    }
    this.bulkEditDialogVisible = false;
    if (this.appliedFilters && Object.keys(this.appliedFilters).length) {
      try { this.applyQuery(true); } catch (e) { this.loadQuestions(); }
    } else {
      this.loadQuestions();
    }
    this.safeDetect();
  }

  closeQueryDialog(): void {
    this.queryDialogVisible = false;
  }

  resetQuery(): void {
    this.filters = {
      document_id: null,
      status: [],
      priority: [],
      asked_by: [],
      answered_by: [],
      asked_at_from: null,
      asked_at_to: null,
      answered_at_from: null,
      answered_at_to: null,
      due_date_from: null,
      due_date_to: null,
      page: 1,
      limit: 25,
      search: ''
    };
    this.removeFiltersFromStorage();
  }

  applyQuery(silent = false): void {
    this.appliedFilters = { ...(this.filters || {}) };
    this.queryDialogVisible = false;
    this.loading = true;
    this.error = null;
    try { this.saveFiltersToStorage(); } catch (e) { }
    this.qsService.getQuestions(this.filters).subscribe({
      next: (res: any) => {
        const items = (res && res.data) ? res.data : (res || []);
        this.questionsItems = this.normalizeQuestionsList(items);
        this.loading = false;
        if (!silent) {
          try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.QUERY') || 'Query', detail: this.translate.instant('components.customer_questions.filters.FILTERS_APPLIED') || 'Filters applied' }); } catch (e) {}
        }
        this.safeDetect();
      },
      error: (err) => {
        this.error = (err && err.message) ? err.message : 'Failed to fetch questions';
        this.loading = false;
        if (!silent) {
          try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.QUERY') || 'Query', detail: this.translate.instant('components.customer_questions.filters.FILTERS_APPLY_ERROR') || 'Failed to apply filters' }); } catch (e) {}
        }
        this.safeDetect();
      }
    });
  }

  private saveFiltersToStorage(): void {
    try {
      const copy = { ...(this.filters || {}) };
      ['asked_at_from', 'asked_at_to', 'answered_at_from', 'answered_at_to', 'due_date_from', 'due_date_to'].forEach(k => {
        const v = (copy as any)[k];
        if (v instanceof Date) (copy as any)[k] = v.toISOString();
      });
      localStorage.setItem(this.FILTERS_STORAGE_KEY, JSON.stringify(copy));
    } catch (e) {
    }
  }

  private saveColumnsToStorage(): void {
    try {
      const widths = this.saveColumnSizesFromDOM();
      const payload = {
        selectedColumns: Array.isArray(this.selectedColumns) ? this.selectedColumns : [],
        order: (this.columns || []).map(c => c.field),
        widths
      };
      localStorage.setItem(this.COLUMNS_STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
    }
  }

  private loadColumnsFromStorage(): boolean {
    try {
      const raw = localStorage.getItem(this.COLUMNS_STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (parsed) {
        if (Array.isArray(parsed.selectedColumns)) {
          // migrate legacy keys: 'question_text' -> 'question_title', 'asked_by_name' -> 'asked_by_full_name', 'answered_by_name' -> 'answered_by_full_name'
          const migratedSel = (parsed.selectedColumns || []).map((f: string) => {
            if (f === 'question_text') return 'question_title';
            if (f === 'asked_by_name') return 'asked_by_full_name';
            if (f === 'answered_by_name') return 'answered_by_full_name';
            return f;
          });
          this.selectedColumns = migratedSel.filter((f: string) => (this.columns || []).some(c => c.field === f));
          for (const c of this.columns) c.visible = this.selectedColumns.includes(c.field);
        }
        if (Array.isArray(parsed.order) && parsed.order.length) {
          // migrate legacy ordering keys
          const migratedOrder = (parsed.order || []).map((f: string) => {
            if (f === 'question_text') return 'question_title';
            if (f === 'asked_by_name') return 'asked_by_full_name';
            if (f === 'answered_by_name') return 'answered_by_full_name';
            return f;
          });
          const byField = new Map(this.columns.map(c => [c.field, c]));
          const newCols: any[] = [];
          for (const f of migratedOrder) {
            const entry = byField.get(f);
            if (entry) { newCols.push(entry); byField.delete(f); }
          }
          for (const [, v] of byField) newCols.push(v);
          this.columns = newCols;
          this.columnsOptions = (this.columns || []).map(c => ({ label: this.translate.instant(c.headerKey) || c.headerKey, value: c.field }));
          if (parsed.widths && typeof parsed.widths === 'object') {
            setTimeout(() => this.applyColumnSizesToDOM(parsed.widths), 50);
          }
        }
        return true;
      }
      return false;
    } catch (e) {
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
          try { th.style.width = widths[f]; } catch (e) { }
        }
      });
      try {
        const visibleFields = (this.columns || []).filter(c => this.selectedColumns.includes(c.field)).map(c => c.field);
        const colgroups = container.querySelectorAll('colgroup');
        colgroups.forEach((cg: any) => {
          const cols = cg.querySelectorAll('col');
          cols.forEach((col: any, idx: number) => {
            const f = visibleFields[idx];
            if (f && widths[f]) {
              try { col.style.width = widths[f]; } catch (e) { }
            }
          });
        });
      } catch (e) {
      }
    } catch (e) {
    }
  }

  private loadFiltersFromStorage(): boolean {
    try {
      const raw = localStorage.getItem(this.FILTERS_STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      ['asked_at_from', 'asked_at_to', 'answered_at_from', 'answered_at_to', 'due_date_from', 'due_date_to'].forEach(k => {
        const v = parsed[k];
        if (v && typeof v === 'string') {
          const d = new Date(v);
          if (!isNaN(d.getTime())) parsed[k] = d;
        }
      });
      ['status', 'priority', 'asked_by', 'answered_by'].forEach(k => {
        if (!Array.isArray(parsed[k])) parsed[k] = [];
      });
      this.filters = { ...(this.filters || {}), ...(parsed || {}) };
      return true;
    } catch (e) {
      return false;
    }
  }

  private removeFiltersFromStorage(): void {
    try { localStorage.removeItem(this.FILTERS_STORAGE_KEY); } catch (e) { }
  }

  onGlobalFilterQuestion(table: any, event: Event): void {
    const val = (event && (event.target as HTMLInputElement)) ? (event.target as HTMLInputElement).value : '';
    try { table.filterGlobal(val, 'contains'); } catch (e) { }
  }

  validateQuestionForm(): boolean {
    this.formErrors = {};
    // The short question/title is required
    const title = (this.editModel && this.editModel.question_title) ? String(this.editModel.question_title).trim() : '';
    if (!title) this.formErrors.question_title = this.translate.instant('components.customer_questions.form.QUESTION_TEXT') + ' is required';
    // project is optional on creation; do not enforce project_id
    this.safeDetect();
    return Object.keys(this.formErrors).length === 0;
  }

  loadQuestions(): void {
    this.loading = true;
    this.error = null;
    this.qsService.getQuestions({ page: 1, limit: 25 }).subscribe({
      next: (res: any) => {
        const items = (res && res.data) ? res.data : (res || []);
        this.questionsItems = this.normalizeQuestionsList(items);
        this.loading = false;
        this.safeDetect();
      },
      error: (err) => {
        this.error = (err && err.message) ? err.message : 'Failed to load questions';
        this.questionsItems = [];
        this.loading = false;
        this.safeDetect();
      }
    });
  }

  openNewQuestion(): void {
    // Use unified model: question_title (short) and question_text (full description)
    this.editModel = { question_title: '', question_text: '', priority: 'medium', due_date: null, project_id: null, type_id: null };
    // initialize selected documents holder
    (this.editModel as any).docs_selected = [];
    // clear documents options until a project is selected
    this.documentsOptions = [];
    // types are global; options are loaded on init
    this.isCreating = true;
    this.displayDialog = true;
  }

  onProjectChange(projectId: any): void {
    try {
      this.editModel.project_id = projectId;
      if (projectId == null || projectId === '') {
        this.documentsOptions = [];
        (this.editModel as any).docs_selected = [];
        this.safeDetect();
        return;
      }
      this.loadDocuments(projectId);
      // types are global — ensure they are loaded (no project filter)
      try { this.loadQuestionTypes(); } catch (e) {}
    } catch (e) {}
  }

  exportQuestionsCSV(): void {
    try {
      const rows = this.questionsItems || [];
      if (!rows.length) {
        try { this.messageService.add({ severity: 'info', summary: this.translate.instant('MENU.EXPORT') || 'Export', detail: this.translate.instant('MENU.ANY') || 'No entries to export' }); } catch (e) { }
        return;
      }
    } catch (err) {
      try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.EXPORT') || 'Export', detail: 'Export failed' }); } catch (e) { }
    }
  }

  openEditQuestion(question: any): void {
    if (!question) return;
    // Normalize incoming question object into unified editModel fields
    const m: any = { ...(question as any) };
    // Backend may provide nested objects for project/asked_by/answered_by
    try {
      if (m.project && typeof m.project === 'object') {
        const p = m.project;
        if (p.id !== undefined && p.id !== null) m.project_id = p.id;
        if (p.name) m.project_name = p.name;
        if (p.code) m.project_code = p.code;
      }
      if (m.asked_by && typeof m.asked_by === 'object') {
        const ab = m.asked_by;
        if (ab.id !== undefined && ab.id !== null) m.asked_by = ab.id;
        if (ab.full_name) m.asked_by_full_name = ab.full_name;
        if (ab.avatar_id !== undefined && ab.avatar_id !== null) m.asked_by_avatar_id = ab.avatar_id;
        if (ab.avatar_url) m.asked_by_avatar = ab.avatar_url;
      }
      if (m.answered_by && typeof m.answered_by === 'object') {
        const ab = m.answered_by;
        if (ab.id !== undefined && ab.id !== null) m.answered_by = ab.id;
        if (ab.full_name) m.answered_by_full_name = ab.full_name;
        if (ab.avatar_id !== undefined && ab.avatar_id !== null) m.answered_by_avatar_id = ab.avatar_id;
        if (ab.avatar_url) m.answered_by_avatar = ab.avatar_url;
      }
    } catch (e) {}
    // Legacy mapping: previously short title was stored in question_text and full description in answer_text.
    // Normalize to: question_title (short) and question_text (full description)
    m.question_title = (m.question_title != null) ? m.question_title : (m.question_text != null ? m.question_text : '');
    m.question_text = (m.question_text != null) ? m.question_text : (m.answer_text != null ? m.answer_text : '');
    // Normalize incoming `type` object
    try {
      if (m.type && typeof m.type === 'object') {
        if (m.type.id !== undefined && m.type.id !== null) m.type_id = m.type.id;
        if (m.type.name) m.type_name = m.type.name;
      }
    } catch (e) {}
    // remove legacy answer_text to avoid confusion
    if (m.answer_text !== undefined) delete m.answer_text;
    this.editModel = m as any;
    // If editing existing question, preload documents for its project (if available)
    try { if (m.project_id != null) this.loadDocuments(m.project_id); } catch (e) {}
    // types are global — ensure they are loaded
    try { this.loadQuestionTypes(); } catch (e) {}
    this.isCreating = false;
    this.displayDialog = true;
  }

  saveQuestion(): void {
    if (!this.editModel) return;
    if (!this.isCreating && (this.editModel.id == null)) return;
    const id = (this.editModel.id != null) ? this.editModel.id : null;
    // Build payload. Use unified mapping for both create and update:
    // question_title (short) and question_text (full description)
    const commonFields: any = {
      priority: String(this.editModel.priority || 'medium'),
      due_date: this.editModel.due_date ? (this.editModel.due_date instanceof Date ? this.editModel.due_date.toISOString() : this.editModel.due_date) : null,
    };

    const payload: any = {
      // project_id omitted on creation/update by requirement
      question_title: String(this.editModel.question_title || ''),
      question_text: (this.editModel.question_text != null) ? String(this.editModel.question_text) : '',
      ...commonFields
    };
    // Include project_id when creating a new question (user requested)
    if (this.isCreating) {
      try {
        payload.project_id = (this.editModel && (this.editModel.project_id !== undefined)) ? this.editModel.project_id : null;
      } catch (e) {}
    }
    // Include type_id when creating if selected
    if (this.isCreating) {
      try {
        if (this.editModel && this.editModel.type_id !== undefined && this.editModel.type_id !== null) payload.type_id = this.editModel.type_id;
      } catch (e) {}
    }
    if (!this.validateQuestionForm()) {
      try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.CONFIRM') || 'Error', detail: 'Please fix form errors' }); } catch (e) {}
      return;
    }
    this.loading = true;
    if (this.isCreating) {
      this.qsService.createQuestion(payload).subscribe({
        next: (res: any) => {
          // determine created id – backend may return { data: { ... } } or the object directly
          const created = (res && res.data) ? res.data : res;
          const qid = created && (created.id || created._id) ? (created.id || created._id) : null;
          // after question created, optionally create links to selected documents
          const docs = Array.isArray(this.editModel?.docs_selected) ? this.editModel.docs_selected : [];
          if (qid && docs && docs.length) {
            const tasks = (docs || []).map((d: any) => this.linksService.createLink({ active_type: 'qna', active_id: qid, passive_type: 'document', passive_id: d, relation_type: 'relates' }));
            forkJoin(tasks).subscribe({
              next: () => {
                // success creating links
                this.finalizeCreationAfterLinks();
              },
              error: (lerr) => {
                console.warn('Some links creation failed', lerr);
                // still finalize creation but show warning
                try { this.messageService.add({ severity: 'warn', summary: this.translate.instant('MENU.CREATE') || 'Create', detail: 'Question created but some attachments failed' }); } catch (e) {}
                this.finalizeCreationAfterLinks();
              }
            });
          } else {
            // nothing to link
            this.finalizeCreationAfterLinks();
          }
          // helper closure will finalize UI state
          // prevent double finalize here
        },
        error: (err) => { console.error('Failed to create question', err); this.error = (err && err.message) ? err.message : 'Failed to create'; this.loading = false; this.safeDetect(); }
      });
    } else {
      this.qsService.updateQuestion(id as any, payload).subscribe({
        next: () => {
          this.displayDialog = false;
          this.editModel = {};
          this.loading = false;
          try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.SAVE') || 'Success', detail: this.translate.instant('components.customer_questions.form.UPDATED') || 'Updated' }); } catch (e) {}
          if (this.appliedFilters && Object.keys(this.appliedFilters).length) {
            try { this.applyQuery(true); } catch (e) { this.loadQuestions(); }
          } else {
            this.loadQuestions();
          }
          this.safeDetect();
        },
        error: (err) => { console.error('Failed to update question', err); this.error = (err && err.message) ? err.message : 'Failed to update'; this.loading = false; this.safeDetect(); }
      });
    }
  }

  loadQuestionTypes(projectId?: any): void {
    try {
      const options = (projectId != null) ? { params: new HttpParams().set('project_id', String(projectId)) } : {};
      this.http.get('/api/customer_question_work_flows', options).subscribe({
        next: (res: any) => {
          const items = (res && res.data) ? res.data : (res || []);
          // Extract unique customer_question_type objects
          const map = new Map<any, any>();
          for (const it of (items || [])) {
            try {
              const t = it && (it.customer_question_type || it.type || it.customer_question_type);
              if (t && t.id != null) {
                if (!map.has(t.id)) map.set(t.id, { label: t.name || String(t.id), value: t.id });
              }
            } catch (e) {}
          }
          this.typeOptions = Array.from(map.values());
          this.safeDetect();
        },
        error: (err) => { console.warn('Failed to load question types/workflow', err); this.typeOptions = []; this.safeDetect(); }
      });
    } catch (e) {
      console.warn('Failed to load question types/workflow', e);
      this.typeOptions = [];
      this.safeDetect();
    }
  }

  // Finalize UI state after creation and optional link creation
  private finalizeCreationAfterLinks(): void {
    this.displayDialog = false;
    this.editModel = {};
    this.loading = false;
    this.isCreating = false;
    try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.CREATE') || 'Success', detail: this.translate.instant('components.customer_questions.form.CREATED') || 'Created' }); } catch (e) {}
    if (this.appliedFilters && Object.keys(this.appliedFilters).length) {
      try { this.applyQuery(true); } catch (e) { this.loadQuestions(); }
    } else {
      this.loadQuestions();
    }
    this.safeDetect();
  }

  /**
   * Load documents. If projectId provided, request documents for that project.
   * If projectId is omitted, returns all documents (legacy).
   */
  loadDocuments(projectId?: any): void {
    try {
      const options = (projectId != null) ? { params: new HttpParams().set('project_id', String(projectId)) } : {};
      this.http.get('/api/documents', options).subscribe({
        next: (res: any) => {
          const items = (res && res.data) ? res.data : (res || []);
          this.documentsOptions = (items || []).map((d: any) => ({ label: `#${d.id} ${d.title || d.name || ''}`.trim(), value: d.id }));
          // clear selected docs that don't belong to this project
          if (Array.isArray(this.editModel?.docs_selected) && this.editModel.docs_selected.length && projectId != null) {
            const allowed = new Set((this.documentsOptions || []).map((o: any) => o.value));
            (this.editModel as any).docs_selected = (this.editModel.docs_selected || []).filter((v: any) => allowed.has(v));
          }
          this.safeDetect();
        },
        error: (err) => { console.warn('Failed to load documents', err); this.documentsOptions = []; this.safeDetect(); }
      });
    } catch (e) {
      console.warn('Failed to load documents', e);
      this.documentsOptions = [];
      this.safeDetect();
    }
  }

  getQuestionInitials(question: any): string {
    return this.avatarService.getInitialsFromUser(question);
  }

  initialsFromName(name?: string | null): string {
    return this.avatarService.initialsFromName(name);
  }

  formatSurnameInitials(item: any): string {
    return this.avatarService.formatSurnameInitials(item);
  }

  questionAvatarColor(user: any): string {
    return this.avatarService.issueAvatarColor(user);
  }

  questionAvatarTextColor(user: any): string {
    return this.avatarService.issueAvatarTextColor(user);
  }

  selectAvatarBg(label?: string | null): string {
    return this.avatarService.selectAvatarBg(label);
  }

  selectAvatarTextColor(label?: string | null): string {
    return this.avatarService.selectAvatarTextColor(label);
  }

  statusSeverity(status: any): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | null {
    try {
      if (status === null || status === undefined) return 'secondary';
      const s = String(status).toLowerCase();
      if (s === 'resolved' || s === 'done' || s === 'closed' || s === 'answered') return 'success';
      if (s.includes('progress') || s.includes('in progress') || s.includes('in_progress') || s.includes('pending')) return 'warn';
      if (s === 'new' || s === 'open' || s === 'unanswered') return 'info';
      if (s === 'blocked' || s === 'rejected' || s === 'cancelled') return 'danger';
      return 'secondary';
    } catch (e) {
      return 'secondary';
    }
  }

  prioritySeverity(priority: any): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | null {
    try {
      if (priority === null || priority === undefined) return 'secondary';
      const p = String(priority).toLowerCase();
      if (p === 'high' || p === 'urgent' || p === 'critical') return 'danger';
      if (p === 'medium' || p === 'normal') return 'warn';
      if (p === 'low' || p === 'minor') return 'success';
      return 'info';
    } catch (e) {
      return 'info';
    }
  }

  private normalizeQuestionsList(list: any): any[] {
    const rawList = Array.isArray(list) ? list : (list && list.items ? list.items : []);
    return (rawList || []).map((it: any) => {
      try {
        const copy: any = { ...(it || {}) };
        // Support new backend shape where project/asked_by/answered_by are nested objects
        try {
          if (copy.project && typeof copy.project === 'object') {
            const p = copy.project;
            if (p.id !== undefined && p.id !== null) copy.project_id = p.id;
            if (p.name) copy.project_name = p.name;
            if (p.code) copy.project_code = p.code;
          }
          if (copy.asked_by && typeof copy.asked_by === 'object') {
            const ab = copy.asked_by;
            if (ab.id !== undefined && ab.id !== null) copy.asked_by = ab.id;
            if (ab.full_name) copy.asked_by_full_name = ab.full_name;
            if (ab.avatar_id !== undefined && ab.avatar_id !== null) copy.asked_by_avatar_id = ab.avatar_id;
            if (ab.avatar_url) copy.asked_by_avatar = ab.avatar_url;
          }
          if (copy.answered_by && typeof copy.answered_by === 'object') {
            const ab = copy.answered_by;
            if (ab.id !== undefined && ab.id !== null) copy.answered_by = ab.id;
            if (ab.full_name) copy.answered_by_full_name = ab.full_name;
            if (ab.avatar_id !== undefined && ab.avatar_id !== null) copy.answered_by_avatar_id = ab.avatar_id;
            if (ab.avatar_url) copy.answered_by_avatar = ab.avatar_url;
          }
          // Normalize type object if provided
          if (copy.type && typeof copy.type === 'object') {
            try {
              if (copy.type.id !== undefined && copy.type.id !== null) copy.type_id = copy.type.id;
              if (copy.type.name) copy.type_name = copy.type.name;
            } catch (e) {}
          }
          // Normalize status object if provided (backend may return nested status)
          if (copy.status && typeof copy.status === 'object') {
            try {
              if (copy.status.id !== undefined && copy.status.id !== null) copy.status_id = copy.status.id;
              if (copy.status.name) copy.status_name = copy.status.name;
              if (copy.status.code) copy.status_code = copy.status.code;
            } catch (e) {}
          }
        } catch (e) {}
        const askedById = copy.asked_by_avatar_id ?? copy.asked_by_avatarId;
        if (!copy.asked_by_avatar && !copy.asked_by_avatar_url && (askedById !== null && askedById !== undefined && String(askedById).trim() !== '')) {
          try { copy.asked_by_avatar_url = `/api/storage/${String(askedById).trim()}/download`; } catch (e) { }
        }
        const answeredById = copy.answered_by_avatar_id ?? copy.answered_by_avatarId;
        if (!copy.answered_by_avatar && !copy.answered_by_avatar_url && (answeredById !== null && answeredById !== undefined && String(answeredById).trim() !== '')) {
          try { copy.answered_by_avatar_url = `/api/storage/${String(answeredById).trim()}/download`; } catch (e) { }
        }
        // Populate backend-provided full name fields when available; fall back to legacy fields.
        if (!copy.asked_by_full_name) {
          if (copy.asked_by_name) copy.asked_by_full_name = copy.asked_by_name;
          else if (copy.asked_by || copy.askedByName) copy.asked_by_full_name = copy.asked_by || copy.askedByName;
        }
        if (!copy.answered_by_full_name) {
          if (copy.answered_by_name) copy.answered_by_full_name = copy.answered_by_name;
          else if (copy.answered_by || copy.answeredByName) copy.answered_by_full_name = copy.answered_by || copy.answeredByName;
        }
        // For backward compatibility keep asked_by_name/answered_by_name as formatted display values
        try { if (copy.asked_by_full_name && !copy.asked_by_name) copy.asked_by_name = this.avatarService.formatSurnameInitials(copy.asked_by_full_name); } catch (e) {}
        try { if (copy.answered_by_full_name && !copy.answered_by_name) copy.answered_by_name = this.avatarService.formatSurnameInitials(copy.answered_by_full_name); } catch (e) {}
        // Ensure question_title is available for list view — fallback to legacy question_text
        if (copy.question_title == null || copy.question_title === '') {
          copy.question_title = (copy.question_text != null) ? copy.question_text : '';
        }
        // Add date object fields for p-columnFilter type="date" to work reliably
        try {
          copy.due_date_obj = this.toLocalDateObject(copy.due_date ?? copy.dueDate ?? null);
        } catch (e) { copy.due_date_obj = null; }
        try {
          copy.created_at_obj = this.toLocalDateObject(copy.created_at ?? copy.createdAt ?? copy.created ?? null);
        } catch (e) { copy.created_at_obj = null; }
        return copy;
      } catch (e) {
        return it;
      }
    });
  }

  private dateToDayString(v: any): string | null {
    try {
      if (!v && v !== 0) return null;
      // If value is a string in ISO-like format, prefer taking the date prefix to avoid timezone shifts
      if (typeof v === 'string') {
        const m = v.match(/^(\d{4}-\d{2}-\d{2})/);
        if (m && m[1]) return m[1];
      }
      const d = (v instanceof Date) ? v : new Date(v);
      if (!d || isNaN(d.getTime())) return null;
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch (e) { return null; }
  }

  private toLocalDateObject(v: any): Date | null {
    try {
      if (v === null || v === undefined) return null;
      // If already a Date
      if (v instanceof Date) {
        return new Date(v.getFullYear(), v.getMonth(), v.getDate());
      }
      // If number (timestamp ms)
      if (typeof v === 'number') {
        const d = new Date(v);
        if (isNaN(d.getTime())) return null;
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
      }
      // If string like YYYY-MM-DD (date-only), construct local date
      if (typeof v === 'string') {
        const mDateOnly = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (mDateOnly) {
          const y = Number(mDateOnly[1]);
          const mo = Number(mDateOnly[2]) - 1;
          const dd = Number(mDateOnly[3]);
          return new Date(y, mo, dd);
        }
        // Try full ISO parse then convert to local date parts
        const parsed = new Date(v);
        if (!isNaN(parsed.getTime())) {
          return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
        }
        return null;
      }
      return null;
    } catch (e) { return null; }
  }

  confirmDeleteQuestion(question: any): void {
    if (!question) return;
    this.confirmationService.confirm({
      message: `${this.translate.instant('MENU.DELETE') || 'Delete'} question #${question.id}?`,
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.deleteQuestion(question)
    });
  }

  deleteQuestion(question: any): void {
    if (!question || question.id == null) return;
    this.loading = true;
    this.http.delete(`/api/customer_questions/${question.id}`).subscribe({
      next: () => {
        this.questionsItems = this.questionsItems.filter((u: any) => u.id !== question.id);
        this.selectedQuestions = this.selectedQuestions.filter((s: any) => s.id !== question.id);
        this.loading = false;
        try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.DELETE') || 'Success', detail: this.translate.instant('components.customer_questions.messages.DELETED') || 'Question deleted' }); } catch (e) {}
        this.safeDetect();
      },
      error: (err) => { console.error('Failed to delete question', err); this.error = (err && err.message) ? err.message : 'Failed to delete'; this.loading = false; this.safeDetect(); }
    });
  }
}
