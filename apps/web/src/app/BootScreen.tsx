interface BootLine {
  text: string;
  delay: number;
  color?: string;
}

interface BootScreenProps {
  lines: BootLine[];
  onSkip: () => void;
}

export function BootScreen({ lines, onSkip }: BootScreenProps) {
  return (
    <div
      onClick={onSkip}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') onSkip();
      }}
      role="button"
      tabIndex={0}
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'var(--mfd-bg)',
        cursor: 'pointer',
        padding: 'var(--mfd-sp-xxl)',
      }}
    >
      <div style={{
        width: '100%',
        maxWidth: 600,
        fontFamily: 'var(--mfd-font-mono)',
        fontSize: '0.8125rem',
        lineHeight: 1.8,
      }}>
        {lines.map((line, i) => (
          <div
            key={i}
            style={{
              color: line.color ?? 'var(--mfd-green)',
              animation: 'mfd-fadein var(--mfd-motion-fast)',
              minHeight: line.text === '' ? '1.2em' : undefined,
            }}
          >
            {line.text && (
              <>
                <span style={{ color: 'var(--mfd-text-faint)' }}>&gt; </span>
                {line.text}
              </>
            )}
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 'var(--mfd-sp-xxl)',
        fontSize: '0.625rem',
        fontFamily: 'var(--mfd-font-mono)',
        color: 'var(--mfd-text-faint)',
        animation: 'mfd-pulse 2s infinite',
      }}>
        Click or press any key to skip
      </div>
    </div>
  );
}
