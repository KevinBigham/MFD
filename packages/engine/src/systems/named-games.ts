/**
 * Named Games — Rare games that earn permanent names in dynasty history.
 *
 * After certain game conditions, games get legendary names that persist
 * in the dynasty timeline and are referenced in future broadcasts.
 */
import type { PrngFn } from '../rng';
import type { GameResult, WeatherCondition } from '../types';

// ── Types ──────────────────────────────────────────────

export interface NamedGame {
  name: string;
  gameId: string;
  year: number;
  week: number;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  reason: string;
}

interface NameCandidate {
  condition: (ctx: GameContext) => boolean;
  names: readonly string[];
  reason: string;
  /** Priority — higher = checked first. Only one name per game. */
  priority: number;
}

interface GameContext {
  result: GameResult;
  isPlayoff: boolean;
  isRivalry: boolean;
  weather: WeatherCondition | null;
  rng: PrngFn;
}

// ── Name Candidates ────────────────────────────────────

const NAME_CANDIDATES: readonly NameCandidate[] = [
  {
    condition: (ctx) => {
      const diff = Math.abs(ctx.result.homeScore - ctx.result.awayScore);
      return diff >= 35;
    },
    names: ['The Annihilation', 'The Massacre', 'The Demolition Derby'],
    reason: 'Blowout — 35+ point margin',
    priority: 5,
  },
  {
    condition: (ctx) => ctx.result.overtime && ctx.isPlayoff,
    names: ['The Marathon', 'The Epic', 'The Never-Ending Game'],
    reason: 'Overtime thriller in the playoffs',
    priority: 8,
  },
  {
    condition: (ctx) => ctx.result.overtime && !ctx.isPlayoff,
    names: ['The Overtime Classic', 'The Extra Period'],
    reason: 'Overtime regular season game',
    priority: 3,
  },
  {
    condition: (ctx) => ctx.weather === 'snow',
    names: ['The Snow Bowl', 'The Blizzard Game', 'The Whiteout'],
    reason: 'Played in heavy snow',
    priority: 6,
  },
  {
    condition: (ctx) => ctx.weather === 'rain' && ctx.rng() < 0.3,
    names: ['The Mud Bowl', 'The Monsoon Game'],
    reason: 'Played in torrential rain',
    priority: 4,
  },
  {
    condition: (ctx) => ctx.weather === 'wind' && ctx.rng() < 0.25,
    names: ['The Wind Tunnel', 'The Gale Force Game'],
    reason: 'Played in extreme wind',
    priority: 4,
  },
  {
    condition: (ctx) => {
      const diff = Math.abs(ctx.result.homeScore - ctx.result.awayScore);
      return ctx.isRivalry && ctx.isPlayoff && diff <= 7;
    },
    names: ['The Grudge Match', 'The Rivalry Reckoning', 'The Blood Feud'],
    reason: 'Close playoff rivalry game',
    priority: 9,
  },
  {
    condition: (ctx) => {
      const diff = Math.abs(ctx.result.homeScore - ctx.result.awayScore);
      return ctx.isRivalry && diff <= 3;
    },
    names: ['The Neighborhood War', 'The Crosstown Classic'],
    reason: 'Close rivalry game decided by 3 or less',
    priority: 4,
  },
  {
    condition: (ctx) => {
      const total = ctx.result.homeScore + ctx.result.awayScore;
      return total >= 70;
    },
    names: ['The Shootout', 'The Fireworks Game', 'The Scoreboard Breaker'],
    reason: 'Combined score of 70+',
    priority: 7,
  },
  {
    condition: (ctx) => {
      const total = ctx.result.homeScore + ctx.result.awayScore;
      return total <= 13;
    },
    names: ['The Defensive Masterpiece', 'The Lockdown Game', 'The Pitcher\'s Duel'],
    reason: 'Combined score of 13 or less — a defensive battle',
    priority: 5,
  },
  {
    condition: (ctx) => {
      // Comeback: trailing team wins
      // We approximate: if the final is close and it was a rivalry or playoff
      const diff = Math.abs(ctx.result.homeScore - ctx.result.awayScore);
      return diff <= 7 && ctx.isPlayoff && ctx.rng() < 0.3;
    },
    names: ['The Comeback', 'The Miracle', 'The Great Escape'],
    reason: 'Dramatic comeback victory in the playoffs',
    priority: 8,
  },
  {
    condition: (ctx) => ctx.result.homeScore === 0 || ctx.result.awayScore === 0,
    names: ['The Shutout', 'The Blanking', 'The Goose Egg'],
    reason: 'One team was shut out',
    priority: 6,
  },
] as const;

// ── Rarity Gate ────────────────────────────────────────

/** Base chance that a qualifying game actually gets named (keeps them rare) */
const NAMING_CHANCE = 0.25;

// ── Public API ─────────────────────────────────────────

/**
 * Check if a game qualifies for a permanent name.
 * Returns null if no name is earned (most games won't).
 */
export function checkForNamedGame(
  rng: PrngFn,
  result: GameResult,
  isPlayoff: boolean,
  isRivalry: boolean,
): NamedGame | null {
  const ctx: GameContext = {
    result,
    isPlayoff,
    isRivalry,
    weather: result.weather ?? null,
    rng,
  };

  // Sort by priority (highest first)
  const sorted = [...NAME_CANDIDATES].sort((a, b) => b.priority - a.priority);

  for (const candidate of sorted) {
    if (candidate.condition(ctx)) {
      // Rarity gate — most qualifying games still don't get named
      if (rng() > NAMING_CHANCE) return null;

      const name = candidate.names[Math.floor(rng() * candidate.names.length)]!;
      return {
        name,
        gameId: result.id,
        year: result.year,
        week: result.week,
        homeTeamId: result.homeTeamId,
        awayTeamId: result.awayTeamId,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        reason: candidate.reason,
      };
    }
  }

  return null;
}

/**
 * Format a named game for display in broadcasts and timelines.
 */
export function formatNamedGame(game: NamedGame): string {
  return `"${game.name}" — Week ${game.week}, Year ${game.year} (${game.homeScore}-${game.awayScore})`;
}
