import { describe, expect, it } from 'vitest';

import { makeContract } from '../src/systems/contracts.js';
import {
  addVoidYears,
  applyDeadCapCharge,
  calcTradeImpact,
  splitDeadCapCharge,
  v36_capHit,
  v36_cashPaid,
  v36_deadIfCut,
  v36_deadIfTraded,
  v36_tradeSavings,
  voidYearDeadCap,
} from '../src/systems/contract-helpers.js';

describe('contract-helpers.js', () => {
  describe('void year / cap / cash helpers', () => {
    it('voidYearDeadCap returns 0 for missing/no void years', () => {
      expect(voidYearDeadCap(null)).toBe(0);
      expect(voidYearDeadCap({ prorated: 2, voidYears: 0 })).toBe(0);
    });

    it('voidYearDeadCap returns prorated * voidYears', () => {
      expect(voidYearDeadCap({ prorated: 1.5, voidYears: 2 })).toBe(3);
    });

    it('v36_capHit handles null and legacy contracts', () => {
      expect(v36_capHit(null)).toBe(0);
      expect(v36_capHit({ salary: 9.7 })).toBe(9.7);
    });

    it('v36_capHit returns 0 after contract years are exhausted', () => {
      const c = makeContract(10, 3, 3, 5);
      expect(v36_capHit(c, 3)).toBe(0);
      expect(v36_capHit(c, 10)).toBe(0);
    });

    it('v36_capHit returns base + prorated for active years', () => {
      const c = makeContract(10, 3, 3, 5);
      expect(v36_capHit(c, 0)).toBe(11);
      expect(v36_capHit(c, 1)).toBe(11);
    });

    it('v36_cashPaid includes signing bonus only on signing year', () => {
      const c = makeContract(10, 4, 8, 10);
      expect(v36_cashPaid(c, 0, false)).toBe(10);
      expect(v36_cashPaid(c, 0, true)).toBe(18);
      expect(v36_cashPaid(c, 4, true)).toBe(0);
    });

    it('dead/cut/trade helpers include void-year acceleration', () => {
      const c = makeContract(10, 4, 8, 10); // prorated 2
      c.voidYears = 2;
      expect(v36_deadIfCut(c)).toBe(12); // 8 + 4
      expect(v36_deadIfTraded(c)).toBe(12);
      expect(v36_tradeSavings(c)).toBe(0);
    });
  });

  describe('dead cap splitting and application', () => {
    it('splitDeadCapCharge applies full charge pre-deadline', () => {
      expect(splitDeadCapCharge(10, 'regular', 5)).toEqual({
        now: 10,
        next: 0,
        postDeadline: false,
      });
    });

    it('splitDeadCapCharge halves charge post-deadline', () => {
      expect(splitDeadCapCharge(11, 'regular', 11)).toEqual({
        now: 5.5,
        next: 5.5,
        postDeadline: true,
      });
    });

    it('splitDeadCapCharge clamps negative values to zero', () => {
      expect(splitDeadCapCharge(-5, 'regular', 12)).toEqual({
        now: 0,
        next: 0,
        postDeadline: false,
      });
    });

    it('applyDeadCapCharge updates team totals and yearly books', () => {
      const team = { deadCap: 3, deadCapByYear: { '2026': 1 } };
      applyDeadCapCharge(team, 2026, { now: 2.5, next: 4.5 });

      expect(team.deadCap).toBe(5.5);
      expect(team.deadCapByYear['2026']).toBe(3.5);
      expect(team.deadCapByYear['2027']).toBe(4.5);
    });

    it('applyDeadCapCharge initializes missing dead cap structures', () => {
      const team = {};
      applyDeadCapCharge(team, 2028, { now: 1, next: 0 });
      expect(team.deadCap).toBe(1);
      expect(team.deadCapByYear['2028']).toBe(1);
    });
  });

  describe('trade impact and void years', () => {
    it('calcTradeImpact returns zeros with missing contract', () => {
      expect(calcTradeImpact({})).toEqual({ deadMoney: 0, newContract: null, capSavings: 0 });
    });

    it('calcTradeImpact returns dead money, new contract, and savings', () => {
      const player = { contract: makeContract(10, 4, 8, 10) };
      const out = calcTradeImpact(player);
      expect(out.deadMoney).toBe(8);
      expect(out.newContract).toBeTruthy();
      expect(out.newContract.signingBonus).toBe(0);
      expect(out.capSavings).toBe(4);
    });

    it('addVoidYears rejects invalid shapes / caps / expiring contracts', () => {
      expect(addVoidYears({ contract: { salary: 10 } }, 1).ok).toBe(false);

      const capped = { contract: makeContract(8, 3, 3, 4) };
      capped.contract.voidYears = 3;
      expect(addVoidYears(capped, 1).ok).toBe(false);

      const expiring = { contract: makeContract(8, 1, 3, 4) };
      expect(addVoidYears(expiring, 1).ok).toBe(false);
    });

    it('addVoidYears updates prorated hit and reports savings', () => {
      const p = { contract: makeContract(10, 4, 8, 10) }; // prorated=2, hit=12
      const result = addVoidYears(p, 2);

      expect(result.ok).toBe(true);
      expect(result.voidYears).toBe(2);
      expect(result.newHit).toBe(11.3);
      expect(result.savings).toBe(0.7);
      expect(p.contract.prorated).toBe(1.3);
      expect(p.contract.voidYears).toBe(2);
    });

    it('addVoidYears enforces max total of 3 void years', () => {
      const p = { contract: makeContract(9, 4, 4, 5) };
      p.contract.voidYears = 2;
      const result = addVoidYears(p, 5);
      expect(result.ok).toBe(true);
      expect(result.voidYears).toBe(3);
    });
  });
});
