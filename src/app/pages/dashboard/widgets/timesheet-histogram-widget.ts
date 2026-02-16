import { afterNextRender, Component, inject, signal } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
    standalone: true,
    selector: 'app-timesheet-histogram-widget',
    imports: [ChartModule, TranslateModule],
    template: `<div class="card mb-8!">
        <div class="font-semibold text-xl mb-4">{{ 'DASHBOARD_TIMESHEET.TITLE' | translate }}</div>
            <div style="height:40vh; display:flex;">
                <p-chart type="bar" [data]="chartData()" [options]="chartOptions()" style="flex:1 1 auto; height:100%; display:block;"/>
            </div>
    </div>`,
    styles: [
        // Ensure .p-chart wrapper and internal canvas fill the parent height
        `:host ::ng-deep .p-chart, :host ::ng-deep .p-chart canvas { height: 100% !important; }
         :host ::ng-deep .p-chart { display: block !important; }`
    ]
})
export class RevenueStreamWidget {
    chartData = signal<any>(null);

    chartOptions = signal<any>(null);

    private translate = inject(TranslateService);

    constructor() {
        // initialize chart after render
        afterNextRender(() => setTimeout(() => this.initChart(), 100));
    }

    private generateTestTimesheet(): { labels: string[]; data: number[] } {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); // 0-based
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const labels: string[] = [];
        const data: number[] = [];
        for (let d = 1; d <= daysInMonth; d++) {
            labels.push(String(d));
            // test data: random hours between 0 and 8 (simulate timesheet)
            const hours = Math.round(Math.random() * 9 * 10) / 10; // one decimal
            data.push(hours);
        }
        return { labels, data };
    }

    initChart() {
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--text-color') || '#333';
        const gridColor = documentStyle.getPropertyValue('--surface-border') || '#e0e0e0';

        const ts = this.generateTestTimesheet();

    const successColor = (documentStyle.getPropertyValue('--p-success-400') || '#66BB6A').trim();
    const warnColor = (documentStyle.getPropertyValue('--p-warning-400') || '#FFA726').trim();
    const dangerColor = (documentStyle.getPropertyValue('--p-danger-400') || '#EF5350').trim();
    const bgColors = ts.data.map((v: number) => (v < 5 ? dangerColor : v >= 8 ? successColor : warnColor));

        this.chartData.set({
            labels: ts.labels,
            datasets: [
                {
                    label: this.translate.instant('DASHBOARD_TIMESHEET.HOURS') || 'Hours',
                    backgroundColor: bgColors,
                    borderColor: bgColors,
                    data: ts.data,
                    barThickness: 12,
                    borderRadius: 4
                }
            ]
        });

        this.chartOptions.set({
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { mode: 'index', intersect: false }
            },
            scales: {
                x: {
                    ticks: { color: textColor },
                    grid: { color: 'transparent' }
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: textColor, stepSize: 1 },
                    grid: { color: gridColor }
                }
            }
        });

        // Ensure Chart.js recalculates size after DOM update
        setTimeout(() => window.dispatchEvent(new Event('resize')), 120);
    }
}
