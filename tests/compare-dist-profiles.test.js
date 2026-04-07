import { describe, expect, it } from 'vitest';

import { compareProfiles } from '../scripts/perf/compare-dist-profiles.mjs';

describe('compare-dist-profiles', () => {
  it('computes asset and preload deltas', () => {
    var base = {
      index: { modulePreloads: ['/assets/vendor.js', '/assets/a.js'] },
      assets: [
        { file: 'a.js', bytes: 10, gzipBytes: 5 },
        { file: 'b.js', bytes: 20, gzipBytes: 8 },
      ],
    };
    var current = {
      index: { modulePreloads: ['/assets/vendor.js', '/assets/c.js'] },
      assets: [
        { file: 'a.js', bytes: 15, gzipBytes: 7 },
        { file: 'c.js', bytes: 30, gzipBytes: 12 },
      ],
    };

    var out = compareProfiles(base, current);
    expect(out.preloadDelta.added).toEqual(['/assets/c.js']);
    expect(out.preloadDelta.removed).toEqual(['/assets/a.js']);
    expect(out.assetDeltas.find((d) => d.file === 'a.js').deltaBytes).toBe(5);
    expect(out.assetDeltas.find((d) => d.file === 'b.js').status).toBe('removed');
    expect(out.assetDeltas.find((d) => d.file === 'c.js').status).toBe('added');
  });
});
