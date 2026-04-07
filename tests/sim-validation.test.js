import { describe, expect, it } from 'vitest';

import { OFF_PLANS, SCHEME_COUNTERS } from '../src/config/schemes.js';
import { PLAYBOOK_986 } from '../src/systems/playbook.js';
import { RNG, setSeed } from '../src/utils/rng.js';

var OFF_PLAN_MAP = OFF_PLANS.reduce(function (acc, plan) {
  acc[plan.id] = plan;
  return acc;
}, {});

var DEF_PLAN_TO_COVERAGES = {
  balanced_d: ['cover_2', 'cover_3', 'tampa_2', 'cover3_zone'],
  blitz_heavy: ['cover_0', 'man_press', 'bear_defense'],
  zone_cov: ['cover_2', 'cover3_zone', 'prevent'],
  man_press: ['man_press', 'cover_0', 'dime'],
  run_stuff: ['goal_line', 'bear_defense', 'spy'],
  prevent: ['prevent', 'cover3_zone', 'cover_2'],
};

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function pickFrom(arr) {
  return arr[Math.floor(RNG.play() * arr.length)];
}

function makeRatings(base, overrides) {
  return Object.assign(
    {
      speed: base,
      acceleration: base,
      elusiveness: base,
      ballCarrierVision: base,
      power: base,
      truckPower: base,
      breakTackle: base,
      awareness: base,
      decisionSpeed: base,
      accuracy: base,
      shortAccuracy: base,
      deepAccuracy: base,
      pocketPresence: base,
      toughness: base,
      separation: base,
      spectacularCatch: base,
      catchInTraffic: base,
      deepRoute: base,
      shortRoute: base,
      runBlock: base,
      passBlock: base,
      anchorStrength: base,
      passBlockFinesse: base,
      blockShedding: base,
      pursuit: base,
      runStop: base,
      tackle: base,
      passRush: base,
      powerMoves: base,
      finesseMoves: base,
      coverage: base,
      breakOnBall: base,
      rangeAbility: base,
      kickPower: base,
      kickAccuracy: base,
    },
    overrides || {}
  );
}

function mkPlayer(name, pos, ovr, ratings, isStarter) {
  return {
    name: name,
    pos: pos,
    ovr: ovr,
    isStarter: isStarter !== false,
    ratings: ratings || makeRatings(ovr),
    injury: { games: 0 },
  };
}

function buildTeam(tag, baseOvr) {
  var qb = mkPlayer(tag + ' QB1', 'QB', baseOvr + 2, makeRatings(baseOvr + 2, {
    accuracy: baseOvr + 4,
    shortAccuracy: baseOvr + 5,
    deepAccuracy: baseOvr + 1,
    pocketPresence: baseOvr + 3,
    awareness: baseOvr + 3,
    decisionSpeed: baseOvr + 2,
  }));
  var rb = mkPlayer(tag + ' RB1', 'RB', baseOvr + 1, makeRatings(baseOvr + 1, {
    speed: baseOvr + 2,
    acceleration: baseOvr + 2,
    elusiveness: baseOvr + 2,
    ballCarrierVision: baseOvr + 3,
    breakTackle: baseOvr + 1,
  }));
  var wr1 = mkPlayer(tag + ' WR1', 'WR', baseOvr + 1, makeRatings(baseOvr + 1, {
    separation: baseOvr + 3,
    speed: baseOvr + 2,
    deepRoute: baseOvr + 2,
    shortRoute: baseOvr + 2,
  }));
  var wr2 = mkPlayer(tag + ' WR2', 'WR', baseOvr - 1, makeRatings(baseOvr - 1, {
    separation: baseOvr,
    speed: baseOvr + 1,
    deepRoute: baseOvr,
    shortRoute: baseOvr + 1,
  }));
  var te = mkPlayer(tag + ' TE1', 'TE', baseOvr - 1, makeRatings(baseOvr - 1, {
    separation: baseOvr,
    catchInTraffic: baseOvr + 1,
    shortRoute: baseOvr + 1,
    deepRoute: baseOvr - 1,
  }));
  var k = mkPlayer(tag + ' K1', 'K', baseOvr - 3, makeRatings(baseOvr - 3, {
    kickPower: baseOvr + 4,
    kickAccuracy: baseOvr + 1,
  }));

  var roster = [qb, rb, wr1, wr2, te, k];
  for (var i = 0; i < 5; i += 1) {
    roster.push(
      mkPlayer(
        tag + ' OL' + (i + 1),
        'OL',
        baseOvr,
        makeRatings(baseOvr, {
          runBlock: baseOvr + 2,
          passBlock: baseOvr + 1,
          anchorStrength: baseOvr + 1,
          passBlockFinesse: baseOvr + 1,
        })
      )
    );
  }
  roster.push(mkPlayer(tag + ' DL1', 'DL', baseOvr, makeRatings(baseOvr, {
    blockShedding: baseOvr + 2,
    pursuit: baseOvr + 1,
    passRush: baseOvr + 2,
    powerMoves: baseOvr + 1,
    finesseMoves: baseOvr + 1,
  })));
  roster.push(mkPlayer(tag + ' LB1', 'LB', baseOvr, makeRatings(baseOvr, {
    runStop: baseOvr + 1,
    tackle: baseOvr + 2,
    coverage: baseOvr - 1,
  })));
  roster.push(mkPlayer(tag + ' CB1', 'CB', baseOvr, makeRatings(baseOvr, {
    coverage: baseOvr + 2,
    breakOnBall: baseOvr + 1,
    speed: baseOvr + 1,
  })));
  roster.push(mkPlayer(tag + ' S1', 'S', baseOvr, makeRatings(baseOvr, {
    coverage: baseOvr + 1,
    rangeAbility: baseOvr + 2,
    tackle: baseOvr,
  })));

  return { tag: tag, roster: roster };
}

function initBox(planId) {
  return {
    planId: planId,
    plays: 0,
    passAttempts: 0,
    completions: 0,
    rushAttempts: 0,
    passYds: 0,
    rushYds: 0,
    totalYds: 0,
    points: 0,
    touchdowns: 0,
    interceptions: 0,
    fumbles: 0,
    turnovers: 0,
    sacksTaken: 0,
    firstDowns: 0,
    clockSamples: [],
  };
}

function pickOffPlay(offPlanId, down, toGo, fieldPos) {
  var plan = OFF_PLAN_MAP[offPlanId] || OFF_PLAN_MAP.balanced_o;
  var runRate = clamp(0.44 + (plan.rb || 0), 0.15, 0.8);
  if (down >= 3 && toGo >= 8) runRate -= 0.2;
  if (down <= 2 && toGo <= 2) runRate += 0.2;
  if (fieldPos >= 90 && toGo <= 2) runRate += 0.15;
  runRate = clamp(runRate, 0.1, 0.9);

  var useRun = RNG.play() < runRate;
  if (useRun) {
    if (toGo <= 1) {
      return PLAYBOOK_986.offense.run.find(function (p) {
        return p.id === 'qb_sneak';
      }) || pickFrom(PLAYBOOK_986.offense.run);
    }
    return pickFrom(PLAYBOOK_986.offense.run);
  }

  var deepRate = clamp(0.27 + (plan.bigPlayMod || 0), 0.08, 0.6);
  if (toGo >= 10) deepRate += 0.2;
  if (fieldPos > 75) deepRate -= 0.12;
  deepRate = clamp(deepRate, 0.05, 0.75);
  if (RNG.play() < deepRate) return pickFrom(PLAYBOOK_986.offense.deepPass);
  return pickFrom(PLAYBOOK_986.offense.shortPass);
}

function pickDefPlay(defPlanId) {
  var ids = DEF_PLAN_TO_COVERAGES[defPlanId] || DEF_PLAN_TO_COVERAGES.balanced_d;
  var id = pickFrom(ids);
  return (
    PLAYBOOK_986.defense.coverage.find(function (c) {
      return c.id === id;
    }) || PLAYBOOK_986.defense.coverage[0]
  );
}

function updateStatsFromPlay(stats, offPlay, result) {
  var yds = Number.isFinite(result.yards) ? result.yards : 0;
  var isRun = result.isRush === true || result.type === 'run';
  var isPassCall = offPlay.type === 'pass';

  stats.plays += 1;
  if (isRun) stats.rushAttempts += 1;
  if (isPassCall) stats.passAttempts += 1;
  if (result.type === 'complete') {
    stats.completions += 1;
    stats.passYds += yds;
  }
  if (isRun) stats.rushYds += yds;
  if (result.type === 'sack') {
    stats.sacksTaken += 1;
    stats.passYds += yds;
  }
  if (result.type === 'interception') {
    stats.interceptions += 1;
    stats.turnovers += 1;
  }
  if (result.type === 'fumble') {
    stats.fumbles += 1;
    stats.turnovers += 1;
  }
  stats.totalYds += yds;
  return yds;
}

function simulateGame(opts) {
  var homeTeam = opts.homeTeam;
  var awayTeam = opts.awayTeam;
  var homeOffPlan = opts.homeOffPlan || 'balanced_o';
  var awayOffPlan = opts.awayOffPlan || 'balanced_o';
  var homeDefPlan = opts.homeDefPlan || 'balanced_d';
  var awayDefPlan = opts.awayDefPlan || 'balanced_d';
  var counterOverride = opts.counterOverride;
  var playCap = opts.playCap || 260;

  var home = initBox(homeOffPlan);
  var away = initBox(awayOffPlan);
  var clockTrace = [];

  var possession = 'home';
  var fieldPos = 25;
  var down = 1;
  var toGo = 10;
  var clockLeft = 3600;
  var plays = 0;

  function flipPos(nextFieldPos) {
    possession = possession === 'home' ? 'away' : 'home';
    fieldPos = clamp(nextFieldPos, 5, 95);
    down = 1;
    toGo = 10;
  }

  while (clockLeft > 0 && plays < playCap) {
    var onHome = possession === 'home';
    var offenseTeam = onHome ? homeTeam : awayTeam;
    var offenseStats = onHome ? home : away;
    var defenseTeam = onHome ? awayTeam : homeTeam;
    var offPlan = onHome ? homeOffPlan : awayOffPlan;
    var defPlan = onHome ? awayDefPlan : homeDefPlan;
    var counter =
      counterOverride !== undefined
        ? counterOverride
        : ((SCHEME_COUNTERS[offPlan] || {})[defPlan] || 0);

    if (down === 4) {
      var shouldGo = toGo <= 2 && fieldPos >= 45;
      if (!shouldGo) {
        if (fieldPos >= 58) {
          var k = offenseTeam.roster.find(function (p) {
            return p.pos === 'K';
          });
          var dist = 117 - fieldPos;
          var kPow = k && k.ratings ? k.ratings.kickPower || 70 : 70;
          var fgPct = clamp(0.9 - Math.max(0, dist - 30) * 0.015 + (kPow - 70) * 0.002, 0.08, 0.99);
          if (RNG.play() < fgPct) offenseStats.points += 3;
          clockLeft = Math.max(0, clockLeft - (5 + Math.floor(RNG.play() * 4)));
          clockTrace.push(clockLeft);
          flipPos(25 + Math.floor(RNG.play() * 12));
          continue;
        }
        clockLeft = Math.max(0, clockLeft - (8 + Math.floor(RNG.play() * 8)));
        clockTrace.push(clockLeft);
        var puntNet = 35 + Math.floor(RNG.play() * 20);
        var landed = clamp(fieldPos + puntNet, 8, 98);
        flipPos(100 - landed);
        continue;
      }
    }

    var offPlay = pickOffPlay(offPlan, down, toGo, fieldPos);
    var defPlay = pickDefPlay(defPlan);
    var result = PLAYBOOK_986.resolvePlay(offPlay, defPlay, offenseTeam, defenseTeam, {
      homeField: onHome ? 1.5 : -1.5,
      halfAdjMod991: counter,
      isClutch: clockLeft < 180,
    });

    plays += 1;
    var rawClock = Number(result.clock);
    var snapClock = clamp(Number.isFinite(rawClock) ? rawClock : 20, 3, 45);
    offenseStats.clockSamples.push(snapClock);
    clockLeft = Math.max(0, clockLeft - snapClock);
    clockTrace.push(clockLeft);

    var gained = updateStatsFromPlay(offenseStats, offPlay, result);
    fieldPos += gained;
    fieldPos = clamp(fieldPos, 1, 105);

    if (fieldPos >= 100) {
      offenseStats.touchdowns += 1;
      offenseStats.points += 7;
      flipPos(25);
      continue;
    }

    if (result.turnover) {
      flipPos(100 - clamp(fieldPos, 1, 99));
      continue;
    }

    if (result.type === 'spike') {
      down = clamp(down + 1, 1, 4);
      continue;
    }

    if (gained >= toGo) {
      offenseStats.firstDowns += 1;
      down = 1;
      toGo = 10;
      continue;
    }

    toGo = clamp(toGo - gained, 1, 35);
    down += 1;
    if (down > 4) flipPos(100 - clamp(fieldPos, 1, 99));
  }

  return {
    home: home,
    away: away,
    clockTrace: clockTrace,
    totalPlays: plays,
  };
}

function aggregateSeason(games) {
  return games.reduce(
    function (acc, game) {
      var box = game.home;
      acc.games += 1;
      acc.pointsFor += box.points;
      acc.pointsAgainst += game.away.points;
      acc.plays += box.plays;
      acc.passAttempts += box.passAttempts;
      acc.completions += box.completions;
      acc.rushAttempts += box.rushAttempts;
      acc.passYds += box.passYds;
      acc.rushYds += box.rushYds;
      acc.totalYds += box.totalYds;
      acc.turnovers += box.turnovers;
      acc.sacksTaken += box.sacksTaken;
      acc.firstDowns += box.firstDowns;
      acc.clockSamples = acc.clockSamples.concat(box.clockSamples);
      if (box.points > game.away.points) acc.wins += 1;
      return acc;
    },
    {
      games: 0,
      wins: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      plays: 0,
      passAttempts: 0,
      completions: 0,
      rushAttempts: 0,
      passYds: 0,
      rushYds: 0,
      totalYds: 0,
      turnovers: 0,
      sacksTaken: 0,
      firstDowns: 0,
      clockSamples: [],
    }
  );
}

function runSeason(seed, teamOvr, oppBaseOvr, offPlan, defPlan) {
  setSeed(seed);
  var games = [];
  for (var wk = 1; wk <= 17; wk += 1) {
    var myTeam = buildTeam('T' + wk, teamOvr);
    var oppOvr = clamp(
      Math.round(oppBaseOvr + (RNG.play() * 10 - 5)),
      50,
      95
    );
    var oppTeam = buildTeam('O' + wk, oppOvr);
    games.push(
      simulateGame({
        homeTeam: myTeam,
        awayTeam: oppTeam,
        homeOffPlan: offPlan || 'balanced_o',
        awayOffPlan: 'balanced_o',
        homeDefPlan: defPlan || 'balanced_d',
        awayDefPlan: 'balanced_d',
      })
    );
  }
  return aggregateSeason(games);
}

describe('sim-validation', function () {
  it('full-season stats stay in sane ranges and avoid NaN propagation', function () {
    var season = runSeason(20260301, 74, 72, 'balanced_o', 'balanced_d');

    expect(season.games).toBe(17);
    Object.keys(season).forEach(function (k) {
      if (typeof season[k] === 'number') expect(Number.isFinite(season[k])).toBe(true);
    });

    expect(season.pointsFor).toBeGreaterThanOrEqual(120);
    expect(season.pointsFor).toBeLessThanOrEqual(950);
    expect(season.pointsAgainst).toBeGreaterThanOrEqual(120);
    expect(season.pointsAgainst).toBeLessThanOrEqual(950);

    expect(season.plays).toBeGreaterThanOrEqual(700);
    expect(season.plays).toBeLessThanOrEqual(2100);

    expect(season.passAttempts).toBeGreaterThanOrEqual(220);
    expect(season.passAttempts).toBeLessThanOrEqual(1100);
    expect(season.completions).toBeLessThanOrEqual(season.passAttempts);

    expect(season.rushAttempts).toBeGreaterThanOrEqual(150);
    expect(season.rushAttempts).toBeLessThanOrEqual(900);

    expect(season.passYds).toBeGreaterThanOrEqual(-800);
    expect(season.passYds).toBeLessThanOrEqual(8000);
    expect(season.rushYds).toBeGreaterThanOrEqual(-400);
    expect(season.rushYds).toBeLessThanOrEqual(5000);
    expect(season.totalYds).toBeGreaterThanOrEqual(-1200);
    expect(season.totalYds).toBeLessThanOrEqual(12000);

    expect(season.turnovers).toBeGreaterThanOrEqual(0);
    expect(season.turnovers).toBeLessThanOrEqual(90);
  });

  it('play distribution shifts between ground_pound and air_raid plans', function () {
    var runHeavy = runSeason(4101, 75, 73, 'ground_pound', 'balanced_d');
    var passHeavy = runSeason(4101, 75, 73, 'air_raid', 'balanced_d');

    var runRateGround = runHeavy.rushAttempts / (runHeavy.rushAttempts + runHeavy.passAttempts);
    var runRateAir = passHeavy.rushAttempts / (passHeavy.rushAttempts + passHeavy.passAttempts);

    expect(runRateGround).toBeGreaterThan(runRateAir);
    expect(runRateGround - runRateAir).toBeGreaterThan(0.1);
    expect(passHeavy.passAttempts).toBeGreaterThan(runHeavy.passAttempts);
  });

  it('positive scheme counter edge increases output versus negative edge', function () {
    setSeed(9001);
    var teamA = buildTeam('A', 76);
    var teamB = buildTeam('B', 76);

    var positive = simulateGame({
      homeTeam: teamA,
      awayTeam: teamB,
      homeOffPlan: 'air_raid',
      awayOffPlan: 'air_raid',
      homeDefPlan: 'balanced_d',
      awayDefPlan: 'balanced_d',
      counterOverride: 6,
    });
    setSeed(9001);
    var negative = simulateGame({
      homeTeam: buildTeam('A2', 76),
      awayTeam: buildTeam('B2', 76),
      homeOffPlan: 'air_raid',
      awayOffPlan: 'air_raid',
      homeDefPlan: 'balanced_d',
      awayDefPlan: 'balanced_d',
      counterOverride: -6,
    });

    expect(SCHEME_COUNTERS.air_raid.run_stuff).toBeGreaterThan(
      SCHEME_COUNTERS.air_raid.prevent
    );
    expect(positive.home.points).toBeGreaterThanOrEqual(negative.home.points);
    expect(positive.home.totalYds).toBeGreaterThanOrEqual(negative.home.totalYds);
  });

  it('higher-rated roster outperforms lower-rated roster over a season', function () {
    var elite = runSeason(7788, 86, 72, 'balanced_o', 'balanced_d');
    var weak = runSeason(7788, 60, 72, 'balanced_o', 'balanced_d');

    expect(elite.wins).toBeGreaterThan(weak.wins);
    expect(elite.pointsFor).toBeGreaterThan(weak.pointsFor);
    expect(elite.totalYds).toBeGreaterThan(weak.totalYds);
    expect(elite.pointsAgainst).toBeLessThanOrEqual(weak.pointsAgainst);
  });

  it('elite team (ovr 99) wins 90%+ of games against weak team (ovr 50)', function () {
    var GAMES = 30;
    var wins = 0;
    setSeed(9999);
    for (var i = 0; i < GAMES; i += 1) {
      var out = simulateGame({
        homeTeam: buildTeam('ELITE', 99),
        awayTeam: buildTeam('WEAK', 50),
        homeOffPlan: 'balanced_o',
        awayOffPlan: 'balanced_o',
        homeDefPlan: 'balanced_d',
        awayDefPlan: 'balanced_d',
      });
      if (out.home.points > out.away.points) wins += 1;
    }
    expect(wins / GAMES).toBeGreaterThanOrEqual(0.90);
  });

  it('game clock monotonically decreases and per-play clock usage stays bounded', function () {
    setSeed(321321);
    var out = simulateGame({
      homeTeam: buildTeam('CLKH', 75),
      awayTeam: buildTeam('CLKA', 75),
      homeOffPlan: 'hurry_up',
      awayOffPlan: 'hurry_up',
      homeDefPlan: 'balanced_d',
      awayDefPlan: 'balanced_d',
    });

    expect(out.clockTrace.length).toBeGreaterThan(30);
    out.clockTrace.forEach(function (t, idx) {
      expect(t).toBeGreaterThanOrEqual(0);
      if (idx > 0) expect(t).toBeLessThanOrEqual(out.clockTrace[idx - 1]);
    });
    out.home.clockSamples.concat(out.away.clockSamples).forEach(function (c) {
      expect(c).toBeGreaterThanOrEqual(3);
      expect(c).toBeLessThanOrEqual(45);
    });
  });

  it('resolvePlay remains finite with malformed/NaN player ratings', function () {
    setSeed(555000);
    var badTeam = {
      roster: [
        mkPlayer('Bad QB', 'QB', 70, makeRatings(70, { accuracy: NaN, awareness: NaN })),
        mkPlayer('Bad RB', 'RB', 70, makeRatings(70, { speed: NaN, ballCarrierVision: NaN })),
        mkPlayer('Bad WR1', 'WR', 70, makeRatings(70, { separation: NaN })),
        mkPlayer('Bad WR2', 'WR', 69, makeRatings(69, { separation: NaN })),
        mkPlayer('Bad TE', 'TE', 68, makeRatings(68, { shortRoute: NaN })),
        mkPlayer('Bad K', 'K', 65, makeRatings(65)),
        mkPlayer('Bad OL1', 'OL', 68, makeRatings(68, { runBlock: NaN, passBlock: NaN })),
        mkPlayer('Bad OL2', 'OL', 68, makeRatings(68, { runBlock: NaN, passBlock: NaN })),
        mkPlayer('Bad OL3', 'OL', 68, makeRatings(68, { runBlock: NaN, passBlock: NaN })),
        mkPlayer('Bad OL4', 'OL', 68, makeRatings(68, { runBlock: NaN, passBlock: NaN })),
        mkPlayer('Bad OL5', 'OL', 68, makeRatings(68, { runBlock: NaN, passBlock: NaN })),
        mkPlayer('Bad DL', 'DL', 70, makeRatings(70, { passRush: NaN, blockShedding: NaN })),
        mkPlayer('Bad LB', 'LB', 70, makeRatings(70, { runStop: NaN })),
        mkPlayer('Bad CB', 'CB', 70, makeRatings(70, { coverage: NaN, breakOnBall: NaN })),
        mkPlayer('Bad S', 'S', 70, makeRatings(70, { coverage: NaN, rangeAbility: NaN })),
      ],
    };

    var goodTeam = buildTeam('GOOD', 72);
    var game = simulateGame({
      homeTeam: badTeam,
      awayTeam: goodTeam,
      homeOffPlan: 'balanced_o',
      awayOffPlan: 'balanced_o',
      homeDefPlan: 'balanced_d',
      awayDefPlan: 'balanced_d',
      playCap: 80,
    });

    expect(Number.isFinite(game.home.points)).toBe(true);
    expect(Number.isFinite(game.home.totalYds)).toBe(true);
    expect(Number.isFinite(game.away.points)).toBe(true);
    expect(Number.isFinite(game.away.totalYds)).toBe(true);
  });
});
