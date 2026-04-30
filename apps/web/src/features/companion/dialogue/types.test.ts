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
      contextDetails: ['Your first morning is not a tutorial. It is a diagnosis.'],
    });

    expect(entry.id).toBe('chip.onboarding.beat-1');
    expect(entry.contextDetails).toEqual(['Your first morning is not a tutorial. It is a diagnosis.']);
  });

  it('keeps onboarding entries on one-based beats', () => {
    expect(() =>
      assertDialogueEntry({
        id: 'chip.onboarding.beat-0',
        beat: 0,
        pose: 'talk',
        text: 'Onboarding cannot use beat zero.',
        archetype: 'host',
      }),
    ).toThrow(/one-based beat/);
  });

  it('allows weekly entries to use beat zero', () => {
    const entry = assertDialogueEntry({
      id: 'chip.weekly.cleanWin',
      beat: 0,
      pose: 'talk',
      text: 'Weekly entries are selected by game state instead of onboarding beat.',
      archetype: 'weekly',
    });

    expect(entry.beat).toBe(0);
  });

  it('rejects negative weekly beats', () => {
    expect(() =>
      assertDialogueEntry({
        id: 'chip.weekly.bad',
        beat: -1,
        pose: 'idle',
        text: 'Negative beats still fail.',
        archetype: 'weekly',
      }),
    ).toThrow(/zero-based beat/);
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

  it('rejects invalid context detail copy', () => {
    expect(() =>
      assertDialogueEntry({
        id: 'chip.onboarding.bad-context',
        beat: 1,
        pose: 'idle',
        text: 'Valid text.',
        archetype: 'host',
        contextDetails: [''],
      }),
    ).toThrow(/context details/);
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
