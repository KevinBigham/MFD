import { MAX_PLAYTEST_STEPS } from './harness';
import {
  LONG_HORIZON_QUALITY_BENCHMARKS,
  evaluateLongHorizonQualityBenchmark,
  getLongHorizonQualityBenchmark,
  runLongHorizonQualityBenchmark,
} from './quality-benchmarks';
import { PLAYTEST_PERSONAS } from './personas';
import type { PlaytestAnomaly, PlaytestReport } from './types';

function makeReport(overrides: Partial<PlaytestReport> = {}): PlaytestReport {
  return {
    personaId: 'SPEEDRUNNER',
    personaLabel: 'Speedrunner',
    seed: 42,
    seasonsRequested: 25,
    seasonsCompleted: 25,
    weeksAdvanced: 2000,
    anomalyCount: 0,
    highSeverityCount: 0,
    anomalies: [],
    certification: {
      completedRequestedSeasons: true,
      healthyStarterShortageGameWeeks: 0,
      healthyStarterShortages: [],
      cpuTransactionCount: 10,
      receiptBackedCpuTransactionCount: 10,
      cpuReceiptCoverage: 1,
      zeroHighSeverityAnomalies: true,
      certified: true,
    },
    ...overrides,
  };
}

function makeAnomaly(overrides: Partial<PlaytestAnomaly>): PlaytestAnomaly {
  return {
    detectorId: 'cap-sanity',
    severity: 'high',
    detail: 'Cap sanity failed.',
    reproSeed: 42,
    step: 10,
    year: 2030,
    week: 1,
    phase: 'regular_season',
    ...overrides,
  };
}

describe('long-horizon quality benchmarks', () => {
  it('defines a release-gate sentinel plus explicit GOAT 25y and 50y profiles', () => {
    expect(LONG_HORIZON_QUALITY_BENCHMARKS.map((benchmark) => benchmark.id)).toEqual([
      'goat-release-sentinel',
      'goat-25y',
      'goat-50y',
    ]);

    for (const benchmark of LONG_HORIZON_QUALITY_BENCHMARKS) {
      expect(benchmark.personaId).toBe('SPEEDRUNNER');
      expect(benchmark.seed).toBe(42);
      expect(benchmark.saveRoundTripEvery).toBe(10);
      expect(PLAYTEST_PERSONAS.some((persona) => persona.id === benchmark.personaId)).toBe(true);
    }

    const releaseSentinel = getLongHorizonQualityBenchmark('goat-release-sentinel')!;
    expect(releaseSentinel.seasons).toBe(4);
    expect(releaseSentinel.maxSteps).toBeLessThanOrEqual(MAX_PLAYTEST_STEPS);
    expect(releaseSentinel.budgets.find((budget) => budget.area === 'roster-balance')?.maxAnomalies).toBe(120);

    for (const benchmark of LONG_HORIZON_QUALITY_BENCHMARKS.filter((entry) => entry.id !== 'goat-release-sentinel')) {
      expect(benchmark.maxSteps).toBeGreaterThan(MAX_PLAYTEST_STEPS);
    }
  });

  it('maps the original GOAT long-horizon domains to detector budgets', () => {
    const benchmark = getLongHorizonQualityBenchmark('goat-25y')!;

    expect(benchmark.budgets.map((budget) => budget.area)).toEqual([
      'economy',
      'cap-health',
      'roster-balance',
      'records',
      'player-ages',
      'draft-flow',
      'injuries',
      'awards',
      'bloodlines',
      'save-roundtrip',
      'determinism',
    ]);
    expect(benchmark.budgets.every((budget) => budget.maxHighSeverity === 0)).toBe(true);
  });

  it('passes when the report completes the requested seasons and all budgets are clean', () => {
    const benchmark = getLongHorizonQualityBenchmark('goat-25y')!;
    const result = evaluateLongHorizonQualityBenchmark(benchmark, makeReport());

    expect(result.completedRequestedSeasons).toBe(true);
    expect(result.hardCertificationPassed).toBe(true);
    expect(result.checks.every((check) => check.passed)).toBe(true);
    expect(result.passed).toBe(true);
  });

  it('fails when a hard ecology threshold fails even inside diagnostic anomaly budgets', () => {
    const benchmark = getLongHorizonQualityBenchmark('goat-25y')!;
    const result = evaluateLongHorizonQualityBenchmark(benchmark, makeReport({
      certification: {
        completedRequestedSeasons: true,
        healthyStarterShortageGameWeeks: 1,
        healthyStarterShortages: [{
          gameId: 'shortage-game',
          homeTeamId: 'home',
          awayTeamId: 'away',
          year: 2030,
          week: 1,
          positions: { OL: 1 },
          teams: { home: { OL: 1 } },
        }],
        cpuTransactionCount: 10,
        receiptBackedCpuTransactionCount: 10,
        cpuReceiptCoverage: 1,
        zeroHighSeverityAnomalies: true,
        certified: false,
      },
    }));

    expect(result.checks.every((check) => check.passed)).toBe(true);
    expect(result.hardCertificationPassed).toBe(false);
    expect(result.passed).toBe(false);
  });

  it('fails when the higher step cap still does not complete the requested seasons', () => {
    const benchmark = getLongHorizonQualityBenchmark('goat-25y')!;
    const result = evaluateLongHorizonQualityBenchmark(benchmark, makeReport({
      seasonsCompleted: 24,
      anomalies: [makeAnomaly({ detectorId: 'harness-guard' })],
      anomalyCount: 1,
      highSeverityCount: 1,
    }));

    expect(result.completedRequestedSeasons).toBe(false);
    expect(result.passed).toBe(false);
  });

  it('fails the named budget when a covered detector emits an anomaly', () => {
    const benchmark = getLongHorizonQualityBenchmark('goat-25y')!;
    const result = evaluateLongHorizonQualityBenchmark(benchmark, makeReport({
      anomalies: [makeAnomaly({ detectorId: 'bloodline-sanity' })],
      anomalyCount: 1,
      highSeverityCount: 1,
    }));

    const bloodlineCheck = result.checks.find((check) => check.area === 'bloodlines');
    expect(bloodlineCheck?.passed).toBe(false);
    expect(bloodlineCheck?.anomalyCount).toBe(1);
    expect(result.passed).toBe(false);
  });

  it('passes progress callbacks through benchmark runs', () => {
    const benchmark = {
      ...getLongHorizonQualityBenchmark('goat-25y')!,
      id: 'goat-25y' as const,
      seasons: 1,
      maxSteps: 100,
    };
    const seasonsCompleted: number[] = [];

    const result = runLongHorizonQualityBenchmark(benchmark, {
      performanceNow: () => 0,
      onProgress: (event) => {
        seasonsCompleted.push(event.seasonsCompleted);
      },
    });

    expect(result.report.seasonsCompleted).toBe(1);
    expect(seasonsCompleted).toEqual([1]);
  });
});
