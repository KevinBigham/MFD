import { type CSSProperties, type ReactNode, useState, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type RowSelectionState,
} from '@tanstack/react-table';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

type Density = 'compact' | 'comfortable';

interface MfdTableProps<T> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  density?: Density;
  stickyHeader?: boolean;
  globalFilter?: string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  maxHeight?: number | string;
  className?: string;
  style?: CSSProperties;
}

const densityPadding: Record<Density, string> = {
  compact: '4px 8px',
  comfortable: '8px 12px',
};

const densityFontSize: Record<Density, string> = {
  compact: '0.75rem',
  comfortable: '0.8125rem',
};

export function MfdTable<T>({
  data,
  columns,
  density = 'compact',
  stickyHeader = true,
  globalFilter: externalFilter,
  onRowClick,
  emptyMessage = 'No data',
  maxHeight,
  className,
  style,
}: MfdTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState('');

  const activeFilter = externalFilter ?? globalFilter;

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, rowSelection, globalFilter: activeFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, row: T) => {
      if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onRowClick(row);
      }
    },
    [onRowClick],
  );

  return (
    <div
      className={className}
      data-mfd-table="true"
      data-mfd-table-density={density}
      style={{
        overflow: 'auto',
        maxHeight,
        border: '1px solid var(--mfd-border)',
        borderRadius: 'var(--mfd-rad-lg)',
        ...style,
      }}
    >
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontFamily: 'var(--mfd-font-mono)',
        fontSize: densityFontSize[density],
      }}>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const sortDirection = header.column.getIsSorted();
                const sortHandler = header.column.getToggleSortingHandler();
                const ariaSort = sortDirection === 'asc'
                  ? 'ascending'
                  : sortDirection === 'desc'
                    ? 'descending'
                    : canSort
                      ? 'none'
                      : undefined;

                return (
                  <th
                    key={header.id}
                    onClick={canSort ? sortHandler : undefined}
                    onKeyDown={(event) => {
                      if (!canSort || (event.key !== 'Enter' && event.key !== ' ')) return;
                      event.preventDefault();
                      sortHandler?.(event);
                    }}
                    tabIndex={canSort ? 0 : undefined}
                    aria-sort={ariaSort}
                    aria-label={canSort ? `Sort by ${typeof header.column.columnDef.header === 'string' ? header.column.columnDef.header : header.column.id}` : undefined}
                    data-mfd-table-sortable={canSort ? 'true' : 'false'}
                    data-mfd-table-sorted={sortDirection || 'false'}
                    style={{
                      padding: densityPadding[density],
                      textAlign: 'left',
                      fontWeight: 600,
                      fontSize: '0.6875rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: sortDirection ? 'var(--mfd-gold)' : 'var(--mfd-text-dim)',
                      background: sortDirection
                        ? 'linear-gradient(180deg, rgba(255, 215, 0, 0.13), var(--mfd-bg-2))'
                        : 'var(--mfd-bg-2)',
                      borderBottom: `1px solid ${sortDirection ? 'var(--mfd-gold)' : 'var(--mfd-border)'}`,
                      cursor: canSort ? 'pointer' : 'default',
                      outline: 'none',
                      userSelect: 'none',
                      whiteSpace: 'nowrap',
                      ...(stickyHeader ? {
                        position: 'sticky' as const,
                        top: 0,
                        zIndex: 1,
                      } : {}),
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      {canSort && (
                        <SortIcon direction={sortDirection} />
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  padding: 'var(--mfd-sp-xl)',
                  textAlign: 'center',
                  color: 'var(--mfd-text-faint)',
                  fontFamily: 'var(--mfd-font-sans)',
                }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row.original)}
                onKeyDown={(e) => handleKeyDown(e, row.original)}
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? 'button' : undefined}
                style={{
                  cursor: onRowClick ? 'pointer' : 'default',
                  borderBottom: '1px solid var(--mfd-border)',
                  transition: 'background var(--mfd-motion-fast)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--mfd-bg-2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
                onFocus={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 215, 0, 0.08)';
                  e.currentTarget.style.boxShadow = 'var(--mfd-focus-ring)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    data-mfd-table-cell-id={cell.column.id}
                    style={{
                      padding: densityPadding[density],
                      color: 'var(--mfd-text)',
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function SortIcon({ direction }: { direction: false | 'asc' | 'desc' }) {
  if (direction === 'asc') return <ArrowUp size={12} />;
  if (direction === 'desc') return <ArrowDown size={12} />;
  return <ArrowUpDown size={12} style={{ opacity: 0.3 }} />;
}
