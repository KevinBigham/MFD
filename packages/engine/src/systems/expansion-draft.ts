import { getSalaryCap } from '../config';
import type {
  ExpansionCity,
  ExpansionDraftState,
  GameState,
  Player,
  Position,
  Team,
} from '../types';
import type { PrngFn } from '../rng';
import { buildSeasonSchedule } from './season-schedule';
import { createDefaultFranchiseIdentity, initializeFranchiseIdentity } from './franchise-identity';
import { createEmptySeasonStats } from './season-stats';

export const EXPANSION_CITIES: ExpansionCity[] = [
  { city: 'San Antonio', name: 'Rattlers', abbr: 'SAT', marketSize: 'medium', marketModifier: 0.95, stadiumType: 'dome' },
  { city: 'Portland', name: 'Wolves', abbr: 'PDX', marketSize: 'medium', marketModifier: 0.95, stadiumType: 'outdoor' },
  { city: 'Salt Lake', name: 'Storm', abbr: 'SLC', marketSize: 'medium', marketModifier: 0.9, stadiumType: 'outdoor' },
  { city: 'Sacramento', name: 'Knights', abbr: 'SAC', marketSize: 'medium', marketModifier: 0.9, stadiumType: 'outdoor' },
  { city: 'Columbus', name: 'Titans', abbr: 'CLB', marketSize: 'medium', marketModifier: 0.85, stadiumType: 'dome' },
  { city: 'Memphis', name: 'Vipers', abbr: 'MEM', marketSize: 'small', marketModifier: 0.85, stadiumType: 'outdoor' },
  { city: 'Richmond', name: 'Sentinels', abbr: 'RIC', marketSize: 'small', marketModifier: 0.9, stadiumType: 'outdoor' },
  { city: 'Oklahoma City', name: 'Thunder', abbr: 'OKC', marketSize: 'medium', marketModifier: 0.9, stadiumType: 'dome' },
  { city: 'San Diego', name: 'Chargers', abbr: 'SDG', marketSize: 'large', marketModifier: 1.05, stadiumType: 'outdoor' },
  { city: 'Birmingham', name: 'Stallions', abbr: 'BHM', marketSize: 'small', marketModifier: 0.8, stadiumType: 'outdoor' },
];

export const PROTECT_LIMIT = 15;
export const EXPANSION_MIN_YEAR = 10;
export const EXPANSION_CHANCE_PER_YEAR = 0.15;

const INAUGURAL_YEAR = 2026;
const DIVISION_ORDER = ['East', 'North', 'South', 'West'] as const;
const POSITION_TARGETS: Record<Position, number> = {
  QB: 1,
  RB: 2,
  WR: 4,
  TE: 2,
  OL: 5,
  DL: 4,
  LB: 3,
  CB: 3,
  S: 2,
  K: 1,
  P: 1,
};

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function draftPickTotal(teamCount: number): number {
  return Math.max(30, Math.min(35, Math.round(teamCount * 1.05)));
}

function nextInt(rng: PrngFn, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function chooseCity(rng: PrngFn): ExpansionCity {
  return EXPANSION_CITIES[nextInt(rng, 0, EXPANSION_CITIES.length - 1)]!;
}

function topProtectedPlayers(team: Team): string[] {
  return [...team.roster]
    .sort((a, b) => b.ovr - a.ovr || a.id.localeCompare(b.id))
    .slice(0, PROTECT_LIMIT)
    .map((player) => player.id);
}

function rebuildAvailablePool(game: GameState, protectedPlayers: Record<string, string[]>): Player[] {
  const protectedIds = new Set(Object.values(protectedPlayers).flat());
  return Object.values(game.teams)
    .flatMap((team) => team.roster)
    .filter((player) => !protectedIds.has(player.id))
    .map((player) => cloneValue(player))
    .sort((a, b) => b.ovr - a.ovr || a.id.localeCompare(b.id));
}

function userTeam(game: GameState): Team | null {
  return Object.values(game.teams).find((team) => team.isUser) ?? null;
}

function isAfterExpansionWindow(game: GameState): boolean {
  return Object.keys(game.teams).length > 32;
}

function pickAlignment(game: GameState): { conference: 'AFC' | 'NFC'; division: string } {
  const counts = {
    AFC: Object.values(game.teams).filter((team) => team.conference === 'AFC').length,
    NFC: Object.values(game.teams).filter((team) => team.conference === 'NFC').length,
  };
  const conference: 'AFC' | 'NFC' = counts.AFC <= counts.NFC ? 'AFC' : 'NFC';

  const divisionCounts = DIVISION_ORDER.map((division) => ({
    division,
    count: Object.values(game.teams).filter((team) => team.conference === conference && team.division === division).length,
  })).sort((a, b) => a.count - b.count || DIVISION_ORDER.indexOf(a.division as typeof DIVISION_ORDER[number]) - DIVISION_ORDER.indexOf(b.division as typeof DIVISION_ORDER[number]));

  return { conference, division: divisionCounts[0]!.division };
}

function nextTeamId(game: GameState, abbr: string): string {
  const base = `exp-${abbr.toLowerCase()}`;
  if (!game.teams[base]) return base;
  let index = 2;
  while (game.teams[`${base}-${index}`]) index += 1;
  return `${base}-${index}`;
}

function makeDraftPicks(teamId: string, year: number) {
  return Array.from({ length: 7 }, (_, index) => ({
    round: index + 1,
    pick: 1,
    originalTeamId: teamId,
    currentTeamId: teamId,
    year,
    isCompPick: false,
  }));
}

function pickBestAvailablePlayer(state: ExpansionDraftState): Player | null {
  if (state.availablePlayers.length === 0) return null;
  const needs = getExpansionTeamNeeds(state.selectedPlayers);
  return [...state.availablePlayers]
    .sort((a, b) => {
      const needDiff = (needs[b.pos] ?? 0) - (needs[a.pos] ?? 0);
      if (needDiff !== 0) return needDiff;
      return b.ovr - a.ovr || a.id.localeCompare(b.id);
    })[0] ?? null;
}

export function shouldTriggerExpansion(gameState: GameState, rng: PrngFn): boolean {
  if (isAfterExpansionWindow(gameState)) return false;
  if (gameState.year - INAUGURAL_YEAR < EXPANSION_MIN_YEAR) return false;
  return rng() < EXPANSION_CHANCE_PER_YEAR;
}

export function initializeExpansionDraft(gameState: GameState, rng: PrngFn): ExpansionDraftState {
  const city = chooseCity(rng);
  const alignment = pickAlignment(gameState);
  const protectedPlayers = Object.values(gameState.teams).reduce<Record<string, string[]>>((acc, team) => {
    if (!team.isUser) {
      acc[team.id] = topProtectedPlayers(team);
    }
    return acc;
  }, {});

  return {
    expansionTeam: {
      city: city.city,
      name: city.name,
      abbr: city.abbr,
      conference: alignment.conference,
      division: alignment.division,
    },
    protectedPlayers,
    availablePlayers: rebuildAvailablePool(gameState, protectedPlayers),
    selectedPlayers: [],
    picksRemaining: draftPickTotal(Object.keys(gameState.teams).length),
    phase: 'protection',
  };
}

export function protectPlayers(state: ExpansionDraftState, teamId: string, playerIds: string[]): ExpansionDraftState {
  if (playerIds.length > PROTECT_LIMIT) {
    throw new Error(`You may protect at most ${PROTECT_LIMIT} players.`);
  }

  return {
    ...state,
    protectedPlayers: {
      ...state.protectedPlayers,
      [teamId]: [...playerIds],
    },
    availablePlayers: state.availablePlayers.filter((player) => !playerIds.includes(player.id)),
    phase: 'drafting',
  };
}

export function getExpansionTeamNeeds(selectedPlayers: Player[]): Record<Position, number> {
  const counts = selectedPlayers.reduce<Record<Position, number>>((acc, player) => {
    acc[player.pos] = (acc[player.pos] ?? 0) + 1;
    return acc;
  }, {
    QB: 0, RB: 0, WR: 0, TE: 0, OL: 0, DL: 0, LB: 0, CB: 0, S: 0, K: 0, P: 0,
  });

  return (Object.keys(POSITION_TARGETS) as Position[]).reduce<Record<Position, number>>((acc, pos) => {
    acc[pos] = Math.max(0, POSITION_TARGETS[pos] - (counts[pos] ?? 0));
    return acc;
  }, {} as Record<Position, number>);
}

export function makeExpansionPick(state: ExpansionDraftState, playerId: string): ExpansionDraftState {
  const chosen = state.availablePlayers.find((player) => player.id === playerId) ?? pickBestAvailablePlayer(state);
  if (!chosen) return { ...state, phase: 'complete', picksRemaining: 0 };

  const availablePlayers = state.availablePlayers.filter((player) => player.id !== chosen.id);
  const selectedPlayers = [...state.selectedPlayers, chosen];
  const picksRemaining = Math.max(0, state.picksRemaining - 1);

  return {
    ...state,
    availablePlayers,
    selectedPlayers,
    picksRemaining,
    phase: picksRemaining === 0 || availablePlayers.length === 0 ? 'complete' : 'drafting',
  };
}

export function finalizeExpansionDraft(gameState: GameState, state: ExpansionDraftState, rng: PrngFn): GameState {
  const nextState = cloneValue(gameState);
  const template = Object.values(nextState.teams)[0]!;
  const teamId = nextTeamId(nextState, state.expansionTeam.abbr);
  const salaryCap = getSalaryCap(nextState.year, nextState);
  const rosterIds = new Set(state.selectedPlayers.map((player) => player.id));

  for (const team of Object.values(nextState.teams)) {
    team.roster = team.roster.filter((player) => !rosterIds.has(player.id));
  }

  const roster = state.selectedPlayers.map((player) => {
    const source = nextState.players[player.id] ?? player;
    const nextPlayer = {
      ...source,
      teamId,
      contract: source.contract ? { ...source.contract, teamId } : null,
    };
    nextState.players[nextPlayer.id] = nextPlayer;
    return nextPlayer;
  });

  const capUsed = roster.reduce((total, player) => total + (player.contract?.baseSalary ?? 0) + (player.contract?.prorated ?? 0), 0);
  const nextTeam: Team = {
    ...cloneValue(template),
    id: teamId,
    city: state.expansionTeam.city,
    name: state.expansionTeam.name,
    abbr: state.expansionTeam.abbr,
    icon: state.expansionTeam.abbr.toLowerCase(),
    conference: state.expansionTeam.conference,
    division: state.expansionTeam.division,
    roster,
    capUsed: Math.round(capUsed * 10) / 10,
    capSpace: Math.round((salaryCap - capUsed) * 10) / 10,
    wins: 0,
    losses: 0,
    ties: 0,
    streak: 0,
    seasonStats: createEmptySeasonStats(),
    isUser: false,
    draftPicks: makeDraftPicks(teamId, nextState.year),
    txLog: [],
    rivalries: [],
    rivals: {},
    ownerId: `${teamId}-owner`,
    owner: cloneValue(template.owner),
    ownerMood: template.ownerMood,
    fatigueState: {},
    mentoringPairs: [],
    trainingAssignments: {},
    practiceSquad: [],
    stadiumType: EXPANSION_CITIES.find((city) => city.abbr === state.expansionTeam.abbr)?.stadiumType ?? 'outdoor',
    franchiseIdentity: createDefaultFranchiseIdentity({
      city: state.expansionTeam.city,
      stadiumType: EXPANSION_CITIES.find((city) => city.abbr === state.expansionTeam.abbr)?.stadiumType ?? 'outdoor',
    }),
  };
  nextTeam.franchiseIdentity = {
    ...initializeFranchiseIdentity(nextTeam, rng),
    marketSize: EXPANSION_CITIES.find((city) => city.abbr === state.expansionTeam.abbr)?.marketSize ?? nextTeam.franchiseIdentity.marketSize,
    marketModifier: EXPANSION_CITIES.find((city) => city.abbr === state.expansionTeam.abbr)?.marketModifier ?? nextTeam.franchiseIdentity.marketModifier,
    fanbase: EXPANSION_CITIES.find((city) => city.abbr === state.expansionTeam.abbr)?.marketSize === 'large' ? 48 : nextTeam.franchiseIdentity.fanbase,
  };

  nextState.teams[teamId] = nextTeam;
  nextState.schedule = buildSeasonSchedule(Object.keys(nextState.teams), nextState.year, nextState);
  nextState.expansionDraftState = undefined;
  return nextState;
}
