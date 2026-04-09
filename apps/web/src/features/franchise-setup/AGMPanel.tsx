/**
 * Assistant GM sidebar panel — shows the AGM character, dialogue, and insights
 * during the franchise setup wizard.
 */
import { PixelBadge, PixelPanel } from '@mfd/design-system/components';
import type { AGMProfile, AGMPhaseDialogue, AGMInsight, AGMReaction } from '@mfd/engine';
import { monoSm, pixelSm } from '../shared/pixelUi';

const PERSONALITY_ACCENT: Record<AGMProfile['personality'], string> = {
  analytical: 'var(--mfd-cyan)',
  fiery: 'var(--mfd-red, #ff4444)',
  old_school: 'var(--mfd-gold)',
  player_whisperer: 'var(--mfd-green)',
};

const INSIGHT_COLOR: Record<AGMInsight['category'], { badge: 'green' | 'gold' | 'cyan' | 'red'; color: string }> = {
  strength: { badge: 'green', color: 'var(--mfd-green)' },
  concern: { badge: 'gold', color: 'var(--mfd-gold)' },
  opportunity: { badge: 'cyan', color: 'var(--mfd-cyan)' },
  warning: { badge: 'red', color: 'var(--mfd-red, #ff4444)' },
};

const SENTIMENT_COLOR: Record<string, string> = {
  love_it: 'var(--mfd-green)',
  like_it: 'var(--mfd-cyan)',
  concerned: 'var(--mfd-gold)',
  disagree: 'var(--mfd-red, #ff4444)',
};

export function AGMPanel({
  agm,
  dialogue,
  reaction,
  greeting,
}: {
  agm: AGMProfile;
  dialogue: AGMPhaseDialogue | null;
  reaction: AGMReaction | null;
  greeting: string | null;
}) {
  const accent = PERSONALITY_ACCENT[agm.personality];

  return (
    <div style={{
      width: '280px', minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '12px',
      borderRight: `2px solid var(--mfd-border)`, padding: '16px', overflowY: 'auto',
      background: 'rgba(0,0,0,0.3)',
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
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', marginTop: '4px' }}>
          {agm.background}
        </div>
        <div style={{ marginTop: '6px', display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <PixelBadge variant="default">{agm.personality.replace('_', ' ')}</PixelBadge>
          <PixelBadge variant="cyan">{agm.expertise.replace('_', ' ')}</PixelBadge>
        </div>
      </div>

      {/* Greeting (before first phase dialogue loads) */}
      {greeting && !dialogue ? (
        <div style={{
          padding: '12px', border: `2px solid ${accent}`, background: 'rgba(255,255,255,0.03)',
          ...monoSm, color: '#ddd', lineHeight: 1.6,
        }}>
          {greeting}
        </div>
      ) : null}

      {/* Phase Dialogue */}
      {dialogue ? (
        <>
          {/* Intro */}
          <div style={{
            padding: '12px', border: `2px solid ${accent}`, background: 'rgba(255,255,255,0.03)',
            ...monoSm, color: '#ddd', lineHeight: 1.6,
          }}>
            &ldquo;{dialogue.intro}&rdquo;
          </div>

          {/* Insights */}
          {dialogue.insights.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {dialogue.insights.map((insight, i) => {
                const cfg = INSIGHT_COLOR[insight.category];
                return (
                  <div key={i} style={{
                    padding: '8px', border: `1px solid ${cfg.color}33`,
                    background: `${cfg.color}08`,
                  }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '4px' }}>
                      <PixelBadge variant={cfg.badge}>{insight.category}</PixelBadge>
                      {insight.dataPoint ? (
                        <span style={{ ...monoSm, color: cfg.color }}>{insight.dataPoint}</span>
                      ) : null}
                    </div>
                    <div style={{ ...monoSm, color: '#bbb', lineHeight: 1.5 }}>{insight.text}</div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* Recommendation */}
          {dialogue.recommendation ? (
            <div style={{
              padding: '10px', border: '2px solid rgba(0, 229, 255, 0.3)',
              background: 'rgba(0, 229, 255, 0.06)',
            }}>
              <div style={{ ...pixelSm, color: 'var(--mfd-cyan)', marginBottom: '4px' }}>RECOMMENDATION</div>
              <div style={{ ...monoSm, color: '#cfefff', lineHeight: 1.5 }}>{dialogue.recommendation}</div>
            </div>
          ) : null}

          {/* Closing */}
          <div style={{ ...monoSm, color: 'var(--mfd-text-faint)', fontStyle: 'italic', lineHeight: 1.5 }}>
            {dialogue.closingRemark}
          </div>
        </>
      ) : null}

      {/* Reaction to decisions */}
      {reaction ? (
        <div style={{
          padding: '10px', border: `2px solid ${SENTIMENT_COLOR[reaction.sentiment] ?? 'var(--mfd-border)'}`,
          background: 'rgba(255,255,255,0.03)',
        }}>
          <div style={{ ...pixelSm, color: SENTIMENT_COLOR[reaction.sentiment] ?? '#aaa', marginBottom: '4px' }}>
            {reaction.sentiment.replace('_', ' ').toUpperCase()}
          </div>
          <div style={{ ...monoSm, color: '#ddd', lineHeight: 1.5 }}>&ldquo;{reaction.reaction}&rdquo;</div>
          {reaction.followUp ? (
            <div style={{ ...monoSm, color: '#999', lineHeight: 1.5, marginTop: '6px' }}>{reaction.followUp}</div>
          ) : null}
        </div>
      ) : null}

      {/* Catchphrase */}
      <div style={{
        ...pixelSm, color: accent, textAlign: 'center', opacity: 0.6, marginTop: 'auto', paddingTop: '12px',
      }}>
        &ldquo;{agm.catchphrase}&rdquo;
      </div>
    </div>
  );
}
