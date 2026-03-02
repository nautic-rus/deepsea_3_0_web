import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LinkPayload {
  active_type: string;
  active_id: number | string;
  passive_type: string;
  passive_id: number | string;
  relation_type?: string;
}

export interface LinkSearchParams {
  active_type?: string;
  active_id?: number | string;
  passive_type?: string;
  passive_id?: number | string;
  relation_type?: string;
  created_by?: number | string;
  id?: number | string;
}

@Injectable({ providedIn: 'root' })
export class LinksService {
  constructor(private http: HttpClient) {}

  /**
   * Search / list links (GET /api/links)
   */
  getLinks(params: LinkSearchParams): Observable<any> {
    let httpParams = new HttpParams();
    if (params.active_type) httpParams = httpParams.set('active_type', String(params.active_type));
    if (params.active_id != null) httpParams = httpParams.set('active_id', String(params.active_id));
    if (params.passive_type) httpParams = httpParams.set('passive_type', String(params.passive_type));
    if (params.passive_id != null) httpParams = httpParams.set('passive_id', String(params.passive_id));
    if (params.relation_type) httpParams = httpParams.set('relation_type', String(params.relation_type));
    if (params.created_by != null) httpParams = httpParams.set('created_by', String(params.created_by));
    if (params.id != null) httpParams = httpParams.set('id', String(params.id));
    return this.http.get<any>('/api/links', { params: httpParams });
  }

  /**
   * Create a link between two entities (POST /api/links)
   */
  createLink(payload: LinkPayload): Observable<any> {
    return this.http.post<any>('/api/links', payload);
  }

  /**
   * Delete a link by id (DELETE /api/links/{id})
   */
  deleteLink(id: number | string): Observable<any> {
    return this.http.delete<any>(`/api/links/${id}`);
  }
}
