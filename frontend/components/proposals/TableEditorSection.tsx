'use client';

import { Input } from '@/components/ui/input';
import type { EditableTable } from '@/lib/api/proposal-templates-client';

interface TableEditorSectionProps {
  tables: EditableTable[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export default function TableEditorSection({
  tables,
  values,
  onChange,
}: TableEditorSectionProps) {
  if (tables.length === 0) return null;

  return (
    <div className="px-6 py-5 border-b border-border/40 space-y-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        Table Data
      </p>
      {tables.map((table) => (
        <div
          key={table.tableIndex}
          className="rounded-lg border border-border/60 overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {table.rows.map((row) => (
                <tr key={row.rowIndex} className="border-b border-border/40 last:border-0">
                  {row.cells.map((cell) => (
                    <td
                      key={cell.key}
                      className="px-2 py-1.5 align-middle border-r border-border/40 last:border-r-0">
                      <Input
                        value={values[cell.key] ?? cell.text}
                        onChange={(e) => onChange(cell.key, e.target.value)}
                        className="h-7 text-[12px] border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
                        placeholder="—"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
