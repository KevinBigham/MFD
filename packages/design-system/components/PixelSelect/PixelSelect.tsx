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
        padding: '9px 34px 9px 12px',
        border: `2px solid ${accentStyle.border}`,
        borderRadius: 'var(--mfd-rad-md)',
        background: disabled
          ? 'var(--mfd-bg-3)'
          : `linear-gradient(180deg, rgba(255, 255, 255, 0.07), transparent 48%), ${accentStyle.background}`,
        color: disabled ? 'var(--mfd-text-faint)' : accentStyle.color,
        fontFamily: 'var(--mfd-font-pixel)',
        fontSize: '8px',
        lineHeight: 1.25,
        letterSpacing: 0,
        textTransform: 'uppercase',
        boxShadow: disabled ? 'none' : 'var(--mfd-shadow-sm)',
        outline: 'none',
        cursor: disabled ? 'default' : 'pointer',
        appearance: 'none',
        backgroundImage: disabled
          ? undefined
          : `linear-gradient(45deg, transparent 50%, ${accentStyle.color} 50%), linear-gradient(135deg, ${accentStyle.color} 50%, transparent 50%)`,
        backgroundPosition: 'calc(100% - 18px) 50%, calc(100% - 13px) 50%',
        backgroundSize: '5px 5px, 5px 5px',
        backgroundRepeat: 'no-repeat',
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
