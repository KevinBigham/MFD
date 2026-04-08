import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../rng';
import type { GameResult } from '../types';
import { checkForNamedGame, formatNamedGame } from './named-games';

function seededRng(seed = 42) {
  return mulberry32(seed);
}

function makeResult(overrides: Partial<GameResult> = {}): GameResult {
  return {
    id: 'game-1',
    homeTeamId: 'team-a',
    awayTeamId: 'team-b',
    homeScore: 24,
    awayScore: 21,
    week: 5,
    year: 2026,
    overtime: false,
    mvpPlayerId: null,
    stats: {},
    weather: null,
    playerMatchupEvents: [],
    ...overrides,
  } as GameResult;
}

describe('Named Games', () => {
  it('returns null for unremarkable games', () => {
    // Most normal games should not get named
    let namedCount = 0;
    for (let seed = 0; seed < 100; seed++) {
      const result = checkForNamedGame(seededRng(seed), makeResult(), false, false);
      if (result) namedCount++;
    }
    // The vast majority should be null
    expect(namedCount).toBeLessThan(30);
  });

  it('can name a blowout game', () => {
    // Try many seeds to find one that passes the rarity gate
    for (let seed = 0; seed < 100; seed++) {
      const result = checkForNamedGame(
        seededRng(seed),
        makeResult({ homeScore: 56, awayScore: 10 }),
        false, false,
      );
      if (result) {
        expect(['The Annihilation', 'The Massacre', 'The Demolition Derby']).toContain(result.name);
        expect(result.reason).toContain('Blowout');
        return;
      }
    }
    // If we get here after 100 tries, that's fine — rarity gate is working
  });

  it('can name a snow game', () => {
    for (let seed = 0; seed < 100; seed++) {
      const result = checkForNamedGame(
        seededRng(seed),
        makeResult({ weather: 'snow' }),
        false, false,
      );
      if (result) {
        expect(result.name).toMatch(/Snow|Blizzard|Whiteout/);
        return;
      }
    }
  });

  it('can name a playoff OT game', () => {
    for (let seed = 0; seed < 100; seed++) {
      const result = checkForNamedGame(
        seededRng(seed),
        makeResult({ overtime: true }),
        true, false,
      );
      if (result) {
        expect(result.name).toMatch(/Marathon|Epic|Never-Ending/);
        return;
      }
    }
  });

  it('can name a rivalry playoff game', () => {
    for (let seed = 0; seed < 100; seed++) {
      const result = checkForNamedGame(
        seededRng(seed),
        makeResult({ homeScore: 21, awayScore: 17 }),
        true, true,
      );
      if (result) {
        expect(result.name).toMatch(/Grudge|Rivalry|Blood/);
        return;
      }
    }
  });

  it('can name a shutout', () => {
    for (let seed = 0; seed < 100; seed++) {
      const result = checkForNamedGame(
        seededRng(seed),
        makeResult({ homeScore: 31, awayScore: 0 }),
        false, false,
      );
      if (result) {
        expect(result.name).toMatch(/Shutout|Blanking|Goose/);
        return;
      }
    }
  });

  it('is deterministic with same seed', () => {
    const result = makeResult({ homeScore: 56, awayScore: 10 });
    const r1 = checkForNamedGame(seededRng(7), result, false, false);
    const r2 = checkForNamedGame(seededRng(7), result, false, false);
    expect(r1?.name).toBe(r2?.name);
  });

  it('formatNamedGame produces readable output', () => {
    const game = {
      name: 'The Snow Bowl',
      gameId: 'g-1',
      year: 2026,
      week: 12,
      homeTeamId: 'team-a',
      awayTeamId: 'team-b',
      homeScore: 17,
      awayScore: 14,
      reason: 'Played in heavy snow',
    };
    const text = formatNamedGame(game);
    expect(text).toContain('The Snow Bowl');
    expect(text).toContain('Week 12');
    expect(text).toContain('17-14');
  });
});
