import { Component, inject, input } from '@angular/core';
import { SplitRow } from '../core/api.models';
import { exportFileName } from '../core/format';
import { loadFor } from '../core/load-state';
import { SessionService } from '../core/session.service';
import { SpaceApi } from '../core/space-api.service';
import { DataTableComponent, TableColumn } from '../shared/data-table/data-table.component';
import { PageHeaderComponent } from '../shared/page-header/page-header.component';

/** P2: path split into compartment / workspace / job. The jobs total line of a workspace has no job. */
@Component({
  selector: 'app-split-page',
  standalone: true,
  imports: [PageHeaderComponent, DataTableComponent],
  template: `
    <app-page-header title="Données découpées" [space]="space()" [state]="state()" />
    @if (state().value; as response) {
      <app-data-table
        [rows]="response.data"
        [columns]="columns"
        [exportFileName]="fileName(response.spaceKey, response.fileDateUtc)"
        sheetName="Données découpées"
        [emptyMessage]="session.emptyMessage()"
      />
    }
  `,
})
export class SplitPageComponent {
  private readonly api = inject(SpaceApi);
  readonly session = inject(SessionService);

  /** Route parameter. */
  readonly space = input.required<string>();
  readonly state = loadFor(this.space, (space) => this.api.split(space));

  readonly columns: TableColumn<SplitRow>[] = [
    { key: 'compartment', header: 'Compartiment', kind: 'text', value: (r) => r.compartment },
    { key: 'workspace', header: 'Workspace', kind: 'text', value: (r) => r.workspace },
    { key: 'job', header: 'Job', kind: 'text', value: (r) => r.job },
    { key: 'size', header: 'Taille', kind: 'size', value: (r) => r.size },
  ];

  fileName(spaceKey: string, fileDateUtc: string): string {
    return exportFileName('donnees-decoupees', spaceKey, fileDateUtc);
  }
}
