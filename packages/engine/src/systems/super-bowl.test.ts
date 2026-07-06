import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../rng';
import {
  getSuperBowlNumber,
  generateSuperBowlContext,
  generateHalftimeShow,
  generateSuperBowlMVP,
  generateChampionParade,
  generateSuperBowlNarrative,
} from './super-bowl';
import { hashMatchupSeed } from './revenge-games';

describe('super bowl system', () => {
  // ── getSuperBowlNumber ────────────────────────────────

  it('converts numbers to roman numerals correctly', () => {
    expect(getSuperBowlNumber(1)).toBe('I');
    expect(getSuperBowlNumber(4)).toBe('IV');
    expect(getSuperBowlNumber(9)).toBe('IX');
    expect(getSuperBowlNumber(50)).toBe('L');
    expect(getSuperBowlNumber(58)).toBe('LVIII');
  });

  // ── generateHalftimeShow ──────────────────────────────

  it('returns a valid show with performer and genre', () => {
    const show = generateHalftimeShow(1, () => 0.3);
    expect(show.performer).toBeTruthy();
    expect(show.genre).toBeTruthy();
    expect(show.description).toBeTruthy();
  });

  it('returns a rating between 1 and 5', () => {
    const show = generateHalftimeShow(1, () => 0.3);
    expect(show.rating).toBeGreaterThanOrEqual(1);
    expect(show.rating).toBeLessThanOrEqual(5);
  });

  it('seeds halftime independently for same-length champion ids (sprint-53 regression)', () => {
    // Pre-fix `mulberry32(year ^ champion.id.length ^ 50)` only mixed the id
    // *length*, so every two-letter franchise (KC, LA, SF, NE, GB, NO, NY)
    // hashed to the same seed and got the same halftime show. Post-fix we hash
    // the full champion id with djb2 — distinct ids must produce distinct seeds.
    const year = 2030;
    const seedFor = (championId: string) => hashMatchupSeed(`halftime:${year}:${championId}`);
    expect(seedFor('KC')).not.toBe(seedFor('LA'));
    expect(seedFor('SF')).not.toBe(seedFor('NE'));
    expect(seedFor('GB')).not.toBe(seedFor('NO'));

    // And the downstream show output must vary across same-length ids in the
    // same year. Cross-year drift (KC year 2030 vs KC year 2031) was not the
    // bug, but is also asserted as a sanity check.
    const showFor = (championId: string, y: number = year) =>
      generateHalftimeShow(y, mulberry32(hashMatchupSeed(`halftime:${y}:${championId}`)));
    const kc2030 = showFor('KC');
    const la2030 = showFor('LA');
    const kc2031 = showFor('KC', 2031);
    const distinct = new Set([kc2030.performer, la2030.performer, kc2031.performer]);
    // At least two of the three must differ — three identical performers would
    // mean the seed is collapsing exactly the way the pre-fix code did.
    expect(distinct.size).toBeGreaterThan(1);
  });

  it('counts lowercase champion history for dynasty storylines', () => {
    const game = {
      year: 2034,
      teams: {
        home: {
          id: 'home',
          city: 'Lakeview',
          name: 'Caps',
          wins: 12,
          losses: 5,
        },
        away: {
          id: 'away',
          city: 'Metro',
          name: 'Rails',
          wins: 11,
          losses: 6,
        },
      },
      franchiseHistory: [
        { teamId: 'home', playoffFinish: 'champion' },
        { teamId: 'home', playoffFinish: 'champion' },
      ],
    } as any;
    const bracket = {
      matchups: [
        { round: 'super_bowl', homeTeamId: 'home', awayTeamId: 'away' },
      ],
    } as any;

    const context = generateSuperBowlContext(game, bracket);

    expect(context?.storylines).toContain('Lakeview seeks championship #3 — dynasty territory.');
    expect(context?.storylines).not.toContain('Lakeview has never won a championship. This is their moment.');
  });

  // ── generateSuperBowlMVP ─────────────────────────────

  it('picks highest-scoring player as MVP', () => {
    const gameResult = {
      homeScore: 28,
      awayScore: 14,
      homeTeamId: 'team-a',
      awayTeamId: 'team-b',
      stats: {
        'team-a': {
          playerLines: [
            { playerId: 'qb1', name: 'Star QB', pos: 'QB', passYds: 300, passTD: 3 },
            { playerId: 'rb1', name: 'Backup RB', pos: 'RB', rushYds: 40, rushTD: 0 },
          ],
        },
      },
    } as any;

    const mvp = generateSuperBowlMVP(gameResult);
    expect(mvp).not.toBeNull();
    expect(mvp!.playerId).toBe('qb1');
    expect(mvp!.playerName).toBe('Star QB');
  });

  it('returns null when no player stats exist', () => {
    const gameResult = {
      homeScore: 10,
      awayScore: 7,
      homeTeamId: 'team-a',
      awayTeamId: 'team-b',
      stats: {},
    } as any;

    const mvp = generateSuperBowlMVP(gameResult);
    expect(mvp).toBeNull();
  });

  // ── generateChampionParade ────────────────────────────

  it('scales attendance by market size', () => {
    const makeGame = (marketSize: string) => ({
      playoffBracket: { matchups: [] },
      players: {},
    }) as any;

    const makeTeam = (market: string) => ({
      city: 'TestCity',
      name: 'TestTeam',
      franchiseIdentity: { marketSize: market, fanbase: 50 },
    }) as any;

    const megaParade = generateChampionParade(makeGame('mega'), makeTeam('mega'));
    const smallParade = generateChampionParade(makeGame('small'), makeTeam('small'));

    expect(megaParade.attendance).toBeGreaterThan(smallParade.attendance);
  });

  // ── generateSuperBowlNarrative ────────────────────────

  it('includes champion name in narrative', () => {
    const context = {
      number: 'LVIII',
      matchup: 'TestCity TestTeam vs OtherCity OtherTeam',
      venue: 'Test Dome',
      storylines: ['A great storyline.'],
    };
    const result = {
      homeScore: 31,
      awayScore: 17,
      overtime: false,
    } as any;
    const champion = {
      city: 'TestCity',
      name: 'TestTeam',
    } as any;

    const narrative = generateSuperBowlNarrative(context, result, champion);
    expect(narrative).toContain('TestCity');
    expect(narrative).toContain('TestTeam');
  });
});
