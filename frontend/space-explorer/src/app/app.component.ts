import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { PAGES } from './app.routes';
import { SessionService } from './core/session.service';

/** Shell: toolbar (space selector, user), side menu, page outlet. */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatTooltipModule,
  ],
  template: `
    <mat-toolbar color="primary" class="toolbar">
      <mat-icon>storage</mat-icon>
      <span class="title">Explorateur d’espace disque</span>

      @if (session.spaces().length > 1) {
        <mat-button-toggle-group
          class="spaces"
          aria-label="Espace"
          hideSingleSelectionIndicator
          [value]="currentSpace()"
          (change)="switchSpace($event.value)"
        >
          @for (space of session.spaces(); track space.key) {
            <mat-button-toggle [value]="space.key">{{ space.displayName }}</mat-button-toggle>
          }
        </mat-button-toggle-group>
      }

      <span class="spacer"></span>

      @if (session.me(); as me) {
        <span class="user" [matTooltip]="me.isAdmin ? 'Administrateur : tous les compartiments' : ''">
          <mat-icon>{{ me.isAdmin ? 'admin_panel_settings' : 'person' }}</mat-icon>
          {{ me.userName }}
        </span>
      }
      <a mat-icon-button href="/auth/logout" matTooltip="Se déconnecter" aria-label="Se déconnecter">
        <mat-icon>logout</mat-icon>
      </a>
    </mat-toolbar>

    <mat-sidenav-container class="container">
      <mat-sidenav mode="side" opened class="sidenav">
        <mat-nav-list>
          @for (page of pages; track page.path) {
            <a
              mat-list-item
              [routerLink]="currentSpace() ? ['/', currentSpace(), page.path] : null"
              routerLinkActive
              #active="routerLinkActive"
              [activated]="active.isActive"
            >
              <mat-icon matListItemIcon>{{ page.icon }}</mat-icon>
              <span matListItemTitle>{{ page.title }}</span>
            </a>
          }
        </mat-nav-list>
      </mat-sidenav>
      <mat-sidenav-content class="content">
        <router-outlet />
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: `
    :host { display: flex; flex-direction: column; height: 100vh; }
    .toolbar { gap: 12px; flex-shrink: 0; }
    .title { font-weight: 500; }
    .spaces { margin-left: 24px; background: white; }
    .spacer { flex: 1; }
    .user { display: inline-flex; align-items: center; gap: 6px; font-size: 14px; }
    .container { flex: 1; }
    .sidenav { width: 264px; }
    .content { padding: 24px; box-sizing: border-box; }
  `,
})
export class AppComponent {
  readonly session = inject(SessionService);
  private readonly router = inject(Router);
  readonly pages = PAGES;

  private readonly segments = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => urlSegments(e.urlAfterRedirects)),
    ),
    { initialValue: [] as string[] },
  );

  readonly currentSpace = computed(() => this.segments()[0] ?? null);
  private readonly currentPage = computed(() => this.segments()[1] ?? PAGES[0].path);

  switchSpace(key: string): void {
    this.router.navigate(['/', key, this.currentPage()]);
  }
}

function urlSegments(url: string): string[] {
  return url.split(/[?#]/)[0].split('/').filter(Boolean).map(decodeURIComponent);
}
