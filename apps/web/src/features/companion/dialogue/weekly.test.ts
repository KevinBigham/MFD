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

  it('contains action-and-consequence weekly guidance instead of slogan copy', () => {
    expect(selectWeeklyDialogue(baseContext('cleanWin')).text).toContain(
      'Recommended: open Roster and Depth Chart after the win; cover injury flags and first backups before changing starters',
    );
    expect(selectWeeklyDialogue(baseContext('cleanWin')).text).toContain(
      'unassigned backup puts a player without that role on the field',
    );
    expect(selectWeeklyDialogue(baseContext('cleanWin')).text).not.toContain(
      'only if the win changed the lineup',
    );
    expect(selectWeeklyDialogue(baseContext('uglyWin')).text).toContain(
      'open Postgame Recap',
    );
    expect(selectWeeklyDialogue(baseContext('uglyWin')).text).toContain(
      'same protection, coverage, or run-defense failure repeats next week',
    );
    expect(selectWeeklyDialogue(baseContext('threeLossStreak')).text).toContain(
      'choose one fix now',
    );
    expect(selectWeeklyDialogue(baseContext('midseason')).text).toContain(
      'open Standings, Roster injury status, and Cap Lab before buying, selling, or holding',
    );
    expect(selectWeeklyDialogue(baseContext('loss')).text).toContain(
      'open Recap to name the failed position or call',
    );
    expect(selectWeeklyDialogue(baseContext('midseason')).text).not.toMatch(
      /compare standings|check Standings/i,
    );
    expect(selectWeeklyDialogue(baseContext('championship')).text).toContain(
      'open Season Recap before bids',
    );
    expect(selectWeeklyDialogue(baseContext('championship')).text).toContain(
      'rushed bids spend cap space on unneeded roles, miss extensions, or leave staff seats empty',
    );
    expect([
      selectWeeklyDialogue(baseContext('cleanWin')).text,
      selectWeeklyDialogue(baseContext('uglyWin')).text,
    ].join(' ')).not.toMatch(/can swing|can flip/i);
  });

  it('keeps every weekly line tied to a decision or consequence', () => {
    const decisionOrConsequenceCue =
      /\b(open|cover|fix|find|choose|decide|set|identify|before|if|can|costs|damage|loss|losses|solved|end|wait)\b/i;
    const screenCue =
      /\b(Roster|Depth Chart|Postgame Recap|Recap|Game Plan|Standings|Injuries|Cap|Season Recap|Contracts|Staff|lineup|plan|roster|health|depth)\b/;

    for (const entry of weeklyDialogue) {
      expect(entry.text).toMatch(decisionOrConsequenceCue);
      expect(entry.text, entry.id).toMatch(screenCue);
      expect(entry.text, entry.id).toMatch(/\b(Must Do|Recommended):/);
      expect(entry.text, entry.id).toContain('Where:');
      expect(entry.text, entry.id).toContain('Consequence:');
      expect(entry.text).not.toMatch(/\b(bad tape|weak room|drifting costs leverage|first leak|position group that cracked|wastes the week|bad night|Roster health|ignored weakness)\b/i);
      expect(entry.text).not.toMatch(/\b(hidden depth problems|failed group|first failed position|major cut|major trade|anger moves)\b/i);
      expect(entry.text).not.toMatch(/\b(bad backup order|bad depth choices|one ignored injury)\b/i);
      expect(entry.text).not.toMatch(/\b(hidden injury|warning signs|wild-card path|offseason screens|will not wait|anger-driven moves)\b/i);
      expect(entry.text).not.toMatch(/\b(matchup problem|thin depth)\b/i);
      expect(entry.text).not.toMatch(/plan weaker|unchecked mistakes become next week/i);
      expect(entry.text, entry.id).not.toMatch(/\bclean win\b/i);
      expect(entry.text, entry.id).not.toMatch(/^(Strong win|Ugly win|Loss|Blowout|Three straight|Midseason|Preseason|Playoffs|Title year closed|Bad loss):/i);
      expect(entry.text, entry.id).not.toMatch(/\bThe cap will not wait\b/i);
      expect(entry.text, entry.id).not.toMatch(/\bcap and staffing deadlines will not wait\b/i);
      expect(entry.text, entry.id).not.toMatch(/\bplayoff odds\b/i);
      expect(entry.text, entry.id).not.toMatch(/check Roster and Depth Chart|check injuries, Depth Chart|check Standings, injuries|read Recap/i);
      expect(entry.text, entry.id).not.toMatch(/use Recap|use Standings/i);
      expect(entry.text, entry.id).not.toMatch(/\buse\b/i);
      expect(entry.text, entry.id).not.toMatch(/\b(verify|confirm|unverified)\b/i);
      expect(entry.text, entry.id).not.toMatch(/compare standings/i);
      expect(entry.text, entry.id).not.toMatch(/unfixed call|unchecked injury/i);
      expect(entry.text, entry.id).not.toMatch(/only if the win changed the lineup/i);
      expect(entry.text, entry.id).not.toMatch(/adjust only/i);
      expect(entry.text, entry.id).not.toMatch(/rushed moves can|uncovered can|trying all three can|waiting can|choices can turn|call can end|rushed bids can|reaction moves can/i);
    }
  });

  it('selects the matching entry for every weekly outcome variant', () => {
    for (const variant of WEEKLY_DIALOGUE_VARIANTS) {
      expect(selectWeeklyDialogue(baseContext(variant)).id).toBe(`chip.weekly.${variant}`);
    }
  });

  it('uses the expanded Chip pose atlas for high-value weekly moments', () => {
    expect(selectWeeklyDialogue(baseContext('cleanWin')).pose).toBe('proud');
    expect(selectWeeklyDialogue(baseContext('uglyWin')).pose).toBe('pointing-at-tape');
    expect(selectWeeklyDialogue(baseContext('blowoutLoss')).pose).toBe('head-in-hands');
    expect(selectWeeklyDialogue(baseContext('playoffs')).pose).toBe('rallying');
    expect(selectWeeklyDialogue(baseContext('preseason')).pose).toBe('reviewing-tablet');
    expect(selectWeeklyDialogue(baseContext('darkMoment')).pose).toBe('facepalm');
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
