import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { AvatarModule } from 'primeng/avatar';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../auth/auth.service';

export interface ProfileMenuGroup {
  label: string;
  items: { label: string; icon: string; routerLink: string[] }[];
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ButtonModule, RippleModule, RouterModule, TranslateModule, AvatarModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss']
})
export class ProfileComponent implements OnInit {
  menuGroups: ProfileMenuGroup[] = [];
  user: any | null = null;

  constructor(private router: Router, private translate: TranslateService, private auth: AuthService) {}

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

    // Try to show cached user from sessionStorage immediately to avoid UI flash/delay
    try {
      const cached = sessionStorage.getItem('currentUser');
      if (cached) {
        const parsed = JSON.parse(cached);
        this.user = (parsed && parsed.data) ? parsed.data : parsed;
      }
    } catch (e) {
      // ignore parse errors and continue to fetch fresh
    }

    // load current user (API sometimes returns { data: user } or user directly)
    // On error don't clear the existing user from cache — keep showing cached data.
    this.auth.me().subscribe({
      next: (res: any) => {
        this.user = (res && (res as any).data) ? (res as any).data : res;
        try {
          // also update sessionStorage to keep other components in sync
          sessionStorage.setItem('currentUser', JSON.stringify(res));
        } catch (e) { /* ignore storage errors */ }
      },
      error: () => {
        // keep current this.user (likely from cache) to avoid blank UI
      }
    });
  }

  // Navigate to profile edit page (assumption: route exists)
  onEditProfile(): void {
    try {
      this.router.navigate(['/profile/edit']);
    } catch (e) {
      console.warn('onEditProfile: navigation failed', e);
    }
  }

  // Navigate to security/password settings (use existing security route)
  onResetPassword(): void {
    try {
      this.router.navigate(['/profile/security']);
    } catch (e) {
      console.warn('onResetPassword: navigation failed', e);
    }
  }

  // Share rights / permissions - navigate to assumed permissions page
  onShareRights(): void {
    try {
      this.router.navigate(['/profile/permissions']);
    } catch (e) {
      console.warn('onShareRights: navigation failed', e);
    }
  }

  userName(): string {
    if (!this.user) return '';
    if (this.user.name) return this.user.name;
    const fn = this.user.first_name || this.user.firstName || '';
    const mn = this.user.middle_name || this.user.middleName || '';
    const ln = this.user.last_name || this.user.lastName || '';
    const parts = [fn, mn, ln].map(p => (p || '').trim()).filter(Boolean);
    const full = parts.join(' ');
    return full || this.user.username || this.user.email || '';
  }

  avatarUrl(): string {
    if (!this.user) return 'https://fqjltiegiezfetthbags.supabase.co/storage/v1/object/public/block.images/blocks/pageheading/kathryn.png';
    // prefer explicit URL fields; if backend returns avatar_id use storage download endpoint
    const explicit = this.user.avatar_url || this.user.avatar || this.user.profile_image || this.user.photo;
    if (explicit) return explicit;
    const aid = this.user.avatar_id ?? this.user.avatarId ?? null;
    if (aid) return `/api/storage/${String(aid).trim()}/download`;
    return 'https://fqjltiegiezfetthbags.supabase.co/storage/v1/object/public/block.images/blocks/pageheading/kathryn.png';
  }

  initials(): string {
    const name = this.userName();
    if (!name) return '';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
  }

  personInitials(name?: string): string {
    try {
      const candidate = name || (this.user && (this.user.name || '')) || '';
      const parts = String(candidate).trim().split(/\s+/).filter(Boolean);
      if (!parts.length) return '';
      if (parts.length === 1) return parts[0].slice(0,2).toUpperCase();
      return (parts[0][0] + parts[1][0]).toUpperCase();
    } catch (e) {
      return '';
    }
  }

  issueAvatarColor(user: any): string {
    const seed = (user && (user.id ?? user.username ?? (user.first_name || '') + (user.last_name || ''))) || '';
    const s = seed.toString();
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      const ch = s.charCodeAt(i);
      hash = ((hash << 5) - hash) + ch;
      hash = hash & hash;
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 65%, 45%)`;
  }

  issueAvatarTextColor(user: any): string {
    const bg = this.issueAvatarColor(user);
    const m = bg.match(/hsl\((\d+),\s*(\d+)%?,\s*(\d+)%?\)/);
    if (!m) return '#fff';
    const lightness = Number(m[3]);
    return lightness > 70 ? '#111' : '#fff';
  }
}
