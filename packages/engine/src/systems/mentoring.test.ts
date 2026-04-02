import { describe, expect, it } from 'vitest';
import { applyMentoringBonuses, formMentoringPairs } from './mentoring';
import { makeLeagueState } from './test-helpers';

describe('mentoring system', () => {
  it('forms up to three valid mentor pairs and applies offseason bonuses', () => {
    const game = makeLeagueState('offseason');
    const team = game.teams.afce1;

    const mentorQb = team.roster.find((player) => player.pos === 'QB')!;
    mentorQb.age = 31;
    mentorQb.ovr = 86;
    mentorQb.traits = ['captain'];

    const menteeQb = team.roster.find((player) => player.pos === 'QB' && player.id !== mentorQb.id) ?? team.roster[1]!;
    menteeQb.pos = 'QB';
    menteeQb.age = 23;
    menteeQb.ovr = 72;
    menteeQb.devTrait = 'star';
    menteeQb.personality.pressure = 8;

    const pairs = formMentoringPairs(game, 2027);
    const applied = applyMentoringBonuses(game, pairs);

    expect(pairs.some((pair) => pair.mentorId === mentorQb.id && pair.menteeId === menteeQb.id)).toBe(true);
    expect(team.mentoringPairs.length).toBeLessThanOrEqual(3);
    expect(applied.get(menteeQb.id)).toBeGreaterThanOrEqual(3);
  });

  it('skips ineligible mentors and x-factor mentees', () => {
    const game = makeLeagueState('offseason');
    const team = game.teams.afce1;
    const youngMentor = team.roster.find((player) => player.pos === 'WR')!;
    youngMentor.age = 25;
    youngMentor.ovr = 88;

    const xFactorMentee = team.roster.find((player) => player.pos === 'TE')!;
    xFactorMentee.age = 24;
    xFactorMentee.devTrait = 'x-factor';

    const pairs = formMentoringPairs(game, 2027);

    expect(pairs.some((pair) => pair.mentorId === youngMentor.id)).toBe(false);
    expect(pairs.some((pair) => pair.menteeId === xFactorMentee.id)).toBe(false);
  });
});
