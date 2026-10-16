import { Component, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { CompartmentDetail, SpaceResponse } from '../core/api.models';
import { ExcelExportService, ExportColumn } from '../core/excel-export.service';
import { exportFileName, formatBytes, formatPercent, formatSize } from '../core/format';
import { loadFor } from '../core/load-state';
import { SessionService } from '../core/session.service';
import { SpaceApi } from '../core/space-api.service';
import { PageHeaderComponent } from '../shared/page-header/page-header.component';
import { WorkspaceJobsTableComponent } from './workspace-jobs-table.component';

interface ExportRow {
  compartment: string;
  workspace: string;
  workspaceSize: number;
  job: string | null;
  jobSize: number | null;
  jobPercent: number | null;
}

/** P6: one table per compartment, workspaces expandable into their jobs. */
@Component({
  selector: 'app-workspaces-jobs-page',
  standalone: true,
  imports: [PageHeaderComponent, WorkspaceJobsTableComponent, MatExpansionModule, MatButtonModule, MatIconModule],
  template: `
    <app-page-header title="Workspaces et jobs par compartiment" [space]="space()" [state]="state()" />
    @if (state().value; as response) {
      @if (response.data.length) {
        <div class="toolbar">
          <button mat-stroked-button type="button" (click)="export(response)" [disabled]="exporting()">
            <mat-icon>download</mat-icon>
            Exporter vers Excel
          </button>
        </div>
        <mat-accordion multi>
          @for (compartment of response.data; track compartment.name) {
            <mat-expansion-panel [expanded]="true">
              <mat-expansion-panel-header>
                <mat-panel-title>{{ compartment.name }}</mat-panel-title>
                <mat-panel-description [attr.title]="bytes(compartment.size)">
                  {{ size(compartment.size) }} · {{ percent(compartment.percentOfSpace) }} de l’espace
                </mat-panel-description>
              </mat-expansion-panel-header>
              <app-workspace-jobs-table [workspaces]="compartment.workspaces" />
            </mat-expansion-panel>
          }
        </mat-accordion>
      } @else {
        <p class="muted">{{ session.emptyMessage() }}</p>
      }
    }
  `,
  styles: `
    .toolbar { display: flex; justify-content: flex-end; margin-bottom: 12px; }
  `,
})
export class WorkspacesJobsPageComponent {
  private readonly api = inject(SpaceApi);
  private readonly excel = inject(ExcelExportService);
  readonly session = inject(SessionService);

  /** Route parameter. */
  readonly space = input.required<string>();
  readonly state = loadFor(this.space, (space) => this.api.workspaces(space, true));
  readonly exporting = signal(false);

  private readonly exportColumns: ExportColumn<ExportRow>[] = [
    { header: 'Compartiment', kind: 'text', value: (r) => r.compartment },
    { header: 'Workspace', kind: 'text', value: (r) => r.workspace },
    { header: 'Taille workspace', kind: 'size', value: (r) => r.workspaceSize },
    { header: 'Job', kind: 'text', value: (r) => r.job },
    { header: 'Taille job', kind: 'size', value: (r) => r.jobSize },
    { header: '% du workspace', kind: 'percent', value: (r) => r.jobPercent },
  ];

  size = formatSize;
  bytes = formatBytes;
  percent = formatPercent;

  /** One row per job; a workspace without jobs still gets a row. */
  async export(response: SpaceResponse<CompartmentDetail[]>): Promise<void> {
    const rows = response.data.flatMap((c) =>
      c.workspaces.flatMap((w): ExportRow[] => {
        const base = { compartment: c.name, workspace: w.name, workspaceSize: w.size };
        return w.jobs?.length
          ? w.jobs.map((j) => ({ ...base, job: j.name, jobSize: j.size, jobPercent: j.percent }))
          : [{ ...base, job: null, jobSize: null, jobPercent: null }];
      }),
    );
    this.exporting.set(true);
    try {
      await this.excel.export(
        exportFileName('workspaces-jobs', response.spaceKey, response.fileDateUtc),
        'Workspaces et jobs',
        this.exportColumns,
        rows,
      );
    } finally {
      this.exporting.set(false);
    }
  }
}
