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
import { Select } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { ProjectsWorkFlowService } from '../../../../services/projects-work-flow.service';
import { CustomerQuestionStatusesService } from '../../../../services/customer-question-statuses.service';
import { ProjectsService } from '../../../../services/projects.service';
import { CustomerQuestionTypesService } from '../../../../services/customer-question-types.service';

@Component({
  selector: 'app-question-work-flow',
  standalone: true,
  imports: [DatePipe, NgIf, TranslateModule, FormsModule, ToolbarModule, ButtonModule, TableModule, InputTextModule, InputIconModule, IconFieldModule, DialogModule, ToastModule, ConfirmDialogModule, Select, MultiSelectModule],
  providers: [ConfirmationService],
  templateUrl: './work-flow.html',
  styleUrls: ['./work-flow.scss']
})
export class QuestionWorkFlowComponent implements OnInit {
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
    private cqStatusesSvc: CustomerQuestionStatusesService,
    private projectsSvc: ProjectsService,
    private cqTypesSvc: CustomerQuestionTypesService,
    private cd: ChangeDetectorRef,
    private msg: MessageService,
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
    this.cqStatusesSvc.getStatuses().subscribe({ next: (res: any) => {
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
    this.cqTypesSvc.getTypes().subscribe({ next: (res: any) => {
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
    this.svc.getCustomerQuestionWorkFlows().subscribe({ next: (res: any) => {
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
      const t = it?.customer_question_type?.name || it?.customer_question_type?.code || (it?.customer_question_type_id != null ? String(it.customer_question_type_id) : null);
      if (p) projectsSet.add(String(p));
      if (t) typesSet.add(String(t));
    });
    this.projectFilterOptions = Array.from(projectsSet).sort().map((v: any) => ({ label: v, value: v }));
    this.typeFilterOptions = Array.from(typesSet).sort().map((v: any) => ({ label: v, value: v }));
  }

  openNew(): void { this.editModel = { project_id: null, customer_question_type_id: null, from_status_id: null, to_status_id: null }; this.isCreating = true; this.displayDialog = true; this.error = null; }
  openEdit(item: any): void { this.editModel = { ...item, project_id: item?.project?.id || item?.project_id, customer_question_type_id: item?.customer_question_type?.id || item?.customer_question_type_id }; this.isCreating = false; this.displayDialog = true; this.error = null; }

  save(): void {
    this.loading = true;
    const payload: any = { project_id: this.editModel.project_id, customer_question_type_id: this.editModel.customer_question_type_id, from_status_id: this.editModel.from_status_id, to_status_id: this.editModel.to_status_id };
    if (this.isCreating) {
      this.svc.createCustomerQuestionWorkFlow(payload).subscribe({ next: () => { this.displayDialog = false; this.load(); this.msg.add({ severity: 'success', summary: 'Created' }); this.loading = false; }, error: (e: any) => { this.error = e?.message || 'Error'; this.loading = false; } });
    } else {
      const id = this.editModel.id || this.editModel._id;
      this.svc.updateCustomerQuestionWorkFlow(id, payload).subscribe({ next: () => { this.displayDialog = false; this.load(); this.msg.add({ severity: 'success', summary: 'Updated' }); this.loading = false; }, error: (e: any) => { this.error = e?.message || 'Error'; this.loading = false; } });
    }
  }

  confirmDelete(item: any): void {
    this.confirm.confirm({ message: `Delete workflow #${item.id}?`, accept: () => {
      this.svc.deleteCustomerQuestionWorkFlow(item.id).subscribe({ next: () => { this.load(); this.msg.add({ severity: 'success', summary: 'Deleted' }); }, error: () => {} });
    } });
  }

  onGlobalFilter(dt: any, event: any): void { const v = event?.target?.value ?? event; if (dt?.filterGlobal) dt.filterGlobal(v, 'contains'); }
}
