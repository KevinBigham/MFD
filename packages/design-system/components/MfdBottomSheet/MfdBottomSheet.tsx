/**
 * WP-03 — the phone sheet, and the overlay focus contract behind it.
 *
 * The legacy `PixelModal` sets `role="dialog" aria-modal="true"` and stops
 * there: no focus trap, no focus restore, no Escape, no background inertness.
 * That is a real defect in the shipped shell, but fixing it changes legacy
 * behaviour across every dialog in the app, which amendment A1 puts off limits
 * for a migration packet. So the contract is implemented here, for the new
 * shell, and the legacy defect is recorded rather than quietly patched.
 *
 * The focus arithmetic is exported as pure functions. This repo has no jsdom —
 * component tests render to static markup — so logic that is only reachable
 * through real DOM events is logic that never gets tested. Keeping the ordering
 * and wrap-around out here is what makes the trap verifiable.
 */

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import styles from './MfdBottomSheet.module.css';

/**
 * Elements that can hold focus, in tab order.
 *
 * `[hidden]` and `aria-hidden` descendants are excluded: an element that is
 * present but not perceivable must not become a stop that focus disappears
 * into.
 */
export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export function getFocusable(container: ParentNode | null): HTMLElement[] {
  if (!container) return [];
  return [...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
    (element) => !element.hasAttribute('hidden') && element.closest('[aria-hidden="true"]') === null,
  );
}

/**
 * Wrap-around index for Tab and Shift+Tab. Returns -1 when there is nothing to
 * focus.
 *
 * A negative `current` means focus is outside the trap — `indexOf` returns -1
 * for an element the sheet does not contain. That is not "one before index 0":
 * plain modular arithmetic sends Shift+Tab to `length - 2`, dropping the player
 * into the middle of the sheet. Outside means Tab enters at the first stop and
 * Shift+Tab enters at the last.
 */
export function nextFocusIndex(current: number, delta: 1 | -1, length: number): number {
  if (length <= 0) return -1;
  if (current < 0) return delta === 1 ? 0 : length - 1;
  return (current + delta + length) % length;
}

export interface MfdBottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Set false only where dismissing would lose uncommitted work. */
  dismissible?: boolean;
}

export function MfdBottomSheet({
  open,
  onClose,
  title,
  children,
  dismissible = true,
}: MfdBottomSheetProps) {
  const titleId = useId();
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;

    // Captured before the sheet takes focus, restored on the way out. Without
    // this, closing a sheet drops the player at the top of the document with
    // no idea where they were.
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const [first] = getFocusable(sheetRef.current);
    (first ?? sheetRef.current)?.focus();

    return () => {
      returnFocusRef.current?.focus?.();
    };
  }, [open]);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape' && dismissible) {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = getFocusable(sheetRef.current);
      if (focusable.length === 0) return;

      const current = focusable.indexOf(document.activeElement as HTMLElement);
      const target = focusable[nextFocusIndex(current, event.shiftKey ? -1 : 1, focusable.length)];
      if (target) {
        event.preventDefault();
        target.focus();
      }
    },
    [dismissible, onClose],
  );

  if (!open) return null;

  return (
    <div className={styles.scrim} data-mfd-v2-scrim="true" onClick={dismissible ? onClose : undefined}>
      <div
        ref={sheetRef}
        className={styles.sheet}
        data-mfd-v2-sheet="true"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
