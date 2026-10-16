import { HttpErrorResponse } from '@angular/common/http';
import { Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Observable, catchError, map, of, startWith, switchMap } from 'rxjs';

export interface LoadState<T> {
  loading: boolean;
  error: string | null;
  value: T | null;
}

const loading = { loading: true, error: null, value: null };

/**
 * Re-fetches whenever `key` changes (e.g. the space route parameter) and exposes loading / error / value.
 * Must be called in an injection context.
 */
export function loadFor<K, T>(key: Signal<K>, fetch: (key: K) => Observable<T>): Signal<LoadState<T>> {
  return toSignal(
    toObservable(key).pipe(
      switchMap((k) =>
        fetch(k).pipe(
          map((value): LoadState<T> => ({ loading: false, error: null, value })),
          startWith<LoadState<T>>(loading),
          catchError((error: unknown) => of<LoadState<T>>({ loading: false, error: errorMessage(error), value: null })),
        ),
      ),
    ),
    { initialValue: loading },
  );
}

function errorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const title = (error.error as { title?: string } | null)?.title;
    if (title) {
      return title;
    }
    if (error.status === 0) {
      return 'Le serveur est injoignable.';
    }
    if (error.status === 403) {
      return "Vous n'avez pas accès à cette ressource.";
    }
  }
  return 'Une erreur inattendue est survenue.';
}
