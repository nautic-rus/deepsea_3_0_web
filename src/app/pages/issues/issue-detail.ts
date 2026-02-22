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
import { IssuesService } from './issues.service';
import { ToolbarModule } from 'primeng/toolbar';
import { IssueDetailChatComponent } from './issue-detail-chat/issue-detail-chat.component';
import { IssueDetailDescriptionComponent } from './issue-detail-description';
import { IssueDetailAttachComponent } from './issue-detail-attach';
import { IssueDetailRelationsTableComponent } from './issue-detail-relations-table';
import { SplitButtonModule } from 'primeng/splitbutton';
import { ToastModule } from 'primeng/toast';
import { MessageService, MenuItem } from 'primeng/api';
import { TranslateService } from '@ngx-translate/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-issue-detail',
  standalone: true,
  providers: [MessageService],
  imports: [CommonModule, TranslateModule, RouterModule, FormsModule, ButtonModule, DialogModule, InputTextModule, EditorModule, Select, MultiSelectModule, DatePickerModule, CheckboxModule, AvatarModule, TagModule, ProgressSpinnerModule, ChipModule, ToolbarModule, IssueDetailChatComponent, IssueDetailDescriptionComponent, IssueDetailAttachComponent, IssueDetailRelationsTableComponent, SplitButtonModule, ToastModule],
  templateUrl: './issue-detail.html',
  styleUrls: ['./issue-detail.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IssueDetailComponent implements OnInit {
  issue: any = null;
  loading = false;
  error: string | null = null;
  // edit dialog state
  displayDialog = false;
  editModel: any = {};
  isCreating = false; // TODO: remove when create dialog is separated
  formErrors: any = {};
  projectOptions: { label: string; value: any; code?: string }[] = [];
  usersOptions: { label: string; value: any; avatar?: string | null }[] = [];
  typeOptions: { label: string; value: any }[] = [];
  priorityOptions: { label: string; value: any }[] = [];
  tagsOptions: { label: string; value: any }[] = [];
  // keep flexible type because route params are strings but server may return numeric ids
  issueId: any = null;
  statusOptions: { label: string; value: any }[] = [];
  statusMenuItems: MenuItem[] = [];
  statusSaving = false;
  // Add-relation dialog state
  displayAddRelationDialog = false;
  relationForm: any = {
    selectedIssueIds: [],
    selectedDocumentIds: [],
    relationType: 'relates',
    // direction uses 'source' | 'target' to match blocksDirectionOptions values
    direction: 'source'
  };
  relationTypeOptions: { label: string; value: any }[] = [];
  blocksDirectionOptions: { label: string; value: any }[] = [];
  availableIssuesOptions: { label: string; value: any }[] = [];
  availableDocumentsOptions: { label: string; value: any }[] = [];
  savingRelations = false;

  constructor(private route: ActivatedRoute, private router: Router, private issuesService: IssuesService, private http: HttpClient, private messageService: MessageService, private cdr: ChangeDetectorRef, private translate: TranslateService) {
    // read route param synchronously in constructor to avoid ExpressionChangedAfterItHasBeenCheckedError
    // normalize numeric ids so initial template value type matches the server-provided issue.id
    const idStr = this.route.snapshot.paramMap.get('id');
    if (idStr !== null) {
      const n = Number(idStr);
      this.issueId = Number.isFinite(n) ? n : idStr;
    } else {
      this.issueId = null;
    }
  }

  ngOnInit(): void {
    if (!this.issueId) {
      this.error = this.translate.instant('components.issues.errors.ISSUE_ID_MISSING');
      return;
    }
    this.loadIssue(this.issueId);
    // preload select options to populate edit form
    this.loadProjects();
    this.loadTypes();
    this.priorityOptions = [
      { label: this.translate.instant('components.issues.priority.HIGH') || 'High', value: 'high' },
      { label: this.translate.instant('components.issues.priority.MEDIUM') || 'Medium', value: 'medium' },
      { label: this.translate.instant('components.issues.priority.LOW') || 'Low', value: 'low' }
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

  openEditDialog(): void {
    if (!this.issue) return;
    this.editModel = { ...(this.issue || {}) };
    // ensure due_date is a Date object for p-datepicker
    if (this.editModel.due_date) {
      try {
        const d = this.editModel.due_date instanceof Date ? this.editModel.due_date : new Date(this.editModel.due_date);
        this.editModel.due_date = !isNaN(d.getTime()) ? d : null;
      } catch (e) { this.editModel.due_date = null; }
    }
    // split tags into select and custom inputs
    this.editModel.tag_select = Array.isArray(this.issue?.tags) ? [...this.issue.tags] : [];
    this.editModel.tags_custom = [];
    this.tagsOptions = (this.issue && Array.isArray(this.issue.tags)) ? (this.issue.tags || []).map((t: any) => ({ label: t, value: t })) : [];
    this.isCreating = false;
    this.displayDialog = true;
  }

  loadProjects(): void {
    this.http.get('/api/my_projects').subscribe({
      next: (res: any) => {
        const items = (res && res.data) ? res.data : (res || []);
        this.projectOptions = (items || []).map((p: any) => ({
          // show code + title in the label so selected value displays as "[CODE] Title"
          label: ((p.code || p.key) ? ('[' + (p.code || p.key) + '] ') : '') + (p.name || p.title || String(p.id)),
          value: p.id,
          code: p.code || p.key || ''
        }));
        // collect participants across projects to populate assignee options
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

  loadTypes(): void {
    this.http.get('/api/issue_types').subscribe({
      next: (res: any) => {
        const items = (res && res.data) ? res.data : (res || []);
        this.typeOptions = (items || []).map((t: any) => ({ label: t.name || t.title || String(t.id), value: t.id }));
        this.cdr.markForCheck();
      },
      error: (err: any) => { console.warn('Failed to load types', err); this.typeOptions = []; this.cdr.markForCheck(); }
    });
  }

  // Map issue priority to a PrimeNG tag severity string
  // high -> danger, medium -> warn, low -> success, default -> info
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

  // Map issue status (code or name) to a PrimeNG tag severity
  statusSeverity(status: any): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | null {
    try {
      if (status === null || status === undefined) return 'secondary';
      const s = String(status).toLowerCase();
      // resolved/closed/done -> success (green)
      if (s === 'resolved' || s === 'done' || s === 'closed' || s === 'fixed') return 'success';
      // in progress / review -> warn (yellow)
      if (s.includes('progress') || s.includes('in progress') || s.includes('in_progress') || s.includes('review')) return 'warn';
      // new/open/todo -> info (blue)
      if (s === 'new' || s === 'open' || s === 'todo' || s === 'backlog') return 'info';
      // blocked/rejected/cancelled -> danger (red)
      if (s === 'blocked' || s === 'rejected' || s === 'cancelled' || s === 'canceled' || s === 'failed') return 'danger';
      // fallback
      return 'secondary';
    } catch (e) {
      return 'secondary';
    }
  }

  validateIssueForm(): boolean {
    this.formErrors = {};
    if (!this.editModel || !this.editModel.title || !String(this.editModel.title).trim()) this.formErrors.title = this.translate.instant('components.issues.form.TITLE_REQUIRED') || 'Title is required';
    if (!this.editModel || (this.editModel.project_id == null || this.editModel.project_id === '')) this.formErrors.project_id = this.translate.instant('components.issues.form.PROJECT_REQUIRED') || 'Project is required';
    return Object.keys(this.formErrors).length === 0;
  }

  saveIssue(): void {
    if (!this.editModel) return;
    const id = this.editModel.id != null ? this.editModel.id : (this.issue && this.issue.id) || null;
    // combine selected tags and custom tags (unique)
    const selected = Array.isArray(this.editModel.tag_select) ? this.editModel.tag_select : [];
    const custom = Array.isArray(this.editModel.tags_custom) ? this.editModel.tags_custom : [];
    const combinedTags = Array.from(new Set([...selected, ...custom]));

    const payload: any = {
      project_id: (this.editModel.project_id != null && this.editModel.project_id !== '') ? Number(this.editModel.project_id) : 0,
      title: String(this.editModel.title || ''),
      description: (this.editModel.description != null) ? String(this.editModel.description) : '',
      assignee_id: (this.editModel.assignee_id != null && this.editModel.assignee_id !== '') ? this.editModel.assignee_id : null,
      type_id: (this.editModel.type_id != null) ? Number(this.editModel.type_id) : 1,
      priority: String(this.editModel.priority || 'medium'),
      due_date: this.editModel.due_date ? (this.editModel.due_date instanceof Date ? this.editModel.due_date.toISOString() : this.editModel.due_date) : null,
      estimated_hours: (this.editModel.estimated_hours != null && this.editModel.estimated_hours !== '') ? Number(this.editModel.estimated_hours) : null,
      tags: combinedTags
    };
    if (!this.validateIssueForm()) return;
    this.loading = true;
    this.issuesService.updateIssue(id as any, payload).subscribe({
      next: (res: any) => {
        // refresh issue data from server
        this.loadIssue(id);
        this.displayDialog = false;
        this.loading = false;
        this.cdr.markForCheck();
        try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.SAVE') || 'Saved', detail: this.translate.instant('components.issues.form.UPDATED') || 'Updated' }); } catch (e) {}
      },
      error: (err: any) => { console.error('Failed to update issue', err); this.loading = false; this.cdr.markForCheck(); try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.SAVE') || 'Save failed', detail: (err && err.message) ? err.message : 'Failed to update' }); } catch (e) {} }
    });
  }


  loadIssue(id: any): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.issuesService.getIssue(id).subscribe({
      next: (res: any) => {
        // server may return { data: { ... } } or the issue directly
        const data = (res && res.data) ? res.data : res;
        this.issue = this.normalizeIssue(data);
        this.loading = false;

        // Build status menu from issue.allowed_statuses if present.
        // expected shape: allowed_statuses: [{ id: 1, code: 'new', name: 'Новый' }, ...]
        const allowed = (this.issue && this.issue.allowed_statuses) ? this.issue.allowed_statuses : null;
        if (Array.isArray(allowed) && allowed.length) {
          // prefer numeric id for status value when available, fall back to code
          this.statusOptions = allowed.map((s: any) => ({ label: s.name || s.label || String(s.code), value: (s.id !== undefined && s.id !== null) ? s.id : s.code }));
          this.statusMenuItems = this.statusOptions.map(o => ({ label: o.label, command: () => this.changeStatus(o.value) }));
        } else {
          // allowed_statuses is empty — intentionally do not show any status change options
          this.statusOptions = [];
          this.statusMenuItems = [];
        }
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.error = (err && err.message) ? err.message : this.translate.instant('components.issues.errors.FAILED_LOAD');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  changeStatus(statusId: any): void {
    if (!this.issue || !this.issue.id) return;
    this.statusSaving = true;
    this.cdr.markForCheck();
    this.issuesService.updateIssue(this.issue.id, { status_id: statusId }).subscribe({
      next: (_res: any) => {
        // After changing status, re-fetch the issue to get authoritative fields including allowed_statuses
        this.issuesService.getIssue(this.issue.id).subscribe({
          next: (fetchRes: any) => {
            const data = (fetchRes && fetchRes.data) ? fetchRes.data : fetchRes;
            this.issue = data;

            // rebuild statusOptions/statusMenuItems from issue.allowed_statuses
            const allowed = (this.issue && this.issue.allowed_statuses) ? this.issue.allowed_statuses : null;
            if (Array.isArray(allowed) && allowed.length) {
              this.statusOptions = allowed.map((s: any) => ({ label: s.name || s.label || String(s.code), value: (s.id !== undefined && s.id !== null) ? s.id : s.code }));
              this.statusMenuItems = this.statusOptions.map(o => ({ label: o.label, command: () => this.changeStatus(o.value) }));
            } else {
              this.statusOptions = [];
              this.statusMenuItems = [];
            }

            this.statusSaving = false;
            this.cdr.markForCheck();
            try { this.messageService.add({ severity: 'success', summary: this.trOr('components.issues.messages.SUCCESS', 'Success'), detail: this.trOr('components.issues.messages.STATUS_UPDATED', 'Status updated') }); } catch (e) {}
          },
          error: (fetchErr: any) => {
            console.warn('Failed to refresh issue after status change', fetchErr);
            this.statusSaving = false;
            this.cdr.markForCheck();
            try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.issues.messages.ERROR'), detail: this.translate.instant('components.issues.messages.STATUS_UPDATE_FAILED') }); } catch (e) {}
          }
        });
      },
      error: (err: any) => {
        this.statusSaving = false;
        this.cdr.markForCheck();
        try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.issues.messages.ERROR'), detail: (err && err.message) ? err.message : this.translate.instant('components.issues.messages.STATUS_UPDATE_FAILED') }); } catch (e) {}
      }
    });
  }

  back(): void {
    this.router.navigate(['/issues']);
  }

  /**
   * Copy the current issue URL to clipboard and show a toast notification.
   * Stops event propagation so surrounding clickable elements won't trigger.
   */
  copyIssueLink(event?: Event): void {
    try {
      if (event && typeof (event.stopPropagation) === 'function') event.stopPropagation();
      const id = this.issue?.id ?? this.issueId;
      if (!id) {
        try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.issues.messages.ERROR') || 'Error', detail: this.translate.instant('components.issues.errors.ISSUE_ID_MISSING') || 'Issue id missing' }); } catch (e) {}
        return;
      }
      const url = `${window.location.origin}/issues/${id}`;
      if (navigator && (navigator as any).clipboard && typeof (navigator as any).clipboard.writeText === 'function') {
        (navigator as any).clipboard.writeText(url).then(() => {
          try { this.messageService.add({ severity: 'success', summary: this.translate.instant('components.issues.messages.COPY_LINK') || 'Copied', detail: this.translate.instant('components.issues.messages.LINK_COPIED') || 'Link copied to clipboard' }); } catch (e) {}
        }).catch((_err: any) => {
          try { window.prompt(this.translate.instant('components.issues.messages.COPY_PROMPT') || 'Copy link', url); } catch (e) {}
        });
      } else {
        try { window.prompt(this.translate.instant('components.issues.messages.COPY_PROMPT') || 'Copy link', url); } catch (e) {}
      }
    } catch (e) {
      try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.issues.messages.ERROR') || 'Error', detail: String(e) }); } catch (er) {}
    } finally {
      try { this.cdr.markForCheck(); } catch (e) {}
    }
  }

  // Open add-relation dialog (triggered from child relations table)
  openAddRelationDialog(): void {
    if (!this.issue || !this.issue.project_id) {
      // try to fall back to issue.project
      if (!this.issue || !this.issue.project) {
        this.displayAddRelationDialog = true;
        this.loadAvailableTargets(null);
        return;
      }
    }
    this.displayAddRelationDialog = true;
    const projectId = this.issue.project_id ?? this.issue.project ?? null;
    this.loadAvailableTargets(projectId);
  }

  // Load issues and documents belonging to the same project to populate multi-selects
  private loadAvailableTargets(projectId: any | null): void {
    // Build params
    let paramsIssues = new HttpParams();
    let paramsDocuments = new HttpParams();
    if (projectId != null) {
      paramsIssues = paramsIssues.set('project_id', String(projectId));
      paramsDocuments = paramsDocuments.set('project_id', String(projectId));
    }
    // Optional: increase page size to get many items in one call (backend may ignore)
    paramsIssues = paramsIssues.set('per_page', '200');
    paramsDocuments = paramsDocuments.set('per_page', '200');

    const reqIssues = this.http.get('/api/issues', { params: paramsIssues }).pipe();
    const reqDocs = this.http.get('/api/documents', { params: paramsDocuments }).pipe();

    forkJoin([reqIssues, reqDocs]).subscribe({
      next: ([resIssues, resDocs]: any) => {
        try {
          const extract = (r: any) => Array.isArray(r) ? r : (r && (r.data || r.items) ? (r.data || r.items) : []);
          const issues = extract(resIssues) as any[];
          const docs = extract(resDocs) as any[];
          this.availableIssuesOptions = (issues || []).map((it: any) => ({ label: `#${it.id} ${it.title || it.summary || it.name || ''}`.trim(), value: it.id }));
          this.availableDocumentsOptions = (docs || []).map((d: any) => ({ label: `#${d.id} ${d.title || d.name || ''}`.trim(), value: d.id }));
        } catch (e) {
          this.availableIssuesOptions = [];
          this.availableDocumentsOptions = [];
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.warn('Failed to load available relation targets', err);
        this.availableIssuesOptions = [];
        this.availableDocumentsOptions = [];
        this.cdr.markForCheck();
      }
    });
  }

  // Save relations: create link records for each selected target.
  // New backend contract: POST /api/links accepts
  // { active_type, active_id, passive_type, passive_id, relation_type }
  saveRelations(): void {
    if (!this.issue || !this.issue.id) return;
    const sourceId = Number(this.issue.id);
    const tasks: any[] = [];
    const type = this.relationForm.relationType || 'relates';

    // helper to push a POST observable for a given pair
    const buildPayload = (srcType: string, srcId: any, tgtType: string, tgtId: any) => ({
      active_type: srcType,
      active_id: srcId,
      passive_type: tgtType,
      passive_id: tgtId,
      relation_type: type
    });

    // For issues selected
    for (const id of (this.relationForm.selectedIssueIds || [])) {
      if (!id) continue;
      if (type === 'blocks') {
        if (this.relationForm.direction === 'source') {
          // current issue blocks selected -> current is source
          tasks.push(this.http.post('/api/links', buildPayload('issue', sourceId, 'issue', id)));
        } else {
          // selected blocks current -> selected is source
          tasks.push(this.http.post('/api/links', buildPayload('issue', id, 'issue', sourceId)));
        }
      } else {
        // relates - directionless; create link with current as source for consistency
        tasks.push(this.http.post('/api/links', buildPayload('issue', sourceId, 'issue', id)));
      }
    }

    // For documents selected
    for (const id of (this.relationForm.selectedDocumentIds || [])) {
      if (!id) continue;
      if (type === 'blocks') {
        if (this.relationForm.direction === 'source') {
          // current issue blocks document: current is source, document target
          tasks.push(this.http.post('/api/links', buildPayload('issue', sourceId, 'document', id)));
        } else {
          // document blocks current -> document as source
          tasks.push(this.http.post('/api/links', buildPayload('document', id, 'issue', sourceId)));
        }
      } else {
        tasks.push(this.http.post('/api/links', buildPayload('issue', sourceId, 'document', id)));
      }
    }

    if (!tasks.length) {
      // nothing to save
      this.displayAddRelationDialog = false;
      return;
    }

    this.savingRelations = true;
    forkJoin(tasks).subscribe({
      next: (_res) => {
        this.savingRelations = false;
        this.displayAddRelationDialog = false;
        // refresh the issue to pick up new relations
        this.loadIssue(this.issue.id);
        this.cdr.markForCheck();
        try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.SAVE') || 'Saved', detail: this.translate.instant('components.issues.relations.FORM.SAVED') || 'Relations created' }); } catch (e) {}
      },
      error: (err) => {
        console.error('Failed to save relations', err);
        this.savingRelations = false;
        this.cdr.markForCheck();
        try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.issues.messages.ERROR'), detail: (err && err.message) ? err.message : this.translate.instant('components.issues.messages.ERROR') }); } catch (e) {}
      }
    });
  }

  assigneeInitials(): string {
    try {
      const name = (this.issue && (this.issue.assignee_name || this.issue.assignee || '')) || '';
      const parts = String(name).trim().split(/\s+/).filter(Boolean);
      if (!parts.length) return '';
      if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
      return (parts[0][0] + parts[1][0]).toUpperCase();
    } catch (e) {
      return '';
    }
  }

  personInitials(name?: string): string {
    try {
      const candidate = name || (this.issue && (this.issue.author_name || '')) || '';
      const parts = String(candidate).trim().split(/\s+/).filter(Boolean);
      if (!parts.length) return '';
      if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
      return (parts[0][0] + parts[1][0]).toUpperCase();
    } catch (e) {
      return '';
    }
  }

  issueAvatarColor(user: any): string {
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

  issueAvatarTextColor(user: any): string {
    const bg = this.issueAvatarColor(user);
    const m = bg.match(/hsl\((\d+),\s*(\d+)%?,\s*(\d+)%?\)/);
    if (!m) return '#fff';
    const lightness = Number(m[3]);
    return lightness > 70 ? '#111' : '#fff';
  }

  // derive initials from a single full-name string
  initialsFromName(name?: string | null): string {
    if (!name) return '';
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  // Format surname with initials for given name and patronymic.
  // Accepts either a user-like object ({ first_name, middle_name, last_name }) or a single full-name string.
  formatSurnameInitials(item: any): string {
    if (!item) return '-';
    try {
      // object with separate fields (preferred)
      if (typeof item === 'object') {
        const last = (item.last_name || item.lastName || '').toString().trim();
        const first = (item.first_name || item.firstName || '').toString().trim();
        const middle = (item.middle_name || item.middleName || '').toString().trim();
        const initials: string[] = [];
        if (first) initials.push(first[0].toUpperCase() + '.');
        if (middle) initials.push(middle[0].toUpperCase() + '.');
        if (last) return last + (initials.length ? ' ' + initials.join('') : '');
        const fallback = [first, middle].filter(Boolean).join(' ');
        return fallback || (item.username || '-') ;
      }

      // string input: assume format "Surname Given Patronymic" and convert given+patronymic to initials
      if (typeof item === 'string') {
        const parts = item.trim().split(/\s+/).filter(Boolean);
        if (!parts.length) return '-';
        const surname = parts[0];
        const rest = parts.slice(1);
        const initials = rest.map(p => (p && p[0]) ? p[0].toUpperCase() + '.' : '').join('');
        return surname + (initials ? ' ' + initials : '');
      }
    } catch (e) {
      // fall through
    }
    return '-';
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

  // Normalize a single issue: map avatar id fields to downloadable URLs
  private normalizeIssue(issue: any): any {
    if (!issue) return issue;
    try {
      const copy: any = { ...(issue || {}) };
      // assignee avatar
      const aId = copy.assignee_avatar_id ?? copy.assignee_avatarId ?? copy.assigneeAvatarId ?? copy.assigneeAvatar_id;
      if (!copy.assignee_avatar && !copy.assignee_avatar_url && aId != null && String(aId).trim() !== '') {
        copy.assignee_avatar_url = `/api/storage/${String(aId).trim()}/download`;
      }
      // author avatar
      const auId = copy.author_avatar_id ?? copy.author_avatarId ?? copy.authorAvatarId ?? copy.authorAvatar_id;
      if (!copy.author_avatar && !copy.author_avatar_url && auId != null && String(auId).trim() !== '') {
        copy.author_avatar_url = `/api/storage/${String(auId).trim()}/download`;
      }
      // ensure name fields
      if (!copy.assignee_name && (copy.assignee || copy.assigneeName)) copy.assignee_name = copy.assignee || copy.assigneeName;
      if (!copy.author_name && (copy.author || copy.authorName)) copy.author_name = copy.author || copy.authorName;
      return copy;
    } catch (e) {
      return issue;
    }
  }

  // Safe translate helper: when ngx-translate hasn't loaded a key it returns the key string itself,
  // so detect that and return a provided fallback instead.
  private trOr(key: string, fallback: string): string {
    try {
      const v = this.translate.instant(key);
      if (!v || v === key) return fallback;
      return v;
    } catch (e) { return fallback; }
  }
}
