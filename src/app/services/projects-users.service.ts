import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProjectsUsersService {
  constructor(private http: HttpClient) {}

  // placeholder: list projects-users (left pointing to same endpoint as projects for now)
  getProjects(): Observable<any> {
    return this.http.get('/api/projects');
  }

  // create a new project-user mapping (placeholder)
  createProject(payload: any): Observable<any> {
    return this.http.post('/api/projects', payload);
  }
  
  // delete a project by id (placeholder)
  deleteProject(id: string | number): Observable<any> {
    return this.http.delete(`/api/projects/${encodeURIComponent(String(id))}`);
  }

  // update an existing project by id (PUT /api/projects/{id})
  updateProject(id: string | number, payload: any): Observable<any> {
    return this.http.put(`/api/projects/${encodeURIComponent(String(id))}`, payload);
  }

  // get assignments for a project (GET /api/projects/{id}/assignments)
  getAssignments(projectId: string | number): Observable<any> {
    return this.http.get(`/api/projects/${encodeURIComponent(String(projectId))}/assignments`);
  }

  // bulk delete assignments: DELETE /api/projects/{projectId}/assignments with body { user_id: [...], roles: [...] }
  // payload example: { user_id: [34,22], roles: [24,5] }
  deleteAssignments(projectId: string | number, payload: { user_id?: Array<string|number>, roles?: Array<string|number> }): Observable<any> {
    const url = `/api/projects/${encodeURIComponent(String(projectId))}/assignments`;
    // Angular HttpClient supports a body in delete via the request() method
    return this.http.request('delete', url, { body: payload });
  }

  // create assignments (bulk assign users/roles)
  // NEW: POST to /api/projects/assign with payload: { project_id, user_id: [...], roles: [...] }
  createAssignments(payload: any): Observable<any> {
    return this.http.post('/api/projects/assign', payload);
  }

  // get list of roles (used to populate roles multiselect)
  getRoles(): Observable<any> {
    return this.http.get('/api/roles');
  }
}
