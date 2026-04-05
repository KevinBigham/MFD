import type { BroadcastOutput, DriveNarrative, PlayDescription } from '../types';

// ── Exported Types ─────────────────────────────────────────

export interface PlayTendencyReport {
  totalPlays: number;
  runPlays: number;
  passPlays: number;
  runRate: number;
  passRate: number;
  avgYardsPerRun: number;
  avgYardsPerPass: number;
  bigPlayRate: number;
  explosivePlayCount: number;
  quarterBreakdown: { quarter: number; runPct: number; passPct: number; plays: number }[];
}

export interface SituationalReport {
  redZone: { attempts: number; scores: number; efficiency: number };
  thirdDown: { attempts: number; conversions: number; rate: number };
  clutchPlays: { total: number; successful: number; rate: number };
  bigPlayEfficiency: { attempts: number; bigPlays: number; rate: number };
}

export interface CoachingAdjustment {
  type: 'run_increase' | 'run_decrease' | 'pass_increase' | 'pass_decrease' | 'aggression_shift' | 'conservative_shift';
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  firstHalfValue: number;
  secondHalfValue: number;
}

export interface EnhancedFilmReport {
  tendencies: PlayTendencyReport;
  situational: SituationalReport;
  adjustments: CoachingAdjustment[];
  headline: string;
  keyInsight: string;
  overallGrade: string;
}

export interface SeasonTendencyProfile {
  gamesAnalyzed: number;
  avgRunRate: number;
  avgPassRate: number;
  avgBigPlayRate: number;
  avgExplosivePlays: number;
  redZoneEfficiency: number;
  consistency: number;
}

// ── Helpers ────────────────────────────────────────────────

const RUN_RATE_CHANGE_THRESHOLD = 0.10;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function safeRatio(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

function getTeamDrives(broadcast: BroadcastOutput, teamId: string): DriveNarrative[] {
  const drives: DriveNarrative[] = [];
  for (const quarter of broadcast.quarters) {
    for (const drive of quarter) {
      if (drive.teamId === teamId) {
        drives.push(drive);
      }
    }
  }
  return drives;
}

function getAllTeamPlays(broadcast: BroadcastOutput, teamId: string): PlayDescription[] {
  const plays: PlayDescription[] = [];
  for (const drive of getTeamDrives(broadcast, teamId)) {
    plays.push(...drive.plays);
  }
  return plays;
}

function getHalfDrives(
  broadcast: BroadcastOutput,
  teamId: string,
  half: 'first' | 'second',
): DriveNarrative[] {
  const startQ = half === 'first' ? 0 : 2;
  const endQ = half === 'first' ? 2 : 4;
  const drives: DriveNarrative[] = [];
  for (let q = startQ; q < endQ && q < broadcast.quarters.length; q++) {
    for (const drive of broadcast.quarters[q] ?? []) {
      if (drive.teamId === teamId) {
        drives.push(drive);
      }
    }
  }
  return drives;
}

function playsFromDrives(drives: DriveNarrative[]): PlayDescription[] {
  const plays: PlayDescription[] = [];
  for (const drive of drives) {
    plays.push(...drive.plays);
  }
  return plays;
}

function computeRunRate(plays: PlayDescription[]): number {
  const runPasses = plays.filter((p) => p.type === 'run' || p.type === 'pass');
  const runs = runPasses.filter((p) => p.type === 'run');
  return safeRatio(runs.length, runPasses.length);
}

function computeBigPlayRate(plays: PlayDescription[]): number {
  const bigPlays = plays.filter((p) => p.excitement >= 7);
  return safeRatio(bigPlays.length, plays.length);
}

function halfScoredTDs(drives: DriveNarrative[]): number {
  return drives.filter((d) => d.endResult === 'touchdown' || d.endResult === 'fieldGoal').length;
}

function standardDeviation(values: number[]): number {
  if (values.length <= 1) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => (v - mean) ** 2);
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
}

// ── Analysis Functions ─────────────────────────────────────

export function analyzePlayTendencies(
  broadcast: BroadcastOutput,
  teamId: string,
): PlayTendencyReport {
  const allPlays = getAllTeamPlays(broadcast, teamId);
  const runPlays = allPlays.filter((p) => p.type === 'run');
  const passPlays = allPlays.filter((p) => p.type === 'pass');
  const totalPlays = allPlays.length;

  const avgYardsPerRun = safeRatio(
    runPlays.reduce((sum, p) => sum + p.yardsGained, 0),
    runPlays.length,
  );
  const avgYardsPerPass = safeRatio(
    passPlays.reduce((sum, p) => sum + p.yardsGained, 0),
    passPlays.length,
  );

  const bigPlayCount = allPlays.filter((p) => p.excitement >= 7).length;
  const explosivePlayCount = allPlays.filter((p) => p.yardsGained >= 20).length;

  const quarterBreakdown: PlayTendencyReport['quarterBreakdown'] = [];
  for (let q = 0; q < broadcast.quarters.length; q++) {
    const qDrives = (broadcast.quarters[q] ?? []).filter((d) => d.teamId === teamId);
    const qPlays: PlayDescription[] = [];
    for (const d of qDrives) {
      qPlays.push(...d.plays);
    }
    const qRuns = qPlays.filter((p) => p.type === 'run').length;
    const qPasses = qPlays.filter((p) => p.type === 'pass').length;
    const qTotal = qRuns + qPasses;
    quarterBreakdown.push({
      quarter: q + 1,
      runPct: safeRatio(qRuns, qTotal),
      passPct: safeRatio(qPasses, qTotal),
      plays: qPlays.length,
    });
  }

  return {
    totalPlays,
    runPlays: runPlays.length,
    passPlays: passPlays.length,
    runRate: safeRatio(runPlays.length, runPlays.length + passPlays.length),
    passRate: safeRatio(passPlays.length, runPlays.length + passPlays.length),
    avgYardsPerRun,
    avgYardsPerPass,
    bigPlayRate: safeRatio(bigPlayCount, totalPlays),
    explosivePlayCount,
    quarterBreakdown,
  };
}

export function analyzeSituationalSuccess(
  broadcast: BroadcastOutput,
  teamId: string,
): SituationalReport {
  const drives = getTeamDrives(broadcast, teamId);
  const allPlays = getAllTeamPlays(broadcast, teamId);

  // Red zone: drives with yardsTotal >= 50 that end in TD/FG count as red zone scores
  const redZoneDrives = drives.filter((d) => d.yardsTotal >= 50 || d.startYardLine <= 20);
  const redZoneScores = redZoneDrives.filter(
    (d) => d.endResult === 'touchdown' || d.endResult === 'fieldGoal',
  ).length;

  // Third down approximation: every 3rd play in a drive (not the last) is a potential 3rd down
  let thirdDownAttempts = 0;
  let thirdDownConversions = 0;
  for (const drive of drives) {
    for (let i = 2; i < drive.plays.length; i += 3) {
      if (i < drive.plays.length - 1) {
        thirdDownAttempts++;
        if ((drive.plays[i]?.yardsGained ?? 0) > 0) {
          thirdDownConversions++;
        }
      }
    }
  }

  // Clutch plays
  const clutchPlays = allPlays.filter((p) => p.isClutch);
  const successfulClutch = clutchPlays.filter((p) => p.yardsGained > 0);

  // Big plays
  const bigPlays = allPlays.filter((p) => p.isBigPlay);

  return {
    redZone: {
      attempts: redZoneDrives.length,
      scores: redZoneScores,
      efficiency: safeRatio(redZoneScores, redZoneDrives.length),
    },
    thirdDown: {
      attempts: thirdDownAttempts,
      conversions: thirdDownConversions,
      rate: safeRatio(thirdDownConversions, thirdDownAttempts),
    },
    clutchPlays: {
      total: clutchPlays.length,
      successful: successfulClutch.length,
      rate: safeRatio(successfulClutch.length, clutchPlays.length),
    },
    bigPlayEfficiency: {
      attempts: allPlays.length,
      bigPlays: bigPlays.length,
      rate: safeRatio(bigPlays.length, allPlays.length),
    },
  };
}

export function analyzeCoachingAdjustments(
  broadcast: BroadcastOutput,
  teamId: string,
): CoachingAdjustment[] {
  const firstHalfDrives = getHalfDrives(broadcast, teamId, 'first');
  const secondHalfDrives = getHalfDrives(broadcast, teamId, 'second');
  const firstHalfPlays = playsFromDrives(firstHalfDrives);
  const secondHalfPlays = playsFromDrives(secondHalfDrives);

  const firstRunRate = computeRunRate(firstHalfPlays);
  const secondRunRate = computeRunRate(secondHalfPlays);
  const firstPassRate = 1 - firstRunRate;
  const secondPassRate = 1 - secondRunRate;
  const firstBigPlayRate = computeBigPlayRate(firstHalfPlays);
  const secondBigPlayRate = computeBigPlayRate(secondHalfPlays);

  const firstHalfScores = halfScoredTDs(firstHalfDrives);
  const secondHalfScores = halfScoredTDs(secondHalfDrives);

  function determineImpact(): CoachingAdjustment['impact'] {
    if (secondHalfScores > firstHalfScores) return 'positive';
    if (secondHalfScores < firstHalfScores) return 'negative';
    return 'neutral';
  }

  const adjustments: CoachingAdjustment[] = [];
  const runDelta = secondRunRate - firstRunRate;

  if (runDelta > RUN_RATE_CHANGE_THRESHOLD) {
    adjustments.push({
      type: 'run_increase',
      description: `Run rate increased from ${(firstRunRate * 100).toFixed(0)}% to ${(secondRunRate * 100).toFixed(0)}% in the second half.`,
      impact: determineImpact(),
      firstHalfValue: firstRunRate,
      secondHalfValue: secondRunRate,
    });
  } else if (runDelta < -RUN_RATE_CHANGE_THRESHOLD) {
    adjustments.push({
      type: 'run_decrease',
      description: `Run rate decreased from ${(firstRunRate * 100).toFixed(0)}% to ${(secondRunRate * 100).toFixed(0)}% in the second half.`,
      impact: determineImpact(),
      firstHalfValue: firstRunRate,
      secondHalfValue: secondRunRate,
    });
  }

  const passDelta = secondPassRate - firstPassRate;
  if (passDelta > RUN_RATE_CHANGE_THRESHOLD) {
    adjustments.push({
      type: 'pass_increase',
      description: `Pass rate increased from ${(firstPassRate * 100).toFixed(0)}% to ${(secondPassRate * 100).toFixed(0)}% in the second half.`,
      impact: determineImpact(),
      firstHalfValue: firstPassRate,
      secondHalfValue: secondPassRate,
    });
  } else if (passDelta < -RUN_RATE_CHANGE_THRESHOLD) {
    adjustments.push({
      type: 'pass_decrease',
      description: `Pass rate decreased from ${(firstPassRate * 100).toFixed(0)}% to ${(secondPassRate * 100).toFixed(0)}% in the second half.`,
      impact: determineImpact(),
      firstHalfValue: firstPassRate,
      secondHalfValue: secondPassRate,
    });
  }

  const bigPlayDelta = secondBigPlayRate - firstBigPlayRate;
  if (bigPlayDelta > 0.05) {
    adjustments.push({
      type: 'aggression_shift',
      description: `Big play rate increased from ${(firstBigPlayRate * 100).toFixed(0)}% to ${(secondBigPlayRate * 100).toFixed(0)}%, signaling increased aggression.`,
      impact: determineImpact(),
      firstHalfValue: firstBigPlayRate,
      secondHalfValue: secondBigPlayRate,
    });
  } else if (bigPlayDelta < -0.05) {
    adjustments.push({
      type: 'conservative_shift',
      description: `Big play rate dropped from ${(firstBigPlayRate * 100).toFixed(0)}% to ${(secondBigPlayRate * 100).toFixed(0)}%, signaling a conservative shift.`,
      impact: determineImpact(),
      firstHalfValue: firstBigPlayRate,
      secondHalfValue: secondBigPlayRate,
    });
  }

  return adjustments;
}

export function generateEnhancedFilmReport(
  broadcast: BroadcastOutput,
  teamId: string,
): EnhancedFilmReport {
  const tendencies = analyzePlayTendencies(broadcast, teamId);
  const situational = analyzeSituationalSuccess(broadcast, teamId);
  const adjustments = analyzeCoachingAdjustments(broadcast, teamId);

  // Headline based on dominant tendency
  let headline: string;
  if (tendencies.runRate > 0.55) {
    headline = 'Ground and Pound Attack';
  } else if (tendencies.passRate > 0.6) {
    headline = 'Air Raid Offense';
  } else {
    headline = 'Balanced Attack';
  }

  // Key insight from most notable finding
  let keyInsight: string;
  if (tendencies.explosivePlayCount >= 4) {
    keyInsight = `Generated ${tendencies.explosivePlayCount} explosive plays (20+ yards), creating consistent chunk yardage.`;
  } else if (situational.redZone.efficiency >= 0.75) {
    keyInsight = `Red zone efficiency of ${(situational.redZone.efficiency * 100).toFixed(0)}% converted scoring chances at an elite rate.`;
  } else if (adjustments.length > 0) {
    keyInsight = adjustments[0]!.description;
  } else {
    keyInsight = `Ran ${tendencies.totalPlays} plays with a ${(tendencies.runRate * 100).toFixed(0)}/${(tendencies.passRate * 100).toFixed(0)} run/pass split.`;
  }

  // Overall grade
  let overallGrade: string;
  if (tendencies.bigPlayRate > 0.15 && situational.redZone.efficiency > 0.6) {
    overallGrade = 'A';
  } else if (tendencies.bigPlayRate > 0.10 && situational.redZone.efficiency > 0.4) {
    overallGrade = 'B';
  } else if (tendencies.bigPlayRate > 0.05 || situational.redZone.efficiency > 0.3) {
    overallGrade = 'C';
  } else if (tendencies.totalPlays > 0) {
    overallGrade = 'D';
  } else {
    overallGrade = 'F';
  }

  return {
    tendencies,
    situational,
    adjustments,
    headline,
    keyInsight,
    overallGrade,
  };
}

export function getSeasonTendencies(reports: PlayTendencyReport[]): SeasonTendencyProfile {
  const count = reports.length;
  if (count === 0) {
    return {
      gamesAnalyzed: 0,
      avgRunRate: 0,
      avgPassRate: 0,
      avgBigPlayRate: 0,
      avgExplosivePlays: 0,
      redZoneEfficiency: 0,
      consistency: 0,
    };
  }

  const avgRunRate = reports.reduce((s, r) => s + r.runRate, 0) / count;
  const avgPassRate = reports.reduce((s, r) => s + r.passRate, 0) / count;
  const avgBigPlayRate = reports.reduce((s, r) => s + r.bigPlayRate, 0) / count;
  const avgExplosivePlays = reports.reduce((s, r) => s + r.explosivePlayCount, 0) / count;

  const runRates = reports.map((r) => r.runRate);
  const consistency = clamp(Math.round(100 - standardDeviation(runRates) * 200), 0, 100);

  return {
    gamesAnalyzed: count,
    avgRunRate,
    avgPassRate,
    avgBigPlayRate,
    avgExplosivePlays,
    redZoneEfficiency: 0, // requires SituationalReport data, not available from PlayTendencyReport alone
    consistency,
  };
}
