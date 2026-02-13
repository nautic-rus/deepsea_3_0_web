import { Component, Input, OnChanges, OnDestroy, SimpleChanges, inject, ViewChild, ElementRef, NgZone, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
// removed PrimeNG FileUpload — using native input + custom UI
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ConfirmationService } from 'primeng/api';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpEventType } from '@angular/common/http';
import { of, Subscription } from 'rxjs';
import { tap, catchError, finalize } from 'rxjs/operators';
import { FileService } from '../../services/file.service';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressBarModule } from 'primeng/progressbar';
import { ProgressSpinner } from 'primeng/progressspinner';

interface UploadEvent {
  originalEvent?: any;
  files?: any[];
}

@Component({
  selector: 'app-issue-detail-attach',
  standalone: true,
  imports: [CommonModule, ToastModule, TranslateModule, ButtonModule, TableModule, ConfirmDialogModule, ProgressBarModule, ProgressSpinner],
  providers: [MessageService, ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
     :host ::ng-deep .p-progressbar-value {
        background: var(--p-button-success-background) !important;
      }
      :host ::ng-deep .drop-area {
        margin-top: 1.5rem;
        border: 2px dashed rgba(0,0,0,0.12);
        padding: 2rem;
        border-radius: 0.375rem;
        cursor: pointer;
        display: block;
        text-align: center;

      }
      :host ::ng-deep .drop-area:hover {
        border-color: var(--p-primary-color);
      }
      /* Animated state when a file is dragged over the area */
      :host ::ng-deep .drop-area.drag-over {
        border-color: var(--p-primary-color);
      }

    `
  ],
  template: `
    <section class="admin-subpage-attachments card ">
      <div class="flex items-center justify-between mt-0 mb-2">
          <h4 class="mb-">{{ 'components.issues.detail.ATTACHE' | translate }}</h4>
        </div>
      <p-toast></p-toast>
  <p-confirmDialog appendTo="body"
           [style]="{ width: '25%' }"
           styleClass="project-confirm-dialog"
           header="{{ 'MENU.CONFIRM' | translate }}"
           acceptLabel="{{ 'MENU.DELETE' | translate }}"
           rejectLabel="{{ 'MENU.CANCEL' | translate }}"
           acceptIcon="pi pi-check"
           acceptButtonStyleClass="p-button-danger"
           rejectButtonStyleClass="secondary p-button-text"
           rejectIcon="pi pi-times">
  </p-confirmDialog>

      <div class="relative">
        <div *ngIf="isLoading" class="absolute inset-0 flex items-center justify-center bg-white/60 z-10">
          <p-progressspinner strokeWidth="4" [style]="{ width: '36px', height: '36px' }"></p-progressspinner>
        </div>

        <div *ngIf="(!attachments || !attachments.length)" class="text-surface-500">{{ 'components.issues.attach.NO_ATTACHMENTS' | translate }}</div>

  <p-table *ngIf="attachments && attachments.length" [value]="attachments" [dataKey]="'id'" class="w-full" size="small">
        <ng-template pTemplate="body" let-a>
          <tr>
            <td class="col-w-18rem">
              <a *ngIf="a.url" [href]="a.url" target="_blank" rel="noopener" class="text-blue-600 dark:text-blue-400 hover:underline">{{ a.name }}</a>
              <span *ngIf="!a.url">{{ a.name }}</span>
            </td>
            <td class="col-w-6rem">
              <span class="text-sm text-surface-500">{{ a.size ? formatBytes(a.size) : (a.size_mb ? (a.size_mb + ' MB') : '-') }}</span>
            </td>
            <td class="col-w-8rem">
              <span class="text-sm text-surface-500">{{ (a.created_at || a.createdAt) ? ((a.created_at || a.createdAt) | date:'dd.MM.yyyy, HH:mm') : '-' }}</span>
            </td>
            <td class="text-right col-w-6rem">
              <p-button icon="pi pi-download" class="mr-2" (click)="downloadFile(a)" [outlined]="true"></p-button>
            <p-button icon="pi pi-trash" severity="danger" (click)="removeFile(a)" [outlined]="true"></p-button>
            </td>
          </tr>
        </ng-template>
      </p-table>

  </div>

  <div class="mt-6">

        <!-- Native file input + custom controls (we manage previews and uploads ourselves) -->
        <input #fileInput type="file" multiple (change)="onFileInput($event)" style="display:none" />
        <div class="file-controls flex items-center gap-3">
          <p-button [label]="'components.issues.attach.CHOOSE' | translate" icon="pi pi-plus" (click)="openFileDialog()"></p-button>
          <p-button [label]="'components.issues.attach.UPLOAD' | translate" icon="pi pi-upload" (click)="startUpload()" severity="secondary" [disabled]="!uploadedFiles || !uploadedFiles.length"></p-button>
          <p-button [label]="'components.issues.attach.CANCEL' | translate" icon="pi pi-times" severity="secondary" (click)="cancelUploads()" [disabled]="!uploadedFiles || !uploadedFiles.length"></p-button>
        </div>

        <div class="mt-3">
          <div class="drop-area" tabindex="0"
               (click)="openFileDialog()" (keydown.enter)="openFileDialog()"
               (dragover)="onDragOver($event)" (dragenter)="onDragEnter($event)" (dragleave)="onDragLeave($event)" (drop)="onDrop($event)"
               [class.drag-over]="isDragOver">
            {{ 'components.issues.attach.DRAG_DROP' | translate }}
          </div>
        </div>

        <!-- Component-owned previews so PrimeNG internals can't clear them -->
        <div class="uploaded-previews mt-4" *ngIf="uploadedFiles && uploadedFiles.length">
          <div *ngFor="let p of uploadedFiles" class="preview-item flex items-center justify-between mb-3">
            <div class="flex items-center gap-3">
              <img *ngIf="p.url" [src]="p.url" [alt]="p.file.name" style="width:48px;height:48px;object-fit:cover;border-radius:4px;" />
              <div>
                <div class="font-medium">{{ p.file.name }}</div>
                <div class="text-sm text-surface-500">{{ formatBytes(p.file.size) }}</div>
              </div>
            </div>
            <div class="flex items-center gap-3" style="min-width:220px;">
              <div style="flex:1;">
                <p-progressbar [value]="p.progress || (p.uploaded ? 100 : 0)"></p-progressbar>
              </div>
              <div>
                <p-button icon="pi pi-times" styleClass="p-button-text" (click)="removePreview(p)"></p-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `
})
export class IssueDetailAttachComponent implements OnChanges, OnDestroy {
  @Input() issue: any | null = null;
  attachments: Array<{ name: string; size: number; id?: any; url?: string; created_at?: string | null }> = [];

  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  private messageService = inject(MessageService);
  private translate = inject(TranslateService);
  private fileService = inject(FileService);
  private confirmationService = inject(ConfirmationService);
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);

  uploadProgress: number | null = null;
  uploadInProgress = false;
  /** Component-owned preview entries so we don't depend on PrimeNG internals */
  uploadedFiles: Array<{ id: number; file: File; url?: string | null; progress?: number; uploaded?: boolean }> = [];
  private _localPreviewId = 1;
  private _objectUrls: string[] = [];
  maxFileSize = 100 * 1024 * 1024;
  isLoading = false;

  private activeUploads = 0;
  private activeUploadSubs: Subscription[] = [];
  private _localIdCounter = 1;
  /** Flag to ignore stale async callbacks after cancel */
  private _cancelled = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['issue']) {
      const initial = (this.issue && Array.isArray(this.issue.attachments)) ? [...this.issue.attachments] : [];
      this.safeSetAttachments(initial);
      const issueId = this.getIssueId();
      if (issueId) {
        this.fetchIssueFiles(issueId).subscribe();
      }
    }
  }

  ngOnDestroy(): void {
    this.cancelUploads();
    this._revokeAllObjectUrls();
  }

  fetchIssueFiles(issueId: any) {
    if (!issueId) return of([]);
    this.isLoading = true;
    this.cdr.markForCheck();
    return this.fileService.getIssueFiles(issueId).pipe(
      tap((list: any[]) => {
        this.safeSetAttachments(Array.isArray(list) ? list : []);
      }),
      finalize(() => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }),
      catchError((err: any) => {
        console.warn('Failed to fetch issue files', err);
        return of([]);
      })
    );
  }

  onUpload(ev: any): void {
    const raw = ev?.files ?? ev?.currentFiles ?? [];
    const files: File[] = Array.from(raw);
    const allowed = files.filter((f: any) => !f.size || f.size <= this.maxFileSize);
    const rejected = files.filter((f: any) => f.size && f.size > this.maxFileSize);

    if (!allowed.length && !rejected.length) return;

    this._cancelled = false;

    if (allowed.length) {
      this.uploadInProgress = true;
      this.uploadProgress = 0;
      this.cdr.markForCheck();
    }

    for (const f of allowed) {
      // Find or create a preview entry for this file so we can show per-file progress.
      let entry = this.uploadedFiles.find(e => e.file.name === f.name && e.file.size === f.size && !e.uploaded);
      if (!entry) {
        const url = f.type && f.type.startsWith('image/') ? URL.createObjectURL(f) : null;
        if (url) this._objectUrls.push(url);
        entry = { id: this._localPreviewId++, file: f, url, progress: 0, uploaded: false };
        this.uploadedFiles.push(entry);
      } else {
        entry.progress = 0;
        entry.uploaded = false;
      }
      this.activeUploads++;
      const sub = this.fileService.uploadFile(f).subscribe({
        next: (event: any) => {
          if (this._cancelled) return;

          if (event?.type === HttpEventType.UploadProgress) {
            const pct = event.total ? Math.round(100 * (event.loaded || 0) / event.total) : 0;
            this.uploadProgress = pct;
            // update per-file progress
            try { entry.progress = pct; } catch(_) {}
            this.cdr.markForCheck();
          } else if (event?.type === HttpEventType.Response) {
            const body = event.body || {};
            const storage = body?.data ?? body ?? {};
            const objectKey: string | undefined = storage.object_key || storage.objectKey || undefined;
            let name = storage.filename || storage.filename_original || f.name;
            if ((!name || name === f.name) && objectKey) {
              const parts = objectKey.split('/');
              name = parts.length ? parts[parts.length - 1] : objectKey;
            }
            // fix mojibake for Cyrillic file names (UTF-8 read as Latin-1)
            name = this.fixEncoding(name);
            const id = storage.id ?? storage.storage_id ?? storage.file_id ?? null;

            const issueId = this.getIssueId();
            if (issueId && id != null) {
              this.isLoading = true;
              this.cdr.markForCheck();
              this.fileService.attachToIssue(issueId, id).subscribe({
                next: () => {
                  if (this._cancelled) return;
                  this.fetchIssueFiles(issueId).subscribe(() => {
                    this.messageService.add({
                      severity: 'success',
                      summary: this.translate.instant('components.issues.messages.UPLOADED'),
                      detail: this.translate.instant('components.issues.messages.UPLOADED_COUNT', { count: 1 })
                    });
                    // If all uploads finished and we've refreshed attachments, clear client previews
                    try { if (this.activeUploads === 0) this._clearSelectedFiles(); } catch (_) {}
                  });
                },
                error: (err: any) => {
                  console.warn('attach to issue failed', err);
                  this.isLoading = false;
                  this.cdr.markForCheck();
                  this.messageService.add({
                    severity: 'warn',
                    summary: this.translate.instant('components.issues.messages.WARNING'),
                    detail: this.translate.instant('components.issues.messages.UPLOAD_FAILED') + (name ? ': ' + name : '')
                  });
                }
              });
            } else {
              this.messageService.add({
                severity: 'info',
                summary: this.translate.instant('components.issues.messages.SUCCESS'),
                detail: this.translate.instant('components.issues.messages.SAVED_LOCAL') || 'Saved locally (no id)'
              });
            }

            entry.progress = 100;
            entry.uploaded = true;
            this.finishOneUpload(sub);
          }
        },
        error: (err: any) => {
          console.warn('file upload failed', err);
          if (!this._cancelled) {
            this.messageService.add({
              severity: 'error',
              summary: this.translate.instant('components.issues.messages.ERROR'),
              detail: this.translate.instant('components.issues.messages.UPLOAD_FAILED') + (f?.name ? ': ' + f.name : '')
            });
          }
          try { entry.progress = 0; } catch(_) {}
          this.finishOneUpload(sub);
        }
      });

      this.activeUploadSubs.push(sub);
    }

    if (rejected.length) {
      const names = rejected.map((r: any) => r.name).join(', ');
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('components.issues.messages.ERROR'),
        detail: this.translate.instant('components.issues.messages.FILE_TOO_LARGE') + `: ${names}`
      });
    }
  }

  onSelect(ev: any): void {
    const raw = ev?.files ?? ev?.currentFiles ?? [];
    const files: File[] = Array.from(raw);
    const rejected = files.filter(f => f.size && f.size > this.maxFileSize);
    // remember selected files so we can keep preview after upload
    try {
      // revoke previous object URLs to avoid leaks
      this._revokeAllObjectUrls();
      this.uploadedFiles = (Array.isArray(files) ? files : []).map(f => {
        const url = f.type && f.type.startsWith('image/') ? URL.createObjectURL(f) : null;
        if (url) this._objectUrls.push(url);
        return { id: this._localPreviewId++, file: f, url, progress: 0, uploaded: false };
      });
    } catch (e) { this.uploadedFiles = []; }
    this.cdr.markForCheck();
    if (rejected.length) {
      const names = rejected.map(r => r.name).join(', ');
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('components.issues.messages.WARNING'),
        detail: this.translate.instant('components.issues.messages.FILE_TOO_LARGE') + `: ${names}`
      });
    }
  }

  private _revokeAllObjectUrls(): void {
    try {
      for (const u of this._objectUrls) {
        try { URL.revokeObjectURL(u); } catch (_) {}
      }
    } finally {
      this._objectUrls = [];
    }
  }

  removePreview(entry: any): void {
    if (!entry) return;
    // revoke its object URL if present
    try {
      if (entry.url) {
        try { URL.revokeObjectURL(entry.url); } catch (_) {}
        const idx = this._objectUrls.indexOf(entry.url);
        if (idx !== -1) this._objectUrls.splice(idx, 1);
      }
    } catch (_) {}
    // remove from the in-component preview list
    this.uploadedFiles = (this.uploadedFiles || []).filter(e => e !== entry && e.id !== entry.id);
    this.cdr.markForCheck();
  }

  private _clearSelectedFiles(): void {
    // revoke URLs, clear preview list and reset native input value
    try { this._revokeAllObjectUrls(); } catch (_) {}
    this.uploadedFiles = [];
    try {
      if (this.fileInput && this.fileInput.nativeElement) {
        try { this.fileInput.nativeElement.value = ''; } catch (_) {}
      }
    } catch (_) {}
    this.cdr.markForCheck();
  }

  // Drag & drop state and handlers
  isDragOver = false;

  onDragOver(ev: DragEvent): void {
    try { ev.preventDefault(); ev.stopPropagation(); } catch (_) {}
    try { if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'copy'; } catch (_) {}
  }

  onDragEnter(ev: DragEvent): void {
    try { ev.preventDefault(); ev.stopPropagation(); } catch (_) {}
    this.isDragOver = true;
    this.cdr.markForCheck();
  }

  onDragLeave(ev: DragEvent): void {
    try { ev.preventDefault(); ev.stopPropagation(); } catch (_) {}
    // Only clear when leaving the drop area entirely
    this.isDragOver = false;
    this.cdr.markForCheck();
  }

  onDrop(ev: DragEvent): void {
    try { ev.preventDefault(); ev.stopPropagation(); } catch (_) {}
    this.isDragOver = false;
    const dt = ev.dataTransfer;
    const files = dt && dt.files ? Array.from(dt.files) as File[] : [];
    if (files && files.length) {
      // reuse existing onSelect to build previews and validate sizes
      this.onSelect({ files });
      // automatically start upload after drop (optional behaviour)
      // this.startUpload();
    }
    this.cdr.markForCheck();
  }

  openFileDialog(): void {
    try { this.fileInput?.nativeElement.click(); } catch (_) {}
  }

  onFileInput(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const rawFiles = input?.files ? Array.from(input.files) : [];
    // Reuse existing onSelect logic by passing an object with files
    this.onSelect({ files: rawFiles });
  }

  startUpload(): void {
    if (!this.uploadedFiles || !this.uploadedFiles.length) return;
    const toUpload = this.uploadedFiles.filter((p: any) => !p.uploaded);
    if (!toUpload.length) return;
    this._cancelled = false;
    this.uploadInProgress = true;
    this.uploadProgress = 0;
    this.cdr.markForCheck();

    for (const entry of toUpload) {
      const f: File = entry.file;
      entry.progress = 0;
      entry.uploaded = false;
      this.activeUploads++;
      const sub = this.fileService.uploadFile(f).subscribe({
        next: (event: any) => {
          if (this._cancelled) return;
          if (event?.type === HttpEventType.UploadProgress) {
            const pct = event.total ? Math.round(100 * (event.loaded || 0) / event.total) : 0;
            entry.progress = pct;
            this.uploadProgress = pct;
            this.cdr.markForCheck();
          } else if (event?.type === HttpEventType.Response) {
            const body = event.body || {};
            const storage = body?.data ?? body ?? {};
            const objectKey: string | undefined = storage.object_key || storage.objectKey || undefined;
            let name = storage.filename || storage.filename_original || f.name;
            if ((!name || name === f.name) && objectKey) {
              const parts = objectKey.split('/');
              name = parts.length ? parts[parts.length - 1] : objectKey;
            }
            name = this.fixEncoding(name);
            const id = storage.id ?? storage.storage_id ?? storage.file_id ?? null;
            const issueId = this.getIssueId();
            if (issueId && id != null) {
              this.isLoading = true;
              this.cdr.markForCheck();
              this.fileService.attachToIssue(issueId, id).subscribe({
                next: () => {
                  if (this._cancelled) return;
                  this.fetchIssueFiles(issueId).subscribe(() => {
                    this.messageService.add({
                      severity: 'success',
                      summary: this.translate.instant('components.issues.messages.UPLOADED'),
                      detail: this.translate.instant('components.issues.messages.UPLOADED_COUNT', { count: 1 })
                    });
                    try { if (this.activeUploads === 0) this._clearSelectedFiles(); } catch (_) {}
                  });
                },
                error: (err: any) => {
                  console.warn('attach to issue failed', err);
                  this.isLoading = false;
                  this.cdr.markForCheck();
                  this.messageService.add({
                    severity: 'warn',
                    summary: this.translate.instant('components.issues.messages.WARNING'),
                    detail: this.translate.instant('components.issues.messages.UPLOAD_FAILED') + (name ? ': ' + name : '')
                  });
                }
              });
            } else {
              this.messageService.add({
                severity: 'info',
                summary: this.translate.instant('components.issues.messages.SUCCESS'),
                detail: this.translate.instant('components.issues.messages.SAVED_LOCAL') || 'Saved locally (no id)'
              });
            }

            entry.progress = 100;
            entry.uploaded = true;
            this.finishOneUpload(sub);
          }
        },
        error: (err: any) => {
          console.warn('file upload failed', err);
          if (!this._cancelled) {
            this.messageService.add({
              severity: 'error',
              summary: this.translate.instant('components.issues.messages.ERROR'),
              detail: this.translate.instant('components.issues.messages.UPLOAD_FAILED') + (f?.name ? ': ' + f.name : '')
            });
          }
          try { entry.progress = 0; } catch(_) {}
          this.finishOneUpload(sub);
        }
      });
      this.activeUploadSubs.push(sub);
    }
  }

  cancelUploads(): void {
    // Set cancelled flag FIRST so any in-flight callbacks become no-ops
    this._cancelled = true;

    for (const s of this.activeUploadSubs) {
      try { s.unsubscribe(); } catch (_) {}
    }
    this.activeUploadSubs = [];
    this.activeUploads = 0;
    this.uploadInProgress = false;
    this.uploadProgress = null;
    this.isLoading = false;
  try { this._clearSelectedFiles(); } catch(e) {}
    this.cdr.markForCheck();

    this.messageService.add({
      severity: 'info',
      summary: this.translate.instant('components.issues.messages.WARNING') || 'Cancelled',
      detail: this.translate.instant('components.issues.messages.UPLOAD_CANCELLED') || 'Upload cancelled'
    });
  }

  formatBytes(bytes: number): string {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }

  removeFile(file: any): void {
    if (!file) return;
    const storageId = file.id ?? file.storage_id ?? null;
    const issueId = this.getIssueId();
    const fileLabel = file?.name ?? file?.filename ?? file?.title ?? (storageId ? String(storageId) : '');
    const confirmMessage = this.translate.instant('components.issues.attach.DELETE_CONFIRM', { name: fileLabel }) || `Delete file "${fileLabel}"?`;

    this.confirmationService.confirm({
      message: confirmMessage,
      accept: () => {
        if (!storageId || !issueId) {
          const filtered = (this.attachments || []).filter(a => a !== file && a.id !== storageId);
          this.safeSetAttachments(filtered);
          return;
        }
        this.isLoading = true;
        this.cdr.markForCheck();
        this.fileService.deleteIssueFile(issueId, storageId).subscribe({
          next: () => {
            this.fetchIssueFiles(issueId).subscribe(() => {
              this.messageService.add({
                severity: 'success',
                summary: this.translate.instant('components.issues.messages.SUCCESS'),
                detail: this.translate.instant('components.issues.messages.SAVED') || 'Deleted'
              });
            });
          },
          error: (err: any) => {
            console.warn('Failed to delete attached file', err);
            this.isLoading = false;
            this.cdr.markForCheck();
            this.messageService.add({
              severity: 'error',
              summary: this.translate.instant('components.issues.messages.ERROR'),
              detail: this.translate.instant('components.issues.messages.UPLOAD_FAILED') || 'Failed'
            });
          }
        });
      }
    });
  }

  downloadFile(file: any): void {
    if (!file) return;
    const url = file.url ?? (file.id ? `/api/storage/${file.id}/download` : null);
    if (!url) return;
    try { window.open(url, '_blank'); } catch (_) { window.location.href = url; }
  }

  // ─── private helpers ────────────────────────────────────────

  private getIssueId(): any {
    return this.issue?.id ?? this.issue?._id ?? this.issue?.issue_id ?? null;
  }

  /**
   * Fix "mojibake" — a UTF-8 string misinterpreted as Latin-1.
   * e.g. "ÐºÐ¾Ð¼Ð°Ð½Ð´Ñ.rtf" → "команда.rtf"
   */
  private fixEncoding(str: string): string {
    if (!str || !/[\u00c0-\u00ff]/.test(str)) return str;
    try {
      const bytes = new Uint8Array([...str].map(ch => ch.charCodeAt(0)));
      const decoded = new TextDecoder('utf-8').decode(bytes);
      return decoded.includes('\uFFFD') ? str : decoded;
    } catch {
      return str;
    }
  }

  /**
   * The ONLY place that mutates `this.attachments`.
   * - Always creates a brand-new array (never mutates in place).
   * - Ensures every row has a stable `id` for p-table [dataKey].
   * - Uses `ngZone.run` + `markForCheck` instead of `detectChanges` to avoid
   *   colliding with an already-running change-detection cycle (the root cause
   *   of the NgFor ViewContainerRef assertion error).
   */
  private safeSetAttachments(list: any[]): void {
    const mapped = (list || []).map(it => {
      const id = it.id ?? it.storage_id ?? it.file_id ?? it.name ?? `local-${this._localIdCounter++}`;
      return { ...it, id };
    });
    // Run inside Angular zone to guarantee a proper CD cycle is scheduled.
    // markForCheck tells Angular "this OnPush component is dirty, check it
    // on the next tick" — crucially it does NOT run CD synchronously, so
    // it can never collide with a CD that is already in progress.
    this.ngZone.run(() => {
      this.attachments = mapped;
      if (this.issue) this.issue.attachments = this.attachments;
      this.cdr.markForCheck();
    });
  }

  /** Decrement active uploads counter and hide progress bar when all done */
  private finishOneUpload(sub: Subscription): void {
    this.activeUploads = Math.max(0, this.activeUploads - 1);
    // remove subscription from tracking list
    const idx = this.activeUploadSubs.indexOf(sub);
    if (idx !== -1) this.activeUploadSubs.splice(idx, 1);

    if (this.activeUploads === 0) {
      this.uploadInProgress = false;
      this.uploadProgress = null;
      // Restore FileUpload preview: repopulate PrimeNG's internal files array
      // with the selected/uploaded files so preview remains visible after upload.
      this.cdr.markForCheck();
    }
  }
}
