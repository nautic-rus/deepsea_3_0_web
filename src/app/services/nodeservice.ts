import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { TreeNode } from 'primeng/api';

interface DirectoryItem {
	id: number;
	name: string;
	project_id?: number;
	path?: string | null;
	parent_id?: number | null;
	[key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class NodeService {
	private _filesCache: Promise<TreeNode[]> | null = null;

	constructor(private http: HttpClient) {}

	/**
	 * Load directories from backend and convert to PrimeNG TreeNode[]
	 * Endpoint: GET /api/documents/directories -> { data: DirectoryItem[] }
	 */
	async getFiles(): Promise<TreeNode[]> {
		// Return cached value when available to avoid duplicate network requests
		if (this._filesCache) return this._filesCache;

		this._filesCache = (async () => {
			try {
				const resp = await firstValueFrom(
					this.http.get<{ data: DirectoryItem[] }>('/api/documents/directories')
				);

				const list = resp?.data || [];

			// Build map of id -> TreeNode
			const nodeMap = new Map<number, TreeNode>();
			for (const item of list) {
				nodeMap.set(item.id, {
					key: String(item.id),
					label: item.name,
					data: item,
					children: []
				});
			}

					// Attach children to parents; collect roots
					const roots: TreeNode[] = [];
					for (const item of list) {
						const node = nodeMap.get(item.id)!;
						const parentId = item.parent_id;
						if (parentId == null) {
							roots.push(node);
						} else {
							const parentNode = nodeMap.get(parentId);
							if (parentNode) {
								parentNode.children = parentNode.children || [];
								parentNode.children.push(node);
							} else {
								// If parent is missing, treat as root to avoid data loss
								roots.push(node);
							}
						}
					}

							// Set icons: use folder icon for all directory nodes.
							// For parent nodes provide collapsed/expanded icons, for leaf directories use the folder icon.
							nodeMap.forEach((node) => {
								if (node.children && node.children.length > 0) {
									// PrimeIcons: folder / folder-open for expandable nodes
									node.collapsedIcon = 'pi pi-folder';
									node.expandedIcon = 'pi pi-folder-open';
								} else {
									// Leaf directory — still show folder icon (no file icons in this tree)
									node.icon = 'pi pi-folder';
								}
							});

				return roots;
			} catch (e) {
				// On error, clear cache so subsequent attempts can retry
				this._filesCache = null;
				console.error('Failed to load document directories', e);
				return [];
			}
		})();

		return this._filesCache;
	}

	/**
	 * Load files for a specific document and convert to PrimeNG TreeNode[] grouped by type_name.
	 * Endpoint: GET /api/documents/{id}/files -> { data: FileItem[] }
	 */
	async getFilesForDocument(documentId: number): Promise<TreeNode[]> {
		try {
			const resp = await firstValueFrom(
				this.http.get<{ data: any[] }>(`/api/documents/${documentId}/files`)
			);
			const list = resp?.data || [];

			// Group files by type_name to create a tree: parent nodes are file types
			const groups = new Map<string, any[]>();
			for (const file of list) {
				const key = file.type_name || 'Other';
				if (!groups.has(key)) groups.set(key, []);
				groups.get(key)!.push(file);
			}

			const roots: TreeNode[] = [];
			for (const [typeName, files] of groups.entries()) {
				const children: TreeNode[] = files.map((f) => ({
					key: String(f.id),
					label: f.file_name,
					data: {
						file_name: f.file_name,
						file_size: f.file_size,
						rev: f.rev,
						user: f.user,
						storage_created_at: f.storage_created_at,
						_original: f
					}
				}));

				roots.push({
					key: `type-${typeName}`,
					label: typeName,
					data: { type_name: typeName },
					children
				});
			}

			return roots;
		} catch (e) {
			console.error('Failed to load document files', e);
			return [];
		}
	}

	/**
	 * Download a specific file by id.
	 * Assumes backend exposes: GET /api/documents/files/{fileId}/download -> binary
	 */
	async downloadFile(fileId: number): Promise<Blob> {
		return firstValueFrom(
			this.http.get(`/api/documents/files/${fileId}/download`, { responseType: 'blob' as 'json' }) as any
		);
	}

	/**
	 * Delete a specific file by id.
	 * Assumes backend exposes: DELETE /api/documents/files/{fileId}
	 */
	async deleteFile(fileId: number): Promise<void> {
		await firstValueFrom(this.http.delete(`/api/documents/files/${fileId}`));
	}
}
