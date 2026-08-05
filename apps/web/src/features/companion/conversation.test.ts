import { describe, expect, it } from 'vitest';
import { MAX_CHIP_DIALOGUE_CHARS, type DialogueCatalogEntry } from './dialogue/types';
import type { WeeklyGuidance } from './weeklyGuidance';
import {
  BIG_MOMENT_VARIANTS,
  buildWeeklyConversation,
  chunkDialogueEntry,
  chunkDialogueText,
} from './conversation';

function makeGuidance(overrides: Partial<WeeklyGuidance> = {}): WeeklyGuidance {
  return {
    id: 'chip.weekly.guidance.9',
    pose: 'talk',
    whatChanged: 'Week 9: heavy loss.',
    whyItMatters: 'The fix list starts at the top.',
    topAction: 'Must Do: open Postgame Recap.',
    mustDo: 'Must Do: open Postgame Recap.',
    recommended: 'Recommended: open Roster.',
    optional: 'Optional: open History.',
    where: 'Where: Recap, then Roster.',
    deadline: 'Deadline: before Advance Week.',
    canWait: 'Awards can wait.',
    risk: 'Risk: the same miss repeats.',
    sidelineNote: 'That one hurts, and it should. One fix at a time from here.',
    ...overrides,
  };
}

function makeEntry(overrides: Partial<DialogueCatalogEntry> = {}): DialogueCatalogEntry {
  return {
    id: 'chip.weekly.blowoutLoss',
    beat: 0,
    pose: 'talk',
    text: 'Must Do: open Postgame Recap. The fix list starts at the top.',
    contextDetails: ['What changed: Week 9: heavy loss.', 'Must Do: open Postgame Recap.'],
    archetype: 'weekly',
    ...overrides,
  };
}

describe('chunkDialogueText (H3)', () => {
  it('returns text unchanged when it fits the budget', () => {
    expect(chunkDialogueText('Short beat.')).toEqual(['Short beat.']);
  });

  it('packs sentences greedily without splitting them', () => {
    const sentence = 'One clean sentence here.';
    const text = Array.from({ length: 12 }, () => sentence).join(' ');
    const chunks = chunkDialogueText(text);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(MAX_CHIP_DIALOGUE_CHARS);
      expect(chunk.endsWith('.')).toBe(true);
    }
    expect(chunks.join(' ')).toBe(text);
  });

  it('hard-wraps a single oversized sentence at word boundaries', () => {
    const text = Array.from({ length: 80 }, (_, index) => `word${index}`).join(' ');
    const chunks = chunkDialogueText(text);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(MAX_CHIP_DIALOGUE_CHARS);
      expect(chunk).not.toMatch(/\s{2}/);
    }
    expect(chunks.join(' ')).toBe(text);
  });

  it('keeps sentence order across chunk boundaries', () => {
    const chunks = chunkDialogueText(`${'A '.repeat(100)}First marker. ${'B '.repeat(100)}Second marker.`);
    const joined = chunks.join(' ');
    expect(joined.indexOf('First marker.')).toBeLessThan(joined.indexOf('Second marker.'));
  });
});

describe('chunkDialogueEntry (H3)', () => {
  it('keeps a fitting entry intact apart from trim', () => {
    const entry = makeEntry();
    expect(chunkDialogueEntry(entry)).toEqual([entry]);
  });

  it('splits overflow into sequential parts with details on the final part', () => {
    const sentence = 'One clean sentence here.';
    const entry = makeEntry({ text: Array.from({ length: 14 }, () => sentence).join(' ') });
    const parts = chunkDialogueEntry(entry);

    expect(parts.length).toBeGreaterThan(1);
    parts.forEach((part, index) => {
      expect(part.id).toBe(`${entry.id}.part-${index + 1}`);
      expect(part.beat).toBe(index);
      expect(part.text.length).toBeLessThanOrEqual(MAX_CHIP_DIALOGUE_CHARS);
      if (index < parts.length - 1) {
        expect(part.contextDetails).toBeUndefined();
      } else {
        expect(part.contextDetails).toEqual(entry.contextDetails);
      }
    });
  });
});

describe('buildWeeklyConversation (B7)', () => {
  it('returns the single merged entry for non-big outcomes byte-for-byte', () => {
    const entry = makeEntry();
    const conversation = buildWeeklyConversation(makeGuidance(), entry, 'cleanWin');

    expect(conversation).toEqual([entry]);
  });

  it('queues reaction then coaching beats for every big-moment variant', () => {
    for (const variant of BIG_MOMENT_VARIANTS) {
      const entry = makeEntry();
      const guidance = makeGuidance();
      const conversation = buildWeeklyConversation(guidance, entry, variant);

      expect(conversation, variant).toHaveLength(2);
      const [reaction, coaching] = conversation;
      expect(reaction!.id).toBe(`${entry.id}.reaction`);
      expect(reaction!.text).toBe(guidance.sidelineNote);
      expect(reaction!.contextDetails).toBeUndefined();
      expect(coaching!.id).toBe(`${entry.id}.plan`);
      expect(coaching!.text).toBe(entry.text);
      expect(coaching!.contextDetails).toEqual(entry.contextDetails);
    }
  });

  it('leads the reaction beat with the continuity note when present', () => {
    const guidance = makeGuidance({ continuityNote: 'Three straight on the wrong side of the table.' });
    const [reaction] = buildWeeklyConversation(guidance, makeEntry(), 'threeLossStreak');

    expect(reaction!.text).toBe(`${guidance.continuityNote} ${guidance.sidelineNote}`);
  });

  it('chunks an overflowing reaction beat into sequential parts', () => {
    const sentence = 'One clean sentence here.';
    const guidance = makeGuidance({
      sidelineNote: Array.from({ length: 14 }, () => sentence).join(' '),
    });
    const conversation = buildWeeklyConversation(guidance, makeEntry(), 'championship');

    expect(conversation.length).toBeGreaterThan(2);
    const last = conversation.at(-1)!;
    expect(last.id).toBe('chip.weekly.blowoutLoss.plan');
    expect(last.contextDetails).toBeDefined();
    for (const beat of conversation) {
      expect(beat.text.length).toBeLessThanOrEqual(MAX_CHIP_DIALOGUE_CHARS);
    }
  });
});
