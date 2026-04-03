import { describe, expect, it } from 'vitest';
import {
  assignTraining,
  calculateTrainingXP,
  processWeeklyTraining,
} from './player-development';
import { makeLeagueState } from './test-helpers';

describe('player development training', () => {
  it('film study adds awareness-oriented xp', () => {
    const game = makeLeagueState('regular_season');
    const player = game.teams.afce1.roster.find((candidate) => candidate.pos === 'QB')!;

    assignTraining(game, 'afce1', player.id, 'film_study');
    processWeeklyTraining(game, 'afce1', () => 0.4);

    expect(game.teams.afce1.trainingAssignments[player.id]?.focusXp.film_study).toBeGreaterThan(0);
  });

  it('position drills grow position-specific xp', () => {
    const game = makeLeagueState('regular_season');
    const player = game.teams.afce1.roster.find((candidate) => candidate.pos === 'WR')!;

    assignTraining(game, 'afce1', player.id, 'position_drills');
    processWeeklyTraining(game, 'afce1', () => 0.5);

    expect(game.teams.afce1.trainingAssignments[player.id]?.focusXp.position_drills).toBeGreaterThan(0);
  });

  it('applies dev trait scaling in the expected order', () => {
    const game = makeLeagueState('regular_season');
    const player = game.teams.afce1.roster.find((candidate) => candidate.pos === 'WR')!;

    player.devTrait = 'normal';
    const normalXp = calculateTrainingXP(player, 'position_drills', 70, player.devTrait);
    player.devTrait = 'star';
    const starXp = calculateTrainingXP(player, 'position_drills', 70, player.devTrait);
    player.devTrait = 'superstar';
    const superstarXp = calculateTrainingXP(player, 'position_drills', 70, player.devTrait);
    player.devTrait = 'x-factor';
    const xFactorXp = calculateTrainingXP(player, 'position_drills', 70, player.devTrait);

    expect(starXp.totalXp).toBeGreaterThan(normalXp.totalXp);
    expect(superstarXp.totalXp).toBeGreaterThan(starXp.totalXp);
    expect(xFactorXp.totalXp).toBeGreaterThan(superstarXp.totalXp);
  });

  it('adds coach quality bonuses', () => {
    const game = makeLeagueState('regular_season');
    const player = game.teams.afce1.roster.find((candidate) => candidate.pos === 'RB')!;

    const poor = calculateTrainingXP(player, 'conditioning', 60, player.devTrait);
    const elite = calculateTrainingXP(player, 'conditioning', 90, player.devTrait);

    expect(elite.totalXp).toBeGreaterThan(poor.totalXp);
  });

  it('rest focus improves morale', () => {
    const game = makeLeagueState('regular_season');
    const player = game.teams.afce1.roster.find((candidate) => candidate.pos === 'QB')!;
    player.morale = 40;

    assignTraining(game, 'afce1', player.id, 'rest');
    processWeeklyTraining(game, 'afce1', () => 0.25);

    expect(player.morale).toBeGreaterThan(40);
  });
});
