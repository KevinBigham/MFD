import { mulberry32, type PrngFn } from '../rng';
import type { PossessionState, SnapEvent } from '../types';
import {
  applyContingency,
  shouldFireContingency,
  type ContingencyCheckContext,
  type ContingencyRule,
} from './contingency-plans';
import {
  advancePossession,
  createPossessionState,
  recommendFourthDownDecision,
  type SnapResolution,
} from './possession-state';

export interface ShadowTeamInput {
  id: string;
  overall: number;
  runRate?: number;
  secondHalfRunRateDelta?: number;
  trickPlayIds?: readonly string[];
  goForItOnFourth?: boolean;
  contingencyRules?: readonly ContingencyRule[];
  windSpeed?: number;
  coachMode?: boolean;
  twoMinuteMode?: boolean;
}

export interface ShadowGameResult {
  homeScore: number;
  awayScore: number;
  homeYards: number;
  awayYards: number;
  snapEvents: SnapEvent[];
  runPlays: number;
  passPlays: number;
  turnovers: number;
}

export interface ShadowCalibrationSample {
  seed: number;
  gameId: string;
  home: ShadowTeamInput;
  away: ShadowTeamInput;
  canonicalHomeScore: number;
  canonicalAwayScore: number;
  canonicalPassRate: number;
  canonicalYardsPerTeam: number;
}

export interface ShadowCalibrationReport {
  games: number;
  canonicalPointsPerTeam: number;
  shadowPointsPerTeam: number;
  scoringDelta: number;
  canonicalScoringStdDev: number;
  shadowScoringStdDev: number;
  scoringStdDevDelta: number;
  canonicalPassRate: number;
  shadowPassRate: number;
  passRateDelta: number;
  canonicalYardsPerTeam: number;
  shadowYardsPerTeam: number;
  yardsPerTeamDelta: number;
  canonicalUpsetRate: number;
  shadowUpsetRate: number;
  upsetRateDelta: number;
  winnerAgreement: number;
  withinTolerance: boolean;
}

/** Legacy drive stats credit one terminal play per possession; the snap model
 * credits every play. Keep this compatibility band explicit until records are
 * fully rebased on snap-era seasons. */
export const LEGACY_DRIVE_YARDS_PER_TEAM_TOLERANCE = 175;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function offenseInput(state: PossessionState, home: ShadowTeamInput, away: ShadowTeamInput): ShadowTeamInput {
  return state.possessionTeamId === home.id ? home : away;
}

function defenseInput(state: PossessionState, home: ShadowTeamInput, away: ShadowTeamInput): ShadowTeamInput {
  return state.defenseTeamId === home.id ? home : away;
}

function scrimmageResolution(
  state: PossessionState,
  home: ShadowTeamInput,
  away: ShadowTeamInput,
  rng: PrngFn,
): SnapResolution {
  const offense = offenseInput(state, home, away);
  const defense = defenseInput(state, home, away);
  const ratingEdge = clamp((offense.overall - defense.overall) * 0.08, -2.5, 2.5);
  const scoreDiff = offense.id === home.id
    ? state.homeScore - state.awayScore
    : state.awayScore - state.homeScore;
  const latePassPressure = state.quarter >= 4 && state.clockSeconds < 360 && scoreDiff < 0 ? 0.16 : 0;
  // The frozen drive-sim contract calls passes on roughly 42% of scrimmage
  // attempts. Preserve that mix until the snap engine becomes canonical.
  const halftimeDelta = state.quarter >= 3 ? (offense.secondHalfRunRateDelta ?? 0) : 0;
  const runRate = clamp((offense.runRate ?? 0.58) + halftimeDelta - latePassPressure, 0.25, 0.72);
  const isRun = rng() < runRate;

  if (isRun) {
    const turnover = rng() < 0.012;
    const explosive = rng() < 0.055;
    const yards = turnover ? Math.round(rng() * 5) : explosive
      ? Math.round(14 + rng() * 27 + ratingEdge)
      : Math.round(-2 + rng() * 10 + ratingEdge);
    return {
      playType: 'run',
      yards,
      elapsedSeconds: Math.round(24 + rng() * 18),
      turnover,
      description: turnover ? 'Fumble recovered by the defense.' : explosive ? `Explosive run for ${yards}.` : `Run for ${yards}.`,
    };
  }

  const interception = rng() < clamp(0.026 - ratingEdge * 0.002, 0.012, 0.045);
  const completion = !interception && rng() < clamp(0.61 + ratingEdge * 0.018, 0.48, 0.74);
  const yards = interception ? Math.round(rng() * 12) : completion
    ? Math.round(3 + rng() * 18 + Math.max(0, ratingEdge))
    : 0;
  return {
    playType: 'pass',
    yards,
    elapsedSeconds: completion ? Math.round(18 + rng() * 18) : Math.round(5 + rng() * 6),
    turnover: interception,
    incomplete: !completion && !interception,
    description: interception ? 'Pass intercepted.' : completion ? `Completion for ${yards}.` : 'Pass incomplete.',
  };
}

function isCoachFourthDownCall(state: PossessionState, offense: ShadowTeamInput): boolean {
  const lateOneScore = state.quarter >= 4 && state.clockSeconds <= 120
    && Math.abs(state.homeScore - state.awayScore) <= 8;
  return Boolean(offense.coachMode && (state.distance <= 2 || (lateOneScore && state.distance <= 6)));
}

function fourthDownResolution(state: PossessionState, offense: ShadowTeamInput, rng: PrngFn): SnapResolution {
  const lateOneScore = state.quarter >= 4 && state.clockSeconds <= 120
    && Math.abs(state.homeScore - state.awayScore) <= 8;
  const coachCall = isCoachFourthDownCall(state, offense);
  const decision = (offense.goForItOnFourth || coachCall) && (state.distance <= 6 || lateOneScore)
    ? 'go_for_it'
    : recommendFourthDownDecision(state);
  if (decision === 'punt') {
    const yards = Math.min(52, Math.max(24, Math.round(35 + rng() * 15)));
    return { playType: 'punt', yards, elapsedSeconds: 8, changePossession: true, description: `Punt travels ${yards}.` };
  }
  if (decision === 'field_goal') {
    const distance = 117 - state.fieldPosition;
    const made = rng() < clamp(0.95 - Math.max(0, distance - 35) * 0.018, 0.42, 0.95);
    return {
      playType: 'field_goal',
      yards: 0,
      elapsedSeconds: 5,
      points: made ? 3 : 0,
      changePossession: true,
      description: made ? `Field goal good from ${distance}.` : `Field goal missed from ${distance}.`,
    };
  }
  return { playType: 'run', yards: Math.round(-1 + rng() * 8), elapsedSeconds: 24, description: 'Fourth-down attempt.' };
}

const CONTINGENCY_RUN_RATE: Partial<Record<NonNullable<ReturnType<typeof applyContingency>['offensiveScheme']>, number>> = {
  balanced: 0.58,
  spread: 0.45,
  run_heavy: 0.68,
  pass_heavy: 0.40,
  power: 0.66,
};

function contingencyDecisionRef(teamId: string, ruleId: string): string {
  return `contingency:${teamId}:${ruleId}`;
}

function applySnapContingency(team: ShadowTeamInput, rule: ContingencyRule): void {
  const adjustments = applyContingency(rule);
  if (adjustments.offensiveScheme) {
    team.runRate = CONTINGENCY_RUN_RATE[adjustments.offensiveScheme] ?? team.runRate;
  }
  if (adjustments.gamePlanBonus) {
    team.overall = clamp(team.overall + adjustments.gamePlanBonus, 1, 99);
  }
  if (rule.response === 'go_for_it_on_4th') {
    team.goForItOnFourth = true;
  }
}

export function simulateSnapShadow(
  gameId: string,
  home: ShadowTeamInput,
  away: ShadowTeamInput,
  seed: number,
): ShadowGameResult {
  const rng = mulberry32(seed);
  const activeHome: ShadowTeamInput = { ...home };
  const activeAway: ShadowTeamInput = { ...away };
  let state = createPossessionState(home.id, away.id, rng() < 0.5 ? home.id : away.id);
  const snapEvents: SnapEvent[] = [];
  let runPlays = 0;
  let passPlays = 0;
  let turnovers = 0;
  let homeYards = 0;
  let awayYards = 0;
  const usedTrickPlayTeamIds = new Set<string>();
  const firedContingencies = new Map<string, Set<string>>([
    [home.id, new Set<string>()],
    [away.id, new Set<string>()],
  ]);
  const activeFourthDownRefs = new Map<string, string>();
  const pendingDecisionRefs: string[] = [];
  const teamTurnovers: Record<string, number> = { [home.id]: 0, [away.id]: 0 };
  const openingDriveComplete: Record<string, boolean> = { [home.id]: false, [away.id]: false };
  const openingDriveTouchdown: Record<string, boolean> = { [home.id]: false, [away.id]: false };
  let evaluatedQuarter = state.quarter;
  let lateWindowEvaluated = false;
  const coachTwoMinuteCalled = new Set<string>();

  const evaluateTeamContingencies = (
    team: ShadowTeamInput,
    opponent: ShadowTeamInput,
    lateGameWindow: boolean,
  ): void => {
    const fired = firedContingencies.get(team.id)!;
    const rules = team.contingencyRules?.filter((rule) => !fired.has(rule.id)) ?? [];
    if (rules.length === 0) return;
    const scoreDiff = team.id === home.id
      ? state.homeScore - state.awayScore
      : state.awayScore - state.homeScore;
    const contingencyContext: ContingencyCheckContext = {
      scoreDiff,
      quarter: state.quarter,
      turnovers: teamTurnovers[team.id] ?? 0,
      opponentTurnovers: teamTurnovers[opponent.id] ?? 0,
      opponentScoredOnOpening: openingDriveTouchdown[opponent.id] ?? false,
      windSpeed: team.windSpeed ?? 0,
      lateGameWindow,
    };
    const rule = rules.find((candidate) => shouldFireContingency(candidate, contingencyContext));
    if (!rule) return;
    fired.add(rule.id);
    applySnapContingency(team, rule);
    const decisionRef = contingencyDecisionRef(team.id, rule.id);
    pendingDecisionRefs.push(decisionRef);
    if (rule.response === 'go_for_it_on_4th') {
      activeFourthDownRefs.set(team.id, decisionRef);
    }
  };

  for (let sequence = 1; sequence <= 240 && !(state.quarter === 4 && state.clockSeconds === 0); sequence += 1) {
    const lateGameWindow = state.quarter === 4 && state.clockSeconds <= 120;
    if (state.quarter !== evaluatedQuarter || (lateGameWindow && !lateWindowEvaluated)) {
      evaluateTeamContingencies(activeHome, activeAway, lateGameWindow);
      evaluateTeamContingencies(activeAway, activeHome, lateGameWindow);
      evaluatedQuarter = state.quarter;
      if (lateGameWindow) lateWindowEvaluated = true;
    }
    const before = state;
    const offense = offenseInput(state, activeHome, activeAway);
    const coachFourthDownCall = state.down === 4 && isCoachFourthDownCall(state, offense);
    if (lateGameWindow && offense.coachMode && offense.twoMinuteMode && !coachTwoMinuteCalled.has(offense.id)) {
      coachTwoMinuteCalled.add(offense.id);
      offense.runRate = Math.min(offense.runRate ?? 0.58, 0.32);
      pendingDecisionRefs.push(`coach-mode:${offense.id}:two-minute`);
    }
    const plannedTrickId = offense.trickPlayIds?.[0];
    const forceFourthDown = state.down === 4 && offense.goForItOnFourth === true
      && (state.distance <= 4 || (state.quarter >= 4 && state.clockSeconds <= 120 && Math.abs(state.homeScore - state.awayScore) <= 8));
    const trickSituation = state.down <= 3 && state.quarter >= 2
      && (state.fieldPosition >= 40 || (state.quarter >= 4 && state.clockSeconds <= 360));
    const callTrick = plannedTrickId !== undefined
      && !usedTrickPlayTeamIds.has(offense.id)
      && trickSituation
      && rng() < 0.08;
    let resolution: SnapResolution;
    if (callTrick) {
      usedTrickPlayTeamIds.add(offense.id);
      const turnover = rng() < 0.12;
      const success = !turnover && rng() < 0.58;
      const yards = turnover ? Math.round(rng() * 8) : success ? Math.round(15 + rng() * 25) : Math.round(-5 + rng() * 10);
      resolution = {
        playType: 'trick',
        yards,
        elapsedSeconds: 10,
        turnover,
        description: turnover
          ? `${plannedTrickId} fooled nobody and ended in a turnover.`
          : success ? `${plannedTrickId} broke open for ${yards}.` : `${plannedTrickId} was diagnosed for ${yards}.`,
      };
    } else {
      resolution = state.down === 4
        ? fourthDownResolution(state, offense, rng)
        : scrimmageResolution(state, activeHome, activeAway, rng);
    }
    const transition = advancePossession(state, resolution, home.id);
    state = transition.state;
    if (resolution.playType === 'run') runPlays += 1;
    if (resolution.playType === 'pass') passPlays += 1;
    if (resolution.playType === 'run' || (resolution.playType === 'pass' && !resolution.turnover)) {
      if (before.possessionTeamId === home.id) homeYards += resolution.yards;
      else awayYards += resolution.yards;
    }
    if (resolution.playType === 'trick') {
      if (before.possessionTeamId === home.id) homeYards += resolution.yards;
      else awayYards += resolution.yards;
    }
    if (resolution.turnover || transition.turnoverOnDowns) turnovers += 1;
    if (resolution.turnover) {
      teamTurnovers[before.possessionTeamId] = (teamTurnovers[before.possessionTeamId] ?? 0) + 1;
    }
    if (state.possessionTeamId !== before.possessionTeamId && !openingDriveComplete[before.possessionTeamId]) {
      openingDriveComplete[before.possessionTeamId] = true;
      openingDriveTouchdown[before.possessionTeamId] = (transition.points ?? 0) >= 6;
    }
    const liveDecisionRefs = [
      ...pendingDecisionRefs.splice(0),
      ...(callTrick && plannedTrickId ? [`trick:${plannedTrickId}`] : []),
      ...(forceFourthDown && activeFourthDownRefs.has(offense.id) ? [activeFourthDownRefs.get(offense.id)!] : []),
      ...(coachFourthDownCall ? [`coach-mode:${offense.id}:fourth-down:${resolution.playType}`] : []),
    ];
    snapEvents.push({
      id: `snap:${gameId}:${sequence}`,
      gameId,
      sequence,
      before,
      after: state,
      offenseTeamId: before.possessionTeamId,
      defenseTeamId: before.defenseTeamId,
      playType: resolution.playType,
      yards: resolution.yards,
      points: transition.points,
      turnover: Boolean(resolution.turnover || transition.turnoverOnDowns),
      elapsedSeconds: resolution.elapsedSeconds,
      description: resolution.description,
      causeIds: sequence > 1 ? [`snap:${gameId}:${sequence - 1}`] : [],
      decisionRefs: liveDecisionRefs.length > 0 ? [...new Set(liveDecisionRefs)] : undefined,
    });
  }

  // The legacy contract never returns a tied final. Resolve a regulation tie
  // with an explicit overtime scoring snap so playoffs and standings consume
  // a winner without an invisible coin-flip mutation.
  if (state.homeScore === state.awayScore) {
    const overtimeOffense = rng() < 0.5 ? home.id : away.id;
    const before: PossessionState = {
      ...state,
      possessionTeamId: overtimeOffense,
      defenseTeamId: overtimeOffense === home.id ? away.id : home.id,
      quarter: 5,
      clockSeconds: 600,
      down: 4,
      distance: 5,
      fieldPosition: 75,
      homeTimeouts: 2,
      awayTimeouts: 2,
    };
    const transition = advancePossession(before, {
      playType: 'field_goal',
      yards: 0,
      elapsedSeconds: 5,
      points: 3,
      changePossession: true,
      description: 'Overtime field goal is good.',
    }, home.id);
    state = transition.state;
    const sequence = snapEvents.length + 1;
    snapEvents.push({
      id: `snap:${gameId}:${sequence}`,
      gameId,
      sequence,
      before,
      after: state,
      offenseTeamId: before.possessionTeamId,
      defenseTeamId: before.defenseTeamId,
      playType: 'field_goal',
      yards: 0,
      points: 3,
      turnover: false,
      elapsedSeconds: 5,
      description: 'Overtime field goal is good.',
      causeIds: sequence > 1 ? [`snap:${gameId}:${sequence - 1}`] : [],
    });
  }

  return {
    homeScore: state.homeScore,
    awayScore: state.awayScore,
    homeYards,
    awayYards,
    snapEvents,
    runPlays,
    passPlays,
    turnovers,
  };
}

export function calibrateSnapShadow(samples: readonly ShadowCalibrationSample[]): ShadowCalibrationReport {
  if (samples.length === 0) {
    return {
      games: 0, canonicalPointsPerTeam: 0, shadowPointsPerTeam: 0, scoringDelta: 0,
      canonicalScoringStdDev: 0, shadowScoringStdDev: 0, scoringStdDevDelta: 0,
      canonicalPassRate: 0, shadowPassRate: 0, passRateDelta: 0,
      canonicalYardsPerTeam: 0, shadowYardsPerTeam: 0, yardsPerTeamDelta: 0,
      canonicalUpsetRate: 0, shadowUpsetRate: 0, upsetRateDelta: 0,
      winnerAgreement: 1, withinTolerance: true,
    };
  }
  let canonicalPoints = 0;
  let shadowPoints = 0;
  let canonicalPassRate = 0;
  let shadowPassRate = 0;
  let canonicalYards = 0;
  let shadowYards = 0;
  let canonicalUpsets = 0;
  let shadowUpsets = 0;
  let winnerMatches = 0;
  const canonicalTeamScores: number[] = [];
  const shadowTeamScores: number[] = [];
  for (const sample of samples) {
    const shadow = simulateSnapShadow(sample.gameId, sample.home, sample.away, sample.seed);
    canonicalPoints += sample.canonicalHomeScore + sample.canonicalAwayScore;
    shadowPoints += shadow.homeScore + shadow.awayScore;
    canonicalTeamScores.push(sample.canonicalHomeScore, sample.canonicalAwayScore);
    shadowTeamScores.push(shadow.homeScore, shadow.awayScore);
    canonicalPassRate += sample.canonicalPassRate;
    shadowPassRate += shadow.passPlays / Math.max(1, shadow.passPlays + shadow.runPlays);
    canonicalYards += sample.canonicalYardsPerTeam;
    shadowYards += (shadow.homeYards + shadow.awayYards) / 2;
    const canonicalWinner = Math.sign(sample.canonicalHomeScore - sample.canonicalAwayScore);
    const shadowWinner = Math.sign(shadow.homeScore - shadow.awayScore);
    if (canonicalWinner === shadowWinner) winnerMatches += 1;
    const homeIsUnderdog = sample.home.overall < sample.away.overall;
    const awayIsUnderdog = sample.away.overall < sample.home.overall;
    if ((homeIsUnderdog && canonicalWinner > 0) || (awayIsUnderdog && canonicalWinner < 0)) canonicalUpsets += 1;
    if ((homeIsUnderdog && shadowWinner > 0) || (awayIsUnderdog && shadowWinner < 0)) shadowUpsets += 1;
  }
  const canonicalPointsPerTeam = canonicalPoints / (samples.length * 2);
  const shadowPointsPerTeam = shadowPoints / (samples.length * 2);
  const canonicalPassRateMean = canonicalPassRate / samples.length;
  const shadowPassRateMean = shadowPassRate / samples.length;
  const scoringDelta = shadowPointsPerTeam - canonicalPointsPerTeam;
  const passRateDelta = shadowPassRateMean - canonicalPassRateMean;
  const mean = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0) / values.length;
  const stdDev = (values: readonly number[]): number => {
    const average = mean(values);
    return Math.sqrt(mean(values.map((value) => (value - average) ** 2)));
  };
  const canonicalScoringStdDev = stdDev(canonicalTeamScores);
  const shadowScoringStdDev = stdDev(shadowTeamScores);
  const canonicalYardsPerTeam = canonicalYards / samples.length;
  const shadowYardsPerTeam = shadowYards / samples.length;
  const canonicalUpsetRate = canonicalUpsets / samples.length;
  const shadowUpsetRate = shadowUpsets / samples.length;
  const winnerAgreement = winnerMatches / samples.length;
  return {
    games: samples.length,
    canonicalPointsPerTeam,
    shadowPointsPerTeam,
    scoringDelta,
    canonicalScoringStdDev,
    shadowScoringStdDev,
    scoringStdDevDelta: shadowScoringStdDev - canonicalScoringStdDev,
    canonicalPassRate: canonicalPassRateMean,
    shadowPassRate: shadowPassRateMean,
    passRateDelta,
    canonicalYardsPerTeam,
    shadowYardsPerTeam,
    yardsPerTeamDelta: shadowYardsPerTeam - canonicalYardsPerTeam,
    canonicalUpsetRate,
    shadowUpsetRate,
    upsetRateDelta: shadowUpsetRate - canonicalUpsetRate,
    winnerAgreement,
    withinTolerance: Math.abs(scoringDelta) <= 3.5
      && Math.abs(shadowScoringStdDev - canonicalScoringStdDev) <= 4
      && Math.abs(passRateDelta) <= 0.08
      && Math.abs(shadowYardsPerTeam - canonicalYardsPerTeam) <= LEGACY_DRIVE_YARDS_PER_TEAM_TOLERANCE
      && Math.abs(shadowUpsetRate - canonicalUpsetRate) <= 0.1,
  };
}
