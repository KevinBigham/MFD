import { describe, it, expect } from 'vitest';
import { makeContract, SAVE_VERSION, advanceFranchiseWeek, seedPlayoffBracket } from '../index';
import type { GameState, Player, Team } from '../types';

function makePlayer(id: string, teamId: string, pos: Player['pos'], ovr: number, isStarter = true): Player {
  return {
    id,
    firstName: id,
    lastName: 'Player',
    name: `${id} Player`,
    pos,
    age: 26,
    ovr,
    pot: ovr + 4,
    ratings: { awareness: ovr, speed: ovr, stamina: ovr },
    devTrait: 'normal',
    personality: { workEthic: 7, loyalty: 5, greed: 5, pressure: 5, ambition: 6 },
    traits: [],
    archetype: null,
    contract: makeContract(8, 3, 4, 3, id, teamId),
    teamId,
    draftYear: 2022,
    draftRound: 1,
    draftPick: 1,
    college: 'Test U',
    yearsExp: 3,
    careerStats: { seasons: 3, gp: 51, snaps: 2200 },
    traitMilestones: {},
    traitPowerLevel: {},
    injury: null,
    morale: 70,
    chemistry: 68,
    systemFit: 67,
    isStarter,
    role: isStarter ? 'Starter' : 'Backup',
    roleWeeks: 10,
    tradeBlock: false,
    holdout: false,
    stats: { passYds: 0, rushYds: 0, recYds: 0, sacks: 0, defINT: 0 },
  };
}

function makeRoster(teamId: string, ratingBase: number): Player[] {
  return [
    makePlayer(`${teamId}-qb`, teamId, 'QB', ratingBase + 8),
    makePlayer(`${teamId}-rb`, teamId, 'RB', ratingBase + 4),
    makePlayer(`${teamId}-wr1`, teamId, 'WR', ratingBase + 3),
    makePlayer(`${teamId}-wr2`, teamId, 'WR', ratingBase + 1),
    makePlayer(`${teamId}-te`, teamId, 'TE', ratingBase),
    makePlayer(`${teamId}-ol`, teamId, 'OL', ratingBase + 2),
    makePlayer(`${teamId}-dl`, teamId, 'DL', ratingBase + 2),
    makePlayer(`${teamId}-lb`, teamId, 'LB', ratingBase + 1),
    makePlayer(`${teamId}-cb`, teamId, 'CB', ratingBase),
    makePlayer(`${teamId}-s`, teamId, 'S', ratingBase),
    makePlayer(`${teamId}-k`, teamId, 'K', ratingBase - 2),
  ];
}

function makeTeam(id: string, conference: Team['conference'], division: string, isUser = false, ratingBase = 70): Team {
  const roster = makeRoster(id, ratingBase);

  return {
    id,
    city: id.toUpperCase(),
    name: 'Club',
    abbr: id.slice(0, 3).toUpperCase(),
    icon: id.slice(0, 3).toUpperCase(),
    conference,
    division,
    roster,
    capSpace: 25,
    capUsed: 210,
    deadCap: 0,
    deadCapByYear: {},
    wins: 0,
    losses: 0,
    ties: 0,
    streak: 0,
    offScheme: 'spread',
    defScheme: 'cover_3',
    schemeOff: 'spread',
    schemeDef: 'cover_3',
    coachingStaff: { hc: null, oc: null, dc: null },
    staff: { hc: null, oc: null, dc: null },
    ownerId: `${id}-owner`,
    owner: { archetypeId: 'win_now', label: 'Win Now', approval: isUser ? 28 : 60, history: [] },
    ownerMood: isUser ? 28 : 60,
    ownerPatience80: isUser ? 24 : 60,
    gmStrategy: 'neutral',
    draftPicks: [],
    rivalries: [],
    rivals: {},
    franchiseTag973: null,
    isUser,
    clinic: { xp: {}, perks: [] },
    skillSelections: {},
    tradeState: { gmTrustByTeam: {}, recentTrades: [] },
    txLog: [],
    seasonStats: {
      gamesPlayed: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointDifferential: 0,
      totalYards: 0,
      passingYards: 0,
      rushingYards: 0,
      turnoversLost: 0,
      turnoversForced: 0,
      sacksFor: 0,
      sacksAgainst: 0,
    },
  } as unknown as Team;
}

function makeLeagueState(phase: GameState['phase'] = 'regular_season', week = 1): GameState {
  const teams: Record<string, Team> = {};
  const players: GameState['players'] = {};
  const defs: Array<[string, Team['conference'], string, boolean, number]> = [
    ['afce1', 'AFC', 'East', true, 84],
    ['afce2', 'AFC', 'East', false, 75],
    ['afcn1', 'AFC', 'North', false, 81],
    ['afcn2', 'AFC', 'North', false, 72],
    ['afcs1', 'AFC', 'South', false, 80],
    ['afcs2', 'AFC', 'South', false, 71],
    ['afcw1', 'AFC', 'West', false, 79],
    ['afcw2', 'AFC', 'West', false, 70],
    ['nfce1', 'NFC', 'East', false, 83],
    ['nfce2', 'NFC', 'East', false, 74],
    ['nfcn1', 'NFC', 'North', false, 82],
    ['nfcn2', 'NFC', 'North', false, 73],
    ['nfcs1', 'NFC', 'South', false, 78],
    ['nfcs2', 'NFC', 'South', false, 69],
    ['nfcw1', 'NFC', 'West', false, 77],
    ['nfcw2', 'NFC', 'West', false, 68],
  ];

  for (const [id, conference, division, isUser, ratingBase] of defs) {
    const team = makeTeam(id, conference, division, isUser, ratingBase);
    teams[id] = team;
    for (const player of team.roster) players[player.id] = player;
  }

  return {
    version: SAVE_VERSION,
    seed: 42,
    year: 2026,
    week,
    phase,
    difficulty: 'pro',
    players,
    teams,
    owners: {
      'afce1-owner': { id: 'afce1-owner', name: 'Owner', archetype: 'win_now', patience: 24, goals: { floor: '7 wins', target: 'playoffs', ceiling: 'title' }, personality: { spending: 5, patience: 3, mediaAwareness: 6 } },
    },
    schedule: [
      {
        week: 1,
        games: [
          { homeTeamId: 'afce1', awayTeamId: 'afce2', result: null },
          { homeTeamId: 'afcn1', awayTeamId: 'afcn2', result: null },
          { homeTeamId: 'afcs1', awayTeamId: 'afcs2', result: null },
          { homeTeamId: 'afcw1', awayTeamId: 'afcw2', result: null },
          { homeTeamId: 'nfce1', awayTeamId: 'nfce2', result: null },
          { homeTeamId: 'nfcn1', awayTeamId: 'nfcn2', result: null },
          { homeTeamId: 'nfcs1', awayTeamId: 'nfcs2', result: null },
          { homeTeamId: 'nfcw1', awayTeamId: 'nfcw2', result: null },
        ],
      },
      {
        week: 18,
        games: [
          { homeTeamId: 'afce1', awayTeamId: 'afcn1', result: null },
          { homeTeamId: 'afcs1', awayTeamId: 'afcw1', result: null },
          { homeTeamId: 'nfce1', awayTeamId: 'nfcn1', result: null },
          { homeTeamId: 'nfcs1', awayTeamId: 'nfcw1', result: null },
        ],
      },
    ],
    draftClass: [],
    freeAgents: [],
    records: [],
    hallOfFame: [],
    frontOffice: {
      xp: 0,
      level: 1,
      achievements: [],
      perks: [],
      reputation: { players: 50, media: 50, owner: 50 },
    },
    eventLog: [],
    narrativeState: { activeArcs: [], hooks: [], recentHeadlines: [] },
    weekSummaries: [],
    playoffBracket: null,
  } as unknown as GameState;
}

describe('franchise week simulation', () => {
  it('moves preseason dynasties into regular season without consuming week 1', () => {
    const game = makeLeagueState('preseason', 1);
    const result = advanceFranchiseWeek(game);

    expect(result.nextState.phase).toBe('regular_season');
    expect(result.nextState.week).toBe(1);
    expect(result.nextState.schedule[0]!.games[0]!.result).toBeNull();
    expect(result.nextState.weekSummaries).toHaveLength(0);
  });

  it('simulates a deterministic full league week and records a user summary', () => {
    const game = makeLeagueState('regular_season', 1);

    const first = advanceFranchiseWeek(game);
    const second = advanceFranchiseWeek(structuredClone(game));

    expect(first.nextState.schedule[0]!.games.every((entry) => entry.result !== null)).toBe(true);
    expect(first.nextState.week).toBe(2);
    expect(first.nextState.weekSummaries).toHaveLength(1);
    expect(first.nextState.weekSummaries[0]!.teamId).toBe('afce1');
    expect(first.nextState.teams.afce1.seasonStats.gamesPlayed).toBe(1);
    expect(first.nextState.eventLog.length).toBeGreaterThan(0);
    expect(first.nextState.narrativeState.hooks.length).toBeGreaterThan(0);
    expect(first.nextState.weekSummaries).toEqual(second.nextState.weekSummaries);
    expect(first.nextState.schedule[0]).toEqual(second.nextState.schedule[0]);
  });

  it('seeds seven playoff teams per conference using standings tiebreakers', () => {
    const game = makeLeagueState('regular_season', 19);
    const afcTeams = ['afce1', 'afce2', 'afcn1', 'afcn2', 'afcs1', 'afcs2', 'afcw1', 'afcw2'] as const;
    const nfcTeams = ['nfce1', 'nfce2', 'nfcn1', 'nfcn2', 'nfcs1', 'nfcs2', 'nfcw1', 'nfcw2'] as const;
    const records: Record<string, [number, number, number]> = {
      afce1: [13, 4, 120],
      afce2: [10, 7, 40],
      afcn1: [12, 5, 80],
      afcn2: [10, 7, 30],
      afcs1: [11, 6, 55],
      afcs2: [8, 9, -20],
      afcw1: [11, 6, 60],
      afcw2: [10, 7, 30],
      nfce1: [14, 3, 110],
      nfce2: [9, 8, 10],
      nfcn1: [12, 5, 70],
      nfcn2: [10, 7, 25],
      nfcs1: [11, 6, 50],
      nfcs2: [8, 9, -25],
      nfcw1: [11, 6, 50],
      nfcw2: [10, 7, 25],
    };

    for (const teamId of [...afcTeams, ...nfcTeams]) {
      const [wins, losses, pointDifferential] = records[teamId]!;
      game.teams[teamId]!.wins = wins;
      game.teams[teamId]!.losses = losses;
      game.teams[teamId]!.seasonStats.pointDifferential = pointDifferential;
    }

    const bracket = seedPlayoffBracket(game);

    expect(bracket.afc).toHaveLength(7);
    expect(bracket.nfc).toHaveLength(7);
    expect(bracket.afc[0]!.teamId).toBe('afce1');
    expect(bracket.afc[6]!.teamId).toBe('afcw2');
    expect(bracket.nfc[3]!.teamId).toBe('nfcw1');
    expect(bracket.nfc[5]!.teamId).toBe('nfcw2');
    expect(bracket.nfc[6]!.teamId).toBe('nfce2');
  });
});
