import { describe, expect, it } from 'vitest';

import { ADVANCED_ANALYTICS, buildAnalyticsSnapshot } from '../src/systems/advanced-analytics.js';

function makeTeam(overrides) {
  return Object.assign(
    {
      id: 'AAA',
      abbr: 'AAA',
      wins: 9,
      losses: 4,
      pf: 351,
      pa: 247,
      deadCap: 8,
      roster: [],
    },
    overrides || {}
  );
}

describe('advanced-analytics.js', () => {
  it('keeps the inline analytics math stable for EPA, DVOA, target share, and market gaps', () => {
    var qb = { pos: 'QB', stats: { passYds: 4000, passTD: 30, int: 10, rushYds: 200 } };
    var wr = { pos: 'WR', stats: { recYds: 1200, recTD: 9, rec: 90, targets: 130 } };
    var rb = { pos: 'RB', stats: { targets: 70, rec: 55 } };
    var te = { pos: 'TE', stats: { targets: 60, rec: 48 } };
    var fa = { name: 'Value WR', pos: 'WR', ovr: 78, contract: { salary: 6 } };

    expect(ADVANCED_ANALYTICS.calcEPA(qb)).toBe(266);
    expect(ADVANCED_ANALYTICS.calcEPA(wr)).toBe(174);
    expect(ADVANCED_ANALYTICS.calcDVOA(makeTeam())).toEqual({ off: 21, def: 7, total: 28 });
    expect(ADVANCED_ANALYTICS.calcTargetShare(wr, [wr, rb, te])).toBe(50);
    expect(ADVANCED_ANALYTICS.calcValueGap(fa)).toBe(7.8);
  });

  it('builds a reusable front-office snapshot from shared analytics inputs', () => {
    var team = makeTeam({
      roster: [
        {
          id: 'qb1',
          name: 'Signal Caller',
          pos: 'QB',
          age: 32,
          ovr: 88,
          isStarter: true,
          contract: { salary: 42 },
          stats: { gp: 13, passYds: 3900, passTD: 28, int: 8, rushYds: 180 },
        },
        {
          id: 'wr1',
          name: 'Target Hog',
          pos: 'WR',
          age: 27,
          ovr: 84,
          isStarter: true,
          contract: { salary: 18 },
          stats: { gp: 13, recYds: 1200, recTD: 10, rec: 95, targets: 140 },
        },
        {
          id: 'te1',
          name: 'Chain Mover',
          pos: 'TE',
          age: 30,
          ovr: 79,
          isStarter: true,
          contract: { salary: 9 },
          stats: { gp: 13, recYds: 640, recTD: 6, rec: 52, targets: 78 },
        },
        {
          id: 'dl1',
          name: 'Edge Winner',
          pos: 'DL',
          age: 31,
          ovr: 82,
          isStarter: true,
          contract: { salary: 16 },
          stats: { gp: 13, sacks: 11, tackles: 48 },
        },
      ],
    });
    var opp = makeTeam({ id: 'BBB', abbr: 'BBB', wins: 6, losses: 7, pf: 268, pa: 310, roster: [{ id: 'opp1', pos: 'QB', ovr: 74 }] });
    var sched = [
      { week: 14, home: 'AAA', away: 'BBB', played: false },
      { week: 15, home: 'CCC', away: 'AAA', played: false },
    ];
    var fas = [
      { id: 'fa1', name: 'Bargain Guard', pos: 'OL', ovr: 76, contract: { salary: 5 } },
      { id: 'fa2', name: 'Cheap Safety', pos: 'S', ovr: 73, contract: { salary: 4 } },
    ];

    var snapshot = buildAnalyticsSnapshot({
      team: team,
      teams: [team, opp, makeTeam({ id: 'CCC', abbr: 'CCC', wins: 10, losses: 3, pf: 330, pa: 240, roster: [{ id: 'opp2', pos: 'QB', ovr: 85 }] })],
      season: { year: 2027, phase: 'regular' },
      sched: sched,
      myId: 'AAA',
      fas: fas,
      matchupOVR: function (a) {
        return {
          offStrength: a.abbr === 'AAA' ? 84 : a.abbr === 'CCC' ? 88 : 73,
          defStrength: a.abbr === 'AAA' ? 82 : a.abbr === 'CCC' ? 86 : 71,
        };
      },
    });

    expect(snapshot.dvoa.total).toBeGreaterThan(0);
    expect(snapshot.epaLeaders[0].name).toBe('Signal Caller');
    expect(snapshot.targetShareLeaders[0].name).toBe('Target Hog');
    expect(snapshot.capHealth.space).toBeLessThan(snapshot.capHealth.cap);
    expect(snapshot.playoffOdds.available).toBe(true);
    expect(snapshot.scheduleHeat).toHaveLength(2);
    expect(snapshot.agingRisk.count).toBeGreaterThan(0);
    expect(snapshot.marketInefficiencies[0].player.name).toBe('Bargain Guard');
    expect(snapshot.frontOfficeReport.length).toBeGreaterThan(0);
  });
});
