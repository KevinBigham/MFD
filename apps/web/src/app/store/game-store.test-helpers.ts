/**
 * Shared test helpers for the game-store test suite.
 *
 * Split 2026-04-22 from the monolithic `game-store.test.ts`. That file grew to
 * 43 tests / 60s on CI and sat at the edge of vitest's internal worker RPC
 * timeout ("Timeout calling onTaskUpdate"). The 11 week-advancing / halftime /
 * playoff-lore / trade-deadline tests live in `game-store.gameweek.test.ts`;
 * the remaining 32 offseason/cap/cba/IR/tutorial tests stay in
 * `game-store.test.ts`. Both files need these three helpers.
 *
 * Kept out of any `*.test.ts` filename so vitest does not pick it up as a
 * suite and try to run it.
 */

import type { TradeOffer } from '@mfd/engine';
import type { createSeedGameState } from './seed';

/**
 * Vitest's default `localStorage` is jsdom-provided but behaves differently
 * per-test if prior tests leak writes. These tests install a fresh in-memory
 * Storage shim per `beforeEach` to guarantee isolation.
 */
export class MemoryStorage implements Storage {
  private readonly backing = new Map<string, string>();

  get length() {
    return this.backing.size;
  }

  clear(): void {
    this.backing.clear();
  }

  getItem(key: string): string | null {
    return this.backing.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.backing.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.backing.delete(key);
  }

  setItem(key: string, value: string): void {
    this.backing.set(key, value);
  }
}

/**
 * Build a minimal pending inbound trade offer that swaps the user team's
 * first roster player for an AI team's first roster player. Used by the
 * accept/reject trade-cue tests.
 */
export function buildTradeOffer(game: ReturnType<typeof createSeedGameState>): TradeOffer {
  const userTeam = Object.values(game.teams).find((team) => team.isUser)!;
  const aiTeam = Object.values(game.teams).find((team) => !team.isUser)!;
  const userPlayer = userTeam.roster[0]!;
  const aiPlayer = aiTeam.roster[0]!;

  return {
    id: 'trade-store-offer',
    fromTeamId: aiTeam.id,
    toTeamId: userTeam.id,
    direction: 'inbound',
    summary: 'Swap starting pieces to shake up the roster.',
    status: 'pending',
    send: [
      {
        type: 'player',
        teamId: userTeam.id,
        playerId: userPlayer.id,
        pickId: null,
        description: userPlayer.name,
      },
    ],
    receive: [
      {
        type: 'player',
        teamId: aiTeam.id,
        playerId: aiPlayer.id,
        pickId: null,
        description: aiPlayer.name,
      },
    ],
  };
}

/**
 * Seed a Super Bowl matchup in week 22 with a cinderella-tagged home team.
 * Used by the playoff-lore tests that assert lore-card staging for user and
 * CPU-only playoff advances.
 */
export function seedSuperBowlWeek(
  game: ReturnType<typeof createSeedGameState>,
  matchup: { homeTeamId: string; awayTeamId: string },
) {
  game.phase = 'playoffs';
  game.week = 22;
  game.settings.halftimeDecisions = 'off';
  game.playoffMomentum[matchup.homeTeamId] = {
    teamId: matchup.homeTeamId,
    momentum: 82,
    narrativeTag: 'cinderella',
    winStreak: 3,
  };
  game.playoffBracket = {
    season: game.year,
    afc: [],
    nfc: [],
    championTeamId: null,
    matchups: [{
      id: `super-bowl-${game.year}`,
      round: 'super_bowl',
      conference: 'NFL',
      week: 22,
      homeTeamId: matchup.homeTeamId,
      awayTeamId: matchup.awayTeamId,
      winnerTeamId: null,
      result: null,
    }],
  };
}
