import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';

@Component({
  standalone: true,
  selector: 'app-revenue-chart-widget',
  imports: [CommonModule, ChartModule],
  template: `
    <div class="card mb-0">
      <div class="font-semibold text-xl mb-4">Revenue Stream</div>
      <p-chart type="bar" [data]="chartData" [options]="chartOptions" style="height: 300px" />
    </div>
  `
})
export class RevenueChartWidget implements OnInit {
  chartData: any;
  chartOptions: any;

  ngOnInit() {
    this.initChart();
  }

  initChart() {
    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--text-color') || '#495057';
    const textMutedColor = documentStyle.getPropertyValue('--text-color-secondary') || '#6c757d';
    const borderColor = documentStyle.getPropertyValue('--surface-border') || '#dee2e6';

    this.chartData = {
      labels: ['Q1', 'Q2', 'Q3', 'Q4'],
      datasets: [
        {
          type: 'bar',
          label: 'Subscriptions',
          backgroundColor: '#3B82F6',
          data: [4000, 10000, 15000, 4000],
          barThickness: 32
        },
        {
          type: 'bar',
          label: 'Advertising',
          backgroundColor: '#60A5FA',
          data: [2100, 8400, 2400, 7500],
          barThickness: 32
        },
        {
          type: 'bar',
          label: 'Affiliate',
          backgroundColor: '#93C5FD',
          data: [4100, 5200, 3400, 7400],
          borderRadius: {
            topLeft: 8,
            topRight: 8
          },
          barThickness: 32
        }
      ]
    };

    this.chartOptions = {
      maintainAspectRatio: false,
      aspectRatio: 0.8,
      plugins: {
        legend: {
          labels: {
            color: textColor
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          ticks: {
            color: textMutedColor
          },
          grid: {
            color: 'transparent'
          }
        },
        y: {
          stacked: true,
          ticks: {
            color: textMutedColor
          },
          grid: {
            color: borderColor
          }
        }
      }
    };
  }
}
