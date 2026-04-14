import type { CSSProperties } from 'react';

export interface PixelEkgPoint {
  time: number;
  wp: number;
  event?: string;
}

interface PixelEkgProps {
  points: PixelEkgPoint[];
  className?: string;
  style?: CSSProperties;
}

const VIEWBOX_WIDTH = 960;
const VIEWBOX_HEIGHT = 240;
const PADDING_X = 24;
const PADDING_Y = 24;

function eventColor(event?: string): string {
  const value = event?.toLowerCase() ?? '';
  if (value.includes('turnover') || value.includes('interception') || value.includes('fumble')) {
    return 'var(--mfd-red)';
  }
  if (value.includes('touchdown') || value.includes('score') || value.includes('field goal')) {
    return 'var(--mfd-gold)';
  }
  return 'var(--mfd-green)';
}

function xFor(point: PixelEkgPoint, minTime: number, maxTime: number): number {
  if (minTime === maxTime) return VIEWBOX_WIDTH / 2;
  return PADDING_X + ((point.time - minTime) / (maxTime - minTime)) * (VIEWBOX_WIDTH - (PADDING_X * 2));
}

function yFor(wp: number): number {
  const clamped = Math.max(0, Math.min(100, wp));
  return VIEWBOX_HEIGHT - PADDING_Y - (clamped / 100) * (VIEWBOX_HEIGHT - (PADDING_Y * 2));
}

function buildStepPath(points: PixelEkgPoint[]): string {
  if (points.length === 0) return '';
  const minTime = Math.min(...points.map((point) => point.time));
  const maxTime = Math.max(...points.map((point) => point.time));
  const first = points[0]!;
  let path = `M ${xFor(first, minTime, maxTime)} ${yFor(first.wp)}`;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]!;
    const current = points[index]!;
    const x = xFor(current, minTime, maxTime);
    path += ` L ${x} ${yFor(previous.wp)} L ${x} ${yFor(current.wp)}`;
  }

  return path;
}

export function PixelEkg({ points, className, style }: PixelEkgProps) {
  if (points.length === 0) {
    return (
      <div
        data-testid="pixel-ekg-empty"
        className={className}
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '180px',
          border: '2px solid var(--mfd-border)',
          background: 'var(--mfd-bg)',
          color: 'var(--mfd-text-dim)',
          fontFamily: 'var(--mfd-font-pixel)',
          fontSize: '8px',
          letterSpacing: '1px',
        }}
      >
        NO SIGNAL
      </div>
    );
  }

  const minTime = Math.min(...points.map((point) => point.time));
  const maxTime = Math.max(...points.map((point) => point.time));
  const path = buildStepPath(points);

  return (
    <div
      data-testid="pixel-ekg"
      className={className}
      style={{
        ...style,
        width: '100%',
        minHeight: '180px',
        border: '2px solid var(--mfd-border)',
        background: 'var(--mfd-bg)',
        boxShadow: 'var(--mfd-pixel-glow-green)',
      }}
    >
      <svg
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Win probability EKG"
        style={{ display: 'block', width: '100%', height: '100%' }}
      >
        <rect width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="var(--mfd-bg)" />
        {Array.from({ length: 12 }, (_, index) => (
          <line
            key={`grid-y-${index}`}
            x1={PADDING_X}
            x2={VIEWBOX_WIDTH - PADDING_X}
            y1={PADDING_Y + index * 16}
            y2={PADDING_Y + index * 16}
            stroke="var(--mfd-green)"
            strokeOpacity="0.12"
            strokeWidth="1"
          />
        ))}
        {Array.from({ length: 10 }, (_, index) => (
          <line
            key={`grid-x-${index}`}
            x1={PADDING_X + index * 96}
            x2={PADDING_X + index * 96}
            y1={PADDING_Y}
            y2={VIEWBOX_HEIGHT - PADDING_Y}
            stroke="var(--mfd-green)"
            strokeOpacity="0.08"
            strokeWidth="1"
          />
        ))}
        <path
          d={path}
          fill="none"
          stroke="var(--mfd-green)"
          strokeWidth="4"
          strokeLinejoin="miter"
          strokeLinecap="square"
        />
        {points.map((point, index) => {
          const x = xFor(point, minTime, maxTime);
          const y = yFor(point.wp);
          const color = eventColor(point.event);
          return point.event ? (
            <g key={`${point.time}-${index}`} data-testid="pixel-ekg-spike">
              <line x1={x} x2={x} y1={VIEWBOX_HEIGHT - PADDING_Y} y2={y} stroke={color} strokeWidth="3" />
              <rect x={x - 4} y={y - 4} width="8" height="8" fill={color} />
            </g>
          ) : null;
        })}
      </svg>
    </div>
  );
}
