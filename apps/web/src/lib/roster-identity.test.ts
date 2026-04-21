import { describe, expect, it } from 'vitest';
import type { GameState, Player, PlayerArchiveEntry, Team } from '@mfd/engine';
import { computeRosterIdentity } from './roster-identity';

function makePlayer(id: string, age: number, teamId = 'team-1'): Player {
  return {
    id,
    firstName: id,
    lastName: 'Player',
    name: `${id} Player`,
    pos: 'QB',
    age,
    ovr: 80,
    pot: 85,
    ratings: {},
    devTrait: 'normal',
    personality: { workEthic: 5, loyalty: 5, greed: 5, pressure: 5, ambition: 5 },
    traits: [],
    archetype: null,
    contract: null,
    teamId,
    draftYear: 2026,
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
    isStarter: false,
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
  };
}

function makeArchiveEntry(playerId: string, teamId: string): PlayerArchiveEntry {
  return {
    playerId,
    firstName: playerId,
    lastName: 'Player',
    name: `${playerId} Player`,
    positions: ['QB'],
    jerseyNumber: 10,
    peakOvr: 80,
    peakYear: 2026,
    firstYear: 2026,
    lastYear: 2026,
    retirementYear: null,
    teamHistory: [{ teamId, firstYear: 2026, lastYear: 2026 }],
    careerStats: { seasons: 1, gp: 0, snaps: 0 },
  };
}

function makeTeam(id: string, roster: Player[], isUser = false): Team {
  return {
    id,
    city: 'City',
    name: 'Club',
    abbr: id.toUpperCase(),
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
    divisionWins: 0,
    divisionLosses: 0,
    conferenceWins: 0,
    conferenceLosses: 0,
    headToHead: {},
    pointsFor: 0,
    pointsAgainst: 0,
    seasonStats: {
      pointsFor: 0,
      pointsAgainst: 0,
      pointDifferential: 0,
      totalYards: 0,
      rushYards: 0,
      passYards: 0,
      sacks: 0,
      turnovers: 0,
      takeaways: 0,
      thirdDownPct: 0,
      redZonePct: 0,
    },
    teamStats: [],
    staff: { hc: null, oc: null, dc: null },
    owner: null,
    clinic: { xp: {}, perks: [] },
    lockerRoom: {
      cliques: [],
      captains: [],
      culture: 'stable',
      cultureScore: 50,
      tensions: [],
      lastMeetingWeek: null,
    },
    doctrineIds: [],
    franchiseIdentity: null,
    stadiumSponsorsSeen: [],
    specialTeams: { kickerId: null, punterId: null, returnerIds: [] },
    tradeState: { gmTrustByTeam: {}, recentTrades: [] },
    doctrineProgress: {},
    draftPicks: [],
    retiredNumbers: [],
    practiceSquad: [],
    injuryReport: [],
    trainingAssignments: [],
    mentoringPairs: [],
    history: [],
    relocationStatus: null,
    teamNeeds: null,
    depthChart: {},
    scheme: { offense: 'balanced', defense: 'base-43' },
    gmStrategy: 'neutral',
    philosophy: 'maintain',
    medicalStaff: { level: 1, injuryReduction: 0, recoveryBoost: 0 },
    fatigue: { players: {}, weeklyRecovery: 0, injuryRiskModifier: 0 },
    facilities: { level: 1, regenBonus: 0, devBonus: 0 },
    isUser,
  } as unknown as Team;
}

function makeGame(teams: Record<string, Team>, playerArchive: PlayerArchiveEntry[] = []): GameState {
  return {
    teams,
    playerArchive,
  } as GameState;
}

describe('computeRosterIdentity', () => {
  it('returns null when game is null', () => {
    expect(computeRosterIdentity(null)).toBeNull();
  });

  it('returns null when no user team exists', () => {
    const game = makeGame({
      'team-2': makeTeam('team-2', [makePlayer('p-1', 24)]),
    });

    expect(computeRosterIdentity(game)).toBeNull();
  });

  it('rounds homegrown percent to the nearest integer', () => {
    const roster = Array.from({ length: 53 }, (_, index) => makePlayer(`p-${index}`, 25));
    const archive = roster.map((player, index) => makeArchiveEntry(player.id, index < 11 ? 'team-1' : 'team-2'));
    const game = makeGame({
      'team-1': makeTeam('team-1', roster, true),
    }, archive);

    expect(computeRosterIdentity(game)?.homegrownPercent).toBe(21);
  });

  it('counts rookies, mid-career players, and veterans by age bucket', () => {
    const roster = [
      makePlayer('rookie', 22),
      makePlayer('mid-a', 23),
      makePlayer('mid-b', 29),
      makePlayer('vet', 30),
    ];
    const archive = roster.map((player) => makeArchiveEntry(player.id, 'team-1'));
    const game = makeGame({
      'team-1': makeTeam('team-1', roster, true),
    }, archive);

    const identity = computeRosterIdentity(game);

    expect(identity?.rookieCount).toBe(1);
    expect(identity?.midCareerCount).toBe(2);
    expect(identity?.veteranCount).toBe(1);
  });

  it('returns a zero percent homegrown share for an empty roster', () => {
    const game = makeGame({
      'team-1': makeTeam('team-1', [], true),
    });

    expect(computeRosterIdentity(game)).toEqual({
      totalPlayers: 0,
      homegrownCount: 0,
      homegrownPercent: 0,
      veteranCount: 0,
      rookieCount: 0,
      midCareerCount: 0,
    });
  });
});
