/**
 * BreakingNews — Full-screen MFSN breaking news interrupt overlay.
 *
 * Triggered on high-intensity events: blockbuster trades, star injuries,
 * records broken, coaching firings, CBA lockouts.
 */
import { useEffect, useState, type CSSProperties } from 'react';
import { AlertTriangle } from 'lucide-react';
import { display, pixel } from './pixelUi';

export interface BreakingNewsProps {
  headline: string;
  detail: string;
  source?: string;
  onDismiss: () => void;
  /** Dramatic pause before content reveal in ms (default: 2000) */
  revealDelay?: number;
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 9000,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.96)',
  cursor: 'pointer',
};

const bannerStyle: CSSProperties = {
  width: '100%',
  padding: '12px 0',
  backgroundColor: 'var(--mfd-red)',
  textAlign: 'center',
  position: 'absolute',
  top: '30%',
};

const bannerTextStyle: CSSProperties = {
  ...display,
  fontSize: '36px',
  color: '#FFFFFF',
  letterSpacing: '6px',
  textTransform: 'uppercase',
  margin: 0,
};

const mfsnLabelStyle: CSSProperties = {
  ...pixel,
  fontSize: '9px',
  color: 'var(--mfd-gold)',
  letterSpacing: '2px',
  marginBottom: '4px',
};

const headlineStyle: CSSProperties = {
  ...display,
  fontSize: '28px',
  color: '#FFFFFF',
  textAlign: 'center',
  maxWidth: '600px',
  margin: '32px auto 12px',
  lineHeight: 1.3,
};

const detailStyle: CSSProperties = {
  fontFamily: 'var(--mfd-font-mono)',
  fontSize: '13px',
  color: 'var(--mfd-text-dim, #999)',
  textAlign: 'center',
  maxWidth: '500px',
  margin: '0 auto',
  lineHeight: 1.5,
};

const sourceStyle: CSSProperties = {
  ...pixel,
  fontSize: '7px',
  color: 'var(--mfd-text-dim, #666)',
  marginTop: '24px',
  textAlign: 'center',
};

const dismissStyle: CSSProperties = {
  ...pixel,
  fontSize: '7px',
  color: 'var(--mfd-text-dim, #555)',
  position: 'absolute',
  bottom: '20px',
  left: '50%',
  transform: 'translateX(-50%)',
};

const keyframes = `
@keyframes breakingSlideIn {
  0% { transform: scaleX(0); }
  100% { transform: scaleX(1); }
}
@keyframes breakingFadeIn {
  0% { opacity: 0; transform: translateY(10px); }
  100% { opacity: 1; transform: translateY(0); }
}
`;

export function BreakingNews({
  headline,
  detail,
  source = 'MFSN INSIDER',
  onDismiss,
  revealDelay = 2000,
}: BreakingNewsProps) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), revealDelay);
    return () => clearTimeout(timer);
  }, [revealDelay]);

  return (
    <div
      style={overlayStyle}
      onClick={onDismiss}
      role="alert"
      aria-live="assertive"
    >
      <style>{keyframes}</style>

      {/* MFSN Breaking News Banner */}
      <div style={{ ...bannerStyle, animation: 'breakingSlideIn 0.6s ease-out' }}>
        <p style={mfsnLabelStyle}>MFSN</p>
        <p style={bannerTextStyle}>
          <AlertTriangle
            size={28}
            style={{ verticalAlign: 'middle', marginRight: '12px' }}
          />
          BREAKING NEWS
          <AlertTriangle
            size={28}
            style={{ verticalAlign: 'middle', marginLeft: '12px' }}
          />
        </p>
      </div>

      {/* Content (revealed after delay) */}
      {showContent && (
        <div style={{
          position: 'absolute',
          top: 'calc(30% + 80px)',
          width: '100%',
          animation: 'breakingFadeIn 0.5s ease-out',
        }}>
          <p style={headlineStyle}>{headline}</p>
          <p style={detailStyle}>{detail}</p>
          <p style={sourceStyle}>SOURCE: {source}</p>
        </div>
      )}

      <p style={dismissStyle}>CLICK ANYWHERE TO CONTINUE</p>
    </div>
  );
}
