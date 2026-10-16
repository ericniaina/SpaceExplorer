import { Component, computed, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { SpaceResponse } from '../../core/api.models';
import { formatDate } from '../../core/format';
import { LoadState } from '../../core/load-state';
import { SessionService } from '../../core/session.service';

/** Page title with the space name, source file date, stale-data warning, loading bar and error. */
@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [MatIconModule, MatProgressBarModule],
  template: `
    <header>
      <h1>{{ title() }} <span class="space">— {{ spaceName() }}</span></h1>
      @if (state().value; as response) {
        <p class="muted">Données du {{ date(response.fileDateUtc) }}</p>
        @if (response.stale) {
          <p class="banner warning" role="status">
            <mat-icon>warning</mat-icon>
            Le fichier source n'a pas pu être relu : les données affichées peuvent ne pas être à jour.
          </p>
        }
      }
      @if (state().loading) {
        <mat-progress-bar mode="indeterminate" />
      }
      @if (state().error; as error) {
        <p class="banner error" role="alert"><mat-icon>error</mat-icon>{{ error }}</p>
      }
    </header>
  `,
  styles: `
    header { margin-bottom: 16px; }
    h1 { margin: 0 0 4px; font-size: 22px; font-weight: 500; }
    .space { color: var(--text-secondary); font-weight: 400; }
    p { margin: 0 0 8px; }
    .banner { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 4px; }
    .warning { background: var(--warning-bg); color: var(--warning-text); }
    .error { background: #fdecec; color: #8a1c1c; }
  `,
})
export class PageHeaderComponent {
  private readonly session = inject(SessionService);

  readonly title = input.required<string>();
  readonly space = input.required<string>();
  readonly state = input.required<LoadState<SpaceResponse<unknown>>>();

  readonly spaceName = computed(() => this.state().value?.spaceName ?? this.session.spaceName(this.space()));

  date(iso: string): string {
    return formatDate(iso);
  }
}
