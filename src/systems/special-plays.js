/**
 * MFD Special Plays & Coverages
 *
 * Trick plays (fake punt, flea flicker, hook & lateral, QB sneak),
 * pass variants (fake FG pass, end around pass, shovel pass),
 * and special defensive coverages (dime, goal line, cover 3, bear).
 */

export var SPECIAL_PLAYS_993 = {
  trickPlays: [
    {
      id: "fake_punt",
      label: "Fake Punt",
      icon: "🎭",
      desc: "Punter takes the snap and runs — catches the coverage unit completely off guard",
      type: "run",
      ydsBase: [-2, 18],
      bigPlay: 0.35,
      fumble: 0.06,
      incPct: 0,
      intPct: 0,
      sackPct: 0,
      isTrick: true,
      shortYdsOk: false,
      noHuddleOk: false,
      commentary: [
        "FAKE PUNT! The punter tucks it and runs!",
        "They kept the offense out there — it's a fake! He's got room!",
        "Fake punt — the coverage unit is caught completely flat-footed!",
        "WHAT A CALL! The punter takes off and the defense has no answer!"
      ]
    },
    {
      id: "flea_flicker",
      label: "Flea Flicker",
      icon: "🪰",
      desc: "RB takes the handoff and tosses it back to the QB for a deep bomb",
      type: "pass",
      ydsBase: [12, 45],
      bigPlay: 0.45,
      fumble: 0.04,
      incPct: 0.40,
      intPct: 0.06,
      sackPct: 0.12,
      isTrick: true,
      shortYdsOk: false,
      noHuddleOk: false,
      commentary: [
        "Flea flicker! RB pitches it back — QB lets it fly!",
        "It's a flea flicker! The secondary bit HARD on that run fake!",
        "FLEA FLICKER! The defense is turned around — wide open downfield!",
        "Handoff, pitch back, LAUNCH! That's the flea flicker at its finest!"
      ]
    },
    {
      id: "hook_lateral",
      label: "Hook & Lateral",
      icon: "🔀",
      desc: "WR catches a short hook then laterals to a trailing teammate at full speed",
      type: "pass",
      ydsBase: [0, 25],
      bigPlay: 0.32,
      fumble: 0.08,
      incPct: 0.30,
      intPct: 0.04,
      sackPct: 0.06,
      isTrick: true,
      shortYdsOk: false,
      noHuddleOk: false,
      commentary: [
        "Hook and lateral! The pitch is clean — he's got blockers!",
        "Short catch — AND HE LATERALS! The trailing man has the ball!",
        "HOOK AND LATERAL! They practiced this one all week!",
        "Catch, pitch, AND HE'S GONE! The hook and lateral breaks the defense wide open!"
      ]
    },
    {
      id: "qb_sneak",
      label: "QB Sneak",
      icon: "🐍",
      desc: "QB dives behind the center — the ultimate short yardage play",
      type: "run",
      ydsBase: [0, 3],
      bigPlay: 0.02,
      fumble: 0.01,
      incPct: 0,
      intPct: 0,
      sackPct: 0,
      isTrick: false,
      shortYdsOk: true,
      noHuddleOk: true,
      commentary: [
        "QB sneak! He pushes forward behind the center!",
        "Quarterback dives over the top — did he get it?",
        "Sneak play! The pile pushes forward — tough, physical football!",
        "QB lowers his shoulder and burrows through the line — pure grit!"
      ]
    }
  ],
  passVariants: [
    {
      id: "fake_fg_pass",
      label: "Fake FG Pass",
      icon: "🏹",
      desc: "Holder stands up and fires to the tight end leaking into the flat",
      type: "pass",
      ydsBase: [8, 22],
      bigPlay: 0.28,
      fumble: 0.02,
      incPct: 0.35,
      intPct: 0.05,
      sackPct: 0.08,
      isTrick: true,
      shortYdsOk: false,
      noHuddleOk: false,
      commentary: [
        "FAKE FIELD GOAL! The holder stands up — he's throwing!",
        "It's a fake! The holder fires to the tight end in the flat!",
        "Nobody picked up the tight end — FAKE FG and he's wide open!",
        "WHAT A PLAY CALL! Fake field goal, holder to TE — first down!"
      ]
    },
    {
      id: "end_around_pass",
      label: "End Around Pass",
      icon: "🌀",
      desc: "WR takes the reverse handoff and throws back across the field",
      type: "pass",
      ydsBase: [-3, 30],
      bigPlay: 0.30,
      fumble: 0.05,
      incPct: 0.38,
      intPct: 0.08,
      sackPct: 0.10,
      isTrick: true,
      shortYdsOk: false,
      noHuddleOk: false,
      commentary: [
        "End around — AND HE THROWS! The receiver is a quarterback tonight!",
        "Reverse handoff — he pulls up and launches it downfield!",
        "It's an end around pass! The defense is scrambling!",
        "WR takes the reverse and FIRES across the field — what a design!"
      ]
    },
    {
      id: "shovel_pass",
      label: "Shovel Pass",
      icon: "🥄",
      desc: "QB flips an underhand shovel to the RB slipping through the line",
      type: "pass",
      ydsBase: [1, 8],
      bigPlay: 0.06,
      fumble: 0.02,
      incPct: 0.10,
      intPct: 0.01,
      sackPct: 0.04,
      isTrick: false,
      shortYdsOk: true,
      noHuddleOk: true,
      commentary: [
        "Shovel pass! Quick flip to the back — he slips through!",
        "Underhand shovel to the running back — picks up the first down!",
        "QB shovels it underneath — the defense was looking downfield!",
        "Quick shovel pass right through the heart of the line — clever call!"
      ]
    }
  ]
};

export var SPECIAL_COVERAGES_993 = [
  {
    id: "dime",
    label: "Dime Package",
    icon: "💎",
    desc: "Six defensive backs blanket every receiver — maximum coverage, vulnerable against the run",
    mods: { short: -2, deep: 5, rush: -8, blitz: 0.08, sackMod: 0.02 }
  },
  {
    id: "goal_line",
    label: "Goal Line Defense",
    icon: "🏰",
    desc: "Extra linemen and linebackers stacked in the box — built to stuff the run at the goal line",
    mods: { short: -5, deep: -8, rush: 12, blitz: 0.15, sackMod: 0.05 }
  },
  {
    id: "cover3_zone",
    label: "Cover 3 Zone",
    icon: "🛡️",
    desc: "Three-deep zone with four underneath — balanced and reliable across the field",
    mods: { short: 1, deep: 2, rush: 1, blitz: 0.10, sackMod: 0.01 }
  },
  {
    id: "bear_defense",
    label: "Bear Defense",
    icon: "🐻",
    desc: "Overloaded front with four DL and three stacked linebackers — collapses the pocket and destroys the run game",
    mods: { short: -1, deep: -6, rush: 10, blitz: 0.22, sackMod: 0.08 }
  }
];
