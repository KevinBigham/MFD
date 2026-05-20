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
  const titleId = `mfd-screen-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'screen'}`;

  return (
    <section
      data-mfd-pixel-screen-header="true"
      aria-labelledby={titleId}
      style={{
        display: 'grid',
        gap: '10px',
        padding: '16px 18px',
        border: '1px solid rgba(74, 222, 128, 0.46)',
        borderLeft: '4px solid var(--mfd-green)',
        borderRadius: 'var(--mfd-rad-lg)',
        background: 'var(--mfd-command-header-bg)',
        boxShadow: 'var(--mfd-shadow-panel)',
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '12px',
        flexWrap: 'wrap',
      }}
      >
        <span style={{
          fontFamily: 'var(--mfd-font-pixel)',
          fontSize: '9px',
          lineHeight: 1.35,
          letterSpacing: 0,
          color: 'var(--mfd-green)',
          textTransform: 'uppercase',
        }}
        >
          {kicker}
        </span>
        {badges ? (
          <div
            data-mfd-screen-header-badges="true"
            style={{
              display: 'flex',
              gap: '6px',
              alignItems: 'center',
              justifyContent: 'flex-end',
              flexWrap: 'wrap',
              maxWidth: 'min(100%, 520px)',
            }}
          >
            {badges}
          </div>
        ) : null}
      </div>
      <div>
        <h1
          id={titleId}
          data-mfd-pixel-screen-title="true"
          style={{
            margin: 0,
            fontFamily: 'var(--mfd-font-display)',
            fontSize: '34px',
            color: 'var(--mfd-text)',
            lineHeight: 0.95,
            letterSpacing: 0,
          }}
        >
          {title.toUpperCase()}
        </h1>
        {subtitle ? (
          <div style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '12px', lineHeight: 1.55, color: 'var(--mfd-text-dim)', marginTop: '8px' }}>
            {subtitle}
          </div>
        ) : null}
      </div>
    </section>
  );
}
