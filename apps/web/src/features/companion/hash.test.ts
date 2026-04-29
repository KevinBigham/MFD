import { describe, expect, it } from 'vitest';
import { fnv1a, selectVariant, serializeVariantSeed } from './hash';

describe('companion hash helpers', () => {
  it('returns the known 32-bit FNV-1a value for an ASCII string', () => {
    expect(fnv1a('hello')).toBe(0x4f9f2cab);
  });

  it('is deterministic across repeated runs', () => {
    const first = fnv1a('chip.onboarding.beat-1:42:7');

    for (let index = 0; index < 1000; index += 1) {
      expect(fnv1a('chip.onboarding.beat-1:42:7')).toBe(first);
    }
  });

  it('serializes variant seeds in stable field order', () => {
    expect(serializeVariantSeed({ eventId: 'weekRollover', dynastySeed: 42, weekIndex: 9 })).toBe(
      'eventId=weekRollover|dynastySeed=42|weekIndex=9',
    );
  });

  it('selects the same variant for the same seed', () => {
    const variants = ['a', 'b', 'c', 'd'];
    const seed = { eventId: 'injuryReport', dynastySeed: 101, weekIndex: 4 };

    expect(selectVariant(variants, seed)).toBe(selectVariant(variants, seed));
  });

  it('changes selection when deterministic seed inputs change', () => {
    const variants = ['a', 'b', 'c', 'd', 'e', 'f'];

    expect(selectVariant(variants, { eventId: 'event-a', dynastySeed: 1, weekIndex: 1 })).not.toBe(
      selectVariant(variants, { eventId: 'event-b', dynastySeed: 1, weekIndex: 1 }),
    );
  });

  it('rejects an empty variant list', () => {
    expect(() => selectVariant([], { eventId: 'event', dynastySeed: 1, weekIndex: 1 })).toThrow(
      /at least one variant/,
    );
  });
});
