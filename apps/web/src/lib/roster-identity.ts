import type { GameState } from '@mfd/engine';

export interface RosterIdentity {
  totalPlayers: number;
  homegrownCount: number;
  homegrownPercent: number;
  veteranCount: number;
  rookieCount: number;
  midCareerCount: number;
}

export function computeRosterIdentity(
  game: GameState | null,
): RosterIdentity | null {
  if (!game) return null;

  const userTeam = Object.values(game.teams).find((team) => team.isUser) ?? null;
  if (!userTeam) return null;

  const roster = userTeam.roster;
  let homegrownCount = 0;
  let veteranCount = 0;
  let rookieCount = 0;
  let midCareerCount = 0;

  for (const player of roster) {
    // Active Player objects do not retain origin-team provenance; playerArchive
    // is the canonical first-career-team source when we need that history.
    const firstCareerTeamId = game.playerArchive.find((entry) => entry.playerId === player.id)?.teamHistory[0]?.teamId ?? null;

    if (firstCareerTeamId === userTeam.id) homegrownCount += 1;

    if (player.age <= 22) {
      rookieCount += 1;
      continue;
    }

    if (player.age >= 30) {
      veteranCount += 1;
      continue;
    }

    midCareerCount += 1;
  }

  return {
    totalPlayers: roster.length,
    homegrownCount,
    homegrownPercent: roster.length === 0 ? 0 : Math.round((homegrownCount / roster.length) * 100),
    veteranCount,
    rookieCount,
    midCareerCount,
  };
}
