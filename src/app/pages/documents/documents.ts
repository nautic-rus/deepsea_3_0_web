import { Component, OnInit, inject, signal, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { TreeModule } from 'primeng/tree';
import { TreeSelectModule } from 'primeng/treeselect';
import { NodeService } from '../../services/nodeservice';
import { TreeNode, MenuItem } from 'primeng/api';
import { HttpClient } from '@angular/common/http';
import { DocumentsService } from './documents.service';
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
import { AvatarService } from '../../services/avatar.service';

@Component({
	selector: 'app-documents',
	standalone: true,
	imports: [
		CommonModule,
		TreeModule,
		TreeSelectModule,
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
		private documentsService = inject(DocumentsService);
		private avatarService = inject(AvatarService);
		files = signal<TreeNode[] | undefined>(undefined);
		selectedFile?: TreeNode;

		// directory tree for TreeSelect and placeholder for display
		directoryTree: any[] = [];
		// filtered view of directoryTree according to selected project in dialog
		directoryTreeFiltered: any[] = [];
		directoryPlaceholder: string = '';
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
	 * Called when project is changed inside bulk-edit dialog: refresh stages and specializations
	 */
	onBulkDialogProjectChange(projectId: any): void {
		this.loadStages(projectId);
		this.loadSpecializations();
		if (this.bulkEditModel) this.bulkEditModel.stage_id = null;
		// filter directory tree for bulk dialog as well
		try {
			this.directoryTreeFiltered = this.filterDirectoryTree(this.directoryTree, projectId);
			// clear bulk dialog directory selection when project changes
			if (this.bulkEditModel) this.bulkEditModel.directory_id = null;
		} catch (e) { /* ignore */ }
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

	// bulk edit dialog state
	bulkEditDialogVisible = false;
	bulkEditModel: {
		project_id?: any;
		directory_id?: any;
		type_id?: any;
		specialization_id?: any;
		priority?: any;
		stage_id?: any;
	} = { project_id: null, directory_id: null, type_id: null, specialization_id: null, priority: null, stage_id: null };

	// columns & column toggles — only the columns requested by the API mapping
	columns: { field: string; headerKey: string; visible: boolean }[] = [
		{ field: 'id', headerKey: 'MENU.ID', visible: true },
		{ field: 'project_name', headerKey: 'components.documents.table.PROJECT', visible: true },
		{ field: 'type_name', headerKey: 'components.documents.table.TYPE', visible: true },
		{ field: 'code', headerKey: 'components.documents.detail.CODE', visible: true },
		{ field: 'title', headerKey: 'components.documents.table.TITLE', visible: true },
		{ field: 'specialization_name', headerKey: 'components.documents.table.SPECIALIZATION', visible: true },
		{ field: 'author_name', headerKey: 'components.documents.table.CREATED_BY', visible: true },
		{ field: 'status_name', headerKey: 'components.documents.table.STATUS', visible: true },
		{ field: 'priority_text', headerKey: 'components.documents.table.PRIORITY', visible: true },
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

	// additional selects used by the create/edit dialog (populated elsewhere or left empty)
	specializationsOptions: { label: string; value: any }[] = [];
	stagesOptions: { label: string; value: any }[] = [];

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
		// Project is required for a directory
		if (!this.newDir || this.newDir.project_id === null || this.newDir.project_id === undefined) {
			this.formErrors.project_id = 'Project is required';
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
						// normalize code (document number) if backend uses different field
						try { copy.code = copy.code ?? copy.document_number ?? copy.number ?? null; } catch (e) { copy.code = copy.code ?? null; }
						// normalize project code if available
						try {
							copy.project_code = copy.project_code ?? (copy.project && (copy.project.code || copy.project.key)) ?? copy.project_code ?? null;
						} catch (e) { copy.project_code = copy.project_code ?? null; }
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

	// Bulk edit dialog handlers
	openBulkEditDialog(): void {
		if (!this.selectedDocuments || !this.selectedDocuments.length) {
			try { this.messageService.add({ severity: 'info', summary: this.translate.instant('MENU.BULK_EDIT') || 'Bulk edit', detail: this.translate.instant('components.documents.bulk.NO_SELECTION') || 'No documents selected' }); } catch (e) {}
			return;
		}
		// attempt to prefill project if all selected documents share same project
		let sharedProject: any = null;
		for (const s of (this.selectedDocuments || [])) {
			const pid = s && (s.project_id ?? s.projectId ?? s.project) ? (s.project_id ?? s.projectId ?? s.project) : null;
			if (pid == null) { sharedProject = null; break; }
			if (sharedProject === null) sharedProject = pid;
			else if (String(sharedProject) !== String(pid)) { sharedProject = null; break; }
		}
		this.bulkEditModel = { project_id: sharedProject, directory_id: null, type_id: null, specialization_id: null, priority: null, stage_id: null };
		// preload selects for bulk dialog
		this.loadSpecializations();
		if (sharedProject !== null && sharedProject !== undefined) {
			this.loadStages(sharedProject);
			// filter directories according to project
			try { this.directoryTreeFiltered = this.filterDirectoryTree(this.directoryTree, sharedProject); } catch (e) { /* ignore */ }
		}
		this.bulkEditDialogVisible = true;
	}

	closeBulkEditDialog(): void {
		this.bulkEditDialogVisible = false;
	}

	async applyBulkEdit(): Promise<void> {
		if (!this.selectedDocuments || !this.selectedDocuments.length) {
			try { this.messageService.add({ severity: 'info', summary: this.translate.instant('MENU.BULK_EDIT') || 'Bulk edit', detail: this.translate.instant('components.documents.bulk.NO_SELECTION') || 'No documents selected' }); } catch (e) {}
			return;
		}
		const ids = (this.selectedDocuments || []).map((s: any) => s.id).filter(Boolean);
		if (!ids.length) {
			try { this.messageService.add({ severity: 'warn', summary: this.translate.instant('MENU.BULK_EDIT') || 'Bulk edit', detail: this.translate.instant('components.documents.bulk.NO_IDS') || 'No valid document ids selected' }); } catch (e) {}
			return;
		}

		const fields: any = {};
		if (this.bulkEditModel.directory_id !== null && this.bulkEditModel.directory_id !== undefined) fields.directory_id = this.bulkEditModel.directory_id;
		if (this.bulkEditModel.type_id !== null && this.bulkEditModel.type_id !== undefined) fields.type_id = this.bulkEditModel.type_id;
		if (this.bulkEditModel.specialization_id !== null && this.bulkEditModel.specialization_id !== undefined) fields.specialization_id = this.bulkEditModel.specialization_id;
		if (this.bulkEditModel.priority !== null && this.bulkEditModel.priority !== undefined) fields.priority = this.bulkEditModel.priority;
		if (this.bulkEditModel.stage_id !== null && this.bulkEditModel.stage_id !== undefined) fields.stage_id = this.bulkEditModel.stage_id;

		if (!Object.keys(fields).length) {
			try { this.messageService.add({ severity: 'info', summary: this.translate.instant('MENU.BULK_EDIT') || 'Bulk edit', detail: this.translate.instant('components.documents.bulk.NOTHING_TO_APPLY') || 'Nothing to apply' }); } catch (e) {}
			return;
		}

		this.loading = true;
		const promises = ids.map(id => firstValueFrom(this.documentsService.updateDocument(id, fields)));
		const results = await Promise.allSettled(promises);
		this.loading = false;

		const failed = results.filter(r => r.status === 'rejected');
		if (failed.length) {
			try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.BULK_EDIT') || 'Bulk edit', detail: this.translate.instant('components.documents.bulk.PARTIAL_ERROR')?.replace('{n}', String(failed.length)) || (String(failed.length) + ' updates failed') }); } catch (e) {}
		} else {
			try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.BULK_EDIT') || 'Bulk edit', detail: this.translate.instant('components.documents.bulk.SUCCESS') || 'Bulk update applied' }); } catch (e) {}
		}

		this.bulkEditDialogVisible = false;
		// reload documents for current directory selection if present
		try { if (this.selectedFile) this.onDirectorySelect(this.selectedFile); else this.documentsItems = this.documentsItems; } catch (e) { /* ignore */ }
	}

	ngOnInit(): void {
		// init tree
		this.nodeService.getFiles().then((data) => {
			const tree = this.applyExpansionFromCurrent(data);
			this.files.set(tree);
			// keep a copy for TreeSelect usage and placeholder/path lookup
			this.directoryTree = tree || [];
			// initialize filtered tree according to current dialog project selection (if any)
			this.directoryTreeFiltered = this.filterDirectoryTree(this.directoryTree, this.editModel && this.editModel.project_id ? this.editModel.project_id : null);
			try { this.directoryPlaceholder = this.getPathForDirectoryValue(this.editModel && this.editModel.directory_id ? this.editModel.directory_id : null); } catch (e) { this.directoryPlaceholder = ''; }
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

	// init columns options (localized labels)
	this.columnsOptions = (this.columns || []).map(c => ({ label: this.translate.instant(c.headerKey) || c.headerKey, value: c.field }));
		this.selectedColumns = (this.columns || []).filter(c => c.visible).map(c => c.field);
		// preload projects so project selectors have options (same source as issues page)
		this.loadProjects();
		// preload types used in the create/edit dialog
		this.loadTypes();
		// priority options (localized)
		this.priorityOptions = [
			{ label: this.translate.instant('components.documents.priority.HIGH') || 'High', value: 'high' },
			{ label: this.translate.instant('components.documents.priority.MEDIUM') || 'Medium', value: 'medium' },
			{ label: this.translate.instant('components.documents.priority.LOW') || 'Low', value: 'low' }
		];
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
		this.editModel = {
			// core fields
			title: '',
			description: '',
			code: '',
			project_id: null,
			specialization_id: null,
			stage_id: null,
			type_id: null,
			priority: null,
			due_date: null,
			estimated_hours: null,
			status_id: null,
			directory_id: (this.selectedFile?.data?.id ?? (this.selectedFile?.key ? Number(this.selectedFile.key) : null))
		};
		this.isCreating = true;
		// preload selects; do NOT populate directory list until project is chosen
		this.loadSpecializations();
		this.loadStages(this.editModel.project_id);
		// show placeholder instructing user to pick project first and clear any filtered tree
		try {
			this.directoryTreeFiltered = [];
			this.directoryPlaceholder = this.translate.instant('components.documents.form.DIRECTORY_SELECT_PROJECT_FIRST') || 'Please select project first';
			this.editModel.directory_id = null;
			this.displayDialog = true;
			this.cdr.detectChanges();
		} catch (e) {
			this.directoryTreeFiltered = [];
			this.directoryPlaceholder = '';
			this.displayDialog = true;
		}
	}

	openEditDocument(item: any): void {
		if (!item) return;
		// normalize and ensure fields exist with expected types
		this.editModel = {
			code: item.code || item.document_number || '',
			title: item.title || '',
			description: item.description || item.body || '',
			project_id: item.project_id ?? item.project_id ?? null,
			specialization_id: item.specialization_id ?? item.specialization_id ?? null,
			stage_id: item.stage_id ?? item.stage_id ?? null,
			type_id: item.type_id ?? item.type_id ?? null,
			priority: item.priority ?? null,
			due_date: item.due_date ? new Date(item.due_date) : null,
			estimated_hours: item.estimated_hours ?? null,
			status_id: item.status_id ?? null,
			directory_id: item.directory_id ?? (item.directory && item.directory.id) ?? null,
			id: item.id
		};
		this.isCreating = false;
		// preload selects and stages for current project
		this.loadSpecializations();
		this.loadStages(this.editModel.project_id);
		this.displayDialog = true;
	}

	private validateDocumentForm(): boolean {
		this.formErrors = {};
		const t = this.translate && typeof this.translate.instant === 'function' ? this.translate.instant.bind(this.translate) : (k: string) => k;
		// Title
		if (!this.editModel || !this.editModel.title || String(this.editModel.title).trim() === '') {
			this.formErrors.title = (t('components.documents.form.TITLE_REQUIRED') || 'Title is required');
		}
		// Project
		if (!this.editModel || this.editModel.project_id === null || this.editModel.project_id === undefined || String(this.editModel.project_id).trim() === '') {
			this.formErrors.project_id = (t('components.documents.form.PROJECT_REQUIRED') || 'Project is required');
		}
		// Directory
		if (!this.editModel || this.editModel.directory_id === null || this.editModel.directory_id === undefined || String(this.editModel.directory_id).trim() === '') {
			this.formErrors.directory_id = (t('components.documents.form.DIRECTORY_REQUIRED') || 'Directory is required');
		}
		// Specialization
		if (!this.editModel || this.editModel.specialization_id === null || this.editModel.specialization_id === undefined || String(this.editModel.specialization_id).trim() === '') {
			this.formErrors.specialization_id = (t('components.documents.form.SPECIALIZATION_REQUIRED') || 'Specialization is required');
		}
		// Type
		if (!this.editModel || this.editModel.type_id === null || this.editModel.type_id === undefined || String(this.editModel.type_id).trim() === '') {
			this.formErrors.type_id = (t('components.documents.form.TYPE_REQUIRED') || 'Type is required');
		}
		// Document number (code)
		if (!this.editModel || !this.editModel.code || String(this.editModel.code).trim() === '') {
			this.formErrors.code = (t('components.documents.form.DOCUMENT_NUMBER_REQUIRED') || 'Document number is required');
		}
		return Object.keys(this.formErrors).length === 0;
	}

	async saveDocument(): Promise<void> {
		console.log('documents.saveDocument called', { editModel: this.editModel });
		if (!this.editModel) {
			console.warn('saveDocument aborted: no editModel');
			return;
		}
		if (!this.validateDocumentForm()) {
			console.warn('saveDocument aborted: validation failed', this.formErrors);
			try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }
			return;
		}
		this.loading = true;
		try {
			const payload: any = {
				title: String(this.editModel.title || ''),
				description: this.editModel.description || '',
				code: this.editModel.code || null,
				project_id: this.editModel.project_id || null,
				specialization_id: this.editModel.specialization_id || null,
				stage_id: this.editModel.stage_id || null,
				type_id: this.editModel.type_id || null,
				priority: this.editModel.priority || null,
				due_date: (this.editModel && this.editModel.due_date) ? (this.editModel.due_date instanceof Date ? this.editModel.due_date.toISOString() : String(this.editModel.due_date)) : null,
				estimated_hours: this.editModel.estimated_hours != null ? this.editModel.estimated_hours : null,
				status_id: this.editModel.status_id || null,
				// Ensure directory_id is a primitive integer (TreeSelect may provide node object)
				directory_id: ((): any => {
					let d = this.editModel.directory_id != null ? this.editModel.directory_id : (this.selectedFile?.data?.id ?? null);
					try {
						if (d && typeof d === 'object') {
							if (d.data && (d.data.id !== undefined && d.data.id !== null)) return d.data.id;
							if (d.key !== undefined && d.key !== null) return (typeof d.key === 'number' ? d.key : Number(d.key));
							return null;
						}
						if (d === '' || d === null || d === undefined) return null;
						return (typeof d === 'number' ? d : Number(d));
					} catch (e) { return null; }
				})()
			};
			if (this.isCreating) {
				// Remove empty fields before creating so backend doesn't receive null/empty values
				const pruned: any = {};
				for (const k of Object.keys(payload)) {
					const v = payload[k];
					if (v === null || v === undefined) continue;
					if (typeof v === 'string' && v.trim() === '') continue;
					if (Array.isArray(v) && v.length === 0) continue;
					if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) continue;
					pruned[k] = v;
				}
				await firstValueFrom(this.http.post('/api/documents', pruned));
				try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.SAVE') || 'Saved', detail: this.translate.instant('components.documents.form.UPDATED') || 'Created' }); } catch (e) {}
			} else {
				const id = this.editModel.id;
				if (id != null) await firstValueFrom(this.http.put(`/api/documents/${id}`, payload));
				try { this.messageService.add({ severity: 'success', summary: this.translate.instant('MENU.SAVE') || 'Saved', detail: this.translate.instant('components.documents.form.UPDATED') || 'Updated' }); } catch (e) {}
			}
			this.displayDialog = false;
			// refresh current directory
			if (this.selectedFile) this.onDirectorySelect(this.selectedFile);
		} catch (e) {
			console.error('Failed to save document', e);
			const errMsg = (e && typeof e === 'object' && 'message' in e) ? (e as any).message : String(e);
			try { this.messageService.add({ severity: 'error', summary: this.translate.instant('MENU.SAVE') || 'Save failed', detail: errMsg || (this.translate.instant('components.documents.messages.ERROR') || 'Failed to save') }); } catch (er) {}
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
			this.columnsOptions = (this.columns || []).map(c => ({ label: this.translate.instant(c.headerKey) || c.headerKey, value: c.field }));
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
		return this.avatarService.initialsFromName(name);
	}

	formatSurnameInitials(nameOrObj: any): string {
		return this.avatarService.formatSurnameInitials(nameOrObj);
	}

	issueAvatarColor(u: any): string { return this.avatarService.issueAvatarColor(u); }
	issueAvatarTextColor(u: any): string { return this.avatarService.issueAvatarTextColor(u); }

	statusSeverity(_code: any): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | null { return 'info'; }
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

	projectCode(_issue: any): string | null { return null; }

	// Called when TreeSelect model changes (user selects a directory)
	onDirectoryNgModelChange(value: any): void {
		// Keep TreeSelect value as-is (TreeNode object or primitive) so UI shows selected label.
		try {
			this.editModel = this.editModel || {};
			this.editModel.directory_id = value;
			this.directoryPlaceholder = this.getPathForDirectoryValue(value);
		} catch (e) { this.directoryPlaceholder = ''; }
		try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }
	}

	// Resolve path (dir/dir/...) for a given TreeSelect value which may be a node or primitive
	private getPathForDirectoryValue(value: any): string {
		if (!value) return '';
		let key: string | null = null;
		if (typeof value === 'object') {
			if (value.key !== undefined && value.key !== null) key = String(value.key);
			else if (value.data && (value.data.id !== undefined && value.data.id !== null)) key = String(value.data.id);
		} else {
			key = String(value);
		}
		if (!key) return '';
		// Try flattened options first
		try {
			const found = (this.directoryOptions || []).find(d => d && String(d.value) === String(key));
			if (found && found.label) {
				const parts = String(found.label).split(' - ');
				if (parts.length > 1) return parts[1];
				return String(found.label);
			}
		} catch (e) { /* ignore */ }
		// Traverse tree if needed
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

	/**
	 * Load document types from backend (/api/document_types)
	 */
	loadTypes(): void {
		this.http.get('/api/document_types').subscribe({
			next: (res: any) => {
				const items = (res && res.data) ? res.data : (res || []);
				this.typeOptions = (items || []).map((t: any) => ({ label: t.name || t.title || String(t.id), value: t.id }));
				try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }
			},
			error: (err) => { console.warn('Failed to load document types', err); this.typeOptions = []; try { this.cdr.detectChanges(); } catch (e) { /* ignore */ } }
		});
	}

	/**
	 * Load specializations for the select (GET /api/specializations)
	 */
	loadSpecializations(): void {
		this.http.get('/api/specializations').subscribe({
			next: (res: any) => {
				const items = (res && res.data) ? res.data : (res || []);
				this.specializationsOptions = (items || []).map((s: any) => ({ label: s.name || s.title || String(s.id), value: s.id }));
				try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }
			},
			error: (err) => { console.warn('Failed to load specializations', err); this.specializationsOptions = []; try { this.cdr.detectChanges(); } catch (e) { /* ignore */ } }
		});
	}

	/**
	 * Load stages, optionally filtered by project_id (GET /api/stages?project_id=...)
	 */
	loadStages(projectId?: any): void {
		// If no project is selected, do not load global stages — keep list empty so UI shows only project-scoped stages
		if (projectId === null || projectId === undefined || projectId === '') {
			this.stagesOptions = [];
			try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }
			return;
		}
		const params: any = {};
		params.project_id = String(projectId);
		this.http.get('/api/stages', { params }).subscribe({
			next: (res: any) => {
				const items = (res && res.data) ? res.data : (res || []);
				this.stagesOptions = (items || []).map((s: any) => ({ label: s.name || s.title || String(s.id), value: s.id }));
				try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }
			},
			error: (err) => { console.warn('Failed to load stages', err); this.stagesOptions = []; try { this.cdr.detectChanges(); } catch (e) { /* ignore */ } }
		});
	}

	/**
	 * Called when project is changed inside create/edit dialog to refresh stage list
	 */
	onDialogProjectChange(projectId: any): void {
		this.loadStages(projectId);
		// reset stage selection to avoid stale selection
		if (this.editModel) this.editModel.stage_id = null;
		// filter directory tree to show only directories for the selected project or with empty project_id
		try {
			// when no project selected, clear filtered tree and placeholder
			if (projectId === null || projectId === undefined || projectId === '') {
				this.directoryTreeFiltered = [];
				if (this.editModel) {
					this.editModel.directory_id = null;
					this.directoryPlaceholder = '';
				}
				try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }
				return;
			}
			// ensure we have the full tree loaded; if not, fetch it first then apply filter
			if (!this.directoryTree || !this.directoryTree.length) {
				this.nodeService.getFiles().then((data) => {
					this.directoryTree = this.applyExpansionFromCurrent(data);
					this.files.set(this.directoryTree);
					this.directoryTreeFiltered = this.filterDirectoryTree(this.directoryTree, projectId);
					// clear directory selection when project changes
					if (this.editModel) this.editModel.directory_id = null;
					try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }
				}).catch((e) => {
					console.warn('Failed to load directories on project change', e);
					this.directoryTreeFiltered = [];
					if (this.editModel) this.editModel.directory_id = null;
					try { this.cdr.detectChanges(); } catch (er) { /* ignore */ }
				});
			} else {
				this.directoryTreeFiltered = this.filterDirectoryTree(this.directoryTree, projectId);
				// always clear directory selection when project changes to avoid stale directory values
				if (this.editModel) {
					this.editModel.directory_id = null;
					this.directoryPlaceholder = '';
				}
				try { this.cdr.detectChanges(); } catch (e) { /* ignore */ }
			}
		} catch (e) { /* ignore filter errors */ }
	}

	/**
	 * Filter a directory tree to only include nodes that belong to given projectId or have no project_id.
	 * Keeps parent nodes if any child matches.
	 */
	private filterDirectoryTree(tree: any[] | undefined, projectId: any): any[] {
		if (!tree || !tree.length) return [];
		// if no project selected, show full tree
		if (projectId === null || projectId === undefined || projectId === '') return tree;
		const pid = projectId;
		const filterNode = (n: any): any | null => {
			if (!n) return null;
			const dataProj = n?.data?.project_id ?? n?.data?.projectId ?? null;
			let children: any[] = [];
			if (n.children && Array.isArray(n.children)) {
				children = n.children.map((c: any) => filterNode(c)).filter(Boolean);
			}
			// match only when node explicitly belongs to the project (do NOT include nodes with empty project_id)
			const matches = (dataProj !== null && dataProj !== undefined && String(dataProj) !== '') && (String(dataProj) === String(pid));
			if (matches || (children && children.length)) {
				const copy: any = { ...n };
				if (children && children.length) copy.children = children;
				else delete copy.children;
				return copy;
			}
			return null;
		};
		return tree.map(n => filterNode(n)).filter(Boolean);
	}
}
