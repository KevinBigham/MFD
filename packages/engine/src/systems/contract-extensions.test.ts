import { describe, expect, it } from 'vitest';
import { getSalaryCap } from '../config/cap-math';
import { applyRuleChange } from './league-rules';
import { makeLeagueState } from './test-helpers';
import {
  capProjection,
  evaluateExtension,
  generateExtensionOffer,
  postJune1Cut,
} from './contract-extensions';

describe('contract extensions system', () => {
  it('scales extension offers with player quality and age', () => {
    const game = makeLeagueState();
    const team = game.teams.afce1!;
    const star = team.roster.find((entry) => entry.pos === 'QB')!;
    const rolePlayer = team.roster.find((entry) => entry.pos === 'TE')!;
    rolePlayer.age = 30;

    const starOffer = generateExtensionOffer(star, team, game);
    const roleOffer = generateExtensionOffer(rolePlayer, team, game);

    expect(starOffer.newAvgSalary).toBeGreaterThan(roleOffer.newAvgSalary);
  });

  it('rejects clearly below-market offers', () => {
    const game = makeLeagueState();
    const team = game.teams.afce1!;
    const player = team.roster.find((entry) => entry.pos === 'QB')!;
    const offer = generateExtensionOffer(player, team, game);
    offer.newAvgSalary = Math.max(1, offer.newAvgSalary * 0.5);

    const result = evaluateExtension(offer, player, team, game);
    expect(result.playerAccepts).toBe(false);
  });

  it('accepts fair offers for strong players on healthy teams', () => {
    const game = makeLeagueState();
    const team = game.teams.afce1!;
    team.wins = 12;
    const player = team.roster.find((entry) => entry.pos === 'QB')!;
    const offer = generateExtensionOffer(player, team, game);

    const result = evaluateExtension(offer, player, team, game);
    expect(result.playerAccepts).toBe(true);
  });

  it('splits dead cap across years for post-june-1 cuts', () => {
    const game = makeLeagueState();
    const team = game.teams.afce1!;
    const player = team.roster.find((entry) => entry.pos === 'WR')!;

    const result = postJune1Cut(player, team, game.year);

    expect(result.deadCap).toBeGreaterThan(0);
    expect(result.acceleratedCap).toBeLessThanOrEqual(result.deadCap);
  });

  it('builds a three-year cap projection with dead cap and free space', () => {
    const game = makeLeagueState();
    const projection = capProjection(game.teams.afce1!, game.year, 3);

    expect(projection).toHaveLength(3);
    expect(projection.every((entry) => typeof entry.freeSpace === 'number')).toBe(true);
  });

  it('uses active salary cap growth rules in cap projections when game state is supplied', () => {
    const game = makeLeagueState();
    game.leagueRules = applyRuleChange(game.leagueRules, {
      key: 'salary_cap_growth',
      newValue: 0.1,
      source: 'cba',
      proposedBy: 'owners',
      effectiveYear: game.year + 1,
      rationale: 'Raise the cap faster next season.',
    });

    const projection = capProjection(game.teams.afce1!, game.year, 1, game);

    expect(projection[0]?.totalCap).toBe(getSalaryCap(game.year + 1, game));
    expect(projection[0]?.totalCap).toBeGreaterThan(getSalaryCap(game.year + 1));
  });

  it('prorates signing bonus across the added contract years', () => {
    const game = makeLeagueState();
    const team = game.teams.afce1!;
    const player = team.roster.find((entry) => entry.pos === 'CB')!;
    const offer = generateExtensionOffer(player, team, game);

    expect(offer.capHitByYear).toHaveLength(offer.newYears);
    expect(offer.capHitByYear[0]).toBeGreaterThan(0);
  });
});
