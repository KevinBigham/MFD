import { describe, expect, it } from 'vitest';
import type { GameEvent } from '../types';
import {
  backfillEventLogDates,
  readGameEventYear,
  repairAndTrimEventLog,
  trimEventLogForRetention,
  withEventDate,
} from './event-log-retention';

function event(partial: Partial<GameEvent> & Pick<GameEvent, 'id' | 'type'>): GameEvent {
  return {
    timestamp: 2026_000,
    description: partial.id,
    data: {},
    ...partial,
  };
}

describe('event log retention', () => {
  it('prefers data.year over id and overflowing timestamp', () => {
    const row = event({
      id: 'weekly_result-2025-4-0',
      type: 'weekly_result',
      timestamp: 2029_999,
      data: { year: 2024 },
    });

    expect(readGameEventYear(row, 2026)).toBe(2024);
  });

  it('infers known id years without guessing unknown ids', () => {
    expect(readGameEventYear(event({
      id: 'player-retired-player-with-hyphens-2031',
      type: 'player_retired',
      timestamp: 2099_999,
    }), 2035)).toBe(2031);
    expect(readGameEventYear(event({
      id: 'press-postgame-abc-9999',
      type: 'press_conference',
      timestamp: 2024_999,
    }), 2026)).toBe(2024);
  });

  it('adds year and week metadata without dropping existing payload', () => {
    expect(withEventDate({ teamId: 't1' }, 2026, 7)).toEqual({
      teamId: 't1',
      year: 2026,
      week: 7,
    });
  });

  it('backfills eventLog year and week from known id patterns', () => {
    const game = {
      year: 2026,
      eventLog: [event({
        id: 'trade-deadline-resolved-2025-8',
        type: 'trade_deadline_resolved',
        timestamp: 999999,
      })],
    };

    backfillEventLogDates(game);

    expect(game.eventLog[0]?.data).toMatchObject({ year: 2025, week: 8 });
  });

  it('keeps all current-year events even when there are more than disposable limits', () => {
    const game = {
      year: 2026,
      eventLog: Array.from({ length: 240 }, (_, index) => event({
        id: `weekly_result-2026-1-${index}`,
        type: 'weekly_result',
        data: { year: 2026, week: 1 },
      })),
    };

    trimEventLogForRetention(game);

    expect(game.eventLog).toHaveLength(240);
  });

  it('trims old disposable noise while preserving forever and semantic receipts', () => {
    const game = {
      year: 2026,
      eventLog: [
        ...Array.from({ length: 140 }, (_, index) => event({
          id: `weekly_result-2020-1-${index}`,
          type: 'weekly_result',
          data: { year: 2020, week: 1 },
        })),
        event({
          id: 'coach_retirement-2001-1-0',
          type: 'coach_retirement',
          data: { year: 2001, week: 1 },
        }),
        event({
          id: 'trade-deadline-resolved-2002-8',
          type: 'trade_deadline_resolved',
          data: { year: 2002, week: 8 },
        }),
        event({
          id: 'gm-strategy-t1-2003-0',
          type: 'gm_strategy_shift',
          data: { year: 2003 },
        }),
        event({
          id: 'coach-promoted-2004-1-0',
          type: 'coach_promoted',
          data: { year: 2004, week: 1 },
        }),
        event({
          id: 'milestone-2005-1-0',
          type: 'milestone',
          data: { year: 2005, week: 1 },
        }),
        event({
          id: 'player-retired-p1-2006',
          type: 'player_retired',
          data: { year: 2006 },
        }),
      ],
    };

    repairAndTrimEventLog(game);

    expect(game.eventLog.filter((row) => row.type === 'weekly_result')).toHaveLength(100);
    expect(game.eventLog.some((row) => row.type === 'coach_retirement')).toBe(true);
    expect(game.eventLog.some((row) => row.type === 'trade_deadline_resolved')).toBe(true);
    expect(game.eventLog.some((row) => row.type === 'gm_strategy_shift')).toBe(true);
    expect(game.eventLog.some((row) => row.type === 'coach_promoted')).toBe(true);
    expect(game.eventLog.some((row) => row.type === 'milestone')).toBe(true);
    expect(game.eventLog.some((row) => row.type === 'player_retired')).toBe(true);
  });
});
