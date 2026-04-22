import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const { exportRecapAsPngMock } = vi.hoisted(() => ({
  exportRecapAsPngMock: vi.fn(async () => 'data:image/png;base64,dynasty-chronicle'),
}));

const {
  createExportFrameMock,
  exportCleanupMock,
  framedNode,
} = vi.hoisted(() => ({
  createExportFrameMock: vi.fn(),
  exportCleanupMock: vi.fn(),
  framedNode: {} as HTMLElement,
}));

vi.mock('../season/recap-share', () => ({
  exportRecapAsPng: exportRecapAsPngMock,
}));

vi.mock('../season/export-frame', () => ({
  createExportFrame: createExportFrameMock,
}));

import { DynastyChronicle, exportDynastyChronicleAsPng } from './DynastyChronicle';

let chronicleEvents = [
  { id: 'champ-2032', type: 'championship_win', year: 2032, teamAbbr: 'CHI', record: '13-4' },
  { id: 'hof-2032', type: 'hof_induction', year: 2032, playerName: 'Cole Stone', position: 'QB' },
  { id: 'season-2031', type: 'season_end', year: 2031, teamAbbr: 'CHI', record: '11-6', playoffFinish: 'conference' },
  { id: 'coach-2031', type: 'coach_hire', year: 2031, coachName: 'Terry Vale' },
];

const baseState = () => ({
  game: { seed: 'seed-1', year: 2033 },
  team: { id: 'team-1', city: 'Chicago', name: 'Blaze', abbr: 'CHI' },
});

type MockState = Omit<ReturnType<typeof baseState>, 'team'> & {
  team: ReturnType<typeof baseState>['team'] | null;
};

let mockState: MockState = baseState();

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectUserTeam: (state: typeof mockState) => state.team,
}));

vi.mock('../../lib/career-meta', () => ({
  deriveDynastyId: () => 'seed-1:team-1:2030',
}));

vi.mock('../../lib/dynasty-chronicle', () => ({
  computeDynastyChronicle: () => chronicleEvents,
}));

describe('DynastyChronicle', () => {
  beforeEach(() => {
    mockState = baseState();
    chronicleEvents = [
      { id: 'champ-2032', type: 'championship_win', year: 2032, teamAbbr: 'CHI', record: '13-4' },
      { id: 'hof-2032', type: 'hof_induction', year: 2032, playerName: 'Cole Stone', position: 'QB' },
      { id: 'season-2031', type: 'season_end', year: 2031, teamAbbr: 'CHI', record: '11-6', playoffFinish: 'conference' },
      { id: 'coach-2031', type: 'coach_hire', year: 2031, coachName: 'Terry Vale' },
    ];
    createExportFrameMock.mockReset();
    exportCleanupMock.mockReset();
    exportRecapAsPngMock.mockClear();
    createExportFrameMock.mockReturnValue({
      frame: framedNode,
      cleanup: exportCleanupMock,
    });
  });

  it('renders the chronicle screen header', () => {
    const markup = renderToStaticMarkup(<DynastyChronicle />);

    expect(markup).toContain('DYNASTY CHRONICLE');
    expect(markup).toContain('Chicago Blaze // one scroll across every archive');
  });

  it('renders the empty state when there are no chronicle events', () => {
    chronicleEvents = [];

    const markup = renderToStaticMarkup(<DynastyChronicle />);

    expect(markup).toContain('No chronicle events recorded for this dynasty yet. Complete seasons to build the timeline.');
  });

  it('renders year boundaries for populated timelines', () => {
    const markup = renderToStaticMarkup(<DynastyChronicle />);

    expect(markup.match(/data-testid="chronicle-year-boundary"/g)).toHaveLength(2);
    expect(markup).toContain('2032');
    expect(markup).toContain('2031');
  });

  it('renders chronicle events for each event type', () => {
    const markup = renderToStaticMarkup(<DynastyChronicle />);

    expect(markup.match(/data-testid="chronicle-event"/g)).toHaveLength(4);
    expect(markup).toContain('CHI finished 13-4 and closed the year with a title.');
    expect(markup).toContain('Cole Stone entered the Hall of Fame as a QB.');
    expect(markup).toContain('CHI wrapped the season at 11-6 with a Conference finish.');
    expect(markup).toContain('Terry Vale took over the sideline.');
  });

  it('exposes accent metadata by event kind', () => {
    const markup = renderToStaticMarkup(<DynastyChronicle />);

    expect(markup).toContain('data-chronicle-kind="championship_win"');
    expect(markup).toContain('data-chronicle-accent="gold"');
    expect(markup).toContain('data-chronicle-kind="coach_hire"');
    expect(markup).toContain('data-chronicle-accent="green"');
  });

  it('renders the no-dynasty fallback when no team is loaded', () => {
    mockState = {
      ...baseState(),
      team: null,
    };

    const markup = renderToStaticMarkup(<DynastyChronicle />);

    expect(markup).toContain('No dynasty is loaded.');
  });

  it('renders the filter chip row when the chronicle has events', () => {
    const markup = renderToStaticMarkup(<DynastyChronicle />);

    expect(markup).toMatch(/data-testid="chronicle-filters"/);
    expect(markup.match(/data-testid="chronicle-filter-chip"/g)).toHaveLength(8);
  });

  it('does not render the filter chip row when the chronicle is empty', () => {
    chronicleEvents = [];

    const markup = renderToStaticMarkup(<DynastyChronicle />);

    expect(markup).not.toMatch(/data-testid="chronicle-filters"/);
  });

  it('surfaces per-type counts on the chips based on the live chronicle', () => {
    const markup = renderToStaticMarkup(<DynastyChronicle />);

    expect(markup).toMatch(/data-filter-type="championship_win"[^>]*data-filter-count="1"/);
    expect(markup).toMatch(/data-filter-type="hof_induction"[^>]*data-filter-count="1"/);
    expect(markup).toMatch(/data-filter-type="season_end"[^>]*data-filter-count="1"/);
    expect(markup).toMatch(/data-filter-type="coach_hire"[^>]*data-filter-count="1"/);
    expect(markup).toMatch(/data-filter-type="playoff_round"[^>]*data-filter-count="0"/);
  });

  it('renders the export button with a visible event-count note', () => {
    const markup = renderToStaticMarkup(<DynastyChronicle />);

    expect(markup).toContain('Export Chronicle');
    expect(markup).toContain('Exports 4 event(s) from the filtered timeline.');
  });

  it('disables the export button when the chronicle has no events', () => {
    chronicleEvents = [];

    const markup = renderToStaticMarkup(<DynastyChronicle />);

    expect(markup).toMatch(/<button[^>]*disabled[^>]*>Export Chronicle/);
    expect(markup).toContain('Exports 0 event(s) from the filtered timeline.');
  });

  it('exports the chronicle with the team abbr and date stamp in the filename', async () => {
    const target = {} as HTMLElement;

    const result = await exportDynastyChronicleAsPng(target, {
      teamAbbr: 'CHI',
      teamCity: 'Chicago',
      teamName: 'Blaze',
      teamId: 'team-1',
      year: 2033,
      eventCount: 4,
      exportedAt: new Date('2026-04-22T12:00:00.000Z'),
    });

    expect(createExportFrameMock).toHaveBeenCalledTimes(1);
    expect(exportRecapAsPngMock).toHaveBeenCalledWith(framedNode);
    expect(exportCleanupMock).toHaveBeenCalledTimes(1);
    expect(result.fileName).toBe('dynasty-chronicle-chi-20260422.png');
  });

  it('renders each chronicle event as an accessible open-detail button', () => {
    const markup = renderToStaticMarkup(<DynastyChronicle />);

    expect(markup).toContain('aria-label="Open Championship Won detail for 2032"');
    expect(markup).toContain('aria-label="Open Hall of Fame detail for 2032"');
    expect(markup).toContain('aria-label="Open Season End detail for 2031"');
    expect(markup).toContain('aria-label="Open Coach Hire detail for 2031"');
  });

  it('does not render the event detail modal on initial load', () => {
    const markup = renderToStaticMarkup(<DynastyChronicle />);

    expect(markup).not.toContain('data-testid="chronicle-event-detail"');
  });
});
