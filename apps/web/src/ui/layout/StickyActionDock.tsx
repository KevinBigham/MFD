/**
 * WP-02 — the sticky action dock.
 *
 * Two failures this exists to prevent, both measured or specified:
 *
 * 1. **Permanent clearance.** The legacy shell reserves a fixed 198px of Chip
 *    clearance and a 64px nav pad whether or not anything is there. Combined
 *    with the header that is 383–425px of fixed chrome on a 844px-tall phone,
 *    against LAY-06's 152px budget. This dock reserves its *measured* height,
 *    and reserves nothing when it renders nothing.
 * 2. **The gesture bar.** A primary action flush to the bottom of a phone sits
 *    under the home indicator. Safe-area padding is not a nicety here; it is
 *    the difference between "Advance Week" being tappable and not.
 */

import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import styles from './layout.module.css';

/** The frame reads this to reserve exactly the space the dock occupies. */
export const DOCK_HEIGHT_VAR = '--mfd-v2-dock-measured';

export function StickyActionDock({
  children,
  label,
}: {
  children: ReactNode;
  /** Names the dock for screen readers — it is a landmark, not a decoration. */
  label: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  const publishHeight = useCallback((height: number) => {
    const frame = ref.current?.closest('[data-mfd-v2-frame="true"]') as HTMLElement | null;
    (frame ?? ref.current?.parentElement)?.style.setProperty(DOCK_HEIGHT_VAR, `${height}px`);
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === 'undefined') return;

    // Measured rather than assumed: a dock that wraps to two rows at 320px
    // must reserve two rows, and a token cannot know that.
    const observer = new ResizeObserver(([entry]) => {
      publishHeight(entry?.contentRect.height ?? 0);
    });
    observer.observe(node);
    publishHeight(node.getBoundingClientRect().height);

    return () => observer.disconnect();
  }, [publishHeight]);

  return (
    <div
      ref={ref}
      className={styles.actionDock}
      data-mfd-v2-action-dock="true"
      role="group"
      aria-label={label}
    >
      {children}
    </div>
  );
}
