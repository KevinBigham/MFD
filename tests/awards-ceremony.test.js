import { describe, expect, it } from 'vitest';

import { buildAwardsCeremony } from '../src/systems/awards-ceremony.js';

describe('awards-ceremony.js', () => {
  it('returns null when awards payload is missing', () => {
    expect(buildAwardsCeremony(null)).toBe(null);
  });

  it('builds ordered reveal cards with formatted winner and runner-up lines', () => {
    const awards = {
      year: 2026,
      roy: {
        pos: 'QB',
        name: 'Rookie One',
        team: 'AAA',
        age: 21,
        runnerUp74: { name: 'Runner A', pos: 'WR', tm: 'BBB' },
      },
      coty: { name: 'Coach Prime', team: 'AAA', wins: 13, losses: 4 },
      opoy: {
        pos: 'WR',
        name: 'Elite Wideout',
        team: 'CCC',
        runnerUp74: { name: 'Runner B', pos: 'RB', tm: 'DDD' },
      },
      dpoy: {
        pos: 'LB',
        name: 'Tackle King',
        team: 'EEE',
        line: '18 TFL, 7 sacks',
        runnerUp74: { name: 'Runner C', pos: 'DL', tm: 'FFF' },
      },
      mvp: {
        pos: 'QB',
        name: 'MVP Guy',
        team: 'GGG',
        line: '4,800 pass yards, 41 TD',
        runnerUp74: { name: 'Runner D', pos: 'QB', tm: 'HHH' },
        margin74: 12,
      },
    };

    const result = buildAwardsCeremony(awards);
    expect(result.year).toBe(2026);
    expect(result.reveal).toHaveLength(5);
    expect(result.reveal[0].category).toContain('ROOKIE');
    expect(result.reveal[1].category).toContain('COACH');
    expect(result.reveal[4].category).toContain('MOST VALUABLE PLAYER');
    expect(result.reveal[4].sub).toContain('margin: 12 pts');
    expect(result.reveal[3].line).toContain('18 TFL, 7 sacks');
  });
});
