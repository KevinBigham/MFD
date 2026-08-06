/**
 * WP-03 — the v2 button, and the full interactive state matrix in one place.
 *
 * Two rules from doc 06 are enforced by the type rather than by review:
 *
 * - **A disabled control must explain why.** `disabled` without
 *   `disabledReason` does not compile. A greyed-out button with no explanation
 *   is the single most common dead end in the legacy shell.
 * - **A destructive action must name its consequence.** `tone="destructive"`
 *   requires `consequence`, which becomes the description a screen reader
 *   reads before the player commits.
 *
 * Loading keeps the label and the box. Swapping the text for a spinner makes
 * the button change width mid-click, and it throws away the only thing telling
 * the player what they just pressed.
 */

import {
  useId,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import styles from './MfdButtonV2.module.css';

export type ButtonTone = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'default' | 'compact';

type NativeProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'disabled' | 'className' | 'children' | 'aria-busy'
>;

export type MfdButtonV2Props = NativeProps & {
  children: ReactNode;
  size?: ButtonSize;
  /** Retains label and dimensions; blocks repeat activation. */
  loading?: boolean;
  /** Shown alongside the control, and announced as its description. */
  hint?: string;
} & (
    | { tone?: Exclude<ButtonTone, 'destructive'>; consequence?: never }
    /** Danger is reserved for the final commit, and it says what it does. */
    | { tone: 'destructive'; consequence: string }
  ) &
  (
    | { disabled?: false; disabledReason?: never }
    /** No dead ends: a disabled control states why and what unblocks it. */
    | { disabled: true; disabledReason: string }
  );

export interface ButtonStateAttributes {
  'data-mfd-v2-button': ButtonTone;
  'data-mfd-v2-state': 'rest' | 'loading' | 'disabled';
  'aria-busy'?: 'true';
  'aria-disabled'?: 'true';
}

/**
 * The state matrix, as data.
 *
 * `aria-disabled` rather than the `disabled` attribute while loading: a
 * natively disabled button drops out of the tab order, so a player who pressed
 * it loses their place the moment it starts working.
 */
export function resolveButtonState(input: {
  tone: ButtonTone;
  loading: boolean;
  disabled: boolean;
}): ButtonStateAttributes {
  if (input.loading) {
    return {
      'data-mfd-v2-button': input.tone,
      'data-mfd-v2-state': 'loading',
      'aria-busy': 'true',
      'aria-disabled': 'true',
    };
  }
  if (input.disabled) {
    return {
      'data-mfd-v2-button': input.tone,
      'data-mfd-v2-state': 'disabled',
      'aria-disabled': 'true',
    };
  }
  return { 'data-mfd-v2-button': input.tone, 'data-mfd-v2-state': 'rest' };
}

export function MfdButtonV2({
  children,
  tone = 'primary',
  size = 'default',
  loading = false,
  disabled = false,
  disabledReason,
  consequence,
  hint,
  onClick,
  type = 'button',
  ...rest
}: MfdButtonV2Props) {
  const describedId = useId();
  const description = disabled ? disabledReason : (consequence ?? hint);
  const state = resolveButtonState({ tone, loading, disabled });

  // Wrapped rather than returned as a fragment. A bare fragment makes the
  // description a sibling of the button, so any flex or grid parent — the
  // action dock among them, which sizes every child to 48px — treats the
  // explanation as a second control.
  return (
    <span className={styles.wrap} data-mfd-v2-button-wrap="true">
      <button
        {...rest}
        {...state}
        type={type}
        data-mfd-v2-size={size}
        className={styles.button}
        aria-describedby={description ? describedId : undefined}
        // Inert while busy or blocked, but still focusable and still
        // announced — so the reason is reachable from the control itself.
        onClick={loading || disabled ? undefined : onClick}
      >
        <span className={styles.label}>{children}</span>
        {loading ? <span className={styles.spinner} aria-hidden="true" /> : null}
      </button>
      {description ? (
        <span id={describedId} className={styles.description} data-mfd-v2-button-description="true">
          {description}
        </span>
      ) : null}
    </span>
  );
}
