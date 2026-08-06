/**
 * WP-02 — the sticky action dock.
 *
 * Two failures this exists to prevent, both measured or specified:
 *
 * 1. **Permanent clearance.** The legacy shell reserves a fixed 198px of Chip
 *    clearance and a 64px nav pad whether or not anything is there. Combined
 *    with the header that is 383–425px of fixed chrome on a 844px-tall phone,
 *    against LAY-06's 152px budget. This dock is a row of the frame's grid, so
 *    it occupies exactly what it renders and nothing when it renders nothing.
 * 2. **The gesture bar.** A primary action flush to the bottom of a phone sits
 *    under the home indicator. Safe-area padding is not a nicety here; it is
 *    the difference between "Advance Week" being tappable and not. When a
 *    bottom nav sits below the dock the nav pays that instead — the frame's
 *    stylesheet scopes it so the inset is never spent twice.
 *
 * It used to measure itself with a `ResizeObserver` and publish the height to
 * a custom property the content row added to its `padding-bottom`. That is
 * what a *fixed* dock would need. This one is a grid row, so content cannot
 * scroll underneath it, and the reservation was 72px of empty scroll at the
 * end of every screen. The geometry harness measured it; the machinery is
 * gone rather than left dormant.
 */

import type { ReactNode } from 'react';
import styles from './layout.module.css';

export function StickyActionDock({
  children,
  label,
}: {
  children: ReactNode;
  /** Names the dock for screen readers — it is a landmark, not a decoration. */
  label: string;
}) {
  return (
    <div className={styles.actionDock} data-mfd-v2-action-dock="true" role="group" aria-label={label}>
      {children}
    </div>
  );
}
