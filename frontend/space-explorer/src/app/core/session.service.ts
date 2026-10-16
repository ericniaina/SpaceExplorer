import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable, shareReplay } from 'rxjs';
import { Me, SpaceSummary } from './api.models';
import { SpaceApi } from './space-api.service';

/** Current user and available spaces, loaded once per page load. */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly api = inject(SpaceApi);

  readonly spaces$: Observable<SpaceSummary[]> = this.api.spaces().pipe(shareReplay(1));

  readonly me = toSignal(this.api.me().pipe(shareReplay(1)));
  readonly spaces = toSignal(this.spaces$, { initialValue: [] as SpaceSummary[] });

  /** Authenticated but member of no compartment group: only the "other compartments" total is visible. */
  readonly hasNoAccess = computed(() => {
    const me = this.me();
    return !!me && !me.isAdmin && me.compartments.length === 0;
  });

  readonly emptyMessage = computed(() =>
    this.hasNoAccess() ? "Vous n'avez accès à aucun compartiment." : 'Aucune donnée.',
  );

  spaceName(key: string): string {
    return this.spaces().find((s) => s.key.toLowerCase() === key.toLowerCase())?.displayName ?? key;
  }
}
