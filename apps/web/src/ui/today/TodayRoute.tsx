/**
 * The `/today` route container — the only impure part of the Today stack.
 *
 * It exists so `TodayScreen` never touches the store: the screen takes a view
 * model and a navigate function, which is what makes it renderable in a test
 * suite with no jsdom and no router.
 *
 * **Legacy mode renders nothing new.** Amendment A1 forbids this packet from
 * changing legacy behaviour, and the migration boundary defaults to legacy, so
 * a player who has not opted in gets a locked state that explains itself and
 * points home. That is also the rollback: flip the mode and this route is
 * inert without reverting a line.
 */

import { useMemo } from 'react';
import { MfdStateFrame } from '@mfd/design-system/components';
import { useGameStore } from '../../app/store/game-store';
import { useUiStore } from '../../app/store/ui-store';
import { isUiOverhaulEnabled } from '../migration/ui-overhaul-mode';
import { TodayScreen } from './TodayScreen';
import { selectTodayInput } from './today-input';
import { presentToday } from './today-presenter';

function navigate(route: string): void {
  if (typeof window === 'undefined') return;
  window.location.hash = route;
}

export function TodayRoute() {
  const enabled = useUiStore((state) => isUiOverhaulEnabled(state));

  /**
   * Subscribe to the game, derive from it here.
   *
   * `selectTodayInput` builds a fresh object every call, so passing it to
   * `useGameStore` compares two new references on every store notification and
   * re-renders forever. Zustand has no structural comparison by default, and
   * the selector must not be memoised inside itself — it is pure, and caching
   * a derived view of mutable domain state is exactly what the packet's
   * performance rules forbid.
   */
  const game = useGameStore((state) => state.game);
  const view = useMemo(() => presentToday(selectTodayInput({ game })), [game]);

  if (!enabled) {
    return (
      <MfdStateFrame
        label="Today"
        status="locked"
        timing="Today is part of the interface preview and is off by default."
        wayBack={<a href="#/settings">Open Settings to turn the preview on</a>}
      />
    );
  }

  return <TodayScreen view={view} onNavigate={navigate} />;
}

export default TodayRoute;
