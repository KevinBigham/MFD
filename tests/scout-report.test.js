import { describe, expect, it } from 'vitest';

import { SCOUT_REPORT } from '../src/systems/scout-report.js';

describe('scout-report.js', () => {
  it('returns null without required teams', () => {
    expect(SCOUT_REPORT.generate(null, {}, [], {}, {})).toBeNull();
    expect(SCOUT_REPORT.generate({}, null, [], {}, {})).toBeNull();
  });

  it('builds report with stars, weaknesses, scheme note, injuries, momentum, and rivalry heat', () => {
    const myTeam = { id: 'me', gameplanOff: 'air_raid' };
    const oppTeam = {
      id: 'opp',
      icon: '⭐',
      abbr: 'DAL',
      wins: 9,
      losses: 3,
      gameplanOff: 'balanced_o',
      gameplanDef: 'run_stuff',
      streak: 4,
      roster: [
        { name: 'Elite QB', pos: 'QB', ovr: 90, isStarter: true, trait: 'clutch' },
        { name: 'Star WR', pos: 'WR', ovr: 83, isStarter: true },
        { name: 'Solid RB', pos: 'RB', ovr: 78, isStarter: true },
        { name: 'Starter OL', pos: 'OL', ovr: 66, isStarter: true, injury: { games: 3, type: 'ankle' } },
        { name: 'Starter CB', pos: 'CB', ovr: 67, isStarter: true },
        { name: 'Bench S', pos: 'S', ovr: 74, isStarter: false },
      ],
    };
    const rivalries = { 'me|opp': { heat: 72 } };

    const report = SCOUT_REPORT.generate(myTeam, oppTeam, [], { week: 8 }, rivalries);

    expect(report.opp).toContain('DAL');
    expect(report.offPlan.id).toBe('balanced_o');
    expect(report.defPlan.id).toBe('run_stuff');
    expect(report.stars.length).toBeGreaterThan(0);
    expect(report.stars[0].threat).toBe('ELITE');
    expect(report.weaknesses.length).toBeGreaterThan(0);
    expect(typeof report.schemeNote).toBe('string');
    expect(report.counterBonus).toBeGreaterThan(0);
    expect(report.injuredStarters.some((p) => p.name === 'Starter OL')).toBe(true);
    expect(report.momentum).toContain('HOT');
    expect(report.rivHeat).toBe(72);
  });

  it('uses neutral momentum and defaults when no rivalry/counter edge', () => {
    const myTeam = { id: 'me', gameplanOff: 'balanced_o' };
    const oppTeam = {
      id: 'opp2',
      icon: '🐻',
      abbr: 'CHI',
      wins: 4,
      losses: 4,
      gameplanDef: 'balanced_d',
      streak: 0,
      roster: [{ name: 'QB', pos: 'QB', ovr: 70, isStarter: true }],
    };

    const report = SCOUT_REPORT.generate(myTeam, oppTeam, [], { week: 5 }, null);
    expect(report.counterBonus).toBe(0);
    expect(report.schemeNote).toContain('Neutral matchup');
    expect(report.momentum).toContain('Steady');
    expect(report.rivHeat).toBe(0);
  });

  it('handles extreme negative counter bonus and cold streak momentum', () => {
    const myTeam = { id: 'me', gameplanOff: 'air_raid' };
    const oppTeam = {
      id: 'opp3',
      icon: '🦬',
      abbr: 'BUF',
      wins: 10,
      losses: 2,
      gameplanDef: 'prevent',
      streak: -4,
      roster: [{ name: 'Starter QB', pos: 'QB', ovr: 80, isStarter: true }],
    };

    const report = SCOUT_REPORT.generate(myTeam, oppTeam, [], { week: 11 }, {});
    expect(report.counterBonus).toBeLessThanOrEqual(-4);
    expect(report.schemeNote).toContain('counters your offense HARD');
    expect(report.momentum).toContain('COLD');
  });

  it('returns empty stars/weaknesses cleanly when no starters are present', () => {
    const myTeam = { id: 'me', gameplanOff: 'balanced_o' };
    const oppTeam = {
      id: 'opp4',
      icon: '🐬',
      abbr: 'MIA',
      wins: 5,
      losses: 7,
      gameplanDef: 'balanced_d',
      streak: 1,
      roster: [{ name: 'Bench WR', pos: 'WR', ovr: 79, isStarter: false }],
    };

    const report = SCOUT_REPORT.generate(myTeam, oppTeam, [], { week: 9 }, null);
    expect(report.stars).toEqual([]);
    expect(report.weaknesses).toEqual([]);
    expect(report.injuredStarters).toEqual([]);
  });
});
