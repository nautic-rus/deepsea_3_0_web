import { Component, ChangeDetectionStrategy } from '@angular/core';
;
import { StatsWidget } from './widgets/user-stats-widget';
import { NotificationsWidget } from './widgets/activity-widget';
// RevenueStreamWidget is not used in the dashboard template; removed to avoid Angular warning
import { RecentSalesWidget } from './widgets/timesheet-calendar-widget';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-dashboard',
  standalone: true,
    imports: [
    StatsWidget,
  RecentSalesWidget,
  NotificationsWidget

  ],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent {}
