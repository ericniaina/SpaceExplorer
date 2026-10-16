import { Component, computed, inject, input } from '@angular/core';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { CompartmentRow } from '../core/api.models';
import { exportFileName, formatPercent, formatSize, naturalCompare } from '../core/format';
import { loadFor } from '../core/load-state';
import { SessionService } from '../core/session.service';
import { SpaceApi } from '../core/space-api.service';
import { DataTableComponent, TableColumn } from '../shared/data-table/data-table.component';
import { PageHeaderComponent } from '../shared/page-header/page-header.component';

export const OTHERS_LABEL = 'Autres compartiments';

/** Colorblind-safe categorical order (validated); past 7 slices the rest folds into the neutral "others" slice. */
const SERIES_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6'];
const OTHERS_COLOR = '#a3a29d';
const SURFACE = '#fcfcfb';

interface Slice {
  label: string;
  size: number;
  percent: number;
  color: string;
}

/** P4: consumption per compartment. Compartments the user cannot see are merged into one "others" row. */
@Component({
  selector: 'app-compartments-page',
  standalone: true,
  imports: [PageHeaderComponent, DataTableComponent, BaseChartDirective],
  template: `
    <app-page-header title="Compartiments" [space]="space()" [state]="state()" />
    @if (state().value; as response) {
      <div class="layout">
        <section class="table">
          <app-data-table
            [rows]="response.data.rows"
            [columns]="columns()"
            [exportFileName]="fileName(response.spaceKey, response.fileDateUtc)"
            sheetName="Compartiments"
            [paginated]="false"
            [filterable]="false"
            [showTotal]="true"
          />
          @if (session.hasNoAccess()) {
            <p class="muted">Vous n'avez accès à aucun compartiment : seul le total des autres compartiments est affiché.</p>
          }
        </section>
        <section class="chart" aria-label="Répartition de l'espace par compartiment">
          <canvas baseChart type="pie" [data]="chartData()" [options]="chartOptions"></canvas>
        </section>
      </div>
    }
  `,
  styles: `
    .layout { display: grid; grid-template-columns: minmax(0, 3fr) minmax(280px, 2fr); gap: 24px; align-items: start; }
    .chart { max-width: 420px; width: 100%; justify-self: center; }
    @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }
  `,
})
export class CompartmentsPageComponent {
  private readonly api = inject(SpaceApi);
  readonly session = inject(SessionService);

  /** Route parameter. */
  readonly space = input.required<string>();
  readonly state = loadFor(this.space, (space) => this.api.compartments(space));

  /**
   * The 7 largest visible compartments get a color, assigned in name order so a compartment keeps
   * its color when sizes change; everything else (hidden compartments, smaller ones) is one gray slice.
   */
  private readonly colorByName = computed(() => {
    const rows = this.state().value?.data.rows ?? [];
    const top = rows
      .filter((r) => !r.isOthers)
      .sort((a, b) => b.size - a.size)
      .slice(0, SERIES_COLORS.length)
      .map((r) => r.name!)
      .sort(naturalCompare);
    return new Map(top.map((name, i) => [name, SERIES_COLORS[i]]));
  });

  readonly columns = computed<TableColumn<CompartmentRow>[]>(() => {
    const colors = this.colorByName();
    return [
      {
        key: 'name',
        header: 'Compartiment',
        kind: 'text',
        value: (r) => label(r),
        color: (r) => (r.name && colors.get(r.name)) || OTHERS_COLOR,
      },
      { key: 'size', header: 'Taille', kind: 'size', value: (r) => r.size },
      { key: 'percent', header: '% de l’espace', kind: 'percent', value: (r) => r.percent },
    ];
  });

  readonly chartData = computed<ChartData<'pie', number[], string>>(() => {
    const slices = this.slices();
    return {
      labels: slices.map((s) => s.label),
      datasets: [
        {
          data: slices.map((s) => s.size),
          backgroundColor: slices.map((s) => s.color),
          borderColor: SURFACE,
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    };
  });

  readonly chartOptions: ChartConfiguration<'pie', number[], string>['options'] = {
    responsive: true,
    // The table next to the chart is the legend (color swatch, size and percentage on each row).
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const slice = this.slices()[ctx.dataIndex];
            return ` ${formatSize(slice.size)} (${formatPercent(slice.percent)})`;
          },
        },
      },
    },
  };

  private readonly slices = computed<Slice[]>(() => {
    const rows = this.state().value?.data.rows ?? [];
    const colors = this.colorByName();
    const colored: Slice[] = [];
    const others: Slice = { label: OTHERS_LABEL, size: 0, percent: 0, color: OTHERS_COLOR };

    for (const row of rows) {
      const color = row.name ? colors.get(row.name) : undefined;
      if (color) {
        colored.push({ label: row.name!, size: row.size, percent: row.percent, color });
      } else {
        others.size += row.size;
        others.percent += row.percent;
      }
    }

    colored.sort((a, b) => naturalCompare(a.label, b.label));
    return others.size > 0 ? [...colored, others] : colored;
  });

  fileName(spaceKey: string, fileDateUtc: string): string {
    return exportFileName('compartiments', spaceKey, fileDateUtc);
  }
}

function label(row: CompartmentRow): string {
  return row.isOthers ? OTHERS_LABEL : row.name!;
}
