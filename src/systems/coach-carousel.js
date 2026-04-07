/**
 * MFD Coaching Carousel (v98.6)
 *
 * Manages the pool of fired coaches available for rehire.
 * Max pool size: 20.
 */

export var COACH_CAROUSEL_986 = {
  firedPool: [],
  fireCoach: function (coach, team, year) {
    if (!coach) return;
    COACH_CAROUSEL_986.firedPool.push({
      name: coach.name,
      role: coach.role,
      arch: coach.arch,
      ratings: Object.assign({}, coach.ratings),
      firedFrom: team ? team.abbr : '?',
      firedYear: year,
      available: true,
    });
    if (COACH_CAROUSEL_986.firedPool.length > 20)
      COACH_CAROUSEL_986.firedPool =
        COACH_CAROUSEL_986.firedPool.slice(-20);
  },
};
