import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TieredMenuModule } from 'primeng/tieredmenu';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, TranslateModule, TieredMenuModule],
  templateUrl: './documents.html',
  styleUrls: ['./documents.scss']
})
export class DocumentsComponent implements OnInit {
  menuItems: MenuItem[] = [];

  constructor(private translate: TranslateService) {}

  ngOnInit(): void {
    const t = (k: string) => this.translate.instant(k) || k;
    this.menuItems = [
      { label: t('MENU.USERS'), icon: 'pi pi-users', routerLink: ['/administration/users'] },
      { label: t('MENU.ROLES'), icon: 'pi pi-briefcase', routerLink: ['/administration/roles'] },
      { label: t('MENU.PERMISSIONS'), icon: 'pi pi-lock', routerLink: ['/administration/permissions'] },
      { label: t('MENU.DOCUMENTS'), icon: 'pi pi-file', routerLink: ['/documents'] }
    ];
  }
}
