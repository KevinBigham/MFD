import type { FilmRoomReport, GamePlanExecutionGrade, GameResult, GameState, OpponentIntel, WeeklyPrepOutcome } from '../types';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function gradeLetter(score: number): GamePlanExecutionGrade['grade'] {
  if (score >= 85) return 'A';
  if (score >= 72) return 'B';
  if (score >= 60) return 'C';
  if (score >= 48) return 'D';
  return 'F';
}

function ratio(made: number, attempted: number): number {
  return attempted > 0 ? made / attempted : 0;
}

function scoreForTeam(result: GameResult, teamId: string): number {
  return result.homeTeamId === teamId ? result.homeScore : result.awayScore;
}

export function gradeGamePlanExecution(
  prep: WeeklyPrepOutcome,
  result: GameResult,
  intel: OpponentIntel,
): GamePlanExecutionGrade {
  const teamStats = result.stats[prep.teamId];
  const opponentStats = result.stats[prep.opponentTeamId];
  if (!teamStats || !opponentStats) {
    return {
      grade: 'F',
      score: 0,
      alignedCalls: [],
      missedCalls: ['Missing game stats prevented a useful film review.'],
    };
  }

  let score = 55 + prep.effects.teamOvrBonus * 4;
  const alignedCalls: string[] = [];
  const missedCalls: string[] = [];

  if (prep.plan.offensiveFocus === 'attack_secondary') {
    if (teamStats.passingYards >= 260) {
      score += 14;
      alignedCalls.push('Passing focus punished the opponent secondary.');
    } else {
      score -= 12;
      missedCalls.push('The secondary attack never generated enough explosive passing.');
    }
  } else if (prep.plan.offensiveFocus === 'attack_front') {
    if (teamStats.rushingYards >= 120) {
      score += 14;
      alignedCalls.push('Run-first prep moved the front and kept the offense on schedule.');
    } else {
      score -= 12;
      missedCalls.push('Front attack emphasis did not translate into rushing control.');
    }
  } else if (prep.plan.offensiveFocus === 'feed_star') {
    if (result.mvpPlayerId && result.mvpPlayerId === prep.plan.keyMatchupPlayerId) {
      score += 12;
      alignedCalls.push('The featured matchup player carried the plan.');
    } else {
      score -= 8;
      missedCalls.push('The featured player never fully took over the game.');
    }
  } else if (prep.plan.offensiveFocus === 'protect_qb') {
    if ((teamStats.pressuresAllowed ?? 99) <= 2 && (teamStats.passingYards ?? 0) >= 220 && scoreForTeam(result, prep.teamId) >= 20) {
      score += 12;
      alignedCalls.push('Protection emphasis kept the quarterback clean.');
    } else {
      score -= 10;
      missedCalls.push('Protection focus failed to settle the pocket.');
    }
  }

  if (prep.plan.defensiveFocus === 'heat_qb') {
    if ((teamStats.sacks ?? 0) >= 3) {
      score += 12;
      alignedCalls.push('Pressure packages hit the quarterback often enough.');
    } else {
      score -= 10;
      missedCalls.push('Heat-up plan did not create enough pressure.');
    }
  } else if (prep.plan.defensiveFocus === 'limit_explosive') {
    if ((opponentStats.passingYards ?? 999) <= 225) {
      score += 12;
      alignedCalls.push('Explosive pass defense stayed under control.');
    } else {
      score -= 10;
      missedCalls.push('Explosive pass defense leaked too many chunk plays.');
    }
  } else if (prep.plan.defensiveFocus === 'stop_run') {
    if ((opponentStats.rushingYards ?? 999) <= 95) {
      score += 12;
      alignedCalls.push('Run-stopping emphasis held the ground game down.');
    } else {
      score -= 10;
      missedCalls.push('Run focus still allowed steady gains on the ground.');
    }
  } else if (prep.plan.defensiveFocus === 'erase_wr1') {
    if ((opponentStats.passingYards ?? 999) <= 215) {
      score += 10;
      alignedCalls.push('Primary receiving threat was effectively capped.');
    } else {
      score -= 9;
      missedCalls.push('The top receiving lane remained too available.');
    }
  }

  if (prep.plan.specialSituation === 'third_down') {
    if (ratio(teamStats.thirdDownConversions ?? 0, teamStats.thirdDownAttempts ?? 0) >= 0.45) {
      score += 6;
      alignedCalls.push('Third-down scripting converted in leverage spots.');
    } else {
      missedCalls.push('Third-down emphasis did not finish enough drives.');
    }
  } else if (prep.plan.specialSituation === 'red_zone') {
    if (ratio(teamStats.redZoneScores ?? 0, teamStats.redZoneTrips ?? 0) >= 0.75) {
      score += 6;
      alignedCalls.push('Red-zone emphasis paid off near the goal line.');
    } else {
      missedCalls.push('Red-zone execution lagged behind the prep priority.');
    }
  }

  if (result.homeTeamId === prep.teamId ? result.homeScore > result.awayScore : result.awayScore > result.homeScore) {
    score += 10;
  } else {
    score -= 18;
  }

  if ((opponentStats.turnovers ?? 0) > (teamStats.turnovers ?? 0)) {
    score += 4;
  }
  if (scoreForTeam(result, prep.teamId) <= 17) {
    score -= 10;
    missedCalls.push('The offense failed to reach a winning scoring floor.');
  }
  if ((teamStats.passingYards ?? 0) < 180) {
    score -= 8;
    missedCalls.push('Passing efficiency stayed well below the weekly target.');
  }

  const finalScore = clamp(Math.round(score), 0, 99);
  return {
    grade: gradeLetter(finalScore),
    score: finalScore,
    alignedCalls,
    missedCalls,
  };
}

export function buildFilmRoomReport(
  game: GameState,
  teamId: string,
  result: GameResult,
  prep: WeeklyPrepOutcome,
  intel: OpponentIntel,
): FilmRoomReport {
  const team = game.teams[teamId];
  if (!team) {
    throw new Error(`Cannot build film room report for missing team ${teamId}.`);
  }

  const grade = gradeGamePlanExecution(prep, result, intel);
  const teamStats = result.stats[teamId];
  const opponentStats = result.stats[prep.opponentTeamId];
  const executionNotes = [
    `${team.city} finished with ${scoreForTeam(result, teamId)} points and ${teamStats?.totalYards ?? 0} total yards.`,
    `${intel.baseReport.teamName} answered with ${scoreForTeam(result, prep.opponentTeamId)} points and ${opponentStats?.totalYards ?? 0} yards.`,
    prep.reasoning[0] ?? 'Weekly prep created a measurable plan edge.',
  ];
  const recommendations = grade.missedCalls.length > 0
    ? grade.missedCalls.map((line) => `Adjust: ${line}`)
    : [
      `Repeat the ${prep.plan.offensiveFocus.replaceAll('_', ' ')} emphasis when the matchup calls for it.`,
      `Keep the ${prep.plan.defensiveFocus.replaceAll('_', ' ')} package in the ready queue.`,
    ];
  const carryForward = [
    (grade.grade === 'A' || grade.grade === 'B')
      ? 'Keep the successful plan family available next week.'
      : 'Revisit the install menu before the next opponent report.',
    ...recommendations.slice(0, 2),
  ];

  return {
    id: `film-room-${teamId}-${prep.year}-${prep.week}`,
    teamId,
    opponentTeamId: prep.opponentTeamId,
    year: prep.year,
    week: prep.week,
    grade: grade.grade,
    score: grade.score,
    headline: grade.grade === 'A' || grade.grade === 'B'
      ? `${team.city} matched the prep board to the game flow.`
      : `${team.city} left useful corrections on the tape.`,
    planSummary: `${prep.plan.offensiveFocus.replaceAll('_', ' ')} plus ${prep.plan.defensiveFocus.replaceAll('_', ' ')} produced a ${grade.grade} review.`,
    alignedCalls: grade.alignedCalls,
    missedCalls: grade.missedCalls,
    executionNotes,
    recommendations,
    carryForward,
  };
}
