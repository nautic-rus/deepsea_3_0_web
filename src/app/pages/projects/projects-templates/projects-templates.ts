import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-projects-templates',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="card p-4">
      <h3>{{ 'MENU.PROJECTS' | translate }} — templates</h3>
      <p class="text-muted">Placeholder for project templates and presets.</p>
    </div>
  `
  ,
  styleUrls: ['./projects-templates.scss']
})
export class ProjectsTemplatesComponent {}
