import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../rng';
import { SaveStateSchema } from '../save/schema';
import { CONVENTION_SAVE_METADATA, generateConventionSave } from './convention-save';
import { GM_STRATEGIES } from './gm-strategies';

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

  it('keeps convention owner promise copy concrete', () => {
    const save = generateConventionSave('afce1', mulberry32(18));
    const ownerPromise = save.handshakes.find((handshake) => handshake.id === 'owner-playoff-push');

    expect(ownerPromise?.promiseText).toBe('Make the playoffs so ownership keeps this veteran core together.');
    expect(ownerPromise?.promiseText).not.toMatch(/dynasty window|owner mood|standings pressure/i);
  });

  it('includes a user expiring contract for franchise tag coverage', () => {
    const save = generateConventionSave('afce1', mulberry32(19));
    const userTeam = save.teams.afce1;
    const expiring = userTeam.roster.find((player) => player.pos === 'S');

    expect(expiring?.contract?.years).toBe(1);
    expect(expiring?.contract?.franchiseTag).toBeNull();
    expect(expiring?.contract?.yearlyBreakdown).toHaveLength(1);
    expect(save.players[expiring!.id]?.contract).toEqual(expiring!.contract);
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

  it('uses only canonical GM strategy ids for generated teams', () => {
    const save = generateConventionSave('afce1', mulberry32(31));
    const validStrategies = new Set(Object.keys(GM_STRATEGIES));
    const invalidStrategies = Object.values(save.teams)
      .map((team) => team.gmStrategy)
      .filter((strategy) => !validStrategies.has(strategy));

    expect(invalidStrategies).toEqual([]);
    expect(Object.values(save.teams).some((team) => !team.isUser && team.gmStrategy === 'contend')).toBe(true);
  });
});
