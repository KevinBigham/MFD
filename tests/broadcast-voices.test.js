import { describe, expect, it } from 'vitest';

import { BROADCAST_VOICES_991 } from '../src/data/broadcast-voices.js';

describe('broadcast-voices.js', () => {
  it('defines voices with common event call keys', () => {
    expect(BROADCAST_VOICES_991.voices.length).toBe(3);
    BROADCAST_VOICES_991.voices.forEach((v) => {
      expect(v.name.length).toBeGreaterThan(0);
      expect(v.calls.td).toBeTypeOf('string');
      expect(v.calls.int).toBeTypeOf('string');
      expect(v.calls.sack).toBeTypeOf('string');
      expect(v.calls.big).toBeTypeOf('string');
    });
  });

  it('pick and getCall return deterministic voice/call by total plays modulo', () => {
    const lg = { totalPlays: 4 };
    const picked = BROADCAST_VOICES_991.pick(lg);
    expect(picked.name).toBe(BROADCAST_VOICES_991.voices[1].name);
    expect(BROADCAST_VOICES_991.getCall(lg, 'td')).toBe(BROADCAST_VOICES_991.voices[1].calls.td);
    expect(BROADCAST_VOICES_991.getCall(lg, 'unknown')).toBe(null);
  });
});
