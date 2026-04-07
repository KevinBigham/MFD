import { describe, expect, it } from 'vitest';

import { buildSummaryMarkdown } from '../scripts/ci/write-job-summary.mjs';

describe('ci summary markdown', () => {
  it('includes playable gate section and fields', () => {
    var md = buildSummaryMarkdown({
      preload: { modulePreloadsCount: 2, violations: [] },
      profile: { index: { bytes: 100, gzipBytes: 50 }, assets: [], topAssets: [] },
      playableBuild: { ok: true, missingFiles: [], badRefs: [] },
      playableSmoke: { ok: false, checks: [{ name: 'x', pass: false }] },
      legacySave: { ok: true, checks: [{ name: 'save', pass: true }] },
      legacySessionSmoke: { ok: false, checks: [{ name: 'session', pass: false }] },
      importSafety: { ok: true, checks: [{ name: 'import', pass: true }] },
      playability: { overallOk: false, summary: { failedSections: 2 } },
      hybridMetrics: { stats: { count: 3, p50: 120, p95: 380 } },
      perfThreshold: { ok: true, warnings: ['soft threshold crossed'] },
      security: { ok: true, checks: [{ name: 'sec', pass: true }] },
    });
    expect(md).toContain('## Playable Gate');
    expect(md).toContain('Playable build: PASS');
    expect(md).toContain('Playable smoke: FAIL');
    expect(md).toContain('## Hybrid Gate');
    expect(md).toContain('Legacy save status: PASS');
    expect(md).toContain('Legacy session smoke status: FAIL');
    expect(md).toContain('Save import safety status: PASS');
    expect(md).toContain('Hybrid metrics p50/p95: 120 / 380 ms');
    expect(md).toContain('Perf threshold status: PASS');
    expect(md).toContain('Security guardrails: PASS');
  });
});
