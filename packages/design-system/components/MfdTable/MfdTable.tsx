import { type CSSProperties } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { PixelTable } from '../PixelTable';

type Density = 'compact' | 'comfortable';

export interface MfdTableProps<T> {
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
  return (
    <PixelTable
      data={data}
      columns={columns}
      density={density}
      stickyHeader={stickyHeader}
      globalFilter={externalFilter}
      onRowClick={onRowClick}
      emptyMessage={emptyMessage}
      maxHeight={maxHeight}
      className={className}
      style={style}
    />
  );
}
