import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TieredMenuModule } from 'primeng/tieredmenu';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-administration',
  standalone: true,
  imports: [CommonModule, TranslateModule, TieredMenuModule],
  templateUrl: './administration.html',
  styleUrls: ['./administration.scss']
})
export class AdministrationComponent implements OnInit {
  menuItems: MenuItem[] = [];

  constructor(private translate: TranslateService) {}

  ngOnInit(): void {
    // Build a small tiered menu using translation keys; keep it simple and safe if translations are not loaded yet
    const t = (k: string) => this.translate.instant(k) || k;
    this.menuItems = [
      { label: t('MENU.USERS'), icon: 'pi pi-users', routerLink: ['/administration/users'] },
      { label: t('MENU.ROLES'), icon: 'pi pi-briefcase', routerLink: ['/administration/roles'] },
      { label: t('MENU.PERMISSIONS'), icon: 'pi pi-lock', routerLink: ['/administration/permissions'] },
      { label: t('MENU.NOTIFICATIONS'), icon: 'pi pi-bell', routerLink: ['/administration/notifications'] },
      { label: t('MENU.DEPARTMENTS'), icon: 'pi pi-truck', routerLink: ['/administration/departments']},
      {label: t('MENU.SPECIALIZATIONS'), icon: 'pi pi-tags', routerLink: ['/administration/specializations']  }
    ];
  }
}
