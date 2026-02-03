import { Component, Input, OnChanges, SimpleChanges, ChangeDetectorRef, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { AvatarModule } from 'primeng/avatar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IssuesService } from '../issues.service';
import { IssueDetailChatHistoryComponent } from '../issue-detail-chat-history/issue-detail-chat-history.component';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { Accordion } from "primeng/accordion";

@Component({
  selector: 'app-issue-detail-chat',
  standalone: true,
  providers: [MessageService],
  imports: [CommonModule, FormsModule, ButtonModule, AvatarModule, TranslateModule, ToastModule, ProgressSpinnerModule, IssueDetailChatHistoryComponent, Accordion],
  templateUrl: './issue-detail-chat.component.html',
  styleUrls: ['./issue-detail-chat.component.scss']
})
export class IssueDetailChatComponent implements OnChanges, AfterViewInit {
  private _issue: any | null = null;

  @Input()
  set issue(value: any | null) {
    this._issue = value;
    this.processIssue();
  }
  get issue(): any | null {
    return this._issue;
  }

  messages: Array<{ id?: any; _localId?: string; parent_id?: any; author: string; text: string; time?: any }> = [];
  // currently selected message id to reply to
  replyToId: any = null;
  // messages may include `time` (ISO string / timestamp) when available
  
  newMessage = '';
  sending = false;
  loadingMessages = false;
  @ViewChild('messagesContainer') messagesContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
  @ViewChild('textareaRef') textareaRef?: ElementRef<HTMLTextAreaElement>;

  constructor(
    private issuesService: IssuesService,
    private messageService: MessageService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {}

  private currentUserName(): string | null {
    try {
      const raw = sessionStorage.getItem('currentUser');
      if (!raw) return null;
      const u = JSON.parse(raw);
      if (!u) return null;
      return u.name || u.user_name || u.username || (u.first_name ? `${u.first_name}${u.last_name ? ' ' + u.last_name : ''}` : null) || null;
    } catch (e) {
      return null;
    }
  }

  ngAfterViewInit(): void {
    if (this.messages?.length) this.scrollToBottom();
  }

  ngOnChanges(_changes: SimpleChanges): void {
    // Handled by setter
  }

  private processIssue(): void {
    if (this._issue?.messages) {
      let rawMessages: any[] = [];
      if (Array.isArray(this._issue.messages)) {
        rawMessages = this._issue.messages;
      } else if (this._issue.messages.data && Array.isArray(this._issue.messages.data)) {
        rawMessages = this._issue.messages.data;
      }

      if (rawMessages.length > 0) {
        this.messages = rawMessages.map((it: any) => {
          const id = it.id || it._id || it.message_id || it.uuid || null;
          return {
            id,
            _localId: id ? undefined : `local-${Math.random().toString(36).slice(2,9)}`,
            parent_id: it.parent_id || it.parentId || null,
            author: it.author_name || it.user_name || it.author || (it.user?.name) || this._issue?.author_name || 'Unknown',
            text: it.content || it.text || '',
            time: it.created_at || it.createdAt || it.created || it.timestamp || it.date || it.time || null
          };
        });
        this.loadingMessages = false;
        this.sortMessagesByTime();
    this.cdr.detectChanges();
    this.scrollToBottom();
    return;
      }
    }

    if (this._issue?.id) {
      this.loadingMessages = true;
      this.issuesService.getMessages(this._issue.id).subscribe({
        next: (res: any) => {
          const list = res?.data ?? res;
          if (Array.isArray(list)) {
            this.messages = list.map((it: any) => {
              const id = it.id || it._id || it.message_id || it.uuid || null;
              return {
                id,
                _localId: id ? undefined : `local-${Math.random().toString(36).slice(2,9)}`,
                parent_id: it.parent_id || it.parentId || null,
                author: it.author_name || it.user_name || it.author || (it.user?.name) || this._issue?.author_name || 'Unknown',
                text: it.content || it.text || '',
                time: it.created_at || it.createdAt || it.created || it.timestamp || it.date || it.time || null
              };
            });
            this.sortMessagesByTime();
            try { if (this._issue) this._issue.messages = list; } catch {}
          } else {
            this.messages = [];
          }
          this.loadingMessages = false;
          this.cdr.detectChanges();
          this.scrollToBottom();
        },
        error: (err: any) => {
          this.loadingMessages = false;
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('components.issues.messages.ERROR'),
            detail: err?.message || this.translate.instant('components.issues.messages.FAILED_LOAD')
          });
        }
      });
      return;
    }

    this.messages = [];
  }

  send(): void {
    if (!this.newMessage?.trim()) return;

    if (!this._issue?.id) {
      this.messages.push({ id: null, _localId: `local-${Math.random().toString(36).slice(2,9)}`, parent_id: this.replyToId ?? null, author: (this.currentUserName() || ''), text: this.newMessage, time: new Date().toISOString() });
      // keep reply state until send completes
      this.sortMessagesByTime();
      this.resetEditor();
      this.scrollToBottom();
      return;
    }

    this.sending = true;
    const payload: any = { content: this.newMessage };
    if (this.replyToId) payload.parent_id = this.replyToId;

    this.issuesService.postMessage(this._issue.id, payload).subscribe({
      next: (res: any) => {
        const data = res?.data ?? res;
        const pushed = {
          id: data?.id || data?._id || data?.message_id || null,
          parent_id: data?.parent_id ?? data?.parentId ?? (this.replyToId ?? null),
          author: data?.author_name || data?.author || this.currentUserName() || '',
          text: data?.content || data?.message || data?.text || this.newMessage,
          time: data?.created_at || data?.createdAt || new Date().toISOString()
        };
  this.messages.push(pushed);
  this.sortMessagesByTime();
        try { this._issue.messages = this._issue.messages || []; this._issue.messages.push(data || pushed); } catch {}
        this.resetEditor();
        this.replyToId = null;
        this.sending = false;
        this.cdr.detectChanges();
        this.scrollToBottom();
        this.messageService.add({
          severity: 'success',
          summary: this.translate.instant('components.issues.messages.SUCCESS'),
          detail: this.translate.instant('components.issues.messages.SAVED')
        });
      },
      error: (err: any) => {
        this.sending = false;
        this.messageService.add({
          severity: 'error',
          summary: this.translate.instant('components.issues.messages.ERROR'),
          detail: err?.message || this.translate.instant('components.issues.messages.DESCRIPTION_SAVE_FAILED')
        });
      }
    });
  }

  private parseTimeToMs(t: any): number | null {
    if (t == null) return null;
    try {
      if (typeof t === 'number') {
        return t.toString().length === 10 ? t * 1000 : t;
      }
      const n = Date.parse(t);
      return isNaN(n) ? null : n;
    } catch (e) {
      return null;
    }
  }

  private sortMessagesByTime(): void {
    try {
      this.messages.sort((a: any, b: any) => {
        const ta = this.parseTimeToMs(a?.time);
        const tb = this.parseTimeToMs(b?.time);
        if (ta == null && tb == null) return 0;
        if (ta == null) return -1;
        if (tb == null) return 1;
        return ta - tb;
      });
    } catch (e) {}
  }

  onComposerKeydown(ev: KeyboardEvent): void {
    if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') {
      ev.preventDefault();
      if (this.newMessage?.trim() && !this.sending) this.send();
    }
  }
  onTextareaInput(): void {
    // manual auto-resize: set height to auto then to scrollHeight, cap at max
    try {
      const ta = this.textareaRef?.nativeElement;
      if (ta) {
        ta.style.height = 'auto';
        const max = 150; // px, matches previous limits
        const newH = Math.min(max, ta.scrollHeight);
        ta.style.height = newH + 'px';
        ta.style.overflowY = ta.scrollHeight > max ? 'auto' : 'hidden';
      }
    } catch (e) {}
    // keep messages scrolled to bottom after resize
    setTimeout(() => this.scrollToBottom(), 0);
  }

  onAttachClick(): void {
    try { this.fileInput?.nativeElement.click(); } catch (e) {}
  }

  onFileSelected(ev: Event): void {
    try {
      const input = ev.target as HTMLInputElement;
      const files = input.files;
      if (files && files.length) {
        // TODO: implement upload logic. For now, just log and add a placeholder message
        console.debug('[IssueDetailChat] selected files', files);
        this.messageService.add({ severity: 'info', summary: 'Attachment', detail: `${files.length} file(s) selected` });
      }
    } catch (e) { console.error(e); }
  }

  insertEmoji(emoji = '😊'): void {
    try {
      this.newMessage = (this.newMessage || '') + emoji;
      setTimeout(() => {
        this.onTextareaInput();
        try { this.textareaRef?.nativeElement.focus(); } catch (e) {}
      }, 0);
    } catch (e) {}
  }

  initials(name?: string): string {
    if (!name) return '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  private resetEditor(): void {
    this.newMessage = '';
    try {
      const ta = this.textareaRef?.nativeElement;
      if (ta) {
        ta.style.height = 'auto';
        ta.style.overflowY = 'hidden';
      }
    } catch (e) {}
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 0);
  }

  scrollToMessage(targetId: any): void {
    try {
      if (!targetId) return;
      const idStr = String(targetId);
      const selector = '#msg-' + idStr;
      const container: HTMLElement | undefined = this.messagesContainer?.nativeElement;
      // try querying inside the container first
      let target: HTMLElement | null = null;
      if (container) {
        target = container.querySelector(selector) as HTMLElement | null;
      }
      // fallback to global query
      if (!target) target = document.querySelector(selector) as HTMLElement | null;
      if (!target) return;
      // compute scroll within container
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const offset = targetRect.top - containerRect.top - container.clientHeight / 2 + targetRect.height / 2;
        container.scrollTo({ top: container.scrollTop + offset, behavior: 'smooth' });
      } else {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      // highlight target briefly
      target.classList.add('message-highlight');
      setTimeout(() => target.classList.remove('message-highlight'), 2200);
    } catch (e) {}
  }

  formatMessageTime(msg: any): string {
    try {
      const t = msg?.time ?? msg?.created_at ?? msg?.createdAt ?? msg?.created ?? msg?.timestamp ?? msg?.date ?? msg?.time;
      if (!t) return '';
      let d: Date;
      if (typeof t === 'number') {
        // seconds vs ms: assume seconds if 10-digit
        d = new Date(t.toString().length === 10 ? t * 1000 : t);
      } else {
        d = new Date(t);
      }
      if (isNaN(d.getTime())) return '';
      const locale = (this.translate && (this.translate.currentLang as string)) || undefined;
      return new Intl.DateTimeFormat(locale || undefined, { dateStyle: 'short', timeStyle: 'short' }).format(d);
    } catch (e) {
      return '';
    }
  }

  answer(msg: any): void {
    try {
      // store id of message we're replying to so UI shows replying bar and payload includes parent_id
      this.replyToId = msg?.id ?? msg?._id ?? msg?.message_id ?? msg?.uuid ?? null;
      const name = msg?.author || '';
      // Prefill composer with a mention of the author
      this.newMessage = name ? `@${name} ` : '';
      // ensure textarea resizes and receives focus
      setTimeout(() => {
        this.onTextareaInput();
        try { this.textareaRef?.nativeElement.focus(); } catch (e) {}
      }, 0);
    } catch (e) {}
  }

  cancelReply(): void {
    this.replyToId = null;
  }

  // History fetching moved to `IssueDetailChatHistoryComponent`.
}
