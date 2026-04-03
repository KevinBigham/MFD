import { describe, expect, it } from 'vitest';
import {
  calculatePlayoffMomentum,
  generatePlayoffNews,
  getPlayoffMomentumBonus,
} from './playoff-momentum';
import { makeLeagueState } from './test-helpers';

describe('playoff momentum', () => {
  it('high momentum gives an OVR boost', () => {
    expect(getPlayoffMomentumBonus({ teamId: 't1', momentum: 75, narrativeTag: 'hot_streak', winStreak: 5 })).toBe(2);
  });

  it('cinderella tag is assigned to a low seed that wins', () => {
    const game = makeLeagueState('playoffs', 19);
    game.playoffBracket = {
      season: game.year,
      afc: [
        { seed: 7, teamId: 'afce1', conference: 'AFC', division: 'East', divisionWinner: false, wins: 10, losses: 7, ties: 0, pointDifferential: 20 },
      ],
      nfc: [],
      matchups: [],
      championTeamId: null,
    };
    game.teams.afce1.streak = 5;

    const momentum = calculatePlayoffMomentum(game, 'afce1', true);

    expect(momentum.narrativeTag).toBe('cinderella');
  });

  it('defending champ tag is assigned correctly', () => {
    const game = makeLeagueState('playoffs', 19);
    game.franchiseHistory.push({
      year: game.year - 1,
      teamId: 'afce1',
      wins: 13,
      losses: 4,
      ties: 0,
      record: '13-4',
      pointDifferential: 110,
      playoffFinish: 'champion',
      majorEvents: [],
      awardsWon: [],
      recordsBroken: [],
    });

    const momentum = calculatePlayoffMomentum(game, 'afce1', false);

    expect(momentum.narrativeTag).toBe('defending_champ');
  });

  it('momentum above 85 gives +3 OVR', () => {
    expect(getPlayoffMomentumBonus({ teamId: 't1', momentum: 90, narrativeTag: 'dynasty', winStreak: 6 })).toBe(3);
  });

  it('playoff news is generated for each matchup', () => {
    const game = makeLeagueState('playoffs', 19);
    const news = generatePlayoffNews(game, {
      id: 'm1',
      round: 'wild_card',
      conference: 'AFC',
      week: 19,
      homeTeamId: 'afce1',
      awayTeamId: 'afce2',
      winnerTeamId: 'afce2',
      result: null,
    }, {
      winnerTeamId: 'afce2',
      loserTeamId: 'afce1',
      homeScore: 24,
      awayScore: 27,
      narrativeTag: 'underdog',
    });

    expect(news.type).toBe('rivalry');
    expect(news.headline).toMatch(/afce2/i);
  });
});
