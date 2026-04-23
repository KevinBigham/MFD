import { computePowerRankings } from '../media-cycle';
import type { MediaPowerRanking } from '../media-cycle';
import type { GameState, PowerRanking } from '../types';

function toSnapshot(previous: PowerRanking[], weekNumber: number): MediaPowerRanking[] {
  return previous.map((entry) => ({
    teamId: entry.teamId,
    teamName: entry.teamName,
    rank: entry.rank,
    rankDelta: entry.delta,
    score: entry.score,
    blurb: entry.blurb,
    record: entry.record,
    weekNumber,
  }));
}

export function createPowerRankings(game: GameState, previous: PowerRanking[] = []): PowerRanking[] {
  const previousRankByTeam = new Map(previous.map((entry) => [entry.teamId, entry.rank]));
  const stateForMedia: GameState = previous.length > 0
    ? {
      ...game,
      mediaCycle: {
        ...(game.mediaCycle ?? {
          weeklyDigests: [],
          powerRankingHistory: [],
        }),
        powerRankingHistory: [{
          weekNumber: Math.max(1, game.week - 1),
          rankings: toSnapshot(previous, Math.max(1, game.week - 1)),
        }],
      },
    }
    : game;
  const rankings = computePowerRankings(stateForMedia, game.week);

  return rankings.map((entry) => ({
    rank: entry.rank,
    teamId: entry.teamId,
    teamName: entry.teamName,
    score: entry.score,
    previousRank: previousRankByTeam.get(entry.teamId) ?? null,
    delta: previousRankByTeam.has(entry.teamId) ? entry.rankDelta : 0,
    blurb: entry.blurb,
    record: entry.record,
  }));
}

export function updatePowerRankings(game: GameState, previous: PowerRanking[] = game.powerRankings ?? []): PowerRanking[] {
  const rankings = createPowerRankings(game, previous);
  game.powerRankings = rankings;
  return rankings;
}
