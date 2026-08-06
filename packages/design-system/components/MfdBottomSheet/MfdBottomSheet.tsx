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

/**
 * Top-level siblings that do not contain the sheet.
 *
 * Exported and pure over a supplied list so the selection rule is testable
 * without a DOM: the ancestors of the open sheet must stay live, everything
 * else must not.
 */
export function selectInertTargets(
  candidates: readonly Element[],
  sheet: Node | null,
): Element[] {
  if (!sheet) return [];
  return candidates.filter((element) => !element.contains(sheet));
}

function inertBackground(sheet: HTMLElement | null): Element[] {
  if (!sheet || typeof document === 'undefined') return [];

  const targets = selectInertTargets([...document.body.children], sheet)
    .filter((element) => !element.hasAttribute('inert'));

  targets.forEach((element) => element.setAttribute('inert', ''));
  return targets;
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

    // Background inertness. `aria-modal` alone tells a screen reader the rest
    // of the page is out of play; it does not stop a swipe-navigating user
    // reaching it, and it does not stop Tab escaping in older engines.
    const inerted = inertBackground(sheetRef.current);
    // The page behind must not scroll under the sheet either — chained
    // scrolling is the second half of the same failure.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      inerted.forEach((element) => element.removeAttribute('inert'));
      document.body.style.overflow = previousOverflow;
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
