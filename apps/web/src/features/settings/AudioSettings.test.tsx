import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { DEFAULT_AUDIO_PREFERENCES } from '../../app/store/audio-preferences';
import { AudioSettings, buildAudioSourceRows } from './AudioSettings';

class MemoryStorage {
  private readonly data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  clear(): void {
    this.data.clear();
  }
}

function mockAudioControls(overrides = {}) {
  return {
    play: vi.fn(),
    playCueQueue: vi.fn(),
    muted: false,
    masterEnabled: true,
    toggleMute: vi.fn(),
    categories: DEFAULT_AUDIO_PREFERENCES.categories,
    setAudioMasterEnabled: vi.fn(),
    setAudioCategoryEnabled: vi.fn(),
    setAudioCategoryVolume: vi.fn(),
    ...overrides,
  };
}

describe('AudioSettings', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('renders the broadcast mix controls and category badges', () => {
    const markup = renderToStaticMarkup(<AudioSettings audio={mockAudioControls()} />);

    expect(markup).toContain('Broadcast Mix');
    expect(markup).toContain('MASTER ON');
    expect(markup).toContain('SFX 85%');
    expect(markup).toContain('AMBIENT 55%');
  });

  it('persists the master audio toggle across a store remount', async () => {
    const storage = new MemoryStorage();
    vi.stubGlobal('window', { localStorage: storage });
    vi.stubGlobal('localStorage', storage);

    const { useUiStore } = await import('../../app/store/ui-store');
    useUiStore.getState().setAudioMasterEnabled(false);

    vi.resetModules();
    const { useUiStore: remountedStore } = await import('../../app/store/ui-store');

    expect(remountedStore.getState().audioPreferences.masterEnabled).toBe(false);
  });

  it('renders category previews as disabled when master audio is off', () => {
    const markup = renderToStaticMarkup(
      <AudioSettings
        audio={mockAudioControls({
          masterEnabled: false,
          muted: true,
        })}
      />,
    );

    expect(markup).toContain('MASTER OFF');
    expect(markup).toContain('disabled=""');
  });

  it('keeps the SFX preview tied to the SFX category state', () => {
    const markup = renderToStaticMarkup(
      <AudioSettings
        audio={mockAudioControls({
          categories: {
            ...DEFAULT_AUDIO_PREFERENCES.categories,
            sfx: { enabled: false, volume: 85 },
          },
        })}
      />,
    );

    expect(markup).toContain('SFX OFF');
    expect(markup).toContain('Draft picks, game beats, injuries, championships, and roster moments.');
  });

  it('documents that audio preferences live outside dynasty saves', () => {
    const markup = renderToStaticMarkup(<AudioSettings audio={mockAudioControls()} />);

    expect(markup).toContain('Stored outside the dynasty save.');
  });

  it('renders audio source boundaries for local preferences and queued game cues', () => {
    const audio = mockAudioControls();
    const markup = renderToStaticMarkup(<AudioSettings audio={audio} />);
    const rows = buildAudioSourceRows(audio);

    expect(markup).toContain('data-testid="audio-source-boundary"');
    expect(markup).toContain('Audio Sources');
    expect(markup).toContain('NO SAVE WRITE');
    expect(markup).toContain('Preference store');
    expect(markup).toContain('mfd-ui-preferences');
    expect(markup).toContain('not GameState or dynasty save');
    expect(markup).toContain('Runtime controller');
    expect(markup).toContain('AudioController');
    expect(markup).toContain('Preview buttons');
    expect(markup).toContain('do not enqueue postGameUi audio cues or write saves');
    expect(markup).toContain('Game cue queue');
    expect(markup).toContain('played and cleared by RootLayout');
    expect(rows).toHaveLength(4);
  });
});
