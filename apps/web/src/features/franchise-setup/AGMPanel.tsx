/**
 * Assistant GM sidebar panel — shows the AGM character, dialogue, and insights
 * during the franchise setup wizard.
 */
import { useEffect, useRef, useState } from 'react';
import { PixelBadge } from '@mfd/design-system/components';
import type { AGMProfile, AGMPhaseDialogue, AGMInsight, AGMReaction, SetupPhase } from '@mfd/engine';
import { monoSm, pixelSm } from '../shared/pixelUi';
import { TeachingTooltip } from './TeachingTooltip';

const PERSONALITY_ACCENT: Record<AGMProfile['personality'], string> = {
  analytical: 'var(--mfd-cyan)',
  fiery: 'var(--mfd-red)',
  old_school: 'var(--mfd-gold)',
  player_whisperer: 'var(--mfd-green)',
};

const INSIGHT_COLOR: Record<AGMInsight['category'], { badge: 'green' | 'gold' | 'cyan' | 'red'; color: string }> = {
  strength: { badge: 'green', color: 'var(--mfd-green)' },
  concern: { badge: 'gold', color: 'var(--mfd-gold)' },
  opportunity: { badge: 'cyan', color: 'var(--mfd-cyan)' },
  warning: { badge: 'red', color: 'var(--mfd-red)' },
};

const SENTIMENT_COLOR: Record<string, string> = {
  love_it: 'var(--mfd-green)',
  like_it: 'var(--mfd-cyan)',
  concerned: 'var(--mfd-gold)',
  disagree: 'var(--mfd-red)',
};

const TONE_BADGE: Record<AGMPhaseDialogue['tone'], { label: string; variant: 'default' | 'gold' | 'cyan' | 'green' }> = {
  confident: { label: 'Confident', variant: 'green' },
  concerned: { label: 'Cautious', variant: 'gold' },
  excited: { label: 'Excited', variant: 'cyan' },
  measured: { label: 'Measured', variant: 'default' },
};

export function AGMPanel({
  agm,
  phase,
  dialogue,
  reaction,
  welcomeMonologue,
  teachingNarration,
  teachingTips,
  blueprintMonologue,
}: {
  agm: AGMProfile;
  phase: SetupPhase;
  dialogue: AGMPhaseDialogue | null;
  reaction: AGMReaction | null;
  welcomeMonologue: string | null;
  teachingNarration: string | null;
  teachingTips?: string[];
  blueprintMonologue?: string | null;
}) {
  const accent = PERSONALITY_ACCENT[agm.personality];
  const [displayedDialogue, setDisplayedDialogue] = useState(dialogue);
  const [isTyping, setIsTyping] = useState(false);
  const hasMountedRef = useRef(false);
  const tone = dialogue?.tone ?? displayedDialogue?.tone ?? null;

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      setDisplayedDialogue(dialogue);
      return;
    }

    if (phase === 'blueprint' || !dialogue) {
      setDisplayedDialogue(dialogue);
      setIsTyping(false);
      return;
    }

    setIsTyping(true);
    const timeoutId = window.setTimeout(() => {
      setDisplayedDialogue(dialogue);
      setIsTyping(false);
    }, 600);

    return () => window.clearTimeout(timeoutId);
  }, [dialogue, phase]);

  return (
    <div style={{
      width: '280px', minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '12px',
      borderRight: `2px solid var(--mfd-border)`, padding: '16px', overflowY: 'auto',
      background: 'var(--mfd-bg-2)',
    }}>
      {/* AGM Identity */}
      <div style={{ textAlign: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--mfd-border)' }}>
        <div style={{
          width: '48px', height: '48px', margin: '0 auto 8px', borderRadius: '50%',
          border: `2px solid ${accent}`, background: 'var(--mfd-bg-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          ...pixelSm, color: accent, fontSize: '16px',
        }}>
          {agm.name.charAt(0)}
        </div>
        <div style={{ ...pixelSm, color: accent, textTransform: 'uppercase' }}>{agm.name}</div>
        {tone ? (
          <div style={{ marginTop: '6px' }}>
            <PixelBadge variant={TONE_BADGE[tone].variant}>{TONE_BADGE[tone].label}</PixelBadge>
          </div>
        ) : null}
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', marginTop: '4px' }}>
          {agm.background}
        </div>
        <div style={{ marginTop: '6px', display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <PixelBadge variant="default">{agm.personality.replace('_', ' ')}</PixelBadge>
          <PixelBadge variant="cyan">{agm.expertise.replace('_', ' ')}</PixelBadge>
        </div>
      </div>

      {/* Welcome monologue on the first post-hire phase */}
      {welcomeMonologue ? (
        <div style={{
          padding: '12px', border: `2px solid ${accent}`, background: 'var(--mfd-bg-3)',
          ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6,
        }}>
          &ldquo;{welcomeMonologue}&rdquo;
        </div>
      ) : null}

      {teachingNarration ? (
        <div style={{
          padding: '12px',
          border: '2px solid var(--mfd-cyan)',
          background: 'var(--mfd-bg-3)',
        }}>
          <div style={{ ...pixelSm, color: 'var(--mfd-cyan)', marginBottom: '6px' }}>YOUR AGM EXPLAINS:</div>
          <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6 }}>{teachingNarration}</div>
        </div>
      ) : null}

      {phase === 'blueprint' && blueprintMonologue ? (
        <>
          <div style={{
            padding: '14px',
            border: '2px solid var(--mfd-gold)',
            background: 'var(--mfd-bg-2)',
            boxShadow: 'var(--mfd-shadow-gold)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}>
            <div style={{ ...pixelSm, color: 'var(--mfd-gold)' }}>END OF DAY 1</div>
            <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.7, fontSize: '12px' }}>
              &ldquo;{blueprintMonologue}&rdquo;
            </div>
            <div style={{ ...pixelSm, color: 'var(--mfd-cyan)' }}>BEGIN SEASON</div>
          </div>
        </>
      ) : null}

      {/* Phase Dialogue */}
      {phase !== 'blueprint' && isTyping ? (
        <div
          style={{
            padding: '14px',
            border: `2px solid ${accent}`,
            background: 'var(--mfd-bg-2)',
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
          }}
          aria-label="AGM typing"
        >
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--mfd-gold)',
                animation: `mfd-typing 0.8s ease-in-out ${index * 0.12}s infinite`,
              }}
            />
          ))}
        </div>
      ) : null}

      {phase !== 'blueprint' && displayedDialogue ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', animation: 'mfd-slide-in 0.3s ease-out' }}>
          <div style={{
            padding: '12px', border: `2px solid ${accent}`, background: 'var(--mfd-bg-3)',
            ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.6,
          }}>
            &ldquo;{displayedDialogue.intro}&rdquo;
          </div>

          {displayedDialogue.insights.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {displayedDialogue.insights.map((insight, i) => {
                const cfg = INSIGHT_COLOR[insight.category];
                return (
                  <div key={i} style={{
                    padding: '8px', border: `1px solid ${cfg.color}`,
                    background: 'var(--mfd-bg-3)',
                  }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
                      <PixelBadge variant={cfg.badge}>{insight.category}</PixelBadge>
                      {insight.dataPoint ? (
                        <span style={{ ...monoSm, color: cfg.color }}>{insight.dataPoint}</span>
                      ) : null}
                    </div>
                    <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>{insight.text}</div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {displayedDialogue.recommendation ? (
            <div style={{
              padding: '10px', border: '2px solid var(--mfd-cyan)',
              background: 'var(--mfd-bg-3)',
            }}>
              <div style={{ ...pixelSm, color: 'var(--mfd-cyan)', marginBottom: '4px' }}>RECOMMENDATION</div>
              <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.5 }}>{displayedDialogue.recommendation}</div>
            </div>
          ) : null}

          <div style={{ ...monoSm, color: 'var(--mfd-text-faint)', fontStyle: 'italic', lineHeight: 1.5 }}>
            {displayedDialogue.closingRemark}
          </div>
        </div>
      ) : null}

      {reaction ? (
        <div style={{
          padding: '10px', border: `2px solid ${SENTIMENT_COLOR[reaction.sentiment] ?? 'var(--mfd-border)'}`,
          background: 'var(--mfd-bg-3)',
        }}>
          <div style={{ ...pixelSm, color: SENTIMENT_COLOR[reaction.sentiment] ?? 'var(--mfd-text-dim)', marginBottom: '4px' }}>
            {reaction.sentiment.replace('_', ' ').toUpperCase()}
          </div>
          <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.5 }}>&ldquo;{reaction.reaction}&rdquo;</div>
          {reaction.followUp ? (
            <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5, marginTop: '6px' }}>{reaction.followUp}</div>
          ) : null}
        </div>
      ) : null}

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {teachingTips && teachingTips.length > 0 ? (
          <TeachingTooltip tips={teachingTips} agmName={agm.name} agmAccent={accent} />
        ) : null}

        <div style={{
          ...pixelSm, color: accent, textAlign: 'center', opacity: 0.6, paddingTop: '12px',
        }}>
          &ldquo;{agm.catchphrase}&rdquo;
        </div>
      </div>

      <style>{`
        @keyframes mfd-typing {
          0%, 80%, 100% { opacity: 0.3; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-4px); }
        }

        @keyframes mfd-slide-in {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
