import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { NEVER, catchError, throwError } from 'rxjs';

/** Full-page navigation, out of the Angular router (the login is served by the API). */
@Injectable({ providedIn: 'root' })
export class BrowserNavigation {
  private readonly location = inject(DOCUMENT).location;

  currentUrl(): string {
    return this.location.pathname + this.location.search;
  }

  assign(url: string): void {
    this.location.assign(url);
  }
}

/**
 * The session lives in an HttpOnly cookie owned by the API (OIDC backend-for-frontend).
 * When it is missing or expired the API answers 401: navigate to the SSO login and come back here.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const navigation = inject(BrowserNavigation);
  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        navigation.assign(`/auth/login?returnUrl=${encodeURIComponent(navigation.currentUrl())}`);
        // Keep the page in its loading state while the browser leaves.
        return NEVER;
      }
      return throwError(() => error);
    }),
  );
};
