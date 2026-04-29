/**
 * Shadow regression scenarios — multi-decade horizons, frozen baselines.
 *
 * Each scenario advances `seasons` years of franchise sim through a single
 * persona at a stable seed. The full PlaytestReport is captured and stored
 * as a canonical JSON baseline under `_canon/seeds/mfd/<id>.json`, with a
 * sibling `<id>.meta.json` tracking corpus / engine / schema version.
 *
 * Why three durations: short / medium / long horizons surface different
 * failure modes. Five-year drift catches contract math and roster turnover;
 * twenty-year drift catches HoF accumulation, record book overflow, and
 * generational regression that ten-year runs hide.
 */
import type { PlaytestPersona } from '../types';

export interface ShadowScenarioDefinition {
  id: string;
  personaId: PlaytestPersona['id'];
  seed: number;
  seasons: number;
}

export const SHADOW_SCENARIOS: readonly ShadowScenarioDefinition[] = Object.freeze([
  Object.freeze({ id: 'speedrunner-5y', personaId: 'SPEEDRUNNER', seed: 42, seasons: 5 }),
  Object.freeze({ id: 'speedrunner-10y', personaId: 'SPEEDRUNNER', seed: 42, seasons: 10 }),
  Object.freeze({ id: 'speedrunner-20y', personaId: 'SPEEDRUNNER', seed: 42, seasons: 20 }),
]);

export function getShadowScenario(id: string): ShadowScenarioDefinition | undefined {
  return SHADOW_SCENARIOS.find((scenario) => scenario.id === id);
}
