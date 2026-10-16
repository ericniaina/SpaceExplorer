import { Component, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { CompartmentDetail, SpaceResponse, WorkspaceRow } from '../core/api.models';
import { ExcelExportService, ExportColumn } from '../core/excel-export.service';
import { exportFileName, formatBytes, formatPercent, formatSize } from '../core/format';
import { loadFor } from '../core/load-state';
import { SessionService } from '../core/session.service';
import { SpaceApi } from '../core/space-api.service';
import { DataTableComponent, TableColumn } from '../shared/data-table/data-table.component';
import { PageHeaderComponent } from '../shared/page-header/page-header.component';

interface ExportRow {
  compartment: string;
  workspace: string;
  size: number;
  percent: number;
}

/** P5: one table per compartment with the consumption of each workspace. */
@Component({
  selector: 'app-workspaces-page',
  standalone: true,
  imports: [PageHeaderComponent, DataTableComponent, MatExpansionModule, MatButtonModule, MatIconModule],
  template: `
    <app-page-header title="Workspaces par compartiment" [space]="space()" [state]="state()" />
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
              <app-data-table
                [rows]="compartment.workspaces"
                [columns]="columns"
                [paginated]="false"
                [filterable]="false"
                [showTotal]="true"
              />
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
export class WorkspacesPageComponent {
  private readonly api = inject(SpaceApi);
  private readonly excel = inject(ExcelExportService);
  readonly session = inject(SessionService);

  /** Route parameter. */
  readonly space = input.required<string>();
  readonly state = loadFor(this.space, (space) => this.api.workspaces(space, false));
  readonly exporting = signal(false);

  readonly columns: TableColumn<WorkspaceRow>[] = [
    { key: 'name', header: 'Workspace', kind: 'text', value: (r) => r.name },
    { key: 'size', header: 'Taille', kind: 'size', value: (r) => r.size },
    { key: 'percent', header: '% du compartiment', kind: 'percent', value: (r) => r.percent },
  ];

  private readonly exportColumns: ExportColumn<ExportRow>[] = [
    { header: 'Compartiment', kind: 'text', value: (r) => r.compartment },
    { header: 'Workspace', kind: 'text', value: (r) => r.workspace },
    { header: 'Taille', kind: 'size', value: (r) => r.size },
    { header: '% du compartiment', kind: 'percent', value: (r) => r.percent },
  ];

  size = formatSize;
  bytes = formatBytes;
  percent = formatPercent;

  async export(response: SpaceResponse<CompartmentDetail[]>): Promise<void> {
    const rows = response.data.flatMap((c) =>
      c.workspaces.map((w) => ({ compartment: c.name, workspace: w.name, size: w.size, percent: w.percent })),
    );
    this.exporting.set(true);
    try {
      await this.excel.export(
        exportFileName('workspaces', response.spaceKey, response.fileDateUtc),
        'Workspaces',
        this.exportColumns,
        rows,
      );
    } finally {
      this.exporting.set(false);
    }
  }
}
