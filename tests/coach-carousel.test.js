import { beforeEach, describe, expect, it } from 'vitest';

import { COACH_CAROUSEL_986 } from '../src/systems/coach-carousel.js';

describe('coach-carousel.js', () => {
  beforeEach(() => {
    COACH_CAROUSEL_986.firedPool = [];
  });

  it('adds fired coach to pool with expected fields', () => {
    const coach = {
      name: 'Coach Prime',
      role: 'HC',
      arch: 'visionary',
      ratings: { development: 88 },
    };

    COACH_CAROUSEL_986.fireCoach(coach, { abbr: 'BUF' }, 2028);

    expect(COACH_CAROUSEL_986.firedPool).toHaveLength(1);
    expect(COACH_CAROUSEL_986.firedPool[0]).toMatchObject({
      name: 'Coach Prime',
      role: 'HC',
      arch: 'visionary',
      firedFrom: 'BUF',
      firedYear: 2028,
      available: true,
    });
  });

  it('defaults firedFrom to ? when team is missing', () => {
    COACH_CAROUSEL_986.fireCoach(
      { name: 'No Team', role: 'OC', arch: 'grinder', ratings: {} },
      null,
      2029
    );

    expect(COACH_CAROUSEL_986.firedPool[0].firedFrom).toBe('?');
  });

  it('does nothing when coach is missing', () => {
    COACH_CAROUSEL_986.fireCoach(null, { abbr: 'NYG' }, 2030);
    expect(COACH_CAROUSEL_986.firedPool).toHaveLength(0);
  });

  it('clones ratings object instead of storing original reference', () => {
    const ratings = { development: 70 };
    COACH_CAROUSEL_986.fireCoach(
      { name: 'Clone Test', role: 'DC', arch: 'professor', ratings },
      { abbr: 'CHI' },
      2031
    );

    ratings.development = 99;
    expect(COACH_CAROUSEL_986.firedPool[0].ratings.development).toBe(70);
  });

  it('caps fired pool size at 20 and keeps most recent entries', () => {
    for (let i = 0; i < 25; i += 1) {
      COACH_CAROUSEL_986.fireCoach(
        {
          name: `Coach ${i}`,
          role: 'HC',
          arch: 'grinder',
          ratings: { development: 60 + i },
        },
        { abbr: 'SEA' },
        2030 + i
      );
    }

    expect(COACH_CAROUSEL_986.firedPool).toHaveLength(20);
    expect(COACH_CAROUSEL_986.firedPool[0].name).toBe('Coach 5');
    expect(COACH_CAROUSEL_986.firedPool[19].name).toBe('Coach 24');
  });
});
