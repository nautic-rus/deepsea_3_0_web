import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { EditorModule } from 'primeng/editor';
import { Select } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { DatePickerModule } from 'primeng/datepicker';
import { CheckboxModule } from 'primeng/checkbox';
import { AvatarModule } from 'primeng/avatar';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ChipModule } from 'primeng/chip';
import { CustomerQuestionsService } from '../../services/customer_questions.service';
import { ToolbarModule } from 'primeng/toolbar';
import { SplitButtonModule } from 'primeng/splitbutton';
import { ToastModule } from 'primeng/toast';
import { MessageService, MenuItem } from 'primeng/api';
import { TranslateService } from '@ngx-translate/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { AuthService } from '../../auth/auth.service';
import { forkJoin } from 'rxjs';
import { AvatarService } from '../../services/avatar.service';
import { LinksService } from '../../services/links.service';
import { CustomerQuestionRelationsComponent } from './customer-question-relations';
import { CustomerQuestionRelationsTableComponent } from './customer-question-relations-table';
import { CustomerQuestionAttachComponent } from './customer-question-attach';

@Component({
  selector: 'app-customer-question-detail',
  standalone: true,
  providers: [MessageService],
  imports: [
    CommonModule,
    TranslateModule,
    RouterModule,
    FormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    EditorModule,
    Select,
    MultiSelectModule,
    DatePickerModule,
    CheckboxModule,
    AvatarModule,
    TagModule,
    ProgressSpinnerModule,
    ChipModule,
    CustomerQuestionRelationsTableComponent,
    CustomerQuestionAttachComponent,
    ToolbarModule,
    SplitButtonModule,
    ToastModule
  ],
  templateUrl: './customer-question-detail.html',
  styleUrls: ['../../_quill-snow.scss', './customer-question-detail.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustomerQuestionDetailComponent implements OnInit {
  question: any = null;
  loading = false;
  error: string | null = null;
  displayDialog = false;
  editModel: any = {};
  formErrors: any = {};
  // inline editing flags (render editor in-place, like IssueDetailDescription)
  displayEditQuestionDialog = false; // kept for backward compat if used elsewhere
  displayEditAnswerDialog = false;
  editingQuestionInline = false;
  editingAnswerInline = false;
  editingQuestionText: string | null = null;
  editingAnswerText: string | null = null;
  projectOptions: { label: string; value: any; code?: string }[] = [];
  usersOptions: { label: string; value: any; avatar?: string | null }[] = [];
  typeOptions: { label: string; value: any }[] = [];
  priorityOptions: { label: string; value: any }[] = [];
  questionId: any = null;
  currentUser: any = null;
  statusOptions: { label: string; value: any }[] = [];
  statusMenuItems: MenuItem[] = [];
  statusSaving = false;
  displayDeleteDialog = false;
  deleting = false;
  // Add-relation dialog state
  displayAddRelationDialog = false;
  relationForm: any = {
    selectedIssueIds: [],
    selectedDocumentIds: [],
    relationType: 'relates',
    direction: 'source'
  };
  relationTypeOptions: { label: string; value: any }[] = [];
  blocksDirectionOptions: { label: string; value: any }[] = [];
  availableIssuesOptions: { label: string; value: any }[] = [];
  availableDocumentsOptions: { label: string; value: any }[] = [];
  savingRelations = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private qsService: CustomerQuestionsService,
    private http: HttpClient,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
    private avatarService: AvatarService,
    private linksService: LinksService
    ,
    private auth: AuthService
  ) {
    const idStr = this.route.snapshot.paramMap.get('id');
    if (idStr !== null) {
      const n = Number(idStr);
      this.questionId = Number.isFinite(n) ? n : idStr;
    } else {
      this.questionId = null;
    }
  }

  ngOnInit(): void {
    if (!this.questionId) {
      this.error = this.translate.instant('components.customer_questions.errors.QUESTION_ID_MISSING');
      return;
    }
    this.loadQuestion(this.questionId);
    this.loadProjects();
    // load global question types/workflow
    try { this.loadQuestionTypes(); } catch (e) {}
    // fetch current user for answered_by assignment
    try {
      this.auth.me().subscribe({ next: (u: any) => { this.currentUser = u; }, error: () => { this.currentUser = null; } });
    } catch (e) { this.currentUser = null; }
    this.priorityOptions = [
      { label: this.translate.instant('components.customer_questions.priority.HIGH') || 'High', value: 'high' },
      { label: this.translate.instant('components.customer_questions.priority.MEDIUM') || 'Medium', value: 'medium' },
      { label: this.translate.instant('components.customer_questions.priority.LOW') || 'Low', value: 'low' }
    ];

    // relation-type option labels are translation keys; template will render them using the translate pipe
    this.relationTypeOptions = [
      { label: 'components.issues.relations.FORM.TYPE_RELATES', value: 'relates' },
      { label: 'components.issues.relations.FORM.TYPE_BLOCKS', value: 'blocks' }
    ];
    this.blocksDirectionOptions = [
      { label: 'components.issues.relations.FORM.BLOCKS_ACTIVE', value: 'source' },
      { label: 'components.issues.relations.FORM.BLOCKS_PASSIVE', value: 'target' }
    ];
  }

  openEditQuestionDialog(): void {
    try {
      this.editingQuestionText = this.question && this.question.question_text != null ? this.question.question_text : '';
      this.editingQuestionInline = true;
      this.cdr.markForCheck();
    } catch (e) { this.editingQuestionText = ''; this.editingQuestionInline = true; }
  }

  saveQuestionText(): void {
    if (!this.question || !this.question.id) return;
    const id = this.question.id;
    const payload: any = { question_text: (this.editingQuestionText != null) ? String(this.editingQuestionText) : '' };
    this.loading = true;
    this.qsService.updateQuestion(id, payload).subscribe({
      next: () => {
        // Update local model immediately to avoid visible reload delay
        this.editingQuestionInline = false;
        this.editingQuestionText = null;
        this.loading = false;
        try {
          if (this.question) {
            this.question.question_text = payload.question_text;
            // keep short title if empty: fallback to trimmed plain text
            if (!this.question.question_title) {
              const plain = (payload.question_text || '').replace(/<[^>]*>/g, '').replace(/&nbsp;|&#160;/g, ' ').trim();
              this.question.question_title = plain ? (plain.length > 120 ? plain.substring(0, 120) + '...' : plain) : '';
            }
          }
        } catch (e) { }
        try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.SAVE') || 'Saved', detail: this.translate.instant('components.customer_questions.form.UPDATED') || 'Updated' }); } catch (e) {}
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.loading = false;
        try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.SAVE') || 'Save failed', detail: (err && err.message) ? err.message : 'Failed to update' }); } catch (e) {}
        this.cdr.markForCheck();
      }
    });
  }

  openEditAnswerDialog(): void {
    try {
      this.editingAnswerText = this.question && this.question.answer_text != null ? this.question.answer_text : '';
      this.editingAnswerInline = true;
      this.cdr.markForCheck();
    } catch (e) { this.editingAnswerText = ''; this.editingAnswerInline = true; }
  }

  saveAnswerText(): void {
    if (!this.question || !this.question.id) return;
    const id = this.question.id;
    const newAnswer = (this.editingAnswerText != null) ? String(this.editingAnswerText) : '';
    const payload: any = { answer_text: newAnswer };
    try {
      if (newAnswer && this.currentUser && (this.currentUser.id || this.currentUser.user_id || this.currentUser.uid)) {
        payload.answered_by = this.currentUser.id ?? this.currentUser.user_id ?? this.currentUser.uid;
      }
    } catch (e) {}
    this.loading = true;
    this.qsService.updateQuestion(id, payload).subscribe({
      next: () => {
        // Update local model immediately to avoid visible reload delay
        this.editingAnswerInline = false;
        this.editingAnswerText = null;
        this.loading = false;
        try {
          if (this.question) {
            this.question.answer_text = payload.answer_text;
            if (payload.answered_by) {
              this.question.answered_by = payload.answered_by;
              // set answered_by_full_name from currentUser when available
              if (this.currentUser) {
                this.question.answered_by_full_name = this.currentUser.full_name ?? this.currentUser.name ?? (this.currentUser.first_name ? (this.currentUser.first_name + (this.currentUser.last_name ? ' ' + this.currentUser.last_name : '')) : this.question.answered_by_full_name);
              }
            }
          }
        } catch (e) { }
        try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.SAVE') || 'Saved', detail: this.translate.instant('components.customer_questions.form.UPDATED') || 'Updated' }); } catch (e) {}
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.loading = false;
        try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.SAVE') || 'Save failed', detail: (err && err.message) ? err.message : 'Failed to update' }); } catch (e) {}
        this.cdr.markForCheck();
      }
    });
  }

  // Helper used from template: check whether a HTML string contains visible text
  // Returns true when there is at least one non-whitespace character after stripping tags/entities
  public hasTextContent(html: any): boolean {
    try {
      if (html === null || html === undefined) return false;
      const s = String(html);
      // Remove HTML tags
      const withoutTags = s.replace(/<[^>]*>/g, '');
      // Replace common HTML entities that act like spaces
      const decoded = withoutTags.replace(/&nbsp;|&#160;/g, ' ').replace(/\u00A0/g, '');
      // Remove zero-width and control characters and collapse whitespace
      const cleaned = decoded.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
      return cleaned.length > 0;
    } catch (e) {
      return false;
    }
  }

  // Open add-relation dialog (triggered from child relations component)
  openAddRelationDialog(): void {
    if (!this.question || !this.question.project_id) {
      if (!this.question || !this.question.project) {
        this.displayAddRelationDialog = true;
        this.loadAvailableTargets(null);
        return;
      }
    }
    this.displayAddRelationDialog = true;
    const projectId = this.question.project_id ?? this.question.project ?? null;
    this.loadAvailableTargets(projectId);
  }

  // Load questions and documents belonging to the same project to populate multi-selects
  private loadAvailableTargets(_projectId: any | null): void {
    // Do not filter by project_id — load available questions and documents globally
    let params = new HttpParams();
    params = params.set('per_page', '200');
    params = params.set('is_active', 'true');

    const reqIssues = this.http.get('/api/customer_questions', { params }).pipe();
    const reqDocs = this.http.get('/api/documents', { params }).pipe();

    forkJoin([reqIssues, reqDocs]).subscribe({
      next: ([resIssues, resDocs]: any) => {
        try {
          const extract = (r: any) => Array.isArray(r) ? r : (r && (r.data || r.items) ? (r.data || r.items) : []);
          const issues = extract(resIssues) as any[];
          const docs = extract(resDocs) as any[];
          this.availableIssuesOptions = (issues || []).map((it: any) => ({ label: `#${it.id} ${it.question_text || it.title || it.name || ''}`.trim(), value: it.id }));
          this.availableDocumentsOptions = (docs || []).map((d: any) => ({ label: `#${d.id} ${d.title || d.name || ''}`.trim(), value: d.id }));
        } catch (e) {
          this.availableIssuesOptions = [];
          this.availableDocumentsOptions = [];
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.availableIssuesOptions = [];
        this.availableDocumentsOptions = [];
        this.cdr.markForCheck();
      }
    });
  }

  // Save relations: create link records for each selected target. Use active_type 'qna'
  saveRelations(): void {
    if (!this.question || !this.question.id) return;
    const sourceId = Number(this.question.id);
    const tasks: any[] = [];
    const type = this.relationForm.relationType || 'relates';

    const buildPayload = (srcType: string, srcId: any, tgtType: string, tgtId: any) => ({
      active_type: srcType,
      active_id: srcId,
      passive_type: tgtType,
      passive_id: tgtId,
      relation_type: type
    });

    for (const id of (this.relationForm.selectedIssueIds || [])) {
      if (!id) continue;
      if (type === 'blocks') {
        if (this.relationForm.direction === 'source') {
          tasks.push(this.linksService.createLink(buildPayload('qna', sourceId, 'qna', id)));
        } else {
          tasks.push(this.linksService.createLink(buildPayload('qna', id, 'qna', sourceId)));
        }
      } else {
        tasks.push(this.linksService.createLink(buildPayload('qna', sourceId, 'qna', id)));
      }
    }

    for (const id of (this.relationForm.selectedDocumentIds || [])) {
      if (!id) continue;
      if (type === 'blocks') {
        if (this.relationForm.direction === 'source') {
          tasks.push(this.linksService.createLink(buildPayload('qna', sourceId, 'document', id)));
        } else {
          tasks.push(this.linksService.createLink(buildPayload('document', id, 'qna', sourceId)));
        }
      } else {
        tasks.push(this.linksService.createLink(buildPayload('qna', sourceId, 'document', id)));
      }
    }

    if (!tasks.length) {
      this.displayAddRelationDialog = false;
      return;
    }

    this.savingRelations = true;
    forkJoin(tasks).subscribe({
      next: () => {
        this.savingRelations = false;
        this.displayAddRelationDialog = false;
        this.loadQuestion(this.question.id);
        this.cdr.markForCheck();
        try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.SAVE') || 'Saved', detail: this.translate.instant('components.issues.relations.FORM.SAVED') || 'Relations created' }); } catch (e) {}
      },
      error: (err) => {
        this.savingRelations = false;
        this.cdr.markForCheck();
        try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.customer_questions.messages.ERROR'), detail: (err && err.message) ? err.message : this.translate.instant('components.customer_questions.messages.ERROR') }); } catch (e) {}
      }
    });
  }

  openEditDialog(): void {
    if (!this.question) return;
    const m: any = { ...(this.question || {}) };
    // Normalize legacy fields: ensure question_title (short) and question_text (full)
    m.question_title = (m.question_title != null) ? m.question_title : (m.question_text != null ? m.question_text : '');
    m.question_text = (m.question_text != null) ? m.question_text : (m.answer_text != null ? m.answer_text : '');
    // ensure answer_text is available for editing (prefill with existing answer if present)
    m.answer_text = (m.answer_text != null) ? m.answer_text : (this.question && this.question.answer_text != null ? this.question.answer_text : '');
    if (m.answer_text !== undefined) delete m.answer_text;
    if (m.due_date) {
      try {
        const d = m.due_date instanceof Date ? m.due_date : new Date(m.due_date);
        m.due_date = !isNaN(d.getTime()) ? d : null;
      } catch (e) { m.due_date = null; }
    }
    this.editModel = m;
    // ensure type_id present in editModel
    try {
      if (m.type && typeof m.type === 'object') {
        if (m.type.id !== undefined && m.type.id !== null) m.type_id = m.type.id;
        if (m.type.name) m.type_name = m.type.name;
      }
      // fallback to question.type_id if editModel doesn't contain type_id
      if ((m.type_id === undefined || m.type_id === null) && this.question && this.question.type_id !== undefined && this.question.type_id !== null) {
        m.type_id = this.question.type_id;
      }
    } catch (e) {}
    this.displayDialog = true;
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
        this.cdr.markForCheck();
      },
      error: (err: any) => { console.warn('Failed to load projects', err); this.projectOptions = []; this.usersOptions = []; this.cdr.markForCheck(); }
    });
  }

  prioritySeverity(priority: any): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | null {
    try {
      if (!priority && priority !== 0) return 'info';
      const p = String(priority).toLowerCase();
      if (p === 'high' || p === 'urgent' || p === 'critical') return 'danger';
      if (p === 'medium' || p === 'normal') return 'warn';
      if (p === 'low' || p === 'minor') return 'success';
      return 'info';
    } catch (e) {
      return 'info';
    }
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

  validateQuestionForm(): boolean {
    this.formErrors = {};
    // require short question/title
    if (!this.editModel || !this.editModel.question_title || !String(this.editModel.question_title).trim()) this.formErrors.question_title = this.translate.instant('components.customer_questions.form.QUESTION_TEXT_REQUIRED') || 'Question is required';
    return Object.keys(this.formErrors).length === 0;
  }

  saveQuestion(): void {
    if (!this.editModel) return;
    const id = this.editModel.id != null ? this.editModel.id : (this.question && this.question.id) || null;
    const payload: any = {
      question_title: String(this.editModel.question_title || ''),
      question_text: (this.editModel.question_text != null) ? String(this.editModel.question_text) : '',
      priority: String(this.editModel.priority || 'medium'),
      due_date: this.editModel.due_date ? (this.editModel.due_date instanceof Date ? this.editModel.due_date.toISOString() : this.editModel.due_date) : null,
    };
    // handle answer_text update and set answered_by to current user when answer changed
    try {
      const originalAnswer = this.question && (this.question.answer_text || '');
      const newAnswer = this.editModel && (this.editModel.answer_text != null) ? String(this.editModel.answer_text) : '';
      if (newAnswer !== (originalAnswer || '')) {
        payload.answer_text = newAnswer;
        if (newAnswer && this.currentUser && (this.currentUser.id || this.currentUser.user_id || this.currentUser.uid)) {
          payload.answered_by = this.currentUser.id ?? this.currentUser.user_id ?? this.currentUser.uid;
        }
      }
    } catch (e) {}
    // include type_id when editing if present
    try { if (this.editModel && this.editModel.type_id !== undefined && this.editModel.type_id !== null) payload.type_id = this.editModel.type_id; } catch (e) {}
    // include type_id when updating if present in editModel
    try {
      if (this.editModel && this.editModel.type_id !== undefined && this.editModel.type_id !== null) payload.type_id = this.editModel.type_id;
    } catch (e) {}
    if (!this.validateQuestionForm()) return;
    this.loading = true;
    this.qsService.updateQuestion(id as any, payload).subscribe({
      next: () => {
        this.loadQuestion(id);
        this.displayDialog = false;
        this.loading = false;
        this.cdr.markForCheck();
        try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.SAVE') || 'Saved', detail: this.translate.instant('components.customer_questions.form.UPDATED') || 'Updated' }); } catch (e) {}
      },
      error: (err: any) => { console.error('Failed to update question', err); this.loading = false; this.cdr.markForCheck(); try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.SAVE') || 'Save failed', detail: (err && err.message) ? err.message : 'Failed to update' }); } catch (e) {} }
    });
  }

  loadQuestionTypes(): void {
    try {
      this.http.get('/api/customer_question_work_flows').subscribe({
        next: (res: any) => {
          const items = (res && res.data) ? res.data : (res || []);
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
          this.cdr.markForCheck();
        },
        error: (err) => { console.warn('Failed to load question types', err); this.typeOptions = []; this.cdr.markForCheck(); }
      });
    } catch (e) { this.typeOptions = []; this.cdr.markForCheck(); }
  }

  loadQuestion(id: any): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.qsService.getQuestion(id).subscribe({
      next: (res: any) => {
        const data = (res && res.data) ? res.data : res;
        this.question = this.normalizeQuestion(data);
        this.loading = false;
        // prefer API field `available_statuses`, fallback to legacy `allowed_statuses`
        const avail = (this.question && (this.question.available_statuses || this.question.allowed_statuses || this.question.allowedStatuses)) ? (this.question.available_statuses || this.question.allowed_statuses || this.question.allowedStatuses) : null;
        if (Array.isArray(avail) && avail.length) {
          this.statusOptions = avail.map((s: any) => ({ label: s.name || s.label || String(s.code || s.id), value: (s.id !== undefined && s.id !== null) ? s.id : s.code }));
          this.statusMenuItems = this.statusOptions.map(o => ({ label: o.label, command: () => this.changeStatus(o.value) }));
        } else {
          this.statusOptions = [];
          this.statusMenuItems = [];
        }
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.error = (err && err.message) ? err.message : this.translate.instant('components.customer_questions.errors.FAILED_LOAD');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  changeStatus(statusId: any): void {
    if (!this.question || !this.question.id) return;
    this.statusSaving = true;
    this.cdr.markForCheck();
    // Optimistic update: update local question.status_name immediately and update server.
    const prevStatus = { id: this.question.status_id, name: this.question.status_name };
    try {
      const found = (this.statusOptions || []).find(o => String(o.value) === String(statusId));
      if (found) {
        this.question.status_id = found.value;
        this.question.status_name = found.label;
      } else {
        this.question.status_id = statusId;
      }
    } catch (e) {}
    this.cdr.markForCheck();

    this.qsService.updateQuestion(this.question.id, { status_id: statusId }).subscribe({
      next: () => {
        this.statusSaving = false;
        this.cdr.markForCheck();
        try { this.messageService.add({ severity: 'success', summary: this.trOr('components.customer_questions.messages.SUCCESS', 'Success'), detail: this.trOr('components.customer_questions.messages.STATUS_UPDATED', 'Status updated') }); } catch (e) {}
      },
      error: (err: any) => {
        // rollback to previous status on error
        try {
          this.question.status_id = prevStatus.id;
          this.question.status_name = prevStatus.name;
        } catch (e) {}
        this.statusSaving = false;
        this.cdr.markForCheck();
        try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.customer_questions.messages.ERROR'), detail: (err && err.message) ? err.message : this.translate.instant('components.customer_questions.messages.STATUS_UPDATE_FAILED') }); } catch (e) {}
      }
    });
  }

  back(): void {
    this.router.navigate(['/questions']);
  }

  copyQuestionLink(event?: Event): void {
    try {
      if (event && typeof (event.stopPropagation) === 'function') event.stopPropagation();
      const id = this.question?.id ?? this.questionId;
      if (!id) {
        try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.customer_questions.messages.ERROR') || 'Error', detail: this.translate.instant('components.customer_questions.errors.QUESTION_ID_MISSING') || 'Question id missing' }); } catch (e) {}
        return;
      }
      const url = `${window.location.origin}/questions/${id}`;
      if (navigator && (navigator as any).clipboard && typeof (navigator as any).clipboard.writeText === 'function') {
        (navigator as any).clipboard.writeText(url).then(() => {
          try { this.messageService.add({ severity: 'success', summary: this.translate.instant('components.customer_questions.messages.COPY_LINK') || 'Copied', detail: this.translate.instant('components.customer_questions.messages.LINK_COPIED') || 'Link copied to clipboard' }); } catch (e) {}
        }).catch(() => {
          try { window.prompt(this.translate.instant('components.customer_questions.messages.COPY_PROMPT') || 'Copy link', url); } catch (e) {}
        });
      } else {
        try { window.prompt(this.translate.instant('components.customer_questions.messages.COPY_PROMPT') || 'Copy link', url); } catch (e) {}
      }
    } catch (e) {
      try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.customer_questions.messages.ERROR') || 'Error', detail: String(e) }); } catch (er) {}
    } finally {
      try { this.cdr.markForCheck(); } catch (e) {}
    }
  }

  openDeleteDialog(): void {
    this.displayDeleteDialog = true;
    this.cdr.markForCheck();
  }

  closeDeleteDialog(): void {
    this.displayDeleteDialog = false;
    this.cdr.markForCheck();
  }

  confirmDelete(): void {
    if (!this.question || !this.question.id) {
      try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.customer_questions.messages.ERROR') || 'Error', detail: this.translate.instant('components.customer_questions.errors.QUESTION_ID_MISSING') || 'Question id missing' }); } catch (e) {}
      return;
    }
    this.deleting = true;
    this.cdr.markForCheck();
    this.qsService.deleteQuestion(this.question.id).subscribe({
      next: () => {
        this.deleting = false;
        this.displayDeleteDialog = false;
        this.cdr.markForCheck();
        try { this.messageService.add({ severity: 'success', summary: this.trOr('components.customer_questions.messages.SUCCESS', 'Success'), detail: this.trOr('components.customer_questions.messages.DELETED', 'Question deleted') }); } catch (e) {}
        try { this.router.navigate(['/customer-questions']); } catch (e) {}
      },
      error: (err: any) => {
        this.deleting = false;
        this.displayDeleteDialog = false;
        this.cdr.markForCheck();
        try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.customer_questions.messages.ERROR') || 'Error', detail: (err && err.message) ? err.message : this.translate.instant('components.customer_questions.messages.DELETE_FAILED') || 'Failed to delete question' }); } catch (e) {}
      }
    });
  }

  askedByInitials(): string {
    try {
      const name = (this.question && (this.question.asked_by_full_name || this.question.asked_by_name || this.question.asked_by || '')) || '';
      return this.avatarService.initialsFromName(name);
    } catch (e) {
      return '';
    }
  }

  personInitials(name?: string): string {
    try {
      const candidate = name || (this.question && (this.question.asked_by_full_name || this.question.asked_by_name || '')) || '';
      return this.avatarService.initialsFromName(candidate);
    } catch (e) {
      return '';
    }
  }

  questionAvatarColor(user: any): string {
    return this.avatarService.issueAvatarColor(user);
  }

  questionAvatarTextColor(user: any): string {
    return this.avatarService.issueAvatarTextColor(user);
  }

  initialsFromName(name?: string | null): string {
    return this.avatarService.initialsFromName(name);
  }

  formatSurnameInitials(item: any): string {
    return this.avatarService.formatSurnameInitials(item);
  }

  selectAvatarBg(label?: string | null): string {
    return this.avatarService.selectAvatarBg(label);
  }

  selectAvatarTextColor(label?: string | null): string {
    return this.avatarService.selectAvatarTextColor(label);
  }

  private normalizeQuestion(question: any): any {
    if (!question) return question;
    try {
      const copy: any = { ...(question || {}) };
      // If backend provides nested objects, normalize them to flat fields used by template
      try {
        if (copy.project && typeof copy.project === 'object') {
          const p = copy.project;
          if (p.id !== undefined && p.id !== null) copy.project_id = p.id;
          if (p.name) copy.project_name = p.name;
          if (p.code) copy.project_code = p.code;
        }
      } catch (e) {}

      try {
        if (copy.asked_by && typeof copy.asked_by === 'object') {
          const ab = copy.asked_by;
          if (ab.id !== undefined && ab.id !== null) copy.asked_by = ab.id;
          if (ab.full_name) copy.asked_by_full_name = ab.full_name;
          if (ab.avatar_id !== undefined && ab.avatar_id !== null) copy.asked_by_avatar_id = ab.avatar_id;
          if (ab.avatar_url) copy.asked_by_avatar = ab.avatar_url;
        }
      } catch (e) {}

      try {
        if (copy.answered_by && typeof copy.answered_by === 'object') {
          const ab = copy.answered_by;
          if (ab.id !== undefined && ab.id !== null) copy.answered_by = ab.id;
          if (ab.full_name) copy.answered_by_full_name = ab.full_name;
          if (ab.avatar_id !== undefined && ab.avatar_id !== null) copy.answered_by_avatar_id = ab.avatar_id;
          if (ab.avatar_url) copy.answered_by_avatar = ab.avatar_url;
        }
      } catch (e) {}

      // If avatar ids present but no url, build download URL
      try {
        const askedById = copy.asked_by_avatar_id ?? copy.asked_by_avatarId;
        if (!copy.asked_by_avatar && !copy.asked_by_avatar_url && askedById != null && String(askedById).trim() !== '') {
          copy.asked_by_avatar_url = `/api/storage/${String(askedById).trim()}/download`;
        }
      } catch (e) {}

      try {
        const answeredById = copy.answered_by_avatar_id ?? copy.answered_by_avatarId;
        if (!copy.answered_by_avatar && !copy.answered_by_avatar_url && answeredById != null && String(answeredById).trim() !== '') {
          copy.answered_by_avatar_url = `/api/storage/${String(answeredById).trim()}/download`;
        }
      } catch (e) {}

      // Normalize status and type objects
      try {
        if (copy.status && typeof copy.status === 'object') {
          if (copy.status.name) copy.status_name = copy.status.name;
          if (copy.status.code) copy.status_code = copy.status.code;
          if (copy.status.id !== undefined && copy.status.id !== null) copy.status_id = copy.status.id;
        } else {
          // fallback to legacy fields
          if (!copy.status_name && copy.status_name !== '') {
            copy.status_name = copy.status_name;
          }
        }
      } catch (e) {}

      try {
        if (copy.type && typeof copy.type === 'object') {
          if (copy.type.name) copy.type_name = copy.type.name;
          if (copy.type.id !== undefined && copy.type.id !== null) copy.type_id = copy.type.id;
        }
      } catch (e) {}

      // Prefer full_name fields where available, fall back to legacy
      try {
        if (!copy.asked_by_full_name) {
          if (copy.asked_by_name) copy.asked_by_full_name = copy.asked_by_name;
          else if (copy.asked_by || copy.askedByName) copy.asked_by_full_name = copy.asked_by || copy.askedByName;
        }
        if (!copy.answered_by_full_name) {
          if (copy.answered_by_name) copy.answered_by_full_name = copy.answered_by_name;
          else if (copy.answered_by || copy.answeredByName) copy.answered_by_full_name = copy.answered_by || copy.answeredByName;
        }
      } catch (e) {}

      try { if (copy.asked_by_full_name && !copy.asked_by_name) copy.asked_by_name = this.avatarService.formatSurnameInitials(copy.asked_by_full_name); } catch (e) {}
      try { if (copy.answered_by_full_name && !copy.answered_by_name) copy.answered_by_name = this.avatarService.formatSurnameInitials(copy.answered_by_full_name); } catch (e) {}

      return copy;
    } catch (e) {
      return question;
    }
  }

  private trOr(key: string, fallback: string): string {
    try {
      const v = this.translate.instant(key);
      if (!v || v === key) return fallback;
      return v;
    } catch (e) { return fallback; }
  }
}

