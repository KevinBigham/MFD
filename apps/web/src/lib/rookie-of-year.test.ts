import { describe, expect, it } from 'vitest';
import type { GameState, Player } from '@mfd/engine';
import { computeRookieOfYear } from './rookie-of-year';

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'player-1',
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
    yearsExp: 0,
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
      gamesPlayed: 17,
      passYds: 0,
      passTD: 0,
      passINT: 0,
      passAtt: 0,
      passComp: 0,
      rushYds: 0,
      rushAtt: 0,
      rushTD: 0,
      fumbles: 0,
      rec: 75,
      recYds: 1200,
      recTD: 9,
      targets: 110,
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

function makeGame(players: Player[], overrides: Partial<GameState> = {}): GameState {
  const rosterByTeam = players.reduce<Record<string, Player[]>>((acc, player) => {
    const teamId = player.teamId ?? 'free-agency';
    acc[teamId] ??= [];
    acc[teamId]!.push(player);
    return acc;
  }, {});

  return {
    seed: 123,
    year: 2026,
    teams: {
      'team-1': { id: 'team-1', isUser: true, city: 'Chicago', name: 'Blaze', abbr: 'CHI', roster: rosterByTeam['team-1'] ?? [] },
      'team-2': { id: 'team-2', isUser: false, city: 'Houston', name: 'Orbit', abbr: 'HOU', roster: rosterByTeam['team-2'] ?? [] },
    },
    players: Object.fromEntries(players.map((player) => [player.id, player])),
    franchiseHistory: [{ teamId: 'team-1', year: 2026 }],
    playerSeasonHistory: {},
    ...overrides,
  } as unknown as GameState;
}

describe('computeRookieOfYear', () => {
  it('returns null when the league has no rookies', () => {
    const veteran = makePlayer({ id: 'veteran', yearsExp: 4, draftYear: 2021 });

    expect(computeRookieOfYear(makeGame([veteran]), 2026)).toBeNull();
  });

  it('returns the highest-scoring rookie when one candidate exists', () => {
    const rookie = makePlayer({ id: 'rookie-qb', name: 'Miles Avery', pos: 'QB', stats: { ...makePlayer().stats, passYds: 4200, passTD: 31, passINT: 9, gamesPlayed: 17, rec: 0, recYds: 0, recTD: 0 } });

    const result = computeRookieOfYear(makeGame([rookie]), 2026);

    expect(result?.playerId).toBe('rookie-qb');
    expect(result?.headline).toContain('Miles Avery: CHI rookie QB takes ROY honors');
    expect(result?.season).toBe(2026);
  });

  it('breaks score ties with higher overall rating first', () => {
    const first = makePlayer({ id: 'rookie-a', name: 'Alpha Reed', ovr: 78, stats: { ...makePlayer().stats, recYds: 1000, recTD: 8 } });
    const second = makePlayer({ id: 'rookie-b', name: 'Bravo Reed', ovr: 84, stats: { ...makePlayer().stats, recYds: 1000, recTD: 8 } });

    const result = computeRookieOfYear(makeGame([first, second]), 2026);

    expect(result?.playerId).toBe('rookie-b');
  });

  it('breaks remaining ties by player name ascending', () => {
    const first = makePlayer({ id: 'rookie-a', name: 'Aaron Reed', ovr: 82, stats: { ...makePlayer().stats, recYds: 1000, recTD: 8 } });
    const second = makePlayer({ id: 'rookie-b', name: 'Zane Reed', ovr: 82, stats: { ...makePlayer().stats, recYds: 1000, recTD: 8 } });

    const result = computeRookieOfYear(makeGame([second, first]), 2026);

    expect(result?.playerId).toBe('rookie-a');
  });

  it('uses the awards-based position weights plus games played in the composite score', () => {
    const rookie = makePlayer({
      id: 'rookie-rb',
      name: 'Jay Mercer',
      pos: 'RB',
      ovr: 80,
      stats: {
        ...makePlayer().stats,
        gamesPlayed: 16,
        rec: 20,
        recYds: 300,
        recTD: 1,
        rushYds: 1200,
        rushTD: 10,
      },
    });

    const result = computeRookieOfYear(makeGame([rookie]), 2026);

    expect(result?.compositeScore).toBeCloseTo(189, 2);
  });

  it('prefers the archived completed-season snapshot when playerSeasonHistory exists', () => {
    const rookie = makePlayer({
      id: 'rookie-history',
      name: 'Tariq Moss',
      yearsExp: 1,
      draftYear: 2026,
      stats: {
        ...makePlayer().stats,
        gamesPlayed: 0,
        rec: 0,
        recYds: 0,
        recTD: 0,
      },
    });

    const game = makeGame([rookie], {
      playerSeasonHistory: {
        'rookie-history': [{
          playerId: 'rookie-history',
          season: 2026,
          age: 22,
          ovr: 82,
          teamId: 'team-2',
          gamesPlayed: 17,
          gamesStarted: 17,
          keyStats: {
            rec: 88,
            recYds: 1310,
            recTD: 11,
          },
        }],
      },
    });

    const result = computeRookieOfYear(game, 2026);

    expect(result?.teamId).toBe('team-2');
    expect(result?.teamAbbr).toBe('HOU');
    expect(result?.highlights[0]).toContain('1,310');
  });
});
