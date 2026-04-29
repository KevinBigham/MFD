import { describe, expect, it } from 'vitest';
import {
  CHIP_CONTEXTS,
  MAX_CHIP_DIALOGUE_CHARS,
  assertDialogueEntry,
  isChipContext,
  isDialogueCatalogEntry,
} from './types';

describe('companion dialogue types', () => {
  it('defines the locked context set', () => {
    expect(CHIP_CONTEXTS).toEqual(['onboarding', 'idle', 'event', 'dismissed']);
  });

  it('recognizes valid contexts and rejects unknown values', () => {
    expect(isChipContext('onboarding')).toBe(true);
    expect(isChipContext('event')).toBe(true);
    expect(isChipContext('legacy-name')).toBe(false);
  });

  it('accepts a valid catalog entry', () => {
    const entry = assertDialogueEntry({
      id: 'chip.onboarding.beat-1',
      beat: 1,
      pose: 'talk',
      text: "I'm Chip. Your desk is live.",
      archetype: 'host',
    });

    expect(entry.id).toBe('chip.onboarding.beat-1');
  });

  it('rejects dialogue over 240 characters', () => {
    expect(() =>
      assertDialogueEntry({
        id: 'chip.too-long',
        beat: 1,
        pose: 'idle',
        text: 'x'.repeat(MAX_CHIP_DIALOGUE_CHARS + 1),
        archetype: 'host',
      }),
    ).toThrow(/240 characters/);
  });

  it('guards unknown runtime values', () => {
    expect(isDialogueCatalogEntry({ id: '', beat: 0 })).toBe(false);
    expect(
      isDialogueCatalogEntry({
        id: 'chip.event',
        beat: 1,
        pose: 'wave',
        text: 'Valid text.',
        archetype: 'host',
      }),
    ).toBe(true);
  });
});
