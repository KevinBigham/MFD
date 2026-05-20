import { useEffect, useMemo, useState } from 'react';
import type { NewsItem } from '@mfd/engine';
import { useReducedMotionPreference } from '../shared/transitions/RouteTransition';

const tickerKeyframes = `
@keyframes mfdTickerSlideIn {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}
`;

export function selectTickerItems(newsItems: NewsItem[]): NewsItem[] {
  return newsItems.filter((item) => item.importance !== 'minor').slice(0, 4);
}

/**
 * Decides whether the breaking news ticker should auto-rotate between items.
 * Honors `prefers-reduced-motion` (WCAG SC 2.2.2) — when set, the user must
 * advance items manually rather than have them slide on a timer.
 */
export function shouldAutoRotateTicker(itemCount: number, reducedMotion: boolean): boolean {
  if (reducedMotion) return false;
  return itemCount > 1;
}

interface BreakingNewsTickerViewProps {
  item: NewsItem | null;
  reducedMotion: boolean;
}

export function BreakingNewsTickerView({ item, reducedMotion }: BreakingNewsTickerViewProps) {
  if (!item) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'relative',
        overflow: 'hidden',
        padding: '8px 14px',
        borderBottom: '3px solid var(--mfd-red)',
        background: 'linear-gradient(90deg, rgba(80, 0, 0, 0.95) 0%, rgba(22, 22, 22, 0.98) 55%, rgba(12, 12, 12, 0.98) 100%)',
        color: '#fff',
        animation: reducedMotion ? 'none' : 'mfdTickerSlideIn 360ms ease-out',
      }}
    >
      <style>{tickerKeyframes}</style>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', minWidth: 0 }}>
        <span style={{ fontFamily: 'var(--mfd-font-pixel)', fontSize: '9px', color: 'var(--mfd-gold)' }}>
          MFSN TICKER
        </span>
        <span style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden', fontFamily: 'var(--mfd-font-display)', fontSize: '18px', color: '#fff', lineHeight: 1, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.headline}
        </span>
        <span style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden', fontFamily: 'var(--mfd-font-mono)', fontSize: '11px', color: 'var(--mfd-text-dim)', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.body}
        </span>
      </div>
    </div>
  );
}

interface BreakingNewsTickerProps {
  items: NewsItem[];
}

export function BreakingNewsTicker({ items }: BreakingNewsTickerProps) {
  const reducedMotion = useReducedMotionPreference();
  const tickerItems = useMemo(() => selectTickerItems(items), [items]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [tickerItems]);

  useEffect(() => {
    if (!shouldAutoRotateTicker(tickerItems.length, reducedMotion)) return undefined;

    const interval = window.setInterval(() => {
      setIndex((current) => (current + 1) % tickerItems.length);
    }, 4200);

    return () => window.clearInterval(interval);
  }, [tickerItems.length, reducedMotion]);

  const item = tickerItems[index] ?? tickerItems[0] ?? null;

  return <BreakingNewsTickerView item={item} reducedMotion={reducedMotion} />;
}
