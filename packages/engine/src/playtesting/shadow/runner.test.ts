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

  // The 5y baseline smoke that USED to live here ran the full 5-year sim
  // (~120-160s) and tripped Vitest 3.x's internal worker-RPC `onTaskUpdate`
  // timeout (~120s, hardcoded, not configurable). The verification it provided
  // — that runShadowScenario returns a populated PlaytestReport for
  // `speedrunner-5y` — is fully covered by `pnpm test:shadow`, which runs all
  // three baselines (5y / 10y / 20y) through `mfd/scripts/shadow-regression.ts`
  // and asserts byte-identical match to frozen golden JSON. That's strictly
  // stronger than this smoke ever was, and it doesn't use vitest's worker IPC.
  // Lookup/error-path tests above stay here; full-sim verification stays in
  // `pnpm test:shadow`. See .codex/MFD/changelog.md 2026-04-29 for context.
});
