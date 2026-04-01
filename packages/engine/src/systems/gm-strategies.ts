/**
 * MFD GM Strategies System
 *
 * Three strategic postures (rebuild, contend, neutral) that
 * influence AI trade behavior and roster management.
 */

import type { Team, GmStrategy } from '../types';

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
