import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef, inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  disabled?: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-administration',
  standalone: true,
  imports: [NgIf, TranslateModule, AccordionModule, RippleModule, RouterModule],
  templateUrl: './administration.html',
  styleUrls: ['./administration.scss']
})
export class AdministrationComponent implements OnInit, OnDestroy {
  menuGroups: AdminMenuGroup[] = [];
  isAdminRoot = false;
  private destroyRef = inject(DestroyRef);

  constructor(private translate: TranslateService, private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.buildMenu();
    this.translate.onLangChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => { this.buildMenu(); this.cdr.markForCheck(); });

    const isRoot = (url: string) => {
      const path = (url || '').split('?')[0].replace(/\/$/, '');
      return path === '/administration' || path === '';
    };

    this.isAdminRoot = isRoot(this.router.url || '');

    this.router.events.pipe(takeUntilDestroyed(this.destroyRef), filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      this.isAdminRoot = isRoot(e.urlAfterRedirects || e.url || '');
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void { /* subscriptions auto-cleaned via takeUntilDestroyed */ }

  private buildMenu(): void {
    const t = (k: string) => this.translate.instant(k) || k;
    this.menuGroups = [
      {
        label: t('MENU.SETTINGS'),
        items: [
          //{ label: t('MENU.GENERAL'), icon: 'pi pi-fw pi-cog', routerLink: ['/administration/general'], disabled: true },
          { label: t('MENU.NOTIFICATIONS'), icon: 'pi pi-fw pi-bell', routerLink: ['/administration/notifications'] },
          //{ label: t('MENU.STORAGE'), icon: 'pi pi-fw pi-database', routerLink: ['/administration/storage'] },
          { label: t('MENU.PAGES'), icon: 'pi pi-fw pi-file', routerLink: ['/administration/pages'] }

        ]
      },
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
          { label: t('MENU.SPECIALIZATIONS'), icon: 'pi pi-fw pi-tags', routerLink: ['/administration/specializations'] },
          { label: t('MENU.JOB_TITLE'), icon: 'pi pi-fw pi-user-edit', routerLink: ['/administration/job_title'] }
        ]
      }
    ];
  }
}
