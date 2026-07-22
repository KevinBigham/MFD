import type {
  Player,
  PositionGroup,
  PositionGroupGrade,
  ReportCardGrade,
  Team,
  TeamNeedsComparisonEntry,
  TeamNeedsReport,
} from '../types';

export type LeagueAverageByGroup = Record<PositionGroup, number>;

interface PositionGroupConfig {
  group: PositionGroup;
  positions: Player['pos'][];
  starterCount: number;
}

const POSITION_GROUPS: PositionGroupConfig[] = [
  { group: 'QB', positions: ['QB'], starterCount: 1 },
  { group: 'RB', positions: ['RB'], starterCount: 1 },
  { group: 'WR', positions: ['WR'], starterCount: 3 },
  { group: 'TE', positions: ['TE'], starterCount: 1 },
  { group: 'OL', positions: ['OL'], starterCount: 5 },
  { group: 'DL', positions: ['DL'], starterCount: 4 },
  { group: 'LB', positions: ['LB'], starterCount: 3 },
  { group: 'CB', positions: ['CB'], starterCount: 2 },
  { group: 'S', positions: ['S'], starterCount: 2 },
  { group: 'K', positions: ['K'], starterCount: 1 },
  { group: 'P', positions: ['P'], starterCount: 1 },
];

const GRADE_SCORE: Record<ReportCardGrade, number> = {
  'A+': 8,
  A: 6,
  'B+': 4,
  B: 2,
  'C+': 0,
  C: -2,
  D: -5,
  F: -8,
};

const POSITION_TO_GROUP: Record<Player['pos'], PositionGroup> = {
  QB: 'QB',
  RB: 'RB',
  WR: 'WR',
  TE: 'TE',
  OL: 'OL',
  DL: 'DL',
  LB: 'LB',
  CB: 'CB',
  S: 'S',
  K: 'K',
  P: 'P',
};

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sortRoom(players: Player[]): Player[] {
  return [...players].sort((a, b) =>
    Number(b.isStarter) - Number(a.isStarter) ||
    b.ovr - a.ovr ||
    a.age - b.age ||
    a.id.localeCompare(b.id));
}

function roomFor(team: Team, config: PositionGroupConfig): Player[] {
  return sortRoom(team.roster.filter((player) => config.positions.includes(player.pos)));
}

function starterSlice(players: Player[], count: number): Player[] {
  return players.slice(0, Math.min(count, players.length));
}

function gradeForDelta(delta: number): ReportCardGrade {
  if (delta >= 8) return 'A+';
  if (delta >= 5) return 'A';
  if (delta >= 3) return 'B+';
  if (delta >= 0) return 'B';
  if (delta >= -3) return 'C+';
  if (delta >= -5) return 'C';
  if (delta >= -8) return 'D';
  return 'F';
}

function scoreForReport(positionGrades: PositionGroupGrade[]): number {
  return average(positionGrades.map((entry) => GRADE_SCORE[entry.grade]));
}

function overallLabel(score: number): string {
  if (score >= 5.5) return 'Elite roster foundation';
  if (score >= 3.5) return 'Playoff-ready core';
  if (score >= 1.5) return 'Competitive with a few soft spots';
  if (score >= -0.5) return 'Volatile roster with swing positions';
  return 'Needs immediate reinforcement';
}

function capFlexibility(team: Team): TeamNeedsReport['capFlexibility'] {
  if (team.capSpace >= 20) return 'abundant';
  if (team.capSpace >= 5) return 'moderate';
  return 'tight';
}

function needScore(
  starterOvr: number,
  leagueAverage: number,
  depth: number,
  starterCount: number,
  ageRiskCount: number,
): number {
  const qualityGap = Math.max(0, leagueAverage - starterOvr) * 2;
  const missingStarterPenalty = Math.max(0, starterCount - depth) * 12;
  const agingStarterPenalty = ageRiskCount * 3;
  const shallowRoomPenalty = depth <= starterCount ? 4 : 0;
  return round(Math.max(0, Math.min(40,
    qualityGap + missingStarterPenalty + agingStarterPenalty + shallowRoomPenalty)));
}

function buildReasonCodes(
  config: PositionGroupConfig,
  room: Player[],
  starters: Player[],
  starterOvr: number,
  leagueAverage: number,
): string[] {
  const reasons: string[] = [];
  const missingStarters = Math.max(0, config.starterCount - room.length);
  if (missingStarters > 0) {
    reasons.push(`${config.group} is missing ${missingStarters} required starter${missingStarters === 1 ? '' : 's'}`);
  }
  const backup = room[config.starterCount];
  if (backup && backup.ovr < 70) {
    reasons.push(`${config.group}${config.starterCount + 1} is ${backup.ovr} OVR`);
  } else if (!backup) {
    reasons.push(`${config.group} has no proven first backup`);
  }
  const oldestStarter = [...starters].sort((a, b) => b.age - a.age || a.id.localeCompare(b.id))[0];
  if (oldestStarter && oldestStarter.age >= 30) {
    reasons.push(`${config.group}1 is ${oldestStarter.age} years old`);
  }
  if (starterOvr < leagueAverage) {
    reasons.push(`${config.group} starters are ${round(leagueAverage - starterOvr)} OVR below league average`);
  }
  return reasons;
}

export function buildLeagueAverageByGroup(teams: Team[]): LeagueAverageByGroup {
  return POSITION_GROUPS.reduce<LeagueAverageByGroup>((acc, config) => {
    const starterAverages = teams.map((team) => {
      const starters = starterSlice(roomFor(team, config), config.starterCount);
      return average(starters.map((player) => player.ovr));
    });
    acc[config.group] = round(average(starterAverages));
    return acc;
  }, {
    QB: 0,
    RB: 0,
    WR: 0,
    TE: 0,
    OL: 0,
    DL: 0,
    LB: 0,
    CB: 0,
    S: 0,
    K: 0,
    P: 0,
  });
}

export function analyzeTeamNeeds(team: Team, leagueAverageByGroup: LeagueAverageByGroup): TeamNeedsReport {
  const positionGrades = POSITION_GROUPS.map<PositionGroupGrade>((config) => {
    const room = roomFor(team, config);
    const starters = starterSlice(room, config.starterCount);
    const starterOvr = round(average(starters.map((player) => player.ovr)));
    const avgOvr = round(average(room.map((player) => player.ovr)));
    const ageRiskCount = starters.filter((player) => player.age >= 30).length;
    const leagueAverage = leagueAverageByGroup[config.group] ?? 0;
    const delta = starterOvr - leagueAverage;

    return {
      group: config.group,
      grade: gradeForDelta(delta),
      avgOvr,
      starterOvr,
      depth: room.length,
      ageRisk: ageRiskCount >= 2 ? 'high' : ageRiskCount === 1 ? 'medium' : 'low',
      topPlayer: room[0] ?? null,
      weakestStarter: starters[starters.length - 1] ?? room[room.length - 1] ?? null,
      needScore: needScore(starterOvr, leagueAverage, room.length, config.starterCount, ageRiskCount),
      reasonCodes: buildReasonCodes(config, room, starters, starterOvr, leagueAverage),
    };
  });

  const rankedByNeed = [...positionGrades].sort((a, b) =>
    GRADE_SCORE[a.grade] - GRADE_SCORE[b.grade] ||
    a.starterOvr - b.starterOvr ||
    a.group.localeCompare(b.group));
  const rankedByStrength = [...positionGrades].sort((a, b) =>
    GRADE_SCORE[b.grade] - GRADE_SCORE[a.grade] ||
    b.starterOvr - a.starterOvr ||
    a.group.localeCompare(b.group));
  const criticalNeeds = rankedByNeed.slice(0, 3).map((entry) => entry.group);
  const strengths = rankedByStrength.slice(0, 3).map((entry) => entry.group);
  const flexibility = capFlexibility(team);

  return {
    overall: overallLabel(scoreForReport(positionGrades)),
    positionGrades,
    criticalNeeds,
    strengths,
    draftTargets: [...criticalNeeds],
    faTargets: flexibility === 'tight' ? criticalNeeds.slice(0, 2) : [...criticalNeeds],
    capFlexibility: flexibility,
  };
}

export function getTeamPositionNeed(report: TeamNeedsReport, position: Player['pos']): PositionGroupGrade {
  const group = POSITION_TO_GROUP[position];
  return report.positionGrades.find((entry) => entry.group === group) ?? {
    group,
    grade: 'F',
    avgOvr: 0,
    starterOvr: 0,
    depth: 0,
    ageRisk: 'high',
    topPlayer: null,
    weakestStarter: null,
    needScore: 40,
    reasonCodes: [`${group} has no rostered players`],
  };
}

export function compareTeamNeeds(
  teamA: Team,
  teamB: Team,
  leagueAverageByGroup: LeagueAverageByGroup,
): TeamNeedsComparisonEntry[] {
  const reportA = analyzeTeamNeeds(teamA, leagueAverageByGroup);
  const reportB = analyzeTeamNeeds(teamB, leagueAverageByGroup);

  return POSITION_GROUPS.map((config) => {
    const gradeA = reportA.positionGrades.find((entry) => entry.group === config.group)!;
    const gradeB = reportB.positionGrades.find((entry) => entry.group === config.group)!;
    const differential = round(gradeA.starterOvr - gradeB.starterOvr);

    return {
      group: config.group,
      teamAGrade: gradeA.grade,
      teamBGrade: gradeB.grade,
      edge: differential > 1 ? 'teamA' : differential < -1 ? 'teamB' : 'even',
      differential,
    };
  });
}
