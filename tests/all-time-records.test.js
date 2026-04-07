import { describe, expect, it } from 'vitest';

import { ALL_TIME_RECORDS } from '../src/systems/all-time-records.js';

describe('all-time-records.js', () => {
  it('defines 12 record categories', () => {
    expect(ALL_TIME_RECORDS.categories).toHaveLength(12);
    expect(ALL_TIME_RECORDS.categories.find((c) => c.id === 'teamPA')?.invert).toBe(true);
  });

  it('buildRecords returns empty category lists when history missing', () => {
    const records = ALL_TIME_RECORDS.buildRecords(null);
    ALL_TIME_RECORDS.categories.forEach((c) => {
      expect(Array.isArray(records[c.id])).toBe(true);
      expect(records[c.id]).toHaveLength(0);
    });
  });

  it('buildRecords collects and sorts season/team records', () => {
    const history = [
      {
        year: 2026,
        teams: [
          {
            abbr: 'BUF',
            icon: '🦬',
            wins: 12,
            pointsFor: 420,
            pointsAgainst: 300,
            rosterSnap: [
              { name: 'QB A', pos: 'QB', stats: { passYds: 4300, passTD: 35 } },
              { name: 'RB A', pos: 'RB', stats: { rushYds: 1200 } },
            ],
          },
        ],
      },
      {
        year: 2027,
        teams: [
          {
            abbr: 'MIA',
            icon: '🐬',
            wins: 9,
            pointsFor: 390,
            pointsAgainst: 250,
            rosterSnap: [
              { name: 'QB B', pos: 'QB', stats: { passYds: 4500, passTD: 30 } },
              { name: 'DL B', pos: 'DL', stats: { sacks: 16 } },
            ],
          },
        ],
      },
    ];

    const records = ALL_TIME_RECORDS.buildRecords(history);

    expect(records.passYds[0]).toMatchObject({ name: 'QB B', val: 4500 });
    expect(records.passTD[0]).toMatchObject({ name: 'QB A', val: 35 });
    expect(records.sacks[0]).toMatchObject({ name: 'DL B', val: 16 });

    expect(records.teamWins[0]).toMatchObject({ name: 'BUF', val: 12 });
    expect(records.teamPF[0]).toMatchObject({ name: 'BUF', val: 420 });
    expect(records.teamPA[0]).toMatchObject({ name: 'MIA', val: 250 }); // invert => fewest first
  });

  it('limits each category list to top 10 entries', () => {
    const teams = Array.from({ length: 12 }, (_, i) => ({
      abbr: `T${i}`,
      wins: i,
      pointsFor: i * 10,
      pointsAgainst: 500 - i,
      rosterSnap: [{ name: `QB${i}`, pos: 'QB', stats: { passYds: 1000 + i } }],
    }));

    const records = ALL_TIME_RECORDS.buildRecords([{ year: 2026, teams }]);
    expect(records.passYds).toHaveLength(10);
    expect(records.teamWins).toHaveLength(10);
    expect(records.teamPA).toHaveLength(10);
  });
});
