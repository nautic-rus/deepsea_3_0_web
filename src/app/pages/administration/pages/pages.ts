import { Component, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { Checkbox } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { PagesService } from '../../../services/pages.service';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
  selector: 'app-admin-pages',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    RouterModule,
    ButtonModule,
    ToolbarModule,
    TableModule,
    InputTextModule,
    MultiSelectModule,
    Checkbox,
    ConfirmDialogModule,
    ToastModule,
    TagModule,
    DialogModule,
    FormsModule,
  ],
  providers: [ConfirmationService, MessageService],
  templateUrl: './pages.html',
  styleUrls: ['./pages.scss']
})
export class AdminPagesComponent implements OnInit {
  @ViewChild('dt') dt: any;

  pages: any[] = [];
  loading = false;
  selectedPages: any[] = [];
  displayDialog = false;
  isCreating = false;
  editModel: any = {};
  permissionsOptions: { label: string; value: any }[] = [];

  constructor(
    private http: HttpClient,
    private confirmation: ConfirmationService,
    private messageService: MessageService,
    private pagesService: PagesService,
    private cd: ChangeDetectorRef,
    private translate: TranslateService
  ) {}

  // Safe change-detection helper (mirrors pattern used in users component)
  private safeDetect(): void {
    try { this.cd.detectChanges(); } catch (e) { }
  }

  ngOnInit(): void {
    this.loadPages();
    this.loadPermissions();
  }

  loadPermissions(): void {
    this.pagesService.getPermissions().subscribe({
      next: (res: any) => {
        const items = (res && res.data) ? res.data : (Array.isArray(res) ? res : (res && res.items) ? res.items : []);
        // use permission id as value to work with page_permissions API
        this.permissionsOptions = (items || []).map((p: any) => ({ label: p.name || p.code || String(p.id), value: p.id }));
        this.safeDetect();
      },
      error: () => {
        this.permissionsOptions = [];
        this.safeDetect();
      }
    });
  }

  loadPages(): void {
    this.loading = true;
    this.pagesService.getPages().subscribe({
      next: (res: any) => {
        this.pages = (res && res.data) ? res.data : (Array.isArray(res) ? res : (res && res.items) ? res.items : []);
        this.loading = false;
        this.safeDetect();
      },
      error: () => {
        this.loading = false;
        this.messageService.add({severity: 'error', summary: this.translate.instant('MENU.CONFIRM') || 'Error', detail: 'Failed to load pages'});
        this.safeDetect();
      }
    });
  }

  openNew(): void {
    this.isCreating = true;
    this.editModel = { key: '', path: '', parent_id: null, main_menu: false, permissions: [] };
    this.displayDialog = true;
  }

  openEdit(page: any): void {
    this.isCreating = false;
    this.editModel = { ...page };
    // load linked permissions for this page to populate multiselect with ids
    this.pagesService.getPagePermissions(page.id).subscribe({
      next: (res: any) => {
        const items = (res && res.data) ? res.data : (Array.isArray(res) ? res : (res && res.items) ? res.items : []);
        try { this.editModel.permissions = (items || []).map((x: any) => x.permission_id); } catch (e) { this.editModel.permissions = []; }
        this.displayDialog = true;
        this.safeDetect();
      },
      error: () => {
        this.editModel.permissions = this.editModel.permissions || [];
        this.displayDialog = true;
        this.safeDetect();
      }
    });
  }

  savePage(): void {
    this.loading = true;
    const payload: any = { ...(this.editModel || {}) };
    payload.parent_id = payload.parent_id != null && payload.parent_id !== '' ? Number(payload.parent_id) : null;
    payload.main_menu = !!payload.main_menu;
    payload.permissions = payload.permissions || [];

    const finalize = (pageId: any) => {
      // sync permissions: get current page_permissions entries, then add/delete as needed
      this.pagesService.getPagePermissions(pageId).subscribe({
        next: (res2: any) => {
          const items = (res2 && res2.data) ? res2.data : (Array.isArray(res2) ? res2 : (res2 && res2.items) ? res2.items : []);
          const existingByPermId: Record<number, any> = {};
          (items || []).forEach((it: any) => { if (it && it.permission_id != null) existingByPermId[Number(it.permission_id)] = it; });

          const desired: number[] = (payload.permissions || []).map((p: any) => Number(p)).filter((n: any) => !isNaN(n));
          const toAdd = desired.filter((id: number) => !existingByPermId[id]);
          const toRemove = (items || []).filter((it: any) => desired.indexOf(Number(it.permission_id)) === -1).map((it: any) => it.id);

          // perform additions
          const adds = toAdd.map((permId: number) => this.pagesService.createPagePermission(pageId, permId).toPromise());
          // perform removals
          const removes = toRemove.map((ppId: number) => this.pagesService.deletePagePermission(ppId).toPromise());

          Promise.allSettled([...adds, ...removes]).then(() => {
            this.loading = false;
            this.displayDialog = false;
            this.messageService.add({severity: 'success', summary: 'Saved', detail: 'Page saved'});
            this.loadPages();
            this.safeDetect();
          });
        },
        error: () => {
          // even if sync failed, finish
          this.loading = false;
          this.displayDialog = false;
          this.messageService.add({severity: 'warning', summary: 'Saved', detail: 'Page saved, but failed to sync permissions'});
          this.loadPages();
          this.safeDetect();
        }
      });
    };

    if (this.isCreating) {
      this.pagesService.createPage(payload).subscribe({
        next: (res: any) => {
          const created = (res && res.data) ? res.data : res;
          const pageId = (created && created.id) ? created.id : (created && created.page && created.page.id) ? created.page.id : null;
          if (pageId == null) {
            // fallback: reload and return
            this.loading = false;
            this.displayDialog = false;
            this.messageService.add({severity: 'success', summary: 'Saved', detail: 'Page created'});
            this.loadPages();
            this.safeDetect();
            return;
          }
          finalize(pageId);
        },
        error: () => {
          this.loading = false;
          this.messageService.add({severity: 'error', summary: 'Error', detail: 'Failed to create page'});
          this.safeDetect();
        }
      });
    } else {
      const id = this.editModel.id;
      this.pagesService.updatePage(id, payload).subscribe({
        next: () => {
          // after update, sync permissions
          finalize(id);
        },
        error: () => {
          this.loading = false;
          this.messageService.add({severity: 'error', summary: 'Error', detail: 'Failed to update page'});
          this.safeDetect();
        }
      });
    }
  }

  confirmDelete(page: any): void {
    this.confirmation.confirm({
      message: 'Are you sure you want to delete this page?',
      accept: () => this.deletePage(page)
    });
  }

  deletePage(page: any): void {
    this.pagesService.deletePage(page.id).subscribe({
      next: () => {
        this.messageService.add({severity: 'success', summary: 'Deleted', detail: 'Page deleted'});
        this.loadPages();
        this.cd.detectChanges();
      },
      error: () => {
        this.messageService.add({severity: 'error', summary: 'Error', detail: 'Failed to delete page'});
        this.cd.detectChanges();
      }
    });
  }

  deleteSelectedPages(): void {
    if (!this.selectedPages || !this.selectedPages.length) return;
    this.confirmation.confirm({
      message: `Are you sure you want to delete ${this.selectedPages.length} selected pages?`,
      accept: () => {
        const deletes = this.selectedPages.map(p => this.pagesService.deletePage(p.id).toPromise());
        Promise.allSettled(deletes).then(() => {
          this.selectedPages = [];
          this.messageService.add({severity: 'success', summary: 'Deleted', detail: 'Selected pages deleted'});
          this.loadPages();
          this.cd.detectChanges();
        });
      }
    });
  }

  exportCSV(): void {
    if (this.dt && this.dt.exportCSV) this.dt.exportCSV();
  }

  onGlobalFilter(dt: any, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    dt.filterGlobal(value, 'contains');
  }
}
