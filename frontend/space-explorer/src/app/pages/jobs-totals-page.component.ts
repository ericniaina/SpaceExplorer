import { Component, inject, input } from '@angular/core';
import { JobsTotalRow } from '../core/api.models';
import { exportFileName } from '../core/format';
import { loadFor } from '../core/load-state';
import { SessionService } from '../core/session.service';
import { SpaceApi } from '../core/space-api.service';
import { DataTableComponent, TableColumn } from '../shared/data-table/data-table.component';
import { PageHeaderComponent } from '../shared/page-header/page-header.component';

/** P3: only the jobs total line of each workspace. */
@Component({
  selector: 'app-jobs-totals-page',
  standalone: true,
  imports: [PageHeaderComponent, DataTableComponent],
  template: `
    <app-page-header title="Totaux jobs" [space]="space()" [state]="state()" />
    @if (state().value; as response) {
      <app-data-table
        [rows]="response.data"
        [columns]="columns"
        [exportFileName]="fileName(response.spaceKey, response.fileDateUtc)"
        sheetName="Totaux jobs"
        [showTotal]="true"
        [emptyMessage]="session.emptyMessage()"
      />
    }
  `,
})
export class JobsTotalsPageComponent {
  private readonly api = inject(SpaceApi);
  readonly session = inject(SessionService);

  /** Route parameter. */
  readonly space = input.required<string>();
  readonly state = loadFor(this.space, (space) => this.api.jobsTotals(space));

  readonly columns: TableColumn<JobsTotalRow>[] = [
    { key: 'compartment', header: 'Compartiment', kind: 'text', value: (r) => r.compartment },
    { key: 'workspace', header: 'Workspace', kind: 'text', value: (r) => r.workspace },
    { key: 'size', header: 'Taille', kind: 'size', value: (r) => r.size },
  ];

  fileName(spaceKey: string, fileDateUtc: string): string {
    return exportFileName('totaux-jobs', spaceKey, fileDateUtc);
  }
}
