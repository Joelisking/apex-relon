import type { Table } from '@tanstack/react-table';

export function exportTableToCSV<TData>(
  table: Table<TData>,
  filename: string
) {
  const visibleColumns = table
    .getAllColumns()
    .filter((col) => col.getIsVisible() && col.id !== 'actions' && col.id !== 'select');

  // Header row
  const headers = visibleColumns.map(
    (col) => {
      const def = col.columnDef;
      const header = typeof def.header === 'string' ? def.header : col.id;
      return `"${String(header).replace(/"/g, '""')}"`;
    }
  );

  // Data rows — use filtered + sorted rows
  const rows = table.getFilteredRowModel().rows.map((row) =>
    visibleColumns.map((col) => {
      const value = row.getValue(col.id);
      const str = value == null ? '' : String(value);
      return `"${str.replace(/"/g, '""')}"`;
    })
  );

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Export any array of objects to CSV
 * @param data Array of objects to export
 * @param filename Filename without extension
 * @param headers Optional custom headers (if not provided, uses object keys)
 */
export function exportDataToCSV<T extends object>(
  data: T[],
  filename: string,
  headers?: { key: keyof T; label: string }[]
) {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // If no headers provided, use object keys
  const headersToUse = headers || Object.keys(data[0]).map((key) => ({ key, label: key }));

  // Header row
  const headerRow = headersToUse.map((h) => `"${String(h.label).replace(/"/g, '""')}"`);

  // Data rows
  const rows = data.map((item) =>
    headersToUse.map((h) => {
      const value = (item as Record<string, unknown>)[h.key as string];
      const str = value == null ? '' : String(value);
      return `"${str.replace(/"/g, '""')}"`;
    })
  );

  const csv = [headerRow.join(','), ...rows.map((r) => r.join(','))].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
