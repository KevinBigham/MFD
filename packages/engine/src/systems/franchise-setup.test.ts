import { describe, expect, it } from 'vitest';

import type { StaffMember } from '../types';
import {
  PHASE_ORDER,
  advanceSetupPhase,
  applySetupDecision,
  createSetupState,
  finalizeSetup,
  generateBlueprint,
  generateCapBriefing,
  generateCoachingReview,
  generateDepthChartContext,
  generateGoalContext,
  generateIntelBriefing,
  generateRosterOverview,
  generateSchemeContext,
  goBackSetupPhase,
  getPhaseRequirements,
  isPhaseComplete,
} from '../index';
import { makeLeagueState, makePlayer } from './test-helpers';

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

  team.roster.push(qb2, wr3, wr4);
  game.players[qb2.id] = qb2;
  game.players[wr3.id] = wr3;
  game.players[wr4.id] = wr4;

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

function hireAgmSetupState(agmProfileId = 'marcus_webb') {
  return advanceSetupPhase(applySetupDecision(createSetupState(), {
    agmProfileId,
  }));
}

function hireCoachAndScoutSetupState() {
  let state = hireAgmSetupState();
  for (const phase of ['intel_briefing', 'meet_roster'] as const) {
    state = applySetupDecision(state, {
      acknowledged: [...state.decisions.acknowledged, phase],
    });
    state = advanceSetupPhase(state);
  }

  state = applySetupDecision(state, {
    headCoachId: 'elias_rowe',
  } as any);
  state = advanceSetupPhase(state);
  state = applySetupDecision(state, {
    scoutingDirectorId: 'zoe_wilcox',
  } as any);
  state = advanceSetupPhase(state);
  return state;
}

describe('franchise setup lifecycle', () => {
  it('starts at choose agm with blank decisions', () => {
    const state = createSetupState();

    expect(PHASE_ORDER).toEqual([
      'choose_agm',
      'intel_briefing',
      'meet_roster',
      'hire_coach',
      'hire_scout',
      'set_scheme',
      'depth_chart',
      'cap_strategy',
      'set_goals',
      'blueprint',
    ]);
    expect(PHASE_ORDER).toHaveLength(10);
    expect(PHASE_ORDER[0]).toBe('choose_agm');
    expect(state.currentPhase).toBe('choose_agm');
    expect(state.completedPhases).toEqual([]);
    expect(state.decisions.offenseScheme).toBeNull();
    expect(state.decisions.defenseScheme).toBeNull();
    expect(state.decisions.seasonGoals).toEqual([]);
    expect(state.decisions.depthChartOverrides).toEqual({});
    expect(state.decisions.acknowledged).toEqual([]);
    expect(state.decisions.agmProfileId).toBeNull();
    expect((state.decisions as any).headCoachId).toBeNull();
    expect((state.decisions as any).scoutingDirectorId).toBeNull();
    expect(state.blueprint).toBeNull();
  });

  it('returns fixed phase requirements', () => {
    expect(getPhaseRequirements('choose_agm')).toEqual({
      requiresDecision: true,
      decisionFields: ['agmProfileId'],
    });
    expect(getPhaseRequirements('intel_briefing')).toEqual({
      requiresDecision: false,
      decisionFields: ['acknowledged'],
    });
    expect(getPhaseRequirements('hire_coach')).toEqual({
      requiresDecision: true,
      decisionFields: ['headCoachId'],
    });
    expect(getPhaseRequirements('hire_scout')).toEqual({
      requiresDecision: true,
      decisionFields: ['scoutingDirectorId'],
    });
    expect(getPhaseRequirements('set_scheme')).toEqual({
      requiresDecision: true,
      decisionFields: ['offenseScheme', 'defenseScheme'],
    });
    expect(getPhaseRequirements('set_goals')).toEqual({
      requiresDecision: true,
      decisionFields: ['seasonGoals'],
    });
    expect(getPhaseRequirements('blueprint')).toEqual({
      requiresDecision: false,
      decisionFields: ['acknowledged'],
    });
  });

  it('requires acknowledgement before advancing read-only phases', () => {
    const state = createSetupState();

    expect(isPhaseComplete(state, 'choose_agm')).toBe(false);
    expect(() => advanceSetupPhase(state)).toThrow(/choose_agm/i);

    const hired = applySetupDecision(state, {
      agmProfileId: 'marcus_webb',
    });

    expect(isPhaseComplete(hired, 'choose_agm')).toBe(true);
    expect(advanceSetupPhase(hired).currentPhase).toBe('intel_briefing');
  });

  it('requires acknowledgement before advancing read-only phases after AGM selection', () => {
    const state = hireAgmSetupState();

    expect(isPhaseComplete(state, 'intel_briefing')).toBe(false);
    expect(() => advanceSetupPhase(state)).toThrow(/intel_briefing/i);

    const acknowledged = applySetupDecision(state, {
      acknowledged: ['intel_briefing'],
    });

    expect(isPhaseComplete(acknowledged, 'intel_briefing')).toBe(true);
    expect(advanceSetupPhase(acknowledged).currentPhase).toBe('meet_roster');
  });

  it('requires both schemes before leaving set scheme', () => {
    let state = hireAgmSetupState();
    for (const phase of ['intel_briefing', 'meet_roster'] as const) {
      state = applySetupDecision(state, {
        acknowledged: [...state.decisions.acknowledged, phase],
      });
      state = advanceSetupPhase(state);
    }
    state = applySetupDecision(state, { headCoachId: 'elias_rowe' } as any);
    state = advanceSetupPhase(state);
    state = applySetupDecision(state, { scoutingDirectorId: 'zoe_wilcox' } as any);
    state = advanceSetupPhase(state);

    expect(state.currentPhase).toBe('set_scheme');
    expect(isPhaseComplete(state, 'set_scheme')).toBe(true);
    expect(state.decisions.offenseScheme).toBe('west_coast');
    expect(state.decisions.defenseScheme).toBe('cover_3');

    const partial = applySetupDecision(state, { defenseScheme: null });
    expect(isPhaseComplete(partial, 'set_scheme')).toBe(false);

    const complete = applySetupDecision(partial, { defenseScheme: 'cover_3' });
    expect(isPhaseComplete(complete, 'set_scheme')).toBe(true);
  });

  it('requires exactly three goals before leaving set goals', () => {
    const game = enrichStaff();
    const context = generateGoalContext(game, 'afce1');
    let state = hireCoachAndScoutSetupState();

    state = applySetupDecision(state, {
      offenseScheme: 'spread',
      defenseScheme: 'cover_3',
    });
    state = advanceSetupPhase(state);
    state = applySetupDecision(state, {
      acknowledged: [...state.decisions.acknowledged, 'depth_chart'],
    });
    state = advanceSetupPhase(state);
    state = applySetupDecision(state, {
      acknowledged: [...state.decisions.acknowledged, 'cap_strategy'],
    });
    state = advanceSetupPhase(state);

    expect(state.currentPhase).toBe('set_goals');
    state = applySetupDecision(state, {
      seasonGoals: context.recommendedGoals.slice(0, 2).map((goal) => goal.id),
    });
    expect(isPhaseComplete(state, 'set_goals')).toBe(false);

    state = applySetupDecision(state, {
      seasonGoals: context.recommendedGoals.slice(0, 3).map((goal) => goal.id),
    });
    expect(isPhaseComplete(state, 'set_goals')).toBe(true);
  });

  it('goes back one phase without mutating choices', () => {
    const state = applySetupDecision(hireAgmSetupState(), {
      acknowledged: ['intel_briefing'],
    });
    const advanced = advanceSetupPhase(state);
    const returned = goBackSetupPhase(advanced);

    expect(advanced.currentPhase).toBe('meet_roster');
    expect(returned.currentPhase).toBe('intel_briefing');
    expect(returned.decisions.acknowledged).toEqual(['intel_briefing']);
  });

  it('invalidates downstream completion when a scheme changes', () => {
    let state = hireCoachAndScoutSetupState();
    state = applySetupDecision(state, {
      offenseScheme: 'spread',
      defenseScheme: 'cover_3',
    });
    state = advanceSetupPhase(state);
    state = applySetupDecision(state, {
      acknowledged: [...state.decisions.acknowledged, 'depth_chart'],
    });
    state = advanceSetupPhase(state);
    state = applySetupDecision(state, {
      acknowledged: [...state.decisions.acknowledged, 'cap_strategy'],
    });
    state = advanceSetupPhase(state);

    const invalidated = applySetupDecision(state, { offenseScheme: 'air_raid' });

    expect(invalidated.currentPhase).toBe('depth_chart');
    expect(invalidated.completedPhases).toEqual([
      'choose_agm',
      'intel_briefing',
      'meet_roster',
      'hire_coach',
      'hire_scout',
      'set_scheme',
    ]);
    expect(invalidated.blueprint).toBeNull();
  });

  it('carries AGM metadata through setup decisions without invalidating progress', () => {
    let state = hireCoachAndScoutSetupState();

    const updated = applySetupDecision(state, {
      agmProfileId: 'marcus_webb',
      agmClosingWords: 'The data says this plan gives us the best shot.',
    } as any);

    expect(updated.currentPhase).toBe(state.currentPhase);
    expect(updated.completedPhases).toEqual(state.completedPhases);
    expect((updated.decisions as any).agmProfileId).toBe('marcus_webb');
    expect((updated.decisions as any).agmClosingWords).toContain('best shot');
  });

  it('requires an explicit coach selection before leaving hire coach', () => {
    let state = hireAgmSetupState();
    for (const phase of ['intel_briefing', 'meet_roster'] as const) {
      state = applySetupDecision(state, {
        acknowledged: [...state.decisions.acknowledged, phase],
      });
      state = advanceSetupPhase(state);
    }

    expect(state.currentPhase).toBe('hire_coach');
    expect(isPhaseComplete(state, 'hire_coach')).toBe(false);

    const updated = applySetupDecision(state, {
      headCoachId: 'elias_rowe',
    } as any);

    expect(isPhaseComplete(updated, 'hire_coach')).toBe(true);
  });

  it('requires an explicit scouting director selection before leaving hire scout', () => {
    let state = hireAgmSetupState();
    for (const phase of ['intel_briefing', 'meet_roster'] as const) {
      state = applySetupDecision(state, {
        acknowledged: [...state.decisions.acknowledged, phase],
      });
      state = advanceSetupPhase(state);
    }
    state = applySetupDecision(state, {
      headCoachId: 'elias_rowe',
    } as any);
    state = advanceSetupPhase(state);

    expect(state.currentPhase).toBe('hire_scout');
    expect(isPhaseComplete(state, 'hire_scout')).toBe(false);

    const updated = applySetupDecision(state, {
      scoutingDirectorId: 'zoe_wilcox',
    } as any);

    expect(isPhaseComplete(updated, 'hire_scout')).toBe(true);
  });
});

describe('franchise setup integration', () => {
  it('builds a blueprint and finalizes a completed setup', () => {
    const game = enrichStaff();
    const team = game.teams.afce1!;
    const schemeContext = generateSchemeContext(game, team.id);
    const goalContext = generateGoalContext(game, team.id);
    const intel = generateIntelBriefing(game, team.id);
    let state = hireCoachAndScoutSetupState();

    state = applySetupDecision(state, {
      offenseScheme: schemeContext.offenseOptions[0]!.schemeId,
      defenseScheme: schemeContext.defenseOptions[0]!.schemeId,
    });
    state = advanceSetupPhase(state);
    state = applySetupDecision(state, {
      acknowledged: [...state.decisions.acknowledged, 'depth_chart'],
    });
    state = advanceSetupPhase(state);
    state = applySetupDecision(state, {
      acknowledged: [...state.decisions.acknowledged, 'cap_strategy'],
    });
    state = advanceSetupPhase(state);
    state = applySetupDecision(state, {
      seasonGoals: goalContext.recommendedGoals.slice(0, 3).map((goal) => goal.id),
    });
    state = advanceSetupPhase(state);
    state = applySetupDecision(state, {
      acknowledged: [...state.decisions.acknowledged, 'blueprint'],
    });

    const blueprint = generateBlueprint(game, team.id, state.decisions);
    expect(blueprint.teamName).toContain(team.name);
    expect(blueprint.windowPhase).toBe(intel.windowPhase);
    expect(blueprint.seasonGoals).toHaveLength(3);
    expect(blueprint.blueprintNarrative).toContain(String(game.year));

    const finalized = finalizeSetup(game, team.id, {
      ...state,
      blueprint,
    });

    expect(finalized).not.toBe(game);
    expect(finalized.teams[team.id]!.schemeOff).toBe(state.decisions.offenseScheme);
    expect(finalized.teams[team.id]!.schemeDef).toBe(state.decisions.defenseScheme);
    expect(finalized.teams[team.id]!.staff.hc?.id).toBe((state.decisions as any).headCoachId);
    expect(finalized.teams[team.id]!.coachingStaff.hc?.id).toBe((state.decisions as any).headCoachId);
    expect(finalized.scoutingDepartment.scouts).toHaveLength(3);
    expect(finalized.franchiseBlueprint?.teamName).toContain(team.name);
    expect(finalized.setupState?.blueprint?.teamName).toContain(team.name);
    expect(finalized.owners[team.ownerId]!.goals.floor).toBeTruthy();
    expect(finalized.owners[team.ownerId]!.goals.target).toBeTruthy();
    expect(finalized.owners[team.ownerId]!.goals.ceiling).toBeTruthy();
  });

  it('rejects finalize when required decisions are missing', () => {
    const game = enrichStaff();
    const state = createSetupState();

    expect(() => finalizeSetup(game, 'afce1', state)).toThrow(/choose_agm/i);
  });

  it('applies depth chart overrides and mirrors them into game players', () => {
    const game = addBattleAndInjury();
    const team = game.teams.afce1!;
    const schemeContext = generateSchemeContext(game, team.id);
    const goalContext = generateGoalContext(game, team.id);
    let state = hireCoachAndScoutSetupState();

    state = applySetupDecision(state, {
      offenseScheme: schemeContext.offenseOptions[0]!.schemeId,
      defenseScheme: schemeContext.defenseOptions[0]!.schemeId,
    });
    state = advanceSetupPhase(state);
    state = applySetupDecision(state, {
      acknowledged: [...state.decisions.acknowledged, 'depth_chart'],
      depthChartOverrides: {
        QB: ['afce1-qb2'],
      },
    });
    state = advanceSetupPhase(state);
    state = applySetupDecision(state, {
      acknowledged: [...state.decisions.acknowledged, 'cap_strategy'],
    });
    state = advanceSetupPhase(state);
    state = applySetupDecision(state, {
      seasonGoals: goalContext.recommendedGoals.slice(0, 3).map((goal) => goal.id),
      acknowledged: [...state.decisions.acknowledged, 'blueprint'],
    });
    state = advanceSetupPhase(state);

    const finalized = finalizeSetup(game, team.id, state);

    expect(finalized.teams[team.id]!.roster.find((player) => player.id === 'afce1-qb2')!.isStarter).toBe(true);
    expect(finalized.teams[team.id]!.roster.find((player) => player.id === 'afce1-qb')!.isStarter).toBe(false);
    expect(finalized.players['afce1-qb2']!.isStarter).toBe(true);
    expect(finalized.players['afce1-qb']!.isStarter).toBe(false);
  });

  it('persists AGM metadata into the blueprint and finalized setup state', () => {
    const game = enrichStaff();
    const team = game.teams.afce1!;
    const schemeContext = generateSchemeContext(game, team.id);
    const goalContext = generateGoalContext(game, team.id);
    let state = hireCoachAndScoutSetupState();

    state = applySetupDecision(state, {
      offenseScheme: schemeContext.offenseOptions[0]!.schemeId,
      defenseScheme: schemeContext.defenseOptions[0]!.schemeId,
    });
    state = advanceSetupPhase(state);
    state = applySetupDecision(state, {
      acknowledged: [...state.decisions.acknowledged, 'depth_chart'],
    });
    state = advanceSetupPhase(state);
    state = applySetupDecision(state, {
      acknowledged: [...state.decisions.acknowledged, 'cap_strategy'],
    });
    state = advanceSetupPhase(state);
    state = applySetupDecision(state, {
      seasonGoals: goalContext.recommendedGoals.slice(0, 3).map((goal) => goal.id),
      agmProfileId: 'coach_d_hardaway',
      agmClosingWords: 'This is OUR year, Coach.',
    } as any);
    state = advanceSetupPhase(state);
    state = applySetupDecision(state, {
      acknowledged: [...state.decisions.acknowledged, 'blueprint'],
    });

    const blueprint = generateBlueprint(game, team.id, state.decisions as any);

    expect((blueprint as any).agmProfileId).toBe('coach_d_hardaway');
    expect((blueprint as any).agmClosingWords).toContain('OUR year');

    const finalized = finalizeSetup(game, team.id, {
      ...state,
      blueprint,
    });

    expect((finalized.franchiseBlueprint as any)?.agmProfileId).toBe('coach_d_hardaway');
    expect((finalized.franchiseBlueprint as any)?.agmClosingWords).toContain('OUR year');
    expect((finalized.setupState?.blueprint as any)?.agmProfileId).toBe('coach_d_hardaway');
  });
});

describe('franchise setup generators', () => {
  it('builds a populated intel briefing', () => {
    const game = enrichStaff();
    const intel = generateIntelBriefing(game, 'afce1');

    expect(intel.windowPhase).toBeTruthy();
    expect(intel.windowScore).toBeGreaterThanOrEqual(0);
    expect(intel.capGrade).toMatch(/[A-F]/);
    expect(intel.capSpace).toBeGreaterThan(0);
    expect(intel.rosterOverall).toBeGreaterThan(0);
    expect(intel.leagueRank).toBeGreaterThan(0);
    expect(intel.criticalNeeds).toHaveLength(3);
    expect(intel.strengths).toHaveLength(3);
    expect(intel.overallAssessment.length).toBeGreaterThan(30);
  });

  it('builds roster overview with stars, battles, breakouts, and injuries', () => {
    const game = addBattleAndInjury();
    const overview = generateRosterOverview(game, 'afce1');

    expect(overview.starPlayers.length).toBeGreaterThan(0);
    expect(overview.starPlayers[0]!.ovr).toBeGreaterThanOrEqual(85);
    expect(overview.risingStars.some((player) => player.playerId === 'afce1-wr2')).toBe(true);
    expect(overview.positionBattles.some((battle) => battle.pos === 'QB')).toBe(true);
    expect(overview.weakestStarters).toHaveLength(3);
    expect(overview.rosterSize).toBe(game.teams.afce1!.roster.length);
    expect(overview.injuredPlayers).toHaveLength(1);
    expect(overview.injuredPlayers[0]!.playerId).toBe('afce1-te');
  });

  it('handles missing staff in coaching review with vacancy fallbacks', () => {
    const review = generateCoachingReview(makeLeagueState('regular_season', 1), 'afce1');

    expect(review.headCoach.vacant).toBe(true);
    expect(review.coordinators.every((coach) => coach.vacant)).toBe(true);
    expect(review.coachingPhilosophy.length).toBeGreaterThan(20);
    expect(review.schemeRecommendation.offenseSchemeId).toBeTruthy();
    expect(review.schemeRecommendation.defenseSchemeId).toBeTruthy();
  });

  it('sorts scheme options and marks exactly one recommended option per side', () => {
    const game = addBattleAndInjury();
    const context = generateSchemeContext(game, 'afce1');

    expect(context.offenseOptions).toHaveLength(5);
    expect(context.defenseOptions).toHaveLength(5);
    expect(context.offenseOptions.filter((option) => option.recommended)).toHaveLength(1);
    expect(context.defenseOptions.filter((option) => option.recommended)).toHaveLength(1);
    expect(context.offenseOptions[0]!.recommendationScore).toBeGreaterThanOrEqual(context.offenseOptions[1]!.recommendationScore);
    expect(context.defenseOptions[0]!.recommendationScore).toBeGreaterThanOrEqual(context.defenseOptions[1]!.recommendationScore);
  });

  it('changes depth chart recommendations when the selected scheme changes', () => {
    const game = addBattleAndInjury();
    const spread = generateDepthChartContext(game, 'afce1', { off: 'spread', def: 'cover_3' });
    const power = generateDepthChartContext(game, 'afce1', { off: 'power_run', def: 'cover_3' });
    const spreadReceivers = spread.positionGroups.find((group) => group.position === 'WR')!.players;
    const powerReceivers = power.positionGroups.find((group) => group.position === 'WR')!.players;
    const spreadWr3 = spreadReceivers.find((player) => player.playerId === 'afce1-wr3')!;
    const spreadWr4 = spreadReceivers.find((player) => player.playerId === 'afce1-wr4')!;
    const powerWr3 = powerReceivers.find((player) => player.playerId === 'afce1-wr3')!;
    const powerWr4 = powerReceivers.find((player) => player.playerId === 'afce1-wr4')!;

    expect(spreadWr3.fitScore).toBeGreaterThan(spreadWr4.fitScore);
    expect(powerWr4.fitScore).toBeGreaterThan(powerWr3.fitScore);
    expect(spread.autoSetRecommendation.WR).not.toEqual(power.autoSetRecommendation.WR);
    expect(spread.activeBattles.length).toBeGreaterThan(0);
  });

  it('builds cap briefing with contract and outlook context', () => {
    const game = enrichStaff();
    const team = game.teams.afce1!;
    team.roster[0]!.contract!.years = 1;
    const briefing = generateCapBriefing(game, 'afce1');

    expect(briefing.capGrade).toMatch(/[A-F]/);
    expect(briefing.biggestContracts.length).toBeGreaterThan(0);
    expect(briefing.expiringDeals.some((deal) => deal.playerId === team.roster[0]!.id)).toBe(true);
    expect(briefing.restructureCandidates.length).toBeLessThanOrEqual(3);
    expect(briefing.cutCandidates.length).toBeLessThanOrEqual(3);
    expect(briefing.capOutlook.length).toBeGreaterThan(25);
  });

  it('recommends goals based on owner profile and dynasty window', () => {
    const game = enrichStaff();
    const team = game.teams.afce1!;
    team.owner.archetypeId = 'profit_first';
    team.capSpace = 6;
    const context = generateGoalContext(game, 'afce1');

    expect(context.ownerType).toBe('penny');
    expect(context.availableGoals).toHaveLength(9);
    expect(context.recommendedGoals).toHaveLength(3);
    expect(context.recommendedGoals.some((goal) => goal.id === 'cap_health')).toBe(true);
    expect(context.availableGoals.every((goal) => goal.reason.length > 10)).toBe(true);
  });

  it('builds a narrative blueprint with scheme labels and selected goals', () => {
    const game = addBattleAndInjury();
    const blueprint = generateBlueprint(game, 'afce1', {
      agmProfileId: 'marcus_webb',
      headCoachId: 'elias_rowe',
      scoutingDirectorId: 'zoe_wilcox',
      offenseScheme: 'spread',
      defenseScheme: 'cover_3',
      seasonGoals: ['playoff_berth', 'draft_well', 'winning_record'],
      depthChartOverrides: {},
      acknowledged: PHASES_ALL,
    });

    expect(blueprint.teamName).toContain(game.teams.afce1!.name);
    expect(blueprint.selectedSchemes.offenseLabel).toBe('Spread');
    expect(blueprint.selectedSchemes.defenseLabel).toBe('Cover 3');
    expect(blueprint.seasonGoals.map((goal) => goal.id)).toEqual(['playoff_berth', 'draft_well', 'winning_record']);
    expect(blueprint.keyPlayers.length).toBeGreaterThan(0);
    expect(blueprint.blueprintNarrative).toContain(String(game.year));
    expect(blueprint.blueprintNarrative).toContain('Spread');
    expect(blueprint.blueprintNarrative).toContain('Cover 3');
  });

  it('returns deterministic generator output for the same fixture', () => {
    const game = addBattleAndInjury();

    expect(generateIntelBriefing(game, 'afce1')).toEqual(generateIntelBriefing(game, 'afce1'));
    expect(generateRosterOverview(game, 'afce1')).toEqual(generateRosterOverview(game, 'afce1'));
    expect(generateCoachingReview(game, 'afce1')).toEqual(generateCoachingReview(game, 'afce1'));
    expect(generateSchemeContext(game, 'afce1')).toEqual(generateSchemeContext(game, 'afce1'));
    expect(generateDepthChartContext(game, 'afce1', { off: 'spread', def: 'cover_3' }))
      .toEqual(generateDepthChartContext(game, 'afce1', { off: 'spread', def: 'cover_3' }));
    expect(generateCapBriefing(game, 'afce1')).toEqual(generateCapBriefing(game, 'afce1'));
    expect(generateGoalContext(game, 'afce1')).toEqual(generateGoalContext(game, 'afce1'));
  });
});

const PHASES_ALL = [
  'intel_briefing',
  'meet_roster',
  'hire_coach',
  'hire_scout',
  'depth_chart',
  'cap_strategy',
  'blueprint',
] as const;
