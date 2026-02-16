import { Component, signal } from '@angular/core';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';

@Component({
    standalone: true,
    selector: 'app-timesheet-calendar-widget',
    imports: [CommonModule, TableModule],
    template: `<div class="card mb-8!">
        <div class="font-semibold text-xl mb-4">My Timesheet</div>
        <div class="timesheet-calendar">
            <table class="w-full border-collapse">
                <thead>
                    <tr>
                        <th *ngFor="let h of weekdays" class="text-left py-2">{{ h }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr *ngFor="let week of weeks()">
                        <td *ngFor="let day of week" class="align-top p-2 border" [ngClass]="getCellClass(day)">
                            <div *ngIf="day">
                                <div class="text-sm text-muted">{{ day.number }}</div>
                                <div class="font-medium mt-1" [style.color]="getColor(day.hours)">{{ day.hours }}h</div>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>`,
    styles: [
        `:host ::ng-deep .timesheet-calendar table { table-layout: fixed; }
         :host ::ng-deep .timesheet-calendar td { height: 6rem; vertical-align: top; }
         :host ::ng-deep .timesheet-calendar .border { border: 1px solid var(--surface-border, #e0e0e0); }
         :host ::ng-deep .text-muted { color: var(--text-color-secondary, #777); }`
    ]
})
export class RecentSalesWidget {
    weeks = signal<any[][]>([]);

    weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    ngOnInit() {
        const timesheet = this.generateTestTimesheet();
        this.weeks.set(this.buildWeeks(timesheet.labels, timesheet.data));
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
            const hours = Math.round(Math.random() * 8 * 10) / 10;
            data.push(hours);
        }
        return { labels, data };
    }

    private buildWeeks(labels: string[], data: number[]) {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
        const weeks: any[][] = [];
        let week: any[] = new Array(7).fill(null);
        let dayIndex = 0;

        // fill initial empty days
        for (let i = 0; i < firstDay; i++) {
            week[i] = null;
        }

        for (let i = 0; i < labels.length; i++) {
            const dayOfWeek = (firstDay + i) % 7;
            const dayNum = Number(labels[i]);
            week[dayOfWeek] = { number: dayNum, hours: data[i] };
            if (dayOfWeek === 6 || i === labels.length - 1) {
                weeks.push(week);
                week = new Array(7).fill(null);
            }
            dayIndex++;
        }

        return weeks;
    }

    getColor(hours: number) {
        const docStyle = getComputedStyle(document.documentElement);
        const success = docStyle.getPropertyValue('--p-success-400') || '#66BB6A';
        const warn = docStyle.getPropertyValue('--p-warning-400') || '#FFA726';
        const danger = docStyle.getPropertyValue('--p-danger-400') || '#EF5350';
        if (hours == null) return 'inherit';
        if (hours < 5) return danger.trim();
        if (hours >= 8) return success.trim();
        return warn.trim();
    }

    getCellClass(day: any) {
        return day ? '' : 'bg-transparent';
    }
}
