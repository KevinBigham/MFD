import type { GameState } from '@mfd/engine';
import { buildCoachingLegacy, identifyBreakoutCandidates } from '@mfd/engine';
import { z } from 'zod';

export interface DynastySummary {
  dynastyId: string;
  teamId: string;
  teamCity: string;
  teamName: string;
  teamAbbr: string;
  startYear: number;
  endYear: number | null;
  seasonsCoached: number;
  wins: number;
  losses: number;
  ties: number;
  championships: number;
  playoffAppearances: number;
  breakoutsDeveloped: number;
  coachesDeveloped?: number;
  hallOfFamersDeveloped?: number;
}

export interface CareerTotals {
  dynasties: number;
  seasonsCoached: number;
  wins: number;
  losses: number;
  ties: number;
  championships: number;
  playoffAppearances: number;
  breakoutsDeveloped: number;
  coachesDeveloped?: number;
  hallOfFamersDeveloped?: number;
}

export interface CareerMeta {
  schemaVersion: 1;
  dynasties: DynastySummary[];
  careerTotals: CareerTotals;
}

const STORAGE_KEY = 'mfd.careerMeta.v1';
const SCHEMA_VERSION = 1 as const;

const DynastySummarySchema = z.object({
  dynastyId: z.string().min(1),
  teamId: z.string().min(1),
  teamCity: z.string().min(1),
  teamName: z.string().min(1),
  teamAbbr: z.string().min(1),
  startYear: z.number().int(),
  endYear: z.number().int().nullable(),
  seasonsCoached: z.number().int().min(0),
  wins: z.number().int().min(0),
  losses: z.number().int().min(0),
  ties: z.number().int().min(0),
  championships: z.number().int().min(0),
  playoffAppearances: z.number().int().min(0),
  breakoutsDeveloped: z.number().int().min(0),
  coachesDeveloped: z.number().int().min(0).default(0),
  hallOfFamersDeveloped: z.number().int().min(0).default(0),
});

const CareerTotalsSchema = z.object({
  dynasties: z.number().int().min(0),
  seasonsCoached: z.number().int().min(0),
  wins: z.number().int().min(0),
  losses: z.number().int().min(0),
  ties: z.number().int().min(0),
  championships: z.number().int().min(0),
  playoffAppearances: z.number().int().min(0),
  breakoutsDeveloped: z.number().int().min(0),
  coachesDeveloped: z.number().int().min(0).default(0),
  hallOfFamersDeveloped: z.number().int().min(0).default(0),
});

const CareerMetaSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  dynasties: z.array(DynastySummarySchema),
  careerTotals: CareerTotalsSchema,
});

function defaultCareerTotals(): CareerTotals {
  return {
    dynasties: 0,
    seasonsCoached: 0,
    wins: 0,
    losses: 0,
    ties: 0,
    championships: 0,
    playoffAppearances: 0,
    breakoutsDeveloped: 0,
    coachesDeveloped: 0,
    hallOfFamersDeveloped: 0,
  };
}

function defaultCareerMeta(): CareerMeta {
  return {
    schemaVersion: SCHEMA_VERSION,
    dynasties: [],
    careerTotals: defaultCareerTotals(),
  };
}

function storage(): Storage | null {
  const candidate = typeof window !== 'undefined'
    ? window.localStorage
    : typeof globalThis !== 'undefined' && 'localStorage' in globalThis
      ? globalThis.localStorage
      : null;
  if (candidate && typeof candidate.getItem === 'function' && typeof candidate.setItem === 'function') return candidate;
  return null;
}

function isPlayoffAppearance(playoffFinish: string): boolean {
  return playoffFinish !== 'missed'
    && playoffFinish !== 'missed_playoffs'
    && playoffFinish !== 'regular_season';
}

function completedSeasonEndYear(game: GameState): number {
  if (
    game.phase === 'offseason'
    || game.phase === 'free_agency'
    || game.phase === 'draft'
    || game.phase === 'post_draft'
    || game.phase === 'training_camp'
    || game.phase === 'preseason'
  ) {
    return game.year - 1;
  }
  return game.year;
}

function currentUserTeam(game: GameState) {
  return Object.values(game.teams).find((team) => team.isUser) ?? null;
}

function recomputeCareerTotals(dynasties: DynastySummary[]): CareerTotals {
  return dynasties.reduce<CareerTotals>((totals, dynasty) => ({
    dynasties: totals.dynasties + 1,
    seasonsCoached: totals.seasonsCoached + dynasty.seasonsCoached,
    wins: totals.wins + dynasty.wins,
    losses: totals.losses + dynasty.losses,
    ties: totals.ties + dynasty.ties,
    championships: totals.championships + dynasty.championships,
    playoffAppearances: totals.playoffAppearances + dynasty.playoffAppearances,
    breakoutsDeveloped: totals.breakoutsDeveloped + dynasty.breakoutsDeveloped,
    coachesDeveloped: (totals.coachesDeveloped ?? 0) + (dynasty.coachesDeveloped ?? 0),
    hallOfFamersDeveloped: (totals.hallOfFamersDeveloped ?? 0) + (dynasty.hallOfFamersDeveloped ?? 0),
  }), defaultCareerTotals());
}

function normalize(meta: CareerMeta): CareerMeta {
  return {
    schemaVersion: SCHEMA_VERSION,
    dynasties: meta.dynasties,
    careerTotals: recomputeCareerTotals(meta.dynasties),
  };
}

export function deriveDynastyStartYear(game: GameState): number {
  const team = currentUserTeam(game);
  if (!team) return game.year;

  const seasons = game.franchiseHistory
    .filter((entry) => entry.teamId === team.id)
    .map((entry) => entry.year)
    .sort((left, right) => left - right);

  return seasons[0] ?? game.year;
}

export function deriveDynastyId(game: GameState): string {
  const team = currentUserTeam(game);
  const teamId = team?.id ?? 'unknown-team';
  return `${game.seed}:${teamId}:${deriveDynastyStartYear(game)}`;
}

function countHistoricalBreakouts(game: GameState, teamId: string, startYear: number): number {
  const breakoutIds = new Set<string>();

  for (const entries of Object.values(game.playerSeasonHistory ?? {})) {
    const seasons = [...entries].sort((left, right) => left.season - right.season);
    for (let index = 1; index < seasons.length; index += 1) {
      const previous = seasons[index - 1]!;
      const current = seasons[index]!;
      if (current.teamId !== teamId) continue;
      if (current.season < startYear) continue;
      if (current.age > 27) continue;
      if (current.ovr - previous.ovr >= 3) {
        breakoutIds.add(current.playerId);
      }
    }
  }

  for (const candidate of identifyBreakoutCandidates(game, teamId)) {
    breakoutIds.add(candidate.playerId);
  }

  return breakoutIds.size;
}

function countDevelopedCoaches(game: GameState): number {
  const team = currentUserTeam(game);
  const headCoach = team?.staff.hc;
  if (!headCoach) return 0;
  return buildCoachingLegacy(game, headCoach.id).headCoachesProduced;
}

function countDevelopedHallOfFamers(game: GameState): number {
  const team = currentUserTeam(game);
  if (!team) return 0;
  return (game.hallOfFame ?? []).filter((entry) => entry.teams[0] === team.id).length;
}

export function buildDynastySummary(game: GameState): DynastySummary | null {
  const team = currentUserTeam(game);
  if (!team) return null;

  const history = [...game.franchiseHistory]
    .filter((entry) => entry.teamId === team.id)
    .sort((left, right) => left.year - right.year);

  const startYear = history[0]?.year ?? game.year;

  return {
    dynastyId: deriveDynastyId(game),
    teamId: team.id,
    teamCity: team.city,
    teamName: team.name,
    teamAbbr: team.abbr,
    startYear,
    endYear: null,
    seasonsCoached: history.length,
    wins: history.reduce((total, entry) => total + entry.wins, 0),
    losses: history.reduce((total, entry) => total + entry.losses, 0),
    ties: history.reduce((total, entry) => total + entry.ties, 0),
    championships: history.filter((entry) => entry.playoffFinish === 'champion').length,
    playoffAppearances: history.filter((entry) => isPlayoffAppearance(entry.playoffFinish)).length,
    breakoutsDeveloped: countHistoricalBreakouts(game, team.id, startYear),
    coachesDeveloped: countDevelopedCoaches(game),
    hallOfFamersDeveloped: countDevelopedHallOfFamers(game),
  };
}

export function readCareerMeta(): CareerMeta {
  const backingStore = storage();
  if (!backingStore) return defaultCareerMeta();

  const raw = backingStore.getItem(STORAGE_KEY);
  if (!raw) return defaultCareerMeta();

  try {
    const parsed = JSON.parse(raw);
    const validated = CareerMetaSchema.safeParse(parsed);
    if (!validated.success) return defaultCareerMeta();
    return normalize(validated.data);
  } catch {
    return defaultCareerMeta();
  }
}

export function parseCareerMetaPayload(candidate: unknown): CareerMeta | null {
  const validated = CareerMetaSchema.safeParse(candidate);
  if (!validated.success) return null;
  return normalize(validated.data);
}

export function writeCareerMeta(meta: CareerMeta): CareerMeta {
  const next = normalize(meta);
  const backingStore = storage();
  if (!backingStore) return next;
  backingStore.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function replaceCareerMeta(meta: CareerMeta): CareerMeta {
  return writeCareerMeta(meta);
}

export function appendDynastySummary(summary: DynastySummary): CareerMeta {
  const current = readCareerMeta();
  const existingIndex = current.dynasties.findIndex((entry) => entry.dynastyId === summary.dynastyId);
  const dynasties = existingIndex === -1
    ? [...current.dynasties, summary]
    : current.dynasties.map((entry, index) => (index === existingIndex ? summary : entry));

  return writeCareerMeta({
    schemaVersion: SCHEMA_VERSION,
    dynasties,
    careerTotals: defaultCareerTotals(),
  });
}

export function finalizeDynasty(dynastyId: string, endYear: number): CareerMeta {
  const current = readCareerMeta();
  const dynasties = current.dynasties.map((entry) =>
    entry.dynastyId === dynastyId
      ? {
          ...entry,
          endYear,
        }
      : entry,
  );

  return writeCareerMeta({
    schemaVersion: SCHEMA_VERSION,
    dynasties,
    careerTotals: defaultCareerTotals(),
  });
}

export function finalizedEndYearForGame(game: GameState): number {
  return Math.max(deriveDynastyStartYear(game), completedSeasonEndYear(game));
}
