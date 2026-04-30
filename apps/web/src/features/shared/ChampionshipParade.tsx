import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { PixelButton } from '@mfd/design-system/components';
import { display, monoSm, pixel } from './pixelUi';
import { ParadeFloat } from './paradeFloatSvg';

export interface ChampionshipParadeProps {
  teamCity: string;
  teamName: string;
  year: number;
  seasonRecord: string;
  pointDifferential?: number;
  mvpName?: string;
  mvpNumber?: number | string;
  headCoachName?: string;
  coordinatorBadges?: string[];
  keyMoments?: string[];
  reducedMotion?: boolean;
  onDismiss: () => void;
}

const FLOATS = ['trophy', 'mvp', 'coaches', 'fans'] as const;

function confettiPieceStyle(index: number, reducedMotion: boolean): CSSProperties {
  const colors = ['var(--mfd-gold)', 'var(--mfd-cyan)', 'var(--mfd-green)', 'var(--mfd-text)'];
  return {
    position: 'absolute',
    top: reducedMotion ? `${10 + (index % 8) * 8}%` : '-18px',
    left: `${(index * 13) % 100}%`,
    width: `${4 + (index % 4) * 2}px`,
    height: `${12 + (index % 3) * 4}px`,
    background: colors[index % colors.length],
    opacity: reducedMotion ? 0.2 : 0.72,
    transform: `rotate(${(index * 31) % 360}deg)`,
    animation: reducedMotion ? 'none' : `mfdParadeConfetti ${2.2 + (index % 5) * 0.3}s ease-in ${(index % 7) * 0.09}s infinite`,
  };
}

function paradeFloatStyle(index: number, activeIndex: number, reducedMotion: boolean): CSSProperties {
  if (reducedMotion) {
    return {
      width: 'min(600px, calc(100vw - 32px))',
      flex: '0 0 min(600px, calc(100vw - 32px))',
      opacity: index === activeIndex ? 1 : 0.38,
      transform: 'none',
      animation: 'none',
    };
  }

  return {
    width: 'min(600px, calc(100vw - 32px))',
    flex: '0 0 min(600px, calc(100vw - 32px))',
    animation: `mfdParadeFloat 8s linear ${index * 1.6}s infinite`,
  };
}

function TrophyFloatProp() {
  return (
    <g data-testid="parade-trophy-prop">
      <path d="M48 40 C38 30 38 12 56 8 C74 12 74 30 64 40 Z" fill="var(--mfd-gold)" stroke="var(--mfd-text)" strokeWidth="3" />
      <path d="M56 40 L56 58 M42 58 L70 58 M36 68 L76 68" fill="none" stroke="var(--mfd-gold)" strokeWidth="5" strokeLinecap="round" />
    </g>
  );
}

function MvpFloatProp({ name, number }: { name: string; number: number | string }) {
  return (
    <g data-testid="parade-mvp-prop">
      <path d="M34 10 L78 10 L88 56 L24 56 Z" fill="var(--mfd-bg-dim)" stroke="var(--mfd-gold)" strokeWidth="3" />
      <text x="56" y="40" textAnchor="middle" fill="var(--mfd-gold)" fontFamily="var(--mfd-font-display)" fontSize="24">
        {number}
      </text>
      <text x="56" y="72" textAnchor="middle" fill="var(--mfd-text)" fontFamily="var(--mfd-font-pixel)" fontSize="8">
        {name.toUpperCase()}
      </text>
    </g>
  );
}

function CoachesFloatProp({ coach, badges }: { coach: string; badges: string[] }) {
  return (
    <g data-testid="parade-coaches-prop">
      <path d="M54 12 m-14 0 a14 14 0 1 0 28 0 a14 14 0 1 0 -28 0" fill="var(--mfd-cyan)" />
      <path d="M30 62 C34 38 74 38 78 62 Z" fill="var(--mfd-bg-dim)" stroke="var(--mfd-cyan)" strokeWidth="3" />
      <text x="54" y="76" textAnchor="middle" fill="var(--mfd-text)" fontFamily="var(--mfd-font-pixel)" fontSize="8">
        {coach.toUpperCase()}
      </text>
      {badges.slice(0, 2).map((badge, index) => (
        <text key={badge} x={12 + index * 84} y="94" fill="var(--mfd-green)" fontFamily="var(--mfd-font-pixel)" fontSize="7">
          {badge.toUpperCase()}
        </text>
      ))}
    </g>
  );
}

function FanFloatProp() {
  return (
    <g data-testid="parade-fan-prop">
      {[20, 40, 60, 80].map((x) => (
        <path key={x} d={`M${x} 52 L${x - 8} 74 L${x + 8} 74 Z`} fill="var(--mfd-text-dim)" />
      ))}
      <path d="M8 10 L104 10 L104 32 L8 32 Z" fill="var(--mfd-green)" />
      <text x="56" y="25" textAnchor="middle" fill="var(--mfd-bg)" fontFamily="var(--mfd-font-pixel)" fontSize="8">
        FOREVER CHAMPIONS
      </text>
    </g>
  );
}

function buildTickerText({
  teamCity,
  teamName,
  year,
  seasonRecord,
  pointDifferential,
  mvpName,
  keyMoments,
}: ChampionshipParadeProps): string {
  return [
    `${year} ${teamCity} ${teamName} championship parade`,
    `Record ${seasonRecord}`,
    pointDifferential === undefined ? null : `Point differential ${pointDifferential >= 0 ? '+' : ''}${pointDifferential}`,
    mvpName ? `MVP ${mvpName}` : null,
    ...(keyMoments ?? []).slice(0, 2),
  ].filter((entry): entry is string => Boolean(entry)).join(' /// ');
}

function renderFloatContent(kind: typeof FLOATS[number], props: ChampionshipParadeProps): ReactNode {
  if (kind === 'trophy') return <TrophyFloatProp />;
  if (kind === 'mvp') return <MvpFloatProp name={props.mvpName ?? 'Title MVP'} number={props.mvpNumber ?? 1} />;
  if (kind === 'coaches') return <CoachesFloatProp coach={props.headCoachName ?? 'Head Coach'} badges={props.coordinatorBadges ?? ['OC', 'DC']} />;
  return <FanFloatProp />;
}

export function ChampionshipParade(props: ChampionshipParadeProps) {
  const {
    teamCity,
    teamName,
    year,
    reducedMotion = false,
    onDismiss,
  } = props;
  const [activeFloatIndex, setActiveFloatIndex] = useState(0);
  const tickerText = useMemo(() => buildTickerText(props), [props]);

  useEffect(() => {
    if (!reducedMotion) return undefined;
    const advance = () => setActiveFloatIndex((index) => (index + 1) % FLOATS.length);
    window.addEventListener('keydown', advance);
    return () => window.removeEventListener('keydown', advance);
  }, [reducedMotion]);

  return (
    <div
      role="dialog"
      aria-label="Championship parade"
      data-parade-motion={reducedMotion ? 'reduced' : 'animated'}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        overflow: 'hidden',
        background: 'var(--mfd-bg)',
        color: 'var(--mfd-text)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <style>{`
        @keyframes mfdParadeFloat {
          0% { transform: translateX(110vw); }
          100% { transform: translateX(-120vw); }
        }
        @keyframes mfdParadeTicker {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        @keyframes mfdParadeConfetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 0.75; }
          100% { transform: translateY(100vh) rotate(540deg); opacity: 0; }
        }
      `}</style>

      {Array.from({ length: 36 }, (_, index) => (
        <span key={index} aria-hidden="true" style={confettiPieceStyle(index, reducedMotion)} />
      ))}

      <header style={{ position: 'relative', zIndex: 1, textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ ...pixel, color: 'var(--mfd-cyan)', marginBottom: '8px' }}>{year} PARADE ROUTE</div>
        <div style={{ ...display, fontSize: '42px', color: 'var(--mfd-gold)', lineHeight: 1 }}>
          {teamCity.toUpperCase()} {teamName.toUpperCase()}
        </div>
      </header>

      <div
        data-testid="championship-parade-track"
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          gap: '28px',
          alignItems: 'center',
          overflow: 'hidden',
          minHeight: '300px',
          padding: '0 16px',
          justifyContent: reducedMotion ? 'flex-start' : 'initial',
        }}
      >
        {FLOATS.map((kind, index) => (
          <div
            key={kind}
            data-testid="championship-parade-float"
            data-float-kind={kind}
            data-current-float={index === activeFloatIndex ? 'true' : 'false'}
            style={paradeFloatStyle(index, activeFloatIndex, reducedMotion)}
          >
            <ParadeFloat banner={kind === 'trophy' ? 'TROPHY FLOAT' : kind === 'mvp' ? 'MVP FLOAT' : kind === 'coaches' ? 'COACHING STAFF' : 'FAN FLOAT'}>
              {renderFloatContent(kind, props)}
            </ParadeFloat>
          </div>
        ))}
      </div>

      {reducedMotion ? (
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '12px' }}>
          <PixelButton accent="default" onClick={() => setActiveFloatIndex((index) => (index + FLOATS.length - 1) % FLOATS.length)}>
            Prev
          </PixelButton>
          <PixelButton accent="cyan" onClick={() => setActiveFloatIndex((index) => (index + 1) % FLOATS.length)}>
            Next
          </PixelButton>
        </div>
      ) : null}

      <div
        data-testid="championship-parade-ticker"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: '22px',
          overflow: 'hidden',
          borderTop: '2px solid var(--mfd-gold)',
          borderBottom: '2px solid var(--mfd-gold)',
          background: 'var(--mfd-bg-2)',
          padding: '8px 0',
        }}
      >
        <div style={{
          ...monoSm,
          color: 'var(--mfd-text)',
          whiteSpace: 'nowrap',
          animation: reducedMotion ? 'none' : 'mfdParadeTicker 18s linear infinite',
          transform: reducedMotion ? 'none' : undefined,
        }}
        >
          {tickerText}
        </div>
      </div>

      <div style={{ position: 'absolute', right: '16px', bottom: '72px', zIndex: 2 }}>
        <PixelButton accent="gold" onClick={onDismiss}>
          END PARADE
        </PixelButton>
      </div>
    </div>
  );
}
