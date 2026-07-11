import { describe, expect, it } from 'vitest';
import { formatDynastyChallengeShare } from './challenge-share';

describe('formatDynastyChallengeShare', () => {
  it('includes checkpoint context and the portable cartridge payload', () => {
    const text = formatDynastyChallengeShare({
      teamName: 'Chicago Blaze',
      season: 2030,
      week: 9,
      sizeBytes: 12345,
      cartridge: '{"cartridgeVersion":"mfd-cartridge.v2"}',
    });

    expect(text).toContain('MFD Dynasty Challenge: Chicago Blaze');
    expect(text).toContain('Season 2030, Week 9');
    expect(text).toContain('12345 bytes');
    expect(text).toContain('mfd-cartridge.v2');
  });
});
