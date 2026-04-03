import type { CSSProperties, ReactNode } from 'react';
import { PixelBadge, PixelPanel } from '@mfd/design-system/components';

export type PixelAccent = 'default' | 'gold' | 'cyan' | 'green' | 'red';

export const pixel = { fontFamily: 'var(--mfd-font-pixel)', fontSize: '8px', letterSpacing: '0.8px' } as const;
export const pixelSm = { fontFamily: 'var(--mfd-font-pixel)', fontSize: '7px', letterSpacing: '0.8px' } as const;
export const display = { fontFamily: 'var(--mfd-font-display)' } as const;
export const mono = { fontFamily: 'var(--mfd-font-mono)', fontSize: '12px' } as const;
export const monoSm = { fontFamily: 'var(--mfd-font-mono)', fontSize: '11px' } as const;

export const screenStackStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
} as const;

export function autoGrid(minWidth = 280): CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}px, 1fr))`,
    gap: '12px',
  };
}

interface PixelScreenHeaderProps {
  title: string;
  subtitle?: string;
  badges?: ReactNode;
  kicker?: string;
}

export function PixelScreenHeader({
  title,
  subtitle,
  badges,
  kicker = 'MFD NETWORK',
}: PixelScreenHeaderProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        paddingBottom: '6px',
        borderBottom: '3px solid var(--mfd-green)',
        flexWrap: 'wrap',
      }}>
        <span style={{ ...pixel, fontSize: '10px', color: 'var(--mfd-green)' }}>
          {kicker}
        </span>
        {badges ? (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {badges}
          </div>
        ) : null}
      </div>
      <div>
        <div style={{ ...display, fontSize: '28px', color: '#fff', lineHeight: 1 }}>
          {title.toUpperCase()}
        </div>
        {subtitle ? (
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)', marginTop: '6px' }}>
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface PixelMetricCardProps {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  accent?: PixelAccent;
  badge?: ReactNode;
}

export function PixelMetricCard({
  label,
  value,
  detail,
  accent = 'default',
  badge,
}: PixelMetricCardProps) {
  return (
    <PixelPanel title={label} accent={accent}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
          <span style={{ ...display, fontSize: '30px', color: '#fff', lineHeight: 1 }}>
            {value}
          </span>
          {badge}
        </div>
        {detail ? (
          <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>
            {detail}
          </div>
        ) : null}
      </div>
    </PixelPanel>
  );
}

interface PixelKeyValueRowProps {
  label: string;
  value: ReactNode;
  accent?: PixelAccent;
  badge?: ReactNode;
}

export function PixelKeyValueRow({
  label,
  value,
  accent = 'default',
  badge,
}: PixelKeyValueRowProps) {
  const variant = accent === 'default' ? 'default' : accent;
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '12px',
      padding: '8px 0',
      borderBottom: '1px solid #1a1a1a',
    }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ ...monoSm, color: '#ddd' }}>{label}</span>
        {badge}
      </div>
      <PixelBadge variant={variant}>{value}</PixelBadge>
    </div>
  );
}

interface PixelConsequenceListProps {
  items: Array<{
    id: string;
    label: string;
    delta: string;
    accent: PixelAccent;
  }>;
}

export function PixelConsequenceList({ items }: PixelConsequenceListProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {items.map((item) => (
        <div key={item.id} style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '12px',
          paddingLeft: '8px',
          borderLeft: `3px solid ${consequenceColor[item.accent]}`,
        }}>
          <span style={{ ...monoSm, color: '#aaa' }}>{item.label}</span>
          <span style={{ ...pixelSm, color: consequenceColor[item.accent] }}>{item.delta}</span>
        </div>
      ))}
    </div>
  );
}

const consequenceColor: Record<PixelAccent, string> = {
  default: 'var(--mfd-text-dim)',
  gold: 'var(--mfd-gold)',
  cyan: 'var(--mfd-cyan)',
  green: 'var(--mfd-green)',
  red: 'var(--mfd-red)',
};

interface PlayerNameLinkProps {
  playerId: string;
  name: string;
  ovr?: number;
  style?: CSSProperties;
  title?: string;
}

export function PlayerNameLink({
  playerId,
  name,
  ovr,
  style,
  title,
}: PlayerNameLinkProps) {
  const color = (ovr ?? 0) >= 90 ? 'var(--mfd-gold)' : 'var(--mfd-text)';

  return (
    <button
      type="button"
      title={title ?? `Open ${name}`}
      onClick={(event) => {
        event.stopPropagation();
        if (typeof window !== 'undefined') {
          window.history.pushState({}, '', `/player/${playerId}`);
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      }}
      style={{
        border: 'none',
        background: 'transparent',
        padding: 0,
        margin: 0,
        cursor: 'pointer',
        color,
        textAlign: 'left',
        textDecoration: 'underline',
        textDecorationColor: (ovr ?? 0) >= 90 ? 'var(--mfd-gold)' : 'var(--mfd-cyan)',
        textUnderlineOffset: '2px',
        ...style,
      }}
    >
      {name}
    </button>
  );
}
