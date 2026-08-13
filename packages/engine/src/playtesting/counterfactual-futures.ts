import type { DecisionReceipt, GameState } from '../types';
import { acceptTradeOffer } from '../systems/trade-market';
import { advanceFranchiseWeek } from '../systems/franchise-week';
import { resolvePlaytestCBAActions, resolvePlaytestExpansionDraft } from './harness';
import { finalizeDeadline } from '../systems/trade-deadline';

export interface CounterfactualTradeScenario { id: string; label: string; teamId: string; offerId: string }
export interface CounterfactualRunOptions { seed: number; samples: number; horizonSeasons: 1 }
export interface FutureMetrics { wins: number; losses: number; capSpace: number }
export interface MetricDistribution { min: number; p10: number; median: number; mean: number; p90: number; max: number }
export interface CounterfactualComparison {
  scenarioId: string; seed: number; samples: number; horizonSeasons: 1;
  baseline: Record<keyof FutureMetrics, MetricDistribution>;
  treatment: Record<keyof FutureMetrics, MetricDistribution>;
  delta: Record<keyof FutureMetrics, MetricDistribution>;
  replaySeeds: number[]; replayIds: string[]; receipt: DecisionReceipt;
}
export interface CounterfactualFailure { ok: false; reason: string; nextState: GameState; receipt: null }
export type CounterfactualResult = { ok: true; comparison: CounterfactualComparison } | CounterfactualFailure;

const METRICS: Array<keyof FutureMetrics> = ['wins', 'losses', 'capSpace'];
function clone(state: GameState): GameState { return structuredClone(state); }
function hash(root: number, scenario: string, sample: number): number {
  let h = (root | 0) ^ 0x9e3779b9;
  for (let i = 0; i < scenario.length; i += 1) h = Math.imul(h ^ scenario.charCodeAt(i), 16777619);
  h = Math.imul(h ^ sample, 2246822519); return (h ^ (h >>> 16)) >>> 0;
}
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) throw new Error('Cannot summarize an empty distribution');
  const index = (sorted.length - 1) * p; const lower = Math.floor(index); const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower]!;
  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (index - lower);
}
function distribution(values: number[]): MetricDistribution {
  if (!values.length || values.some((value) => !Number.isFinite(value))) throw new Error('Metric values must be finite');
  const sorted = [...values].sort((a, b) => a - b);
  return { min: sorted[0]!, p10: percentile(sorted, .1), median: percentile(sorted, .5), mean: values.reduce((a, b) => a + b, 0) / values.length, p90: percentile(sorted, .9), max: sorted.at(-1)! };
}
function metrics(state: GameState, teamId: string): FutureMetrics {
  const team = state.teams[teamId]; if (!team) throw new Error(`Team ${teamId} does not exist`);
  return { wins: team.wins, losses: team.losses, capSpace: team.capSpace };
}
function runTrajectory(input: GameState, teamId: string, seed: number): FutureMetrics {
  let state = clone(input); state.seed = seed; const targetYear = state.year + 1; let steps = 0;
  while (state.year < targetYear && steps < 220) {
    state = resolvePlaytestCBAActions(resolvePlaytestExpansionDraft(state));
    if (state.tradeDeadlineState) state = finalizeDeadline(state, state.tradeDeadlineState);
    state = advanceFranchiseWeek(state, { mutateInPlace: false, skipExpansionDraft: true, playtestBias: { advanceOnly: true } }).nextState;
    steps += 1;
  }
  if (state.year < targetYear) throw new Error('Horizon did not complete within 220 weekly advances');
  return metrics(state, teamId);
}
function summarize(rows: FutureMetrics[]): Record<keyof FutureMetrics, MetricDistribution> {
  return Object.fromEntries(METRICS.map((metric) => [metric, distribution(rows.map((row) => row[metric]))])) as Record<keyof FutureMetrics, MetricDistribution>;
}
export function runCounterfactualFutures(input: GameState, scenario: CounterfactualTradeScenario, options: CounterfactualRunOptions): CounterfactualResult {
  if (!Number.isInteger(options.samples) || options.samples < 1) return { ok: false, reason: 'samples must be a positive integer', nextState: clone(input), receipt: null };
  if (options.horizonSeasons !== 1) return { ok: false, reason: 'Wave 1 supports horizonSeasons=1 only', nextState: clone(input), receipt: null };
  if (!input.teams[scenario.teamId]) return { ok: false, reason: `Team ${scenario.teamId} does not exist`, nextState: clone(input), receipt: null };
  const treatment = acceptTradeOffer(clone(input), scenario.offerId);
  if (!treatment.ok) return { ok: false, reason: treatment.reason, nextState: clone(input), receipt: null };
  const baselineRows: FutureMetrics[] = []; const treatmentRows: FutureMetrics[] = []; const deltaRows: FutureMetrics[] = []; const replaySeeds: number[] = [];
  for (let sample = 0; sample < options.samples; sample += 1) { const replaySeed = hash(options.seed, scenario.id, sample); replaySeeds.push(replaySeed); const baseline = runTrajectory(input, scenario.teamId, replaySeed); const treated = runTrajectory(treatment.nextState, scenario.teamId, replaySeed); baselineRows.push(baseline); treatmentRows.push(treated); deltaRows.push({ wins: treated.wins - baseline.wins, losses: treated.losses - baseline.losses, capSpace: treated.capSpace - baseline.capSpace }); }
  const baseline = summarize(baselineRows); const treated = summarize(treatmentRows); const delta = summarize(deltaRows);
  return { ok: true, comparison: { scenarioId: scenario.id, seed: options.seed, samples: options.samples, horizonSeasons: 1, baseline, treatment: treated, delta, replaySeeds, replayIds: replaySeeds.map((seed, index) => `${scenario.id}:${index}:${seed}`), receipt: { id: `counterfactual-${scenario.id}-${options.seed}`, seasonWeek: { year: input.year, week: input.week }, teamId: scenario.teamId, decision: `Accepted trade offer ${scenario.offerId} for ${scenario.label}.`, drivers: [{ label: 'samples', value: options.samples, detail: 'Paired one-season trajectories.' }, { label: 'baseline median wins', value: baseline.wins.median, detail: 'Canonical team wins at horizon.' }, { label: 'treatment median wins', value: treated.wins.median, detail: 'Canonical team wins at horizon.' }, { label: 'delta median cap space', value: delta.capSpace.median, detail: 'Treatment minus baseline.' }], outcome: 'A paired one-season counterfactual distribution was simulated; it is evidence about this scenario, not a certainty.', counterfactual: `Baseline and treatment share replay seeds derived from ${options.seed}.`, eventRefs: [] } } };
}
export { distribution as summarizeMetricDistribution };
