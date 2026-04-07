import { describe, expect, it } from 'vitest';

import { INJURY_REPORT } from '../src/systems/injury-report.js';

describe('injury-report.js', () => {
  it('generates ranked injury items and matchup notes for next game', () => {
    const teams = [
      {
        id: 'me',
        abbr: 'PHI',
        icon: '🦅',
        roster: [
          { id: 'm1', name: 'My QB', pos: 'QB', ovr: 88, isStarter: true, injury: { games: 4, type: 'knee' } },
          { id: 'm2', name: 'My CB', pos: 'CB', ovr: 80, isStarter: true, injury: { games: 2, type: 'hamstring' } },
          { id: 'm3', name: 'My WR', pos: 'WR', ovr: 84, isStarter: true },
        ],
      },
      {
        id: 'opp',
        abbr: 'DAL',
        icon: '⭐',
        roster: [
          { id: 'o1', name: 'Opp WR1', pos: 'WR', ovr: 86, isStarter: true },
          { id: 'o2', name: 'Opp CB1', pos: 'CB', ovr: 76, isStarter: true, injury: { games: 3, type: 'ankle' } },
        ],
      },
    ];
    const sched = [{ week: 9, home: 'me', away: 'opp' }];

    const report = INJURY_REPORT.generate(teams, 9, 'me', sched);
    expect(report.items.length).toBeGreaterThan(0);
    expect(report.items[0].ovr).toBeGreaterThanOrEqual(report.items[report.items.length - 1].ovr);
    expect(report.matchupNotes.length).toBeGreaterThan(0);
    expect(report.matchupNotes.some((n) => n.axis === 'offense' || n.axis === 'coverage')).toBe(true);
  });

  it('filters to starter injuries with ovr >= 65 and limits output size', () => {
    const teams = [
      {
        id: 'a',
        abbr: 'AAA',
        icon: '🅰️',
        roster: [
          { id: '1', name: 'Low OVR', pos: 'RB', ovr: 64, isStarter: true, injury: { games: 2, type: 'ankle' } },
          { id: '2', name: 'Bench Injured', pos: 'WR', ovr: 90, isStarter: false, injury: { games: 5, type: 'knee' } },
          ...Array.from({ length: 12 }).map((_, i) => ({
            id: `x${i}`, name: `Starter ${i}`, pos: 'LB', ovr: 70 + i, isStarter: true, injury: { games: 1, type: 'misc' },
          })),
        ],
      },
    ];
    const report = INJURY_REPORT.generate(teams, 5, null, null);
    expect(report.items.every((i) => i.ovr >= 65)).toBe(true);
    expect(report.items).toHaveLength(8);
  });
});
