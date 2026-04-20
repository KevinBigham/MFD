import { beforeEach, describe, expect, it, vi } from 'vitest';

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
