import { describe, expect, it } from 'vitest';
import {
  applyWeeklyPrepToSim,
  buildOpponentIntel,
  evaluateWeeklyPrep,
  type WeeklyPrepPlan,
} from '../index';
import { makeLeagueState } from './test-helpers';

function basePlan(): WeeklyPrepPlan {
  return {
    teamId: 'afce1',
    opponentTeamId: 'afce2',
    year: 2026,
    week: 6,
    offensiveFocus: 'attack_secondary',
    defensiveFocus: 'limit_explosive',
    practiceIntensity: 'normal',
    keyMatchupPlayerId: null,
    snapManagement: 'normal',
    specialSituation: 'third_down',
  };
}

describe('weekly prep', () => {
  it('builds richer opponent intel from the current matchup', () => {
    const game = makeLeagueState('regular_season', 1);

    const intel = buildOpponentIntel(game, 'afce1', 'afce2');

    expect(intel.dangerPlayers.length).toBeGreaterThan(0);
    expect(intel.weakLinks.length).toBeGreaterThan(0);
    expect(intel.recommendations.offense.length).toBeGreaterThan(0);
  });

  it('rewards aligned offensive focus against a weak secondary', () => {
    const game = makeLeagueState('regular_season', 1);
    for (const player of game.teams.afce2!.roster) {
      if (player.pos === 'CB' || player.pos === 'S') {
        player.ovr = 60;
        player.ratings.awareness = 58;
      }
    }

    const intel = buildOpponentIntel(game, 'afce1', 'afce2');
    const outcome = evaluateWeeklyPrep(game.teams.afce1!, intel, basePlan());

    expect(outcome.readiness).toBeGreaterThan(0);
    expect(outcome.effects.teamOvrBonus).toBeGreaterThanOrEqual(0);
    expect(outcome.reasoning.some((line) => line.toLowerCase().includes('secondary'))).toBe(true);
  });

  it('applies bonuses through sim context without mutating stored players', () => {
    const game = makeLeagueState('regular_season', 1);
    const team = game.teams.afce1!;
    const before = team.roster[0]!.ovr;
    const intel = buildOpponentIntel(game, 'afce1', 'afce2');

    const context = applyWeeklyPrepToSim(team, evaluateWeeklyPrep(team, intel, basePlan()));

    expect(team.roster[0]!.ovr).toBe(before);
    expect(context.playerOvrBonuses && Object.keys(context.playerOvrBonuses).length).toBeGreaterThan(0);
  });

  it('changes fatigue and injury profile based on practice intensity', () => {
    const game = makeLeagueState('regular_season', 1);
    const intel = buildOpponentIntel(game, 'afce1', 'afce2');

    const light = evaluateWeeklyPrep(game.teams.afce1!, intel, { ...basePlan(), practiceIntensity: 'light' });
    const pads = evaluateWeeklyPrep(game.teams.afce1!, intel, { ...basePlan(), practiceIntensity: 'full_pads' });

    expect(light.effects.injuryRiskDelta).toBeLessThan(pads.effects.injuryRiskDelta);
    expect(light.effects.fatigueDelta).toBeLessThan(pads.effects.fatigueDelta);
  });

  it('boosts the chosen matchup player when emphasis is set', () => {
    const game = makeLeagueState('regular_season', 1);
    const featured = game.teams.afce1!.roster.find((player) => player.pos === 'QB')!;
    const intel = buildOpponentIntel(game, 'afce1', 'afce2');

    const outcome = evaluateWeeklyPrep(game.teams.afce1!, intel, {
      ...basePlan(),
      keyMatchupPlayerId: featured.id,
      offensiveFocus: 'feed_star',
    });

    expect(outcome.effects.playerBonuses[featured.id]).toBeGreaterThan(0);
  });

  it('adds Coach D game-week edge only when prep aligns with scouting and pressure standards', () => {
    const game = makeLeagueState('regular_season', 1);
    game.frontOffice.agmProfileId = 'coach_d_hardaway';
    for (const player of game.teams.afce2!.roster) {
      if (player.pos === 'CB' || player.pos === 'S') player.ovr = 60;
    }
    const intel = buildOpponentIntel(game, 'afce1', 'afce2');
    const alignedPlan = { ...basePlan(), practiceIntensity: 'full_pads' as const, specialSituation: 'third_down' as const };

    const normal = evaluateWeeklyPrep(game.teams.afce1!, intel, alignedPlan);
    const coachD = evaluateWeeklyPrep(game.teams.afce1!, intel, alignedPlan, game);

    expect(coachD.readiness).toBeGreaterThan(normal.readiness);
    expect(coachD.effects.teamOvrBonus).toBeGreaterThan(normal.effects.teamOvrBonus);
    expect(coachD.reasoning.some((line) => line.includes('Coach D edge'))).toBe(true);
  });
});
