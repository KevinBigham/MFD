import type { WeeklyDialogueVariant } from './dialogue/weekly';
import { MAX_CHIP_DIALOGUE_CHARS, type DialogueCatalogEntry } from './dialogue/types';
import type { WeeklyGuidance } from './weeklyGuidance';

/**
 * Sequential-bubble machinery (B7/H3).
 *
 * B7: big emotional moments (blowout loss, three-loss streak, dark moment,
 * championship) become a two-beat conversation — the reaction beat (sideline
 * flavor, optionally led by the continuity line) and then the coaching beat
 * (the unchanged Must Do + why) — instead of one dense bubble.
 *
 * H3: any beat whose text exceeds the bubble budget is split into sequential
 * parts at sentence boundaries (hard-wrapping only oversized single sentences
 * at word boundaries) rather than truncating with an ellipsis.
 *
 * Everything here is a pure function; queueing lives in the chip store and
 * rendering in ChipDock. Non-big outcomes return the merged entry untouched
 * so the single-bubble path stays byte-identical.
 */

/** Outcomes that earn a two-beat conversation (B7). */
export const BIG_MOMENT_VARIANTS: readonly WeeklyDialogueVariant[] = [
  'blowoutLoss',
  'threeLossStreak',
  'darkMoment',
  'championship',
];

function splitSentences(text: string): string[] {
  const matches = text.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g);
  return matches ? matches.map((part) => part.trim()).filter((part) => part.length > 0) : [];
}

/** Hard-wrap one oversized sentence at word boundaries (last resort). */
function wrapLongSentence(sentence: string, maxChars: number): string[] {
  const words = sentence.split(/\s+/).filter((word) => word.length > 0);
  const parts: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) parts.push(current);
      current = word;
    }
  }
  if (current) parts.push(current);
  return parts;
}

/**
 * H3: split text into bubble-sized chunks. Sentences pack greedily in order;
 * a sentence that alone exceeds the budget hard-wraps at word boundaries.
 * Returns [text] unchanged when it already fits.
 */
export function chunkDialogueText(text: string, maxChars: number = MAX_CHIP_DIALOGUE_CHARS): string[] {
  const normalized = text.trim();
  if (normalized.length <= maxChars) return [normalized];

  const chunks: string[] = [];
  let current = '';
  for (const sentence of splitSentences(normalized)) {
    if (sentence.length > maxChars) {
      if (current) {
        chunks.push(current);
        current = '';
      }
      chunks.push(...wrapLongSentence(sentence, maxChars));
      continue;
    }
    const candidate = current ? `${current} ${sentence}` : sentence;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      chunks.push(current);
      current = sentence;
    }
  }
  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [normalized];
}

/**
 * H3: split one entry into sequential entries when its text overflows.
 * Context details ride the final part so the details panel appears when the
 * conversation completes, not mid-thought.
 */
export function chunkDialogueEntry(
  entry: DialogueCatalogEntry,
  maxChars: number = MAX_CHIP_DIALOGUE_CHARS,
): DialogueCatalogEntry[] {
  const chunks = chunkDialogueText(entry.text, maxChars);
  if (chunks.length <= 1) return [{ ...entry, text: chunks[0]! }];
  return chunks.map((text, index) => ({
    ...entry,
    id: `${entry.id}.part-${index + 1}`,
    beat: index,
    text,
    contextDetails: index === chunks.length - 1 ? entry.contextDetails : undefined,
  }));
}

/**
 * B7: build the weekly conversation. Non-big outcomes return the merged
 * single-beat entry byte-for-byte. Big moments return the reaction beat
 * followed by the unchanged coaching beat; every beat passes through the H3
 * chunker so overflow becomes sequence instead of truncation.
 */
export function buildWeeklyConversation(
  guidance: WeeklyGuidance,
  mergedEntry: DialogueCatalogEntry,
  gameOutcome: WeeklyDialogueVariant,
): DialogueCatalogEntry[] {
  if (!BIG_MOMENT_VARIANTS.includes(gameOutcome)) {
    return chunkDialogueEntry(mergedEntry);
  }

  const reactionText = guidance.continuityNote
    ? `${guidance.continuityNote} ${guidance.sidelineNote}`
    : guidance.sidelineNote;
  const reactionBeat: DialogueCatalogEntry = {
    ...mergedEntry,
    id: `${mergedEntry.id}.reaction`,
    beat: 0,
    text: reactionText,
    contextDetails: undefined,
  };
  const coachingBeat: DialogueCatalogEntry = {
    ...mergedEntry,
    id: `${mergedEntry.id}.plan`,
    beat: 1,
  };

  return [reactionBeat, coachingBeat].flatMap((entry) => chunkDialogueEntry(entry));
}
