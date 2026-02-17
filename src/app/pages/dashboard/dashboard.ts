import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatsWidget } from './widgets/user-stats-widget';
import { NotificationsWidget } from './widgets/activity-widget';
// RevenueStreamWidget is not used in the dashboard template; removed to avoid Angular warning
import { RecentSalesWidget } from './widgets/timesheet-calendar-widget';

@Component({
  selector: 'app-dashboard',
  standalone: true,
    imports: [
    CommonModule,
  StatsWidget,
  RecentSalesWidget,
  NotificationsWidget
  
  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent {}
