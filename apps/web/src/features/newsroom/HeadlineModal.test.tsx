import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { NewsItem } from '@mfd/engine';

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectTeams: (state: typeof mockState) => state.teams,
  selectUserTeamId: (state: typeof mockState) => state.userTeamId,
}));

const mockState = {
  teams: {
    'team-home': { id: 'team-home', abbr: 'HOM', city: 'Home', name: 'Team' },
    'team-rival': { id: 'team-rival', abbr: 'RIV', city: 'Rival', name: 'Squad' },
  },
  userTeamId: 'team-home',
};

import { HeadlineModal, buildHeadlineStoryReceiptRows } from './HeadlineModal';

const baseItem: NewsItem = {
  id: 'news-1',
  year: 2030,
  week: 5,
  type: 'trade',
  headline: 'Blockbuster trade rocks the league',
  body: 'Home Team lands a franchise QB in exchange for two first-rounders and a rising receiver.',
  teamIds: ['team-home', 'team-rival'],
  playerIds: ['p-qb'],
  importance: 'breaking',
};

describe('HeadlineModal', () => {
  it('renders nothing meaningful when closed', () => {
    const html = renderToStaticMarkup(
      <HeadlineModal item={baseItem} open={false} onOpenChange={() => undefined} />,
    );
    expect(html).toBe('');
  });

  it('renders a stub body when no item is provided but open is true', () => {
    const html = renderToStaticMarkup(
      <HeadlineModal item={null} open={true} onOpenChange={() => undefined} />,
    );
    expect(html).toContain('No story selected.');
  });

  it('renders the headline, body, importance chip, and user-team flag', () => {
    const html = renderToStaticMarkup(
      <HeadlineModal item={baseItem} open={true} onOpenChange={() => undefined} />,
    );
    expect(html).toContain('Blockbuster trade rocks the league');
    expect(html).toContain('BREAKING');
    expect(html).toContain('Home Team lands a franchise QB');
    expect(html).toContain('INVOLVES YOUR TEAM');
    expect(html).toContain('TRADE');
  });

  it('renders a chip per team with full city and name', () => {
    const html = renderToStaticMarkup(
      <HeadlineModal item={baseItem} open={true} onOpenChange={() => undefined} />,
    );
    expect(html).toContain('Home Team');
    expect(html).toContain('Rival Squad');
  });

  it('falls back to the team id when a team is not in the directory', () => {
    const item: NewsItem = { ...baseItem, teamIds: ['ghost-team'] };
    const html = renderToStaticMarkup(
      <HeadlineModal item={item} open={true} onOpenChange={() => undefined} />,
    );
    expect(html).toContain('ghost-team');
  });

  it('renders action buttons for Open Rankings, Full Wire, and Close', () => {
    const html = renderToStaticMarkup(
      <HeadlineModal item={baseItem} open={true} onOpenChange={() => undefined} />,
    );
    expect(html).toContain('Open Rankings');
    expect(html).toContain('Full Wire');
    expect(html).toContain('Close');
  });

  it('builds source-backed story receipt rows from saved news fields', () => {
    const rows = buildHeadlineStoryReceiptRows(baseItem);

    expect(rows.map((row) => row.id)).toEqual(['source', 'clock', 'scope', 'writer', 'boundary']);
    expect(rows.find((row) => row.id === 'source')?.value).toBe('game.leagueNews');
    expect(rows.find((row) => row.id === 'source')?.detail).toContain('NewsItemSchema row news-1');
    expect(rows.find((row) => row.id === 'clock')?.value).toBe('Y2030 W5');
    expect(rows.find((row) => row.id === 'clock')?.detail).toContain('BREAKING // trade');
    expect(rows.find((row) => row.id === 'scope')?.value).toBe('2 teams // 1 player');
    expect(rows.find((row) => row.id === 'writer')?.detail).toContain('recordNewsItem');
    expect(rows.find((row) => row.id === 'boundary')?.detail).toContain('does not generate stories');
  });

  it('renders a Story Receipt with source, writer, and no-write boundary copy', () => {
    const html = renderToStaticMarkup(
      <HeadlineModal item={baseItem} open={true} onOpenChange={() => undefined} />,
    );

    expect(html).toContain('STORY RECEIPT');
    expect(html).toContain('Saved Source');
    expect(html).toContain('game.leagueNews');
    expect(html).toContain('NewsItemSchema row news-1');
    expect(html).toContain('Story Clock');
    expect(html).toContain('Y2030 W5');
    expect(html).toContain('Linked Entities');
    expect(html).toContain('2 teams // 1 player');
    expect(html).toContain('Write Owner');
    expect(html).toContain('recordNewsItem');
    expect(html).toContain('Modal Boundary');
    expect(html).toContain('no news writes');
    expect(html).toContain('Opening this story does not generate stories, append leagueNews, dismiss breaking news, advance week, or autosave.');
  });

  it('does not mark involvement when the user team is not in teamIds', () => {
    const item: NewsItem = { ...baseItem, teamIds: ['team-rival'] };
    const html = renderToStaticMarkup(
      <HeadlineModal item={item} open={true} onOpenChange={() => undefined} />,
    );
    expect(html).not.toContain('INVOLVES YOUR TEAM');
  });
});
