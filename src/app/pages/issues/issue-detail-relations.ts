import { Component, Input, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ChipModule } from 'primeng/chip';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';

@Component({
  selector: 'app-issue-detail-relations',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, ChipModule, ButtonModule, BadgeModule],
  template: `
    <section class="admin-subpage-relations card">
      <div class="flex items-center justify-between mt-0 mb-2">
         <h4 class="mb-">{{ 'components.issues.relations.TITLE' | translate }}</h4>
          <p-button severity="secondary" icon="pi pi-plus" class="mt-0" [outlined]="true" ></p-button>
      </div>

      <div *ngIf="!relations || relations.length === 0" class="text-surface-500">{{ 'components.issues.relations.NO_RELATIONS' | translate }}</div>

      <ul *ngIf="relations && relations.length" class="list-none p-0 m-0">
  <li *ngFor="let r of relations" class="flex flex-col md:flex-row md:items-center md:justify-between mb-6 bordered-relation">
          <div>
            <a *ngIf="r.type === 'Issue'" [routerLink]="['/issues', r.id]" class="mr-2 mb-1 md:mb-0 inline-block">
              <span class="text-blue-600 dark:text-blue-400 font-medium hover:underline">{{ r.type + ' #' + r.id }}</span>
              <span *ngIf="r.title" class="text-surface-900 dark:text-surface-0"> &mdash; {{ r.title }}</span>
            </a>
            <a *ngIf="r.type === 'Document'" [href]="r.url || '#'" target="_blank" rel="noopener" class="text-surface-900 dark:text-surface-0 font-medium mr-2 mb-1 md:mb-0">{{ r.title || r.name || ('components.issues.relations.DOCUMENT' | translate) }}</a>
            <div class="mt-1 text-muted-color">
              <p-badge *ngIf="r.status" [value]="r.status" [severity]="statusSeverity(r.status)"></p-badge>
              <p-badge *ngIf="r.raw?.relation_type" [value]="r.raw.relation_type" [severity]="typeSeverity(r.raw.relation_type)"></p-badge>

            </div>
          </div>
          <div class="mt-2 md:mt-0 flex items-center">
            <p-button type="button" icon="pi pi-trash" severity="danger" class="p-button-text" (click)="removeLink(r)"></p-button>
          </div>
        </li>
      </ul>
    </section>
  `,
  styles: [
    `
      .relation-item { border-bottom: 1px dashed var(--surface-200); }
      .relation-type { width: 80px; flex: 0 0 80px; }
      .bordered-relation { border: 1px solid var(--surface-200); border-radius: 6px; padding: 0.75rem; margin-bottom: 1rem; }
    `
  ]
})
export class IssueDetailRelationsComponent implements OnChanges {
  @Input() issue: any | null = null;
  relations: Array<any> = [];

  constructor(private cdr: ChangeDetectorRef, private http: HttpClient) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['issue']) {
      // first populate from issue payload if present
      this.relations = this.extractRelations(this.issue);
      // then fetch authoritative links from backend (source_type=task, source_id=issue.id)
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
          // enrich mapped relations with titles/status by fetching target resources when possible
          for (const rel of mapped) {
            if (rel.type === 'Issue' && rel.id) {
              this.http.get<any>(`/api/issues/${rel.id}`).subscribe({
                next: (res) => {
                  try {
                    rel.title = rel.title || res.title || res.summary || res.name || null;
                    (rel as any).status = res.status || res.state || res.status_name || null;
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
                  } catch (e) {}
                  this.cdr.markForCheck();
                },
                error: () => {}
              });
            }
          }
          // merge unique by type+id (prefer server-provided entries)
          const key = (r: any) => `${r.type}::${r.id}`;
          const map = new Map<string, any>();
          // add existing (local) first
          for (const r of this.relations || []) map.set(key(r), r);
          // override/insert from server
          for (const r of mapped) map.set(key(r), r);
          this.relations = Array.from(map.values());
        } catch (e) {
          // ignore mapping errors, keep existing relations
        }
        this.cdr.markForCheck();
      },
      error: () => { /* ignore errors silently for now */ }
    });
  }

  private mapLinkToRelation(link: any) {
    // Expected link structure (example provided):
    // { id, source_type, source_id, target_type, target_id, relation_type, ... }
    const targetTypeRaw = (link.target_type || '').toLowerCase();
    const type = targetTypeRaw === 'issue' || targetTypeRaw === 'task' ? 'Issue' : (targetTypeRaw === 'doc' || targetTypeRaw === 'document' ? 'Document' : (link.relation_type || 'Relation'));
  const id = link.target_id ?? link.targetId ?? link.target ?? link.id;
    return {
      type,
      id,
      // server doesn't provide titles for linked objects in this endpoint so show minimal info
      title: link.title || link.name || null,
      raw: link,
    };
  }

  // Remove a link by its backend id (DELETE /api/links/{id}) and update view on success
  public removeLink(rel: any): void {
    if (!rel || !rel.raw) return;
    const linkId = rel.raw.id ?? rel.raw.link_id ?? rel.raw._id;
    if (!linkId) {
      console.warn('removeLink: no link id found for', rel);
      return;
    }
    if (!confirm('Delete this relation?')) return;

    this.http.delete(`/api/links/${linkId}`).subscribe({
      next: () => {
        this.relations = (this.relations || []).filter(r => r.raw?.id !== linkId && r.raw?.link_id !== linkId && r.raw?._id !== linkId);
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.warn('Failed to delete link', linkId, err);
      }
    });
  }

  // Map textual status to PrimeNG badge severity
  public statusSeverity(status: any): 'success' | 'info' | 'warn' | 'danger' {
    if (!status) return 'info';
    const s = String(status).toLowerCase();
    if (s.includes('done') || s.includes('closed') || s.includes('resolved') || s.includes('completed')) return 'success';
    if (s.includes('progress') || s.includes('in progress') || s.includes('in-progress')) return 'warn';
    if (s.includes('block') || s.includes('blocked') || s.includes('reject') || s.includes('error')) return 'danger';
    if (s.includes('open') || s.includes('new')) return 'info';
    return 'info';
  }

  // Map relation type to PrimeNG badge severity
  public typeSeverity(relType: any): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    if (!relType) return 'info';
    const s = String(relType).toLowerCase();
    if (s.includes('block')) return 'danger';
    if (s.includes('relates') || s.includes('relates')) return 'secondary';
    // fallback to info for unknown types
    return 'info';
  }

  private extractRelations(issue: any): Array<any> {
    if (!issue) return [];
    // normalize from a few common shapes: related_issues, relations, links, attachments
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
      // documents/attachments
      if (Array.isArray(issue.attachments) && issue.attachments.length) {
        for (const a of issue.attachments) {
          out.push({ type: 'Document', id: a.id ?? a.file_id ?? a._id ?? a.name, title: a.name || a.title || '', url: a.url || a.download_url || a.file_url || null });
        }
      }
    } catch (e) { /* ignore parse errors */ }
    return out;
  }
}
