import { describe, expect, it } from 'vitest';

import { getStatHeadline, getTraitMoraleExplainer } from '../src/systems/stat-headlines.js';

describe('stat-headlines.js', () => {
  it('getStatHeadline returns highest-priority matching template', () => {
    const line = getStatHeadline({
      passTD: 4,
      rushYds: 180,
      opp: 'DAL',
      won: true,
      streak: 4,
      margin: 10,
    });
    expect(line).toContain('throwing 4 TDs');
    expect(line).toContain('DAL');
  });

  it('getStatHeadline handles blowout loss and fallback win/loss lines', () => {
    const blowout = getStatHeadline({ margin: -28, opp: 'NYG', won: false, streak: -2 });
    const fallback = getStatHeadline({ won: true, opp: 'WAS' });
    expect(blowout).toContain('blown out by NYG');
    expect(fallback).toContain('Coming off a win over WAS');
  });

  it('getTraitMoraleExplainer includes active trait reasons and skips injured players', () => {
    const roster = [
      { trait: 'captain', injury: { games: 0 } },
      { trait: 'cancer' },
      { trait: 'mentor' },
      { trait: 'hothead', injury: { games: 2 } },
    ];
    const reasons = getTraitMoraleExplainer(roster);
    expect(reasons).toEqual(expect.arrayContaining(['©️ Captain +1', '☢️ Cancer -1', '📚 Mentor +1 rookies']));
    expect(reasons.some((r) => r.includes('Hot Head'))).toBe(false);
  });
});
