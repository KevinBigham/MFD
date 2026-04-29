import { describe, expect, it } from 'vitest';

import { SHADOW_SCENARIOS, getShadowScenario, runShadowScenario } from './index';

describe('shadow scenarios catalog', () => {
  it('exposes exactly three durations: 5, 10, and 20 years', () => {
    const seasons = SHADOW_SCENARIOS.map((scenario) => scenario.seasons).sort((a, b) => a - b);
    expect(seasons).toEqual([5, 10, 20]);
  });

  it('uses the SPEEDRUNNER persona for all baselines', () => {
    for (const scenario of SHADOW_SCENARIOS) {
      expect(scenario.personaId).toBe('SPEEDRUNNER');
    }
  });

  it('uses seed 42 across all baselines (matches fast tier)', () => {
    for (const scenario of SHADOW_SCENARIOS) {
      expect(scenario.seed).toBe(42);
    }
  });

  it('returns undefined for unknown scenario ids', () => {
    expect(getShadowScenario('nonexistent')).toBeUndefined();
  });
});

describe('runShadowScenario', () => {
  it('rejects an unknown scenario id with a list of known ids', () => {
    expect(() => runShadowScenario('mystery-scenario')).toThrow(/Unknown shadow scenario/);
  });

  it('runs the 5-year baseline and returns a populated PlaytestReport', { timeout: 240_000 }, () => {
    const result = runShadowScenario('speedrunner-5y');
    expect(result.scenarioId).toBe('speedrunner-5y');
    expect(result.report.seasonsCompleted).toBe(5);
    expect(result.report.personaId).toBe('SPEEDRUNNER');
    expect(result.report.seed).toBe(42);
    expect(result.report.weeksAdvanced).toBeGreaterThan(100);
    expect(result.canonicalJson.length).toBeGreaterThan(0);
    // Deeper determinism (multi-run byte-equality) is verified end-to-end by
    // `pnpm test:shadow`, which compares against the frozen baseline JSON.
  });
});
