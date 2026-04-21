import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameState, Player } from '@mfd/engine';
import { deriveDynastyId } from '../lib/career-meta';
import { readRookieOfYearEntries } from '../lib/rookie-of-year-store';
import { syncRookieOfYearAtYearRollover } from './rookie-of-year-rollover';

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

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'rookie-1',
    firstName: 'Jalen',
    lastName: 'Banks',
    name: 'Jalen Banks',
    pos: 'WR',
    age: 22,
    ovr: 82,
    pot: 90,
    ratings: {},
    devTrait: 'star',
    personality: {
      workEthic: 7,
      loyalty: 6,
      greed: 5,
      pressure: 6,
      ambition: 8,
    },
    traits: [],
    archetype: null,
    contract: null,
    teamId: 'team-1',
    draftYear: 2026,
    draftRound: 1,
    draftPick: 12,
    college: 'State',
    yearsExp: 1,
    careerStats: { seasons: 0, gp: 0, snaps: 0 },
    traitMilestones: {},
    traitPowerLevel: {},
    injury: null,
    morale: 70,
    chemistry: 70,
    systemFit: 70,
    cliqueId: null,
    jerseyNumber: 12,
    endorsements: [],
    isStarter: true,
    role: null,
    roleWeeks: 0,
    tradeBlock: false,
    holdout: false,
    agentId: null,
    stats: {
      gamesPlayed: 0,
      passYds: 0,
      passTD: 0,
      passINT: 0,
      passAtt: 0,
      passComp: 0,
      rushYds: 0,
      rushAtt: 0,
      rushTD: 0,
      fumbles: 0,
      rec: 0,
      recYds: 0,
      recTD: 0,
      targets: 0,
      sacks: 0,
      defINT: 0,
      tackles: 0,
      fgMade: 0,
      fgAtt: 0,
      yacYds: 0,
    },
    ...overrides,
  };
}

function makeGame(players: Player[]): GameState {
  return {
    seed: 123,
    year: 2027,
    teams: {
      'team-1': {
        id: 'team-1',
        isUser: true,
        city: 'Chicago',
        name: 'Blaze',
        abbr: 'CHI',
        roster: players.filter((player) => player.teamId === 'team-1'),
      },
      'team-2': {
        id: 'team-2',
        isUser: false,
        city: 'Houston',
        name: 'Orbit',
        abbr: 'HOU',
        roster: players.filter((player) => player.teamId === 'team-2'),
      },
    },
    players: Object.fromEntries(players.map((player) => [player.id, player])),
    franchiseHistory: [{ teamId: 'team-1', year: 2026 }],
    playerSeasonHistory: {
      'rookie-1': [{
        playerId: 'rookie-1',
        season: 2026,
        age: 22,
        ovr: 82,
        teamId: 'team-1',
        gamesPlayed: 17,
        gamesStarted: 17,
        keyStats: {
          rec: 79,
          recYds: 1215,
          recTD: 10,
        },
      }],
    },
  } as unknown as GameState;
}

describe('syncRookieOfYearAtYearRollover', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns null when the game is missing', () => {
    expect(syncRookieOfYearAtYearRollover(2026, null, 'team-1')).toBeNull();
  });

  it('returns null when the user team id is missing', () => {
    expect(syncRookieOfYearAtYearRollover(2026, makeGame([makePlayer()]), null)).toBeNull();
  });

  it('returns null when the year has not advanced', () => {
    const game = makeGame([makePlayer()]);
    game.year = 2026;

    expect(syncRookieOfYearAtYearRollover(2026, game, 'team-1')).toBeNull();
  });

  it('returns null when the completed season has no rookies', () => {
    const game = makeGame([makePlayer({ id: 'veteran', yearsExp: 5, draftYear: 2020, name: 'Veteran One' })]);

    expect(syncRookieOfYearAtYearRollover(2026, game, 'team-1')).toBeNull();
    expect(readRookieOfYearEntries(deriveDynastyId(game))).toEqual([]);
  });

  it('writes the completed-season winner on year advance', () => {
    const game = makeGame([makePlayer()]);

    const entry = syncRookieOfYearAtYearRollover(2026, game, 'team-1');

    expect(entry?.playerId).toBe('rookie-1');
    expect(entry?.season).toBe(2026);
    expect(readRookieOfYearEntries(deriveDynastyId(game))[0]?.playerId).toBe('rookie-1');
  });

  it('stores the completed season year instead of the advanced current year', () => {
    const game = makeGame([makePlayer()]);

    const entry = syncRookieOfYearAtYearRollover(2026, game, 'team-1');

    expect(game.year).toBe(2027);
    expect(entry?.season).toBe(2026);
  });
});
