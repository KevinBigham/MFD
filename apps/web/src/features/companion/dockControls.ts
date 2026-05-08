import type { ChipPose } from '@mfd/design-system/components';
import type { DialogueCatalogEntry } from './dialogue/types';
import { readDockPrefs, updateDockPrefs, type DockPrefs } from './dockPersistence';
import {
  applyChipOnboardingTrigger,
  CHIP_ONBOARDING_PROGRESS_KEY,
  readChipOnboardingProgress,
  requestChipOnboardingReplay,
  resetChipOnboardingProgress,
  writeChipOnboardingProgress,
} from './onboardingMachine';

export const CHIP_LEGACY_ONBOARDING_STORAGE_KEY = 'mfd.chip.onboarding';

export type ChipDockControl =
  | 'quietForScreen'
  | 'quietUntilNextWeek'
  | 'quietThisSeason'
  | 'whatNow'
  | 'replayOnboarding'
  | 'resetOnboarding'
  | 'enableGuidance'
  | 'reduceGuidance'
  | 'disableAnimations'
  | 'collapse'
  | 'expand';

export interface ChipDockControlStore {
  setPose?: (pose: ChipPose) => void;
  dismiss?: () => void;
  reset?: () => void;
  showWeeklyDialogue?: (entry: DialogueCatalogEntry) => void;
  lastWeeklyDialogue?: DialogueCatalogEntry | null;
}

export interface ApplyDockControlOptions {
  storage: Storage | null;
  chipStore?: ChipDockControlStore;
  currentRoute: string;
  currentWeek: number;
  currentSeason: number;
  now: () => Date;
}

export function applyDockControl(control: ChipDockControl, options: ApplyDockControlOptions): DockPrefs {
  const prefs = readDockPrefs(options.storage);
  const chipStore = options.chipStore;

  switch (control) {
    case 'whatNow':
      if (chipStore?.lastWeeklyDialogue) {
        chipStore.showWeeklyDialogue?.(chipStore.lastWeeklyDialogue);
      }
      return prefs;
    case 'replayOnboarding': {
      const occurredAt = options.now().toISOString();
      const replayProgress = requestChipOnboardingReplay(
        readChipOnboardingProgress(options.storage),
        occurredAt,
      );
      const result = applyChipOnboardingTrigger(replayProgress, {
        type: 'replay_requested',
        id: `dock:replay:${occurredAt}`,
        context: {
          route: options.currentRoute,
          currentWeek: options.currentWeek,
          currentSeason: options.currentSeason,
        },
        occurredAt,
      });
      writeChipOnboardingProgress(options.storage, result.progress);
      options.storage?.removeItem(CHIP_LEGACY_ONBOARDING_STORAGE_KEY);
      if (result.recommendation) {
        chipStore?.showWeeklyDialogue?.({
          id: result.recommendation.id,
          beat: result.progress.shownBeatIds.length,
          pose: result.recommendation.pose,
          text: result.recommendation.text,
          archetype: 'host',
        });
      }
      return prefs;
    }
    case 'resetOnboarding':
      resetChipOnboardingProgress(options.storage);
      options.storage?.removeItem(CHIP_LEGACY_ONBOARDING_STORAGE_KEY);
      options.storage?.removeItem(CHIP_ONBOARDING_PROGRESS_KEY);
      chipStore?.reset?.();
      return prefs;
    case 'enableGuidance':
      return updateDockPrefs(
        options.storage,
        {
          quietForScreen: null,
          quietUntilWeek: null,
          quietForSeason: null,
          reducedGuidance: false,
        },
        options.now,
      );
    case 'quietForScreen':
      chipStore?.setPose?.('idle');
      chipStore?.dismiss?.();
      return updateDockPrefs(
        options.storage,
        {
          quietForScreen: options.currentRoute,
        },
        options.now,
      );
    case 'quietUntilNextWeek':
      chipStore?.dismiss?.();
      return updateDockPrefs(
        options.storage,
        {
          quietUntilWeek: options.currentWeek,
        },
        options.now,
      );
    case 'quietThisSeason':
      chipStore?.dismiss?.();
      return updateDockPrefs(
        options.storage,
        {
          quietForSeason: options.currentSeason,
        },
        options.now,
      );
    case 'reduceGuidance':
      return updateDockPrefs(
        options.storage,
        {
          reducedGuidance: !prefs.reducedGuidance,
        },
        options.now,
      );
    case 'disableAnimations':
      chipStore?.setPose?.('idle');
      return updateDockPrefs(
        options.storage,
        {
          animationsDisabled: !prefs.animationsDisabled,
        },
        options.now,
      );
    case 'collapse':
      return updateDockPrefs(
        options.storage,
        {
          collapsed: true,
        },
        options.now,
      );
    case 'expand':
      return updateDockPrefs(
        options.storage,
        {
          collapsed: false,
        },
        options.now,
      );
  }
}
