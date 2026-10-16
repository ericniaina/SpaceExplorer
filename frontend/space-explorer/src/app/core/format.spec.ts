import { exportFileName, formatBytes, formatPercent, formatSize, naturalCompare } from './format';

// Intl fr-FR uses narrow no-break spaces as thousands separators.
const normalize = (s: string) => s.replace(/[  ]/g, ' ');

describe('format', () => {
  it('formats sizes in binary units with French decimals', () => {
    expect(normalize(formatSize(512))).toBe('512 octets');
    expect(normalize(formatSize(1536))).toBe('1,5 Ko');
    expect(normalize(formatSize(5 * 1024 ** 3))).toBe('5 Go');
    expect(normalize(formatSize(1.25 * 1024 ** 4))).toBe('1,3 To');
  });

  it('formats exact byte counts', () => {
    expect(normalize(formatBytes(13312345678))).toBe('13 312 345 678 octets');
  });

  it('formats percentages already in 0..100', () => {
    expect(normalize(formatPercent(17.3579))).toBe('17,4 %');
  });

  it('builds export file names from the source file date', () => {
    expect(exportFileName('compartiments', 'A', '2026-10-15T09:17:33Z')).toBe('compartiments_A_2026-10-15.xlsx');
  });

  it('sorts compartment names naturally', () => {
    expect(['Compartiment10', 'Compartiment2', 'Compartiment1'].sort(naturalCompare)).toEqual([
      'Compartiment1',
      'Compartiment2',
      'Compartiment10',
    ]);
  });
});
