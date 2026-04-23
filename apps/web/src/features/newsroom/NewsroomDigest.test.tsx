import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { NewsItem, PowerRanking } from '@mfd/engine';

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectUserTeam: (state: typeof mockState) => state.team,
  selectLeagueNews: (state: typeof mockState) => state.news,
  selectPowerRankings: (state: typeof mockState) => state.rankings,
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
  teamsById: Record<string, { id: string; abbr: string; city: string; name: string }>;
} = {
  team: { id: 'team-me', city: 'Chicago', name: 'Blaze' },
  news: [],
  rankings: [],
  teamsById: {
    'team-me': { id: 'team-me', abbr: 'CHI', city: 'Chicago', name: 'Blaze' },
    'team-rival': { id: 'team-rival', abbr: 'RIV', city: 'Rival', name: 'Squad' },
  },
};

import { NewsroomDigest } from './NewsroomDigest';
import type { StorylineThread } from './types';

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
    const html = renderToStaticMarkup(<NewsroomDigest />);
    expect(html).toContain('No active franchise is loaded.');
  });

  it('renders a quiet-wire placeholder when no stories exist', () => {
    mockState.team = { id: 'team-me', city: 'Chicago', name: 'Blaze' };
    mockState.news = [];
    mockState.rankings = [];
    const html = renderToStaticMarkup(<NewsroomDigest />);
    expect(html).toContain('No breaking or major stories hit the wire this cycle.');
    expect(html).toContain('Nothing else broke this week.');
    expect(html).toContain('NO ACTIVE THREADS');
  });

  it('promotes the breaking story to lead over a major story', () => {
    mockState.team = { id: 'team-me', city: 'Chicago', name: 'Blaze' };
    mockState.news = [
      makeNews({ id: 'a', headline: 'Minor filing', importance: 'minor', week: 7 }),
      makeNews({ id: 'b', headline: 'Major signing', importance: 'major', week: 7 }),
      makeNews({ id: 'c', headline: 'Breaking coup', importance: 'breaking', week: 6 }),
    ];
    mockState.rankings = [];
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
    const html = renderToStaticMarkup(<NewsroomDigest />);
    expect(html).toContain('BIGGEST MOVER');
    expect(html).toContain('Third');
    expect(html).toContain('DOWN 9');
  });

  it('renders injected storylines in the Active Storylines panel', () => {
    mockState.team = { id: 'team-me', city: 'Chicago', name: 'Blaze' };
    mockState.news = [];
    mockState.rankings = [];
    const thread: StorylineThread = {
      id: 'thread-a',
      archetype: 'coach_hot_seat',
      title: 'Chicago heat check',
      summary: 'Two losing weeks put the seat on fire.',
      teamIds: ['team-me'],
      playerIds: [],
      startWeek: 4,
      startYear: 2030,
      weeksActive: 2,
      status: 'active',
      beats: [{ week: 4, year: 2030, headline: 'Seat warms', body: 'Owner spotted leaving practice early.' }],
      nextBeatHint: 'Presser Tuesday could set the tone.',
      heat: 60,
    };
    const html = renderToStaticMarkup(<NewsroomDigest storylines={[thread]} />);
    expect(html).toContain('COACH HOT SEAT');
    expect(html).toContain('CHICAGO HEAT CHECK');
    expect(html).toContain('Next: Presser Tuesday could set the tone.');
    expect(html).not.toContain('NO ACTIVE THREADS');
  });

  it('filters out resolved threads from the active panel', () => {
    mockState.team = { id: 'team-me', city: 'Chicago', name: 'Blaze' };
    mockState.news = [];
    mockState.rankings = [];
    const thread: StorylineThread = {
      id: 'thread-b',
      archetype: 'rookie_breakout',
      title: 'Rookie runs the table',
      summary: 'Resolved thread.',
      teamIds: ['team-me'],
      playerIds: [],
      startWeek: 1,
      startYear: 2030,
      weeksActive: 4,
      status: 'resolved',
      beats: [],
      nextBeatHint: null,
      heat: 20,
    };
    const html = renderToStaticMarkup(<NewsroomDigest storylines={[thread]} />);
    expect(html).toContain('NO ACTIVE THREADS');
    expect(html).not.toContain('ROOKIE RUNS THE TABLE');
  });

  it('renders the breaking badge count in the screen header', () => {
    mockState.team = { id: 'team-me', city: 'Chicago', name: 'Blaze' };
    mockState.news = [
      makeNews({ id: 'a' }),
      makeNews({ id: 'b' }),
      makeNews({ id: 'c' }),
    ];
    mockState.rankings = [];
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
    const html = renderToStaticMarkup(<NewsroomDigest />);
    expect(html).toContain('YOU #7');
  });
});
