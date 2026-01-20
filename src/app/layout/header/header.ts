import { Component, OnInit, Inject, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
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
  imports: [CommonModule, RouterModule, HttpClientModule, ButtonModule, MenubarModule, BadgeModule, AvatarModule, RippleModule, MenuModule, TranslateModule],
  templateUrl: './header.html',
  styleUrls: ['./header.scss']
})
export class HeaderComponent implements OnInit {
  menuItems: MenuItem[] = [];
  userMenuItems: MenuItem[] = [];
  darkMode = false;
  avatarUrl?: string;
  avatarLabel?: string;
  currentUser: any = null;
  rawPages: any[] = [];
  currentLang = 'en';
  private langSub?: Subscription;
  title = 'DeepSea';
  langEnLabel = 'EN';
  langRuLabel = 'RU';

  constructor(@Inject(DOCUMENT) private document: Document, private router: Router, private http: HttpClient, private cdr: ChangeDetectorRef, private translate: TranslateService) {
    // Check if dark mode was previously enabled
    this.darkMode = localStorage.getItem('darkMode') === 'true';
    // Ensure translation handler rebuilds menu labels on language change
    this.langSub = this.translate.onLangChange.subscribe((event) => {
      this.currentLang = event.lang || 'en';
      this.buildUserMenu();
    });
    if (this.darkMode) {
      this.document.documentElement.classList.add('app-dark');
    }
  }

  ngOnDestroy(): void {
    try { this.langSub?.unsubscribe(); } catch {}
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

  // language switching removed

  ngOnInit() {
    this.currentLang = this.translate.currentLang || 'en';
    this.title = this.translate.instant('APP.TITLE');
    this.langEnLabel = this.translate.instant('LANG.EN');
    this.langRuLabel = this.translate.instant('LANG.RU');
    // Build menus immediately (translations removed)
    this.buildUserMenu();
    // Load menu items from backend (/api/user/pages) only when authenticated.
    const token = sessionStorage.getItem('accessToken') ?? localStorage.getItem('accessToken');
    if (!token) {
      // not authenticated yet - leave menu empty
      this.menuItems = [];
      // also clear avatar
  this.avatarUrl = undefined;
  this.avatarLabel = undefined;
      return;
    }

    // Fetch current user profile for avatar/label
    this.fetchCurrentUser();

    this.http.get<any>('/api/user/pages').subscribe({
      next: (resp) => {
        const pages = this.normalizePages(resp);
        this.rawPages = pages || [];
        this.menuItems = this.mapPagesToMenu(this.rawPages);
        this.cdr.detectChanges();
      },
      error: () => {
        this.menuItems = [];
        this.cdr.detectChanges();
      }
    });
  }

  private remapPages() {
    if (!this.rawPages || !this.rawPages.length) { return; }
    this.menuItems = this.mapPagesToMenu(this.rawPages);
    try { this.cdr.detectChanges(); } catch {}
  }

  private buildUserMenu() {
    this.userMenuItems = [
      { label: this.translate.instant('HEADER.PROFILE'), icon: 'pi pi-user', routerLink: '/settings/profile' },
      { separator: true },
      { label: this.translate.instant('HEADER.LOGOUT'), icon: 'pi pi-sign-out', command: () => this.logout() }
    ];
    try { this.cdr.detectChanges(); } catch {}
  }

  setLang(lang: string) {
    try { localStorage.setItem('lang', lang); } catch {}
    this.translate.use(lang);
    this.currentLang = lang;
    // rebuild menus that may use translated labels
    this.buildUserMenu();
    this.remapPages();
  }

  toggleLang() {
    const nextLang = this.currentLang === 'en' ? 'ru' : 'en';
    this.setLang(nextLang);
  }

  private fetchCurrentUser(): void {
    // Try to read cached user from sessionStorage and then fetch fresh profile
    const cached = sessionStorage.getItem('currentUser');
    if (cached) {
      try { this.currentUser = JSON.parse(cached); this.applyAvatarFromUser(this.currentUser); } catch {}
    }
    this.http.get<any>('/api/auth/me').subscribe({
      next: (u) => {
        if (!u) { return; }
        this.currentUser = u;
        try { sessionStorage.setItem('currentUser', JSON.stringify(u)); } catch {}
        this.applyAvatarFromUser(u);
      },
      error: () => {}
    });
  }

  private applyAvatarFromUser(u: any) {
    // Try common fields for avatar URL
    if (!u) {
        this.avatarUrl = undefined;
        this.avatarLabel = undefined;
      try { this.cdr.detectChanges(); } catch {}
      return;
    }

    const candidates = ['avatarUrl','avatar','photo','image','profilePicture','picture','avatar_url','profile_image'];
    let url: string | undefined;
    for (const k of candidates) {
      const v = u?.[k];
      if (typeof v === 'string' && v.trim()) { url = v.trim(); break; }
    }
    this.avatarUrl = url;
    this.avatarLabel = this.avatarUrl ? undefined : (this.computeInitials(u) || undefined);
    try { this.cdr.detectChanges(); } catch {}
  }

  private computeInitials(u: any): string | null {
    if (!u) { return null; }
    const name = (u.name ?? u.fullName ?? (u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : null) ?? u.username ?? u.email ?? '').toString().trim();
    if (!name) { return null; }
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + (parts[1][0] ?? '')).toUpperCase();
  }

  private mapPagesToMenu(pages: any[]): MenuItem[] {
    if (!Array.isArray(pages)) {
      return [];
    }
    const getLabel = (p: any) => {
      const v = p.title ?? p.name ?? p.label ?? p.text ?? p.caption ?? p.displayName ?? '';
      let label = '';
      if (!v) { label = ''; }
      else if (typeof v === 'string') { label = v; }
      else if (typeof v === 'object') { label = v.ru ?? v.en ?? Object.values(v)[0] ?? ''; }
      else { label = String(v); }
      return label;
    };

    const getIcon = (p: any) => {
      let raw = p.icon ?? p.iconClass ?? '';
      if (Array.isArray(raw)) { raw = raw.join(' '); }
      raw = (raw || '').toString().trim();
      if (!raw) { return undefined; }
      if (raw.startsWith('pi ')) { return raw; }
      if (raw.startsWith('pi-')) { return raw.replace(/^pi-/, 'pi pi-'); }
      if (raw.includes('pi-')) { return raw.replace('pi-', 'pi pi-'); }
      return `pi pi-${raw.replace(/^pi/, '').replace(/^[-_\s]+/, '')}`;
    };

    const toRouter = (p: any) => p.path ?? p.url ?? p.route ?? (p.slug ? `/${p.slug}` : undefined) ?? p.href ?? undefined;

    const mapItem = (p: any): MenuItem => {
      if (!p) { return {} as MenuItem; }
      if (p.separator === true) { return { separator: true } as MenuItem; }
      const item: MenuItem = {} as any;
      const label = getLabel(p);
      if (label) { item.label = label; }
      const icon = getIcon(p);
      if (icon) { item.icon = icon; }
      const routerLink = toRouter(p);
      if (routerLink) { item.routerLink = routerLink; }
      if (p.action === 'logout') { item.command = () => this.logout(); }
      const children = p.children ?? p.items ?? p.pages ?? null;
      if (Array.isArray(children) && children.length) { item.items = children.map(mapItem); }
      if (!item.label && item.routerLink) {
        const parts = (item.routerLink as string).split('/').filter(Boolean);
        item.label = parts.length ? parts[parts.length - 1].replace(/-/g, ' ') : item.routerLink as string;
      }
      return item;
    };

    return pages.map(mapItem).filter(Boolean);
  }

  // Normalize various API shapes into an array of page-like objects
  private normalizePages(resp: any): any[] {
    if (!resp) { return []; }
    if (Array.isArray(resp)) { return resp; }
    for (const key of ['data','items','pages','children']) {
      if (Array.isArray(resp[key])) { return resp[key]; }
    }
    // fallback: try to extract arrays from object values
    const vals = Object.values(resp || {});
    for (const v of vals) { if (Array.isArray(v)) { return v; } }
    return [];
  }

  

  logout(): void {
    // Attempt to notify backend (best-effort, do not block UI)
    try {
      this.http.post('/api/auth/logout', {}).subscribe({
        next: () => {},
        error: () => {}
      });
    } catch (e) {
      // ignore
    }

    // Clear auth data from both storages
    ['accessToken', 'refreshToken', 'expiresAt', 'currentUser'].forEach(k => {
      try { sessionStorage.removeItem(k); } catch {}
      try { localStorage.removeItem(k); } catch {}
    });

    // Navigate to login
    this.router.navigate(['/login']);
  }
}
