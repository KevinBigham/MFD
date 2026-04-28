import type { CSSProperties, ReactNode } from 'react';
import type { AGMProfile } from '@mfd/engine';
import { monoSm, pixelSm } from '../shared/pixelUi';
import './AGMStage.css';

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
  const stageStyle = { '--agm-accent': accent } as CSSProperties;

  return (
    <div
      className="mfd-agm-stage"
      data-mfd-agm-state={state}
      data-mfd-agm-motion={reducedMotion ? 'reduced' : 'animated'}
      style={stageStyle}
    >
      <div
        className="mfd-agm-stage__card"
        data-mfd-agm-stage-card="true"
      >
        <div className="mfd-agm-stage__topline">
          <span style={{ ...pixelSm, color: accent }}>{state.toUpperCase()}</span>
          <span style={{ ...monoSm, color: 'var(--mfd-text-faint)' }}>{agm.title}</span>
        </div>

        <div className="mfd-agm-stage__portrait">
          <AssistantGMCharacter agm={agm} state={state} reducedMotion={reducedMotion} />
        </div>

        <div className="mfd-agm-stage__identity">
          <div style={{ ...pixelSm, color: 'var(--mfd-text)' }}>{agm.name.toUpperCase()}</div>
          <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.5 }}>{headline}</div>
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>{subhead}</div>
          <div style={{ ...monoSm, color: accent, lineHeight: 1.5 }}>&ldquo;{agm.catchphrase}&rdquo;</div>
        </div>
      </div>

      <div
        className="mfd-agm-stage__content"
        data-mfd-agm-stage-content="true"
      >
        {children}
      </div>
    </div>
  );
}

function AssistantGMCharacter({
  agm,
  state,
  reducedMotion,
}: {
  agm: AGMProfile;
  state: AGMStageState;
  reducedMotion: boolean;
}) {
  return (
    <div
      className="mfd-agm-character"
      data-mfd-agm-character="true"
      data-mfd-agm-pose={state}
      data-mfd-agm-motion={reducedMotion ? 'reduced' : 'animated'}
      data-agm-personality={agm.personality}
      role="img"
      aria-label={`Animated Assistant GM character: ${agm.name}`}
    >
      <div className="mfd-agm-character__shadow" />
      <div className="mfd-agm-character__legs">
        <div className="mfd-agm-character__leg mfd-agm-character__leg--left">
          <span className="mfd-agm-character__shoe mfd-agm-character__shoe--left" />
        </div>
        <div className="mfd-agm-character__leg mfd-agm-character__leg--right">
          <span className="mfd-agm-character__shoe mfd-agm-character__shoe--right" />
        </div>
      </div>
      <div className="mfd-agm-character__torso">
        <span className="mfd-agm-character__tie" />
      </div>
      <div className="mfd-agm-character__neck" />
      <div className="mfd-agm-character__head" />
      <div className="mfd-agm-character__hair" />
      <span className="mfd-agm-character__brow mfd-agm-character__brow--left" />
      <span className="mfd-agm-character__brow mfd-agm-character__brow--right" />
      <span className="mfd-agm-character__eye mfd-agm-character__eye--left" />
      <span className="mfd-agm-character__eye mfd-agm-character__eye--right" />
      <span className="mfd-agm-character__mouth" />
      <span className="mfd-agm-character__headset" />
      <span className="mfd-agm-character__mic" />
      <div className="mfd-agm-character__arm mfd-agm-character__arm--left">
        <span className="mfd-agm-character__hand" />
      </div>
      <div className="mfd-agm-character__arm mfd-agm-character__arm--right">
        <span className="mfd-agm-character__hand" />
      </div>
      <div className="mfd-agm-character__clipboard" />
    </div>
  );
}
