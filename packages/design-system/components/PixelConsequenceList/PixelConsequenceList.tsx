type PixelAccent = 'default' | 'gold' | 'cyan' | 'green' | 'red';

interface PixelConsequenceListProps {
  items: Array<{
    id: string;
    label: string;
    delta: string;
    accent: PixelAccent;
  }>;
}

const consequenceColor: Record<PixelAccent, string> = {
  default: 'var(--mfd-text-dim)',
  gold: 'var(--mfd-gold)',
  cyan: 'var(--mfd-cyan)',
  green: 'var(--mfd-green)',
  red: 'var(--mfd-red)',
};

export function PixelConsequenceList({ items }: PixelConsequenceListProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {items.map((item) => (
        <div key={item.id} style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: '12px',
          paddingLeft: '8px',
          borderLeft: `3px solid ${consequenceColor[item.accent]}`,
        }}
        >
          <span style={{ fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: '#aaa' }}>{item.label}</span>
          <span style={{
            fontFamily: 'var(--mfd-font-pixel)',
            fontSize: '7px',
            letterSpacing: '0.8px',
            color: consequenceColor[item.accent],
          }}
          >
            {item.delta}
          </span>
        </div>
      ))}
    </div>
  );
}
