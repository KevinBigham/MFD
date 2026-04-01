import { type CSSProperties, type ReactNode } from 'react';

interface MfdPanelProps {
  children: ReactNode;
  title?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  variant?: 'default' | 'glass' | 'bordered';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  style?: CSSProperties;
}

const paddingMap = {
  none: '0',
  sm: 'var(--mfd-sp-sm)',
  md: 'var(--mfd-sp-md)',
  lg: 'var(--mfd-sp-lg)',
};

export function MfdPanel({
  children,
  title,
  icon,
  actions,
  variant = 'default',
  padding = 'md',
  className,
  style,
}: MfdPanelProps) {
  const bg = variant === 'glass'
    ? 'var(--mfd-glass)'
    : 'var(--mfd-surface)';

  return (
    <section
      className={className}
      style={{
        background: bg,
        border: '1px solid var(--mfd-border)',
        borderRadius: 'var(--mfd-rad-lg)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {title && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `var(--mfd-sp-sm) ${paddingMap[padding]}`,
          borderBottom: '1px solid var(--mfd-border)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--mfd-sp-sm)',
          }}>
            {icon && (
              <span style={{ color: 'var(--mfd-gold)', display: 'flex' }}>
                {icon}
              </span>
            )}
            <span style={{
              fontSize: '0.75rem',
              fontFamily: 'var(--mfd-font-mono)',
              fontWeight: 600,
              color: 'var(--mfd-text)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>
              {title}
            </span>
          </div>
          {actions}
        </div>
      )}
      <div style={{ padding: paddingMap[padding] }}>
        {children}
      </div>
    </section>
  );
}
