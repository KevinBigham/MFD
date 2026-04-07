import { describe, expect, it } from 'vitest';

import {
  addRivalryMoment,
  buildRivalryLadder,
  buildRivalryLadderLite,
  buildRivalryTrophyCase,
  categorizeMoment,
  checkHateWeek,
  findRivalObj,
  generateHighlights,
  generateReceipts,
  getBiggestMoment,
  getMostRecentMoment,
  getRivalryLabel,
  rivalryKey,
} from '../src/systems/rivalry-engine.js';

describe('rivalry-engine.js', () => {
  it('builds stable rivalry keys and hate-week tiers', () => {
    expect(rivalryKey('b', 'a')).toBe('a|b');

    const rivalries = {
      'a|b': { a: 'a', b: 'b', heat: 13, seriesA: 5, seriesB: 3 },
    };
    const hw = checkHateWeek(rivalries, 'a', 'b');
    expect(hw.tier).toBe('BLOOD_FEUD');
    expect(hw.seriesRecord).toBe('5-3');
  });

  it('adds moments with gravity and retains only last 10', () => {
    const rivalries = { 'a|b': { moments: [] } };
    for (let i = 0; i < 12; i += 1) {
      addRivalryMoment(rivalries, 'a|b', { type: i % 2 ? 'championship' : 'thriller', margin: i, year: 2026 });
    }
    expect(rivalries['a|b'].moments).toHaveLength(10);
    expect(rivalries['a|b'].moments[0].margin).toBe(2);
  });

  it('categorizes moments and selects biggest/recent moments', () => {
    const m1 = { text: 'playoff upset revenge', gravity: 4, margin: 24 };
    const m2 = { text: 'regular game', gravity: 1, margin: 2 };
    expect(categorizeMoment(m1)).toEqual(expect.arrayContaining(['upset', 'playoff', 'revenge', 'blowout']));
    expect(categorizeMoment(m2)).toEqual(expect.arrayContaining(['thriller']));
    expect(getBiggestMoment([m2, m1])).toBe(m1);
    expect(getMostRecentMoment([m1, m2])).toBe(m2);
  });

  it('builds trophy case and ladder views with filtering/sorting', () => {
    const rivalry = {
      a: 'a',
      b: 'b',
      heat: 11,
      seriesA: 6,
      seriesB: 4,
      streakA: 3,
      moments: [{ margin: 28, year: 2025, text: 'playoff upset' }],
    };
    const trophies = buildRivalryTrophyCase(rivalry);
    expect(trophies.some((t) => t.label === 'Most Wins')).toBe(true);
    expect(trophies.some((t) => t.label === 'Biggest Blowout')).toBe(true);

    const ladder = buildRivalryLadder(
      { 'a|b': rivalry, 'c|d': { a: 'c', b: 'd', heat: 3, seriesA: 1, seriesB: 1 } },
      [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]
    );
    expect(ladder).toHaveLength(1);
    expect(ladder[0].tier).toBe('BITTER');

    const lite = buildRivalryLadderLite({ 'a|b': rivalry }, [{ id: 'a' }, { id: 'b' }]);
    expect(lite).toHaveLength(1);
    expect(lite[0].emoji).toContain('🔥');
  });

  it('generates highlights and receipts by reason key', () => {
    const game = {
      home: 24,
      away: 20,
      drives: [
        { team: 'A', pts: 7, plays: 8, type: 'Pass TD', d: 'Clean pocket TD' },
        { team: 'B', pts: 0, type: 'INT', turnover: true, defTeam: 'A', d: 'Pressure forced INT' },
        { team: 'A', pts: 3, type: 'FG', d: 'FG is good' },
      ],
    };
    const highlights = generateHighlights(game);
    expect(highlights.length).toBeGreaterThan(0);

    const receipts = generateReceipts(game, { key: 'pressureRate' });
    expect(receipts.some((r) => r.type === 'pressure' || r.type === 'clean')).toBe(true);
  });

  it('returns rivalry labels and finds rival objects', () => {
    expect(getRivalryLabel(10).tier).toBe('none');
    expect(getRivalryLabel(35).tier).toBe('budding');
    expect(getRivalryLabel(55).tier).toBe('heated');
    expect(getRivalryLabel(75).tier).toBe('intense');
    expect(getRivalryLabel(90).tier).toBe('war');

    const team = { rivals: [{ teamId: 'x', heat: 20 }] };
    expect(findRivalObj(team, 'x')).toEqual(team.rivals[0]);
    expect(findRivalObj(team, 'y')).toBeNull();
  });
});
