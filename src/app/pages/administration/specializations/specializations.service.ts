import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';

/**
 * Temporary stub service for specializations.
 * Replaces network calls to /api/specializations with in-memory data until the backend is available.
 * The public methods keep the same signatures and return Observables so callers don't need to change.
 */
@Injectable({ providedIn: 'root' })
export class SpecializationsService {
  private items: Array<any> = [
    { id: 1, name: 'Engineering', code: 'ENG', description: 'Engineering specialization', created_at: new Date().toISOString() },
    { id: 2, name: 'Design', code: 'DSN', description: 'Design specialization', created_at: new Date().toISOString() }
  ];
  private nextId = 3;

  constructor() {}

  getPermissions(page = 1, limit = 1000): Observable<any> {
    // mimic paginated response shape { data: [...] }
    const start = (page - 1) * limit;
    const data = this.items.slice(start, start + limit);
    return of({ data, total: this.items.length });
  }

  updatePermission(id: string | number, payload: any): Observable<any> {
    const idx = this.items.findIndex(i => String(i.id) === String(id));
    if (idx === -1) {
      return throwError(() => new Error('Not found'));
    }
    this.items[idx] = { ...this.items[idx], ...payload };
    return of({ data: this.items[idx] });
  }

  createPermission(payload: any): Observable<any> {
    const item = { id: this.nextId++, created_at: new Date().toISOString(), ...payload };
    this.items.unshift(item);
    return of({ data: item });
  }

  deletePermission(id: string | number): Observable<any> {
    const idx = this.items.findIndex(i => String(i.id) === String(id));
  if (idx === -1) return throwError(() => new Error('Not found'));
  const removed = this.items.splice(idx, 1)[0];
  return of({ data: removed });
  }
}
