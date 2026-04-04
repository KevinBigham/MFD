import type { PrngFn } from '../rng';
import type {
  FarewellMoment,
  FarewellTour,
  FranchiseHistoryEntry,
  JerseyRetirement,
  Player,
  PlayerArchiveEntry,
  PlayerSeasonHistoryEntry,
  ScheduledGame,
  Team,
} from '../types';
import { cl } from '../utils';

const POSITION_NUMBER_PREFERENCES: Record<Player['pos'], number[][]> = {
  QB: [[1, 19]],
  RB: [[20, 49]],
  WR: [[10, 19], [80, 89]],
  TE: [[40, 49], [80, 89]],
  OL: [[50, 79]],
  DL: [[50, 79], [90, 99]],
  LB: [[40, 59], [90, 99]],
  CB: [[20, 49]],
  S: [[20, 49]],
  K: [[1, 19]],
  P: [[1, 19]],
};

function retirementId(rng: PrngFn, prefix: string): string {
  return `${prefix}-${Math.floor(rng() * 1_000_000_000).toString(36)}`;
}

function usedNumbers(team: Team, ignorePlayerId?: string): Set<number> {
  const used = new Set<number>();
  for (const player of team.roster) {
    if (ignorePlayerId && player.id === ignorePlayerId) continue;
    if (player.jerseyNumber > 0) used.add(player.jerseyNumber);
  }
  for (const retired of team.retiredJerseys ?? []) {
    if (retired.jerseyNumber > 0) used.add(retired.jerseyNumber);
  }
  return used;
}

function firstOpenNumber(team: Team, player: Player): number {
  const used = usedNumbers(team, player.id);
  for (const range of POSITION_NUMBER_PREFERENCES[player.pos] ?? []) {
    const [start, end] = range;
    if (start === undefined || end === undefined) continue;
    for (let number = start; number <= end; number += 1) {
      if (!used.has(number)) return number;
    }
  }
  for (let number = 1; number <= 99; number += 1) {
    if (!used.has(number)) return number;
  }
  return 0;
}

function seasonsWithTeam(entry: PlayerArchiveEntry, teamId: string): number {
  return entry.teamHistory
    .filter((stint) => stint.teamId === teamId)
    .reduce((total, stint) => total + (stint.lastYear - stint.firstYear + 1), 0);
}

function championshipsWithTeam(entry: PlayerArchiveEntry, teamId: string, franchiseHistory: FranchiseHistoryEntry[]): number {
  return franchiseHistory.filter((history) =>
    history.teamId === teamId
    && history.playoffFinish === 'champion'
    && entry.teamHistory.some((stint) =>
      stint.teamId === teamId
      && history.year >= stint.firstYear
      && history.year <= stint.lastYear,
    )).length;
}

function uniqueWeeks(weeks: number[]): number[] {
  return Array.from(new Set(weeks)).sort((a, b) => a - b);
}

function inferMomentNarrative(playerName: string, type: FarewellMoment['type'], opponent: string): string {
  switch (type) {
    case 'standing_ovation':
      return `The crowd rose for ${playerName} as ${opponent} joined the tribute.`;
    case 'gift_exchange':
      return `${opponent} honored ${playerName} with a quiet pregame gift exchange.`;
    case 'emotional_speech':
      return `${playerName} addressed the room before ${opponent}, and the speech hit hard.`;
    case 'final_home_game':
      return `${playerName} took one last home tunnel walk with the crowd in full voice.`;
    case 'final_game':
      return `${playerName} closed the book on a long career against ${opponent}.`;
    default:
      return `${playerName} was honored before facing ${opponent}.`;
  }
}

export function assignJerseyNumber(team: Team, player: Player): number {
  const nextNumber = player.jerseyNumber > 0 && !usedNumbers(team, player.id).has(player.jerseyNumber)
    ? player.jerseyNumber
    : firstOpenNumber(team, player);
  player.jerseyNumber = nextNumber;
  return nextNumber;
}

export function detectRetirementCandidates(
  team: Team,
  playerSeasonHistory: Record<string, PlayerSeasonHistoryEntry[]> = {},
): Player[] {
  return team.roster.filter((player) => {
    if (player.age >= 38) return true;
    if (player.age >= 36 && player.yearsExp >= 10) return true;
    if (player.age < 34) return false;
    const history = [...(playerSeasonHistory[player.id] ?? [])].sort((a, b) => a.season - b.season);
    if (history.length < 2) return false;
    const recent = history.slice(-2);
    const decline = (recent[0]?.ovr ?? player.ovr) - (recent[1]?.ovr ?? player.ovr);
    return decline >= 5;
  }).sort((a, b) => b.age - a.age || b.yearsExp - a.yearsExp || b.ovr - a.ovr);
}

export function startFarewellTour(
  player: Player,
  team: Team,
  currentWeek: number,
  rng: PrngFn,
  seasonSchedule: ScheduledGame[] = [],
  teamsById: Record<string, Team> = {},
): FarewellTour {
  const gamesWithWeeks = seasonSchedule.map((game) => ({
    ...game,
    opponentId: game.homeTeamId === team.id ? game.awayTeamId : game.homeTeamId,
  }));
  const scheduleEntries = gamesWithWeeks
    .filter((game) => (game.homeTeamId === team.id || game.awayTeamId === team.id) && (game as ScheduledGame & { week?: number }).result !== undefined)
    .map((game, index) => ({
      ...game,
      week: (game as ScheduledGame & { week?: number }).week ?? index + 1,
    }))
    .filter((game) => game.week >= currentWeek)
    .sort((a, b) => a.week - b.week);

  const chosenWeeks: number[] = [];
  const finalGame = scheduleEntries.at(-1);
  const finalHomeGame = [...scheduleEntries].reverse().find((game) => game.homeTeamId === team.id) ?? finalGame;
  if (finalHomeGame) chosenWeeks.push(finalHomeGame.week);
  if (finalGame) chosenWeeks.push(finalGame.week);

  const bonusStops = scheduleEntries
    .filter((game) => game.week !== finalHomeGame?.week && game.week !== finalGame?.week)
    .filter((game) => game.primetime || teamsById[game.opponentId]?.division === team.division)
    .map((game) => game.week);

  while (chosenWeeks.length < Math.min(5, Math.max(3, scheduleEntries.length)) && bonusStops.length > 0) {
    const index = Math.floor(rng() * bonusStops.length);
    chosenWeeks.push(...bonusStops.splice(index, 1));
  }

  const weeks = uniqueWeeks(chosenWeeks).slice(0, 5);
  const moments: FarewellMoment[] = weeks.map((week, index) => {
    const game = scheduleEntries.find((entry) => entry.week === week);
    const opponentName = game ? `${teamsById[game.opponentId]?.city ?? ''} ${teamsById[game.opponentId]?.name ?? game.opponentId}`.trim() : 'the opponent';
    let type: FarewellMoment['type'] = 'standing_ovation';
    if (finalGame && week === finalGame.week) type = 'final_game';
    else if (finalHomeGame && week === finalHomeGame.week) type = 'final_home_game';
    else if (index === 0) type = 'emotional_speech';
    else if (index === 1) type = 'gift_exchange';
    return {
      week,
      type,
      narrative: inferMomentNarrative(player.name, type, opponentName),
      opponent: opponentName,
    };
  });

  return {
    playerId: player.id,
    playerName: player.name,
    teamId: team.id,
    finalSeason: true,
    announcedWeek: currentWeek,
    moments,
  };
}

export function generateFarewellMoment(
  tour: FarewellTour,
  week: number,
  opponent: Team,
  _rng: PrngFn,
): FarewellMoment | null {
  const planned = tour.moments.find((moment) => moment.week === week);
  if (!planned) return null;
  return {
    ...planned,
    opponent: `${opponent.city} ${opponent.name}`,
    narrative: planned.narrative || inferMomentNarrative(tour.playerName, planned.type, `${opponent.city} ${opponent.name}`),
  };
}

export function shouldRetireJersey(
  player: PlayerArchiveEntry,
  team: Team,
  franchiseHistory: FranchiseHistoryEntry[],
  options?: { isHallOfFamer?: boolean },
): boolean {
  const tenure = seasonsWithTeam(player, team.id);
  const championships = championshipsWithTeam(player, team.id, franchiseHistory);
  return (
    (tenure >= 10 && player.peakOvr >= 88) ||
    championships >= 2 ||
    (Boolean(options?.isHallOfFamer) && tenure >= 8)
  );
}

export function generateJerseyRetirement(
  player: PlayerArchiveEntry,
  team: Team,
  year: number,
  rng: PrngFn,
  franchiseHistory: FranchiseHistoryEntry[] = [],
  options?: { isHallOfFamer?: boolean },
): JerseyRetirement {
  const tenure = seasonsWithTeam(player, team.id);
  const championships = championshipsWithTeam(player, team.id, franchiseHistory);
  const legacyScore = cl(
    Math.round(player.peakOvr * 0.6 + tenure * 4 + championships * 12 + (options?.isHallOfFamer ? 10 : 0)),
    0,
    100,
  );
  const spotlightYear = player.peakYear;
  const peakLine = `${player.name} reached a peak ${player.peakOvr} OVR in ${spotlightYear}.`;
  const titleLine = championships > 0
    ? `${team.city} won ${championships} title${championships > 1 ? 's' : ''} with ${player.lastName} in the room.`
    : `${player.lastName} defined the franchise even without a confetti moment.`;
  const hallLine = options?.isHallOfFamer
    ? `${player.lastName}'s Hall of Fame plaque only sealed what the rafters already knew.`
    : `${player.lastName}'s best years left a permanent mark on the building.`;

  return {
    id: retirementId(rng, 'jersey'),
    playerId: player.playerId,
    playerName: player.name,
    pos: player.positions[0] ?? 'QB',
    jerseyNumber: player.jerseyNumber ?? 0,
    teamId: team.id,
    year,
    peakOvr: player.peakOvr,
    seasonsWithTeam: tenure,
    championships,
    headline: `${team.city} retires #${player.jerseyNumber ?? 0} for ${player.name}`,
    ceremony: [
      `${team.city} ${team.name} pulled the cover off the rafters and sent #${player.jerseyNumber ?? 0} into permanent retirement for ${player.name}.`,
      `${peakLine} ${titleLine}`,
      hallLine,
    ].join('\n\n'),
    legacyScore,
  };
}

export function getRetiredJerseys(team: Team): JerseyRetirement[] {
  return [...(team.retiredJerseys ?? [])].sort((a, b) => b.year - a.year || b.legacyScore - a.legacyScore);
}
