import { Component, Input, OnChanges, SimpleChanges, ChangeDetectorRef, Output, EventEmitter } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ChipModule } from 'primeng/chip';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { LinksService } from '../../services/links.service';

@Component({
  selector: 'app-customer-question-relations',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, ChipModule, ButtonModule, BadgeModule],
  template: `
    <section class="admin-subpage-relations card">
      <div class="flex items-center justify-between mt-0 mb-2">
         <h4 class="mb-">{{ 'components.issues.relations.TITLE' | translate }}</h4>
          <p-button severity="secondary" icon="pi pi-plus" class="mt-0" [outlined]="true" (click)="emitAddRelation()"></p-button>
      </div>

      <div *ngIf="!relations || relations.length === 0" class="text-surface-500">{{ 'components.issues.relations.NO_RELATIONS' | translate }}</div>

      <ul *ngIf="relations && relations.length" class="list-none p-0 m-0">
  <li *ngFor="let r of relations" class="flex flex-col md:flex-row md:items-center md:justify-between mb-6 bordered-relation">
          <div>
            <a *ngIf="r.type === 'Question'" [routerLink]="['/customer-questions', r.id]" class="mr-2 mb-1 md:mb-0 inline-block">
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
export class CustomerQuestionRelationsComponent implements OnChanges {
  @Input() question: any | null = null;
  @Output() addRelation = new EventEmitter<void>();
  relations: Array<any> = [];

  constructor(private cdr: ChangeDetectorRef, private http: HttpClient, private linksService: LinksService) {}

  public emitAddRelation(): void {
    try { this.addRelation.emit(); } catch (e) {}
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['question']) {
      this.relations = this.extractRelations(this.question);
      this.loadLinksForQuestion(this.question);
      this.cdr.markForCheck();
    }
  }

  private loadLinksForQuestion(q: any | null) {
    if (!q || (!q.id && !q._id)) return;
    const id = q.id ?? q._id;
    this.linksService.getLinks({ active_type: 'qna', active_id: String(id) }).subscribe({
      next: (res: any) => {
        try {
          const links = Array.isArray(res) ? res : (res && (res.data || res.items) ? (res.data || res.items) : []);
          const mapped = (links as any[]).map(l => this.mapLinkToRelation(l));
          for (const rel of mapped) {
            if (rel.type === 'Question' && rel.id) {
              this.http.get<any>(`/api/customer_questions/${rel.id}`).subscribe({
                next: (res) => {
                  try {
                    rel.title = rel.title || res.question_text || res.title || res.name || null;
                    (rel as any).status = res.status || null;
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
          const key = (r: any) => `${r.type}::${r.id}`;
          const map = new Map<string, any>();
          for (const r of this.relations || []) map.set(key(r), r);
          for (const r of mapped) map.set(key(r), r);
          this.relations = Array.from(map.values());
        } catch (e) {
        }
        this.cdr.markForCheck();
      },
      error: () => { }
    });
  }

  private mapLinkToRelation(link: any) {
    const targetTypeRaw = String(link.target_type || link.passive_type || '').toLowerCase();
    const type = targetTypeRaw === 'issue' || targetTypeRaw === 'task' ? 'Question' : (targetTypeRaw === 'doc' || targetTypeRaw === 'document' ? 'Document' : (link.relation_type || 'Relation'));
    const id = link.target_id ?? link.targetId ?? link.target ?? link.passive_id ?? link.passiveId ?? link.passive ?? link.id;
    return {
      type,
      id,
      title: link.title || link.name || null,
      raw: link,
    };
  }

  public removeLink(rel: any): void {
    if (!rel || !rel.raw) return;
    const linkId = rel.raw.id ?? rel.raw.link_id ?? rel.raw._id;
    if (!linkId) return;
    if (!confirm('Delete this relation?')) return;
    this.linksService.deleteLink(linkId).subscribe({
      next: () => {
        this.relations = (this.relations || []).filter(r => r.raw?.id !== linkId && r.raw?.link_id !== linkId && r.raw?._id !== linkId);
        this.cdr.markForCheck();
      },
      error: () => {}
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

  private extractRelations(q: any): Array<any> {
    if (!q) return [];
    const out: any[] = [];
    try {
      if (Array.isArray(q.relations) && q.relations.length) {
        for (const it of q.relations) out.push({ type: it.type || 'Question', id: it.id ?? it.target_id ?? it.ref, title: it.title ?? it.name ?? '' });
      }
      if (Array.isArray(q.attachments) && q.attachments.length) {
        for (const a of q.attachments) out.push({ type: 'Document', id: a.id ?? a.file_id ?? a._id ?? a.name, title: a.name || a.title || '', url: a.url || a.download_url || a.file_url || null });
      }
    } catch (e) {}
    return out;
  }
}


