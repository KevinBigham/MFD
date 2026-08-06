/**
 * WP-03 — loading, empty, error, and locked, with the copy the spec requires.
 *
 * The packets say the same four things about every screen, so they are a type
 * here instead of a paragraph nobody re-reads:
 *
 * - **Loading** keeps the frame and the context. It does not replace the shell.
 * - **Empty** explains *why* it is empty and offers the safest next action.
 * - **Error** says what failed, **what was not changed**, and how to recover.
 *   The middle one is the one everybody omits, and it is the one a player
 *   actually needs after a failed trade or a failed save.
 * - **Locked** explains the lifecycle timing and keeps a path back.
 *
 * None of those fields is optional. A state that cannot answer them is not
 * ready to ship.
 */

import type { ReactNode } from 'react';
import styles from './MfdStateFrame.module.css';

export type FrameStatus = 'ready' | 'loading' | 'empty' | 'error' | 'locked';

export type MfdStateFrameProps = {
  /** Names the region for assistive tech and for the live status. */
  label: string;
} & (
  /* `children` is required exactly where real content exists. The blocked
     states have nothing to render underneath, and demanding a placeholder
     would invite callers to pass one. */
  | { status?: 'ready'; children: ReactNode }
  | { status: 'loading'; children: ReactNode; loadingLabel?: string }
  | { status: 'empty'; reason: string; action?: ReactNode; children?: never }
  | {
      status: 'error';
      whatFailed: string;
      whatWasNotChanged: string;
      recovery: ReactNode;
      children?: never;
    }
  | { status: 'locked'; timing: string; wayBack: ReactNode; children?: never }
);

export function MfdStateFrame(props: MfdStateFrameProps) {
  const { label } = props;
  const status = props.status ?? 'ready';

  if (status === 'ready') {
    return <>{(props as { children: ReactNode }).children}</>;
  }

  return (
    <section
      className={styles.frame}
      data-mfd-v2-state-frame={status}
      aria-label={label}
      aria-busy={status === 'loading' ? 'true' : undefined}
    >
      {/* Polite, and only ever one per frame — a screen that announces four
          simultaneous status changes has told the player nothing. */}
      <p role="status" className={styles.status}>
        {status === 'loading'
          ? ((props as { loadingLabel?: string }).loadingLabel ?? `Loading ${label}`)
          : null}
        {status === 'empty' ? (props as { reason: string }).reason : null}
        {status === 'error' ? (props as { whatFailed: string }).whatFailed : null}
        {status === 'locked' ? (props as { timing: string }).timing : null}
      </p>

      {status === 'error' ? (
        <p className={styles.detail} data-mfd-v2-error-scope="true">
          {(props as { whatWasNotChanged: string }).whatWasNotChanged}
        </p>
      ) : null}

      {status === 'empty' ? (props as { action?: ReactNode }).action : null}
      {status === 'error' ? (props as { recovery: ReactNode }).recovery : null}
      {status === 'locked' ? (props as { wayBack: ReactNode }).wayBack : null}

      {/* Loading keeps the real content mounted beneath the status, so the
          screen does not jump and scroll position survives. */}
      {status === 'loading' ? (
        <div className={styles.beneath}>{(props as { children: ReactNode }).children}</div>
      ) : null}
    </section>
  );
}
