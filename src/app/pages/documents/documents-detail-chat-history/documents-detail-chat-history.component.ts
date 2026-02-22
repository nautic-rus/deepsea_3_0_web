import { Component, Input, OnChanges, SimpleChanges, ChangeDetectorRef, ViewChild, ElementRef, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AvatarModule } from 'primeng/avatar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DocumentsService } from '../documents.service';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-documents-detail-chat-history',
  standalone: true,
  providers: [MessageService],
  imports: [CommonModule, FormsModule, ButtonModule, AvatarModule, TranslateModule, ToastModule, ProgressSpinnerModule],
  template: `
    <section class="card ">
      <div class="flex items-center justify-between mb-4">
        <h4 class="font-semibold text-lg mb-0">{{ 'components.documents.detail.CHAT_HISTORY' | translate }}</h4>
      </div>

      <ng-container *ngIf="loadingMessages">
        <div class="messages-loading p-4">
          <p-progressSpinner styleClass="spinner"></p-progressSpinner>
        </div>
      </ng-container>

      <ng-container *ngFor="let group of grouped()">
  <ul class="documents-history-group p-0 m-0 list-none mb-6">
          <li *ngFor="let ev of group.items" class="flex items-start py-3 border-b border-surface">
            <div class="w-12 h-12 flex items-center justify-center rounded-full mr-4 shrink-0" [ngClass]="colorFor(ev.type)">
              <i [class]="iconFor(ev.type) + ' text-xl'"></i>
            </div>
            <div class="flex-1">
              <div class="text-surface-900 dark:text-surface-0 leading-normal">
                <strong>{{ ev.actor }}</strong>
                <span class="text-surface-700 dark:text-surface-100"> {{ ev.action }} </span>
                <span class="text-primary font-bold">{{ ev.field }}</span>
                <span class="text-sm text-muted-color ml-3">{{ formatDateRussian(ev.time) }}</span>
              </div>
              <div class="text-sm text-surface-700 mt-2">{{ ev.oldValue }} → {{ ev.newValue }}</div>
            </div>
          </li>
          <li *ngIf="!group.items || group.items.length === 0" class="text-surface-700 py-2">{{ 'components.documents.relations.NO_RELATIONS' | translate }}</li>
        </ul>
      </ng-container>
    </section>
  `,
  styleUrls: ['../documents-detail-chat/documents-detail-chat.component.scss']
})
export class DocumentsDetailChatHistoryComponent implements OnChanges, AfterViewInit {
  private documentsService = inject(DocumentsService);
  private messageService = inject(MessageService);
  private translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);

  private _document: any | null = null;
  @Input()
  set document(v: any | null) { this._document = v; this.processDocument(); }
  get document(): any | null { return this._document; }

  messages: Array<any> = [];
  historyEntries: Array<any> = [];
  loadingMessages = false;
  @ViewChild('messagesContainer') messagesContainer?: ElementRef<HTMLDivElement>;

  ngAfterViewInit(): void { if (this.historyEntries?.length) this.scrollToBottom(); }
  ngOnChanges(_changes: SimpleChanges): void { /* handled by setter */ }

  private processDocument(): void {
    if (!this._document) { this.historyEntries = []; return; }
    // fetch history via GET /api/documents/{id}/history
    if (this._document.id) {
      this.loadingMessages = true;
      this.documentsService.getHistory(this._document.id).subscribe({
        next: (res: any) => {
          const list = res?.data ?? res ?? [];
          // normalize and store into historyEntries for the template
          this.historyEntries = this.normalizeMessages(list);
          try { if (this._document) this._document.history = list; } catch {}
          this.loadingMessages = false;
          this.cdr.markForCheck();
          this.scrollToBottom();
        },
        error: (err: any) => {
          this.loadingMessages = false;
          try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.documents.messages.ERROR'), detail: err?.message || this.translate.instant('components.documents.messages.ERROR') }); } catch (e) {}
        }
      });
    }
  }

  private normalizeMessages(list: any[]): any[] {
    // keep for backward compatibility if history endpoint returns mixed content
    return (list || []).map((it: any) => {
      const id = it.id || it._id || it.message_id || it.uuid || null;
      let avatarUrl: string | null = null;
      if (it.user && (it.user.avatar_url || it.user.avatar || it.user.avatarUrl)) avatarUrl = it.user.avatar_url || it.user.avatar || it.user.avatarUrl || null;
      else if (it.avatar_url || it.avatar) avatarUrl = it.avatar_url || it.avatar || null;
      else if (it.user && (it.user.avatar_id || it.user.avatarId) || it.avatar_id || it.avatarId) {
        const aid = it.user?.avatar_id ?? it.user?.avatarId ?? it.avatar_id ?? it.avatarId;
        try { if (typeof aid === 'number' || (typeof aid === 'string' && String(aid).trim())) avatarUrl = `/api/storage/${String(aid).trim()}/download`; } catch (e) { avatarUrl = null; }
      }
      return {
        id,
        _localId: id ? undefined : `local-${Math.random().toString(36).slice(2,9)}`,
        parent_id: it.parent_id || it.parentId || null,
        author: it.user?.full_name || it.author_name || it.user_name || it.author || 'Unknown',
        text: it.content || it.text || '',
        time: it.created_at || it.createdAt || it.created || it.timestamp || null,
        avatar_url: avatarUrl,
        // history-specific fields passthrough
        field_name: it.field_name ?? null,
        old_value: it.old_value ?? null,
        new_value: it.new_value ?? null,
        changed_by: it.changed_by ?? null
      };
    });
  }

  // Format raw history value: try to parse JSON-encoded values (they may be strings like '"2026-02-18T11:37:01.548Z"')
  formatValue(raw: any): string {
    try {
      if (raw === null || raw === undefined) return '-';
      let v: any = raw;
      if (typeof v === 'string') {
        // try to unquote JSON-encoded string
        try {
          const parsed = JSON.parse(v);
          v = parsed;
        } catch (e) {
          // not JSON, keep as is
        }
      }
      // If value looks like ISO date, format
      if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)) {
        try { return new Date(v).toLocaleString(); } catch (e) { return String(v); }
      }
      if (typeof v === 'object') return JSON.stringify(v);
      return String(v);
    } catch (e) { return String(raw); }
  }

  getFieldLabel(key: any): string {
    try {
      if (!key && key !== 0) return '';
      const k = String(key);
      const trKey = `components.documents.history.FIELDS.${k}`;
      const translated = this.translate.instant(trKey);
      if (translated && translated !== trKey) return translated;
      // fallback: make a human-friendly label from snake_case
      return k.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    } catch (e) { return String(key); }
  }

  onMessageAvatarError(msg: any): void { try { if (msg) { msg.avatar_url = null; this.cdr.markForCheck(); } } catch (e) {} }

  initials(name?: string): string {
    if (!name) return '';
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '';
    if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  private formatMessageTimeInner(t: any): string {
    try {
      if (!t) return '';
      const n = (typeof t === 'number') ? (t.toString().length === 10 ? t * 1000 : t) : Date.parse(t);
      if (!n || isNaN(n)) return '';
      const d = new Date(n);
      return d.toLocaleString();
    } catch (e) { return ''; }
  }

  formatMessageTime(msg: any): string { return this.formatMessageTimeInner(msg?.time ?? msg); }

  formatDateRussian(t: any): string {
    try {
      if (!t) return '';
      const n = (typeof t === 'number') ? (t.toString().length === 10 ? t * 1000 : t) : Date.parse(t);
      if (!n || isNaN(n)) return '';
      const d = new Date(n);
      // dd.mm.yyyy, HH:MM (ru-RU)
      return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return '' + t; }
  }

  // Map history entries into activity-like events and group them by period
  grouped() {
    const items = (this.historyEntries || []).map(h => ({
      type: 'history',
      actor: `#${h.changed_by}`,
      action: this.translate.instant('components.documents.history.ACTION_CHANGED') || 'changed',
      field: this.getFieldLabel(h.field_name ?? ''),
      oldValue: this.formatValue(h.old_value),
      newValue: this.formatValue(h.new_value),
      time: h.time || h.created_at || h.createdAt || h.timestamp || null,
      raw: h
    }));

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday.getTime() - 1000 * 60 * 60 * 24);
    const startOfWeek = new Date(startOfToday.getTime() - 1000 * 60 * 60 * 24 * 7);

    const groups: { label: string; items: any[] }[] = [
      { label: this.translate.instant('MENU.TODAY') || 'TODAY', items: [] },
      { label: this.translate.instant('MENU.YESTERDAY') || 'YESTERDAY', items: [] },
      { label: this.translate.instant('MENU.LAST_WEEK') || 'LAST WEEK', items: [] }
    ];

    for (const e of items) {
      const t = e.time ? new Date(e.time).getTime() : 0;
      if (t >= startOfToday.getTime()) groups[0].items.push(e);
      else if (t >= startOfYesterday.getTime()) groups[1].items.push(e);
      else groups[2].items.push(e);
    }

    return groups;
  }

  iconFor(type: string) {
    if (type === 'history') return 'pi pi-history';
    return 'pi pi-info';
  }

  colorFor(_type: string) {
    // single style for history entries
    return 'bg-gray-100 text-gray-500';
  }

  scrollToMessage(targetId: any): void {
    try {
      if (!targetId) return;
      const idStr = String(targetId);
      const selector = '#msg-' + idStr;
      const container: HTMLElement | undefined = this.messagesContainer?.nativeElement;
      let target: HTMLElement | null = null;
      if (container) { target = container.querySelector(selector) as HTMLElement | null; }
      if (!target) target = document.querySelector(selector) as HTMLElement | null;
      if (!target) return;
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const offset = targetRect.top - containerRect.top - container.clientHeight / 2 + targetRect.height / 2;
        container.scrollTo({ top: container.scrollTop + offset, behavior: 'smooth' });
      } else {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      target.classList.add('message-highlight');
      setTimeout(() => target.classList.remove('message-highlight'), 2200);
    } catch (e) {}
  }

  private scrollToBottom(): void { setTimeout(() => { const el = this.messagesContainer?.nativeElement; if (el) el.scrollTop = el.scrollHeight; }, 0); }
}
