import { Component, OnInit, inject, signal, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { TreeModule } from 'primeng/tree';
import { NodeService } from '../../services/nodeservice';
import { TreeNode, MenuItem } from 'primeng/api';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ToolbarModule } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { MultiSelectModule } from 'primeng/multiselect';
import { AvatarModule } from 'primeng/avatar';
import { TagModule } from 'primeng/tag';
import { MenuModule } from 'primeng/menu';
import { Menu } from 'primeng/menu';
import { ContextMenuModule } from 'primeng/contextmenu';
import { EditorModule } from 'primeng/editor';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { DatePickerModule } from 'primeng/datepicker';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Select } from 'primeng/select';
import { TranslateService } from '@ngx-translate/core';

@Component({
	selector: 'app-documents',
	standalone: true,
	imports: [
		CommonModule,
		TreeModule,
		MenuModule,
		ContextMenuModule,
		DialogModule,
		ConfirmDialogModule,
		ToastModule,
		ToolbarModule,
		ButtonModule,
		TableModule,
		InputTextModule,
		InputIconModule,
		IconFieldModule,
		FormsModule,
		TranslateModule,
		MultiSelectModule,
		AvatarModule,
		TagModule,
		EditorModule,
		DatePickerModule,
		Select
	],
	templateUrl: './documents.html',
	styleUrls: ['./documents.scss'],
	providers: [NodeService, ConfirmationService, MessageService]
	})
	export class DocumentsComponent implements OnInit {

		// storage key for selected directory id
		private readonly STORAGE_KEY = 'documents.selectedDirectoryId';
		// tree
		private nodeService = inject(NodeService);
		private translate = inject(TranslateService);
		private http = inject(HttpClient);
		private cdr = inject(ChangeDetectorRef);
		private router = inject(Router);
		private confirmationService = inject(ConfirmationService);
		private messageService = inject(MessageService);
		files = signal<TreeNode[] | undefined>(undefined);
		selectedFile?: TreeNode;
		// node that was right-clicked (context menu target). Use this to reliably prefill parent when opening from context menu.
		contextMenuNode?: TreeNode | null = null;

		@ViewChild('menu') menu?: Menu;

		// popup menu items for header ellipsis
		items: MenuItem[] = [
			{ label: 'Create directory', icon: 'pi pi-plus', command: () => this.openCreateDirectoryDialog(false) }
		];

		// tree context menu items (right-click on a directory)
		treeItems: MenuItem[] = [
			{ label: 'Create directory', icon: 'pi pi-plus', command: () => this.openCreateDirectoryDialog(true) },
			{ label: 'Edit', icon: 'pi pi-pencil', command: () => this.openEditDirectory() },
			{ label: 'Delete', icon: 'pi pi-trash', command: () => this.confirmDeleteDirectory() }
		];

		// Create-directory dialog state
		displayCreateDialog = false;
		newDir: { name: string; parent_id?: number | null; order_index?: number; project_id?: number | null } = {
			name: '',
			parent_id: null,
			order_index: 0,
			project_id: null
		};
		savingDir = false;

		// whether the Create Directory dialog was opened from tree context menu (right-click)
		createDirFromContext = false;

		// edit mode state for directory dialog
		isEditingDir = false;
		editingDirId: number | null = null;

	/**
	 * Recursively map nodes and set expanded flag according to `expand`.
	 * We return new objects to ensure change detection/signals notice the update.
	 */
	private mapNodesWithExpansion(nodes: TreeNode[] | undefined, expand: boolean): TreeNode[] {
		if (!nodes) return [];
		return nodes.map(n => ({
			...n,
			expanded: expand,
			children: this.mapNodesWithExpansion(n.children as TreeNode[] | undefined, expand)
		}));
	}

	/**
	 * Find a tree node by numeric id (searches node.data.id or node.key)
	 */
	private findNodeById(nodes: TreeNode[] | undefined, id: number): TreeNode | undefined {
		if (!nodes || nodes.length === 0) return undefined;
		for (const n of nodes) {
			const nid = n?.data?.id ?? (n?.key ? Number(n.key) : undefined);
			if (nid === id) return n;
			const child = this.findNodeById(n.children as TreeNode[] | undefined, id);
			if (child) return child;
		}
		return undefined;
	}

	expandAll(): void {
		const current = this.files();
		this.files.set(this.mapNodesWithExpansion(current || [], true));
	}

	collapseAll(): void {
		const current = this.files();
		this.files.set(this.mapNodesWithExpansion(current || [], false));
	}

	// copied table state (neutral — no connection to issues)
	documentsItems: any[] = [];
	selectedDocuments: any[] = [];
	loading = false;

	// columns & column toggles — only the columns requested by the API mapping
	columns: { field: string; headerKey: string; visible: boolean }[] = [
		{ field: 'id', headerKey: 'MENU.ID', visible: true },
		{ field: 'project_name', headerKey: 'components.documents.table.PROJECT', visible: true },
		{ field: 'title', headerKey: 'components.documents.table.TITLE', visible: true },
		{ field: 'author_name', headerKey: 'components.documents.table.CREATED_BY', visible: true },
		{ field: 'assignee_name', headerKey: 'components.documents.table.ASSIGNEE', visible: true },
		{ field: 'status_name', headerKey: 'components.documents.table.STATUS', visible: true },
		{ field: 'stage_name', headerKey: 'components.documents.table.STAGE', visible: true },
		{ field: 'stage_date', headerKey: 'components.documents.table.STAGE_DATE', visible: true },
		{ field: 'created_at', headerKey: 'components.documents.table.CREATED_AT', visible: true }
	];

	columnsOptions: { label: string; value: string }[] = [];
	selectedColumns: string[] = [];

	// filter options (kept empty — safe placeholders)
	projectOptions: { label: string; value: any; code?: string }[] = [];
	usersOptions: { label: string; value: any; avatar?: string | null }[] = [];
	statusOptions: { label: string; value: any }[] = [];
	typeOptions: { label: string; value: any }[] = [];
	priorityOptions: { label: string; value: any }[] = [];

	/** Flatten tree files into dropdown options for directory selector */
	get directoryOptions(): { label: string; value: any }[] {
		try {
			const out: { label: string; value: any }[] = [];
			const roots = this.files() || [];

			// recursive traversal carrying ancestor names to build full path
			const traverse = (node: TreeNode, ancestors: string[]) => {
				const id = node?.data?.id ?? (node?.key ? Number(node.key) : null);
				const name = (node.label || (node.data && node.data.name) || '').toString();
				const pathParts = ancestors.slice();
				if (name) pathParts.push(name);
				// desired format: "id parent/parent/name dir"
				const path = pathParts.join('/');
				const label = (id !== null && id !== undefined) ? `ID ${String(id)} - ${path} ` : `${path} `;
				out.push({ label, value: id });
				if (node.children && Array.isArray(node.children)) {
					for (const c of node.children as TreeNode[]) {
						traverse(c, pathParts);
					}
				}
			};

			for (const r of roots) traverse(r, []);
			return out;
		} catch (e) {
			return [];
		}
	}

	/**
	 * Preserve expanded/collapsed state from currently rendered tree when replacing with fresh data.
	 * Matches nodes by numeric id or key and applies existing .expanded flag to new nodes recursively.
	 */
	private applyExpansionFromCurrent(nodes: TreeNode[] | undefined): TreeNode[] {
		if (!nodes) return [];
		const current = this.files() || [];
		const apply = (n: any): any => {
			const nid = n?.data?.id ?? (n?.key ? Number(n.key) : null);
			const existing = nid != null ? this.findNodeById(current, nid) : undefined;
			if (existing && existing.expanded) n.expanded = existing.expanded;
			if (n.children && Array.isArray(n.children)) {
				n.children = (n.children as any[]).map((c: any) => apply(c));
			}
			return n;
		};
		const result = (nodes || []).map(n => apply(JSON.parse(JSON.stringify(n))));
		// ensure returned tree is sorted according to order_index
		try { this.sortTreeInPlace(result as any); } catch (e) { /* ignore */ }
		return result;
	}

	/**
	 * Helper to obtain numeric order index for sorting. If a node has no order_index,
	 * it will be treated as very large so it sorts to the end.
	 */
	private getOrder(node: any): number {
		try {
			if (!node) return Number.MAX_SAFE_INTEGER;
			const o = node?.data?.order_index ?? node?.data?.orderIndex ?? node?.data?.order;
			const num = (o !== null && o !== undefined && String(o).trim() !== '') ? Number(o) : NaN;
			return Number.isFinite(num) ? num : Number.MAX_SAFE_INTEGER;
		} catch (e) { return Number.MAX_SAFE_INTEGER; }
	}

	/**
	 * Return numeric order_index if present on node, otherwise null.
	 * Used for global max computations where absent indices should be ignored.
	 */
	private getOrderNumericIfPresent(node: any): number | null {
		try {
			if (!node) return null;
			const o = node?.data?.order_index ?? node?.data?.orderIndex ?? node?.data?.order;
			if (o === null || o === undefined || String(o).trim() === '') return null;
			const num = Number(o);
			return Number.isFinite(num) ? num : null;
		} catch (e) { return null; }
	}

	/**
	 * Sort tree nodes in-place by order index recursively.
	 */
	private sortTreeInPlace(nodes: any[]): void {
		if (!nodes || !Array.isArray(nodes)) return;
		nodes.sort((a: any, b: any) => this.getOrder(a) - this.getOrder(b));
		for (const n of nodes) {
			if (n.children && Array.isArray(n.children)) this.sortTreeInPlace(n.children);
		}
		
	}

	/**
	 * Return the maximum order_index value found in the given nodes (recursively).
	 * If no nodes or no indices found, returns -1.
	 */
	private getMaxOrderInTree(nodes?: any[]): number {
		let max = -1;
		const walk = (arr: any[] | undefined) => {
			if (!arr || !Array.isArray(arr)) return;
			for (const n of arr) {
				const v = this.getOrderNumericIfPresent(n);
				if (v !== null) max = Math.max(max, v);
				if (n.children && Array.isArray(n.children)) walk(n.children);
			}
		};
		walk(nodes || (this.files() as any));
		return max;
	}

	constructor() {}

	openCreateDirectoryDialog(fromContext: boolean = false): void {
			 	// reset edit state — opening the create dialog must never leave edit mode enabled
			 	this.isEditingDir = false;
			 	this.editingDirId = null;
			 	this.formErrors = {};
			 	// mark how dialog was opened so template can show/hide parent selector
			 	this.createDirFromContext = Boolean(fromContext);
	 		// Prefill parent only when opened from tree context menu. Prefer the explicit context node (set in onTreeNodeContextMenu)
	 		const sel = this.createDirFromContext ? (this.contextMenuNode || this.selectedFile) : this.selectedFile;
		// determine parent id (null for root)
		const parentId = this.createDirFromContext ? (sel && sel.data && sel.data.id ? sel.data.id : (sel && sel.key ? Number(sel.key) : null)) : null;
		// compute suggested order_index as global max across all directories + 1 so indices are sequential across the tree
		let suggestedIndex = 1;
		try {
			const maxIndex = this.getMaxOrderInTree(this.files() as any) ;
			if (maxIndex >= 0) suggestedIndex = maxIndex + 1;
		} catch (e) { /* ignore and leave suggestedIndex = 0 */ }

		this.newDir = {
			name: '',
			parent_id: parentId,
			order_index: suggestedIndex,
			// inherit project_id from parent when opened from context menu
			project_id: this.createDirFromContext ? (sel && sel.data && (sel.data.project_id ?? sel.data.projectId) ? (sel.data.project_id ?? sel.data.projectId) : null) : null
		};
	 		this.displayCreateDialog = true;
	}

		/**
		 * Open directory edit dialog and prefill form with current directory values.
		 * If called from context menu the `selectedFile` is expected to be set by the context handler.
		 */
		openEditDirectory(): void {
			const node = this.selectedFile;
			if (!node) return;
			const data = node.data || {};
			this.isEditingDir = true;
			this.editingDirId = (data.id ?? (node.key ? Number(node.key) : null)) as number | null;
			// when editing from context, treat dialog as opened from context so Parent selector shows
			this.createDirFromContext = true;
			this.newDir = {
				name: data.name || '',
				parent_id: (data.parent_id ?? null) as number | null,
				order_index: (data.order_index ?? 0) as number,
				project_id: (data.project_id ?? data.projectId ?? null) as number | null
			};
			this.displayCreateDialog = true;
		}

	async createDirectory(): Promise<void> {
		// validate form
		this.formErrors = this.formErrors || {};
		if (!this.validateDirectoryForm()) return;
		this.savingDir = true;
		try {
			// build payload: only include defined fields
			const payload: any = { name: String(this.newDir.name) };
			if (this.newDir.parent_id !== null && this.newDir.parent_id !== undefined) payload.parent_id = this.newDir.parent_id;
			if (this.newDir.project_id !== null && this.newDir.project_id !== undefined) payload.project_id = this.newDir.project_id;
			if (this.newDir.order_index !== null && this.newDir.order_index !== undefined) payload.order_index = this.newDir.order_index;

			// If creating (not editing) and order_index not set, assign global max+1 across all directories
			if (!this.isEditingDir) {
				try {
					const maxIndex = this.getMaxOrderInTree(this.files() as any);
					const assigned = (maxIndex >= 0) ? (maxIndex + 1) : 1;
					payload.order_index = assigned;
					this.newDir.order_index = assigned;
				} catch (e) {
					// ignore and let server decide
				}
			}

			if (this.isEditingDir && this.editingDirId != null) {
				// Update existing directory via PUT
				const resp: any = await firstValueFrom(this.http.put(`/api/documents/directories/${this.editingDirId}`, payload));
				const updated = resp && (resp.data || resp || {}).data ? (resp.data || resp).data : (resp && resp.id ? resp : resp);
				if (updated) {
					// try to update node locally
					try {
						const current = this.files() || [];
						const copy = JSON.parse(JSON.stringify(current || [])) as TreeNode[];
						const node = this.findNodeById(copy, (updated.id ?? this.editingDirId) as number);
						if (node) {
							// capture previous parent before overwriting node.data
							const prevParentId = node.data && node.data.parent_id != null ? node.data.parent_id : null;
							const newParentId = (updated && updated.parent_id != null) ? updated.parent_id : null;
							// Update label/data
							node.label = updated.name || node.label;
							node.data = updated;
							// If parent changed, move node in the tree
							try {
								if ((prevParentId ?? null) !== (newParentId ?? null)) {
									const idToMove = (updated.id ?? this.editingDirId) as number;
									let movedNode: any = null;
									const removeById = (nodes: any[]): boolean => {
										for (let i = 0; i < nodes.length; i++) {
											const n = nodes[i];
											const nid = n?.data?.id ?? (n?.key ? Number(n.key) : null);
											if (nid === idToMove) {
												movedNode = nodes.splice(i, 1)[0];
												return true;
											}
											if (n.children && removeById(n.children)) return true;
										}
										return false;
									};
									removeById(copy);
									// ensure moved node reflects updated data
									if (movedNode) { movedNode.label = updated.name || movedNode.label; movedNode.data = updated; }
									// Attach under new parent or to root
									if (newParentId == null) {
										copy.push(movedNode || node);
										// keep order
										this.sortTreeInPlace(copy as any);
									} else {
										const parentNode = this.findNodeById(copy, newParentId as number);
										if (parentNode) {
											parentNode.children = parentNode.children || [];
											parentNode.children.push(movedNode || node);
											// sort the parent's children
											this.sortTreeInPlace(parentNode.children as any);
										} else {
											// parent not found locally — fallback to reload
											const data = await this.nodeService.getFiles();
											this.files.set(this.applyExpansionFromCurrent(data));
											return;
										}
									}
								}
								this.files.set(copy);
								try { this.messageService.add({ severity: 'success', summary: 'Save', detail: 'Directory updated' }); } catch (e) { }
							} catch (e) {
								const data = await this.nodeService.getFiles();
								this.files.set(this.applyExpansionFromCurrent(data));
							}
						} else {
							// fallback: refresh full tree (preserve expansion)
							const data = await this.nodeService.getFiles();
							this.files.set(this.applyExpansionFromCurrent(data));
						}

						// ensure the local directory list is in sync with server after an update
						try {
							const fresh = await this.nodeService.getFiles();
							this.files.set(this.applyExpansionFromCurrent(fresh));
						} catch (e) {
							// ignore — we already attempted local update; fallback is non-critical
						}
					} catch (e) {
						const data = await this.nodeService.getFiles();
						this.files.set(this.applyExpansionFromCurrent(data));
					}
				} else {
					const data = await this.nodeService.getFiles();
					this.files.set(this.applyExpansionFromCurrent(data));
				}
			} else {
				// Create new directory via POST
				const resp: any = await firstValueFrom(this.http.post('/api/documents/directories', payload));
				const created = resp && (resp.data || resp || {}).data ? (resp.data || resp).data : (resp && resp.id ? resp : null);
				if (created && (created.id || created.data || created.name)) {
					try {
						const current = this.files() || [];
						const newNode: TreeNode = {
							key: String(created.id || created.data?.id || created.key || ''),
							label: created.name || (created.data && created.data.name) || payload.name,
							data: created.data || created
						};
						const parentId = (created.parent_id ?? this.newDir.parent_id) as number | null;
						if (parentId == null) {
							const copyRoots = JSON.parse(JSON.stringify(current || [])) as TreeNode[];
							copyRoots.push(newNode);
							this.sortTreeInPlace(copyRoots as any);
							this.files.set(copyRoots);
						} else {
							const attach = (nodes: TreeNode[]): boolean => {
								for (const n of nodes) {
									const nid = n?.data?.id ?? (n?.key ? Number(n.key) : undefined);
									if (nid === parentId) {
										n.children = n.children || [];
										n.children.push(newNode);
										return true;
									}
									if (n.children && attach(n.children as TreeNode[])) return true;
								}
								return false;
							};
							const copy = JSON.parse(JSON.stringify(current || [])) as TreeNode[];
							if (!attach(copy)) {
								const data = await this.nodeService.getFiles();
								this.files.set(this.applyExpansionFromCurrent(data));
							} else {
								// sort affected subtree so new node is placed according to order_index
								this.sortTreeInPlace(copy as any);
								this.files.set(copy);
							}
							try { this.messageService.add({ severity: 'success', summary: 'Create', detail: 'Directory created' }); } catch (e) { }
						}
					} catch (e) {
						const data = await this.nodeService.getFiles();
						this.files.set(this.applyExpansionFromCurrent(data));
					}
				} else {
					const data = await this.nodeService.getFiles();
					this.files.set(this.applyExpansionFromCurrent(data));
				}
			}

			this.displayCreateDialog = false;
		} catch (e) {
			console.error('Failed to create/update directory', e);
			this.formErrors = this.formErrors || {};
			this.formErrors.name = 'Failed to create/update directory';
		} finally {
			this.savingDir = false;
			this.createDirFromContext = false;
			this.isEditingDir = false;
			this.editingDirId = null;
			this.contextMenuNode = null;
			try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }
		}
	}

	/** Close the create/edit directory dialog and reset edit state */
	closeDirectoryDialog(): void {
		this.displayCreateDialog = false;
		this.savingDir = false;
		this.isEditingDir = false;
		this.editingDirId = null;
		this.createDirFromContext = false;
		this.contextMenuNode = null;
		this.newDir = { name: '', parent_id: null, order_index: 0, project_id: null };
		this.formErrors = {};
		try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }
	}

	private validateDirectoryForm(): boolean {
		this.formErrors = this.formErrors || {};
		if (!this.newDir || !this.newDir.name || String(this.newDir.name).trim() === '') {
			this.formErrors.name = 'Name is required';
		}
		return Object.keys(this.formErrors).length === 0;
	}

	/**
	 * When a directory node is selected, load documents for that directory
	 * using GET /api/documents?directory_id=<id> and populate the table.
	 */
	onDirectorySelect(node: TreeNode | any): void {
		const id = node?.data?.id ?? (node?.key ? Number(node.key) : null);
		if (!id) return;

		// persist selected directory id to localStorage
		try { localStorage.setItem(this.STORAGE_KEY, String(id)); } catch (e) { /* ignore */ }
		this.loading = true;
		firstValueFrom(this.http.get<{ data: any[] }>('/api/documents', { params: { directory_id: String(id) } }))
			.then((resp) => {
				// normalize backend fields to what the table template expects
				this.documentsItems = (resp?.data || []).map(d => {
					const copy: any = { ...(d || {}) };
					// map names and ids
					copy.author_name = copy.created_name || copy.created_name || copy.author_name;
					copy.author_id = copy.created_by ?? copy.created_by ?? copy.author_id;
					copy.assignee_name = copy.assigne_name || copy.assigne_name || copy.assignee_name;
					copy.assignee_id = copy.assigne_to ?? copy.assigne_to ?? copy.assignee_id;

					// priority: if backend provided priority code, try to map to a translatable label
					try {
						const p = copy.priority;
						if (p !== null && p !== undefined && String(p).trim() !== '') {
							const key = `components.documents.priority.${String(p).toUpperCase()}`;
							const txt = this.translate.instant(key);
							copy.priority_text = (txt && txt !== key) ? txt : String(p);
						} else {
							copy.priority_text = copy.priority_text ?? null;
						}
					} catch (e) { copy.priority_text = copy.priority_text ?? null; }
					// map avatar ids to downloadable URLs (same logic as issues page)
					try {
						const aId = copy.assigne_avatar_id ?? copy.assignee_avatar_id ?? copy.assigneeAvatarId ?? copy.assigneeAvatar_id;
						if (!copy.assignee_avatar && !copy.assignee_avatar_url && aId !== null && aId !== undefined && String(aId).trim() !== '') {
							copy.assignee_avatar_url = `/api/storage/${String(aId).trim()}/download`;
						}
					} catch (e) { /* ignore */ }
					try {
						const auId = copy.created_avatar_id ?? copy.author_avatar_id ?? copy.authorAvatarId ?? copy.authorAvatar_id;
						if (!copy.author_avatar && !copy.author_avatar_url && auId !== null && auId !== undefined && String(auId).trim() !== '') {
							copy.author_avatar_url = `/api/storage/${String(auId).trim()}/download`;
						}
					} catch (e) { /* ignore */ }
					return copy;
				});
			})
			.catch((err) => {
				console.error('Failed to load documents for directory', id, err);
				this.documentsItems = [];
			})
			.finally(() => {
				this.loading = false;
				// force change detection so loading spinner stops immediately
				try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }
			});
	}

	openMenu(event: any): void {
		this.menu?.toggle(event);
	}

	ngOnInit(): void {
		// init tree
		this.nodeService.getFiles().then((data) => {
			this.files.set(this.applyExpansionFromCurrent(data));
			// restore previously selected directory id from localStorage if present
			try {
				const s = localStorage.getItem(this.STORAGE_KEY);
				if (s) {
					const nid = Number(s);
					if (!Number.isNaN(nid)) {
						const found = this.findNodeById(data, nid);
						if (found) {
							this.selectedFile = found;
							// trigger load for restored selection
							this.onDirectorySelect(found);
						}
					}
				}
			} catch (e) { /* ignore storage errors */ }
		});

		// init columns options
		this.columnsOptions = (this.columns || []).map(c => ({ label: c.headerKey, value: c.field }));
		this.selectedColumns = (this.columns || []).filter(c => c.visible).map(c => c.field);
		// preload projects so project selectors have options (same source as issues page)
		this.loadProjects();
	}


	// load projects for project selectors from /api/my_projects (same as issues page)
	loadProjects(): void {
		this.http.get('/api/my_projects').subscribe({
			next: (res: any) => {
				const items = (res && res.data) ? res.data : (res || []);
				this.projectOptions = (items || []).map((p: any) => ({
					label: ((p.code || p.key) ? ('[' + (p.code || p.key) + '] ') : '') + (p.name || p.title || String(p.id)),
					value: p.id,
					code: p.code || p.key || ''
				}));
				// optionally populate usersOptions from project participants so selectors using usersOptions work
				try {
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
								try {
									if (typeof aid === 'number' || (typeof aid === 'string' && String(aid).trim())) {
										avatar = `/api/storage/${String(aid).trim()}/download`;
									}
								} catch (e) { avatar = null; }
							}
							if (!map.has(id)) map.set(id, { label: label, value: id, avatar });
						}
					}
					this.usersOptions = Array.from(map.values());
				} catch (e) { this.usersOptions = []; }
				try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }
			},
			error: (err) => { console.warn('Failed to load projects', err); this.projectOptions = []; this.usersOptions = []; try { this.cdr.detectChanges(); } catch (e) { /* ignore */ } }
		});
	}

	// toolbar/button no-op
	// Confirm and delete a directory (context menu)
	confirmDeleteDirectory(node?: any): void {
		const target = node || this.selectedFile;
		if (!target) return;
		const id = (target && target.data && target.data.id) ? target.data.id : (target && target.key ? Number(target.key) : null);
		if (!id) return;
		try {
			this.confirmationService.confirm({
				message: `Delete directory "${target.label || (target.data && target.data.name) || id}"?`,
				icon: 'pi pi-exclamation-triangle',
				accept: () => this.deleteDirectory(id)
			});
		} catch (e) {
			// fallback: delete immediately
			this.deleteDirectory(id);
		}
	}

	// Navigate to document detail page when a table row is clicked
	onRowClick(item: any, event?: Event): void {
		try {
			const target = event && (event.target as HTMLElement);
			if (target && target.closest) {
				const interactive = target.closest('button, a, input, textarea, select, .p-tablecheckbox, .p-checkbox, .p-button');
				if (interactive) return;
			}
			if (!item || (item.id == null)) return;
			// navigate to /documents/:id
			this.router.navigate(['/documents', item.id]);
		} catch (e) {
			console.warn('onRowClick failed', e);
		}
	}

	// Delete directory API call
	deleteDirectory(id: number): void {
		if (!id) return;
		this.savingDir = true;
		firstValueFrom(this.http.delete(`/api/documents/directories/${id}`)).then(() => {
			try { this.messageService.add({ severity: 'success', summary: 'Delete', detail: 'Directory deleted' }); } catch (e) {}
			// remove node locally if present
			try {
				const current = this.files() || [];
				const copy = JSON.parse(JSON.stringify(current || [])) as any[];
				const remove = (nodes: any[]): boolean => {
					for (let i = 0; i < nodes.length; i++) {
						const n = nodes[i];
						const nid = n?.data?.id ?? (n?.key ? Number(n.key) : null);
						if (nid === id) {
							nodes.splice(i, 1);
							return true;
						}
						if (n.children && remove(n.children)) return true;
					}
					return false;
				};
				if (!remove(copy)) {
					this.nodeService.getFiles().then((data) => this.files.set(this.applyExpansionFromCurrent(data)));
				} else {
						this.sortTreeInPlace(copy as any);
						this.files.set(copy as any);
				}
			} catch (e) {
				this.nodeService.getFiles().then((data) => this.files.set(this.applyExpansionFromCurrent(data)));
			}
		}).catch((err) => {
			console.error('Failed to delete directory', err);
			try { this.messageService.add({ severity: 'error', summary: 'Delete', detail: (err && err.message) ? err.message : 'Failed to delete directory' }); } catch (e) {}
		}).finally(() => {
			this.savingDir = false;
			this.createDirFromContext = false;
			this.isEditingDir = false;
			this.editingDirId = null;
			try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }
		});
	}

	noop(): void {}

	// when user right-clicks a tree node, primeNG emits the node in event.node
	// ensure selection updates so context actions operate on the expected node
	onTreeNodeContextMenu(event: any): void {
		try {
			const node = event && (event.node || (event.originalEvent && event.originalEvent.node)) ? (event.node || (event.originalEvent && event.originalEvent.node)) : null;
			if (node) {
				this.selectedFile = node;
				this.contextMenuNode = node;
			}
		} catch (e) { /* ignore */ }
	}

	// document create/edit dialog state
	displayDialog = false;
	editModel: any = {};
	isCreating = false;
	formErrors: any = {};

	openNewDocument(): void {
		this.editModel = { title: '', description: '', project_id: null, assigne_to: null, stage_id: null, status_id: null, directory_id: (this.selectedFile?.data?.id ?? (this.selectedFile?.key ? Number(this.selectedFile.key) : null)) };
		this.isCreating = true;
		this.displayDialog = true;
	}

	openEditDocument(item: any): void {
		if (!item) return;
		this.editModel = { ...(item || {}) };
		this.isCreating = false;
		this.displayDialog = true;
	}

	private validateDocumentForm(): boolean {
		this.formErrors = {};
		if (!this.editModel || !this.editModel.title || String(this.editModel.title).trim() === '') {
			this.formErrors.title = 'Title is required';
		}
		return Object.keys(this.formErrors).length === 0;
	}

	async saveDocument(): Promise<void> {
		if (!this.editModel) return;
		if (!this.validateDocumentForm()) return;
		this.loading = true;
		try {
			const payload = {
				title: String(this.editModel.title || ''),
				description: this.editModel.description || '',
				project_id: this.editModel.project_id || null,
				assigne_to: this.editModel.assigne_to || null,
				stage_id: this.editModel.stage_id || null,
				stage_date: (this.editModel && this.editModel.stage_date) ? (this.editModel.stage_date instanceof Date ? this.editModel.stage_date.toISOString() : String(this.editModel.stage_date)) : null,
				status_id: this.editModel.status_id || null,
				directory_id: this.editModel.directory_id || (this.selectedFile?.data?.id ?? null)
			};
			if (this.isCreating) {
				await firstValueFrom(this.http.post('/api/documents', payload));
			} else {
				const id = this.editModel.id;
				if (id != null) await firstValueFrom(this.http.put(`/api/documents/${id}`, payload));
			}
			this.displayDialog = false;
			// refresh current directory
			if (this.selectedFile) this.onDirectorySelect(this.selectedFile);
		} catch (e) {
			console.error('Failed to save document', e);
		} finally {
			this.loading = false;
			try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }
		}
	}

	// column toggle
	isColumnVisible(field: string): boolean {
		return this.selectedColumns.includes(field);
	}

	onColumnsChange(): void {
		for (const c of this.columns) c.visible = this.selectedColumns.includes(c.field);
	}

	// table events
	onColumnsReordered(event: any): void {
		try {
			const dragIndex = (event && event.dragIndex != null) ? Number(event.dragIndex) : null;
			const dropIndex = (event && event.dropIndex != null) ? Number(event.dropIndex) : null;
			const visible = this.columns.filter(c => this.selectedColumns.includes(c.field));
			if (dragIndex == null || dropIndex == null || dragIndex < 0 || dropIndex < 0 || dragIndex >= visible.length || dropIndex > visible.length) {
				console.warn('onColumnsReordered: invalid indices', { dragIndex, dropIndex, visibleLength: visible.length });
				return;
			}
			const moved = visible.splice(dragIndex, 1)[0];
			visible.splice(dropIndex, 0, moved);
			// reconstruct full columns preserving hidden columns
			const newOrder: any[] = [];
			let vi = 0;
			for (const c of this.columns) {
				if (this.selectedColumns.includes(c.field)) {
					const next = visible[vi++];
					if (next) newOrder.push(next);
				} else {
					newOrder.push(c);
				}
			}
			this.columns = newOrder;
			this.columnsOptions = (this.columns || []).map(c => ({ label: c.headerKey, value: c.field }));
			try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }
		} catch (e) {
			console.warn('onColumnsReordered failed', e);
		}
	}

	onColumnResized(event: any): void {
		try {
			// small no-op: detect changes after resize to ensure layout updates
			setTimeout(() => { try { this.cdr.detectChanges(); } catch (e) { /* ignore */ } }, 50);
		} catch (e) { /* ignore */ }
	}

	// global filter — attempt to apply via PrimeNG table API if available
	onGlobalFilter(dt: any, event: any): void {
		try {
			const v = event && event.target ? event.target.value : (event || '');
			if (dt && typeof dt.filterGlobal === 'function') dt.filterGlobal(v, 'contains');
		} catch (e) { /* ignore */ }
	}

	// helpers used in table rendering (simple fallbacks)
	initialsFromName(name: string | any): string {
		try {
			if (!name) return '';
			const s = String(name).trim();
			const parts = s.split(/\s+/);
			if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
			return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
		} catch (e) { return '' + name; }
	}

	formatSurnameInitials(nameOrObj: any): string {
		try {
			const name = typeof nameOrObj === 'string' ? nameOrObj : (nameOrObj && nameOrObj.name) || '';
			if (!name) return '-';
			const parts = String(name).split(/\s+/);
			if (parts.length === 1) return parts[0];
			return parts[0] + ' ' + (parts[1] ? parts[1][0] + '.' : '');
		} catch (e) { return '-'; }
	}

	issueAvatarColor(_u: any): string { return '#6b7280'; }
	issueAvatarTextColor(_u: any): string { return '#fff'; }

	statusSeverity(_code: any): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | null { return 'info'; }
	prioritySeverity(_p: any): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | null { return 'info'; }

	projectCode(_issue: any): string | null { return null; }
}
