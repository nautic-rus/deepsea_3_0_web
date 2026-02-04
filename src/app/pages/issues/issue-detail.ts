import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ChipModule } from 'primeng/chip';
import { IssuesService } from './issues.service';
import { ToolbarModule } from 'primeng/toolbar';
import { IssueDetailChatComponent } from './issue-detail-chat/issue-detail-chat.component';
import { IssueDetailDescriptionComponent } from './issue-detail-description';
import { IssueDetailAttachComponent } from './issue-detail-attach';
import { IssueDetailRelationsComponent } from './issue-detail-relations';
import { IssueDetailRelationsTableComponent } from './issue-detail-relations-table';
import { SplitButtonModule } from 'primeng/splitbutton';
import { ToastModule } from 'primeng/toast';
import { MessageService, MenuItem } from 'primeng/api';
import { TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-issue-detail',
  standalone: true,
  providers: [MessageService],
  imports: [CommonModule, TranslateModule, RouterModule, ButtonModule, AvatarModule, TagModule, ProgressSpinnerModule, ChipModule, ToolbarModule, IssueDetailChatComponent, IssueDetailDescriptionComponent, IssueDetailAttachComponent, IssueDetailRelationsComponent, IssueDetailRelationsTableComponent, SplitButtonModule, ToastModule],
  templateUrl: './issue-detail.html',
  styleUrls: ['./issue-detail.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IssueDetailComponent implements OnInit {
  issue: any = null;
  loading = false;
  error: string | null = null;
  // keep flexible type because route params are strings but server may return numeric ids
  issueId: any = null;
  statusOptions: { label: string; value: any }[] = [];
  statusMenuItems: MenuItem[] = [];
  statusSaving = false;

  constructor(private route: ActivatedRoute, private router: Router, private issuesService: IssuesService, private http: HttpClient, private messageService: MessageService, private cdr: ChangeDetectorRef, private translate: TranslateService) {
    // read route param synchronously in constructor to avoid ExpressionChangedAfterItHasBeenCheckedError
    // normalize numeric ids so initial template value type matches the server-provided issue.id
    const idStr = this.route.snapshot.paramMap.get('id');
    if (idStr !== null) {
      const n = Number(idStr);
      this.issueId = Number.isFinite(n) ? n : idStr;
    } else {
      this.issueId = null;
    }
  }

  ngOnInit(): void {
    if (!this.issueId) {
      this.error = this.translate.instant('components.issues.errors.ISSUE_ID_MISSING');
      return;
    }
    this.loadIssue(this.issueId);
  }

  loadIssue(id: any): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.issuesService.getIssue(id).subscribe({
      next: (res: any) => {
        // server may return { data: { ... } } or the issue directly
        const data = (res && res.data) ? res.data : res;
        this.issue = data;
        this.loading = false;

        // Build status menu from issue.allowed_statuses if present.
        // expected shape: allowed_statuses: [{ id: 1, code: 'new', name: 'Новый' }, ...]
        const allowed = (this.issue && this.issue.allowed_statuses) ? this.issue.allowed_statuses : null;
        if (Array.isArray(allowed) && allowed.length) {
          // prefer numeric id for status value when available, fall back to code
          this.statusOptions = allowed.map((s: any) => ({ label: s.name || s.label || String(s.code), value: (s.id !== undefined && s.id !== null) ? s.id : s.code }));
          this.statusMenuItems = this.statusOptions.map(o => ({ label: o.label, command: () => this.changeStatus(o.value) }));
        } else {
          // allowed_statuses is empty — intentionally do not show any status change options
          this.statusOptions = [];
          this.statusMenuItems = [];
        }
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.error = (err && err.message) ? err.message : this.translate.instant('components.issues.errors.FAILED_LOAD');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadStatuses(): void {
    // load statuses from server to populate menu
    this.http.get('/api/issue_statuses').subscribe({
      next: (res: any) => {
        // expected res may be { data: [...] } or the array directly
        const list = (res && res.data) ? res.data : res;
        if (!Array.isArray(list)) {
          this.statusOptions = [];
          this.statusMenuItems = [];
          this.cdr.markForCheck();
          return;
        }
        this.statusOptions = list.map((s: any) => ({ label: s.name || s.label || String(s.id), value: s.id }));
        this.statusMenuItems = this.statusOptions.map(o => ({ label: o.label, command: () => this.changeStatus(o.value) }));
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        console.warn('Failed to load statuses', err);
        this.statusOptions = [];
        this.statusMenuItems = [];
        this.cdr.markForCheck();
      }
    });
  }

  changeStatus(statusId: any): void {
    if (!this.issue || !this.issue.id) return;
    this.statusSaving = true;
    this.cdr.markForCheck();
    this.issuesService.updateIssue(this.issue.id, { status_id: statusId }).subscribe({
      next: (_res: any) => {
        // After changing status, re-fetch the issue to get authoritative fields including allowed_statuses
        this.issuesService.getIssue(this.issue.id).subscribe({
          next: (fetchRes: any) => {
            const data = (fetchRes && fetchRes.data) ? fetchRes.data : fetchRes;
            this.issue = data;

            // rebuild statusOptions/statusMenuItems from issue.allowed_statuses
            const allowed = (this.issue && this.issue.allowed_statuses) ? this.issue.allowed_statuses : null;
            if (Array.isArray(allowed) && allowed.length) {
              this.statusOptions = allowed.map((s: any) => ({ label: s.name || s.label || String(s.code), value: (s.id !== undefined && s.id !== null) ? s.id : s.code }));
              this.statusMenuItems = this.statusOptions.map(o => ({ label: o.label, command: () => this.changeStatus(o.value) }));
            } else {
              this.statusOptions = [];
              this.statusMenuItems = [];
            }

            this.statusSaving = false;
            this.cdr.markForCheck();
            try { this.messageService.add({ severity: 'success', summary: this.translate.instant('components.issues.messages.SUCCESS'), detail: this.translate.instant('components.issues.messages.STATUS_UPDATED') }); } catch (e) {}
          },
          error: (fetchErr: any) => {
            console.warn('Failed to refresh issue after status change', fetchErr);
            this.statusSaving = false;
            this.cdr.markForCheck();
            try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.issues.messages.ERROR'), detail: this.translate.instant('components.issues.messages.STATUS_UPDATE_FAILED') }); } catch (e) {}
          }
        });
      },
      error: (err: any) => {
        this.statusSaving = false;
        this.cdr.markForCheck();
        try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.issues.messages.ERROR'), detail: (err && err.message) ? err.message : this.translate.instant('components.issues.messages.STATUS_UPDATE_FAILED') }); } catch (e) {}
      }
    });
  }

  back(): void {
    this.router.navigate(['/issues']);
  }

  assigneeInitials(): string {
    try {
      const name = (this.issue && (this.issue.assignee_name || this.issue.assignee || '')) || '';
      const parts = String(name).trim().split(/\s+/).filter(Boolean);
      if (!parts.length) return '';
      if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
      return (parts[0][0] + parts[1][0]).toUpperCase();
    } catch (e) {
      return '';
    }
  }

  personInitials(name?: string): string {
    try {
      const candidate = name || (this.issue && (this.issue.author_name || '')) || '';
      const parts = String(candidate).trim().split(/\s+/).filter(Boolean);
      if (!parts.length) return '';
      if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
      return (parts[0][0] + parts[1][0]).toUpperCase();
    } catch (e) {
      return '';
    }
  }
}
