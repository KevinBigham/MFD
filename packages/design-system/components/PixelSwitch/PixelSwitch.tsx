import type { CSSProperties, ReactNode } from 'react';

type PixelSwitchAccent = 'default' | 'gold' | 'cyan' | 'green' | 'red';

interface PixelSwitchProps {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  accent?: PixelSwitchAccent;
  label?: ReactNode;
  description?: ReactNode;
  style?: CSSProperties;
}

const accentColor: Record<PixelSwitchAccent, string> = {
  default: 'var(--mfd-border)',
  gold: 'var(--mfd-gold)',
  cyan: 'var(--mfd-cyan)',
  green: 'var(--mfd-green)',
  red: 'var(--mfd-red)',
};

export function PixelSwitch({
  checked,
  onChange,
  disabled = false,
  accent = 'cyan',
  label,
  description,
  style,
}: PixelSwitchProps) {
  const color = accentColor[accent];

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      data-mfd-focusable="pixel-switch"
      onClick={() => {
        if (!disabled) {
          onChange?.(!checked);
        }
      }}
      style={{
        display: 'flex',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '10px 12px',
        border: `3px solid ${checked ? color : 'var(--mfd-border)'}`,
        background: checked ? 'rgba(0, 229, 255, 0.08)' : 'var(--mfd-bg-2)',
        color: disabled ? 'var(--mfd-text-faint)' : 'var(--mfd-text)',
        cursor: disabled ? 'default' : 'pointer',
        textAlign: 'left',
        ...style,
      }}
    >
      <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {label ? (
          <span style={{ fontFamily: 'var(--mfd-font-pixel)', fontSize: '8px', letterSpacing: '0.8px', color }}>
            {label}
          </span>
        ) : null}
        {description ? (
          <span style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text-dim)', lineHeight: 1.5 }}>
            {description}
          </span>
        ) : null}
      </span>

      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: checked ? 'flex-end' : 'flex-start',
        width: '56px',
        padding: '3px',
        border: `3px solid ${checked ? color : 'var(--mfd-border)'}`,
        background: checked ? 'rgba(0, 229, 255, 0.12)' : 'var(--mfd-bg-3)',
      }}
      >
        <span style={{
          width: '18px',
          height: '18px',
          background: checked ? color : 'var(--mfd-text-faint)',
          display: 'inline-block',
        }}
        />
      </span>
    </button>
  );
}
