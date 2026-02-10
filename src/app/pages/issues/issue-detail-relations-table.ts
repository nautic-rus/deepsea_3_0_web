import { Component, Input, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BadgeModule } from 'primeng/badge';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-issue-detail-relations-table',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, BadgeModule, TagModule, ButtonModule, TableModule, DialogModule, InputTextModule, MultiSelectModule, FormsModule],
  template: `
    <section class="admin-subpage-relations card">
      <div class="flex items-center justify-between mt-0 mb-2">
         <h4 class="mb-">{{ 'components.issues.relations.TITLE' | translate }}</h4>
          <p-button severity="secondary" icon="pi pi-plus" class="mt-0" [outlined]="true" (click)="openAddDialog()"></p-button>
      </div>

      <p-dialog header="{{ 'components.issues.relations.ADD_RELATION' | translate }}" [(visible)]="addDialogVisible" modal="true" [closable]="true" [style]="{width: '35%'}">
        <div class="flex flex-col gap-4">

          <!-- Type selector removed per request -->

          <div class="flex flex-col gap-2">
            <label class="font-bold">{{ 'components.issues.relations.ISSUES' | translate }}</label>
            <p-multiSelect [options]="issueOptions" [(ngModel)]="linkTargetIssueIds" optionLabel="label" optionValue="value" placeholder="{{ 'components.issues.relations.ISSUES' | translate }}" class="w-full" appendTo="body"></p-multiSelect>
          </div>

          <div class="flex flex-col gap-2">
            <label class="font-bold">{{ 'components.issues.relations.DOCUMENTS' | translate }}</label>
            <p-multiSelect [options]="documentOptions" [(ngModel)]="linkTargetDocumentIds" optionLabel="label" optionValue="value" placeholder="{{ 'components.issues.relations.DOCUMENTS' | translate }}" class="w-full" appendTo="body"></p-multiSelect>
          </div>

          <div class="flex flex-col gap-2">
            <label class="font-bold">{{ 'components.issues.relations.RELATION_TYPE' | translate }}</label>
            <input pInputText type="text" [(ngModel)]="relationType" />
          </div>

          <div *ngIf="(linkTargetIssueIds.length || linkTargetDocumentIds.length)" class="flex flex-col gap-2">
            <label class="font-bold">{{ 'components.issues.relations.SELECTED' | translate }}</label>
            <div class="text-sm">Issues: {{ linkTargetIssueIds.length || 0 }}, Documents: {{ linkTargetDocumentIds.length || 0 }}</div>
          </div>

          <div class="flex justify-end gap-2 mt-4">
            <p-button label="{{ 'components.issues.relations.CANCEL' | translate }}" (onClick)="addDialogVisible=false" class="p-button-text" severity="secondary" icon="pi pi-times" iconPos="left" [disabled]="isLinking"></p-button>
            <p-button label="{{ 'components.issues.relations.CREATE' | translate }}" (onClick)="createLink()" severity="primary" icon="pi pi-check" iconPos="left" [loading]="isLinking" [disabled]="isLinking || !(linkTargetIssueIds.length || linkTargetDocumentIds.length)"></p-button>
          </div>
        </div>
      </p-dialog>

      <div *ngIf="!relations || relations.length === 0" class="text-surface-500">{{ 'components.issues.relations.NO_RELATIONS' | translate }}</div>

      <p-table *ngIf="relations && relations.length" [value]="relations" class="w-full" size="small">
        <ng-template pTemplate="header">
          <tr>
            <th>{{ 'components.issues.relations.COLUMN_TYPE_ID' | translate }}</th>
            <th>{{ 'components.issues.relations.COLUMN_NAME' | translate }}</th>
            <th>{{ 'components.issues.relations.COLUMN_STATUS' | translate }}</th>
            <th>{{ 'components.issues.relations.COLUMN_TYPE' | translate }}</th>
            <th></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-r>
          <tr>
            <td>
              <a *ngIf="r.type === 'Issue'" [routerLink]="['/issues', r.id]" class="text-blue-600 dark:text-blue-400 hover:underline">{{ r.type + ' #' + r.id }}</a>
              <a *ngIf="r.type === 'Document'" [href]="r.url || '#'" target="_blank" rel="noopener" class="text-blue-600 dark:text-blue-400 font-medium hover:underline">{{ r.type + ' #' + r.id }}</a>
            </td>
            <td>
              <span *ngIf="r.title" >{{r.title}}</span>

            </td>
            <td>
              <p-tag *ngIf="r.status || r.status_name" [value]="r.status_name || r.status" [severity]="statusSeverity(r.status_code ?? r.status)"></p-tag>
            </td>
            <td>
              <p-tag *ngIf="r.raw?.relation_type" [value]="r.raw.relation_type" [severity]="typeSeverity(r.raw.relation_type)"></p-tag>
            </td>
            <td class="text-right">
              <p-button icon="pi pi-trash" severity="danger" (click)="removeLink(r)"></p-button>
            </td>
          </tr>
        </ng-template>
      </p-table>
    </section>
  `,
  styles: [
    `
      :host { display: block; }
    `
  ]
})
export class IssueDetailRelationsTableComponent implements OnChanges {
  @Input() issue: any | null = null;
  relations: Array<any> = [];

  constructor(private cdr: ChangeDetectorRef, private http: HttpClient) {}

  // Dialog / linking state
  addDialogVisible = false;
  relationType = 'relates';
  isLinking = false;
  // Multi-select helpers
  issueOptions: Array<any> = [];
  documentOptions: Array<any> = [];
  linkTargetIssueIds: Array<string> = [];
  linkTargetDocumentIds: Array<string> = [];

  public openAddDialog(): void {
    if (!this.issue || (!this.issue.id && !this.issue._id)) {
      alert('Issue not loaded');
      return;
    }
  this.addDialogVisible = true;
  this.linkTargetIssueIds = [];
  this.linkTargetDocumentIds = [];
  this.relationType = 'relates';
    // load issue/document lists filtered by project
    const projectId = this.issue.project_id ?? this.issue.project?.id ?? this.issue.project;
    this.loadTargetsForProject(projectId);
  }

  private loadTargetsForProject(projectId: any): void {
    this.issueOptions = [];
    this.documentOptions = [];
    if (!projectId) return;
    let params = new HttpParams();
    params = params.set('project_id', String(projectId));
    // fetch issues
    this.http.get<any>('/api/issues', { params }).subscribe({
      next: (res) => {
        try {
          const items = Array.isArray(res) ? res : (res && (res.data || res.items) ? (res.data || res.items) : []);
          this.issueOptions = (items as any[]).map(i => ({ label: (i.title || i.summary || i.name || `#${i.id || i._id}`), value: i.id ?? i._id ?? i.issue_id ?? i }));
        } catch (e) {
          this.issueOptions = [];
        }
        this.cdr.markForCheck();
      },
      error: () => { this.issueOptions = []; }
    });

    // fetch documents
    this.http.get<any>('/api/documents', { params }).subscribe({
      next: (res) => {
        try {
          const items = Array.isArray(res) ? res : (res && (res.data || res.items) ? (res.data || res.items) : []);
          this.documentOptions = (items as any[]).map(d => ({ label: (d.title || d.name || `#${d.id || d._id}`), value: d.id ?? d._id ?? d.file_id ?? d }));
        } catch (e) {
          this.documentOptions = [];
        }
        this.cdr.markForCheck();
      },
      error: () => { this.documentOptions = []; }
    });
  }

  // replaced manual-add with server-provided lists

  public createLink(): void {
    if (!this.issue) return;
    const sourceId = this.issue.id ?? this.issue._id;
    const issueTargets = this.linkTargetIssueIds || [];
    const docTargets = this.linkTargetDocumentIds || [];
    const total = issueTargets.length + docTargets.length;
    if (!sourceId || total === 0) return;
    this.isLinking = true;
    let pending = total;

    const finishIfDone = () => {
      pending -= 1;
      if (pending === 0) {
        this.isLinking = false;
        this.addDialogVisible = false;
        this.loadLinksForIssue(this.issue);
        this.linkTargetIssueIds = [];
        this.linkTargetDocumentIds = [];
      }
    };

    for (const t of issueTargets) {
      const payload: any = {
        source_type: 'issue',
        source_id: String(sourceId),
        target_type: 'issue',
        target_id: String(t),
        relation_type: this.relationType || 'relates'
      };
      this.http.post('/api/links', payload).subscribe({ next: finishIfDone, error: (err) => { console.warn('Failed to create link', t, err); finishIfDone(); } });
    }

    for (const t of docTargets) {
      const payload: any = {
        source_type: 'issue',
        source_id: String(sourceId),
        target_type: 'document',
        target_id: String(t),
        relation_type: this.relationType || 'relates'
      };
      this.http.post('/api/links', payload).subscribe({ next: finishIfDone, error: (err) => { console.warn('Failed to create link', t, err); finishIfDone(); } });
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['issue']) {
      this.relations = this.extractRelations(this.issue);
      this.loadLinksForIssue(this.issue);
      this.cdr.markForCheck();
    }
  }

  private loadLinksForIssue(issue: any | null) {
    if (!issue || (!issue.id && !issue._id)) return;
    const id = issue.id ?? issue._id;
    let params = new HttpParams();
    params = params.set('source_type', 'issue');
    params = params.set('source_id', String(id));

    this.http.get<any>('/api/links', { params }).subscribe({
      next: (res: any) => {
        try {
          const links = Array.isArray(res) ? res : (res && (res.data || res.items) ? (res.data || res.items) : []);
          const mapped = (links as any[]).map(l => this.mapLinkToRelation(l));

          for (const rel of mapped) {
            if (rel.type === 'Issue' && rel.id) {
              this.http.get<any>(`/api/issues/${rel.id}`).subscribe({
                next: (res) => {
                  try {
                    rel.title = rel.title || res.title || res.summary || res.name || null;
                    (rel as any).status = res.status || res.state || res.status_name || null;
                    (rel as any).status_name = res.status_name || res.status || null;
                    (rel as any).status_code = res.status_code ?? res.status_id ?? null;
                  } catch (e) {}
                  this.cdr.markForCheck();
                },
                error: () => {}
              });
            } else if (rel.type === 'Document' && rel.id) {
              this.http.get<any>(`/api/documents/${rel.id}`).subscribe({
                next: (res) => {
                  try {
                    rel.title = rel.title || res.title || res.name || null;
                    (rel as any).status = res.status || null;
                    (rel as any).status_name = res.status || null;
                    (rel as any).status_code = res.status_code ?? null;
                  } catch (e) {}
                  this.cdr.markForCheck();
                },
                error: () => {}
              });
            }
          }

          const key = (r: any) => `${r.type}::${r.id}`;
          const map = new Map<string, any>();
          for (const r of this.relations || []) map.set(key(r), r);
          for (const r of mapped) map.set(key(r), r);
          this.relations = Array.from(map.values());
        } catch (e) {
          // ignore mapping errors
        }
        this.cdr.markForCheck();
      },
      error: () => {}
    });
  }

  private mapLinkToRelation(link: any) {
    const targetTypeRaw = (link.target_type || '').toLowerCase();
    const type = targetTypeRaw === 'issue' || targetTypeRaw === 'task' ? 'Issue' : (targetTypeRaw === 'doc' || targetTypeRaw === 'document' ? 'Document' : (link.relation_type || 'Relation'));
    const id = link.target_id ?? link.targetId ?? link.target ?? link.id;
    return { type, id, title: link.title || link.name || null, raw: link };
  }

  public removeLink(rel: any): void {
    if (!rel || !rel.raw) return;
    const linkId = rel.raw.id ?? rel.raw.link_id ?? rel.raw._id;
    if (!linkId) return;
    if (!confirm('Delete this relation?')) return;

    this.http.delete(`/api/links/${linkId}`).subscribe({
      next: () => {
        this.relations = (this.relations || []).filter(r => r.raw?.id !== linkId && r.raw?.link_id !== linkId && r.raw?._id !== linkId);
        this.cdr.markForCheck();
      },
      error: (err) => console.warn('Failed to delete link', linkId, err)
    });
  }

  public statusSeverity(status: any): 'success' | 'info' | 'warn' | 'danger' {
    if (!status) return 'info';
    const s = String(status).toLowerCase();
    if (s.includes('done') || s.includes('closed') || s.includes('resolved') || s.includes('completed')) return 'success';
    if (s.includes('progress') || s.includes('in progress') || s.includes('in-progress')) return 'warn';
    if (s.includes('block') || s.includes('blocked') || s.includes('reject') || s.includes('error')) return 'danger';
    if (s.includes('open') || s.includes('new')) return 'info';
    return 'info';
  }

  public typeSeverity(relType: any): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    if (!relType) return 'info';
    const s = String(relType).toLowerCase();
    if (s.includes('block')) return 'danger';
    if (s.includes('relates')) return 'secondary';
    return 'info';
  }

  private extractRelations(issue: any): Array<any> {
    if (!issue) return [];
    const out: any[] = [];
    try {
      if (Array.isArray(issue.related_issues) && issue.related_issues.length) {
        for (const it of issue.related_issues) {
          out.push({ type: 'Issue', id: it.id ?? it.issue_id ?? it._id ?? it, title: it.title ?? it.summary ?? it.name ?? '' });
        }
      }
      if (Array.isArray(issue.relations) && issue.relations.length) {
        for (const it of issue.relations) {
          out.push({ type: it.type || 'Issue', id: it.id ?? it.target_id ?? it.ref, title: it.title ?? it.name ?? it.summary ?? '' });
        }
      }
      if (Array.isArray(issue.attachments) && issue.attachments.length) {
        for (const a of issue.attachments) {
          out.push({ type: 'Document', id: a.id ?? a.file_id ?? a._id ?? a.name, title: a.name || a.title || '', url: a.url || a.download_url || a.file_url || null });
        }
      }
    } catch (e) { }
    return out;
  }
}
