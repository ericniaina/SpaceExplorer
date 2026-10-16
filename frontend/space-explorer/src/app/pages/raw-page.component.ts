import { Component, inject, input } from '@angular/core';
import { RawRow } from '../core/api.models';
import { exportFileName } from '../core/format';
import { loadFor } from '../core/load-state';
import { SessionService } from '../core/session.service';
import { SpaceApi } from '../core/space-api.service';
import { DataTableComponent, TableColumn } from '../shared/data-table/data-table.component';
import { PageHeaderComponent } from '../shared/page-header/page-header.component';

/** P1: CSV lines as they are, full absolute path and size. */
@Component({
  selector: 'app-raw-page',
  standalone: true,
  imports: [PageHeaderComponent, DataTableComponent],
  template: `
    <app-page-header title="Données brutes" [space]="space()" [state]="state()" />
    @if (state().value; as response) {
      <app-data-table
        [rows]="response.data"
        [columns]="columns"
        [exportFileName]="fileName(response.spaceKey, response.fileDateUtc)"
        sheetName="Données brutes"
        [emptyMessage]="session.emptyMessage()"
      />
    }
  `,
})
export class RawPageComponent {
  private readonly api = inject(SpaceApi);
  readonly session = inject(SessionService);

  /** Route parameter. */
  readonly space = input.required<string>();
  readonly state = loadFor(this.space, (space) => this.api.raw(space));

  readonly columns: TableColumn<RawRow>[] = [
    { key: 'path', header: 'Chemin', kind: 'text', value: (r) => r.path },
    { key: 'size', header: 'Taille', kind: 'size', value: (r) => r.size },
  ];

  fileName(spaceKey: string, fileDateUtc: string): string {
    return exportFileName('donnees-brutes', spaceKey, fileDateUtc);
  }
}
