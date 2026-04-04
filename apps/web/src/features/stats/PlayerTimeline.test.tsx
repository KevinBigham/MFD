import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import PlayerTimeline from './PlayerTimeline';

const mockTimeline = {
  playerId: 'p-1',
  playerName: 'Ace Cannon',
  pos: 'QB',
  seasons: [
    {
      year: 2029,
      teamId: 'user',
      teamAbbr: 'CHI',
      age: 23,
      ovr: 84,
      stats: { gamesPlayed: 17, passYds: 4022, rushYds: 211, recYds: 0, sacks: 0, defINT: 0 },
      awards: [],
      highlights: ['Won the starting job in camp.'],
    },
    {
      year: 2030,
      teamId: 'user',
      teamAbbr: 'CHI',
      age: 24,
      ovr: 90,
      stats: { gamesPlayed: 17, passYds: 4808, rushYds: 288, recYds: 0, sacks: 0, defINT: 0 },
      awards: ['League MVP'],
      highlights: ['Broke the single-season passing yards record.'],
    },
  ],
};

const mockState = {
  game: {
    players: {
      'p-1': { id: 'p-1', ovr: 93 },
    },
  },
  teams: {
    user: { id: 'user', city: 'Chicago', name: 'Blaze' },
  },
};

vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ playerId: 'p-1' }),
  useNavigate: () => () => Promise.resolve(),
}));

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectTeams: (state: typeof mockState) => state.teams,
  usePlayerTimeline: () => () => mockTimeline,
}));

describe('PlayerTimeline', () => {
  beforeEach(() => {
    mockTimeline.seasons[1]!.awards = ['League MVP'];
    mockTimeline.seasons[1]!.highlights = ['Broke the single-season passing yards record.'];
  });

  it('renders the player header and OVR arc section', () => {
    const markup = renderToStaticMarkup(<PlayerTimeline />);

    expect(markup).toContain('ACE CANNON');
    expect(markup).toContain('OVR ARC');
    expect(markup).toContain('Career OVR progression');
  });

  it('renders the career totals summary', () => {
    const markup = renderToStaticMarkup(<PlayerTimeline />);

    expect(markup).toContain('CAREER GAMES');
    expect(markup).toContain('PASS YARDS');
    expect(markup).toContain('AWARDS');
    expect(markup).toContain('8830');
  });

  it('renders awards and highlights for each season card', () => {
    const markup = renderToStaticMarkup(<PlayerTimeline />);

    expect(markup).toContain('SEASON 2029');
    expect(markup).toContain('SEASON 2030');
    expect(markup).toContain('League MVP');
    expect(markup).toContain('Broke the single-season passing yards record.');
  });

  it('shows the empty highlight fallback when a season has no major notes', () => {
    mockTimeline.seasons[1]!.awards = [];
    mockTimeline.seasons[1]!.highlights = [];

    const markup = renderToStaticMarkup(<PlayerTimeline />);

    expect(markup).toContain('No major records or milestone highlights logged for this season.');
  });
});
