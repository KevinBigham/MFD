import { describe, expect, it } from 'vitest';
import {
  DOCK_CONTROL_BUTTONS,
  QUIET_MENU_CONTROL_IDS,
  formatDockPositionLabel,
  formatTypewriterSpeedLabel,
  hasActiveQuietPrefs,
  isDockControlDisabled,
  resolveDockControlLabel,
  resolveDockControlPressed,
  resolveDockControlQuietPressed,
  resolveDockEscapeAction,
  type ChipDockControl,
  type DockControlStateInput,
} from './dockControlConfig';
import { createDefaultDockPrefs } from './dockPersistence';

function makeState(overrides: Partial<DockControlStateInput> = {}): DockControlStateInput {
  return {
    prefs: createDefaultDockPrefs(),
    resolvedRoute: '/roster',
    currentWeek: 7,
    currentSeason: 2032,
    onboardingSkipped: false,
    typewriterSpeed: 'normal',
    dockPosition: 'right',
    ...overrides,
  };
}

const RENDERED_CONTROLS: readonly ChipDockControl[] = [
  'whatNow',
  'resetOnboarding',
  'snoozeOnboarding',
  'enableGuidance',
  'quietForScreen',
  'quietUntilNextWeek',
  'quietThisSeason',
  'reduceGuidance',
  'disableAnimations',
  'typewriterSpeed',
  'dockPosition',
];

describe('dock control config (I6)', () => {
  it('lists every rendered control exactly once with complete metadata', () => {
    expect(DOCK_CONTROL_BUTTONS.map((button) => button.id).sort())
      .toEqual([...RENDERED_CONTROLS].sort());
    for (const button of DOCK_CONTROL_BUTTONS) {
      expect(button.label.length).toBeGreaterThan(0);
      expect(button.icon).toBeDefined();
      expect(['default', 'gold', 'cyan', 'green', 'red']).toContain(button.accent);
      expect(['primary', 'quiet', 'utility']).toContain(button.weight);
    }
  });

  it('resolves quiet pressed state for the three quiet controls (E2)', () => {
    const quietScreen = makeState({
      prefs: { ...createDefaultDockPrefs(), quietForScreen: '/roster' },
    });
    expect(resolveDockControlQuietPressed('quietForScreen', quietScreen)).toBe(true);
    expect(resolveDockControlQuietPressed('quietForScreen', makeState({
      prefs: { ...createDefaultDockPrefs(), quietForScreen: '/trades' },
    }))).toBe(false);

    const quietWeek = makeState({
      prefs: { ...createDefaultDockPrefs(), quietUntilWeek: 8 },
      currentWeek: 7,
    });
    expect(resolveDockControlQuietPressed('quietUntilNextWeek', quietWeek)).toBe(true);
    expect(resolveDockControlQuietPressed('quietUntilNextWeek', makeState({
      prefs: { ...createDefaultDockPrefs(), quietUntilWeek: 8 },
      currentWeek: 9,
    }))).toBe(false);

    const quietSeason = makeState({
      prefs: { ...createDefaultDockPrefs(), quietForSeason: 2032 },
    });
    expect(resolveDockControlQuietPressed('quietThisSeason', quietSeason)).toBe(true);
    expect(resolveDockControlQuietPressed('quietThisSeason', makeState({
      prefs: { ...createDefaultDockPrefs(), quietForSeason: 2031 },
    }))).toBe(false);
    expect(resolveDockControlQuietPressed('whatNow', makeState())).toBeUndefined();
  });

  it('resolves toggle pressed state and labels, including dynamic ones', () => {
    const toggled = makeState({
      prefs: { ...createDefaultDockPrefs(), reducedGuidance: true, animationsDisabled: true },
    });
    expect(resolveDockControlPressed('reduceGuidance', toggled)).toBe(true);
    expect(resolveDockControlPressed('disableAnimations', toggled)).toBe(true);
    expect(resolveDockControlPressed('reduceGuidance', makeState())).toBe(false);

    expect(formatTypewriterSpeedLabel('fast')).toBe('Type speed: Fast');
    expect(resolveDockControlLabel('typewriterSpeed', 'Type speed', makeState({ typewriterSpeed: 'slow' })))
      .toBe('Type speed: Slow');
    expect(formatDockPositionLabel('left')).toBe('Dock side: Left');
    expect(resolveDockControlLabel('dockPosition', 'Dock side', makeState({ dockPosition: 'left' })))
      .toBe('Dock side: Left');
    // E11: the compact/full toggle says what each mode does in Chip's terms.
    expect(resolveDockControlLabel('reduceGuidance', 'Reduce guidance', makeState()))
      .toBe('Detail: everything');
    expect(resolveDockControlLabel('reduceGuidance', 'Reduce guidance', toggled))
      .toBe('Detail: Must Do only');
    expect(resolveDockControlLabel('quietForScreen', 'not now Chip!', makeState({
      prefs: { ...createDefaultDockPrefs(), quietForScreen: '/roster' },
    }))).toBe('not now Chip! (quieted)');
  });

  it('grays out controls that cannot do anything in the current state (E5)', () => {
    // Snooze is dead when onboarding guidance is already globally skipped.
    expect(isDockControlDisabled('snoozeOnboarding', makeState({ onboardingSkipped: true }))).toBe(true);
    expect(isDockControlDisabled('snoozeOnboarding', makeState())).toBe(false);
    // Enable is dead when nothing is quieted or skipped.
    expect(isDockControlDisabled('enableGuidance', makeState())).toBe(true);
    expect(isDockControlDisabled('enableGuidance', makeState({
      prefs: { ...createDefaultDockPrefs(), quietUntilWeek: 8 },
    }))).toBe(false);
    expect(isDockControlDisabled('enableGuidance', makeState({ onboardingSkipped: true }))).toBe(false);
    // Everything else stays live.
    expect(isDockControlDisabled('whatNow', makeState())).toBe(false);
    expect(isDockControlDisabled('quietForScreen', makeState())).toBe(false);
    expect(isDockControlDisabled('typewriterSpeed', makeState())).toBe(false);
    expect(isDockControlDisabled('dockPosition', makeState())).toBe(false);
  });

  it('routes Escape to the most transient target first (E7)', () => {
    expect(resolveDockEscapeAction({ activeLiveBeat: true, activeRouteBeat: false }))
      .toBe('dismissLiveBeat');
    expect(resolveDockEscapeAction({ activeLiveBeat: true, activeRouteBeat: true }))
      .toBe('dismissLiveBeat');
    expect(resolveDockEscapeAction({ activeLiveBeat: false, activeRouteBeat: true }))
      .toBe('collapse');
    expect(resolveDockEscapeAction({ activeLiveBeat: false, activeRouteBeat: false }))
      .toBe('collapse');
  });

  it('routes Escape to an open quiet menu after live beats (E4)', () => {
    expect(resolveDockEscapeAction({
      activeLiveBeat: false,
      activeRouteBeat: false,
      quietMenuOpen: true,
    })).toBe('closeQuietMenu');
    // A live beat still wins over the menu.
    expect(resolveDockEscapeAction({
      activeLiveBeat: true,
      activeRouteBeat: false,
      quietMenuOpen: true,
    })).toBe('dismissLiveBeat');
    // Omitting the flag keeps the legacy two-arg behavior.
    expect(resolveDockEscapeAction({ activeLiveBeat: false, activeRouteBeat: false }))
      .toBe('collapse');
  });

  it('groups exactly the three quiet controls into the quiet menu (E4)', () => {
    expect(QUIET_MENU_CONTROL_IDS).toEqual([
      'quietForScreen',
      'quietUntilNextWeek',
      'quietThisSeason',
    ]);
    for (const button of DOCK_CONTROL_BUTTONS) {
      const expected = QUIET_MENU_CONTROL_IDS.includes(button.id) ? 'quietMenu' : undefined;
      expect(button.group).toBe(expected);
    }
  });

  it('detects active quiet prefs for the consolidated trigger (E4)', () => {
    expect(hasActiveQuietPrefs(createDefaultDockPrefs())).toBe(false);
    expect(hasActiveQuietPrefs({ ...createDefaultDockPrefs(), quietForScreen: '/roster' })).toBe(true);
    expect(hasActiveQuietPrefs({ ...createDefaultDockPrefs(), quietUntilWeek: 8 })).toBe(true);
    expect(hasActiveQuietPrefs({ ...createDefaultDockPrefs(), quietForSeason: 2032 })).toBe(true);
  });
});
