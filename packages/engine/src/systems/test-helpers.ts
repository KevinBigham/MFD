import { makeContract, SAVE_VERSION, emptyPlayerStats } from '../index';
import { createEmptyRecordBook } from './records';
import type { GameState, GameDayState, Player, Team } from '../types';

export function createEmptyGameDayState(): GameDayState {
  return {
    recentPackages: [],
    latestPackageId: null,
  };
}

export function makePlayer(
  id: string,
  teamId: string | null,
  pos: Player['pos'],
  ovr: number,
  isStarter = true,
): Player {
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
    contract: teamId ? makeContract(8, 3, 4, 3, id, teamId) : null,
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
    stats: emptyPlayerStats(),
  };
}

export function makeRoster(teamId: string, ratingBase: number): Player[] {
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
    makePlayer(`${teamId}-p`, teamId, 'P', ratingBase - 2),
  ];
}

export function makeTeam(
  id: string,
  conference: Team['conference'],
  division: string,
  isUser = false,
  ratingBase = 70,
): Team {
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
    mentoringPairs: [],
    practiceSquad: [],
    stadiumType: 'outdoor',
  } as unknown as Team;
}

export function makeLeagueState(
  phase: GameState['phase'] = 'regular_season',
  week = 1,
): GameState {
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
    for (const player of team.roster) {
      players[player.id] = player;
    }
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
      'afce1-owner': {
        id: 'afce1-owner',
        name: 'Owner',
        archetype: 'win_now',
        patience: 24,
        goals: { floor: '7 wins', target: 'playoffs', ceiling: 'title' },
        personality: { spending: 5, patience: 3, mediaAwareness: 6 },
      },
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
    records: createEmptyRecordBook(),
    awardsHistory: [],
    hallOfFame: [],
    powerRankings: [],
    franchiseHistory: [],
    playerArchive: [],
    frontOffice: {
      xp: 0,
      level: 1,
      achievements: [],
      perks: [],
      reputation: { players: 50, media: 50, owner: 50 },
    },
    eventLog: [],
    narrativeState: { activeArcs: [], hooks: [], recentHeadlines: [] },
    offFieldEvents: [],
    recentPressConferences: [],
    coachingHistory: [],
    leagueRivalries: [],
    activeEffects: [],
    gameDayState: createEmptyGameDayState(),
    weekSummaries: [],
    playoffBracket: null,
    offseasonState: null,
    scoutingDepartment: {
      scouts: [],
      availableScouts: [],
      budget: 5,
      maxScouts: 5,
    },
    conditionalPicks: [],
    waiverOrder: Object.keys(teams),
    waiverWire: [],
    waiverClaims: [],
    handshakes: [],
  } as unknown as GameState;
}
