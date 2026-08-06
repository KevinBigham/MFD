/**
 * WP-02 — split views that collapse into ordered content, not hidden content.
 *
 * The rule that matters: on compact the panes stack in DOM order and
 * **everything stays reachable**. A pane that disappears below 600px is a
 * capability the phone lost, which is exactly the feature-loss ROUTE-01 exists
 * to prevent. Nothing here uses `display: none`.
 *
 * Three panes are permitted only on `wide`, and only for a workbench — trade,
 * cap, draft. Three columns of anything else on a 1440px screen is a dashboard
 * pretending to be a decision.
 */

import type { ReactNode } from 'react';
import styles from './layout.module.css';
import { useLayoutMode } from './AdaptiveViewport';

export interface PaneLayoutProps {
  primary: ReactNode;
  secondary?: ReactNode;
  /** Workbench third pane. Rendered inline below the others outside `wide`. */
  tertiary?: ReactNode;
  /** Accessible names, so a split view is navigable by landmark. */
  labels: { primary: string; secondary?: string; tertiary?: string };
}

/** How many panes sit side by side at this width. Pure, so the rule is testable. */
export function resolvePaneColumns(
  mode: ReturnType<typeof useLayoutMode>['mode'],
  paneCount: number,
): number {
  if (mode === 'compact') return 1;
  if (mode === 'wide') return Math.min(paneCount, 3);
  return Math.min(paneCount, 2);
}

export function PaneLayout({ primary, secondary, tertiary, labels }: PaneLayoutProps) {
  const { mode } = useLayoutMode();
  const paneCount = 1 + (secondary ? 1 : 0) + (tertiary ? 1 : 0);
  const columns = resolvePaneColumns(mode, paneCount);

  return (
    <div
      className={styles.paneLayout}
      data-mfd-v2-panes={String(columns)}
      data-mfd-v2-pane-count={String(paneCount)}
    >
      <section className={styles.pane} aria-label={labels.primary} data-mfd-v2-pane="primary">
        {primary}
      </section>

      {secondary ? (
        <section
          className={styles.pane}
          aria-label={labels.secondary ?? 'Secondary'}
          data-mfd-v2-pane="secondary"
        >
          {secondary}
        </section>
      ) : null}

      {tertiary ? (
        <section
          className={styles.pane}
          aria-label={labels.tertiary ?? 'Detail'}
          data-mfd-v2-pane="tertiary"
        >
          {tertiary}
        </section>
      ) : null}
    </div>
  );
}
