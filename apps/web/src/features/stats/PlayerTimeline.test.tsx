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
    away: { id: 'away', city: 'Detroit', name: 'Motors' },
  },
  transactionLog: [
    { type: 'TRADE', year: 2028, week: 8, playerId: 'p-1', fromTeamId: 'away', toTeamId: 'user', notes: 'Deadline splash' },
    { type: 'CUT', year: 2027, week: 3, playerId: 'other', fromTeamId: 'user', notes: 'Released to waivers' },
  ],
  draftRecaps: [{
    year: 2027,
    teamId: 'user',
    classGrade: 'A-',
    picks: [{
      playerId: 'p-1',
      teamId: 'user',
      playerName: 'Ace Cannon',
      position: 'QB',
      ovr: 84,
      round: 2,
      pick: 45,
      projectedPick: 30,
      valueDelta: -15,
      verdict: 'reach',
    }],
    bestValue: {
      playerId: 'p-1',
      teamId: 'user',
      playerName: 'Ace Cannon',
      position: 'QB',
      ovr: 84,
      round: 2,
      pick: 45,
      projectedPick: 30,
      valueDelta: -15,
      verdict: 'reach',
    },
    biggestReach: {
      playerId: 'p-1',
      teamId: 'user',
      playerName: 'Ace Cannon',
      position: 'QB',
      ovr: 84,
      round: 2,
      pick: 45,
      projectedPick: 30,
      valueDelta: -15,
      verdict: 'reach',
    },
    steals: [],
    leagueHighlights: [],
  }],
  livingPlayerStory: {
    playerId: 'p-1',
    playerName: 'Ace Cannon',
    teamId: 'user',
    stage: 'legacy',
    status: 'archived',
    headline: 'Ace Cannon completed the climb',
    summary: 'A breakout season became league history.',
    heat: 90,
    mentor: { playerId: 'mentor-1', name: 'Coach Cannon', positionGroup: 'QB', year: 2027, bonus: 2 },
    activeThreadId: null,
    nextBeatHint: null,
    chapters: [{
      id: 'award-1',
      source: 'award',
      year: 2030,
      week: null,
      label: 'League MVP',
      summary: 'Ace Cannon won League MVP.',
      sourceRef: 'awardsHistory:2030:mvp:p-1',
    }],
    sourceRefs: ['awardsHistory:2030:mvp:p-1'],
  },
};

vi.mock('@tanstack/react-router', () => ({
  useParams: () => ({ playerId: 'p-1' }),
  useNavigate: () => () => Promise.resolve(),
}));

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectDraftRecaps: (state: typeof mockState) => state.draftRecaps,
  selectTeams: (state: typeof mockState) => state.teams,
  selectTransactionLog: (state: typeof mockState) => state.transactionLog,
  selectLivingPlayerStory: () => (state: typeof mockState) => state.livingPlayerStory,
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
    expect(markup).toContain('LIVING PLAYER STORY');
    expect(markup).toContain('Ace Cannon completed the climb');
    expect(markup).toContain('Open Profile');
  });

  it('labels timeline sources without implying render-time writes', () => {
    const markup = renderToStaticMarkup(<PlayerTimeline />);

    expect(markup).toContain('TIMELINE SOURCES');
    expect(markup).toContain('Timeline read model');
    expect(markup).toContain('getPlayerCareerTimeline');
    expect(markup).toContain('Archived seasons');
    expect(markup).toContain('playerSeasonHistory');
    expect(markup).toContain('Current-season row');
    expect(markup).toContain('game.players');
    expect(markup).toContain('Archive fallback');
    expect(markup).toContain('playerArchive');
    expect(markup).toContain('Awards and highlights');
    expect(markup).toContain('awards/records');
    expect(markup).toContain('Transaction memory');
    expect(markup).toContain('transactionLog');
    expect(markup).toContain('the timeline does not create or repair transactions');
    expect(markup).toContain('Draft recap memory');
    expect(markup).toContain('draftRecaps');
    expect(markup).toContain('the timeline does not generate or repair recaps');
    expect(markup).toContain('Just viewing');
    expect(markup).toContain('display only');
    expect(markup).toContain('Opening Player Timeline does not write seasons, awards, records, milestones, draft recaps, player archives, or profile history.');
  });

  it('renders the career totals summary', () => {
    const markup = renderToStaticMarkup(<PlayerTimeline />);

    expect(markup).toContain('Career Games');
    expect(markup).toContain('Pass Yards');
    expect(markup).toContain('Awards');
    expect(markup).toContain('8830');
  });

  it('renders awards and highlights for each season card', () => {
    const markup = renderToStaticMarkup(<PlayerTimeline />);

    expect(markup).toContain('SEASON 2029');
    expect(markup).toContain('SEASON 2030');
    expect(markup).toContain('League MVP');
    expect(markup).toContain('Broke the single-season passing yards record.');
  });

  it('renders saved transaction memory for the timeline player', () => {
    const markup = renderToStaticMarkup(<PlayerTimeline />);

    expect(markup).toContain('TRANSACTION MEMORY');
    expect(markup).toContain('Trade');
    expect(markup).toContain('2028 W8');
    expect(markup).toContain('Detroit Motors -&gt; Chicago Blaze // Deadline splash');
    expect(markup).not.toContain('Released to waivers');
  });

  it('renders saved draft recap memory for the timeline player', () => {
    const markup = renderToStaticMarkup(<PlayerTimeline />);

    expect(markup).toContain('DRAFT CLASS MEMORY');
    expect(markup).toContain('REACH // Class A-');
    expect(markup).toContain('2027 draft');
    expect(markup).toContain('Round 2, pick 45');
    expect(markup).toContain('Saved draft recap: Projected #30, selected #45, -15 value.');
  });

  it('shows the empty highlight fallback when a season has no major notes', () => {
    mockTimeline.seasons[1]!.awards = [];
    mockTimeline.seasons[1]!.highlights = [];

    const markup = renderToStaticMarkup(<PlayerTimeline />);

    expect(markup).toContain('No major records or milestone highlights logged for this season.');
  });
});
