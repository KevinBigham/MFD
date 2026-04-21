import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DynastyChronicle } from './DynastyChronicle';

let chronicleEvents = [
  { id: 'champ-2032', type: 'championship_win', year: 2032, teamAbbr: 'CHI', record: '13-4' },
  { id: 'hof-2032', type: 'hof_induction', year: 2032, playerName: 'Cole Stone', position: 'QB' },
  { id: 'season-2031', type: 'season_end', year: 2031, teamAbbr: 'CHI', record: '11-6', playoffFinish: 'conference' },
  { id: 'coach-2031', type: 'coach_hire', year: 2031, coachName: 'Terry Vale' },
];

const baseState = () => ({
  game: { seed: 'seed-1', year: 2033 },
  team: { id: 'team-1', city: 'Chicago', name: 'Blaze' },
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
});
