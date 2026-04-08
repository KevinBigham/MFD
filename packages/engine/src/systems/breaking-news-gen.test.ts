import { describe, expect, it } from 'vitest';
import { generateBreakingNews } from './narrative-director';
import { makeLeagueState } from './test-helpers';
import type { BreakingNewsEvent } from './narrative-director';
import type { GameState } from '../types';

function findNewsItem(news: BreakingNewsEvent[], pattern: RegExp): BreakingNewsEvent | undefined {
  return news.find((item) => pattern.test(item.headline) || pattern.test(item.detail));
}

describe('breaking news generation', () => {
  it('returns an empty array when nothing notable happened', () => {
    const game = makeLeagueState('regular_season', 8);

    expect(generateBreakingNews(game, () => 0)).toEqual([]);
  });

  it('creates a critical item for a coaching firing', () => {
    const game = makeLeagueState('regular_season', 8);
    game.leagueNews.push({
      id: 'coach-fired',
      year: game.year,
      week: game.week,
      type: 'coaching',
      headline: 'AFCE1 parts with Old Coach',
      body: 'The club parts with Old Coach after another collapse.',
      teamIds: ['afce1'],
      playerIds: [],
      importance: 'major',
    });

    const news = generateBreakingNews(game, () => 0);
    const item = findNewsItem(news, /coach|parts with/i);

    expect(item).toMatchObject({ priority: 'critical', source: 'MFSN BREAKING' });
  });

  it('creates a high-priority item for a season-ending star injury', () => {
    const game = makeLeagueState('regular_season', 8);
    const qb = game.teams.afce1.roster.find((player) => player.pos === 'QB')!;
    qb.ovr = 92;
    qb.injury = {
      id: 'season-ending-acl',
      type: 'acl',
      severity: 'ir',
      severityTier: 'season_ending',
      gamesOut: 16,
      gamesRecovered: 0,
      reinjuryRisk: 0.35,
      affectedRatings: ['speed'],
      ratingPenalty: 8,
      onIR: true,
    };

    const news = generateBreakingNews(game, () => 0);
    const item = findNewsItem(news, new RegExp(qb.name, 'i'));

    expect(item).toMatchObject({ priority: 'high', source: 'INJURY REPORT' });
  });

  it('creates a blockbuster trade item for an accepted high-value deal', () => {
    const game = makeLeagueState('regular_season', 8);
    const qb = game.teams.afce1.roster.find((player) => player.pos === 'QB')!;
    qb.age = 24;
    qb.ovr = 92;
    qb.devTrait = 'x-factor';
    qb.contract!.baseSalary = 8;
    game.activeProposals = [{
      id: 'accepted-blockbuster',
      fromTeamId: 'afce1',
      toTeamId: 'afce2',
      offering: [{
        type: 'player',
        teamId: 'afce1',
        playerId: qb.id,
        pickId: null,
        description: qb.name,
      }],
      requesting: [],
      status: 'accepted',
      counterOffer: null,
      aiResponse: 'Done.',
      valueDiff: 0,
    }];

    const news = generateBreakingNews(game, () => 0);
    const item = findNewsItem(news, /trade|deal/i);

    expect(item).toMatchObject({ priority: 'high', source: 'MFSN INSIDER' });
  });

  it('returns multiple items when several notable events happened in one week', () => {
    const game = makeLeagueState('playoffs', 21);
    const qb = game.teams.afce1.roster.find((player) => player.pos === 'QB')!;
    qb.ovr = 91;
    qb.injury = {
      id: 'season-ending-acl',
      type: 'acl',
      severity: 'ir',
      severityTier: 'season_ending',
      gamesOut: 16,
      gamesRecovered: 0,
      reinjuryRisk: 0.35,
      affectedRatings: ['speed'],
      ratingPenalty: 8,
      onIR: true,
    };
    game.leagueNews.push({
      id: 'coach-fired',
      year: game.year,
      week: game.week,
      type: 'coaching',
      headline: 'AFCE1 moves on from Old Coach',
      body: 'AFCE1 moves on from Old Coach after the loss.',
      teamIds: ['afce1'],
      playerIds: [],
      importance: 'major',
    });
    game.playoffBracket = {
      season: game.year,
      afc: [],
      nfc: [],
      championTeamId: null,
      matchups: [{
        id: 'super-bowl-set',
        round: 'super_bowl',
        conference: 'NFL',
        week: 22,
        homeTeamId: 'afce1',
        awayTeamId: 'nfce1',
        winnerTeamId: null,
        result: null,
      }],
    };

    const news = generateBreakingNews(game, () => 0);

    expect(news).toHaveLength(3);
  });

  it('keeps priority mapping stable for coaching fires and star injuries', () => {
    const game = makeLeagueState('regular_season', 8);
    const qb = game.teams.afce1.roster.find((player) => player.pos === 'QB')!;
    qb.ovr = 90;
    qb.injury = {
      id: 'season-ending-acl',
      type: 'acl',
      severity: 'ir',
      severityTier: 'season_ending',
      gamesOut: 16,
      gamesRecovered: 0,
      reinjuryRisk: 0.35,
      affectedRatings: ['speed'],
      ratingPenalty: 8,
      onIR: true,
    };
    game.leagueNews.push({
      id: 'coach-fired',
      year: game.year,
      week: game.week,
      type: 'coaching',
      headline: 'AFCE1 fired Old Coach',
      body: 'The franchise fired Old Coach after a disastrous month.',
      teamIds: ['afce1'],
      playerIds: [],
      importance: 'major',
    });

    const news = generateBreakingNews(game, () => 0);
    const coaching = findNewsItem(news, /coach|fired/i);
    const injury = findNewsItem(news, new RegExp(qb.name, 'i'));

    expect(coaching?.priority).toBe('critical');
    expect(injury?.priority).toBe('high');
  });
});
