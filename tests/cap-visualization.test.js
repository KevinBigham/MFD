import { describe, expect, it } from 'vitest';

import { buildCapVisualization } from '../src/systems/cap-visualization.js';

describe('cap-visualization.js', () => {
  it('returns null when team is missing', () => {
    expect(buildCapVisualization(null)).toBeNull();
  });

  it('builds breakdown, top hits, projections, and cap room', () => {
    const team = {
      deadCap: 5,
      roster: [
        { name: 'QB A', pos: 'QB', ovr: 86, age: 27, contract: { salary: 40, years: 3 } },
        { name: 'WR A', pos: 'WR', ovr: 78, age: 25, contract: { salary: 18, years: 2 } },
        { name: 'WR B', pos: 'WR', ovr: 69, age: 30, contract: { salary: 12, years: 1 } },
        { name: 'LB A', pos: 'LB', ovr: 72, age: 28, contract: { salary: 10, years: 1 } },
      ],
    };

    const out = buildCapVisualization(team);
    expect(out.breakdown[0].pos).toBe('QB');
    expect(out.topHits).toHaveLength(4);
    expect(out.projections).toHaveLength(3);
    expect(out.totalUsed).toBe(80);
    expect(out.capRoom).toBe(65);
    expect(out.deadCap).toBe(5);
  });
});
