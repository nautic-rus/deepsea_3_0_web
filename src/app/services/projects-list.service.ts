import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProjectsListService {
  constructor(private http: HttpClient) {}

  // placeholder: list projects
  getProjects(): Observable<any> {
    return this.http.get('/api/projects');
  }

  // create a new project
  createProject(payload: any): Observable<any> {
    return this.http.post('/api/projects', payload);
  }

  // update an existing project by id (PUT /api/projects/{id})
  updateProject(id: string | number, payload: any): Observable<any> {
    return this.http.put(`/api/projects/${encodeURIComponent(String(id))}`, payload);
  }
  
  // delete a project by id
  deleteProject(id: string | number): Observable<any> {
    return this.http.delete(`/api/projects/${encodeURIComponent(String(id))}`);
  }
}
