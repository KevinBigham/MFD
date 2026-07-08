import { describe, expect, it } from 'vitest';
import {
  applyWeeklyPrepToSim,
  buildOpponentIntel,
  evaluateWeeklyPrep,
  type WeeklyPrepPlan,
} from '../index';
import { makeLeagueState } from './test-helpers';

const STALE_WEEKLY_PREP_REASONING = /\b(?:Weekly script attacks the opponent secondary|Prep leans into a soft front seven|prep board is built|should steady the pocket|full script available|Coverage emphasis matches|Pressure plan targets|Run fits are the weekly defensive priority|run fits?|run-fit jobs|missed fits|gap jobs|Coverage calls are tilted|avoids overcommitting too early|extra install attention|lowers injury exposure|injury risk|sharpened physical execution|Coach D edge|pressure standards|measurable plan edge)\b/i;

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

  it('explains run-defense prep with concrete jobs and consequences', () => {
    const game = makeLeagueState('regular_season', 1);
    for (const player of game.teams.afce2!.roster) {
      if (player.pos === 'RB' || player.pos === 'OL' || player.pos === 'TE') {
        player.ovr = 88;
      }
      if (player.pos === 'QB' || player.pos === 'WR') {
        player.ovr = 60;
      }
    }

    const intel = buildOpponentIntel(game, 'afce1', 'afce2');
    const outcome = evaluateWeeklyPrep(game.teams.afce1!, intel, {
      ...basePlan(),
      defensiveFocus: 'stop_run',
    });
    const copy = `${intel.recommendations.defense.join(' ')} ${outcome.reasoning.join(' ')}`;

    expect(intel.recommendations.defense).toContain('Assign run-defense jobs before kickoff; open running lanes extend drives.');
    expect(outcome.reasoning).toContain('Stop Run gives DL and LB run-defense jobs; open running lanes turn routine runs into long drives.');
    expect(copy).not.toMatch(STALE_WEEKLY_PREP_REASONING);
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
    const copy = outcome.reasoning.join(' ');

    expect(outcome.readiness).toBeGreaterThan(0);
    expect(outcome.effects.teamOvrBonus).toBeGreaterThanOrEqual(0);
    expect(copy).toContain('Attack Secondary assigns QB, WR, and TE reps');
    expect(copy).toContain('missed timing turns this matchup back into stalled drives');
    expect(copy).not.toMatch(STALE_WEEKLY_PREP_REASONING);
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
    const copy = coachD.reasoning.join(' ');
    expect(copy).toContain('Coach D bonus: scouting matches the call sheet');
    expect(copy).toContain('DL, LB, CB, and S assignments before kickoff');
    expect(copy).not.toMatch(STALE_WEEKLY_PREP_REASONING);
  });

  it('explains snap and situation tradeoffs with concrete consequences', () => {
    const game = makeLeagueState('regular_season', 1);
    const intel = buildOpponentIntel(game, 'afce1', 'afce2');

    const protect = evaluateWeeklyPrep(game.teams.afce1!, intel, {
      ...basePlan(),
      snapManagement: 'protect_starters',
      specialSituation: 'red_zone',
    });
    const ride = evaluateWeeklyPrep(game.teams.afce1!, intel, {
      ...basePlan(),
      snapManagement: 'ride_stars',
      specialSituation: 'two_minute',
    });

    expect(protect.reasoning.join(' ')).toContain('Protect Starters lowers fatigue and injury-report chances');
    expect(protect.reasoning.join(' ')).toContain('Red Zone reps turn short fields into points');
    expect(ride.reasoning.join(' ')).toContain('Ride Stars gives top players extra snaps this week');
    expect(ride.reasoning.join(' ')).toContain('Two Minute reps set clock and sideline rules');
    expect(`${protect.reasoning.join(' ')} ${ride.reasoning.join(' ')}`).not.toMatch(STALE_WEEKLY_PREP_REASONING);
  });
});
