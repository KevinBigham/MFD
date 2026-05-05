import { type CSSProperties, type SelectHTMLAttributes } from 'react';

type PixelSelectAccent = 'default' | 'gold' | 'cyan' | 'green' | 'red';

export interface PixelSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface PixelSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  options: PixelSelectOption[];
  accent?: PixelSelectAccent;
  style?: CSSProperties;
}

const accentStyles: Record<PixelSelectAccent, { border: string; color: string; background: string }> = {
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

export function PixelSelect({
  options,
  accent = 'default',
  disabled,
  style,
  ...props
}: PixelSelectProps) {
  const accentStyle = accentStyles[accent];

  return (
    <select
      data-mfd-focusable="pixel-select"
      disabled={disabled}
      style={{
        minHeight: 'var(--mfd-touch-min)',
        padding: '8px 10px',
        border: `3px solid ${accentStyle.border}`,
        background: disabled ? 'var(--mfd-bg-3)' : accentStyle.background,
        color: disabled ? 'var(--mfd-text-faint)' : accentStyle.color,
        fontFamily: 'var(--mfd-font-pixel)',
        fontSize: '8px',
        letterSpacing: '0.8px',
        textTransform: 'uppercase',
        boxShadow: disabled ? 'none' : 'var(--mfd-shadow-sm)',
        outline: 'none',
        cursor: disabled ? 'default' : 'pointer',
        ...style,
      }}
      {...props}
    >
      {options.map((option) => (
        <option
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          style={{
            background: 'var(--mfd-bg-2)',
            color: 'var(--mfd-text)',
          }}
        >
          {option.label}
        </option>
      ))}
    </select>
  );
}
