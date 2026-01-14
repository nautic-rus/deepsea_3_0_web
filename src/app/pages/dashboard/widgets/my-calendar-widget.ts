import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
  standalone: true,
  selector: 'app-my-calendar-widget',
  imports: [CommonModule, ButtonModule],
  template: `
  <div class="col-span-12 md:col-span-6 lg:col-span-6 xl:col-span-6">
      <div class="card mb-0">
        <div class="flex items-center justify-between mb-4">
          <div class="font-semibold text-xl">Мой календарь</div>
          <button pButton type="button" icon="pi pi-calendar-plus" class="p-button-rounded p-button-text p-button-plain"></button>
        </div>

        <ul class="list-none p-0 m-0">
          <li class="py-2 border-b border-surface">
            <div class="font-medium text-surface-900 dark:text-surface-0">Standup — Команда</div>
            <div class="text-muted-color text-sm">Сегодня · 10:00</div>
          </li>
          <li class="py-2 border-b border-surface">
            <div class="font-medium text-surface-900 dark:text-surface-0">Встреча с клиентом</div>
            <div class="text-muted-color text-sm">Завтра · 14:30</div>
          </li>
          <li class="py-2">
            <div class="font-medium text-surface-900 dark:text-surface-0">Ревью проекта</div>
            <div class="text-muted-color text-sm">20 янв · 16:00</div>
          </li>
        </ul>
      </div>
    </div>
  `
})
export class MyCalendarWidget {}
