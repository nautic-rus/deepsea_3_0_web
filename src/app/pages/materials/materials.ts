import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TieredMenuModule } from 'primeng/tieredmenu';
import { MenuItem } from 'primeng/api';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-materials',
  standalone: true,
  imports: [CommonModule, TranslateModule, TieredMenuModule, RouterModule, ButtonModule],
  templateUrl: './materials.html',
  styleUrls: ['./materials.scss']
})
export class MaterialsComponent implements OnInit {
  menuItems: MenuItem[] = [];

  constructor(private translate: TranslateService) {}

  ngOnInit(): void {
    const t = (k: string) => this.translate.instant(k) || k; // TODO: make reactive (refresh on translate.onLangChange)
    this.menuItems = [
      { label: t('MENU.USERS'), icon: 'pi pi-users', routerLink: ['/administration/users'] },
      { label: t('MENU.ROLES'), icon: 'pi pi-briefcase', routerLink: ['/administration/roles'] },
      { label: t('MENU.PERMISSIONS'), icon: 'pi pi-lock', routerLink: ['/administration/permissions'] },
      { label: t('MENU.MATERIALS'), icon: 'pi pi-folder', routerLink: ['/materials'] }
    ];
  }
}
