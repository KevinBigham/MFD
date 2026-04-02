/**
 * MFD GM Strategies System
 *
 * Three strategic postures (rebuild, contend, neutral) that
 * influence AI trade behavior and roster management.
 */

import type { GameEvent, GameState, Team, GmStrategy } from '../types';

// ── Strategy Definitions ───────────────────────────────

export interface GmStrategyDef {
  id: GmStrategy;
  label: string;
  desc: string;
  tradePosture: 'seller' | 'buyer' | 'neutral';
  youthBias: boolean;
  capMode: 'flexible' | 'aggressive' | 'balanced';
}

export const GM_STRATEGIES: Record<GmStrategy, GmStrategyDef> = {
  rebuild: {
    id: 'rebuild',
    label: 'Rebuild',
    desc: 'Shop veterans, stockpile picks, develop youth.',
    tradePosture: 'seller',
    youthBias: true,
    capMode: 'flexible',
  },
  contend: {
    id: 'contend',
    label: 'Contend',
    desc: 'Buy rentals, keep stars, push for a championship now.',
    tradePosture: 'buyer',
    youthBias: false,
    capMode: 'aggressive',
  },
  neutral: {
    id: 'neutral',
    label: 'Neutral',
    desc: 'Balanced approach, no strong buying or selling bias.',
    tradePosture: 'neutral',
    youthBias: false,
    capMode: 'balanced',
  },
};

// ── Strategy Application ───────────────────────────────

export function applyGmStrategy(team: Team, strategyId: GmStrategy): GmStrategyDef {
  const strategy = GM_STRATEGIES[strategyId] ?? GM_STRATEGIES.neutral;
  team.gmStrategy = strategyId;

  for (const p of team.roster) {
    switch (strategyId) {
      case 'rebuild':
        p.tradeBlock = p.age >= 28 && p.ovr >= 72;
        break;

      case 'contend':
        p.tradeBlock = p.ovr < 65 && p.age >= 26;
        break;

      case 'neutral':
        p.tradeBlock = false;
        break;
    }
  }

  return strategy;
}

// ── Strategy Suggestion ────────────────────────────────

export function suggestStrategy(team: Team): GmStrategy {
  const avgOvr = team.roster.length > 0
    ? team.roster.reduce((s, p) => s + p.ovr, 0) / team.roster.length
    : 65;
  const avgAge = team.roster.length > 0
    ? team.roster.reduce((s, p) => s + p.age, 0) / team.roster.length
    : 26;
  const wp = (team.wins + team.losses) > 0
    ? team.wins / (team.wins + team.losses)
    : 0.5;

  if (wp >= 0.6 && avgOvr >= 75) return 'contend';
  if (wp <= 0.35 || avgAge >= 29) return 'rebuild';
  return 'neutral';
}

export function evaluateStrategy(team: Team): GmStrategy {
  const avgOvr = team.roster.length > 0
    ? team.roster.reduce((sum, player) => sum + player.ovr, 0) / team.roster.length
    : 65;
  const avgAge = team.roster.length > 0
    ? team.roster.reduce((sum, player) => sum + player.age, 0) / team.roster.length
    : 26;
  const winPct = (team.wins + team.losses + team.ties) > 0
    ? (team.wins + team.ties * 0.5) / (team.wins + team.losses + team.ties)
    : 0.5;
  const youngStars = team.roster.filter((player) => player.age <= 25 && player.ovr > 80).length;

  if (team.gmStrategy === 'rebuild' && avgOvr > 78 && youngStars >= 3) {
    return 'contend';
  }

  if (team.gmStrategy === 'contend' && winPct < 0.4 && avgAge > 28) {
    return 'rebuild';
  }

  if (team.gmStrategy === 'neutral') {
    if (winPct >= 0.6 && avgOvr >= 78) return 'contend';
    if (winPct < 0.4 && avgAge > 28) return 'rebuild';
  }

  return team.gmStrategy;
}

function recentSeasonTrend(game: GameState, teamId: string): number {
  const recent = game.franchiseHistory
    .filter((entry) => entry.teamId === teamId)
    .sort((a, b) => b.year - a.year)
    .slice(0, 2);

  if (recent.length < 2) return 0;

  if (recent.every((entry) => entry.wins > entry.losses)) return 1;
  if (recent.every((entry) => entry.wins < entry.losses)) return -1;
  return 0;
}

export function reevaluateLeagueStrategies(game: GameState): GameEvent[] {
  const events: GameEvent[] = [];

  for (const team of Object.values(game.teams)) {
    if (team.isUser) continue;

    let nextStrategy = evaluateStrategy(team);
    if (team.gmStrategy === 'neutral') {
      const trend = recentSeasonTrend(game, team.id);
      if (trend > 0) nextStrategy = 'contend';
      if (trend < 0) nextStrategy = 'rebuild';
    }

    if (nextStrategy === team.gmStrategy) continue;

    const previous = team.gmStrategy;
    applyGmStrategy(team, nextStrategy);
    const description = `${team.city} shifts from ${previous} to ${nextStrategy}.`;
    const event: GameEvent = {
      id: `gm-strategy-${team.id}-${game.year}-${events.length}`,
      type: 'gm_strategy_shift',
      timestamp: game.year * 1000 + game.eventLog.length + events.length,
      description,
      data: { teamId: team.id, from: previous, to: nextStrategy },
    };
    events.push(event);
    game.narrativeState.recentHeadlines = [description, ...game.narrativeState.recentHeadlines].slice(0, 8);
  }

  return events;
}
