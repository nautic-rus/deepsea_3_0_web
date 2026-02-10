import { Component, Input, OnChanges, SimpleChanges, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileUploadModule, FileUpload } from 'primeng/fileupload';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpEventType } from '@angular/common/http';
import { FileService } from '../../services/file.service';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';

interface UploadEvent {
  originalEvent?: any;
  files?: any[];
}

@Component({
  selector: 'app-issue-detail-attach',
  standalone: true,
  imports: [CommonModule, FileUploadModule, ToastModule, TranslateModule, ButtonModule, TableModule],
  providers: [MessageService],
  template: `
    <section class="admin-subpage-attachments card ">
      <div class="flex items-center justify-between mt-0 mb-2">
          <h4 class="mb-">{{ 'components.issues.detail.ATTACHE' | translate }}</h4>
        </div>
      <p-toast></p-toast>

      <div *ngIf="!attachments || !attachments.length" class="text-surface-500">{{ 'components.issues.attach.NO_ATTACHMENTS' | translate }}</div>

      <p-table *ngIf="attachments && attachments.length" [value]="attachments" class="w-full" size="small">
        <ng-template pTemplate="header">
          <tr>
            <th>{{ 'components.issues.attach.COLUMN_NAME' | translate }}</th>
            <th>{{ 'components.issues.attach.COLUMN_SIZE' | translate }}</th>
            <th>{{ 'components.issues.attach.COLUMN_UPLOADED' | translate }}</th>
            <th></th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-a>
          <tr>
            <td>
              <a *ngIf="a.url" [href]="a.url" target="_blank" rel="noopener" class="text-blue-600 dark:text-blue-400 hover:underline">{{ a.name }}</a>
              <span *ngIf="!a.url">{{ a.name }}</span>
            </td>
            <td>
              <span class="text-sm text-surface-500">{{ a.size ? (a.size | number) + ' bytes' : '-' }}</span>
            </td>
            <td>
              <span class="text-sm text-surface-500">{{ (a.created_at || a.createdAt) ? ((a.created_at || a.createdAt) | date:'short') : '-' }}</span>
            </td>
            <td class="text-right">
              <p-button icon="pi pi-download" class="mr-2" (click)="downloadFile(a)"></p-button>
              <p-button icon="pi pi-trash" severity="danger" (click)="removeFile(a)"></p-button>
            </td>
          </tr>
        </ng-template>
      </p-table>

      <div class="mt-3">
        
  <p-fileupload #fileUpload name="files[]" (uploadHandler)="onUpload($event)" (onSelect)="onSelect($event)" [multiple]="true" [maxFileSize]="maxFileSize" [customUpload]="true" mode="advanced"
          [chooseLabel]="'components.issues.attach.CHOOSE' | translate"
          [uploadLabel]="'components.issues.attach.UPLOAD' | translate"
          [cancelLabel]="'components.issues.attach.CANCEL' | translate">
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
  attachments: Array<{ name: string; size: number; id?: any; url?: string; created_at?: string | null }> = [];

  @ViewChild('fileUpload') fileUpload?: FileUpload;

  private messageService = inject(MessageService);
  private translate = inject(TranslateService);
  private fileService = inject(FileService);
  uploadedFiles: any[] = [];
  // 100 MB limit
  maxFileSize = 100 * 1024 * 1024;

  // loader / active uploads counter
  isLoading = false;
  private activeUploads = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['issue']) {
      this.attachments = (this.issue && Array.isArray(this.issue.attachments)) ? [...this.issue.attachments] : [];
      // if issue has an id, load authoritative file list from server
      const issueId = this.issue && (this.issue.id ?? this.issue._id ?? this.issue.issue_id) ? (this.issue.id ?? this.issue._id ?? this.issue.issue_id) : null;
      if (issueId) {
        this.fetchIssueFiles(issueId);
      }
    }
  }

  /** Fetch attached files for the given issue from server and normalize into attachments[] */
  fetchIssueFiles(issueId: any): void {
    if (!issueId) return;
    try {
      this.isLoading = true;
      this.fileService.getIssueFiles(issueId).subscribe({
        next: (list: any[]) => {
          this.attachments = list || [];
          if (this.issue) this.issue.attachments = this.attachments;
          this.isLoading = false;
        },
        error: (err: any) => { console.warn('Failed to fetch issue files', err); this.isLoading = false; }
      });
    } catch (e) { console.warn('error fetching issue files', e); this.isLoading = false; }
  }

  onUpload(ev: UploadEvent): void {
    try {
      console.debug('onUpload received event', ev);
      const files = ev && ev.files ? ev.files : (ev && (ev as any).files ? (ev as any).files : []);
      // filter out files larger than allowed max
  const allowed = (files || []).filter((f: any) => !f.size || f.size <= this.maxFileSize);
  const rejected = (files || []).filter((f: any) => f.size && f.size > this.maxFileSize);

      // upload allowed files to server
      for (const f of allowed) {
        this.uploadedFiles.push(f);
        try {
          console.debug('Starting upload for file', f && f.name, f);
          // mark active upload
          this.activeUploads++;
          this.isLoading = true;

          this.fileService.uploadFile(f).subscribe({
            next: (event: any) => {
              try {
                console.debug('storage upload event', event && event.type, event);
                if (event && event.type === HttpEventType.UploadProgress) {
                  const loaded = event.loaded || 0;
                  const total = event.total || 0;
                  const pct = total ? Math.round(100 * loaded / total) : null;
                  console.debug(`upload progress for ${f && f.name}: ${loaded}/${total}`, pct != null ? pct + '%' : '');
                } else if (event && event.type === HttpEventType.Response) {
                  const body = event.body || {};
                  console.debug('storage upload response body', body);
                  const storage = (body && body.data) ? body.data : body || {};
                  console.debug('normalized storage ref', storage);
                  const objectKey: string | undefined = storage.object_key || storage.objectKey || undefined;
                  let name = storage.filename || storage.filename_original || f.name;
                  if ((!name || name === f.name) && objectKey) {
                    const parts = objectKey.split('/');
                    name = parts.length ? parts[parts.length - 1] : objectKey;
                  }
                  const size = (storage.size != null) ? storage.size : f.size;
                  const id = storage.id ?? storage.storage_id ?? storage.file_id ?? null;
                  const url = id ? this.fileService.downloadUrlForId(id) : (storage.url ?? storage.download_url ?? storage.path ?? null);

                  // add storage ref to attachments locally
                  this.attachments.push({ name, size, id, url });
                  if (this.issue) this.issue.attachments = this.attachments;

                  const issueId = this.issue && (this.issue.id ?? this.issue._id ?? this.issue.issue_id) ? (this.issue.id ?? this.issue._id ?? this.issue.issue_id) : null;
                  if (issueId && id != null) {
                    console.debug('Attaching storage item to issue', { issueId, storage_id: id });
                    this.fileService.attachToIssue(issueId, id).subscribe({
                      next: (attachRes: any) => {
                        console.debug('attach to issue response', attachRes);
                        try { this.fetchIssueFiles(issueId); } catch (e) {}
                        try { this.messageService.add({ severity: 'success', summary: this.translate.instant('components.issues.messages.UPLOADED'), detail: this.translate.instant('components.issues.messages.UPLOADED_COUNT', { count: 1 }) }); } catch (e) {}
                      },
                      error: (err: any) => {
                        console.warn('attach to issue failed', err);
                        try { this.messageService.add({ severity: 'warn', summary: this.translate.instant('components.issues.messages.WARNING'), detail: this.translate.instant('components.issues.messages.UPLOAD_FAILED') + (name ? (': ' + name) : '') }); } catch (e) {}
                      }
                    });
                  } else {
                    try { this.messageService.add({ severity: 'info', summary: this.translate.instant('components.issues.messages.SUCCESS'), detail: this.translate.instant('components.issues.messages.SAVED_LOCAL') || 'Saved locally (no id)' }); } catch (e) {}
                  }

                  // upload finished for this file
                  this.activeUploads = Math.max(0, this.activeUploads - 1);
                  if (this.activeUploads === 0) {
                    this.isLoading = false;
                    try { this.fileUpload?.clear(); } catch (e) {}
                  }
                }
              } catch (e) { console.warn('error in storage upload event handler', e); }
            },
            error: (err: any) => {
              console.warn('file upload failed', err);
              try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.issues.messages.ERROR'), detail: this.translate.instant('components.issues.messages.UPLOAD_FAILED') + (f && f.name ? (': ' + f.name) : '') }); } catch (e) {}
              this.activeUploads = Math.max(0, this.activeUploads - 1);
              if (this.activeUploads === 0) {
                this.isLoading = false;
                try { this.fileUpload?.clear(); } catch (e) {}
              }
            }
          });
        } catch (e) {
          console.warn('upload error', e);
        }
      }

      if (rejected.length) {
        try {
          const names = rejected.map((r: any) => r.name).join(', ');
          this.messageService.add({ severity: 'error', summary: this.translate.instant('components.issues.messages.ERROR'), detail: this.translate.instant('components.issues.messages.FILE_TOO_LARGE') + `: ${names}` });
        } catch (e) {}
      }
    } catch (e) {
      console.warn('upload error', e);
  try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.issues.messages.ERROR'), detail: this.translate.instant('components.issues.messages.UPLOAD_FAILED') }); } catch (e) {}
    }
  }

  onSelect(ev: UploadEvent): void {
    try {
      const files = ev && ev.files ? ev.files : [];
      const rejected = files.filter(f => f.size && f.size > this.maxFileSize);
      if (rejected.length) {
        const names = rejected.map(r => r.name).join(', ');
        try { this.messageService.add({ severity: 'warn', summary: this.translate.instant('components.issues.messages.WARNING'), detail: this.translate.instant('components.issues.messages.FILE_TOO_LARGE') + `: ${names}` }); } catch (e) {}
      }
    } catch (e) {
      // ignore
    }
  }

  // helper to format bytes if needed elsewhere
  formatBytes(bytes: number): string {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }

  removeFile(file: any): void {
    try {
      if (!file) return;
      const storageId = file.id ?? file.storage_id ?? null;
      const issueId = this.issue && (this.issue.id ?? this.issue._id ?? this.issue.issue_id) ? (this.issue.id ?? this.issue._id ?? this.issue.issue_id) : null;
      if (!storageId || !issueId) {
        // cannot remove server-side; just remove locally
        this.attachments = (this.attachments || []).filter(a => a !== file && a.id !== storageId);
        if (this.issue) this.issue.attachments = this.attachments;
        return;
      }
      if (!confirm(this.translate.instant('components.issues.attach.DELETE_CONFIRM') || 'Delete this file?')) return;
      this.isLoading = true;
      this.fileService.deleteIssueFile(issueId, storageId).subscribe({
        next: () => {
          try {
            this.fetchIssueFiles(issueId);
            try { this.messageService.add({ severity: 'success', summary: this.translate.instant('components.issues.messages.SUCCESS'), detail: this.translate.instant('components.issues.messages.SAVED') || 'Deleted' }); } catch (e) {}
            this.isLoading = false;
          } catch (e) { console.warn('error refreshing files after delete', e); this.isLoading = false; }
        },
        error: (err: any) => {
          console.warn('Failed to delete attached file', err);
          this.isLoading = false;
          try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.issues.messages.ERROR'), detail: this.translate.instant('components.issues.messages.UPLOAD_FAILED') || 'Failed' }); } catch (e) {}
        }
      });
    } catch (e) { console.warn('removeFile error', e); }
  }

  downloadFile(file: any): void {
    try {
      if (!file) return;
      const url = file.url ?? (file.id ? `/api/storage/${file.id}/download` : null);
      if (!url) return;
      // open in new tab to allow browser to handle download (cookies are sent for same-origin)
      try { window.open(url, '_blank'); } catch (e) { window.location.href = url; }
    } catch (e) { console.warn('downloadFile error', e); }
  }
}
