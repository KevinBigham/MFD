import type { ReactNode } from 'react';
import type { AGMProfile } from '@mfd/engine';
import { monoSm, pixelSm } from '../shared/pixelUi';

export type AGMStageState = 'enter' | 'idle' | 'talk' | 'point' | 'approve' | 'concern';

const STATE_ACCENT: Record<AGMStageState, string> = {
  enter: 'var(--mfd-cyan)',
  idle: 'var(--mfd-text-dim)',
  talk: 'var(--mfd-gold)',
  point: 'var(--mfd-cyan)',
  approve: 'var(--mfd-green)',
  concern: 'var(--mfd-red)',
};

export function AGMStage({
  agm,
  state,
  headline,
  subhead,
  reducedMotion = false,
  children,
}: {
  agm: AGMProfile;
  state: AGMStageState;
  headline: string;
  subhead: string;
  reducedMotion?: boolean;
  children?: ReactNode;
}) {
  const accent = STATE_ACCENT[state];
  const animation = reducedMotion ? 'none' : 'mfd-stage-float 2.8s ease-in-out infinite';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(260px, 340px) minmax(0, 1fr)',
        minHeight: 0,
        gap: '18px',
        alignItems: 'stretch',
      }}
    >
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          border: '2px solid var(--mfd-border)',
          background: 'linear-gradient(180deg, rgba(11,17,26,0.98) 0%, rgba(17,27,39,0.98) 48%, rgba(8,10,14,0.98) 100%)',
          boxShadow: `0 0 0 1px rgba(255,255,255,0.03) inset, 0 18px 40px rgba(0,0,0,0.35), 0 0 40px color-mix(in srgb, ${accent} 24%, transparent)`,
          padding: '20px 18px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '100%',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
          <span style={{ ...pixelSm, color: accent }}>{state.toUpperCase()}</span>
          <span style={{ ...monoSm, color: 'var(--mfd-text-faint)' }}>{agm.title}</span>
        </div>

        <div style={{ position: 'relative', flex: 1, minHeight: '260px', margin: '14px 0 12px' }}>
          <div
            style={{
              position: 'absolute',
              inset: '20px 0 0',
              borderRadius: '999px',
              background: `radial-gradient(circle at 50% 40%, color-mix(in srgb, ${accent} 25%, transparent), transparent 68%)`,
              filter: 'blur(6px)',
              opacity: 0.95,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: '50%',
              bottom: '10px',
              transform: state === 'point' ? 'translateX(-48%)' : 'translateX(-50%)',
              width: '170px',
              height: '220px',
              animation,
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: 0,
                transform: 'translateX(-50%)',
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                border: `2px solid ${accent}`,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '62px',
                transform: 'translateX(-50%)',
                width: '100px',
                height: '124px',
                borderRadius: '18px 18px 22px 22px',
                border: `2px solid ${accent}`,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.015))',
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: state === 'point' ? '32px' : '22px',
                top: state === 'point' ? '82px' : '90px',
                width: state === 'point' ? '92px' : '72px',
                height: '12px',
                borderRadius: '999px',
                background: accent,
                transform: state === 'point' ? 'rotate(-18deg)' : 'rotate(12deg)',
                transformOrigin: 'right center',
                opacity: 0.92,
              }}
            />
            <div
              style={{
                position: 'absolute',
                right: state === 'point' ? '2px' : '18px',
                top: state === 'approve' ? '76px' : '90px',
                width: state === 'approve' ? '84px' : '72px',
                height: '12px',
                borderRadius: '999px',
                background: accent,
                transform: state === 'approve' ? 'rotate(-24deg)' : state === 'concern' ? 'rotate(-10deg)' : 'rotate(-12deg)',
                transformOrigin: 'left center',
                opacity: 0.92,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: '56px',
                bottom: '0',
                width: '14px',
                height: '86px',
                borderRadius: '999px',
                background: accent,
                transform: 'rotate(6deg)',
                transformOrigin: 'top center',
              }}
            />
            <div
              style={{
                position: 'absolute',
                right: '56px',
                bottom: '0',
                width: '14px',
                height: '86px',
                borderRadius: '999px',
                background: accent,
                transform: 'rotate(-6deg)',
                transformOrigin: 'top center',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ ...pixelSm, color: 'var(--mfd-text)' }}>{agm.name.toUpperCase()}</div>
          <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.5 }}>{headline}</div>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>{subhead}</div>
          <div style={{ ...monoSm, color: accent, lineHeight: 1.5 }}>&ldquo;{agm.catchphrase}&rdquo;</div>
        </div>

        <style>{`
          @keyframes mfd-stage-float {
            0%, 100% { transform: translateX(-50%) translateY(0); }
            50% { transform: translateX(-50%) translateY(-6px); }
          }
        `}</style>
      </div>

      <div
        style={{
          minWidth: 0,
          minHeight: 0,
          border: '2px solid var(--mfd-border)',
          background: 'var(--mfd-bg-2)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          overflow: 'auto',
        }}
      >
        {children}
      </div>
    </div>
  );
}
