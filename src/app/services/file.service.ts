import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface Attachment {
  name: string;
  size: number;
  id?: any;
  url?: string | null;
  created_at?: string | null;
}

@Injectable({ providedIn: 'root' })
export class FileService {
  constructor(private http: HttpClient) {}

  uploadFile(file: File): Observable<HttpEvent<any>> {
    const fd = new FormData();
    fd.append('file', file, file.name);
    return this.http.post('/api/storage/local', fd, { reportProgress: true, observe: 'events' });
  }

  attachToIssue(issueId: any, storageId: any): Observable<any> {
    return this.http.post(`/api/issues/${issueId}/files`, { storage_id: storageId }, { withCredentials: true });
  }

  getIssueFiles(issueId: any): Observable<Attachment[]> {
    return this.http.get(`/api/issues/${issueId}/files`).pipe(
      map((res: any) => {
        const data = (res && res.data) ? res.data : res || [];
        if (!Array.isArray(data)) return [];
        return data.map((it: any) => {
          const objectKey: string | undefined = it.object_key || it.objectKey || undefined;
          let name = it.filename || it.filename_original || it.name || '';
          if (!name && objectKey) {
            const parts = objectKey.split('/');
            name = parts.length ? parts[parts.length - 1] : objectKey;
          }
          const id = it.id ?? it.storage_id ?? it.file_id ?? null;
          const url = id ? `/api/storage/${id}/download` : (it.url ?? it.download_url ?? null);
          return {
            name: name || '',
            size: it.size != null ? it.size : 0,
            id,
            url,
            created_at: it.created_at ?? it.createdAt ?? null
          } as Attachment;
        });
      }),
      catchError((err: any) => {
        console.warn('getIssueFiles error', err);
        return of([] as Attachment[]);
      })
    );
  }

  deleteIssueFile(issueId: any, storageId: any): Observable<any> {
    return this.http.delete(`/api/issues/${issueId}/files/${storageId}`, { withCredentials: true });
  }

  downloadUrlForId(id: any): string {
    return id ? `/api/storage/${id}/download` : '';
  }
}
