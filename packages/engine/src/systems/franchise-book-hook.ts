/**
 * Franchise Book year-boundary hook.
 *
 * Sprint 47 — fires a "A NEW CHAPTER BEGINS" news item whenever the
 * most recent FranchiseBook chapter begins in the current game year.
 * This is purely derivable from existing state (franchiseHistory +
 * dynastyTimeline + userDynastyEras) so no schema bump is required.
 *
 * Call site: `offseason.advanceYear()` or the season wrap flow, after
 * `franchiseHistory.push(yearEntry)` has happened.
 */

import type { GameState } from '../types';
import { buildFranchiseBook } from './dynasty-timeline';
import { recordNewsItem } from './league-news';

export interface FranchiseBookChapterAlert {
  teamId: string;
  chapterNumber: number;
  title: string;
  newsId: string;
}

/**
 * Check every team's Franchise Book for a chapter that just opened this
 * year and fire a news item for each. Idempotent: `recordNewsItem` dedupes
 * by id so double-calls in the same year are safe.
 *
 * Returns the list of alerts that were (or would be) fired, for logging.
 */
export function fireFranchiseBookChapterAlerts(game: GameState): FranchiseBookChapterAlert[] {
  const alerts: FranchiseBookChapterAlert[] = [];
  for (const team of Object.values(game.teams)) {
    const book = buildFranchiseBook(game, team.id);
    if (!book || book.eras.length === 0) continue;

    const latest = book.eras[book.eras.length - 1]!;
    if (latest.startYear !== game.year) continue;
    // Suppress the inaugural "Chapter 1 begins" alert — every team would fire
    // one on the first season-end of a fresh league (32-alert spam). A "new
    // chapter begins" headline implies a prior chapter existed.
    if (latest.chapterNumber === 1) continue;

    const newsId = `franchise-book-chapter-${team.id}-${latest.chapterNumber}-${latest.startYear}`;
    const alreadyFired = (game.leagueNews ?? []).some((item) => item.id === newsId);
    if (alreadyFired) continue;

    const isUser = team.isUser === true;
    const headline = isUser
      ? `A NEW CHAPTER BEGINS — ${latest.title}`
      : `${team.city.toUpperCase()} ENTERS NEW ERA — ${latest.title}`;
    const body = isUser
      ? `Your Franchise Book has added Chapter ${latest.chapterNumber}: ${latest.title}. ` +
        `Visit the book to read how this era will be remembered.`
      : `The ${team.city} ${team.name} have opened a new era. Analysts are already sketching its arc.`;

    recordNewsItem(game, {
      id: newsId,
      year: game.year,
      week: game.week,
      type: 'milestone',
      headline,
      body,
      teamIds: [team.id],
      playerIds: latest.signaturePlayers.slice(0, 3).map((p) => p.playerId),
      importance: isUser ? 'major' : 'minor',
    });

    alerts.push({
      teamId: team.id,
      chapterNumber: latest.chapterNumber,
      title: latest.title,
      newsId,
    });
  }
  return alerts;
}
