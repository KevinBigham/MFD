/**
 * Shared simulation-context type shells.
 *
 * Extracted from `game-sim.ts` to break the `game-plan` ↔ `game-sim`
 * runtime circular dependency (Sprint 40 "The Straight Line").
 *
 * These are pure type declarations — no runtime code, no imports from
 * sibling systems. Consumers in both directions (`game-sim`, `game-plan`,
 * `weekly-prep`, `halftime-decision`, `franchise-week`, etc.) import
 * from here instead of from each other.
 */
import type {
  GamePlan,
  HalftimeDecisionModifier,
  OpponentReport,
  WeatherCondition,
} from '../types';
import type { RngState } from '../rng';

export interface SimTeamContext {
  teamOvrBonus?: number;
  playerOvrBonuses?: Record<string, number>;
  clutchPlayerBonuses?: Record<string, number>;
  gamePlan?: GamePlan | null;
  opponentReport?: OpponentReport | null;
  halftimeModifier?: HalftimeDecisionModifier | null;
  /** User-authored live-call layer. CPU teams and Fast Sim leave this false. */
  coachMode?: boolean;
  /** Saved weekly-prep choice that activates the canonical two-minute script. */
  twoMinuteMode?: boolean;
}

export interface SimGameContext {
  home?: SimTeamContext;
  away?: SimTeamContext;
  weather?: WeatherCondition;
  rivalryIntensity?: number;
  homeFieldBonus?: number;
  /** Difficulty-owned late-game trait variance. Pro baseline is 0.5. */
  clutchSwing?: number;
  /** Playoff games use the trick-play caller's lower postseason risk rate. */
  isPlayoff?: boolean;
}

export type SimulationRngContext = Pick<RngState, 'play' | 'event'>;

/** Explicit runtime dependency bag for deterministic game simulation. */
export interface SimulationContext extends SimGameContext {
  rng: SimulationRngContext;
  /** Independent seed for the non-canonical snap shadow; never consumes canonical channels. */
  shadowSeed?: number;
  /** Promotion is explicit so calibration can continue pairing against the frozen drive sim. */
  snapMode?: 'shadow' | 'canonical';
  gameId?: string;
}
