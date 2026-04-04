import type {
  FranchiseHistoryEntry,
  GameEvent,
  GameState,
  Player,
  PlayerArchiveEntry,
  PlayoffRound,
} from '../types';
import { createDefaultFranchiseIdentity } from './franchise-identity';

const PLAYOFF_FINISH_LABELS: Record<PlayoffRound, string> = {
  wild_card: 'wild_card_exit',
  divisional: 'divisional_exit',
  conference: 'conference_final_exit',
  super_bowl: 'super_bowl_runner_up',
};

function eventYear(event: GameEvent): number {
  return Math.floor(event.timestamp / 1000);
}

function ensureArchiveEntry(game: GameState, player: Player, year: number): PlayerArchiveEntry {
  let entry = game.playerArchive.find((candidate) => candidate.playerId === player.id);
  if (!entry) {
    entry = {
      playerId: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      name: player.name,
      positions: [player.pos],
      jerseyNumber: player.jerseyNumber ?? null,
      peakOvr: player.ovr,
      peakYear: year,
      firstYear: year,
      lastYear: year,
      retirementYear: null,
      teamHistory: [],
      careerStats: { ...player.careerStats },
    };
    game.playerArchive.push(entry);
  }

  entry.firstName = player.firstName;
  entry.lastName = player.lastName;
  entry.name = player.name;
  entry.jerseyNumber = player.jerseyNumber ?? entry.jerseyNumber ?? null;
  entry.lastYear = Math.max(entry.lastYear, year);
  entry.careerStats = { ...player.careerStats };
  if (!entry.positions.includes(player.pos)) {
    entry.positions.push(player.pos);
    entry.positions.sort();
  }
  if (player.ovr > entry.peakOvr) {
    entry.peakOvr = player.ovr;
    entry.peakYear = year;
  }

  return entry;
}

export function syncPlayerArchiveEntry(
  game: GameState,
  player: Player,
  year = game.year,
): PlayerArchiveEntry {
  const entry = ensureArchiveEntry(game, player, year);
  const teamId = player.teamId;

  if (!teamId) {
    return entry;
  }

  const stint = entry.teamHistory[entry.teamHistory.length - 1];
  if (!stint || stint.teamId !== teamId) {
    entry.teamHistory.push({ teamId, firstYear: year, lastYear: year });
    return entry;
  }

  stint.lastYear = Math.max(stint.lastYear, year);
  return entry;
}

export function syncAllPlayerArchiveEntries(game: GameState, year = game.year): void {
  for (const team of Object.values(game.teams)) {
    for (const player of team.roster) {
      syncPlayerArchiveEntry(game, player, year);
    }
  }

  for (const playerId of game.freeAgents) {
    const player = game.players[playerId];
    if (player) {
      syncPlayerArchiveEntry(game, player, year);
    }
  }
}

export function recordPlayerRetirement(
  game: GameState,
  player: Player,
  year = game.year,
): PlayerArchiveEntry {
  const entry = syncPlayerArchiveEntry(game, player, year);
  entry.retirementYear = year;
  entry.lastYear = Math.max(entry.lastYear, year);
  const lastStint = entry.teamHistory[entry.teamHistory.length - 1];
  if (lastStint) {
    lastStint.lastYear = Math.max(lastStint.lastYear, year);
  }
  return entry;
}

function resolvePlayoffFinish(game: GameState, teamId: string): string {
  const bracket = game.playoffBracket;
  if (!bracket) return 'regular_season';
  if (bracket.championTeamId === teamId) return 'champion';

  const appearances = bracket.matchups
    .filter((matchup) => matchup.homeTeamId === teamId || matchup.awayTeamId === teamId)
    .sort((a, b) => a.week - b.week);

  if (appearances.length === 0) return 'missed_playoffs';

  const finalAppearance = appearances[appearances.length - 1]!;
  return PLAYOFF_FINISH_LABELS[finalAppearance.round] ?? 'playoff_team';
}

function getTeamMajorEvents(game: GameState, teamId: string): string[] {
  return game.eventLog
    .filter((event) => eventYear(event) === game.year)
    .filter((event) => {
      const eventTeamId = typeof event.data.teamId === 'string' ? event.data.teamId : null;
      const teamIds = Array.isArray(event.data.teamIds) ? event.data.teamIds : [];
      return eventTeamId === teamId || teamIds.includes(teamId);
    })
    .map((event) => event.description);
}

export function archiveSeasonHistory(game: GameState): FranchiseHistoryEntry[] {
  game.franchiseHistory = game.franchiseHistory.filter((entry) => entry.year !== game.year);

  const seasonEntries = Object.values(game.teams)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((team) => {
      const identity = team.franchiseIdentity ?? createDefaultFranchiseIdentity(team);
      const playoffFinish = resolvePlayoffFinish(game, team.id);
      const majorEvents: string[] = [];
      if (playoffFinish === 'champion') {
        majorEvents.push('Won the championship.');
      }
      majorEvents.push(...getTeamMajorEvents(game, team.id));

      return {
        year: game.year,
        teamId: team.id,
        wins: team.wins,
        losses: team.losses,
        ties: team.ties,
        record: `${team.wins}-${team.losses}${team.ties > 0 ? `-${team.ties}` : ''}`,
        pointDifferential: team.seasonStats.pointDifferential,
        playoffFinish,
        majorEvents,
        awardsWon: [],
        recordsBroken: [],
        fanbase: identity.fanbase,
        prestige: identity.prestige,
        attendance: identity.attendance,
        stadiumName: identity.stadiumName,
      } satisfies FranchiseHistoryEntry;
    });

  game.franchiseHistory.push(...seasonEntries);
  return seasonEntries;
}
