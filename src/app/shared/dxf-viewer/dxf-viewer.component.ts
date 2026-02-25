import { Component, Input, ViewChild, ElementRef, AfterViewInit, OnDestroy, NgZone, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dxf-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dxf-viewer-root">
      <div #container style="width:100%;height:100%;min-height:360px;border:1px solid #e6e6e6;background:#fff;overflow:auto"></div>
      <div *ngIf="error" class="p-3 text-red-600">{{ error }}</div>
      <div *ngIf="!error && !ready" class="p-3 text-surface-500">Loading DXF viewer...</div>

      <!-- lightweight loading overlay (shows font / fetch / parse phases) -->
      <div *ngIf="isLoading" class="dxf-load-overlay">
        <div class="dxf-load-card">
          <div class="dxf-load-title">Loading DXF</div>
          <div class="dxf-load-text">{{ progressText || 'Loading...' }}</div>
          <div class="dxf-load-bar">
            <div class="dxf-load-bar-fill" [style.width.%]="(progress === null || progress === -1) ? 100 : (progress * 100)"></div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dxf-viewer-root { display:block; width:100%; height:100%; }
    /* removed debug panel and SHX banner styles */
    /* loading overlay */
    .dxf-load-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      pointer-events: none;
    }
    .dxf-load-card {
      pointer-events: auto;
      background: rgba(255,255,255,0.95);
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
      min-width: 240px;
      text-align: center;
    }
    .dxf-load-title { font-weight:700; margin-bottom:6px }
    .dxf-load-text { margin-bottom:8px; color:#374151 }
    .dxf-load-bar { width: 100%; height: 8px; background: #e5e7eb; border-radius: 6px; overflow: hidden }
    .dxf-load-bar-fill { height: 100%; background: linear-gradient(90deg,#06b6d4,#3b82f6); width: 0% }
  `]
})
export class DxfViewerComponent implements AfterViewInit, OnDestroy {
  @Input() src?: string | null; // URL to fetch DXF from (blob URL or remote)
  @Input() blob?: Blob | null;   // optional Blob directly
  @Input() fonts?: string[] | null; // optional list of font URLs (TTF) to provide for text rendering

  @ViewChild('container', { static: true }) container!: ElementRef<HTMLDivElement>;

  private _scriptLoaded = false;
  ready = false;
  error: string | null = null;
  @Output() readyChange = new EventEmitter<boolean>();
  // loading/progress UI (mirrors example behavior)
  isLoading = false;
  progress: number | null = null;
  progressText: string | null = null;
  private _blobUrl: string | null = null;
  private _viewerInstance: any = null;
  private _globalErrorHandler: ((ev: ErrorEvent) => void) | null = null;

  constructor(private ngZone: NgZone) {}

  /** Expose internal viewer instance for advanced consumers (e.g. GetLayers/ShowLayer) */
  GetViewer(): any {
    return this._viewerInstance;
  }

  // ...existing code...


  async ngAfterViewInit(): Promise<void> {
    try {
      // install a temporary global error listener to silence known benign errors that
      // some browsers/platforms emit (ResizeObserver loop completed) or third-party libs
      // that surface as SES_UNCAUGHT_EXCEPTION in the console. We add it here and
      // remove in ngOnDestroy to avoid swallowing unrelated errors.
      try {
        this._globalErrorHandler = (ev: ErrorEvent) => {
          try {
            const m = String(ev?.message || '');
            if (m.includes('ResizeObserver loop') || m.includes('SES_UNCAUGHT_EXCEPTION')) {
              // suppress this particular noisey error
              try { ev.preventDefault(); } catch (_) {}
              try { ev.stopImmediatePropagation?.(); } catch (_) {}
            }
          } catch (_) {}
        };
        window.addEventListener('error', this._globalErrorHandler as EventListener, true);
      } catch (_) {}

      await this._loadAndRender();
    } catch (e: any) {
      this.error = (e && e.message) ? e.message : String(e);
    }
  }

  ngOnDestroy(): void {
    try { if (this._viewerInstance && typeof this._viewerInstance.destroy === 'function') this._viewerInstance.destroy(); } catch(_) {}
    try { if (this._blobUrl) { URL.revokeObjectURL(this._blobUrl); this._blobUrl = null; } } catch(_) {}
    try {
      if (this._globalErrorHandler) {
        try { window.removeEventListener('error', this._globalErrorHandler as EventListener, true); } catch(_) {}
        this._globalErrorHandler = null;
      }
    } catch (_) {}
  }

  private _ensureScript(): Promise<void> {
    // CDN script loader removed: we import the library from node_modules via dynamic import
    return Promise.resolve();
  }

  private async _loadAndRender(): Promise<void> {
    // prepare a URL to load into the viewer: prefer src, otherwise create a blob URL from blob
    let urlToLoad: string | null = null;
    if (this.src) {
      urlToLoad = this.src;
    } else if (this.blob) {
      try {
        if (this._blobUrl) { try { URL.revokeObjectURL(this._blobUrl); } catch(_) {} this._blobUrl = null; }
      } catch(_) {}
      this._blobUrl = URL.createObjectURL(this.blob);
      urlToLoad = this._blobUrl;
    } else {
      throw new Error('No DXF source provided');
    }

    // attempt to instantiate viewer by importing the package from node_modules
    try {
      // (no raw DXF pre-scan in production build)
      // If fonts are provided, try to prefetch them and log results so we can diagnose
      // why fonts may not be requested (helps with CORS/404 debugging).
      if (this.fonts && Array.isArray(this.fonts) && this.fonts.length) {
        try {
          await Promise.all(this.fonts.map(async (f) => {
            try { await fetch(f, { method: 'GET' }); } catch (_) {}
          }));
        } catch (_) {}
      }

      await this.ngZone.runOutsideAngular(async () => {
        // dynamic import to keep bundle size small and avoid build-time type issues
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod: any = await import('dxf-viewer');
        const exported = mod && (mod.default || mod) as any;
        // prefer named export DxfViewer; fallback to other shapes
        const ViewerCtor = exported?.DxfViewer || exported?.DXFViewer || exported?.dxfViewer || exported?.Viewer || exported;
        if (!ViewerCtor) {
          throw new Error('dxf-viewer module loaded but no usable export found');
        }

        try {
          // instantiate viewer with automatic resize enabled
          const opts: any = { autoResize: true };
          if (this.fonts && Array.isArray(this.fonts) && this.fonts.length) opts.fonts = this.fonts;
          try { console.debug('[DxfViewer] initializing with fonts:', opts.fonts || null); } catch (_) {}
          this._viewerInstance = new ViewerCtor(this.container.nativeElement, opts);
          // ensure container has a reasonable height so renderer gets correct size
          try {
            const el = this.container.nativeElement;
            if (!el.style.minHeight) el.style.minHeight = '360px';
            if (!el.clientHeight || el.clientHeight === 0) {
              el.style.height = '60vh';
            }
          } catch(_) {}

          // force size update
          try {
            const w = this.container.nativeElement.clientWidth || 800;
            const h = this.container.nativeElement.clientHeight || 600;
            if (typeof this._viewerInstance.SetSize === 'function') {
              // schedule in rAF to avoid ResizeObserver sync layout errors in some browsers
              try {
                requestAnimationFrame(() => {
                  try { this._viewerInstance.SetSize(w, h); } catch(_) {}
                });
              } catch (_) {
                try { this._viewerInstance.SetSize(w, h); } catch(_) {}
              }
            }
          } catch(_) {}

          // subscribe to messages from the viewer for inline diagnostics
          try {
            if (typeof this._viewerInstance.Subscribe === 'function') {
              this._viewerInstance.Subscribe('message', (_ev: any) => {
                // no-op: suppress debug messages in production mode
              });
            }
          } catch (_) {}

          // load the DXF by URL (blob or remote) and pass fonts/progress callback like the example
          if (typeof this._viewerInstance.Load === 'function') {
            try {
              this.ngZone.run(() => { this.isLoading = true; this.progress = null; this.progressText = null; });
              await this._viewerInstance.Load({
                url: urlToLoad,
                fonts: this.fonts,
                progressCbk: (phase: string, size: number, totalSize: number | null) => {
                  try {
                    let text = '';
                    switch (phase) {
                      case 'font': text = 'Fetching fonts...'; break;
                      case 'fetch': text = 'Fetching file...'; break;
                      case 'parse': text = 'Parsing file...'; break;
                      case 'prepare': text = 'Preparing rendering data...'; break;
                      default: text = phase; break;
                    }
                    const p = (totalSize === null) ? -1 : (totalSize ? (size / totalSize) : null);
                    this.ngZone.run(() => { this.progressText = text; this.progress = (p === -1 ? -1 : p); });
                  } catch (_) {}
                }
              });
            } finally {
              this.ngZone.run(() => { this.isLoading = false; this.progress = null; this.progressText = null; });
            }
          } else {
            throw new Error('Loaded dxf-viewer instance does not support Load(url)');
          }
          // diagnostics disabled in production build
        } catch (e) {
          // initialization failed — swallow in UI and fall back to error state
          this._viewerInstance = null;
        }

        if (!this._viewerInstance) {
          throw new Error('dxf-viewer module loaded but failed to initialize for this DXF. You can download the file and open it in an external viewer.');
        }
      });
      // inform consumers that viewer is ready
      try {
        this.ngZone.run(() => {
          this.ready = true;
          try { console.debug('[DxfViewer] ready -> emitting readyChange'); } catch(_) {}
          try { this.readyChange.emit(true); } catch(_) {}
        });
      } catch (_) {
        this.ready = true;
        try { console.debug('[DxfViewer] ready -> emitting readyChange (fallback)'); } catch(_) {}
        try { this.readyChange.emit(true); } catch(_) {}
      }
    } catch (e: any) {
      if (!this.error) this.error = (e && e.message) ? e.message : String(e);
      throw e;
    }
  }

  // diagnostics removed in production build
}
