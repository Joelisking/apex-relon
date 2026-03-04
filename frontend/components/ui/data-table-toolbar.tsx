'use client';

import { Table } from '@tanstack/react-table';
import { X, Download } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTableViewOptions } from './data-table-view-options';
import { exportTableToCSV } from '@/lib/utils/export-csv';

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  searchKey?: string;
  globalFilter?: boolean;
  exportFilename?: string;
}

export function DataTableToolbar<TData>({
  table,
  searchKey,
  globalFilter = false,
  exportFilename,
}: DataTableToolbarProps<TData>) {
  const isFiltered =
    table.getState().columnFilters.length > 0 ||
    !!table.getState().globalFilter;

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        {globalFilter ? (
          <Input
            placeholder="Search all columns..."
            value={(table.getState().globalFilter as string) ?? ''}
            onChange={(event) =>
              table.setGlobalFilter(event.target.value)
            }
            className="h-8 w-[150px] lg:w-[250px]"
          />
        ) : searchKey ? (
          <Input
            placeholder={`Filter ${searchKey}...`}
            value={
              (table
                .getColumn(searchKey)
                ?.getFilterValue() as string) ?? ''
            }
            onChange={(event) =>
              table
                .getColumn(searchKey)
                ?.setFilterValue(event.target.value)
            }
            className="h-8 w-[150px] lg:w-[250px]"
          />
        ) : null}

        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => {
              table.resetColumnFilters();
              table.setGlobalFilter('');
            }}
            className="h-8 px-2 lg:px-3">
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex items-center space-x-2">
        {exportFilename && (
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => exportTableToCSV(table, exportFilename)}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        )}
        <DataTableViewOptions table={table} />
      </div>
    </div>
  );
}
