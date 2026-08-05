import { ArrowLeftRight, Bell, Calendar, CalendarOff, EyeOff, Lightbulb, MessageSquare, RotateCcw, Timer, VolumeX, type LucideIcon } from 'lucide-react';
import type { ChipTypewriterSpeed, DockPosition, DockPrefs } from './dockPersistence';

export type ChipDockControl =
  | 'quietForScreen'
  | 'quietUntilNextWeek'
  | 'quietThisSeason'
  | 'whatNow'
  | 'resetOnboarding'
  | 'snoozeOnboarding'
  | 'enableGuidance'
  | 'reduceGuidance'
  | 'disableAnimations'
  | 'typewriterSpeed'
  | 'dockPosition'
  | 'collapse'
  | 'expand';

/**
 * Typed, testable dock-control configuration (I6). ChipDock renders from this
 * module; behavior resolvers (pressed state, labels, disabled state) live here
 * as pure functions so dockControls/ChipDock tests can target them without
 * rendering the whole dock.
 */
export interface DockControlButtonConfig {
  id: ChipDockControl;
  label: string;
  icon: LucideIcon;
  accent: 'default' | 'gold' | 'cyan' | 'green' | 'red';
  weight: 'primary' | 'quiet' | 'utility';
  /**
   * E4: the three quiet buttons (screen/week/season) render inside the
   * consolidated quiet menu instead of as top-level controls. Everything
   * without a group renders directly in the controls row.
   */
  group?: 'quietMenu';
}

export const DOCK_CONTROL_BUTTONS: readonly DockControlButtonConfig[] = [
  { id: 'whatNow', label: 'Ask Chip', icon: MessageSquare, accent: 'gold', weight: 'primary' },
  { id: 'resetOnboarding', label: 'Replay', icon: RotateCcw, accent: 'cyan', weight: 'utility' },
  { id: 'snoozeOnboarding', label: 'Snooze', icon: CalendarOff, accent: 'gold', weight: 'quiet' },
  { id: 'enableGuidance', label: 'Enable', icon: Bell, accent: 'green', weight: 'utility' },
  { id: 'quietForScreen', label: 'not now Chip!', icon: VolumeX, accent: 'cyan', weight: 'quiet', group: 'quietMenu' },
  { id: 'quietUntilNextWeek', label: 'Not this week Chip!', icon: Calendar, accent: 'gold', weight: 'quiet', group: 'quietMenu' },
  { id: 'quietThisSeason', label: 'Mute season', icon: VolumeX, accent: 'red', weight: 'quiet', group: 'quietMenu' },
  { id: 'reduceGuidance', label: 'Reduce guidance', icon: Lightbulb, accent: 'green', weight: 'utility' },
  { id: 'disableAnimations', label: 'Disable animations', icon: EyeOff, accent: 'default', weight: 'utility' },
  { id: 'typewriterSpeed', label: 'Type speed', icon: Timer, accent: 'cyan', weight: 'utility' },
  { id: 'dockPosition', label: 'Dock side', icon: ArrowLeftRight, accent: 'default', weight: 'utility' },
] as const;

/** E4: the controls that live inside the quiet menu, in canonical order. */
export const QUIET_MENU_CONTROL_IDS: readonly ChipDockControl[] = DOCK_CONTROL_BUTTONS
  .filter((button) => button.group === 'quietMenu')
  .map((button) => button.id);

/** True when any quiet pref is currently suppressing Chip. */
export function hasActiveQuietPrefs(prefs: Pick<DockPrefs, 'quietForScreen' | 'quietUntilWeek' | 'quietForSeason'>): boolean {
  return prefs.quietForScreen !== null
    || prefs.quietUntilWeek !== null
    || prefs.quietForSeason !== null;
}

export interface DockControlStateInput {
  prefs: DockPrefs;
  resolvedRoute: string;
  currentWeek: number;
  currentSeason: number;
  /** True when the player globally skipped onboarding guidance. */
  onboardingSkipped: boolean;
  typewriterSpeed: ChipTypewriterSpeed;
  dockPosition: DockPosition;
}

/** Quiet-state pressed flags (E2), shared by render and tests. */
export function resolveDockControlQuietPressed(
  id: ChipDockControl,
  state: DockControlStateInput,
): boolean | undefined {
  if (id === 'quietForScreen') {
    return state.resolvedRoute !== '' && state.prefs.quietForScreen === state.resolvedRoute;
  }
  if (id === 'quietUntilNextWeek') {
    return state.prefs.quietUntilWeek !== null && state.currentWeek <= state.prefs.quietUntilWeek;
  }
  if (id === 'quietThisSeason') {
    return state.prefs.quietForSeason !== null && state.currentSeason === state.prefs.quietForSeason;
  }
  return undefined;
}

export function resolveDockControlPressed(
  id: ChipDockControl,
  state: DockControlStateInput,
): boolean | undefined {
  if (id === 'reduceGuidance') return state.prefs.reducedGuidance;
  if (id === 'disableAnimations') return state.prefs.animationsDisabled;
  return resolveDockControlQuietPressed(id, state);
}

export function formatTypewriterSpeedLabel(speed: ChipTypewriterSpeed): string {
  return `Type speed: ${speed.charAt(0).toUpperCase()}${speed.slice(1)}`;
}

export function formatDockPositionLabel(position: DockPosition): string {
  return `Dock side: ${position === 'left' ? 'Left' : 'Right'}`;
}

export function resolveDockControlLabel(
  id: ChipDockControl,
  baseLabel: string,
  state: DockControlStateInput,
): string {
  // E11: the compact/full toggle says what each mode does in Chip's terms.
  const label = id === 'reduceGuidance'
    ? (state.prefs.reducedGuidance ? 'Detail: Must Do only' : 'Detail: everything')
    : id === 'typewriterSpeed'
      ? formatTypewriterSpeedLabel(state.typewriterSpeed)
      : id === 'dockPosition'
        ? formatDockPositionLabel(state.dockPosition)
        : baseLabel;
  return resolveDockControlQuietPressed(id, state) === true ? `${label} (quieted)` : label;
}

/**
 * E5: gray out controls that cannot do anything in the current state, so the
 * dock stops offering no-op buttons.
 * - Snooze is dead when onboarding guidance is already globally skipped.
 * - Enable is dead when nothing is quieted or skipped (there is nothing to
 *   bring back).
 */
export function isDockControlDisabled(
  id: ChipDockControl,
  state: DockControlStateInput,
): boolean {
  if (id === 'snoozeOnboarding') return state.onboardingSkipped;
  if (id === 'enableGuidance') {
    return !hasActiveQuietPrefs(state.prefs) && !state.onboardingSkipped;
  }
  return false;
}

/**
 * E7 keyboard flow: one Escape press dismisses the most transient thing first
 * (an active Ask Chip live beat), then an open quiet menu (E4), otherwise it
 * collapses the dock.
 */
export function resolveDockEscapeAction({
  activeLiveBeat,
  quietMenuOpen,
}: {
  activeLiveBeat: boolean;
  activeRouteBeat: boolean;
  /** E4: an open quiet menu closes before the dock collapses. */
  quietMenuOpen?: boolean;
}): 'dismissLiveBeat' | 'closeQuietMenu' | 'collapse' {
  if (activeLiveBeat) return 'dismissLiveBeat';
  if (quietMenuOpen) return 'closeQuietMenu';
  return 'collapse';
}
