import { beforeEach, describe, expect, it } from 'vitest';

import {
  NARRATIVE_STATES,
  STORY_ARC_EVENTS,
  pickWeightedEvent,
} from '../src/systems/story-arcs.js';
import { setSeed } from '../src/utils/rng.js';

describe('story-arcs.js', () => {
  beforeEach(() => {
    setSeed(2026);
  });

  it('exports core narrative states', () => {
    expect(NARRATIVE_STATES.BREAKOUT).toBe('breakout');
    expect(NARRATIVE_STATES.ELITE).toBe('elite');
    expect(NARRATIVE_STATES.SLUMP).toBe('slump');
    expect(NARRATIVE_STATES.COMEBACK).toBe('comeback');
  });

  it('defines event arrays for major arc categories', () => {
    expect(Array.isArray(STORY_ARC_EVENTS.breakout)).toBe(true);
    expect(Array.isArray(STORY_ARC_EVENTS.elite)).toBe(true);
    expect(Array.isArray(STORY_ARC_EVENTS.slump)).toBe(true);
    expect(Array.isArray(STORY_ARC_EVENTS.comeback)).toBe(true);
  });

  it('pickWeightedEvent returns null for empty input', () => {
    expect(pickWeightedEvent(null)).toBeNull();
    expect(pickWeightedEvent([])).toBeNull();
  });

  it('pickWeightedEvent returns deterministic choices with fixed seed', () => {
    const events = [
      { w: 1, id: 'a' },
      { w: 3, id: 'b' },
      { w: 1, id: 'c' },
    ];

    setSeed(77);
    const seq1 = [pickWeightedEvent(events).id, pickWeightedEvent(events).id, pickWeightedEvent(events).id];
    setSeed(77);
    const seq2 = [pickWeightedEvent(events).id, pickWeightedEvent(events).id, pickWeightedEvent(events).id];

    expect(seq1).toEqual(seq2);
  });

  it('pickWeightedEvent always returns one of the provided events', () => {
    const events = [
      { w: 1, id: 'a' },
      { w: 3, id: 'b' },
      { w: 1, id: 'c' },
    ];

    const allowed = new Set(events.map((e) => e.id));
    for (let i = 0; i < 50; i += 1) {
      expect(allowed.has(pickWeightedEvent(events).id)).toBe(true);
    }
  });
});
