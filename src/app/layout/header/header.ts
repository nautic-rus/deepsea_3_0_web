import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MenubarModule } from 'primeng/menubar';
import { BadgeModule } from 'primeng/badge';
import { AvatarModule } from 'primeng/avatar';
import { RippleModule } from 'primeng/ripple';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, ButtonModule, MenubarModule, BadgeModule, AvatarModule, RippleModule, MenuModule],
  templateUrl: './header.html',
  styleUrls: ['./header.scss']
})
export class HeaderComponent implements OnInit {
  menuItems: MenuItem[] = [];
  userMenuItems: MenuItem[] = [];
  darkMode = false;

  constructor(@Inject(DOCUMENT) private document: Document) {
    // Check if dark mode was previously enabled
    this.darkMode = localStorage.getItem('darkMode') === 'true';
    if (this.darkMode) {
      this.document.documentElement.classList.add('app-dark');
    }
  }

  toggleDarkMode() {
    this.darkMode = !this.darkMode;
    if (this.darkMode) {
      this.document.documentElement.classList.add('app-dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      this.document.documentElement.classList.remove('app-dark');
      localStorage.setItem('darkMode', 'false');
    }
  }

  ngOnInit() {
    this.userMenuItems = [
      {
        label: 'Profile',
        icon: 'pi pi-user',
        routerLink: '/settings/profile'
      },
      {
        separator: true
      },
      {
        label: 'Logout',
        icon: 'pi pi-sign-out',
        command: () => {
          // Handle logout
          console.log('Logging out...');
        },
        routerLink: '/login'
      }
    ];

    this.menuItems = [
      {
        label: 'Main',
        icon: 'pi pi-home',
        routerLink: '/dashboard'
      },
      {
        label: 'Analytics',
        icon: 'pi pi-chart-bar',
        routerLink: '/analytics'
      },
      {
        label: 'Reports',
        icon: 'pi pi-file',
        items: [
          {
            label: 'Sales Report',
            icon: 'pi pi-chart-line',
            routerLink: '/reports/sales'
          },
          {
            label: 'Financial Report',
            icon: 'pi pi-dollar',
            routerLink: '/reports/financial'
          },
          {
            label: 'Inventory Report',
            icon: 'pi pi-box',
            routerLink: '/reports/inventory'
          }
        ]
      },
      {
        label: 'Settings',
        icon: 'pi pi-cog',
        items: [
          {
            label: 'Profile',
            icon: 'pi pi-user',
            routerLink: '/settings/profile'
          },
          {
            label: 'Preferences',
            icon: 'pi pi-sliders-h',
            routerLink: '/settings/preferences'
          },
          {
            separator: true
          },
          {
            label: 'Logout',
            icon: 'pi pi-sign-out',
            routerLink: '/login'
          }
        ]
      }
    ];
  }
}
