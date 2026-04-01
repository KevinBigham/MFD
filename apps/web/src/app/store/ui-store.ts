import { create } from 'zustand';

interface UiState {
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;

  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  density: 'compact' | 'comfortable';
  setDensity: (d: 'compact' | 'comfortable') => void;
}

export const useUiStore = create<UiState>((set) => ({
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),

  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  density: 'compact',
  setDensity: (density) => set({ density }),
}));
