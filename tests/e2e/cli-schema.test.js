import { describe, expect, it } from 'vitest';

import { parseE2ESmokeArgs } from '../../scripts/e2e/cli.mjs';
import {
  E2E_REPORT_VERSION,
  buildE2EReport,
  createE2ECheck,
  summarizeE2EChecks,
  validateE2EReport,
} from '../../scripts/e2e/report-schema.mjs';
import { buildRouteSeed, buildRouteSeedMatrix } from '../../scripts/e2e/route-seed.mjs';

describe('e2e cli parser', () => {
  it('parses defaults and explicit values deterministically', () => {
    var args = parseE2ESmokeArgs([]);
    expect(args.distDir).toBe('dist');
    expect(args.reportPath).toBe('dist/e2e-launcher-report.json');
    expect(args.summaryPath).toBe('dist/e2e-launcher-summary.md');
    expect(args.retries).toBe(1);
    expect(args.timeoutMs).toBe(7000);

    var explicit = parseE2ESmokeArgs([
      '--dist', 'custom-dist',
      '--report', 'out/report.json',
      '--summary', 'out/summary.md',
      '--base-url', 'http://localhost:4173',
      '--retries', '3',
      '--timeout', '15000',
      '--no-browser',
    ]);
    expect(explicit.distDir).toBe('custom-dist');
    expect(explicit.reportPath).toBe('out/report.json');
    expect(explicit.summaryPath).toBe('out/summary.md');
    expect(explicit.baseUrl).toBe('http://localhost:4173');
    expect(explicit.retries).toBe(3);
    expect(explicit.timeoutMs).toBe(15000);
    expect(explicit.noBrowser).toBe(true);
  });

  it('coerces invalid numeric args to safe minimums', () => {
    var parsed = parseE2ESmokeArgs(['--retries', '0', '--timeout', '100']);
    expect(parsed.retries).toBe(1);
    expect(parsed.timeoutMs).toBe(1000);
  });
});

describe('e2e report schema', () => {
  it('builds and validates report schema v1', () => {
    var checks = [
      createE2ECheck('a', true, 'ok', {}),
      createE2ECheck('b', false, 'fail', { durationMs: 25 }),
      createE2ECheck('c', true, 'skip', { skipped: true }),
    ];
    var summary = summarizeE2EChecks(checks);
    var report = buildE2EReport({
      generatedAt: '2026-02-28T00:00:00.000Z',
      ok: false,
      distDir: '/tmp/dist',
      baseUrl: 'http://127.0.0.1:4173',
      checks: checks,
      summary: summary,
    });

    expect(report.version).toBe(E2E_REPORT_VERSION);
    expect(summary.total).toBe(3);
    expect(summary.passed).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.skipped).toBe(1);

    var out = validateE2EReport(report);
    expect(out.ok).toBe(true);
    expect(out.errors).toEqual([]);
  });

  it('rejects malformed report shape', () => {
    var out = validateE2EReport({ version: 'broken', checks: 'nope' });
    expect(out.ok).toBe(false);
    expect(out.errors.length).toBeGreaterThan(0);
  });
});

describe('route seed helpers', () => {
  it('builds deterministic route seed with precedence outputs', () => {
    var seed = buildRouteSeed({
      id: 'forced-play',
      baseUrl: 'http://127.0.0.1:4173',
      queryMode: 'play',
      hashMode: 'status',
      storageValue: 'status',
    });
    expect(seed.id).toBe('forced-play');
    expect(seed.url).toContain('?mode=play');
    expect(seed.expectedMode).toBe('play');
    expect(seed.forcedMode).toBe('play');
  });

  it('builds default route matrix with expected cases', () => {
    var matrix = buildRouteSeedMatrix('http://127.0.0.1:4173');
    expect(matrix.length).toBeGreaterThanOrEqual(8);
    expect(matrix.some(function (item) { return item.id === 'query-play'; })).toBe(true);
    expect(matrix.some(function (item) { return item.id === 'hash-status'; })).toBe(true);
  });
});
