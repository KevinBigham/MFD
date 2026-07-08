import React from 'react';
import { pixelSm, monoSm } from '../shared/pixelUi';

interface PhaseIndicatorProps {
  phase: string;
  week: number;
  year: number;
}

const PHASE_CONFIG: Record<string, { label: string; color: string; tip: string }> = {
  preseason: {
    label: 'PRESEASON',
    color: 'var(--mfd-cyan)',
    tip: 'Set roster, depth chart, and Game Plan before the regular season begins.',
  },
  regular_season: {
    label: 'REGULAR SEASON',
    color: 'var(--mfd-green)',
    tip: 'Set injuries, depth, and Game Plan before Advance Week; standings punish missed weekly choices.',
  },
  playoffs: {
    label: 'PLAYOFFS',
    color: 'var(--mfd-gold)',
    tip: 'Set health, depth, and matchup calls now; one missed assignment ends the season.',
  },
  offseason: {
    label: 'OFFSEASON',
    color: 'var(--mfd-cyan)',
    tip: 'Re-sign core players, clear cap space, and save room for Free Agency bids.',
  },
  free_agency: {
    label: 'FREE AGENCY',
    color: 'var(--mfd-gold)',
    tip: 'Sign free agents for open starter or backup jobs before the draft.',
  },
  draft: {
    label: 'DRAFT',
    color: 'var(--mfd-green)',
    tip: 'Pick players for named starter, backup, or development jobs.',
  },
  post_draft: {
    label: 'POST-DRAFT',
    color: 'var(--mfd-cyan)',
    tip: 'Set rookie roles and roster cuts before camp opens.',
  },
  training_camp: {
    label: 'TRAINING CAMP',
    color: 'var(--mfd-gold)',
    tip: 'Assign rookie reps, veteran jobs, and injury backup plans before Week 1.',
  },
};

const DEFAULT_CONFIG = (phase: string) => ({
  label: phase.toUpperCase().replace(/_/g, ' '),
  color: 'var(--mfd-text-dim)',
  tip: '',
});

export function PhaseIndicator({ phase, week, year }: PhaseIndicatorProps) {
  const config = PHASE_CONFIG[phase] ?? DEFAULT_CONFIG(phase);

  return (
    <div
      style={{
        padding: '8px 16px',
        background: `color-mix(in srgb, ${config.color} 12%, transparent)`,
        borderBottom: `2px solid ${config.color}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            ...pixelSm,
            fontSize: '9px',
            letterSpacing: '2px',
            color: config.color,
          }}
        >
          {config.label}
        </span>
        <span style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
          WK {week} // YR {year}
        </span>
      </div>
      {config.tip && (
        <div
          style={{
            ...monoSm,
            color: 'var(--mfd-text-dim)',
            marginTop: '4px',
          }}
        >
          {config.tip}
        </div>
      )}
    </div>
  );
}
