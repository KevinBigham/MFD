import type { GameState, ReportSection, SeasonReport, Team } from '../types';

type Grade = SeasonReport['overallGrade'];

function findTeam(game: GameState, teamId: string): Team {
  const team = game.teams[teamId];
  if (!team) throw new Error(`Unknown team: ${teamId}`);
  return team;
}

function latestHistory(game: GameState, teamId: string, year: number) {
  return game.franchiseHistory.find((entry) => entry.teamId === teamId && entry.year === year)
    ?? game.franchiseHistory.find((entry) => entry.teamId === teamId)
    ?? null;
}

function seasonYear(game: GameState, teamId: string): number {
  const historyYears = game.franchiseHistory
    .filter((entry) => entry.teamId === teamId)
    .map((entry) => entry.year);
  return historyYears.length > 0 ? Math.max(...historyYears) : game.year;
}

function activeArcSentence(game: GameState, team: Team, reportYear: number): string | null {
  const activeArc = (game.storyArcs ?? [])
    .filter((arc) => arc.teamId === team.id)
    .find((arc) => arc.stageHistory.some((beat) => beat.year === reportYear));
  if (!activeArc) return null;

  if (activeArc.type === 'rebuild' && activeArc.currentStage === 'breakthrough') {
    return 'You exited your rebuild one year ahead of schedule.';
  }
  if (activeArc.type === 'contender_window' && activeArc.currentStage === 'window_extended') {
    return 'Your contention window widened instead of closing.';
  }
  if (activeArc.type === 'contender_window' && activeArc.currentStage === 'window_narrowed') {
    return 'Your contention window narrowed under cap pressure.';
  }
  if (activeArc.type === 'dynasty_run' && activeArc.currentStage === 'dynasty_breakthrough') {
    return 'The season hardened into the kind of run people call a dynasty.';
  }

  return activeArc.stageHistory.find((beat) => beat.year === reportYear)?.narrativeText ?? null;
}

// Canonical playoffFinish values written by stat-central.ts:325 + postseason
// finalizers: 'champion' | 'conference' | 'divisional' | 'wild_card'
// | 'playoff_team' | 'missed_playoffs' | 'regular_season'. The literal
// 'missed' is never written. Any team that didn't reach the postseason
// shows up as 'missed_playoffs' (resolved) or 'regular_season' (in-progress).
// Keep this aligned with the sibling predicates in franchise-dashboard.ts:20,
// story-arcs.ts:179, and ai-philosophy.ts:18.
function madeThePlayoffs(playoffFinish: string): boolean {
  return playoffFinish !== 'missed_playoffs' && playoffFinish !== 'regular_season';
}

function overallGrade(playoffFinish: string, wins: number, losses: number): Grade {
  if (playoffFinish === 'champion') return 'A+';
  if (playoffFinish === 'conference') return 'A';
  if (playoffFinish === 'divisional' || playoffFinish === 'wild_card') return 'B+';
  if (madeThePlayoffs(playoffFinish)) return 'B';
  if (wins > losses) return 'C+';
  if (wins === losses) return 'C';
  if (wins <= 4) return 'F';
  return 'D';
}

function bucketGrade(value: number, thresholds: Array<[number, string]>, fallback = 'D'): string {
  for (const [threshold, grade] of thresholds) {
    if (value >= threshold) return grade;
  }
  return fallback;
}

function reportSection(
  title: string,
  grade: string,
  summary: string,
  highlights: string[],
  stats: Record<string, string | number>,
): ReportSection {
  return { title, grade, summary, highlights, stats };
}

function developmentHighlights(team: Team): string[] {
  return [...team.roster]
    .sort((a, b) => (b.pot - b.ovr) - (a.pot - a.ovr) || a.name.localeCompare(b.name))
    .slice(0, 3)
    .map((player) => `${player.name} still has ${player.pot - player.ovr} OVR of upside.`);
}

function draftSection(game: GameState, team: Team, year: number): ReportSection {
  const picks = team.roster.filter((player) => player.draftYear === year);
  const starters = picks.filter((player) => player.isStarter);
  const grade = starters.length >= 3 ? 'A' : starters.length === 2 ? 'B+' : starters.length === 1 ? 'B' : picks.length > 0 ? 'C' : 'D';
  const bestValue = [...picks].sort((a, b) => (a.draftRound - b.draftRound) - (b.ovr - a.ovr))[0];
  return reportSection(
    'Draft Class',
    grade,
    starters.length >= 2 ? 'This class delivered immediate contributors.' : 'The draft board still needs more time to fully mature.',
    [
      `${starters.length} starters emerged from the class.`,
      bestValue ? `Best value: ${bestValue.name} in round ${bestValue.draftRound}.` : 'No picks made yet.',
    ],
    {
      picksMade: picks.length,
      starters: starters.length,
      bestValuePick: bestValue ? `${bestValue.name} (R${bestValue.draftRound})` : 'N/A',
    },
  );
}

function freeAgencySection(team: Team): ReportSection {
  const signings = (team.txLog ?? []).filter((entry) => entry.type === 'SIGN_FA');
  const grade = signings.length >= 3 ? 'A' : signings.length === 2 ? 'B+' : signings.length === 1 ? 'B' : 'C';
  return reportSection(
    'Free Agency',
    grade,
    signings.length > 0 ? 'Veteran additions helped plug roster gaps.' : 'The club stayed quiet in free agency.',
    signings.slice(-3).map((entry) => `Added player ${entry.playerId ?? 'unknown'} via free agency.`),
    {
      signings: signings.length,
      capUsed: Number(team.capUsed.toFixed(1)),
      capSpace: Number(team.capSpace.toFixed(1)),
    },
  );
}

function coachingSection(team: Team): ReportSection {
  const hc = team.staff.hc;
  const coachingScore = (hc?.level ?? 1) * 10 + (team.staff.oc?.level ?? 1) * 5 + (team.staff.dc?.level ?? 1) * 5;
  const grade = bucketGrade(coachingScore, [[70, 'A'], [55, 'B+'], [45, 'B'], [35, 'C+'], [25, 'C']]);
  return reportSection(
    'Coaching',
    grade,
    hc ? `${hc.name} kept the team organized through the year.` : 'The sideline lacked a clear identity.',
    [
      hc ? `${hc.name} reached level ${hc.level}.` : 'Head coach vacancy or low-level staff.',
      `Clinic tracks active: ${Object.keys(team.clinic?.xp ?? {}).length}.`,
    ],
    {
      headCoach: hc?.name ?? 'N/A',
      hcLevel: hc?.level ?? 0,
      clinicTracks: Object.keys(team.clinic?.xp ?? {}).length,
    },
  );
}

function financialGrade(team: Team): string {
  if (team.capSpace >= 20 && team.deadCap <= 5) return 'A';
  if (team.capSpace >= 10 && team.deadCap <= 10) return 'B+';
  if (team.capSpace >= 0) return 'B';
  if (team.capSpace >= -10) return 'C';
  return 'D';
}

function mandateSection(game: GameState, team: Team, year: number): ReportSection | null {
  const mandates = (game.ownerMandates ?? [])
    .filter((mandate) => mandate.teamId === team.id && mandate.year === year)
    .sort((left, right) => left.selectedIndex - right.selectedIndex);
  if (mandates.length === 0) return null;

  const floor = mandates.find((mandate) => mandate.slot === 'floor');
  const target = mandates.find((mandate) => mandate.slot === 'target');
  const ceiling = mandates.find((mandate) => mandate.slot === 'ceiling');
  const metCount = mandates.filter((mandate) => mandate.status === 'met' || mandate.status === 'exceeded').length;
  const grade = floor?.status === 'missed'
    ? 'F'
    : ceiling?.status === 'exceeded'
      ? 'A+'
      : target?.status === 'met' || target?.status === 'exceeded'
        ? 'A'
        : metCount >= 2
          ? 'B+'
          : 'C';
  const highlights = mandates.flatMap((mandate) => [
    mandate.evaluation?.summary ?? `${mandate.label}: ${mandate.progress.label}.`,
    ...(mandate.evaluation?.agmAdjustment ? [mandate.evaluation.agmAdjustment] : []),
  ]).slice(0, 6);

  return reportSection(
    'Owner Mandates',
    grade,
    floor?.status === 'missed'
      ? 'The promised floor was missed, and ownership treated it as a real failure.'
      : ceiling?.status === 'exceeded'
        ? 'The season cleared the ceiling mandate and turned the setup promise into a headline.'
        : target?.status === 'met' || target?.status === 'exceeded'
          ? 'The target mandate landed and strengthened front-office trust.'
          : 'The floor survived, but the larger promises still need a stronger follow-through.',
    highlights,
    {
      floor: floor ? `${floor.label}: ${floor.status}` : 'N/A',
      target: target ? `${target.label}: ${target.status}` : 'N/A',
      ceiling: ceiling ? `${ceiling.label}: ${ceiling.status}` : 'N/A',
      ownerApprovalDelta: mandates.reduce((sum, mandate) => sum + (mandate.evaluation?.approvalDelta ?? 0), 0),
      ownerReputationDelta: mandates.reduce((sum, mandate) => sum + (mandate.evaluation?.ownerReputationDelta ?? 0), 0),
    },
  );
}

export function generateSeasonReport(game: GameState, teamId: string): SeasonReport {
  const team = findTeam(game, teamId);
  const reportYear = seasonYear(game, teamId);
  const history = latestHistory(game, teamId, reportYear);
  const arcSentence = activeArcSentence(game, team, reportYear);
  const overall = overallGrade(history?.playoffFinish ?? 'missed_playoffs', team.wins, team.losses);
  const gamesPlayed = Math.max(1, team.seasonStats.gamesPlayed || team.wins + team.losses + team.ties);
  const pointsPerGame = team.seasonStats.pointsFor / gamesPlayed;
  const pointsAllowed = team.seasonStats.pointsAgainst / gamesPlayed;
  const offenseGrade = bucketGrade(pointsPerGame, [[30, 'A'], [27, 'B+'], [24, 'B'], [21, 'C+'], [18, 'C']], 'D');
  const defenseGrade = bucketGrade(35 - pointsAllowed, [[15, 'A'], [11, 'B+'], [8, 'B'], [5, 'C+'], [2, 'C']], 'D');
  const teamHandshakes = (game.handshakes ?? []).filter((entry) => entry.teamId === teamId);
  const promiseRate = teamHandshakes.length === 0
    ? 100
    : Math.round((teamHandshakes.filter((entry) => entry.status === 'fulfilled').length / Math.max(1, teamHandshakes.length)) * 100);
  const ownerMandateSection = mandateSection(game, team, reportYear);

  const sections: ReportSection[] = [
    reportSection(
      'Season Overview',
      overall,
      history
        ? `${history.record} with a ${history.playoffFinish.replaceAll('_', ' ')} finish defined the year.${arcSentence ? ` ${arcSentence}` : ''}`
        : `${team.wins}-${team.losses}${team.ties ? `-${team.ties}` : ''} set the tone for the season.${arcSentence ? ` ${arcSentence}` : ''}`,
      [
        history ? `Point differential: ${history.pointDifferential >= 0 ? '+' : ''}${history.pointDifferential}.` : 'History entry pending.',
        history ? `Playoff finish: ${history.playoffFinish.replaceAll('_', ' ')}.` : 'Playoff finish unavailable.',
      ],
      {
        record: history?.record ?? `${team.wins}-${team.losses}${team.ties ? `-${team.ties}` : ''}`,
        playoffFinish: history?.playoffFinish ?? 'missed_playoffs',
        pointDifferential: history?.pointDifferential ?? team.seasonStats.pointDifferential,
      },
    ),
    reportSection(
      'Offense',
      offenseGrade,
      pointsPerGame >= 27 ? 'The offense consistently dictated terms.' : 'The offense flashed, but lacked consistent finishing power.',
      [
        `${pointsPerGame.toFixed(1)} points per game.`,
        `${team.seasonStats.passingYards} passing yards vs ${team.seasonStats.rushingYards} rushing yards.`,
      ],
      {
        pointsPerGame: Number(pointsPerGame.toFixed(1)),
        totalYards: team.seasonStats.totalYards,
        passingYards: team.seasonStats.passingYards,
        rushingYards: team.seasonStats.rushingYards,
      },
    ),
    reportSection(
      'Defense',
      defenseGrade,
      pointsAllowed <= 20 ? 'The defense closed drives and protected leads.' : 'The defense competed, but gave away too many efficient possessions.',
      [
        `${pointsAllowed.toFixed(1)} points allowed per game.`,
        `${team.seasonStats.sacksFor} sacks and ${team.seasonStats.turnoversForced} takeaways.`,
      ],
      {
        pointsAllowedPerGame: Number(pointsAllowed.toFixed(1)),
        sacks: team.seasonStats.sacksFor,
        takeaways: team.seasonStats.turnoversForced,
      },
    ),
    draftSection(game, team, reportYear),
    freeAgencySection(team),
    reportSection(
      'Player Development',
      developmentHighlights(team).length >= 3 ? 'B+' : 'B',
      'Development remained one of the cleanest levers on the roster.',
      developmentHighlights(team),
      {
        mentoringPairs: team.mentoringPairs.length,
        trainingAssignments: Object.keys(team.trainingAssignments ?? {}).length,
      },
    ),
    coachingSection(team),
    reportSection(
      'Financial Health',
      financialGrade(team),
      team.capSpace >= 10 ? 'The cap sheet leaves room for aggressive follow-up moves.' : 'Cap pressure will force selective moves.',
      [
        `$${team.capSpace.toFixed(1)}M cap space remaining.`,
        `$${team.deadCap.toFixed(1)}M in dead cap.`,
      ],
      {
        capSpace: Number(team.capSpace.toFixed(1)),
        capUsed: Number(team.capUsed.toFixed(1)),
        deadCap: Number(team.deadCap.toFixed(1)),
      },
    ),
    ...(ownerMandateSection ? [ownerMandateSection] : []),
    reportSection(
      'Fan Engagement',
      bucketGrade(team.owner.approval, [[75, 'A'], [65, 'B+'], [55, 'B'], [45, 'C+'], [35, 'C']], 'D'),
      team.owner.approval >= 65 ? 'The fan base stayed energized and ownership stayed supportive.' : 'Approval never fully stabilized.',
      [
        `Owner approval finished at ${team.owner.approval}.`,
        `${promiseRate}% of tracked promises were fulfilled.`,
      ],
      {
        ownerApproval: team.owner.approval,
        promiseFulfillmentRate: `${promiseRate}%`,
        mediaSentiment: (game.recentPressConferences ?? []).filter((entry) => entry.teamId === team.id).length,
      },
    ),
    reportSection(
      'Outlook',
      overall,
      overall.startsWith('A') || overall.startsWith('B')
        ? `The window is open. The next offseason should sharpen, not reset, the roster.${arcSentence && !arcSentence.includes('rebuild') ? ` ${arcSentence}` : ''}`
        : `The offseason needs decisive upgrades at the most stressed positions.${arcSentence && !arcSentence.includes('rebuild') ? ` ${arcSentence}` : ''}`,
      [
        `Biggest need: ${[...team.roster].sort((a, b) => a.ovr - b.ovr)[0]?.pos ?? 'depth'}.`,
        `Dynasty score trajectory: ${(game.dynastyTimeline ?? []).filter((entry) => entry.teamIds.includes(team.id)).length} legacy events logged.`,
      ],
      {
        weakestPosition: [...team.roster].sort((a, b) => a.ovr - b.ovr)[0]?.pos ?? 'N/A',
        dynastyEvents: (game.dynastyTimeline ?? []).filter((entry) => entry.teamIds.includes(team.id)).length,
      },
    ),
  ];

  return {
    year: reportYear,
    teamId,
    overallGrade: overall,
    sections,
  };
}
