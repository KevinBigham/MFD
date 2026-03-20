/**
 * MFD Game Features — Small Self-Contained Systems
 *
 * Rivalry trophies, power rankings, cap projections,
 * generational players, owner mode, player comparison,
 * franchise timeline, ceremonies, practice squad,
 * holdouts, and expansion draft.
 */

import { CEREMONY_986 } from './ceremony.js';

export { CEREMONY_986 };

export var RIVALRY_TROPHIES_986 = {
  names: ["The Iron Boot", "Silver Shield", "The Governor's Cup", "Thunder Bowl", "The Patriot's Plate",
    "Crown of the Coast", "The Steel Belt", "Golden Gate Game", "Metro Showdown", "The Lone Star", "Prairie Fire Cup",
    "The Rust Belt", "Pacific Clash", "The Battle Bell", "River City Rivalry", "The Mountain Crown"],
  generate: function (team1, team2, rng2) {
    var idx = Math.floor(rng2() * RIVALRY_TROPHIES_986.names.length);
    return { name: RIVALRY_TROPHIES_986.names[idx], team1: team1.abbr, team2: team2.abbr,
      icon1: team1.icon, icon2: team2.icon, holder: null, history: [] };
  }
};

export var POWER_RANKINGS_986 = {
  generate: function (teams, week) {
    var ranked = teams.map(function (t) {
      var winPct = t.wins + t.losses > 0 ? t.wins / (t.wins + t.losses) : 0.5;
      var ovrAvg = t.roster && t.roster.length > 0 ? t.roster.reduce(function (s, p) { return s + (p.ovr || 60); }, 0) / t.roster.length : 60;
      var streak = t.streak || 0;
      var score = winPct * 60 + ovrAvg * 0.3 + streak * 2 + (t.pf - t.pa) * 0.05;
      return { team: t, score: score, wins: t.wins, losses: t.losses, pf: t.pf || 0, pa: t.pa || 0, streak: streak };
    });
    ranked.sort(function (a, b) { return b.score - a.score; });
    var blurbs = ["Dominant on both sides of the ball.", "Playing their best football right now.",
      "Quietly building momentum.", "Inconsistent but talented.", "Struggling to find an identity.",
      "Injuries taking a toll.", "Better than their record suggests.", "Worse than their record suggests.",
      "The defense carries this team.", "Offense is electric when clicking.", "A dark horse contender.",
      "Rebuilding but ahead of schedule.", "Trending in the wrong direction.", "Could be a sleeper playoff team.",
      "The coaching staff has them well-prepared."];
    return ranked.map(function (r, i) {
      r.rank = i + 1;
      r.blurb = blurbs[Math.min(i, blurbs.length - 1)];
      r.change = 0;
      return r;
    });
  }
};

export var CAP_PROJ_986 = {
  project: function (team, year, getSalaryCapFn) {
    var projections = [];
    for (var y = 0; y < 3; y++) {
      var projYear = year + y;
      var cap = getSalaryCapFn(projYear);
      var committed = 0; var expiring = 0; var expiringNames = [];
      (team.roster || []).forEach(function (p) {
        if (p.contract && p.contract.years > y) { committed += (p.contract.salary || 0); }
        else if (p.contract && p.contract.years === y + 1) { expiring++; expiringNames.push(p.name + " (" + p.pos + ")"); }
      });
      projections.push({ year: projYear, cap: cap, committed: Math.round(committed * 10) / 10,
        space: Math.round((cap - committed - (team.deadCap || 0)) * 10) / 10,
        expiring: expiring, expiringNames: expiringNames.slice(0, 5), deadCap: y === 0 ? (team.deadCap || 0) : 0 });
    }
    return projections;
  }
};

export var GENERATIONAL_986 = {
  shouldSpawn: function (year, rng2) {
    return rng2() < 0.12;
  },
  create: function (rng2) {
    var positions = ["QB", "QB", "RB", "WR", "WR", "DL", "DL", "CB", "LB", "TE"];
    var pos = positions[Math.floor(rng2() * positions.length)];
    var names = ["Marcus Frost", "DeAndre Phoenix", "Khalil Storm", "Jaxon Blaze", "Trevon Knight",
      "Zion Hammer", "Darius Crown", "Malik Thunder", "Caden Apex", "Roman Titan"];
    var name = names[Math.floor(rng2() * names.length)];
    return { name: name, pos: pos, isGenerational: true, ovr: 78 + Math.floor(rng2() * 8), pot: 95 + Math.floor(rng2() * 5),
      devTrait: "superstar", hype: "\u{1F31F} GENERATIONAL TALENT \u2014 Once-in-a-decade prospect",
      scoutGrade: "A+", combine: { forty: pos === "QB" ? 4.5 + rng2() * 0.2 : 4.2 + rng2() * 0.3 } };
  }
};

export var OWNER_MODE_986 = {
  ticketTiers: [{ label: "Budget", price: 50, fanImpact: 3, rev: 0.7 }, { label: "Standard", price: 75, fanImpact: 0, rev: 1.0 },
    { label: "Premium", price: 100, fanImpact: -2, rev: 1.3 }, { label: "Luxury", price: 130, fanImpact: -5, rev: 1.6 }],
  stadiumLevels: [{ level: 1, label: "Basic", cost: 0, revBonus: 0, prestigeBonus: 0 },
    { level: 2, label: "Modern", cost: 50, revBonus: 0.1, prestigeBonus: 5 },
    { level: 3, label: "Elite", cost: 150, revBonus: 0.25, prestigeBonus: 12 }],
  calcRevenue: function (team, wins) {
    var tIdx = (team.ticketTier986 || 1); var tier = OWNER_MODE_986.ticketTiers[tIdx] || OWNER_MODE_986.ticketTiers[1];
    var stadLvl = team.stadiumLevel986 || 1; var stadBonus = OWNER_MODE_986.stadiumLevels.find(function (s) { return s.level === stadLvl; }) || OWNER_MODE_986.stadiumLevels[0];
    var base = wins * 3 + (team.fanbase || 60) * 0.5;
    return Math.round(base * tier.rev * (1 + stadBonus.revBonus) * 10) / 10;
  }
};

export var PLAYER_COMPARE_986 = {
  buildRadar: function (p1, p2) {
    var cats = ["Speed", "Strength", "Skill", "IQ", "Durability"];
    var p1Vals = [], p2Vals = [];
    [p1, p2].forEach(function (p, pi) {
      var r = p.ratings || {}; var vals = Object.values(r);
      var avg = vals.length > 0 ? vals.reduce(function (s, v) { return s + v; }, 0) / vals.length : 50;
      var spd = r.speed || r.acceleration || avg;
      var str = r.strength || r.power || avg;
      var skl = r.catching || r.accuracy || r.passRush || r.coverage || avg;
      var iq = r.awareness || r.playRecognition || avg;
      var dur = r.stamina || r.toughness || avg;
      if (pi === 0) { p1Vals = [spd, str, skl, iq, dur]; } else { p2Vals = [spd, str, skl, iq, dur]; }
    });
    return { categories: cats, p1: p1Vals, p2: p2Vals };
  }
};

export var TIMELINE_986 = {
  addEvent: function (timeline, year, week, type, text, icon) {
    if (!timeline) timeline = [];
    timeline.push({ year: year, week: week || 0, type: type, text: text, icon: icon || "\u{1F4CC}", ts: Date.now() });
    if (timeline.length > 200) timeline = timeline.slice(-200);
    return timeline;
  },
  types: { trade: "\u{1F504}", draft: "\u{1F4CB}", sign: "\u270D\uFE0F", championship: "\u{1F3C6}", fired: "\u{1F525}", record: "\u{1F4CA}", milestone: "\u{1F3AF}", injury: "\u{1F915}", retire: "\u{1F6AA}" }
};

export var PRACTICE_SQUAD_986 = {
  MAX_SIZE: 16,
  canAdd: function (player) { return player && player.age <= 26 && (player.ovr || 0) <= 68; },
  promote: function (team, player) {
    if (!team || !player) return false;
    var idx = (team.practiceSquad986 || []).findIndex(function (p) { return p.id === player.id; });
    if (idx < 0) return false;
    team.practiceSquad986.splice(idx, 1);
    team.roster.push(player);
    return true;
  }
};

export var HOLDOUT_V2_986 = {
  applyPenalty: function (player, weeksHeldOut) {
    if (!player || weeksHeldOut <= 0) return 0;
    var penalty = Math.min(4, Math.floor(weeksHeldOut / 2));
    var def = typeof POS_DEF !== "undefined" ? POS_DEF[player.pos] : null;
    if (def && penalty > 0) {
      def.r.forEach(function (r) { if (player.ratings && player.ratings[r]) player.ratings[r] = Math.max(40, player.ratings[r] - penalty); });
      if (typeof calcOvr !== "undefined") player.ovr = calcOvr(player);
    }
    return penalty;
  },
  types: [
    { id: "give_in", label: "\u{1F4B0} Give In", salaryMult: 1.2, morale: -3 },
    { id: "hold_firm", label: "\u{1F6E1}\uFE0F Hold Firm", salaryMult: 1.0, morale: -1 },
    { id: "restructure", label: "\u{1F91D} Restructure", salaryMult: 1.05, morale: 1 }
  ]
};

export var EXPANSION_DRAFT_986 = {
  MIN_YEAR: 10, PROTECT_LIMIT: 15,
  shouldTrigger: function (yearsPlayed, rng2) { return yearsPlayed >= 10 && rng2() < 0.15; },
  cities: ["San Antonio", "Portland", "Salt Lake", "Sacramento", "Columbus", "Austin", "Memphis", "Richmond", "Oklahoma City", "San Diego"],
  names: ["Rattlers", "Wolves", "Storm", "Knights", "Titans", "Blazers", "Thunder", "Stallions", "Vipers", "Sentinels"],
  icons: ["\u{1F40D}", "\u{1F43A}", "\u26C8\uFE0F", "\u2694\uFE0F", "\u{1F3DB}\uFE0F", "\u{1F525}", "\u26A1", "\u{1F40E}", "\u{1F40D}", "\u{1F6E1}\uFE0F"]
};
