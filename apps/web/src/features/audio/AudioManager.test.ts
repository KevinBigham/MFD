import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem(key: string) { return this.store[key] ?? null; },
  setItem(key: string, value: string) { this.store[key] = value; },
  removeItem(key: string) { delete this.store[key]; },
  clear() { this.store = {}; },
  get length() { return Object.keys(this.store).length; },
  key(_index: number) { return null; },
};
vi.stubGlobal('localStorage', localStorageMock);

// Mock AudioContext since test env doesn't have Web Audio API
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
  sampleRate: 44100,
  destination: {},
  resume: vi.fn(),
  createOscillator: () => new MockOscillator(),
  createGain: () => new MockGainNode(),
  createBufferSource: () => new MockBufferSource(),
  createBuffer: (_channels: number, length: number, _rate: number) => ({
    numberOfChannels: 1,
    length,
    sampleRate: 44100,
    getChannelData: () => new Float32Array(length),
  }),
};

vi.stubGlobal('AudioContext', vi.fn(() => mockCtx));

// Must import AFTER mocking
const { playSound } = await import('./AudioManager');

describe('AudioManager', () => {
  beforeEach(() => {
    localStorageMock.clear();
    mockCtx.state = 'running';
    vi.clearAllMocks();
  });

  it('plays a sound when not muted', () => {
    const spy = vi.spyOn(mockCtx, 'createOscillator');
    playSound('ui_click');
    expect(spy).toHaveBeenCalled();
  });

  it('does not play when muted', () => {
    localStorageMock.setItem('mfd-audio-muted', '1');
    const spy = vi.spyOn(mockCtx, 'createOscillator');
    playSound('ui_click');
    expect(spy).not.toHaveBeenCalled();
  });

  it('handles all 28 sound events without throwing', () => {
    const events = [
      'ui_click', 'ui_navigate', 'ui_open_panel', 'notification',
      'week_advance_start', 'week_advance_complete',
      'touchdown', 'field_goal', 'turnover', 'sack', 'big_play',
      'injury', 'game_start', 'game_end', 'halftime', 'overtime',
      'draft_pick', 'trade_complete', 'trade_rejected',
      'free_agent_signed', 'player_cut', 'season_end',
      'super_bowl_win', 'super_bowl_loss',
      'playoff_clinch', 'playoff_elimination',
      'record_broken', 'achievement_unlocked',
    ] as const;

    expect(events.length).toBe(28);
    for (const event of events) {
      expect(() => playSound(event)).not.toThrow();
    }
  });

  it('resumes suspended audio context', () => {
    mockCtx.state = 'suspended';
    playSound('ui_click');
    expect(mockCtx.resume).toHaveBeenCalled();
  });

  it('playSound is a callable function for all event types', () => {
    expect(typeof playSound).toBe('function');
    // Verify the function signature accepts a string argument
    expect(playSound.length).toBe(1);
  });
});
