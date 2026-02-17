import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

export interface ProfileMenuGroup {
  label: string;
  items: { label: string; icon: string; routerLink: string[] }[];
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ButtonModule, RippleModule, RouterModule, TranslateModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss']
})
export class ProfileComponent implements OnInit {
  menuGroups: ProfileMenuGroup[] = [];

  constructor(private router: Router, private translate: TranslateService) {}

  ngOnInit(): void {
    const t = (k: string) => this.translate.instant(k) || k;

    this.menuGroups = [
      {
        label: t('MENU.PROFILE'),
        items: [
          { label: t('MENU.PROFILE'), icon: 'pi pi-fw pi-user', routerLink: ['/profile'] },
          { label: t('MENU.NOTIFICATIONS'), icon: 'pi pi-fw pi-bell', routerLink: ['/profile/notifications'] },
          { label: t('MENU.SECURITY'), icon: 'pi pi-fw pi-lock', routerLink: ['/profile/security'] }
        ]
      }
    ];

    // keep active state/update on navigation if needed later
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe();
  }
}
