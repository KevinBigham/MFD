import { getTeamContent, type GameState } from '@mfd/engine';

export type RivalryHeatLevel = 'cold' | 'warm' | 'hot' | 'scalding';

export interface RivalryHeatMapEntry {
  rivalTeamId: string;
  rivalAbbr: string;
  rivalCityName: string;
  wins: number;
  losses: number;
  ties: number;
  totalGames: number;
  winPct: number;
  heatLevel: RivalryHeatLevel;
}

function heatLevel(totalGames: number): RivalryHeatLevel {
  if (totalGames >= 20) return 'scalding';
  if (totalGames >= 10) return 'hot';
  if (totalGames >= 5) return 'warm';
  return 'cold';
}

function heatRank(level: RivalryHeatLevel): number {
  if (level === 'scalding') return 4;
  if (level === 'hot') return 3;
  if (level === 'warm') return 2;
  return 1;
}

export function computeRivalryHeatMap(game: GameState | null, userTeamId: string | null): RivalryHeatMapEntry[] {
  if (!game || !userTeamId) return [];

  const declaredRivalries = getTeamContent(userTeamId)?.rivalries ?? [];
  if (declaredRivalries.length === 0) return [];

  return declaredRivalries
    .map((rivalry) => {
      const rivalTeam = game.teams[rivalry.opponentId];
      const rivalContent = getTeamContent(rivalry.opponentId);
      const wins = 0;
      const losses = 0;
      const ties = 0;
      const totalGames = wins + losses + ties;

      // The current save shape does not preserve dynasty-specific head-to-head
      // W-L-T results by opponent, so this panel ships the declared rivalry
      // identities first and leaves historical records at zero until that data
      // becomes derivable without engine changes.
      return {
        rivalTeamId: rivalry.opponentId,
        rivalAbbr: rivalTeam?.abbr ?? rivalContent?.id ?? rivalry.opponentId,
        rivalCityName: rivalTeam?.city ?? rivalContent?.city ?? rivalry.opponentId,
        wins,
        losses,
        ties,
        totalGames,
        winPct: totalGames > 0 ? wins / totalGames : 0,
        heatLevel: heatLevel(totalGames),
      };
    })
    .sort((left, right) =>
      heatRank(right.heatLevel) - heatRank(left.heatLevel)
      || right.totalGames - left.totalGames
      || left.rivalAbbr.localeCompare(right.rivalAbbr));
}
