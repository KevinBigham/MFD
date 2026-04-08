/**
 * CelebrationOverlay — Championship confetti overlay with gold text and team logo.
 *
 * Triggered after winning the Super Bowl. CSS-only confetti animation.
 */
import { useEffect, useState, type CSSProperties } from 'react';
import { PixelPanel, PixelButton } from '@mfd/design-system/components';
import { pixel, display } from './pixelUi';
import { TeamLogo } from './TeamLogo';

export interface CelebrationOverlayProps {
  teamCity: string;
  teamName: string;
  teamAbbrev: string;
  year: number;
  seasonRecord: string;
  mvpName?: string;
  eraName?: string;
  onDismiss: () => void;
}

const CONFETTI_COLORS = [
  'var(--mfd-gold)',
  'var(--mfd-cyan)',
  'var(--mfd-green)',
  '#FFD700',
  '#FFA500',
  '#FFFFFF',
];

const CONFETTI_COUNT = 60;

function generateConfettiPieces(): CSSProperties[] {
  const pieces: CSSProperties[] = [];
  for (let i = 0; i < CONFETTI_COUNT; i++) {
    const left = `${(i / CONFETTI_COUNT) * 100 + (Math.sin(i * 7) * 5)}%`;
    const delay = `${(i * 0.08) % 3}s`;
    const duration = `${2.5 + (i % 5) * 0.4}s`;
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    const size = 4 + (i % 4) * 2;
    const rotation = `${(i * 37) % 360}deg`;

    pieces.push({
      position: 'absolute',
      top: '-20px',
      left,
      width: `${size}px`,
      height: `${size * 2.5}px`,
      backgroundColor: color,
      opacity: 0.85,
      transform: `rotate(${rotation})`,
      animation: `confettiFall ${duration} ease-in ${delay} infinite`,
    });
  }
  return pieces;
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.92)',
  overflow: 'hidden',
};

const titleStyle: CSSProperties = {
  ...display,
  fontSize: '48px',
  color: 'var(--mfd-gold)',
  textShadow: '0 0 20px var(--mfd-gold), 0 0 40px rgba(255, 215, 0, 0.4)',
  textAlign: 'center',
  marginBottom: '8px',
  letterSpacing: '3px',
  textTransform: 'uppercase',
};

const subtitleStyle: CSSProperties = {
  ...pixel,
  fontSize: '10px',
  color: 'var(--mfd-cyan)',
  textAlign: 'center',
  marginBottom: '24px',
};

const eraStyle: CSSProperties = {
  ...pixel,
  fontSize: '9px',
  color: 'var(--mfd-gold)',
  textAlign: 'center',
  marginTop: '16px',
  opacity: 0.8,
};

const keyframesStyle = `
@keyframes confettiFall {
  0% { transform: translateY(0) rotate(0deg); opacity: 0.9; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}
@keyframes celebrationPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.03); }
}
`;

export function CelebrationOverlay({
  teamCity,
  teamName,
  teamAbbrev,
  year,
  seasonRecord,
  mvpName,
  eraName,
  onDismiss,
}: CelebrationOverlayProps) {
  const [confettiPieces] = useState(() => generateConfettiPieces());
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Fade in after mount
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      style={{
        ...overlayStyle,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.8s ease-in',
      }}
      role="dialog"
      aria-label="Championship Celebration"
    >
      <style>{keyframesStyle}</style>

      {/* Confetti */}
      {confettiPieces.map((style, i) => (
        <div key={i} style={style} aria-hidden="true" />
      ))}

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', animation: 'celebrationPulse 3s ease-in-out infinite' }}>
        <TeamLogo icon={teamAbbrev} size={120} />

        <div style={{ marginTop: '16px' }}>
          <div style={titleStyle}>SUPER BOWL CHAMPIONS</div>
          <div style={subtitleStyle}>
            {teamCity} {teamName} | Season {year} | {seasonRecord}
          </div>
        </div>

        {mvpName && (
          <PixelPanel title="SUPER BOWL MVP" accent="gold" style={{ maxWidth: '300px', margin: '0 auto 12px' }}>
            <p style={{ ...display, fontSize: '22px', color: 'var(--mfd-gold)', textAlign: 'center', margin: 0 }}>
              {mvpName}
            </p>
          </PixelPanel>
        )}

        {eraName ? (
          <div style={eraStyle}>
            THE {eraName.toUpperCase()} CONTINUES
          </div>
        ) : null}

        <div style={{ marginTop: '24px' }}>
          <PixelButton accent="gold" onClick={onDismiss}>
            CONTINUE TO OFFSEASON
          </PixelButton>
        </div>
      </div>
    </div>
  );
}
