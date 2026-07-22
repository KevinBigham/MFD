import { describe, expect, it } from 'vitest';
import {
  advancePossession,
  createPossessionState,
  recommendFourthDownDecision,
  validatePossessionState,
} from './possession-state';

describe('pure possession state', () => {
  it('advances clock, down, distance, and first downs without mutation', () => {
    const initial = createPossessionState('home', 'away', 'home');
    const thirdAndSix = { ...initial, down: 3 as const, distance: 6, clockSeconds: 420 };
    const result = advancePossession(thirdAndSix, {
      playType: 'pass', yards: 8, elapsedSeconds: 27, description: 'completion',
    }, 'home');

    expect(result.state).toMatchObject({ down: 1, distance: 10, fieldPosition: 33, clockSeconds: 393 });
    expect(thirdAndSix).toMatchObject({ down: 3, distance: 6, fieldPosition: 25, clockSeconds: 420 });
  });

  it('flips field position and teams on turnovers', () => {
    const initial = { ...createPossessionState('home', 'away', 'home'), fieldPosition: 68 };
    const result = advancePossession(initial, {
      playType: 'pass', yards: 0, elapsedSeconds: 6, turnover: true, description: 'interception',
    }, 'home');

    expect(result.possessionChanged).toBe(true);
    expect(result.state).toMatchObject({ possessionTeamId: 'away', defenseTeamId: 'home', fieldPosition: 32, down: 1 });
  });

  it('derives scoring and kickoff possession from the snap result', () => {
    const initial = { ...createPossessionState('home', 'away', 'home'), fieldPosition: 96, homeScore: 10 };
    const result = advancePossession(initial, {
      playType: 'run', yards: 5, elapsedSeconds: 8, description: 'touchdown',
    }, 'home');

    expect(result).toMatchObject({ scoredByTeamId: 'home', points: 7, possessionChanged: true });
    expect(result.state).toMatchObject({ homeScore: 17, possessionTeamId: 'away', fieldPosition: 25 });
  });

  it('handles turnover on downs and deterministic fourth-down advice', () => {
    const state = { ...createPossessionState('home', 'away', 'away'), down: 4 as const, distance: 4, fieldPosition: 45 };
    const result = advancePossession(state, {
      playType: 'run', yards: 2, elapsedSeconds: 31, description: 'stopped',
    }, 'home');

    expect(result.turnoverOnDowns).toBe(true);
    expect(result.state.possessionTeamId).toBe('home');
    expect(recommendFourthDownDecision(state)).toBe('punt');
    expect(validatePossessionState(result.state)).toEqual([]);
  });
});
