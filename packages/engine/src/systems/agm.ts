/**
 * AGM — Assistant GM advisory helpers (Sprint 43).
 *
 * Provides weekly recommendation rollups for the Monday Briefing
 * "Show AGM advice" modal. Pure, deterministic, no I/O.
 *
 * Ranking heuristics (in priority order):
 *   1. Urgent injuries      — starters out for 2+ weeks
 *   2. Cap trouble          — team capSpace below $1M
 *   3. Upcoming opponent    — next opponent preview
 *   4. Roster gaps          — positions with <2 healthy players
 */

import type { GameState, Player, Team } from '../types';
import { findUserTeam } from './franchise-week-helpers';
import screenTipsJson from '../../../content/agm/screen-tips.json';

// ── Screen tips (Sprint 43) ───────────────────────────────

export interface AGMScreenTip {
  id: string;
  title: string;
  body: string;
}

interface ScreenTipsShape {
  version: number;
  description: string;
  tips: Record<string, AGMScreenTip>;
}

const SCREEN_TIPS = screenTipsJson as ScreenTipsShape;

/**
 * Return the first-visit tip for a given route, or null if none defined.
 * Pure lookup — no game-state mutation.
 */
export function getScreenTip(route: string): AGMScreenTip | null {
  return SCREEN_TIPS.tips[route] ?? null;
}

// ── Weekly recommendations ────────────────────────────────

export type AGMRecommendationPriority = 'urgent' | 'high' | 'medium' | 'low';

export interface AGMRecommendation {
  id: string;
  priority: AGMRecommendationPriority;
  title: string;
  body: string;
  /** Route/hash the UI may deep-link to. Optional. */
  targetRoute?: string;
}

const CAP_TROUBLE_THRESHOLD = 1_000_000; // $1M — below this, flag cap trouble.
const URGENT_INJURY_GAMES = 2; // 1 game ≈ 1 week in this sim
const ROSTER_GAP_MIN = 2;

function selectedAgmProfileId(game: GameState): string | null {
  return game.frontOffice?.agmProfileId
    ?? game.franchiseBlueprint?.agmProfileId
    ?? game.setupState?.decisions.agmProfileId
    ?? null;
}

/**
 * Build a prioritized list of recommendations for the user team.
 * Returns up to `limit` items (default 3). Deterministic — no RNG.
 */
export function getAGMWeeklyRecommendations(
  game: GameState,
  limit = 3,
): AGMRecommendation[] {
  const team = findUserTeam(game);
  if (!team) return [];

  const recommendations: AGMRecommendation[] = [];
  const agmProfileId = selectedAgmProfileId(game);

  // 1. Urgent injuries
  const injuredStarters = collectUrgentInjuries(game, team);
  if (injuredStarters.length > 0) {
    const names = injuredStarters.slice(0, 2).map((p) => p.name).join(', ');
    recommendations.push({
      id: 'injury_watch',
      priority: 'urgent',
      title: `Injury fix: ${injuredStarters.length} starter${injuredStarters.length === 1 ? '' : 's'} sidelined`,
      body: `${names}${injuredStarters.length > 2 ? ` and ${injuredStarters.length - 2} more` : ''} will miss ${URGENT_INJURY_GAMES}+ weeks. Fix the Depth Chart and add a free agent, waiver claim, or practice-squad player if the backup is not playable.`,
      targetRoute: '/roster',
    });
  }

  // 2. Cap trouble
  if (team.capSpace < CAP_TROUBLE_THRESHOLD) {
    recommendations.push({
      id: 'cap_trouble',
      priority: team.capSpace < 0 ? 'urgent' : 'high',
      title: team.capSpace < 0 ? 'Over the cap' : 'Cap space getting tight',
      body: `You have $${Math.round(team.capSpace / 1000).toLocaleString()}K of cap space. Open Contracts or Cap Lab before signing, trading, or extending; otherwise injury replacements and extensions lose the cap space they need.`,
      targetRoute: '/contracts',
    });
  }

  // 3. Upcoming opponent
  const nextOpponent = findNextOpponent(game, team);
  if (nextOpponent) {
    recommendations.push({
      id: 'next_opponent',
      priority: agmProfileId === 'coach_d_hardaway' ? 'high' : 'medium',
      title: agmProfileId === 'coach_d_hardaway'
        ? `Coach D matchup standard: ${nextOpponent.city} ${nextOpponent.name}`
        : `Scout next opponent: ${nextOpponent.city} ${nextOpponent.name}`,
      body: agmProfileId === 'coach_d_hardaway'
        ? `They are ${nextOpponent.wins}-${nextOpponent.losses}. Set protection, coverage, and run-defense answers before Advance Week; skipping it lets their top matchup attack an exposed starter.`
        : `They are ${nextOpponent.wins}-${nextOpponent.losses}. Open Game Plan before Advance Week to set protection, coverage, and run-defense answers; skipping matchup work leaves a starter exposed where they attack first.`,
      targetRoute: '/game-plan',
    });
  }

  // 4. Roster gaps
  const gaps = collectRosterGaps(team);
  if (gaps.length > 0) {
    recommendations.push({
      id: 'roster_gaps',
      priority: agmProfileId === 'sandra_chen' ? 'high' : 'medium',
      title: agmProfileId === 'sandra_chen'
        ? `Sandra's depth audit: ${gaps.slice(0, 3).join(', ')}`
        : `Depth concerns at ${gaps.slice(0, 3).join(', ')}`,
      body: agmProfileId === 'sandra_chen'
        ? `You have fewer than ${ROSTER_GAP_MIN} healthy players at ${gaps.length > 3 ? 'several positions' : 'these spots'}. Add depth or lower the starter workload before one injury puts an unplanned starter on the field.`
        : `You have fewer than ${ROSTER_GAP_MIN} healthy players at ${gaps.length > 3 ? 'several positions' : 'these spots'}. Open Team Needs, waivers, or practice squad before Advance Week; one injury puts an unassigned backup in the next game.`,
      targetRoute: '/team-needs',
    });
  }

  const activeMandates = (game.ownerMandates ?? []).filter((mandate) =>
    mandate.teamId === team.id && mandate.status === 'active');
  const capMandate = activeMandates.find((mandate) => mandate.goalId === 'cap_health');
  if (agmProfileId === 'marcus_webb' && capMandate && !recommendations.some((rec) => rec.id === 'cap_trouble')) {
    recommendations.push({
      id: 'marcus_cap_mandate',
      priority: capMandate.progress.status === 'at_risk' ? 'high' : 'medium',
      title: `Cap mandate: ${capMandate.progress.label}`,
      body: `${capMandate.progress.detail} Open Contracts or Cap Lab before Advance Week; missing this mandate cuts owner patience at season end.`,
      targetRoute: '/owner',
    });
  }

  const developmentMandate = activeMandates.find((mandate) =>
    mandate.goalId === 'rebuild_progress' || mandate.goalId === 'draft_well');
  if (agmProfileId === 'sandra_chen' && developmentMandate) {
    recommendations.push({
      id: 'sandra_development_mandate',
      priority: developmentMandate.progress.status === 'at_risk' ? 'high' : 'medium',
      title: `Development mandate: ${developmentMandate.progress.label}`,
      body: `${developmentMandate.progress.detail} Keep young players in assigned weekly jobs before Advance Week; changing snaps too often fails the development goal.`,
      targetRoute: '/roster',
    });
  }

  // Priority sort, then clip
  const order: Record<AGMRecommendationPriority, number> = {
    urgent: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  recommendations.sort((a, b) => order[a.priority] - order[b.priority]);
  return recommendations.slice(0, Math.max(0, limit));
}

function collectUrgentInjuries(game: GameState, team: Team): Player[] {
  const injured: Player[] = [];
  for (const player of team.roster) {
    const full = game.players[player.id] ?? player;
    if (full.injury && typeof full.injury.gamesOut === 'number' && full.injury.gamesOut >= URGENT_INJURY_GAMES) {
      injured.push(full);
    }
  }
  return injured;
}

function findNextOpponent(game: GameState, team: Team): Team | null {
  const week = game.week;
  for (let i = 0; i < game.schedule.length; i += 1) {
    const scheduleWeek = game.schedule[i];
    if (!scheduleWeek || scheduleWeek.week < week) continue;
    for (const matchup of scheduleWeek.games ?? []) {
      const isHome = matchup.homeTeamId === team.id;
      const isAway = matchup.awayTeamId === team.id;
      if (!isHome && !isAway) continue;
      const opponentId = isHome ? matchup.awayTeamId : matchup.homeTeamId;
      return game.teams[opponentId] ?? null;
    }
  }
  return null;
}

function collectRosterGaps(team: Team): string[] {
  const counts: Record<string, number> = {};
  for (const player of team.roster) {
    if (player.injury && typeof player.injury.gamesOut === 'number' && player.injury.gamesOut >= URGENT_INJURY_GAMES) continue;
    counts[player.pos] = (counts[player.pos] ?? 0) + 1;
  }
  const keyPositions = ['QB', 'RB', 'WR', 'TE', 'OL', 'LT', 'RT', 'C', 'DL', 'DE', 'DT', 'LB', 'CB', 'S'];
  const gaps: string[] = [];
  for (const pos of keyPositions) {
    if ((counts[pos] ?? 0) < ROSTER_GAP_MIN) {
      gaps.push(pos);
    }
  }
  return gaps;
}
