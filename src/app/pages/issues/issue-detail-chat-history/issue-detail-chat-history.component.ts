import { Component, Input, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvatarModule } from 'primeng/avatar';
import { TranslateModule } from '@ngx-translate/core';
import { IssuesService } from '../issues.service';

@Component({
  selector: 'app-issue-detail-chat-history',
  standalone: true,
  imports: [CommonModule, AvatarModule, TranslateModule],
  templateUrl: './issue-detail-chat-history.component.html',
  styleUrls: ['./issue-detail-chat-history.component.scss']
})
export class IssueDetailChatHistoryComponent implements OnChanges {
  @Input() issueId: any | null = null;

  loading = false;
  history: Array<{ author: string; text: string; time?: any }> = [];

  constructor(private issuesService: IssuesService, private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['issueId']) {
      this.loadHistory();
    }
  }

  private loadHistory(): void {
    if (!this.issueId) {
      this.history = [];
      return;
    }
    this.loading = true;
    this.issuesService.getHistory(this.issueId).subscribe({
      next: (res: any) => {
        const list = res?.data ?? res;
        if (Array.isArray(list) && list.length) {
          this.history = list.map((it: any) => ({
            author: it.user_name || it.author_name || it.actor || (it.user?.name) || 'System',
            text: it.description || it.changes || it.message || it.text || it.content || JSON.stringify(it),
            time: it.created_at || it.createdAt || it.created || it.timestamp || it.date || it.time || null
          }));
          // sort history by time ascending
          this.history.sort((a: any, b: any) => {
            const pa = a?.time ? Date.parse(a.time) : NaN;
            const pb = b?.time ? Date.parse(b.time) : NaN;
            if (isNaN(pa) && isNaN(pb)) return 0;
            if (isNaN(pa)) return -1;
            if (isNaN(pb)) return 1;
            return pa - pb;
          });
        } else {
          this.history = [];
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
