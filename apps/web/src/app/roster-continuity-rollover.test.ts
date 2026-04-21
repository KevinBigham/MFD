import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameState } from '@mfd/engine';
import { createSeedGameState } from './store/seed';
import { deriveDynastyId } from '../lib/career-meta';
import { readDynastyStarters } from '../lib/roster-continuity-store';
import { syncRosterContinuityAtYearRollover } from './roster-continuity-rollover';

class MemoryStorage implements Storage {
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

function userTeam(game: GameState) {
  const team = Object.values(game.teams).find((entry) => entry.isUser);
  if (!team) throw new Error('Expected user team');
  return team;
}

describe('syncRosterContinuityAtYearRollover', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns false when game or team id is missing', () => {
    expect(syncRosterContinuityAtYearRollover(null, null, null)).toBe(false);
  });

  it('returns false when previousYear is null', () => {
    const game = createSeedGameState(42);
    expect(syncRosterContinuityAtYearRollover(null, game, userTeam(game).id)).toBe(false);
  });

  it('returns false when the year has not advanced', () => {
    const game = createSeedGameState(42);
    expect(syncRosterContinuityAtYearRollover(game.year, game, userTeam(game).id)).toBe(false);
  });

  it('returns false when the target team is missing', () => {
    const game = createSeedGameState(42);
    game.year += 1;
    expect(syncRosterContinuityAtYearRollover(game.year - 1, game, 'missing-team')).toBe(false);
  });

  it('writes the prior-season starter snapshot on year advance', () => {
    const game = createSeedGameState(42);
    const team = userTeam(game);
    const completedSeasonYear = game.year;
    game.year += 1;

    const wrote = syncRosterContinuityAtYearRollover(completedSeasonYear, game, team.id);
    const stored = readDynastyStarters(deriveDynastyId(game));

    expect(wrote).toBe(true);
    expect(stored?.lastSyncedYear).toBe(completedSeasonYear);
    expect(stored?.starterIds).toEqual(team.roster.filter((player) => player.isStarter).map((player) => player.id));
  });

  it('replaces the stored snapshot on a later rollover', () => {
    const game = createSeedGameState(77);
    const team = userTeam(game);
    const firstSeason = game.year;
    game.year += 1;
    expect(syncRosterContinuityAtYearRollover(firstSeason, game, team.id)).toBe(true);

    const originalStarter = team.roster.find((player) => player.isStarter)!;
    originalStarter.isStarter = false;
    const replacement = team.roster.find((player) => !player.isStarter)!;
    replacement.isStarter = true;

    const secondSeason = game.year;
    game.year += 1;
    expect(syncRosterContinuityAtYearRollover(secondSeason, game, team.id)).toBe(true);

    expect(readDynastyStarters(deriveDynastyId(game))).toEqual({
      lastSyncedYear: secondSeason,
      starterIds: team.roster.filter((player) => player.isStarter).map((player) => player.id),
    });
  });
});
