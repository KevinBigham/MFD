/**
 * WP-03 — local navigation within a hub.
 *
 * Rendered as links, not tabs, on purpose. Every section of a hub is a real
 * destination with a real URL — that is what makes WP-04's deep links and
 * return-to-task work. A `role="tablist"` would announce them as panels of one
 * page and take arrow keys hostage for no benefit.
 *
 * `aria-current="page"` carries the selection, plus a visible weight and shape
 * change, because the state matrix forbids colour as the only cue.
 */

import styles from './MfdLocalNav.module.css';

export interface LocalNavItem {
  id: string;
  label: string;
  href: string;
  /** Count of things needing attention. Zero and undefined both render nothing. */
  badge?: number;
  /** Present when the section is not reachable yet; explains the timing. */
  lockedReason?: string;
}

export interface MfdLocalNavProps {
  items: readonly LocalNavItem[];
  activeId: string;
  /** Names the group — "Team sections", not "Navigation". */
  label: string;
  onNavigate?: (item: LocalNavItem) => void;
}

/** Pure, so the selection and locking rules are testable without a DOM. */
export function resolveNavItemState(
  item: LocalNavItem,
  activeId: string,
): { current: boolean; locked: boolean; badge: number | null } {
  return {
    current: item.id === activeId,
    locked: Boolean(item.lockedReason),
    badge: item.badge && item.badge > 0 ? item.badge : null,
  };
}

export function MfdLocalNav({ items, activeId, label, onNavigate }: MfdLocalNavProps) {
  return (
    <nav className={styles.nav} aria-label={label} data-mfd-v2-local-nav="true">
      <ul className={styles.list}>
        {items.map((item) => {
          const state = resolveNavItemState(item, activeId);
          return (
            <li key={item.id}>
              <a
                href={item.href}
                className={styles.item}
                data-mfd-v2-nav-item={item.id}
                data-mfd-v2-current={String(state.current)}
                data-mfd-v2-locked={String(state.locked)}
                aria-current={state.current ? 'page' : undefined}
                // A locked section stays focusable and still explains itself.
                // Removing it from the tab order hides the explanation from
                // exactly the people who need it read aloud.
                aria-disabled={state.locked ? 'true' : undefined}
                onClick={(event) => {
                  if (state.locked) {
                    event.preventDefault();
                    return;
                  }
                  onNavigate?.(item);
                }}
              >
                <span className={styles.label}>{item.label}</span>
                {/* In the accessibility tree and in the accessible name, not
                    in a `title`. A tooltip is hover-only, which means a locked
                    section explains itself to everyone except a phone. */}
                {item.lockedReason ? (
                  <span className={styles.srOnly}>{` — ${item.lockedReason}`}</span>
                ) : null}
                {state.badge ? (
                  <span className={styles.badge} data-mfd-v2-nav-badge="true">
                    {state.badge}
                    {/* The number alone is ambiguous; the noun is not. */}
                    <span className={styles.srOnly}> items need attention</span>
                  </span>
                ) : null}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
