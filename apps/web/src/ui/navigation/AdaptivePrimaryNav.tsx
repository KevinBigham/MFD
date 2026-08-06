/**
 * WP-06 — one primary navigation, three shapes.
 *
 * The audit's blueprint names a mobile hub bar, a tablet rail, and a desktop
 * sidebar. They are built here as one component with a variant rather than as
 * three, because what makes the navigation correct is that the destinations,
 * their order, their labels, their badges and their current-page semantics are
 * *identical* at every width — and three components rendering the same list is
 * three copies of that contract to keep in step. What genuinely differs is
 * position, density, and whether the secondary hubs have room; all three are
 * layout, and layout is CSS.
 *
 * `resolveNavVariant` is exported and pure, so the one rule that is not CSS —
 * which widths show Dynasty and System — is assertable without a browser.
 */

import { useLayoutMode, type LayoutMode } from '../layout/AdaptiveViewport';
import type { NavDestination, NavigationModel } from './navigation-model';
import styles from './navigation.module.css';

export type NavVariant = 'bar' | 'rail' | 'sidebar';

/**
 * Phone gets the bottom bar and the five job destinations only. From `medium`
 * up the navigation moves to the side, which is the only place Dynasty and
 * System can appear without displacing one of the five — the audit is explicit
 * that they are exposed deliberately, not squeezed into the phone bar.
 *
 * `wide` earns the sidebar: the same list with the placement line visible, so
 * the destination explains itself rather than relying on a one-word label.
 *
 * Short windows take the rail instead, whatever the width. The sidebar's
 * two-line rows are 56px each and seven of them do not fit in a 390px-tall
 * window; the rail's single line does. This is the packet's "short height
 * collapses secondary chrome before content" rule, and it is here rather than
 * in a media query because the alternative the measurement found was a
 * navigation that quietly became a second scroll owner.
 */
export function resolveNavVariant(mode: LayoutMode, compactHeight = false): NavVariant {
  if (mode === 'compact') return 'bar';
  return mode === 'wide' && !compactHeight ? 'sidebar' : 'rail';
}

export function navShowsSecondary(variant: NavVariant): boolean {
  return variant !== 'bar';
}

function NavItem({
  destination,
  active,
  variant,
}: {
  destination: NavDestination;
  active: boolean;
  variant: NavVariant;
}) {
  return (
    <li className={styles.item}>
      <a
        className={styles.link}
        href={`#${destination.route}`}
        // `aria-current` is the accessible current-page state; the attribute
        // below is what CSS and the geometry harness read. Neither substitutes
        // for the other.
        aria-current={active ? 'page' : undefined}
        data-mfd-v2-nav-hub={destination.hub}
        data-mfd-v2-nav-active={active ? 'true' : 'false'}
        /**
         * A test hook, not a signal to the player. Following an unmigrated
         * destination swaps the whole chrome, and nothing in the interface says
         * why — naming that boundary where a player can perceive it is open
         * work, recorded in the progress ledger. This attribute only lets the
         * tests assert which side of the boundary each destination is on.
         */
        data-mfd-v2-nav-migrated={destination.migrated ? 'true' : 'false'}
      >
        <span className={`${styles.label} mfd-v2-label`}>{destination.label}</span>

        {variant === 'sidebar' ? (
          <span className={`${styles.placement} mfd-v2-caption`}>{destination.placement}</span>
        ) : null}

        {destination.badge > 0 ? (
          <span className={styles.badge} data-mfd-v2-nav-badge={String(destination.badge)}>
            <span aria-hidden="true">{destination.badgeLabel}</span>
            {/* A bare number beside a word is not a sentence. The count is
                announced as what it counts, and the true number is spoken even
                where the visible one is bounded to 9+. */}
            <span className={styles.srOnly}>
              {destination.badge === 1 ? '1 open job' : `${destination.badge} open jobs`}
            </span>
          </span>
        ) : null}
      </a>
    </li>
  );
}

export interface AdaptivePrimaryNavProps {
  model: NavigationModel;
  /** Overridable so a test can render a variant without faking a viewport. */
  variant?: NavVariant;
}

export function AdaptivePrimaryNav({ model, variant }: AdaptivePrimaryNavProps) {
  const { mode, compactHeight } = useLayoutMode();
  const resolved = variant ?? resolveNavVariant(mode, compactHeight);
  const destinations = navShowsSecondary(resolved)
    ? [...model.primary, ...model.secondary]
    : model.primary;

  return (
    <nav
      className={styles.nav}
      aria-label="Primary"
      data-mfd-v2-nav={resolved}
      data-mfd-v2-nav-count={String(destinations.length)}
    >
      <ul className={styles.list}>
        {destinations.map((destination) => (
          <NavItem
            key={destination.hub}
            destination={destination}
            active={destination.hub === model.activeHub}
            variant={resolved}
          />
        ))}
      </ul>
    </nav>
  );
}
