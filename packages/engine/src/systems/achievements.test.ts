import { describe, expect, it } from 'vitest';
import { createDefaultAchievements, checkAchievements, getAchievementProgress } from './achievements';
import { makeLeagueState, makePlayer } from './test-helpers';

describe('achievements', () => {
  it('unlocks championship achievement on a Super Bowl win', () => {
    const game = makeLeagueState('offseason', 1);
    game.year = 2030;
    game.franchiseHistory.push({
      year: 2029,
      teamId: 'afce1',
      wins: 14,
      losses: 4,
      ties: 0,
      record: '14-4',
      pointDifferential: 120,
      playoffFinish: 'champion',
      majorEvents: ['Won the championship'],
      awardsWon: [],
      recordsBroken: [],
    });
    game.achievements = createDefaultAchievements();

    const unlocked = checkAchievements(game);

    expect(unlocked.map((achievement) => achievement.id)).toContain('dynasty:first_championship');
    expect(game.achievements.find((achievement) => achievement.id === 'dynasty:first_championship')).toMatchObject({
      unlockedYear: 2030,
      unlockedWeek: 1,
    });
  });

  it('requires zero losses for the perfect season achievement', () => {
    const game = makeLeagueState('offseason', 1);
    game.year = 2031;
    game.franchiseHistory.push({
      year: 2030,
      teamId: 'afce1',
      wins: 18,
      losses: 0,
      ties: 0,
      record: '18-0',
      pointDifferential: 200,
      playoffFinish: 'champion',
      majorEvents: ['Perfect season'],
      awardsWon: [],
      recordsBroken: [],
    });
    game.achievements = createDefaultAchievements();

    const unlocked = checkAchievements(game);

    expect(unlocked.map((achievement) => achievement.id)).toContain('dynasty:perfect_season');

    game.franchiseHistory[0]!.losses = 1;
    game.franchiseHistory[0]!.record = '17-1';
    game.achievements = createDefaultAchievements();

    const relocked = checkAchievements(game);
    expect(relocked.map((achievement) => achievement.id)).not.toContain('dynasty:perfect_season');
  });

  it('unlocks Draft Day Genius with three starters from one class', () => {
    const game = makeLeagueState('regular_season', 8);
    game.year = 2030;
    const team = game.teams.afce1!;
    const rookies = [
      makePlayer('rookie-a', team.id, 'WR', 80, true),
      makePlayer('rookie-b', team.id, 'CB', 79, true),
      makePlayer('rookie-c', team.id, 'LB', 78, true),
    ];
    for (const rookie of rookies) {
      rookie.draftYear = 2030;
      rookie.teamId = team.id;
      team.roster.push(rookie);
      game.players[rookie.id] = rookie;
    }
    game.achievements = createDefaultAchievements();

    const unlocked = checkAchievements(game);

    expect(unlocked.map((achievement) => achievement.id)).toContain('draft:draft_day_genius');
  });

  it('returns partial progress for incomplete achievements', () => {
    const game = makeLeagueState('regular_season', 6);
    game.franchiseHistory.push(
      {
        year: 2026,
        teamId: 'afce1',
        wins: 13,
        losses: 5,
        ties: 0,
        record: '13-5',
        pointDifferential: 90,
        playoffFinish: 'champion',
        majorEvents: [],
        awardsWon: [],
        recordsBroken: [],
      },
      {
        year: 2027,
        teamId: 'afce1',
        wins: 12,
        losses: 6,
        ties: 0,
        record: '12-6',
        pointDifferential: 75,
        playoffFinish: 'champion',
        majorEvents: [],
        awardsWon: [],
        recordsBroken: [],
      },
    );
    game.achievements = createDefaultAchievements();

    const progress = getAchievementProgress(game, 'dynasty:three_peat');

    expect(progress).toMatchObject({
      current: 2,
      target: 3,
      label: '2/3 championships',
      hidden: false,
    });
  });

  it('hides progress for hidden achievements until they unlock', () => {
    const game = makeLeagueState('regular_season', 12);
    game.achievements = createDefaultAchievements();

    const progress = getAchievementProgress(game, 'hidden:cinderella_story');

    expect(progress).toMatchObject({
      hidden: true,
      label: '???',
      current: 0,
    });
  });

  it('returns only newly unlocked achievements', () => {
    const game = makeLeagueState('offseason', 1);
    game.year = 2030;
    game.franchiseHistory.push({
      year: 2029,
      teamId: 'afce1',
      wins: 14,
      losses: 4,
      ties: 0,
      record: '14-4',
      pointDifferential: 120,
      playoffFinish: 'champion',
      majorEvents: ['Won the championship'],
      awardsWon: [],
      recordsBroken: [],
    });
    game.achievements = createDefaultAchievements();

    const first = checkAchievements(game);
    const second = checkAchievements(game);

    expect(first.map((achievement) => achievement.id)).toContain('dynasty:first_championship');
    expect(second).toEqual([]);
  });
});
