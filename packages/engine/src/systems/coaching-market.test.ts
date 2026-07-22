import { describe, expect, it } from 'vitest';
import {
  buildCoachingMarket,
  fireStaffMember,
  hireStaffCandidate,
  promoteCoordinator,
  scoreStaffFit,
  type StaffCandidate,
} from '../index';
import { makeLeagueState } from './test-helpers';

function firstCandidate(game = makeLeagueState('regular_season', 4)): StaffCandidate {
  return buildCoachingMarket(game, 'afce1').candidates.HC[0]!;
}

describe('coaching market', () => {
  it('builds deterministic candidate boards for each role', () => {
    const game = makeLeagueState('regular_season', 4);

    const first = buildCoachingMarket(game, 'afce1');
    const second = buildCoachingMarket(game, 'afce1');

    expect(first.candidates.HC.length).toBeGreaterThanOrEqual(3);
    expect(first.candidates.OC.length).toBeGreaterThanOrEqual(3);
    expect(first.candidates.DC.length).toBeGreaterThanOrEqual(3);
    expect(first.candidates.HC.map((candidate) => candidate.id)).toEqual(second.candidates.HC.map((candidate) => candidate.id));
  });

  it('uses the difficulty staff budget to improve or constrain the candidate pool', () => {
    const rookieGame = makeLeagueState('regular_season', 4);
    const legendGame = makeLeagueState('regular_season', 4);
    rookieGame.difficulty = 'rookie';
    legendGame.difficulty = 'legend';

    const rookie = buildCoachingMarket(rookieGame, 'afce1').candidates.HC;
    const legend = buildCoachingMarket(legendGame, 'afce1').candidates.HC;
    const averageGameplan = (candidates: StaffCandidate[]) => (
      candidates.reduce((sum, candidate) => sum + (candidate.ratings.gameplan ?? 0), 0) / candidates.length
    );

    expect(averageGameplan(rookie)).toBeGreaterThan(averageGameplan(legend));
  });

  it('scores scheme-aligned candidates above poor fits', () => {
    const game = makeLeagueState('regular_season', 4);
    const team = game.teams.afce1!;
    const strongFit = {
      ...firstCandidate(game),
      schemeLean: { offense: 'spread', defense: 'cover_3' },
      archetype: 'offensive_minded',
      ratings: { gameplan: 87, development: 81, motivation: 75, strategy: 83 },
    };
    const poorFit = {
      ...firstCandidate(game),
      id: 'poor-fit',
      schemeLean: { offense: 'power_run', defense: 'man_press' },
      archetype: 'disciplinarian',
      ratings: { gameplan: 78, development: 71, motivation: 69, strategy: 70 },
    };

    expect(scoreStaffFit(team, strongFit)).toBeGreaterThan(scoreStaffFit(team, poorFit));
  });

  it('hires a candidate into team.staff and mirrors legacy coachingStaff', () => {
    const game = makeLeagueState('regular_season', 4);
    const candidate = buildCoachingMarket(game, 'afce1').candidates.OC[0]!;

    hireStaffCandidate(game, 'afce1', candidate, 'OC');

    expect(game.teams.afce1!.staff.oc?.id).toBe(candidate.id);
    expect(game.teams.afce1!.coachingStaff.oc?.id).toBe(candidate.id);
    expect(game.eventLog.at(-1)?.type).toBe('coach_hired');
  });

  it('fires a staff member and records a continuity hit', () => {
    const game = makeLeagueState('regular_season', 4);
    const hired = buildCoachingMarket(game, 'afce1').candidates.DC[0]!;
    hireStaffCandidate(game, 'afce1', hired, 'DC');
    const startingMood = game.teams.afce1!.ownerMood;

    fireStaffMember(game, 'afce1', 'DC');

    expect(game.teams.afce1!.staff.dc).toBeNull();
    expect(game.teams.afce1!.coachingStaff.dc).toBeNull();
    expect(game.teams.afce1!.ownerMood).toBeLessThanOrEqual(startingMood);
    expect(game.eventLog.at(-1)?.type).toBe('coach_fired');
  });

  it('promotes a coordinator to head coach and vacates the old coordinator seat', () => {
    const game = makeLeagueState('regular_season', 4);
    const oc = buildCoachingMarket(game, 'afce1').candidates.OC[0]!;
    hireStaffCandidate(game, 'afce1', oc, 'OC');

    promoteCoordinator(game, 'afce1', 'OC');

    expect(game.teams.afce1!.staff.hc?.id).toBe(oc.id);
    expect(game.teams.afce1!.staff.hc?.role).toBe('HC');
    expect(game.teams.afce1!.staff.oc).toBeNull();
  });

  it('marks hot-seat risk when owner patience and approval are both low', () => {
    const game = makeLeagueState('regular_season', 4);
    game.teams.afce1!.owner.approval = 22;
    game.teams.afce1!.ownerMood = 22;
    game.teams.afce1!.ownerPatience80 = 18;

    const market = buildCoachingMarket(game, 'afce1');

    expect(market.hotSeat).toBe(true);
  });
});
