import { describe, expect, it } from 'vitest';
import {
  WEEKLY_DIALOGUE_COOLDOWN_MS,
  WEEKLY_DIALOGUE_VARIANTS,
  weeklyDialogue,
  selectWeeklyDialogue,
  type WeeklyDialogueVariant,
} from './weekly';
import { MAX_CHIP_DIALOGUE_CHARS, isDialogueCatalogEntry } from './types';

describe('weekly dialogue catalog', () => {
  it('exports the ten locked Slice B weekly variants with stable IDs', () => {
    expect(WEEKLY_DIALOGUE_VARIANTS).toEqual([
      'cleanWin',
      'uglyWin',
      'loss',
      'blowoutLoss',
      'threeLossStreak',
      'midseason',
      'preseason',
      'playoffs',
      'championship',
      'darkMoment',
    ]);
    expect(weeklyDialogue.map((entry) => entry.id)).toEqual(
      WEEKLY_DIALOGUE_VARIANTS.map((variant) => `chip.weekly.${variant}`),
    );
  });

  it('keeps every weekly entry valid, short, and on the one-week cooldown', () => {
    for (const entry of weeklyDialogue) {
      expect(isDialogueCatalogEntry(entry)).toBe(true);
      expect(entry.archetype).toBe('weekly');
      expect(entry.beat).toBe(0);
      expect(entry.text.length).toBeLessThanOrEqual(MAX_CHIP_DIALOGUE_CHARS);
      expect(entry.cooldownMs).toBe(WEEKLY_DIALOGUE_COOLDOWN_MS);
      expect(entry.priority).toBeGreaterThanOrEqual(1);
      expect(entry.priority).toBeLessThanOrEqual(5);
    }
  });

  it('contains the locked design-doc example lines verbatim', () => {
    expect(selectWeeklyDialogue(baseContext('cleanWin')).text).toContain(
      'That was a grown-up win. Not perfect. Better than perfect, actually — repeatable.',
    );
    expect(selectWeeklyDialogue(baseContext('uglyWin')).text).toContain(
      "Win column says yes. Film room says please don't make me watch the third quarter twice.",
    );
    expect(selectWeeklyDialogue(baseContext('threeLossStreak')).text).toContain(
      "Three straight. We don't need a miracle today. We need one clean decision.",
    );
  });

  it('selects the matching entry for every weekly outcome variant', () => {
    for (const variant of WEEKLY_DIALOGUE_VARIANTS) {
      expect(selectWeeklyDialogue(baseContext(variant)).id).toBe(`chip.weekly.${variant}`);
    }
  });

  it('is deterministic across 1000 identical selections', () => {
    const context = baseContext('midseason');
    const first = selectWeeklyDialogue(context);

    for (let index = 0; index < 1000; index += 1) {
      expect(selectWeeklyDialogue(context).id).toBe(first.id);
      expect(selectWeeklyDialogue(context).text).toBe(first.text);
    }
  });

  it('rejects unsupported weekly variants through the typed selector boundary', () => {
    expect(() =>
      selectWeeklyDialogue({
        gameOutcome: 'badVariant' as WeeklyDialogueVariant,
        currentWeek: 4,
        dynastySeed: 42,
      }),
    ).toThrow(/Unsupported weekly dialogue variant/);
  });
});

function baseContext(gameOutcome: WeeklyDialogueVariant) {
  return {
    gameOutcome,
    currentWeek: 7,
    dynastySeed: 42,
  };
}
