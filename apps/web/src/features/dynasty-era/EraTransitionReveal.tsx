import { useEffect, useReducer, type CSSProperties } from 'react';
import { Chip, ChipDialogueBubble, PixelButton } from '@mfd/design-system/components';
import { display, monoSm, pixel } from '../shared/pixelUi';
import {
  ERA_TRANSITION_INITIAL_STATE,
  reduceEraTransitionState,
  stageDurationMs,
  type EraTransitionStage,
} from './eraTransitionState';

export type EraTransitionVariant = 'rebuilding' | 'building' | 'contender' | 'dynasty' | 'golden-age' | 'fall-from-grace';

export interface EraTransitionRevealProps {
  open: boolean;
  eraName: string;
  eraType: EraTransitionVariant;
  narrative: string;
  reducedMotion?: boolean;
  initialStage?: EraTransitionStage;
  onContinue: () => void;
}

const accentByEra: Record<EraTransitionVariant, 'gold' | 'cyan' | 'green' | 'red' | 'default'> = {
  rebuilding: 'default',
  building: 'cyan',
  contender: 'green',
  dynasty: 'gold',
  'golden-age': 'gold',
  'fall-from-grace': 'red',
};

const colorByAccent = {
  default: 'var(--mfd-text)',
  gold: 'var(--mfd-gold)',
  cyan: 'var(--mfd-cyan)',
  green: 'var(--mfd-green)',
  red: 'var(--mfd-red)',
} as const;

function eraDisplayName(eraName: string): string {
  return eraName.toUpperCase();
}

function chipPoseForEra(eraType: EraTransitionVariant): 'celebrate' | 'concern' {
  return eraType === 'fall-from-grace' || eraType === 'rebuilding' ? 'concern' : 'celebrate';
}

function confettiStyle(index: number, color: string, reducedMotion: boolean): CSSProperties {
  return {
    position: 'absolute',
    top: reducedMotion ? `${8 + index * 3}%` : '-24px',
    left: `${(index * 11) % 100}%`,
    width: `${4 + (index % 3) * 2}px`,
    height: `${12 + (index % 4) * 3}px`,
    background: color,
    opacity: reducedMotion ? 0.22 : 0.78,
    animation: reducedMotion ? 'none' : `mfdEraConfetti ${2 + (index % 5) * 0.25}s ease-in ${(index % 8) * 0.08}s infinite`,
    transform: `rotate(${(index * 29) % 360}deg)`,
  };
}

function shouldShowConfetti(eraType: EraTransitionVariant): boolean {
  return eraType === 'dynasty' || eraType === 'golden-age' || eraType === 'contender';
}

function TransitionEraBadge({ eraType, color }: { eraType: EraTransitionVariant; color: string }) {
  const common = { fill: 'none', stroke: color, strokeWidth: 6, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

  return (
    <svg
      viewBox="0 0 120 160"
      role="img"
      aria-label={`${eraType} era badge`}
      data-testid="era-transition-badge"
      data-era-badge-variant={eraType}
      style={{ width: '120px', height: '160px', display: 'block' }}
    >
      <path d="M18 16 L102 16 L110 118 L60 148 L10 118 Z" fill="var(--mfd-bg-2)" stroke={color} strokeWidth="4" />
      {eraType === 'rebuilding' ? (
        <>
          <path d="M28 112 L48 112 L48 92 L66 92 L66 74 L92 74" {...common} />
          <path d="M28 126 L42 126 M52 126 L74 126 M84 126 L94 126" {...common} />
        </>
      ) : null}
      {eraType === 'building' ? (
        <>
          <path d="M30 120 L30 96 L48 96 L48 76 L66 76 L66 54 L90 54 L90 120 Z" fill="var(--mfd-bg-dim)" stroke={color} strokeWidth="5" />
          <path d="M38 104 L82 104 M56 84 L82 84 M74 64 L82 64" {...common} strokeWidth={3} />
        </>
      ) : null}
      {eraType === 'contender' ? (
        <>
          <path d="M24 120 L56 58 L72 86 L88 66 L104 120 Z" fill="var(--mfd-bg-dim)" stroke={color} strokeWidth="5" />
          <path d="M56 58 L60 76 L72 86" {...common} strokeWidth={4} />
        </>
      ) : null}
      {eraType === 'dynasty' ? (
        <>
          <path d="M34 106 L34 62 L50 82 L60 54 L70 82 L86 62 L86 106 Z" fill="var(--mfd-bg-dim)" stroke={color} strokeWidth="5" />
          <path d="M34 110 L86 110 M42 126 L78 126" {...common} strokeWidth={4} />
        </>
      ) : null}
      {eraType === 'golden-age' ? (
        <>
          <path d="M60 82 m-24 0 a24 24 0 1 0 48 0 a24 24 0 1 0 -48 0" fill="var(--mfd-bg-dim)" stroke={color} strokeWidth="5" />
          <path d="M60 36 L60 22 M60 142 L60 128 M16 82 L30 82 M90 82 L104 82 M30 52 L20 42 M90 52 L100 42 M30 112 L20 122 M90 112 L100 122" {...common} strokeWidth={4} />
        </>
      ) : null}
      {eraType === 'fall-from-grace' ? (
        <>
          <path d="M40 122 L48 52 L82 52 L90 122 Z" fill="var(--mfd-bg-dim)" stroke={color} strokeWidth="5" />
          <path d="M60 54 L52 78 L68 92 L58 120" {...common} strokeWidth={4} />
          <path d="M34 128 L94 128" {...common} strokeWidth={5} />
        </>
      ) : null}
    </svg>
  );
}

const keyframes = `
@keyframes mfdEraConfetti {
  0% { transform: translateY(0) rotate(0deg); opacity: 0.8; }
  100% { transform: translateY(100vh) rotate(560deg); opacity: 0; }
}
@keyframes mfdEraFadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes mfdEraType {
  from { clip-path: inset(0 100% 0 0); }
  to { clip-path: inset(0 0 0 0); }
}
`;

export function EraTransitionReveal({
  open,
  eraName,
  eraType,
  narrative,
  reducedMotion = false,
  initialStage,
  onContinue,
}: EraTransitionRevealProps) {
  const [state, dispatch] = useReducer(
    reduceEraTransitionState,
    initialStage ? { stage: initialStage } : ERA_TRANSITION_INITIAL_STATE,
  );
  const stage = initialStage ?? state.stage;
  const accent = accentByEra[eraType];
  const color = colorByAccent[accent];
  const visible = open && stage !== 'hidden';
  const showBadge = stage === 'badge' || stage === 'name' || stage === 'narrative' || stage === 'idle';
  const showName = stage === 'name' || stage === 'narrative' || stage === 'idle';
  const showNarrative = stage === 'narrative' || stage === 'idle';
  const showConfetti = shouldShowConfetti(eraType);

  useEffect(() => {
    if (initialStage) return;
    dispatch(open ? { type: 'start', reducedMotion } : { type: 'dismiss' });
  }, [initialStage, open, reducedMotion, eraName, eraType]);

  useEffect(() => {
    if (initialStage || reducedMotion) return undefined;
    const duration = stageDurationMs(stage);
    if (duration === null) return undefined;
    const timer = window.setTimeout(() => dispatch({ type: 'advance' }), duration);
    return () => window.clearTimeout(timer);
  }, [initialStage, reducedMotion, stage]);

  if (!visible) return null;

  const handleContinue = () => {
    dispatch({ type: 'continue' });
    onContinue();
  };

  return (
    <div
      role="dialog"
      aria-label="Era transition reveal"
      data-era-transition-stage={stage}
      data-era-transition-type={eraType}
      data-era-transition-accent={accent}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: 'var(--mfd-bg)',
        color: 'var(--mfd-text)',
      }}
    >
      <style>{keyframes}</style>
      {showConfetti ? Array.from({ length: 24 }, (_, index) => (
        <span
          key={index}
          aria-hidden="true"
          data-testid="era-transition-confetti"
          style={confettiStyle(index, color, reducedMotion)}
        />
      )) : null}
      {eraType === 'rebuilding' ? (
        <div aria-hidden="true" data-testid="era-transition-static" style={{
          position: 'absolute',
          inset: 0,
          background: 'repeating-linear-gradient(0deg, transparent 0 8px, var(--mfd-border) 8px 10px)',
          opacity: 0.18,
        }}
        />
      ) : null}

      <div style={{
        position: 'relative',
        zIndex: 1,
        width: 'min(720px, calc(100vw - 32px))',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '18px',
        textAlign: 'center',
        animation: reducedMotion ? 'none' : 'mfdEraFadeIn 360ms ease-out',
      }}
      >
        {showBadge ? <TransitionEraBadge eraType={eraType} color={color} /> : null}
        {showName ? (
          <div
            style={{
              ...display,
              fontSize: '44px',
              color,
              lineHeight: 1,
              textTransform: 'uppercase',
              animation: reducedMotion ? 'none' : 'mfdEraType 900ms steps(18, end)',
            }}
          >
            {eraDisplayName(eraName)}
          </div>
        ) : null}
        {showNarrative ? (
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.7, maxWidth: '560px' }}>
            {narrative}
          </div>
        ) : null}
        {showNarrative ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '96px minmax(0, 1fr)',
            gap: '12px',
            alignItems: 'center',
            maxWidth: '520px',
            padding: '12px',
            border: `2px solid ${color}`,
            background: 'var(--mfd-bg-2)',
          }}
          >
            <Chip pose={chipPoseForEra(eraType)} size="md" reducedMotion={reducedMotion} />
            <ChipDialogueBubble
              text={eraType === 'fall-from-grace'
                ? 'This chapter needs a steady hand. The museum records the fall, then waits for the climb.'
                : 'New era marker archived. This is the kind of chapter fans remember.'}
              speed={28}
              reducedMotion
            />
          </div>
        ) : null}
        {stage === 'idle' ? (
          <PixelButton accent={accent === 'default' ? 'gold' : accent} onClick={handleContinue}>
            Continue
          </PixelButton>
        ) : (
          <div style={{ ...pixel, color: 'var(--mfd-text-dim)' }}>ARCHIVING ERA TRANSITION</div>
        )}
      </div>
    </div>
  );
}
