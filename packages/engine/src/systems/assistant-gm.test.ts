import { describe, expect, it } from 'vitest';

import type { StaffMember } from '../types';
import * as engine from '../index';
import { makeLeagueState, makePlayer } from './test-helpers';

type AssistantApi = {
  assignAssistantGM: (game: unknown, teamId: string, seed: number) => any;
  getAGMGreeting: (profile: any, teamName: string) => string;
  agmOnIntelBriefing: (data: unknown, agm: any) => any;
  agmOnRosterOverview: (data: unknown, agm: any) => any;
  agmOnCoachingReview: (data: unknown, agm: any) => any;
  agmOnSchemeSelection: (data: unknown, agm: any) => any;
  agmOnDepthChart: (data: unknown, agm: any) => any;
  agmOnCapStrategy: (data: unknown, agm: any) => any;
  agmOnGoalSelection: (data: unknown, agm: any) => any;
  agmOnBlueprint: (data: unknown, agm: any) => any;
  agmReactsToSchemeChoice: (chosenOffense: string, chosenDefense: string, context: unknown, agm: any) => any;
  agmReactsToGoalChoice: (chosenGoals: string[], context: unknown, agm: any) => any;
  toneAdjust: (baseText: string, personality: string) => string;
  expertiseEmphasis: (phaseId: string, expertise: string) => number;
  getExpertiseInsight: (phaseId: string, phaseData: unknown, agm: any) => any;
};

const assistant = engine as typeof engine & Partial<AssistantApi>;

const MARCUS = {
  id: 'marcus_webb',
  name: 'Marcus Webb',
  background: 'Former cap analyst turned AGM. Cool-headed, data-first, explains cap like a professor.',
  personality: 'analytical',
  expertise: 'cap_management',
  catchphrase: 'The numbers never lie.',
  toneModifiers: { enthusiasm: 0.45, bluntness: 0.65, humor: 0.15 },
};

const COACH_D = {
  id: 'coach_d_hardaway',
  name: "Deion 'Coach D' Hardaway",
  background: 'Former defensive coordinator turned front office exec. Fifteen years in the league.',
  personality: 'fiery',
  expertise: 'defense',
  catchphrase: 'We are NOT giving up easy yards.',
  toneModifiers: { enthusiasm: 0.95, bluntness: 0.85, humor: 0.25 },
};

const SANDRA = {
  id: 'sandra_chen',
  name: 'Sandra Chen',
  background: 'Former scout who can break down any player in ten seconds and lives for the draft.',
  personality: 'player_whisperer',
  expertise: 'personnel',
  catchphrase: 'Trust the tape.',
  toneModifiers: { enthusiasm: 0.6, bluntness: 0.55, humor: 0.1 },
};

const TOMMY = {
  id: 'tommy_obrien',
  name: "Tommy O'Brien",
  background: 'Thirty-year football lifer who believes in running the ball and keeping things grounded.',
  personality: 'old_school',
  expertise: 'offense',
  catchphrase: 'Football is simple. Block, tackle, execute.',
  toneModifiers: { enthusiasm: 0.55, bluntness: 0.75, humor: 0.2 },
};

function enrichStaff(game = makeLeagueState('regular_season', 1)) {
  const team = game.teams.afce1!;

  const hc: StaffMember = {
    id: 'hc-1',
    name: 'Harold Coach',
    role: 'HC',
    archetype: 'strategist',
    traits: [],
    ratings: { gameplan: 88, development: 80, motivation: 76, strategy: 90 },
    level: 6,
    specialty75: null,
    schemeLean: { offense: 'spread', defense: 'cover_3' },
    age: 51,
    term: 4,
    buyoutPenalty: 3,
    loyalty: 7,
    ambition: 5,
    lastHiredYear: 2026,
  };

  const oc: StaffMember = {
    id: 'oc-1',
    name: 'Olivia Offense',
    role: 'OC',
    archetype: 'offensive_minded',
    traits: [],
    ratings: { gameplan: 85, development: 78, motivation: 73, strategy: 84 },
    level: 5,
    specialty75: {
      id: 'pass_arch',
      label: 'Pass Architect',
      icon: 'pass',
      effect: {},
      desc: 'Builds passing attacks.',
    },
    schemeLean: { offense: 'spread', defense: 'cover_3' },
    age: 43,
    term: 3,
    buyoutPenalty: 2,
    loyalty: 6,
    ambition: 6,
    lastHiredYear: 2026,
  };

  const dc: StaffMember = {
    id: 'dc-1',
    name: 'Darius Defense',
    role: 'DC',
    archetype: 'coverage_specialist',
    traits: [],
    ratings: { gameplan: 82, development: 76, motivation: 74, strategy: 83 },
    level: 5,
    specialty75: {
      id: 'cov_spec',
      label: 'Coverage Specialist',
      icon: 'shield',
      effect: {},
      desc: 'Boosts coverage units.',
    },
    schemeLean: { offense: 'spread', defense: 'cover_3' },
    age: 46,
    term: 3,
    buyoutPenalty: 2,
    loyalty: 7,
    ambition: 4,
    lastHiredYear: 2026,
  };

  team.staff = { hc, oc, dc };
  team.coachingStaff = {
    hc: {
      id: hc.id,
      firstName: 'Harold',
      lastName: 'Coach',
      role: 'HC',
      archetype: hc.archetype,
      traits: [],
      skillTree: {},
      xp: 0,
      reputation: 80,
      tenure: 2,
    },
    oc: {
      id: oc.id,
      firstName: 'Olivia',
      lastName: 'Offense',
      role: 'OC',
      archetype: oc.archetype,
      traits: [],
      skillTree: {},
      xp: 0,
      reputation: 76,
      tenure: 2,
    },
    dc: {
      id: dc.id,
      firstName: 'Darius',
      lastName: 'Defense',
      role: 'DC',
      archetype: dc.archetype,
      traits: [],
      skillTree: {},
      xp: 0,
      reputation: 77,
      tenure: 2,
    },
  };

  return game;
}

function addBattleAndInjury(game = enrichStaff()) {
  const team = game.teams.afce1!;
  const qb2 = makePlayer('afce1-qb2', 'afce1', 'QB', 90, false);
  qb2.age = 23;
  qb2.pot = 94;
  qb2.ratings = {
    awareness: 90,
    accuracy: 92,
    speed: 88,
    decisionSpeed: 90,
    arm: 89,
  };

  const wr3 = makePlayer('afce1-wr3', 'afce1', 'WR', 84, false);
  wr3.age = 24;
  wr3.pot = 91;
  wr3.ratings = {
    routeRunning: 93,
    speed: 91,
    catching: 88,
    awareness: 80,
  };

  const wr4 = makePlayer('afce1-wr4', 'afce1', 'WR', 83, false);
  wr4.age = 28;
  wr4.ratings = {
    runBlock: 94,
    toughness: 92,
    catching: 74,
    routeRunning: 66,
    speed: 67,
  };

  const cb2 = makePlayer('afce1-cb2', 'afce1', 'CB', 72, false);
  cb2.age = 25;
  cb2.ratings = {
    manCoverage: 54,
    zoneCoverage: 77,
    pressAbility: 48,
    speed: 66,
    ballSkills: 60,
  };

  team.roster.push(qb2, wr3, wr4, cb2);
  game.players[qb2.id] = qb2;
  game.players[wr3.id] = wr3;
  game.players[wr4.id] = wr4;
  game.players[cb2.id] = cb2;

  team.roster.find((player) => player.id === 'afce1-wr2')!.careerStats.previousSeasonOvr = 80;
  team.roster.find((player) => player.id === 'afce1-te')!.injury = {
    id: 'inj-1',
    type: 'hamstring',
    severity: 'out',
    severityTier: 'moderate',
    gamesOut: 3,
    gamesRecovered: 0,
    reinjuryRisk: 20,
    affectedRatings: ['speed'],
    ratingPenalty: -4,
    onIR: false,
  };

  return game;
}

function noStarGame(game = addBattleAndInjury()) {
  const team = game.teams.afce1!;
  for (const player of team.roster) {
    player.ovr = Math.min(player.ovr, 84);
    player.pot = Math.min(player.pot, player.ovr);
    player.age = Math.max(player.age, 28);
    player.careerStats.previousSeasonOvr = player.ovr;
  }

  return game;
}

function capCrunchGame(game = enrichStaff()) {
  const team = game.teams.afce1!;
  team.capSpace = 2;
  team.capUsed = 268;
  team.deadCap = 24;
  team.deadCapByYear = { 2027: 14, 2028: 12 };
  team.owner.archetypeId = 'profit_first';

  const overpriced = team.roster.find((player) => player.id === 'afce1-rb')!;
  overpriced.ovr = 81;
  overpriced.contract!.years = 3;
  overpriced.contract!.baseSalary = 18.5;
  overpriced.contract!.totalValue = 55.5;
  overpriced.contract!.yearlyBreakdown = overpriced.contract!.yearlyBreakdown.map((entry, index) => ({
    ...entry,
    baseSalary: index === 0 ? 18.5 : 18,
    capHit: index === 0 ? 18.5 : 18,
  }));

  return game;
}

function requiredFunction<K extends keyof AssistantApi>(name: K): AssistantApi[K] {
  const fn = assistant[name];
  expect(typeof fn).toBe('function');
  return fn as AssistantApi[K];
}

function expectDialogue(dialogue: any, phaseId: string) {
  expect(dialogue.phaseId).toBe(phaseId);
  expect(typeof dialogue.intro).toBe('string');
  expect(dialogue.intro.length).toBeGreaterThan(20);
  expect(Array.isArray(dialogue.insights)).toBe(true);
  expect(dialogue.insights.length).toBeGreaterThanOrEqual(2);
  expect(dialogue.insights.length).toBeLessThanOrEqual(4);
  for (const insight of dialogue.insights) {
    expect(['strength', 'concern', 'opportunity', 'warning']).toContain(insight.category);
    expect(typeof insight.text).toBe('string');
    expect(insight.text.length).toBeGreaterThan(10);
  }
  expect(typeof dialogue.closingRemark).toBe('string');
  expect(dialogue.closingRemark.length).toBeGreaterThan(10);
  expect(['confident', 'concerned', 'excited', 'measured']).toContain(dialogue.tone);
}

describe('assistant gm exports', () => {
  it('exports the Sprint 33 assistant gm API from the engine barrel', () => {
    expect(typeof assistant.assignAssistantGM).toBe('function');
    expect(typeof assistant.getAGMGreeting).toBe('function');
    expect(typeof assistant.agmOnIntelBriefing).toBe('function');
    expect(typeof assistant.agmOnRosterOverview).toBe('function');
    expect(typeof assistant.agmOnCoachingReview).toBe('function');
    expect(typeof assistant.agmOnSchemeSelection).toBe('function');
    expect(typeof assistant.agmOnDepthChart).toBe('function');
    expect(typeof assistant.agmOnCapStrategy).toBe('function');
    expect(typeof assistant.agmOnGoalSelection).toBe('function');
    expect(typeof assistant.agmOnBlueprint).toBe('function');
    expect(typeof assistant.agmReactsToSchemeChoice).toBe('function');
    expect(typeof assistant.agmReactsToGoalChoice).toBe('function');
    expect(typeof assistant.toneAdjust).toBe('function');
    expect(typeof assistant.expertiseEmphasis).toBe('function');
    expect(typeof assistant.getExpertiseInsight).toBe('function');
  });
});

describe('assistant gm assignment and helpers', () => {
  it('assigns a valid preset profile for any seed', () => {
    const assignAssistantGM = requiredFunction('assignAssistantGM');
    const profile = assignAssistantGM(addBattleAndInjury(), 'afce1', 17);

    expect(['marcus_webb', 'coach_d_hardaway', 'sandra_chen', 'tommy_obrien']).toContain(profile.id);
    expect(profile.name.length).toBeGreaterThan(5);
    expect(profile.catchphrase.length).toBeGreaterThan(5);
  });

  it('assigns the same AGM for the same game, team, and seed', () => {
    const assignAssistantGM = requiredFunction('assignAssistantGM');
    const game = capCrunchGame();

    expect(assignAssistantGM(game, 'afce1', 7)).toEqual(assignAssistantGM(game, 'afce1', 7));
  });

  it('shows variety across seeds while remaining within the four presets', () => {
    const assignAssistantGM = requiredFunction('assignAssistantGM');
    const ids = new Set<string>();
    const game = addBattleAndInjury();

    for (let seed = 1; seed <= 10; seed += 1) {
      ids.add(assignAssistantGM(game, 'afce1', seed).id);
    }

    expect(ids.size).toBeGreaterThanOrEqual(2);
    expect(ids.size).toBeLessThanOrEqual(4);
  });

  it('builds personality-specific greetings that include the team name', () => {
    const getAGMGreeting = requiredFunction('getAGMGreeting');

    const marcusGreeting = getAGMGreeting(MARCUS, 'BBQ Fountains');
    const coachDGreeting = getAGMGreeting(COACH_D, 'BBQ Fountains');

    expect(marcusGreeting).toContain('BBQ Fountains');
    expect(coachDGreeting).toContain('BBQ Fountains');
    expect(marcusGreeting).not.toEqual(coachDGreeting);
  });

  it('returns the expected expertise emphasis weights', () => {
    const expertiseEmphasis = requiredFunction('expertiseEmphasis');

    expect(expertiseEmphasis('cap_strategy', 'cap_management')).toBe(2);
    expect(expertiseEmphasis('set_goals', 'cap_management')).toBe(1);
    expect(expertiseEmphasis('set_scheme', 'defense')).toBe(2);
    expect(expertiseEmphasis('meet_roster', 'personnel')).toBe(2);
    expect(expertiseEmphasis('blueprint', 'offense')).toBe(0);
  });

  it('returns null for a non-matching expertise deep dive', () => {
    const getExpertiseInsight = requiredFunction('getExpertiseInsight');
    const intel = engine.generateIntelBriefing(addBattleAndInjury(), 'afce1');

    expect(getExpertiseInsight('intel_briefing', intel, TOMMY)).toBeNull();
  });

  it('returns a concrete insight for a matching expertise phase', () => {
    const getExpertiseInsight = requiredFunction('getExpertiseInsight');
    const cap = engine.generateCapBriefing(capCrunchGame(), 'afce1');
    const insight = getExpertiseInsight('cap_strategy', cap, MARCUS);

    expect(insight).not.toBeNull();
    expect(['strength', 'concern', 'opportunity', 'warning']).toContain(insight.category);
    expect(typeof insight.text).toBe('string');
    expect(insight.text.length).toBeGreaterThan(10);
  });
});

describe('assistant gm phase dialogue', () => {
  it('builds an intel briefing dialogue with real team context', () => {
    const agmOnIntelBriefing = requiredFunction('agmOnIntelBriefing');
    const intel = engine.generateIntelBriefing(addBattleAndInjury(), 'afce1');
    const dialogue = agmOnIntelBriefing(intel, COACH_D);

    expectDialogue(dialogue, 'intel_briefing');
    expect(dialogue.intro).toContain(intel.windowPhase);
  });

  it('builds a roster overview dialogue that names current stars', () => {
    const agmOnRosterOverview = requiredFunction('agmOnRosterOverview');
    const roster = engine.generateRosterOverview(addBattleAndInjury(), 'afce1');
    const dialogue = agmOnRosterOverview(roster, SANDRA);

    expectDialogue(dialogue, 'meet_roster');
    expect(dialogue.recommendation).toContain(roster.starPlayers[0]!.name);
  });

  it('does not invent star players when the roster has none', () => {
    const agmOnRosterOverview = requiredFunction('agmOnRosterOverview');
    const roster = engine.generateRosterOverview(noStarGame(), 'afce1');
    const dialogue = agmOnRosterOverview(roster, SANDRA);

    expectDialogue(dialogue, 'meet_roster');
    expect(roster.starPlayers).toHaveLength(0);
    expect(dialogue.intro).not.toContain('undefined');
    expect(dialogue.insights.join(' ')).not.toContain('undefined');
  });

  it('builds a coaching review dialogue even when staff spots are vacant', () => {
    const agmOnCoachingReview = requiredFunction('agmOnCoachingReview');
    const review = engine.generateCoachingReview(makeLeagueState('regular_season', 1), 'afce1');
    const dialogue = agmOnCoachingReview(review, TOMMY);

    expectDialogue(dialogue, 'coaching_review');
    expect(dialogue.intro.toLowerCase()).toContain('coach');
  });

  it('builds a scheme recommendation dialogue that references the best-fit schemes', () => {
    const agmOnSchemeSelection = requiredFunction('agmOnSchemeSelection');
    const context = engine.generateSchemeContext(addBattleAndInjury(), 'afce1');
    const dialogue = agmOnSchemeSelection(context, MARCUS);

    expectDialogue(dialogue, 'set_scheme');
    expect(dialogue.recommendation).toContain(context.offenseOptions[0]!.label);
    expect(dialogue.recommendation).toContain(context.defenseOptions[0]!.label);
  });

  it('builds a depth chart dialogue that mentions active battles', () => {
    const agmOnDepthChart = requiredFunction('agmOnDepthChart');
    const context = engine.generateDepthChartContext(addBattleAndInjury(), 'afce1', { off: 'spread', def: 'cover_3' });
    const dialogue = agmOnDepthChart(context, SANDRA);

    expectDialogue(dialogue, 'depth_chart');
    expect(context.activeBattles.length).toBeGreaterThan(0);
  });

  it('builds a cap strategy dialogue with contract-specific analysis', () => {
    const agmOnCapStrategy = requiredFunction('agmOnCapStrategy');
    const cap = engine.generateCapBriefing(capCrunchGame(), 'afce1');
    const dialogue = agmOnCapStrategy(cap, MARCUS);

    expectDialogue(dialogue, 'cap_strategy');
    expect(dialogue.insights.some((insight: any) => typeof insight.dataPoint === 'string' && insight.dataPoint.includes('$'))).toBe(true);
  });

  it('builds a goal selection dialogue that names the recommended goals', () => {
    const agmOnGoalSelection = requiredFunction('agmOnGoalSelection');
    const goals = engine.generateGoalContext(capCrunchGame(), 'afce1');
    const dialogue = agmOnGoalSelection(goals, TOMMY);

    expectDialogue(dialogue, 'set_goals');
    expect(goals.recommendedGoals).toHaveLength(3);
    expect(dialogue.recommendation).toContain(goals.recommendedGoals[0]!.label);
  });

  it('builds a blueprint closer that references the chosen plan', () => {
    const agmOnBlueprint = requiredFunction('agmOnBlueprint');
    const blueprint = engine.generateBlueprint(addBattleAndInjury(), 'afce1', {
      offenseScheme: 'spread',
      defenseScheme: 'cover_3',
      seasonGoals: ['playoff_berth', 'draft_well', 'winning_record'],
      depthChartOverrides: {},
      acknowledged: ['intel_briefing', 'meet_roster', 'coaching_review', 'depth_chart', 'cap_strategy', 'blueprint'],
    });
    const dialogue = agmOnBlueprint(blueprint, COACH_D);

    expectDialogue(dialogue, 'blueprint');
    expect(['confident', 'excited']).toContain(dialogue.tone);
    expect(dialogue.intro).toContain(blueprint.selectedSchemes.offenseLabel);
  });

  it('adds extra insights on expertise-matched phases without exceeding four total', () => {
    const agmOnCapStrategy = requiredFunction('agmOnCapStrategy');
    const cap = engine.generateCapBriefing(capCrunchGame(), 'afce1');
    const marcusDialogue = agmOnCapStrategy(cap, MARCUS);
    const tommyDialogue = agmOnCapStrategy(cap, TOMMY);

    expect(marcusDialogue.insights.length).toBeGreaterThanOrEqual(tommyDialogue.insights.length);
    expect(marcusDialogue.insights.length).toBeLessThanOrEqual(4);
  });
});

describe('assistant gm reactions', () => {
  it('loves the top recommended scheme pairing', () => {
    const agmReactsToSchemeChoice = requiredFunction('agmReactsToSchemeChoice');
    const context = engine.generateSchemeContext(addBattleAndInjury(), 'afce1');
    const reaction = agmReactsToSchemeChoice(
      context.offenseOptions[0]!.schemeId,
      context.defenseOptions[0]!.schemeId,
      context,
      COACH_D,
    );

    expect(reaction.sentiment).toBe('love_it');
    expect(reaction.reaction.length).toBeGreaterThan(10);
  });

  it('raises concern or disagreement on the worst-fit scheme pairing', () => {
    const agmReactsToSchemeChoice = requiredFunction('agmReactsToSchemeChoice');
    const context = engine.generateSchemeContext(addBattleAndInjury(), 'afce1');
    const reaction = agmReactsToSchemeChoice(
      context.offenseOptions.at(-1)!.schemeId,
      context.defenseOptions.at(-1)!.schemeId,
      context,
      MARCUS,
    );

    expect(['concerned', 'disagree']).toContain(reaction.sentiment);
    expect(reaction.reaction.length).toBeGreaterThan(10);
  });

  it('scores goal choices by overlap with the recommended list', () => {
    const agmReactsToGoalChoice = requiredFunction('agmReactsToGoalChoice');
    const context = engine.generateGoalContext(capCrunchGame(), 'afce1');
    const recommended = context.recommendedGoals.map((goal) => goal.id);
    const oneMatch = [recommended[0]!, context.availableGoals.find((goal) => !recommended.includes(goal.id))!.id, context.availableGoals.findLast((goal) => !recommended.includes(goal.id))!.id];
    const noneMatch = context.availableGoals.filter((goal) => !recommended.includes(goal.id)).slice(0, 3).map((goal) => goal.id);

    expect(agmReactsToGoalChoice(recommended, context, TOMMY).sentiment).toBe('love_it');
    expect(agmReactsToGoalChoice(recommended.slice(0, 2).concat([noneMatch[0]!]), context, TOMMY).sentiment).toBe('like_it');
    expect(agmReactsToGoalChoice(oneMatch, context, TOMMY).sentiment).toBe('concerned');
    expect(agmReactsToGoalChoice(noneMatch, context, TOMMY).sentiment).toBe('disagree');
  });
});
