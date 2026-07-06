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
      text: 'Must Do: hire the Assistant GM before Week 1.',
      archetype: 'host',
      contextDetails: ['Consequence: this hire changes which roster, cap, and owner risks Chip flags.'],
    });

    expect(entry.id).toBe('chip.onboarding.beat-1');
    expect(entry.contextDetails).toEqual(['Consequence: this hire changes which roster, cap, and owner risks Chip flags.']);
  });

  it('accepts Sprint 43 pose-atlas poses in dialogue entries', () => {
    const entry = assertDialogueEntry({
      id: 'chip.event.cap-warning',
      beat: 0,
      pose: 'sad',
      reducedMotionPose: 'thumbs-up',
      text: 'Open cap space before signing. A bad deal blocks injury replacements later.',
      archetype: 'weekly',
    });

    expect(entry.pose).toBe('sad');
    expect(entry.reducedMotionPose).toBe('thumbs-up');
  });

  it('keeps onboarding entries on one-based beats', () => {
    expect(() =>
      assertDialogueEntry({
        id: 'chip.onboarding.beat-0',
        beat: 0,
        pose: 'talk',
        text: 'Choose setup before Week 1 so bad defaults do not lock in.',
        archetype: 'host',
      }),
    ).toThrow(/one-based beat/);
  });

  it('allows weekly entries to use beat zero', () => {
    const entry = assertDialogueEntry({
      id: 'chip.weekly.cleanWin',
      beat: 0,
      pose: 'talk',
      text: 'Open Roster before Advance Week; injuries can change the next lineup.',
      archetype: 'weekly',
    });

    expect(entry.beat).toBe(0);
  });

  it('treats concrete guidance verbs as player actions', () => {
    for (const verb of ['adjust', 'cover', 'pin', 'identify', 'assign', 'run', 'preview', 'find'] as const) {
      expect(() =>
        assertDialogueEntry({
          id: `chip.weekly.${verb}`,
          beat: 0,
          pose: 'talk',
          text: `${verb} the named issue before Advance Week; missing it can cost next week.`,
          archetype: 'weekly',
        }),
      ).not.toThrow();
    }
  });

  it('does not treat weak audit verbs as player actions', () => {
    for (const verb of ['check', 'compare', 'confirm', 'review', 'verify'] as const) {
      expect(() =>
        assertDialogueEntry({
          id: `chip.weekly.weak-${verb}`,
          beat: 0,
          pose: 'talk',
          text: `${verb} the named issue before Advance Week; missing it can cost next week.`,
          archetype: 'weekly',
        }),
      ).toThrow(/clear player action/);
    }
  });

  it('does not treat vague use phrasing as a player action', () => {
    expect(() =>
      assertDialogueEntry({
        id: 'chip.weekly.vague-use',
        beat: 0,
        pose: 'talk',
        text: 'Use Film Room before Week 1; missing it can cost next game.',
        archetype: 'weekly',
      }),
    ).toThrow(/clear player action/);
  });

  it('rejects negative weekly beats', () => {
    expect(() =>
      assertDialogueEntry({
        id: 'chip.weekly.bad',
        beat: -1,
        pose: 'idle',
        text: 'Read Recap before Advance Week; missed issues can repeat next week.',
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
        text: 'Check the first setup choice before Week 1.',
        archetype: 'host',
        contextDetails: [''],
      }),
    ).toThrow(/context details/);
  });

  it('rejects dialogue without a player action', () => {
    expect(() =>
      assertDialogueEntry({
        id: 'chip.onboarding.no-action',
        beat: 1,
        pose: 'idle',
        text: 'Week 1 risk exists, and bad choices can hurt later.',
        archetype: 'host',
      }),
    ).toThrow(/clear player action/);
  });

  it('rejects dialogue without a consequence, limit, or deadline', () => {
    expect(() =>
      assertDialogueEntry({
        id: 'chip.onboarding.no-consequence',
        beat: 1,
        pose: 'idle',
        text: 'Choose the Assistant GM and open the setup card.',
        archetype: 'host',
      }),
    ).toThrow(/consequence, limit, or deadline/);
  });

  it('guards unknown runtime values', () => {
    expect(isDialogueCatalogEntry({ id: '', beat: 0 })).toBe(false);
    expect(
      isDialogueCatalogEntry({
        id: 'chip.event',
        beat: 1,
        pose: 'wave',
        text: 'Choose setup before Week 1 so bad defaults do not lock in.',
        archetype: 'host',
      }),
    ).toBe(true);
  });
});
