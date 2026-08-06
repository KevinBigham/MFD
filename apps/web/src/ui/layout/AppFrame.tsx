/**
 * WP-02 — the shell frame every new screen sits inside.
 *
 * Three rows: chrome, content, dock. The frame owns the viewport height so the
 * content row can be the only scroller, and it reserves exactly what the dock
 * measured — nothing when there is no dock.
 *
 * LAY-06 budgets total fixed chrome at 152px. The legacy shell measures
 * 383–425px on phone, so this frame's job is arithmetic, not decoration: a
 * 64px nav plus a 64px dock plus safe area is the whole allowance, and
 * anything else has to scroll.
 */

import type { ReactNode } from 'react';
import styles from './layout.module.css';
import { AdaptiveViewport } from './AdaptiveViewport';
import { PageScroll } from './PageScroll';

export interface AppFrameProps {
  /** Global navigation and phase context. Sticky, and counted against LAY-06. */
  chrome?: ReactNode;
  children: ReactNode;
  /** Rendered by `StickyActionDock`; omit it and no space is reserved. */
  dock?: ReactNode;
  /** Target for the skip link and for focus on route change. */
  contentId?: string;
}

export const APP_CONTENT_ID = 'mfd-v2-content';

export function AppFrame({ chrome, children, dock, contentId = APP_CONTENT_ID }: AppFrameProps) {
  return (
    <AdaptiveViewport>
      <div className={styles.frame} data-mfd-v2-frame="true">
        {/* Placed before the chrome so it is the first tab stop on every screen. */}
        <a className={styles.skipLink} href={`#${contentId}`}>
          Skip to main content
        </a>

        {chrome ? (
          <div className={styles.chrome} data-mfd-v2-chrome="true">
            {chrome}
          </div>
        ) : null}

        <PageScroll id={contentId} className={styles.content} landmark>
          {children}
        </PageScroll>

        {dock ?? null}
      </div>
    </AdaptiveViewport>
  );
}
