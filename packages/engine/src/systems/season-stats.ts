import type { Player, PlayerSeasonStats, Team, TeamGameStats, TeamSeasonStats } from '../types';

export function emptyPlayerStats(): PlayerSeasonStats {
  return {
    gamesPlayed: 0,
    passYds: 0, passTD: 0, passINT: 0, passAtt: 0, passComp: 0,
    rushYds: 0, rushAtt: 0, rushTD: 0, fumbles: 0,
    rec: 0, recYds: 0, recTD: 0, targets: 0,
    sacks: 0, defINT: 0, tackles: 0,
    fgMade: 0, fgAtt: 0,
    yacYds: 0,
  };
}

export function ensurePlayerStatBuckets(player: Player): void {
  player.stats = {
    ...emptyPlayerStats(),
    ...(player.stats ?? {}),
  };
  const careerStats = (player.careerStats ?? {}) as Partial<Player['careerStats']>;
  player.careerStats = {
    ...careerStats,
    seasons: careerStats.seasons ?? 0,
    gp: careerStats.gp ?? 0,
    snaps: careerStats.snaps ?? 0,
  };
}

export function createEmptySeasonStats(gamesPlayed = 0): TeamSeasonStats {
  return {
    gamesPlayed,
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
  };
}

export function ensureSeasonStats(team: Team): TeamSeasonStats {
  if (!team.seasonStats) {
    team.seasonStats = createEmptySeasonStats(team.wins + team.losses + team.ties);
  }
  return team.seasonStats;
}

export function applyGameToSeasonStats(
  team: Team,
  teamStats: TeamGameStats,
  opponentStats: TeamGameStats,
  pointsFor: number,
  pointsAgainst: number,
): void {
  const stats = ensureSeasonStats(team);

  stats.gamesPlayed += 1;
  stats.pointsFor += pointsFor;
  stats.pointsAgainst += pointsAgainst;
  stats.pointDifferential = stats.pointsFor - stats.pointsAgainst;
  stats.totalYards += teamStats.totalYards;
  stats.passingYards += teamStats.passingYards;
  stats.rushingYards += teamStats.rushingYards;
  stats.turnoversLost += teamStats.turnovers;
  stats.turnoversForced += opponentStats.turnovers;
  stats.sacksFor += teamStats.sacks;
  stats.sacksAgainst += opponentStats.sacks;
  stats.drives += teamStats.drives;
  stats.thirdDownConversions += teamStats.thirdDownConversions;
  stats.thirdDownAttempts += teamStats.thirdDownAttempts;
  stats.timeOfPossession += teamStats.timeOfPossession;
  stats.fgMade += teamStats.fgMade;
  stats.fgAttempted += teamStats.fgAttempted;
  stats.punts += teamStats.punts;
  stats.pressuresAllowed += teamStats.pressuresAllowed;
  stats.yacYards += teamStats.yacYards;
  stats.redZoneTrips += teamStats.redZoneTrips;
  stats.redZoneScores += teamStats.redZoneScores;
}

export function tickInjuries(team: Team): void {
  for (const player of team.roster) {
    if (!player.injury) continue;
    const nextGamesOut = Math.max(0, player.injury.gamesOut - 1);
    if (nextGamesOut === 0) {
      player.injury = null;
      continue;
    }
    player.injury = { ...player.injury, gamesOut: nextGamesOut };
  }
}
