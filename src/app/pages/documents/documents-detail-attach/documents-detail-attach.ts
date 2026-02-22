import { Component, OnInit, Input, inject, OnChanges, SimpleChanges, ViewChild, ElementRef, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TreeTableModule } from 'primeng/treetable';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { FormsModule } from '@angular/forms';
import { HttpEventType } from '@angular/common/http';
import { Subscription, firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { FileService } from '../../../services/file.service';
import { NodeService } from '../../../services/nodeservice';
import { TreeNode } from 'primeng/api';
import { TranslateModule } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-documents-detail-attach',
  standalone: true,
  imports: [CommonModule, TreeTableModule, TranslateModule, DialogModule, ButtonModule, AvatarModule, SelectModule, FormsModule, ProgressBarModule, TagModule],
  providers: [NodeService, MessageService],
  templateUrl: './documents-detail-attach.html',
  styleUrls: ['./documents-detail-attach.scss']
})
export class DocumentsDetailAttachComponent implements OnInit, OnChanges {
  @Input() document: any | null = null;
  private nodeService = inject(NodeService);
  private messageService = inject(MessageService);
  private translate = inject(TranslateService);
  files!: TreeNode[];
  // raw nodes returned from the backend (unfiltered)
  private _rawFiles: any[] = [];
  // view toggle: false -> show active (archive !== true), true -> show archived only (archive === true)
  viewArchived = false;
  
  ngOnChanges(changes: SimpleChanges) {
    if (changes['document'] && this.document && this.document.id) {
      this.loadFilesForDocument(this.document.id);
    }
  }

  ngOnInit() {
    // If document was already provided at init, load files
    if (this.document && this.document.id) {
      this.loadFilesForDocument(this.document.id);
    } else {
      this.files = [];
    }
  }

  private async loadFilesForDocument(documentId: number) {
    try {
      const nodes = await this.nodeService.getFilesForDocument(documentId);
      // keep raw nodes and apply archive filter according to current view
  this._rawFiles = nodes || [];
  this.files = this._filterArchivedNodes(this._rawFiles || [], this.viewArchived);
  // expand root groups by default for better UX
  this._expandAll(this.files);
    } catch (e) {
      console.error('Failed to load files for document', e);
      this.files = [];
    }
  }

  // Recursively filter nodes based on archive flag.
  // If showArchived === false => keep non-archived files (archive !== true).
  // If showArchived === true  => keep only archived files (archive === true).
  private _filterArchivedNodes(nodes: any[], showArchived = false): any[] {
    if (!Array.isArray(nodes)) return [];
    const out: any[] = [];

    const nodeIsArchived = (m: any): boolean => {
      if (m == null) return false;
      if (typeof m === 'boolean') return m === true;
      if (typeof m === 'number') return m === 1;
      const s = String(m).toLowerCase().trim();
      return s === 'true' || s === '1' || s === 'yes' || s === 'archived';
    };

    for (const n of nodes) {
      // If node has children, filter them recursively
      if (n.children && Array.isArray(n.children)) {
        const kids = this._filterArchivedNodes(n.children, showArchived);
        if (kids.length) {
          out.push({ ...n, children: kids });
          continue;
        }
        // no children remain; if this node is a group (no data.file_name), skip it
        if (!n.data || !n.data.file_name) continue;
        // otherwise fallthrough to check as a leaf
      }

      // Leaf file row: include based on showArchived flag
      if (n.data && n.data.file_name) {
        // archive flag may be on data._original.archive or data.archive
        const raw = n.data._original ?? n.data;
        const isArchived = nodeIsArchived(raw?.archive);
        if (showArchived) {
          if (isArchived) out.push(n);
        } else {
          if (!isArchived) out.push(n);
        }
        continue;
      }

      // If node is something else (unexpected), keep it
      out.push(n);
    }
    return out;
  }

  // Switch the attachments view between active and archived files
  setViewArchived(flag: boolean) {
    this.viewArchived = !!flag;
    // Apply filter according to selection: show archived files when viewArchived === true,
    // otherwise show non-archived (active) files.
    this.files = this._filterArchivedNodes(this._rawFiles || [], this.viewArchived);
    this._expandAll(this.files);
  }

  // Called when user selects a storage TYPE in the Add File dialog.
  // Compute and set the next revision value based on existing files for that type.
  onTypeChange(typeId: any) {
    try {
      const next = this._computeNextRevForType(typeId);
      if (next !== null && next !== undefined) {
        this.addModel.rev = next;
      }
    } catch (e) {
      // ignore and leave rev untouched on error
      console.warn('Failed to compute next rev for type', typeId, e);
    }
  }

  // Compute next revision for given typeId by scanning _rawFiles tree.
  // Strategy: prefer numeric revs — take max + 1 (cap at 100), otherwise use next letter.
  private _computeNextRevForType(typeId: any): string | null {
    if (!this._rawFiles || !Array.isArray(this._rawFiles)) return '1';
    const numeric: number[] = [];
    const letters: string[] = [];

    const collect = (nodes: any[]) => {
      for (const n of nodes) {
        if (n.children && Array.isArray(n.children)) {
          collect(n.children);
          continue;
        }
        const raw = n.data?._original ?? n.data ?? null;
        if (!raw) continue;
        if ((raw.type_id ?? raw.type) == null) continue;
        if (String(raw.type_id ?? raw.type) !== String(typeId)) continue;
        const r = raw.rev ?? raw.revision ?? raw.rev;
        if (r == null) continue;
        const s = String(r).trim();
        const num = Number(s);
        if (!isNaN(num) && Number.isFinite(num)) {
          numeric.push(Math.floor(num));
        } else if (/^[A-Za-z]$/.test(s)) {
          letters.push(s.toUpperCase());
        }
      }
    };

    collect(this._rawFiles);

    if (numeric.length) {
      const maxNum = Math.max(...numeric);
      if (maxNum < 100) return String(maxNum + 1);
      // if exceeded numeric range, fallback to letter 'A' if available
      if (!letters.length) return 'A';
    }

    if (letters.length) {
      // find highest letter
      const codes = letters.map(l => l.charCodeAt(0));
      const maxCode = Math.max(...codes);
      if (maxCode < 90) return String.fromCharCode(maxCode + 1);
      // wrap to 'A' if at 'Z'
      return 'A';
    }

    // default fallback
    return '1';
  }

  // Ensure all nodes that have children are expanded (recursively)
  private _expandAll(nodes: any[] | undefined): void {
    if (!Array.isArray(nodes)) return;
    for (const n of nodes) {
      if (n.children && Array.isArray(n.children) && n.children.length) {
        try { n.expanded = true; } catch(_) {}
        this._expandAll(n.children);
      }
    }
  }

  previewVisible = false;
  previewFile: any | null = null;

  // --- Add file dialog state ---
  addDialogVisible = false;
  storageTypesOptions: Array<{ label: string; value: any }> = [];
  revOptions: Array<{ label: string; value: any }> = [];
  addModel: { type_id?: any; rev?: any } = {};
  @ViewChild('addFileInput') addFileInput?: ElementRef<HTMLInputElement>;

  // per-dialog upload preview & progress
  addUploadedFiles: Array<{ id: number; file: File; url?: string | null; progress?: number; uploaded?: boolean }> = [];
  private _addObjectUrls: string[] = [];
  private _addLocalPreviewId = 1;
  private _addActiveUploadSubs: Subscription[] = [];
  private _addActiveUploads = 0;
  isAddDragOver = false;
  maxFileSize = 100 * 1024 * 1024;

  private fileService = inject(FileService);
  private http = inject(HttpClient);
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);

  openPreview(rowData: any) {
    const data = rowData._original || rowData;
    this.previewFile = data;
    this.previewVisible = true;
  }

  async downloadFile(rowData: any) {
    const data = rowData._original || rowData;
    if (!data || !data.id) return;
    try {
      const blob = await this.nodeService.downloadFile(data.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.file_name || 'file';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      try { this.messageService.add({ severity: 'success', summary: this.translate.instant('components.documents.messages.SAVED') || 'Downloaded', detail: this.translate.instant('components.documents.messages.SAVED') || 'File downloaded' }); } catch(e) { this.messageService.add({ severity: 'success', summary: 'Downloaded', detail: 'File downloaded' }); }
    } catch (err: any) {
      console.error('Download failed', err);
      try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.documents.messages.ERROR') || 'Error', detail: err?.message || this.translate.instant('components.documents.messages.ERROR') || 'Failed to download file' }); } catch(e) { this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.message || 'Failed to download file' }); }
    }
  }

  async confirmDelete(rowData: any) {
    const data = rowData._original || rowData;
    if (!data || !data.id) return;
    const ok = window.confirm(`Delete file "${data.file_name}"?`);
    if (!ok) return;
    try {
      await this.nodeService.deleteFile(data.id);
      try { this.messageService.add({ severity: 'success', summary: this.translate.instant('components.documents.messages.SAVED') || 'Deleted', detail: this.translate.instant('components.documents.messages.SAVED') || 'File deleted' }); } catch(e) { this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'File deleted' }); }
      // refresh list
      if (this.document && this.document.id) {
        this.loadFilesForDocument(this.document.id);
      }
    } catch (err: any) {
      console.error('Delete failed', err);
      try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.documents.messages.ERROR') || 'Error', detail: err?.message || this.translate.instant('components.documents.messages.ERROR') || 'Failed to delete file' }); } catch(e) { this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.message || 'Failed to delete file' }); }
    }
  }

  // Confirm and restore an archived file
  async confirmRestore(rowData: any) {
    const data = rowData._original || rowData;
    if (!data || !data.id) return;
    const ok = window.confirm(`Restore file "${data.file_name}"?`);
    if (!ok) return;
    try {
      await this.restoreFile(data.id);
      try { this.messageService.add({ severity: 'success', summary: this.translate.instant('components.documents.messages.SAVED') || 'Restored', detail: this.translate.instant('components.documents.messages.SAVED') || 'File restored' }); } catch(e) { this.messageService.add({ severity: 'success', summary: 'Restored', detail: 'File restored' }); }
      if (this.document && this.document.id) {
        this.loadFilesForDocument(this.document.id);
      }
    } catch (err: any) {
      console.error('Restore failed', err);
      try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.documents.messages.ERROR') || 'Error', detail: err?.message || this.translate.instant('components.documents.messages.ERROR') || 'Failed to restore file' }); } catch(e) { this.messageService.add({ severity: 'error', summary: 'Error', detail: err?.message || 'Failed to restore file' }); }
    }
  }

  // Perform restore by calling backend endpoint. Adjust endpoint if backend differs.
  private async restoreFile(fileId: number): Promise<void> {
    try {
      // Attempt a RESTful restore endpoint. If your backend uses another path, change it accordingly.
      await firstValueFrom((this.http as any).post(`/api/documents/files/${fileId}/restore`, {}));
    } catch (e) {
      // propagate error
      throw e;
    }
  }

  // Stub for download-all action — implement backend behavior later
  downloadAll(): void {
    // no-op for now
    console.log('downloadAll not implemented yet');
  }

  // Stub for add-file action — implement upload behavior later
  // Open the Add File dialog and load storage types / rev options
  async openAddDialog() {
    this.addDialogVisible = true;
    // prepare rev options once
    if (!this.revOptions || this.revOptions.length === 0) {
      const nums = Array.from({ length: 100 }, (_, i) => ({ label: String(i + 1), value: String(i + 1) }));
      const letters = Array.from({ length: 26 }, (_, i) => ({ label: String.fromCharCode(65 + i), value: String.fromCharCode(65 + i) }));
      this.revOptions = [...nums, ...letters];
    }

    // load storage types if not loaded yet
    if (!this.storageTypesOptions || this.storageTypesOptions.length === 0) {
      try {
        const resp: any = await firstValueFrom((this.http as any).get('/api/document_storage_types'));
        const list = Array.isArray(resp) ? resp : (resp?.data ? resp.data : []);
        this.storageTypesOptions = (list || []).map((it: any) => ({ label: it.name || it.title || String(it.id), value: it.id }));
      } catch (e) {
        console.warn('Failed to load document storage types', e);
        this.storageTypesOptions = [];
      }
    }
  }

  openAddFileDialog(): void {
    try { this.addFileInput?.nativeElement.click(); } catch (_) {}
  }

  onAddFileInput(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const rawFiles = input?.files ? Array.from(input.files) : [];
    this.onAddSelect({ files: rawFiles });
  }

  onAddSelect(ev: any): void {
    const raw = ev?.files ?? ev?.currentFiles ?? [];
    try {
      // revoke previous object URLs to avoid leaks
      this._revokeAllAddObjectUrls();
      this.addUploadedFiles = (Array.isArray(raw) ? raw : []).map((f: File) => {
        const url = f.type && f.type.startsWith('image/') ? URL.createObjectURL(f) : null;
        if (url) this._addObjectUrls.push(url);
        return { id: this._addLocalPreviewId++, file: f, url, progress: 0, uploaded: false };
      });
    } catch (e) { this.addUploadedFiles = []; }
    this.cdr.markForCheck();
  }

  onAddDragOver(ev: DragEvent): void { try { ev.preventDefault(); ev.stopPropagation(); if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'copy'; } catch(_) {} }
  onAddDragEnter(ev: DragEvent): void { try { ev.preventDefault(); ev.stopPropagation(); } catch(_) {} this.isAddDragOver = true; this.cdr.markForCheck(); }
  onAddDragLeave(ev: DragEvent): void { try { ev.preventDefault(); ev.stopPropagation(); } catch(_) {} this.isAddDragOver = false; this.cdr.markForCheck(); }
  onAddDrop(ev: DragEvent): void {
    try { ev.preventDefault(); ev.stopPropagation(); } catch(_) {}
    this.isAddDragOver = false;
    const dt = ev.dataTransfer;
    const files = dt && dt.files ? Array.from(dt.files) as File[] : [];
    if (files && files.length) {
      this.onAddSelect({ files });
    }
    this.cdr.markForCheck();
  }

  removeAddPreview(entry: any): void {
    if (!entry) return;
    try { if (entry.url) { try { URL.revokeObjectURL(entry.url); } catch(_) {} const idx = this._addObjectUrls.indexOf(entry.url); if (idx !== -1) this._addObjectUrls.splice(idx, 1); } } catch(_) {}
    this.addUploadedFiles = (this.addUploadedFiles || []).filter(e => e !== entry && e.id !== entry.id);
    this.cdr.markForCheck();
  }

  cancelAddUploads(): void {
    this._cancelAllAddUploads();
    this._revokeAllAddObjectUrls();
    this.addUploadedFiles = [];
    try { if (this.addFileInput && this.addFileInput.nativeElement) this.addFileInput.nativeElement.value = ''; } catch(_) {}
    this.cdr.markForCheck();
    try { this.messageService.add({ severity: 'info', summary: this.translate.instant('components.issues.messages.WARNING') || 'Cancelled', detail: this.translate.instant('components.issues.messages.UPLOAD_CANCELLED') || 'Upload cancelled' }); } catch(e) { this.messageService.add({ severity: 'info', summary: 'Cancelled', detail: 'Upload cancelled' }); }
  }

  private _revokeAllAddObjectUrls(): void {
    try { for (const u of this._addObjectUrls) { try { URL.revokeObjectURL(u); } catch(_) {} } } finally { this._addObjectUrls = []; }
  }

  private _cancelAllAddUploads(): void {
    for (const s of this._addActiveUploadSubs) { try { s.unsubscribe(); } catch(_) {} }
    this._addActiveUploadSubs = [];
    this._addActiveUploads = 0;
  }

  async startAddUpload(keepOpen = false): Promise<void> {
    if (!this.addUploadedFiles || !this.addUploadedFiles.length || !this.document || !this.document.id) return;
    // Validate required fields
    if (!this.addModel.type_id || !this.addModel.rev) {
      try { this.messageService.add({ severity: 'warn', summary: this.translate.instant('components.documents.messages.WARNING') || 'Validation', detail: this.translate.instant('components.documents.attach.VALIDATION_REQUIRED') || 'TYPE and REV are required' }); } catch(e) { this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'TYPE and REV are required' }); }
      return;
    }
    const toUpload = this.addUploadedFiles.filter(p => !p.uploaded);
    if (!toUpload.length) return;

    // Upload files sequentially: first POST to /api/storage/local, then attach via POST /api/documents/{id}/files
    let successCount = 0;
    let failCount = 0;
    for (const entry of toUpload) {
      const f: File = entry.file;
      entry.progress = 0; entry.uploaded = false;
      try {
        // build form data
        const fd = new FormData();
        fd.append('file', f, f.name);
        // optional: include metadata if backend expects (content-type, filename)

        // perform upload to storage
        entry.progress = 10; this.cdr.markForCheck();
        const resp: any = await firstValueFrom((this.http as any).post('/api/storage/local', fd));
        const storage = resp?.data ?? resp ?? {};
        const storageId = storage.id ?? storage.storage_id ?? storage.file_id ?? null;
        if (!storageId) {
          throw new Error('No storage id returned from /api/storage/local');
        }

        entry.progress = 60; this.cdr.markForCheck();
        // attach to document
        await firstValueFrom((this.http as any).post(`/api/documents/${this.document.id}/files`, { storage_id: storageId, type_id: this.addModel.type_id, rev: this.addModel.rev }));

        entry.progress = 100; entry.uploaded = true; this.cdr.markForCheck();
        successCount++;
        try { this.messageService.add({ severity: 'success', summary: this.translate.instant('components.documents.messages.SAVED') || 'Uploaded', detail: `${f.name} attached` }); } catch(e) { this.messageService.add({ severity: 'success', summary: 'Uploaded', detail: `${f.name} attached` }); }
      } catch (err: any) {
        console.warn('file upload/attach failed', err);
        failCount++;
        try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.documents.messages.ERROR') || 'Error', detail: `${f.name}: ${err?.message || 'Upload/attach failed'}` }); } catch(e) { this.messageService.add({ severity: 'error', summary: 'Error', detail: `${f.name}: Upload/attach failed` }); }
        entry.progress = 0; entry.uploaded = false; this.cdr.markForCheck();
      }
    }

  // after all uploads, show summary, clear previews and refresh list
    if (successCount > 0 && failCount === 0) {
      try { this.messageService.add({ severity: 'success', summary: `${successCount} file(s) uploaded`, detail: 'All files were attached successfully' }); } catch(e) { this.messageService.add({ severity: 'success', summary: `${successCount} file(s) uploaded`, detail: 'All files were attached successfully' }); }
    } else if (successCount > 0 && failCount > 0) {
      try { this.messageService.add({ severity: 'warn', summary: `${successCount} uploaded, ${failCount} failed`, detail: 'Some files failed to attach' }); } catch(e) { this.messageService.add({ severity: 'warn', summary: `${successCount} uploaded, ${failCount} failed`, detail: 'Some files failed to attach' }); }
    } else if (failCount > 0) {
      try { this.messageService.add({ severity: 'error', summary: `${failCount} file(s) failed`, detail: 'No files were attached' }); } catch(e) { this.messageService.add({ severity: 'error', summary: `${failCount} file(s) failed`, detail: 'No files were attached' }); }
    }

    try { if (this.document && this.document.id) await this.loadFilesForDocument(this.document.id); } catch(_) {}
    if (keepOpen) {
      // remove uploaded previews but keep dialog open so user can add more files
      this.addUploadedFiles = (this.addUploadedFiles || []).filter(p => !p.uploaded);
    } else {
      this._revokeAllAddObjectUrls();
      this.addUploadedFiles = [];
      try { if (this.addFileInput && this.addFileInput.nativeElement) this.addFileInput.nativeElement.value = ''; } catch(_) {}
      // close dialog when not keeping it open
      this.addDialogVisible = false;
    }
  }

  private _finishOneAddUpload(sub: Subscription) {
    this._addActiveUploads = Math.max(0, this._addActiveUploads - 1);
    const idx = this._addActiveUploadSubs.indexOf(sub);
    if (idx !== -1) this._addActiveUploadSubs.splice(idx, 1);
    if (this._addActiveUploads === 0) {
      // clear previews
      try { this._revokeAllAddObjectUrls(); } catch(_) {}
      this.addUploadedFiles = [];
      try { if (this.addFileInput && this.addFileInput.nativeElement) this.addFileInput.nativeElement.value = ''; } catch(_) {}
      this.cdr.markForCheck();
    }
  }

  formatSizeMb(size: string | number | undefined): string {
    if (!size) return '-';
    const bytes = Number(size) || 0;
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(2)} MB` : `${(mb * 1024).toFixed(1)} KB`;
  }

  // Human-readable bytes (B/KB/MB/GB)
  formatBytes(bytes?: number | null): string {
    if (!bytes || isNaN(Number(bytes))) return '0 B';
    const b = Number(bytes);
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (b === 0) return '0 B';
    const i = Math.floor(Math.log(b) / Math.log(1024));
    const val = b / Math.pow(1024, i);
    return `${val.toFixed(i === 0 ? 0 : 2)} ${sizes[i]}`;
  }

  // derive initials from a single full-name string
  initialsFromName(name?: string | null): string {
    if (!name) return '';
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '';
    if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  // Format surname with initials for given name and patronymic or accept full-name string
  formatSurnameInitials(item: any): string {
    if (!item) return '-';
    try {
      if (typeof item === 'object') {
        // try common fields: last_name / first_name / middle_name
        const last = (item.last_name || item.lastName || item.surname || '').toString().trim();
        const first = (item.first_name || item.firstName || item.given_name || '').toString().trim();
        const middle = (item.middle_name || item.middleName || item.patronymic || '').toString().trim();
        const initials: string[] = [];
        if (first) initials.push(first[0].toUpperCase() + '.');
        if (middle) initials.push(middle[0].toUpperCase() + '.');
        if (last) return last + (initials.length ? ' ' + initials.join('') : '');
        // fall back to full_name or username
        if (item.full_name) return this.formatSurnameInitials(item.full_name);
        return item.username || '-';
      }

      if (typeof item === 'string') {
        const parts = item.trim().split(/\s+/).filter(Boolean);
        if (!parts.length) return '-';
        const surname = parts[0];
        const rest = parts.slice(1);
        const initials = rest.map(p => (p && p[0]) ? p[0].toUpperCase() + '.' : '').join('');
        return surname + (initials ? ' ' + initials : '');
      }
    } catch (e) {
      // fall through
    }
    return '-';
  }

  getUserAvatarUrl(user: any): string | undefined {
    if (!user) return undefined;
    // prefer explicit URL fields
    if (user.avatar_url) return user.avatar_url;
    if (user.avatar) return user.avatar;
    // check common id fields
    const aId = user.avatar_id ?? user.avatarId ?? user.avatarID ?? user.avatar_id;
    if (aId !== null && aId !== undefined && String(aId).trim() !== '') {
      return `/api/storage/${String(aId).trim()}/download`;
    }
    return undefined;
  }

  avatarBg(user: any): string {
    const seed = (user && (user.id ?? user.username ?? user.full_name ?? '')) || '';
    const s = seed.toString();
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      const ch = s.charCodeAt(i);
      hash = ((hash << 5) - hash) + ch;
      hash = hash & hash;
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 65%, 45%)`;
  }

  avatarTextColor(user: any): string {
    const bg = this.avatarBg(user);
    const m = bg.match(/hsl\((\d+),\s*(\d+)%?,\s*(\d+)%?\)/);
    if (!m) return '#fff';
    const lightness = Number(m[3]);
    return lightness > 70 ? '#111' : '#fff';
  }

  toggleApplications() {
    if (!this.files || this.files.length === 0) return;
    // If any root is collapsed (expanded !== true), we'll expand all; otherwise collapse all
    const shouldExpand = this.files.some((f) => !(f as any).expanded);
    const newFiles = this.files.map((f) => ({ ...f, expanded: shouldExpand } as TreeNode));
    this.files = newFiles;
  }
}
