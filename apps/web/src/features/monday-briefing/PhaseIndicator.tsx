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
    tip: 'Set your roster and depth chart before the regular season begins.',
  },
  regular_season: {
    label: 'REGULAR SEASON',
    color: 'var(--mfd-green)',
    tip: 'Play games, manage your roster, and chase the playoffs.',
  },
  playoffs: {
    label: 'PLAYOFFS',
    color: 'var(--mfd-gold)',
    tip: 'Win or go home. Every decision is magnified.',
  },
  offseason: {
    label: 'OFFSEASON',
    color: 'var(--mfd-cyan)',
    tip: 'Re-sign players, manage the cap, and prepare for free agency.',
  },
  free_agency: {
    label: 'FREE AGENCY',
    color: 'var(--mfd-gold)',
    tip: 'Sign free agents to fill roster holes before the draft.',
  },
  draft: {
    label: 'DRAFT',
    color: 'var(--mfd-green)',
    tip: 'Select new players to build your future.',
  },
  post_draft: {
    label: 'POST-DRAFT',
    color: 'var(--mfd-cyan)',
    tip: 'Finalize your roster before camp opens.',
  },
  training_camp: {
    label: 'TRAINING CAMP',
    color: 'var(--mfd-gold)',
    tip: 'Rookies compete, veterans battle, and surprises emerge.',
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
