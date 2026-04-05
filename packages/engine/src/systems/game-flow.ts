// ── Game Flow Analysis Engine ──────────────────────────────────
// Pure analysis of BroadcastOutput data: momentum, efficiency,
// scoring runs, win probability, turning points.
// No RNG, no side effects — all functions are pure.

import type { BroadcastOutput, DriveNarrative } from '../types';

// ── Types ──────────────────────────────────────────────────────

export interface GameFlowAnalysis {
  quarterMomentum: QuarterMomentum[];
  driveEfficiency: { home: DriveEfficiencyReport; away: DriveEfficiencyReport };
  scoringRuns: ScoringRun[];
  winProbability: WinProbPoint[];
  turningPoint: TurningPoint | null;
}

export interface QuarterMomentum {
  quarter: number;
  homePoints: number;
  awayPoints: number;
  homeDrives: number;
  awayDrives: number;
  homeYards: number;
  awayYards: number;
  dominantTeam: 'home' | 'away' | 'even';
  bigPlays: number;
}

export interface DriveEfficiencyReport {
  totalDrives: number;
  scoringDrives: number;
  scoringRate: number;
  threeAndOuts: number;
  avgYardsPerDrive: number;
  avgPlaysPerDrive: number;
  bestDriveYards: number;
}

export interface ScoringRun {
  teamSide: 'home' | 'away';
  points: number;
  startQuarter: number;
  endQuarter: number;
  drives: number;
  description: string;
}

export interface WinProbPoint {
  driveIndex: number;
  quarter: number;
  homeWinProb: number;
  scoreHome: number;
  scoreAway: number;
}

export interface TurningPoint {
  driveIndex: number;
  quarter: number;
  description: string;
  winProbSwing: number;
}

export interface GameResultRef {
  homeScore: number;
  awayScore: number;
  homeTeamId: string;
  awayTeamId: string;
  overtime: boolean;
}

// ── Constants ──────────────────────────────────────────────────

const POINTS_TOUCHDOWN = 7;
const POINTS_FIELD_GOAL = 3;
const BIG_PLAY_EXCITEMENT_THRESHOLD = 7;
const DOMINANCE_YARD_RATIO = 2;
const THREE_AND_OUT_MAX_PLAYS = 3;
const TURNING_POINT_MIN_SWING = 5;
const WIN_PROB_LOGISTIC_SLOPE = 0.3;

/** Quarter multiplier for win probability — later quarters amplify score diff. */
const QUARTER_MULTIPLIERS: Record<number, number> = {
  1: 0.5,
  2: 0.75,
  3: 1.0,
  4: 1.5,
};

// ── Helpers ────────────────────────────────────────────────────

function isHomeDrive(drive: DriveNarrative, homeTeamId: string): boolean {
  return drive.teamId === homeTeamId;
}

function drivePoints(drive: DriveNarrative): number {
  if (drive.endResult === 'touchdown') return POINTS_TOUCHDOWN;
  if (drive.endResult === 'fieldGoal') return POINTS_FIELD_GOAL;
  return 0;
}

function isScoringResult(result: DriveNarrative['endResult']): boolean {
  return result === 'touchdown' || result === 'fieldGoal';
}

// ── Public Functions ───────────────────────────────────────────

/**
 * Compute momentum metrics for a single quarter.
 * `q` is 0-indexed into the quarters array; output `quarter` is 1-indexed.
 */
export function getQuarterMomentum(
  quarters: DriveNarrative[][],
  q: number,
  homeTeamId: string,
): QuarterMomentum {
  const drives = quarters[q] ?? [];

  let homePoints = 0;
  let awayPoints = 0;
  let homeDrives = 0;
  let awayDrives = 0;
  let homeYards = 0;
  let awayYards = 0;
  let bigPlays = 0;

  for (const drive of drives) {
    const home = isHomeDrive(drive, homeTeamId);
    const pts = drivePoints(drive);

    if (home) {
      homeDrives += 1;
      homeYards += drive.yardsTotal;
      homePoints += pts;
    } else {
      awayDrives += 1;
      awayYards += drive.yardsTotal;
      awayPoints += pts;
    }

    for (const play of drive.plays) {
      if (play.excitement >= BIG_PLAY_EXCITEMENT_THRESHOLD) {
        bigPlays += 1;
      }
    }
  }

  let dominantTeam: 'home' | 'away' | 'even' = 'even';
  if (homeYards >= DOMINANCE_YARD_RATIO * awayYards && awayYards > 0) {
    dominantTeam = 'home';
  } else if (awayYards >= DOMINANCE_YARD_RATIO * homeYards && homeYards > 0) {
    dominantTeam = 'away';
  } else if (homeYards > 0 && awayYards === 0) {
    dominantTeam = 'home';
  } else if (awayYards > 0 && homeYards === 0) {
    dominantTeam = 'away';
  }

  return {
    quarter: q + 1,
    homePoints,
    awayPoints,
    homeDrives,
    awayDrives,
    homeYards,
    awayYards,
    dominantTeam,
    bigPlays,
  };
}

/**
 * Compute drive efficiency stats for a single team across all quarters.
 */
export function getDriveEfficiency(
  quarters: DriveNarrative[][],
  teamId: string,
): DriveEfficiencyReport {
  const teamDrives: DriveNarrative[] = [];

  for (const quarter of quarters) {
    for (const drive of quarter) {
      if (drive.teamId === teamId) {
        teamDrives.push(drive);
      }
    }
  }

  const totalDrives = teamDrives.length;

  if (totalDrives === 0) {
    return {
      totalDrives: 0,
      scoringDrives: 0,
      scoringRate: 0,
      threeAndOuts: 0,
      avgYardsPerDrive: 0,
      avgPlaysPerDrive: 0,
      bestDriveYards: 0,
    };
  }

  let scoringDrives = 0;
  let threeAndOuts = 0;
  let totalYards = 0;
  let totalPlays = 0;
  let bestDriveYards = 0;

  for (const drive of teamDrives) {
    if (isScoringResult(drive.endResult)) {
      scoringDrives += 1;
    }
    if (drive.plays.length <= THREE_AND_OUT_MAX_PLAYS && drive.endResult === 'punt') {
      threeAndOuts += 1;
    }
    totalYards += drive.yardsTotal;
    totalPlays += drive.plays.length;
    if (drive.yardsTotal > bestDriveYards) {
      bestDriveYards = drive.yardsTotal;
    }
  }

  return {
    totalDrives,
    scoringDrives,
    scoringRate: scoringDrives / totalDrives,
    threeAndOuts,
    avgYardsPerDrive: totalYards / totalDrives,
    avgPlaysPerDrive: totalPlays / totalDrives,
    bestDriveYards,
  };
}

/**
 * Detect consecutive scoring runs by the same team (2+ scoring drives
 * with no opponent scoring in between).
 */
export function getScoringRuns(
  quarters: DriveNarrative[][],
  homeTeamId: string,
): ScoringRun[] {
  const runs: ScoringRun[] = [];

  // Flatten drives with quarter tracking
  const allDrives: Array<{ drive: DriveNarrative; quarter: number }> = [];
  for (let q = 0; q < quarters.length; q += 1) {
    for (const drive of quarters[q] ?? []) {
      allDrives.push({ drive, quarter: q + 1 });
    }
  }

  let currentSide: 'home' | 'away' | null = null;
  let runPoints = 0;
  let runDrives = 0;
  let startQuarter = 0;
  let endQuarter = 0;

  function flushRun(): void {
    if (currentSide !== null && runDrives >= 2) {
      runs.push({
        teamSide: currentSide,
        points: runPoints,
        startQuarter,
        endQuarter,
        drives: runDrives,
        description: `${runPoints}-0 run from Q${startQuarter} to Q${endQuarter}`,
      });
    }
    runPoints = 0;
    runDrives = 0;
    currentSide = null;
  }

  for (const { drive, quarter } of allDrives) {
    const pts = drivePoints(drive);
    if (pts === 0) continue; // non-scoring drive doesn't break a run

    const side: 'home' | 'away' = isHomeDrive(drive, homeTeamId) ? 'home' : 'away';

    if (side === currentSide) {
      runPoints += pts;
      runDrives += 1;
      endQuarter = quarter;
    } else {
      flushRun();
      currentSide = side;
      runPoints = pts;
      runDrives = 1;
      startQuarter = quarter;
      endQuarter = quarter;
    }
  }

  flushRun();

  return runs;
}

/**
 * Build a win probability curve across all drives using a logistic model.
 * Returns one point per drive plus an initial 50-50 baseline.
 */
export function getWinProbabilityCurve(
  quarters: DriveNarrative[][],
  homeTeamId: string,
): WinProbPoint[] {
  const points: WinProbPoint[] = [];
  let homeScore = 0;
  let awayScore = 0;
  let driveIndex = 0;

  // Initial baseline
  points.push({
    driveIndex: 0,
    quarter: 1,
    homeWinProb: 50,
    scoreHome: 0,
    scoreAway: 0,
  });

  for (let q = 0; q < quarters.length; q += 1) {
    const quarterNum = q + 1;
    const multiplier = QUARTER_MULTIPLIERS[quarterNum] ?? 1.0;

    for (const drive of quarters[q] ?? []) {
      driveIndex += 1;
      const pts = drivePoints(drive);
      if (isHomeDrive(drive, homeTeamId)) {
        homeScore += pts;
      } else {
        awayScore += pts;
      }

      const scoreDiff = homeScore - awayScore;
      const homeWinProb = 100 / (1 + Math.exp(-WIN_PROB_LOGISTIC_SLOPE * scoreDiff * multiplier));

      points.push({
        driveIndex,
        quarter: quarterNum,
        homeWinProb,
        scoreHome: homeScore,
        scoreAway: awayScore,
      });
    }
  }

  return points;
}

/**
 * Find the single drive that caused the largest swing in win probability.
 * Returns null if no swing exceeds the minimum threshold.
 */
export function identifyTurningPoint(
  quarters: DriveNarrative[][],
  homeTeamId: string,
): TurningPoint | null {
  const curve = getWinProbabilityCurve(quarters, homeTeamId);

  if (curve.length < 2) return null;

  let maxSwing = 0;
  let maxIndex = -1;

  for (let i = 1; i < curve.length; i += 1) {
    const swing = Math.abs(curve[i]!.homeWinProb - curve[i - 1]!.homeWinProb);
    if (swing > maxSwing) {
      maxSwing = swing;
      maxIndex = i;
    }
  }

  if (maxSwing < TURNING_POINT_MIN_SWING || maxIndex < 0) return null;

  const point = curve[maxIndex]!;
  const prevPoint = curve[maxIndex - 1]!;
  const direction = point.homeWinProb > prevPoint.homeWinProb ? 'home' : 'away';

  return {
    driveIndex: point.driveIndex,
    quarter: point.quarter,
    description: `Drive ${point.driveIndex} in Q${point.quarter} swung ${direction} by ${maxSwing.toFixed(1)}%`,
    winProbSwing: maxSwing,
  };
}

/**
 * Master analysis function — assembles all game flow metrics.
 */
export function analyzeGameFlow(
  broadcast: BroadcastOutput,
  homeTeamId: string,
  awayTeamId: string,
): GameFlowAnalysis {
  const { quarters } = broadcast;

  const quarterMomentum: QuarterMomentum[] = [];
  for (let q = 0; q < quarters.length; q += 1) {
    quarterMomentum.push(getQuarterMomentum(quarters, q, homeTeamId));
  }

  const driveEfficiency = {
    home: getDriveEfficiency(quarters, homeTeamId),
    away: getDriveEfficiency(quarters, awayTeamId),
  };

  const scoringRuns = getScoringRuns(quarters, homeTeamId);
  const winProbability = getWinProbabilityCurve(quarters, homeTeamId);
  const turningPoint = identifyTurningPoint(quarters, homeTeamId);

  return {
    quarterMomentum,
    driveEfficiency,
    scoringRuns,
    winProbability,
    turningPoint,
  };
}
