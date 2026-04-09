import { describe, expect, it } from 'vitest';
import { rookieSlotContract } from '../config/rookie-slots';
import type { Contract } from '../types';
import { makeContract } from './contracts';
import {
  addVoidYears,
  applyDeadCapCharge,
  calcDeadMoneyFromSlices,
  calcTradeImpact,
  restructureCascade,
  splitDeadCapCharge,
  v36CapHit,
  v36CashPaid,
  v36DeadIfCut,
} from './contract-helpers';
import { makePlayer, makeTeam } from './test-helpers';

function cloneContract(contract: Contract): Contract {
  return structuredClone(contract);
}

describe('contract-helpers direct coverage', () => {
  it('reports signing-season cash differently from later cash paid', () => {
    const contract = makeContract(12, 4, 16, 20, 'cash-1', 'team-1');

    expect(v36CashPaid(contract, 0, true)).toBe(28);
    expect(v36CashPaid(contract, 1, false)).toBe(12);
  });

  it('splits odd dead-cap charges after the regular-season deadline', () => {
    expect(splitDeadCapCharge(7, 'regular_season', 11)).toEqual({
      now: 3.5,
      next: 3.5,
      postDeadline: true,
    });
  });

  it('does not split dead-cap charges before the deadline or outside the regular season', () => {
    expect(splitDeadCapCharge(7, 'regular_season', 10)).toEqual({
      now: 7,
      next: 0,
      postDeadline: false,
    });
    expect(splitDeadCapCharge(7, 'offseason', 1)).toEqual({
      now: 7,
      next: 0,
      postDeadline: false,
    });
  });

  it('applies current and future dead-cap buckets to the team ledger', () => {
    const team = makeTeam('ledger', 'AFC', 'East', false, 80);

    applyDeadCapCharge(team, 2026, { now: 4.5, next: 2.5, postDeadline: true });

    expect(team.deadCap).toBe(4.5);
    expect(team.deadCapByYear[2026]).toBe(4.5);
    expect(team.deadCapByYear[2027]).toBe(2.5);
  });

  it('builds trade impact from an existing contract', () => {
    const contract = makeContract(18, 3, 9, 12, 'trade-1', 'team-1');

    const impact = calcTradeImpact({ contract });

    expect(impact.deadMoney).toBeGreaterThan(0);
    expect(impact.capSavings).toBe(v36CapHit(contract) - impact.deadMoney);
    expect(impact.newContract.baseSalary).toBe(18);
    expect(impact.newContract.years).toBe(3);
    expect(impact.newContract.signingBonus).toBe(0);
  });

  it('returns a minimal placeholder trade impact when no contract exists', () => {
    const impact = calcTradeImpact({ contract: null });

    expect(impact.deadMoney).toBe(0);
    expect(impact.capSavings).toBe(0);
    expect(impact.newContract.baseSalary).toBe(1);
    expect(impact.newContract.years).toBe(1);
  });

  it.each([
    ['rookie slot', () => {
      const slot = rookieSlotContract(1, 1);
      return makeContract(slot.salary, slot.years, slot.signingBonus, slot.guaranteed, 'rookie-1', 'team-1');
    }],
    ['vet minimum', () => makeContract(1.2, 1, 0, 0, 'vet-1', 'team-1')],
    ['max deal', () => makeContract(55, 5, 80, 120, 'max-1', 'team-1')],
  ] as const)('computes cap hit and cut dead money for a %s contract shape', (_label, buildContract) => {
    const contract = buildContract();

    expect(v36CapHit(contract)).toBeCloseTo(contract.baseSalary + contract.prorated, 5);
    expect(v36DeadIfCut(contract)).toBeGreaterThanOrEqual(0);
  });

  it('prefers explicit bonus slices when calculating dead money', () => {
    const contract = cloneContract(makeContract(9, 3, 9, 6, 'slice-1', 'team-1'));
    contract.slices = [
      { sourceOp: 'signing', season: 0, amount: 1.5 },
      { sourceOp: 'restructure', season: 1, amount: 2.25 },
      { sourceOp: 'backload', season: 2, amount: 0.75 },
    ];

    expect(calcDeadMoneyFromSlices(contract)).toBe(4.5);
  });

  it('adds void years without exceeding the three-year cap', () => {
    const contract = makeContract(14, 4, 24, 20, 'void-1', 'team-1');
    const player = { contract };

    const first = addVoidYears(player, 2);
    const second = addVoidYears(player, 3);

    expect(first.ok).toBe(true);
    expect(first.newHit).toBeLessThan(v36CapHit(makeContract(14, 4, 24, 20, 'void-1b', 'team-1')));
    expect(second.ok).toBe(true);
    expect(second.voidYears).toBe(3);
  });

  it('restructures the highest-salary eligible contracts first until savings are met', () => {
    const team = makeTeam('cascade', 'NFC', 'North', false, 78);
    const high = makePlayer('high-salary', team.id, 'QB', 82);
    const mid = makePlayer('mid-salary', team.id, 'WR', 78);
    const low = makePlayer('low-salary', team.id, 'RB', 74);
    high.contract = makeContract(20, 3, 6, 10, high.id, team.id);
    mid.contract = makeContract(12, 3, 3, 6, mid.id, team.id);
    low.contract = makeContract(2, 1, 0, 0, low.id, team.id);
    team.roster = [mid, low, high];

    const result = restructureCascade(team, 8);

    expect(result.totalSaved).toBeGreaterThanOrEqual(8);
    expect(result.playersRestructured).toEqual([high.name]);
    expect(high.contract?.restructured).toBe(true);
    expect(mid.contract?.restructured).toBe(false);
    expect(low.contract?.restructured).toBe(false);
  });

  it('returns no savings when every contract is ineligible for a restructure cascade', () => {
    const team = makeTeam('cascade-none', 'NFC', 'West', false, 74);
    const oneYear = makePlayer('one-year', team.id, 'QB', 72);
    oneYear.contract = makeContract(10, 1, 0, 0, oneYear.id, team.id);
    const tinyBase = makePlayer('tiny-base', team.id, 'RB', 70);
    tinyBase.contract = makeContract(2, 3, 0, 0, tinyBase.id, team.id);
    const alreadyDone = makePlayer('already-done', team.id, 'WR', 71);
    alreadyDone.contract = makeContract(9, 3, 3, 4, alreadyDone.id, team.id);
    alreadyDone.contract.restructured = true;
    team.roster = [oneYear, tinyBase, alreadyDone];

    const result = restructureCascade(team, 5);

    expect(result).toEqual({
      totalSaved: 0,
      playersRestructured: [],
    });
  });
});
