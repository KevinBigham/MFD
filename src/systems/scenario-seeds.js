/**
 * Scenario Seeds — MFD Replayability System
 *
 * Pre-configured starting scenarios that create dramatically different
 * strategic challenges. Each scenario modifies the universe generation
 * to produce a unique starting condition.
 */

export var SCENARIOS = [
  {
    id: 'standard',
    name: 'Standard',
    description: 'Classic franchise mode. Pick a team and build your legacy.',
    difficulty: 1,
    icon: '🏈',
    mfsnHeadline: 'A new era begins. The GM seat is yours.',
    modifiers: {},
  },
  {
    id: 'cap_hell',
    name: 'Cap Hell',
    description: 'Talented roster but $40M over the cap with the oldest average age in the league. Rebuild while competing.',
    difficulty: 4,
    icon: '💸',
    mfsnHeadline: 'New GM inherits financial disaster — can they dig out?',
    modifiers: {
      capPenalty: -40,
      rosterAgeBoost: 4,
      rosterOvrBoost: 5,
      ownerType: 'win_now',
    },
  },
  {
    id: 'fallen_dynasty',
    name: 'Fallen Dynasty',
    description: 'Former 3-peat champions with aging superstars. The owner demands one last ring.',
    difficulty: 4,
    icon: '👑',
    mfsnHeadline: 'Can this former dynasty recapture the magic? The clock is ticking.',
    modifiers: {
      historyTitles: 3,
      rosterAgeBoost: 3,
      rosterOvrBoost: 3,
      ownerType: 'win_now',
      ownerPatience: 40,
    },
  },
  {
    id: 'the_rebuild',
    name: 'The Rebuild',
    description: 'Worst record in the league, loaded with draft picks, patient owner. Tank and build.',
    difficulty: 2,
    icon: '🏗️',
    mfsnHeadline: 'Year zero. The cupboard is bare, but the future is bright — if the GM can draft.',
    modifiers: {
      rosterOvrPenalty: 8,
      extraDraftPicks: 3,
      ownerType: 'patient',
      ownerPatience: 80,
    },
  },
  {
    id: 'toxic_locker',
    name: 'Toxic Locker Room',
    description: 'Talented roster riddled with divas and hotheads. Chemistry at rock bottom. Win despite the drama.',
    difficulty: 5,
    icon: '☢️',
    mfsnHeadline: 'Multiple sources: locker room is "a powder keg." Can the new GM restore order?',
    modifiers: {
      rosterOvrBoost: 4,
      toxicTraits: 4,
      chemistryPenalty: -25,
    },
  },
  {
    id: 'heir_apparent',
    name: 'The Heir Apparent',
    description: 'Elite young QB on a rookie deal. 4-year championship window, then the cap cliff hits.',
    difficulty: 3,
    icon: '⭐',
    mfsnHeadline: 'Franchise QB locked in cheap. The window is NOW. Every move counts.',
    modifiers: {
      eliteQB: true,
      rosterOvrBoost: 2,
      capWindow: 4,
    },
  },
  {
    id: 'small_market',
    name: 'Small Market Squeeze',
    description: 'Profit-first owner, bottom-5 revenue. FA players don\'t want to come. Win with less.',
    difficulty: 4,
    icon: '🏚️',
    mfsnHeadline: 'Tight budget, no glamour, low expectations. Prove them all wrong.',
    modifiers: {
      ownerType: 'profit_first',
      faPenalty: -15,
      revenuePenalty: -20,
      ownerPatience: 55,
    },
  },
  {
    id: 'last_dance',
    name: 'Last Dance',
    description: 'Legendary QB retiring next season. The owner demands a farewell championship. One shot.',
    difficulty: 5,
    icon: '🌅',
    mfsnHeadline: 'The legend\'s final season. One last chance to send him out on top.',
    modifiers: {
      veteranQB: true,
      rosterOvrBoost: 4,
      ownerType: 'win_now',
      ownerPatience: 30,
      oneYearWindow: true,
    },
  },
];

/**
 * Get scenario by ID.
 */
export function getScenario(id) {
  return SCENARIOS.find(function (s) { return s.id === id; }) || SCENARIOS[0];
}

/**
 * Apply scenario modifiers to initial game state.
 * Called during universe generation.
 * Returns modifier instructions (not direct mutations).
 */
export function getScenarioModifiers(scenarioId) {
  var scenario = getScenario(scenarioId);
  return scenario.modifiers || {};
}

export var SCENARIO_SEEDS = {
  list: SCENARIOS,
  get: getScenario,
  getModifiers: getScenarioModifiers,
};
