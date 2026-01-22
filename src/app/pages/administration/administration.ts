import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TieredMenuModule } from 'primeng/tieredmenu';
import { AccordionModule } from 'primeng/accordion';
import { MenuItem } from 'primeng/api';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-administration',
  standalone: true,
  imports: [CommonModule, TranslateModule, TieredMenuModule, AccordionModule, RouterModule],
  templateUrl: './administration.html',
  styleUrls: ['./administration.scss']
})
export class AdministrationComponent implements OnInit {
  menuItems: MenuItem[] = [];
  isAdminRoot = false;

  constructor(private translate: TranslateService, private router: Router) {}

  ngOnInit(): void {
    // Build a small tiered menu using translation keys; keep it simple and safe if translations are not loaded yet
    const t = (k: string) => this.translate.instant(k) || k;
    this.menuItems = [
      { label: t('MENU.USERS'), icon: 'pi pi-users', routerLink: ['/administration/users'] },
      { label: t('MENU.ROLES'), icon: 'pi pi-briefcase', routerLink: ['/administration/roles'] },
      { label: t('MENU.PERMISSIONS'), icon: 'pi pi-lock', routerLink: ['/administration/permissions'] },
      { label: t('MENU.NOTIFICATIONS'), icon: 'pi pi-bell', routerLink: ['/administration/notifications'] },
      { label: t('MENU.DEPARTMENTS'), icon: 'pi pi-truck', routerLink: ['/administration/departments'] },
      { label: t('MENU.SPECIALIZATIONS'), icon: 'pi pi-tags', routerLink: ['/administration/specializations'] }
    ];

    const isRoot = (url: string) => {
      const path = (url || '').split('?')[0].replace(/\/$/, '');
      return path === '/administration' || path === '';
    };

    // initial
    this.isAdminRoot = isRoot(this.router.url || '');

    // update on navigation
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      this.isAdminRoot = isRoot(e.urlAfterRedirects || e.url || '');
    });
  }
}
