import { describe, expect, it } from 'vitest';

import { buildCutAdvisor974, detectPositionBattles974 } from '../src/systems/roster-management.js';

describe('roster-management.js', () => {
  it('detectPositionBattles974 finds close OVR battles and high-upside challengers', () => {
    const roster = [
      { id: 'qb1', name: 'Vet QB', pos: 'QB', ovr: 85, age: 31, contract: { salary: 30 } },
      { id: 'qb2', name: 'Young QB', pos: 'QB', ovr: 82, age: 24, pot: 90, contract: { salary: 4 } },
      { id: 'rb1', name: 'RB One', pos: 'RB', ovr: 90, age: 28, contract: { salary: 12 } },
      { id: 'rb2', name: 'RB Two', pos: 'RB', ovr: 79, age: 23, pot: 92, contract: { salary: 2 } },
    ];

    const battles = detectPositionBattles974(roster);
    expect(battles.map((b) => b.pos)).toEqual(expect.arrayContaining(['QB', 'RB']));
    expect(battles.find((b) => b.pos === 'QB').incumbent.salary).toBe(30);
    expect(battles.find((b) => b.pos === 'RB').challenger.pot).toBe(92);
  });

  it('buildCutAdvisor974 returns null when roster is under/at cap', () => {
    const roster = [
      { id: 'p1', name: 'A', pos: 'WR', ovr: 70, age: 25, isStarter: true, contract: { salary: 2 } },
      { id: 'p2', name: 'B', pos: 'WR', ovr: 68, age: 26, isStarter: false, contract: { salary: 1 } },
    ];

    expect(buildCutAdvisor974(roster, 2)).toBeNull();
  });

  it('buildCutAdvisor974 returns suggestions when roster is over cap', () => {
    const roster = [
      { id: 'p1', name: 'Starter', pos: 'QB', ovr: 82, age: 27, isStarter: true, pot: 84, contract: { salary: 20 } },
      { id: 'p2', name: 'Overpaid Backup', pos: 'QB', ovr: 64, age: 31, isStarter: false, pot: 64, contract: { salary: 6 } },
      { id: 'p3', name: 'Low OVR Depth', pos: 'WR', ovr: 58, age: 29, isStarter: false, pot: 58, contract: { salary: 1 } },
    ];

    const advisor = buildCutAdvisor974(roster, 2);
    expect(advisor.overBy).toBe(1);
    expect(advisor.suggestions.length).toBeGreaterThan(0);
    expect(advisor.suggestions.some((s) => s.reason === 'Overpaid backup' || s.reason === 'Low OVR')).toBe(true);
  });
});
