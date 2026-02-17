import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService, LangChangeEvent } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { AccordionModule } from 'primeng/accordion';
import { RippleModule } from 'primeng/ripple';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

export interface AdminMenuGroup {
  label: string;
  items: AdminMenuItem[];
}

export interface AdminMenuItem {
  label: string;
  icon: string;
  routerLink: string[];
}

@Component({
  selector: 'app-administration',
  standalone: true,
  imports: [CommonModule, TranslateModule, AccordionModule, RippleModule, RouterModule],
  templateUrl: './administration.html',
  styleUrls: ['./administration.scss']
})
export class AdministrationComponent implements OnInit, OnDestroy {
  menuGroups: AdminMenuGroup[] = [];
  isAdminRoot = false;
  private langSub: Subscription | null = null;

  constructor(private translate: TranslateService, private router: Router) {}

  ngOnInit(): void {
    this.buildMenu();
    this.langSub = this.translate.onLangChange.subscribe((e: LangChangeEvent) => this.buildMenu());

    const isRoot = (url: string) => {
      const path = (url || '').split('?')[0].replace(/\/$/, '');
      return path === '/administration' || path === '';
    };

    this.isAdminRoot = isRoot(this.router.url || '');

    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      this.isAdminRoot = isRoot(e.urlAfterRedirects || e.url || '');
    });
  }

  ngOnDestroy(): void {
    if (this.langSub) {
      this.langSub.unsubscribe();
      this.langSub = null;
    }
  }

  private buildMenu(): void {
    const t = (k: string) => this.translate.instant(k) || k;
    this.menuGroups = [
      {
        label: t('MENU.USER_MANAGEMENT'),
        items: [
          { label: t('MENU.USERS'), icon: 'pi pi-fw pi-user', routerLink: ['/administration/users'] },
          { label: t('MENU.PERMISSIONS'), icon: 'pi pi-fw pi-lock', routerLink: ['/administration/permissions'] },
          { label: t('MENU.ROLES'), icon: 'pi pi-fw pi-briefcase', routerLink: ['/administration/roles'] }
        ]
      },
      {
        label: t('MENU.ORGANIZATION'),
        items: [
          { label: t('MENU.DEPARTMENTS'), icon: 'pi pi-fw pi-sitemap', routerLink: ['/administration/departments'] },
          { label: t('MENU.SPECIALIZATIONS'), icon: 'pi pi-fw pi-tags', routerLink: ['/administration/specializations'] }
        ]
      },
      {
        label: t('MENU.SETTINGS'),
        items: [
          { label: t('MENU.GENERAL'), icon: 'pi pi-fw pi-cog', routerLink: ['/administration/general'] },
          { label: t('MENU.NOTIFICATIONS'), icon: 'pi pi-fw pi-bell', routerLink: ['/administration/notifications'] },
          { label: t('MENU.STORAGE'), icon: 'pi pi-fw pi-database', routerLink: ['/administration/storage'] },
          { label: t('MENU.PAGES'), icon: 'pi pi-fw pi-file', routerLink: ['/administration/pages'] }


        ]
      }
    ];
  }
}
