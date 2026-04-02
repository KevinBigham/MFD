import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type SimSpeed = 'fast' | 'normal' | 'detailed';

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

  density: 'compact' | 'comfortable';
  setDensity: (d: 'compact' | 'comfortable') => void;

  autosaveEnabled: boolean;
  setAutosaveEnabled: (enabled: boolean) => void;

  simSpeed: SimSpeed;
  setSimSpeed: (speed: SimSpeed) => void;
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

      autosaveEnabled: true,
      setAutosaveEnabled: (enabled) => set({ autosaveEnabled: enabled }),

      simSpeed: 'normal',
      setSimSpeed: (simSpeed) => set({ simSpeed }),
    }),
    {
      name: 'mfd-ui-preferences',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? window.localStorage : memoryStorage)),
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        density: state.density,
        autosaveEnabled: state.autosaveEnabled,
        simSpeed: state.simSpeed,
      }),
    },
  ),
);
