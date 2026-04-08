import { describe, expect, it } from 'vitest';
import { progressPlayers } from './progression';
import { makeLeagueState } from './test-helpers';
import type { AlumniMentor } from './alumni-mentors';

function setCoachDevelopment(game: ReturnType<typeof makeLeagueState>, teamId: string, development: number) {
  game.teams[teamId].staff.hc = {
    id: `${teamId}-hc`,
    name: `${teamId} Coach`,
    role: 'HC',
    archetype: 'Strategist',
    traits: [],
    ratings: { development, gameplan: 75, motivation: 75 },
    level: 5,
    specialty75: null,
  };
}

function tuneQuarterback(game: ReturnType<typeof makeLeagueState>) {
  const qb = game.teams.afce1.roster.find((player) => player.pos === 'QB')!;
  qb.age = 23;
  qb.ovr = 82;
  qb.devTrait = 'superstar';
  qb.stats.passAtt = 560;
  qb.stats.passComp = 392;
  qb.stats.passYds = 4625;
  qb.stats.passTD = 37;
  qb.stats.passINT = 9;
  return qb;
}

function tuneRunningBack(game: ReturnType<typeof makeLeagueState>) {
  const rb = game.teams.afce1.roster.find((player) => player.pos === 'RB')!;
  rb.age = 24;
  rb.ovr = 78;
  rb.devTrait = 'star';
  rb.stats.rushAtt = 235;
  rb.stats.rushYds = 1125;
  rb.stats.rushTD = 10;
  return rb;
}

function mentor(overrides: Partial<AlumniMentor> = {}): AlumniMentor {
  return {
    playerId: 'mentor-1',
    name: 'Mentor One',
    position: 'QB',
    peakOvr: 95,
    mentorRating: 4,
    specialty: 'technique',
    hiredYear: 2030,
    salary: 0.5,
    ...overrides,
  };
}

describe('mentor progression wiring', () => {
  it('gives a mentored player a larger offseason growth bump', () => {
    const control = makeLeagueState('offseason');
    const mentored = makeLeagueState('offseason');
    const controlQb = tuneQuarterback(control);
    const mentoredQb = tuneQuarterback(mentored);
    tuneRunningBack(control);
    tuneRunningBack(mentored);
    setCoachDevelopment(control, 'afce1', 88);
    setCoachDevelopment(mentored, 'afce1', 88);
    mentored.activeMentors = [mentor({ mentorRating: 5 })];

    progressPlayers(control);
    progressPlayers(mentored);

    expect(mentoredQb.ovr).toBeGreaterThan(controlQb.ovr);
  });

  it('leaves unmentored players unchanged relative to the control run', () => {
    const control = makeLeagueState('offseason');
    const mentored = makeLeagueState('offseason');
    tuneQuarterback(control);
    tuneQuarterback(mentored);
    const controlRb = tuneRunningBack(control);
    const mentoredRb = tuneRunningBack(mentored);
    setCoachDevelopment(control, 'afce1', 88);
    setCoachDevelopment(mentored, 'afce1', 88);
    mentored.activeMentors = [mentor({ mentorRating: 5 })];

    progressPlayers(control);
    progressPlayers(mentored);

    expect(mentoredRb.ovr).toBe(controlRb.ovr);
  });

  it('scales the development bump with mentor rating', () => {
    const low = makeLeagueState('offseason');
    const high = makeLeagueState('offseason');
    const lowQb = tuneQuarterback(low);
    const highQb = tuneQuarterback(high);
    tuneRunningBack(low);
    tuneRunningBack(high);
    setCoachDevelopment(low, 'afce1', 88);
    setCoachDevelopment(high, 'afce1', 88);
    low.activeMentors = [mentor({ mentorRating: 1 })];
    high.activeMentors = [mentor({ mentorRating: 5 })];

    progressPlayers(low);
    progressPlayers(high);

    expect(highQb.ovr).toBeGreaterThan(lowQb.ovr);
  });

  it('stacks multiple mentors on the same player during progression', () => {
    const single = makeLeagueState('offseason');
    const stacked = makeLeagueState('offseason');
    const singleQb = tuneQuarterback(single);
    const stackedQb = tuneQuarterback(stacked);
    tuneRunningBack(single);
    tuneRunningBack(stacked);
    setCoachDevelopment(single, 'afce1', 88);
    setCoachDevelopment(stacked, 'afce1', 88);
    single.activeMentors = [mentor({ playerId: 'mentor-a', mentorRating: 2 })];
    stacked.activeMentors = [
      mentor({ playerId: 'mentor-a', mentorRating: 2 }),
      mentor({ playerId: 'mentor-b', mentorRating: 2 }),
    ];

    progressPlayers(single);
    progressPlayers(stacked);

    expect(stackedQb.ovr).toBeGreaterThan(singleQb.ovr);
  });

  it('does not crash when no active mentors are present', () => {
    const game = makeLeagueState('offseason');
    tuneQuarterback(game);
    tuneRunningBack(game);
    setCoachDevelopment(game, 'afce1', 88);

    expect(() => progressPlayers(game)).not.toThrow();
  });
});
