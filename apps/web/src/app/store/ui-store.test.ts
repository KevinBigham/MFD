import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const storage = {
  store: {} as Record<string, string>,
  getItem(key: string) {
    return this.store[key] ?? null;
  },
  setItem(key: string, value: string) {
    this.store[key] = value;
  },
  removeItem(key: string) {
    delete this.store[key];
  },
  clear() {
    this.store = {};
  },
};

describe('ui-store audio preferences', () => {
  beforeEach(() => {
    storage.clear();
    vi.resetModules();
    vi.stubGlobal('window', { localStorage: storage });
    vi.stubGlobal('localStorage', storage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('persists only selected UI preferences and keeps shell context transient', async () => {
    const { useUiStore } = await import('./ui-store');

    useUiStore.getState().setCommandPaletteOpen(true);
    useUiStore.getState().setFocusedPlayerContext('player-1', 'contracts');
    useUiStore.getState().setBroadcastGameId('game-1');
    useUiStore.getState().toggleSidebar();
    useUiStore.getState().setDensity('comfortable');
    useUiStore.getState().setAutosaveEnabled(false);
    useUiStore.getState().setSimSpeed('detailed');
    useUiStore.getState().setAudioMasterEnabled(false);

    const persisted = JSON.parse(storage.getItem('mfd-ui-preferences') ?? '{}');

    expect(persisted.state).toMatchObject({
      sidebarCollapsed: true,
      density: 'comfortable',
      autosaveEnabled: false,
      simSpeed: 'detailed',
      audioPreferences: {
        masterEnabled: false,
      },
    });
    expect(Object.keys(persisted.state).sort()).toEqual([
      'audioPreferences',
      'autosaveEnabled',
      'density',
      'sidebarCollapsed',
      'simSpeed',
      'uiOverhaulMode',
    ]);
  });

  it('hydrates persisted UI preferences while resetting transient shell context', async () => {
    storage.setItem('mfd-ui-preferences', JSON.stringify({
      state: {
        sidebarCollapsed: true,
        density: 'comfortable',
        autosaveEnabled: false,
        simSpeed: 'fast',
        audioPreferences: {
          masterEnabled: false,
          categories: {},
        },
        commandPaletteOpen: true,
        focusedPlayerId: 'player-1',
        focusedPlayerScreen: 'trades',
        broadcastGameId: 'game-1',
      },
      version: 0,
    }));

    const { useUiStore } = await import('./ui-store');
    const state = useUiStore.getState();

    expect(state.sidebarCollapsed).toBe(true);
    expect(state.density).toBe('comfortable');
    expect(state.autosaveEnabled).toBe(false);
    expect(state.simSpeed).toBe('fast');
    expect(state.audioPreferences.masterEnabled).toBe(false);
    expect(state.commandPaletteOpen).toBe(false);
    expect(state.focusedPlayerId).toBeNull();
    expect(state.focusedPlayerScreen).toBeNull();
    expect(state.broadcastGameId).toBeNull();
  });

  it('ignores malformed persisted non-audio preferences during hydration', async () => {
    storage.setItem('mfd-ui-preferences', JSON.stringify({
      state: {
        sidebarCollapsed: 'true',
        density: 'dense',
        autosaveEnabled: 'false',
        simSpeed: 'turbo',
        commandPaletteOpen: true,
        focusedPlayerId: 'player-1',
        focusedPlayerScreen: 'contracts',
        broadcastGameId: 'game-1',
      },
      version: 0,
    }));

    const { useUiStore } = await import('./ui-store');
    const state = useUiStore.getState();

    expect(state.sidebarCollapsed).toBe(false);
    expect(state.density).toBe('compact');
    expect(state.autosaveEnabled).toBe(true);
    expect(state.simSpeed).toBe('normal');
    expect(state.commandPaletteOpen).toBe(false);
    expect(state.focusedPlayerId).toBeNull();
    expect(state.focusedPlayerScreen).toBeNull();
    expect(state.broadcastGameId).toBeNull();
  });

  it('hydrates missing audio categories from defaults', async () => {
    storage.setItem('mfd-ui-preferences', JSON.stringify({
      state: {
        audioPreferences: {
          masterEnabled: false,
          categories: {
            sfx: {
              enabled: false,
              volume: 40,
            },
          },
        },
      },
      version: 0,
    }));

    const { useUiStore } = await import('./ui-store');
    const state = useUiStore.getState();

    expect(state.audioPreferences.masterEnabled).toBe(false);
    expect(state.audioPreferences.categories.sfx).toEqual({ enabled: false, volume: 40 });
    expect(state.audioPreferences.categories.ui).toEqual({ enabled: true, volume: 80 });
    expect(state.audioPreferences.categories.ambient).toEqual({ enabled: true, volume: 55 });
  });

  it('clamps audio category volume updates', async () => {
    const { useUiStore } = await import('./ui-store');

    useUiStore.getState().setAudioCategoryVolume('ambient', 180);
    expect(useUiStore.getState().audioPreferences.categories.ambient.volume).toBe(100);

    useUiStore.getState().setAudioCategoryVolume('ambient', -10);
    expect(useUiStore.getState().audioPreferences.categories.ambient.volume).toBe(0);
  });
});
