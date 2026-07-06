import { beforeEach, describe, expect, it } from 'vitest';
import { RNG, setSeed } from '../rng';
import type { OwnerArchetypeId } from '../types';
import {
  FURIOUS_PENALTIES,
  calcConfidenceArc,
  checkHotSeat,
  generateUltimatums,
  getPatienceStatus,
  tickPatience,
} from './owner-extended';

const ULTIMATUM_IDS = ['trade_worst', 'fire_coord', 'cut_payroll'];

describe('owner-extended patience tracking', () => {
  it('uses archetype-specific gains and drains while clamping the final patience', () => {
    expect(tickPatience(50, 'win_now', 'win', {})).toEqual({ patience: 62, delta: 12 });
    expect(tickPatience(50, 'patient_builder', 'win', {})).toEqual({ patience: 56, delta: 6 });
    expect(tickPatience(50, 'patient_builder', 'loss', {})).toEqual({ patience: 48, delta: -2 });
    expect(tickPatience(90, 'win_now', 'win', {})).toEqual({ patience: 100, delta: 10 });
    expect(tickPatience(3, 'win_now', 'loss', {})).toEqual({ patience: 0, delta: -3 });
  });

  it('stacks playoff, appearance, streak, and week-nine checkpoint modifiers in order', () => {
    expect(tickPatience(40, 'legacy_builder', 'win', {
      isPlayoff: true,
      playoffAppearance: true,
      streak: 3,
      week: 9,
      winPct: 0.5,
    })).toEqual({ patience: 76, delta: 36 });

    expect(tickPatience(40, 'profit_first', 'loss', {
      isPlayoff: true,
      streak: -3,
      week: 9,
      winPct: 0.5,
    })).toEqual({ patience: 34, delta: -6 });
  });

  it('applies first-season drain relief before playoff loss and losing-streak penalties', () => {
    expect(tickPatience(50, 'legacy_builder', 'loss', {
      firstSeason: true,
      isPlayoff: true,
      streak: -3,
    })).toEqual({ patience: 43, delta: -7 });
  });

  it('falls back to neutral gain and drain rates for unknown archetypes', () => {
    const unknown = 'new_owner_style' as OwnerArchetypeId;

    expect(tickPatience(50, unknown, 'win', {})).toEqual({ patience: 58, delta: 8 });
    expect(tickPatience(50, unknown, 'loss', {})).toEqual({ patience: 46, delta: -4 });
  });

  it('labels patience status at exact threshold boundaries', () => {
    expect(getPatienceStatus(75)).toEqual({ label: 'Very Patient', color: 'green' });
    expect(getPatienceStatus(74)).toEqual({ label: 'Stable', color: 'slate' });
    expect(getPatienceStatus(50)).toEqual({ label: 'Stable', color: 'slate' });
    expect(getPatienceStatus(49)).toEqual({ label: 'Running Thin', color: 'amber' });
    expect(getPatienceStatus(30)).toEqual({ label: 'Running Thin', color: 'amber' });
    expect(getPatienceStatus(29)).toEqual({ label: 'On Edge', color: 'red' });
  });
});

describe('owner-extended confidence arc', () => {
  it('weights patience more than owner mood and returns stage metadata', () => {
    expect(calcConfidenceArc(80, 40)).toEqual({
      score: 66,
      stage: 'RESTLESS',
      severity: 1,
      nextTarget: 70,
    });
  });

  it('uses exact stage thresholds for the four-stage arc', () => {
    expect(calcConfidenceArc(70, 70)).toEqual({ score: 70, stage: 'PATIENT', severity: 0, nextTarget: 70 });
    expect(calcConfidenceArc(50, 50)).toEqual({ score: 50, stage: 'RESTLESS', severity: 1, nextTarget: 70 });
    expect(calcConfidenceArc(30, 30)).toEqual({ score: 30, stage: 'DEMANDING', severity: 2, nextTarget: 50 });
    expect(calcConfidenceArc(29, 29)).toEqual({ score: 29, stage: 'ULTIMATUM', severity: 3, nextTarget: 30 });
  });

  it('clamps invalid patience and mood inputs before scoring', () => {
    expect(calcConfidenceArc(-20, 200)).toEqual({
      score: 35,
      stage: 'DEMANDING',
      severity: 2,
      nextTarget: 50,
    });
  });
});

describe('owner-extended ultimatums', () => {
  beforeEach(() => setSeed(42));

  it('returns the requested number of unique ultimatums up to the pool size', () => {
    const ultimatums = generateUltimatums(10);

    expect(ultimatums).toHaveLength(3);
    expect(new Set(ultimatums.map((ultimatum) => ultimatum.id)).size).toBe(3);
    expect(ultimatums.map((ultimatum) => ultimatum.id).sort()).toEqual([...ULTIMATUM_IDS].sort());
  });

  it('supports zero, negative, and default counts', () => {
    expect(generateUltimatums(0)).toEqual([]);
    expect(generateUltimatums(-1)).toEqual([]);
    expect(generateUltimatums()).toHaveLength(2);
  });

  it('is deterministic for the same seed and consumes only the AI channel', () => {
    setSeed(91);
    const nextPlayWithoutUltimatum = RNG.play();

    setSeed(91);
    const first = generateUltimatums(3).map((ultimatum) => ultimatum.id);
    const nextPlayAfterUltimatum = RNG.play();

    setSeed(91);
    const second = generateUltimatums(3).map((ultimatum) => ultimatum.id);

    expect(first).toEqual(second);
    expect(nextPlayAfterUltimatum).toBe(nextPlayWithoutUltimatum);
  });

  it('returns cloned ultimatum objects so callers cannot mutate the pool', () => {
    setSeed(22);
    const [first] = generateUltimatums(1);
    const originalLabel = first!.label;
    first!.label = 'Mutated by caller';

    setSeed(22);
    const [again] = generateUltimatums(1);

    expect(again).not.toBe(first);
    expect(again!.label).toBe(originalLabel);
  });
});

describe('owner-extended hot seat and penalties', () => {
  it('reports the severe hot seat only when mood and patience are both below critical thresholds', () => {
    expect(checkHotSeat(24, 29)).toEqual({
      onHotSeat: true,
      reason: 'Owner furious and out of patience.',
      severity: 3,
    });

    expect(checkHotSeat(25, 29)).toEqual({
      onHotSeat: true,
      reason: 'Owner mood critically low.',
      severity: 2,
    });
  });

  it('reports moderate hot-seat reasons for low mood or low patience alone', () => {
    expect(checkHotSeat(34, 80)).toEqual({
      onHotSeat: true,
      reason: 'Owner mood critically low.',
      severity: 2,
    });

    expect(checkHotSeat(40, 39)).toEqual({
      onHotSeat: true,
      reason: 'Owner patience running out.',
      severity: 2,
    });

    expect(checkHotSeat(35, 40)).toEqual({ onHotSeat: false, reason: '', severity: 0 });
  });

  it('exports the furious penalty catalog consumed by owner pressure surfaces', () => {
    expect(FURIOUS_PENALTIES).toEqual([
      { id: 'fa_tax', label: 'FA Tax', effect: { faCostMult: 1.15 } },
      { id: 'trade_penalty', label: 'Trade Penalty', effect: { tradeTrustPenalty: -5 } },
      { id: 'budget_cut', label: 'Budget Cut', effect: { scoutBudgetMult: 0.75 } },
    ]);
  });
});
