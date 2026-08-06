/**
 * WP-05 — the migration host's new shell.
 *
 * `App.tsx` still owns routing, lifecycle and the legacy shell; what it hands
 * to a migrated route is a bare `Outlet`, and this is what that route renders
 * inside. Everything permanent lives here — navigation, the context header,
 * the single scroll owner, the action dock — so a screen contributes content
 * and nothing else. That is the difference between the new shell and the old
 * one, where each surface re-declared its own chrome and the phone paid
 * 383–425px for the disagreement.
 *
 * Deliberately *not* here: the legacy shell's decomposition. Amendment A1
 * forbids changing legacy rendered output for the whole migration, so pulling
 * `App.tsx` apart delivers no player-visible change while spending the largest
 * regression budget in the project. It stays a separate, later, revertible
 * refactor — recorded in the progress ledger rather than quietly dropped.
 */

import { useEffect, useRef, type ReactNode } from 'react';
import { AdaptivePrimaryNav } from '../navigation/AdaptivePrimaryNav';
import type { NavigationModel } from '../navigation/navigation-model';
import { APP_CONTENT_ID, AppFrame } from '../layout/AppFrame';

/**
 * Whether a route change should move focus.
 *
 * Not on first paint: the page has just loaded and the player's focus is
 * wherever the browser put it, so pulling it into the content region on
 * arrival is a steal, not a service. Every subsequent change moves it, because
 * a hash navigation leaves focus on the link that was clicked — which is in
 * the navigation, on a screen that no longer exists.
 */
export function shouldMoveFocus(previous: string | null, next: string): boolean {
  return previous !== null && previous !== next;
}

function useRouteFocus(routeKey: string, contentId: string): void {
  const previous = useRef<string | null>(null);

  useEffect(() => {
    const from = previous.current;
    previous.current = routeKey;
    if (!shouldMoveFocus(from, routeKey)) return;
    if (typeof document === 'undefined') return;

    // `PageScroll` carries `tabIndex={-1}` for exactly this: the main landmark
    // is focusable as a target without ever joining the tab order.
    document.getElementById(contentId)?.focus();
  }, [routeKey, contentId]);
}

export interface MfdAppShellProps {
  /** Phase, week and team identity. The one permanent header. */
  header: ReactNode;
  navigation: NavigationModel;
  children: ReactNode;
  /** The screen's primary action, if it has one. */
  dock?: ReactNode;
  /** Changes when the player navigates. Drives return-of-focus, nothing else. */
  routeKey: string;
  contentId?: string;
}

export function MfdAppShell({
  header,
  navigation,
  children,
  dock,
  routeKey,
  contentId = APP_CONTENT_ID,
}: MfdAppShellProps) {
  useRouteFocus(routeKey, contentId);

  return (
    <AppFrame
      nav={<AdaptivePrimaryNav model={navigation} />}
      chrome={header}
      dock={dock}
      contentId={contentId}
    >
      {children}
    </AppFrame>
  );
}
