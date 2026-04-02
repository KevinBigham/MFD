import type { GameResult, GameState, LeagueRivalry, Rivalry, RivalryGameContext, RivalryResult, Team } from '../types';
import { ensureLivingWorldState } from './off-field-events';

function rivalryId(teamA: string, teamB: string): string {
  return [teamA, teamB].sort().join('::');
}

function legacyHeat(intensity: number): number {
  return Math.max(1, Math.min(10, Math.round(intensity / 8)));
}

function rivalryTier(intensity: number): RivalryGameContext['tier'] {
  if (intensity >= 76) return 'blood_feud';
  if (intensity >= 51) return 'heated';
  return 'budding';
}

function findRivalry(game: GameState, teamA: string, teamB: string): LeagueRivalry | null {
  return game.leagueRivalries.find((entry) => entry.id === rivalryId(teamA, teamB)) ?? null;
}

function toLegacyHistory(history: LeagueRivalry['history'], year: number, week: number): RivalryResult[] {
  return history.slice(-3).map((entry, index) => ({
    year,
    week: Math.max(1, week - index),
    winner: entry,
    score: entry,
  }));
}

function syncLegacyRivalry(game: GameState, rivalry: LeagueRivalry): void {
  const teamA = game.teams[rivalry.teamA];
  const teamB = game.teams[rivalry.teamB];
  if (!teamA || !teamB) return;

  const heat = legacyHeat(rivalry.intensity);
  teamA.rivals[teamB.id] = { heat };
  teamB.rivals[teamA.id] = { heat };

  const upsertTeamRivalry = (team: Team, opponentId: string): void => {
    const existing = team.rivalries.find((entry) => entry.teamId === opponentId);
    if (existing) {
      existing.heat = rivalry.intensity;
      existing.history = toLegacyHistory(rivalry.history, rivalry.lastMetYear ?? game.year, rivalry.lastMetWeek ?? game.week);
      return;
    }
    const legacy: Rivalry = {
      teamId: opponentId,
      heat: rivalry.intensity,
      trophyName: null,
      history: toLegacyHistory(rivalry.history, rivalry.lastMetYear ?? game.year, rivalry.lastMetWeek ?? game.week),
    };
    team.rivalries.push(legacy);
  };

  upsertTeamRivalry(teamA, teamB.id);
  upsertTeamRivalry(teamB, teamA.id);
}

function ensureRivalry(game: GameState, teamA: string, teamB: string, isDivision: boolean): LeagueRivalry {
  const existing = findRivalry(game, teamA, teamB);
  if (existing) return existing;

  const rivalry: LeagueRivalry = {
    id: rivalryId(teamA, teamB),
    teamA: [teamA, teamB].sort()[0]!,
    teamB: [teamA, teamB].sort()[1]!,
    intensity: isDivision ? 40 : 10,
    isDivision,
    history: [],
    lastMetYear: null,
    lastMetWeek: null,
  };
  game.leagueRivalries.push(rivalry);
  syncLegacyRivalry(game, rivalry);
  return rivalry;
}

export function seedLeagueRivalries(game: GameState): void {
  ensureLivingWorldState(game);
  for (const first of Object.values(game.teams)) {
    for (const second of Object.values(game.teams)) {
      if (first.id >= second.id) continue;
      if (first.division !== second.division) continue;
      const rivalry = ensureRivalry(game, first.id, second.id, true);
      rivalry.intensity = Math.max(rivalry.intensity, 40);
      syncLegacyRivalry(game, rivalry);
    }
  }
}

export function updateLeagueRivalriesFromGame(
  game: GameState,
  result: GameResult,
  options?: {
    playoffElimination?: boolean;
    revengePlayerPerformed?: boolean;
  },
): LeagueRivalry {
  ensureLivingWorldState(game);
  const teamA = game.teams[result.homeTeamId];
  const teamB = game.teams[result.awayTeamId];
  const isDivision = teamA?.division === teamB?.division;
  const rivalry = ensureRivalry(game, result.homeTeamId, result.awayTeamId, Boolean(isDivision));
  let delta = 0;

  if (Math.abs(result.homeScore - result.awayScore) <= 3) {
    delta += 5;
    rivalry.history.unshift(`${result.year} Week ${result.week}: close game ${result.homeScore}-${result.awayScore}`);
  }
  if (options?.playoffElimination) {
    delta += 20;
    rivalry.history.unshift(`${result.year}: playoff elimination added fuel`);
  }
  if (options?.revengePlayerPerformed) {
    delta += 10;
    rivalry.history.unshift(`${result.year}: former player revenge performance`);
  }
  if (delta === 0 && rivalry.history.length === 0) {
    rivalry.history.unshift(`${result.year} Week ${result.week}: first real spark`);
    delta = 3;
  }

  rivalry.intensity = Math.min(100, rivalry.intensity + delta);
  rivalry.lastMetYear = result.year;
  rivalry.lastMetWeek = result.week;
  rivalry.history = rivalry.history.slice(0, 8);
  syncLegacyRivalry(game, rivalry);
  return rivalry;
}

export function decayLeagueRivalries(game: GameState): void {
  ensureLivingWorldState(game);
  for (const rivalry of game.leagueRivalries) {
    const minimum = rivalry.isDivision ? 30 : rivalry.history.length > 0 ? 10 : 0;
    rivalry.intensity = Math.max(minimum, rivalry.intensity - 3);
    syncLegacyRivalry(game, rivalry);
  }
}

export function getRivalryGameContext(game: GameState, homeTeamId: string, awayTeamId: string): RivalryGameContext | null {
  ensureLivingWorldState(game);
  const rivalry = findRivalry(game, homeTeamId, awayTeamId);
  if (!rivalry || rivalry.intensity <= 20) return null;

  const teamA = game.teams[homeTeamId];
  const teamB = game.teams[awayTeamId];
  const tier = rivalryTier(rivalry.intensity);
  const headline = tier === 'blood_feud'
    ? `${teamA?.name ?? 'Team'} and ${teamB?.name ?? 'Team'} enter a blood feud.`
    : tier === 'heated'
      ? `${teamA?.name ?? 'Team'} and ${teamB?.name ?? 'Team'} are carrying real heat into kickoff.`
      : `${teamA?.name ?? 'Team'} and ${teamB?.name ?? 'Team'} have a budding rivalry brewing.`;

  return {
    rivalryId: rivalry.id,
    intensity: rivalry.intensity,
    tier,
    ovrBoost: rivalry.intensity > 50 ? 3 : 0,
    headline,
  };
}
