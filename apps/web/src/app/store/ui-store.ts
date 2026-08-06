import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  DEFAULT_AUDIO_PREFERENCES,
  clampAudioVolume,
  normalizeAudioPreferences,
  type AudioCategory,
  type AudioPreferences,
} from './audio-preferences';
import {
  DEFAULT_UI_OVERHAUL_MODE,
  normalizeUiOverhaulMode,
  type UiOverhaulMode,
} from '../../ui/migration/ui-overhaul-mode';

type SimSpeed = 'fast' | 'normal' | 'detailed';
type Density = 'compact' | 'comfortable';

const memoryStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

interface UiState {
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;

  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  density: Density;
  setDensity: (d: Density) => void;

  /** UI-only migration boundary. Never persisted into GameState. */
  uiOverhaulMode: UiOverhaulMode;
  setUiOverhaulMode: (mode: UiOverhaulMode) => void;

  autosaveEnabled: boolean;
  setAutosaveEnabled: (enabled: boolean) => void;

  simSpeed: SimSpeed;
  setSimSpeed: (speed: SimSpeed) => void;

  audioPreferences: AudioPreferences;
  setAudioMasterEnabled: (enabled: boolean) => void;
  toggleAudioMasterEnabled: () => void;
  setAudioCategoryEnabled: (category: AudioCategory, enabled: boolean) => void;
  setAudioCategoryVolume: (category: AudioCategory, volume: number) => void;

  focusedPlayerId: string | null;
  focusedPlayerScreen: 'contracts' | 'trades' | null;
  setFocusedPlayerContext: (playerId: string | null, screen?: 'contracts' | 'trades' | null) => void;
  clearFocusedPlayerContext: () => void;

  broadcastGameId: string | null;
  setBroadcastGameId: (gameId: string | null) => void;
  clearBroadcastGameId: () => void;
}

function normalizeBooleanPreference(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeDensityPreference(value: unknown, fallback: Density): Density {
  return value === 'compact' || value === 'comfortable' ? value : fallback;
}

function normalizeSimSpeedPreference(value: unknown, fallback: SimSpeed): SimSpeed {
  return value === 'fast' || value === 'normal' || value === 'detailed' ? value : fallback;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      commandPaletteOpen: false,
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),

      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      density: 'compact',
      setDensity: (density) => set({ density }),

      uiOverhaulMode: DEFAULT_UI_OVERHAUL_MODE,
      setUiOverhaulMode: (uiOverhaulMode) => set({ uiOverhaulMode }),

      autosaveEnabled: true,
      setAutosaveEnabled: (enabled) => set({ autosaveEnabled: enabled }),

      simSpeed: 'normal',
      setSimSpeed: (simSpeed) => set({ simSpeed }),

      audioPreferences: DEFAULT_AUDIO_PREFERENCES,
      setAudioMasterEnabled: (enabled) => set((state) => ({
        audioPreferences: {
          ...state.audioPreferences,
          masterEnabled: enabled,
        },
      })),
      toggleAudioMasterEnabled: () => set((state) => ({
        audioPreferences: {
          ...state.audioPreferences,
          masterEnabled: !state.audioPreferences.masterEnabled,
        },
      })),
      setAudioCategoryEnabled: (category, enabled) => set((state) => ({
        audioPreferences: {
          ...state.audioPreferences,
          categories: {
            ...state.audioPreferences.categories,
            [category]: {
              ...state.audioPreferences.categories[category],
              enabled,
            },
          },
        },
      })),
      setAudioCategoryVolume: (category, volume) => set((state) => ({
        audioPreferences: {
          ...state.audioPreferences,
          categories: {
            ...state.audioPreferences.categories,
            [category]: {
              ...state.audioPreferences.categories[category],
              volume: clampAudioVolume(volume),
            },
          },
        },
      })),

      focusedPlayerId: null,
      focusedPlayerScreen: null,
      setFocusedPlayerContext: (focusedPlayerId, focusedPlayerScreen = null) => set({ focusedPlayerId, focusedPlayerScreen }),
      clearFocusedPlayerContext: () => set({ focusedPlayerId: null, focusedPlayerScreen: null }),

      broadcastGameId: null,
      setBroadcastGameId: (broadcastGameId) => set({ broadcastGameId }),
      clearBroadcastGameId: () => set({ broadcastGameId: null }),
    }),
    {
      name: 'mfd-ui-preferences',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? window.localStorage : memoryStorage)),
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        density: state.density,
        autosaveEnabled: state.autosaveEnabled,
        simSpeed: state.simSpeed,
        audioPreferences: state.audioPreferences,
        uiOverhaulMode: state.uiOverhaulMode,
      }),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<UiState>;

        return {
          ...currentState,
          sidebarCollapsed: normalizeBooleanPreference(persisted.sidebarCollapsed, currentState.sidebarCollapsed),
          density: normalizeDensityPreference(persisted.density, currentState.density),
          autosaveEnabled: normalizeBooleanPreference(persisted.autosaveEnabled, currentState.autosaveEnabled),
          simSpeed: normalizeSimSpeedPreference(persisted.simSpeed, currentState.simSpeed),
          audioPreferences: normalizeAudioPreferences(persisted.audioPreferences),
          uiOverhaulMode: normalizeUiOverhaulMode(persisted.uiOverhaulMode),
        };
      },
    },
  ),
);
