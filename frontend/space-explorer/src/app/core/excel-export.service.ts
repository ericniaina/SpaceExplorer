import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { formatSize } from './format';

export type ExportKind = 'text' | 'size' | 'percent';

export interface ExportColumn<T> {
  header: string;
  kind: ExportKind;
  value: (row: T) => string | number | null;
}

/**
 * Writes rows to an .xlsx file in the browser. ExcelJS is loaded on demand (~1 Mo) only when exporting.
 * A size column produces two Excel columns: the exact byte count (number) and the readable size.
 */
@Injectable({ providedIn: 'root' })
export class ExcelExportService {
  private readonly document = inject(DOCUMENT);

  async export<T>(fileName: string, sheetName: string, columns: ExportColumn<T>[], rows: readonly T[]): Promise<void> {
    const { Workbook } = await import('exceljs');

    const workbook = new Workbook();
    const sheet = workbook.addWorksheet(sheetName.slice(0, 31));

    sheet.columns = columns.flatMap((c) => {
      switch (c.kind) {
        case 'size':
          return [
            { header: `${c.header} (octets)`, width: 20, style: { numFmt: '#,##0' } },
            { header: c.header, width: 14 },
          ];
        case 'percent':
          return [{ header: c.header, width: 10, style: { numFmt: '0.0%' } }];
        default:
          return [{ header: c.header, width: 30 }];
      }
    });

    for (const row of rows) {
      sheet.addRow(
        columns.flatMap((c) => {
          const value = c.value(row);
          switch (c.kind) {
            case 'size':
              return typeof value === 'number' ? [value, formatSize(value)] : [null, null];
            case 'percent':
              return [typeof value === 'number' ? value / 100 : null];
            default:
              return [value];
          }
        }),
      );
    }

    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    const buffer = await workbook.xlsx.writeBuffer();
    this.download(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName);
  }

  private download(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = this.document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }
}
