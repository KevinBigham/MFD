/**
 * MFD Owner Goals System
 *
 * Defines owner goal templates plus durable owner mandates created during
 * franchise setup. Mandates carry selected IDs/slots through weekly progress,
 * season-end evaluation, owner consequences, and reporting.
 */

import type {
  GameState,
  Handshake,
  OwnerMandate,
  OwnerMandateProgress,
  OwnerMandateSlot,
  Team,
} from '../types';

// ── Owner Types ────────────────────────────────────────

export type OwnerType = 'patient' | 'win_now' | 'penny';

export const OWNER_TYPES: Record<OwnerType, { label: string; desc: string }> = {
  patient: { label: 'Patient', desc: 'Willing to wait for long-term results.' },
  win_now: { label: 'Win Now', desc: 'Demands immediate contention.' },
  penny: { label: 'Penny Pincher', desc: 'Obsessed with cap efficiency.' },
};

// ── Goal Definitions ───────────────────────────────────

export interface OwnerGoal {
  id: string;
  label: string;
  desc: string;
  check: (team: Team) => boolean;
  exceed: (team: Team) => boolean;
}

export const OWNER_GOALS: readonly OwnerGoal[] = [
  {
    id: 'win_division',
    label: 'Win Division',
    desc: 'Finish first in the division.',
    check: (t) => t.wins >= 10,
    exceed: (t) => t.wins >= 13,
  },
  {
    id: 'playoff_berth',
    label: 'Make Playoffs',
    desc: 'Qualify for the postseason.',
    check: (t) => t.wins >= 9,
    exceed: (t) => t.wins >= 12,
  },
  {
    id: 'winning_record',
    label: 'Winning Record',
    desc: 'Finish above .500.',
    check: (t) => t.wins > t.losses,
    exceed: (t) => t.wins >= 11,
  },
  {
    id: 'rebuild_progress',
    label: 'Rebuild Progress',
    desc: 'Develop young talent on the roster.',
    check: (t) => t.roster.filter((p) => p.age <= 25 && p.ovr >= 70).length >= 5,
    exceed: (t) => t.roster.filter((p) => p.age <= 25 && p.ovr >= 75).length >= 3,
  },
  {
    id: 'cap_health',
    label: 'Cap Health',
    desc: 'Maintain healthy salary cap position.',
    check: (t) => t.capSpace >= 20 && t.deadCap <= 10,
    exceed: (t) => t.capSpace >= 40 && t.deadCap <= 5,
  },
  {
    id: 'star_power',
    label: 'Star Power',
    desc: 'Keep marquee talent on the roster.',
    check: (t) => t.roster.filter((p) => p.ovr >= 85).length >= 3,
    exceed: (t) => t.roster.filter((p) => p.ovr >= 85).length >= 5,
  },
  {
    id: 'no_losing_streak',
    label: 'No Losing Streaks',
    desc: 'Avoid extended losing skids.',
    check: (t) => (t.streak ?? 0) >= -2,
    exceed: (t) => t.losses <= 4,
  },
  {
    id: 'draft_well',
    label: 'Draft Well',
    desc: 'Develop drafted players into contributors.',
    check: (t) => t.roster.filter((p) => p.yearsExp <= 2 && p.ovr >= 68).length >= 3,
    exceed: (t) => t.roster.filter((p) => p.yearsExp <= 2 && p.ovr >= 75).length >= 2,
  },
  {
    id: 'championship',
    label: 'Win Championship',
    desc: 'Win the league championship.',
    check: (t) => t.wins >= 13,
    exceed: (t) => t.wins >= 15,
  },
] as const;

export type OwnerGoalId = (typeof OWNER_GOALS)[number]['id'];

export interface GoalResult {
  goal: OwnerGoal;
  met: boolean;
  exceeded: boolean;
}

interface GoalSnapshot {
  progress: OwnerMandateProgress;
  met: boolean;
  exceeded: boolean;
  outcomeLabel: string;
}

const MANDATE_SLOTS: readonly OwnerMandateSlot[] = ['floor', 'target', 'ceiling'] as const;
const COMPETITIVE_GOALS = new Set(['championship', 'win_division', 'playoff_berth', 'winning_record', 'no_losing_streak']);
const PERSONNEL_GOALS = new Set(['rebuild_progress', 'draft_well', 'star_power']);

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function goalEntry(goalId: string): OwnerGoal {
  return OWNER_GOALS.find((goal) => goal.id === goalId) ?? {
    id: goalId,
    label: goalId,
    desc: '',
    check: () => false,
    exceed: () => false,
  };
}

function selectedAgmProfileId(game: GameState): string | null {
  return game.frontOffice.agmProfileId
    ?? game.franchiseBlueprint?.agmProfileId
    ?? game.setupState?.decisions.agmProfileId
    ?? null;
}

function pct(value: number, target: number): number {
  if (target <= 0) return value > 0 ? 100 : 0;
  return clamp(Math.round((value / target) * 100), 0, 100);
}

function record(team: Team): string {
  return `${team.wins}-${team.losses}${team.ties ? `-${team.ties}` : ''}`;
}

function latestHistory(game: GameState, teamId: string, year: number) {
  return game.franchiseHistory.find((entry) => entry.teamId === teamId && entry.year === year)
    ?? game.franchiseHistory
      .filter((entry) => entry.teamId === teamId)
      .sort((left, right) => right.year - left.year)[0]
    ?? null;
}

function playoffFinish(game: GameState, teamId: string, year: number): string {
  const history = latestHistory(game, teamId, year);
  if (history) return history.playoffFinish;
  if (game.playoffBracket?.championTeamId === teamId) return 'champion';
  const seed = [...(game.playoffBracket?.afc ?? []), ...(game.playoffBracket?.nfc ?? [])]
    .find((entry) => entry.teamId === teamId);
  return seed ? 'playoff_team' : 'regular_season';
}

function madePlayoffs(finish: string): boolean {
  return finish !== 'missed_playoffs' && finish !== 'regular_season';
}

function playoffScore(finish: string): number {
  switch (finish) {
    case 'champion':
      return 100;
    case 'conference':
      return 80;
    case 'divisional':
      return 65;
    case 'wild_card':
    case 'playoff_team':
      return 50;
    default:
      return 0;
  }
}

function divisionRows(game: GameState, team: Team): Team[] {
  return Object.values(game.teams)
    .filter((entry) => entry.conference === team.conference && entry.division === team.division)
    .sort((left, right) => {
      const leftGames = Math.max(1, left.wins + left.losses + left.ties);
      const rightGames = Math.max(1, right.wins + right.losses + right.ties);
      const leftPct = (left.wins + left.ties * 0.5) / leftGames;
      const rightPct = (right.wins + right.ties * 0.5) / rightGames;
      return rightPct - leftPct
        || right.wins - left.wins
        || right.seasonStats.pointDifferential - left.seasonStats.pointDifferential
        || left.id.localeCompare(right.id);
    });
}

function divisionRank(game: GameState, team: Team): number {
  const rows = divisionRows(game, team);
  const index = rows.findIndex((entry) => entry.id === team.id);
  return index >= 0 ? index + 1 : rows.length;
}

function maxLosingStreak(game: GameState, teamId: string, year: number): number {
  let current = 0;
  let worst = Math.max(0, -(game.teams[teamId]?.streak ?? 0));
  const results = game.schedule
    .flatMap((week) => week.games.map((matchup) => ({ week: week.week, result: matchup.result })))
    .filter((entry) => entry.result?.year === year)
    .filter((entry) => entry.result?.homeTeamId === teamId || entry.result?.awayTeamId === teamId)
    .sort((left, right) => left.week - right.week);

  for (const entry of results) {
    const result = entry.result!;
    const isHome = result.homeTeamId === teamId;
    const teamScore = isHome ? result.homeScore : result.awayScore;
    const opponentScore = isHome ? result.awayScore : result.homeScore;
    if (teamScore < opponentScore) {
      current += 1;
      worst = Math.max(worst, current);
    } else {
      current = 0;
    }
  }
  return worst;
}

function developmentGain(player: Team['roster'][number]): number {
  const previous = Number(player.careerStats.previousSeasonOvr ?? player.ovr);
  return Math.max(0, player.ovr - previous);
}

function youngDevelopment(team: Team): { contributors: number; highEnd: number; gain: number } {
  const young = team.roster.filter((player) => player.age <= 25 || player.yearsExp <= 3);
  return {
    contributors: young.filter((player) => player.ovr >= 70 || developmentGain(player) >= 2).length,
    highEnd: young.filter((player) => player.ovr >= 75 || developmentGain(player) >= 4).length,
    gain: young.reduce((sum, player) => sum + developmentGain(player), 0),
  };
}

function draftedDevelopment(team: Team, year: number): { contributors: number; highEnd: number; starters: number } {
  const pool = team.roster.filter((player) => player.draftYear === year || player.yearsExp <= 2);
  return {
    contributors: pool.filter((player) => player.ovr >= 68 || player.isStarter).length,
    highEnd: pool.filter((player) => player.ovr >= 75 || developmentGain(player) >= 4).length,
    starters: pool.filter((player) => player.isStarter).length,
  };
}

function progressStatus(met: boolean, failed: boolean, percent: number): OwnerMandateProgress['status'] {
  if (met) return 'complete';
  if (failed) return 'failed';
  return percent >= 70 ? 'on_track' : 'at_risk';
}

function withAgmNote(game: GameState, goalId: string, progress: OwnerMandateProgress): OwnerMandateProgress {
  const agmId = selectedAgmProfileId(game);
  if (agmId === 'marcus_webb' && goalId === 'cap_health') {
    return { ...progress, agmNote: 'Marcus Webb is giving ownership a clearer cap-health readout.' };
  }
  if (agmId === 'coach_d_hardaway' && COMPETITIVE_GOALS.has(goalId)) {
    return { ...progress, agmNote: "Coach D is tying this promise directly to weekly standards." };
  }
  if (agmId === 'sandra_chen' && PERSONNEL_GOALS.has(goalId)) {
    return { ...progress, agmNote: 'Sandra Chen is tracking the player-development proof behind this mandate.' };
  }
  return progress;
}

function goalSnapshot(game: GameState, team: Team, goalId: string, year: number, final = false): GoalSnapshot {
  const finish = playoffFinish(game, team.id, year);
  const failed = final;

  if (goalId === 'championship') {
    const score = playoffScore(finish);
    const met = finish === 'champion';
    return {
      met,
      exceeded: met,
      outcomeLabel: finish.replaceAll('_', ' '),
      progress: withAgmNote(game, goalId, {
        value: score,
        target: 100,
        percent: score,
        label: met ? 'Champion' : madePlayoffs(finish) ? `Reached ${finish.replaceAll('_', ' ')}` : 'Not in title position',
        detail: 'Requires an actual championship finish.',
        status: progressStatus(met, failed && !met, score),
      }),
    };
  }

  if (goalId === 'win_division') {
    const rank = divisionRank(game, team);
    const met = rank === 1;
    const percent = pct(Math.max(0, divisionRows(game, team).length - rank + 1), divisionRows(game, team).length);
    return {
      met,
      exceeded: met && (team.wins >= 12 || ['divisional', 'conference', 'champion'].includes(finish)),
      outcomeLabel: `Division rank ${rank}`,
      progress: withAgmNote(game, goalId, {
        value: divisionRows(game, team).length - rank + 1,
        target: divisionRows(game, team).length,
        percent,
        label: `Division rank ${rank}`,
        detail: `${record(team)} in the ${team.division}.`,
        status: progressStatus(met, failed && !met, percent),
      }),
    };
  }

  if (goalId === 'playoff_berth') {
    const met = madePlayoffs(finish);
    const score = met ? 100 : pct(team.wins, 9);
    return {
      met,
      exceeded: ['conference', 'champion'].includes(finish),
      outcomeLabel: met ? finish.replaceAll('_', ' ') : record(team),
      progress: withAgmNote(game, goalId, {
        value: met ? 1 : team.wins,
        target: met ? 1 : 9,
        percent: score,
        label: met ? 'Playoff berth secured' : `${record(team)} playoff chase`,
        detail: 'Evaluated by actual postseason qualification.',
        status: progressStatus(met, failed && !met, score),
      }),
    };
  }

  if (goalId === 'winning_record') {
    const met = team.wins > team.losses;
    const games = Math.max(1, team.wins + team.losses + team.ties);
    const winPct = Math.round(((team.wins + team.ties * 0.5) / games) * 100);
    return {
      met,
      exceeded: met && (team.wins >= 11 || winPct >= 65),
      outcomeLabel: record(team),
      progress: withAgmNote(game, goalId, {
        value: team.wins,
        target: team.losses + 1,
        percent: clamp(winPct * 2, 0, 100),
        label: record(team),
        detail: 'Needs more wins than losses at the finish.',
        status: progressStatus(met, failed && !met, clamp(winPct * 2, 0, 100)),
      }),
    };
  }

  if (goalId === 'cap_health') {
    const capScore = clamp(Math.round(team.capSpace * 2 - team.deadCap), 0, 100);
    const met = team.capSpace >= 20 && team.deadCap <= 10;
    return {
      met,
      exceeded: team.capSpace >= 40 && team.deadCap <= 5,
      outcomeLabel: `$${team.capSpace.toFixed(1)}M space / $${team.deadCap.toFixed(1)}M dead`,
      progress: withAgmNote(game, goalId, {
        value: Math.round(team.capSpace * 10) / 10,
        target: 20,
        percent: capScore,
        label: `$${team.capSpace.toFixed(1)}M cap space`,
        detail: `$${team.deadCap.toFixed(1)}M dead cap; target is $20M+ space and <= $10M dead.`,
        status: progressStatus(met, failed && !met, capScore),
      }),
    };
  }

  if (goalId === 'star_power') {
    const stars = team.roster.filter((player) => player.ovr >= 85).length;
    const elite = team.roster.filter((player) => player.ovr >= 90).length;
    const met = stars >= 3;
    return {
      met,
      exceeded: stars >= 5 || elite >= 2,
      outcomeLabel: `${stars} star players`,
      progress: withAgmNote(game, goalId, {
        value: stars,
        target: 3,
        percent: pct(stars, 3),
        label: `${stars} players at 85+ OVR`,
        detail: `${elite} elite 90+ OVR player${elite === 1 ? '' : 's'} on roster.`,
        status: progressStatus(met, failed && !met, pct(stars, 3)),
      }),
    };
  }

  if (goalId === 'rebuild_progress') {
    const dev = youngDevelopment(team);
    const value = Math.max(dev.contributors, Math.floor(dev.gain / 2));
    const met = dev.contributors >= 5 || dev.gain >= 8;
    return {
      met,
      exceeded: dev.highEnd >= 3 && dev.gain >= 10,
      outcomeLabel: `${dev.contributors} young contributors`,
      progress: withAgmNote(game, goalId, {
        value,
        target: 5,
        percent: pct(value, 5),
        label: `${dev.contributors} young contributors`,
        detail: `Young roster gained ${dev.gain.toFixed(1)} OVR from prior-season baselines.`,
        status: progressStatus(met, failed && !met, pct(value, 5)),
      }),
    };
  }

  if (goalId === 'draft_well') {
    const draft = draftedDevelopment(team, year);
    const value = Math.max(draft.contributors, draft.starters);
    const met = draft.contributors >= 3 || (draft.starters >= 1 && draft.highEnd >= 1);
    return {
      met,
      exceeded: draft.highEnd >= 2 || draft.starters >= 3,
      outcomeLabel: `${draft.contributors} drafted contributors`,
      progress: withAgmNote(game, goalId, {
        value,
        target: 3,
        percent: pct(value, 3),
        label: `${draft.contributors} young/drafted contributors`,
        detail: `${draft.starters} starter${draft.starters === 1 ? '' : 's'} from the current or recent draft pipeline.`,
        status: progressStatus(met, failed && !met, pct(value, 3)),
      }),
    };
  }

  if (goalId === 'no_losing_streak') {
    const worst = maxLosingStreak(game, team.id, year);
    const met = worst <= 2;
    return {
      met,
      exceeded: worst <= 1 && team.losses <= 4,
      outcomeLabel: `${worst}-game worst losing streak`,
      progress: withAgmNote(game, goalId, {
        value: Math.max(0, 3 - worst),
        target: 3,
        percent: clamp(100 - worst * 34, 0, 100),
        label: `${worst}-game worst losing streak`,
        detail: 'Mandate fails when the season produces a 3+ game skid.',
        status: progressStatus(met, failed && !met, clamp(100 - worst * 34, 0, 100)),
      }),
    };
  }

  const goal = goalEntry(goalId);
  const met = goal.check(team);
  const exceeded = goal.exceed(team);
  return {
    met,
    exceeded,
    outcomeLabel: met ? 'Met' : 'Not met',
    progress: withAgmNote(game, goalId, {
      value: met ? 1 : 0,
      target: 1,
      percent: met ? 100 : 0,
      label: met ? 'Met' : 'Not met',
      detail: goal.desc,
      status: progressStatus(met, failed && !met, met ? 100 : 0),
    }),
  };
}

function slotLabel(slot: OwnerMandateSlot): string {
  if (slot === 'floor') return 'Floor';
  if (slot === 'target') return 'Target';
  return 'Ceiling';
}

function categoryForGoal(goalId: string): 'cap' | 'competitive' | 'personnel' | 'mandate' {
  if (goalId === 'cap_health') return 'cap';
  if (COMPETITIVE_GOALS.has(goalId)) return 'competitive';
  if (PERSONNEL_GOALS.has(goalId)) return 'personnel';
  return 'mandate';
}

function baseConsequence(slot: OwnerMandateSlot, snapshot: GoalSnapshot): {
  approvalDelta: number;
  patienceDelta: number;
  ownerReputationDelta: number;
} {
  if (!snapshot.met) {
    if (slot === 'floor') {
      return { approvalDelta: -12, patienceDelta: -8, ownerReputationDelta: -10 };
    }
    if (slot === 'target') {
      return { approvalDelta: -3, patienceDelta: -2, ownerReputationDelta: -3 };
    }
    return { approvalDelta: -1, patienceDelta: 0, ownerReputationDelta: -1 };
  }

  if (slot === 'floor') {
    return { approvalDelta: snapshot.exceeded ? 2 : 0, patienceDelta: 1, ownerReputationDelta: 1 };
  }
  if (slot === 'target') {
    return {
      approvalDelta: snapshot.exceeded ? 8 : 6,
      patienceDelta: snapshot.exceeded ? 4 : 3,
      ownerReputationDelta: snapshot.exceeded ? 7 : 5,
    };
  }
  return {
    approvalDelta: snapshot.exceeded ? 14 : 10,
    patienceDelta: snapshot.exceeded ? 7 : 5,
    ownerReputationDelta: snapshot.exceeded ? 11 : 8,
  };
}

function applyAgmConsequenceAdjustment(
  game: GameState,
  mandate: OwnerMandate,
  snapshot: GoalSnapshot,
  deltas: { approvalDelta: number; patienceDelta: number; ownerReputationDelta: number },
): { approvalDelta: number; patienceDelta: number; ownerReputationDelta: number; note: string | null } {
  const agmId = mandate.createdByAGMProfileId ?? selectedAgmProfileId(game);
  if (agmId === 'marcus_webb' && mandate.goalId === 'cap_health') {
    return {
      approvalDelta: deltas.approvalDelta + (snapshot.met ? 2 : -2),
      patienceDelta: deltas.patienceDelta,
      ownerReputationDelta: deltas.ownerReputationDelta + (snapshot.met ? 2 : -2),
      note: snapshot.met
        ? 'Marcus Webb converted cap discipline into extra owner trust.'
        : 'Marcus Webb made the cap-health miss harder to excuse.',
    };
  }
  if (agmId === 'coach_d_hardaway' && COMPETITIVE_GOALS.has(mandate.goalId)) {
    return {
      approvalDelta: deltas.approvalDelta + (snapshot.met ? 1 : mandate.slot === 'floor' ? -3 : -2),
      patienceDelta: deltas.patienceDelta,
      ownerReputationDelta: deltas.ownerReputationDelta + (snapshot.met ? 1 : -2),
      note: snapshot.met
        ? 'Coach D sold the competitive standard and ownership noticed.'
        : 'Coach D raised the accountability bar on competitive promises.',
    };
  }
  if (agmId === 'sandra_chen' && PERSONNEL_GOALS.has(mandate.goalId)) {
    return {
      approvalDelta: deltas.approvalDelta + (snapshot.met ? 2 : -2),
      patienceDelta: deltas.patienceDelta + (snapshot.met ? 1 : -1),
      ownerReputationDelta: deltas.ownerReputationDelta + (snapshot.met ? 2 : -2),
      note: snapshot.met
        ? 'Sandra Chen turned player-development proof into extra patience.'
        : 'Sandra Chen made the personnel-development miss more visible.',
    };
  }
  return { ...deltas, note: null };
}

function pushAgmImpact(
  game: GameState,
  mandate: OwnerMandate,
  summary: string,
): void {
  const agmProfileId = mandate.createdByAGMProfileId ?? selectedAgmProfileId(game);
  if (!agmProfileId) return;
  game.frontOffice.agmImpactLog ??= [];
  game.frontOffice.agmImpactLog = [
    ...game.frontOffice.agmImpactLog,
    {
      id: `agm-impact:${mandate.id}:${game.year}:${game.week}`,
      year: game.year,
      week: game.week,
      agmProfileId,
      category: categoryForGoal(mandate.goalId),
      summary,
    },
  ].slice(-20);
}

function applyMandateConsequences(game: GameState, mandate: OwnerMandate, snapshot: GoalSnapshot): void {
  const team = game.teams[mandate.teamId];
  if (!team) return;
  const owner = game.owners[team.ownerId] ?? null;
  const base = baseConsequence(mandate.slot, snapshot);
  const adjusted = applyAgmConsequenceAdjustment(game, mandate, snapshot, base);

  team.owner.approval = clamp(team.owner.approval + adjusted.approvalDelta, 0, 100);
  team.ownerMood = team.owner.approval;
  team.ownerPatience80 = clamp(team.ownerPatience80 + adjusted.patienceDelta, 0, 100);
  if (owner) {
    owner.patience = clamp(owner.patience + adjusted.patienceDelta, 0, 100);
  }
  if (team.isUser) {
    game.frontOffice.reputation.owner = clamp(
      game.frontOffice.reputation.owner + adjusted.ownerReputationDelta,
      0,
      100,
    );
  }

  const summary = snapshot.met
    ? `${slotLabel(mandate.slot)} mandate "${mandate.label}" landed: ${snapshot.outcomeLabel}.`
    : `${slotLabel(mandate.slot)} mandate "${mandate.label}" missed: ${snapshot.outcomeLabel}.`;

  mandate.evaluation = {
    evaluatedYear: mandate.year,
    met: snapshot.met,
    exceeded: snapshot.exceeded,
    outcomeLabel: snapshot.outcomeLabel,
    summary,
    approvalDelta: adjusted.approvalDelta,
    patienceDelta: adjusted.patienceDelta,
    ownerReputationDelta: adjusted.ownerReputationDelta,
    applied: true,
    agmAdjustment: adjusted.note,
  };

  pushAgmImpact(game, mandate, adjusted.note ?? summary);
}

export function evaluateGoals(team: Team, goalIds: readonly string[]): GoalResult[] {
  return goalIds.map((gid) => {
    const goal = goalEntry(gid);
    return {
      goal,
      met: goal.check(team),
      exceeded: goal.exceed(team),
    };
  });
}

export function buildOwnerMandates(
  game: GameState,
  teamId: string,
  goalIds: readonly string[],
  agmProfileId: string | null = selectedAgmProfileId(game),
): OwnerMandate[] {
  const team = game.teams[teamId];
  if (!team) return [];

  return goalIds.slice(0, 3).map((goalId, index) => {
    const goal = goalEntry(goalId);
    const slot = MANDATE_SLOTS[index] ?? 'ceiling';
    const snapshot = goalSnapshot(game, team, goal.id, game.year, false);
    return {
      id: `mandate:${teamId}:${game.year}:${slot}:${goal.id}`,
      teamId,
      year: game.year,
      goalId: goal.id,
      label: goal.label,
      description: goal.desc,
      slot,
      selectedIndex: index,
      createdWeek: game.week,
      createdByAGMProfileId: agmProfileId,
      status: 'active',
      progress: snapshot.progress,
      evaluation: null,
    };
  });
}

export function refreshOwnerMandates(game: GameState, teamId?: string): OwnerMandate[] {
  game.ownerMandates ??= [];
  for (const mandate of game.ownerMandates) {
    if (teamId && mandate.teamId !== teamId) continue;
    if (mandate.status !== 'active') continue;
    const team = game.teams[mandate.teamId];
    if (!team) continue;
    mandate.progress = goalSnapshot(game, team, mandate.goalId, mandate.year, false).progress;
  }
  return game.ownerMandates;
}

export function evaluateOwnerMandates(game: GameState, teamId?: string): OwnerMandate[] {
  game.ownerMandates ??= [];
  for (const mandate of game.ownerMandates) {
    if (teamId && mandate.teamId !== teamId) continue;
    if (mandate.evaluation?.applied) continue;
    const team = game.teams[mandate.teamId];
    if (!team) continue;
    const snapshot = goalSnapshot(game, team, mandate.goalId, mandate.year, true);
    mandate.progress = snapshot.progress;
    mandate.status = snapshot.met
      ? mandate.slot === 'ceiling' || snapshot.exceeded ? 'exceeded' : 'met'
      : 'missed';
    applyMandateConsequences(game, mandate, snapshot);
  }
  return game.ownerMandates;
}

export function installOwnerMandates(
  game: GameState,
  teamId: string,
  goalIds: readonly string[],
  agmProfileId: string | null = selectedAgmProfileId(game),
): OwnerMandate[] {
  if (agmProfileId) {
    game.frontOffice.agmProfileId = agmProfileId;
  }
  const mandates = buildOwnerMandates(game, teamId, goalIds, agmProfileId);
  const mandateIds = new Set(mandates.map((mandate) => mandate.id));
  game.ownerMandates = [
    ...(game.ownerMandates ?? []).filter((mandate) =>
      !(mandate.teamId === teamId && mandate.year === game.year) && !mandateIds.has(mandate.id)),
    ...mandates,
  ];
  upsertOwnerMandateHandshakes(game, mandates);
  return mandates;
}

export function upsertOwnerMandateHandshakes(game: GameState, mandates: readonly OwnerMandate[]): Handshake[] {
  game.handshakes ??= [];
  const mandateIds = new Set(mandates.map((mandate) => mandate.id));
  game.handshakes = game.handshakes.filter((handshake) =>
    !(handshake.condition.metric === 'owner_mandate' && mandateIds.has(String(handshake.condition.target))));

  const handshakes = mandates.map((mandate): Handshake => ({
    id: `owner-mandate:${mandate.id}`,
    type: 'owner',
    promiseText: `${slotLabel(mandate.slot)} mandate: ${mandate.label}.`,
    targetId: mandate.id,
    teamId: mandate.teamId,
    madeYear: mandate.year,
    madeWeek: mandate.createdWeek,
    deadline: { year: mandate.year, week: 18 },
    condition: { metric: 'owner_mandate', target: mandate.id },
    status: 'active',
    consequence: mandate.slot === 'floor'
      ? 'Missing this floor will hit owner approval, patience, and owner reputation.'
      : mandate.slot === 'target'
        ? 'Meeting this target rewards owner approval and front-office reputation.'
        : 'Delivering this ceiling creates the largest owner reward and report highlight.',
  }));
  game.handshakes.push(...handshakes);
  return handshakes;
}
