import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { map } from 'rxjs';
import { SessionService } from './core/session.service';

export interface PageLink {
  path: string;
  title: string;
  icon: string;
}

/** Menu order: summary first, raw data last. */
export const PAGES: PageLink[] = [
  { path: 'compartiments', title: 'Compartiments', icon: 'pie_chart' },
  { path: 'workspaces', title: 'Workspaces', icon: 'folder' },
  { path: 'workspaces-jobs', title: 'Workspaces et jobs', icon: 'account_tree' },
  { path: 'totaux-jobs', title: 'Totaux jobs', icon: 'functions' },
  { path: 'donnees-decoupees', title: 'Données découpées', icon: 'view_column' },
  { path: 'donnees-brutes', title: 'Données brutes', icon: 'table_rows' },
];

const redirectToFirstSpace: CanActivateFn = () => {
  const router = inject(Router);
  return inject(SessionService).spaces$.pipe(
    map((spaces) => (spaces.length ? router.createUrlTree([spaces[0].key, PAGES[0].path]) : true)),
  );
};

const knownSpace: CanActivateFn = (route) => {
  const router = inject(Router);
  const key = route.paramMap.get('space')?.toLowerCase();
  return inject(SessionService).spaces$.pipe(
    map((spaces) => spaces.some((s) => s.key.toLowerCase() === key) || router.createUrlTree(['/'])),
  );
};

const appTitle = 'Explorateur d’espace disque';

export const routes: Routes = [
  { path: '', pathMatch: 'full', canActivate: [redirectToFirstSpace], children: [] },
  {
    path: ':space',
    canActivate: [knownSpace],
    children: [
      { path: '', pathMatch: 'full', redirectTo: PAGES[0].path },
      {
        path: 'compartiments',
        title: `Compartiments · ${appTitle}`,
        loadComponent: () => import('./pages/compartments-page.component').then((m) => m.CompartmentsPageComponent),
      },
      {
        path: 'workspaces',
        title: `Workspaces · ${appTitle}`,
        loadComponent: () => import('./pages/workspaces-page.component').then((m) => m.WorkspacesPageComponent),
      },
      {
        path: 'workspaces-jobs',
        title: `Workspaces et jobs · ${appTitle}`,
        loadComponent: () => import('./pages/workspaces-jobs-page.component').then((m) => m.WorkspacesJobsPageComponent),
      },
      {
        path: 'totaux-jobs',
        title: `Totaux jobs · ${appTitle}`,
        loadComponent: () => import('./pages/jobs-totals-page.component').then((m) => m.JobsTotalsPageComponent),
      },
      {
        path: 'donnees-decoupees',
        title: `Données découpées · ${appTitle}`,
        loadComponent: () => import('./pages/split-page.component').then((m) => m.SplitPageComponent),
      },
      {
        path: 'donnees-brutes',
        title: `Données brutes · ${appTitle}`,
        loadComponent: () => import('./pages/raw-page.component').then((m) => m.RawPageComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
