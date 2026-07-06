import type { GameState, TutorialState, TutorialStep } from '../types';

// ── Week 1 Guided Flow (Sprint 43) ─────────────────────────
// Five focused steps that run during the first in-game week.
// Exposed separately from TUTORIAL_STEPS so the UI can pick
// this short flow during Week 1 and the long-form tour after.
export const WEEK1_STEP_IDS = [
  'week1-briefing',
  'week1-depth-chart',
  'week1-game-plan',
  'week1-advance',
  'week1-post-game',
] as const;

const WEEK1_STEPS: Array<Omit<TutorialStep, 'completed'>> = [
  {
    id: 'week1-briefing',
    title: 'Open Monday Briefing',
    description: 'Open Monday Briefing first. It names the injuries, depth-chart, Game Plan, cap, or deadline issue to fix before Advance Week.',
    targetScreen: '/',
    targetElement: '[data-nav="/"]',
    action: 'screen:/',
  },
  {
    id: 'week1-depth-chart',
    title: 'Lock in Week 1 Starters',
    description: 'Open Depth Chart and choose the Week 1 starters and first backups. One saved starter change clears this step.',
    targetScreen: '/depth-chart',
    targetElement: '[data-nav="/depth-chart"]',
    action: 'depth_chart:update',
  },
  {
    id: 'week1-game-plan',
    title: 'Pick Your Game Plan',
    description: 'Open Game Plan and match calls to healthy starters before Advance Week; calls that do not fit expose injuries or backup groups without a role.',
    targetScreen: '/game-plan',
    targetElement: '[data-nav="/game-plan"]',
    action: 'screen:/game-plan',
  },
  {
    id: 'week1-advance',
    title: 'Advance to Kickoff',
    description: 'Start Advance Week last. It locks Week 1 results, injuries, morale, deadlines, and the next opponent.',
    targetScreen: '/week-advance',
    targetElement: '[data-nav="/week-advance"]',
    action: 'week:advance',
  },
  {
    id: 'week1-post-game',
    title: 'Open Game Day Result',
    description: 'Open Game Day to see the score, injuries, turnovers, sacks, and failed drives; missed injuries put unavailable or low-role backups into saved roles.',
    targetScreen: '/game-day',
    targetElement: '[data-nav="/game-day"]',
    action: 'screen:/game-day',
  },
];

/**
 * Return a fresh array of Week 1 TutorialSteps (cloned, completed=false).
 * Use this to seed `tutorialState.steps` for brand-new dynasties.
 */
export function getWeek1Steps(): TutorialStep[] {
  return WEEK1_STEPS.map((step) => ({ ...step, completed: false }));
}

const TUTORIAL_STEPS: Array<Omit<TutorialStep, 'completed'>> = [
  {
    id: 'welcome',
    title: 'Welcome',
    description: 'Welcome to franchise mode. You are running the full football operation now.',
    targetScreen: '/',
    targetElement: null,
    action: null,
  },
  {
    id: 'check_roster',
    title: 'Open Roster',
    description: 'Open Roster and identify starters, backups, injuries, contracts, and first-month player jobs.',
    targetScreen: '/roster',
    targetElement: '[data-nav="/roster"]',
    action: 'screen:/roster',
  },
  {
    id: 'review_cap',
    title: 'Open Contracts',
    description: 'Open Contracts to see cap space, dead money, extension risk, and which moves block injury replacements.',
    targetScreen: '/contracts',
    targetElement: '[data-nav="/contracts"]',
    action: 'screen:/contracts',
  },
  {
    id: 'set_depth_chart',
    title: 'Set Depth Chart',
    description: 'Open Depth Chart and save one starter decision; unsaved starters leave injured or low-role backups in key jobs.',
    targetScreen: '/depth-chart',
    targetElement: '[data-nav="/depth-chart"]',
    action: 'depth_chart:update',
  },
  {
    id: 'assign_training',
    title: 'Assign Training',
    description: 'Open Roster and assign one weekly training focus; unused focus loses development reps before the next game.',
    targetScreen: '/roster',
    targetElement: '[data-nav="/roster"]',
    action: 'training:assign',
  },
  {
    id: 'check_inbox',
    title: 'Open Inbox',
    description: 'Open Inbox and answer messages with deadlines before Advance Week; missed deadlines remove choices.',
    targetScreen: '/inbox',
    targetElement: '[data-nav="/inbox"]',
    action: 'screen:/inbox',
  },
  {
    id: 'advance_week',
    title: 'Advance Week',
    description: 'Start Advance Week after roster, depth-chart, and Game Plan decisions; it locks the next game state.',
    targetScreen: '/week-advance',
    targetElement: '[data-nav="/week-advance"]',
    action: 'week:advance',
  },
  {
    id: 'review_game_day',
    title: 'Open Game Day',
    description: 'Open Game Day after kickoff to see score, injuries, turnovers, sacks, and failed drives; missed injuries put unavailable or low-role backups into saved roles.',
    targetScreen: '/game-day',
    targetElement: '[data-nav="/game-day"]',
    action: 'screen:/game-day',
  },
  {
    id: 'review_halftime_decision',
    title: 'Understand Halftime',
    description: 'When Game Day shows a halftime choice, keep the plan or change second-half calls; that choice changes drive boosts and late-drive penalties.',
    targetScreen: '/game-day',
    targetElement: '[data-nav="/game-day"]',
    action: 'screen:/game-day',
  },
  {
    id: 'spot_named_games',
    title: 'Spot Named Games',
    description: 'Game Day names rivalry, weather, and revenge games; set Game Plan counters before coverage, rest, pass depth, or kick choices lock at kickoff.',
    targetScreen: '/game-day',
    targetElement: '[data-nav="/game-day"]',
    action: 'screen:/game-day',
  },
  {
    id: 'check_standings',
    title: 'Open Standings',
    description: 'Open Standings before the deadline; buying while buried wastes picks, and selling while alive costs a playoff spot.',
    targetScreen: '/standings',
    targetElement: '[data-nav="/standings"]',
    action: 'screen:/standings',
  },
  {
    id: 'make_promise',
    title: 'Make a Promise',
    description: 'Open Owner Promises to make one promise with a deadline; missed promises cut owner patience.',
    targetScreen: '/handshakes',
    targetElement: '[data-nav="/handshakes"]',
    action: 'handshake:create',
  },
  {
    id: 'scout_prospect',
    title: 'Scout a Prospect',
    description: 'Open Scouting and assign one scout report; missing role, medical-limit, or coachability info wastes a draft pick.',
    targetScreen: '/scouting',
    targetElement: '[data-nav="/scouting"]',
    action: 'scouting:action',
  },
  {
    id: 'check_game_plan',
    title: 'Set Your Game Plan',
    description:
      'Before each game, choose offensive and defensive calls that fit healthy starters and opponent risk.',
    targetScreen: '/game-plan',
    targetElement: '[data-nav="/game-plan"]',
    action: 'screen:/game-plan',
  },
  {
    id: 'call_your_shot',
    title: 'Call Your Shot',
    description: 'On Game Plan, call one measurable target. A hit, miss, or partial result affects postgame notes and owner confidence.',
    targetScreen: '/game-plan',
    targetElement: '[data-nav="/game-plan"]',
    action: 'screen:/game-plan',
  },
  {
    id: 'contingency_gambit',
    title: 'Set a Contingency',
    description: 'Set Contingency Gambit so staff know which call changes when score, clock, or injury conditions turn against you.',
    targetScreen: '/game-plan',
    targetElement: '[data-nav="/game-plan"]',
    action: 'screen:/game-plan',
  },
  {
    id: 'review_broadcast',
    title: 'Open Broadcast',
    description:
      'After Advance Week runs a game, open Broadcast for scoring swings, turnovers, injuries, and drive failures before changing Game Plan or Depth Chart.',
    targetScreen: '/broadcast',
    targetElement: '[data-nav="/broadcast"]',
    action: 'screen:/broadcast',
  },
  {
    id: 'review_film_room',
    title: 'Open Film Room',
    description: 'Open Film Room after a result to see whether weekly plan, Call Your Shot, and contingency calls helped or hurt.',
    targetScreen: '/film-room',
    targetElement: '[data-nav="/film-room"]',
    action: 'screen:/film-room',
  },
  {
    id: 'explore_trades',
    title: 'Explore the Trade Market',
    description:
      'Open Trade Center to name starter or backup job, cap space, player role, and deal cost before accepting; deals without a role spend picks or starters without fixing the lineup.',
    targetScreen: '/trades',
    targetElement: '[data-nav="/trades"]',
    action: 'screen:/trades',
  },
  {
    id: 'read_media_cycle',
    title: 'Open Newsroom',
    description: 'Open Newsroom for injuries, streaks, owner tension, and league moves; open Roster or Game Plan before those alerts lock a starter or call the lineup cannot handle.',
    targetScreen: '/newsroom',
    targetElement: '[data-nav="/newsroom"]',
    action: 'screen:/newsroom',
  },
  {
    id: 'track_storyline_threads',
    title: 'Track Newsroom Threads',
    description: 'Open Newsroom threads for injuries, promises, streaks, and breakouts; missed threads leave morale, offers, or prep calls late.',
    targetScreen: '/newsroom',
    targetElement: '[data-nav="/newsroom"]',
    action: 'screen:/newsroom',
  },
  {
    id: 'check_rivalry_heat',
    title: 'Open League Pulse',
    description: 'Open League Pulse to see rival injuries, division deficits, and games that affect buy, sell, or hold timing before trade deadlines.',
    targetScreen: '/league-pulse',
    targetElement: '[data-nav="/league-pulse"]',
    action: 'screen:/league-pulse',
  },
  {
    id: 'check_franchise',
    title: 'Open Franchise Hub',
    description:
      'Open Franchise Hub to view owner patience, staff effects, and roster timeline before cap moves block extensions or injury fixes.',
    targetScreen: '/franchise',
    targetElement: '[data-nav="/franchise"]',
    action: 'screen:/franchise',
  },
  {
    id: 'you_are_ready',
    title: "You're Ready!",
    description:
      "Keep using Monday Briefing, Roster, Depth Chart, Game Plan, Contracts, and Advance Week to make each week's decisions with known consequences.",
    targetScreen: '/',
    targetElement: null,
    action: null,
  },
];

function cloneSteps(): TutorialStep[] {
  return TUTORIAL_STEPS.map((step) => ({ ...step, completed: false }));
}

export function createDefaultTutorialState(active = true): TutorialState {
  return {
    active,
    currentStepIndex: 0,
    steps: cloneSteps(),
    completedSteps: [],
    dismissed: false,
    visitedScreens: [],
  };
}

/**
 * Record that the user has landed on a screen for the first time.
 * Idempotent — repeat visits are no-ops. Sprint 43.
 */
export function markScreenVisited(game: GameState, screenKey: string): TutorialState {
  game.tutorialState ??= createDefaultTutorialState(false);
  game.tutorialState.visitedScreens ??= [];
  if (!game.tutorialState.visitedScreens.includes(screenKey)) {
    game.tutorialState.visitedScreens.push(screenKey);
  }
  return game.tutorialState;
}

/**
 * True the first time a screen is being shown. UI uses this to
 * decide whether to render the AGM contextual tip card.
 */
export function isFirstVisit(game: GameState, screenKey: string): boolean {
  game.tutorialState ??= createDefaultTutorialState(false);
  const visited = game.tutorialState.visitedScreens ?? [];
  return !visited.includes(screenKey);
}

function currentStep(state: TutorialState): TutorialStep | null {
  return state.steps[state.currentStepIndex] ?? null;
}

export function advanceTutorial(game: GameState): TutorialState {
  game.tutorialState ??= createDefaultTutorialState(false);
  const tutorial = game.tutorialState;
  const step = currentStep(tutorial);
  if (!step) {
    tutorial.active = false;
    return tutorial;
  }

  step.completed = true;
  if (!tutorial.completedSteps.includes(step.id)) {
    tutorial.completedSteps.push(step.id);
  }
  tutorial.currentStepIndex += 1;
  if (tutorial.currentStepIndex >= tutorial.steps.length) {
    tutorial.active = false;
    tutorial.currentStepIndex = tutorial.steps.length;
  }

  return tutorial;
}

export function dismissTutorial(game: GameState): void {
  game.tutorialState ??= createDefaultTutorialState(false);
  game.tutorialState.dismissed = true;
  game.tutorialState.active = false;
}

export function isTutorialActive(game: GameState): boolean {
  game.tutorialState ??= createDefaultTutorialState(false);
  return Boolean(
    game.tutorialState.active &&
    !game.tutorialState.dismissed &&
    game.tutorialState.currentStepIndex < game.tutorialState.steps.length,
  );
}

export function getTutorialHint(game: GameState, currentScreen: string): TutorialStep | null {
  game.tutorialState ??= createDefaultTutorialState(false);
  if (!isTutorialActive(game)) return null;
  const step = currentStep(game.tutorialState);
  return step?.targetScreen === currentScreen ? step : null;
}

export function completeTutorialAction(game: GameState, actionId: string): TutorialState {
  game.tutorialState ??= createDefaultTutorialState(false);
  if (!isTutorialActive(game)) return game.tutorialState;
  const step = currentStep(game.tutorialState);
  if (!step) return game.tutorialState;

  const matchesRoute = Boolean(step.action?.startsWith('screen:') && actionId === step.action);
  const matchesAction = Boolean(step.action !== null && !step.action.startsWith('screen:') && actionId === step.action);
  if (!matchesRoute && !matchesAction) return game.tutorialState;

  return advanceTutorial(game);
}
