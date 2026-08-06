import React from 'react';
import { pixelSm, monoSm } from '../shared/pixelUi';
import { phaseVocabulary } from '../../ui/today/phase-vocabulary';

interface PhaseIndicatorProps {
  phase: string;
  week: number;
  year: number;
}

/**
 * The words come from `ui/today/phase-vocabulary.ts` so the legacy strip and
 * the new shell cannot describe the same phase differently. The colours stay
 * here: they are legacy pixel-shell tokens with no v2 equivalent, and an
 * unknown phase deliberately renders dim rather than picking an accent.
 */
const PHASE_COLOR: Record<string, string> = {
  preseason: 'var(--mfd-cyan)',
  regular_season: 'var(--mfd-green)',
  playoffs: 'var(--mfd-gold)',
  offseason: 'var(--mfd-cyan)',
  free_agency: 'var(--mfd-gold)',
  draft: 'var(--mfd-green)',
  post_draft: 'var(--mfd-cyan)',
  training_camp: 'var(--mfd-gold)',
};

export function PhaseIndicator({ phase, week, year }: PhaseIndicatorProps) {
  const config = {
    ...phaseVocabulary(phase),
    color: PHASE_COLOR[phase] ?? 'var(--mfd-text-dim)',
  };

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
