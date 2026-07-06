import { describe, expect, it } from 'vitest';
import { createDefaultAchievements, checkAchievements, getAchievementProgress } from './achievements';
import { applyRuleChange, initLeagueRules } from './league-rules';
import { makeLeagueState, makePlayer } from './test-helpers';
import type { GameState } from '../types';

function addComebackNamedGame(
  game: GameState,
  overrides: {
    id?: string;
    year?: number;
    week?: number;
    homeTeamId?: string;
    awayTeamId?: string;
    winnerTeamId?: string | null;
    teamIds?: string[];
  },
): void {
  const year = overrides.year ?? game.year;
  const week = overrides.week ?? game.week;
  const homeTeamId = overrides.homeTeamId ?? 'afce1';
  const awayTeamId = overrides.awayTeamId ?? 'afce2';
  const winnerTeamId = overrides.winnerTeamId ?? 'afce1';
  const id = overrides.id ?? `named-game-${year}-${week}-${homeTeamId}`;

  game.dynastyTimeline.push({
    id,
    year,
    week,
    type: 'named_game',
    headline: `The Comeback: ${homeTeamId} vs ${awayTeamId}`,
    importance: 'major',
    playerIds: [],
    teamIds: overrides.teamIds ?? [homeTeamId, awayTeamId],
    namedGame: {
      name: 'The Comeback',
      archetype: 'comeback',
      gameId: id,
      year,
      week,
      homeTeamId,
      awayTeamId,
      winnerTeamId,
      homeScore: winnerTeamId === homeTeamId ? 31 : 24,
      awayScore: winnerTeamId === awayTeamId ? 31 : 24,
      reason: 'Won after trailing by 14+ entering the fourth quarter.',
    },
  });
}

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

  it('does not count regular-season finishes toward playoff appearances', () => {
    // Regression: pre-fix the predicate was `playoffFinish !== 'missed'`, which
    // incorrectly counted 'regular_season' and 'missed_playoffs' as playoff
    // berths. Canonical missed-playoff strings are 'missed_playoffs' (resolved)
    // and 'regular_season' (in-progress). Three regular-season finishes should
    // count as zero playoff appearances.
    const game = makeLeagueState('regular_season', 6);
    game.franchiseHistory.push(
      ...([2026, 2027, 2028].map((year) => ({
        year,
        teamId: 'afce1',
        wins: 8,
        losses: 9,
        ties: 0,
        record: '8-9',
        pointDifferential: -10,
        playoffFinish: 'regular_season' as const,
        majorEvents: [],
        awardsWon: [],
        recordsBroken: [],
      }))),
    );
    game.achievements = createDefaultAchievements();

    const progress = getAchievementProgress(game, 'dynasty:playoff_staple');

    expect(progress).toMatchObject({
      current: 0,
      target: 5,
      label: '0/5 playoff berths',
    });
  });

  it('requires an actual playoff appearance for worst-to-first', () => {
    // Regression: pre-fix a 4-12 → 11-7 turnaround unlocked the achievement
    // even when the 11-7 season finished as 'regular_season' (no playoffs),
    // because the predicate was `playoffFinish !== 'missed'` which everything
    // satisfies. After fix, the breakthrough season must reach the postseason.
    const game = makeLeagueState('offseason', 1);
    game.year = 2028;
    game.franchiseHistory.push(
      {
        year: 2026,
        teamId: 'afce1',
        wins: 4,
        losses: 13,
        ties: 0,
        record: '4-13',
        pointDifferential: -120,
        playoffFinish: 'missed_playoffs',
        majorEvents: [],
        awardsWon: [],
        recordsBroken: [],
      },
      {
        year: 2027,
        teamId: 'afce1',
        wins: 11,
        losses: 6,
        ties: 0,
        record: '11-6',
        pointDifferential: 70,
        playoffFinish: 'regular_season',
        majorEvents: [],
        awardsWon: [],
        recordsBroken: [],
      },
    );
    game.achievements = createDefaultAchievements();

    const unlocked = checkAchievements(game);

    expect(unlocked.map((achievement) => achievement.id)).not.toContain('dynasty:worst_to_first');

    // Sanity check: same turnaround with a real playoff finish should unlock.
    game.franchiseHistory[1]!.playoffFinish = 'wild_card';
    game.achievements = createDefaultAchievements();
    const reunlocked = checkAchievements(game);
    expect(reunlocked.map((achievement) => achievement.id)).toContain('dynasty:worst_to_first');
  });

  it('uses active roster and practice-squad rules for the Full House achievement', () => {
    const game = makeLeagueState('regular_season', 4);
    game.leagueRules = applyRuleChange(initLeagueRules(game.year), {
      key: 'roster_limit',
      newValue: 50,
      source: 'commissioner_vote',
      proposedBy: 'commissioner',
      effectiveYear: game.year,
      rationale: 'Trim active roster size.',
    });
    game.leagueRules = applyRuleChange(game.leagueRules, {
      key: 'practice_squad_size',
      newValue: 10,
      source: 'commissioner_vote',
      proposedBy: 'commissioner',
      effectiveYear: game.year,
      rationale: 'Expand developmental slots.',
    });
    const team = game.teams.afce1!;
    team.roster = Array.from({ length: 50 }, (_, index) => makePlayer(`full-roster-${index}`, team.id, 'WR', 65, false));
    for (const player of team.roster) {
      game.players[player.id] = player;
    }
    team.practiceSquad = Array.from({ length: 9 }, (_, index) => ({
      playerId: `ps-${index}`,
      elevationsUsed: 0,
      maxElevations: 3,
    }));
    game.achievements = createDefaultAchievements();

    const partial = getAchievementProgress(game, 'roster:full_house');

    expect(partial).toMatchObject({
      current: 0,
      target: 1,
      label: '50/50 roster // 9/10 PS',
      complete: false,
    });

    team.practiceSquad.push({ playerId: 'ps-9', elevationsUsed: 0, maxElevations: 3 });

    const unlocked = checkAchievements(game);

    expect(unlocked.map((achievement) => achievement.id)).toContain('roster:full_house');
  });

  it('uses legacy Full House limits when league rules are absent', () => {
    const game = makeLeagueState('regular_season', 4);
    const team = game.teams.afce1!;
    team.roster = Array.from({ length: 52 }, (_, index) => makePlayer(`legacy-roster-${index}`, team.id, 'WR', 65, false));
    team.practiceSquad = Array.from({ length: 15 }, (_, index) => ({
      playerId: `legacy-ps-${index}`,
      elevationsUsed: 0,
      maxElevations: 3,
    }));
    game.leagueRules = null as never;
    game.achievements = createDefaultAchievements();

    const progress = getAchievementProgress(game, 'roster:full_house');

    expect(progress).toMatchObject({
      current: 0,
      target: 1,
      label: '52/53 roster // 15/16 PS',
      complete: false,
    });
  });

  it('unlocks Comeback Kings from three playoff comeback named games in one run', () => {
    const game = makeLeagueState('playoffs', 21);
    game.achievements = createDefaultAchievements();
    addComebackNamedGame(game, { id: 'comeback-1', week: 19 });
    addComebackNamedGame(game, { id: 'comeback-2', week: 20 });
    addComebackNamedGame(game, { id: 'comeback-3', week: 21 });

    const unlocked = checkAchievements(game);
    const progress = getAchievementProgress(game, 'hidden:comeback_kings');

    expect(unlocked.map((achievement) => achievement.id)).toContain('hidden:comeback_kings');
    expect(progress).toMatchObject({
      current: 3,
      target: 3,
      label: '3/3 playoff comebacks in one run',
      hidden: false,
      complete: true,
    });
  });

  it('does not count regular-season comeback named games for Comeback Kings', () => {
    const game = makeLeagueState('regular_season', 17);
    game.achievements = createDefaultAchievements();
    addComebackNamedGame(game, { id: 'regular-comeback-1', week: 15 });
    addComebackNamedGame(game, { id: 'regular-comeback-2', week: 16 });
    addComebackNamedGame(game, { id: 'regular-comeback-3', week: 17 });

    const unlocked = checkAchievements(game);

    expect(unlocked.map((achievement) => achievement.id)).not.toContain('hidden:comeback_kings');
  });

  it('requires Comeback Kings comebacks to belong to the user team and same playoff run', () => {
    const game = makeLeagueState('playoffs', 20);
    game.year = 2030;
    game.achievements = createDefaultAchievements();
    addComebackNamedGame(game, { id: 'run-a-1', year: 2030, week: 19 });
    addComebackNamedGame(game, { id: 'run-a-2', year: 2030, week: 20 });
    addComebackNamedGame(game, {
      id: 'other-winner',
      year: 2030,
      week: 21,
      homeTeamId: 'afce2',
      awayTeamId: 'afce1',
      winnerTeamId: 'afce2',
    });
    addComebackNamedGame(game, { id: 'run-b-1', year: 2031, week: 19 });

    const unlocked = checkAchievements(game);

    expect(unlocked.map((achievement) => achievement.id)).not.toContain('hidden:comeback_kings');
  });

  it('uses active schedule length when identifying playoff comeback named games', () => {
    const game = makeLeagueState('playoffs', 22);
    game.leagueRules = applyRuleChange(initLeagueRules(game.year), {
      key: 'schedule_weeks',
      newValue: 19,
      source: 'commissioner_vote',
      proposedBy: 'commissioner',
      effectiveYear: game.year,
      rationale: 'Extend the regular season.',
    });
    game.schedule = Array.from({ length: 19 }, (_, index) => ({ week: index + 1, games: [] }));
    game.achievements = createDefaultAchievements();
    addComebackNamedGame(game, { id: 'week-19-regular', week: 19 });
    addComebackNamedGame(game, { id: 'week-20-playoff', week: 20 });
    addComebackNamedGame(game, { id: 'week-21-playoff', week: 21 });

    const short = checkAchievements(game);
    expect(short.map((achievement) => achievement.id)).not.toContain('hidden:comeback_kings');

    addComebackNamedGame(game, { id: 'week-22-playoff', week: 22 });

    const unlocked = checkAchievements(game);
    expect(unlocked.map((achievement) => achievement.id)).toContain('hidden:comeback_kings');
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
