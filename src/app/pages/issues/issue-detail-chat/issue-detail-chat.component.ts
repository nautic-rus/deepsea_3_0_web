import { Component, Input, OnChanges, SimpleChanges, ChangeDetectorRef, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EditorModule } from 'primeng/editor';
import { IssuesService } from '../issues.service';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-issue-detail-chat',
  standalone: true,
  providers: [MessageService],
  imports: [CommonModule, FormsModule, ButtonModule, AvatarModule, TranslateModule, EditorModule, ToastModule],
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

  messages: Array<{ author: string; text: string }> = [];
  newMessage = '';
  sending = false;
  loadingMessages = false;

  // Editor height management
  editorHeight = 70;
  private readonly minEditorHeight = 70;
  private readonly maxEditorHeight = 150;

  @ViewChild('messagesContainer') messagesContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('pEditorEl', { read: ElementRef }) pEditorEl?: ElementRef;

  constructor(
    private issuesService: IssuesService,
    private messageService: MessageService,
    private translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) {}

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
        this.messages = rawMessages.map((it: any) => ({
          author: it.author_name || it.user_name || it.author || (it.user?.name) || this._issue?.author_name || 'Unknown',
          text: it.content || it.text || ''
        }));
        this.loadingMessages = false;
        this.cdr.detectChanges();
        this.scrollToBottom();
        this.fetchAndPrependHistory(this._issue.id);
        return;
      }
    }

    if (this._issue?.id) {
      this.loadingMessages = true;
      this.issuesService.getMessages(this._issue.id).subscribe({
        next: (res: any) => {
          const list = res?.data ?? res;
          if (Array.isArray(list)) {
            this.messages = list.map((it: any) => ({
              author: it.author_name || it.user_name || it.author || (it.user?.name) || this._issue?.author_name || 'Unknown',
              text: it.content || it.text || ''
            }));
            try { if (this._issue) this._issue.messages = list; } catch {}
          } else {
            this.messages = [];
          }
          this.fetchAndPrependHistory(this._issue.id);
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
      this.messages.push({ author: 'You', text: this.newMessage });
      this.resetEditor();
      this.scrollToBottom();
      return;
    }

    this.sending = true;
    this.issuesService.postMessage(this._issue.id, { content: this.newMessage }).subscribe({
      next: (res: any) => {
        const data = res?.data ?? res;
        const pushed = {
          author: data?.author_name || data?.author || 'You',
          text: data?.content || data?.message || data?.text || this.newMessage
        };
        this.messages.push(pushed);
        try { this._issue.messages = this._issue.messages || []; this._issue.messages.push(data || pushed); } catch {}
        this.resetEditor();
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

  onComposerKeydown(ev: KeyboardEvent): void {
    if ((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter') {
      ev.preventDefault();
      if (this.newMessage?.trim() && !this.sending) this.send();
    }
  }

  onEditorTextChange(): void {
    this.adjustEditorHeight();
  }

  adjustEditorHeight(): void {
    setTimeout(() => {
      const ql = this.pEditorEl?.nativeElement?.querySelector('.ql-editor') as HTMLElement | null;
      if (ql) {
        // Temporarily reset height to auto to get true content height
        const originalHeight = ql.style.height;
        ql.style.height = 'auto';
        const contentHeight = ql.scrollHeight;
        ql.style.height = originalHeight;
        
        const h = Math.max(this.minEditorHeight, Math.min(this.maxEditorHeight, contentHeight));
        if (h !== this.editorHeight) {
          this.editorHeight = h;
          this.cdr.detectChanges();
          this.scrollToBottom();
        }
      }
    }, 0);
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
    this.editorHeight = this.minEditorHeight;
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 0);
  }

  private fetchAndPrependHistory(issueId: any): void {
    if (!issueId) return;
    this.issuesService.getHistory(issueId).subscribe({
      next: (res: any) => {
        const list = res?.data ?? res;
        if (!Array.isArray(list) || !list.length) return;
        const mapped = list.map((it: any) => ({
          author: it.user_name || it.author_name || it.actor || (it.user?.name) || 'System',
          text: it.description || it.changes || it.message || it.text || it.content || JSON.stringify(it)
        }));
        this.messages = mapped.concat(this.messages || []);
        this.cdr.detectChanges();
        this.scrollToBottom();
      },
      error: () => {}
    });
  }
}
