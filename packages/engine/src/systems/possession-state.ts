import type { PossessionState, SnapEvent } from '../types';

export interface SnapResolution {
  playType: SnapEvent['playType'];
  yards: number;
  elapsedSeconds: number;
  turnover?: boolean;
  incomplete?: boolean;
  points?: number;
  changePossession?: boolean;
  description: string;
}

export type CoachModeDecision = 'go_for_it' | 'punt' | 'field_goal';

export interface PossessionTransition {
  state: PossessionState;
  scoredByTeamId: string | null;
  points: number;
  possessionChanged: boolean;
  turnoverOnDowns: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function nextPeriod(state: PossessionState, elapsedSeconds: number): Pick<PossessionState, 'quarter' | 'clockSeconds'> {
  let quarter = state.quarter;
  let clockSeconds = state.clockSeconds - Math.max(0, Math.round(elapsedSeconds));
  while (clockSeconds <= 0 && quarter < 4) {
    quarter += 1;
    clockSeconds += 900;
  }
  return { quarter, clockSeconds: Math.max(0, clockSeconds) };
}

function flipPossession(state: PossessionState, fieldPosition: number): PossessionState {
  return {
    ...state,
    possessionTeamId: state.defenseTeamId,
    defenseTeamId: state.possessionTeamId,
    down: 1,
    distance: Math.min(10, Math.max(1, 100 - fieldPosition)),
    fieldPosition: clamp(100 - fieldPosition, 1, 99),
    personnel: '11',
  };
}

export function createPossessionState(
  homeTeamId: string,
  awayTeamId: string,
  receivingTeamId: string = awayTeamId,
): PossessionState {
  const possessionTeamId = receivingTeamId === homeTeamId ? homeTeamId : awayTeamId;
  return {
    possessionTeamId,
    defenseTeamId: possessionTeamId === homeTeamId ? awayTeamId : homeTeamId,
    quarter: 1,
    clockSeconds: 900,
    down: 1,
    distance: 10,
    fieldPosition: 25,
    homeTimeouts: 3,
    awayTimeouts: 3,
    personnel: '11',
    homeScore: 0,
    awayScore: 0,
  };
}

export function validatePossessionState(state: PossessionState): string[] {
  const errors: string[] = [];
  if (!state.possessionTeamId || !state.defenseTeamId || state.possessionTeamId === state.defenseTeamId) errors.push('teams');
  if (state.quarter < 1 || state.quarter > 5) errors.push('quarter');
  if (state.clockSeconds < 0 || state.clockSeconds > (state.quarter === 5 ? 600 : 900)) errors.push('clockSeconds');
  if (state.down < 1 || state.down > 4) errors.push('down');
  if (state.distance < 1 || state.distance > 99) errors.push('distance');
  if (state.fieldPosition < 1 || state.fieldPosition > 99) errors.push('fieldPosition');
  if (state.homeTimeouts < 0 || state.homeTimeouts > 3 || state.awayTimeouts < 0 || state.awayTimeouts > 3) errors.push('timeouts');
  if (state.homeScore < 0 || state.awayScore < 0) errors.push('score');
  return errors;
}

/** Pure down-distance-clock transition. No RNG and no UI coupling. */
export function advancePossession(
  state: PossessionState,
  resolution: SnapResolution,
  homeTeamId: string,
): PossessionTransition {
  if (validatePossessionState(state).length > 0) throw new Error('Invalid PossessionState');
  const period = nextPeriod(state, resolution.elapsedSeconds);
  const offenseIsHome = state.possessionTeamId === homeTeamId;
  const rawFieldPosition = clamp(state.fieldPosition + Math.round(resolution.yards), 1, 100);
  const explicitPoints = Math.max(0, Math.round(resolution.points ?? 0));
  const touchdownPoints = rawFieldPosition >= 100 && resolution.playType !== 'punt' ? 7 : 0;
  const points = explicitPoints || touchdownPoints;
  let next: PossessionState = { ...state, ...period, fieldPosition: Math.min(99, rawFieldPosition) };

  if (points > 0) {
    next = {
      ...next,
      homeScore: next.homeScore + (offenseIsHome ? points : 0),
      awayScore: next.awayScore + (offenseIsHome ? 0 : points),
    };
  }

  const turnover = Boolean(resolution.turnover);
  const possessionChanged = turnover || Boolean(resolution.changePossession) || points > 0;
  if (possessionChanged) {
    const spot = points > 0 ? 75 : next.fieldPosition;
    next = flipPossession(next, spot);
    if (points > 0) next.fieldPosition = 25;
    return {
      state: next,
      scoredByTeamId: points > 0 ? state.possessionTeamId : null,
      points,
      possessionChanged: true,
      turnoverOnDowns: false,
    };
  }

  const gainedFirstDown = resolution.yards >= state.distance;
  if (gainedFirstDown) {
    next.down = 1;
    next.distance = Math.min(10, Math.max(1, 100 - next.fieldPosition));
  } else if (state.down === 4) {
    next = flipPossession(next, next.fieldPosition);
    return { state: next, scoredByTeamId: null, points: 0, possessionChanged: true, turnoverOnDowns: true };
  } else {
    next.down = (state.down + 1) as PossessionState['down'];
    next.distance = clamp(state.distance - resolution.yards, 1, 99);
  }

  return { state: next, scoredByTeamId: null, points: 0, possessionChanged: false, turnoverOnDowns: false };
}

export function recommendFourthDownDecision(state: PossessionState): CoachModeDecision {
  const trailingLate = state.quarter >= 4
    && state.clockSeconds <= 300
    && (state.homeScore !== state.awayScore);
  if (state.fieldPosition >= 62 && state.fieldPosition <= 82 && !trailingLate) return 'field_goal';
  if (state.fieldPosition < 55 && state.distance > 2 && !trailingLate) return 'punt';
  return 'go_for_it';
}

export function useTimeout(state: PossessionState, teamId: string, homeTeamId: string): PossessionState {
  if (teamId !== state.possessionTeamId && teamId !== state.defenseTeamId) return state;
  const isHome = teamId === homeTeamId;
  if (isHome && state.homeTimeouts > 0) return { ...state, homeTimeouts: state.homeTimeouts - 1 };
  if (!isHome && state.awayTimeouts > 0) return { ...state, awayTimeouts: state.awayTimeouts - 1 };
  return state;
}
