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
    targetElement: null,
    action: 'screen:/roster',
  },
  {
    id: 'review_cap',
    title: 'Review Cap',
    description: 'Look at the contracts screen to understand your cap shape and dead money.',
    targetScreen: '/contracts',
    targetElement: null,
    action: 'screen:/contracts',
  },
  {
    id: 'set_depth_chart',
    title: 'Set Depth Chart',
    description: 'Visit the depth chart and lock in at least one starter decision.',
    targetScreen: '/depth-chart',
    targetElement: null,
    action: 'depth_chart:update',
  },
  {
    id: 'assign_training',
    title: 'Assign Training',
    description: 'Back on the roster, give a player a weekly training focus.',
    targetScreen: '/roster',
    targetElement: null,
    action: 'training:assign',
  },
  {
    id: 'check_inbox',
    title: 'Check Inbox',
    description: 'Open the inbox and read what the league is already telling you.',
    targetScreen: '/inbox',
    targetElement: null,
    action: 'screen:/inbox',
  },
  {
    id: 'advance_week',
    title: 'Advance Week',
    description: 'Advance into the first game and let the season start moving.',
    targetScreen: '/week-advance',
    targetElement: null,
    action: 'week:advance',
  },
  {
    id: 'review_game_day',
    title: 'Review Game Day',
    description: 'Use the Game Day screen to see what actually happened after kickoff.',
    targetScreen: '/game-day',
    targetElement: null,
    action: 'screen:/game-day',
  },
  {
    id: 'check_standings',
    title: 'Check Standings',
    description: 'Open standings and place your team inside the league context.',
    targetScreen: '/standings',
    targetElement: null,
    action: 'screen:/standings',
  },
  {
    id: 'make_promise',
    title: 'Make a Promise',
    description: 'Use the handshake ledger to make one promise and feel the trust system.',
    targetScreen: '/handshakes',
    targetElement: null,
    action: 'handshake:create',
  },
  {
    id: 'scout_prospect',
    title: 'Scout a Prospect',
    description: 'Open scouting and run one scouting action.',
    targetScreen: '/scouting',
    targetElement: null,
    action: 'scouting:action',
  },
  {
    id: 'you_are_ready',
    title: "You're Ready!",
    description: 'You have touched the core loops. The dynasty is yours now.',
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
