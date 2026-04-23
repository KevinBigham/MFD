import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectTeams: (state: typeof mockState) => state.teams,
  selectUserTeamId: (state: typeof mockState) => state.userTeamId,
}));

const mockState = {
  teams: {
    'team-home': { id: 'team-home', abbr: 'HOM' },
    'team-rival': { id: 'team-rival', abbr: 'RIV' },
    'team-third': { id: 'team-third', abbr: 'TRD' },
    'team-fourth': { id: 'team-fourth', abbr: 'FOR' },
  },
  userTeamId: 'team-home',
};

import { StorylineThreadCard } from './StorylineThreadCard';
import type { StorylineThread } from './types';

const activeThread: StorylineThread = {
  id: 'thread-1',
  archetype: 'qb_controversy',
  title: 'Who leads the huddle in Chicago?',
  summary: 'Starter benched after two turnovers, backup ignites the crowd, and the locker room is split.',
  teamIds: ['team-home'],
  playerIds: ['p-qb1', 'p-qb2'],
  startWeek: 3,
  startYear: 2030,
  weeksActive: 2,
  status: 'active',
  beats: [
    {
      week: 3,
      year: 2030,
      headline: 'Starter pulled at halftime',
      body: 'Home Team yanks the veteran QB with the team down 17 at the break.',
    },
    {
      week: 4,
      year: 2030,
      headline: 'Backup earns a second start',
      body: 'A Week 4 spark has the staff leaning toward a change.',
    },
  ],
  nextBeatHint: 'A presser Tuesday could make the switch permanent.',
  heat: 72,
};

describe('StorylineThreadCard', () => {
  it('renders the archetype label and title in all caps', () => {
    const html = renderToStaticMarkup(<StorylineThreadCard thread={activeThread} />);
    expect(html).toContain('QB CONTROVERSY');
    expect(html).toContain('WHO LEADS THE HUDDLE IN CHICAGO?');
  });

  it('renders the latest beat headline and body in the WEEK panel', () => {
    const html = renderToStaticMarkup(<StorylineThreadCard thread={activeThread} />);
    expect(html).toContain('WEEK 4 BEAT');
    expect(html).toContain('BACKUP EARNS A SECOND START');
    expect(html).toContain('A Week 4 spark has the staff leaning');
  });

  it('renders the next-beat hint when provided', () => {
    const html = renderToStaticMarkup(<StorylineThreadCard thread={activeThread} />);
    expect(html).toContain('Next: A presser Tuesday could make the switch permanent.');
  });

  it('renders a heat meter showing 10 cells, 7 filled, and the numeric value', () => {
    const html = renderToStaticMarkup(<StorylineThreadCard thread={activeThread} />);
    expect(html).toMatch(/[█]{7}[░]{3}/);
    expect(html).toContain('72');
  });

  it('marks involvement with user team and highlights the team chip', () => {
    const html = renderToStaticMarkup(<StorylineThreadCard thread={activeThread} />);
    expect(html).toContain('HOM');
    // user team chip should have the gold variant, detectable via gold color var
    expect(html).toContain('var(--mfd-gold)');
  });

  it('renders weeksActive chip', () => {
    const html = renderToStaticMarkup(<StorylineThreadCard thread={activeThread} />);
    expect(html).toContain('2W');
  });

  it('caps visible team chips at 3 and shows a +N overflow chip', () => {
    const thread: StorylineThread = {
      ...activeThread,
      teamIds: ['team-home', 'team-rival', 'team-third', 'team-fourth'],
    };
    const html = renderToStaticMarkup(<StorylineThreadCard thread={thread} />);
    expect(html).toContain('HOM');
    expect(html).toContain('RIV');
    expect(html).toContain('TRD');
    expect(html).not.toContain('>FOR<');
    expect(html).toContain('+1');
  });

  it('renders the status badge in upper case', () => {
    const resolved: StorylineThread = { ...activeThread, status: 'resolved' };
    const html = renderToStaticMarkup(<StorylineThreadCard thread={resolved} />);
    expect(html).toContain('RESOLVED');
  });

  it('renders without a next-beat line when nextBeatHint is null', () => {
    const thread: StorylineThread = { ...activeThread, nextBeatHint: null };
    const html = renderToStaticMarkup(<StorylineThreadCard thread={thread} />);
    expect(html).not.toContain('Next:');
  });

  it('sets role="button" when onOpen is provided', () => {
    const html = renderToStaticMarkup(
      <StorylineThreadCard thread={activeThread} onOpen={() => undefined} />,
    );
    expect(html).toContain('role="button"');
    expect(html).toContain('cursor:pointer');
  });
});
