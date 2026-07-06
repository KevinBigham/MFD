import { readFileSync } from 'node:fs';
import { describe, expect, expectTypeOf, it } from 'vitest';
import type {
  GamePlan,
  HalftimeDecisionModifier,
  OpponentReport,
  WeatherCondition,
} from '../types';
import * as runtimeModule from './game-sim-types';
import type { SimGameContext, SimTeamContext } from './game-sim-types';

type ExpectedSimTeamContext = {
  teamOvrBonus?: number;
  playerOvrBonuses?: Record<string, number>;
  clutchPlayerBonuses?: Record<string, number>;
  gamePlan?: GamePlan | null;
  opponentReport?: OpponentReport | null;
  halftimeModifier?: HalftimeDecisionModifier | null;
};

type ExpectedSimGameContext = {
  home?: SimTeamContext;
  away?: SimTeamContext;
  weather?: WeatherCondition;
  rivalryIntensity?: number;
  homeFieldBonus?: number;
};

describe('game-sim-types boundary', () => {
  it('exports only type declarations at runtime', () => {
    expect(Object.keys(runtimeModule)).toEqual([]);
  });

  it('keeps SimTeamContext as the shared team-side sim modifier shell', () => {
    expectTypeOf<SimTeamContext>().toEqualTypeOf<ExpectedSimTeamContext>();
    expectTypeOf<SimTeamContext['gamePlan']>().toEqualTypeOf<GamePlan | null | undefined>();
    expectTypeOf<SimTeamContext['opponentReport']>().toEqualTypeOf<OpponentReport | null | undefined>();
    expectTypeOf<SimTeamContext['halftimeModifier']>().toEqualTypeOf<HalftimeDecisionModifier | null | undefined>();
  });

  it('keeps SimGameContext composed from home and away SimTeamContext values', () => {
    expectTypeOf<SimGameContext>().toEqualTypeOf<ExpectedSimGameContext>();
    expectTypeOf<NonNullable<SimGameContext['home']>>().toEqualTypeOf<SimTeamContext>();
    expectTypeOf<NonNullable<SimGameContext['away']>>().toEqualTypeOf<SimTeamContext>();
    expectTypeOf<SimGameContext['weather']>().toEqualTypeOf<WeatherCondition | undefined>();
  });

  it('stays free of value imports and sibling-system runtime imports', () => {
    const source = readFileSync(new URL('./game-sim-types.ts', import.meta.url), 'utf8');
    const importLines = source
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('import '));

    expect(importLines.every((line) => line.startsWith('import type '))).toBe(true);
    expect(source).not.toMatch(/from ['"]\.\/[^'"]+['"]/);
    expect(source).not.toMatch(/from ['"]\.\.\/systems\/[^'"]+['"]/);
  });
});
