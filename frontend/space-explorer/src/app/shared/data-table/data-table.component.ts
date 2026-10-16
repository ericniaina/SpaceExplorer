import { AfterViewInit, Component, ViewChild, computed, effect, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { ExcelExportService, ExportColumn } from '../../core/excel-export.service';
import { formatBytes, formatPercent, formatSize } from '../../core/format';

export interface TableColumn<T> extends ExportColumn<T> {
  key: string;
  /** Optional color swatch shown before the value (the table then doubles as a chart legend). */
  color?: (row: T) => string | null;
}

/**
 * Generic client-side table: text filter, column sort, pagination, total of the filtered rows,
 * and Excel export of the filtered + sorted rows (all pages).
 */
@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [MatTableModule, MatSortModule, MatPaginatorModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
})
export class DataTableComponent<T> implements AfterViewInit {
  private readonly excel = inject(ExcelExportService);

  readonly rows = input.required<readonly T[]>();
  readonly columns = input.required<TableColumn<T>[]>();
  /** Null hides the export button. */
  readonly exportFileName = input<string | null>(null);
  readonly sheetName = input('Données');
  readonly paginated = input(true);
  readonly filterable = input(true);
  /** Footer with the sum of the size columns. Keep off when rows overlap (jobs totals + jobs). */
  readonly showTotal = input(false);
  readonly emptyMessage = input('Aucune donnée.');

  @ViewChild(MatSort) private sort?: MatSort;
  @ViewChild(MatPaginator) private paginator?: MatPaginator;

  readonly dataSource = new MatTableDataSource<T>([]);
  readonly displayedColumns = computed(() => this.columns().map((c) => c.key));
  readonly exporting = signal(false);
  filter = '';

  constructor() {
    effect(() => {
      this.dataSource.data = this.rows().slice();
    });

    this.dataSource.sortingDataAccessor = (row, key) => this.column(key)?.value(row) ?? '';
    this.dataSource.filterPredicate = (row, filter) =>
      this.columns()
        .filter((c) => c.kind === 'text')
        .some((c) => String(c.value(row) ?? '').toLowerCase().includes(filter));
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort ?? null;
    this.dataSource.paginator = this.paginator ?? null;
  }

  applyFilter(value: string): void {
    this.filter = value.trim().toLowerCase();
    this.dataSource.filter = this.filter;
    this.paginator?.firstPage();
  }

  display(column: TableColumn<T>, row: T): string {
    const value = column.value(row);
    if (value === null) {
      return '';
    }
    switch (column.kind) {
      case 'size':
        return formatSize(Number(value));
      case 'percent':
        return formatPercent(Number(value));
      default:
        return String(value);
    }
  }

  tooltip(column: TableColumn<T>, row: T): string | null {
    const value = column.value(row);
    return column.kind === 'size' && typeof value === 'number' ? formatBytes(value) : null;
  }

  footer(column: TableColumn<T>, index: number): string {
    if (column.kind === 'size') {
      return formatSize(this.filteredSum(column));
    }
    return index === 0 ? 'Total' : '';
  }

  footerTooltip(column: TableColumn<T>): string | null {
    return column.kind === 'size' ? formatBytes(this.filteredSum(column)) : null;
  }

  async export(): Promise<void> {
    const fileName = this.exportFileName();
    if (!fileName) {
      return;
    }
    this.exporting.set(true);
    try {
      const rows = this.sort ? this.dataSource.sortData(this.dataSource.filteredData.slice(), this.sort) : this.dataSource.filteredData;
      await this.excel.export(fileName, this.sheetName(), this.columns(), rows);
    } finally {
      this.exporting.set(false);
    }
  }

  private filteredSum(column: TableColumn<T>): number {
    return this.dataSource.filteredData.reduce((sum, row) => sum + Number(column.value(row) ?? 0), 0);
  }

  private column(key: string): TableColumn<T> | undefined {
    return this.columns().find((c) => c.key === key);
  }
}
