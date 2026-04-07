/**
 * MFD Compensatory Draft Picks (v98.6)
 *
 * Calculates automatic comp picks for free agents lost vs gained.
 * Up to 4 comp picks per year, rounds 3-6 based on OVR.
 */

export var COMP_PICKS_986 = {
  calculate: function (lostFAs, gainedFAs) {
    var picks = [];
    var netLoss = [];
    lostFAs.forEach(function (p) {
      var matched = gainedFAs.find(function (g) {
        return g.ovr >= p.ovr - 3;
      });
      if (!matched && p.ovr >= 68) netLoss.push(p);
    });
    netLoss.sort(function (a, b) {
      return b.ovr - a.ovr;
    });
    netLoss.slice(0, 4).forEach(function (p, i) {
      var round = p.ovr >= 80 ? 3 : p.ovr >= 75 ? 4 : p.ovr >= 70 ? 5 : 6;
      picks.push({
        round: round + i,
        reason: p.name + ' (' + p.pos + ' ' + p.ovr + ') departed',
        ovr: p.ovr,
      });
    });
    return picks;
  },
};
