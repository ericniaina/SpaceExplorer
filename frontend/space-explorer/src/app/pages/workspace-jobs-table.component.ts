import { Component, input, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { WorkspaceRow } from '../core/api.models';
import { formatBytes, formatPercent, formatSize } from '../core/format';

/** Workspaces of one compartment; a click on a workspace expands its jobs. */
@Component({
  selector: 'app-workspace-jobs-table',
  standalone: true,
  imports: [MatTableModule, MatIconModule],
  template: `
    <table mat-table [dataSource]="workspaces()" multiTemplateDataRows>
      <ng-container matColumnDef="expand">
        <th mat-header-cell *matHeaderCellDef></th>
        <td mat-cell *matCellDef="let w">
          @if (w.jobs?.length) {
            <mat-icon class="chevron" [class.open]="expanded().has(w.name)">chevron_right</mat-icon>
          }
        </td>
      </ng-container>
      <ng-container matColumnDef="name">
        <th mat-header-cell *matHeaderCellDef>Workspace</th>
        <td mat-cell *matCellDef="let w">{{ w.name }}</td>
      </ng-container>
      <ng-container matColumnDef="jobs">
        <th mat-header-cell *matHeaderCellDef class="num">Jobs</th>
        <td mat-cell *matCellDef="let w" class="num">{{ w.jobs?.length ?? 0 }}</td>
      </ng-container>
      <ng-container matColumnDef="size">
        <th mat-header-cell *matHeaderCellDef class="num">Taille</th>
        <td mat-cell *matCellDef="let w" class="num" [attr.title]="bytes(w.size)">{{ size(w.size) }}</td>
      </ng-container>
      <ng-container matColumnDef="percent">
        <th mat-header-cell *matHeaderCellDef class="num">% du compartiment</th>
        <td mat-cell *matCellDef="let w" class="num">{{ percent(w.percent) }}</td>
      </ng-container>

      <ng-container matColumnDef="detail">
        <td mat-cell *matCellDef="let w" [attr.colspan]="columns.length" class="detail-cell">
          @if (expanded().has(w.name)) {
            <table class="jobs">
              <thead>
                <tr><th>Job</th><th class="num">Taille</th><th class="num">% du workspace</th></tr>
              </thead>
              <tbody>
                @for (job of w.jobs; track job.name) {
                  <tr>
                    <td>{{ job.name }}</td>
                    <td class="num" [attr.title]="bytes(job.size)">{{ size(job.size) }}</td>
                    <td class="num">{{ percent(job.percent) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </td>
      </ng-container>

      <tr mat-header-row *matHeaderRowDef="columns"></tr>
      <tr
        mat-row
        *matRowDef="let w; columns: columns"
        class="workspace"
        [class.clickable]="w.jobs?.length"
        [attr.aria-expanded]="w.jobs?.length ? expanded().has(w.name) : null"
        [attr.tabindex]="w.jobs?.length ? 0 : null"
        (click)="toggle(w)"
        (keydown.enter)="toggle(w)"
        (keydown.space)="$event.preventDefault(); toggle(w)"
      ></tr>
      <tr mat-row *matRowDef="let w; columns: ['detail']" class="detail-row"></tr>
    </table>
  `,
  styles: `
    table { width: 100%; }
    .clickable { cursor: pointer; }
    .clickable:hover { background: rgba(0, 0, 0, 0.03); }
    .chevron { transition: transform 150ms; vertical-align: middle; color: var(--text-secondary); }
    .chevron.open { transform: rotate(90deg); }
    .mat-column-expand { width: 32px; padding-right: 0; }
    .detail-row { height: 0; }
    .detail-cell { padding: 0 0 0 48px; border-bottom-width: 0; }
    .jobs { border-collapse: collapse; margin: 4px 0 12px; }
    .jobs th, .jobs td { padding: 4px 12px; border-bottom: 1px solid var(--border); text-align: left; }
    .jobs th { font-weight: 500; color: var(--text-secondary); }
    .jobs .num { text-align: right; }
  `,
})
export class WorkspaceJobsTableComponent {
  readonly workspaces = input.required<WorkspaceRow[]>();
  readonly columns = ['expand', 'name', 'jobs', 'size', 'percent'];
  readonly expanded = signal(new Set<string>());

  size = formatSize;
  bytes = formatBytes;
  percent = formatPercent;

  toggle(workspace: WorkspaceRow): void {
    if (!workspace.jobs?.length) {
      return;
    }
    const next = new Set(this.expanded());
    if (!next.delete(workspace.name)) {
      next.add(workspace.name);
    }
    this.expanded.set(next);
  }
}
