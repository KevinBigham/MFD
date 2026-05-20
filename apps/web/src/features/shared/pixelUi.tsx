import type { CSSProperties, ReactNode } from 'react';
import {
  PixelConsequenceList as DesignSystemPixelConsequenceList,
  PixelButton,
  PixelMetricCard as DesignSystemPixelMetricCard,
  PixelPanel,
  PixelPlayerLink as DesignSystemPixelPlayerLink,
  PixelScreenHeader as DesignSystemPixelScreenHeader,
} from '@mfd/design-system/components';
import { resolveTeamContentFromStore } from '../../lib/team-content-resolver';

export type PixelAccent = 'default' | 'gold' | 'cyan' | 'green' | 'red';

export const pixel = { fontFamily: 'var(--mfd-font-pixel)', fontSize: '9px', letterSpacing: 0, lineHeight: 1.35 } as const;
export const pixelSm = { fontFamily: 'var(--mfd-font-pixel)', fontSize: '8px', letterSpacing: 0, lineHeight: 1.35 } as const;
export const display = { fontFamily: 'var(--mfd-font-display)' } as const;
export const mono = { fontFamily: 'var(--mfd-font-mono)', fontSize: '12px', lineHeight: 1.5 } as const;
export const monoSm = { fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', lineHeight: 1.55 } as const;

/** Navigate to a route — works with both browser history and hash history. */
export function navigateTo(path: string): void {
  if (typeof window === 'undefined') return;
  window.location.hash = path;
}

export const screenStackStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
  width: '100%',
} as const;

export function autoGrid(minWidth = 280, minColumns = 1): CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fit, minmax(min(${minWidth}px, 100%), 1fr))`,
    gap: '16px',
    '--mfd-auto-grid-min': `${minWidth}px`,
    '--mfd-auto-grid-min-columns': String(Math.max(1, minColumns)),
  } as CSSProperties;
}

export function teamThemeVars(teamIdOrAbbr: string | undefined): CSSProperties {
  if (!teamIdOrAbbr) {
    return {
      '--mfd-team-primary': 'var(--mfd-gold)',
      '--mfd-team-secondary': 'var(--mfd-cyan)',
      '--mfd-team-tertiary': 'var(--mfd-red)',
    } as CSSProperties;
  }

  // Resolver bridges runtime uid → canonical abbr via the live game store, so call sites
  // that pass `userTeam.id` (a uid) stop silently falling back to default colors.
  const content = resolveTeamContentFromStore(teamIdOrAbbr);
  return {
    '--mfd-team-primary': content?.primaryColor ?? 'var(--mfd-gold)',
    '--mfd-team-secondary': content?.secondaryColor ?? 'var(--mfd-cyan)',
    '--mfd-team-tertiary': content?.tertiaryColor ?? 'var(--mfd-red)',
  } as CSSProperties;
}

export function teamIdFromDynastyId(dynastyId: string): string | null {
  const [, teamId, startYear] = dynastyId.split(':');
  if (!teamId || !startYear) return null;
  return teamId;
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

interface CommandCalloutAction {
  label: string;
  accent?: PixelAccent;
  onClick: () => void;
  disabled?: boolean;
}

interface CommandCalloutProps {
  title: string;
  body: ReactNode;
  eyebrow?: string;
  accent?: PixelAccent;
  meta?: ReactNode;
  actions?: CommandCalloutAction[];
  framed?: boolean;
}

export function CommandCallout({
  title,
  body,
  eyebrow = 'Next Call',
  accent = 'gold',
  meta,
  actions = [],
  framed = true,
}: CommandCalloutProps) {
  const content = (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))',
        gap: '14px',
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
        {!framed ? <div style={{ ...pixelSm, color: 'var(--mfd-text-faint)', textTransform: 'uppercase' }}>{eyebrow}</div> : null}
        <div style={{ ...pixel, color: 'var(--mfd-text)', textTransform: 'uppercase' }}>{title}</div>
        <div style={{ ...monoSm, color: 'var(--mfd-text-dim)' }}>{body}</div>
        {meta ? <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>{meta}</div> : null}
      </div>
      {actions.length > 0 ? (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
          {actions.map((action) => (
            <PixelButton
              key={action.label}
              accent={action.accent ?? 'gold'}
              disabled={action.disabled}
              onClick={action.onClick}
              style={{ minWidth: 132 }}
            >
              {action.label}
            </PixelButton>
          ))}
        </div>
      ) : null}
    </div>
  );

  if (!framed) {
    return (
      <div
        data-mfd-command-callout="inline"
        style={{
          padding: '12px',
          border: '1px dashed var(--mfd-border-strong)',
          borderLeft: `3px solid var(--mfd-${accent === 'default' ? 'border-strong' : accent})`,
          background: 'rgba(255, 255, 255, 0.025)',
        }}
      >
        {content}
      </div>
    );
  }

  return (
    <PixelPanel title={eyebrow} accent={accent}>
      {content}
    </PixelPanel>
  );
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
