import type { GameState, TutorialState, TutorialStep } from '../types';

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
    title: 'Check Roster',
    description: 'Open the roster and identify the core pieces you are building around.',
    targetScreen: '/roster',
    targetElement: '[data-nav="/roster"]',
    action: 'screen:/roster',
  },
  {
    id: 'review_cap',
    title: 'Review Cap',
    description: 'Look at the contracts screen to understand your cap shape and dead money.',
    targetScreen: '/contracts',
    targetElement: '[data-nav="/contracts"]',
    action: 'screen:/contracts',
  },
  {
    id: 'set_depth_chart',
    title: 'Set Depth Chart',
    description: 'Visit the depth chart and lock in at least one starter decision.',
    targetScreen: '/depth-chart',
    targetElement: '[data-nav="/depth-chart"]',
    action: 'depth_chart:update',
  },
  {
    id: 'assign_training',
    title: 'Assign Training',
    description: 'Back on the roster, give a player a weekly training focus.',
    targetScreen: '/roster',
    targetElement: '[data-nav="/roster"]',
    action: 'training:assign',
  },
  {
    id: 'check_inbox',
    title: 'Check Inbox',
    description: 'Open the inbox and read what the league is already telling you.',
    targetScreen: '/inbox',
    targetElement: '[data-nav="/inbox"]',
    action: 'screen:/inbox',
  },
  {
    id: 'advance_week',
    title: 'Advance Week',
    description: 'Advance into the first game and let the season start moving.',
    targetScreen: '/week-advance',
    targetElement: '[data-nav="/week-advance"]',
    action: 'week:advance',
  },
  {
    id: 'review_game_day',
    title: 'Review Game Day',
    description: 'Use the Game Day screen to see what actually happened after kickoff.',
    targetScreen: '/game-day',
    targetElement: '[data-nav="/game-day"]',
    action: 'screen:/game-day',
  },
  {
    id: 'check_standings',
    title: 'Check Standings',
    description: 'Open standings and place your team inside the league context.',
    targetScreen: '/standings',
    targetElement: '[data-nav="/standings"]',
    action: 'screen:/standings',
  },
  {
    id: 'make_promise',
    title: 'Make a Promise',
    description: 'Use the handshake ledger to make one promise and feel the trust system.',
    targetScreen: '/handshakes',
    targetElement: '[data-nav="/handshakes"]',
    action: 'handshake:create',
  },
  {
    id: 'scout_prospect',
    title: 'Scout a Prospect',
    description: 'Open scouting and run one scouting action.',
    targetScreen: '/scouting',
    targetElement: '[data-nav="/scouting"]',
    action: 'scouting:action',
  },
  {
    id: 'check_game_plan',
    title: 'Set Your Game Plan',
    description:
      'Before each game, visit Game Plan to choose your offensive and defensive strategies. Match your scheme to your roster strengths.',
    targetScreen: '/game-plan',
    targetElement: '[data-nav="/game-plan"]',
    action: 'screen:/game-plan',
  },
  {
    id: 'review_broadcast',
    title: 'Watch the Broadcast',
    description:
      'After advancing a week with a game, check the Broadcast screen to see a play-by-play recap with commentary and key moments.',
    targetScreen: '/broadcast',
    targetElement: '[data-nav="/broadcast"]',
    action: 'screen:/broadcast',
  },
  {
    id: 'explore_trades',
    title: 'Explore the Trade Market',
    description:
      'Visit the Trade Center to see what deals are available. Every team has different needs — find the right match.',
    targetScreen: '/trades',
    targetElement: '[data-nav="/trades"]',
    action: 'screen:/trades',
  },
  {
    id: 'check_franchise',
    title: 'Build Your Dynasty',
    description:
      'The Franchise Hub tracks your legacy — owner mood, franchise doctrines, and dynasty window. This is the long game.',
    targetScreen: '/franchise',
    targetElement: '[data-nav="/franchise"]',
    action: 'screen:/franchise',
  },
  {
    id: 'you_are_ready',
    title: "You're Ready!",
    description:
      'You have the tools to build a dynasty. Play your way — there are no wrong answers, only your story. Good luck, Coach.',
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
  };
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
