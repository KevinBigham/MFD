import { describe, expect, it } from 'vitest';
import {
  advanceTutorial,
  completeTutorialAction,
  createDefaultTutorialState,
  dismissTutorial,
  getTutorialHint,
  getWeek1Steps,
  isFirstVisit,
  isTutorialActive,
  markScreenVisited,
  WEEK1_STEP_IDS,
} from './tutorial';
import { makeLeagueState } from './test-helpers';

const LAUNCH_STEP_EXPECTATIONS = [
  ['check_game_plan', '/game-plan', '[data-nav="/game-plan"]'],
  ['call_your_shot', '/game-plan', '[data-nav="/game-plan"]'],
  ['contingency_gambit', '/game-plan', '[data-nav="/game-plan"]'],
  ['review_broadcast', '/broadcast', '[data-nav="/broadcast"]'],
  ['review_film_room', '/film-room', '[data-nav="/film-room"]'],
  ['explore_trades', '/trades', '[data-nav="/trades"]'],
  ['read_media_cycle', '/newsroom', '[data-nav="/newsroom"]'],
  ['track_storyline_threads', '/newsroom', '[data-nav="/newsroom"]'],
  ['check_rivalry_heat', '/league-pulse', '[data-nav="/league-pulse"]'],
  ['check_franchise', '/franchise', '[data-nav="/franchise"]'],
] as const;

describe('tutorial', () => {
  it('starts with twenty-four active steps on a new tutorial state', () => {
    const tutorial = createDefaultTutorialState();

    expect(tutorial.active).toBe(true);
    expect(tutorial.currentStepIndex).toBe(0);
    expect(tutorial.steps).toHaveLength(24);
    expect(tutorial.steps[0]?.title).toBe('Welcome');
    expect(tutorial.steps[23]?.title).toBe("You're Ready!");
  });

  it('advanceTutorial progresses correctly', () => {
    const game = makeLeagueState('preseason');
    game.tutorialState = createDefaultTutorialState();

    advanceTutorial(game);

    expect(game.tutorialState.completedSteps).toEqual(['welcome']);
    expect(game.tutorialState.currentStepIndex).toBe(1);
    expect(game.tutorialState.steps[0]?.completed).toBe(true);
  });

  it('dismissTutorial hides tutorial permanently', () => {
    const game = makeLeagueState('preseason');
    game.tutorialState = createDefaultTutorialState();

    dismissTutorial(game);

    expect(game.tutorialState.dismissed).toBe(true);
    expect(game.tutorialState.active).toBe(false);
    expect(isTutorialActive(game)).toBe(false);
  });

  it('getTutorialHint returns the targeted screen hint and action completion advances the step', () => {
    const game = makeLeagueState('preseason');
    game.tutorialState = createDefaultTutorialState();

    advanceTutorial(game); // roster step

    const hint = getTutorialHint(game, '/roster');
    expect(hint?.title).toBe('Open Roster');

    completeTutorialAction(game, 'screen:/roster');

    expect(game.tutorialState.completedSteps).toContain('check_roster');
    expect(game.tutorialState.currentStepIndex).toBe(2);
  });

  it('assigns navigation selectors to route-driven steps and keeps you are ready last', () => {
    const tutorial = createDefaultTutorialState();
    const rosterStep = tutorial.steps.find((step) => step.id === 'check_roster');
    const advanceWeekStep = tutorial.steps.find((step) => step.id === 'advance_week');
    const finalStep = tutorial.steps.at(-1);

    expect(rosterStep?.targetElement).toBe('[data-nav="/roster"]');
    expect(advanceWeekStep?.targetElement).toBe('[data-nav="/week-advance"]');
    expect(finalStep?.id).toBe('you_are_ready');
  });

  it('includes the convention demo steps before the final tutorial step', () => {
    const tutorial = createDefaultTutorialState();
    const ids = tutorial.steps.map((step) => step.id);

    expect(ids).toContain('check_game_plan');
    expect(ids).toContain('review_broadcast');
    expect(ids).toContain('explore_trades');
    expect(ids).toContain('check_franchise');
    expect(ids.indexOf('check_franchise')).toBeLessThan(ids.indexOf('you_are_ready'));
  });

  it('covers launch-era systems with route-driven steps', () => {
    const tutorial = createDefaultTutorialState();
    const stepsById = new Map(tutorial.steps.map((step) => [step.id, step]));

    expect(stepsById.get('call_your_shot')?.targetScreen).toBe('/game-plan');
    expect(stepsById.get('contingency_gambit')?.targetScreen).toBe('/game-plan');
    expect(stepsById.get('review_halftime_decision')?.targetScreen).toBe('/game-day');
    expect(stepsById.get('spot_named_games')?.targetScreen).toBe('/game-day');
    expect(stepsById.get('check_rivalry_heat')?.targetScreen).toBe('/league-pulse');
    expect(stepsById.get('read_media_cycle')?.targetScreen).toBe('/newsroom');
    expect(stepsById.get('track_storyline_threads')?.targetScreen).toBe('/newsroom');
  });

  it('updates the final readiness copy and demo-step selectors', () => {
    const tutorial = createDefaultTutorialState();
    const gamePlanStep = tutorial.steps.find((step) => step.id === 'check_game_plan');
    const finalStep = tutorial.steps.at(-1);

    expect(gamePlanStep?.targetElement).toBe('[data-nav="/game-plan"]');
    expect(finalStep?.description).toBe(
      "Keep using Monday Briefing, Roster, Depth Chart, Game Plan, Contracts, and Advance Week to make each week's decisions with known consequences.",
    );
  });

  it('keeps tutorial copy action and consequence focused', () => {
    const allCopy = [
      ...getWeek1Steps(),
      ...createDefaultTutorialState().steps,
    ].map((step) => `${step.title} ${step.description}`).join(' ');

    expect(allCopy).toContain('Start Advance Week last. It locks Week 1 results, injuries, morale, deadlines, and the next opponent.');
    expect(allCopy).toContain('Open Owner Promises to make one promise with a deadline; missed promises cut owner patience.');
    expect(allCopy).toContain('Set Contingency Gambit so staff know which call changes when score, clock, or injury conditions turn against you.');
    expect(allCopy).toContain('Open Roster and identify starters, backups, injuries, contracts, and first-month player jobs.');
    expect(allCopy).toContain('Open Game Day to see the score, injuries, turnovers, sacks, and failed drives; missed injuries put unavailable or low-role backups into saved roles.');
    expect(allCopy).toContain('Open Game Day after kickoff to see score, injuries, turnovers, sacks, and failed drives; missed injuries put unavailable or low-role backups into saved roles.');
    expect(allCopy).toContain('Open Inbox and answer messages with deadlines before Advance Week; missed deadlines remove choices.');
    expect(allCopy).toContain('calls that do not fit expose injuries or backup groups without a role');
    expect(allCopy).not.toContain('calls starters cannot handle');
    expect(allCopy).not.toContain('mismatched calls can expose injuries or backup groups without a role');
    expect(allCopy).toContain('unsaved starters leave injured or low-role backups in key jobs');
    expect(allCopy).toContain('assign one weekly training focus; unused focus loses development reps before the next game');
    expect(allCopy).toContain('buying while buried wastes picks, and selling while alive costs a playoff spot');
    expect(allCopy).toContain('assign one scout report; missing role, medical-limit, or coachability info wastes a draft pick');
    expect(allCopy).not.toContain('missing role, medical, or trait info wastes a draft pick');
    expect(allCopy).toContain('open Broadcast for scoring swings, turnovers, injuries, and drive failures before changing Game Plan or Depth Chart.');
    expect(allCopy).toContain('Open Newsroom for injuries, streaks, owner tension, and league moves; open Roster or Game Plan before those alerts lock a starter or call the lineup cannot handle.');
    expect(allCopy).not.toMatch(/wrong calls expose|wrong starter or call|unsupported starter or call/i);
    expect(allCopy).toContain('Open Newsroom threads for injuries, promises, streaks, and breakouts; missed threads leave morale, offers, or prep calls late.');
    expect(allCopy).toContain('When Game Day shows a halftime choice, keep the plan or change second-half calls; that choice changes drive boosts and late-drive penalties.');
    expect(allCopy).not.toContain('Game Day can ask whether');
    expect(allCopy).toContain('set Game Plan counters before coverage, rest, pass depth, or kick choices lock at kickoff.');
    expect(allCopy).not.toMatch(/run\/pass|wrong jobs/i);
    expect(allCopy).toContain('division deficits, and games that affect buy, sell, or hold timing before trade deadlines');
    expect(allCopy).toContain('Open Trade Center to name starter or backup job, cap space, player role, and deal cost before accepting');
    expect(allCopy).toContain('deals without a role spend picks or starters without fixing the lineup');
    expect(allCopy).toContain('Open Franchise Hub to view owner patience, staff effects, and roster timeline');
    expect(allCopy).toContain('owner patience, staff effects, and roster timeline before cap moves block extensions or injury fixes');
    expect(allCopy).not.toMatch(/\bUse\b/);
    expect(allCopy).not.toMatch(/guys you want|simulate Week 1|read what the league|change the story|league context|feel the trust system|weekly bet|postgame story|check the Broadcast|right match|hot takes|league narrative|rivalry heat|legacy|long game|no wrong answers|only your story|Good luck|changing the next plan|matchup risk|standings pressure|owner mood|dynasty window|can affect roster or Game Plan choices|can change morale|choice can swing the result|players who can carry|missed deadlines can remove choices|Open scouting and run one scouting action|record and division position support buying|doctrine effects|drives that explain the result|swing plays|before spending picks or starters|compare offers|review owner patience|weak backups|bad deals|clear messages|name roster need/i);
  });

  it('mutating steps require their explicit action instead of just visiting the screen', () => {
    const game = makeLeagueState('preseason');
    game.tutorialState = createDefaultTutorialState();

    advanceTutorial(game); // roster
    completeTutorialAction(game, 'screen:/roster');
    advanceTutorial(game); // cap
    completeTutorialAction(game, 'screen:/contracts');

    expect(game.tutorialState.currentStepIndex).toBe(3);

    completeTutorialAction(game, 'screen:/depth-chart');
    expect(game.tutorialState.currentStepIndex).toBe(3);

    completeTutorialAction(game, 'depth_chart:update');
    expect(game.tutorialState.currentStepIndex).toBe(4);
  });

  // ── Sprint 43 additions ───────────────────────────────────

  it('createDefaultTutorialState seeds visitedScreens as empty array', () => {
    const tutorial = createDefaultTutorialState();
    expect(tutorial.visitedScreens).toEqual([]);
  });

  it('markScreenVisited appends a screen once and is idempotent', () => {
    const game = makeLeagueState('preseason');
    game.tutorialState = createDefaultTutorialState();

    markScreenVisited(game, '/roster');
    markScreenVisited(game, '/roster');
    markScreenVisited(game, '/contracts');

    expect(game.tutorialState.visitedScreens).toEqual(['/roster', '/contracts']);
  });

  it('isFirstVisit flips after markScreenVisited', () => {
    const game = makeLeagueState('preseason');
    game.tutorialState = createDefaultTutorialState();

    expect(isFirstVisit(game, '/game-plan')).toBe(true);
    markScreenVisited(game, '/game-plan');
    expect(isFirstVisit(game, '/game-plan')).toBe(false);
  });

  it('getWeek1Steps returns exactly the 5 Week 1 step IDs in order', () => {
    const steps = getWeek1Steps();
    expect(steps.map((s) => s.id)).toEqual([...WEEK1_STEP_IDS]);
    expect(steps.every((s) => s.completed === false)).toBe(true);
  });

  it('routes the Week 1 briefing step to the registered home route', () => {
    const game = makeLeagueState('preseason');
    game.tutorialState = {
      ...createDefaultTutorialState(),
      steps: getWeek1Steps(),
      currentStepIndex: 0,
      completedSteps: [],
    };
    const briefingStep = game.tutorialState.steps[0]!;

    expect(briefingStep.id).toBe('week1-briefing');
    expect(briefingStep.targetScreen).toBe('/');
    expect(briefingStep.targetElement).toBe('[data-nav="/"]');

    completeTutorialAction(game, 'screen:/');

    expect(game.tutorialState.completedSteps).toContain('week1-briefing');
    expect(game.tutorialState.currentStepIndex).toBe(1);
  });

  it.each(LAUNCH_STEP_EXPECTATIONS)('contains launch-era step %s', (stepId) => {
    const tutorial = createDefaultTutorialState();

    expect(tutorial.steps.some((step) => step.id === stepId)).toBe(true);
  });

  it.each(LAUNCH_STEP_EXPECTATIONS)('routes launch-era step %s to its source screen', (stepId, targetScreen) => {
    const tutorial = createDefaultTutorialState();
    const step = tutorial.steps.find((candidate) => candidate.id === stepId);

    expect(step?.targetScreen).toBe(targetScreen);
  });

  it.each(LAUNCH_STEP_EXPECTATIONS)('uses nav selector for launch-era step %s', (stepId, _targetScreen, targetElement) => {
    const tutorial = createDefaultTutorialState();
    const step = tutorial.steps.find((candidate) => candidate.id === stepId);

    expect(step?.targetElement).toBe(targetElement);
  });

  it.each(LAUNCH_STEP_EXPECTATIONS)('completes route-driven launch step %s from its screen action', (stepId, targetScreen) => {
    const game = makeLeagueState('preseason');
    game.tutorialState = createDefaultTutorialState();
    const index = game.tutorialState.steps.findIndex((step) => step.id === stepId);
    game.tutorialState.currentStepIndex = index;

    completeTutorialAction(game, `screen:${targetScreen}`);

    expect(game.tutorialState.completedSteps).toContain(stepId);
    expect(game.tutorialState.currentStepIndex).toBe(index + 1);
  });

  it('keeps launch-era tutorial steps in stable narrative order', () => {
    const ids = createDefaultTutorialState().steps.map((step) => step.id);

    expect(ids.indexOf('check_game_plan')).toBeLessThan(ids.indexOf('call_your_shot'));
    expect(ids.indexOf('call_your_shot')).toBeLessThan(ids.indexOf('contingency_gambit'));
    expect(ids.indexOf('review_broadcast')).toBeLessThan(ids.indexOf('review_film_room'));
    expect(ids.indexOf('read_media_cycle')).toBeLessThan(ids.indexOf('track_storyline_threads'));
    expect(ids.indexOf('check_franchise')).toBeLessThan(ids.indexOf('you_are_ready'));
  });
});
