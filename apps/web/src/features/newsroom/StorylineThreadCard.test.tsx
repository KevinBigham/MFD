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

import type { StorylineThread } from '@mfd/engine';
import { StorylineThreadCard, buildStorylineReceiptRows } from './StorylineThreadCard';

const activeThread: StorylineThread = {
  id: 'thread-1',
  key: 'qb-chicago-2030',
  archetype: 'qb-controversy',
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
      weekNumber: 3,
      year: 2030,
      label: 'Starter pulled at halftime',
      summary: 'Home Team yanks the veteran QB with the team down 17 at the break.',
    },
    {
      weekNumber: 4,
      year: 2030,
      label: 'Backup earns a second start',
      summary: 'A Week 4 spark has the staff leaning toward a change.',
    },
  ],
  heat: 72,
  nextBeatHint: 'A presser Tuesday could make the switch permanent.',
  beatIndex: 1,
  updatedWeek: 4,
  updatedYear: 2030,
  closeReason: null,
  metadata: {},
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

  it('builds source-backed receipt rows from saved storyline fields', () => {
    const rows = buildStorylineReceiptRows(activeThread);

    expect(rows.map((row) => row.id)).toEqual(['source', 'timeline', 'beats', 'lifecycle', 'boundary']);
    expect(rows.find((row) => row.id === 'source')?.value).toBe('storylineThreads');
    expect(rows.find((row) => row.id === 'source')?.detail).toContain('qb-chicago-2030');
    expect(rows.find((row) => row.id === 'timeline')?.value).toBe('Y2030 W3 -> Y2030 W4');
    expect(rows.find((row) => row.id === 'beats')?.value).toBe('2 beats');
    expect(rows.find((row) => row.id === 'beats')?.detail).toContain('Backup earns a second start');
    expect(rows.find((row) => row.id === 'lifecycle')?.detail).toContain('advanceStorylineThreads');
    expect(rows.find((row) => row.id === 'boundary')?.detail).toContain('does not advance, close, seed');
  });

  it('renders a Thread Receipt with lifecycle ownership and no-write copy', () => {
    const html = renderToStaticMarkup(<StorylineThreadCard thread={activeThread} />);

    expect(html).toContain('THREAD RECEIPT');
    expect(html).toContain('Saved Source');
    expect(html).toContain('storylineThreads');
    expect(html).toContain('Thread Clock');
    expect(html).toContain('Y2030 W3 -&gt; Y2030 W4');
    expect(html).toContain('Beat Ledger');
    expect(html).toContain('2 beats');
    expect(html).toContain('Lifecycle Owner');
    expect(html).toContain('advanceStorylineThreads -&gt; closeCompletedThreads -&gt; seedThreadsForWeek');
    expect(html).toContain('Just viewing');
    expect(html).toContain('This card does not advance, close, seed, write news, or change storyline metadata.');
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
    const closed: StorylineThread = { ...activeThread, status: 'closed' };
    const html = renderToStaticMarkup(<StorylineThreadCard thread={closed} />);
    expect(html).toContain('CLOSED');
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
