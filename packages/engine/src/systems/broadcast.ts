import type { PrngFn } from '../rng';
import type {
  BroadcastOutput,
  DriveNarrative,
  GameResult,
  PlayDescription,
  Player,
  PlayerGameLine,
  Team,
  TeamGameStats,
} from '../types';
import {
  BROADCAST_COMMENTARY_TEMPLATES,
  clutchLeads,
  heroicLeads,
  overtimeLeads,
  rivalryLeads,
  underdogLeads,
} from './broadcast-templates';

type ScoringType = 'pass_td' | 'rush_td' | 'field_goal';

interface PlayerRef {
  id: string;
  name: string;
  ovr: number;
}

interface TeamRuntime {
  team: Team;
  opponent: Team;
  stats: TeamGameStats;
  opponentStats: TeamGameStats;
  players: Record<string, PlayerRef>;
  qb: PlayerRef | null;
  rb: PlayerRef | null;
  receivers: PlayerRef[];
  defenders: PlayerRef[];
  ballhawks: PlayerRef[];
  kicker: PlayerRef | null;
  remainingPassTDs: number;
  remainingRushTDs: number;
  remainingFieldGoals: number;
  remainingTurnovers: number;
  remainingPunts: number;
  remainingSacksTaken: number;
  remainingPenalties: number;
  driveDistribution: number[];
}

interface DrivePlan {
  teamId: string;
  quarter: number;
  endResult: DriveNarrative['endResult'];
  points: number;
  scoringType?: ScoringType;
  overtime?: boolean;
}

interface TimedPlay {
  play: PlayDescription;
  quarter: number;
  playIndex: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function randInt(rng: PrngFn, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pickWithRng<T>(items: readonly T[], rng: PrngFn): T {
  return items[Math.floor(rng() * items.length)]!;
}

function teamLabel(team: Team): string {
  return `${team.city} ${team.name}`;
}

function buildPlayerMap(team: Team): Record<string, PlayerRef> {
  return team.roster.reduce<Record<string, PlayerRef>>((map, player) => {
    map[player.id] = {
      id: player.id,
      name: player.name,
      ovr: player.ovr,
    };
    return map;
  }, {});
}

function findTopLine(
  lines: PlayerGameLine[],
  pos: Player['pos'] | null,
  metric: (line: PlayerGameLine) => number,
  fallback: PlayerRef | null,
  players: Record<string, PlayerRef>,
): PlayerRef | null {
  const filtered = lines
    .filter((line) => (pos ? line.pos === pos : true))
    .sort((left, right) => metric(right) - metric(left) || left.playerId.localeCompare(right.playerId));
  const top = filtered.find((line) => metric(line) > 0);
  return top ? players[top.playerId] ?? fallback : fallback;
}

function averageRosterOvr(team: Team): number {
  if (team.roster.length === 0) return 70;
  const total = team.roster.reduce((sum, player) => sum + player.ovr, 0);
  return total / team.roster.length;
}

function buildRuntime(team: Team, opponent: Team, stats: TeamGameStats, opponentStats: TeamGameStats): TeamRuntime {
  const players = buildPlayerMap(team);
  const qb = findTopLine(stats.playerLines, 'QB', (line) => (line.passYds ?? 0) + (line.passTD ?? 0) * 50, players[`${team.id}-qb`] ?? null, players);
  const rb = findTopLine(stats.playerLines, 'RB', (line) => (line.rushYds ?? 0) + (line.rushTD ?? 0) * 30, players[`${team.id}-rb`] ?? null, players);
  const receivers = stats.playerLines
    .filter((line) => line.pos === 'WR' || line.pos === 'TE' || line.pos === 'RB')
    .sort((left, right) => ((right.recYds ?? 0) + (right.recTD ?? 0) * 40) - ((left.recYds ?? 0) + (left.recTD ?? 0) * 40) || left.playerId.localeCompare(right.playerId))
    .map((line) => players[line.playerId])
    .filter((player): player is PlayerRef => Boolean(player));
  const defenders = stats.playerLines
    .filter((line) => line.pos === 'DL' || line.pos === 'LB')
    .sort((left, right) => ((right.sacks ?? 0) * 30 + (right.tackles ?? 0)) - ((left.sacks ?? 0) * 30 + (left.tackles ?? 0)) || left.playerId.localeCompare(right.playerId))
    .map((line) => players[line.playerId])
    .filter((player): player is PlayerRef => Boolean(player));
  const ballhawks = stats.playerLines
    .filter((line) => (line.defINT ?? 0) > 0 || line.pos === 'CB' || line.pos === 'S')
    .sort((left, right) => ((right.defINT ?? 0) * 40 + (right.tackles ?? 0)) - ((left.defINT ?? 0) * 40 + (left.tackles ?? 0)) || left.playerId.localeCompare(right.playerId))
    .map((line) => players[line.playerId])
    .filter((player): player is PlayerRef => Boolean(player));
  const kicker = findTopLine(stats.playerLines, 'K', (line) => (line.fgMade ?? 0) * 50, players[`${team.id}-k`] ?? null, players);

  return {
    team,
    opponent,
    stats,
    opponentStats,
    players,
    qb,
    rb,
    receivers,
    defenders,
    ballhawks,
    kicker,
    remainingPassTDs: stats.passTDs,
    remainingRushTDs: stats.rushTDs,
    remainingFieldGoals: stats.fgMade,
    remainingTurnovers: stats.turnovers,
    remainingPunts: stats.punts,
    remainingSacksTaken: opponentStats.sacks,
    remainingPenalties: stats.penalties,
    driveDistribution: distributeCount(stats.drives, 4),
  };
}

function distributeCount(total: number, buckets: number): number[] {
  const safeTotal = Math.max(total, buckets);
  const distribution = Array.from({ length: buckets }, () => Math.floor(safeTotal / buckets));
  let remaining = safeTotal % buckets;
  let index = 0;
  while (remaining > 0) {
    distribution[index % buckets]! += 1;
    remaining -= 1;
    index += 1;
  }
  return distribution;
}

function isRivalryGame(homeTeam: Team, awayTeam: Team): boolean {
  if (homeTeam.division === awayTeam.division) return true;
  if ((homeTeam.rivals[awayTeam.id]?.heat ?? 0) >= 5 || (awayTeam.rivals[homeTeam.id]?.heat ?? 0) >= 5) return true;
  const homeHeat = homeTeam.rivalries.find((entry) => entry.teamId === awayTeam.id)?.heat ?? 0;
  const awayHeat = awayTeam.rivalries.find((entry) => entry.teamId === homeTeam.id)?.heat ?? 0;
  return Math.max(homeHeat, awayHeat) >= 40;
}

function buildNameMap(...teams: Team[]): Record<string, string> {
  return teams.reduce<Record<string, string>>((map, team) => {
    for (const player of team.roster) {
      map[player.id] = player.name;
    }
    return map;
  }, {});
}

function splitQuarterScore(points: number, runtime: TeamRuntime, rng: PrngFn): DrivePlan[] {
  const plans: DrivePlan[] = [];
  let remaining = points;

  if (remaining === 6) {
    plans.push({
      teamId: runtime.team.id,
      quarter: 0,
      endResult: 'touchdown',
      points: 6,
      scoringType: chooseTouchdownType(runtime, rng),
    });
    return plans;
  }

  while (remaining >= 7) {
    plans.push({
      teamId: runtime.team.id,
      quarter: 0,
      endResult: 'touchdown',
      points: 7,
      scoringType: chooseTouchdownType(runtime, rng),
    });
    remaining -= 7;
  }

  while (remaining >= 3) {
    if (runtime.remainingFieldGoals > 0) runtime.remainingFieldGoals -= 1;
    plans.push({
      teamId: runtime.team.id,
      quarter: 0,
      endResult: 'fieldGoal',
      points: 3,
      scoringType: 'field_goal',
    });
    remaining -= 3;
  }

  return plans;
}

function chooseTouchdownType(runtime: TeamRuntime, rng: PrngFn): ScoringType {
  const passWeight = Math.max(0, runtime.remainingPassTDs);
  const rushWeight = Math.max(0, runtime.remainingRushTDs);

  if (passWeight === 0 && rushWeight === 0) {
    return (runtime.stats.passingYards >= runtime.stats.rushingYards ? 'pass_td' : 'rush_td');
  }

  const total = passWeight + rushWeight;
  const roll = rng() * total;
  const chosen = roll < passWeight ? 'pass_td' : 'rush_td';
  if (chosen === 'pass_td' && runtime.remainingPassTDs > 0) runtime.remainingPassTDs -= 1;
  if (chosen === 'rush_td' && runtime.remainingRushTDs > 0) runtime.remainingRushTDs -= 1;
  return chosen;
}

function chooseNonScoringResult(runtime: TeamRuntime, quarter: number, index: number, total: number, rng: PrngFn): DriveNarrative['endResult'] {
  const remainingSlots = total - index;
  if (runtime.remainingTurnovers > 0 && (runtime.remainingTurnovers >= remainingSlots || rng() < 0.26)) {
    runtime.remainingTurnovers -= 1;
    return 'turnover';
  }
  if ((quarter === 2 || quarter === 4) && index === total - 1 && rng() < 0.35) {
    return 'endOfHalf';
  }
  if (runtime.remainingPunts > 0) {
    runtime.remainingPunts -= 1;
    return 'punt';
  }
  if (rng() < 0.2) {
    return 'turnoverOnDowns';
  }
  return 'punt';
}

function buildQuarterPlans(runtime: TeamRuntime, quarter: number, points: number, rng: PrngFn): DrivePlan[] {
  const scoringPlans = splitQuarterScore(points, runtime, rng).map((plan) => ({ ...plan, quarter }));
  const plannedDrives = runtime.driveDistribution[quarter - 1] ?? scoringPlans.length ?? 1;
  const quarterQuota = Math.max(scoringPlans.length, plannedDrives);
  const fillerCount = Math.max(0, quarterQuota - scoringPlans.length);
  const fillers = Array.from({ length: fillerCount }, (_, index) => ({
    teamId: runtime.team.id,
    quarter,
    endResult: chooseNonScoringResult(runtime, quarter, index, fillerCount, rng),
    points: 0,
  } satisfies DrivePlan));
  return [...scoringPlans, ...fillers];
}

function primaryReceiver(runtime: TeamRuntime, rotation: number): PlayerRef | null {
  if (runtime.receivers.length === 0) return runtime.rb ?? runtime.qb;
  return runtime.receivers[rotation % runtime.receivers.length] ?? runtime.receivers[0] ?? null;
}

function primaryDefender(runtime: TeamRuntime, turnover: boolean): PlayerRef | null {
  if (turnover && runtime.ballhawks.length > 0) return runtime.ballhawks[0]!;
  if (runtime.defenders.length > 0) return runtime.defenders[0]!;
  if (runtime.ballhawks.length > 0) return runtime.ballhawks[0]!;
  return null;
}

function replaceTokens(template: string, tokens: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, token: string) => tokens[token] ?? token);
}

function driveVerb(yardsTotal: number): string {
  if (yardsTotal >= 75) return 'marched';
  if (yardsTotal >= 55) return 'moved';
  if (yardsTotal >= 35) return 'worked';
  return 'scrapped';
}

export function generateDriveSummary(
  drive: DriveNarrative,
  teamName: string,
  playerNames: Record<string, string>,
): string {
  const plays = drive.plays;
  const finalPlay = plays[plays.length - 1];
  const playCount = plays.length;
  const subject = `The ${teamName} ${driveVerb(drive.yardsTotal)} ${drive.yardsTotal} yards in ${playCount} play${playCount === 1 ? '' : 's'}`;

  if (!finalPlay) {
    return `${subject} before the possession faded away.`;
  }

  const firstPlayer = finalPlay.playerIds[0] ? playerNames[finalPlay.playerIds[0]] ?? finalPlay.playerIds[0] : 'the offense';
  const secondPlayer = finalPlay.playerIds[1] ? playerNames[finalPlay.playerIds[1]] ?? finalPlay.playerIds[1] : null;

  if (drive.endResult === 'touchdown') {
    if (secondPlayer) {
      return `${subject}, capped by a ${finalPlay.yardsGained}-yard TD strike from ${firstPlayer} to ${secondPlayer}.`;
    }
    return `${subject}, capped by a ${finalPlay.yardsGained}-yard scoring burst from ${firstPlayer}.`;
  }
  if (drive.endResult === 'fieldGoal') {
    return `${subject}, ending with ${firstPlayer} drilling a ${finalPlay.yardsGained}-yard field goal.`;
  }
  if (drive.endResult === 'turnover') {
    return `${subject} before the series died with a turnover involving ${firstPlayer}.`;
  }
  if (drive.endResult === 'turnoverOnDowns') {
    return `${subject} but came up short on fourth down.`;
  }
  if (drive.endResult === 'endOfHalf') {
    return `${subject} before the clock ran out on the half.`;
  }
  return `${subject} but had to punt it away.`;
}

function commentaryCategory(
  play: PlayDescription,
  context: { quarter: number; isRivalry: boolean },
): keyof typeof BROADCAST_COMMENTARY_TEMPLATES {
  if (context.quarter > 4) return 'overtime';
  if (context.isRivalry && (play.isClutch || play.isBigPlay || play.excitement >= 0.68)) return 'rivalry';
  if (play.isClutch) return 'clutch';

  switch (play.type) {
    case 'touchdown':
      return 'touchdown';
    case 'turnover':
      return play.playerIds.length > 1 ? 'turnover_interception' : 'turnover_fumble';
    case 'sack':
      return 'sack';
    case 'fieldGoal':
      return 'field_goal';
    case 'punt':
      return 'punt';
    case 'run':
      return play.isBigPlay || play.excitement >= 0.7 ? 'big_play_run' : 'routine_run';
    case 'pass':
      return play.isBigPlay || play.excitement >= 0.7 ? 'big_play_pass' : 'routine_pass';
    case 'penalty':
      return play.isClutch ? 'clutch' : 'routine_pass';
    case 'safety':
      return context.quarter > 4 ? 'overtime' : 'clutch';
    default:
      return play.isClutch ? 'clutch' : 'routine_pass';
  }
}

export function generatePlayCommentary(
  play: PlayDescription,
  context: { scoreDiff: number; quarter: number; isRivalry: boolean; playerOvr: number },
  rng: PrngFn,
): string {
  const category = commentaryCategory(play, context);
  const template = pickWithRng(BROADCAST_COMMENTARY_TEMPLATES[category], rng);
  const leads: string[] = [];

  if (context.quarter > 4) {
    leads.push(pickWithRng(overtimeLeads, rng));
  }
  if (context.isRivalry && (play.isBigPlay || play.isClutch || play.excitement >= 0.65)) {
    leads.push(pickWithRng(rivalryLeads, rng));
  }
  if (play.isClutch) {
    leads.push(pickWithRng(clutchLeads, rng));
  }
  if (context.playerOvr >= 92 && play.excitement >= 0.6) {
    leads.push(pickWithRng(heroicLeads, rng));
  } else if (context.playerOvr <= 70 && play.excitement >= 0.45) {
    leads.push(pickWithRng(underdogLeads, rng));
  }

  return [...leads, template].join(' ').trim();
}

function computeExcitement(
  type: PlayDescription['type'],
  yardsGained: number,
  isBigPlay: boolean,
  isClutch: boolean,
  isRivalry: boolean,
): number {
  let excitement = 0.18 + Math.min(Math.abs(yardsGained) / 45, 0.4);
  if (type === 'touchdown') excitement += 0.34;
  if (type === 'turnover') excitement += 0.28;
  if (type === 'sack') excitement += 0.1;
  if (type === 'fieldGoal') excitement += 0.14;
  if (isBigPlay) excitement += 0.12;
  if (isClutch) excitement += 0.12;
  if (isRivalry) excitement += 0.05;
  return clamp(Number(excitement.toFixed(2)), 0, 1);
}

function createPlay(
  type: PlayDescription['type'],
  yardsGained: number,
  playerIds: string[],
  team: Team,
  quarter: number,
  scoreDiff: number,
  isRivalry: boolean,
  playerOvr: number,
  rng: PrngFn,
  names: Record<string, string>,
): PlayDescription {
  const isBigPlay = type === 'touchdown' || type === 'turnover' || Math.abs(yardsGained) >= 20;
  const isClutch = quarter === 4 && Math.abs(scoreDiff) <= 7;
  const excitement = computeExcitement(type, yardsGained, isBigPlay, isClutch, isRivalry);
  const template = generatePlayCommentary({
    type,
    yardsGained,
    playerIds,
    commentary: '',
    excitement,
    isBigPlay,
    isClutch,
  }, {
    scoreDiff,
    quarter,
    isRivalry,
    playerOvr,
  }, rng);
  const primaryName = playerIds[0] ? names[playerIds[0]] ?? playerIds[0] : 'the offense';
  const secondaryName = playerIds[1] ? names[playerIds[1]] ?? playerIds[1] : primaryName;

  return {
    type,
    yardsGained,
    playerIds,
    commentary: replaceTokens(template, {
      player: primaryName,
      yards: String(Math.abs(yardsGained)),
      team: team.name,
      secondary: secondaryName,
    }),
    excitement,
    isBigPlay,
    isClutch,
  };
}

function buildTouchdownDrive(
  runtime: TeamRuntime,
  plan: DrivePlan,
  scoreDiff: number,
  isRivalry: boolean,
  names: Record<string, string>,
  rng: PrngFn,
  receiverRotation: number,
): DriveNarrative {
  const plays: PlayDescription[] = [];
  const qb = runtime.qb ?? runtime.rb ?? primaryReceiver(runtime, receiverRotation);
  const receiver = primaryReceiver(runtime, receiverRotation);
  const runner = runtime.rb ?? receiver ?? qb;
  const startYardLine = randInt(rng, 18, 34);
  const baseYards = randInt(rng, 48, 79);
  const timeElapsed = randInt(rng, 95, 235);

  if (plan.scoringType === 'pass_td') {
    plays.push(createPlay('run', randInt(rng, 4, 9), [runner?.id ?? runtime.team.id], runtime.team, plan.overtime ? 5 : plan.quarter, scoreDiff, isRivalry, runner?.ovr ?? averageRosterOvr(runtime.team), rng, names));
    plays.push(createPlay('pass', randInt(rng, 20, 36), [qb?.id ?? runtime.team.id, receiver?.id ?? qb?.id ?? runtime.team.id], runtime.team, plan.overtime ? 5 : plan.quarter, scoreDiff, isRivalry, qb?.ovr ?? averageRosterOvr(runtime.team), rng, names));
    plays.push(createPlay('touchdown', randInt(rng, 9, 24), [qb?.id ?? runtime.team.id, receiver?.id ?? qb?.id ?? runtime.team.id], runtime.team, plan.overtime ? 5 : plan.quarter, scoreDiff, isRivalry, qb?.ovr ?? averageRosterOvr(runtime.team), rng, names));
  } else {
    plays.push(createPlay('pass', randInt(rng, 8, 16), [qb?.id ?? runtime.team.id, receiver?.id ?? qb?.id ?? runtime.team.id], runtime.team, plan.overtime ? 5 : plan.quarter, scoreDiff, isRivalry, qb?.ovr ?? averageRosterOvr(runtime.team), rng, names));
    plays.push(createPlay('run', randInt(rng, 20, 34), [runner?.id ?? runtime.team.id], runtime.team, plan.overtime ? 5 : plan.quarter, scoreDiff, isRivalry, runner?.ovr ?? averageRosterOvr(runtime.team), rng, names));
    plays.push(createPlay('touchdown', randInt(rng, 4, 16), [runner?.id ?? runtime.team.id], runtime.team, plan.overtime ? 5 : plan.quarter, scoreDiff, isRivalry, runner?.ovr ?? averageRosterOvr(runtime.team), rng, names));
  }

  const drive: DriveNarrative = {
    plays,
    startYardLine,
    endResult: 'touchdown',
    yardsTotal: baseYards,
    timeElapsed,
    narrative: '',
    teamId: runtime.team.id,
  };
  drive.narrative = generateDriveSummary(drive, runtime.team.name, names);
  return drive;
}

function buildFieldGoalDrive(
  runtime: TeamRuntime,
  plan: DrivePlan,
  scoreDiff: number,
  isRivalry: boolean,
  names: Record<string, string>,
  rng: PrngFn,
  receiverRotation: number,
): DriveNarrative {
  const plays: PlayDescription[] = [];
  const qb = runtime.qb ?? primaryReceiver(runtime, receiverRotation);
  const receiver = primaryReceiver(runtime, receiverRotation);
  const runner = runtime.rb ?? receiver ?? qb;
  const kicker = runtime.kicker ?? runner ?? qb;

  plays.push(createPlay('pass', randInt(rng, 8, 15), [qb?.id ?? runtime.team.id, receiver?.id ?? qb?.id ?? runtime.team.id], runtime.team, plan.quarter, scoreDiff, isRivalry, qb?.ovr ?? averageRosterOvr(runtime.team), rng, names));
  plays.push(createPlay('run', randInt(rng, 5, 11), [runner?.id ?? runtime.team.id], runtime.team, plan.quarter, scoreDiff, isRivalry, runner?.ovr ?? averageRosterOvr(runtime.team), rng, names));
  plays.push(createPlay('fieldGoal', randInt(rng, 34, 53), [kicker?.id ?? runtime.team.id], runtime.team, plan.quarter, scoreDiff, isRivalry, kicker?.ovr ?? averageRosterOvr(runtime.team), rng, names));

  const drive: DriveNarrative = {
    plays,
    startYardLine: randInt(rng, 20, 32),
    endResult: 'fieldGoal',
    yardsTotal: randInt(rng, 29, 56),
    timeElapsed: randInt(rng, 80, 180),
    narrative: '',
    teamId: runtime.team.id,
  };
  drive.narrative = generateDriveSummary(drive, runtime.team.name, names);
  return drive;
}

function buildStalledDrive(
  runtime: TeamRuntime,
  plan: DrivePlan,
  scoreDiff: number,
  isRivalry: boolean,
  names: Record<string, string>,
  rng: PrngFn,
  receiverRotation: number,
): DriveNarrative {
  const plays: PlayDescription[] = [];
  const qb = runtime.qb ?? primaryReceiver(runtime, receiverRotation);
  const receiver = primaryReceiver(runtime, receiverRotation);
  const runner = runtime.rb ?? receiver ?? qb;
  const defender = primaryDefender(runtime.opponent.id === runtime.team.id ? runtime : buildRuntime(runtime.opponent, runtime.team, runtime.opponentStats, runtime.stats), false);

  if (runtime.remainingPenalties > 0 && rng() < 0.2) {
    runtime.remainingPenalties -= 1;
    plays.push(createPlay('penalty', randInt(rng, 5, 12), [runner?.id ?? runtime.team.id], runtime.team, plan.quarter, scoreDiff, isRivalry, runner?.ovr ?? averageRosterOvr(runtime.team), rng, names));
  }

  if (plan.endResult === 'turnover') {
    plays.push(createPlay('pass', randInt(rng, 7, 14), [qb?.id ?? runtime.team.id, receiver?.id ?? qb?.id ?? runtime.team.id], runtime.team, plan.quarter, scoreDiff, isRivalry, qb?.ovr ?? averageRosterOvr(runtime.team), rng, names));
    const interception = rng() < 0.55;
    plays.push(createPlay('turnover', 0, interception
      ? [qb?.id ?? runtime.team.id, defender?.id ?? runtime.opponent.id]
      : [runner?.id ?? runtime.team.id], runtime.team, plan.quarter, scoreDiff, isRivalry, (interception ? qb?.ovr : runner?.ovr) ?? averageRosterOvr(runtime.team), rng, names));
  } else {
    plays.push(createPlay('run', randInt(rng, 3, 8), [runner?.id ?? runtime.team.id], runtime.team, plan.quarter, scoreDiff, isRivalry, runner?.ovr ?? averageRosterOvr(runtime.team), rng, names));
    if (runtime.remainingSacksTaken > 0 && rng() < 0.45) {
      runtime.remainingSacksTaken -= 1;
      plays.push(createPlay('sack', -randInt(rng, 5, 11), [qb?.id ?? runtime.team.id], runtime.team, plan.quarter, scoreDiff, isRivalry, qb?.ovr ?? averageRosterOvr(runtime.team), rng, names));
    } else {
      plays.push(createPlay('pass', randInt(rng, 4, 10), [qb?.id ?? runtime.team.id, receiver?.id ?? qb?.id ?? runtime.team.id], runtime.team, plan.quarter, scoreDiff, isRivalry, qb?.ovr ?? averageRosterOvr(runtime.team), rng, names));
    }
    if (plan.endResult === 'punt') {
      plays.push(createPlay('punt', randInt(rng, 38, 54), [runtime.kicker?.id ?? runtime.team.id], runtime.team, plan.quarter, scoreDiff, isRivalry, runtime.kicker?.ovr ?? averageRosterOvr(runtime.team), rng, names));
    } else if (plan.endResult === 'turnoverOnDowns') {
      plays.push(createPlay('pass', randInt(rng, 1, 4), [qb?.id ?? runtime.team.id, receiver?.id ?? qb?.id ?? runtime.team.id], runtime.team, plan.quarter, scoreDiff, isRivalry, qb?.ovr ?? averageRosterOvr(runtime.team), rng, names));
    }
  }

  const drive: DriveNarrative = {
    plays,
    startYardLine: randInt(rng, 14, 32),
    endResult: plan.endResult,
    yardsTotal: clamp(plays.reduce((sum, play) => sum + Math.max(play.yardsGained, 0), 0) + randInt(rng, 4, 18), 8, 52),
    timeElapsed: randInt(rng, 55, 165),
    narrative: '',
    teamId: runtime.team.id,
  };
  drive.narrative = generateDriveSummary(drive, runtime.team.name, names);
  return drive;
}

function createDrive(
  runtime: TeamRuntime,
  plan: DrivePlan,
  scoreDiff: number,
  isRivalry: boolean,
  names: Record<string, string>,
  rng: PrngFn,
  receiverRotation: number,
): DriveNarrative {
  if (plan.endResult === 'touchdown') {
    return buildTouchdownDrive(runtime, plan, scoreDiff, isRivalry, names, rng, receiverRotation);
  }
  if (plan.endResult === 'fieldGoal') {
    return buildFieldGoalDrive(runtime, plan, scoreDiff, isRivalry, names, rng, receiverRotation);
  }
  return buildStalledDrive(runtime, plan, scoreDiff, isRivalry, names, rng, receiverRotation);
}

function scoreComparator(left: TimedPlay, right: TimedPlay): number {
  if (right.play.excitement !== left.play.excitement) return right.play.excitement - left.play.excitement;
  if (left.play.isClutch !== right.play.isClutch) return left.play.isClutch ? -1 : 1;
  if (left.play.isBigPlay !== right.play.isBigPlay) return left.play.isBigPlay ? -1 : 1;
  if (right.quarter !== left.quarter) return right.quarter - left.quarter;
  return right.playIndex - left.playIndex;
}

export function selectHighlights(quarters: DriveNarrative[][]): PlayDescription[] {
  const timed = quarters.flatMap((quarterDrives, quarterIndex) =>
    quarterDrives.flatMap((drive) =>
      drive.plays.map((play, playIndex) => ({
        play,
        quarter: quarterIndex + 1,
        playIndex,
      } satisfies TimedPlay))));

  if (timed.length === 0) return [];

  const sorted = [...timed].sort(scoreComparator);
  const selected: TimedPlay[] = [];
  const seen = new Set<PlayDescription>();
  const firstHalf = sorted.find((entry) => entry.quarter <= 2);
  const secondHalf = sorted.find((entry) => entry.quarter >= 3);

  if (firstHalf) {
    selected.push(firstHalf);
    seen.add(firstHalf.play);
  }
  if (secondHalf && !seen.has(secondHalf.play)) {
    selected.push(secondHalf);
    seen.add(secondHalf.play);
  }

  for (const entry of sorted) {
    if (selected.length >= 5) break;
    if (seen.has(entry.play)) continue;
    selected.push(entry);
    seen.add(entry.play);
  }

  return selected.slice(0, 5).map((entry) => entry.play);
}

function scorePlayers(quarters: DriveNarrative[][], gameResult: GameResult): string[] {
  const scores = new Map<string, number>();
  for (const quarter of quarters) {
    for (const drive of quarter) {
      for (const play of drive.plays) {
        const weight = play.excitement * 12 + (play.isBigPlay ? 4 : 0) + (play.type === 'touchdown' ? 6 : 0) + (play.type === 'turnover' ? 5 : 0);
        for (const playerId of play.playerIds) {
          scores.set(playerId, (scores.get(playerId) ?? 0) + weight);
        }
      }
    }
  }
  if (gameResult.mvpPlayerId) {
    scores.set(gameResult.mvpPlayerId, (scores.get(gameResult.mvpPlayerId) ?? 0) + 8);
  }

  return [...scores.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 2)
    .map(([playerId]) => playerId);
}

function buildMomentumSwings(quarters: DriveNarrative[][], gameResult: GameResult): BroadcastOutput['momentumSwings'] {
  const swings: BroadcastOutput['momentumSwings'] = [];
  let homeScore = 0;
  let awayScore = 0;

  for (let quarterIndex = 0; quarterIndex < quarters.length; quarterIndex += 1) {
    const quarter = quarters[quarterIndex]!;
    for (const drive of quarter) {
      const finalPlay = drive.plays[drive.plays.length - 1];
      if (!finalPlay) continue;

      const beforeLeader = Math.sign(homeScore - awayScore);
      if (drive.endResult === 'touchdown') {
        const homeDrive = finalPlay.playerIds.some((playerId) => playerId.startsWith(gameResult.homeTeamId));
        if (homeDrive) homeScore += 7;
        else awayScore += 7;
      } else if (drive.endResult === 'fieldGoal') {
        const homeDrive = finalPlay.playerIds.some((playerId) => playerId.startsWith(gameResult.homeTeamId));
        if (homeDrive) homeScore += 3;
        else awayScore += 3;
      }
      const afterLeader = Math.sign(homeScore - awayScore);
      if ((beforeLeader !== afterLeader && afterLeader !== 0) || (finalPlay.type === 'turnover' && finalPlay.excitement >= 0.75)) {
        swings.push({
          quarter: quarterIndex + 1,
          play: drive.plays.length,
          description: finalPlay.commentary,
        });
      }
    }
  }

  return swings.slice(0, 6);
}

function findLatestHighlightName(playerIds: string[], names: Record<string, string>): string | null {
  const first = playerIds[0];
  return first ? names[first] ?? first : null;
}

export function generateFinalNarrative(
  broadcast: BroadcastOutput,
  homeTeam: Team,
  awayTeam: Team,
  gameResult: GameResult,
): string {
  const names = buildNameMap(homeTeam, awayTeam);
  const winner = gameResult.homeScore >= gameResult.awayScore ? homeTeam : awayTeam;
  const loser = winner.id === homeTeam.id ? awayTeam : homeTeam;
  const topHighlight = broadcast.highlights[0] ?? null;
  const featuredName = topHighlight ? findLatestHighlightName(topHighlight.playerIds, names) : null;
  const mvpName = broadcast.mvpPlayerIds[0] ? names[broadcast.mvpPlayerIds[0]] ?? broadcast.mvpPlayerIds[0] : null;
  const rivalry = isRivalryGame(homeTeam, awayTeam);
  const intro = gameResult.overtime
    ? `In overtime, ${teamLabel(winner)} escaped ${teamLabel(loser)} ${gameResult.homeScore}-${gameResult.awayScore}.`
    : gameResult.primetime || gameResult.broadcastNetwork === 'MFN'
      ? `In a primetime thriller, ${teamLabel(winner)} beat ${teamLabel(loser)} ${gameResult.homeScore}-${gameResult.awayScore}.`
      : `At ${homeTeam.city}, ${teamLabel(winner)} beat ${teamLabel(loser)} ${gameResult.homeScore}-${gameResult.awayScore}.`;
  const middle = featuredName
    ? `${featuredName} supplied one of the signature moments in a game that kept swinging.`
    : `${teamLabel(winner)} found enough late answers to close it out.`;
  const closer = rivalry
    ? 'The rivalry edge only made the finish louder.'
    : mvpName
      ? `${mvpName} left the clearest mark on the broadcast.`
      : 'It felt like one of those games the fanbase will talk about all week.';

  return [intro, middle, closer].join(' ');
}

function safeStats(result: GameResult, teamId: string): TeamGameStats {
  return result.stats[teamId] ?? {
    totalYards: 0,
    passingYards: 0,
    rushingYards: 0,
    turnovers: 0,
    sacks: 0,
    pressuresAllowed: 0,
    thirdDownConversions: 0,
    thirdDownAttempts: 0,
    timeOfPossession: 30,
    passAttempts: 0,
    passCompletions: 0,
    passTDs: 0,
    interceptions: 0,
    rushAttempts: 0,
    rushTDs: 0,
    fumbles: 0,
    penalties: 0,
    penaltyYards: 0,
    fgMade: 0,
    fgAttempted: 0,
    punts: 0,
    drives: 4,
    yacYards: 0,
    redZoneTrips: 0,
    redZoneScores: 0,
    quarterScores: [0, 0, 0, 0],
    playerLines: [],
  };
}

export function generateBroadcast(
  gameResult: GameResult,
  homeTeam: Team,
  awayTeam: Team,
  rng: PrngFn,
): BroadcastOutput {
  const homeStats = safeStats(gameResult, homeTeam.id);
  const awayStats = safeStats(gameResult, awayTeam.id);
  const homeRuntime = buildRuntime(homeTeam, awayTeam, homeStats, awayStats);
  const awayRuntime = buildRuntime(awayTeam, homeTeam, awayStats, homeStats);
  const names = buildNameMap(homeTeam, awayTeam);
  const rivalry = isRivalryGame(homeTeam, awayTeam);
  const quarters: DriveNarrative[][] = [[], [], [], []];
  let homeScore = 0;
  let awayScore = 0;

  for (let quarter = 1; quarter <= 4; quarter += 1) {
    const homePlans = buildQuarterPlans(homeRuntime, quarter, homeStats.quarterScores[quarter - 1] ?? 0, rng);
    const awayPlans = buildQuarterPlans(awayRuntime, quarter, awayStats.quarterScores[quarter - 1] ?? 0, rng);
    let homeIndex = 0;
    let awayIndex = 0;
    let receiverRotation = 0;
    const quarterDrives: DriveNarrative[] = [];

    while (homeIndex < homePlans.length || awayIndex < awayPlans.length) {
      const preferHome = (quarterDrives.length + quarter) % 2 === 1;
      const takeHome = (preferHome && homeIndex < homePlans.length) || awayIndex >= awayPlans.length;
      const runtime = takeHome ? homeRuntime : awayRuntime;
      const plan = (takeHome ? homePlans[homeIndex++] : awayPlans[awayIndex++])!;
      const scoreDiff = takeHome ? homeScore - awayScore : awayScore - homeScore;
      const drive = createDrive(runtime, plan, scoreDiff, rivalry, names, rng, receiverRotation);
      quarterDrives.push(drive);
      receiverRotation += 1;

      if (takeHome) {
        homeScore += plan.points;
      } else {
        awayScore += plan.points;
      }
    }

    quarters[quarter - 1] = quarterDrives;
  }

  if (gameResult.overtime) {
    const winnerRuntime = gameResult.homeScore >= gameResult.awayScore ? homeRuntime : awayRuntime;
    const scoreDiff = Math.abs(gameResult.homeScore - gameResult.awayScore);
    const overtimeDrive = createDrive(winnerRuntime, {
      teamId: winnerRuntime.team.id,
      quarter: 4,
      endResult: gameResult.homeScore === gameResult.awayScore ? 'fieldGoal' : 'touchdown',
      points: gameResult.homeScore === gameResult.awayScore ? 3 : 7,
      scoringType: gameResult.homeScore === gameResult.awayScore ? 'field_goal' : chooseTouchdownType(winnerRuntime, rng),
      overtime: true,
    }, scoreDiff, rivalry, names, rng, 0);
    quarters[3] = [...quarters[3]!, overtimeDrive];
  }

  const highlights = selectHighlights(quarters);
  const mvpPlayerIds = scorePlayers(quarters, gameResult);
  const momentumSwings = buildMomentumSwings(quarters, gameResult);

  const broadcast: BroadcastOutput = {
    gameId: gameResult.id,
    quarters,
    highlights,
    mvpPlayerIds,
    momentumSwings,
    broadcastNetwork: gameResult.broadcastNetwork ?? 'MFN',
    finalNarrative: '',
  };

  broadcast.finalNarrative = generateFinalNarrative(broadcast, homeTeam, awayTeam, gameResult);
  return broadcast;
}
