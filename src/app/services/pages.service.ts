import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PagesService {
  constructor(private http: HttpClient) {}

  // Get pages/menu available to current user (uses cookie auth)
  getUserPages(): Observable<any> {
    return this.http.get<any>('/api/user/pages', { withCredentials: true });
  }
}
