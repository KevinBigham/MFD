import type { PrngFn } from '../rng';
import type { GameState, Team } from '../types';

const MIN_SEASONS_FOR_ERA_PROMPT = 5;
const ACTIVE_ERA_END_OFFSET = 1;
const DEFAULT_SUGGESTION_COUNT = 5;
const MIN_DYNASTY_ROMAN = 1;
const ERA_ADJECTIVES = ['Golden', 'Iron', 'Steel', 'Storm', 'Crown', 'Legacy'] as const;
const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'] as const;

export interface DynastyEra {
  name: string;
  startYear: number;
  endYear: number | null;
  trigger: 'championship' | 'milestone' | 'manual';
  achievements: string[];
}

export interface EraNameSuggestion {
  name: string;
  reason: string;
}

function findUserTeam(game: GameState): Team | null {
  return Object.values(game.teams).find((team) => team.isUser) ?? null;
}

function getRecordedSeasonYears(game: GameState, teamId: string): number[] {
  return [...new Set(
    game.franchiseHistory
      .filter((entry) => entry.teamId === teamId)
      .map((entry) => entry.year),
  )].sort((left, right) => left - right);
}

function getChampionshipCount(game: GameState, teamId: string): number {
  const recordedTitles = game.franchiseHistory.filter((entry) =>
    entry.teamId === teamId && entry.playoffFinish === 'champion').length;
  const liveTitle = game.playoffBracket?.championTeamId === teamId
    && !game.franchiseHistory.some((entry) => entry.teamId === teamId && entry.year === game.year && entry.playoffFinish === 'champion')
    ? 1
    : 0;

  return recordedTitles + liveTitle;
}

function didUserJustWinChampionship(game: GameState, teamId: string): boolean {
  if (game.playoffBracket?.championTeamId === teamId) return true;
  return game.franchiseHistory.some((entry) => entry.teamId === teamId && entry.year === game.year && entry.playoffFinish === 'champion');
}

function getActiveEra(eras: DynastyEra[]): DynastyEra | null {
  return [...eras].reverse().find((era) => era.endYear === null) ?? null;
}

function compareEras(left: DynastyEra, right: DynastyEra): number {
  if (left.startYear !== right.startYear) return left.startYear - right.startYear;
  const leftEnd = left.endYear ?? Number.MAX_SAFE_INTEGER;
  const rightEnd = right.endYear ?? Number.MAX_SAFE_INTEGER;
  if (leftEnd !== rightEnd) return leftEnd - rightEnd;
  return left.name.localeCompare(right.name);
}

function bestPlayerName(team: Team): string {
  const bestPlayer = [...team.roster]
    .sort((left, right) => right.ovr - left.ovr || left.id.localeCompare(right.id))[0];
  return bestPlayer?.name ?? `${team.city} ${team.name}`;
}

function pushSuggestion(suggestions: EraNameSuggestion[], suggestion: EraNameSuggestion): void {
  if (suggestions.some((entry) => entry.name === suggestion.name)) return;
  suggestions.push(suggestion);
}

function toRomanNumeral(value: number): string {
  if (value <= 0) return ROMAN_NUMERALS[0];
  return ROMAN_NUMERALS[value - 1] ?? String(value);
}

function inferEraTrigger(game: GameState, userTeam: Team): DynastyEra['trigger'] {
  if (didUserJustWinChampionship(game, userTeam.id)) return 'championship';
  if ((game.userDynastyEras ?? []).length === 0 && getRecordedSeasonYears(game, userTeam.id).length >= MIN_SEASONS_FOR_ERA_PROMPT) {
    return 'milestone';
  }
  return 'manual';
}

function buildAchievements(game: GameState, userTeam: Team, trigger: DynastyEra['trigger']): string[] {
  const achievements: string[] = [];
  const championshipCount = getChampionshipCount(game, userTeam.id);
  const seasonCount = getRecordedSeasonYears(game, userTeam.id).length;

  if (trigger === 'championship') achievements.push('Won a championship');
  if (championshipCount > 0) achievements.push(`${championshipCount} championships in franchise history`);
  if (seasonCount > 0) achievements.push(`${seasonCount} seasons completed`);

  return achievements;
}

export function shouldPromptEraNaming(game: GameState): boolean {
  const userTeam = findUserTeam(game);
  if (!userTeam) return false;

  const eraHistory = game.userDynastyEras ?? [];
  if (getActiveEra(eraHistory)) return false;

  if (didUserJustWinChampionship(game, userTeam.id)) return true;

  return eraHistory.length === 0 && getRecordedSeasonYears(game, userTeam.id).length >= MIN_SEASONS_FOR_ERA_PROMPT;
}

export function generateEraSuggestions(game: GameState, rng: PrngFn): EraNameSuggestion[] {
  const userTeam = findUserTeam(game);
  if (!userTeam) return [];

  const seasonYears = getRecordedSeasonYears(game, userTeam.id);
  const startYear = seasonYears[0] ?? game.year;
  const endYear = seasonYears[seasonYears.length - 1] ?? game.year;
  const adjective = ERA_ADJECTIVES[Math.floor(rng() * ERA_ADJECTIVES.length)] ?? ERA_ADJECTIVES[0];
  const playerName = bestPlayerName(userTeam);
  const dynastyNumber = Math.max(MIN_DYNASTY_ROMAN, getChampionshipCount(game, userTeam.id));
  const suggestions: EraNameSuggestion[] = [];

  pushSuggestion(suggestions, {
    name: `The ${adjective} Era`,
    reason: `${userTeam.city} has built enough identity to frame this run around its defining tone.`,
  });
  pushSuggestion(suggestions, {
    name: `The ${playerName} Years`,
    reason: `${playerName} is the clearest face of the roster and anchors this chapter of the franchise.`,
  });
  pushSuggestion(suggestions, {
    name: `Dynasty ${toRomanNumeral(dynastyNumber)}`,
    reason: `The title count gives the franchise a clean dynasty marker that can grow over time.`,
  });
  pushSuggestion(suggestions, {
    name: `The ${userTeam.city} Renaissance`,
    reason: `${userTeam.city} is enjoying a franchise revival worth naming as its own movement.`,
  });
  pushSuggestion(suggestions, {
    name: `${startYear}-${endYear} ${userTeam.name}`,
    reason: `The save already frames this stretch as a distinct window from ${startYear} through ${endYear}.`,
  });

  return suggestions.slice(0, DEFAULT_SUGGESTION_COUNT);
}

export function startDynastyEra(game: GameState, eraName: string): GameState {
  const nextState = structuredClone(game);
  const userTeam = findUserTeam(nextState);

  nextState.userDynastyEras = [...(nextState.userDynastyEras ?? [])];
  if (!userTeam) return nextState;

  const activeEra = getActiveEra(nextState.userDynastyEras);
  if (activeEra) {
    activeEra.endYear = nextState.year - ACTIVE_ERA_END_OFFSET;
  }

  const trigger = inferEraTrigger(nextState, userTeam);
  nextState.userDynastyEras.push({
    name: eraName,
    startYear: nextState.year,
    endYear: null,
    trigger,
    achievements: buildAchievements(nextState, userTeam, trigger),
  });
  nextState.userDynastyEras.sort(compareEras);
  userTeam.era = eraName;

  return nextState;
}

export function endDynastyEra(game: GameState): GameState {
  const nextState = structuredClone(game);
  const userTeam = findUserTeam(nextState);
  const eraHistory = nextState.userDynastyEras ?? [];
  const activeEra = getActiveEra(eraHistory);

  if (activeEra) activeEra.endYear = nextState.year;
  if (userTeam) userTeam.era = null;

  return nextState;
}

export function getDynastyEraHistory(game: GameState): DynastyEra[] {
  return [...(game.userDynastyEras ?? [])].sort(compareEras);
}
