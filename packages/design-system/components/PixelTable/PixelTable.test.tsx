import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ColumnDef } from '@tanstack/react-table';
import { PixelTable } from './PixelTable';

interface Row {
  name: string;
  ovr: number;
}

const rows: Row[] = [
  { name: 'Jay Stone', ovr: 88 },
  { name: 'Cole Hart', ovr: 82 },
];

const columns: ColumnDef<Row, unknown>[] = [
  { accessorKey: 'name', header: 'Name', cell: ({ getValue }) => getValue() as string },
  { accessorKey: 'ovr', header: 'OVR', cell: ({ getValue }) => getValue() as number },
];

describe('PixelTable', () => {
  it('exposes sortable header state and card-mode labels for responsive layouts', () => {
    const markup = renderToStaticMarkup(
      <PixelTable data={rows} columns={columns} responsive="cards" />,
    );

    expect(markup).toContain('data-mfd-table-responsive="cards"');
    expect(markup).toContain('aria-sort="none"');
    expect(markup).toContain('data-mfd-table-sortable="true"');
    expect(markup).toContain('data-mfd-table-label="NAME"');
    expect(markup).toContain('data-mfd-table-cell-id="name"');
  });

  it('keeps clickable rows keyboard focusable', () => {
    const markup = renderToStaticMarkup(
      <PixelTable data={rows} columns={columns} onRowClick={() => undefined} />,
    );

    expect(markup).toContain('data-mfd-focusable="pixel-row"');
    expect(markup).toContain('role="button"');
    expect(markup).toContain('tabindex="0"');
  });
});
