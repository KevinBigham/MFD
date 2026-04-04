import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import RecordBook from './RecordBook';

const mockState = {
  game: {
    year: 2032,
    teams: {
      user: { id: 'user', abbr: 'CHI', city: 'Chicago', name: 'Blaze' },
      opp: { id: 'opp', abbr: 'BOS', city: 'Boston', name: 'Pilots' },
    },
    players: {
      p1: { id: 'p1', ovr: 92, pos: 'QB' },
      p2: { id: 'p2', ovr: 88, pos: 'WR' },
      p3: { id: 'p3', ovr: 85, pos: 'QB' },
    },
  },
  records: {
    singleGame: {
      passYds: [
        { category: 'singleGame', stat: 'passYds', value: 512, teamId: 'user', teamName: 'Chicago Blaze', year: 2032, week: 4, playerId: 'p1', playerName: 'Ace Cannon' },
        { category: 'singleGame', stat: 'passYds', value: 501, teamId: 'opp', teamName: 'Boston Pilots', year: 2028, week: 9, playerId: 'p3', playerName: 'Duke Hale' },
      ],
    },
    singleSeason: {
      passYds: [
        { category: 'singleSeason', stat: 'passYds', value: 5510, teamId: 'user', teamName: 'Chicago Blaze', year: 2032, playerId: 'p1', playerName: 'Ace Cannon' },
      ],
      recYds: [
        { category: 'singleSeason', stat: 'recYds', value: 1910, teamId: 'opp', teamName: 'Boston Pilots', year: 2030, playerId: 'p2', playerName: 'Jet Vale' },
      ],
    },
    career: {},
    franchise: {},
  },
  recordChases: [
    {
      playerId: 'p1',
      playerName: 'Ace Cannon',
      teamId: 'user',
      stat: 'passYds',
      currentValue: 3210,
      recordValue: 5510,
      recordHolder: 'Ace Cannon',
      pace: 94,
      category: 'singleSeason',
      weeksRemaining: 5,
      projected: 5668,
    },
  ],
  recentBrokenRecords: [
    {
      playerId: 'p1',
      playerName: 'Ace Cannon',
      teamId: 'user',
      stat: 'passYds',
      newValue: 5510,
      previousValue: 5488,
      previousHolder: 'Duke Hale',
      category: 'singleSeason',
      year: 2032,
      week: 12,
      narrative: 'Ace Cannon now owns the single-season passing yards mark with 5510.',
    },
  ],
  recentMilestones: [
    {
      playerId: 'p2',
      playerName: 'Jet Vale',
      stat: 'rec',
      value: 750,
      milestoneLabel: '750',
      narrative: 'Jet Vale reached 750 career receptions.',
      year: 2032,
      week: 12,
    },
  ],
};

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectRecords: (state: typeof mockState) => state.records,
  useRecordChases: () => mockState.recordChases,
  useRecentBrokenRecords: () => mockState.recentBrokenRecords,
  useRecentMilestones: () => mockState.recentMilestones,
}));

describe('RecordBook', () => {
  beforeEach(() => {
    mockState.recordChases = [{
      playerId: 'p1',
      playerName: 'Ace Cannon',
      teamId: 'user',
      stat: 'passYds',
      currentValue: 3210,
      recordValue: 5510,
      recordHolder: 'Ace Cannon',
      pace: 94,
      category: 'singleSeason',
      weeksRemaining: 5,
      projected: 5668,
    }];
    mockState.recentBrokenRecords = [{
      playerId: 'p1',
      playerName: 'Ace Cannon',
      teamId: 'user',
      stat: 'passYds',
      newValue: 5510,
      previousValue: 5488,
      previousHolder: 'Duke Hale',
      category: 'singleSeason',
      year: 2032,
      week: 12,
      narrative: 'Ace Cannon now owns the single-season passing yards mark with 5510.',
    }];
    mockState.recentMilestones = [{
      playerId: 'p2',
      playerName: 'Jet Vale',
      stat: 'rec',
      value: 750,
      milestoneLabel: '750',
      narrative: 'Jet Vale reached 750 career receptions.',
      year: 2032,
      week: 12,
    }];
  });

  it('renders the header and record tabs', () => {
    const markup = renderToStaticMarkup(<RecordBook />);

    expect(markup).toContain('RECORD BOOK');
    expect(markup).toContain('Single Game');
    expect(markup).toContain('Single Season');
    expect(markup).toContain('Career');
    expect(markup).toContain('Franchise');
  });

  it('renders active chases and the default detail panel', () => {
    const markup = renderToStaticMarkup(<RecordBook />);

    expect(markup).toContain('ACTIVE CHASES');
    expect(markup).toContain('Ace Cannon');
    expect(markup).toContain('Projected finish: 5668');
    expect(markup).toContain('CURRENT CHALLENGER');
  });

  it('renders recent record breaks and milestones', () => {
    const markup = renderToStaticMarkup(<RecordBook />);

    expect(markup).toContain('RECENT RECORDS');
    expect(markup).toContain('Ace Cannon now owns the single-season passing yards mark with 5510.');
    expect(markup).toContain('MILESTONES');
    expect(markup).toContain('Jet Vale reached 750 career receptions.');
  });

  it('shows empty historian states when there is no fresh activity', () => {
    mockState.recordChases = [];
    mockState.recentBrokenRecords = [];
    mockState.recentMilestones = [];

    const markup = renderToStaticMarkup(<RecordBook />);

    expect(markup).toContain('No record chases above the 80% pace threshold right now.');
    expect(markup).toContain('No new record breaks this week.');
    expect(markup).toContain('No new milestones recorded this week.');
  });
});
