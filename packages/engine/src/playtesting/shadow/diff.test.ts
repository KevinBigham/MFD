import { describe, expect, it } from 'vitest';

import type { PlaytestAnomaly, PlaytestReport } from '../types';
import { diffShadowReports, formatShadowDiff } from './diff';

function anomaly(overrides: Partial<PlaytestAnomaly> = {}): PlaytestAnomaly {
  return {
    detectorId: 'roster-minimums',
    severity: 'medium',
    detail: 'afce1:CB=4/5',
    reproSeed: 42,
    step: 100,
    year: 2030,
    week: 5,
    phase: 'regular_season',
    ...overrides,
  };
}

function report(overrides: Partial<PlaytestReport> = {}): PlaytestReport {
  return {
    personaId: 'SPEEDRUNNER',
    personaLabel: 'Speedrunner',
    seed: 42,
    seasonsRequested: 5,
    seasonsCompleted: 5,
    weeksAdvanced: 140,
    anomalyCount: 0,
    highSeverityCount: 0,
    anomalies: [],
    ...overrides,
  };
}

describe('diffShadowReports', () => {
  it('returns matches=true when reports are identical', () => {
    const baseline = report({ anomalies: [anomaly()] });
    const actual = report({ anomalies: [anomaly()] });
    const diff = diffShadowReports('speedrunner-5y', baseline, actual);
    expect(diff.matches).toBe(true);
    expect(diff.entries).toHaveLength(0);
    expect(diff.divergentWeek).toBeNull();
  });

  it('flags scalar field differences with old/new values', () => {
    const baseline = report({ anomalyCount: 100 });
    const actual = report({ anomalyCount: 105 });
    const diff = diffShadowReports('speedrunner-5y', baseline, actual);
    expect(diff.matches).toBe(false);
    expect(diff.entries).toContainEqual({
      scenarioId: 'speedrunner-5y',
      field: 'anomalyCount',
      oldValue: 100,
      newValue: 105,
    });
  });

  it('captures the year/week of the first added anomaly as divergent week', () => {
    const baseline = report({ anomalies: [anomaly({ year: 2026, week: 3 })] });
    const actual = report({
      anomalies: [
        anomaly({ year: 2026, week: 3 }),
        anomaly({ year: 2029, week: 11, detectorId: 'cap-sanity', severity: 'high' }),
      ],
    });
    const diff = diffShadowReports('speedrunner-5y', baseline, actual);
    expect(diff.matches).toBe(false);
    expect(diff.divergentWeek).toEqual({ year: 2029, week: 11, phase: 'regular_season' });
  });

  it('reports the divergent week when an anomaly is removed', () => {
    const baseline = report({
      anomalies: [
        anomaly({ year: 2027, week: 4 }),
        anomaly({ year: 2028, week: 12 }),
      ],
    });
    const actual = report({ anomalies: [anomaly({ year: 2027, week: 4 })] });
    const diff = diffShadowReports('speedrunner-5y', baseline, actual);
    expect(diff.matches).toBe(false);
    expect(diff.divergentWeek).toEqual({ year: 2028, week: 12, phase: 'regular_season' });
  });

  it('walks nested anomaly fields and names changed keys per index', () => {
    const baseline = report({ anomalies: [anomaly({ severity: 'medium' })] });
    const actual = report({ anomalies: [anomaly({ severity: 'high' })] });
    const diff = diffShadowReports('speedrunner-5y', baseline, actual);
    expect(diff.entries).toContainEqual({
      scenarioId: 'speedrunner-5y',
      field: 'anomalies[0].severity',
      oldValue: 'medium',
      newValue: 'high',
    });
  });

  it('formats human-readable output with scenario, divergent week, and field changes', () => {
    const baseline = report({ anomalyCount: 5, anomalies: [anomaly()] });
    const actual = report({
      anomalyCount: 6,
      anomalies: [anomaly(), anomaly({ year: 2031, week: 8 })],
    });
    const diff = diffShadowReports('speedrunner-5y', baseline, actual);
    const formatted = formatShadowDiff(diff);
    expect(formatted).toContain('SHADOW FAIL: speedrunner-5y');
    expect(formatted).toContain('divergent: Y2031 W8');
    expect(formatted).toContain('anomalyCount: 5 -> 6');
  });

  it('returns SHADOW PASS string when reports match', () => {
    const baseline = report();
    const actual = report();
    const diff = diffShadowReports('speedrunner-5y', baseline, actual);
    expect(formatShadowDiff(diff)).toBe('SHADOW PASS: speedrunner-5y');
  });
});
