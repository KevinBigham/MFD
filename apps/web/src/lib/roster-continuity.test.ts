import { describe, expect, it } from 'vitest';
import type { GameState, Player, Team } from '@mfd/engine';
import { computeRosterContinuity } from './roster-continuity';

function makePlayer(id: string, isStarter: boolean): Player {
  return {
    id,
    firstName: id,
    lastName: 'Player',
    name: `${id} Player`,
    pos: 'QB',
    age: 25,
    ovr: 80,
    pot: 85,
    ratings: {},
    devTrait: 'normal',
    personality: { workEthic: 5, loyalty: 5, greed: 5, pressure: 5, ambition: 5 },
    traits: [],
    archetype: null,
    contract: null,
    teamId: 'team-1',
    draftYear: 2025,
    draftRound: 1,
    draftPick: 1,
    college: 'State',
    yearsExp: 1,
    careerStats: { seasons: 1, gp: 0, snaps: 0 },
    traitMilestones: {},
    traitPowerLevel: {},
    injury: null,
    morale: 60,
    chemistry: 60,
    systemFit: 60,
    cliqueId: null,
    jerseyNumber: 10,
    endorsements: [],
    isStarter,
    role: isStarter ? 'Starter' : 'Backup',
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
  };
}

function makeTeam(roster: Player[], isUser = true): Team {
  return {
    id: 'team-1',
    city: 'Chicago',
    name: 'Blaze',
    abbr: 'CHI',
    icon: 'icon',
    conference: 'AFC',
    division: 'East',
    roster,
    capSpace: 0,
    capUsed: 0,
    deadCap: 0,
    deadCapByYear: {},
    wins: 0,
    losses: 0,
    ties: 0,
    streak: 0,
    offScheme: 'balanced',
    defScheme: 'base-43',
    schemeOff: 'balanced',
    schemeDef: 'base-43',
    coachingStaff: { hc: null, oc: null, dc: null },
    staff: { hc: null, oc: null, dc: null },
    ownerId: 'owner-1',
    owner: null as never,
    ownerMood: 50,
    fanConfidence: 50,
    ownerPatience80: 50,
    gmStrategy: 'neutral',
    philosophy: undefined,
    draftPicks: [],
    rivalries: [],
    rivals: {},
    franchiseTag973: null,
    franchiseTags: [],
    isUser,
    clinic: { xp: {}, perks: [] } as never,
    skillSelections: {},
    tradeState: { gmTrustByTeam: {}, recentTrades: [] } as never,
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
      drives: 0,
      thirdDownConversions: 0,
      thirdDownAttempts: 0,
      timeOfPossession: 0,
      fgMade: 0,
      fgAttempted: 0,
      punts: 0,
      pressuresAllowed: 0,
      yacYards: 0,
      redZoneTrips: 0,
      redZoneScores: 0,
    },
    mentoringPairs: [],
    trainingAssignments: {},
    medicalStaff: null,
    fatigueState: {},
    facilityState: { level: 1, regenBonus: 0, devBonus: 0 } as never,
    practiceSquad: [],
    stadiumType: 'outdoor',
    franchiseIdentity: {} as never,
    lockerRoom: {
      cliques: [],
      captains: [],
      culture: 'stable',
      cultureScore: 50,
      tensions: [],
      lastMeetingWeek: null,
    } as never,
    retiredJerseys: [],
  } as Team;
}

function makeGame(starterIds: string[]): GameState {
  const roster = [
    ...starterIds.map((id) => makePlayer(id, true)),
    makePlayer('backup-1', false),
  ];

  return {
    teams: {
      'team-1': makeTeam(roster, true),
    },
  } as unknown as GameState;
}

describe('computeRosterContinuity', () => {
  it('returns 100 percent retention when every starter is retained', () => {
    expect(computeRosterContinuity(makeGame(['a', 'b', 'c']), ['a', 'b', 'c'])).toEqual({
      retained: 3,
      newlyStarting: 0,
      departed: 0,
      total: 3,
      retentionPct: 100,
    });
  });

  it('returns zero retention when all starters are new', () => {
    expect(computeRosterContinuity(makeGame(['x', 'y', 'z']), ['a', 'b', 'c'])).toEqual({
      retained: 0,
      newlyStarting: 3,
      departed: 3,
      total: 3,
      retentionPct: 0,
    });
  });

  it('handles partial retention with retained, new, and departed counts', () => {
    expect(computeRosterContinuity(makeGame(['a', 'b', 'x', 'y', 'z']), ['a', 'b', 'c', 'd', 'e'])).toEqual({
      retained: 2,
      newlyStarting: 3,
      departed: 3,
      total: 5,
      retentionPct: 40,
    });
  });

  it('handles a zero-total current starter edge cleanly', () => {
    expect(computeRosterContinuity(makeGame([]), ['a', 'b'])).toEqual({
      retained: 0,
      newlyStarting: 0,
      departed: 2,
      total: 0,
      retentionPct: 0,
    });
  });

  it('treats missing last-season data as a clean cold start', () => {
    expect(computeRosterContinuity(makeGame(['a', 'b']), [])).toEqual({
      retained: 0,
      newlyStarting: 2,
      departed: 0,
      total: 2,
      retentionPct: 0,
    });
  });
});
