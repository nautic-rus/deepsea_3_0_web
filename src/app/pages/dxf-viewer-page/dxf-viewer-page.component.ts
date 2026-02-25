import { Component, OnInit, inject, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { DxfViewerComponent } from '../../shared/dxf-viewer/dxf-viewer.component';
import { HttpClient } from '@angular/common/http';
import { Location } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-dxf-viewer-page',
  standalone: true,
  imports: [CommonModule, RouterModule, DxfViewerComponent, ButtonModule, ProgressSpinnerModule],
  template: `
    <div class="dxf-page-root">
      <div class="dxf-topbar">
        <div class="dxf-title">DWG viewer{{ filename ? (' (' + filename + ')') : '' }}</div>
      </div>

      <div class="dxf-body">
        <div *ngIf="loading || ((!viewerReady) && (src || blob))" class="dxf-loading">
          <p-progressSpinner></p-progressSpinner>
        </div>

        <div *ngIf="error" class="dxf-error">{{ error }}</div>

        <div *ngIf="!error && (src || blob)" class="dxf-viewer-container">
          <div class="dxf-viewer-main">
            <app-dxf-viewer #viewerComp [src]="src" [blob]="blob" [fonts]="fonts" (readyChange)="onViewerReady($event)"></app-dxf-viewer>
          </div>
          <aside class="dxf-layers" *ngIf="layers && layers.length">
            <div class="layers-header">
              <div class="layers-title">Layers</div>
              <button pButton type="button" (click)="toggleAll(true)" label="Show All"></button>
              <button pButton type="button" (click)="toggleAll(false)" label="Hide All"></button>
            </div>
            <div class="layers-list">
              <div *ngFor="let layer of layers" class="layer-row">
                <label>
                  <input type="checkbox" [checked]="layer.isVisible" (change)="onToggleLayer(layer, $event.target.checked)" />
                  <span class="layer-name">{{ layer.name }}</span>
                </label>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  `,
  styles: [
    `:host { display: block; }
     .dxf-page-root { position: fixed; inset: 0; background: #fff; display: flex; flex-direction: column; overflow: hidden; z-index: 9999; }
     .dxf-topbar { height: 56px; display:flex; align-items:center; gap:12px; padding:8px 16px; border-bottom:1px solid #e6e6e6; background: #fafafa; flex: 0 0 56px; }
     .dxf-title { font-weight:600; font-size:16px; }
  .dxf-body { flex:1 1 auto; position: relative; overflow: hidden; }
  .dxf-loading, .dxf-error { position: absolute; inset:0; display:flex; align-items:center; justify-content:center; z-index:10; background: rgba(255,255,255,0.6); }
  .dxf-viewer-container { position: absolute; inset:0; display:flex; }
  .dxf-viewer-main { flex: 1 1 auto; position: relative; }
  .dxf-viewer-main app-dxf-viewer, .dxf-viewer-main > * { height:100%; width:100%; display:block; }
  .dxf-layers { width: 260px; flex: 0 0 260px; border-left: 1px solid #e6e6e6; background: #fff; overflow: auto; padding: 8px; }
  .layers-header { display:flex; gap:8px; align-items:center; margin-bottom:8px }
  .layers-title { font-weight:600; margin-right:auto }
  .layers-list { display:block }
  .layer-row { padding:6px 4px; border-bottom: 1px solid #f3f3f3 }
    `
  ]
})
export class DxfViewerPageComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private location = inject(Location);
  private cdr = inject(ChangeDetectorRef);

  src?: string | null = null;
  blob?: Blob | null = null;
  fonts?: string[] | null = null;
  filename?: string | null = null;
  loading = false;
  error: string | null = null;
  private _hiddenHeaders: Element[] = [];
  viewerReady = false;
  // layers list exposed from the viewer instance
  layers: Array<{ name: string; isVisible: boolean }>|null = null;

  @ViewChild('viewerComp', { static: false }) viewerComp?: DxfViewerComponent;

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    const storageId = qp.get('storageId');
    const fileId = qp.get('fileId');
    const src = qp.get('src');
      // parse optional fonts query param (comma separated list of URLs) for all entry points
      try {
        const fontsParam = qp.get('fonts');
        if (fontsParam) {
          try { this.fonts = String(fontsParam).split(',').map(s => s.trim()).filter(Boolean); } catch(_) { this.fonts = null; }
        }
      } catch(_) { this.fonts = null; }
      // Provide local defaults so fonts are served from same origin (avoids CORS issues)
      // Use multiple DejaVu variants we keep in public/fonts to improve glyph coverage.
      if (!this.fonts || !this.fonts.length) {
        try {
          this.fonts = [
            '/fonts/DejaVuSans.ttf',
            '/fonts/DejaVuSans-Oblique.ttf',
            '/fonts/DejaVuSans-Bold.ttf',
            '/fonts/DejaVuSans-BoldOblique.ttf',
            '/fonts/DejaVuSansCondensed.ttf',
            '/fonts/DejaVuSansCondensed-Oblique.ttf',
            '/fonts/DejaVuSansCondensed-Bold.ttf'
          ];
        } catch(_) { this.fonts = null; }
      }
    if (storageId) {
      this.fetchByStorageId(storageId);
      return;
    }
    if (fileId) {
      this.fetchByFileId(fileId);
      return;
    }
    if (src) {
      try { this.src = decodeURIComponent(src); } catch (_) { this.src = src; }
      // try to derive filename from src and decode mojibake if present
      const derived = this._deriveFilenameFromSrc(this.src || '');
      if (derived) {
        // defer assignment to avoid ExpressionChangedAfterItHasBeenCheckedError
        setTimeout(() => {
          try { this.filename = this._decodeMojibake(derived); } catch (_) { this.filename = derived; }
          try { this.cdr.markForCheck(); } catch(_) {}
        }, 0);
      }
        // fonts already parsed above and defaulted to local /fonts/DejaVuSans.ttf when absent
    }
    // Hide app-level headers (if present) while viewer is open so this page is full-screen
    try {
      const selectors = ['app-header', 'header', '.app-header', '.topbar', '.header'];
      const found: Element[] = [];
      for (const s of selectors) {
        try {
          const els = Array.from(document.querySelectorAll(s));
          for (const el of els) {
            if (!found.includes(el)) {
              // only hide elements that are visible
              const prev = (el as HTMLElement).style.display || '';
              (el as any).__prevDisplayForDxf = prev;
              (el as HTMLElement).style.display = 'none';
              found.push(el);
            }
          }
        } catch(_) {}
      }
      this._hiddenHeaders = found;
    } catch (_) {}
  }

  // (Using @ViewChild viewerComp to access the child component instance)

  ngOnDestroy(): void {
    // restore any headers we hid
    try {
      for (const el of this._hiddenHeaders || []) {
        try { (el as HTMLElement).style.display = (el as any).__prevDisplayForDxf || ''; } catch(_) {}
      }
      this._hiddenHeaders = [];
    } catch (_) {}
  }

  async fetchByStorageId(id: string) {
    try {
      this.loading = true;
      const resp = await firstValueFrom(this.http.get(`/api/storage/${encodeURIComponent(id)}/download`, { observe: 'response' as const, responseType: 'blob' as 'json' }));
      this.blob = resp?.body as Blob ?? null;
      // try to extract filename from Content-Disposition
      const cd = resp?.headers?.get ? resp.headers.get('content-disposition') : null;
      if (cd) {
        const m = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(cd);
        const fn = m ? (m[1] || m[2]) : null;
        if (fn) {
          const decoded = this._decodeMojibake(decodeURIComponent(fn));
          setTimeout(() => { try { this.filename = decoded; } catch(_) { this.filename = decoded; } try { this.cdr.markForCheck(); } catch(_) {} }, 0);
        }
      }
    } catch (e: any) {
      console.error('Failed to fetch DXF by storage id', e);
      this.error = e?.message || 'Failed to load DXF';
    } finally {
      this.loading = false;
    }
    // if filename still missing and src contains a path-like string, try derive
    if (!this.filename && this.src) {
      const d = this._deriveFilenameFromSrc(this.src);
      if (d) setTimeout(() => { try { this.filename = d; } catch(_) { this.filename = d; } try { this.cdr.markForCheck(); } catch(_) {} }, 0);
    }
    // reset viewer ready flag while we start
    this.viewerReady = false;
  }

  async fetchByFileId(id: string) {
    try {
      this.loading = true;
      const resp = await firstValueFrom(this.http.get(`/api/documents/files/${encodeURIComponent(id)}/download`, { observe: 'response' as const, responseType: 'blob' as 'json' }));
      this.blob = resp?.body as Blob ?? null;
      const cd = resp?.headers?.get ? resp.headers.get('content-disposition') : null;
      if (cd) {
        const m = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(cd);
        const fn = m ? (m[1] || m[2]) : null;
        if (fn) {
          const decoded = this._decodeMojibake(decodeURIComponent(fn));
          setTimeout(() => { try { this.filename = decoded; } catch(_) { this.filename = decoded; } try { this.cdr.markForCheck(); } catch(_) {} }, 0);
        }
      }
    } catch (e: any) {
      console.error('Failed to fetch DXF by file id', e);
      this.error = e?.message || 'Failed to load DXF';
    } finally {
      this.loading = false;
    }
    if (!this.filename && this.src) {
      const d = this._deriveFilenameFromSrc(this.src);
      if (d) setTimeout(() => { try { this.filename = d; } catch(_) { this.filename = d; } try { this.cdr.markForCheck(); } catch(_) {} }, 0);
    }
    this.viewerReady = false;
  }

  onViewerReady(ev: boolean) {
    try {
      // viewer reported ready
      this.viewerReady = !!ev;
      // ensure spinner hides immediately
      this.loading = false;
      try { this.cdr.markForCheck(); } catch (_) { }
      // load layers from the child viewer component with retries to avoid timing races
      try { this.loadLayersWithRetry(0); } catch(_) {}
    } catch (_) { this.viewerReady = !!ev; }
  }

  private loadLayers() {
    try {
      // get the underlying viewer instance from the child component
      const viewer = this.viewerComp ? this.viewerComp.GetViewer() : null;
      if (!viewer || typeof viewer.GetLayers !== 'function') { return; }
      const layers = viewer.GetLayers(true) || [];
      // ensure isVisible flag exists
      for (const l of layers) { if (typeof l.isVisible === 'undefined') (l as any).isVisible = true; }
      this.layers = layers as any;
      try { this.cdr.markForCheck(); } catch(_) {}
    } catch (e) {
      // ignore
    }
  }

  private loadLayersWithRetry(attempt: number) {
    try {
      this.loadLayers();
      if ((!this.layers || !this.layers.length) && attempt < 4) {
        // schedule another attempt (exponential backoff)
        const delay = 50 * Math.pow(2, attempt);
        setTimeout(() => { try { this.loadLayersWithRetry(attempt + 1); } catch(_) {} }, delay);
      }
    } catch (e) {
      if (attempt < 4) setTimeout(() => { try { this.loadLayersWithRetry(attempt + 1); } catch(_) {} }, 100);
    }
  }

  onToggleLayer(layer: any, newState: boolean) {
    try {
      const viewer = this.viewerComp ? this.viewerComp.GetViewer() : null;
      if (!viewer || typeof viewer.ShowLayer !== 'function') { return; }
      viewer.ShowLayer(layer.name, !!newState);
      layer.isVisible = !!newState;
      try { this.cdr.markForCheck(); } catch(_) {}
    } catch (_) {}
  }

  toggleAll(state: boolean) {
    try {
      if (!this.layers) return;
      for (const layer of this.layers) {
        this.onToggleLayer(layer, state);
      }
    } catch (_) {}
  }

  private _deriveFilenameFromSrc(s: string): string | null {
    try {
      // If it's a blob URL, no filename; if it's a normal URL, take last segment
      if (!s) return null;
      if (s.startsWith('blob:')) return null;
      try {
        const u = new URL(s, window.location.origin);
        const parts = u.pathname.split('/').filter(Boolean);
        if (parts.length) return decodeURIComponent(parts[parts.length - 1]);
      } catch (_) {
        // fallback: simple split
        const parts = s.split('/').filter(Boolean);
        if (parts.length) return decodeURIComponent(parts[parts.length - 1].split('?')[0].split('#')[0]);
      }
    } catch (_) {}
    return null;
  }

  /**
   * Decode common 'mojibake' where UTF-8 bytes were interpreted as Latin-1/ISO-8859-1
   * Example: "7 ÑÑÐ°Ð¶-..." -> "7 этаж-..."
   */
  private _decodeMojibake(s: string | null): string | null {
    if (!s) return s;
    try {
      const str = String(s);
      const bytes = new Uint8Array(Array.from(str).map(ch => ch.charCodeAt(0) & 0xFF));
      if (typeof (window as any).TextDecoder !== 'undefined') {
        try { return new (window as any).TextDecoder('utf-8').decode(bytes); } catch (_) {}
      }
    } catch (_) {}
    try {
      // fallback for older environments
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return decodeURIComponent(escape(String(s)));
    } catch (_) {
      return s;
    }
  }

  goBack() { try { this.location.back(); } catch(_) { /* ignore */ } }
}
