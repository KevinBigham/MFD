import { type CSSProperties, type ReactNode } from 'react';
import { X } from 'lucide-react';

type Accent = 'default' | 'gold' | 'cyan' | 'green' | 'red';

interface PixelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  title: string;
  description?: string;
  width?: number | string;
  accent?: Accent;
  className?: string;
  style?: CSSProperties;
}

const accentColor: Record<Accent, string> = {
  default: 'var(--mfd-border)',
  gold: 'var(--mfd-gold)',
  cyan: 'var(--mfd-cyan)',
  green: 'var(--mfd-green)',
  red: 'var(--mfd-red)',
};

export function PixelModal({
  open,
  onOpenChange,
  children,
  title,
  description,
  width = 540,
  accent = 'default',
  className,
  style,
}: PixelModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className={className}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={() => onOpenChange(false)}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'rgba(0, 0, 0, 0.78)',
        zIndex: 50,
      }}
    >
      <div
        onClick={(event) => {
          event.stopPropagation();
        }}
        style={{
          width,
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: 'calc(100vh - 48px)',
          overflow: 'auto',
          background: 'var(--mfd-bg-2)',
          border: `3px solid ${accentColor[accent]}`,
          boxShadow: 'var(--mfd-shadow-lg)',
          ...style,
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '12px',
          alignItems: 'flex-start',
          padding: '10px 12px',
          borderBottom: `2px solid ${accentColor[accent]}`,
          background: 'var(--mfd-bg-3)',
        }}>
          <div>
            <div style={{
              fontFamily: 'var(--mfd-font-pixel)',
              fontSize: '8px',
              color: accent === 'default' ? 'var(--mfd-text)' : accentColor[accent],
              letterSpacing: '1px',
            }}>
              --- {title.toUpperCase()} ---
            </div>
            {description && (
              <div style={{
                marginTop: '6px',
                fontFamily: 'var(--mfd-font-mono)',
                fontSize: '11px',
                color: 'var(--mfd-text-dim)',
              }}>
                {description}
              </div>
            )}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              border: `2px solid ${accentColor[accent]}`,
              background: 'transparent',
              color: accent === 'default' ? 'var(--mfd-text)' : accentColor[accent],
              cursor: 'pointer',
            }}
          >
            <X size={14} />
          </button>
        </div>
        <div style={{ padding: '12px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
