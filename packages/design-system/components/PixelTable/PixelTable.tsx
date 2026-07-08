import { type CSSProperties, useCallback, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type HeaderContext,
  type SortingState,
  type ColumnFiltersState,
  type RowSelectionState,
} from '@tanstack/react-table';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

type Density = 'compact' | 'comfortable';
type Accent = 'default' | 'gold' | 'cyan' | 'green' | 'red';
/**
 * Sprint 42 responsive mode.
 * - 'scroll': keep horizontal overflow (historical default).
 * - 'cards':  below --mfd-bp-sm, rows stack into labeled cards.
 *             Driven by data-mfd-table-mode in global tokens.css.
 */
type ResponsiveMode = 'scroll' | 'cards';

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
  responsive?: ResponsiveMode;
  className?: string;
  style?: CSSProperties;
}

const densityPadding: Record<Density, string> = {
  compact: '8px 10px',
  comfortable: '10px 14px',
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
  responsive = 'scroll',
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
      data-mfd-pixel-table="true"
      data-mfd-table-accent={accent}
      data-mfd-table-density={density}
      data-mfd-table-responsive={responsive}
      className={className}
      style={{
        overflow: 'auto',
        maxHeight,
        border: `1px solid ${accentBorder[accent]}`,
        borderTop: `3px solid ${accentBorder[accent]}`,
        borderRadius: 'var(--mfd-rad-lg)',
        background: 'var(--mfd-gradient-card)',
        boxShadow: 'var(--mfd-shadow-panel)',
        ...style,
      }}
    >
      <table
        data-mfd-table-mode={responsive === 'cards' ? 'cards' : undefined}
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontFamily: 'var(--mfd-font-mono)',
          fontSize: densityFontSize[density],
          lineHeight: 1.45,
        }}
      >
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
                    onClick={sortHandler}
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
                      fontFamily: 'var(--mfd-font-pixel)',
                      fontWeight: 400,
                      fontSize: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: 0,
                      color: sortDirection
                        ? 'var(--mfd-gold)'
                        : accent === 'default'
                          ? 'var(--mfd-text-faint)'
                          : accentBorder[accent],
                      background: sortDirection
                        ? 'linear-gradient(180deg, rgba(255, 215, 0, 0.12), rgba(0, 0, 0, 0.34))'
                        : 'rgba(0, 0, 0, 0.34)',
                      borderBottom: `1px solid ${sortDirection ? 'var(--mfd-gold)' : accentBorder[accent]}`,
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
                        : renderHeaderLabel(header.column.columnDef.header, header.getContext())}
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
                  padding: '20px',
                  textAlign: 'center',
                  color: 'var(--mfd-text-dim)',
                  fontFamily: 'var(--mfd-font-pixel)',
                  fontSize: '8px',
                }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => {
              const rowBackground = row.index % 2 === 0 ? 'rgba(255,255,255,0.018)' : 'rgba(0,0,0,0.08)';

              return (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row.original)}
                  onKeyDown={(e) => handleKeyDown(e, row.original)}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.background = onRowClick
                      ? 'linear-gradient(90deg, rgba(0, 229, 255, 0.09), rgba(255, 255, 255, 0.02))'
                      : 'rgba(255,255,255,0.035)';
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.background = rowBackground;
                  }}
                  onFocus={(event) => {
                    event.currentTarget.style.background = 'rgba(255, 215, 0, 0.08)';
                    event.currentTarget.style.boxShadow = 'var(--mfd-focus-ring)';
                  }}
                  onBlur={(event) => {
                    event.currentTarget.style.background = rowBackground;
                    event.currentTarget.style.boxShadow = 'none';
                  }}
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? 'button' : undefined}
                  data-mfd-focusable={onRowClick ? 'pixel-row' : undefined}
                  data-mfd-table-row="true"
                  data-mfd-row-clickable={onRowClick ? 'true' : 'false'}
                  style={{
                    cursor: onRowClick ? 'pointer' : 'default',
                    borderBottom: '1px solid rgba(174, 184, 195, 0.13)',
                    background: rowBackground,
                    outline: 'none',
                    transition: 'background var(--mfd-motion-fast), box-shadow var(--mfd-motion-fast)',
                  }}
                >
                {row.getVisibleCells().map((cell) => {
                  const headerDef = cell.column.columnDef.header;
                  const label = typeof headerDef === 'string' ? headerDef.toUpperCase() : cell.column.id.toUpperCase();
                  return (
                    <td
                      key={cell.id}
                      data-mfd-table-label={responsive === 'cards' ? label : undefined}
                      data-mfd-table-cell-id={cell.column.id}
                      style={{
                        padding: densityPadding[density],
                        color: 'var(--mfd-text)',
                        verticalAlign: 'middle',
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function renderHeaderLabel<T>(
  header: ColumnDef<T, unknown>['header'],
  context: HeaderContext<T, unknown>,
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
