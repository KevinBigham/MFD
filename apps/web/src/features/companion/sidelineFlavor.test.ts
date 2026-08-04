import { describe, expect, it } from 'vitest';
import {
  CHIP_SIGN_OFFS,
  EASTER_EGG_ONE_IN_N,
  LOW_LOCKER_ROOM_MORALE_MAX,
  LOW_OWNER_PATIENCE_MAX,
  MAX_SIDELINE_NOTE_CHARS,
  SIDELINE_EASTER_EGG_POOL,
  SIDELINE_NOTE_LABEL,
  seasonArcForWeek,
  selectSidelineNote,
  selectSidelineNoteDetail,
  sidelineNotePool,
} from './sidelineFlavor';
import { WEEKLY_DIALOGUE_VARIANTS } from './dialogue/weekly';

const RETIRED_PHRASES =
  /\b(vibe|feels?|story|context|identity|foundation|momentum|real answer|good energy|tone setter|read|verify|confirm|check|review|compare|worth|use|sim|triage)\b/i;

describe('sideline flavor engine', () => {
  it('ships a deep pool for every weekly outcome', () => {
    for (const variant of WEEKLY_DIALOGUE_VARIANTS) {
      const pool = sidelineNotePool(variant);
      expect(pool.length, variant).toBeGreaterThanOrEqual(5);
      expect(new Set(pool).size, variant).toBe(pool.length);
    }
  });

  it('keeps every flavor line short and inside Chip voice rules', () => {
    for (const variant of WEEKLY_DIALOGUE_VARIANTS) {
      for (const line of sidelineNotePool(variant)) {
        expect(line.length, `${variant}: ${line}`).toBeLessThanOrEqual(MAX_SIDELINE_NOTE_CHARS);
        expect(line, `${variant}: ${line}`).not.toMatch(RETIRED_PHRASES);
      }
    }
  });

  it('returns the canonical first line when no dynasty seed is available', () => {
    for (const variant of WEEKLY_DIALOGUE_VARIANTS) {
      expect(selectSidelineNote({ outcome: variant, currentWeek: 7 }))
        .toBe(sidelineNotePool(variant)[0]);
      expect(selectSidelineNote({ outcome: variant, currentWeek: 7, dynastySeed: Number.NaN }))
        .toBe(sidelineNotePool(variant)[0]);
    }
  });

  it('is deterministic for the same seed, outcome, and week', () => {
    for (let index = 0; index < 200; index += 1) {
      expect(selectSidelineNote({ outcome: 'loss', currentWeek: 9, dynastySeed: 42 }))
        .toBe(selectSidelineNote({ outcome: 'loss', currentWeek: 9, dynastySeed: 42 }));
    }
  });

  it('rotates across weeks for a seeded dynasty', () => {
    const seen = new Set(
      Array.from({ length: 18 }, (_, index) =>
        selectSidelineNote({ outcome: 'cleanWin', currentWeek: index + 1, dynastySeed: 42 })),
    );
    expect(seen.size).toBeGreaterThan(1);
  });

  it('labels the note for context-detail rendering', () => {
    const detail = selectSidelineNoteDetail({ outcome: 'playoffs', currentWeek: 19, dynastySeed: 7 });
    expect(detail.startsWith(`${SIDELINE_NOTE_LABEL}: `)).toBe(true);
    expect(detail.length).toBeGreaterThan(SIDELINE_NOTE_LABEL.length + 2);
  });

  it('keeps seeded notes inside the character budget even with a sign-off', () => {
    for (const variant of WEEKLY_DIALOGUE_VARIANTS) {
      for (let week = 1; week <= 22; week += 1) {
        const note = selectSidelineNote({ outcome: variant, currentWeek: week, dynastySeed: 99 });
        expect(note.length, `${variant} week ${week}: ${note}`).toBeLessThanOrEqual(MAX_SIDELINE_NOTE_CHARS);
        expect(note, `${variant} week ${week}: ${note}`).not.toMatch(RETIRED_PHRASES);
      }
    }
  });

  it('rotates signature sign-offs deterministically for seeded dynasties', () => {
    const signedWeeks = WEEKLY_DIALOGUE_VARIANTS.flatMap((variant) =>
      Array.from({ length: 22 }, (_, index) =>
        selectSidelineNote({ outcome: variant, currentWeek: index + 1, dynastySeed: 42 })),
    ).filter((note) => CHIP_SIGN_OFFS.some((signOff) => note.endsWith(` ${signOff}`)));
    expect(signedWeeks.length).toBeGreaterThan(0);
    for (const signOff of CHIP_SIGN_OFFS) {
      expect(signedWeeks.some((note) => note.endsWith(` ${signOff}`)), signOff).toBe(true);
    }
  });

  it('never repeats the same pool line in consecutive weeks when the pool allows', () => {
    const eggLines = new Set(SIDELINE_EASTER_EGG_POOL.map((line) => line.split(' ')[0]));
    for (const variant of WEEKLY_DIALOGUE_VARIANTS) {
      for (let week = 1; week <= 18; week += 1) {
        const current = selectSidelineNote({ outcome: variant, currentWeek: week, dynastySeed: 7 });
        const next = selectSidelineNote({ outcome: variant, currentWeek: week + 1, dynastySeed: 7 });
        const currentIsEgg = eggLines.has(current.split(' ')[0]!);
        const nextIsEgg = eggLines.has(next.split(' ')[0]!);
        if (currentIsEgg || nextIsEgg) continue;
        expect(next, `${variant} weeks ${week}/${week + 1}`).not.toBe(current);
      }
    }
  });

  it('serves a rare deterministic easter egg line inside voice guards', () => {
    for (const line of SIDELINE_EASTER_EGG_POOL) {
      expect(line.length, line).toBeLessThanOrEqual(MAX_SIDELINE_NOTE_CHARS);
      expect(line, line).not.toMatch(RETIRED_PHRASES);
    }
    const eggLines = new Set<string>(SIDELINE_EASTER_EGG_POOL);
    const eggWeeks = Array.from({ length: EASTER_EGG_ONE_IN_N * 4 }, (_, index) =>
      selectSidelineNote({ outcome: 'midseason', currentWeek: index + 1, dynastySeed: 5 }),
    ).filter((note) => [...eggLines].some((egg) => note.startsWith(egg.split('.')[0]!)));
    expect(eggWeeks.length).toBeGreaterThan(0);
    for (const note of eggWeeks) {
      expect(note.length, note).toBeLessThanOrEqual(MAX_SIDELINE_NOTE_CHARS);
      expect(note, note).not.toMatch(RETIRED_PHRASES);
    }
  });

  it('is bit-stable across 1000 identical selections', () => {
    const first = selectSidelineNote({ outcome: 'blowoutLoss', currentWeek: 13, dynastySeed: 2026 });
    for (let index = 0; index < 1000; index += 1) {
      expect(selectSidelineNote({ outcome: 'blowoutLoss', currentWeek: 13, dynastySeed: 2026 })).toBe(first);
    }
  });

  it('keeps the flavor engine inside the 10 KB gzipped bundle budget', async () => {
    const [source, { gzipSync }] = await Promise.all([
      import('node:fs/promises').then((fs) => fs.readFile(new URL('./sidelineFlavor.ts', import.meta.url), 'utf8')),
      import('node:zlib'),
    ]);
    expect(gzipSync(Buffer.from(source, 'utf8')).length).toBeLessThan(10 * 1024);
  });

  it('names the next opponent in seeded notes when the coin flip lands', () => {
    const mentions = Array.from({ length: 22 }, (_, index) =>
      selectSidelineNote({
        outcome: 'midseason',
        currentWeek: index + 1,
        dynastySeed: 42,
        opponentName: 'Austin Armadillos',
      }),
    ).filter((note) => note.includes('Eyes on Austin Armadillos.'));
    expect(mentions.length).toBeGreaterThan(0);
    for (const note of mentions) {
      expect(note.length, note).toBeLessThanOrEqual(MAX_SIDELINE_NOTE_CHARS);
    }
  });

  it('never names an opponent for unseeded callers', () => {
    for (const variant of WEEKLY_DIALOGUE_VARIANTS) {
      expect(selectSidelineNote({ outcome: variant, currentWeek: 7, opponentName: 'Austin Armadillos' }))
        .toBe(sidelineNotePool(variant)[0]);
    }
  });

  it('serves stern closers on high-pressure difficulties and stays in budget', () => {
    const sternNotes = WEEKLY_DIALOGUE_VARIANTS.flatMap((variant) =>
      Array.from({ length: 22 }, (_, index) =>
        selectSidelineNote({ outcome: variant, currentWeek: index + 1, dynastySeed: 42, difficulty: 'legend' })),
    );
    const sternHits = sternNotes.filter((note) =>
      /No excuses at this level\.|The standard does not bend\.|Details decide it at this level\.$/.test(note));
    expect(sternHits.length).toBeGreaterThan(0);
    expect(sternNotes.some((note) => CHIP_SIGN_OFFS.some((signOff) => note.endsWith(` ${signOff}`)))).toBe(false);
    for (const note of sternNotes) {
      expect(note.length, note).toBeLessThanOrEqual(MAX_SIDELINE_NOTE_CHARS);
      expect(note, note).not.toMatch(RETIRED_PHRASES);
    }
    // Friendly difficulties keep the standard sign-offs.
    const friendly = selectSidelineNote({ outcome: 'midseason', currentWeek: 5, dynastySeed: 42, difficulty: 'rookie' });
    expect(friendly).not.toMatch(/No excuses at this level\./);
  });

  it('shifts tone by season arc so the same outcome reads differently in September vs December', () => {
    expect(seasonArcForWeek(1)).toBe('early');
    expect(seasonArcForWeek(4)).toBe('early');
    expect(seasonArcForWeek(9)).toBe('mid');
    expect(seasonArcForWeek(15)).toBe('late');
    expect(seasonArcForWeek(18)).toBe('late');

    const arcs = ['early', 'mid', 'late'] as const;
    const linesByArc = arcs.map((seasonArc) =>
      Array.from({ length: 18 }, (_, index) =>
        selectSidelineNote({ outcome: 'loss', currentWeek: index + 1, dynastySeed: 42, seasonArc })),
    );
    // Each arc is deterministic and in-budget...
    for (const lines of linesByArc) {
      for (const note of lines) {
        expect(note.length, note).toBeLessThanOrEqual(MAX_SIDELINE_NOTE_CHARS);
      }
    }
    // ...but arcs do not all serve the same sequence.
    expect(new Set(linesByArc.map((lines) => lines.join('|'))).size).toBeGreaterThan(1);
  });

  it('names the hurting room when seeded morale runs low, and ignores mood when unseeded (A5)', () => {
    const lowMoraleNotes = Array.from({ length: 22 }, (_, index) =>
      selectSidelineNote({ outcome: 'cleanWin', currentWeek: index + 1, dynastySeed: 42, averageMorale: 30 }));
    const moodHits = lowMoraleNotes.filter((note) =>
      /The room is hurting; steady it\.|Protect the room first\.|Heads are down; lift the room\.$/.test(note));
    expect(moodHits.length).toBeGreaterThan(0);
    for (const note of lowMoraleNotes) {
      expect(note.length, note).toBeLessThanOrEqual(MAX_SIDELINE_NOTE_CHARS);
      expect(note, note).not.toMatch(RETIRED_PHRASES);
    }
    // Unseeded callers keep the canonical line regardless of mood inputs.
    expect(selectSidelineNote({ outcome: 'cleanWin', currentWeek: 7, averageMorale: 30 }))
      .toBe(sidelineNotePool('cleanWin')[0]);
  });

  it('keeps a healthy room out of the mood tier at the boundary (A5)', () => {
    const notes = Array.from({ length: 22 }, (_, index) =>
      selectSidelineNote({ outcome: 'cleanWin', currentWeek: index + 1, dynastySeed: 42, averageMorale: LOW_LOCKER_ROOM_MORALE_MAX }));
    expect(
      notes.some((note) => /The room is hurting; steady it\.|Protect the room first\.|Heads are down; lift the room\./.test(note)),
    ).toBe(false);
  });

  it('names thin owner patience for seeded dynasties and yields to stern closers (A5)', () => {
    const patienceNotes = Array.from({ length: 22 }, (_, index) =>
      selectSidelineNote({ outcome: 'loss', currentWeek: index + 1, dynastySeed: 7, ownerPatience: LOW_OWNER_PATIENCE_MAX }));
    const hits = patienceNotes.filter((note) =>
      /Upstairs patience is thin\.|The owner wants answers\.|Patience upstairs runs short\.$/.test(note));
    expect(hits.length).toBeGreaterThan(0);
    for (const note of patienceNotes) {
      expect(note.length, note).toBeLessThanOrEqual(MAX_SIDELINE_NOTE_CHARS);
      expect(note, note).not.toMatch(RETIRED_PHRASES);
    }
    // Above the threshold the patience tier stays silent.
    const comfortable = Array.from({ length: 22 }, (_, index) =>
      selectSidelineNote({ outcome: 'loss', currentWeek: index + 1, dynastySeed: 7, ownerPatience: LOW_OWNER_PATIENCE_MAX + 1 }));
    expect(
      comfortable.some((note) => /Upstairs patience is thin\.|The owner wants answers\.|Patience upstairs runs short\./.test(note)),
    ).toBe(false);
    // High-pressure difficulty still wins the suffix slot.
    const stern = Array.from({ length: 22 }, (_, index) =>
      selectSidelineNote({ outcome: 'loss', currentWeek: index + 1, dynastySeed: 7, ownerPatience: 20, difficulty: 'legend' }));
    expect(
      stern.some((note) => /Upstairs patience is thin\.|The owner wants answers\.|Patience upstairs runs short\./.test(note)),
    ).toBe(false);
    // When the room and the owner are both hurting, the room speaks first.
    const both = Array.from({ length: 22 }, (_, index) =>
      selectSidelineNote({ outcome: 'loss', currentWeek: index + 1, dynastySeed: 7, ownerPatience: 20, averageMorale: 30 }));
    expect(
      both.some((note) => /Upstairs patience is thin\.|The owner wants answers\.|Patience upstairs runs short\./.test(note)),
    ).toBe(false);
    expect(
      both.some((note) => /The room is hurting; steady it\.|Protect the room first\.|Heads are down; lift the room\./.test(note)),
    ).toBe(true);
  });
});

describe('B5 durable flavor anti-repeat (avoidLine)', () => {
  function findPoolServedWeek(outcome: 'loss' | 'cleanWin'): { week: number; served: string; servedLine: string } {
    for (let week = 1; week <= 18; week += 1) {
      const served = selectSidelineNote({ outcome, currentWeek: week, dynastySeed: 42 });
      const servedLine = sidelineNotePool(outcome).find((line) => served.startsWith(line));
      if (servedLine) return { week, served, servedLine };
    }
    throw new Error('expected a non-easter-egg week in the scan');
  }

  it('rotates one pool slot when memory says the same line went out last time', () => {
    const { week, served, servedLine } = findPoolServedWeek('loss');
    const pool = sidelineNotePool('loss');
    const servedIndex = pool.indexOf(servedLine);
    const expectedRotatedLine = pool[(servedIndex + 1) % pool.length]!;

    const avoided = selectSidelineNote({ outcome: 'loss', currentWeek: week, dynastySeed: 42, avoidLine: servedLine });

    expect(avoided).not.toBe(served);
    expect(avoided.startsWith(servedLine)).toBe(false);
    expect(avoided.startsWith(expectedRotatedLine)).toBe(true);
    expect(avoided.length).toBeLessThanOrEqual(MAX_SIDELINE_NOTE_CHARS + 40);
  });

  it('keeps the deterministic pick when the avoided line is a different line', () => {
    const { week, served, servedLine } = findPoolServedWeek('cleanWin');
    const pool = sidelineNotePool('cleanWin');
    const otherLine = pool.find((line) => line !== servedLine)!;

    expect(selectSidelineNote({ outcome: 'cleanWin', currentWeek: week, dynastySeed: 42, avoidLine: otherLine }))
      .toBe(served);
  });

  it('ignores avoidLine on the unseeded canonical path byte-for-byte', () => {
    const canonical = selectSidelineNote({ outcome: 'loss', currentWeek: 7 });
    expect(selectSidelineNote({ outcome: 'loss', currentWeek: 7, avoidLine: sidelineNotePool('loss')[0]! }))
      .toBe(canonical);
  });

  it('is deterministic for the same seed, week, and avoidLine', () => {
    const { week, servedLine } = findPoolServedWeek('loss');
    const first = selectSidelineNote({ outcome: 'loss', currentWeek: week, dynastySeed: 42, avoidLine: servedLine });
    const second = selectSidelineNote({ outcome: 'loss', currentWeek: week, dynastySeed: 42, avoidLine: servedLine });
    expect(first).toBe(second);
  });
});

describe('B5 avoidLine recorded-note matching', () => {
  it('matches the recorded `<line> <suffix>` form, and pool lines never prefix each other', () => {
    // Guard the startsWith matching rule: no pool line may be a strict
    // prefix of another line in the same pool.
    for (const variant of WEEKLY_DIALOGUE_VARIANTS) {
      const pool = sidelineNotePool(variant);
      for (const line of pool) {
        for (const other of pool) {
          if (other !== line) {
            expect(other.startsWith(`${line} `), `${variant}: "${line}" prefixes "${other}"`).toBe(false);
          }
        }
      }
    }

    // The recorded full note (line + suffix) still triggers the rotation.
    const outcome = 'loss' as const;
    for (let week = 1; week <= 18; week += 1) {
      const served = selectSidelineNote({ outcome, currentWeek: week, dynastySeed: 42 });
      const servedLine = sidelineNotePool(outcome).find((line) => served.startsWith(line));
      if (!servedLine) continue; // easter-egg week
      const rotated = selectSidelineNote({ outcome, currentWeek: week, dynastySeed: 42, avoidLine: served });
      expect(rotated).not.toBe(served);
      expect(rotated.startsWith(servedLine)).toBe(false);
      return;
    }
    throw new Error('expected a non-easter-egg week in the scan');
  });
});
