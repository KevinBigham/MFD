import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import StatCentral from './StatCentral';

const mockState = {
  game: {
    year: 2032,
    phase: 'regular_season',
    players: {
      p1: { id: 'p1', name: 'Ace Cannon', ovr: 94 },
      p2: { id: 'p2', name: 'Jet Vale', ovr: 89 },
    },
    playerSeasonHistory: {
      p1: [{ season: 2030 }],
      p2: [{ season: 2031 }],
    },
  },
  teams: {
    user: { id: 'user', city: 'Chicago', name: 'Blaze', abbr: 'CHI' },
    opp: { id: 'opp', city: 'Boston', name: 'Pilots', abbr: 'BOS' },
  },
  userTeamId: 'user',
  leagueLeaders: [
    { rank: 1, playerId: 'p1', playerName: 'Ace Cannon', teamId: 'user', teamAbbr: 'CHI', pos: 'QB', value: 4211, gamesPlayed: 12, perGame: 350.9 },
    { rank: 2, playerId: 'p2', playerName: 'Jet Vale', teamId: 'opp', teamAbbr: 'BOS', pos: 'WR', value: 1688, gamesPlayed: 12, perGame: 140.7 },
  ],
  careerLeaders: [
    { rank: 1, playerId: 'p1', playerName: 'Ace Cannon', pos: 'QB', value: 42000, years: 11, isActive: true },
  ],
  leagueAverages: [
    { year: 2029, average: 240.1, median: 232.4, top10Avg: 311.9 },
    { year: 2030, average: 248.6, median: 239.5, top10Avg: 320.8 },
    { year: 2031, average: 251.4, median: 244.2, top10Avg: 328.5 },
  ],
  positionRankings: [
    { rank: 1, playerId: 'p1', playerName: 'Ace Cannon', teamId: 'user', ovr: 94, keyStats: { passYds: 4211 }, contractValue: 22, surplus: 9.1 },
  ],
  playerComparison: {
    players: [],
    statColumns: [],
    peakComparison: {},
  },
  teamHistory: [
    {
      year: 2031,
      wins: 11,
      losses: 6,
      ties: 0,
      playoffResult: 'division_round',
      mvpName: 'Ace Cannon',
      keyStats: { totalYards: 6440, pointsFor: 458, pointsAgainst: 331 },
      era: 'Air Raid',
    },
  ],
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectTeams: (state: typeof mockState) => state.teams,
  selectUserTeamId: (state: typeof mockState) => state.userTeamId,
  selectLeagueLeaders: () => (state: typeof mockState) => state.leagueLeaders,
  selectCareerStatLeaders: () => (state: typeof mockState) => state.careerLeaders,
  selectLeagueAverages: () => (state: typeof mockState) => state.leagueAverages,
  selectPositionRankings: () => (state: typeof mockState) => state.positionRankings,
  selectPlayerCareerComparison: () => (state: typeof mockState) => state.playerComparison,
  selectTeamSeasonHistory: () => (state: typeof mockState) => state.teamHistory,
}));

describe('StatCentral', () => {
  beforeEach(() => {
    mockState.leagueLeaders = [
      { rank: 1, playerId: 'p1', playerName: 'Ace Cannon', teamId: 'user', teamAbbr: 'CHI', pos: 'QB', value: 4211, gamesPlayed: 12, perGame: 350.9 },
      { rank: 2, playerId: 'p2', playerName: 'Jet Vale', teamId: 'opp', teamAbbr: 'BOS', pos: 'WR', value: 1688, gamesPlayed: 12, perGame: 140.7 },
    ];
    mockState.leagueAverages = [
      { year: 2029, average: 240.1, median: 232.4, top10Avg: 311.9 },
      { year: 2030, average: 248.6, median: 239.5, top10Avg: 320.8 },
      { year: 2031, average: 251.4, median: 244.2, top10Avg: 328.5 },
    ];
  });

  it('renders the stat central header and tab controls', () => {
    const markup = renderToStaticMarkup(<StatCentral />);

    expect(markup).toContain('STAT CENTRAL');
    expect(markup).toContain('League Leaders');
    expect(markup).toContain('Career Leaders');
    expect(markup).toContain('Player Compare');
    expect(markup).toContain('Team History');
  });

  it('labels stat read model sources without implying render-time writes', () => {
    const markup = renderToStaticMarkup(<StatCentral />);

    expect(markup).toContain('STAT SOURCES');
    expect(markup).toContain('Current season source');
    expect(markup).toContain('game.players');
    expect(markup).toContain('Historical source');
    expect(markup).toContain('playerSeasonHistory');
    expect(markup).toContain('Archive fallback');
    expect(markup).toContain('playerArchive');
    expect(markup).toContain('Local controls');
    expect(markup).toContain('route state');
    expect(markup).toContain('Just viewing');
    expect(markup).toContain('display only');
    expect(markup).toContain('Opening Stat Central does not write stats, records, news, social posts, history rows, or player-archive entries.');
  });

  it('renders the default league leaders table', () => {
    const markup = renderToStaticMarkup(<StatCentral />);

    expect(markup).toContain('Ace Cannon');
    expect(markup).toContain('Jet Vale');
    expect(markup).toContain('4211');
    expect(markup).toContain('350.9');
  });

  it('renders era comparison values for the selected stat', () => {
    const markup = renderToStaticMarkup(<StatCentral />);

    expect(markup).toContain('ERA COMPARISON');
    expect(markup).toContain('2029');
    expect(markup).toContain('Avg 240.1');
    expect(markup).toContain('Top10 328.5');
  });

  it('shows the empty leader message when no leaderboard rows exist', () => {
    mockState.leagueLeaders = [];

    const markup = renderToStaticMarkup(<StatCentral />);

    expect(markup).toContain('No league leaders found for that filter.');
  });
});
