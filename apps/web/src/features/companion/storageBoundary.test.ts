import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveBrowserStorage } from './storageBoundary';

describe('Chip browser storage boundary', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns null when localStorage property access is blocked', () => {
    const blockedWindow = {};
    Object.defineProperty(blockedWindow, 'localStorage', {
      configurable: true,
      get: () => {
        throw new Error('localStorage property blocked');
      },
    });
    vi.stubGlobal('window', blockedWindow);

    expect(resolveBrowserStorage()).toBeNull();
  });
});
