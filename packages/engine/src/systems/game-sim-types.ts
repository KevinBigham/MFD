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

export interface SimTeamContext {
  teamOvrBonus?: number;
  playerOvrBonuses?: Record<string, number>;
  clutchPlayerBonuses?: Record<string, number>;
  gamePlan?: GamePlan | null;
  opponentReport?: OpponentReport | null;
  halftimeModifier?: HalftimeDecisionModifier | null;
}

export interface SimGameContext {
  home?: SimTeamContext;
  away?: SimTeamContext;
  weather?: WeatherCondition;
  rivalryIntensity?: number;
  homeFieldBonus?: number;
}
