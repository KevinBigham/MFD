import { describe, expect, it } from 'vitest';
import {
  CHIP_ONBOARDING_STATE_STORAGE_KEY,
  FIRST_TEN_FLAVOR_POOLS,
  FIRST_TEN_MINUTE_ONBOARDING_BEATS,
  createInitialChipOnboardingState,
  firstTenBeatText,
  readChipOnboardingState,
  recordChipOnboardingBeat,
  resetChipOnboardingState,
  selectChipOnboardingRouteBeats,
  snoozeChipOnboarding,
  writeChipOnboardingState,
} from './onboardingMachine';

class MemoryStorage implements Storage {
  private readonly backing = new Map<string, string>();
  get length() { return this.backing.size; }
  clear(): void { this.backing.clear(); }
  getItem(key: string): string | null { return this.backing.get(key) ?? null; }
  key(index: number): string | null { return [...this.backing.keys()][index] ?? null; }
  removeItem(key: string): void { this.backing.delete(key); }
  setItem(key: string, value: string): void { this.backing.set(key, value); }
}

describe('Chip onboarding machine', () => {
  it('defines a stable first-ten-minute arc for the core live routes', () => {
    expect(FIRST_TEN_MINUTE_ONBOARDING_BEATS.map((beat) => [beat.id, beat.route])).toEqual([
      ['chip.first10.monday-briefing', '/'],
      ['chip.first10.roster', '/roster'],
      ['chip.first10.depth-chart', '/depth-chart'],
      ['chip.first10.game-plan', '/game-plan'],
      ['chip.first10.week-advance', '/week-advance'],
      // G1: the arc grew 5 -> 8 beats; new stops append after the core tour.
      ['chip.first10.inbox', '/inbox'],
      ['chip.first10.standings', '/standings'],
      ['chip.first10.trades', '/trades'],
    ]);
  });

  it('selects only the first unseen eligible beat and persists completion', () => {
    const storage = new MemoryStorage();
    const state = createInitialChipOnboardingState();

    const rosterBeats = selectChipOnboardingRouteBeats('/roster', state, { currentWeek: 1 });

    expect(rosterBeats).toEqual([
      expect.objectContaining({
        id: 'chip.first10.roster',
      }),
    ]);
    expect(rosterBeats[0]?.text).toContain('Where: injuries and first backups.');
    expect(rosterBeats[0]?.text).toContain('Consequence: uncovered backups force emergency signings');

    const nextState = recordChipOnboardingBeat(storage, 'chip.first10.roster');
    expect(nextState.completedBeatIds).toContain('chip.first10.roster');
    expect(readChipOnboardingState(storage).completedBeatIds).toContain('chip.first10.roster');
    expect(selectChipOnboardingRouteBeats('/roster', nextState, { currentWeek: 1 })).toEqual([]);
  });

  it('snoozes live guidance without deleting completed progress', () => {
    const storage = new MemoryStorage();
    writeChipOnboardingState(storage, {
      ...createInitialChipOnboardingState(),
      completedBeatIds: ['chip.first10.monday-briefing'],
    });

    const snoozed = snoozeChipOnboarding(storage, 2, () => new Date('2026-05-05T16:00:00.000Z'));

    expect(snoozed.snoozedUntilWeek).toBe(2);
    expect(selectChipOnboardingRouteBeats('/roster', snoozed, { currentWeek: 2 })).toEqual([]);
    expect(selectChipOnboardingRouteBeats('/roster', snoozed, { currentWeek: 3 })).toHaveLength(1);
    expect(readChipOnboardingState(storage).completedBeatIds).toEqual(['chip.first10.monday-briefing']);
  });

  it('reset clears the persisted machine state', () => {
    const storage = new MemoryStorage();
    recordChipOnboardingBeat(storage, 'chip.first10.roster');

    resetChipOnboardingState(storage);

    expect(storage.getItem(CHIP_ONBOARDING_STATE_STORAGE_KEY)).toBeNull();
    expect(readChipOnboardingState(storage).completedBeatIds).toEqual([]);
  });

  it('keeps onboarding controls usable when browser storage rejects reads or writes', () => {
    const storage = new MemoryStorage();
    storage.getItem = () => {
      throw new Error('storage blocked');
    };
    const fallbackState = readChipOnboardingState(storage);
    expect(fallbackState).toMatchObject({
      version: 1,
      completedBeatIds: [],
      snoozedUntilWeek: null,
      disabled: false,
    });
    expect(fallbackState.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

    storage.getItem = () => null;
    storage.setItem = () => {
      throw new Error('storage full');
    };
    expect(() => recordChipOnboardingBeat(storage, 'chip.first10.roster')).not.toThrow();

    storage.removeItem = () => {
      throw new Error('storage blocked');
    };
    expect(() => resetChipOnboardingState(storage)).not.toThrow();
  });

  it('keeps first-ten live guidance plain and consequence-focused', () => {
    const decisionOrConsequenceCue =
      /\b(check|open|save|set|verify|identify|choose|advance|before|risk|emergency|unassigned|fails|locks|required|consequence|where)\b/i;
    const implementationJargon =
      /(read-model|display-only|route-local|source panels?|commit boundary|durable|render|mutate|receipt)/i;

    for (const beat of FIRST_TEN_MINUTE_ONBOARDING_BEATS) {
      expect(beat.text, beat.id).toMatch(decisionOrConsequenceCue);
      expect(beat.text, beat.id).not.toMatch(implementationJargon);
      expect(beat.text, beat.id).not.toMatch(/\bthin rooms?|thin backups?\b/i);
      expect(beat.text, beat.id).not.toMatch(/Sunday risk|runs the sim|required red items|red blockers|make the plan fail/i);
      expect(beat.text, beat.id).not.toMatch(/after health|run\/pass|starters\/backups|wrong jobs|wrong calls|wrong player/i);
      expect(beat.text, beat.id).not.toMatch(/opponent lock/i);
      expect(beat.text, beat.id).toMatch(/\b(Must Do|Recommended):/);
      expect(beat.text, beat.id).toContain('Where:');
      expect(beat.text, beat.id).toContain('Consequence:');
      expect(beat.text.length, beat.id).toBeLessThanOrEqual(140);
    }

    const gamePlanBeat = FIRST_TEN_MINUTE_ONBOARDING_BEATS.find((beat) => beat.id === 'chip.first10.game-plan');
    expect(gamePlanBeat?.text).toContain('offense, protection, coverage');
    expect(gamePlanBeat?.text).toContain('hurt starters need safer calls');
    expect(FIRST_TEN_MINUTE_ONBOARDING_BEATS.find((beat) => beat.id === 'chip.first10.monday-briefing')?.text).toContain(
      'Consequence: Advance Week locks injuries, promises, deadlines, and opponent prep.',
    );
    expect(FIRST_TEN_MINUTE_ONBOARDING_BEATS.find((beat) => beat.id === 'chip.first10.depth-chart')?.text).toContain(
      'Consequence: missing role puts unassigned player on field.',
    );
    expect(FIRST_TEN_MINUTE_ONBOARDING_BEATS.find((beat) => beat.id === 'chip.first10.week-advance')?.text).toContain(
      'Consequence: results, injuries, morale, deadlines, and opponent prep become final.',
    );
  });
});

describe('G9 first-ten flavor lines', () => {
  const RETIRED_SHORTHAND =
    /\b(vibe|feels?|story|context|identity|foundation|momentum|real answer|good energy|tone setter|read|verify|confirm|check|review|compare|worth|use|sim|triage)\b/i;

  it('covers exactly the first-ten beat ids, each inside the voice guard', () => {
    expect(Object.keys(FIRST_TEN_FLAVOR_POOLS).sort()).toEqual(
      FIRST_TEN_MINUTE_ONBOARDING_BEATS.map((beat) => beat.id).sort(),
    );
    for (const [beatId, pool] of Object.entries(FIRST_TEN_FLAVOR_POOLS)) {
      expect(pool.length, beatId).toBeGreaterThanOrEqual(3);
      for (const line of pool) {
        expect(line, `${beatId}: ${line}`).not.toMatch(RETIRED_SHORTHAND);
        expect(line.length, `${beatId}: ${line}`).toBeLessThanOrEqual(100);
      }
    }
  });

  it('serves canonical text byte-for-byte when no dynasty seed is available', () => {
    for (const beat of FIRST_TEN_MINUTE_ONBOARDING_BEATS) {
      expect(firstTenBeatText(beat, { currentWeek: 3 })).toBe(beat.text);
      expect(firstTenBeatText(beat, { currentWeek: 3, dynastySeed: Number.NaN })).toBe(beat.text);
    }
  });

  it('is deterministic for a seed + week and rotates across weeks', () => {
    const beat = FIRST_TEN_MINUTE_ONBOARDING_BEATS[0]!;
    const weekFive = firstTenBeatText(beat, { currentWeek: 5, dynastySeed: 42 });
    expect(firstTenBeatText(beat, { currentWeek: 5, dynastySeed: 42 })).toBe(weekFive);
    expect(weekFive.startsWith(beat.text)).toBe(true);

    const served = new Set(
      Array.from({ length: 12 }, (_, index) =>
        firstTenBeatText(beat, { currentWeek: index + 1, dynastySeed: 42 })),
    );
    // 3-line pool over 12 weeks must rotate at least twice.
    expect(served.size).toBeGreaterThanOrEqual(2);

    const otherSeed = Array.from({ length: 12 }, (_, index) =>
      firstTenBeatText(beat, { currentWeek: index + 1, dynastySeed: 777 }));
    expect(otherSeed.some((text) => !served.has(text) || text !== firstTenBeatText(beat, { currentWeek: 1, dynastySeed: 42 }))).toBe(true);
  });

  it('keeps the combined beat text inside the 240-char bubble budget', () => {
    for (const beat of FIRST_TEN_MINUTE_ONBOARDING_BEATS) {
      for (let week = 1; week <= 18; week += 1) {
        const text = firstTenBeatText(beat, { currentWeek: week, dynastySeed: 42 });
        expect(text.length, `${beat.id} week ${week}`).toBeLessThanOrEqual(240);
      }
    }
  });

  it('never clips the Must Do / Where / Consequence contract', () => {
    for (const beat of FIRST_TEN_MINUTE_ONBOARDING_BEATS) {
      for (let seed = 1; seed <= 7; seed += 1) {
        const text = firstTenBeatText(beat, { currentWeek: seed * 2, dynastySeed: seed });
        expect(text, beat.id).toContain('Where:');
        expect(text, beat.id).toContain('Consequence:');
      }
    }
  });
});
