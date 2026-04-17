import { describe, expect, it } from 'vitest';
import { fireFranchiseBookChapterAlerts } from './franchise-book-hook';
import { makeLeagueState } from './test-helpers';
import type { FranchiseHistoryEntry } from '../types';

function addHistory(game: ReturnType<typeof makeLeagueState>, teamId: string, entries: Array<{
  year: number;
  wins: number;
  losses: number;
  playoffFinish?: string;
}>): void {
  for (const entry of entries) {
    game.franchiseHistory.push({
      year: entry.year,
      teamId,
      wins: entry.wins,
      losses: entry.losses,
      ties: 0,
      record: `${entry.wins}-${entry.losses}`,
      pointDifferential: 0,
      playoffFinish: entry.playoffFinish ?? 'missed_playoffs',
      majorEvents: [],
      awardsWon: [],
      recordsBroken: [],
    } as FranchiseHistoryEntry);
  }
}

describe('fireFranchiseBookChapterAlerts', () => {
  it('returns no alerts when no franchise history exists', () => {
    const game = makeLeagueState('offseason');
    expect(fireFranchiseBookChapterAlerts(game)).toEqual([]);
  });

  it('fires an alert when the newest chapter opens in the current year', () => {
    const game = makeLeagueState('offseason');
    game.year = 2029;
    // Completed championship era that forces a split, then a new chapter opens in 2029.
    addHistory(game, 'afce1', [
      { year: 2026, wins: 9, losses: 8 },
      { year: 2027, wins: 11, losses: 6 },
      { year: 2028, wins: 14, losses: 3, playoffFinish: 'champion' },
      { year: 2029, wins: 10, losses: 7 },
    ]);

    const alerts = fireFranchiseBookChapterAlerts(game);
    const userAlert = alerts.find((a) => a.teamId === 'afce1');

    expect(userAlert).toBeDefined();
    expect(userAlert?.title).toContain('Chapter');
    const news = game.leagueNews.find((item) => item.id === userAlert?.newsId);
    expect(news).toBeDefined();
    expect(news?.headline.toLowerCase()).toContain('new chapter');
  });

  it('does not fire an alert when the newest chapter started in a prior year', () => {
    const game = makeLeagueState('offseason');
    game.year = 2031;
    addHistory(game, 'afce1', [
      { year: 2026, wins: 9, losses: 8 },
      { year: 2027, wins: 10, losses: 7 },
      { year: 2028, wins: 11, losses: 6 },
    ]);
    // No 2031 history, so the most recent chapter ended in 2028.

    const alerts = fireFranchiseBookChapterAlerts(game);
    expect(alerts.find((a) => a.teamId === 'afce1')).toBeUndefined();
  });

  it('is idempotent — calling twice in the same year only fires once', () => {
    const game = makeLeagueState('offseason');
    game.year = 2029;
    addHistory(game, 'afce1', [
      { year: 2026, wins: 9, losses: 8 },
      { year: 2027, wins: 11, losses: 6 },
      { year: 2028, wins: 14, losses: 3, playoffFinish: 'champion' },
      { year: 2029, wins: 10, losses: 7 },
    ]);

    fireFranchiseBookChapterAlerts(game);
    const firstCount = game.leagueNews.length;
    fireFranchiseBookChapterAlerts(game);
    const secondCount = game.leagueNews.length;

    expect(secondCount).toBe(firstCount);
  });

  it('uses "major" importance for user team and "minor" for AI teams', () => {
    const game = makeLeagueState('offseason');
    game.year = 2029;
    addHistory(game, 'afce1', [
      { year: 2026, wins: 9, losses: 8 },
      { year: 2027, wins: 11, losses: 6 },
      { year: 2028, wins: 14, losses: 3, playoffFinish: 'champion' },
      { year: 2029, wins: 10, losses: 7 },
    ]);
    addHistory(game, 'afcn1', [
      { year: 2026, wins: 9, losses: 8 },
      { year: 2027, wins: 11, losses: 6 },
      { year: 2028, wins: 14, losses: 3, playoffFinish: 'champion' },
      { year: 2029, wins: 10, losses: 7 },
    ]);

    fireFranchiseBookChapterAlerts(game);
    const userNews = game.leagueNews.find((n) => n.teamIds.includes('afce1'));
    const aiNews = game.leagueNews.find((n) => n.teamIds.includes('afcn1'));

    expect(userNews?.importance).toBe('major');
    expect(aiNews?.importance).toBe('minor');
  });
});
