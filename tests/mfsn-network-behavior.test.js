import { describe, expect, it } from 'vitest';

import { setSeed } from '../src/utils/rng.js';
import { MFSN_SHOW, MFSN_WEEKLY975 } from '../src/data/mfsn-network.js';

describe('mfsn-network behavior', () => {
  it('buildPickCard produces a normalized analyst card payload', () => {
    setSeed(7);
    const card = MFSN_SHOW.buildPickCard(
      {
        grade: 'A',
        reactions: [{ emoji: '✅' }],
        team: 'ATL',
        icon: '🦅',
        player: 'Prospect One',
        pos: 'QB',
        ovr: 78,
        pot: 90,
        pickNum: 5,
        round: 1,
      },
      5
    );

    expect(card).not.toBeNull();
    expect(typeof card.analyst).toBe('string');
    expect(typeof card.line).toBe('string');
    expect(card.verdict).toBeTypeOf('string');
    expect(card.isSteal).toBe(true);
  });

  it('buildShow creates a weekly show envelope for a valid team/week', () => {
    const teams = [
      { id: 'hawks', abbr: 'ATL', icon: '🦅', wins: 5, losses: 2, pf: 180, pa: 140, ownerMood: 60 },
      { id: 'volts', abbr: 'MIA', icon: '🦩', wins: 3, losses: 4, pf: 150, pa: 160, ownerMood: 45 },
    ];
    const show = MFSN_WEEKLY975.buildShow(
      teams,
      'hawks',
      8,
      { result: { home: 27, away: 20 }, isHome: true, oppAbbr: 'MIA' },
      [{ name: 'Player A', badge: '🌟', line: 'Hot streak', pos: 'WR' }],
      [{ rank: 1, icon: '🦅', team: 'ATL', wins: 5, losses: 2, trendDelta: 0, trend: 'same', trendIcon: '➖', blurb: 'Top' }],
      { headlines: ['Test headline'] },
      { year: 2027 }
    );

    expect(show).not.toBeNull();
    expect(show.week).toBe(8);
    expect(show.anchor).toBeTruthy();
    expect(show.segments.length).toBeGreaterThan(0);
  });
});
