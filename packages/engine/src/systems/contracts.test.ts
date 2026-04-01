import { describe, it, expect } from 'vitest';
import {
  makeContract, calcCapHit, calcDeadMoney,
  restructureContract, backloadContract, extendAndRestructure,
  calcContractScore, calcDeadCap,
} from './contracts';
import {
  voidYearDeadCap, v36CapHit, v36DeadIfCut, v36DeadIfTraded,
  v36TradeSavings, splitDeadCapCharge, addVoidYears,
} from './contract-helpers';

describe('contracts', () => {
  it('makeContract creates proper structure', () => {
    const c = makeContract(10, 4, 20, 10, 'p1', 't1');
    expect(c.baseSalary).toBe(10);
    expect(c.years).toBe(4);
    expect(c.signingBonus).toBe(20);
    expect(c.prorated).toBe(5); // 20/4
    expect(c.totalValue).toBe(60); // 10*4+20
    expect(c.yearlyBreakdown).toHaveLength(4);
    expect(c.yearlyBreakdown[0]!.capHit).toBe(15); // 10+5
    expect(c.restructured).toBe(false);
    expect(c.voidYears).toBe(0);
  });

  it('calcCapHit returns baseSalary + prorated', () => {
    const c = makeContract(8, 3, 9, 5);
    expect(calcCapHit(c)).toBe(11); // 8 + 3
    expect(calcCapHit(null)).toBe(0);
  });

  it('calcDeadMoney returns prorated * years', () => {
    const c = makeContract(8, 3, 9, 5);
    expect(calcDeadMoney(c)).toBe(9); // 3*3
  });

  it('restructureContract converts base to prorated', () => {
    const c = makeContract(10, 4, 8, 5);
    const player = { contract: c };
    const result = restructureContract(player);
    expect(result.ok).toBe(true);
    expect(result.savings).toBeGreaterThan(0);
    expect(c.baseSalary).toBe(0.5); // MIN_SALARY
    expect(c.restructured).toBe(true);
  });

  it('restructure rejects 1-year contracts', () => {
    const c = makeContract(10, 1, 0, 0);
    const result = restructureContract({ contract: c });
    expect(result.ok).toBe(false);
  });

  it('restructure rejects already-restructured', () => {
    const c = makeContract(10, 4, 8, 5);
    restructureContract({ contract: c });
    const result = restructureContract({ contract: c });
    expect(result.ok).toBe(false);
  });

  it('backloadContract adds void years', () => {
    const c = makeContract(10, 3, 6, 5);
    const result = backloadContract({ contract: c }, 2);
    expect(result.ok).toBe(true);
    expect(result.voidYears).toBe(2);
    expect(c.voidYears).toBe(2);
    expect(result.savings).toBeGreaterThan(0);
  });

  it('extendAndRestructure adds years then restructures', () => {
    const c = makeContract(10, 3, 6, 5);
    const result = extendAndRestructure({ contract: c }, 2);
    expect(result.ok).toBe(true);
    expect(c.years).toBe(5);
    expect(c.restructured).toBe(true);
  });

  it('calcContractScore returns grade and score', () => {
    const result = calcContractScore(85, 'QB', 28, 4, 60, 255);
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.grade).toBeTruthy();
    expect(result.fairValue).toBeGreaterThan(0);
  });

  it('calcDeadCap computes dead cap hit', () => {
    const result = calcDeadCap(30, 3, 1);
    expect(result.deadCapHit).toBeGreaterThan(0);
    expect(result.capSavings).toBeGreaterThanOrEqual(0);
  });
});

describe('contract-helpers', () => {
  it('v36CapHit matches calcCapHit', () => {
    const c = makeContract(10, 4, 20, 10);
    expect(v36CapHit(c)).toBe(calcCapHit(c));
  });

  it('v36DeadIfCut includes void year dead cap', () => {
    const c = makeContract(10, 4, 20, 10);
    c.voidYears = 2;
    expect(v36DeadIfCut(c)).toBeGreaterThan(calcDeadMoney(c));
  });

  it('voidYearDeadCap returns 0 when no void years', () => {
    const c = makeContract(10, 4, 20, 10);
    expect(voidYearDeadCap(c)).toBe(0);
  });

  it('v36TradeSavings = capHit - deadIfTraded', () => {
    const c = makeContract(10, 4, 20, 10);
    expect(v36TradeSavings(c)).toBe(v36CapHit(c) - v36DeadIfTraded(c));
  });

  it('splitDeadCapCharge splits post-deadline', () => {
    const split = splitDeadCapCharge(10, 'regular_season', 12);
    expect(split.postDeadline).toBe(true);
    expect(split.now).toBe(5);
    expect(split.next).toBe(5);
  });

  it('splitDeadCapCharge no split pre-deadline', () => {
    const split = splitDeadCapCharge(10, 'regular_season', 8);
    expect(split.postDeadline).toBe(false);
    expect(split.now).toBe(10);
    expect(split.next).toBe(0);
  });

  it('addVoidYears reduces cap hit', () => {
    const c = makeContract(10, 4, 20, 10);
    const oldHit = v36CapHit(c);
    const result = addVoidYears({ contract: c }, 2);
    expect(result.ok).toBe(true);
    expect(result.newHit).toBeLessThan(oldHit);
    expect(c.voidYears).toBe(2);
  });

  it('addVoidYears caps at 3 total', () => {
    const c = makeContract(10, 4, 20, 10);
    addVoidYears({ contract: c }, 2);
    const result = addVoidYears({ contract: c }, 3);
    expect(result.ok).toBe(true);
    expect(c.voidYears).toBe(3);
  });
});
