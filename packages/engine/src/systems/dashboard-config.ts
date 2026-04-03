import type { DashboardLayout, DashboardState, DashboardWidget, GameState } from '../types';

const DEFAULT_WIDGETS: DashboardWidget[] = [
  'team_record',
  'next_game',
  'injury_report',
  'cap_snapshot',
  'power_ranking',
  'league_headlines',
  'promise_tracker',
  'training_report',
];

export function createDefaultDashboardState(): DashboardState {
  const defaultLayout: DashboardLayout = {
    id: 'layout:default',
    name: 'Command Center',
    widgets: [...DEFAULT_WIDGETS],
    columns: 3,
  };

  return {
    activeLayoutId: defaultLayout.id,
    layouts: [defaultLayout],
    pinnedWidgets: [],
  };
}

function ensureDashboardState(game: GameState): DashboardState {
  if (!game.dashboardState) {
    game.dashboardState = createDefaultDashboardState();
  }
  return game.dashboardState;
}

function uniqueWidgets(widgets: DashboardWidget[]): DashboardWidget[] {
  return [...new Set(widgets)];
}

export function createLayout(
  game: GameState,
  name: string,
  widgets: DashboardWidget[],
  columns: 2 | 3,
): DashboardLayout {
  const state = ensureDashboardState(game);
  const layout: DashboardLayout = {
    id: `layout:${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || state.layouts.length + 1}`,
    name,
    widgets: uniqueWidgets(widgets),
    columns,
  };

  state.layouts = [...state.layouts.filter((entry) => entry.id !== layout.id), layout];
  return layout;
}

export function switchLayout(game: GameState, layoutId: string): DashboardState {
  const state = ensureDashboardState(game);
  if (state.layouts.some((layout) => layout.id === layoutId)) {
    state.activeLayoutId = layoutId;
  }
  return state;
}

export function pinWidget(game: GameState, widgetType: DashboardWidget): DashboardState {
  const state = ensureDashboardState(game);
  state.pinnedWidgets = uniqueWidgets([...state.pinnedWidgets, widgetType]);
  return state;
}

export function unpinWidget(game: GameState, widgetType: DashboardWidget): DashboardState {
  const state = ensureDashboardState(game);
  state.pinnedWidgets = state.pinnedWidgets.filter((widget) => widget !== widgetType);
  return state;
}

export function reorderWidgets(
  game: GameState,
  layoutId: string,
  newOrder: DashboardWidget[],
): DashboardLayout | null {
  const state = ensureDashboardState(game);
  const layout = state.layouts.find((entry) => entry.id === layoutId);
  if (!layout) return null;

  layout.widgets = uniqueWidgets(newOrder.filter((widget) => layout.widgets.includes(widget)));
  return layout;
}

export function getActiveDashboardLayout(game: GameState): DashboardLayout {
  const state = ensureDashboardState(game);
  return state.layouts.find((layout) => layout.id === state.activeLayoutId) ?? state.layouts[0]!;
}
