import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    standalone: true,
    selector: 'app-stats-widget',
    imports: [CommonModule, TranslateModule],
        styles: [
                `:host { display: block; }`
        ,
        `
        .stats-grid { display: grid; grid-template-columns: repeat(1, 1fr); gap: 1rem; }

        @media (min-width: 768px) and (max-width: 1199px) {
            .stats-grid { grid-template-columns: repeat(2, 1fr); }
        }

        @media (min-width: 1200px) {
            .stats-grid { grid-template-columns: repeat(4, 1fr); }
        }

        .stats-grid .stat-item { min-width: 0; }
        `
        ],
        template: `<div class="stats-grid">
        <div class="stat-item">
            <div class="card mb-0 mt-0">
                <div class="flex justify-between mb-4">
                    <div>
                        <span class="block text-muted-color font-medium mb-4">{{ 'DASHBOARD_WIDGETS.MY_PROJECTS' | translate }}</span>
                        <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">152</div>
                    </div>
                    <div class="flex items-center justify-center bg-blue-100 dark:bg-blue-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem" aria-hidden="true">
                        <i class="pi pi-briefcase text-blue-500 text-xl!"></i>
                    </div>
                </div>
                <span class="text-primary font-medium">24 new </span>
                <span class="text-muted-color">since last visit</span>
            </div>
        </div>
        <div class="stat-item">
            <div class="card mb-0 mt-0">
                <div class="flex justify-between mb-4">
                    <div>
                        <span class="block text-muted-color font-medium mb-4">{{ 'DASHBOARD_WIDGETS.MY_TASKS' | translate }}</span>
                        <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">$2.100</div>
                    </div>
                    <div class="flex items-center justify-center bg-orange-100 dark:bg-orange-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem" aria-hidden="true">
                        <i class="pi pi-check-circle text-orange-500 text-xl!"></i>
                    </div>
                </div>
                <span class="text-primary font-medium">%52+ </span>
                <span class="text-muted-color">since last week</span>
            </div>
        </div>
        <div class="stat-item">
            <div class="card mb-0 mt-0">
                <div class="flex justify-between mb-4">
                    <div>
                        <span class="block text-muted-color font-medium mb-4">{{ 'DASHBOARD_WIDGETS.MY_DOCUMENTS' | translate }}</span>
                        <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">28441</div>
                    </div>
                    <div class="flex items-center justify-center bg-cyan-100 dark:bg-cyan-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem" aria-hidden="true">
                        <i class="pi pi-file text-cyan-500 text-xl!"></i>
                    </div>
                </div>
                <span class="text-primary font-medium">520 </span>
                <span class="text-muted-color">newly registered</span>
            </div>
        </div>
        <div class="stat-item">
            <div class="card mb-0 mt-0">
                <div class="flex justify-between mb-4">
                    <div>
                        <span class="block text-muted-color font-medium mb-4">{{ 'DASHBOARD_WIDGETS.MY_QUESTIONS' | translate }}</span>
                        <div class="text-surface-900 dark:text-surface-0 font-medium text-xl">152 Unread</div>
                    </div>
                    <div class="flex items-center justify-center bg-purple-100 dark:bg-purple-400/10 rounded-border" style="width: 2.5rem; height: 2.5rem" aria-hidden="true">
                        <i class="pi pi-question text-purple-500 text-xl!"></i>
                    </div>
                </div>
                <span class="text-primary font-medium">85 </span>
                <span class="text-muted-color">responded</span>
            </div>
        </div>
    </div>`
})
export class StatsWidget {}
