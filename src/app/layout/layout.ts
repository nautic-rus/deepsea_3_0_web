import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule, Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { filter, map, mergeMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { HeaderComponent } from './header/header';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule, HeaderComponent],
  template: `
    <div class="layout-wrapper">
      <app-header />
      <main class="layout-main">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      overflow: hidden;
    }
    .layout-wrapper {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: var(--surface-100);
      overflow: hidden;
    }
    :host-context(.app-dark) .layout-wrapper {
      background: var(--surface-800);
    }
    .layout-main {
      flex: 1 1 0;
      padding: 1rem;
      min-height: 0;
    }
  `]
})
export class LayoutComponent {
  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private titleService: Title,
    private translate: TranslateService
  ) {
    // Update document title on navigation end using route data.titleKey (translation key)
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(() => {
        // Walk the route tree and prefer the deepest route that defines a titleKey or title.
        let route = this.activatedRoute;
        let foundData = route.snapshot.data || {};
        while (route.firstChild) {
          route = route.firstChild;
          const data = route.snapshot.data || {};
          if (data['titleKey'] || data['title']) {
            foundData = data;
          }
        }
        return foundData || {};
      }),
      mergeMap((data: any) => {
        const key = data?.titleKey || data?.title;
        if (key) {
          return this.translate.get(key);
        }
        return of(null);
      })
    ).subscribe((translatedTitle: string | null) => {
      const appTitle = this.translate.instant('APP.TITLE') || this.translate.instant('components.app.TITLE');
      const finalTitle = translatedTitle ? `${translatedTitle} - ${appTitle}` : appTitle;
      this.titleService.setTitle(finalTitle);
    });
  }
}

