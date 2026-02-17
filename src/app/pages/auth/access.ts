import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-access',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule, TranslateModule],
  template: `
    <div class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-screen overflow-hidden">
      <div class="flex flex-col items-center justify-center">
        <div style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, var(--primary-color) 10%, rgba(247, 149, 48, 0) 30%)">
          <div class="w-full bg-surface-0 dark:bg-surface-900 py-20 px-8 sm:px-20 flex flex-col items-center" style="border-radius: 53px; max-width: 900px; width: 100%">
            <div class="gap-4 flex flex-col items-center">
              <div class="flex justify-center items-center border-2 border-blue-500 rounded-full" style="width: 3.2rem; height: 3.2rem">
                <i class="text-blue-500 pi pi-fw pi-lock text-2xl!"></i>
              </div>
              <h1 class="text-surface-900 dark:text-surface-0 font-bold text-4xl lg:text-5xl mb-2">{{ 'components.access.TITLE' | translate }}</h1>
              <span class="text-muted-color mb-8">{{ 'components.access.MESSAGE' | translate }}</span>
              <img src="/403.png" alt="Access denied" class="mb-8" width="70%" />
              <div class="col-span-12 mt-8 text-center flex gap-4 justify-center">
                <p-button [label]="('components.access.GO_DASHBOARD' | translate)" routerLink="/" severity="primary"></p-button>
                <p-button (click)="contactAdmin()" [label]="('components.access.CONTACT_ADMIN' | translate)" severity="warn"></p-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AccessComponent {
  contactAdmin() {
    // Open user's mail client to contact administrator.
    // Assumption: use a placeholder admin address — update if you have a real one.
    window.location.href = 'mailto:spiridovich@nautic-rus.ru';
  }
}
