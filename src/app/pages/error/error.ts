import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-error',
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
                            <h1 class="text-surface-900 dark:text-surface-0 font-bold text-4xl lg:text-5xl mb-2">{{ 'components.error.TITLE' | translate }}</h1>
                            <span class="text-muted-color mb-8">{{ 'components.error.MESSAGE' | translate }}</span>
                            <img src="/404.png" alt="Error" class="mb-8" width="70%" />
                            <div class="col-span-12 mt-8 text-center">
                                <p-button [label]="('components.error.GO_DASHBOARD' | translate)" routerLink="/" severity="primary" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
  `
})
export class ErrorComponent {}
