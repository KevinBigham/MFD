/**
 * MFD GM Reputation System
 *
 * Three-axis reputation scoring (fair dealer, aggressive, loyalty)
 * with tiered labels and colors.
 */

import { avg } from '../utils';
import { cl } from '../utils';
import type { TradeState, TransactionLogEntry } from '../types';

// ── Reputation Calculation ─────────────────────────────

export interface GmReputation {
  fairDealer: number;
  aggressive: number;
  loyalty: number;
  overall: number;
}

export function calculateReputation(
  txLog: readonly TransactionLogEntry[],
  tradeState: TradeState | null,
): GmReputation {
  const trades = txLog.filter((tx) => tx.type === 'TRADE');
  const signs = txLog.filter((tx) => tx.type === 'SIGN_FA');

  const fairDealer = cl(50 + trades.length * 2, 0, 100);
  const aggressive = cl(30 + trades.length * 3 + signs.length, 0, 100);

  let loyalty = 50;
  if (tradeState?.gmTrustByTeam) {
    const values = Object.values(tradeState.gmTrustByTeam);
    if (values.length > 0) {
      loyalty = Math.round(avg(values));
    }
  }

  const overall = Math.round((fairDealer + aggressive + loyalty) / 3);

  return { fairDealer, aggressive, loyalty, overall };
}

// ── Reputation Labels ──────────────────────────────────

export interface RepLabel {
  label: string;
  icon: string;
  color: string;
}

export function getRepLabel(score: number): RepLabel {
  if (score >= 85) return { label: 'Elite GM', icon: 'crown', color: 'gold' };
  if (score >= 70) return { label: 'Respected', icon: 'handshake', color: 'green' };
  if (score >= 50) return { label: 'Average', icon: 'clipboard', color: 'slate' };
  if (score >= 30) return { label: 'Questionable', icon: 'help-circle', color: 'amber' };
  return { label: 'Untrusted', icon: 'alert-triangle', color: 'red' };
}
