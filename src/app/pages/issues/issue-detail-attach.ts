import { Component, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileUploadModule } from 'primeng/fileupload';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';

interface UploadEvent {
  originalEvent: any;
  files: any[];
}

@Component({
  selector: 'app-issue-detail-attach',
  standalone: true,
  imports: [CommonModule, FileUploadModule, ToastModule, TranslateModule, ButtonModule],
  providers: [MessageService],
  template: `
    <section class="admin-subpage-attachments card ">
      <div class="flex items-center justify-between mt-0 mb-2">
          <h4 class="mb-">{{ 'components.issues.detail.DESCRIPTION' | translate }}</h4>
          <p-button severity="secondary" icon="pi pi-plus" class="mt-0" [outlined]="true" ></p-button>
        </div>
      <p-toast></p-toast>

      <div *ngIf="!attachments || !attachments.length" class="text-surface-500">{{ '-' }}</div>

      <ul *ngIf="attachments && attachments.length" class="list-disc pl-5">
        <li *ngFor="let a of attachments">{{ a.name }} <span class="text-sm text-surface-500">({{ a.size | number }} bytes)</span></li>
      </ul>

      <div class="mt-3">
        <p-fileupload name="files[]" (onUpload)="onUpload($event)" [multiple]="true" accept="*/*" mode="advanced">
      <ng-template #empty>
        <div>{{ 'components.issues.attach.DRAG_DROP' | translate }}</div>
      </ng-template>
        </p-fileupload>
      </div>
    </section>
  `
})
export class IssueDetailAttachComponent implements OnChanges {
  @Input() issue: any | null = null;
  attachments: Array<{ name: string; size: number }> = [];

  private messageService = inject(MessageService);
  private translate = inject(TranslateService);
  uploadedFiles: any[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['issue']) {
      this.attachments = (this.issue && Array.isArray(this.issue.attachments)) ? [...this.issue.attachments] : [];
    }
  }

  onUpload(ev: UploadEvent): void {
    try {
      const files = ev && ev.files ? ev.files : [];
      for (const f of files) {
        this.uploadedFiles.push(f);
        this.attachments.push({ name: f.name, size: f.size });
      }
      if (this.issue) {
        this.issue.attachments = this.attachments;
      }
  try { this.messageService.add({ severity: 'success', summary: this.translate.instant('components.issues.messages.UPLOADED'), detail: this.translate.instant('components.issues.messages.UPLOADED_COUNT', { count: files.length }) }); } catch (e) {}
    } catch (e) {
      console.warn('upload error', e);
  try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.issues.messages.ERROR'), detail: this.translate.instant('components.issues.messages.UPLOAD_FAILED') }); } catch (e) {}
    }
  }
}
