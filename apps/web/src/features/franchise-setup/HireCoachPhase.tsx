import { useMemo } from 'react';
import { PixelBadge, PixelButton, PixelPanel } from '@mfd/design-system/components';
import { getAGMCoachReaction, getCoachCandidates, type ChoiceForecastPreview } from '@mfd/engine';
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

function recommendationLabel(recommendation: string): string {
  if (recommendation === 'consider') return 'HAS COST';
  return recommendation.toUpperCase();
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

export function HireCoachPhase({
  agmId,
  selectedCoachId,
  previewByCoachId,
  onHire,
}: {
  agmId: string;
  selectedCoachId: string | null;
  previewByCoachId?: Record<string, ChoiceForecastPreview>;
  onHire: (coachId: string) => Promise<void> | void;
}) {
  const candidates = useMemo(() => getCoachCandidates(), []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <PixelPanel accent="gold" padding="lg">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ ...pixelSm, color: 'var(--mfd-gold)' }}>HIRE YOUR HEAD COACH</div>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
            Choose the coach whose scheme and teaching match current starters; coach-player gaps create Week 1 missed assignments.
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
        {candidates.map((candidate, index) => {
          const selected = selectedCoachId === candidate.id;
          const isSpotlightTarget = !selectedCoachId && index === 0;
          const reaction = getAGMCoachReaction(agmId, candidate.id);
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
                  <PixelBadge variant="gold">{formatLabel(candidate.archetype)}</PixelBadge>
                  <PixelBadge variant="cyan">{formatLabel(candidate.schemePreference.offense)}</PixelBadge>
                  <PixelBadge variant="red">{formatLabel(candidate.schemePreference.defense)}</PixelBadge>
                </div>

                <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>{candidate.background}</div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ ...pixelSm, color: 'var(--mfd-text-faint)' }}>STRENGTHS</div>
                  <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
                    {candidate.strengths.join(' // ')}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ ...pixelSm, color: 'var(--mfd-text-faint)' }}>WHAT CAN GO WRONG</div>
                  <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.6 }}>
                    {candidate.weaknesses.join(' // ')}
                  </div>
                </div>

                <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>
                  &ldquo;{candidate.interviewQuote}&rdquo;
                </div>

                <ChoiceDeltaBadges preview={previewByCoachId?.[candidate.id]} />

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
                    <PixelBadge variant={recommendationVariant(reaction.recommendation)}>{recommendationLabel(reaction.recommendation)}</PixelBadge>
                  </div>
                  <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>{reaction.analysis}</div>
                  <div style={{ ...monoSm, color: 'var(--mfd-text-faint)', marginTop: '6px' }}>{reaction.oneLiner}</div>
                </div>

                <PixelButton
                  accent={selected ? 'gold' : 'default'}
                  data-spotlight-target={isSpotlightTarget ? 'wizard.coach-hire.confirm' : undefined}
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
