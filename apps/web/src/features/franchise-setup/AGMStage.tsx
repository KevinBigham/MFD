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
      <svg
        className="mfd-agm-illustration"
        data-mfd-agm-illustration="cartoon-svg"
        viewBox="0 0 260 340"
        aria-hidden="true"
        focusable="false"
      >
        <ellipse className="mfd-agm-svg__floor-shadow" cx="130" cy="319" rx="78" ry="14" />

        <g className="mfd-agm-svg__legs">
          <path className="mfd-agm-svg__pant mfd-agm-svg__pant--left" d="M92 209 C87 235 85 268 89 303 L110 303 C114 267 117 235 119 210 Z" />
          <path className="mfd-agm-svg__pant mfd-agm-svg__pant--right" d="M140 210 C143 238 147 270 151 303 L173 303 C176 268 174 235 168 209 Z" />
          <path className="mfd-agm-svg__shoe" d="M82 300 C94 298 106 299 117 304 L116 318 L76 318 C75 310 77 304 82 300 Z" />
          <path className="mfd-agm-svg__shoe" d="M145 304 C158 299 171 298 183 302 C188 307 189 313 187 319 L147 319 Z" />
        </g>

        <g className="mfd-agm-svg__body">
          <path className="mfd-agm-svg__jacket" d="M66 135 C80 122 100 116 130 116 C160 116 183 123 197 138 C207 163 205 200 195 231 C174 239 87 240 66 231 C55 198 55 160 66 135 Z" />
          <path className="mfd-agm-svg__shirt" d="M104 127 C114 134 124 138 132 138 C140 138 150 134 158 127 C166 151 164 196 153 232 L108 232 C96 195 96 151 104 127 Z" />
          <path className="mfd-agm-svg__lapel mfd-agm-svg__lapel--left" d="M78 133 C90 138 101 147 110 160 L103 222 C85 197 74 166 78 133 Z" />
          <path className="mfd-agm-svg__lapel mfd-agm-svg__lapel--right" d="M184 135 C171 139 159 148 151 161 L158 222 C177 199 188 168 184 135 Z" />
          <path className="mfd-agm-svg__tie" d="M127 139 L137 139 L142 201 L132 222 L122 201 Z" />
        </g>

        <g className="mfd-agm-svg__arm mfd-agm-svg__arm--left">
          <path className="mfd-agm-svg__sleeve" d="M72 148 C48 160 30 181 20 205 C25 213 35 218 46 218 C58 202 73 188 91 180 Z" />
          <path className="mfd-agm-svg__hand" d="M12 203 C18 194 32 193 42 201 C47 209 43 222 34 225 C21 226 12 217 12 203 Z" />
        </g>

        <g className="mfd-agm-svg__arm mfd-agm-svg__arm--right">
          <path className="mfd-agm-svg__sleeve" d="M187 148 C208 160 222 179 231 202 C226 211 216 216 205 216 C196 200 184 188 169 180 Z" />
          <path className="mfd-agm-svg__hand" d="M215 199 C228 191 241 196 246 207 C247 218 237 226 224 224 C215 219 211 207 215 199 Z" />
          <g className="mfd-agm-svg__clipboard">
            <path className="mfd-agm-svg__clipboard-board" d="M188 178 L234 171 L246 248 L198 255 Z" />
            <path className="mfd-agm-svg__clipboard-line" d="M202 194 L228 190" />
            <path className="mfd-agm-svg__clipboard-line" d="M204 212 L231 208" />
            <path className="mfd-agm-svg__clipboard-line" d="M207 230 L232 226" />
          </g>
        </g>

        <path className="mfd-agm-svg__neck" d="M111 99 L149 99 L153 124 C143 133 119 133 108 124 Z" />

        <g className="mfd-agm-svg__head">
          <path className="mfd-agm-svg__ear mfd-agm-svg__ear--left" d="M68 72 C57 75 53 93 63 103 C70 111 80 105 80 95 C79 83 76 75 68 72 Z" />
          <path className="mfd-agm-svg__ear mfd-agm-svg__ear--right" d="M191 72 C202 75 207 92 197 103 C190 111 180 105 180 95 C181 83 184 75 191 72 Z" />
          <path className="mfd-agm-svg__face" d="M78 57 C82 28 103 14 132 14 C164 14 185 32 188 64 C191 100 170 127 132 129 C95 128 73 101 78 57 Z" />
          <path className="mfd-agm-svg__cheek mfd-agm-svg__cheek--left" d="M88 90 C100 85 110 87 116 96 C105 101 95 101 88 90 Z" />
          <path className="mfd-agm-svg__cheek mfd-agm-svg__cheek--right" d="M144 96 C151 87 162 85 173 90 C166 101 156 101 144 96 Z" />
          <path className="mfd-agm-svg__hair-back" d="M82 56 C77 38 87 18 109 8 C142 -7 178 9 188 37 C198 63 190 83 181 94 C181 69 174 52 159 45 C134 57 104 54 82 56 Z" />
          <path className="mfd-agm-svg__hair-front" d="M80 58 C91 26 121 13 157 20 C172 23 182 32 188 44 C164 39 147 42 133 52 C116 64 95 65 80 58 Z" />
          <path className="mfd-agm-svg__hair-swoop" d="M147 29 C170 30 184 46 183 69 C173 58 162 52 149 53 C153 44 153 36 147 29 Z" />

          <g className="mfd-agm-svg__headset">
            <path className="mfd-agm-svg__headset-band" d="M71 83 C71 48 95 29 130 29 C165 29 188 49 189 84" />
            <path className="mfd-agm-svg__headset-pad" d="M63 79 L78 80 L78 105 L62 105 Z" />
            <path className="mfd-agm-svg__headset-pad" d="M183 80 L198 79 L199 104 L184 105 Z" />
            <path className="mfd-agm-svg__mic-boom" d="M188 101 C198 107 207 112 218 113" />
            <path className="mfd-agm-svg__mic-tip" d="M218 108 L230 111 L228 120 L216 117 Z" />
          </g>

          <g className="mfd-agm-svg__eyes">
            <path className="mfd-agm-svg__brow mfd-agm-svg__brow--left" d="M96 71 C105 66 116 66 124 72" />
            <path className="mfd-agm-svg__brow mfd-agm-svg__brow--right" d="M141 72 C150 66 162 67 170 72" />
            <ellipse className="mfd-agm-svg__eye mfd-agm-svg__eye--left" cx="112" cy="84" rx="6" ry="8" />
            <ellipse className="mfd-agm-svg__eye mfd-agm-svg__eye--right" cx="153" cy="84" rx="6" ry="8" />
            <circle className="mfd-agm-svg__eye-glint" cx="114" cy="81" r="2" />
            <circle className="mfd-agm-svg__eye-glint" cx="155" cy="81" r="2" />
          </g>

          <path className="mfd-agm-svg__nose" d="M132 86 C128 95 128 103 136 106" />
          <path className="mfd-agm-svg__mouth mfd-agm-svg__mouth--line" d="M113 111 C125 118 142 118 154 111" />
          <path className="mfd-agm-svg__mouth mfd-agm-svg__mouth--talk" d="M119 110 C129 105 143 106 151 111 C151 123 121 124 119 110 Z" />
          <path className="mfd-agm-svg__mouth mfd-agm-svg__mouth--smile" d="M111 108 C123 124 146 124 158 108" />
          <path className="mfd-agm-svg__mouth mfd-agm-svg__mouth--concern" d="M117 117 C128 110 143 111 153 118" />
        </g>
      </svg>
    </div>
  );
}
