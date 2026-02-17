import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule } from '@angular/router';
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
      overflow: auto;
      padding: 1rem;
      min-height: 0;
    }
  `]
})
export class LayoutComponent {}
