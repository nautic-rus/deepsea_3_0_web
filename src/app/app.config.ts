import { ApplicationConfig, provideBrowserGlobalErrorListeners, importProvidersFrom, APP_INITIALIZER } from '@angular/core';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { TranslateModule, TranslateLoader, TranslateService } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { AuthInterceptor } from './auth/auth.interceptor';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';
import { definePreset } from '@primeng/themes';

import { routes } from './app.routes';

// Кастомный пресет с синим цветом
const BluePreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{blue.50}',
      100: '{blue.100}',
      200: '{blue.200}',
      300: '{blue.300}',
      400: '{blue.400}',
      500: '{blue.500}',
      600: '{blue.600}',
      700: '{blue.700}',
      800: '{blue.800}',
      900: '{blue.900}',
      950: '{blue.950}'
    }
  }
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: BluePreset,
        options: {
          darkModeSelector: '.app-dark'
        }
      },
      ripple: true
    })
    ,
    // Import HttpClientModule
    importProvidersFrom(HttpClientModule),
    // ngx-translate setup: loader and module
    importProvidersFrom(
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: (http: HttpClient) => new TranslateHttpLoader(http, '/i18n/', '.json'),
          deps: [HttpClient]
        }
      })
    ),
    // Initialize translate service with saved or default language
    {
      provide: APP_INITIALIZER,
      useFactory: (translate: TranslateService) => {
        return () => {
          translate.addLangs(['en', 'ru']);
          const saved = localStorage.getItem('lang') || 'en';
          translate.setDefaultLang('en');
          // start using saved language (does not need to block bootstrap)
          translate.use(saved);
        };
      },
      deps: [TranslateService],
      multi: true
    },
    // Register auth interceptor globally
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
  ]
};

// Translations removed: no Translate loader required
