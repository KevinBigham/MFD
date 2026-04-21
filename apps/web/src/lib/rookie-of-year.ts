import type { GameState, Player, Position } from '@mfd/engine';

export interface RookieOfYearEntry {
  playerId: string;
  playerName: string;
  teamId: string;
  teamAbbr: string;
  position: Position;
  compositeScore: number;
  headline: string;
  highlights: string[];
  season: number;
}

type PlayerSeasonSnapshot = {
  teamId: string | null;
  gamesPlayed: number;
  stats: Player['stats'];
};

function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}

function offensiveOutput(player: Player): number {
  return (
    player.stats.passYds * 0.025 +
    player.stats.passTD * 2.5 -
    player.stats.passINT * 1.4 +
    player.stats.rushYds * 0.05 +
    player.stats.rushTD * 2.2 +
    player.stats.recYds * 0.05 +
    player.stats.recTD * 2.1
  );
}

function defensiveOutput(player: Player): number {
  return (
    player.stats.tackles * 0.12 +
    player.stats.sacks * 4.4 +
    player.stats.defINT * 6.2
  );
}

function kickerOutput(player: Player): number {
  return player.stats.fgMade * 1.6 - (player.stats.fgAtt - player.stats.fgMade) * 0.9;
}

function punterOutput(player: Player): number {
  return player.ovr * 0.9;
}

function rookieSeasonSnapshot(game: GameState, player: Player, season: number): PlayerSeasonSnapshot {
  const historyEntry = [...(game.playerSeasonHistory?.[player.id] ?? [])]
    .find((entry) => entry.season === season) ?? null;

  if (!historyEntry) {
    return {
      teamId: player.teamId,
      gamesPlayed: Number(player.stats.gamesPlayed ?? 0),
      stats: player.stats,
    };
  }

  // Year-rollover hooks can run after the completed season has already been
  // archived into playerSeasonHistory, so prefer that snapshot when present.
  return {
    teamId: historyEntry.teamId ?? player.teamId,
    gamesPlayed: Number(historyEntry.gamesPlayed ?? 0),
    stats: {
      ...player.stats,
      ...historyEntry.keyStats,
      gamesPlayed: Number(historyEntry.gamesPlayed ?? 0),
    },
  };
}

function scoreRookie(player: Player, snapshot: PlayerSeasonSnapshot): number {
  const scoredPlayer = {
    ...player,
    teamId: snapshot.teamId,
    stats: snapshot.stats,
  };
  const gamesPlayedBonus = snapshot.gamesPlayed * 0.5;

  switch (player.pos) {
    case 'QB':
      return offensiveOutput(scoredPlayer) + player.ovr * 0.9 + 12 + gamesPlayedBonus;
    case 'RB':
      return scoredPlayer.stats.rushYds * 0.065 + scoredPlayer.stats.rushTD * 2.6 + scoredPlayer.stats.recYds * 0.03 + player.ovr * 0.85 + gamesPlayedBonus;
    case 'WR':
    case 'TE':
      return scoredPlayer.stats.recYds * 0.07 + scoredPlayer.stats.recTD * 2.4 + scoredPlayer.stats.rec * 0.15 + player.ovr * 0.82 + gamesPlayedBonus;
    case 'DL':
    case 'LB':
    case 'CB':
    case 'S':
      return defensiveOutput(scoredPlayer) + player.ovr * 0.8 + gamesPlayedBonus;
    case 'OL':
      return player.ovr * 1.3 + (player.isStarter ? 8 : 0) + gamesPlayedBonus;
    case 'K':
      return kickerOutput(scoredPlayer) + player.ovr + gamesPlayedBonus;
    case 'P':
      return punterOutput(scoredPlayer) + player.ovr * 0.5 + gamesPlayedBonus;
    default:
      return player.ovr + gamesPlayedBonus;
  }
}

function statLine(player: Player, snapshot: PlayerSeasonSnapshot): string {
  const stats = snapshot.stats;

  switch (player.pos) {
    case 'QB':
      return `${stats.passYds.toLocaleString()} pass yds // ${stats.passTD} pass TD`;
    case 'RB':
      return `${stats.rushYds.toLocaleString()} rush yds // ${stats.rushTD} rush TD`;
    case 'WR':
    case 'TE':
      return `${stats.recYds.toLocaleString()} rec yds // ${stats.recTD} rec TD`;
    case 'DL':
    case 'LB':
      return `${stats.sacks} sacks // ${stats.tackles} tackles`;
    case 'CB':
    case 'S':
      return `${stats.defINT} INT // ${stats.tackles} tackles`;
    case 'OL':
      return `${snapshot.gamesPlayed} GP // ${player.isStarter ? 'starter reps' : 'depth role'}`;
    case 'K':
      return `${stats.fgMade}/${stats.fgAtt} FG // ${snapshot.gamesPlayed} GP`;
    case 'P':
      return `${snapshot.gamesPlayed} GP // ${player.ovr} OVR special teams value`;
    default:
      return `${snapshot.gamesPlayed} GP`;
  }
}

function highlightLines(player: Player, snapshot: PlayerSeasonSnapshot, teamAbbr: string): string[] {
  return [
    statLine(player, snapshot),
    `${snapshot.gamesPlayed} GP // ${teamAbbr} rookie ${player.pos}`,
    `${player.ovr} OVR finish // draft class ${player.draftYear}`,
  ];
}

function isRookie(player: Player, season: number): boolean {
  return player.yearsExp === 0 || player.draftYear === season;
}

function compareCandidates(
  left: { player: Player; score: number },
  right: { player: Player; score: number },
): number {
  return right.score - left.score
    || right.player.ovr - left.player.ovr
    || left.player.name.localeCompare(right.player.name)
    || left.player.id.localeCompare(right.player.id);
}

export function computeRookieOfYear(game: GameState, season = game.year): RookieOfYearEntry | null {
  const candidates = Object.values(game.players)
    .filter((player) => isRookie(player, season))
    .map((player) => {
      const snapshot = rookieSeasonSnapshot(game, player, season);
      const resolvedTeamId = snapshot.teamId ?? player.teamId;
      const team = resolvedTeamId ? game.teams[resolvedTeamId] : null;
      if (!resolvedTeamId || !team) return null;

      return {
        player,
        snapshot,
        teamId: resolvedTeamId,
        teamAbbr: team.abbr,
        score: scoreRookie(
          {
            ...player,
            stats: snapshot.stats,
          },
          snapshot,
        ),
      };
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null)
    .sort(compareCandidates);

  const winner = candidates[0];
  if (!winner) return null;

  return {
    playerId: winner.player.id,
    playerName: winner.player.name,
    teamId: winner.teamId,
    teamAbbr: winner.teamAbbr,
    position: winner.player.pos,
    compositeScore: roundScore(winner.score),
    headline: `${winner.player.name}: ${winner.teamAbbr} rookie ${winner.player.pos} takes ROY honors`,
    highlights: highlightLines(winner.player, winner.snapshot, winner.teamAbbr),
    season,
  };
}
