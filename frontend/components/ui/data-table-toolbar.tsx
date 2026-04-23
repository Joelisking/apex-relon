'use client';

import { Table } from '@tanstack/react-table';
import { Search, SlidersHorizontal, X, Download } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTableViewOptions } from './data-table-view-options';
import { DataTableFacetedFilter } from './data-table-faceted-filter';
import { exportTableToCSV } from '@/lib/utils/export-csv';

export interface FilterConfig {
  columnId: string;
  title: string;
  options: { label: string; value: string }[];
}

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  searchKey?: string;
  globalFilter?: boolean;
  searchPlaceholder?: string;
  exportFilename?: string;
  filterConfigs?: FilterConfig[];
}

export function DataTableToolbar<TData>({
  table,
  searchKey,
  globalFilter = false,
  searchPlaceholder,
  exportFilename,
  filterConfigs,
}: DataTableToolbarProps<TData>) {
  const isFiltered =
    table.getState().columnFilters.length > 0 ||
    !!table.getState().globalFilter;

  const hasSearch = globalFilter || !!searchKey;
  const hasFilters = !!filterConfigs?.length;

  return (
    <div className="flex items-center gap-2 rounded-xl border bg-card/60 px-3 py-2 shadow-sm backdrop-blur-sm">
      {/* Search */}
      {hasSearch && (
        <div className="relative shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          {globalFilter ? (
            <Input
              placeholder={searchPlaceholder ?? 'Search...'}
              value={(table.getState().globalFilter as string) ?? ''}
              onChange={(e) => table.setGlobalFilter(e.target.value)}
              className="h-8 pl-8 w-[180px] lg:w-[220px] bg-muted/50 border-0 focus-visible:ring-1 text-sm"
            />
          ) : (
            <Input
              placeholder={searchPlaceholder ?? `Filter ${searchKey}...`}
              value={(table.getColumn(searchKey!)?.getFilterValue() as string) ?? ''}
              onChange={(e) => table.getColumn(searchKey!)?.setFilterValue(e.target.value)}
              className="h-8 pl-8 w-[180px] lg:w-[220px] bg-muted/50 border-0 focus-visible:ring-1 text-sm"
            />
          )}
        </div>
      )}

      {/* Divider */}
      {hasSearch && hasFilters && (
        <div className="h-5 w-px bg-border/60 shrink-0" />
      )}

      {/* Filter group */}
      {hasFilters && (
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
          <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wide shrink-0">
            <SlidersHorizontal className="h-3 w-3" />
            Filters
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {filterConfigs?.map((config) => {
              const column = table.getColumn(config.columnId);
              if (!column) return null;
              return (
                <DataTableFacetedFilter
                  key={config.columnId}
                  column={column}
                  title={config.title}
                  options={config.options}
                />
              );
            })}
          </div>

          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                table.resetColumnFilters();
                table.setGlobalFilter('');
              }}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1">
              Clear
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}

      {/* Right actions */}
      <div className="ml-auto flex items-center gap-1.5 shrink-0">
        {exportFilename && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => exportTableToCSV(table, exportFilename)}>
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        )}
        <DataTableViewOptions table={table} />
      </div>
    </div>
  );
}
