import { useMemo } from 'react';
import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import { getAGMScoutReaction, getScoutCandidates, type ChoiceForecastPreview } from '@mfd/engine';
import { monoSm, pixelSm } from '../shared/pixelUi';
import { ChoiceDeltaBadges } from './ChoiceDeltaBadges';

function formatLabel(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function recommendationVariant(recommendation: string): 'green' | 'gold' | 'red' {
  if (recommendation === 'hire') return 'green';
  if (recommendation === 'consider') return 'gold';
  return 'red';
}

function recommendationHighlight(recommendation: string): { border: string; boxShadow: string; background: string } {
  if (recommendation === 'hire') {
    return {
      border: '2px solid var(--mfd-green)',
      boxShadow: 'var(--mfd-pixel-glow-green)',
      background: 'var(--mfd-bg-2)',
    };
  }
  if (recommendation === 'consider') {
    return {
      border: '2px solid var(--mfd-gold)',
      boxShadow: 'none',
      background: 'var(--mfd-bg-2)',
    };
  }
  return {
    border: '2px solid var(--mfd-red)',
    boxShadow: 'none',
    background: 'var(--mfd-bg-2)',
  };
}

export function HireScoutPhase({
  agmId,
  selectedScoutId,
  previewByScoutId,
  onHire,
}: {
  agmId: string;
  selectedScoutId: string | null;
  previewByScoutId?: Record<string, ChoiceForecastPreview>;
  onHire: (scoutId: string) => Promise<void> | void;
}) {
  const candidates = useMemo(() => getScoutCandidates(), []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <PixelPanel accent="cyan" padding="lg">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ ...pixelSm, color: 'var(--mfd-cyan)' }}>BUILD YOUR INTEL</div>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
            Hire the scouting director who determines what your board trusts and where your draft room finds its edge.
          </div>
        </div>
      </PixelPanel>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          alignItems: 'stretch',
        }}
      >
        {candidates.map((candidate) => {
          const selected = selectedScoutId === candidate.id;
          const reaction = getAGMScoutReaction(agmId, candidate.id);
          const highlight = recommendationHighlight(reaction.recommendation);
          return (
            <PixelPanel
              key={candidate.id}
              accent={selected ? 'gold' : 'default'}
              padding="lg"
              style={{
                height: '100%',
                borderColor: selected ? 'var(--mfd-gold)' : undefined,
                boxShadow: selected ? 'var(--mfd-shadow-sm)' : 'none',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
                <div>
                  <div style={{ ...pixelSm, color: selected ? 'var(--mfd-gold)' : 'var(--mfd-text)' }}>{candidate.name}</div>
                  <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', marginTop: '4px' }}>Age {candidate.age}</div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  <PixelBadge variant="cyan">{formatLabel(candidate.specialty)}</PixelBadge>
                  <PixelBadge variant="default">{candidate.philosophy}</PixelBadge>
                </div>

                <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>{candidate.background}</div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ ...pixelSm, color: 'var(--mfd-text-faint)' }}>STRENGTHS</div>
                  <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
                    {candidate.strengths.join(' // ')}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ ...pixelSm, color: 'var(--mfd-text-faint)' }}>WATCH-OUTS</div>
                  <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
                    {candidate.weaknesses.join(' // ')}
                  </div>
                </div>

                <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>
                  &ldquo;{candidate.interviewQuote}&rdquo;
                </div>

                <ChoiceDeltaBadges preview={previewByScoutId?.[candidate.id]} />

                <div
                  style={{
                    padding: '10px',
                    border: highlight.border,
                    background: highlight.background,
                    boxShadow: highlight.boxShadow,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <div style={{ ...pixelSm, color: 'var(--mfd-cyan)' }}>AGM TAKE</div>
                    <PixelBadge variant={recommendationVariant(reaction.recommendation)}>{reaction.recommendation.toUpperCase()}</PixelBadge>
                  </div>
                  <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>{reaction.analysis}</div>
                  <div style={{ ...monoSm, color: 'var(--mfd-text-faint)', marginTop: '6px' }}>{reaction.oneLiner}</div>
                </div>

                <PixelButton
                  accent={selected ? 'gold' : 'default'}
                  onClick={() => { void onHire(candidate.id); }}
                  style={{ width: '100%', marginTop: 'auto' }}
                >
                  Hire
                </PixelButton>
              </div>
            </PixelPanel>
          );
        })}
      </div>
    </div>
  );
}
