import { describe, expect, it } from 'vitest';
import { makeContract } from './contracts';
import { checkIncentives, getAvailableIncentives, INCENTIVE_DEFS } from './incentives';
import { makePlayer } from './test-helpers';

describe('contract incentives', () => {
  it('defines the current contract incentive catalog and position availability', () => {
    expect(INCENTIVE_DEFS.map((definition) => [definition.id, definition.label, definition.threshold, definition.bonus])).toEqual([
      ['pass_yds', 'Pass Yards', 3500, 2],
      ['rush_yds', 'Rush Yards', 800, 1.5],
      ['rec_yds', 'Rec Yards', 700, 1.5],
      ['sacks', 'Sacks', 8, 1.5],
      ['ints', 'Interceptions', 4, 1],
      ['pro_bowl', 'Pro Bowl', 1, 2.5],
      ['playoffs', 'Make Playoffs', 1, 1],
    ]);
    expect(getAvailableIncentives('QB').map((definition) => definition.id)).toEqual([
      'pass_yds',
      'pro_bowl',
      'playoffs',
    ]);
    expect(getAvailableIncentives('K').map((definition) => definition.id)).toEqual(['playoffs']);
    expect(getAvailableIncentives('P')).toEqual([]);
  });

  it('splits hit and miss entries using player stats plus team achievement context', () => {
    const player = makePlayer('qb-1', 'afce1', 'QB', 88);
    player.stats = {
      ...player.stats,
      passYds: 4_100,
      rushYds: 120,
      recYds: 0,
      sacks: 0,
      defINT: 0,
    };
    player.contract = {
      ...makeContract(20, 4, 8, 10, player.id, 'afce1'),
      incentives: [
        { type: 'pass_yds', threshold: 4_000, bonus: 3, achieved: false },
        { type: 'rush_yds', threshold: 500, bonus: 1, achieved: false },
        { type: 'playoffs', threshold: 1, bonus: 2, achieved: false },
        { type: 'pro_bowl', threshold: 1, bonus: 4, achieved: false },
      ],
    };

    const result = checkIncentives(player, { madePlayoffs: true, proBowl: false });

    expect(result.hit).toEqual([
      { id: 'pass_yds', label: 'Pass Yards', bonus: 3, threshold: 4_000, actual: 4_100 },
      { id: 'playoffs', label: 'Make Playoffs', bonus: 2, threshold: 1, actual: 1 },
    ]);
    expect(result.miss).toEqual([
      { id: 'rush_yds', label: 'Rush Yards', bonus: 1, threshold: 500, actual: 120 },
      { id: 'pro_bowl', label: 'Pro Bowl', bonus: 4, threshold: 1, actual: 0 },
    ]);
    expect(result.totalBonus).toBe(5);
  });

  it('ignores unknown saved incentive ids instead of surfacing malformed entries', () => {
    const player = makePlayer('rb-1', 'afce1', 'RB', 79);
    player.contract = {
      ...makeContract(8, 2, 2, 2, player.id, 'afce1'),
      incentives: [
        { type: 'mystery_bonus', threshold: 1, bonus: 99, achieved: false },
        { type: 'rush_yds', threshold: 800, bonus: 1.5, achieved: false },
      ],
    };

    const result = checkIncentives(player, { madePlayoffs: false });

    expect(result.hit).toEqual([]);
    expect(result.miss).toEqual([
      { id: 'rush_yds', label: 'Rush Yards', bonus: 1.5, threshold: 800, actual: 0 },
    ]);
    expect(result.totalBonus).toBe(0);
  });

  it('returns an empty result for players without active contract incentives', () => {
    const noContract = makePlayer('wr-1', 'afce1', 'WR', 75);
    noContract.contract = null;
    const noIncentives = makePlayer('wr-2', 'afce1', 'WR', 75);
    noIncentives.contract = makeContract(6, 2, 2, 2, noIncentives.id, 'afce1');

    expect(checkIncentives(noContract, { madePlayoffs: true, proBowl: true })).toEqual({
      hit: [],
      miss: [],
      totalBonus: 0,
    });
    expect(checkIncentives(noIncentives, { madePlayoffs: true, proBowl: true })).toEqual({
      hit: [],
      miss: [],
      totalBonus: 0,
    });
  });
});
