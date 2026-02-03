import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { EditorModule } from 'primeng/editor';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { MessageService } from 'primeng/api';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { IssuesService } from './issues.service';
import { TextareaModule } from 'primeng/textarea';

@Component({
  selector: 'app-issue-detail-description',
  standalone: true,
  providers: [MessageService],
  imports: [CommonModule, TranslateModule, FormsModule, EditorModule, InputTextModule, ToastModule, ButtonModule, MessageModule, TextareaModule],
  template: `
    <section class="admin-subpage-description card ">
      <p-toast position="top-right" appendTo="body"></p-toast>
      <h4 class="mb-3">{{ 'components.issues.detail.DESCRIPTION' | translate }}</h4>
      <div class="prose max-w-full text-surface-900 dark:text-surface-0">
        <div *ngIf="!editing">
          <textarea class="p-inputtextarea w-full p-3"  [value]="plainText || ''" placeholder="-" readonly (click)="startEdit()" ></textarea>
        </div>

        <div *ngIf="editing">
          <form #descForm="ngForm" (ngSubmit)="onSubmit(descForm)" class="flex flex-col gap-2">
            <div class="flex flex-col gap-1">
              <p-editor #contentCtrl="ngModel" [(ngModel)]="content" name="content" required [style]="{height: '150px'}"></p-editor>
              <p-message *ngIf="contentCtrl.invalid && (contentCtrl.touched || descForm.submitted)" severity="error" size="small" variant="simple">{{ 'components.issues.detail.DESCRIPTION_REQUIRED' | translate }}</p-message>
            </div>

            <div class="flex gap-2 mt-2">
              <button pButton severity="primary" type="submit" class="p-button">{{ 'MENU.SAVE' | translate }}</button>
              <button pButton type="button" (click)="cancel()" [disabled]="saving" class="p-button p-button-text p-button-secondary">{{ 'MENU.CANCEL' | translate }}</button>
            </div>
          </form>
        </div>
      </div>
    </section>
  `
})
export class IssueDetailDescriptionComponent {
  @Input() issue: any | null = null;
  content = '';
  editing = false;
  sanitizedContent: SafeHtml | null = null;
  plainText = '';
  saving = false;

  constructor(private sanitizer: DomSanitizer, private issuesService: IssuesService, private messageService: MessageService, private translate: TranslateService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['issue']) {
      this.content = this.issue && this.issue.description ? this.issue.description : '';
      this.sanitizedContent = this.sanitizer.bypassSecurityTrustHtml(this.content || '');
      this.plainText = this.decodeHtmlEntities(this.stripHtml(this.content || ''));
    }
  }

  startEdit(): void {
    this.editing = true;
  }

  onSubmit(form: any): void {
    // template-driven form submit handler — call save if valid
    if (form && form.valid) {
      this.save();
    } else {
      // mark as touched so validation messages show
      try { form.control?.markAllAsTouched(); } catch (e) {}
    }
  }

  save(): void {
    if (!this.issue || !this.issue.id) {
      // no issue id — fallback to local update
      if (this.issue) this.issue.description = this.content;
      this.sanitizedContent = this.sanitizer.bypassSecurityTrustHtml(this.content || '');
      this.plainText = this.decodeHtmlEntities(this.stripHtml(this.content || ''));
      this.editing = false;
        try { this.messageService.add({ severity: 'success', summary: this.translate.instant('components.issues.messages.SAVED'), detail: this.translate.instant('components.issues.messages.SAVED_LOCAL') }); } catch (e) {}
      return;
    }

    this.saving = true;
    // debug log: start saving
    console.debug('[IssueDetailDescription] save() start', { id: this.issue?.id, content: this.content });
    // send full issue object via PUT to /api/issues/{id} so server receives complete resource
    const payload = Object.assign({}, this.issue || {}, { description: this.content });
    console.debug('[IssueDetailDescription] PUT payload', payload);
    this.issuesService.updateIssue(this.issue.id, payload).subscribe({
      next: (res: any) => {
        console.debug('[IssueDetailDescription] PUT success', res);
        // update local model from server response if provided
        const data = (res && res.data) ? res.data : res;
        this.issue = data || this.issue;
        // ensure description reflects saved content
        this.issue.description = (this.issue.description !== undefined && this.issue.description !== null) ? this.issue.description : this.content;
        this.sanitizedContent = this.sanitizer.bypassSecurityTrustHtml(this.issue.description || '');
        this.plainText = this.decodeHtmlEntities(this.stripHtml(this.issue.description || ''));
        this.editing = false;
        this.saving = false;
        try { this.messageService.add({ severity: 'success', summary: this.translate.instant('components.issues.messages.SAVED'), detail: this.translate.instant('components.issues.messages.SAVED') }); } catch (e) {}
      },
      error: (err: any) => {
        console.error('[IssueDetailDescription] PUT error', err);
        this.saving = false;
        try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.issues.messages.ERROR'), detail: (err && err.message) ? err.message : this.translate.instant('components.issues.messages.DESCRIPTION_SAVE_FAILED') }); } catch (e) {}
      }
    });
  }

  cancel(): void {
    // revert local content to issue description
    this.content = this.issue && this.issue.description ? this.issue.description : '';
    this.editing = false;
  }

  private stripHtml(html: string): string {
    return html ? html.replace(/<[^>]*>/g, '').trim() : '';
  }

  private decodeHtmlEntities(text: string): string {
    if (!text) return '';
    try {
      if (typeof document !== 'undefined') {
        const txt = document.createElement('textarea');
        txt.innerHTML = text;
        return (txt.value || txt.textContent || '').replace(/\u00A0/g, ' ').trim();
      }
    } catch (e) {
      // fallback simple replacements for common entities
      return text.replace(/&nbsp;?/g, ' ').replace(/&amp;?/g, '&').replace(/&lt;?/g, '<').replace(/&gt;?/g, '>').trim();
    }
    return text.replace(/&nbsp;?/g, ' ').trim();
  }
}
