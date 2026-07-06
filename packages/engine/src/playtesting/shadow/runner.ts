/**
 * Shadow regression runner — wraps runPlaytest at multi-decade horizons.
 *
 * Output is the full PlaytestReport (canonical JSON via canonicalJsonStringify).
 * Anomalies retain their per-step year/week/phase, so the diff formatter can
 * identify the divergent week without per-step instrumentation here.
 */
import { canonicalJsonStringify } from '../anomaly-detectors';
import { runPlaytest } from '../harness';
import { getPlaytestPersona } from '../personas';
import type { PlaytestReport } from '../types';
import { SHADOW_SCENARIOS, getShadowScenario } from './scenarios';

export interface ShadowRunResult {
  scenarioId: string;
  report: PlaytestReport;
  canonicalJson: string;
}

export function runShadowScenario(scenarioId: string): ShadowRunResult {
  const scenario = getShadowScenario(scenarioId);
  if (!scenario) {
    throw new Error(`Unknown shadow scenario: ${scenarioId}. Known: ${getKnownScenarioIds().join(', ')}`);
  }
  const persona = getPlaytestPersona(scenario.personaId);
  if (!persona) {
    throw new Error(`Shadow scenario "${scenarioId}" references unknown persona ${scenario.personaId}`);
  }

  const report = runPlaytest(persona, scenario.seed, scenario.seasons);
  const canonicalJson = canonicalJsonStringify(report);

  return {
    scenarioId,
    report,
    canonicalJson,
  };
}

function getKnownScenarioIds(): readonly string[] {
  return SHADOW_SCENARIOS.map((scenario) => scenario.id);
}
