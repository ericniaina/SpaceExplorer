import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, LOCALE_ID } from '@angular/core';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withComponentInputBinding, withRouterConfig } from '@angular/router';
import { provideCharts, withDefaultRegisterables } from 'ng2-charts';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';
import { FrenchPaginatorIntl } from './core/french-paginator-intl';

export const appConfig: ApplicationConfig = {
  providers: [
    // Pages receive the parent ":space" parameter as an input.
    provideRouter(routes, withComponentInputBinding(), withRouterConfig({ paramsInheritanceStrategy: 'always' })),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync(),
    provideCharts(withDefaultRegisterables()),
    { provide: LOCALE_ID, useValue: 'fr-FR' },
    { provide: MatPaginatorIntl, useClass: FrenchPaginatorIntl },
  ],
};
