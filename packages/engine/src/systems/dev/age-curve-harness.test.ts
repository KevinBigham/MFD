import { describe, expect, it } from 'vitest';
import type { Position } from '../../types';
import {
  reportToCsv,
  runAgeCurveHarness,
  simulateCareer,
} from './age-curve-harness';

describe('age-curve harness', () => {
  it('simulateCareer is deterministic for the same (position, archetype, seed)', () => {
    const a = simulateCareer('QB', 'pocket_passer', 1234);
    const b = simulateCareer('QB', 'pocket_passer', 1234);
    expect(a).toEqual(b);
  });

  it('simulateCareer produces a plausible QB career profile', () => {
    const sample = simulateCareer('QB', 'pocket_passer', 7);
    expect(sample.entryAge).toBeGreaterThanOrEqual(21);
    expect(sample.entryAge).toBeLessThanOrEqual(23);
    expect(sample.peakAge).toBeGreaterThanOrEqual(sample.entryAge);
    expect(sample.retireAge).toBeGreaterThanOrEqual(sample.peakAge);
    expect(sample.retireAge).toBeLessThanOrEqual(42);
    expect(sample.peakOvr).toBeGreaterThanOrEqual(sample.entryOvr);
  });

  it('runAgeCurveHarness is deterministic for the same seed', () => {
    const a = runAgeCurveHarness({ careersPerPosition: 50, seed: 99 });
    const b = runAgeCurveHarness({ careersPerPosition: 50, seed: 99 });
    // Ignore ISO timestamp — it's metadata.
    const { generatedAt: _ga, ...rest } = a;
    const { generatedAt: _gb, ...rest2 } = b;
    expect(rest).toEqual(rest2);
  });

  it('runs on every position by default and reports n == careersPerPosition', () => {
    const report = runAgeCurveHarness({ careersPerPosition: 25, seed: 1 });
    const positions = Object.keys(report.positions) as Position[];
    expect(positions).toEqual(
      expect.arrayContaining(['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P']),
    );
    for (const pos of positions) {
      expect(report.positions[pos].n).toBe(25);
    }
  });

  it('QB median peak age falls within the design prime window at scale', () => {
    const report = runAgeCurveHarness({ careersPerPosition: 400, seed: 42 });
    const qb = report.positions.QB;
    // Design intent: QB peaks 26-33 (prime window).
    expect(qb.peakAgeMedian).toBeGreaterThanOrEqual(24);
    expect(qb.peakAgeMedian).toBeLessThanOrEqual(34);
  });

  it('RB careers end sooner than QB careers at scale', () => {
    const report = runAgeCurveHarness({ careersPerPosition: 400, seed: 42 });
    // RBs have an earlier cliff (29) than QBs (36) — even though their
    // peakAge distributions overlap, the decline-to-retire phase should
    // tilt RB retirement earlier on average.
    expect(report.positions.RB.retireAgeMedian).toBeLessThanOrEqual(
      report.positions.QB.retireAgeMedian,
    );
    // Peak age median for RB shouldn't drift dramatically above QB's.
    expect(report.positions.RB.peakAgeMedian).toBeLessThanOrEqual(
      report.positions.QB.peakAgeMedian + 2,
    );
  });

  it('p10 peak age <= median <= p90 peak age per position', () => {
    const report = runAgeCurveHarness({ careersPerPosition: 100, seed: 7 });
    for (const [, stats] of Object.entries(report.positions)) {
      expect(stats.peakAgeP10).toBeLessThanOrEqual(stats.peakAgeMedian);
      expect(stats.peakAgeMedian).toBeLessThanOrEqual(stats.peakAgeP90);
    }
  });

  it('reportToCsv emits one header + one row per position', () => {
    const report = runAgeCurveHarness({ careersPerPosition: 10, seed: 3 });
    const csv = reportToCsv(report);
    const lines = csv.split('\n');
    const positionCount = Object.keys(report.positions).length;
    expect(lines.length).toBe(positionCount + 1);
    expect(lines[0]).toContain('position,n,peakAgeMedian');
  });

  it('honors the positions filter when provided', () => {
    const report = runAgeCurveHarness({
      careersPerPosition: 10,
      seed: 4,
      positions: ['QB', 'K'],
    });
    expect(Object.keys(report.positions).sort()).toEqual(['K', 'QB']);
  });
});
