import { MIN_SALARY, getSalaryCap } from '../config/cap-math.js';
import { v36_capHit } from './contract-helpers.js';
import { cl } from '../utils/helpers.js';

var POS_PEAK = {
  QB: 28,
  RB: 24,
  WR: 26,
  TE: 26,
  OL: 28,
  DL: 26,
  LB: 26,
  CB: 25,
  S: 26,
  K: 30,
  P: 30,
};

var DECLINE_RATE = {
  QB: 0.012,
  RB: 0.03,
  WR: 0.018,
  TE: 0.02,
  OL: 0.01,
  DL: 0.02,
  LB: 0.02,
  CB: 0.025,
  S: 0.02,
  K: 0.008,
  P: 0.008,
};

function scheduleIds(game) {
  var homeId = game ? (game.home !== undefined ? game.home : game.homeId) : null;
  var awayId = game ? (game.away !== undefined ? game.away : game.awayId) : null;
  return { homeId: homeId, awayId: awayId };
}

function difficultyLabel(diff) {
  if (diff > 8) return 'Easy';
  if (diff > 2) return 'Favorable';
  if (diff > -2) return 'Toss-Up';
  if (diff > -8) return 'Tough';
  return 'Brutal';
}

export var ADVANCED_ANALYTICS = {
  calcEPA: function (player) {
    if (!player || !player.stats) return 0;
    var stats = player.stats;
    var pos = player.pos;
    if (pos === 'QB') {
      return Math.round(
        ((stats.passYds || 0) * 0.04 +
          (stats.passTD || 0) * 4 -
          (stats.int || 0) * 3 +
          (stats.rushYds || 0) * 0.08) *
          10
      ) / 10;
    }
    if (pos === 'RB') {
      return Math.round(
        ((stats.rushYds || 0) * 0.08 +
          (stats.rushTD || 0) * 5 -
          (stats.fumbles || 0) * 3 +
          (stats.recYds || 0) * 0.06) *
          10
      ) / 10;
    }
    if (pos === 'WR' || pos === 'TE') {
      return Math.round(
        ((stats.recYds || 0) * 0.07 +
          (stats.recTD || 0) * 5 +
          (stats.rec || 0) * 0.5) *
          10
      ) / 10;
    }
    if (pos === 'DL' || pos === 'LB') {
      return Math.round(
        ((stats.sacks || 0) * 5 +
          (stats.tackles || 0) * 0.5 +
          (stats.defINT || 0) * 6 -
          (stats.missedTkl || 0) * 2) *
          10
      ) / 10;
    }
    if (pos === 'CB' || pos === 'S') {
      return Math.round(
        ((stats.defINT || 0) * 7 +
          (stats.tackles || 0) * 0.4 +
          (stats.passDefl || 0) * 2) *
          10
      ) / 10;
    }
    if (pos === 'K') {
      return Math.round(
        ((stats.fgM || 0) * 3 -
          ((stats.fgA || 0) - (stats.fgM || 0)) * 2 +
          (stats.xpM || 0) * 0.5) *
          10
      ) / 10;
    }
    return 0;
  },
  calcDVOA: function (team) {
    if (!team) return { off: 0, def: 0, total: 0 };
    var gp = Math.max(1, (team.wins || 0) + (team.losses || 0));
    var ppg = (team.pf || 0) / gp;
    var oppPpg = (team.pa || 0) / gp;
    var offEff = Math.round((ppg - 21) * 3.5);
    var defEff = Math.round((21 - oppPpg) * 3.5);
    return {
      off: cl(offEff, -50, 50),
      def: cl(defEff, -50, 50),
      total: cl(offEff + defEff, -80, 80),
    };
  },
  calcTargetShare: function (player, teammates) {
    if (!player || !player.stats) return 0;
    var myTargets = player.stats.targets || player.stats.rec || 0;
    var totalTargets = 0;
    (teammates || []).forEach(function (teammate) {
      if (
        teammate &&
        (teammate.pos === 'WR' ||
          teammate.pos === 'TE' ||
          teammate.pos === 'RB')
      ) {
        totalTargets += teammate.stats
          ? teammate.stats.targets || teammate.stats.rec || 0
          : 0;
      }
    });
    if (totalTargets === 0) return 0;
    return Math.round((myTargets / totalTargets) * 1000) / 10;
  },
  estimateMarketSalary: function (player) {
    if (!player) return MIN_SALARY;
    return Math.max(MIN_SALARY, ((player.ovr || 50) - 55) * 0.6);
  },
  calcValueGap: function (player) {
    if (!player) return 0;
    var salary = player.contract ? player.contract.salary : MIN_SALARY;
    var expected = ADVANCED_ANALYTICS.estimateMarketSalary(player);
    return Math.round((expected - salary) * 10) / 10;
  },
  findInefficiencies: function (fas) {
    if (!fas || fas.length === 0) return [];
    var gems = [];
    fas.forEach(function (player) {
      var salary = player.contract ? player.contract.salary : MIN_SALARY;
      var expected = ADVANCED_ANALYTICS.estimateMarketSalary(player);
      var valueGap = Math.round((expected - salary) * 10) / 10;
      if ((player.ovr || 50) >= 72 && salary < expected * 0.7) {
        gems.push({
          player: player,
          value: valueGap,
          expectedSalary: Math.round(expected * 10) / 10,
          currentSalary: salary,
          label:
            'Value +' +
            valueGap.toFixed(1) +
            'M: ' +
            player.name +
            ' (' +
            player.pos +
            ' ' +
            player.ovr +
            ' OVR)',
        });
      }
    });
    gems.sort(function (a, b) {
      return b.value - a.value;
    });
    return gems.slice(0, 5);
  },
  projectOVR: function (player, targetAge) {
    if (!player) return 40;
    var peak = POS_PEAK[player.pos] || 27;
    var rate = DECLINE_RATE[player.pos] || 0.018;
    if (targetAge <= peak) {
      var yearsToGrow = targetAge - (player.age || peak);
      if (yearsToGrow <= 0) return player.ovr || 40;
      return Math.min(99, Math.round((player.ovr || 40) * (1 + yearsToGrow * 0.012)));
    }
    var yearsPast = targetAge - peak;
    return Math.max(40, Math.round((player.ovr || 40) * Math.exp(-rate * yearsPast)));
  },
  calcTeamStrength: function (team, matchupOVR) {
    if (!team) return 70;
    if (typeof matchupOVR === 'function') {
      var matchup = matchupOVR(team, team) || {};
      return (
        ((matchup.offStrength || 70) + (matchup.defStrength || 70)) /
        2
      );
    }
    var sample = (team.roster || [])
      .slice()
      .sort(function (a, b) {
        return (b.ovr || 0) - (a.ovr || 0);
      })
      .slice(0, 12);
    if (sample.length === 0) return 70;
    var total = sample.reduce(function (sum, player) {
      return sum + (player ? player.ovr || 0 : 0);
    }, 0);
    return Math.round(total / sample.length);
  },
  winProb: function (scoreDiff, quarter) {
    var q = Math.min(4, Math.max(1, quarter || 4));
    var leverage = 1 + (q - 1) * 0.6;
    var prob = 1 / (1 + Math.exp(-scoreDiff * 0.15 * leverage));
    return Math.round(prob * 1000) / 10;
  },
};

function calcPlayoffOdds(team, teams, remainingSched, matchupOVR) {
  if (!team) return { available: false, projWins: 0, playoffPct: null };
  var teamId = team.id;
  var teamStrength = ADVANCED_ANALYTICS.calcTeamStrength(team, matchupOVR);
  var expWins = team.wins || 0;
  (remainingSched || []).forEach(function (game) {
    var ids = scheduleIds(game);
    if (ids.homeId === null || ids.awayId === null) return;
    var oppId = ids.homeId === teamId ? ids.awayId : ids.homeId;
    var opp = (teams || []).find(function (candidate) {
      return candidate.id === oppId;
    });
    if (!opp) return;
    var oppStrength = ADVANCED_ANALYTICS.calcTeamStrength(opp, matchupOVR);
    var diff = (teamStrength - oppStrength) / 100;
    var homeAdv = ids.homeId === teamId ? 0.04 : -0.04;
    expWins += Math.max(0.15, Math.min(0.85, 0.5 + diff + homeAdv));
  });
  var gp = (team.wins || 0) + (team.losses || 0);
  var totalGames = gp + (remainingSched || []).length;
  var playoffPct =
    totalGames > 0
      ? Math.min(
          99,
          Math.max(1, Math.round((expWins / Math.max(1, totalGames)) * 100 + 10))
        )
      : 50;
  return {
    available: true,
    projWins: Math.round(expWins * 10) / 10,
    playoffPct: playoffPct,
  };
}

function buildFrontOfficeReport(team, season, snapshot) {
  var dvoa = snapshot.dvoa || { off: 0, def: 0 };
  var capHealth = snapshot.capHealth || { space: 0 };
  var agingRisk = snapshot.agingRisk || { count: 0 };
  var playoffOdds = snapshot.playoffOdds || { available: false, playoffPct: null };
  var injuryLoad = (team && team.roster
    ? team.roster.filter(function (player) {
        return player && player.injury && player.injury.games > 0;
      }).length
    : 0);
  var report = [];

  if (dvoa.off >= 15) {
    report.push({ icon: '🚀', tone: 'positive', text: 'Offense is elite. Lean into it.' });
  } else if (dvoa.off <= -10) {
    report.push({ icon: '⚠️', tone: 'negative', text: 'Offense is underperforming. Add help or change the mix.' });
  }

  if (dvoa.def >= 15) {
    report.push({ icon: '🛡️', tone: 'positive', text: 'Defense is carrying real value. Keep the core together.' });
  } else if (dvoa.def <= -10) {
    report.push({ icon: '🚨', tone: 'negative', text: 'Defense is a liability. Prioritize reinforcements.' });
  }

  if (capHealth.space < 10) {
    report.push({ icon: '💸', tone: 'negative', text: 'Cap space is critical. Avoid adding long-term strain.' });
  } else if (capHealth.space >= 40) {
    report.push({ icon: '💰', tone: 'positive', text: 'Cap position is strong enough to press an advantage.' });
  }

  if (agingRisk.count >= 3) {
    report.push({ icon: '⏳', tone: 'warning', text: agingRisk.count + ' starter-level veterans are entering decline windows.' });
  }

  if (season && season.phase === 'regular' && playoffOdds.available) {
    if ((playoffOdds.playoffPct || 0) >= 75) {
      report.push({ icon: '🏆', tone: 'positive', text: 'This projects as a win-now window.' });
    } else if ((playoffOdds.playoffPct || 0) <= 30) {
      report.push({ icon: '🔄', tone: 'warning', text: 'Playoff odds are thin. Retool decisions are on the table.' });
    }
  }

  if (injuryLoad >= 5) {
    report.push({ icon: '🏥', tone: 'negative', text: injuryLoad + ' injuries are testing roster depth.' });
  }

  if (report.length === 0) {
    report.push({ icon: '✅', tone: 'positive', text: 'Franchise position is stable. Stay disciplined.' });
  }

  return report;
}

export function buildAnalyticsSnapshot(options) {
  var settings = options || {};
  var team = settings.team || null;
  var teams = settings.teams || [];
  var season = settings.season || {};
  var sched = settings.sched || [];
  var myId = settings.myId;
  var fas = settings.fas || [];
  var matchupOVR = settings.matchupOVR;

  if (!team) {
    return {
      dvoa: { off: 0, def: 0, total: 0 },
      epaLeaders: [],
      targetShareLeaders: [],
      marketInefficiencies: [],
      capHealth: {
        cap: getSalaryCap(season.year || 2026),
        used: 0,
        dead: 0,
        space: getSalaryCap(season.year || 2026),
        pctUsed: 0,
        pressure: 'healthy',
      },
      playoffOdds: { available: false, projWins: 0, playoffPct: null },
      scheduleHeat: [],
      agingRisk: { count: 0, players: [], atRisk: [] },
      frontOfficeReport: [],
      teamStrength: 70,
    };
  }

  var teamId = team.id !== undefined ? team.id : myId;
  var gp = Math.max(1, (team.wins || 0) + (team.losses || 0));
  var dvoa = ADVANCED_ANALYTICS.calcDVOA(team);
  var teamStrength = ADVANCED_ANALYTICS.calcTeamStrength(team, matchupOVR);
  var remainingSched = sched.filter(function (game) {
    var ids = scheduleIds(game);
    return (
      season.phase === 'regular' &&
      (ids.homeId === teamId || ids.awayId === teamId) &&
      !game.played
    );
  });
  var playoffOdds =
    season.phase === 'regular'
      ? calcPlayoffOdds(team, teams, remainingSched, matchupOVR)
      : { available: false, projWins: team.wins || 0, playoffPct: null };
  var capUsed = Math.round(
    (team.roster || []).reduce(function (sum, player) {
      return sum + v36_capHit(player.contract);
    }, 0) * 10
  ) / 10;
  var deadCap = Math.round((team.deadCap || 0) * 10) / 10;
  var cap = getSalaryCap(season.year || 2026);
  var capSpace = Math.round((cap - capUsed - deadCap) * 10) / 10;
  var capPct = cap > 0 ? Math.round(((capUsed + deadCap) / cap) * 100) : 0;
  var capPressure = capSpace < 5 ? 'critical' : capSpace < 10 ? 'tight' : capSpace < 20 ? 'watch' : 'healthy';

  var epaLeaders = (team.roster || [])
    .filter(function (player) {
      return player && player.stats && (player.stats.gp || 0) > 0;
    })
    .map(function (player) {
      var epa = ADVANCED_ANALYTICS.calcEPA(player, team.wins, gp);
      var targetShare =
        player.pos === 'WR' || player.pos === 'TE' || player.pos === 'RB'
          ? ADVANCED_ANALYTICS.calcTargetShare(player, team.roster)
          : null;
      return {
        player: player,
        name: player.name,
        pos: player.pos,
        ovr: player.ovr,
        epa: epa,
        targetShare: targetShare,
      };
    })
    .sort(function (a, b) {
      return b.epa - a.epa;
    })
    .slice(0, 6);

  var targetShareLeaders = epaLeaders
    .filter(function (entry) {
      return typeof entry.targetShare === 'number';
    })
    .slice()
    .sort(function (a, b) {
      return (b.targetShare || 0) - (a.targetShare || 0);
    })
    .slice(0, 6);

  var agingPlayers = (team.roster || [])
    .filter(function (player) {
      return player && (player.isStarter || (player.ovr || 0) >= 75);
    })
    .slice()
    .sort(function (a, b) {
      return (b.ovr || 0) - (a.ovr || 0);
    })
    .slice(0, 8)
    .map(function (player) {
      var now = player.ovr || 40;
      var yr1 = ADVANCED_ANALYTICS.projectOVR(player, (player.age || 0) + 1);
      var yr2 = ADVANCED_ANALYTICS.projectOVR(player, (player.age || 0) + 2);
      var yr3 = ADVANCED_ANALYTICS.projectOVR(player, (player.age || 0) + 3);
      var peakAge = POS_PEAK[player.pos] || 27;
      return {
        player: player,
        id: player.id,
        name: player.name,
        pos: player.pos,
        age: player.age,
        peakAge: peakAge,
        now: now,
        yr1: yr1,
        yr2: yr2,
        yr3: yr3,
        trend: yr1 > now ? 'up' : yr1 < now ? 'down' : 'flat',
        atRisk: (player.age || 0) >= 31 && (player.ovr || 0) >= 75 && !!player.isStarter,
      };
    });

  var scheduleHeat = remainingSched
    .slice(0, 8)
    .map(function (game) {
      var ids = scheduleIds(game);
      if (ids.homeId === null || ids.awayId === null) return null;
      var oppId = ids.homeId === teamId ? ids.awayId : ids.homeId;
      var opp = teams.find(function (candidate) {
        return candidate.id === oppId;
      });
      if (!opp) return null;
      var oppStrength = ADVANCED_ANALYTICS.calcTeamStrength(opp, matchupOVR);
      var diff = Math.round(teamStrength - oppStrength);
      return {
        opp: opp,
        oppId: oppId,
        week: game.week,
        isHome: ids.homeId === teamId,
        str: Math.round(oppStrength),
        diff: diff,
        difficulty: difficultyLabel(diff),
      };
    })
    .filter(Boolean);

  var snapshot = {
    dvoa: dvoa,
    epaLeaders: epaLeaders,
    targetShareLeaders: targetShareLeaders,
    marketInefficiencies: ADVANCED_ANALYTICS.findInefficiencies(fas),
    capHealth: {
      cap: cap,
      used: capUsed,
      dead: deadCap,
      space: capSpace,
      pctUsed: capPct,
      pressure: capPressure,
      status: capPressure,
    },
    playoffOdds: playoffOdds,
    scheduleHeat: scheduleHeat,
    agingRisk: {
      count: agingPlayers.filter(function (entry) {
        return entry.atRisk;
      }).length,
      players: agingPlayers,
      atRisk: agingPlayers.filter(function (entry) {
        return entry.atRisk;
      }),
    },
    frontOfficeReport: [],
    teamStrength: Math.round(teamStrength * 10) / 10,
  };

  snapshot.frontOfficeReport = buildFrontOfficeReport(team, season, snapshot);
  return snapshot;
}
