/**
 * WP-03 — the gated primary action.
 *
 * This is the control the whole weekly loop ends at: one primary action, an
 * optional secondary, and — when the action is blocked — the reason plus the
 * way to unblock it, in the same place as the button.
 *
 * The gate is a type. `blocked: true` requires both a reason and a route to
 * fix it, so a disabled Advance Week can never render as a grey rectangle with
 * no explanation. That is the exact dead end the audit found at the end of the
 * legacy loop.
 *
 * It is a control cluster, not a layout slot: `StickyActionDock` in
 * `ui/layout` reserves the space, this fills it. Keeping them apart is what
 * lets a screen dock something that is not this.
 */

import type { ReactNode } from 'react';
import { MfdButtonV2 } from '../MfdButtonV2/MfdButtonV2';
import styles from './MfdStickyAction.module.css';

export type MfdStickyActionProps = {
  /** The verb, naming its consequence: "Advance to Week 15", not "Continue". */
  label: string;
  onActivate: () => void;
  busy?: boolean;
  secondary?: ReactNode;
} & (
  | { blocked?: false; blockedReason?: never; unblock?: never }
  | {
      blocked: true;
      /** What is stopping it, in the player's terms. */
      blockedReason: string;
      /** The control that resolves it — never just an explanation. */
      unblock: ReactNode;
    }
);

export function MfdStickyAction({
  label,
  onActivate,
  busy = false,
  secondary,
  blocked = false,
  blockedReason,
  unblock,
}: MfdStickyActionProps) {
  return (
    <div className={styles.wrap} data-mfd-v2-sticky-action="true" data-mfd-v2-blocked={String(blocked)}>
      {blocked ? (
        <p className={styles.reason} role="status" data-mfd-v2-block-reason="true">
          {blockedReason}
        </p>
      ) : null}

      <div className={styles.row}>
        {secondary}
        {unblock}
        {blocked ? (
          <MfdButtonV2 disabled disabledReason={blockedReason!}>
            {label}
          </MfdButtonV2>
        ) : (
          <MfdButtonV2 loading={busy} onClick={onActivate}>
            {label}
          </MfdButtonV2>
        )}
      </div>
    </div>
  );
}
