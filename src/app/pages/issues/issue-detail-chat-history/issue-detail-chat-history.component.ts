import { Component, Input, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvatarModule } from 'primeng/avatar';
import { TranslateModule } from '@ngx-translate/core';
import { IssuesService } from '../../../services/issues.service';
import { AvatarService } from '../../../services/avatar.service';

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
  history: Array<{ author: string; text: string; time?: any; avatar_url?: string | null; user?: any }> = [];

  constructor(private issuesService: IssuesService, private cdr: ChangeDetectorRef, public avatarService: AvatarService) {}

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
          this.history = list.map((it: any) => {
            // Derive avatar_url following the same pattern as other components:
            // 1) user.avatar_url / avatar / avatarUrl  2) avatar_id → /api/storage/{id}/download  3) null (fallback to initials)
            let avatarUrl: string | null = null;
            const u = it.user ?? null;
            if (u && (u.avatar_url || u.avatar || u.avatarUrl)) {
              avatarUrl = u.avatar_url || u.avatar || u.avatarUrl || null;
            } else if (it.avatar_url || it.avatar) {
              avatarUrl = it.avatar_url || it.avatar || null;
            } else {
              const aid = u?.avatar_id ?? u?.avatarId ?? it.avatar_id ?? it.avatarId ?? null;
              try {
                if (aid !== null && (typeof aid === 'number' || (typeof aid === 'string' && String(aid).trim()))) {
                  avatarUrl = `/api/storage/${String(aid).trim()}/download`;
                }
              } catch (e) { avatarUrl = null; }
            }
            return {
              author: it.user_name || it.author_name || it.actor || (it.user?.name) || (it.user?.full_name) || 'System',
              text: it.description || it.changes || it.message || it.text || it.content || JSON.stringify(it),
              time: it.created_at || it.createdAt || it.created || it.timestamp || it.date || it.time || null,
              avatar_url: avatarUrl,
              user: u
            };
          });
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
