import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ButtonModule, MenuModule, RouterModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss']
})
export class ProfileComponent implements OnInit {
  menuItems: MenuItem[] = [];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.menuItems = [
      { label: 'Overview', icon: 'pi pi-fw pi-user', routerLink: ['/profile'] },
      { label: 'Edit Profile', icon: 'pi pi-fw pi-pencil', routerLink: ['/profile/edit'] },
      { label: 'Settings', icon: 'pi pi-fw pi-cog', routerLink: ['/profile/settings'] },
      { label: 'Security', icon: 'pi pi-fw pi-lock', routerLink: ['/profile/security'] }
    ];

    // keep active state/update on navigation if needed later
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe();
  }
}
