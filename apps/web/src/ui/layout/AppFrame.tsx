/**
 * WP-02 — the shell frame every new screen sits inside.
 *
 * Four slots: navigation, chrome, content, dock. The frame owns the viewport
 * height so the content row can be the only scroller, and it reserves exactly
 * what the dock measured — nothing when there is no dock.
 *
 * LAY-06 budgets total fixed chrome at 152px. The legacy shell measures
 * 383–425px on phone, so this frame's job is arithmetic, not decoration: a
 * 64px nav plus a 76px context header is the whole allowance, the dock is
 * counted separately, and anything else has to scroll.
 */

import type { ReactNode } from 'react';
import styles from './layout.module.css';
import { AdaptiveViewport, useLayoutMode, type LayoutMode } from './AdaptiveViewport';
import { PageScroll } from './PageScroll';

export type FrameLayout = 'stacked' | 'sided';

/**
 * Where the navigation sits. Pure, so the rule is testable without a browser —
 * the same split `resolvePaneColumns` uses.
 *
 * Phone stacks it under the content as a bottom bar; from `medium` up it takes
 * a column beside the whole frame, which is what buys back the vertical budget
 * a rail would otherwise spend.
 */
export function resolveFrameLayout(mode: LayoutMode, hasNav: boolean): FrameLayout {
  if (!hasNav || mode === 'compact') return 'stacked';
  return 'sided';
}

export interface AppFrameProps {
  /** Primary navigation. Positioned by `resolveFrameLayout`, counted against LAY-06. */
  nav?: ReactNode;
  /** Phase context and screen identity. Sticky, and counted against LAY-06. */
  chrome?: ReactNode;
  children: ReactNode;
  /** Rendered by `StickyActionDock`; omit it and no space is reserved. */
  dock?: ReactNode;
  /** Target for the skip link and for focus on route change. */
  contentId?: string;
}

export const APP_CONTENT_ID = 'mfd-v2-content';

function Frame({ nav, chrome, children, dock, contentId }: Required<Pick<AppFrameProps, 'contentId'>> & AppFrameProps) {
  const { mode } = useLayoutMode();
  const layout = resolveFrameLayout(mode, Boolean(nav));

  return (
    <div className={styles.frame} data-mfd-v2-frame="true" data-mfd-v2-frame-layout={layout}>
      {/* Placed before everything so it is the first tab stop on every screen. */}
      <a className={styles.skipLink} href={`#${contentId}`}>
        Skip to main content
      </a>

      {/* Navigation comes before content in the DOM and is placed visually by
          the grid. That is the right order at `sided`, where the rail is
          visually first, and it is the standard bottom-bar trade at `stacked`:
          the skip link above exists precisely so a keyboard user reaches the
          content in one stop rather than through five links. Reordering the
          DOM at the breakpoint instead would move focus on resize. */}
      {nav ? (
        <div className={styles.navSlot} data-mfd-v2-nav-slot="true">
          {nav}
        </div>
      ) : null}

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
  );
}

export function AppFrame({ contentId = APP_CONTENT_ID, ...props }: AppFrameProps) {
  return (
    <AdaptiveViewport>
      <Frame contentId={contentId} {...props} />
    </AdaptiveViewport>
  );
}
