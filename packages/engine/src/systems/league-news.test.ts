import { describe, expect, it } from 'vitest';
import type { NewsItem } from '../types';
import { acceptTradeOffer } from './trade-market';
import {
  generateWeeklyLeagueNews,
  getRecentNews,
  getTeamNews,
  recordNewsItem,
} from './league-news';
import { makeLeagueState } from './test-helpers';

function makeNews(overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    id: overrides.id ?? `news-${overrides.week ?? 1}-${overrides.type ?? 'record'}`,
    year: overrides.year ?? 2026,
    week: overrides.week ?? 1,
    type: overrides.type ?? 'record',
    headline: overrides.headline ?? 'Headline',
    body: overrides.body ?? 'Body',
    teamIds: overrides.teamIds ?? [],
    playerIds: overrides.playerIds ?? [],
    importance: overrides.importance ?? 'minor',
  };
}

describe('league news', () => {
  it('generates between three and eight weekly items', () => {
    const game = makeLeagueState('regular_season', 2);
    game.schedule[0]!.games[0]!.result = {
      id: 'wk1-a',
      homeTeamId: 'afce1',
      awayTeamId: 'afce2',
      homeScore: 31,
      awayScore: 17,
      week: 1,
      year: 2026,
      overtime: false,
      mvpPlayerId: game.teams.afce1.roster[0]!.id,
      stats: {},
      weather: 'clear',
      matchupHighlight: null,
    };
    game.schedule[0]!.games[4]!.result = {
      id: 'wk1-b',
      homeTeamId: 'nfce1',
      awayTeamId: 'nfce2',
      homeScore: 10,
      awayScore: 27,
      week: 1,
      year: 2026,
      overtime: false,
      mvpPlayerId: game.teams.nfce2.roster[0]!.id,
      stats: {},
      weather: 'wind',
      matchupHighlight: null,
    };

    const items = generateWeeklyLeagueNews(game, () => 0.4);

    expect(items.length).toBeGreaterThanOrEqual(3);
    expect(items.length).toBeLessThanOrEqual(8);
  });

  it('records trade news automatically when an offer is accepted', () => {
    const game = makeLeagueState('offseason');
    game.offseasonState = {
      round: 1,
      expiringPlayerIds: [],
      reSignDecisions: {},
      freeAgencyBids: {},
      scoutingState: {},
      scoutingWatchlist: [],
      tradeOffers: [{
        id: 'offer-1',
        fromTeamId: 'afce2',
        toTeamId: 'afce1',
        direction: 'inbound',
        summary: 'Test swap',
        status: 'pending',
        send: [{
          type: 'player',
          teamId: 'afce1',
          playerId: game.teams.afce1.roster[0]!.id,
          pickId: null,
          description: game.teams.afce1.roster[0]!.name,
        }],
        receive: [{
          type: 'player',
          teamId: 'afce2',
          playerId: game.teams.afce2.roster[0]!.id,
          pickId: null,
          description: game.teams.afce2.roster[0]!.name,
        }],
      }],
      draftOrder: [],
      currentDraftPickIndex: 0,
      completedDraftPickIds: [],
    };

    const accepted = acceptTradeOffer(game, 'offer-1');

    expect(accepted.nextState.leagueNews.at(-1)?.type).toBe('trade');
  });

  it('trims the news log to 200 items', () => {
    const game = makeLeagueState('regular_season');
    for (let index = 0; index < 205; index += 1) {
      recordNewsItem(game, makeNews({ id: `news-${index}`, week: index + 1 }));
    }

    expect(game.leagueNews).toHaveLength(200);
    expect(game.leagueNews[0]?.id).toBe('news-5');
  });

  it('filters recent and team-specific news correctly', () => {
    const game = makeLeagueState('regular_season');
    recordNewsItem(game, makeNews({ id: 'older', week: 1, teamIds: ['afce2'] }));
    recordNewsItem(game, makeNews({ id: 'mid', week: 2, teamIds: ['afce1'] }));
    recordNewsItem(game, makeNews({ id: 'newest', week: 3, teamIds: ['afce1', 'afce2'] }));

    expect(getRecentNews(game, 2).map((item) => item.id)).toEqual(['newest', 'mid']);
    expect(getTeamNews(game, 'afce1', 3).map((item) => item.id)).toEqual(['newest', 'mid']);
  });
});
