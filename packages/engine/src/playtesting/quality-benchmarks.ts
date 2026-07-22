import { MAX_PLAYTEST_STEPS, runPlaytest } from './harness';
import type { PlaytestAnomaly, PlaytestPersona, PlaytestReport, PlaytestRunOptions } from './types';

export type LongHorizonQualityBenchmarkId = 'goat-release-sentinel' | 'goat-25y' | 'goat-50y';

export type LongHorizonQualityArea =
  | 'completion'
  | 'economy'
  | 'roster-balance'
  | 'records'
  | 'player-ages'
  | 'cap-health'
  | 'draft-flow'
  | 'injuries'
  | 'awards'
  | 'bloodlines'
  | 'save-roundtrip'
  | 'determinism';

export interface LongHorizonAnomalyBudget {
  area: LongHorizonQualityArea;
  detectorIds: readonly string[];
  maxAnomalies: number;
  maxHighSeverity: number;
  description: string;
}

export interface LongHorizonQualityBenchmark {
  id: LongHorizonQualityBenchmarkId;
  label: string;
  description: string;
  personaId: PlaytestPersona['id'];
  seed: number;
  seasons: number;
  maxSteps: number;
  saveRoundTripEvery: number;
  budgets: readonly LongHorizonAnomalyBudget[];
}

export interface LongHorizonBudgetCheck {
  area: LongHorizonQualityArea;
  detectorIds: readonly string[];
  anomalyCount: number;
  highSeverityCount: number;
  maxAnomalies: number;
  maxHighSeverity: number;
  passed: boolean;
  description: string;
}

export interface LongHorizonQualityBenchmarkResult {
  benchmark: LongHorizonQualityBenchmark;
  report: PlaytestReport;
  completedRequestedSeasons: boolean;
  hardCertificationPassed: boolean;
  checks: LongHorizonBudgetCheck[];
  passed: boolean;
}

export interface LongHorizonQualityBenchmarkRunOptions {
  onProgress?: PlaytestRunOptions['onProgress'];
  performanceNow: () => number;
}

function buildLongHorizonBudgets(rosterMinimumAnomalyBudget: number): readonly LongHorizonAnomalyBudget[] {
  return Object.freeze([
    Object.freeze({
      area: 'economy',
      detectorIds: ['cap-sanity'],
      maxAnomalies: 0,
      maxHighSeverity: 0,
      description: 'Cap-space, cap-used, and dead-cap values remain finite and in range.',
    }),
    Object.freeze({
      area: 'cap-health',
      detectorIds: ['cap-sanity'],
      maxAnomalies: 0,
      maxHighSeverity: 0,
      description: 'League cap fields stay usable across long saves.',
    }),
    Object.freeze({
      area: 'roster-balance',
      detectorIds: ['roster-minimums'],
      maxAnomalies: rosterMinimumAnomalyBudget,
      maxHighSeverity: 0,
      description: 'Every team keeps enough available players at starter-required positions; medium offseason-churn windows stay under budget.',
    }),
    Object.freeze({
      area: 'records',
      detectorIds: ['record-book-sanity'],
      maxAnomalies: 0,
      maxHighSeverity: 0,
      description: 'Record-book entries keep finite non-negative values and valid seasons.',
    }),
    Object.freeze({
      area: 'player-ages',
      detectorIds: ['player-age-sanity'],
      maxAnomalies: 0,
      maxHighSeverity: 0,
      description: 'Active players stay inside the long-save age bounds.',
    }),
    Object.freeze({
      area: 'draft-flow',
      detectorIds: ['phase-boundaries', 'monotonic-time', 'draft-class-sanity'],
      maxAnomalies: 0,
      maxHighSeverity: 0,
      description: 'Calendar, draft-class, and phase transitions remain deterministic and sane.',
    }),
    Object.freeze({
      area: 'injuries',
      detectorIds: ['injury-sanity'],
      maxAnomalies: 0,
      maxHighSeverity: 0,
      description: 'Injury timers, recovery counters, penalties, and reinjury risk stay bounded.',
    }),
    Object.freeze({
      area: 'awards',
      detectorIds: ['awards-sanity'],
      maxAnomalies: 0,
      maxHighSeverity: 0,
      description: 'Awards history avoids duplicate seasons/award ids and non-finite scores.',
    }),
    Object.freeze({
      area: 'bloodlines',
      detectorIds: ['bloodline-sanity'],
      maxAnomalies: 0,
      maxHighSeverity: 0,
      description: 'Bloodline players and prospects keep valid parent references.',
    }),
    Object.freeze({
      area: 'save-roundtrip',
      detectorIds: ['save-roundtrip'],
      maxAnomalies: 0,
      maxHighSeverity: 0,
      description: 'Every sampled state still migrates and validates to identical canonical bytes.',
    }),
    Object.freeze({
      area: 'determinism',
      detectorIds: ['rng-channel'],
      maxAnomalies: 0,
      maxHighSeverity: 0,
      description: 'Week advance does not call ambient Math.random.',
    }),
  ]);
}

export const LONG_HORIZON_QUALITY_BENCHMARKS: readonly LongHorizonQualityBenchmark[] = Object.freeze([
  Object.freeze({
    id: 'goat-release-sentinel',
    label: 'GOAT release-sentinel quality benchmark',
    description: 'Release-gate sentinel that runs a short SPEEDRUNNER frame through the long-horizon anomaly budget contract while multi-decade profiles stay opt-in.',
    personaId: 'SPEEDRUNNER',
    seed: 42,
    seasons: 4,
    maxSteps: MAX_PLAYTEST_STEPS,
    saveRoundTripEvery: 10,
    budgets: buildLongHorizonBudgets(120),
  }),
  Object.freeze({
    id: 'goat-25y',
    label: 'GOAT 25-season quality benchmark',
    description: 'Single-persona 25-season long-save confidence run with explicit zero-high anomaly budgets.',
    personaId: 'SPEEDRUNNER',
    seed: 42,
    seasons: 25,
    maxSteps: 2500,
    saveRoundTripEvery: 10,
    budgets: buildLongHorizonBudgets(750),
  }),
  Object.freeze({
    id: 'goat-50y',
    label: 'GOAT 50-season quality benchmark',
    description: 'Single-persona 50-season stress run for record-book, bloodline, age, roster, cap, and save durability.',
    personaId: 'SPEEDRUNNER',
    seed: 42,
    seasons: 50,
    maxSteps: 5000,
    saveRoundTripEvery: 10,
    budgets: buildLongHorizonBudgets(1500),
  }),
]);

export function getLongHorizonQualityBenchmark(id: string): LongHorizonQualityBenchmark | undefined {
  return LONG_HORIZON_QUALITY_BENCHMARKS.find((benchmark) => benchmark.id === id);
}

function anomalyMatchesBudget(anomaly: PlaytestAnomaly, budget: LongHorizonAnomalyBudget): boolean {
  return budget.detectorIds.some((detectorId) => detectorId === anomaly.detectorId);
}

export function evaluateLongHorizonQualityBenchmark(
  benchmark: LongHorizonQualityBenchmark,
  report: PlaytestReport,
): LongHorizonQualityBenchmarkResult {
  const checks = benchmark.budgets.map((budget) => {
    const anomalies = report.anomalies.filter((anomaly) => anomalyMatchesBudget(anomaly, budget));
    const highSeverityCount = anomalies.filter((anomaly) => anomaly.severity === 'high').length;
    const anomalyCount = anomalies.length;
    const passed = anomalyCount <= budget.maxAnomalies && highSeverityCount <= budget.maxHighSeverity;
    return {
      area: budget.area,
      detectorIds: budget.detectorIds,
      anomalyCount,
      highSeverityCount,
      maxAnomalies: budget.maxAnomalies,
      maxHighSeverity: budget.maxHighSeverity,
      passed,
      description: budget.description,
    } satisfies LongHorizonBudgetCheck;
  });
  const completedRequestedSeasons = report.seasonsCompleted >= benchmark.seasons;
  const hardCertificationPassed = report.certification.certified;
  return {
    benchmark,
    report,
    completedRequestedSeasons,
    hardCertificationPassed,
    checks,
    passed: completedRequestedSeasons && hardCertificationPassed && checks.every((check) => check.passed),
  };
}

export function runLongHorizonQualityBenchmark(
  benchmarkInput: LongHorizonQualityBenchmark | LongHorizonQualityBenchmarkId,
  options: LongHorizonQualityBenchmarkRunOptions,
): LongHorizonQualityBenchmarkResult {
  const benchmark = typeof benchmarkInput === 'string'
    ? getLongHorizonQualityBenchmark(benchmarkInput)
    : benchmarkInput;
  if (!benchmark) {
    throw new Error(`Unknown long-horizon quality benchmark: ${String(benchmarkInput)}`);
  }
  const report = runPlaytest(benchmark.personaId, benchmark.seed, benchmark.seasons, {
    maxSteps: benchmark.maxSteps,
    saveRoundTripEvery: benchmark.saveRoundTripEvery,
    measureStatePerformance: true,
    performanceNow: options.performanceNow,
    onProgress: options.onProgress,
  });
  return evaluateLongHorizonQualityBenchmark(benchmark, report);
}
