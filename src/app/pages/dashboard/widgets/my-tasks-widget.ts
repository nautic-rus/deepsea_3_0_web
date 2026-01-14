import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
  standalone: true,
  selector: 'app-my-tasks-widget',
  imports: [CommonModule, ButtonModule],
  template: `
  <div class="col-span-12 md:col-span-6 lg:col-span-6 xl:col-span-6">
      <div class="card mb-0">
        <div class="flex items-center justify-between mb-4">
          <div class="font-semibold text-xl">Мои задачи</div>
          <button pButton type="button" icon="pi pi-plus" class="p-button-rounded p-button-text p-button-plain"></button>
        </div>

        <ul class="list-none p-0 m-0">
          <li class="flex items-center justify-between py-2 border-b border-surface">
            <div>
              <div class="font-medium text-surface-900 dark:text-surface-0">Подготовить отчёт Q1</div>
              <div class="text-muted-color text-sm">Срок: 15 янв</div>
            </div>
            <button pButton type="button" icon="pi pi-check" class="p-button-rounded p-button-text p-button-plain"></button>
          </li>
          <li class="flex items-center justify-between py-2 border-b border-surface">
            <div>
              <div class="font-medium text-surface-900 dark:text-surface-0">Проверить почту</div>
              <div class="text-muted-color text-sm">Срок: сегодня</div>
            </div>
            <button pButton type="button" icon="pi pi-check" class="p-button-rounded p-button-text p-button-plain"></button>
          </li>
          <li class="flex items-center justify-between py-2">
            <div>
              <div class="font-medium text-surface-900 dark:text-surface-0">Запланировать встречу</div>
              <div class="text-muted-color text-sm">Срок: 20 янв</div>
            </div>
            <button pButton type="button" icon="pi pi-check" class="p-button-rounded p-button-text p-button-plain"></button>
          </li>
        </ul>
      </div>
    </div>
  `
})
export class MyTasksWidget {}
