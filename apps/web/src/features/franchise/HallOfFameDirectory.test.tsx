import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { HallOfFameEntry } from '@mfd/engine';

class MemoryStorage implements Storage {
  private readonly backing = new Map<string, string>();
  get length() { return this.backing.size; }
  clear(): void { this.backing.clear(); }
  getItem(key: string): string | null { return this.backing.get(key) ?? null; }
  key(index: number): string | null { return [...this.backing.keys()][index] ?? null; }
  removeItem(key: string): void { this.backing.delete(key); }
  setItem(key: string, value: string): void { this.backing.set(key, value); }
}

vi.mock('@mfd/engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@mfd/engine')>();
  return {
    ...actual,
    getTeamContent: () => ({
      primaryColor: '#ff0000',
      secondaryColor: '#00ff00',
      tertiaryColor: '#0000ff',
    }),
  };
});

const gameState = {
  game: {
    seed: 123,
    year: 2045,
    teams: { 'team-1': { id: 'team-1', isUser: true, city: 'Chicago', name: 'Blaze', abbr: 'CHI' } },
    franchiseHistory: [{ teamId: 'team-1', year: 2030 }],
  },
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof gameState) => unknown) => selector(gameState),
}));

vi.mock('@mfd/design-system/components', () => ({
  PixelBadge: ({ children }: any) => <span data-mock="badge">{children}</span>,
  PixelPanel: ({ title, children }: any) => (
    <section data-mock="panel">
      <h2>{title}</h2>
      {children}
    </section>
  ),
  PixelButton: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('../shared/pixelUi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../shared/pixelUi')>();
  return {
    ...actual,
    PixelScreenHeader: ({ title, subtitle, badges }: any) => (
      <div data-mock="screen-header">
        {title}
        {subtitle}
        {badges}
      </div>
    ),
    PixelMetricCard: ({ label, value, detail }: any) => (
      <div data-mock="metric-card">
        <span>{label}</span>
        <span>{String(value)}</span>
        {detail}
      </div>
    ),
    autoGrid: () => ({}),
  };
});

import { HallOfFameDirectory } from './HallOfFameDirectory';
import { upsertHallOfFameDynasty, type HallOfFameArchiveDynasty } from '../../lib/hall-of-fame-archive';

function makeEntry(overrides: Partial<HallOfFameEntry> = {}): HallOfFameEntry {
  return {
    playerId: 'p-1',
    name: 'Jalen Banks',
    position: 'QB',
    inductionYear: 2042,
    peakOvr: 96,
    careerYears: 14,
    score: 128,
    awards: { mvps: 2, allPros: 4, proBowls: 8, championships: 2 },
    highlights: [],
    teams: ['team-1'],
    ...overrides,
  };
}

function makeDynasty(overrides: Partial<HallOfFameArchiveDynasty> = {}): HallOfFameArchiveDynasty {
  return {
    dynastyId: 'dynasty-a',
    teamId: 'team-1',
    teamCity: 'Chicago',
    teamName: 'Blaze',
    teamAbbr: 'CHI',
    startYear: 2030,
    lastSyncedYear: 2045,
    entries: [],
    ...overrides,
  };
}

describe('HallOfFameDirectory', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders empty state when the archive has no entries', () => {
    const markup = renderToStaticMarkup(<HallOfFameDirectory />);
    expect(markup).toContain('No inductees have been archived yet');
    expect(markup).toContain('Hall of Fame Directory');
  });

  it('renders the totals strip and dynasty section when entries exist', () => {
    upsertHallOfFameDynasty(makeDynasty({
      entries: [
        makeEntry({ playerId: 'p-1', name: 'Alpha Carter', teams: ['team-1'] }),
        makeEntry({ playerId: 'p-2', name: 'Bravo Stone', teams: ['GB', 'team-1'] }),
      ],
    }));

    const markup = renderToStaticMarkup(<HallOfFameDirectory />);
    expect(markup).toContain('Total HOFers');
    expect(markup).toContain('Homegrown');
    expect(markup).toContain('Alpha Carter');
    expect(markup).toContain('Bravo Stone');
    expect(markup).toContain('Chicago Blaze');
  });

  it('marks homegrown inductees with the HOMEGROWN badge', () => {
    upsertHallOfFameDynasty(makeDynasty({
      entries: [
        makeEntry({ playerId: 'homegrown', name: 'Home Grown', teams: ['team-1'] }),
        makeEntry({ playerId: 'pickup', name: 'Late Pickup', teams: ['GB', 'team-1'] }),
      ],
    }));

    const markup = renderToStaticMarkup(<HallOfFameDirectory />);
    const homegrownCount = markup.match(/HOMEGROWN/g)?.length ?? 0;
    expect(homegrownCount).toBe(1);
  });

  it('labels the active dynasty when the current game matches the archive dynasty id', () => {
    // Dynasty id = `${seed}:${teamId}:${startYear}` per deriveDynastyId(game)
    upsertHallOfFameDynasty(makeDynasty({
      dynastyId: '123:team-1:2030',
      entries: [makeEntry({ teams: ['team-1'] })],
    }));

    const markup = renderToStaticMarkup(<HallOfFameDirectory />);
    expect(markup).toContain('ACTIVE');
  });

  it('renders sort and filter controls', () => {
    upsertHallOfFameDynasty(makeDynasty({
      entries: [makeEntry({ teams: ['team-1'] })],
    }));

    const markup = renderToStaticMarkup(<HallOfFameDirectory />);
    expect(markup).toContain('Induction');
    expect(markup).toContain('Peak OVR');
    expect(markup).toContain('Career Score');
    expect(markup).toContain('All Dynasties');
    expect(markup).toContain('Homegrown Only');
    expect(markup).toContain('Current Dynasty');
  });

  it('summarizes totals correctly across multiple dynasties', () => {
    upsertHallOfFameDynasty(makeDynasty({
      dynastyId: 'd1',
      teamId: 'team-1',
      entries: [
        makeEntry({ playerId: 'p1', teams: ['team-1'], awards: { mvps: 1, allPros: 2, proBowls: 4, championships: 3 } }),
        makeEntry({ playerId: 'p2', teams: ['GB'], awards: { mvps: 0, allPros: 1, proBowls: 2, championships: 1 } }),
      ],
    }));
    upsertHallOfFameDynasty(makeDynasty({
      dynastyId: 'd2',
      teamId: 'team-2',
      teamAbbr: 'HOU',
      teamCity: 'Houston',
      teamName: 'Orbit',
      entries: [
        makeEntry({ playerId: 'p3', teams: ['team-2'], awards: { mvps: 2, allPros: 3, proBowls: 6, championships: 1 } }),
      ],
    }));

    const markup = renderToStaticMarkup(<HallOfFameDirectory />);
    // total 3 inductees
    expect(markup).toMatch(/Total HOFers[\s\S]*?3/);
    // homegrown = p1 + p3 = 2
    expect(markup).toMatch(/Homegrown[\s\S]*?2/);
    // total championships = 3 + 1 + 1 = 5
    expect(markup).toMatch(/Championships[\s\S]*?5/);
    // total MVPs = 1 + 0 + 2 = 3
    expect(markup).toMatch(/MVPs[\s\S]*?3/);
    // 2 dynasties represented
    expect(markup).toMatch(/Dynasties[\s\S]*?2/);
  });

  it('renders semantic row buttons for each hall of famer entry', () => {
    upsertHallOfFameDynasty(makeDynasty({
      entries: [
        makeEntry({ playerId: 'p-1', name: 'Alpha Carter' }),
        makeEntry({ playerId: 'p-2', name: 'Bravo Stone' }),
      ],
    }));

    const markup = renderToStaticMarkup(<HallOfFameDirectory />);

    expect(markup).toContain('aria-label="View Hall of Famer Alpha Carter"');
    expect(markup).toContain('aria-label="View Hall of Famer Bravo Stone"');
  });

  it('does not render the hall of famer detail modal by default', () => {
    upsertHallOfFameDynasty(makeDynasty({
      entries: [makeEntry({ playerId: 'p-1', name: 'Alpha Carter' })],
    }));

    const markup = renderToStaticMarkup(<HallOfFameDirectory />);

    expect(markup).not.toContain('Team Chronology');
    expect(markup).not.toContain('Export PNG');
  });
});
