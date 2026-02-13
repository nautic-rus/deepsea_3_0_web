import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface Attachment {
  name: string;
  // size in bytes (original) and size_mb (rounded to 2 decimals)
  size: number;
  size_bytes?: number;
  size_mb?: number;
  id?: any;
  url?: string | null;
  created_at?: string | null;
}

@Injectable({ providedIn: 'root' })
export class FileService {
  constructor(private http: HttpClient) {}

  /**
   * Attempt to fix "mojibake" — a UTF-8 string that was misinterpreted as Latin-1.
   * e.g. "ÐºÐ¾Ð¼Ð°Ð½Ð´Ñ.rtf" → "команда.rtf"
   *
   * If the string doesn't look broken or decoding fails, the original is returned.
   */
  private fixEncoding(str: string): string {
    if (!str) return str;
    // Fast check: if every char is already in ASCII + basic Cyrillic, nothing to fix
    // Mojibake produces chars in the 0x00C0–0x00FF range (Latin Extended-A/B)
    if (!/[\u00c0-\u00ff]/.test(str)) return str;
    try {
      // Encode each char code as a byte, then decode as UTF-8
      const bytes = new Uint8Array([...str].map(ch => ch.charCodeAt(0)));
      const decoded = new TextDecoder('utf-8').decode(bytes);
      // Sanity: if decoding produced replacement chars (U+FFFD), keep original
      if (decoded.includes('\uFFFD')) return str;
      return decoded;
    } catch {
      return str;
    }
  }

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
          // prefer new API fields: file_name and file_size
          let name = it.file_name || it.filename || it.filename_original || it.name || '';
          if (!name && objectKey) {
            const parts = objectKey.split('/');
            name = parts.length ? parts[parts.length - 1] : objectKey;
          }
          const id = it.id ?? it.storage_id ?? it.file_id ?? null;
          const url = id ? `/api/storage/${id}/download` : (it.url ?? it.download_url ?? null);
          const sizeBytesRaw = (it.file_size != null) ? (isNaN(Number(it.file_size)) ? parseInt(String(it.file_size), 10) || 0 : Number(it.file_size)) : (it.size != null ? Number(it.size) : 0);
          const sizeMb = sizeBytesRaw ? Math.round((sizeBytesRaw / (1024 * 1024)) * 100) / 100 : 0;
          return {
            name: this.fixEncoding(name || ''),
            size: sizeBytesRaw,
            size_bytes: sizeBytesRaw,
            size_mb: sizeMb,
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
