import { Component, EventEmitter, Input, Output, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SplitButtonModule } from 'primeng/splitbutton';
import { DialogModule } from 'primeng/dialog';
import { Select } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { CheckboxModule } from 'primeng/checkbox';
import { ToastModule } from 'primeng/toast';
import { EditorModule } from 'primeng/editor';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { MessageService } from 'primeng/api';
import { HttpClient, HttpParams } from '@angular/common/http';
import { AvatarModule } from 'primeng/avatar';
import { AvatarService } from '../../../services/avatar.service';

@Component({
  selector: 'app-documents-activity',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, SplitButtonModule, DialogModule, Select, DatePickerModule, InputTextModule, CheckboxModule, ToastModule, AvatarModule, TranslateModule, EditorModule, MultiSelectModule],
  templateUrl: './documents-activity.html',
  styleUrls: ['./documents-activity.scss'],
  providers: [MessageService]
})
export class DocumentsActivityComponent {
  @Input() documentId: any = null;
  @Input() usersOptions: { label: string; value: any; avatar?: string | null }[] = [];
  @Input() documentsOptions: { label: string; value: any; code?: string }[] | null = null;
  @Input() priorityOptions: { label: string; value: any }[] = [];

  // Outputs so parent can react if needed
  @Output() assigned = new EventEmitter<any>();
  @Output() linked = new EventEmitter<any>();
  @Output() correctionCreated = new EventEmitter<any>();

  // dialog states
  showAssignDialog = false;
  showLinkDialog = false;
  showCorrectionDialog = false;

  // form models
  assignModel: any = { user_id: null, comment: '', due_date: null, priority: null, change_status: false, title: '', description: '', project_id: null };
  linkModel: any = { selected_ids: [] as any[], reason: '' };
  correctionModel: any = { code: '', title: '' };

  private http = inject(HttpClient);
  private messageService = inject(MessageService);
  private avatarService = inject(AvatarService);
  private translate = inject(TranslateService);

  menuItems: any[] = [];
  private langSub: Subscription | null = null;

  openAssign(): void {
    this.assignModel = { user_id: null, comment: '', due_date: null, priority: null, change_status: false, title: '', description: '', project_id: null };
    this.assignErrors = { userRequired: false, titleRequired: false };
    // Pre-fill title/description from document if available
    if (this.documentId != null) {
      this.http.get(`/api/documents/${this.documentId}`).toPromise().then((res: any) => {
        try {
          const code = res?.code || res?.document_number || '';
          const title = res?.title || res?.name || '';
          const display = `Разработка "${code ? code + ' ' : ''}${title}"`.trim();
          this.assignModel.title = display;
          this.assignModel.project_id = res?.project_id || (res?.project ? (res.project.id || res.project.project_id) : null) || null;
          // localized prefix for description
          const lang = this.translate.currentLang || 'en';
          const prefix = (lang && lang.startsWith('ru')) ? 'Разработать документ' : 'Develop document';
          this.assignModel.description = `${prefix} "${code ? code + ' ' : ''}${title}"`.trim();
        } catch (e) {
          // ignore
        }
      }).catch(() => {
        // ignore
      });
    }
    this.showAssignDialog = true;
  }
  
  ngOnInit(): void {
    this.setMenuItems();
    // update labels when language changes
    this.langSub = this.translate.onLangChange.subscribe(() => this.setMenuItems());
  }

  ngOnDestroy(): void {
    if (this.langSub) {
      this.langSub.unsubscribe();
      this.langSub = null;
    }
  }

  private setMenuItems(): void {
    this.menuItems = [
      { label: this.translate.instant('components.documents.activity.menu.ASSIGN'), command: () => this.openAssign() },
      { label: this.translate.instant('components.documents.activity.menu.LINK'), command: () => this.openLink() }
    ];
  }
  async openLink(): Promise<void> {
    this.linkModel = { selected_ids: [], reason: '' };
    // populate documentsOptions if not provided
    if (!this.documentsOptions) {
      // best-effort fetch: get first 200 documents filtered by the current document's project_id when available
      try {
        let projectId: any = null;
        if (this.documentId != null) {
          try {
            const doc: any = await this.http.get(`/api/documents/${this.documentId}`).toPromise();
            projectId = doc?.project_id || (doc?.project ? (doc.project.id || doc.project.project_id) : null) || null;
          } catch (e) {
            projectId = null;
          }
        }

        let params = new HttpParams().set('limit', '200');
        if (projectId) params = params.set('project_id', String(projectId));

        const res: any = await this.http.get('/api/documents', { params }).toPromise();
        const list = Array.isArray(res) ? res : (res?.data || res?.items || []);
        this.documentsOptions = (list || []).map((d: any) => ({ label: `#${d.id} - ${d.code ? d.code + ' ' : ''}${d.title || d.name || ''}`, value: d.id ?? d._id ?? d.document_id, code: d.code }));
      } catch (e) {
        this.documentsOptions = [];
      }
    }
    this.showLinkDialog = true;
  }
  openCorrection(): void {
    this.correctionModel = { code: '', title: '' };
    this.showCorrectionDialog = true;
  }

  async saveAssign(): Promise<void> {
    // Validate required fields first
    this.assignErrors.userRequired = !this.assignModel.user_id;
    this.assignErrors.titleRequired = !this.assignModel.title || !String(this.assignModel.title).trim();
    if (this.assignErrors.userRequired || this.assignErrors.titleRequired) {
      // Don't proceed if required fields are missing
      return;
    }

    // Build issue payload
    const issuePayload: any = {
      project_id: this.assignModel.project_id || null,
      title: this.assignModel.title || null,
      description: this.assignModel.description || null,
      assignee_id: this.assignModel.user_id || null,
      type_id: 6,
      priority: this.assignModel.priority || null,
      due_date: this.assignModel.due_date ? (this.assignModel.due_date instanceof Date ? this.assignModel.due_date.toISOString() : String(this.assignModel.due_date)) : null
    };

    try {
      // Ensure project_id available: try to fetch document if missing
      if (!issuePayload.project_id && this.documentId != null) {
        try {
          const doc: any = await this.http.get(`/api/documents/${this.documentId}`).toPromise();
          issuePayload.project_id = doc?.project_id || (doc?.project ? (doc.project.id || doc.project.project_id) : null) || null;
        } catch (_) {
          // ignore
        }
      }

      // 1) create issue
      const issueRes: any = await this.http.post('/api/issues', issuePayload).toPromise();
      const issueId = issueRes?.id || issueRes?.issue_id || issueRes?.data?.id || null;

      // 2) optionally update document status (set document to "In progress")
      if (this.documentId != null && this.assignModel.change_status) {
        try {
          await this.http.put(`/api/documents/${this.documentId}`, { status_id: 2 }).toPromise();
        } catch (e) {
          // non-fatal
        }
      }

      // 3) create link between document and issue
      if (issueId && this.documentId != null) {
        try {
          const linkPayload = {
            active_type: 'issue',
            active_id: issueId,
            passive_type: 'document',
            passive_id: this.documentId,
            relation_type: 'blocks'
          };
          await this.http.post('/api/links', linkPayload).toPromise();
        } catch (e) {
          // non-fatal
        }
      }

      this.messageService.add({ severity: 'success', summary: 'Assign', detail: 'Issue created and linked' });
      this.assigned.emit({ documentId: this.documentId, issue: issueRes, payload: issuePayload });

      // Dispatch a DOM event so any ancestor/listener (for example documents-detail) can refresh
      try {
        const issueId = issueRes?.id || issueRes?.issue_id || issueRes?.data?.id || null;
        const eventDetail = { documentId: this.documentId, issueId, issue: issueRes };
        window.dispatchEvent(new CustomEvent('deepsea:document-updated', { detail: eventDetail }));
        // If we are exactly on the document page URL, reload to refresh data immediately
        try {
          if (window.location && String(window.location.href).includes(`/documents/${this.documentId}`)) {
            window.location.reload();
          }
        } catch (e) {
          // ignore
        }
      } catch (e) {
        // ignore
      }

      this.showAssignDialog = false;
    } catch (e: any) {
      // Fallback: emit and show warning
      this.messageService.add({ severity: 'warn', summary: 'Assign', detail: 'Failed to create issue or link; emitted event' });
      this.assigned.emit({ documentId: this.documentId, payload: issuePayload });
      this.showAssignDialog = false;
    }
  }

  async saveLink(): Promise<void> {
    const selected = Array.isArray(this.linkModel.selected_ids) ? this.linkModel.selected_ids : [];
    if (!selected.length) {
      // nothing selected
      this.messageService.add({ severity: 'warn', summary: 'Link', detail: 'No documents selected' });
      return;
    }

    try {
      const results: any[] = [];
      for (const tid of selected) {
        const payload = { target_id: tid, reason: this.linkModel.reason };
        if (this.documentId != null) {
          try {
            const res = await this.http.post(`/api/documents/${this.documentId}/relations`, payload).toPromise();
            results.push({ tid, res });
          } catch (e) {
            results.push({ tid, error: true });
          }
        }
      }

      this.messageService.add({ severity: 'success', summary: 'Link', detail: 'Relations processed' });
      this.linked.emit({ documentId: this.documentId, results, reason: this.linkModel.reason });
      this.showLinkDialog = false;
    } catch (e: any) {
      this.messageService.add({ severity: 'warn', summary: 'Link', detail: 'API call failed, emitted event' });
      this.linked.emit({ documentId: this.documentId, reason: this.linkModel.reason });
      this.showLinkDialog = false;
    }
  }

  async saveCorrection(): Promise<void> {
    const payload = { code: this.correctionModel.code, title: this.correctionModel.title, correction_of: this.documentId };
    try {
      // Best-effort API: create new document as correction
      if (this.documentId != null) {
        await this.http.post('/api/documents', payload).toPromise();
      }
      this.messageService.add({ severity: 'success', summary: 'Create', detail: 'Correction document created' });
      this.correctionCreated.emit({ documentId: this.documentId, ...payload });
      this.showCorrectionDialog = false;
  } catch (e: any) {
      this.messageService.add({ severity: 'warn', summary: 'Create', detail: 'API call failed, emitted event' });
      this.correctionCreated.emit({ documentId: this.documentId, ...payload });
      this.showCorrectionDialog = false;
    }
  }

  // Avatar helpers (use central AvatarService so initials/colors match other components)
  initialsFromName(name?: string): string { try { return this.avatarService.initialsFromName(name); } catch (e: any) { return ''; } }
  issueAvatarColor(user?: any): string { try { return this.avatarService.issueAvatarColor(user); } catch (e: any) { return ''; } }
  issueAvatarTextColor(user?: any): string { try { return this.avatarService.issueAvatarTextColor(user); } catch (e: any) { return '#fff'; } }

  // validation state for assign form
  assignErrors: { userRequired: boolean; titleRequired?: boolean } = { userRequired: false, titleRequired: false };


}
