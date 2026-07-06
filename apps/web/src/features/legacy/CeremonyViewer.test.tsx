import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { Ceremony } from '@mfd/engine';
import {
  CeremonyViewer,
  buildCeremonySourceRows,
} from './CeremonyViewer';

function makeCeremony(overrides: Partial<Ceremony> = {}): Ceremony {
  return {
    id: 'ceremony-2031-title',
    type: 'championship',
    year: 2031,
    headline: 'Chicago Blaze championship ceremony',
    description: 'The confetti fell after a complete title run.',
    highlights: [
      { label: 'Season Record', value: '13-4', playerIds: [] },
      { label: 'Super Bowl MVP', value: 'Jay Stone', playerIds: ['qb-1'] },
    ],
    mvp: 'qb-1',
    ...overrides,
  };
}

describe('CeremonyViewer', () => {
  it('builds source rows from the saved ceremony payload', () => {
    expect(buildCeremonySourceRows(makeCeremony())).toEqual([
      expect.objectContaining({
        id: 'saved-ceremony',
        status: 'Year 2031',
        detail: expect.stringContaining('game.ceremonies'),
      }),
      expect.objectContaining({
        id: 'writer-path',
        status: 'recordCeremony',
        detail: expect.stringContaining('Engine generators'),
      }),
      expect.objectContaining({
        id: 'saved-highlights',
        status: '2 highlights',
        detail: expect.stringContaining('saved ceremony payload'),
      }),
      expect.objectContaining({
        id: 'modal-state',
        status: 'route-local',
        detail: expect.stringContaining('does not write ceremonies'),
      }),
    ]);
  });

  it('renders ceremony source ownership inside the modal', () => {
    const markup = renderToStaticMarkup(
      <CeremonyViewer ceremony={makeCeremony()} open onOpenChange={vi.fn()} />,
    );

    expect(markup).toContain('CEREMONY SOURCES');
    expect(markup).toContain('Saved ceremony');
    expect(markup).toContain('Writer path');
    expect(markup).toContain('Saved highlights');
    expect(markup).toContain('Modal state');
    expect(markup).toContain('game.ceremonies');
    expect(markup).toContain('selectCeremonies');
    expect(markup).toContain('recordCeremony');
    expect(markup).toContain('saved ceremony payload');
    expect(markup).toContain('does not write ceremonies');
    expect(markup).toContain('MVP SPOTLIGHT');
  });
});
