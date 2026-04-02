import { type CSSProperties, useCallback, useState } from 'react';
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
type Accent = 'default' | 'gold' | 'cyan' | 'green' | 'red';

interface PixelTableProps<T> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  density?: Density;
  stickyHeader?: boolean;
  globalFilter?: string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  maxHeight?: number | string;
  accent?: Accent;
  className?: string;
  style?: CSSProperties;
}

const densityPadding: Record<Density, string> = {
  compact: '6px 8px',
  comfortable: '8px 12px',
};

const densityFontSize: Record<Density, string> = {
  compact: '11px',
  comfortable: '12px',
};

const accentBorder: Record<Accent, string> = {
  default: 'var(--mfd-border)',
  gold: 'var(--mfd-gold)',
  cyan: 'var(--mfd-cyan)',
  green: 'var(--mfd-green)',
  red: 'var(--mfd-red)',
};

export function PixelTable<T>({
  data,
  columns,
  density = 'compact',
  stickyHeader = true,
  globalFilter: externalFilter,
  onRowClick,
  emptyMessage = 'No data',
  maxHeight,
  accent = 'default',
  className,
  style,
}: PixelTableProps<T>) {
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
      style={{
        overflow: 'auto',
        maxHeight,
        border: `3px solid ${accentBorder[accent]}`,
        background: 'var(--mfd-bg-2)',
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
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  style={{
                    padding: densityPadding[density],
                    textAlign: 'left',
                    fontFamily: 'var(--mfd-font-pixel)',
                    fontWeight: 400,
                    fontSize: '7px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    color: accent === 'default' ? 'var(--mfd-text-faint)' : accentBorder[accent],
                    background: 'var(--mfd-bg-3)',
                    borderBottom: `2px solid ${accentBorder[accent]}`,
                    cursor: header.column.getCanSort() ? 'pointer' : 'default',
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
                      : renderHeaderLabel(header.column.columnDef.header, header.getContext())}
                    {header.column.getCanSort() && (
                      <SortIcon direction={header.column.getIsSorted()} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: 'var(--mfd-text-faint)',
                  fontFamily: 'var(--mfd-font-pixel)',
                  fontSize: '8px',
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
                data-mfd-focusable={onRowClick ? 'pixel-row' : undefined}
                style={{
                  cursor: onRowClick ? 'pointer' : 'default',
                  borderBottom: '1px solid #151515',
                  background: row.index % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
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

function renderHeaderLabel<T>(
  header: ColumnDef<T, unknown>['header'],
  context: any,
) {
  if (typeof header === 'string') {
    return header.toUpperCase();
  }

  return flexRender(header, context);
}

function SortIcon({ direction }: { direction: false | 'asc' | 'desc' }) {
  if (direction === 'asc') return <ArrowUp size={10} />;
  if (direction === 'desc') return <ArrowDown size={10} />;
  return <ArrowUpDown size={10} style={{ opacity: 0.4 }} />;
}
