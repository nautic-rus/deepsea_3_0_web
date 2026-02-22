import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { EditorModule } from 'primeng/editor';
import { Select } from 'primeng/select';
import { TreeSelectModule } from 'primeng/treeselect';
import { MultiSelectModule } from 'primeng/multiselect';
import { DatePickerModule } from 'primeng/datepicker';
import { CheckboxModule } from 'primeng/checkbox';
import { AvatarModule } from 'primeng/avatar';
import { TagModule } from 'primeng/tag';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ChipModule } from 'primeng/chip';
import { ToolbarModule } from 'primeng/toolbar';
import { SplitButtonModule } from 'primeng/splitbutton';
import { ToastModule } from 'primeng/toast';
import { MessageService, MenuItem } from 'primeng/api';
import { TranslateService } from '@ngx-translate/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { DocumentsService } from './documents.service';
import { NodeService } from '../../services/nodeservice';
import { DocumentsDetailAttachComponent } from './documents-detail-attach/documents-detail-attach';
import { DocumentsDetailRelationsTableComponent } from './documents-detail-relations-table';
import { DocumentsDetailChatComponent } from './documents-detail-chat/documents-detail-chat.component';
// Description and chat-history components are not used in this template; removed to avoid NG8113 warnings
 
@Component({
  selector: 'app-documents-detail',
  standalone: true,
  providers: [MessageService],
  imports: [CommonModule, TranslateModule, RouterModule, FormsModule, ButtonModule, DialogModule, InputTextModule, EditorModule, Select, MultiSelectModule, DatePickerModule, CheckboxModule, AvatarModule, TagModule, ProgressSpinnerModule, ChipModule, ToolbarModule, DocumentsDetailChatComponent, DocumentsDetailAttachComponent, DocumentsDetailRelationsTableComponent, SplitButtonModule, ToastModule, TreeSelectModule],
  templateUrl: './documents-detail.html',
  styleUrls: ['./documents-detail.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DocumentsDetailComponent implements OnInit {
  document: any = null;
  loading = false;
  error: string | null = null;
  displayDialog = false;
  editModel: any = {};
  isCreating = false;
  formErrors: any = {};
  documentId: any = null;
  statusOptions: { label: string; value: any }[] = [];
  statusMenuItems: MenuItem[] = [];
  statusSaving = false;
  // UI select options and relation/dialog state (partial parity with issues detail)
  projectOptions: { label: string; value: any; code?: string }[] = [];
  usersOptions: { label: string; value: any; avatar?: string | null }[] = [];
  typeOptions: { label: string; value: any }[] = [];
  priorityOptions: { label: string; value: any }[] = [];
  tagsOptions: { label: string; value: any }[] = [];
  directoryOptions: { label: string; value: any }[] = [];
  directoryTree: any[] = [];
  directoryPlaceholder: string = '';
  private pendingDirectoryKey: string | null = null;
  displayAddRelationDialog = false;
  relationForm: any = {
    selectedIssueIds: [],
    selectedDocumentIds: [],
    relationType: 'relates',
    direction: 'source'
  };
  relationTypeOptions: { label: string; value: any }[] = [];
  blocksDirectionOptions: { label: string; value: any }[] = [];
  availableIssuesOptions: { label: string; value: any }[] = [];
  availableDocumentsOptions: { label: string; value: any }[] = [];
  savingRelations = false;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);
  private translate = inject(TranslateService);
  private documentsService = inject(DocumentsService);
  private nodeService = inject(NodeService);

  constructor() {
    const idStr = this.route.snapshot.paramMap.get('id');
    if (idStr !== null) {
      const n = Number(idStr);
      this.documentId = Number.isFinite(n) ? n : idStr;
    } else {
      this.documentId = null;
    }
  }

  ngOnInit(): void {
    if (!this.documentId) {
      this.error = this.translate.instant('components.documents.errors.DOCUMENT_ID_MISSING') || 'Document id missing';
      return;
    }
    this.loadDocument(this.documentId);
    // preload common selects
    this.loadProjects();
    // preload document types
    this.loadTypes();
    // preload directories
    this.loadDirectories();
    this.priorityOptions = [
      { label: this.translate.instant('components.documents.priority.HIGH') || 'High', value: 'high' },
      { label: this.translate.instant('components.documents.priority.MEDIUM') || 'Medium', value: 'medium' },
      { label: this.translate.instant('components.documents.priority.LOW') || 'Low', value: 'low' }
    ];
    this.relationTypeOptions = [
      { label: 'components.documents.relations.FORM.TYPE_RELATES', value: 'relates' },
      { label: 'components.documents.relations.FORM.TYPE_BLOCKS', value: 'blocks' }
    ];
    this.blocksDirectionOptions = [
      { label: 'components.documents.relations.FORM.BLOCKS_ACTIVE', value: 'source' },
      { label: 'components.documents.relations.FORM.BLOCKS_PASSIVE', value: 'target' }
    ];
  }

  loadTypes(): void {
    this.http.get('/api/document_types').subscribe({
      next: (res: any) => {
        const items = (res && res.data) ? res.data : (res || []);
        this.typeOptions = (items || []).map((t: any) => ({ label: t.name || t.title || String(t.id), value: t.id }));
        if (!this.typeOptions.length) this.typeOptions = [];
        this.cdr.markForCheck();
      },
      error: (err: any) => { console.warn('Failed to load document types', err); this.typeOptions = []; this.cdr.markForCheck(); }
    });
  }

  async loadDirectories(): Promise<void> {
    try {
      const files = await this.nodeService.getFiles();
      // Normalize tree nodes to ensure labels/keys are strings (protect against unexpected shapes that break TreeSelect)
      const normalizeNode = (node: any): any => {
        if (!node) return node;
        // ensure key is string
        if (node.key === undefined || node.key === null) {
          const id = node?.data?.id ?? (node?.key ? Number(node.key) : null);
          node.key = (id !== null && id !== undefined) ? String(id) : (node.label ? String(node.label) : undefined);
        } else {
          node.key = String(node.key);
        }
        // normalize label to string
        let label = node.label ?? (node.data && (node.data.name ?? node.data.title)) ?? '';
        if (label === null || label === undefined) label = '';
        if (typeof label !== 'string') {
          try { label = JSON.stringify(label); } catch (e) { label = String(label); }
        }
        node.label = label;
        // normalize children recursively
        if (node.children && Array.isArray(node.children)) {
          node.children = node.children.map((c: any) => normalizeNode(c));
        }
        return node;
      };
      const filesClean = (files || []).map((n: any) => normalizeNode(n));
      const out: { label: string; value: any }[] = [];

      const traverse = (node: any, ancestors: string[]) => {
        const id = node?.data?.id ?? (node?.key ? Number(node.key) : null);
        const name = (node.label || (node.data && node.data.name) || '').toString();
        const pathParts = ancestors.slice();
        if (name) pathParts.push(name);
        const path = pathParts.join('/');
        const label = (id !== null && id !== undefined) ? `ID ${String(id)} - ${path}` : `${path}`;
        // Keep option values as strings (PrimeNG TreeSelect uses string keys internally)
        out.push({ label, value: String(id) });
        if (node.children && Array.isArray(node.children)) {
          for (const c of node.children) traverse(c, pathParts);
        }
      };

  // keep tree for TreeSelect and also provide flattened options for other parts
  this.directoryTree = files || [];
  for (const r of (filesClean || [])) traverse(r, []);
  this.directoryTree = filesClean || [];
      this.directoryOptions = out;
      this.cdr.markForCheck();

      // Update placeholder to show path for current selection if any
      try {
        if (this.editModel && this.editModel.directory_id) {
          this.directoryPlaceholder = this.getPathForDirectoryValue(this.editModel.directory_id);
        } else if (this.pendingDirectoryKey) {
          this.directoryPlaceholder = this.getPathForDirectoryValue(this.pendingDirectoryKey);
        } else {
          this.directoryPlaceholder = '';
        }
      } catch (e) { this.directoryPlaceholder = ''; }

      // If there was a pending directory selection (document specified directory_id before tree loaded), ensure it's present in the tree and select it
      if (this.pendingDirectoryKey) {
        const key = this.pendingDirectoryKey;
        const idNum = Number(key);
        // directoryOptions values are strings now, compare as strings
        const inFlatNow = (this.directoryOptions || []).some(d => d && String(d.value) === String(idNum));
        const findNodeById = (n: any): boolean => {
          if (!n) return false;
          const id = n?.data?.id ?? (n?.key ? Number(n.key) : null);
          if (String(id) === String(idNum)) return true;
          if (n.children && Array.isArray(n.children)) {
            for (const c of n.children) if (findNodeById(c)) return true;
          }
          return false;
        };
        const inTreeNow = (this.directoryTree || []).some(findNodeById);
        if (!inFlatNow) {
          this.directoryOptions = [{ label: `ID ${String(idNum)}`, value: String(idNum) }, ...(this.directoryOptions || [])];
        }
        if (!inTreeNow) {
          const node = { key: String(idNum), label: `ID ${String(idNum)}`, data: { id: idNum, name: `ID ${String(idNum)}` }, children: [] };
          this.directoryTree = [node, ...(this.directoryTree || [])];
        }
        // find the actual TreeNode object in the tree and set it as the model value
        const findNodeRef = (n: any): any => {
          if (!n) return null;
          const id = n?.data?.id ?? (n?.key ? Number(n.key) : null);
          if (String(id) === String(idNum)) return n;
          if (n.children && Array.isArray(n.children)) {
            for (const c of n.children) {
              const r = findNodeRef(c);
              if (r) return r;
            }
          }
          return null;
        };
        const nodeRef = (this.directoryTree || []).map((n: any) => findNodeRef(n)).find(Boolean) || null;
        this.editModel = this.editModel || {};
        this.editModel.directory_id = nodeRef || { key: String(idNum), data: { id: idNum }, label: `ID ${String(idNum)}` };
        try { this.directoryPlaceholder = this.getPathForDirectoryValue(this.editModel.directory_id); } catch (e) { this.directoryPlaceholder = ''; }
        this.pendingDirectoryKey = null;
        this.cdr.markForCheck();
      }
    } catch (e) {
      console.warn('Failed to load directories', e);
      this.directoryOptions = [];
      this.cdr.markForCheck();
    }
  }

  openEditDialog(): void {
    if (!this.document) return;

    // Start with a shallow copy of document and then normalize expected form fields
    this.editModel = { ...(this.document || {}) };

    // Normalize identifiers to simple scalar values expected by selects
    this.editModel.project_id = this.document?.project_id ?? this.document?.project ?? this.editModel.project_id ?? null;
    this.editModel.type_id = this.document?.type_id ?? this.document?.type ?? this.editModel.type_id ?? null;
  // Don't pre-set directory_id here; defer to the tree loading logic so TreeSelect shows placeholder until tree is ready
  this.editModel.directory_id = null;
    this.editModel.assignee_id = this.document?.assignee_id ?? (this.document?.assignee && (this.document.assignee.id ?? this.document.assignee_id)) ?? this.editModel.assignee_id ?? null;
    this.editModel.priority = this.document?.priority ?? this.editModel.priority ?? null;
    this.editModel.estimated_hours = (this.document?.estimated_hours != null) ? Number(this.document.estimated_hours) : this.editModel.estimated_hours ?? null;
    this.editModel.code = this.document?.code ?? this.editModel.code ?? null;
    this.editModel.stage_id = this.document?.stage_id ?? this.editModel.stage_id ?? null;
    this.editModel.status_id = this.document?.status_id ?? this.editModel.status_id ?? null;
    this.editModel.specialization_id = this.document?.specialization_id ?? this.editModel.specialization_id ?? null;

    // normalize due_date to Date object for the datepicker
    if (this.editModel.due_date) {
      try {
        const d = this.editModel.due_date instanceof Date ? this.editModel.due_date : new Date(this.editModel.due_date);
        this.editModel.due_date = !isNaN(d.getTime()) ? d : null;
      } catch (e) { this.editModel.due_date = null; }
    }

    this.editModel.tag_select = Array.isArray(this.document?.tags) ? [...this.document.tags] : [];
    this.editModel.tags_custom = [];
    this.tagsOptions = (this.document && Array.isArray(this.document.tags)) ? (this.document.tags || []).map((t: any) => ({ label: t, value: t })) : [];

    // Ensure select lists are loaded so the current values display correctly
    if (!this.typeOptions || !this.typeOptions.length) this.loadTypes();
    if (!this.directoryTree || !this.directoryTree.length) this.loadDirectories();
    if (!this.projectOptions || !this.projectOptions.length) this.loadProjects();
    if (!this.usersOptions || !this.usersOptions.length) this.loadProjects(); // projects loader also populates usersOptions

  // Ensure assignee value is taken from server field 'assigne_to' (some responses use this name)
    const assigneeId = this.document?.assigne_to ?? this.document?.assignee_id ?? this.document?.assigneTo ?? null;
    if (assigneeId != null) {
      // If usersOptions doesn't contain the current assignee (e.g. not part of projects), add a fallback option
      const exists = (this.usersOptions || []).some(u => u && u.value === assigneeId);
      if (!exists) {
        const label = this.document?.assigne_name ?? this.document?.assignee_name ?? String(assigneeId);
        let avatar: string | null = null;
        const aid = this.document?.assigne_avatar_id ?? this.document?.assignee_avatar_id ?? this.document?.assigneAvatarId ?? null;
        try { if (aid !== null && aid !== undefined && String(aid).trim()) avatar = `/api/storage/${String(aid).trim()}/download`; } catch (e) { avatar = null; }
        this.usersOptions = [{ label, value: assigneeId, avatar }, ...(this.usersOptions || [])];
      }
      this.editModel.assignee_id = assigneeId;
    }

    // Ensure directory is present in the tree; if backend returns a directory_id not present in the loaded tree, defer adding fallback until directories are loaded
    const dirId = this.document?.directory_id ?? (this.document?.directory && (this.document.directory.id ?? this.document.directory_id)) ?? null;
  console.log('openEditDialog: document.directory_id=', dirId, 'current directoryTree length=', this.directoryTree?.length);
    if (dirId != null) {
      // If tree already loaded, immediately ensure the node exists and set the selection. Otherwise remember pending key and let loadDirectories handle it when it finishes.
      if (this.directoryTree && this.directoryTree.length) {
        // directoryOptions values are strings; compare as strings
        const inFlat = (this.directoryOptions || []).some(d => d && String(d.value) === String(dirId));
        const inTree = (this.directoryTree || []).some(function findNode(n: any) {
          if (!n) return false;
          const id = n?.data?.id ?? (n?.key ? Number(n.key) : null);
          if (String(id) === String(dirId)) return true;
          if (n.children && Array.isArray(n.children)) {
            for (const c of n.children) if ((findNode as any)(c)) return true;
          }
          return false;
        });
        if (!inFlat) {
          this.directoryOptions = [{ label: `ID ${String(dirId)}`, value: String(dirId) }, ...(this.directoryOptions || [])];
        }
        if (!inTree) {
          const node = { key: String(dirId), label: `ID ${String(dirId)}`, data: { id: dirId, name: `ID ${String(dirId)}` }, children: [] };
          this.directoryTree = [node, ...(this.directoryTree || [])];
        }
        // Find matching TreeNode object and set model to the node (PrimeNG TreeSelect expects node objects)
        const findNodeRef = (n: any): any => {
          if (!n) return null;
          const id = n?.data?.id ?? (n?.key ? Number(n.key) : null);
          if (String(id) === String(dirId)) return n;
          if (n.children && Array.isArray(n.children)) {
            for (const c of n.children) {
              const r = findNodeRef(c);
              if (r) return r;
            }
          }
          return null;
        };
        const nodeRef = (this.directoryTree || []).map((n: any) => findNodeRef(n)).find(Boolean) || null;
        this.editModel.directory_id = nodeRef || { key: String(dirId), data: { id: dirId }, label: `ID ${String(dirId)}` };
        console.log('openEditDialog: set editModel.directory_id to node object, typeof=', typeof this.editModel.directory_id, 'topKeys=', (this.directoryTree || []).map((n: any) => n && n.key));
        try { this.directoryPlaceholder = this.getPathForDirectoryValue(this.editModel.directory_id); } catch (e) { this.directoryPlaceholder = ''; }
      } else {
        this.pendingDirectoryKey = String(dirId);
        console.log('openEditDialog: deferred setting directory, pendingDirectoryKey=', this.pendingDirectoryKey);
      }
    }

    this.isCreating = false;
    this.displayDialog = true;
    this.cdr.markForCheck();
  }

  // Called when TreeSelect model changes (user selects a directory). Accepts either a TreeNode object or a primitive key.
  onDirectoryNgModelChange(value: any): void {
    try {
      this.directoryPlaceholder = this.getPathForDirectoryValue(value);
    } catch (e) {
      this.directoryPlaceholder = '';
    }
    this.cdr.markForCheck();
  }

  // Resolve path (dir/dir/...) for a given TreeSelect value which may be:
  // - a TreeNode object { key, label, data }
  // - a primitive key/string/number
  private getPathForDirectoryValue(value: any): string {
    if (!value) return '';
    // If it's a node object, extract key
    let key: string | null = null;
    if (typeof value === 'object') {
      if (value.key !== undefined && value.key !== null) key = String(value.key);
      else if (value.data && (value.data.id !== undefined && value.data.id !== null)) key = String(value.data.id);
    } else {
      key = String(value);
    }
    if (!key) return '';
    // First try to locate the precomputed flattened option label which already contains full path
    try {
      const found = (this.directoryOptions || []).find(d => d && String(d.value) === String(key));
      if (found && found.label) {
        // label format used in traverse(): "ID <id> - parent/child/..."
        const parts = String(found.label).split(' - ');
        if (parts.length > 1) return parts[1];
        // fallback to the whole label if no ' - ' separator
        return String(found.label);
      }
    } catch (e) {
      // ignore and fall back to tree traversal
    }

    // Find path by traversing tree
    const findPath = (nodes: any[], targetKey: string, ancestors: string[] = []): string[] | null => {
      if (!nodes) return null;
      for (const n of nodes) {
        const id = n?.data?.id ?? (n?.key ? String(n.key) : null);
        const name = (n?.data && (n.data.name || n.data.title)) ?? n?.label ?? '';
        const nextAnc = [...ancestors];
        if (name) nextAnc.push(String(name));
        if (String(id) === String(targetKey) || String(n?.key) === String(targetKey)) return nextAnc;
        if (n.children && Array.isArray(n.children)) {
          const r = findPath(n.children, targetKey, nextAnc);
          if (r) return r;
        }
      }
      return null;
    };

    const pathParts = findPath(this.directoryTree || [], key) || [];
    return pathParts.join('/');
  }


  loadProjects(): void {
    this.http.get('/api/my_projects').subscribe({
      next: (res: any) => {
        const items = (res && res.data) ? res.data : (res || []);
        this.projectOptions = (items || []).map((p: any) => ({ label: ((p.code || p.key) ? ('[' + (p.code || p.key) + '] ') : '') + (p.name || p.title || String(p.id)), value: p.id, code: p.code || p.key || '' }));
        const map = new Map<number | string, { label: string; value: any; avatar?: string | null }>();
        for (const p of (items || [])) {
          const parts = p.participants || [];
          for (const part of (parts || [])) {
            const id = part.id;
            if (id == null) continue;
            const label = part.full_name || part.fullName || part.name || part.email || String(id);
            let avatar: string | null = null;
            if (part.avatar_url || part.avatar || part.avatarUrl) {
              avatar = part.avatar_url || part.avatar || part.avatarUrl || null;
            } else if (part.avatar_id || part.avatarId) {
              const aid = part.avatar_id ?? part.avatarId;
              try { if (typeof aid === 'number' || (typeof aid === 'string' && String(aid).trim())) avatar = `/api/storage/${String(aid).trim()}/download`; } catch (e) { avatar = null; }
            }
            if (!map.has(id)) map.set(id, { label, value: id, avatar });
          }
        }
        this.usersOptions = Array.from(map.values());
        this.cdr.markForCheck();
      },
      error: (err: any) => { console.warn('Failed to load projects', err); this.projectOptions = []; this.usersOptions = []; this.cdr.markForCheck(); }
    });
  }

  validateDocumentForm(): boolean {
    this.formErrors = {};
    if (!this.editModel || !this.editModel.title || !String(this.editModel.title).trim()) this.formErrors.title = this.translate.instant('components.documents.form.TITLE_REQUIRED') || 'Title is required';
    return Object.keys(this.formErrors).length === 0;
  }

  saveDocument(): void {
    if (!this.editModel) return;
    const id = this.editModel.id != null ? this.editModel.id : (this.document && this.document.id) || null;
    const selected = Array.isArray(this.editModel.tag_select) ? this.editModel.tag_select : [];
    const custom = Array.isArray(this.editModel.tags_custom) ? this.editModel.tags_custom : [];
    const combinedTags = Array.from(new Set([...selected, ...custom]));
    const payload: any = {
      project_id: (this.editModel.project_id != null && this.editModel.project_id !== '') ? Number(this.editModel.project_id) : 0,
      title: String(this.editModel.title || ''),
      description: (this.editModel.description != null) ? String(this.editModel.description) : '',
      tags: combinedTags
    };
    if (!this.validateDocumentForm()) return;
    this.loading = true;
    // If id is present, use PUT /api/documents/{id} to update; otherwise create via POST
    let op$: any = null;
    if (id != null) {
      // Build PUT payload with server-expected keys. Only include changed keys from this list.
      const serverKeys = ['title', 'project_id', 'stage_id', 'status_id', 'type_id', 'specialization_id', 'directory_id', 'assigne_to', 'code', 'priority', 'due_date', 'estimated_hours'];
      const changedPayload: any = {};
      for (const key of serverKeys) {
        try {
          // map local editModel keys to server key names
          let newVal: any = null;
          let oldVal: any = null;
          let skipDefaultNormalization = false;
          switch (key) {
            case 'assigne_to':
              newVal = this.editModel.assignee_id ?? this.editModel.assigne_to ?? this.editModel.assigneTo ?? null;
              oldVal = this.document?.assigne_to ?? this.document?.assignee_id ?? this.document?.assigneTo ?? null;
              break;
            case 'directory_id':
              // tree select or other widgets may return an object; normalize to numeric id when possible
              newVal = this.editModel.directory_id ?? this.editModel.directory ?? null;
              oldVal = this.document?.directory_id ?? (this.document?.directory && (this.document.directory.id ?? this.document.directory_id)) ?? null;
              if (newVal && typeof newVal === 'object') {
                if (newVal.data && (newVal.data.id !== undefined && newVal.data.id !== null)) newVal = newVal.data.id;
                else if (newVal.id !== undefined && newVal.id !== null) newVal = newVal.id;
                else if (newVal.value !== undefined && newVal.value !== null) newVal = newVal.value;
                else if (newVal.key !== undefined && newVal.key !== null) newVal = newVal.key;
              }
              if (typeof newVal === 'string') {
                const m = /^ID\s*(\d+)$/i.exec(newVal.trim());
                if (m) newVal = Number(m[1]);
              }
              break;
            case 'priority':
              newVal = this.editModel.priority ?? null;
              oldVal = this.document?.priority ?? null;
              // keep as string or null; skip numeric normalization
              skipDefaultNormalization = true;
              break;
            case 'estimated_hours':
              newVal = this.editModel.estimated_hours ?? null;
              oldVal = this.document?.estimated_hours ?? null;
              // we'll normalize numeric below but avoid the generic id-path which treats values as identifiers
              // let default path handle numeric conversion; do not set skipDefaultNormalization for number conversion
              break;
            case 'due_date':
              newVal = this.editModel.due_date ?? null;
              oldVal = this.document?.due_date ?? null;
              // Normalize date to ISO string when possible
              if (newVal !== null && newVal !== undefined) {
                try {
                  const dObj = (newVal instanceof Date) ? newVal : new Date(newVal);
                  if (!isNaN(dObj.getTime())) newVal = dObj.toISOString(); else newVal = null;
                } catch (e) { newVal = null; }
              }
              // Ensure oldVal is comparable: if oldVal is a date-like value, convert to ISO string
              if (oldVal !== null && oldVal !== undefined) {
                try {
                  const od = (oldVal instanceof Date) ? oldVal : new Date(oldVal);
                  if (!isNaN(od.getTime())) oldVal = od.toISOString();
                } catch (e) { /* keep original */ }
              }
              skipDefaultNormalization = true;
              break;
            default:
              newVal = this.editModel[key];
              oldVal = this.document ? (this.document[key] ?? null) : null;
          }

          // Normalize values for specific keys
          if (!skipDefaultNormalization) {
            if (key === 'title' || key === 'code') {
              newVal = newVal == null ? null : String(newVal);
            } else if (key === 'estimated_hours') {
              if (newVal === '' || newVal === undefined) newVal = null;
              if (newVal !== null) {
                const num = Number(newVal);
                if (Number.isFinite(num)) newVal = num;
                else {
                  try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.SAVE') || 'Invalid', detail: `Invalid value for ${key}` }); } catch (e) {}
                  this.loading = false; this.cdr.markForCheck(); return;
                }
              }
            } else {
              // default behavior for identifier-like keys: normalize to numbers or null
              if (newVal === '' || newVal === undefined) newVal = null;
              if (newVal !== null) {
                const num = Number(newVal);
                if (Number.isFinite(num)) newVal = num;
                else {
                  try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.SAVE') || 'Invalid', detail: `Invalid value for ${key}` }); } catch (e) {}
                  this.loading = false; this.cdr.markForCheck(); return;
                }
              }
            }
          }

          // Compare and include only changed values
          const equal = (newVal === oldVal) || (newVal == null && oldVal == null);
          if (!equal) changedPayload[key] = newVal;
        } catch (e) { /* ignore per-field errors */ }
      }

      if (Object.keys(changedPayload).length === 0) {
        // nothing to update
        this.loading = false;
        this.displayDialog = false;
        this.cdr.markForCheck();
        try { this.messageService.add({ severity: 'info', summary: this.translate.instant('MENU.SAVE') || 'No changes', detail: this.translate.instant('components.documents.messages.SAVED') || '' }); } catch (e) {}
        return;
      }

      // Use PUT /api/documents/{id} with validated payload
      op$ = this.documentsService.updateDocument(id as any, changedPayload);
    } else {
      op$ = this.documentsService.createDocument(payload);
    }
    op$.subscribe({
      next: (res: any) => {
        // If we created a new document, try to extract the new id from response
        const newId = (res && (res.data || res).id) ? ((res.data || res).id) : id;
        this.loadDocument(newId);
        this.displayDialog = false;
        this.loading = false;
        this.cdr.markForCheck();
        try {
          this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.SAVE') || 'Saved', detail: this.translate.instant('components.documents.form.UPDATED') || 'Updated' });
        } catch (e) {}
      },
      error: (err: any) => {
        console.error('Failed to save document', err);
        this.loading = false;
        this.cdr.markForCheck();
        try {
          this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.SAVE') || 'Save failed', detail: (err && err.message) ? err.message : this.translate.instant('components.documents.messages.ERROR') || 'Failed to save' });
        } catch (e) {}
      }
    });
  }

  // Helper utilities used by the template (avatar initials, colors, severities)
  initialsFromName(name?: string): string {
    if (!name) return '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  personInitials(name?: string): string { return this.initialsFromName(name); }

  assigneeInitials(): string { return this.initialsFromName(this.editModel?.assignee_name || this.editModel?.assignee || ''); }

  selectAvatarBg(label?: string): string { // deterministic pastel color
    try {
      const s = String(label || '').split('').reduce((a, b) => a + b.charCodeAt(0), 0);
      const h = s % 360;
      return `hsl(${h}deg 60% 50%)`;
    } catch (e) { return '#999'; }
  }

  selectAvatarTextColor(_label?: string): string { return '#fff'; }

  issueAvatarColor(_user?: any): string | undefined { return undefined; }
  issueAvatarTextColor(_user?: any): string | undefined { return undefined; }

  

  /**
   * Shorten a full name into "Surname I.O." style (same as chat component).
   * Assumes surname is the first token and uses initials for subsequent parts.
   */
  shortName(name?: string): string {
    if (!name) return '';
    try {
      const cleaned = String(name).replace(/,/g, ' ').trim();
      const parts = cleaned.split(/\s+/).filter(Boolean);
      if (!parts.length) return '';
      if (parts.length === 1) return parts[0];
      const surname = parts[0];
      const initials = parts.slice(1, 3).map(p => p && p[0] ? p[0].toUpperCase() + '.' : '').join('');
      return `${surname} ${initials}`.trim();
    } catch (e) { return String(name); }
  }

  // use chat-style shortName for display
  formatSurnameInitials(name?: string): string { return this.shortName(name); }

  prioritySeverity(priority: any): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | null {
    try {
      if (!priority && priority !== 0) return 'info';
      const p = String(priority).toLowerCase();
      if (p === 'high' || p === 'urgent' || p === 'critical') return 'danger';
      if (p === 'medium' || p === 'normal') return 'warn';
      if (p === 'low' || p === 'minor') return 'success';
      return 'info';
    } catch (e) { return 'info'; }
  }

  statusSeverity(status: any): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | null {
    try {
      if (status === null || status === undefined) return 'secondary';
      const s = String(status).toLowerCase();
      if (s === 'resolved' || s === 'done' || s === 'closed' || s === 'fixed') return 'success';
      if (s.includes('progress') || s.includes('in progress') || s.includes('in_progress') || s.includes('review')) return 'warn';
      if (s === 'new' || s === 'open' || s === 'todo' || s === 'backlog') return 'info';
      if (s === 'blocked' || s === 'rejected' || s === 'cancelled' || s === 'canceled' || s === 'failed') return 'danger';
      return 'secondary';
    } catch (e) { return 'secondary'; }
  }

  loadDocument(id: any): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.documentsService.getDocument(id).subscribe({
      next: (res: any) => {
        const data = (res && res.data) ? res.data : res;
        // Assign and normalize server response to UI-friendly fields
        this.document = data || {};
        try {
          // Normalize author/creator fields (server may use created_* names)
          if (!this.document.author_name) this.document.author_name = this.document.created_name ?? this.document.createdBy ?? this.document.created_by;
          if (!this.document.author_id) this.document.author_id = this.document.created_by ?? this.document.createdBy ?? this.document.author_id;
          const createdAvatarId = this.document.created_avatar_id ?? this.document.createdAvatarId ?? this.document.created_avatar;
          if (createdAvatarId && !this.document.author_avatar_url) this.document.author_avatar_url = `/api/storage/${String(createdAvatarId)}/download`;

          // Normalize assignee fields (server sometimes uses 'assigne_' misspelling)
          if (!this.document.assignee_name) this.document.assignee_name = this.document.assigne_name ?? this.document.assignee_name ?? this.document.assignee;
          if (!this.document.assignee_id) this.document.assignee_id = this.document.assigne_to ?? this.document.assignee_id ?? this.document.assigne_to ?? this.document.assignee;
          const assigneAvatarId = this.document.assigne_avatar_id ?? this.document.assignee_avatar_id ?? this.document.assigneAvatarId ?? this.document.assignee_avatar;
          if (assigneAvatarId && !this.document.assignee_avatar_url) this.document.assignee_avatar_url = `/api/storage/${String(assigneAvatarId)}/download`;

          // Some templates expect directory_id and other aliases to be present as-is
          if (this.document.directory_id === undefined && this.document.directory && (this.document.directory.id !== undefined)) {
            this.document.directory_id = this.document.directory.id;
          }
          // Ensure priority_text is present for templates that display a human readable priority
          try {
            if ((this.document.priority_text === undefined || this.document.priority_text === null) && (this.document.priority !== undefined)) {
              const p = this.document.priority;
              if (p !== null && p !== undefined && String(p).trim() !== '') {
                const key = `components.documents.priority.${String(p).toUpperCase()}`;
                const txt = this.translate.instant(key);
                this.document.priority_text = (txt && txt !== key) ? txt : String(p);
              } else {
                this.document.priority_text = null;
              }
            }
          } catch (e) { /* ignore translation errors */ }
        } catch (e) { /* defensive: keep original data if normalization fails */ }
        this.loading = false;
        // Build status menu from document.allowed_statuses if present.
        // expected shape: allowed_statuses: [{ id: 1, code: 'new', name: 'Новый' }, ...]
        const allowed = (this.document && this.document.allowed_statuses) ? this.document.allowed_statuses : null;
        if (Array.isArray(allowed) && allowed.length) {
          this.statusOptions = allowed.map((s: any) => ({ label: s.name || s.label || String(s.code), value: (s.id !== undefined && s.id !== null) ? s.id : s.code }));
          this.statusMenuItems = this.statusOptions.map(o => ({ label: o.label, command: () => this.changeStatus(o.value) }));
        } else {
          this.statusOptions = [];
          this.statusMenuItems = [];
        }
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.error = (err && err.message) ? err.message : this.translate.instant('components.documents.errors.FAILED_LOAD');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  changeStatus(statusId: any): void {
    if (!this.document || !this.document.id) return;
    this.statusSaving = true;
    this.cdr.markForCheck();
    this.documentsService.updateDocument(this.document.id, { status_id: statusId }).subscribe({
      next: (_res: any) => {
        // After changing status, re-fetch the document to get authoritative fields including allowed_statuses
        this.documentsService.getDocument(this.document.id).subscribe({
          next: (fetchRes: any) => {
            const data = (fetchRes && fetchRes.data) ? fetchRes.data : fetchRes;
            this.document = data;

            // rebuild statusOptions/statusMenuItems from document.allowed_statuses
            const allowed = (this.document && this.document.allowed_statuses) ? this.document.allowed_statuses : null;
            if (Array.isArray(allowed) && allowed.length) {
              this.statusOptions = allowed.map((s: any) => ({ label: s.name || s.label || String(s.code), value: (s.id !== undefined && s.id !== null) ? s.id : s.code }));
              this.statusMenuItems = this.statusOptions.map(o => ({ label: o.label, command: () => this.changeStatus(o.value) }));
            } else {
              this.statusOptions = [];
              this.statusMenuItems = [];
            }

            this.statusSaving = false;
            this.cdr.markForCheck();
            try { this.messageService.add({ severity: 'success', summary: this.trOr('components.documents.messages.SUCCESS', 'Success'), detail: this.trOr('components.documents.messages.STATUS_UPDATED', 'Status updated') }); } catch (e) {}
          },
          error: (fetchErr: any) => {
            console.warn('Failed to refresh document after status change', fetchErr);
            this.statusSaving = false;
            this.cdr.markForCheck();
            try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.documents.messages.ERROR') || 'Error', detail: this.translate.instant('components.documents.messages.STATUS_UPDATE_FAILED') || 'Failed to update status' }); } catch (e) {}
          }
        });
      },
      error: (err: any) => {
        this.statusSaving = false;
        this.cdr.markForCheck();
        try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.documents.messages.ERROR') || 'Error', detail: (err && err.message) ? err.message : this.translate.instant('components.documents.messages.STATUS_UPDATE_FAILED') || 'Failed to update status' }); } catch (e) {}
      }
    });
  }

  back(): void {
    this.router.navigate(['/documents']);
  }

  /**
   * Copy the current document URL to clipboard and show a toast notification.
   * Stops event propagation so row clicks / navigation won't trigger.
   */
  copyDocumentLink(event?: Event): void {
    try {
      if (event && typeof (event.stopPropagation) === 'function') event.stopPropagation();
      const id = this.document?.id ?? this.documentId;
      if (!id) {
        try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.documents.messages.ERROR') || 'Error', detail: this.translate.instant('components.documents.errors.DOCUMENT_ID_MISSING') || 'Document id missing' }); } catch (e) {}
        return;
      }
      const url = `${window.location.origin}/documents/${id}`;
      // Use Clipboard API when available
      if (navigator && (navigator as any).clipboard && typeof (navigator as any).clipboard.writeText === 'function') {
        (navigator as any).clipboard.writeText(url).then(() => {
          try { this.messageService.add({ severity: 'success', summary: this.translate.instant('components.documents.messages.COPY_LINK') || 'Copied', detail: this.translate.instant('components.documents.messages.LINK_COPIED') || 'Link copied to clipboard' }); } catch (e) {}
        }).catch((_err: any) => {
          // fallback to prompt
          try { window.prompt(this.translate.instant('components.documents.messages.COPY_PROMPT') || 'Copy link', url); } catch (e) {}
        });
      } else {
        try { window.prompt(this.translate.instant('components.documents.messages.COPY_PROMPT') || 'Copy link', url); } catch (e) {}
      }
    } catch (e) {
      try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.documents.messages.ERROR') || 'Error', detail: String(e) }); } catch (er) {}
    } finally {
      try { this.cdr.markForCheck(); } catch (e) {}
    }
  }

  // Open add-relation dialog (triggered from child relations table)
  openAddRelationDialog(): void {
    if (!this.document || !this.document.project_id) {
      // try to fall back to document.project
      if (!this.document || !this.document.project) {
        this.displayAddRelationDialog = true;
        this.loadAvailableTargets(null);
        return;
      }
    }
    this.displayAddRelationDialog = true;
    const projectId = this.document.project_id ?? this.document.project ?? null;
    this.loadAvailableTargets(projectId);
  }

  // Load issues and documents belonging to the same project to populate multi-selects
  private loadAvailableTargets(projectId: any | null): void {
    // Build params
    let paramsIssues = new HttpParams();
    let paramsDocuments = new HttpParams();
    if (projectId != null) {
      paramsIssues = paramsIssues.set('project_id', String(projectId));
      paramsDocuments = paramsDocuments.set('project_id', String(projectId));
    }
    // Optional: increase page size to get many items in one call (backend may ignore)
    paramsIssues = paramsIssues.set('per_page', '200');
    paramsDocuments = paramsDocuments.set('per_page', '200');

    const reqIssues = this.http.get('/api/issues', { params: paramsIssues }).pipe();
    const reqDocs = this.http.get('/api/documents', { params: paramsDocuments }).pipe();

    forkJoin([reqIssues, reqDocs]).subscribe({
      next: ([resIssues, resDocs]: any) => {
        try {
          const extract = (r: any) => Array.isArray(r) ? r : (r && (r.data || r.items) ? (r.data || r.items) : []);
          const issues = extract(resIssues) as any[];
          const docs = extract(resDocs) as any[];
          this.availableIssuesOptions = (issues || []).map((it: any) => ({ label: `#${it.id} ${it.title || it.summary || it.name || ''}`.trim(), value: it.id }));
          this.availableDocumentsOptions = (docs || []).map((d: any) => ({ label: `#${d.id} ${d.title || d.name || ''}`.trim(), value: d.id }));
        } catch (e) {
          this.availableIssuesOptions = [];
          this.availableDocumentsOptions = [];
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.warn('Failed to load available relation targets', err);
        this.availableIssuesOptions = [];
        this.availableDocumentsOptions = [];
        this.cdr.markForCheck();
      }
    });
  }

  // Save relations: create link records for each selected target.
  // New backend contract: POST /api/links accepts
  // { active_type, active_id, passive_type, passive_id, relation_type }
  saveRelations(): void {
    if (!this.document || !this.document.id) return;
    const sourceId = Number(this.document.id);
    const tasks: any[] = [];
    const type = this.relationForm.relationType || 'relates';

    // helper to push a POST observable for a given pair
    const buildPayload = (srcType: string, srcId: any, tgtType: string, tgtId: any) => ({
      active_type: srcType,
      active_id: srcId,
      passive_type: tgtType,
      passive_id: tgtId,
      relation_type: type
    });

    // For issues selected
    for (const id of (this.relationForm.selectedIssueIds || [])) {
      if (!id) continue;
      if (type === 'blocks') {
        if (this.relationForm.direction === 'source') {
          // current document blocks selected issue -> current is source
          tasks.push(this.http.post('/api/links', buildPayload('document', sourceId, 'issue', id)));
        } else {
          // selected issue blocks current -> selected is source
          tasks.push(this.http.post('/api/links', buildPayload('issue', id, 'document', sourceId)));
        }
      } else {
        // relates - directionless; create link with current as source for consistency
        tasks.push(this.http.post('/api/links', buildPayload('document', sourceId, 'issue', id)));
      }
    }

    // For documents selected
    for (const id of (this.relationForm.selectedDocumentIds || [])) {
      if (!id) continue;
      if (type === 'blocks') {
        if (this.relationForm.direction === 'source') {
          // current document blocks document: current is source, document target
          tasks.push(this.http.post('/api/links', buildPayload('document', sourceId, 'document', id)));
        } else {
          // document blocks current -> document as source
          tasks.push(this.http.post('/api/links', buildPayload('document', id, 'document', sourceId)));
        }
      } else {
        tasks.push(this.http.post('/api/links', buildPayload('document', sourceId, 'document', id)));
      }
    }

    if (!tasks.length) {
      // nothing to save
      this.displayAddRelationDialog = false;
      return;
    }

    this.savingRelations = true;
    forkJoin(tasks).subscribe({
      next: (_res) => {
        this.savingRelations = false;
        this.displayAddRelationDialog = false;
        // refresh the document to pick up new relations
        this.loadDocument(this.document.id);
        this.cdr.markForCheck();
        try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.SAVE') || 'Saved', detail: this.translate.instant('components.documents.relations.FORM.SAVED') || 'Relations created' }); } catch (e) {}
      },
      error: (err) => {
        console.error('Failed to save relations', err);
        this.savingRelations = false;
        this.cdr.markForCheck();
        try { this.messageService.add({ severity: 'error', summary: this.translate.instant('components.documents.messages.ERROR'), detail: (err && err.message) ? err.message : this.translate.instant('components.documents.messages.ERROR') }); } catch (e) {}
      }
    });
  }

  // Safe translate helper: when ngx-translate hasn't loaded a key it returns the key string itself,
  // so detect that and return a provided fallback instead.
  private trOr(key: string, fallback: string): string {
    try {
      const v = this.translate.instant(key);
      if (!v || v === key) return fallback;
      return v;
    } catch (e) { return fallback; }
  }

}
