import { Component, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { CommonModule } from '@angular/common';

@Component({
    standalone: true,
    selector: 'app-activity-widget',
    imports: [ButtonModule, MenuModule, CommonModule],
    template: `<div class="card mt-0">
        <div class="flex items-center justify-between mb-6">
            <div class="font-semibold text-xl">Activity</div>
            <div>
                <button pButton type="button" icon="pi pi-ellipsis-v" class="p-button-rounded p-button-text p-button-plain" (click)="menu.toggle($event)"></button>
                <p-menu #menu [popup]="true" [model]="items"></p-menu>
            </div>
        </div>

        <ng-container *ngFor="let group of grouped()">
            <span class="block text-muted-color font-medium mb-4">{{ group.label }}</span>
            <ul class="p-0 m-0 list-none mb-6">
                <li *ngFor="let ev of group.items" class="flex items-center py-2 border-b border-surface">
                    <div class="w-12 h-12 flex items-center justify-center rounded-full mr-4 shrink-0" [ngClass]="colorFor(ev.type)">
                        <i [class]="iconFor(ev.type) + ' text-xl!' + ' ' + (ev.type === 'document' ? 'text-blue-500' : ev.type === 'question' ? 'text-orange-500' : 'text-green-500')"></i>
                    </div>
                    <div class="flex-1">
                        <div class="text-surface-900 dark:text-surface-0 leading-normal">
                            <strong>{{ ev.actor }}</strong>
                            <span class="text-surface-700 dark:text-surface-100"> {{ ev.action }} </span>
                            <span class="text-primary font-bold">{{ ev.target }}</span>
                        </div>
                        <div class="text-sm text-muted-color">{{ ev.time | date:'shortTime' }}</div>
                    </div>
                    <div class="ml-4">
                        <button pButton type="button" label="Прочитать" class="p-button-sm" (click)="markRead(ev)" [disabled]="ev.read"></button>
                    </div>
                </li>
                <li *ngIf="!group.items || group.items.length === 0" class="text-surface-700 py-2">No activity</li>
            </ul>
        </ng-container>
    </div>`
})
export class NotificationsWidget {
    items = [
        { label: 'Add New', icon: 'pi pi-fw pi-plus' },
        { label: 'Remove', icon: 'pi pi-fw pi-trash' }
    ];

    // activity events fallback (would normally come from API)
    events = signal<any[]>([]);

    ngOnInit() {
        this.events.set(this.generateSampleEvents());
    }

    private generateSampleEvents() {
        const now = new Date();
        const today = (d: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate(), d);
        // sample events across today, yesterday, last week
        return [
            { type: 'task', actor: 'You', action: 'updated', target: 'Issue #123', time: today(9), read: false },
            { type: 'document', actor: 'Anna', action: 'commented on', target: 'Spec.docx', time: today(11), read: false },
            { type: 'question', actor: 'Michael', action: 'asked', target: 'Question about API', time: today(13), read: false },
            { type: 'task', actor: 'You', action: 'closed', target: 'Task #98', time: new Date(now.getTime() - 1000 * 60 * 60 * 24), read: false },
            { type: 'document', actor: 'Olga', action: 'uploaded', target: 'Design.png', time: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2), read: false },
            { type: 'question', actor: 'Sergey', action: 'answered', target: 'How to deploy', time: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 6), read: false }
        ];
    }

    // helper to group events by period label
    grouped() {
        const ev = this.events();
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfYesterday = new Date(startOfToday.getTime() - 1000 * 60 * 60 * 24);
        const startOfWeek = new Date(startOfToday.getTime() - 1000 * 60 * 60 * 24 * 7);

        const groups: { label: string; items: any[] }[] = [
            { label: 'TODAY', items: [] },
            { label: 'YESTERDAY', items: [] },
            { label: 'LAST WEEK', items: [] }
        ];

        for (const e of ev) {
            const t = new Date(e.time).getTime();
            if (t >= startOfToday.getTime()) groups[0].items.push(e);
            else if (t >= startOfYesterday.getTime()) groups[1].items.push(e);
            else groups[2].items.push(e);
        }

        return groups;
    }

    // icon per type
    iconFor(type: string) {
        switch (type) {
            case 'task': return 'pi pi-check';
            case 'document': return 'pi pi-file';
            case 'question': return 'pi pi-question';
            default: return 'pi pi-info';
        }
    }

    // color per type
    colorFor(type: string) {
        switch (type) {
            case 'task': return 'bg-green-100 text-green-500';
            case 'document': return 'bg-blue-100 text-blue-500';
            case 'question': return 'bg-orange-100 text-orange-500';
            default: return 'bg-gray-100 text-gray-500';
        }
    }

    markRead(ev: any) {
        const all = this.events();
        const updated = all.map(e => e === ev ? { ...e, read: true } : e);
        this.events.set(updated);
    }
}
