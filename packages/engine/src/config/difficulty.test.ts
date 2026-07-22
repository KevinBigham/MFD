import { describe, expect, it } from 'vitest';
import type { DifficultyLevel } from '../types';
import { DIFF_SETTINGS, getDefaultDifficultyFlags, getDefaultHalftimeDecisionSetting } from './difficulty';

const DIFFICULTIES = ['rookie', 'pro', 'allpro', 'legend'] as const satisfies readonly DifficultyLevel[];

const EXPECTED_HALFTIME_DEFAULTS: Record<DifficultyLevel, 'on' | 'off'> = {
  rookie: 'off',
  pro: 'on',
  allpro: 'on',
  legend: 'on',
};

describe('difficulty defaults', () => {
  it('keeps the four launch difficulty ids in stable order', () => {
    expect(Object.keys(DIFF_SETTINGS)).toEqual([...DIFFICULTIES]);
  });

  it.each(DIFFICULTIES)('defines display copy for %s', (difficulty) => {
    expect(DIFF_SETTINGS[difficulty].name.length).toBeGreaterThan(0);
    expect(DIFF_SETTINGS[difficulty].desc.length).toBeGreaterThan(0);
  });

  it.each(DIFFICULTIES)('defines numeric tuning knobs for %s', (difficulty) => {
    const settings = DIFF_SETTINGS[difficulty];

    expect(Number.isFinite(settings.tradeMod)).toBe(true);
    expect(Number.isFinite(settings.injMod)).toBe(true);
    expect(Number.isFinite(settings.ownerMod)).toBe(true);
    expect(Number.isFinite(settings.aiBidMod)).toBe(true);
    expect(Number.isFinite(settings.clutchSwing)).toBe(true);
    expect(Number.isFinite(settings.moraleMod)).toBe(true);
    expect(Number.isFinite(settings.staffBudget)).toBe(true);
    expect(Number.isFinite(settings.startCash)).toBe(true);
    expect(Number.isFinite(settings.foBudget)).toBe(true);
  });

  it.each(DIFFICULTIES)('returns only the halftime default flag for %s', (difficulty) => {
    expect(Object.keys(getDefaultDifficultyFlags(difficulty))).toEqual(['skipHalftimeDecision']);
  });

  it.each(DIFFICULTIES)('does not expose the removed CPU-games default for %s', (difficulty) => {
    const removedFlag = ['skipCpu', 'Games'].join('');

    expect(getDefaultDifficultyFlags(difficulty)).not.toHaveProperty(removedFlag);
  });

  it.each(DIFFICULTIES)('sets skipHalftimeDecision correctly for %s', (difficulty) => {
    expect(getDefaultDifficultyFlags(difficulty).skipHalftimeDecision).toBe(difficulty === 'rookie');
  });

  it.each(DIFFICULTIES)('derives the persisted halftime setting for %s', (difficulty) => {
    expect(getDefaultHalftimeDecisionSetting(difficulty)).toBe(EXPECTED_HALFTIME_DEFAULTS[difficulty]);
  });

  it('returns fresh flag objects so callers cannot mutate shared defaults', () => {
    const left = getDefaultDifficultyFlags('rookie');
    const right = getDefaultDifficultyFlags('rookie');

    expect(left).toEqual(right);
    expect(left).not.toBe(right);
  });

  it('keeps pro as the neutral tuning baseline', () => {
    expect(DIFF_SETTINGS.pro.tradeMod).toBe(1);
    expect(DIFF_SETTINGS.pro.injMod).toBe(1);
    expect(DIFF_SETTINGS.pro.ownerMod).toBe(1);
    expect(DIFF_SETTINGS.pro.moraleMod).toBe(1);
  });

  it('keeps rookie as the only tier with setup skips', () => {
    const skipTiers = DIFFICULTIES.filter((difficulty) => getDefaultDifficultyFlags(difficulty).skipHalftimeDecision);

    expect(skipTiers).toEqual(['rookie']);
  });

  it('orders the wired resource and pressure knobs from forgiving to demanding', () => {
    expect(DIFF_SETTINGS.rookie.tradeMod).toBeLessThan(DIFF_SETTINGS.pro.tradeMod);
    expect(DIFF_SETTINGS.legend.tradeMod).toBeGreaterThan(DIFF_SETTINGS.allpro.tradeMod);
    expect(DIFF_SETTINGS.rookie.ownerMod).toBeLessThan(DIFF_SETTINGS.pro.ownerMod);
    expect(DIFF_SETTINGS.legend.ownerMod).toBeGreaterThan(DIFF_SETTINGS.allpro.ownerMod);
    expect(DIFF_SETTINGS.rookie.staffBudget).toBeGreaterThan(DIFF_SETTINGS.legend.staffBudget);
    expect(DIFF_SETTINGS.rookie.startCash).toBeGreaterThan(DIFF_SETTINGS.legend.startCash);
    expect(DIFF_SETTINGS.rookie.foBudget).toBeGreaterThan(DIFF_SETTINGS.legend.foBudget);
  });
});
