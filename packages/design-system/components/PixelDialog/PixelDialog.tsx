import { type CSSProperties, type ReactNode } from 'react';

interface PixelDialogProps {
  speaker?: string;
  children: ReactNode;
  accent?: 'cyan' | 'green' | 'gold';
  showCursor?: boolean;
  className?: string;
  style?: CSSProperties;
}

const accentColors: Record<string, string> = {
  cyan:  'var(--mfd-cyan)',
  green: 'var(--mfd-green)',
  gold:  'var(--mfd-gold)',
};

export function PixelDialog({
  speaker,
  children,
  accent = 'cyan',
  showCursor = true,
  className,
  style,
}: PixelDialogProps) {
  const color = accentColors[accent];
  return (
    <div
      className={className}
      style={{
        background: 'var(--mfd-bg-2)',
        border: `3px solid ${color}`,
        padding: '10px 12px',
        ...style,
      }}
    >
      {speaker && (
        <div style={{
          fontFamily: 'var(--mfd-font-pixel)',
          fontSize: '7px',
          color,
          marginBottom: '4px',
          letterSpacing: '0.5px',
        }}>
          {speaker.toUpperCase()}
        </div>
      )}
      <div style={{
        fontFamily: 'var(--mfd-font-pixel)',
        fontSize: '8px',
        color: '#ccc',
        lineHeight: 2,
      }}>
        {children}
        {showCursor && (
          <span style={{
            display: 'inline-block',
            width: '7px',
            height: '10px',
            background: color,
            verticalAlign: 'middle',
            marginLeft: '2px',
            animation: 'mfd-blink 0.7s step-end infinite',
          }} />
        )}
      </div>
    </div>
  );
}
