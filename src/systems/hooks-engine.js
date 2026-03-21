/**
 * Hooks Engine — MFD "Unresolved Hooks & Open Loops" System
 *
 * Calculates upcoming narrative hooks from real game state.
 * Returns exactly 3 hooks per invocation, drawn from priority categories.
 * No lies, no fabrications — every hook references real upcoming events.
 */

var HOOK_GENERATORS = [
  // Category: Contract pressure
  function contractHook(state) {
    if (!state.my || !state.my.roster) return null;
    var holdouts = state.my.roster.filter(function (p) { return p.holdout75 && p.ovr >= 70; });
    if (holdouts.length > 0) {
      var h = holdouts[0];
      return { cat: 'contract', icon: '📝', text: h.name + '\'s holdout deadline is approaching. ' + h.ovr + ' OVR — can you afford to lose him?', priority: 95 };
    }
    var expiring = state.my.roster.filter(function (p) { return p.contract && p.contract.years <= 1 && p.ovr >= 78 && p.isStarter; });
    if (expiring.length > 0) {
      return { cat: 'contract', icon: '📝', text: expiring[0].name + ' (' + expiring[0].pos + ', ' + expiring[0].ovr + ' OVR) enters final contract year. Extension talks loom.', priority: 70 };
    }
    return null;
  },

  // Category: Rivalry/vengeance
  function rivalryHook(state) {
    if (!state.sched || !state.season || !state.my) return null;
    var upcoming = state.sched.filter(function (g) {
      return !g.played && g.week > state.season.week && (g.home === state.myId || g.away === state.myId);
    }).slice(0, 4);
    for (var i = 0; i < upcoming.length; i++) {
      var g = upcoming[i];
      var oppId = g.home === state.myId ? g.away : g.home;
      var opp = state.teams.find(function (t) { return t.id === oppId; });
      if (!opp) continue;
      var riv = state.my.rivals && state.my.rivals[oppId];
      if (riv && riv.heat >= 8) {
        return { cat: 'rivalry', icon: '🔥', text: 'Blood Feud with ' + opp.icon + ' ' + opp.name + ' — Week ' + g.week + '. The locker room is already circling the date.', priority: 90 };
      }
      if (riv && riv.heat >= 5) {
        return { cat: 'rivalry', icon: '⚔️', text: 'Rivalry clash vs ' + opp.icon + ' ' + opp.name + ' coming in Week ' + g.week + '.', priority: 75 };
      }
    }
    return null;
  },

  // Category: Playoff math
  function playoffHook(state) {
    if (!state.my || !state.season || state.season.phase !== 'regular') return null;
    var totalGames = state.sched ? state.sched.filter(function (g) { return g.home === state.myId || g.away === state.myId; }).length : 0;
    var played = state.sched ? state.sched.filter(function (g) { return (g.home === state.myId || g.away === state.myId) && g.played; }).length : 0;
    var remain = totalGames - played;
    if (remain <= 4 && remain > 0) {
      var wins = state.my.wins || 0;
      var losses = state.my.losses || 0;
      if (wins >= losses) {
        return { cat: 'playoffs', icon: '🏈', text: remain + ' game' + (remain !== 1 ? 's' : '') + ' left. Win streak now and clinch a playoff spot.', priority: 85 };
      }
      return { cat: 'playoffs', icon: '📊', text: remain + ' game' + (remain !== 1 ? 's' : '') + ' remaining at ' + wins + '-' + losses + '. Every game is a must-win.', priority: 80 };
    }
    return null;
  },

  // Category: Development milestones
  function devHook(state) {
    if (!state.my || !state.my.roster) return null;
    var breakouts = state.my.roster.filter(function (p) {
      return p.age <= 25 && p.devTrait === 'star' && p.ovr >= 68 && p.ovr <= 80;
    });
    if (breakouts.length > 0) {
      var b = breakouts[0];
      return { cat: 'development', icon: '📈', text: b.name + ' (' + b.pos + ', ' + b.age + ') showing Star development trajectory. Breakout season incoming?', priority: 72 };
    }
    var rookies = state.my.roster.filter(function (p) { return p.age <= 23 && p.devTrait === 'superstar'; });
    if (rookies.length > 0) {
      return { cat: 'development', icon: '🌟', text: rookies[0].name + ' has Superstar potential. Keep feeding them reps.', priority: 68 };
    }
    return null;
  },

  // Category: Owner pressure
  function ownerHook(state) {
    if (!state.ownerPatience) return null;
    if (state.ownerPatience < 30) {
      return { cat: 'owner', icon: '😤', text: 'Owner patience critical. Next loss could trigger an ultimatum meeting.', priority: 88 };
    }
    if (state.ownerPatience < 50) {
      return { cat: 'owner', icon: '😐', text: 'Owner is watching closely. A win streak would go a long way.', priority: 60 };
    }
    return null;
  },

  // Category: Injury return
  function injuryHook(state) {
    if (!state.my || !state.my.roster) return null;
    var returning = state.my.roster.filter(function (p) {
      return p.injury && p.injury.games > 0 && p.injury.games <= 2 && p.ovr >= 75;
    });
    if (returning.length > 0) {
      var r = returning[0];
      return { cat: 'injury', icon: '🏥', text: r.name + ' (' + r.pos + ', ' + r.ovr + ' OVR) returns from ' + (r.injury.type || 'injury') + ' in ' + r.injury.games + ' week' + (r.injury.games > 1 ? 's' : '') + '.', priority: 74 };
    }
    return null;
  },

  // Category: Draft anticipation (offseason)
  function draftHook(state) {
    if (!state.season || (state.season.phase !== 'reSign' && state.season.phase !== 'combine' && state.season.phase !== 'freeAgency')) return null;
    return { cat: 'draft', icon: '🎓', text: 'The draft is approaching. Your scouts are working overtime on this year\'s prospect class.', priority: 65 };
  },

  // Category: Streak momentum
  function streakHook(state) {
    if (!state.my) return null;
    if (state.my.streak >= 3) {
      return { cat: 'streak', icon: '🔥', text: state.my.streak + '-game win streak! Can you keep the momentum going?', priority: 76 };
    }
    if (state.my.loseStreak >= 3) {
      return { cat: 'streak', icon: '📉', text: state.my.loseStreak + '-game losing streak. The pressure is mounting.', priority: 82 };
    }
    return null;
  },
];

/**
 * Generate 3 hooks from real game state.
 * @param {object} state - { my, myId, teams, sched, season, ownerPatience, nemesis }
 * @param {string[]} lastShownCats - categories shown last time (to avoid repetition)
 * @returns {object[]} Array of up to 3 hooks
 */
export function generateHooks(state, lastShownCats) {
  var last = lastShownCats || [];
  var allHooks = [];

  for (var i = 0; i < HOOK_GENERATORS.length; i++) {
    try {
      var hook = HOOK_GENERATORS[i](state);
      if (hook) {
        // Deprioritize hooks from categories shown last time
        if (last.indexOf(hook.cat) !== -1) hook.priority -= 20;
        allHooks.push(hook);
      }
    } catch (_e) { /* skip broken generator */ }
  }

  allHooks.sort(function (a, b) { return b.priority - a.priority; });
  return allHooks.slice(0, 3);
}

/**
 * Nemesis Tag System
 * Tracks a single "Nemesis" GM/team that wronged the player.
 */
export function checkNemesisTrigger(event) {
  // event: { type: "playoff_loss" | "injury" | "fa_steal", oppId, oppName, oppIcon, detail }
  if (!event || !event.oppId) return null;
  return {
    oppId: event.oppId,
    oppName: event.oppName || 'Unknown',
    oppIcon: event.oppIcon || '',
    reason: event.type === 'playoff_loss' ? 'Eliminated you from the playoffs'
      : event.type === 'injury' ? 'Injured your star player'
      : event.type === 'fa_steal' ? 'Stole your free agent target'
      : 'Wronged your franchise',
    detail: event.detail || '',
    setAt: Date.now(),
  };
}

export function checkNemesisResolved(nemesis, oppId, isConsequentialWin) {
  if (!nemesis || nemesis.oppId !== oppId) return false;
  return isConsequentialWin;
}

/**
 * Draft Crush System
 * Generates MFSN preview items for generational prospects.
 */
export function generateDraftCrush(year, rng) {
  if (!rng || rng() > 0.33) return null; // ~1 in 3 years
  var firstNames = ['Marcus', 'Jaylen', 'DeVon', 'Caleb', 'Trey', 'Bryce', 'Jalen', 'Malik', 'Chase', 'Trevor'];
  var lastNames = ['Williams', 'Johnson', 'Carter', 'Thompson', 'Davis', 'Mitchell', 'Robinson', 'Jackson', 'Harris', 'Clark'];
  var positions = ['QB', 'WR', 'EDGE', 'CB', 'OT'];
  var states = ['Texas', 'Georgia', 'Florida', 'California', 'Alabama', 'Ohio', 'Louisiana', 'Tennessee'];
  var fi = Math.floor(rng() * firstNames.length);
  var li = Math.floor(rng() * lastNames.length);
  var pi = Math.floor(rng() * positions.length);
  var si = Math.floor(rng() * states.length);

  return {
    name: firstNames[fi] + ' ' + lastNames[li],
    pos: positions[pi],
    state: states[si],
    draftYear: year + 3,
    yearN3: 'MFSN PROSPECT WATCH: ' + firstNames[fi] + ' ' + lastNames[li] + ', a HS junior from ' + states[si] + ', turned heads at a showcase. Remember this name.',
    yearN2: firstNames[fi] + ' ' + lastNames[li] + ' committed to a powerhouse program. Scouts calling him a potential franchise-changer at ' + positions[pi] + '.',
    yearN1: firstNames[fi] + ' ' + lastNames[li] + ' declared for the draft. Expected top-5 pick. Multiple teams reportedly adjusting their strategy.',
  };
}

export var HOOKS_ENGINE = {
  generate: generateHooks,
  checkNemesisTrigger: checkNemesisTrigger,
  checkNemesisResolved: checkNemesisResolved,
  generateDraftCrush: generateDraftCrush,
};
