import { describe, expect, it } from 'vitest';

import {
  DEFAULT_UNLOCKS,
  UNLOCK_DEFS,
  checkUnlocks,
  isTabUnlocked,
} from '../src/systems/unlocks.js';

describe('unlocks.js', () => {
  it('defines five unlock definitions and default lock state', () => {
    expect(UNLOCK_DEFS).toHaveLength(5);
    expect(DEFAULT_UNLOCKS).toEqual({
      frontOffice: false,
      scouting: false,
      warRoom: false,
      ledger: false,
      legacy: false,
    });
  });

  it('godMode unlocks everything immediately', () => {
    const out = checkUnlocks(DEFAULT_UNLOCKS, { year: 2026, week: 1, phase: 'regular' }, [], 1, true);
    expect(out).toEqual({
      frontOffice: true,
      scouting: true,
      warRoom: true,
      ledger: true,
      legacy: true,
    });
  });

  it('keeps everything locked early in season 2026 week 1', () => {
    const teams = [{ id: 1, madePlayoffs: false, titles: 0 }];
    const out = checkUnlocks(DEFAULT_UNLOCKS, { year: 2026, week: 1, phase: 'regular' }, teams, 1, false);
    expect(out).toEqual(DEFAULT_UNLOCKS);
  });

  it('unlocks front office at week 3', () => {
    const teams = [{ id: 1, madePlayoffs: false, titles: 0 }];
    const out = checkUnlocks(DEFAULT_UNLOCKS, { year: 2026, week: 3, phase: 'regular' }, teams, 1, false);
    expect(out.frontOffice).toBe(true);
  });

  it('unlocks scouting after year 2026', () => {
    const teams = [{ id: 1, madePlayoffs: false, titles: 0 }];
    const out = checkUnlocks(DEFAULT_UNLOCKS, { year: 2027, week: 1, phase: 'regular' }, teams, 1, false);
    expect(out.scouting).toBe(true);
  });

  it('unlocks war room from playoffs or madePlayoffs flag', () => {
    const teams1 = [{ id: 1, madePlayoffs: true, titles: 0 }];
    const out1 = checkUnlocks(DEFAULT_UNLOCKS, { year: 2026, week: 12, phase: 'regular' }, teams1, 1, false);
    expect(out1.warRoom).toBe(true);

    const teams2 = [{ id: 1, madePlayoffs: false, titles: 0 }];
    const out2 = checkUnlocks(DEFAULT_UNLOCKS, { year: 2026, week: 18, phase: 'playoffs' }, teams2, 1, false);
    expect(out2.warRoom).toBe(true);
  });

  it('unlocks ledger at year 2029+', () => {
    const teams = [{ id: 1, madePlayoffs: false, titles: 0 }];
    const out = checkUnlocks(DEFAULT_UNLOCKS, { year: 2029, week: 1, phase: 'regular' }, teams, 1, false);
    expect(out.ledger).toBe(true);
  });

  it('unlocks legacy by year threshold or title', () => {
    const byYear = checkUnlocks(DEFAULT_UNLOCKS, { year: 2031, week: 1, phase: 'regular' }, [{ id: 1, titles: 0 }], 1, false);
    expect(byYear.legacy).toBe(true);

    const byTitle = checkUnlocks(DEFAULT_UNLOCKS, { year: 2027, week: 1, phase: 'regular' }, [{ id: 1, titles: 1 }], 1, false);
    expect(byTitle.legacy).toBe(true);
  });

  it('isTabUnlocked keeps core tabs always open', () => {
    expect(isTabUnlocked('home', DEFAULT_UNLOCKS, false)).toBe(true);
    expect(isTabUnlocked('roster', DEFAULT_UNLOCKS, false)).toBe(true);
  });

  it('isTabUnlocked respects unlock gates for gated tabs', () => {
    expect(isTabUnlocked('capLab', DEFAULT_UNLOCKS, false)).toBe(false);
    expect(isTabUnlocked('capLab', { ...DEFAULT_UNLOCKS, frontOffice: true }, false)).toBe(true);
  });

  it('isTabUnlocked returns true for unknown tabs and in godMode', () => {
    expect(isTabUnlocked('futureTab', DEFAULT_UNLOCKS, false)).toBe(true);
    expect(isTabUnlocked('capLab', DEFAULT_UNLOCKS, true)).toBe(true);
  });
});
