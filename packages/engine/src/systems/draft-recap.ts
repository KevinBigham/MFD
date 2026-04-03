import type { DraftRecap, DraftRecapPick, GameState, Player } from '../types';

function draftedPlayersForYear(game: GameState): Player[] {
  return Object.values(game.players)
    .filter((player) => player.teamId && player.draftYear === game.year)
    .sort((a, b) => a.draftRound - b.draftRound || a.draftPick - b.draftPick || b.ovr - a.ovr || a.id.localeCompare(b.id));
}

function toRecapPick(player: Player, projectedPick: number): DraftRecapPick {
  const actualPick = Math.max(1, (player.draftRound - 1) * 32 + player.draftPick);
  const valueDelta = actualPick - projectedPick;
  return {
    playerId: player.id,
    teamId: player.teamId ?? '',
    playerName: player.name,
    position: player.pos,
    ovr: player.ovr,
    round: player.draftRound,
    pick: actualPick,
    projectedPick,
    valueDelta,
    verdict: valueDelta >= 10 ? 'steal' : valueDelta <= -10 ? 'reach' : 'fair',
  };
}

function gradeFromScore(score: number): string {
  if (score >= 24) return 'A';
  if (score >= 12) return 'B+';
  if (score >= 4) return 'B';
  if (score >= -4) return 'C+';
  if (score >= -10) return 'C';
  if (score >= -18) return 'D';
  return 'F';
}

function expectedOvrForPick(pick: number): number {
  return Math.max(58, 87 - pick * 0.14);
}

export function generateDraftRecap(game: GameState, teamId: string): DraftRecap | null {
  const drafted = draftedPlayersForYear(game);
  if (drafted.length === 0) return null;

  const byGrade = [...drafted].sort((a, b) => b.ovr - a.ovr || a.id.localeCompare(b.id));
  const recapPicks = drafted.map((player) => toRecapPick(player, byGrade.findIndex((candidate) => candidate.id === player.id) + 1));
  const teamPicks = recapPicks.filter((entry) => entry.teamId === teamId);
  if (teamPicks.length === 0) return null;

  const score = teamPicks.reduce((sum, entry) =>
    sum + entry.valueDelta + (entry.ovr - expectedOvrForPick(entry.pick)) * 2,
  0);
  const bestValue = [...teamPicks].sort((a, b) => b.valueDelta - a.valueDelta || b.ovr - a.ovr || a.playerId.localeCompare(b.playerId))[0]!;
  const biggestReach = [...teamPicks].sort((a, b) => a.valueDelta - b.valueDelta || a.ovr - b.ovr || a.playerId.localeCompare(b.playerId))[0]!;

  return {
    year: game.year,
    teamId,
    picks: teamPicks,
    classGrade: gradeFromScore(score),
    bestValue,
    biggestReach,
    steals: teamPicks.filter((entry) => entry.verdict === 'steal'),
    leagueHighlights: recapPicks
      .filter((entry) => entry.pick <= 5)
      .sort((a, b) => a.pick - b.pick || a.playerId.localeCompare(b.playerId))
      .slice(0, 5),
  };
}
