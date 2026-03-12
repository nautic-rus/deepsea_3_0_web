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
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProjectsTypesService } from '../../../../services/projects-types.service';

@Component({
  selector: 'app-document-types',
  standalone: true,
  imports: [DatePipe, NgIf, TranslateModule, FormsModule, ToolbarModule, ButtonModule, TableModule, InputTextModule, InputIconModule, IconFieldModule, DialogModule, ToastModule, ConfirmDialogModule],
  providers: [ConfirmationService],
  templateUrl: './types.html',
  styleUrls: ['./types.scss']
})
export class DocumentTypesComponent implements OnInit {
  items: any[] = [];
  loading = false;
  displayDialog = false;
  editModel: any = {};
  isCreating = false;
  error: string | null = null;

  constructor(private svc: ProjectsTypesService, private cd: ChangeDetectorRef, private msg: MessageService, private translate: TranslateService, private confirm: ConfirmationService) {}

  ngOnInit(): void { this.load(); }

  private load(): void {
    this.loading = true;
    this.svc.getDocumentTypes().subscribe({ next: (res: any) => {
      this.items = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);
      this.loading = false; this.cd.detectChanges();
    }, error: () => { this.items = []; this.loading = false; this.cd.detectChanges(); } });
  }

  openNew(): void { this.editModel = { name: '', code: '', description: '' }; this.isCreating = true; this.displayDialog = true; this.error = null; }
  openEdit(item: any): void { this.editModel = { ...item }; this.isCreating = false; this.displayDialog = true; this.error = null; }

  save(): void {
    if (!this.editModel?.name) { this.error = 'Name is required'; return; }
    this.loading = true;
    const payload: any = { name: this.editModel.name, code: this.editModel.code, description: this.editModel.description, order_index: this.editModel.order_index };
    if (this.isCreating) {
      this.svc.createType(payload, false).subscribe({ next: () => { this.displayDialog = false; this.load(); this.msg.add({ severity: 'success', summary: 'Created' }); this.loading = false; }, error: (e: any) => { this.error = e?.message || 'Error'; this.loading = false; } });
    } else {
      const id = this.editModel.id || this.editModel._id;
      this.svc.updateType(id, payload, false).subscribe({ next: () => { this.displayDialog = false; this.load(); this.msg.add({ severity: 'success', summary: 'Updated' }); this.loading = false; }, error: (e: any) => { this.error = e?.message || 'Error'; this.loading = false; } });
    }
  }

  confirmDelete(item: any): void {
    this.confirm.confirm({ message: `Delete ${item.name || item.id}?`, accept: () => {
      this.svc.deleteType(item.id, false).subscribe({ next: () => { this.load(); this.msg.add({ severity: 'success', summary: 'Deleted' }); }, error: () => {} });
    } });
  }

  onGlobalFilter(dt: any, event: any): void { const v = event?.target?.value ?? event; if (dt?.filterGlobal) dt.filterGlobal(v, 'contains'); }
}
