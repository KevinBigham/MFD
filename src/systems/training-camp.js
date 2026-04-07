/**
 * MFD Training Camp System (v98.6)
 *
 * Allocate offseason focus areas. Players gain or regress
 * based on work ethic, coach development rating, and position match.
 */

var trainingCampRuntime = {
  getPosDef: function () {
    if (typeof globalThis === 'undefined') return null;
    return globalThis.POS_DEF || null;
  },
  calcOvr: function (player) {
    if (typeof globalThis === 'undefined') return player ? player.ovr : 0;
    return typeof globalThis.calcOvr === 'function'
      ? globalThis.calcOvr(player)
      : player
        ? player.ovr
        : 0;
  },
};

export function configureTrainingCampRuntime(nextRuntime) {
  trainingCampRuntime = Object.assign({}, trainingCampRuntime, nextRuntime || {});
}

export var TRAINING_CAMP_986 = {
  focuses: ['offense', 'defense', 'conditioning', 'development', 'chemistry'],
  run: function (team, focus, rng2) {
    var results = [];
    team.roster.forEach(function (p) {
      if (!p || !p.pos) return;
      var we = (p.personality ? p.personality.workEthic : 5) || 5;
      var coachDev = team.staff
        ? ((team.staff.hc ? team.staff.hc.ratings.development : 50) +
            (focus === 'offense' && team.staff.oc
              ? team.staff.oc.ratings.development
              : focus === 'defense' && team.staff.dc
                ? team.staff.dc.ratings.development
                : 50)) /
          2
        : 50;
      var baseGain = Math.round(
        (we - 5) * 0.3 + (coachDev - 50) * 0.02 + (rng2() * 2 - 0.5)
      );
      var posMatch =
        (focus === 'offense' &&
          ['QB', 'RB', 'WR', 'TE', 'OL'].indexOf(p.pos) >= 0) ||
        (focus === 'defense' &&
          ['DL', 'LB', 'CB', 'S'].indexOf(p.pos) >= 0);
      if (posMatch) baseGain += 1;
      if (focus === 'development' && p.age <= 25) baseGain += 1;
      if (focus === 'conditioning') {
        p.morale = Math.min(99, (p.morale || 70) + 3);
        baseGain = 0;
      }
      if (focus === 'chemistry') {
        p.chemistry = Math.min(100, (p.chemistry || 60) + 5);
        baseGain = 0;
      }
      if (we <= 3 && rng2() < 0.3) baseGain = Math.min(baseGain, -1);
      baseGain = Math.max(-2, Math.min(3, baseGain));
      if (baseGain !== 0) {
        var posDef = trainingCampRuntime.getPosDef
          ? trainingCampRuntime.getPosDef()
          : null;
        var def = posDef ? posDef[p.pos] : null;
        if (def) {
          def.r.forEach(function (r) {
            p.ratings[r] = Math.max(
              35,
              Math.min(99, (p.ratings[r] || 50) + baseGain)
            );
          });
        }
        p.ovr = trainingCampRuntime.calcOvr
          ? trainingCampRuntime.calcOvr(p)
          : p.ovr;
      }
      if (baseGain >= 2)
        results.push({ name: p.name, pos: p.pos, change: baseGain, type: 'star' });
      else if (baseGain <= -1)
        results.push({ name: p.name, pos: p.pos, change: baseGain, type: 'decline' });
    });
    return results;
  },
};
