import { Component, Input, OnChanges, SimpleChanges, ChangeDetectorRef, ViewChild, ElementRef, AfterViewInit, inject } from '@angular/core';
import { forkJoin } from 'rxjs';
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
  selector: 'app-documents-detail-chat',
  standalone: true,
  providers: [MessageService],
  imports: [CommonModule, FormsModule, ButtonModule, AvatarModule, TranslateModule, ToastModule, ProgressSpinnerModule],
  template: `
    <section class="chat-container card">
      <p-toast></p-toast>
      <h4 class="chat-title">{{ 'components.documents.detail.CHAT' | translate }}</h4>

      <!-- Unified messages+history area -->
      <div #messagesContainer class="chat-messages">

        <div *ngIf="loadingMessages" class="messages-loading">
          <p-progressSpinner styleClass="spinner"></p-progressSpinner>
        </div>

        <div *ngIf="!loadingMessages && combinedItems().length === 0" class="text-sm text-surface-500">
          {{ 'components.documents.detail.CHAT_PLACEHOLDER' | translate }}
        </div>

        <ng-container *ngFor="let group of grouped()">
          <ul *ngIf="group.items && group.items.length" class="documents-history-group p-0 m-0 list-none mb-6">
            <li *ngFor="let ev of group.items" class="flex items-start mb-3" [attr.id]="ev.type === 'message' && ev.id ? ('msg-' + ev.id) : null" [class.message-highlight]="ev.type === 'message' && ev.id == highlightedMessageId">
              <div class="w-10 h-10 flex items-center justify-center rounded-full mr-4 shrink-0 avatar-wrap" [ngClass]="colorFor(ev.type)">
                <ng-container *ngIf="ev?.avatar_url; else initialsTpl">
                  <div class="p-avatar full-avatar">
                    <img [src]="ev.avatar_url" alt="avatar" (error)="onMessageAvatarError(ev)" />
                  </div>
                </ng-container>
                <ng-template #initialsTpl>
                  <div class="p-avatar full-avatar">{{ initials(ev.actor) }}</div>
                </ng-template>
              </div>
              <div class="flex-1">
                <div class="text-surface-00 dark:text-surface-0 leading-normal item-header">
                  <div class="item-header-left" style="min-width: 0;">
                    <strong>{{ ev.actor }}</strong>
                    <span class="text-surface-700 dark:text-surface-100"> {{ ev.action }} </span>
                    <span *ngIf="ev.field" class="text-primary font-bold">{{ ev.field }}</span>
                  </div>
                  <div class="item-header-right text-sm text-muted-color" style="display:flex;align-items:center;gap:0.5rem;">
                    <span class="msg-time">{{ formatDateRussian(ev.time) }}</span>
                    <span class="reply-btn" (click)="ev.type === 'message' && answer(ev)" style="position:relative; z-index:2;">
                      <ng-container *ngIf="ev.type === 'message'; else replyPlaceholder">
                        <p-button severity="secondary" icon="pi pi-reply" class="ml-2" [outlined]="true" (click)="answer(ev)" (onClick)="answer(ev)" aria-label="Reply" [style]="{ 'pointer-events': 'auto' }"></p-button>
                      </ng-container>
                      <ng-template #replyPlaceholder>
                        <span class="reply-btn-placeholder" aria-hidden="true"></span>
                      </ng-template>
                    </span>
                  </div>
                </div>
                <div *ngIf="ev.type === 'message'" class="text-sm text-surface-700" [innerHTML]="ev.text"></div>
                <div *ngIf="ev.type === 'message' && ev.raw && (ev.raw.parent_id || ev.raw.parentId)" class="in-reply-to text-sm text-surface-500">
                  {{ 'components.issues.chat.IN_REPLY_TO' | translate }}
                  <a href="#" (click)="scrollToMessage(ev.raw.parent_id ?? ev.raw.parentId); $event.preventDefault()">#{{ ev.raw.parent_id ?? ev.raw.parentId }}</a>
                </div>
                <div *ngIf="ev.type === 'history'" class="text-sm text-surface-700">{{ ev.oldValue }} → {{ ev.newValue }}</div>
              </div>
            </li>
          </ul>
        </ng-container>

      </div>

  <!-- Editor area: always at the bottom, grows upward as content increases -->
  <div class="border-t border-surface-200 dark:border-surface-700"></div>
  <div class="chat-editor">
        <div class="chat-editor-row">
          <div class="chat-editor-left">
            <p-button icon="pi pi-paperclip" severity="secondary" (click)="onAttachClick()" [disabled]="true" [outlined]="true"></p-button>
          </div>

          <div class="chat-editor-center">
            <div *ngIf="replyToId" class="replying-bar">
              <span class="replying-label">{{ 'components.issues.chat.REPLYING_TO' | translate }} #{{ replyToId }}</span>
              <button pButton type="button" class="p-button-text p-button-plain cancel-reply" icon="pi pi-times" (click)="cancelReply()" aria-label="{{ 'components.issues.chat.CANCEL_REPLY' | translate }}"></button>
            </div>
            <textarea
              #textareaRef
              [(ngModel)]="newMessage"
              rows="1"
              (input)="onTextareaInput()"
              (keydown)="onComposerKeydown($event)"
              class="chat-textarea"
              placeholder="{{ 'components.issues.chat.PLACEHOLDER' | translate }}"
            ></textarea>
            <input #fileInput type="file" hidden (change)="onFileSelected($event)" multiple />
          </div>

          <div class="chat-editor-right">
            <button pButton type="button" class="p-button-plain send-btn" icon="pi pi-send" (click)="send()" [disabled]="!newMessage.trim() || sending"></button>
          </div>
        </div>

        <!-- hint moved inside center column to sit directly under the input -->
      </div>
    </section>
  `,
  styleUrls: ['./documents-detail-chat.component.scss']
})
export class DocumentsDetailChatComponent implements OnChanges, AfterViewInit {
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
  newMessage = '';
  sending = false;
  loadingMessages = false;
  replyToId: any = null;
  @ViewChild('messagesContainer') messagesContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('textareaRef') textareaRef?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  ngAfterViewInit(): void { if (this.messages?.length) this.scrollToBottom(); }

  ngOnChanges(_changes: SimpleChanges): void { /* handled by setter */ }

  private processDocument(): void {
    if (!this._document) { this.messages = []; return; }
    // fetch both messages and history so combined view shows everything chronologically
    if (this._document.id) {
      this.loadingMessages = true;

      // If messages already present on document, use them immediately
      if (this._document.messages && Array.isArray(this._document.messages)) {
        this.messages = this.normalizeMessages(this._document.messages);
      }

      // We'll fetch messages (if not already loaded) and history in parallel; use a simple pending counter
      let pending = 2;
      const finish = () => {
        pending -= 1;
        if (pending <= 0) {
          this.loadingMessages = false;
          this.cdr.markForCheck();
          this.scrollToBottom();
        }
      };

      // fetch messages if document doesn't already contain them
      if (!(this._document.messages && Array.isArray(this._document.messages) && this._document.messages.length)) {
        this.documentsService.getMessages(this._document.id).subscribe({
          next: (res: any) => {
            const list = res?.data ?? res ?? [];
            this.messages = this.normalizeMessages(list);
            try { if (this._document) this._document.messages = list; } catch {}
            finish();
          },
          error: (_err: any) => {
            try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.documents.messages.ERROR'), detail: this.translate.instant('components.documents.messages.ERROR') }); } catch (e) {}
            finish();
          }
        });
      } else {
        // already used local messages
        finish();
      }

      // fetch history
      this.documentsService.getHistory(this._document.id).subscribe({
        next: (res: any) => {
          const list = res?.data ?? res ?? [];
          this.historyEntries = this.normalizeHistory(list);
          try { if (this._document) this._document.history = list; } catch {}
          finish();
        },
        error: (_err: any) => {
          try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.documents.messages.ERROR'), detail: this.translate.instant('components.documents.messages.ERROR') }); } catch (e) {}
          finish();
        }
      });
    }
  }

  private normalizeMessages(list: any[]): any[] {
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
        author: this.shortName(it.user?.full_name || it.author_name || it.user_name || it.author || 'Unknown'),
        text: it.content || it.text || '',
        time: it.created_at || it.createdAt || it.created || it.timestamp || null,
        avatar_url: avatarUrl
      };
    });
  }

  private normalizeHistory(list: any[]): any[] {
    return (list || []).map((it: any) => {
      // derive avatar url from several possible fields (user.avatar_url, user.avatar_id, avatar_id on the entry itself, etc.)
      let avatarUrl: string | null = null;
      const u = it.user ?? null;
      if (u && (u.avatar_url || u.avatar || u.avatarUrl)) avatarUrl = u.avatar_url || u.avatar || u.avatarUrl || null;
      else if (it.avatar_url || it.avatar) avatarUrl = it.avatar_url || it.avatar || null;
      else {
        const aid = u?.avatar_id ?? u?.avatarId ?? it.avatar_id ?? it.avatarId ?? null;
        try { if (aid !== null && (typeof aid === 'number' || (typeof aid === 'string' && String(aid).trim()))) avatarUrl = `/api/storage/${String(aid).trim()}/download`; } catch (e) { avatarUrl = null; }
      }
      return {
        id: it.id || it._id || it.uuid || null,
        field_name: it.field_name ?? null,
        old_value: it.old_value ?? null,
        new_value: it.new_value ?? null,
        changed_by: it.changed_by ?? it.user?.id ?? null,
        user: it.user ?? null,
        avatar_url: avatarUrl,
        time: it.created_at || it.createdAt || it.timestamp || null
      };
    });
  }

  // combine messages and history into unified items for rendering
  combinedItems() {
    const msgs = (this.messages || []).map(m => ({
      type: 'message',
      id: m.id ?? m._localId,
      actor: m.author || 'Unknown',
      action: this.translate.instant('components.documents.chat.SAID') || 'said',
      avatar_url: m.avatar_url || null,
      text: m.text || '',
      time: m.time || m.created_at || m.createdAt || null,
      raw: m
    }));

    const hist = (this.historyEntries || []).map(h => ({
      type: 'history',
      id: h.id ?? null,
      actor: h.user ? this.shortName(h.user?.full_name || h.user?.fullName || '') : (h.changed_by ? `#${h.changed_by}` : 'System'),
      action: this.translate.instant('components.documents.history.ACTION_CHANGED') || 'changed',
      field: this.getFieldLabel(h.field_name ?? ''),
      oldValue: this.formatValue(h.old_value),
      newValue: this.formatValue(h.new_value),
      text: '',
      // prefer normalized avatar_url if present
      avatar_url: h.avatar_url || h.user?.avatar_url || (h.user?.avatar_id ? `/api/storage/${String(h.user.avatar_id)}/download` : null) || null,
      time: h.time || null,
      raw: h
    }));

    // merge and sort by time descending (newest first) but grouping expects chronological order; we'll sort ascending
    const combined = msgs.concat(hist).sort((a, b) => {
      const ta = a.time ? new Date(a.time).getTime() : 0;
      const tb = b.time ? new Date(b.time).getTime() : 0;
      return ta - tb;
    });
    return combined;
  }

  // Map combined items into groups by period
  grouped() {
    const items = this.combinedItems();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 1000 * 60 * 60 * 24;

    // Build groups oldest-first so the newest events are rendered at the bottom
    const groups: { label: string; items: any[] }[] = [
      { label: this.translate.instant('MENU.LAST_WEEK') || 'LAST WEEK', items: [] },
      { label: this.translate.instant('MENU.YESTERDAY') || 'YESTERDAY', items: [] },
      { label: this.translate.instant('MENU.TODAY') || 'TODAY', items: [] }
    ];

    for (const e of items) {
      const t = e.time ? new Date(e.time).getTime() : 0;
      if (t >= startOfToday) groups[2].items.push(e);
      else if (t >= startOfYesterday) groups[1].items.push(e);
      else groups[0].items.push(e);
    }

    return groups;
  }

  iconFor(type: string) { return type === 'history' ? 'pi pi-history' : 'pi pi-comment'; }
  colorFor(_type: string) { return 'bg-gray-100 text-gray-500'; }

  // same helpers as history component
  formatValue(raw: any): string {
    try {
      if (raw === null || raw === undefined) return '-';
      let v: any = raw;
      if (typeof v === 'string') {
        try { const parsed = JSON.parse(v); v = parsed; } catch (e) {}
      }
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
      return k.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    } catch (e) { return String(key); }
  }

  formatDateRussian(t: any): string {
    try {
      if (!t) return '';
      const n = (typeof t === 'number') ? (t.toString().length === 10 ? t * 1000 : t) : Date.parse(t);
      if (!n || isNaN(n)) return '';
      const d = new Date(n);
      return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return '' + t; }
  }

  replyToAuthor: string | null = null;
  // store highlighted message id so Angular template can add the class reliably
  highlightedMessageId: string | null = null;

  answer(m: any): void {
    try {
      // m can be combined item (ev) or raw message object
      const idRaw = m?.id ?? m?._localId ?? m?.raw?.id ?? m?.parent_id ?? m?.parentId ?? null;
      // store string id for UI so falsy numeric 0 still shows the replying bar
      this.replyToId = idRaw !== null && idRaw !== undefined ? String(idRaw) : null;
      try { this.replyToAuthor = m?.actor ?? m?.author ?? (m?.raw && (m.raw.author || m.raw.user?.full_name)) ?? null; } catch (_) { this.replyToAuthor = null; }
      console.debug('[DocumentsDetailChat] reply to', { id: this.replyToId, author: this.replyToAuthor, src: m });
      // do not prefill composer with an @mention for privacy/clarity — leave newMessage as-is
      // ensure UI updates and textarea receives focus
      this.cdr.markForCheck();
      // visual flash to confirm handler invoked even when devtools is closed
      try {
        const container = this.messagesContainer?.nativeElement;
        if (container) {
          container.classList.add('reply-flash');
          setTimeout(() => container.classList.remove('reply-flash'), 600);
        }
      } catch (e) {}
      setTimeout(() => {
        try {
          this.onTextareaInput();
          try { this.textareaRef?.nativeElement.focus(); } catch (e) {}
        } catch (e) {}
        this.scrollToBottom();
      }, 0);
    } catch (e) {
      this.replyToId = null;
      this.replyToAuthor = null;
    }
  }

  cancelReply(): void { this.replyToId = null; this.replyToAuthor = null; }

  onAttachClick(): void { try { this.fileInput?.nativeElement.click(); } catch (e) {} }

  onFileSelected(ev: Event): void {
    try {
      const input = ev.target as HTMLInputElement;
      const files = input.files;
      if (files && files.length) {
        console.debug('[DocumentsDetailChat] selected files', files);
        try { this.messageService.add({ severity: 'info', summary: 'Attachment', detail: `${files.length} file(s) selected` }); } catch (e) {}
      }
    } catch (e) { console.error(e); }
  }

  onMessageAvatarError(msg: any): void {
    try { if (msg) { msg.avatar_url = null; this.cdr.markForCheck(); } } catch (e) {}
  }

  scrollToMessage(targetId: any): void {
    try {
      try { console.debug('[DocumentsDetailChat] scrollToMessage called with', targetId); } catch (e) {}
      if (!targetId) return;
      const idStr = String(targetId);
      const selector = '#msg-' + idStr;
      const container: HTMLElement | undefined = this.messagesContainer?.nativeElement;
      let target: HTMLElement | null = null;
      if (container) { target = container.querySelector(selector) as HTMLElement | null; }
      try { console.debug('[DocumentsDetailChat] container query result:', target); } catch (e) {}
      if (!target) target = document.querySelector(selector) as HTMLElement | null;
      try { console.debug('[DocumentsDetailChat] global query result:', target); } catch (e) {}
      if (!target) {
        try { console.debug('[DocumentsDetailChat] scrollToMessage: target not found for', selector); } catch (e) {}
        return;
      }

      // Scroll the target into view (within container when possible)
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const offset = targetRect.top - containerRect.top - container.clientHeight / 2 + targetRect.height / 2;
        container.scrollTo({ top: container.scrollTop + offset, behavior: 'smooth' });
      } else {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      // Set Angular-bound highlighted id so template can apply class reliably.
      try {
        this.highlightedMessageId = idStr;
        this.cdr.markForCheck();
      } catch (e) {}
      setTimeout(() => {
        try { this.highlightedMessageId = null; this.cdr.markForCheck(); } catch (e) {}
      }, 2200);
    } catch (e) {}
  }

  send(): void {
    if (!this.newMessage?.trim()) return;

    // format message for sending (preserve line breaks as <br/> so backend and [innerHTML] render it)
    const formattedMessage = this.formatMessageForSend(this.newMessage);
    if (!this._document || !this._document.id) {
      // optimistic local append when no id
      this.messages.push({ _localId: `local-${Math.random().toString(36).slice(2,9)}`, author: 'You', text: formattedMessage, time: new Date().toISOString(), avatar_url: null });
      this.newMessage = '';
      this.scrollToBottom();
      return;
    }

    this.sending = true;
  const payload: any = { content: formattedMessage };
  if (this.replyToId) {
    // convert back to number when possible (API might expect numeric id)
    const n = String(this.replyToId).trim();
    payload.parent_id = /^\d+$/.test(n) ? Number(n) : this.replyToId;
  }
    this.documentsService.postMessage(this._document.id, payload).subscribe({
      next: (res: any) => {
        const data = res?.data ?? res;
        // build avatar_url from explicit URL or avatar_id if provided by backend
        let pushedAvatar: string | null = null;
        try {
          if (data?.user && (data.user.avatar_url || data.user.avatar || data.user.avatarUrl)) pushedAvatar = data.user.avatar_url || data.user.avatar || data.user.avatarUrl || null;
          else if (data?.avatar_url || data?.avatar) pushedAvatar = data.avatar_url || data.avatar || null;
          else {
            const aid = data?.user?.avatar_id ?? data?.user?.avatarId ?? data?.avatar_id ?? data?.avatarId ?? null;
            if (aid !== null && aid !== undefined && (typeof aid === 'number' || (typeof aid === 'string' && String(aid).trim()))) pushedAvatar = `/api/storage/${String(aid).trim()}/download`;
          }
        } catch (e) { pushedAvatar = null; }

        const pushed = {
          id: data?.id || data?._id || data?.message_id || null,
          parent_id: data?.parent_id ?? data?.parentId ?? null,
          author: this.shortName(data?.user?.full_name || data?.user?.fullName || data?.author_name || data?.author || 'You'),
          text: data?.content || data?.message || data?.text || this.newMessage,
          time: data?.created_at || data?.createdAt || new Date().toISOString(),
          avatar_url: pushedAvatar
        };
  // optimistic append then refresh messages+history from server
  // include parent_id for optimistic message when replying
  if (this.replyToId) pushed.parent_id = this.replyToId;
  this.messages.push(pushed);
        try { this._document.messages = this._document.messages || []; this._document.messages.push(data || pushed); } catch {}
        this.newMessage = '';
  // clear reply state after sending
  this.replyToId = null;
        // Refresh messages and history from server to ensure consistency
        if (this._document && this._document.id) {
          forkJoin([
            this.documentsService.getMessages(this._document.id),
            this.documentsService.getHistory(this._document.id)
          ]).subscribe({
            next: (vals: any[]) => {
              try {
                const msgs = vals[0]?.data ?? vals[0] ?? [];
                const hist = vals[1]?.data ?? vals[1] ?? [];
                this.messages = this.normalizeMessages(msgs);
                this.historyEntries = this.normalizeHistory(hist);
                try { this._document.messages = msgs; this._document.history = hist; } catch (e) {}
              } catch (e) {
                // ignore parsing errors, keep optimistic message
              }
              this.sending = false;
              this.cdr.markForCheck();
              this.scrollToBottom();
              try { this.messageService.add({ severity: 'success', summary: this.translate.instant('components.documents.messages.SAVED'), detail: this.translate.instant('components.documents.messages.SAVED') }); } catch (e) {}
            },
            error: (err: any) => {
              this.sending = false;
              this.cdr.markForCheck();
              this.scrollToBottom();
              try { this.messageService.add({ severity: 'warn', summary: this.translate.instant('components.documents.messages.SAVED'), detail: this.translate.instant('components.documents.messages.SAVED') }); } catch (e) {}
            }
          });
        } else {
          this.sending = false;
          this.cdr.markForCheck();
          this.scrollToBottom();
          try { this.messageService.add({ severity: 'success', summary: this.translate.instant('components.documents.messages.SAVED'), detail: this.translate.instant('components.documents.messages.SAVED') }); } catch (e) {}
        }
      },
      error: (err: any) => {
        this.sending = false;
        try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.documents.messages.ERROR'), detail: err?.message || this.translate.instant('components.documents.messages.ERROR') }); } catch (e) {}
      }
    });
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

  // Convert plain-text composer content into simple HTML-preserving formatting
  private formatMessageForSend(text: string): string {
    try {
      if (text === null || text === undefined) return '';
      return String(text).replace(/\r\n|\n/g, '<br/>');
    } catch (e) { return String(text ?? ''); }
  }

  formatMessageTime(msg: any): string { return this.formatMessageTimeInner(msg?.time ?? msg); }

  onComposerKeydown(ev: KeyboardEvent): void { if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') { ev.preventDefault(); if (this.newMessage?.trim() && !this.sending) this.send(); } }

  onTextareaInput(): void {
    try {
      const ta = this.textareaRef?.nativeElement;
      if (ta) {
        ta.style.height = 'auto';
        const max = 150; const newH = Math.min(max, ta.scrollHeight); ta.style.height = newH + 'px';
        ta.style.overflowY = ta.scrollHeight > max ? 'auto' : 'hidden';
      }
    } catch (e) {}
    setTimeout(() => this.scrollToBottom(), 0);
  }

  initials(name?: string): string {
    if (!name) return '';
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '';
    if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  /**
   * Shorten a full name into "Surname I.O." style.
   * Assumes the surname is the first token (common in our API),
   * then uses first letters of the next one or two name parts as initials.
   */
  private shortName(name?: string): string {
    if (!name) return '';
    const cleaned = String(name).replace(/,/g, ' ').trim();
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (!parts.length) return '';
    if (parts.length === 1) return parts[0];
    const surname = parts[0];
    const initials = parts.slice(1, 3).map(p => p && p[0] ? p[0].toUpperCase() + '.' : '').join('');
    return `${surname} ${initials}`.trim();
  }

  private scrollToBottom(): void {
    setTimeout(() => { const el = this.messagesContainer?.nativeElement; if (el) el.scrollTop = el.scrollHeight; }, 0);
  }
}
