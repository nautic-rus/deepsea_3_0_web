import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { DatePipe, NgIf } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService } from 'primeng/api';
import { AppMessageService } from '../../../../services/message.service';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ColorPickerModule } from 'primeng/colorpicker';
import { ProjectsStatusesService } from '../../../../services/projects-statuses.service';

@Component({
  selector: 'app-document-statuses',
  standalone: true,
  imports: [DatePipe, NgIf, TranslateModule, FormsModule, ToolbarModule, ButtonModule, TableModule, InputTextModule, InputIconModule, IconFieldModule, DialogModule, ToastModule, ConfirmDialogModule, ColorPickerModule],
  providers: [ConfirmationService],
  templateUrl: './statuses.html',
  styleUrls: ['./statuses.scss']
})
export class DocumentStatusesComponent implements OnInit {
  items: any[] = [];
  loading = false;
  displayDialog = false;
  editModel: any = {};
  isCreating = false;
  error: string | null = null;

  constructor(private svc: ProjectsStatusesService, private cd: ChangeDetectorRef, private appMsg: AppMessageService, private translate: TranslateService, private confirm: ConfirmationService) {}

  ngOnInit(): void { this.load(); }

  private load(): void {
    this.loading = true;
    this.svc.getDocumentStatuses().subscribe({ next: (res: any) => {
      this.items = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);
      this.loading = false; this.cd.detectChanges();
    }, error: () => { this.items = []; this.loading = false; this.cd.detectChanges(); } });
  }

  openNew(): void { this.editModel = { name: '', code: '', description: '' }; this.isCreating = true; this.displayDialog = true; this.error = null; }
  openEdit(item: any): void { this.editModel = { ...item }; this.isCreating = false; this.displayDialog = true; this.error = null; }

  save(): void {
    if (!this.editModel?.name) { this.error = 'Name is required'; return; }
    this.loading = true;
    const payload: any = { name: this.editModel.name, code: this.editModel.code, description: this.editModel.description, color: this.editModel.color, order_index: this.editModel.order_index };
    if (this.isCreating) {
      this.svc.createStatus(payload, false).subscribe({ next: () => { this.displayDialog = false; this.load(); this.appMsg.success('Created'); this.loading = false; }, error: (e: any) => { this.error = e?.message || 'Error'; this.loading = false; } });
    } else {
      const id = this.editModel.id || this.editModel._id;
      this.svc.updateStatus(id, payload, false).subscribe({ next: () => { this.displayDialog = false; this.load(); this.appMsg.success('Updated'); this.loading = false; }, error: (e: any) => { this.error = e?.message || 'Error'; this.loading = false; } });
    }
  }

  confirmDelete(item: any): void {
    this.confirm.confirm({ message: `${this.translate.instant('components.projects.settings.confirm.DELETE_QUESTION') || 'Attention! Do you really want to delete'} ${item.name || item.id}?`, icon: 'pi pi-exclamation-triangle', accept: () => {
      this.svc.deleteStatus(item.id, false).subscribe({
        next: () => { this.load(); this.appMsg.success('Deleted'); },
        error: (e: any) => {
          const serverMsg = e?.error?.message || e?.error?.error || e?.message || (typeof e === 'string' ? e : 'Delete failed');
          this.error = serverMsg;
          this.appMsg.error(serverMsg);
        }
      });
    } });
  }

  onGlobalFilter(dt: any, event: any): void { const v = event?.target?.value ?? event; if (dt?.filterGlobal) dt.filterGlobal(v, 'contains'); }
}
