import type { ReactNode } from 'react';

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
      }}
      >
        <span style={{
          fontFamily: 'var(--mfd-font-pixel)',
          fontSize: '10px',
          letterSpacing: '0.8px',
          color: 'var(--mfd-green)',
        }}
        >
          {kicker}
        </span>
        {badges ? (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {badges}
          </div>
        ) : null}
      </div>
      <div>
        <div style={{ fontFamily: 'var(--mfd-font-display)', fontSize: '28px', color: '#fff', lineHeight: 1 }}>
          {title.toUpperCase()}
        </div>
        {subtitle ? (
          <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text-dim)', marginTop: '6px' }}>
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}
