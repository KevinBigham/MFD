import { describe, expect, it } from 'vitest';

import { SCOUT_MATH } from '../src/systems/scout-intel.js';
import { SCOUT_REPORT } from '../src/systems/scout-report.js';

describe('scout systems consistency', () => {
  it('scout-intel display and scout-report defaults remain safe with sparse inputs', () => {
    const display = SCOUT_MATH.getOvrDisplay(74, 55, SCOUT_MATH.getErrorBand(1, 0));
    expect(display).toMatch(/^\d{2}-\d{2}$/);

    const report = SCOUT_REPORT.generate(
      { id: 'me' },
      { id: 'opp', icon: '🛡️', abbr: 'TST', wins: 0, losses: 0, roster: [], streak: 0 },
      [],
      { week: 1 },
      {}
    );
    expect(report.offPlan).toBeTruthy();
    expect(report.defPlan).toBeTruthy();
    expect(report.stars).toEqual([]);
    expect(report.weaknesses).toEqual([]);
  });
});
