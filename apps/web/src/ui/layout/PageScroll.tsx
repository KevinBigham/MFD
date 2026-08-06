/**
 * WP-02 — the single scroll owner.
 *
 * The WP-00 baseline counted nested scroll containers on every legacy surface.
 * Nested scroll is the reason a phone user swipes and nothing moves, or moves
 * in the wrong pane: the browser picks an owner and it is rarely the one the
 * player meant. So the rule is one page scroller, and every exception is
 * declared out loud.
 *
 * `contained` is the exception. It requires a `reason`, which is the point:
 * a second scroller has to be argued for at the call site, in code review,
 * rather than appearing because a `div` needed `overflow: auto` that afternoon.
 */

import type { ReactNode } from 'react';
import styles from './layout.module.css';

type PageScrollProps = {
  children: ReactNode;
  /** Element id, so a skip link and route-change focus have a target. */
  id?: string;
  className?: string;
} & (
  | { contained?: false; reason?: never }
  | { contained: true; reason: string }
);

export function PageScroll({ children, id, className, contained, reason }: PageScrollProps) {
  return (
    <div
      id={id}
      className={[styles.pageScroll, contained ? styles.containedScroll : '', className]
        .filter(Boolean)
        .join(' ')}
      data-mfd-v2-scroll-owner={contained ? 'contained' : 'page'}
      data-mfd-v2-scroll-reason={contained ? reason : undefined}
      tabIndex={-1}
    >
      {children}
    </div>
  );
}
