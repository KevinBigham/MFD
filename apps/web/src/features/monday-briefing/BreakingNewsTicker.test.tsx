import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { NewsItem } from '@mfd/engine';
import { BreakingNewsTickerView, selectTickerItems, shouldAutoRotateTicker } from './BreakingNewsTicker';

const newsItems: NewsItem[] = [
  {
    id: 'major-1',
    year: 2028,
    week: 12,
    type: 'trade',
    headline: 'Blockbuster deal rocks the conference',
    body: 'Two contenders swapped edge rushers before the deadline.',
    teamIds: ['team-a', 'team-b'],
    playerIds: ['player-a'],
    importance: 'breaking',
  },
  {
    id: 'minor-1',
    year: 2028,
    week: 12,
    type: 'injury',
    headline: 'Minor depth move',
    body: 'A practice squad shuffle barely registered.',
    teamIds: ['team-c'],
    playerIds: [],
    importance: 'minor',
  },
];
const breakingNewsItem = newsItems[0]!;

describe('BreakingNewsTicker', () => {
  it('filters the ticker feed to high-importance headlines', () => {
    expect(selectTickerItems(newsItems)).toEqual([breakingNewsItem]);
  });

  it('renders the headline and body copy', () => {
    const markup = renderToStaticMarkup(
      <BreakingNewsTickerView item={breakingNewsItem} reducedMotion={false} />,
    );

    expect(markup).toContain('MFSN TICKER');
    expect(markup).toContain('Blockbuster deal rocks the conference');
    expect(markup).toContain('Two contenders swapped edge rushers');
  });

  it('labels the leagueNews source and no-write ticker boundary', () => {
    const markup = renderToStaticMarkup(
      <BreakingNewsTickerView item={breakingNewsItem} reducedMotion={false} />,
    );

    expect(markup).toContain('leagueNews via selectTickerItems');
    expect(markup).toContain('read-only');
    expect(markup).toContain('no queue dismiss, new story, save change, or outcome reroll');
    expect(markup).toContain('Source: saved leagueNews passed from the app shell through selectTickerItems');
    expect(markup).toContain('full-screen interrupts stay in breakingNewsQueue');
    expect(markup).toContain('does not dismiss queue items, create new stories, click Advance Week, change saves, or reroll saved outcomes');
    expect(markup).not.toMatch(/\bRNG\b|story gen|advance the week|mutate saves/i);
  });

  it('disables the ticker slide animation when reduced motion is enabled', () => {
    const markup = renderToStaticMarkup(
      <BreakingNewsTickerView item={breakingNewsItem} reducedMotion />,
    );

    expect(markup).toContain('animation:none');
  });

  it('skips auto-rotation when reduced motion is preferred (WCAG SC 2.2.2)', () => {
    expect(shouldAutoRotateTicker(4, true)).toBe(false);
    expect(shouldAutoRotateTicker(1, true)).toBe(false);
    expect(shouldAutoRotateTicker(0, true)).toBe(false);
  });

  it('auto-rotates only when there are multiple items and motion is allowed', () => {
    expect(shouldAutoRotateTicker(2, false)).toBe(true);
    expect(shouldAutoRotateTicker(4, false)).toBe(true);
    expect(shouldAutoRotateTicker(1, false)).toBe(false);
    expect(shouldAutoRotateTicker(0, false)).toBe(false);
  });
});
