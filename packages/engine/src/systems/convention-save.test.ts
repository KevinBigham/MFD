import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../rng';
import { SaveStateSchema } from '../save/schema';
import { CONVENTION_SAVE_METADATA, generateConventionSave } from './convention-save';

describe('convention save generator', () => {
  it('creates a week 14 regular-season save in year 2026', () => {
    const save = generateConventionSave('afce1', mulberry32(7));

    expect(save.year).toBe(2026);
    expect(save.week).toBe(14);
    expect(save.phase).toBe('regular_season');
    expect(save.difficulty).toBe('pro');
  });

  it('puts the selected team at 9-4 with a division rival one game ahead', () => {
    const save = generateConventionSave('afce1', mulberry32(11));
    const userTeam = save.teams.afce1;
    const rivalTeam = save.teams.afce2;

    expect([userTeam.wins, userTeam.losses]).toEqual([9, 4]);
    expect([rivalTeam.wins, rivalTeam.losses]).toEqual([10, 3]);
  });

  it('passes save schema validation', () => {
    const save = generateConventionSave('afce1', mulberry32(13));
    const parsed = SaveStateSchema.safeParse(save);

    expect(parsed.success).toBe(true);
  });

  it('includes narrative content, a rivalry hook, and milestone chases', () => {
    const save = generateConventionSave('afce1', mulberry32(17));
    const userTeam = save.teams.afce1;
    const rb = userTeam.roster.find((player) => player.pos === 'RB')!;
    const wr = userTeam.roster.find((player) => player.pos === 'WR')!;

    expect(save.narrativeState.activeArcs.length).toBeGreaterThan(0);
    expect(save.playerRivalries.length).toBeGreaterThan(0);
    expect(save.leagueNews.some((item) => /playoff|division/i.test(item.headline + item.body))).toBe(true);
    expect(rb.stats.rushYds).toBeGreaterThanOrEqual(900);
    expect(wr.stats.rec).toBeGreaterThanOrEqual(75);
  });

  it('is deterministic for the same seed', () => {
    const first = generateConventionSave('afce1', mulberry32(23));
    const second = generateConventionSave('afce1', mulberry32(23));

    expect(first).toEqual(second);
  });

  it('keeps standings realistic and exposes scenario metadata', () => {
    const save = generateConventionSave('afce1', mulberry32(29));
    const records = Object.values(save.teams).map((team) => team.wins);

    expect(Math.max(...records)).toBeLessThan(13);
    expect(Math.min(...records)).toBeGreaterThan(0);
    expect(CONVENTION_SAVE_METADATA.week).toBe(14);
    expect(CONVENTION_SAVE_METADATA.headline.length).toBeGreaterThan(0);
  });
});
