import { Component, Input, OnChanges, SimpleChanges, ChangeDetectorRef, ViewChild, ElementRef, AfterViewInit, inject } from '@angular/core';
import { forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AvatarModule } from 'primeng/avatar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IssuesService } from '../../../services/issues.service';
import { AvatarService } from '../../../services/avatar.service';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-issue-detail-chat',
  standalone: true,
  providers: [MessageService],
  imports: [CommonModule, FormsModule, ButtonModule, AvatarModule, TranslateModule, ToastModule, ProgressSpinnerModule],
  templateUrl: './issue-detail-chat.component.html',
  styleUrls: ['./issue-detail-chat.component.scss']
})
export class IssueDetailChatComponent implements OnChanges, AfterViewInit {
  private issuesService = inject(IssuesService);
  public avatarService = inject(AvatarService);
  private messageService = inject(MessageService);
  private translate = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);

  private _issue: any | null = null;
  @Input()
  set issue(v: any | null) { this._issue = v; this.processIssue(); }
  get issue(): any | null { return this._issue; }

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

  private processIssue(): void {
    if (!this._issue) { this.messages = []; return; }
    if (this._issue.id) {
      this.loadingMessages = true;

      if (this._issue.messages && Array.isArray(this._issue.messages)) {
        this.messages = this.normalizeMessages(this._issue.messages);
      }

      let pending = 2;
      const finish = () => {
        pending -= 1;
        if (pending <= 0) {
          this.loadingMessages = false;
          this.cdr.markForCheck();
          this.scrollToBottom();
        }
      };

      if (!(this._issue.messages && Array.isArray(this._issue.messages) && this._issue.messages.length)) {
        this.issuesService.getMessages(this._issue.id).subscribe({
          next: (res: any) => {
            const list = res?.data ?? res ?? [];
            this.messages = this.normalizeMessages(list);
            try { if (this._issue) this._issue.messages = list; } catch {}
            finish();
          },
          error: (_err: any) => { try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.issues.messages.ERROR'), detail: this.translate.instant('components.issues.messages.ERROR') }); } catch (e) {} finish(); }
        });
      } else { finish(); }

      this.issuesService.getHistory(this._issue.id).subscribe({
        next: (res: any) => { const list = res?.data ?? res ?? []; this.historyEntries = this.normalizeHistory(list); try { if (this._issue) this._issue.history = list; } catch {} finish(); },
        error: (_err: any) => { try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.issues.messages.ERROR'), detail: this.translate.instant('components.issues.messages.ERROR') }); } catch (e) {} finish(); }
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
        avatar_url: avatarUrl,
        user: it.user ?? null
      };
    });
  }

  private normalizeHistory(list: any[]): any[] {
    return (list || []).map((it: any) => {
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

  combinedItems() {
    const msgs = (this.messages || []).map(m => ({
      type: 'message', id: m.id ?? m._localId, actor: m.author || 'Unknown', action: this.translate.instant('components.issues.chat.SAID') || 'said', avatar_url: m.avatar_url || null, text: m.text || '', time: m.time || m.created_at || m.createdAt || null, raw: m
    }));

    const hist = (this.historyEntries || []).map(h => ({
      type: 'history', id: h.id ?? null, actor: h.user ? this.shortName(h.user?.full_name || h.user?.fullName || '') : (h.changed_by ? `#${h.changed_by}` : 'System'), action: this.translate.instant('components.issues.history.ACTION_CHANGED') || 'changed', field: this.getFieldLabel(h.field_name ?? ''), oldValue: this.formatValue(h.old_value), newValue: this.formatValue(h.new_value), text: '', avatar_url: h.avatar_url || h.user?.avatar_url || (h.user?.avatar_id ? `/api/storage/${String(h.user.avatar_id)}/download` : null) || null, time: h.time || null, raw: h
    }));

    const combined = msgs.concat(hist).sort((a, b) => {
      const ta = a.time ? new Date(a.time).getTime() : 0;
      const tb = b.time ? new Date(b.time).getTime() : 0;
      return ta - tb;
    });
    return combined;
  }

  grouped() {
    const items = this.combinedItems();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 1000 * 60 * 60 * 24;
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

  formatValue(raw: any): string {
    try {
      if (raw === null || raw === undefined) return '-';
      let v: any = raw;
      if (typeof v === 'string') { try { const parsed = JSON.parse(v); v = parsed; } catch (e) {} }
      if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)) { try { return new Date(v).toLocaleString(); } catch (e) { return String(v); } }
      if (typeof v === 'object') return JSON.stringify(v);
      return String(v);
    } catch (e) { return String(raw); }
  }

  getFieldLabel(key: any): string {
    try {
      if (!key && key !== 0) return '';
      const k = String(key);
  const trKey = `components.issues.history.FIELDS.${k}`;
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
  highlightedMessageId: string | null = null;

  answer(m: any): void {
    try {
      const idRaw = m?.id ?? m?._localId ?? m?.raw?.id ?? m?.parent_id ?? m?.parentId ?? null;
      this.replyToId = idRaw !== null && idRaw !== undefined ? String(idRaw) : null;
      try { this.replyToAuthor = m?.actor ?? m?.author ?? (m?.raw && (m.raw.author || m.raw.user?.full_name)) ?? null; } catch (_) { this.replyToAuthor = null; }
      this.cdr.markForCheck();
      try { const container = this.messagesContainer?.nativeElement; if (container) { container.classList.add('reply-flash'); setTimeout(() => container.classList.remove('reply-flash'), 600); } } catch (e) {}
      setTimeout(() => { try { this.onTextareaInput(); try { this.textareaRef?.nativeElement.focus(); } catch (e) {} } catch (e) {} this.scrollToBottom(); }, 0);
    } catch (e) { this.replyToId = null; this.replyToAuthor = null; }
  }

  cancelReply(): void { this.replyToId = null; this.replyToAuthor = null; }

  onAttachClick(): void { try { this.fileInput?.nativeElement.click(); } catch (e) {} }

  onFileSelected(ev: Event): void {
    try {
      const input = ev.target as HTMLInputElement;
      const files = input.files;
      if (files && files.length) {
        try { this.messageService.add({ severity: 'info', summary: 'Attachment', detail: `${files.length} file(s) selected` }); } catch (e) {}
      }
    } catch (e) { }
  }

  onMessageAvatarError(msg: any): void { try { if (msg) { msg.avatar_url = null; this.cdr.markForCheck(); } } catch (e) {} }

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
      } else { target.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      try { this.highlightedMessageId = idStr; this.cdr.markForCheck(); } catch (e) {}
      setTimeout(() => { try { this.highlightedMessageId = null; this.cdr.markForCheck(); } catch (e) {} }, 2200);
    } catch (e) {}
  }

  send(): void {
    if (!this.newMessage?.trim()) return;
    const formattedMessage = this.formatMessageForSend(this.newMessage);
    if (!this._issue || !this._issue.id) {
      this.messages.push({ _localId: `local-${Math.random().toString(36).slice(2,9)}`, author: 'You', text: formattedMessage, time: new Date().toISOString(), avatar_url: null });
      this.newMessage = '';
      this.scrollToBottom();
      return;
    }

    this.sending = true;
    const payload: any = { content: formattedMessage };
    if (this.replyToId) {
      const n = String(this.replyToId).trim();
      payload.parent_id = /^\d+$/.test(n) ? Number(n) : this.replyToId;
    }
    this.issuesService.postMessage(this._issue.id, payload).subscribe({
      next: (res: any) => {
        const data = res?.data ?? res;
        let pushedAvatar: string | null = null;
        try {
          if (data?.user && (data.user.avatar_url || data.user.avatar || data.user.avatarUrl)) pushedAvatar = data.user.avatar_url || data.user.avatar || data.user.avatarUrl || null;
          else if (data?.avatar_url || data?.avatar) pushedAvatar = data.avatar_url || data.avatar || null;
          else { const aid = data?.user?.avatar_id ?? data?.user?.avatarId ?? data?.avatar_id ?? data?.avatarId ?? null; if (aid !== null && aid !== undefined && (typeof aid === 'number' || (typeof aid === 'string' && String(aid).trim()))) pushedAvatar = `/api/storage/${String(aid).trim()}/download`; }
        } catch (e) { pushedAvatar = null; }

        const pushed = {
          id: data?.id || data?._id || data?.message_id || null,
          parent_id: data?.parent_id ?? data?.parentId ?? null,
          author: this.shortName(data?.user?.full_name || data?.user?.fullName || data?.author_name || data?.author || 'You'),
          text: data?.content || data?.message || data?.text || this.newMessage,
          time: data?.created_at || data?.createdAt || new Date().toISOString(),
          avatar_url: pushedAvatar,
          user: data?.user ?? null
        };
        if (this.replyToId) pushed.parent_id = this.replyToId;
        this.messages.push(pushed);
        try { this._issue.messages = this._issue.messages || []; this._issue.messages.push(data || pushed); } catch {}
        this.newMessage = '';
        this.replyToId = null;
        if (this._issue && this._issue.id) {
          forkJoin([ this.issuesService.getMessages(this._issue.id), this.issuesService.getHistory(this._issue.id) ]).subscribe({
            next: (vals: any[]) => {
              try {
                const msgs = vals[0]?.data ?? vals[0] ?? [];
                const hist = vals[1]?.data ?? vals[1] ?? [];
                this.messages = this.normalizeMessages(msgs);
                this.historyEntries = this.normalizeHistory(hist);
                try { this._issue.messages = msgs; this._issue.history = hist; } catch (e) {}
              } catch (e) {}
              this.sending = false; this.cdr.markForCheck(); this.scrollToBottom(); try { this.messageService.add({ severity: 'success', summary: this.translate.instant('components.issues.messages.SAVED'), detail: this.translate.instant('components.issues.messages.SAVED') }); } catch (e) {}
            },
            error: (err: any) => { this.sending = false; this.cdr.markForCheck(); this.scrollToBottom(); try { this.messageService.add({ severity: 'warn', summary: this.translate.instant('components.issues.messages.SAVED'), detail: this.translate.instant('components.issues.messages.SAVED') }); } catch (e) {} }
          });
  } else { this.sending = false; this.cdr.markForCheck(); this.scrollToBottom(); try { this.messageService.add({ severity: 'success', summary: this.translate.instant('components.issues.messages.SAVED'), detail: this.translate.instant('components.issues.messages.SAVED') }); } catch (e) {} }
      },
  error: (err: any) => { this.sending = false; try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.issues.messages.ERROR'), detail: err?.message || this.translate.instant('components.issues.messages.ERROR') }); } catch (e) {} }
    });
  }

  private formatMessageTimeInner(t: any): string {
    try { if (!t) return ''; const n = (typeof t === 'number') ? (t.toString().length === 10 ? t * 1000 : t) : Date.parse(t); if (!n || isNaN(n)) return ''; const d = new Date(n); return d.toLocaleString(); } catch (e) { return ''; }
  }

  private formatMessageForSend(text: string): string { try { if (text === null || text === undefined) return ''; return String(text).replace(/\r\n|\n/g, '<br/>'); } catch (e) { return String(text ?? ''); } }

  formatMessageTime(msg: any): string { return this.formatMessageTimeInner(msg?.time ?? msg); }

  onComposerKeydown(ev: KeyboardEvent): void { if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') { ev.preventDefault(); if (this.newMessage?.trim() && !this.sending) this.send(); } }

  onTextareaInput(): void { try { const ta = this.textareaRef?.nativeElement; if (ta) { ta.style.height = 'auto'; const max = 150; const newH = Math.min(max, ta.scrollHeight); ta.style.height = newH + 'px'; ta.style.overflowY = ta.scrollHeight > max ? 'auto' : 'hidden'; } } catch (e) {} setTimeout(() => this.scrollToBottom(), 0); }

  initials(name?: string): string { try { return this.avatarService.initialsFromName(name); } catch (e) { return ''; } }

  initialsFromName(name?: string | null): string { try { return this.avatarService.initialsFromName(name); } catch (e) { return ''; } }

  avatarColor(user?: any): string { try { return this.avatarService.issueAvatarColor(user); } catch (e) { return ''; } }

  avatarTextColor(user?: any): string { try { return this.avatarService.issueAvatarTextColor(user); } catch (e) { return '#fff'; } }

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

  private scrollToBottom(): void { setTimeout(() => { const el = this.messagesContainer?.nativeElement; if (el) el.scrollTop = el.scrollHeight; }, 0); }
}
