import { describe, expect, it, vi } from 'vitest';
import { createChipVoiceService, isChipTtsEnabled } from './chipVoice';

describe('Chip voice service', () => {
  it('defaults TTS off unless the explicit feature flag is true', () => {
    expect(isChipTtsEnabled({})).toBe(false);
    expect(isChipTtsEnabled({ VITE_CHIP_TTS_ENABLED: 'false' })).toBe(false);
    expect(isChipTtsEnabled({ VITE_CHIP_TTS_ENABLED: 'true' })).toBe(true);
  });

  it('noops safely when disabled even if speech synthesis exists', () => {
    const synthesis = { speak: vi.fn(), cancel: vi.fn() };
    const service = createChipVoiceService({
      env: { VITE_CHIP_TTS_ENABLED: 'false' },
      synthesis,
      utteranceFactory: (text) => ({ text, rate: 1, pitch: 1, volume: 1 }),
    });

    expect(service.isAvailable()).toBe(false);
    expect(service.speak('Welcome to the chair.', { userInitiated: true })).toEqual({
      spoken: false,
      reason: 'disabled',
    });
    expect(synthesis.speak).not.toHaveBeenCalled();
  });

  it('requires a user-initiated call before speaking when enabled', () => {
    const synthesis = { speak: vi.fn(), cancel: vi.fn() };
    const service = createChipVoiceService({
      env: { VITE_CHIP_TTS_ENABLED: 'true' },
      synthesis,
      utteranceFactory: (text) => ({ text, rate: 1, pitch: 1, volume: 1 }),
    });

    expect(service.isAvailable()).toBe(true);
    expect(service.speak('No autoplay surprises.')).toEqual({
      spoken: false,
      reason: 'not_user_initiated',
    });
    expect(synthesis.speak).not.toHaveBeenCalled();
  });

  it('builds and queues a speech utterance when enabled and user initiated', () => {
    const synthesis = { speak: vi.fn(), cancel: vi.fn() };
    const utterance = { text: '', rate: 0, pitch: 0, volume: 0 };
    const service = createChipVoiceService({
      env: { VITE_CHIP_TTS_ENABLED: 'true' },
      synthesis,
      utteranceFactory: (text) => ({ ...utterance, text }),
    });

    expect(service.speak('Read the briefing first.', {
      userInitiated: true,
      interrupt: true,
      rate: 0.95,
      pitch: 0.9,
      volume: 0.75,
    })).toEqual({ spoken: true, reason: 'queued' });
    expect(synthesis.cancel).toHaveBeenCalledTimes(1);
    expect(synthesis.speak).toHaveBeenCalledWith(expect.objectContaining({
      text: 'Read the briefing first.',
      rate: 0.95,
      pitch: 0.9,
      volume: 0.75,
    }));
  });
});
