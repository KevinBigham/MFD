import { describe, expect, it } from 'vitest';
import type { Team, TeamGameStats } from '../types';
import {
  applyGameToSeasonStats,
  createEmptySeasonStats,
  emptyPlayerStats,
  ensureSeasonStats,
  tickInjuries,
} from './season-stats';
import { makePlayer, makeTeam } from './test-helpers';

function makeGameStats(overrides: Partial<TeamGameStats> = {}): TeamGameStats {
  return {
    totalYards: 350,
    passingYards: 220,
    rushingYards: 130,
    turnovers: 1,
    sacks: 2,
    pressuresAllowed: 4,
    thirdDownConversions: 5,
    thirdDownAttempts: 11,
    timeOfPossession: 31,
    passAttempts: 32,
    passCompletions: 21,
    passTDs: 2,
    interceptions: 1,
    rushAttempts: 24,
    rushTDs: 1,
    fumbles: 0,
    penalties: 5,
    penaltyYards: 45,
    fgMade: 2,
    fgAttempted: 3,
    punts: 4,
    drives: 10,
    yacYards: 85,
    redZoneTrips: 3,
    redZoneScores: 2,
    quarterScores: [7, 10, 3, 7],
    playerLines: [],
    ...overrides,
  };
}

describe('season-stats direct coverage', () => {
  it('creates zeroed player stat lines', () => {
    const stats = emptyPlayerStats();

    expect(Object.values(stats).every((value) => value === 0)).toBe(true);
    expect(stats.passYds).toBe(0);
    expect(stats.recYds).toBe(0);
    expect(stats.defINT).toBe(0);
  });

  it('creates empty team season stats with a configurable games-played seed', () => {
    const stats = createEmptySeasonStats(4);

    expect(stats.gamesPlayed).toBe(4);
    expect(stats.pointsFor).toBe(0);
    expect(stats.pointDifferential).toBe(0);
    expect(stats.redZoneScores).toBe(0);
  });

  it('initializes missing team season stats from the current record', () => {
    const team = makeTeam('stats-init', 'AFC', 'East', false, 80);
    team.wins = 6;
    team.losses = 3;
    team.ties = 1;
    (team as Team & { seasonStats?: Team['seasonStats'] }).seasonStats = undefined;

    const stats = ensureSeasonStats(team);

    expect(stats.gamesPlayed).toBe(10);
    expect(team.seasonStats).toBe(stats);
  });

  it('applies a single game into the season totals', () => {
    const team = makeTeam('stats-apply', 'AFC', 'North', false, 78);

    applyGameToSeasonStats(team, makeGameStats(), makeGameStats({ turnovers: 2, sacks: 3 }), 27, 20);

    expect(team.seasonStats.gamesPlayed).toBe(1);
    expect(team.seasonStats.pointsFor).toBe(27);
    expect(team.seasonStats.pointsAgainst).toBe(20);
    expect(team.seasonStats.pointDifferential).toBe(7);
    expect(team.seasonStats.totalYards).toBe(350);
    expect(team.seasonStats.turnoversLost).toBe(1);
    expect(team.seasonStats.turnoversForced).toBe(2);
    expect(team.seasonStats.sacksFor).toBe(2);
    expect(team.seasonStats.sacksAgainst).toBe(3);
  });

  it('accumulates season totals across multiple games', () => {
    const team = makeTeam('stats-stack', 'NFC', 'South', false, 76);

    applyGameToSeasonStats(team, makeGameStats({ totalYards: 300, turnovers: 0 }), makeGameStats({ turnovers: 1 }), 24, 17);
    applyGameToSeasonStats(team, makeGameStats({ totalYards: 410, turnovers: 2 }), makeGameStats({ turnovers: 0 }), 30, 21);

    expect(team.seasonStats.gamesPlayed).toBe(2);
    expect(team.seasonStats.pointsFor).toBe(54);
    expect(team.seasonStats.pointsAgainst).toBe(38);
    expect(team.seasonStats.totalYards).toBe(710);
    expect(team.seasonStats.turnoversLost).toBe(2);
    expect(team.seasonStats.turnoversForced).toBe(1);
  });

  it('ticks injury timers down and clears recovered players', () => {
    const team = makeTeam('stats-injury', 'NFC', 'West', false, 77);
    const active = makePlayer('inj-active', team.id, 'QB', 80);
    active.injury = {
      id: 'inj-active',
      type: 'hamstring',
      severity: 'out',
      severityTier: 'minor',
      gamesOut: 2,
      gamesRecovered: 0,
      reinjuryRisk: 0.1,
      affectedRatings: [],
      ratingPenalty: 2,
      onIR: false,
    };
    const recovered = makePlayer('inj-done', team.id, 'WR', 78);
    recovered.injury = {
      id: 'inj-done',
      type: 'ankle_sprain',
      severity: 'out',
      severityTier: 'minor',
      gamesOut: 1,
      gamesRecovered: 0,
      reinjuryRisk: 0.1,
      affectedRatings: [],
      ratingPenalty: 2,
      onIR: false,
    };
    team.roster = [active, recovered];

    tickInjuries(team);

    expect(team.roster[0]?.injury?.gamesOut).toBe(1);
    expect(team.roster[1]?.injury).toBeNull();
  });

  it('leaves healthy players untouched when injuries tick forward', () => {
    const team = makeTeam('stats-healthy', 'AFC', 'West', false, 79);
    const healthy = makePlayer('healthy', team.id, 'RB', 77);
    team.roster = [healthy];

    tickInjuries(team);

    expect(team.roster[0]?.injury).toBeNull();
  });
});
