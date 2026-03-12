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
import { Select } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { ProjectsWorkFlowService } from '../../../../services/projects-work-flow.service';
import { ProjectsStatusesService } from '../../../../services/projects-statuses.service';
import { ProjectsService } from '../../../../services/projects.service';
import { ProjectsTypesService } from '../../../../services/projects-types.service';

@Component({
  selector: 'app-document-work-flow',
  standalone: true,
  imports: [DatePipe, NgIf, TranslateModule, FormsModule, ToolbarModule, ButtonModule, TableModule, InputTextModule, InputIconModule, IconFieldModule, DialogModule, ToastModule, ConfirmDialogModule, Select, MultiSelectModule],
  providers: [ConfirmationService],
  templateUrl: './work-flow.html',
  styleUrls: ['./work-flow.scss']
})
export class DocumentWorkFlowComponent implements OnInit {
  items: any[] = [];
  loading = false;
  displayDialog = false;
  editModel: any = {};
  isCreating = false;
  error: string | null = null;

  private statusMap: Record<number, string> = {};
  statusOptions: any[] = [];
  projectOptions: any[] = [];
  typeOptions: any[] = [];
  projectFilterOptions: any[] = [];
  typeFilterOptions: any[] = [];

  constructor(
    private svc: ProjectsWorkFlowService,
    private statusesSvc: ProjectsStatusesService,
    private projectsSvc: ProjectsService,
    private typesSvc: ProjectsTypesService,
    private cd: ChangeDetectorRef,
    private appMsg: AppMessageService,
    private translate: TranslateService,
    private confirm: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.loadStatuses();
    this.loadProjects();
    this.loadTypes();
    this.load();
  }

  private loadStatuses(): void {
    this.statusesSvc.getDocumentStatuses().subscribe({ next: (res: any) => {
      const arr = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);
      arr.forEach((s: any) => { this.statusMap[s.id] = s.name || s.code || String(s.id); });
      this.statusOptions = arr.map((s: any) => ({ label: s.name || s.code || String(s.id), value: s.id }));
      this.cd.detectChanges();
    }, error: () => {} });
  }

  private loadProjects(): void {
    this.projectsSvc.getProjects(1, 1000).subscribe({ next: (res: any) => {
      const arr = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);
      this.projectOptions = arr.map((p: any) => ({ label: p.code || p.name || String(p.id), value: p.id }));
      this.cd.detectChanges();
    }, error: () => {} });
  }

  private loadTypes(): void {
    this.typesSvc.getDocumentTypes().subscribe({ next: (res: any) => {
      const arr = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);
      this.typeOptions = arr.map((t: any) => ({ label: t.name || t.code || String(t.id), value: t.id }));
      this.cd.detectChanges();
    }, error: () => {} });
  }

  statusName(id: any): string {
    if (id == null) return '—';
    return this.statusMap[id] || String(id);
  }

  private load(): void {
    this.loading = true;
    this.svc.getDocumentWorkFlows().subscribe({ next: (res: any) => {
      this.items = (res && res.data) ? res.data : (Array.isArray(res) ? res : []);
      this.buildFilterOptions();
      this.loading = false; this.cd.detectChanges();
    }, error: () => { this.items = []; this.loading = false; this.cd.detectChanges(); } });
  }

  private buildFilterOptions(): void {
    const projectsSet = new Set<string>();
    const typesSet = new Set<string>();
    this.items.forEach((it: any) => {
      const p = it?.project?.code || it?.project_code || (it?.project_id != null ? String(it.project_id) : null);
      const t = it?.document_type?.name || it?.document_type?.code || (it?.document_type_id != null ? String(it.document_type_id) : null);
      if (p) projectsSet.add(String(p));
      if (t) typesSet.add(String(t));
    });
    this.projectFilterOptions = Array.from(projectsSet).sort().map((v: any) => ({ label: v, value: v }));
    this.typeFilterOptions = Array.from(typesSet).sort().map((v: any) => ({ label: v, value: v }));
  }

  openNew(): void { this.editModel = { project_id: null, document_type_id: null, from_status_id: null, to_status_id: null }; this.isCreating = true; this.displayDialog = true; this.error = null; }
  openEdit(item: any): void { this.editModel = { ...item, project_id: item?.project?.id || item?.project_id, document_type_id: item?.document_type?.id || item?.document_type_id }; this.isCreating = false; this.displayDialog = true; this.error = null; }

  save(): void {
    this.loading = true;
    const payload: any = { project_id: this.editModel.project_id, document_type_id: this.editModel.document_type_id, from_status_id: this.editModel.from_status_id, to_status_id: this.editModel.to_status_id };
    if (this.isCreating) {
      this.svc.createDocumentWorkFlow(payload).subscribe({ next: () => { this.displayDialog = false; this.load(); this.appMsg.success('Created'); this.loading = false; }, error: (e: any) => { this.error = e?.message || 'Error'; this.loading = false; } });
    } else {
      const id = this.editModel.id || this.editModel._id;
      this.svc.updateDocumentWorkFlow(id, payload).subscribe({ next: () => { this.displayDialog = false; this.load(); this.appMsg.success('Updated'); this.loading = false; }, error: (e: any) => { this.error = e?.message || 'Error'; this.loading = false; } });
    }
  }

  confirmDelete(item: any): void {
    this.confirm.confirm({ message: `${this.translate.instant('components.projects.settings.confirm.DELETE_WORKFLOW_QUESTION') || 'Attention! Do you really want to delete workflow'} #${item.id}?`, icon: 'pi pi-exclamation-triangle', accept: () => {
      this.svc.deleteDocumentWorkFlow(item.id).subscribe({ next: () => { this.load(); this.appMsg.success('Deleted'); }, error: () => {} });
    } });
  }

  onGlobalFilter(dt: any, event: any): void { const v = event?.target?.value ?? event; if (dt?.filterGlobal) dt.filterGlobal(v, 'contains'); }
}
