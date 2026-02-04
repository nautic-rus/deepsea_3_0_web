import { Component, Input, inject, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EditorModule } from 'primeng/editor';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { IssuesService } from './issues.service';

@Component({
  selector: 'app-issue-detail-description',
  standalone: true,
  providers: [MessageService],
  imports: [CommonModule, FormsModule, EditorModule, MessageModule, ToastModule, ButtonModule,TranslateModule],
  styles: [
    // increase editor text size and improve readability
    `:host ::ng-deep .ql-editor { font-size: 1rem; line-height: 1.6; }
     :host .card-content { max-height: auto; overflow: auto; word-break: break-word; white-space: pre-wrap; }
     :host .card-content img { max-width: 100%; height: auto; display: block; }
     :host .card-content p { margin: 0 0 0.5rem 0; }
    `
  ],
  template: `
    <p-toast></p-toast>
    <div class="card">
        <div class="flex items-center justify-between mt-0 mb-2">
          <h4 class="mb-">{{ 'components.issues.detail.DESCRIPTION' | translate }}</h4>
          <p-button severity="secondary" icon="pi pi-pencil" class="mt-0" [outlined]="true" (click)="startEdit()" [style.visibility]="editing ? 'hidden' : 'visible'"></p-button>
        </div>

      <!-- View mode: show rendered description when not editing -->
      <div *ngIf="!editing" class="card-content">
        <div *ngIf="!descriptionEmpty()" class="text-surface-500" [innerHTML]="text"></div>
        <div *ngIf="descriptionEmpty()" class="text-surface-500">{{ 'components.issues.detail.NO_DESCRIPTIONS' | translate }}</div>
      </div>

      <!-- Edit mode: show editor inside a form -->
      <form *ngIf="editing" #exampleForm="ngForm" (ngSubmit)="onSubmit(exampleForm)" class="flex flex-col">
        <div class="flex flex-col gap-4">
          <p-editor #contentCtrl="ngModel" [(ngModel)]="text" name="content" required [style]="{ height: 'flex' }">
            <ng-template pTemplate="header">
              <span class="ql-formats">
                <button type="button" class="ql-bold" aria-label="Bold"></button>
                <button type="button" class="ql-italic" aria-label="Italic"></button>
                <button type="button" class="ql-underline" aria-label="Underline"></button>
                <button type="button" class="ql-strike" aria-label="Strike"></button>
              </span>
              <span class="ql-formats">
                <button type="button" class="ql-blockquote" aria-label="Block Quote"></button>
                <button type="button" class="ql-code-block" aria-label="Code Block"></button>
                <button type="button" class="ql-header" value="1" aria-label="Header 1"></button>
                <button type="button" class="ql-header" value="2" aria-label="Header 2"></button>
              </span>

              <span class="ql-formats">
                <button type="button" class="ql-color" aria-label="Text Color"></button>
                <button type="button" class="ql-background" aria-label="Background Color"></button>
              </span>

              <span class="ql-formats">
                <button type="button" class="ql-list" value="ordered" aria-label="Ordered List"></button>
                <button type="button" class="ql-list" value="bullet" aria-label="Bullet List"></button>
                <select class="ql-align">
                  <option selected></option>
                  <option value="center"></option>
                  <option value="right"></option>
                  <option value="justify"></option>
                </select>
              </span>

              <span class="ql-formats">
                <button type="button" class="ql-link" aria-label="Insert Link"></button>
                <button type="button" class="ql-image" aria-label="Insert Image"></button>
              </span>
            </ng-template>
          </p-editor>
        </div>

        <div class="flex gap-2 mt-4">
          <p-button severity="primary" type="submit">{{ 'MENU.SAVE' | translate }}</p-button>
          <p-button severity="secondary" (click)="cancel()">{{ 'MENU.CANCEL' | translate }}</p-button>
        </div>
      </form>
    </div>
  `
})
export class IssueDetailDescriptionComponent implements OnChanges {
  /** Optional input: if provided, we'll update issue.description on submit */
  @Input() issue: any | null = null;
  /** Emits the updated issue after successful save (local or server) */
  @Output() descriptionSaved = new EventEmitter<any>();

  messageService = inject(MessageService);
  issuesService = inject(IssuesService);
  translate = inject(TranslateService);
  text: string | undefined;
  editing = false;
  saving = false;

  onSubmit(form: any) {
    if (form && form.valid) {
      // If we have an issue with id, persist to server via PUT
      if (this.issue && this.issue.id) {
        this.saving = true;
        const payload = Object.assign({}, this.issue || {}, { description: this.text || '' });
        this.issuesService.updateIssue(this.issue.id, payload).subscribe({
          next: (res: any) => {
            const data = (res && res.data) ? res.data : res;
            this.issue = data || this.issue;
            this.text = this.issue.description || this.text;
            this.editing = false;
            // notify parent that the issue (and its description) was updated
            try { this.descriptionSaved.emit(this.issue); } catch (e) { /* ignore */ }
            this.saving = false;
            try { this.messageService.add({ severity: 'success', summary: this.translate.instant('components.issues.messages.SAVED') || 'Saved', detail: this.translate.instant('components.issues.messages.SAVED') || 'Description saved' }); } catch (e) { this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Description saved' }); }
            try { form.resetForm({ content: this.text || '' }); } catch (e) { /* ignore */ }
          },
          error: (err: any) => {
            this.saving = false;
            try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.issues.messages.ERROR') || 'Error', detail: (err && err.message) ? err.message : this.translate.instant('components.issues.messages.DESCRIPTION_SAVE_FAILED') || 'Failed to save description' }); } catch (e) { this.messageService.add({ severity: 'error', summary: 'Error', detail: (err && err.message) ? err.message : 'Failed to save description' }); }
          }
        });
        return;
      }

      // No server id — update locally
      if (this.issue) {
        this.issue.description = this.text || '';
      }
      // notify parent about local update as well
      try { this.descriptionSaved.emit(this.issue); } catch (e) { /* ignore */ }
  this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Form Submitted', life: 3000 });
  this.editing = false;
  try { form.resetForm({ content: this.text || '' }); } catch (e) { /* ignore */ }
    } else {
      try { form.control?.markAllAsTouched(); } catch (e) { /* ignore */ }
    }
  }

  startEdit(): void {
    this.editing = true;
  }

  cancel(): void {
    this.editing = false;
    this.text = this.issue && this.issue.description ? this.issue.description : '';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['issue']) {
      this.text = this.issue && this.issue.description ? this.issue.description : '';
    }
  }

  descriptionEmpty(): boolean {
    try {
      if (!this.text) return true;
      // strip HTML tags and whitespace (covers Quill empty: <p><br></p>)
      const stripped = this.text.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '');
      return stripped.trim().length === 0;
    } catch (e) {
      return !this.text;
    }
  }
}
