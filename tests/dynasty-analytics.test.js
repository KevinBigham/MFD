import { describe, expect, it } from 'vitest';

import {
  ALMANAC_SCHEMA_VERSION,
  calcDominanceScore,
  calcDynastyIndex,
  calcLongevity,
  calcPeakPower,
  generateEraCards,
  generateIdentityTags,
  buildHallOfSeasons,
} from '../src/systems/dynasty-analytics.js';

describe('dynasty-analytics.js', () => {
  it('calculates dominance and dynasty index scores', () => {
    const tr = { id: 1, wins: 12, losses: 5, playoffWins: 2, pf: 420, pa: 280, offRank: 1, defRank: 1 };
    const h = { winnerId: 1 };
    expect(calcDominanceScore(tr, h)).toBe(116);

    expect(
      calcDynastyIndex({
        seasons: 4,
        wins: 44,
        losses: 24,
        titles: 1,
        playoffWins: 5,
        mvps: 1,
        dpoys: 1,
        rivalryDominance: 2,
      })
    ).toBe(369);
    expect(calcDynastyIndex({ seasons: 0, wins: 0, losses: 0 })).toBe(0);
  });

  it('finds peak power window and longevity metrics', () => {
    const history = [
      { year: 2020, winnerId: 1, teamRecords: [{ id: 1, wins: 13, losses: 4, playoffWins: 2, pf: 420, pa: 280 }] },
      { year: 2021, winnerId: 2, teamRecords: [{ id: 1, wins: 11, losses: 6, playoffWins: 1, pf: 390, pa: 320 }] },
      { year: 2022, winnerId: 1, teamRecords: [{ id: 1, wins: 12, losses: 5, playoffWins: 3, pf: 410, pa: 300 }] },
      { year: 2023, winnerId: 3, teamRecords: [{ id: 1, wins: 10, losses: 7, playoffWins: 0, pf: 350, pa: 330 }] },
      { year: 2024, winnerId: 1, teamRecords: [{ id: 1, wins: 14, losses: 3, playoffWins: 2, pf: 450, pa: 260 }] },
      { year: 2025, winnerId: 2, teamRecords: [{ id: 1, wins: 7, losses: 10, playoffWins: 0, pf: 300, pa: 360 }] },
    ];

    const peak = calcPeakPower(history, 1);
    expect(peak.startYear).toBe(2020);
    expect(peak.endYear).toBe(2024);
    expect(peak.score).toBeGreaterThan(0);

    const longevity = calcLongevity(history, 1);
    expect(longevity.winningSzns).toBe(5);
    expect(longevity.playoffAppearances).toBe(4);
    expect(longevity.consistency).toBe(83);
    expect(longevity.score).toBeGreaterThan(0);
  });

  it('generates identity tags capped at three entries', () => {
    const tr = { id: 1, abbr: 'AAA', wins: 14, losses: 3, offRank: 1, defRank: 1, pf: 450, pa: 250 };
    const h = { winnerId: 1, mvp: { tm: 'AAA' } };
    const tags = generateIdentityTags(tr, h);

    expect(tags).toHaveLength(3);
    expect(tags.map((t) => t.id)).toEqual(['lockdown', 'airraid', 'dominant']);
  });

  it('builds era cards after sustained dominance and down years', () => {
    const teams = [{ abbr: 'AAA', icon: 'A', name: 'Alpha' }];
    const history = [
      { year: 2020, winnerId: 1, teamRecords: [{ id: 1, abbr: 'AAA', wins: 12, losses: 5, playoffWins: 2, pf: 410, pa: 300 }] },
      { year: 2021, winnerId: 1, teamRecords: [{ id: 1, abbr: 'AAA', wins: 11, losses: 6, playoffWins: 1, pf: 390, pa: 315 }] },
      { year: 2022, winnerId: 2, teamRecords: [{ id: 1, abbr: 'AAA', wins: 4, losses: 13, playoffWins: 0, pf: 250, pa: 420 }] },
      { year: 2023, winnerId: 3, teamRecords: [{ id: 1, abbr: 'AAA', wins: 5, losses: 12, playoffWins: 0, pf: 270, pa: 410 }] },
    ];

    const eras = generateEraCards(history, teams);
    expect(eras.length).toBeGreaterThan(0);
    expect(eras[0].abbr).toBe('AAA');
    expect(eras[0].start).toBe(2020);
    expect(eras[0].end).toBe(2021);
    expect(eras[0].seasons).toBe(2);
  });

  it('builds hall of seasons entries with plaques, tags, and schema version', () => {
    const teams = [{ abbr: 'AAA', icon: 'A', name: 'Alpha' }];
    const history = [
      {
        year: 2026,
        winnerId: 1,
        mvp: { tm: 'AAA', name: 'QB One', pos: 'QB' },
        topGames: [{ week: 12, margin: 3, hAbbr: 'AAA', hScore: 31, aScore: 28, aAbbr: 'BBB' }],
        teamRecords: [{ id: 1, abbr: 'AAA', wins: 14, losses: 3, playoffWins: 2, pf: 440, pa: 260, offRank: 1, defRank: 1 }],
      },
    ];

    const hall = buildHallOfSeasons(history, teams);
    expect(hall).toHaveLength(1);
    expect(hall[0].abbr).toBe('AAA');
    expect(hall[0].schemaV).toBe(ALMANAC_SCHEMA_VERSION);
    expect(hall[0].plaque).toContain('Champions');
    expect(hall[0].plaque).toContain('#1 Offense');
    expect(hall[0].idTags.length).toBeGreaterThan(0);
  });
});
