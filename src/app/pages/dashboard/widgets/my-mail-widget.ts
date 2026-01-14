import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';

@Component({
  standalone: true,
  selector: 'app-my-mail-widget',
  imports: [CommonModule, ButtonModule, BadgeModule],
  template: `
  <div class="col-span-12 md:col-span-6 lg:col-span-6 xl:col-span-6">
      <div class="card mb-0">
        <div class="flex items-center justify-between mb-4">
          <div class="font-semibold text-xl">Моя почта</div>
          <button pButton type="button" icon="pi pi-envelope" class="p-button-rounded p-button-text p-button-plain"></button>
        </div>

        <ul class="list-none p-0 m-0">
          <li class="flex items-start py-3 border-b border-surface">
            <div class="flex-1">
              <div class="font-medium text-surface-900 dark:text-surface-0">От: Иван Петров</div>
              <div class="text-muted-color text-sm">Тема: Обновление проекта</div>
            </div>
            <p-badge value="2" severity="info"></p-badge>
          </li>
          <li class="flex items-start py-3 border-b border-surface">
            <div class="flex-1">
              <div class="font-medium text-surface-900 dark:text-surface-0">От: QA Team</div>
              <div class="text-muted-color text-sm">Тема: Ошибка на проде</div>
            </div>
            <p-badge value="!" severity="danger"></p-badge>
          </li>
          <li class="flex items-start py-3">
            <div class="flex-1">
              <div class="font-medium text-surface-900 dark:text-surface-0">От: HR</div>
              <div class="text-muted-color text-sm">Тема: Политика отпусков</div>
            </div>
            <p-badge value="1" severity="secondary"></p-badge>
          </li>
        </ul>
      </div>
    </div>
  `
})
export class MyMailWidget {}
