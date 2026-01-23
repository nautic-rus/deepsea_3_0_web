import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(private http: HttpClient) {}

  getUsers(page = 1, limit = 1000): Observable<any> {
    return this.http.get(`/api/users?page=${page}&limit=${limit}`);
  }

  getDepartments(limit = 1000): Observable<any> {
    return this.http.get(`/api/departments?limit=${limit}`);
  }

  updateUser(id: string | number, payload: any): Observable<any> {
    return this.http.put(`/api/users/${encodeURIComponent(String(id))}`, payload);
  }

  createUser(payload: any): Observable<any> {
    // API endpoint requested: POST /api/create_users
    return this.http.post('/api/create_users', payload);
  }

  deleteUser(id: string | number): Observable<any> {
    return this.http.delete(`/api/users/${encodeURIComponent(String(id))}`);
  }
}
