import { Component, Input, OnChanges, SimpleChanges, ChangeDetectorRef, Output, EventEmitter } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TagModule } from 'primeng/tag';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-documents-detail-relations-table',
  standalone: true,
  imports: [CommonModule, TranslateModule, TagModule, BadgeModule, ButtonModule, TableModule, TooltipModule],
  template: `
    <section class="admin-subpage-relations card">
      <div class="flex items-center justify-between mt-0 mb-2">
         <h4 class="mb-0">{{ 'components.documents.relations.TITLE' | translate }}</h4>
          <p-button severity="secondary" icon="pi pi-plus" class="mt-0" [outlined]="true" (click)="onAddRelation($event)"></p-button>
      </div>

      <div *ngIf="!relations || relations.length === 0" class="text-surface-500">{{ 'components.documents.relations.NO_RELATIONS' | translate }}</div>

      <p-table *ngIf="relations && relations.length" [value]="relations" class="w-full" size="small">
        <ng-template pTemplate="header">
          <tr>
            <th style="width:20%">{{ 'components.documents.relations.COLUMN_TYPE_ID' | translate }}</th>
            <th style="width:30%">{{ 'components.documents.relations.COLUMN_NAME' | translate }}</th>
            <th style="width:15%">{{ 'components.documents.relations.COLUMN_STATUS' | translate }}</th>
            <th style="width:15%">{{ 'components.documents.relations.COLUMN_TYPE' | translate }}</th>
            <th style="width:15%">{{ 'components.documents.relations.COLUMN_DIRECTION' | translate }}</th>
            <th style="width:5%"></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-r>
          <tr>
            <td>
              <a *ngIf="r.type === 'Issue'" href="#" (click)="openIssue($event, r)" class="text-blue-600 dark:text-blue-400 hover:underline">{{ r.type + ' #' + r.id }}</a>
              <a *ngIf="r.type === 'Document'" href="#" (click)="openDocument($event, r)" class="text-blue-600 dark:text-blue-400 font-medium hover:underline">{{ r.type + ' #' + r.id }}</a>
            </td>
            <td>
              <!-- For documents show code + title, for others just the title -->
              <span *ngIf="r.type === 'Document'"
                    [pTooltip]="(r.code ? (r.code + ' ') : '') + (r.title || '')"
                    tooltipPosition="top"
                    tooltipAppendTo="body"
                    [tooltipDisabled]="(((r.code ? (r.code + ' ') : '') + (r.title || '')).length <= 50)">
                {{ truncate((r.code ? (r.code + ' ') : '') + (r.title || '')) }}
              </span>
              <span *ngIf="r.type !== 'Document' && r.title"
                    [pTooltip]="r.title"
                    tooltipPosition="top"
                    tooltipAppendTo="body"
                    [tooltipDisabled]="((r.title || '').length <= 50)">
                {{ truncate(r.title) }}
              </span>

            </td>
            <td>
              <p-tag *ngIf="r.status" [value]="r.status" [severity]="statusSeverity(r.status)"></p-tag>
            </td>
            <td>
              <p-badge *ngIf="r.raw?.relation_type" [value]="r.raw.relation_type" [severity]="typeSeverity(r.raw.relation_type)"></p-badge>
            </td>
            <td>
              <span *ngIf="r.direction" class="text-surface-500">{{ directionLabelKey(r.direction) | translate }}</span>
            </td>
            <td class="text-right">
              <p-button icon="pi pi-trash" severity="danger" (click)="removeLink(r)" [outlined]="true"></p-button>
            </td>
          </tr>
        </ng-template>
      </p-table>
    </section>
  `,
  styles: [ `:host { display: block; }` ]
})
export class DocumentsDetailRelationsTableComponent implements OnChanges {
  @Input() document: any | null = null;
  @Output() addRelation = new EventEmitter<void>();
  relations: Array<any> = [];

  constructor(private cdr: ChangeDetectorRef, private http: HttpClient, private router: Router, private translate: TranslateService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['document']) {
      this.relations = this.extractRelations(this.document);
      this.loadLinksForDocument(this.document);
      this.cdr.markForCheck();
    }
  }

  public onAddRelation(event?: Event) {
    if (event && typeof event.preventDefault === 'function') event.preventDefault();
    this.addRelation.emit();
  }

  private loadLinksForDocument(doc: any | null) {
    if (!doc || (!doc.id && !doc._id)) return;
    const id = doc.id ?? doc._id;

    let paramsSource = new HttpParams();
    paramsSource = paramsSource.set('active_type', 'document');
    paramsSource = paramsSource.set('active_id', String(id));

    let paramsTarget = new HttpParams();
    paramsTarget = paramsTarget.set('passive_type', 'document');
    paramsTarget = paramsTarget.set('passive_id', String(id));

    const reqSource = this.http.get<any>('/api/links', { params: paramsSource }).pipe(catchError(() => of([])));
    const reqTarget = this.http.get<any>('/api/links', { params: paramsTarget }).pipe(catchError(() => of([])));

    forkJoin([reqSource, reqTarget]).subscribe({
      next: ([resSource, resTarget]: any) => {
        try {
          const extract = (res: any) => Array.isArray(res) ? res : (res && (res.data || res.items) ? (res.data || res.items) : []);
          const linksSource = extract(resSource) as any[];
          const linksTarget = extract(resTarget) as any[];

          const allLinks = [...(linksSource || []), ...(linksTarget || [])];

          const mapped = (allLinks as any[])
            .map(l => this.mapLinkToRelation(l, id))
            .filter(r => r && (r.id || r.id === 0));

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
                    rel.title = rel.title || res.title || res.name || res.summary || null;
                    (rel as any).status = res.status || res.state || res.status_name || null;
                    // populate code/number for documents so we can show "code + title" in the table
                    const rAny = rel as any;
                    rAny.code = rAny.code || res.code || res.document_number || res.number || null;
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

  private mapLinkToRelation(link: any, currentDocId?: any) {
    const getVal = (obj: any, ...keys: string[]) => {
      for (const k of keys) if (obj[k] !== undefined) return obj[k];
      return null;
    };

    const sourceId = getVal(link, 'source_id', 'sourceId', 'source', 'active_id', 'activeId', 'active');
    const targetId = getVal(link, 'target_id', 'targetId', 'target', 'passive_id', 'passiveId', 'passive');
    const sourceTypeRaw = String(getVal(link, 'source_type', 'active_type') || '').toLowerCase();
    const targetTypeRaw = String(getVal(link, 'target_type', 'passive_type') || '').toLowerCase();

    let otherTypeRaw = targetTypeRaw;
    let otherId = targetId ?? link.id;

    try {
      if (currentDocId != null && String(sourceId) === String(currentDocId)) {
        otherTypeRaw = targetTypeRaw;
        otherId = targetId;
      } else if (currentDocId != null && String(targetId) === String(currentDocId)) {
        otherTypeRaw = sourceTypeRaw;
        otherId = sourceId;
      } else {
        otherTypeRaw = targetTypeRaw || sourceTypeRaw;
        otherId = targetId ?? sourceId ?? link.id;
      }
    } catch (e) {
      otherTypeRaw = targetTypeRaw;
      otherId = targetId ?? sourceId ?? link.id;
    }

    const type = otherTypeRaw === 'issue' || otherTypeRaw === 'task' ? 'Issue' : (otherTypeRaw === 'doc' || otherTypeRaw === 'document' ? 'Document' : (link.relation_type || 'Relation'));
    const id = otherId;

    const relTypeRaw = String(link.relation_type || link.type || '').toLowerCase();
    let direction = (currentDocId != null && String(sourceId) === String(currentDocId)) ? 'source' : ((currentDocId != null && String(targetId) === String(currentDocId)) ? 'target' : 'unknown');
    if (relTypeRaw.includes('relates')) {
      direction = '-';
    }

    return { type, id, title: link.title || link.name || null, raw: link, direction };
  }

  public directionLabelKey(direction: any): string {
    if (!direction && direction !== 0) return '';
    const d = String(direction).toLowerCase();
    if (d === '-') return 'components.documents.relations.DIRECTION_LABEL_RELATES';
    if (d === 'source') return 'components.documents.relations.DIRECTION_LABEL_SOURCE';
    if (d === 'target') return 'components.documents.relations.DIRECTION_LABEL_TARGET';
    return 'components.documents.relations.DIRECTION_LABEL_UNKNOWN';
  }

  public openIssue(event: Event, r: any): void {
    event.preventDefault();
    if (!r || !r.id) return;
    try {
      const tree = this.router.createUrlTree(['/issues', r.id]);
      const url = window.location.origin + this.router.serializeUrl(tree);
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      const url = window.location.origin + `/issues/${r.id}`;
      window.open(url, '_blank', 'noopener');
    }
  }

  public openDocument(event: Event, r: any): void {
    event.preventDefault();
    if (!r) return;
    const candidate = r.url || (r.id ? `/documents/${r.id}` : null);
    if (!candidate) return;
    const isAbsolute = /^https?:\/\//i.test(candidate);
    const url = isAbsolute ? candidate : window.location.origin + candidate;
    window.open(url, '_blank', 'noopener');
  }

  public removeLink(rel: any): void {
    if (!rel || !rel.raw) return;
    const linkId = rel.raw.id ?? rel.raw.link_id ?? rel.raw._id;
  if (!linkId) return;
  const confirmMsg = this.translate.instant('components.documents.relations.DELETE_CONFIRM') || 'Delete this relation?';
  if (!confirm(confirmMsg)) return;

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
    if (s.includes('relates')) return 'info';
    return 'info';
  }

  /** Truncate text to a maximum length (including ellipsis). */
  public truncate(text: any, max = 40): string {
    if (text === null || text === undefined) return '';
    const s = String(text);
    if (max <= 0) return '';
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
  }

  private extractRelations(doc: any): Array<any> {
    if (!doc) return [];
    const out: any[] = [];
    try {
      if (Array.isArray(doc.related_issues) && doc.related_issues.length) {
        for (const it of doc.related_issues) {
          out.push({ type: 'Issue', id: it.id ?? it.issue_id ?? it._id ?? it, title: it.title ?? it.summary ?? it.name ?? '', direction: 'source' });
        }
      }
      if (Array.isArray(doc.relations) && doc.relations.length) {
        for (const it of doc.relations) {
          out.push({ type: it.type || 'Document', id: it.id ?? it.target_id ?? it.ref, title: it.title ?? it.name ?? it.summary ?? '', direction: 'source' });
        }
      }
      if (Array.isArray(doc.attachments) && doc.attachments.length) {
        for (const a of doc.attachments) {
          out.push({ type: 'Document', id: a.id ?? a.file_id ?? a._id ?? a.name, title: a.name || a.title || '', url: a.url || a.download_url || a.file_url || null, direction: 'source' });
        }
      }
    } catch (e) { }
    return out;
  }
}

