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
import { forkJoin } from 'rxjs';
import { AvatarService } from '../../services/avatar.service';
import { LinksService } from '../../services/links.service';
import { CustomerQuestionRelationsComponent } from './customer-question-relations';

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
    CustomerQuestionRelationsComponent,
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
  projectOptions: { label: string; value: any; code?: string }[] = [];
  usersOptions: { label: string; value: any; avatar?: string | null }[] = [];
  priorityOptions: { label: string; value: any }[] = [];
  questionId: any = null;
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
    if (m.answer_text !== undefined) delete m.answer_text;
    if (m.due_date) {
      try {
        const d = m.due_date instanceof Date ? m.due_date : new Date(m.due_date);
        m.due_date = !isNaN(d.getTime()) ? d : null;
      } catch (e) { m.due_date = null; }
    }
    this.editModel = m;
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

  loadQuestion(id: any): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.qsService.getQuestion(id).subscribe({
      next: (res: any) => {
        const data = (res && res.data) ? res.data : res;
        this.question = this.normalizeQuestion(data);
        this.loading = false;
        const allowed = (this.question && this.question.allowed_statuses) ? this.question.allowed_statuses : null;
        if (Array.isArray(allowed) && allowed.length) {
          this.statusOptions = allowed.map((s: any) => ({ label: s.name || s.label || String(s.code), value: (s.id !== undefined && s.id !== null) ? s.id : s.code }));
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
    this.qsService.updateQuestion(this.question.id, { status_id: statusId }).subscribe({
      next: () => {
        this.qsService.getQuestion(this.question.id).subscribe({
          next: (fetchRes: any) => {
            const data = (fetchRes && fetchRes.data) ? fetchRes.data : fetchRes;
            this.question = data;
            const allowed = (this.question && this.question.allowed_statuses) ? this.question.allowed_statuses : null;
            if (Array.isArray(allowed) && allowed.length) {
              this.statusOptions = allowed.map((s: any) => ({ label: s.name || s.label || String(s.code), value: (s.id !== undefined && s.id !== null) ? s.id : s.code }));
              this.statusMenuItems = this.statusOptions.map(o => ({ label: o.label, command: () => this.changeStatus(o.value) }));
            } else {
              this.statusOptions = [];
              this.statusMenuItems = [];
            }
            this.statusSaving = false;
            this.cdr.markForCheck();
            try { this.messageService.add({ severity: 'success', summary: this.trOr('components.customer_questions.messages.SUCCESS', 'Success'), detail: this.trOr('components.customer_questions.messages.STATUS_UPDATED', 'Status updated') }); } catch (e) {}
          },
          error: () => {
            this.statusSaving = false;
            this.cdr.markForCheck();
            try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.customer_questions.messages.ERROR'), detail: this.translate.instant('components.customer_questions.messages.STATUS_UPDATE_FAILED') }); } catch (e) {}
          }
        });
      },
      error: (err: any) => {
        this.statusSaving = false;
        this.cdr.markForCheck();
        try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.customer_questions.messages.ERROR'), detail: (err && err.message) ? err.message : this.translate.instant('components.customer_questions.messages.STATUS_UPDATE_FAILED') }); } catch (e) {}
      }
    });
  }

  back(): void {
    this.router.navigate(['/customer-questions']);
  }

  copyQuestionLink(event?: Event): void {
    try {
      if (event && typeof (event.stopPropagation) === 'function') event.stopPropagation();
      const id = this.question?.id ?? this.questionId;
      if (!id) {
        try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.customer_questions.messages.ERROR') || 'Error', detail: this.translate.instant('components.customer_questions.errors.QUESTION_ID_MISSING') || 'Question id missing' }); } catch (e) {}
        return;
      }
      const url = `${window.location.origin}/customer-questions/${id}`;
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
      const askedById = copy.asked_by_avatar_id ?? copy.asked_by_avatarId;
      if (!copy.asked_by_avatar && !copy.asked_by_avatar_url && askedById != null && String(askedById).trim() !== '') {
        copy.asked_by_avatar_url = `/api/storage/${String(askedById).trim()}/download`;
      }
      const answeredById = copy.answered_by_avatar_id ?? copy.answered_by_avatarId;
      if (!copy.answered_by_avatar && !copy.answered_by_avatar_url && answeredById != null && String(answeredById).trim() !== '') {
        copy.answered_by_avatar_url = `/api/storage/${String(answeredById).trim()}/download`;
      }
      // Prefer asked_by_full_name/answered_by_full_name from backend, fall back to legacy fields
      if (!copy.asked_by_full_name) {
        if (copy.asked_by_name) copy.asked_by_full_name = copy.asked_by_name;
        else if (copy.asked_by || copy.askedByName) copy.asked_by_full_name = copy.asked_by || copy.askedByName;
      }
      if (!copy.answered_by_full_name) {
        if (copy.answered_by_name) copy.answered_by_full_name = copy.answered_by_name;
        else if (copy.answered_by || copy.answeredByName) copy.answered_by_full_name = copy.answered_by || copy.answeredByName;
      }
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

