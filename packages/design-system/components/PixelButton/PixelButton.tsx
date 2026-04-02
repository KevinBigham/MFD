import { type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';

type PixelButtonAccent = 'default' | 'gold' | 'cyan' | 'green' | 'red';

interface PixelButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: ReactNode;
  accent?: PixelButtonAccent;
  className?: string;
  style?: CSSProperties;
}

const accentStyles: Record<PixelButtonAccent, { border: string; color: string; background: string }> = {
  default: {
    border: 'var(--mfd-border)',
    color: 'var(--mfd-text)',
    background: 'var(--mfd-bg-2)',
  },
  gold: {
    border: 'var(--mfd-gold)',
    color: 'var(--mfd-gold)',
    background: 'rgba(255, 215, 0, 0.08)',
  },
  cyan: {
    border: 'var(--mfd-cyan)',
    color: 'var(--mfd-cyan)',
    background: 'rgba(0, 229, 255, 0.08)',
  },
  green: {
    border: 'var(--mfd-green)',
    color: 'var(--mfd-green)',
    background: 'rgba(74, 222, 128, 0.08)',
  },
  red: {
    border: 'var(--mfd-red)',
    color: 'var(--mfd-red)',
    background: 'rgba(248, 113, 113, 0.08)',
  },
};

export function PixelButton({
  children,
  accent = 'default',
  className,
  disabled,
  style,
  type = 'button',
  ...props
}: PixelButtonProps) {
  const accentStyle = accentStyles[accent];

  return (
    <button
      type={type}
      data-mfd-focusable="pixel-button"
      className={className}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        minHeight: '34px',
        padding: '8px 12px',
        border: `3px solid ${accentStyle.border}`,
        background: disabled ? 'var(--mfd-bg-3)' : accentStyle.background,
        color: disabled ? 'var(--mfd-text-faint)' : accentStyle.color,
        fontFamily: 'var(--mfd-font-pixel)',
        fontSize: '8px',
        letterSpacing: '0.8px',
        textTransform: 'uppercase',
        cursor: disabled ? 'default' : 'pointer',
        boxShadow: disabled ? 'none' : 'var(--mfd-shadow-sm)',
        transition: 'transform var(--mfd-motion-fast), box-shadow var(--mfd-motion-fast)',
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}
