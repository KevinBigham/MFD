import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { NewsItem } from '@mfd/engine';
import { BreakingNewsTickerView, selectTickerItems } from './BreakingNewsTicker';

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

  it('disables the ticker slide animation when reduced motion is enabled', () => {
    const markup = renderToStaticMarkup(
      <BreakingNewsTickerView item={breakingNewsItem} reducedMotion />,
    );

    expect(markup).toContain('animation:none');
  });
});
