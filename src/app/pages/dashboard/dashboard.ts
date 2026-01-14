import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatsWidget } from './widgets/stats-widget';
import { BestSellingWidget } from './widgets/best-selling-widget';
import { NotificationsWidget } from './widgets/notifications-widget';
import { RevenueChartWidget } from './widgets/revenue-chart-widget';
import { RecentSalesWidget } from './widgets/recent-sales-widget';
import { MyTasksWidget } from './widgets/my-tasks-widget';
import { MyDocumentsWidget } from './widgets/my-documents-widget';
import { MyCalendarWidget } from './widgets/my-calendar-widget';
import { MyMailWidget } from './widgets/my-mail-widget';

@Component({
  selector: 'app-dashboard',
  standalone: true,
    imports: [
    CommonModule,
    StatsWidget,
    BestSellingWidget,
    NotificationsWidget,
    RevenueChartWidget,
    RecentSalesWidget,
    MyTasksWidget,
    MyDocumentsWidget,
    MyCalendarWidget,
    MyMailWidget
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent {}
