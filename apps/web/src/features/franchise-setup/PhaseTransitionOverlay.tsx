import { monoSm, pixelSm } from '../shared/pixelUi';

export function PhaseTransitionOverlay({
  flavorText,
  loadingTip,
}: {
  flavorText: string;
  loadingTip: string;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--mfd-bg)',
        animation: 'mfd-transition-cycle 0.8s ease-in-out forwards',
      }}
    >
      <div
        style={{
          width: 'min(560px, calc(100% - 40px))',
          border: '2px solid var(--mfd-gold)',
          background: 'var(--mfd-bg-2)',
          boxShadow: 'var(--mfd-shadow-gold)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '18px',
          textAlign: 'center',
        }}
      >
        <div style={{ ...monoSm, color: 'var(--mfd-text)', lineHeight: 1.7 }}>{flavorText}</div>
        <div style={{ ...pixelSm, color: 'var(--mfd-cyan)' }}>&ldquo;{loadingTip}&rdquo;</div>
        <div style={{ display: 'flex', gap: '8px' }} aria-label="Transition loading">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--mfd-gold)',
                animation: `mfd-typing 0.8s ease-in-out ${index * 0.12}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
      <style>{`
        @keyframes mfd-transition-cycle {
          0% { opacity: 0; }
          25% { opacity: 1; }
          75% { opacity: 1; }
          100% { opacity: 0; }
        }

        @keyframes mfd-typing {
          0%, 80%, 100% { opacity: 0.3; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
