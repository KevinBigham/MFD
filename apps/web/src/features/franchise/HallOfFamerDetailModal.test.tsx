import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { HallOfFameEntry } from '@mfd/engine';

vi.mock('@mfd/design-system/components', () => ({
  PixelBadge: ({ children }: any) => <span data-mock="badge">{children}</span>,
  PixelButton: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  PixelModal: ({ open, title, children }: any) => (open ? (
    <section data-mock="modal">
      <h2>{title}</h2>
      {children}
    </section>
  ) : null),
  PixelPanel: ({ title, children }: any) => (
    <section data-mock="panel">
      <h3>{title}</h3>
      {children}
    </section>
  ),
}));

vi.mock('../shared/pixelUi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../shared/pixelUi')>();
  return {
    ...actual,
    PixelMetricCard: ({ label, value }: any) => (
      <div data-mock="metric-card">
        <span>{label}</span>
        <span>{String(value)}</span>
      </div>
    ),
    autoGrid: () => ({}),
    display: {},
    monoSm: {},
  };
});

vi.mock('../season/recap-share', () => ({
  exportRecapAsPng: vi.fn(async () => 'data:image/png;base64,stub'),
}));

import { HallOfFamerDetailModal } from './HallOfFamerDetailModal';

function makeEntry(overrides: Partial<HallOfFameEntry> = {}): HallOfFameEntry {
  return {
    playerId: 'p-1',
    name: 'Jalen Banks',
    position: 'QB',
    inductionYear: 2042,
    peakOvr: 96,
    careerYears: 14,
    score: 128.4,
    awards: { mvps: 2, allPros: 4, proBowls: 8, championships: 2 },
    highlights: ['Won the conference twice', 'Closed a title run with 4 TDs'],
    teams: ['ABC', 'DEF'],
    ...overrides,
  };
}

const teams = {
  ABC: { abbr: 'ABC' },
  DEF: { abbr: 'DEF' },
};

describe('HallOfFamerDetailModal', () => {
  it('renders nothing when open is false', () => {
    const markup = renderToStaticMarkup(
      <HallOfFamerDetailModal
        entry={makeEntry()}
        open={false}
        onClose={() => undefined}
        teams={teams}
      />,
    );

    expect(markup).toBe('');
  });

  it('renders the entry name and induction year when open is true', () => {
    const markup = renderToStaticMarkup(
      <HallOfFamerDetailModal
        entry={makeEntry()}
        open
        onClose={() => undefined}
        teams={teams}
      />,
    );

    expect(markup).toContain('JALEN BANKS');
    expect(markup).toContain('2042');
  });

  it('renders the HOMEGROWN badge when the first team matches the dynasty team id', () => {
    const markup = renderToStaticMarkup(
      <HallOfFamerDetailModal
        entry={makeEntry({ teams: ['ABC', 'DEF'] })}
        open
        onClose={() => undefined}
        teams={teams}
        dynastyTeamId="ABC"
      />,
    );

    expect(markup).toContain('HOMEGROWN');
  });

  it('omits the HOMEGROWN badge when the first team does not match the dynasty team id', () => {
    const markup = renderToStaticMarkup(
      <HallOfFamerDetailModal
        entry={makeEntry({ teams: ['DEF', 'ABC'] })}
        open
        onClose={() => undefined}
        teams={teams}
        dynastyTeamId="ABC"
      />,
    );

    expect(markup).not.toContain('HOMEGROWN');
  });

  it('renders the stats grid labels for peak ovr, career score, and championships', () => {
    const markup = renderToStaticMarkup(
      <HallOfFamerDetailModal
        entry={makeEntry()}
        open
        onClose={() => undefined}
        teams={teams}
      />,
    );

    expect(markup).toContain('Peak OVR');
    expect(markup).toContain('Career Score');
    expect(markup).toContain('Championships');
  });

  it('renders numbered team chronology badges', () => {
    const markup = renderToStaticMarkup(
      <HallOfFamerDetailModal
        entry={makeEntry({ teams: ['ABC', 'DEF'] })}
        open
        onClose={() => undefined}
        teams={teams}
      />,
    );

    expect(markup).toContain('1. ABC');
    expect(markup).toContain('2. DEF');
  });

  it('renders the highlights panel when highlights exist', () => {
    const markup = renderToStaticMarkup(
      <HallOfFamerDetailModal
        entry={makeEntry({ highlights: ['Won an MVP', 'Anchored a dynasty'] })}
        open
        onClose={() => undefined}
        teams={teams}
      />,
    );

    expect(markup).toContain('Highlights');
    expect(markup).toContain('Won an MVP');
    expect(markup).toContain('Anchored a dynasty');
  });

  it('omits the highlights panel when highlights are empty', () => {
    const markup = renderToStaticMarkup(
      <HallOfFamerDetailModal
        entry={makeEntry({ highlights: [] })}
        open
        onClose={() => undefined}
        teams={teams}
      />,
    );

    expect(markup).not.toContain('Highlights');
  });
});
