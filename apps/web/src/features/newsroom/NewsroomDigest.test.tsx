import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { NewsItem, PowerRanking, StorylineThread } from '@mfd/engine';

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectUserTeam: (state: typeof mockState) => state.team,
  selectLeagueNews: (state: typeof mockState) => state.news,
  selectPowerRankings: (state: typeof mockState) => state.rankings,
  selectStorylineThreads: (state: typeof mockState) => state.storylines,
  selectUserPowerRanking: (state: typeof mockState) => {
    const userId = state.team?.id;
    return userId ? state.rankings.find((r) => r.teamId === userId) ?? null : null;
  },
  selectTeams: (state: typeof mockState) => state.teamsById,
  selectUserTeamId: (state: typeof mockState) => state.team?.id ?? null,
}));

const mockState: {
  team: { id: string; city: string; name: string } | null;
  news: NewsItem[];
  rankings: PowerRanking[];
  storylines: StorylineThread[];
  teamsById: Record<string, { id: string; abbr: string; city: string; name: string }>;
} = {
  team: { id: 'team-me', city: 'Chicago', name: 'Blaze' },
  news: [],
  rankings: [],
  storylines: [],
  teamsById: {
    'team-me': { id: 'team-me', abbr: 'CHI', city: 'Chicago', name: 'Blaze' },
    'team-rival': { id: 'team-rival', abbr: 'RIV', city: 'Rival', name: 'Squad' },
  },
};

import { NewsroomDigest } from './NewsroomDigest';

function makeNews(overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    id: 'news-1',
    year: 2030,
    week: 5,
    type: 'trade',
    headline: 'Headline one',
    body: 'Body one.',
    teamIds: ['team-me'],
    playerIds: [],
    importance: 'minor',
    ...overrides,
  };
}

function makeRanking(overrides: Partial<PowerRanking> = {}): PowerRanking {
  return {
    rank: 1,
    teamId: 'team-me',
    teamName: 'Blaze',
    score: 92.4,
    previousRank: 3,
    delta: 2,
    blurb: 'Elite.',
    record: '4-0',
    ...overrides,
  };
}

describe('NewsroomDigest', () => {
  it('renders an empty-state when no team is loaded', () => {
    mockState.team = null;
    mockState.news = [];
    mockState.rankings = [];
    mockState.storylines = [];
    const html = renderToStaticMarkup(<NewsroomDigest />);
    expect(html).toContain('No active franchise is loaded.');
  });

  it('renders a quiet-wire placeholder when no stories exist', () => {
    mockState.team = { id: 'team-me', city: 'Chicago', name: 'Blaze' };
    mockState.news = [];
    mockState.rankings = [];
    mockState.storylines = [];
    const html = renderToStaticMarkup(<NewsroomDigest />);
    expect(html).toContain('No breaking or major stories hit the wire this cycle.');
    expect(html).toContain('Nothing else broke this week.');
    expect(html).toContain('NO ACTIVE THREADS');
  });

  it('explains the saved media sources without implying render-time generation', () => {
    mockState.team = { id: 'team-me', city: 'Chicago', name: 'Blaze' };
    mockState.news = [];
    mockState.rankings = [];
    mockState.storylines = [];
    const html = renderToStaticMarkup(<NewsroomDigest />);

    expect(html).toContain('MEDIA SOURCES');
    expect(html).toContain('Saved league wire');
    expect(html).toContain('Saved power rankings');
    expect(html).toContain('Active storyline threads');
    expect(html).toContain('does not generate stories while rendering');
    expect(html).toContain('breaking-news queue');
    expect(html).toContain('top ticker reads league news outside this route');
  });

  it('promotes the breaking story to lead over a major story', () => {
    mockState.team = { id: 'team-me', city: 'Chicago', name: 'Blaze' };
    mockState.news = [
      makeNews({ id: 'a', headline: 'Minor filing', importance: 'minor', week: 7 }),
      makeNews({ id: 'b', headline: 'Major signing', importance: 'major', week: 7 }),
      makeNews({ id: 'c', headline: 'Breaking coup', importance: 'breaking', week: 6 }),
    ];
    mockState.rankings = [];
    mockState.storylines = [];
    const html = renderToStaticMarkup(<NewsroomDigest />);
    // Lead story body
    expect(html).toContain('BREAKING COUP');
    // Sub-headlines still include the others
    expect(html).toContain('MAJOR SIGNING');
    expect(html).toContain('MINOR FILING');
  });

  it('picks the newest story within the same importance bucket', () => {
    mockState.team = { id: 'team-me', city: 'Chicago', name: 'Blaze' };
    mockState.news = [
      makeNews({ id: 'a', headline: 'Older major', importance: 'major', year: 2030, week: 3 }),
      makeNews({ id: 'b', headline: 'Newer major', importance: 'major', year: 2030, week: 9 }),
    ];
    mockState.rankings = [];
    mockState.storylines = [];
    const html = renderToStaticMarkup(<NewsroomDigest />);
    // NEWER MAJOR should appear in the Top panel headline (size 32px), OLDER MAJOR in Rest
    const leadIndex = html.indexOf('NEWER MAJOR');
    const subIndex = html.indexOf('OLDER MAJOR');
    expect(leadIndex).toBeGreaterThan(-1);
    expect(subIndex).toBeGreaterThan(leadIndex);
  });

  it('renders the rankings ticker when rankings exist', () => {
    mockState.team = { id: 'team-me', city: 'Chicago', name: 'Blaze' };
    mockState.news = [];
    mockState.rankings = [
      makeRanking({ rank: 1, teamId: 'team-rival', teamName: 'Rivals', delta: 1 }),
      makeRanking({ rank: 2, teamId: 'team-me', teamName: 'Blaze', delta: -1 }),
    ];
    mockState.storylines = [];
    const html = renderToStaticMarkup(<NewsroomDigest />);
    expect(html).toContain('RIVALS');
    expect(html).toContain('BLAZE');
    expect(html).toContain('POWER RANKINGS');
  });

  it('surfaces the biggest mover metric when a non-trivial delta exists', () => {
    mockState.team = { id: 'team-me', city: 'Chicago', name: 'Blaze' };
    mockState.news = [];
    mockState.rankings = [
      makeRanking({ rank: 1, teamId: 'team-1', teamName: 'Alpha', delta: 1 }),
      makeRanking({ rank: 12, teamId: 'team-3', teamName: 'Third', delta: -9 }),
    ];
    mockState.storylines = [];
    const html = renderToStaticMarkup(<NewsroomDigest />);
    expect(html).toContain('Biggest Mover');
    expect(html).toContain('Third');
    expect(html).toContain('DOWN 9');
  });

  it('renders injected storylines in the Active Storylines panel', () => {
    mockState.team = { id: 'team-me', city: 'Chicago', name: 'Blaze' };
    mockState.news = [];
    mockState.rankings = [];
    mockState.storylines = [];
    const thread: StorylineThread = {
      id: 'thread-a',
      key: 'hot-seat-chicago-2030',
      archetype: 'hot-seat-coach',
      title: 'Chicago heat check',
      summary: 'Two losing weeks put the seat on fire.',
      teamIds: ['team-me'],
      playerIds: [],
      startWeek: 4,
      startYear: 2030,
      weeksActive: 2,
      status: 'active',
      beats: [{ weekNumber: 4, year: 2030, label: 'Seat warms', summary: 'Owner spotted leaving practice early.' }],
      heat: 60,
      nextBeatHint: 'Presser Tuesday could set the tone.',
      beatIndex: 0,
      updatedWeek: 4,
      updatedYear: 2030,
      closeReason: null,
      metadata: {},
    };
    const html = renderToStaticMarkup(<NewsroomDigest storylines={[thread]} />);
    expect(html).toContain('COACH HOT SEAT');
    expect(html).toContain('CHICAGO HEAT CHECK');
    expect(html).toContain('Next: Presser Tuesday could set the tone.');
    expect(html).not.toContain('NO ACTIVE THREADS');
  });

  it('filters out closed threads from the active panel', () => {
    mockState.team = { id: 'team-me', city: 'Chicago', name: 'Blaze' };
    mockState.news = [];
    mockState.rankings = [];
    mockState.storylines = [];
    const thread: StorylineThread = {
      id: 'thread-b',
      key: 'rookie-blaze-2030',
      archetype: 'rookie-of-year-chase',
      title: 'Rookie runs the table',
      summary: 'Closed thread.',
      teamIds: ['team-me'],
      playerIds: [],
      startWeek: 1,
      startYear: 2030,
      weeksActive: 4,
      status: 'closed',
      beats: [],
      heat: 20,
      nextBeatHint: null,
      beatIndex: 0,
      updatedWeek: 5,
      updatedYear: 2030,
      closeReason: 'Award season closed the thread.',
      metadata: {},
    };
    const html = renderToStaticMarkup(<NewsroomDigest storylines={[thread]} />);
    expect(html).toContain('NO ACTIVE THREADS');
    expect(html).not.toContain('ROOKIE RUNS THE TABLE');
  });

  it('reads storylines from the store when no override prop is supplied', () => {
    mockState.team = { id: 'team-me', city: 'Chicago', name: 'Blaze' };
    mockState.news = [];
    mockState.rankings = [];
    mockState.storylines = [
      {
        id: 'thread-c',
        key: 'records-blaze-2030',
        archetype: 'records-chase',
        title: 'Blaze chases the all-time mark',
        summary: 'Chicago is 200 yards from the single-season rushing record.',
        teamIds: ['team-me'],
        playerIds: ['p-rb1'],
        startWeek: 10,
        startYear: 2030,
        weeksActive: 3,
        status: 'active',
        beats: [],
        heat: 85,
        nextBeatHint: 'A 150-yard game locks it up.',
        beatIndex: 0,
        updatedWeek: 12,
        updatedYear: 2030,
        closeReason: null,
        metadata: {},
      },
    ];
    const html = renderToStaticMarkup(<NewsroomDigest />);
    expect(html).toContain('RECORDS CHASE');
    expect(html).toContain('BLAZE CHASES THE ALL-TIME MARK');
    expect(html).not.toContain('NO ACTIVE THREADS');
  });

  it('renders the breaking badge count in the screen header', () => {
    mockState.team = { id: 'team-me', city: 'Chicago', name: 'Blaze' };
    mockState.news = [
      makeNews({ id: 'a' }),
      makeNews({ id: 'b' }),
      makeNews({ id: 'c' }),
    ];
    mockState.rankings = [];
    mockState.storylines = [];
    const html = renderToStaticMarkup(<NewsroomDigest />);
    expect(html).toContain('3 stories');
  });

  it('includes the user team ranking badge when the user is in the table', () => {
    mockState.team = { id: 'team-me', city: 'Chicago', name: 'Blaze' };
    mockState.news = [];
    mockState.rankings = [
      makeRanking({ rank: 1, teamId: 'team-1', teamName: 'Alpha', delta: 1 }),
      makeRanking({ rank: 7, teamId: 'team-me', teamName: 'Blaze', delta: -2 }),
    ];
    mockState.storylines = [];
    const html = renderToStaticMarkup(<NewsroomDigest />);
    expect(html).toContain('YOU #7');
  });
});
