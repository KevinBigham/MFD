import { describe, it, expect } from 'vitest';
import { WeeklySummarySchema } from './schema';

/**
 * Schema hardening island 5: GameState.weekSummaries entries are typed
 * against the real WeeklySummary interface (types/sim.ts) instead of
 * z.array(z.any()).
 *
 * The writer set is closed: systems/weekly-summary.ts buildWeeklySummary
 * is the only producer and emits exactly the typed shape. All engine +
 * web readers stay inside the interface. The v34 golden fixture carries a
 * legacy minimal entry (year/week/teamId/headline/result only), so every
 * post-legacy field carries a default — modern entries round-trip
 * byte-equal, legacy entries parse losslessly, and malformed entries are
 * rejected loudly.
 */

const modernSummary = {
  id: 'summary-2029-7-t1',
  year: 2029,
  week: 7,
  phase: 'regular_season',
  teamId: 't1',
  opponentTeamId: 't2',
  opponentName: 'Detroit Iron',
  result: 'win',
  teamScore: 31,
  opponentScore: 24,
  record: '5-2',
  headline: 'Week 7: Chicago Blaze beat Detroit Iron 31-24',
  ownerDelta: 4,
  injuries: [{
    playerId: 'p-9',
    playerName: 'Jay Stone',
    severity: 'questionable',
    gamesOut: 1,
    type: 'ankle',
  }],
  mvpPlayerId: 'p-9',
  notes: ['No major injuries'],
};

describe('WeeklySummarySchema (island 5: typed GameState.weekSummaries)', () => {
  it('round-trips a modern buildWeeklySummary entry without data loss', () => {
    const parsed = WeeklySummarySchema.safeParse(modernSummary);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual(modernSummary);
    }
  });

  it('round-trips a bye/pending week (null opponent and scores)', () => {
    const byeWeek = {
      ...modernSummary,
      opponentTeamId: null,
      opponentName: 'Bye Week',
      result: 'pending',
      teamScore: null,
      opponentScore: null,
      mvpPlayerId: null,
      injuries: [],
    };
    const parsed = WeeklySummarySchema.safeParse(byeWeek);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual(byeWeek);
    }
  });

  it('parses the v34-fixture legacy minimal entry with neutral defaults', () => {
    // Exact shape carried by packages/engine/src/save/fixtures/v34.json.
    const legacyEntry = {
      year: 2026,
      week: 7,
      teamId: 't1',
      headline: 'Golden Save throws for 318 in a rivalry win',
      result: 'win',
    };
    const parsed = WeeklySummarySchema.safeParse(legacyEntry);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual({
        id: '',
        year: 2026,
        week: 7,
        phase: 'regular_season',
        teamId: 't1',
        opponentTeamId: null,
        opponentName: '',
        result: 'win',
        teamScore: null,
        opponentScore: null,
        record: '',
        headline: 'Golden Save throws for 318 in a rivalry win',
        ownerDelta: 0,
        injuries: [],
        mvpPlayerId: null,
        notes: [],
      });
    }
  });

  it('rejects malformed summaries loudly instead of passing them through as any', () => {
    expect(WeeklySummarySchema.safeParse({ id: 'summary-x' }).success).toBe(false);
    expect(WeeklySummarySchema.safeParse({ ...modernSummary, result: 'dominated' }).success).toBe(false);
    expect(WeeklySummarySchema.safeParse({ ...modernSummary, phase: 'wild_card' }).success).toBe(false);
    expect(
      WeeklySummarySchema.safeParse({
        ...modernSummary,
        injuries: [{ ...modernSummary.injuries[0], severity: 'ouch' }],
      }).success,
    ).toBe(false);
  });

  it('strips unknown keys so the typed shape stays authoritative', () => {
    const parsed = WeeklySummarySchema.safeParse({ ...modernSummary, dramaRating: 99 });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect('dramaRating' in parsed.data).toBe(false);
      expect(parsed.data).toEqual(modernSummary);
    }
  });
});
