import type {
  AdvancedStats,
  GameState,
  Player,
  Team,
  TeamSeasonStats,
} from '../types';
import { playerDisplayName } from '../utils';

const EXPECTED_POINTS_PER_GAME = 21;

function safeDivide(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function primaryStatForPlayer(player: Player): keyof Player['stats'] {
  switch (player.pos) {
    case 'QB':
      return 'passYds';
    case 'RB':
      return 'rushYds';
    case 'WR':
    case 'TE':
      return 'recYds';
    case 'DL':
    case 'LB':
      return 'sacks';
    case 'CB':
    case 'S':
      return 'defINT';
    case 'K':
      return 'fgMade';
    default:
      return 'tackles';
  }
}

function findStartingQuarterback(team: Team): Player | null {
  return team.roster
    .filter((player) => player.pos === 'QB')
    .sort((a, b) => Number(b.isStarter) - Number(a.isStarter) || b.ovr - a.ovr)[0] ?? null;
}

export function calculateAdvancedStats(team: Team, seasonStats: TeamSeasonStats): AdvancedStats {
  const gamesPlayed = Math.max(1, seasonStats.gamesPlayed);
  const qb = findStartingQuarterback(team);
  const passAtt = qb?.stats.passAtt ?? 0;
  const passComp = qb?.stats.passComp ?? 0;
  const passTd = qb?.stats.passTD ?? 0;
  const passInt = qb?.stats.passINT ?? 0;

  return {
    qbr: round((safeDivide(passComp, passAtt) * 100 + passTd * 20 - passInt * 25) / 6),
    epa: round((seasonStats.pointsFor - EXPECTED_POINTS_PER_GAME * gamesPlayed) / gamesPlayed),
    successRate: round(safeDivide(team.wins, gamesPlayed)),
    yac: round(safeDivide(seasonStats.yacYards, gamesPlayed)),
    pressureRate: round(safeDivide(seasonStats.pressuresAllowed, Math.max(1, qb?.stats.passAtt ?? 0))),
    thirdDownRate: round(safeDivide(seasonStats.thirdDownConversions, seasonStats.thirdDownAttempts)),
    redZoneRate: round(safeDivide(seasonStats.redZoneScores, seasonStats.redZoneTrips)),
    turnoverRate: round(safeDivide(seasonStats.turnoversLost, gamesPlayed)),
  };
}

export function calculatePlayerEfficiency(player: Player): number {
  switch (player.pos) {
    case 'QB':
      return round(safeDivide(player.stats.passTD - player.stats.passINT, player.stats.passAtt) * 100);
    case 'RB':
      return round(safeDivide(player.stats.rushYds, player.stats.rushAtt));
    case 'WR':
    case 'TE':
      return round(safeDivide(player.stats.recYds, player.stats.targets));
    case 'DL':
    case 'LB':
    case 'CB':
    case 'S':
      return round(safeDivide(player.stats.sacks + player.stats.defINT + player.stats.tackles / 5, Math.max(1, player.stats.gamesPlayed)));
    case 'K':
      return round(safeDivide(player.stats.fgMade, player.stats.fgAtt) * 100);
    default:
      return round(safeDivide(player.stats.tackles, Math.max(1, player.stats.gamesPlayed)));
  }
}

export function getStatLeaders(game: GameState, stat: keyof Player['stats'], count: number): Array<{
  playerId: string;
  teamId: string | null;
  name: string;
  value: number;
}> {
  return Object.values(game.players)
    .map((player) => ({
      playerId: player.id,
      teamId: player.teamId,
      name: playerDisplayName(player),
      value: Number(player.stats[stat] ?? 0),
    }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
    .slice(0, count);
}

export function getTeamRankings(game: GameState): {
  offense: Array<{ teamId: string; value: number; stats: AdvancedStats }>;
  defense: Array<{ teamId: string; value: number; stats: AdvancedStats }>;
  specialTeams: Array<{ teamId: string; value: number; stats: AdvancedStats }>;
} {
  const scored = Object.values(game.teams).map((team) => {
    const stats = calculateAdvancedStats(team, team.seasonStats);
    const gamesPlayed = Math.max(0, team.seasonStats.gamesPlayed);
    if (gamesPlayed === 0) {
      return {
        teamId: team.id,
        stats,
        offense: Number.NEGATIVE_INFINITY,
        defense: Number.NEGATIVE_INFINITY,
        specialTeams: Number.NEGATIVE_INFINITY,
      };
    }
    return {
      teamId: team.id,
      stats,
      offense: stats.epa + stats.qbr / 20 + stats.successRate * 10 - stats.turnoverRate * 4,
      defense: safeDivide(team.seasonStats.pointsAgainst, gamesPlayed) * -1 + (team.seasonStats.turnoversForced / gamesPlayed),
      specialTeams: safeDivide(team.seasonStats.fgMade, Math.max(1, team.seasonStats.fgAttempted)) * 10 - safeDivide(team.seasonStats.punts, gamesPlayed),
    };
  });

  return {
    offense: [...scored].sort((a, b) => b.offense - a.offense || a.teamId.localeCompare(b.teamId)).map(({ teamId, offense, stats }) => ({ teamId, value: round(offense), stats })),
    defense: [...scored].sort((a, b) => b.defense - a.defense || a.teamId.localeCompare(b.teamId)).map(({ teamId, defense, stats }) => ({ teamId, value: round(defense), stats })),
    specialTeams: [...scored].sort((a, b) => b.specialTeams - a.specialTeams || a.teamId.localeCompare(b.teamId)).map(({ teamId, specialTeams, stats }) => ({ teamId, value: round(specialTeams), stats })),
  };
}

export function getPlayerComparison(game: GameState, playerIdA: string, playerIdB: string): {
  stat: keyof Player['stats'];
  playerA: { id: string; name: string; value: number; efficiency: number };
  playerB: { id: string; name: string; value: number; efficiency: number };
} | null {
  const playerA = game.players[playerIdA];
  const playerB = game.players[playerIdB];
  if (!playerA || !playerB) return null;

  const stat = primaryStatForPlayer(playerA);
  return {
    stat,
    playerA: {
      id: playerA.id,
      name: playerA.name,
      value: Number(playerA.stats[stat] ?? 0),
      efficiency: calculatePlayerEfficiency(playerA),
    },
    playerB: {
      id: playerB.id,
      name: playerB.name,
      value: Number(playerB.stats[stat] ?? 0),
      efficiency: calculatePlayerEfficiency(playerB),
    },
  };
}

export function getWeeklyTrend(game: GameState, teamId: string, stat: keyof TeamSeasonStats | 'pointsFor', weeks: number): number[] {
  const history = game.schedule
    .flatMap((week) => week.games.map((gameResult) => ({ week: week.week, game: gameResult })))
    .filter(({ game }) => game.result && (game.homeTeamId === teamId || game.awayTeamId === teamId))
    .slice(-weeks);

  return history.map(({ game }) => {
    if (!game.result) return 0;
    if (stat === 'pointsFor') {
      return game.result.homeTeamId === teamId ? game.result.homeScore : game.result.awayScore;
    }
    const teamStats = game.result.stats[teamId];
    return Number(teamStats?.[stat as keyof typeof teamStats] ?? 0);
  });
}
