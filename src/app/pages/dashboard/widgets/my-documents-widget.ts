import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
  standalone: true,
  selector: 'app-my-documents-widget',
  imports: [CommonModule, ButtonModule],
  template: `
  <div class="col-span-12 md:col-span-6 lg:col-span-6 xl:col-span-6">
      <div class="card mb-0">
        <div class="flex items-center justify-between mb-4">
          <div class="font-semibold text-xl">Мои документы</div>
          <button pButton type="button" icon="pi pi-cloud-upload" class="p-button-rounded p-button-text p-button-plain"></button>
        </div>

        <ul class="list-none p-0 m-0">
          <li class="py-2 border-b border-surface">
            <div class="font-medium text-surface-900 dark:text-surface-0">budget_q1.xlsx</div>
            <div class="text-muted-color text-sm">.xlsx · 120 KB</div>
          </li>
          <li class="py-2 border-b border-surface">
            <div class="font-medium text-surface-900 dark:text-surface-0">presentation.pptx</div>
            <div class="text-muted-color text-sm">.pptx · 3.4 MB</div>
          </li>
          <li class="py-2">
            <div class="font-medium text-surface-900 dark:text-surface-0">contract.pdf</div>
            <div class="text-muted-color text-sm">.pdf · 540 KB</div>
          </li>
        </ul>
      </div>
    </div>
  `
})
export class MyDocumentsWidget {}
