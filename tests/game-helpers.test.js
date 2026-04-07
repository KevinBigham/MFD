import { describe, expect, it } from 'vitest';

import {
  attributeCause,
  calcFatigueMultiplier,
  calcGameScriptMult,
  calcWeekDeltas,
} from '../src/systems/game-helpers.js';

describe('game-helpers.js', () => {
  it('calcFatigueMultiplier responds to usage tiers', () => {
    expect(calcFatigueMultiplier(90, 100)).toBe(0.92);
    expect(calcFatigueMultiplier(75, 100)).toBe(0.96);
    expect(calcFatigueMultiplier(60, 100)).toBe(1.0);
    expect(calcFatigueMultiplier(10, 0)).toBe(1.0);
  });

  it('calcGameScriptMult applies score-state role modifiers', () => {
    expect(calcGameScriptMult(35, 14, 'RB', 'rb1')).toBe(1.15);
    expect(calcGameScriptMult(10, 28, 'WR', 'wr_slot')).toBe(1.12);
    expect(calcGameScriptMult(10, 18, 'WR', 'wr_slot')).toBe(1.06);
    expect(calcGameScriptMult(21, 20, 'QB', 'starter')).toBe(1.0);
  });

  it('calcWeekDeltas returns only meaningful metric changes', () => {
    const deltas = calcWeekDeltas(
      { pressureRate: 60, turnovers: 4, rzEff: 52, coverageWin: 50, runLaneAdv: 48 },
      { pressureRate: 50, turnovers: 1, rzEff: 50, coverageWin: 49, runLaneAdv: 54 }
    );
    expect(deltas.map((d) => d.key).sort()).toEqual(['pressureRate', 'runLaneAdv', 'turnovers']);
    expect(deltas.find((d) => d.key === 'turnovers').good).toBe(false);
  });

  it('attributeCause prioritizes most relevant ledger entries', () => {
    const delta = { key: 'turnovers' };
    const ledger = [
      { type: 'LOCKER_CHOICE', detail: {} },
      { type: 'FIX_APPLIED', detail: { fix: 'conservative' } },
      { type: 'TRADE', detail: {} },
    ];
    const out = attributeCause(delta, ledger);
    expect(out.cause).toContain('Fix: conservative');
    expect(out.confidence).toBe('HIGH');
    expect(out.proofs.length).toBeGreaterThan(0);
  });
});
