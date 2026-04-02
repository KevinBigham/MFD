import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ColumnDef } from '@tanstack/react-table';
import { PixelNav, PixelTable, PixelModal } from './index';

interface TestRow {
  name: string;
  pos: string;
}

const rows: TestRow[] = [
  { name: 'J. Carter', pos: 'QB' },
  { name: 'R. Moss', pos: 'WR' },
];

const columns: ColumnDef<TestRow, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'pos',
    header: 'Pos',
  },
];

describe('8-Bit ESPN primitives', () => {
  it('renders active PixelNav items with a visible active marker', () => {
    const markup = renderToStaticMarkup(
      <PixelNav
        activeKey="roster"
        items={[
          { key: 'briefing', label: 'Briefing' },
          { key: 'roster', label: 'Roster' },
          { key: 'cap', label: 'Cap' },
        ]}
      />,
    );

    expect(markup).toContain('data-active="true"');
    expect(markup).toContain('ROSTER');
  });

  it('renders PixelTable headers and body rows', () => {
    const markup = renderToStaticMarkup(
      <PixelTable
        data={rows}
        columns={columns}
        emptyMessage="No players"
      />,
    );

    expect(markup).toContain('NAME');
    expect(markup).toContain('POS');
    expect(markup).toContain('J. Carter');
    expect(markup).toContain('R. Moss');
  });

  it('renders PixelModal title and content when open', () => {
    const markup = renderToStaticMarkup(
      <PixelModal
        open
        onOpenChange={() => {}}
        title="Roster Move"
        description="Broadcast-ready dialog"
      >
        Cut candidate details.
      </PixelModal>,
    );

    expect(markup).toContain('ROSTER MOVE');
    expect(markup).toContain('Broadcast-ready dialog');
    expect(markup).toContain('Cut candidate details.');
  });
});
