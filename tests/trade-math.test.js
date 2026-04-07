import { describe, expect, it } from 'vitest';

import {
  GM_TRADE_PITCH,
  RECORDS_WALL,
  TRADE_MATH,
  getGMTradePitch,
} from '../src/systems/trade-math.js';
import { setSeed } from '../src/utils/rng.js';

describe('trade-math.js', () => {
  describe('TRADE_MATH', () => {
    it('classifies deltas across fleece/fair/overpay thresholds', () => {
      expect(TRADE_MATH.classify(40, false).classification).toBe('fleece');
      expect(TRADE_MATH.classify(18, true)).toMatchObject({ classification: 'fleece', severity: 1, trustImpact: -6 });
      expect(TRADE_MATH.classify(0, false).classification).toBe('fair');
      expect(TRADE_MATH.classify(-30, false).classification).toBe('overpay');
    });

    it('calcDelta applies credibility/pattern/perk mods with clamping', () => {
      const delta = TRADE_MATH.calcDelta({
        valueDelta: 10, // fair -> +2
        isRival: false,
        credibility: 75, // +1
        recentTradePattern: { fleeceCount: 0, fairCount: 3 }, // +1
        perks: ['ldr1'], // +1
      });
      expect(delta).toBe(5);

      const clamped = TRADE_MATH.calcDelta({
        valueDelta: 50,
        isRival: true,
        credibility: 0,
        recentTradePattern: { fleeceCount: 3, fairCount: 0 },
        perks: [],
      });
      expect(clamped).toBe(-8);
    });

    it('acceptBonus maps trust score into bounded modifier', () => {
      expect(TRADE_MATH.acceptBonus(50)).toBe(0);
      expect(TRADE_MATH.acceptBonus(100)).toBe(6);
      expect(TRADE_MATH.acceptBonus(0)).toBe(-6);
    });

    it('decaySeason regresses trust 20% toward 50', () => {
      const out = TRADE_MATH.decaySeason({ A: 100, B: 0, C: 50 });
      expect(out).toEqual({ A: 90, B: 10, C: 50 });
    });

    it('pushRecentTrade prepends and caps history to 4 entries', () => {
      const out = TRADE_MATH.pushRecentTrade([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }], { id: 5 });
      expect(out.map((x) => x.id)).toEqual([5, 1, 2, 3]);
    });

    it('getPattern counts classifications', () => {
      const p = TRADE_MATH.getPattern([
        { classification: 'fleece' },
        { classification: 'fair' },
        { classification: 'fleece' },
        { classification: 'overpay' },
      ]);
      expect(p).toEqual({ fleeceCount: 2, fairCount: 1, overpayCount: 1 });
    });

    it('trustLabel returns thresholded labels', () => {
      expect(TRADE_MATH.trustLabel(80).label).toBe('Trusted');
      expect(TRADE_MATH.trustLabel(65).label).toBe('Friendly');
      expect(TRADE_MATH.trustLabel(45).label).toBe('Neutral');
      expect(TRADE_MATH.trustLabel(30).label).toBe('Wary');
      expect(TRADE_MATH.trustLabel(10).label).toBe('Hostile');
    });
  });

  describe('RECORDS_WALL', () => {
    it('build creates records object with category keys', () => {
      const records = RECORDS_WALL.build([], [], 1);
      RECORDS_WALL.categories.forEach((cat) => {
        expect(records).toHaveProperty(cat.id);
      });
    });

    it('build selects season leaders from history snapshots', () => {
      const history = [
        {
          year: 2026,
          teams: [
            {
              abbr: 'BUF',
              roster: [
                { name: 'A QB', pos: 'QB', stats: { passYds: 4200, passTD: 34 } },
                { name: 'A RB', pos: 'RB', stats: { rushYds: 1200 } },
              ],
            },
          ],
        },
        {
          year: 2027,
          teams: [
            {
              abbr: 'MIA',
              roster: [{ name: 'B QB', pos: 'QB', stats: { passYds: 4500, passTD: 30 } }],
            },
          ],
        },
      ];

      const records = RECORDS_WALL.build(history, [], 1);
      expect(records.passYds_season.holder).toBe('B QB');
      expect(records.passYds_season.value).toBe(4500);
      expect(records.passTD_season.holder).toBe('A QB');
      expect(records.rushYds_season.holder).toBe('A RB');
    });
  });

  describe('GM trade pitch', () => {
    it('returns deterministic pitch line with provided rng', () => {
      const line = getGMTradePitch('analytics', () => 0);
      expect(line).toBe(GM_TRADE_PITCH.analytics[0]);
    });

    it('uses the seeded trade channel when rng is omitted', () => {
      setSeed(99);
      const first = getGMTradePitch('analytics');
      setSeed(99);
      const second = getGMTradePitch('analytics');
      expect(first).toBe(second);
    });

    it('falls back to fallback pool for unknown archetype', () => {
      const line = getGMTradePitch('nope', () => 0);
      expect(line).toBe(GM_TRADE_PITCH.fallback[0]);
    });
  });
});
