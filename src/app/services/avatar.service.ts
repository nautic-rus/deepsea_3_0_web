import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AvatarService {
  constructor() {}

  private hashString(s: string): number {
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      const ch = s.charCodeAt(i);
      hash = ((hash << 5) - hash) + ch;
      hash = hash & hash;
    }
    return hash;
  }

  // Deterministic HSL background based on a seed (id, username or label)
  issueAvatarColor(user: any): string {
    // Prefer explicit id when available so color is stable across pages
    try {
      if (user === null || user === undefined) return this.colorFromId('');
      // If a primitive id is passed directly
      if (typeof user === 'number' || typeof user === 'string') return this.colorFromId(String(user));
      // If object has id property, prefer it
      const id = user.id ?? user.user_id ?? user.id_str ?? null;
      if (id !== null && id !== undefined && String(id).trim() !== '') return this.colorFromId(String(id));
      // Fallback: try username, then name concatenation
      const seed = (user.username ?? ((user.first_name || '') + (user.last_name || ''))) || '';
      return this.colorFromId(String(seed));
    } catch (e) {
      return this.colorFromId('');
    }
  }

  // Generate color directly from an id or seed string
  colorFromId(seed: string): string {
    const s = String(seed || '');
    const hash = Math.abs(this.hashString(s));
    // Use golden-angle multiplier to scatter hues more evenly across the wheel
    const GOLDEN_ANGLE = 137.508; // degrees
    const hue = Math.floor((hash * GOLDEN_ANGLE) % 360);

    // Vary saturation and lightness by different bits of the hash to increase visual variety
    // Saturation: 50%..85%
    const sat = 50 + (hash % 36); // 50..85
    // Lightness:  thirty five..60, but avoid extremes for readability
    const light = 38 + ((hash >> 6) % 22); // 38..59

    return `hsl(${hue}, ${sat}%, ${light}%)`;
  }

  issueAvatarTextColor(user: any): string {
    const bg = this.issueAvatarColor(user);
    const m = bg.match(/hsl\((\d+),\s*(\d+)%?,\s*(\d+)%?\)/);
    if (!m) return '#fff';
    const lightness = Number(m[3]);
    return lightness > 70 ? '#111' : '#fff';
  }

  // For select option labels (string input)
  selectAvatarBg(label?: string | null): string {
    // delegate to colorFromId for consistent scattering but pass label as seed
    return this.colorFromId((label || '').toString());
  }

  selectAvatarTextColor(label?: string | null): string {
    const bg = this.selectAvatarBg(label);
    const m = bg.match(/hsl\((\d+),\s*(\d+)%?,\s*(\d+)%?\)/);
    if (!m) return '#fff';
    const lightness = Number(m[3]);
    return lightness > 70 ? '#111' : '#fff';
  }

  // derive initials from a single full-name string
  initialsFromName(name?: string | null): string {
    if (!name) return '';
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  // get initials from a user-like object
  getInitialsFromUser(user: any): string {
    if (!user) return '';
    const fn = (user.first_name || '').toString().trim();
    const ln = (user.last_name || '').toString().trim();
    if (fn && ln) return (fn[0] + ln[0]).toUpperCase();
    if (fn) return fn.split(' ').map((s: string) => s[0]).filter(Boolean).slice(0,2).join('').toUpperCase();
    if (ln) return ln[0].toUpperCase();
    if (user.username) return user.username[0].toUpperCase();
    return '?';
  }

  // Format surname with initials for given name and patronymic.
  // Accepts either a user-like object ({ first_name, middle_name, last_name }) or a single full-name string.
  formatSurnameInitials(item: any): string {
    if (!item) return '-';
    try {
      if (typeof item === 'object') {
        const last = (item.last_name || item.lastName || '').toString().trim();
        const first = (item.first_name || item.firstName || '').toString().trim();
        const middle = (item.middle_name || item.middleName || '').toString().trim();
        const initials: string[] = [];
        if (first) initials.push(first[0].toUpperCase() + '.');
        if (middle) initials.push(middle[0].toUpperCase() + '.');
        if (last) return last + (initials.length ? ' ' + initials.join('') : '');
        const fallback = [first, middle].filter(Boolean).join(' ');
        return fallback || (item.username || '-') ;
      }

      if (typeof item === 'string') {
        const parts = item.trim().split(/\s+/).filter(Boolean);
        if (!parts.length) return '-';
        const surname = parts[0];
        const rest = parts.slice(1);
        const initials = rest.map(p => (p && p[0]) ? p[0].toUpperCase() + '.' : '').join('');
        return surname + (initials ? ' ' + initials : '');
      }
    } catch (e) {
      // fall through
    }
    return '-';
  }
}
