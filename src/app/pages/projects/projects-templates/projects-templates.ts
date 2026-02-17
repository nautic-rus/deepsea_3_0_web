import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-projects-templates',
  standalone: true,
  imports: [CommonModule, TranslateModule, RouterModule, ButtonModule],
  template: `
<div class="page-wiki">
  <section class="admin-subpage-content card text-center flex flex-col items-center justify-center" style="height: 90vh;">
    <div class="mb-4">
      <h1>{{ 'MENU.WIKI' | translate }}</h1>
    </div>

    <p>Мы работаем над этой страницей — приходите позже или вернитесь на главную.</p>

    <p-button [label]="('components.underDevelopment.GO_HOME' | translate)" routerLink="/" severity="success" class="mt-5"/>
  </section>
</div>

  `
  ,
  styleUrls: ['./projects-templates.scss']
})
export class ProjectsTemplatesComponent {}
