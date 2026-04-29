/**
 * Shadow regression diff — field-level comparison of two PlaytestReports.
 *
 * Output names: scenario id, changed field, old value, new value, divergent
 * week (year + week + phase from the first changed anomaly, when available).
 *
 * Per §5.5 baseline_update_protocol: divergence is a finding, not a chore.
 * This module produces the human-readable artifact the reviewer reads to
 * classify intended vs. unintended.
 */
import type { PlaytestAnomaly, PlaytestReport } from '../types';

export interface ShadowDiffEntry {
  scenarioId: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface ShadowDiffResult {
  scenarioId: string;
  matches: boolean;
  entries: ShadowDiffEntry[];
  divergentWeek: { year: number; week: number; phase: string } | null;
}

export function diffShadowReports(
  scenarioId: string,
  baseline: PlaytestReport,
  actual: PlaytestReport,
): ShadowDiffResult {
  const entries: ShadowDiffEntry[] = [];

  collectScalarDiffs(scenarioId, '', baseline, actual, entries, new Set([
    'anomalies',
  ]));

  const anomalyDiff = diffAnomalies(scenarioId, baseline.anomalies, actual.anomalies);
  for (const entry of anomalyDiff.entries) entries.push(entry);

  return {
    scenarioId,
    matches: entries.length === 0,
    entries,
    divergentWeek: anomalyDiff.divergentWeek,
  };
}

function collectScalarDiffs(
  scenarioId: string,
  prefix: string,
  baseline: unknown,
  actual: unknown,
  out: ShadowDiffEntry[],
  excludeKeys: ReadonlySet<string>,
): void {
  if (isPlainObject(baseline) && isPlainObject(actual)) {
    const keys = new Set([...Object.keys(baseline), ...Object.keys(actual)]);
    const sortedKeys = [...keys].sort();
    for (const key of sortedKeys) {
      if (excludeKeys.has(key) && prefix === '') continue;
      const path = prefix === '' ? key : `${prefix}.${key}`;
      collectScalarDiffs(scenarioId, path, baseline[key], actual[key], out, excludeKeys);
    }
    return;
  }

  if (Array.isArray(baseline) && Array.isArray(actual)) {
    if (baseline.length !== actual.length) {
      out.push({
        scenarioId,
        field: `${prefix}.length`,
        oldValue: baseline.length,
        newValue: actual.length,
      });
    }
    const max = Math.max(baseline.length, actual.length);
    for (let i = 0; i < max; i += 1) {
      collectScalarDiffs(scenarioId, `${prefix}[${i}]`, baseline[i], actual[i], out, excludeKeys);
    }
    return;
  }

  if (!Object.is(baseline, actual)) {
    out.push({
      scenarioId,
      field: prefix === '' ? '<root>' : prefix,
      oldValue: baseline,
      newValue: actual,
    });
  }
}

function diffAnomalies(
  scenarioId: string,
  baseline: readonly PlaytestAnomaly[],
  actual: readonly PlaytestAnomaly[],
): { entries: ShadowDiffEntry[]; divergentWeek: ShadowDiffResult['divergentWeek'] } {
  const entries: ShadowDiffEntry[] = [];
  let divergentWeek: ShadowDiffResult['divergentWeek'] = null;

  if (baseline.length !== actual.length) {
    entries.push({
      scenarioId,
      field: 'anomalies.length',
      oldValue: baseline.length,
      newValue: actual.length,
    });
  }

  const max = Math.max(baseline.length, actual.length);
  for (let i = 0; i < max; i += 1) {
    const left = baseline[i];
    const right = actual[i];
    if (!left && right) {
      entries.push({
        scenarioId,
        field: `anomalies[${i}]`,
        oldValue: '<absent>',
        newValue: anomalyToken(right),
      });
      if (!divergentWeek) divergentWeek = { year: right.year, week: right.week, phase: right.phase };
      continue;
    }
    if (left && !right) {
      entries.push({
        scenarioId,
        field: `anomalies[${i}]`,
        oldValue: anomalyToken(left),
        newValue: '<absent>',
      });
      if (!divergentWeek) divergentWeek = { year: left.year, week: left.week, phase: left.phase };
      continue;
    }
    if (!left || !right) continue;

    const fieldDiffs = diffAnomalyFields(left, right);
    if (fieldDiffs.length > 0 && !divergentWeek) {
      divergentWeek = { year: right.year, week: right.week, phase: right.phase };
    }
    for (const [field, oldValue, newValue] of fieldDiffs) {
      entries.push({
        scenarioId,
        field: `anomalies[${i}].${field}`,
        oldValue,
        newValue,
      });
    }
  }

  return { entries, divergentWeek };
}

function diffAnomalyFields(
  left: PlaytestAnomaly,
  right: PlaytestAnomaly,
): Array<[string, unknown, unknown]> {
  const diffs: Array<[string, unknown, unknown]> = [];
  const keys: Array<keyof PlaytestAnomaly> = [
    'detectorId', 'severity', 'detail', 'reproSeed', 'step', 'year', 'week', 'phase',
  ];
  for (const key of keys) {
    if (!Object.is(left[key], right[key])) {
      diffs.push([key, left[key], right[key]]);
    }
  }
  return diffs;
}

function anomalyToken(anomaly: PlaytestAnomaly): string {
  return `${anomaly.detectorId}@Y${anomaly.year}W${anomaly.week}/${anomaly.phase}/${anomaly.severity}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function formatShadowDiff(result: ShadowDiffResult): string {
  if (result.matches) {
    return `SHADOW PASS: ${result.scenarioId}`;
  }
  const lines: string[] = [];
  lines.push(`SHADOW FAIL: ${result.scenarioId}`);
  if (result.divergentWeek) {
    const w = result.divergentWeek;
    lines.push(`  divergent: Y${w.year} W${w.week} phase=${w.phase}`);
  }
  for (const entry of result.entries) {
    lines.push(`  ${entry.field}: ${stringifyValue(entry.oldValue)} -> ${stringifyValue(entry.newValue)}`);
  }
  return lines.join('\n');
}

function stringifyValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
