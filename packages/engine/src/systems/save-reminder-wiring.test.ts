import { describe, expect, it } from 'vitest';
import { advanceFranchiseWeek } from './franchise-week';
import { makeLeagueState } from './test-helpers';
import type { GameState, PlayoffBracket } from '../types';

type AdvanceWeekWithReminder = ReturnType<typeof advanceFranchiseWeek> & {
  showSaveReminder?: boolean;
};

function makeSeasonFinale(year: number): GameState {
  const game = makeLeagueState('playoffs', 22);
  game.year = year;
  game.playoffBracket = {
    season: year,
    afc: [],
    nfc: [],
    championTeamId: null,
    matchups: [{
      id: `super-bowl-${year}`,
      round: 'super_bowl',
      conference: 'NFL',
      week: 22,
      homeTeamId: 'afce1',
      awayTeamId: 'nfce1',
      winnerTeamId: null,
      result: null,
    }],
  } satisfies PlayoffBracket;
  return game;
}

describe('save reminder wiring', () => {
  it('fires the reminder when the new year hits year five', () => {
    const game = makeSeasonFinale(4);

    const result = advanceFranchiseWeek(game) as AdvanceWeekWithReminder;

    expect(result.showSaveReminder).toBe(true);
  });

  it('does not fire the reminder at year three', () => {
    const game = makeSeasonFinale(2);

    const result = advanceFranchiseWeek(game) as AdvanceWeekWithReminder;

    expect(result.showSaveReminder).toBe(false);
  });

  it('fires the reminder at year ten when there is no portable export', () => {
    const game = makeSeasonFinale(9);

    const result = advanceFranchiseWeek(game) as AdvanceWeekWithReminder;

    expect(result.showSaveReminder).toBe(true);
  });

  it('does not fire when the user made a recent portable export', () => {
    const game = makeSeasonFinale(9);
    (game as GameState & { lastPortableExportYear?: number }).lastPortableExportYear = 8;

    const result = advanceFranchiseWeek(game) as AdvanceWeekWithReminder;

    expect(result.showSaveReminder).toBe(false);
  });

  it('includes the reminder flag in the advance result', () => {
    const game = makeSeasonFinale(4);

    const result = advanceFranchiseWeek(game) as AdvanceWeekWithReminder;

    expect(result).toHaveProperty('showSaveReminder');
    expect(result.showSaveReminder).toBe(true);
  });
});
