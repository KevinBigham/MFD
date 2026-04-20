import { useEffect, useMemo, useReducer } from 'react';
import { PixelBadge, PixelPanel } from '@mfd/design-system/components';
import { mulberry32 } from '@mfd/engine';

export const ATTRACT_MODE_IDLE_MS = 12_000;
export const ATTRACT_MODE_FRAME_MS = 2_800;
const ATTRACT_MODE_SEED = 49_051;

export interface AttractMoment {
  id: string;
  label: string;
  headline: string;
  detail: string;
  accent: 'gold' | 'cyan' | 'green';
}

export interface AttractModeState {
  active: boolean;
  dismissed: boolean;
  frameIndex: number;
}

type AttractModeEvent =
  | { type: 'idle-timeout' }
  | { type: 'advance'; totalFrames: number }
  | { type: 'user-input' };

const INITIAL_STATE: AttractModeState = {
  active: false,
  dismissed: false,
  frameIndex: 0,
};

export function reduceAttractModeState(state: AttractModeState, event: AttractModeEvent): AttractModeState {
  if (event.type === 'user-input') {
    return {
      ...state,
      active: false,
      dismissed: true,
    };
  }

  if (state.dismissed) {
    return state;
  }

  if (event.type === 'idle-timeout') {
    return {
      ...state,
      active: true,
      frameIndex: 0,
    };
  }

  if (!state.active || event.totalFrames <= 0) {
    return state;
  }

  return {
    ...state,
    frameIndex: (state.frameIndex + 1) % event.totalFrames,
  };
}

export function buildAttractMoments(
  teams: Array<{ abbr: string; fullName: string; city: string }>,
  scenarios: Array<{ name: string; tagline: string; seasonLimit: number }>,
  conventionHeadline: string,
): AttractMoment[] {
  const seeded = mulberry32(ATTRACT_MODE_SEED);
  const rng = typeof seeded === 'function' ? seeded : () => 0.42;
  const firstTeam = teams[Math.floor(rng() * teams.length)] ?? teams[0];
  const secondTeam = teams[Math.floor(rng() * teams.length)] ?? teams[1] ?? teams[0];
  const scenario = scenarios[Math.floor(rng() * scenarios.length)] ?? scenarios[0];

  return [
    {
      id: 'broadcast-open',
      label: 'Broadcast Open',
      headline: `${firstTeam?.abbr ?? 'MFD'} primetime spotlight`,
      detail: `Demo reel locks onto ${firstTeam?.fullName ?? 'the league'} with a seeded studio rundown and instant skip on player input.`,
      accent: 'gold',
    },
    {
      id: 'draft-room',
      label: 'Draft Room',
      headline: `${secondTeam?.city ?? 'League'} war room is live`,
      detail: 'Scouts stack the board, trade phones light up, and the reveal card waits for the pick turn.',
      accent: 'cyan',
    },
    {
      id: 'scenario-challenge',
      label: 'Scenario Pulse',
      headline: `${scenario?.name ?? 'Rebuild'} // ${scenario?.seasonLimit ?? 5} year arc`,
      detail: scenario?.tagline ?? conventionHeadline,
      accent: 'green',
    },
  ];
}

interface AttractModeProps {
  teams: Array<{ abbr: string; fullName: string; city: string }>;
  scenarios: Array<{ name: string; tagline: string; seasonLimit: number }>;
  conventionHeadline: string;
}

export function AttractMode({ teams, scenarios, conventionHeadline }: AttractModeProps) {
  const [state, dispatch] = useReducer(reduceAttractModeState, INITIAL_STATE);
  const moments = useMemo(
    () => buildAttractMoments(teams, scenarios, conventionHeadline),
    [conventionHeadline, scenarios, teams],
  );

  useEffect(() => {
    if (state.dismissed) return undefined;

    const timeout = window.setTimeout(() => {
      dispatch({ type: 'idle-timeout' });
    }, ATTRACT_MODE_IDLE_MS);

    return () => window.clearTimeout(timeout);
  }, [state.dismissed]);

  useEffect(() => {
    if (!state.active || moments.length === 0) return undefined;

    const interval = window.setInterval(() => {
      dispatch({ type: 'advance', totalFrames: moments.length });
    }, ATTRACT_MODE_FRAME_MS);

    return () => window.clearInterval(interval);
  }, [moments.length, state.active]);

  useEffect(() => {
    const handleUserInput = () => dispatch({ type: 'user-input' });

    window.addEventListener('pointerdown', handleUserInput);
    window.addEventListener('keydown', handleUserInput);

    return () => {
      window.removeEventListener('pointerdown', handleUserInput);
      window.removeEventListener('keydown', handleUserInput);
    };
  }, []);

  if (!state.active || moments.length === 0) {
    return null;
  }

  const currentMoment = moments[state.frameIndex] ?? moments[0];
  if (!currentMoment) {
    return null;
  }

  return (
    <PixelPanel title="Attract Mode" accent={currentMoment.accent}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <PixelBadge variant={currentMoment.accent}>{currentMoment.label.toUpperCase()}</PixelBadge>
          <PixelBadge variant="default">DEMO REEL</PixelBadge>
        </div>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          padding: '10px',
          border: '3px solid var(--mfd-border)',
          background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.08) 0%, rgba(0, 229, 255, 0.04) 100%)',
        }}
        >
          <div style={{ fontFamily: 'var(--mfd-font-pixel)', fontSize: '10px', color: 'var(--mfd-gold)' }}>
            MFD NETWORK DEMO
          </div>
          <div style={{ fontFamily: 'var(--mfd-font-serif)', fontSize: '1.1rem', color: '#fff', fontWeight: 700 }}>
            {currentMoment.headline}
          </div>
          <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '0.72rem', color: 'var(--mfd-text-dim)', lineHeight: 1.7 }}>
            {currentMoment.detail}
          </div>
        </div>
      </div>
    </PixelPanel>
  );
}
