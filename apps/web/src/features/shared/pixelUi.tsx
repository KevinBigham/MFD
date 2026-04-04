import type { CSSProperties, ReactNode } from 'react';
import {
  PixelBadge,
  PixelConsequenceList as DesignSystemPixelConsequenceList,
  PixelMetricCard as DesignSystemPixelMetricCard,
  PixelPanel,
  PixelPlayerLink as DesignSystemPixelPlayerLink,
  PixelScreenHeader as DesignSystemPixelScreenHeader,
} from '@mfd/design-system/components';

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
  return <DesignSystemPixelScreenHeader title={title} subtitle={subtitle} badges={badges} kicker={kicker} />;
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
  return <DesignSystemPixelMetricCard label={label} value={value} detail={detail} accent={accent} badge={badge} />;
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
  return <DesignSystemPixelConsequenceList items={items} />;
}

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
  return <DesignSystemPixelPlayerLink playerId={playerId} name={name} ovr={ovr} style={style} title={title} />;
}
