/**
 * MFD Halftime Adjustments v2
 *
 * Tactical choices that shift Q3-Q4 simulation modifiers.
 * Six options with offense/defense/rush/sack/interception mods.
 */

export var HALFTIME_V2 = {
  options: [
    {
      id: 'blitz_heavy',
      label: '\u{1F525} Blitz Heavy',
      desc: 'Increase sack chance, risk deep passes',
      offMod: -2,
      defMod: 6,
      sackMod: 1.4,
      intRisk: 1.2,
    },
    {
      id: 'run_heavy',
      label: '\u{1F3C3} Run Heavy',
      desc: 'Control clock, reduce turnovers',
      offMod: 1,
      defMod: 0,
      rushMod: 1.3,
      intRisk: 0.6,
    },
    {
      id: 'target_wr2',
      label: '\u{1F3AF} Target WR2/TE',
      desc: 'Exploit mismatches underneath',
      offMod: 3,
      defMod: 0,
      recMod: 1.2,
      intRisk: 0.9,
    },
    {
      id: 'prevent',
      label: '\u{1F6E1}\uFE0F Prevent Defense',
      desc: 'Protect lead, bend don\'t break',
      offMod: 0,
      defMod: -3,
      sackMod: 0.5,
      intRisk: 0.7,
    },
    {
      id: 'no_huddle',
      label: '\u26A1 No-Huddle Tempo',
      desc: 'Speed up pace, tire defense',
      offMod: 5,
      defMod: -2,
      rushMod: 0.8,
      intRisk: 1.3,
    },
    {
      id: 'ball_control',
      label: '\u23F1\uFE0F Ball Control',
      desc: 'Long drives, shorten game',
      offMod: -1,
      defMod: 2,
      rushMod: 1.2,
      intRisk: 0.5,
    },
  ],
  recommend: function (scoreDiff, myOff, myDef) {
    if (scoreDiff <= -14) return 'no_huddle';
    if (scoreDiff <= -7) return 'target_wr2';
    if (scoreDiff >= 14) return 'ball_control';
    if (scoreDiff >= 7) return 'prevent';
    if (myDef > myOff + 5) return 'blitz_heavy';
    return 'run_heavy';
  },
};
