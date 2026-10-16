const UNITS = ['octets', 'Ko', 'Mo', 'Go', 'To', 'Po'];
const sizeFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
const bytesFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const percentFormat = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

/** Human readable size, binary base (1 Ko = 1024 octets): `12,4 Go`. */
export function formatSize(bytes: number): string {
  let value = bytes;
  let unit = 0;
  while (Math.abs(value) >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${unit === 0 ? bytesFormat.format(value) : sizeFormat.format(value)} ${UNITS[unit]}`;
}

/** Exact byte count, for tooltips: `13 312 345 678 octets`. */
export function formatBytes(bytes: number): string {
  return `${bytesFormat.format(bytes)} octets`;
}

/** `percent` is already in 0..100: `12,3 %`. */
export function formatPercent(percent: number): string {
  return `${percentFormat.format(percent)} %`;
}

export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

/** `2026-10-15`, for file names. */
export function isoDay(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

/** `donnees-brutes_A_2026-10-15.xlsx`: page, space and date of the source file. */
export function exportFileName(page: string, spaceKey: string, fileDateUtc: string): string {
  return `${page}_${spaceKey}_${isoDay(fileDateUtc)}.xlsx`;
}

/** Natural order: "Compartiment2" before "Compartiment10". */
export const naturalCompare = new Intl.Collator('fr-FR', { numeric: true, sensitivity: 'base' }).compare;
