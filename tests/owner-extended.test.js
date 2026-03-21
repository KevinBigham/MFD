import { describe, expect, it } from 'vitest';

import {
  OWNER_CONFIDENCE_ARC,
  OWNER_CONSEQUENCES,
  OWNER_PATIENCE,
} from '../src/systems/owner-extended.js';

describe('owner-extended.js', () => {
  describe('OWNER_PATIENCE', () => {
    it('tick applies win/loss deltas with streak effects', () => {
      const win = OWNER_PATIENCE.tick(50, { archetypeId: 'win_now' }, { streak: 3 }, true, false);
      const loss = OWNER_PATIENCE.tick(50, { archetypeId: 'win_now' }, { streak: -3 }, false, false);
      expect(win).toBe(66); // +12 +4
      expect(loss).toBe(40); // -6 -4 (drain reduced from 8 to 6)
    });

    it('tick amplifies playoff stakes and clamps bounds', () => {
      expect(OWNER_PATIENCE.tick(95, { archetypeId: 'fan_favorite' }, { streak: 0 }, true, true)).toBe(100);
      expect(OWNER_PATIENCE.tick(3, { archetypeId: 'fan_favorite' }, { streak: 0 }, false, true)).toBe(10); // 3 + (-4*2) + 15 = 10
    });

    it('status returns threshold labels', () => {
      expect(OWNER_PATIENCE.status(90).label).toBe('ECSTATIC');
      expect(OWNER_PATIENCE.status(70).label).toBe('PLEASED');
      expect(OWNER_PATIENCE.status(50).label).toBe('WATCHING');
      expect(OWNER_PATIENCE.status(30).label).toBe('IMPATIENT');
      expect(OWNER_PATIENCE.status(15).label).toBe('FURIOUS');
      expect(OWNER_PATIENCE.status(5).label).toBe('CRISIS');
    });
  });

  describe('OWNER_CONFIDENCE_ARC', () => {
    it('normalizes finite values and falls back on invalid input', () => {
      expect(OWNER_CONFIDENCE_ARC.normalize(120, 50)).toBe(100);
      expect(OWNER_CONFIDENCE_ARC.normalize(-10, 50)).toBe(0);
      expect(OWNER_CONFIDENCE_ARC.normalize(NaN, 42)).toBe(42);
    });

    it('score combines patience and mood', () => {
      expect(OWNER_CONFIDENCE_ARC.score(100, 100)).toBe(100);
      expect(OWNER_CONFIDENCE_ARC.score(0, 0)).toBe(0);
      expect(OWNER_CONFIDENCE_ARC.score(50, 70)).toBe(57);
    });

    it('get returns stage metadata and severity', () => {
      expect(OWNER_CONFIDENCE_ARC.get(90, 90).id).toBe('PATIENT');
      expect(OWNER_CONFIDENCE_ARC.get(60, 60).id).toBe('RESTLESS');
      expect(OWNER_CONFIDENCE_ARC.get(40, 40).id).toBe('DEMANDING');
      expect(OWNER_CONFIDENCE_ARC.get(10, 10).id).toBe('ULTIMATUM');
    });

    it('transition reports worsening or improving states', () => {
      const worse = OWNER_CONFIDENCE_ARC.transition(
        OWNER_CONFIDENCE_ARC.get(80, 80),
        OWNER_CONFIDENCE_ARC.get(20, 20)
      );
      expect(worse?.color).toBe('red');

      const better = OWNER_CONFIDENCE_ARC.transition(
        OWNER_CONFIDENCE_ARC.get(20, 20),
        OWNER_CONFIDENCE_ARC.get(80, 80)
      );
      expect(better?.color).toBe('green');
    });
  });

  describe('OWNER_CONSEQUENCES', () => {
    it('generateUltimatums returns three unique items', () => {
      const list = OWNER_CONSEQUENCES.generateUltimatums(() => 0);
      expect(list).toHaveLength(3);
      expect(new Set(list.map((u) => u.id)).size).toBe(3);
    });

    it('ultimatum checks evaluate contract/staff/cap conditions', () => {
      const tradeWorst = OWNER_CONSEQUENCES.ultimatums.find((u) => u.id === 'trade_worst');
      expect(
        tradeWorst.check({}, [{ id: 1 }, { id: 2 }], [{ id: 2 }])
      ).toBe(true);

      const fireCoord = OWNER_CONSEQUENCES.ultimatums.find((u) => u.id === 'fire_coord');
      expect(
        fireCoord.check(
          {},
          { oc: { id: 'a' }, dc: { id: 'd1' } },
          { oc: { id: 'b' }, dc: { id: 'd1' } }
        )
      ).toBe(true);

      const cutPayroll = OWNER_CONSEQUENCES.ultimatums.find((u) => u.id === 'cut_payroll');
      expect(cutPayroll.check({}, 150, 141.5)).toBe(true);
      expect(cutPayroll.check({}, 150, 143)).toBe(false);
    });
  });
});
