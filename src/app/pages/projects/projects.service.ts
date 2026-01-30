import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProjectsService {
  constructor(private http: HttpClient) {}

  // Fetch projects list. API supports pagination via page & limit query params.
  getProjects(page = 1, limit = 1000): Observable<any> {
    return this.http.get(`/api/projects?page=${page}&limit=${limit}`);
  }

  getProject(id: string | number): Observable<any> {
    return this.http.get(`/api/projects/${encodeURIComponent(String(id))}`);
  }

  // Fetch assignments (users assigned to a project)
  getAssignments(projectId: string | number): Observable<any> {
    return this.http.get(`/api/projects/${encodeURIComponent(String(projectId))}/assignments`);
  }
}
