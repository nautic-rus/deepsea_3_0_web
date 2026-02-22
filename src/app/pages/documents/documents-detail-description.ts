import { Component, Input, OnChanges, SimpleChanges, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EditorModule } from 'primeng/editor';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-documents-detail-description',
  standalone: true,
  providers: [MessageService],
  imports: [CommonModule, FormsModule, EditorModule, ButtonModule, TranslateModule, ToastModule],
  template: `
    <p-toast></p-toast>
    <div class="card">
      <div class="flex items-center justify-between mt-0 mb-2">
        <h4>{{ 'components.documents.detail.DESCRIPTION' | translate }}</h4>
        <p-button severity="secondary" icon="pi pi-pencil" (click)="startEdit()" [style.visibility]="editing ? 'hidden' : 'visible'"></p-button>
      </div>

      <div *ngIf="!editing" class="card-content p-2">
        <div *ngIf="!descriptionEmpty()" class="text-surface-500" [innerHTML]="text"></div>
        <div *ngIf="descriptionEmpty()" class="text-surface-500">{{ 'components.documents.detail.NO_DESCRIPTION' | translate }}</div>
      </div>

      <form *ngIf="editing" #f="ngForm" (ngSubmit)="onSubmit(f)" class="flex flex-col">
        <p-editor [(ngModel)]="text" name="content"></p-editor>
        <div class="flex gap-2 mt-4">
          <p-button severity="primary" type="submit">{{ 'MENU.SAVE' | translate }}</p-button>
          <p-button severity="secondary" (click)="cancel()">{{ 'MENU.CANCEL' | translate }}</p-button>
        </div>
      </form>
    </div>
  `
})
export class DocumentsDetailDescriptionComponent implements OnChanges {
  @Input() document: any | null = null;
  @Output() descriptionSaved = new EventEmitter<any>();
  private http = inject(HttpClient);
  private messageService = inject(MessageService);
  private translate = inject(TranslateService);

  text: string | undefined;
  editing = false;
  saving = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['document']) {
      this.text = this.document && this.document.description ? this.document.description : '';
    }
  }

  startEdit(): void { this.editing = true; }
  cancel(): void { this.editing = false; this.text = this.document && this.document.description ? this.document.description : ''; }

  descriptionEmpty(): boolean {
    try {
      if (!this.text) return true;
      const stripped = this.text.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '');
      return stripped.trim().length === 0;
    } catch (e) { return !this.text; }
  }

  onSubmit(form: any) {
    if (!(form && form.valid)) {
      try { form.control?.markAllAsTouched(); } catch (e) {}
      return;
    }
    if (this.document && this.document.id) {
      this.saving = true;
      const payload = { ...(this.document || {}), description: this.text || '' };
      this.http.put(`/api/documents/${this.document.id}`, payload).subscribe({
        next: (res: any) => {
          const data = (res && res.data) ? res.data : res;
          this.document = data || this.document;
          this.editing = false;
          this.saving = false;
          try { this.descriptionSaved.emit(this.document); } catch (e) {}
          try { this.messageService.add({ severity: 'success', summary: this.translate.instant('components.documents.messages.SAVED') || 'Saved', detail: this.translate.instant('components.documents.messages.SAVED') || 'Description saved' }); } catch (e) { this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Description saved' }); }
        },
        error: (err: any) => {
          this.saving = false;
          try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.documents.messages.ERROR') || 'Error', detail: (err && err.message) ? err.message : this.translate.instant('components.documents.messages.DESCRIPTION_SAVE_FAILED') || 'Failed to save description' }); } catch (e) { this.messageService.add({ severity: 'error', summary: 'Error', detail: (err && err.message) ? err.message : 'Failed to save description' }); }
        }
      });
      return;
    }
    if (this.document) this.document.description = this.text || '';
    try { this.descriptionSaved.emit(this.document); } catch (e) {}
    try { this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Description saved' }); } catch (e) {}
    this.editing = false;
  }
}
