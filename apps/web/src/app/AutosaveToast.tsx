import { useEffect, useRef, useState } from 'react';
import { Check } from 'lucide-react';

const DISPLAY_DURATION_MS = 2000;
const FADE_DURATION_MS = 500;
const TOTAL_VISIBLE_MS = DISPLAY_DURATION_MS + FADE_DURATION_MS;

const toastStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 16,
  left: 16,
  padding: '8px 14px',
  background: 'var(--mfd-bg-2)',
  border: '2px solid var(--mfd-green)',
  fontFamily: 'var(--mfd-font-pixel)',
  fontSize: '7px',
  color: 'var(--mfd-green)',
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  transition: `opacity ${FADE_DURATION_MS}ms ease`,
  pointerEvents: 'none' as const,
};

export function AutosaveToast({ visible }: { visible: boolean }) {
  const [fading, setFading] = useState(false);
  const [hidden, setHidden] = useState(false);
  const prevVisible = useRef(false);

  useEffect(() => {
    // Reset when visible transitions to true
    if (visible && !prevVisible.current) {
      setFading(false);
      setHidden(false);

      const fadeTimer = setTimeout(() => setFading(true), DISPLAY_DURATION_MS);
      const hideTimer = setTimeout(() => setHidden(true), TOTAL_VISIBLE_MS);

      prevVisible.current = true;
      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
      };
    }
    if (!visible) {
      prevVisible.current = false;
    }
  }, [visible]);

  if (!visible || hidden) return null;

  return (
    <div data-testid="autosave-toast" style={{ ...toastStyle, opacity: fading ? 0 : 1 }}>
      <Check size={14} stroke="var(--mfd-green)" />
      GAME SAVED
    </div>
  );
}
