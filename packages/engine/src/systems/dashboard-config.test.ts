import { describe, expect, it } from 'vitest';
import {
  createDefaultDashboardState,
  createLayout,
  pinWidget,
  switchLayout,
  unpinWidget,
} from './dashboard-config';
import { makeLeagueState } from './test-helpers';

describe('dashboard config', () => {
  it('creates a default layout with 8 widgets', () => {
    const state = createDefaultDashboardState();

    expect(state.layouts).toHaveLength(1);
    expect(state.layouts[0]?.widgets).toHaveLength(8);
  });

  it('pins and unpins widgets', () => {
    const game = makeLeagueState();
    game.dashboardState = createDefaultDashboardState();

    pinWidget(game, 'achievement_progress');
    expect(game.dashboardState.pinnedWidgets).toContain('achievement_progress');

    unpinWidget(game, 'achievement_progress');
    expect(game.dashboardState.pinnedWidgets).not.toContain('achievement_progress');
  });

  it('creates named layouts', () => {
    const game = makeLeagueState();
    game.dashboardState = createDefaultDashboardState();

    const layout = createLayout(game, 'War Room', ['team_record', 'next_game', 'waiver_wire'], 2);

    expect(layout.name).toBe('War Room');
    expect(game.dashboardState.layouts.some((entry) => entry.id === layout.id)).toBe(true);
  });

  it('switches the active layout', () => {
    const game = makeLeagueState();
    game.dashboardState = createDefaultDashboardState();
    const layout = createLayout(game, 'War Room', ['team_record', 'next_game'], 2);

    switchLayout(game, layout.id);

    expect(game.dashboardState.activeLayoutId).toBe(layout.id);
  });
});
