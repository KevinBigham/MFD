export type StandingsSignalKind =
  | 'fire'
  | 'ice'
  | 'seed_locked'
  | 'seed_bubble'
  | 'seed_out'
  | 'division_leader';

interface StandingsSignalSvgProps {
  kind: StandingsSignalKind;
  title: string;
  size?: number;
}

export function StandingsSignalSvg({ kind, title, size = 16 }: StandingsSignalSvgProps) {
  return (
    <span title={title} style={{ display: 'inline-flex', flexShrink: 0 }}>
      <svg
        aria-label={title}
        data-standings-signal={kind}
        focusable="false"
        height={size}
        role="img"
        style={{ display: 'inline-block', verticalAlign: 'middle' }}
        viewBox="0 0 16 16"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <title>{title}</title>
        {renderSignal(kind)}
      </svg>
    </span>
  );
}

export function StreakSignalSvg({ streak }: { streak: number }) {
  if (streak >= 4) return <StandingsSignalSvg kind="fire" title="Hot streak (W4+)" />;
  if (streak <= -3) return <StandingsSignalSvg kind="ice" title="Cold streak (L3+)" />;
  return null;
}

function renderSignal(kind: StandingsSignalKind) {
  switch (kind) {
    case 'fire':
      return (
        <>
          <defs>
            <linearGradient id="standings-fire-gradient" x1="4" x2="12" y1="2" y2="15" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="var(--mfd-gold)" />
              <stop offset="1" stopColor="var(--mfd-red)" />
            </linearGradient>
          </defs>
          <path
            d="M8.1 14.4c-2.9 0-4.8-1.8-4.8-4.4 0-1.8 1-3.3 2.6-4.5.6-.5 1.1-1.3 1.1-2.2 1.6.7 2.5 1.8 2.5 3.3.6-.5 1-1.3 1-2.2 1.5 1 2.3 2.8 2.3 4.7 0 3.1-2 5.3-4.7 5.3Z"
            fill="url(#standings-fire-gradient)"
            stroke="var(--mfd-red)"
            strokeLinejoin="round"
          />
          <path
            d="M8 13.1c-1.1 0-1.9-.7-1.9-1.8 0-.8.5-1.5 1.2-2 .3-.2.5-.6.5-1 .9.5 1.8 1.5 1.8 2.7 0 1.2-.7 2.1-1.6 2.1Z"
            fill="var(--mfd-gold)"
          />
        </>
      );
    case 'ice':
      return (
        <g fill="none" stroke="var(--mfd-cyan)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4">
          <path d="M8 2v12" />
          <path d="M2.8 5 13.2 11" />
          <path d="M13.2 5 2.8 11" />
          <path d="M5.7 3.6 8 5.2l2.3-1.6" />
          <path d="M5.7 12.4 8 10.8l2.3 1.6" />
          <path d="m2.8 7.6 2.5-.3-1-2.3" />
          <path d="m13.2 8.4-2.5.3 1 2.3" />
        </g>
      );
    case 'seed_locked':
      return (
        <g fill="var(--mfd-gold)" stroke="var(--mfd-gold)" strokeLinejoin="round" strokeWidth="1.1">
          <path d="m8 2.2 1.7 3.4 3.8.6-2.8 2.7.7 3.8L8 10.9l-3.4 1.8.7-3.8-2.8-2.7 3.8-.6L8 2.2Z" />
          <path d="M5.7 13.7h4.6" strokeLinecap="round" />
        </g>
      );
    case 'seed_bubble':
      return (
        <path
          d="m8 2.2 1.7 3.4 3.8.6-2.8 2.7.7 3.8L8 10.9l-3.4 1.8.7-3.8-2.8-2.7 3.8-.6L8 2.2Z"
          fill="none"
          stroke="var(--mfd-gold)"
          strokeLinejoin="round"
          strokeWidth="1.4"
        />
      );
    case 'seed_out':
      return (
        <g fill="none" stroke="var(--mfd-text-dim)" strokeLinecap="round" strokeWidth="1.7">
          <path d="m4.2 4.2 7.6 7.6" />
          <path d="m11.8 4.2-7.6 7.6" />
          <path d="M3 13h10" opacity="0.65" />
        </g>
      );
    case 'division_leader':
      return (
        <g fill="none" stroke="var(--mfd-gold)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2">
          <path d="M6.2 12.8C4.1 11.2 3 9 3 6.4" />
          <path d="M9.8 12.8c2.1-1.6 3.2-3.8 3.2-6.4" />
          <path d="M4 8.6 2.4 7.5" />
          <path d="M4.8 10.6 3 10.1" />
          <path d="M5.9 12.2l-1.7.2" />
          <path d="m12 8.6 1.6-1.1" />
          <path d="m11.2 10.6 1.8-.5" />
          <path d="m10.1 12.2 1.7.2" />
          <path d="m8 3 1 2 2.2.3-1.6 1.5.4 2.2L8 8 6 9l.4-2.2-1.6-1.5L7 5l1-2Z" />
        </g>
      );
  }
}
