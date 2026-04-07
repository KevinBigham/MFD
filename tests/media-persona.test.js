import { describe, expect, it } from 'vitest';

import { CREDIBILITY_MATH, MEDIA_TAGS, PRESS_TAG_MAP, RIVALRY_MATH, getMediaPersona } from '../src/systems/media-persona.js';

describe('media-persona.js', () => {
  it('defines media tags and press tag map entries', () => {
    expect(Object.keys(MEDIA_TAGS)).toEqual(
      expect.arrayContaining(['accountability', 'tough_love', 'players_coach', 'swagger', 'deflector', 'stoic'])
    );
    expect(PRESS_TAG_MAP.blame).toBe('tough_love');
    expect(PRESS_TAG_MAP.own_it).toBe('accountability');
  });

  it('getMediaPersona requires sufficient history and detects dominant recent tag', () => {
    expect(getMediaPersona(['swagger', 'swagger'])).toBeNull();

    const persona = getMediaPersona(['stoic', 'swagger', 'swagger', 'accountability', 'swagger', 'stoic']);
    expect(persona.label).toBe('Showman');
  });

  it('credibility math reflects intended win/loss tone', () => {
    expect(CREDIBILITY_MATH.calcDelta('accountability', -10)).toBe(4);
    expect(CREDIBILITY_MATH.calcDelta('swagger', -3)).toBe(-5);
    expect(CREDIBILITY_MATH.calcDelta('deflector', -21)).toBe(-4);
    expect(CREDIBILITY_MATH.calcDelta('stoic', 7)).toBe(2);
  });

  it('rivalry heat deltas stack factors and cap at 12', () => {
    const maxed = RIVALRY_MATH.calcDelta(35, true, true, 5);
    const normal = RIVALRY_MATH.calcDelta(6, false, false, 0);
    expect(maxed).toBe(12);
    expect(normal).toBeGreaterThanOrEqual(1);
    expect(normal).toBeLessThan(12);
  });
});
