import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAudioCue } from '@mfd/engine';
import {
  getAudioControllerSnapshot,
  playAudioCueQueue,
  playSound,
  resetAudioControllerForTests,
  resolveAmbientModeForPath,
  setAmbientMode,
  syncAudioPreferences,
} from './AudioManager';
import { DEFAULT_AUDIO_PREFERENCES } from '../../app/store/audio-preferences';

class MockOscillator {
  type = 'sine';
  frequency = { value: 440 };
  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class MockGainNode {
  gain = { value: 1, exponentialRampToValueAtTime: vi.fn() };
  connect = vi.fn();
}

class MockBufferSource {
  buffer: unknown = null;
  connect = vi.fn();
  start = vi.fn();
}

const mockCtx = {
  state: 'running' as string,
  currentTime: 0,
  sampleRate: 44_100,
  destination: {},
  resume: vi.fn(),
  close: vi.fn(),
  createOscillator: vi.fn(() => new MockOscillator()),
  createGain: vi.fn(() => new MockGainNode()),
  createBufferSource: vi.fn(() => new MockBufferSource()),
  createBuffer: vi.fn((_channels: number, length: number) => ({
    getChannelData: () => new Float32Array(length),
  })),
};

describe('AudioManager', () => {
  beforeEach(() => {
    resetAudioControllerForTests();
    vi.clearAllMocks();
    vi.stubGlobal('AudioContext', vi.fn(() => mockCtx));
    mockCtx.state = 'running';
  });

  it('plays a sound when the mapped category is enabled', () => {
    syncAudioPreferences(DEFAULT_AUDIO_PREFERENCES);

    playSound('ui_click', { debounceMs: 0 });

    expect(mockCtx.createOscillator).toHaveBeenCalled();
    expect(mockCtx.createGain).toHaveBeenCalled();
  });

  it('does not play when master audio is disabled', () => {
    syncAudioPreferences({
      ...DEFAULT_AUDIO_PREFERENCES,
      masterEnabled: false,
    });

    playSound('ui_click', { debounceMs: 0 });

    expect(mockCtx.createOscillator).not.toHaveBeenCalled();
  });

  it('does not play when the event category is disabled', () => {
    syncAudioPreferences({
      ...DEFAULT_AUDIO_PREFERENCES,
      categories: {
        ...DEFAULT_AUDIO_PREFERENCES.categories,
        sfx: {
          enabled: false,
          volume: 85,
        },
      },
    });

    playSound('draft_pick', { debounceMs: 0 });

    expect(mockCtx.createOscillator).not.toHaveBeenCalled();
  });

  it('dedupes identical queued cues when the same queue replays immediately', () => {
    syncAudioPreferences(DEFAULT_AUDIO_PREFERENCES);
    const cues = [createAudioCue('notification', 'medium', { source: 'breaking-news', id: 'story-1' })];

    playAudioCueQueue(cues);
    const firstPassCount = mockCtx.createOscillator.mock.calls.length;
    playAudioCueQueue(cues);

    expect(firstPassCount).toBeGreaterThan(0);
    expect(mockCtx.createOscillator.mock.calls.length).toBe(firstPassCount);
  });

  it('switches ambient modes based on routed screens', () => {
    syncAudioPreferences(DEFAULT_AUDIO_PREFERENCES);

    expect(resolveAmbientModeForPath('/broadcast')).toBe('crowd');
    expect(resolveAmbientModeForPath('/scouting')).toBe('office');
    expect(resolveAmbientModeForPath('/settings')).toBe('off');

    setAmbientMode('crowd');
    expect(getAudioControllerSnapshot().activeAmbientMode).toBe('crowd');

    setAmbientMode('office');
    expect(getAudioControllerSnapshot().activeAmbientMode).toBe('office');

    setAmbientMode('off');
    expect(getAudioControllerSnapshot().activeAmbientMode).toBe('off');
  });

  it('fails safely when AudioContext is unavailable', () => {
    resetAudioControllerForTests();
    vi.stubGlobal('AudioContext', undefined);

    expect(() => playSound('ui_click', { debounceMs: 0 })).not.toThrow();
  });

  it('bounds recentPlayback map size with FIFO eviction (sprint-53 regression)', () => {
    // Pre-fix: recentPlayback grew one entry per unique debounceKey for the
    // tab's lifetime. The audio cue queue mixes per-cue ids into the key
    // (`source:id`), so on a long play session this slowly leaked memory.
    // Post-fix: cap at RECENT_PLAYBACK_MAX_KEYS with FIFO eviction.
    syncAudioPreferences(DEFAULT_AUDIO_PREFERENCES);
    const { recentPlaybackMaxKeys } = getAudioControllerSnapshot();
    const overshoot = recentPlaybackMaxKeys + 50;

    for (let i = 0; i < overshoot; i += 1) {
      playSound('ui_click', { debounceKey: `unique-key-${i}`, debounceMs: 1_000 });
    }

    const snap = getAudioControllerSnapshot();
    expect(snap.recentPlaybackSize).toBeLessThanOrEqual(recentPlaybackMaxKeys);
    expect(snap.recentPlaybackSize).toBe(recentPlaybackMaxKeys);
  });
});
