import { describe, it, expect } from 'vitest';
import {
  getSuperBowlNumber,
  generateHalftimeShow,
  generateSuperBowlMVP,
  generateChampionParade,
  generateSuperBowlNarrative,
} from './super-bowl';

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
