import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import type { StaffMember } from '../types';
import {
  generateCapPackages,
  PHASE_META,
  PHASE_ORDER,
  advanceSetupPhase,
  applySetupDecision,
  createFastLaneSetupState,
  createSetupState,
  finalizeSetup,
  generateBlueprint,
  generateCapBriefing,
  generateCoachingReview,
  generateDepthChartContext,
  generateGoalContext,
  generateIntelBriefing,
  generateSetupColdOpen,
  generateSetupForecast,
  generateTeamCrisisProfile,
  generateWeekOneVolatility,
  generateWeekOneCliffhanger,
  getTopPressureCard,
  previewSetupForecastChange,
  generateRosterOverview,
  generateSchemeContext,
  goBackSetupPhase,
  getPhaseRequirements,
  isPhaseComplete,
  toggleSetupDrilldown,
} from '../index';
import { makeLeagueState, makePlayer } from './test-helpers';

const FRANCHISE_SETUP_SOURCE = readFileSync(new URL('./franchise-setup.ts', import.meta.url), 'utf8');
const SETUP_HIRING_CATALOG_SOURCE = readFileSync(new URL('./setup-hiring-catalog.ts', import.meta.url), 'utf8');
const STALE_FIRST_RUN_SETUP_COPY = /\b(?:foundation is real|clean long-term plan|Energy, momentum|locker-room buy-in|clear north star|season story|foundation is moving|coherent identity|looks more coherent|shape the story fast|first week feels|opening script feels|books are still tight|will feel every unresolved weakness|new identity should|trust the new standard|football identity with|owner-trust edge|Young-player momentum|public story|competitive window|peaking window|clean benchmark|trust the current roster|break trust early|Locker-room leadership|roster context|real upside|cap picture|trajectory|trust your corners to travel|market sees upside|market sees both upside|set the tone|chasing upside|chasing expensive upgrades|ready to chase wins|chase veteran upgrades|chasing results|chasing quick fixes|while chasing wins|roster need|roster problem|margin for error|books are manageable|has enough talent to matter|The market is skeptical|The market is energized|prove this plan right|just delays pain|Fans and media see talent|misses the real problem|real plan|real question|real pressure|first real test|sabotage the first)\b/i;
const STALE_GENERATED_SETUP_COPY = /(?:This setup choice changes Week 1 readiness and pressure|The opening plan matches the current roster|The opener is still carrying risk|Install should be easier|Install still needs time|Standards are clearer|Culture can still crack under stress|You created short-term cap space|The cap sheet is still tight|Ownership likes the direction|Ownership will demand proof early|proof in the first month|player-led culture|development-first culture|locker-room leaders|who owns mistakes, snaps, and standards|Run-blocking and tackling standards|The biggest unknown is whether this group handles live pressure|the opener gets messy|Week 1 is winnable if the setup choices match|Week 1 is playable, but unresolved|The first month still looks unstable|The opening script is cleaner|Ownership likes the aggression|The roster is mostly ready|The unknown is whether|Ownership is willing to stay patient|A patient ownership profile|This goal keeps young-player progress|This roster is built to contend now|Fans and media are energized|Ownership is watchful|The cap sheet is already narrowing your moves|Team culture is unstable enough|The roster has answers, but|You can be aggressive|The cap is manageable, but not forgiving|cap sheet supports|The cap sheet gives you cap space to be proactive|Financially, you can compete|Cap pressure will limit how aggressive|proactive moves|You can make moves|smart early-season choices|real win-now pressure|can show this plan works|should show up|enough here to survive|legitimate chance|Week 1 pressure can still|first messy drive can|are built to win now|championship track|mission is simple|should protect development snaps|offense can grow|This season is about|Week 1 choices should protect|push forward immediately|The focus is|believe they can win ugly games|can handle pressure|One bad month can split leaders|Early roles and accountability will matter|patience matters|development matters|install speed matters|can accept install friction|roster can execute|Day 1 diagnosis|Day 1 cap plan|Day 1 cap priorities|Day 1 signal|Day 1 decisions|Day 1 flaw|cap package for Day 1|Day 1 assigned|it can change Week 1 readiness|and Week 1 readiness|trust to handle ugly wins|practice energy|ideological lane|young-player roles matter|roles stable|roles clarified|roles are clearer|clearer team rules|Protect owner trust by fixing|expose every gap|clarify weak positions|clearer answer|Use Day 1 to clarify|wrong Week 1 answers can drag|weekly calls get clearer|early losses can raise pressure|raise pressure if moves ignore it|missed reads can raise pressure|pressure games|weekly pressure|energized fans and media raise pressure|Week 1 pressure hits|Week 1 exposes weak points quickly|clearest weak point|small structural flaws|intent instead of inertia|defaulting to last year’s hierarchy|cap space will appear on its own|first month will reward|clear plan but punish surprises|vague setup choices|vague roster shaping|shapes owner and fan expectations|players know the plan|loose moves|loose roles|loose spending|Choose star power|missed support|weakest position|unresolved weakness|bad Week 1 plan|bad Week 1 choices|bad money|Culture Pressure|culture mandate|first mandate|support named fixes|decision advisor|next offseason cleaner|Hire Your Coach|Build Your Intel|Set Your Goals|Who leads this team|Who finds the next star|What does year one look like|Your roster at a glance|Your plan is locked in|Day 1 Complete|position-room conflict|splits the room|wrong standard|clear standard|unclear standards|standards must change|let standards slip|daily standards|Day 1 standards|Pick who watches|stale starter order|Open owner, roster, cap|opener threats|protect later fixes|Pick owner promises|Verify locked choices)/i;
const RECENT_STALE_DIRECT_SETUP_COPY =
  /(?:This staff should|should be restructured|clear weekly assignments|early mistakes may cost points|younger players develop more slowly)/i;
const RECENT_STALE_VAGUE_CONSEQUENCE_COPY = /\b(?:bad protection|job approval|lower job approval)\b/i;
const RECENT_STALE_SETUP_SOFT_CONSEQUENCE_COPY =
  /\b(?:can trigger role complaints|can lower morale|can reach the opener|can cost early games|future cap hits can limit|wrong roles can still create|wrong roles create early mistakes|stricter rules can hurt|informal leadership can let|early losses can cut|early record can slide|missing rule owners can fracture|can waste picks|transition risk can cost|missed warnings can hurt|wrong veteran spending can block|spending on a player without a defined game-day job can block|cost without a starter, backup, or extension plan can block|tight space can block|owner patience can still fall|spending without a named role can block|missed usage or blocked depth can waste|missed division games can cost|lineup, staff, and Game Plan can reach|ownership can punish|ownership will tolerate fewer early mistakes|depth before kickoff; it can sink|missed depth answers can cost|stale starter order can still cost|one aggressive spend can block|contracts without a named player role can block|contracts without a role can block|a harsh rule can drop|two losses can still test|one wrong spend can shrink|wrong spend shrinks|losses can turn into morale problems|problem can reach the opener|can punish it|opener can punish|first loss can trigger|empty savings can push|wrong fixes can leave|wrong fixes leave|wrong pairings can still cost|wrong pairings cost the opener|opener can expose|late changes can create|slow install can create|missing accountability can split|extra spending can block|ignoring it can cut|owner patience can drop|opener can expose the thinnest|opponents can attack|proof you can identify|roster can defend)\b/i;
const RECENT_STALE_OWNER_PRESSURE_SETUP_COPY =
  /\b(?:owner pressure|raise owner pressure|owner pressure rises|owner pressure can rise|extra owner pressure)\b/i;
const RECENT_STALE_SETUP_WEAKNESS_SHORTHAND =
  /\b(?:weak leaders|weak positions|weak depth|thin depth|thin backups?|thin backup groups?|thinnest starter|thin starter|thin starter or backup groups?|top weakness|weakest starter|weak spots?)\b/i;
const STALE_SETUP_METRIC_LABELS = /Week 1 Readiness|Scheme Cohesion|Culture Stability|Cap Flexibility|\bWK1\b|\bVOL\b/i;
const STALE_CAP_PLAN_COPY = /Protect the Future|Balanced Pressure Release|Aggressive Cap Push|future flexibility|mortgaging future flexibility|balanced cap posture|aggressive cap posture|cap posture is|protect future space|cap flexibility|extension flexibility|Week 1 readiness, cap flexibility|missed picks can cost cap flexibility/i;
const RECENT_STALE_SETUP_SHORTHAND_COPY =
  /\b(?:staff profile is balanced|single scheme priority|roster-upgrade room|missed discipline|cap discipline|wasted spending|without extra help|early choices need to help the next game|wasting cap space|one aggressive spend can trap the season|low-confidence|scout confidence|scouting confidence|Week 1 install speed is the priority|upside justifies|opener is winnable|Use cap space only|Use targeted moves only|name-only spending|spending without a role|name-only upgrades|costs only time)\b/i;
const RECENT_STALE_UNCLEAR_SETUP_COPY =
  /\b(?:unclear roles|unclear jobs|unclear rules|harsh or unclear rule|assignments are clear|clear roles|clear role|hot reads ready by Week 1)\b/i;
const RECENT_STALE_STAFF_PHILOSOPHY_COPY =
  /\b(?:offensive answers|quarterback-driven control|physicality, detail|practice tempo|clear communication|morale protection|situational control)\b/i;
const RECENT_STALE_SETUP_GRADE_SHORTHAND_COPY =
  /\b(?:missed grades|roster grade|grade alone|compare grades|grade shows talent|film disagrees with the grade|I graded every player|current cap grade)\b/i;
const RECENT_STALE_SETUP_MORALE_PATIENCE_SHORTHAND =
  /\b(?:morale risk|leaders will copy|one bad month|losses hide development|owner expectations rise fast|owner patience tight|slow first month|Team morale is already unstable; unassigned roles|loses patience when losses|first bad stretch|one bad stretch)\b/i;
const RECENT_STALE_SETUP_GENERIC_PROBLEM_COPY =
  /(?:biggest roster risk|roster or cap risk|starter, backup, cap, or staff problem|weekly roster, cap, or staff problem|biggest depth, cap, or morale problem|starter or staff problems|roster, cap, or Week 1 problem|role-complaint problem|setup flaw|starter, scheme, or cap problem|starter, cap, or staff problem|roster, cap, or staff problem|unresolved setup issue|carry more risk)/i;
const STALE_SETUP_SCHEME_DESCRIPTION_COPY =
  /\b(?:Space and pace|playmakers in space|Pound the rock|Air it out|Stay multiple|defend every answer|Sound and simple|play fast|Flexible pressure|Keep the roof|Bend without breaking|squeeze explosive plays|position group should own|weekly plan work|safety[- ]help answers|safety answers|fast rules|bad timing|explosive-play risk|risk explosives|pressure arrives|leak easy yards|easy yards|can make quick decisions|can avoid stalled drives|can protect leads|can pick up blitzes|can stop the run|can rush, cover, and fit the run|can tackle short completions|can stop short completions|can press)\b/i;
const RESTRICTIVE_FIRST_RUN_CHIP_COPY =
  /\b(?:change|choose|hire|spend|use)\b[^.!?;]*(?:only if|only when|only after|only with|only where)\b|\bownership stays patient only if\b|\bworth\b/i;
const SETUP_SCHEME_ROSTER_DEMAND_COPY =
  /\b(?:if|when|without|avoid|protect|pressure arrives|blitzes|weekly plan|safety-help|easy yards)\b/i;
const FIRST_RUN_CHIP_ACTION_CUE =
  /\b(advance|apply|assign|build|choose|find|fix|give|identify|inspect|keep|lock|make|name|open|pick|preview|prioritize|protect|read|set|spend)\b/i;
const FIRST_RUN_CHIP_CONSEQUENCE_CUE =
  /\b(before|block|cap|cost|deadline|expose|hurt|injur\w*|later|morale|opener|owner|pressure|risk|week|wrong)\b/i;

function expectActionableFirstRunCopy(label: string, copy: string): void {
  expect(copy, `${label} needs a clear player action: ${copy}`).toMatch(FIRST_RUN_CHIP_ACTION_CUE);
  expect(copy, `${label} needs a consequence, limit, or deadline: ${copy}`).toMatch(FIRST_RUN_CHIP_CONSEQUENCE_CUE);
}

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
    expect(PHASE_META.map(({ id, label }) => [id, label])).toEqual([
      ['choose_agm', 'Hire Assistant GM'],
      ['intel_briefing', 'Franchise Intel'],
      ['meet_roster', 'Meet the Roster'],
      ['hire_coach', 'Hire Head Coach'],
      ['hire_scout', 'Hire Scouting Director'],
      ['set_scheme', 'Pick Schemes'],
      ['depth_chart', 'Starting Lineup'],
      ['cap_strategy', 'Choose Cap Plan'],
      ['set_goals', 'Set Owner Goals'],
      ['blueprint', 'Open Blueprint'],
    ]);
    expect(PHASE_META.map(({ subtitle }) => subtitle).join(' ')).not.toMatch(STALE_GENERATED_SETUP_COPY);
    expect(PHASE_META.map(({ subtitle }) => subtitle).join(' ')).not.toMatch(/Week 1 risks|draft and roster risks|flags roster, cap|Read owner patience/i);
    expect(PHASE_META.find((phase) => phase.id === 'intel_briefing')?.subtitle).toBe(
      'Open Intel for owner patience, injuries, cap space, and Week 1 matchup threats',
    );
    expect(PHASE_META.find((phase) => phase.id === 'meet_roster')?.subtitle).toBe(
      'Find starters, injuries, and uncovered backup jobs',
    );
    expect(PHASE_META.find((phase) => phase.id === 'hire_coach')?.subtitle).toBe(
      'Pick who installs the Week 1 plan',
    );
    expect(PHASE_META.find((phase) => phase.id === 'hire_scout')?.subtitle).toBe(
      'Pick who names draft roles and medical warnings',
    );
    expect(PHASE_META.find((phase) => phase.id === 'cap_strategy')?.subtitle).toBe(
      'Choose restructures now or save injury, trade, and extension cap space',
    );
    expect(PHASE_META.find((phase) => phase.id === 'choose_agm')?.subtitle).toBe(
      "Choose Chip's first setup priority: cap space, starter jobs, staff plan, or owner patience",
    );
    expect(PHASE_META.find((phase) => phase.id === 'set_scheme')?.subtitle).toBe(
      'Choose Week 1 calls that avoid unassigned starter jobs',
    );
    expect(PHASE_META.find((phase) => phase.id === 'set_goals')?.subtitle).toBe(
      'Choose goals ownership judges and rules that change morale after losses',
    );
    expect(PHASE_META.find((phase) => phase.id === 'blueprint')?.subtitle).toBe(
      'Preview staff, scheme, lineup, cap space, and goals before Week 1 locks',
    );
    expect(FRANCHISE_SETUP_SOURCE).not.toContain('Choose cap space now or later');
    expect(FRANCHISE_SETUP_SOURCE).not.toContain('Choose the roster fit for Week 1');
    expect(FRANCHISE_SETUP_SOURCE).not.toContain('Choose Week 1 calls that fit the roster');
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
    expect((state.decisions as any).depthChartPhilosophy).toBeNull();
    expect((state.decisions as any).capPosture).toBeNull();
    expect((state.decisions as any).cultureMandate).toBeNull();
    expect((state as any).crisisProfile).toBeNull();
    expect((state as any).forecastBoard).toBeNull();
    expect((state as any).openedDrilldowns).toEqual([]);
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
      decisionFields: ['seasonGoals', 'cultureMandate'],
    });
    expect(getPhaseRequirements('blueprint')).toEqual({
      requiresDecision: false,
      decisionFields: ['acknowledged'],
    });
  });

  it('preloads fast-lane setup scaffolding without completing the live launch flow', () => {
    const game = enrichStaff();

    const state = createFastLaneSetupState(game, 'afce1');

    expect(state.currentPhase).toBe('intel_briefing');
    expect(state.completedPhases).toEqual(['choose_agm']);
    expect(state.decisions.agmProfileId).toBeTruthy();
    expect(state.decisions.headCoachId).toBe('elias_rowe');
    expect(state.decisions.scoutingDirectorId).toBe('celia_duarte');
    expect(state.decisions.offenseScheme).toBeTruthy();
    expect(state.decisions.defenseScheme).toBeTruthy();
    expect(state.decisions.seasonGoals).toHaveLength(3);
    expect(state.decisions.depthChartPhilosophy).toBe('best_players');
    expect(state.decisions.capPosture).toBe('balanced');
    expect(state.decisions.cultureMandate).toBeTruthy();
    expect(state.crisisProfile).not.toBeNull();
    expect(state.forecastBoard).not.toBeNull();
    expect(state.openedDrilldowns).toEqual([]);
    expect(state.blueprint).toBeNull();
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
      depthChartPhilosophy: 'best_players',
    });
    state = advanceSetupPhase(state);
    state = applySetupDecision(state, {
      capPosture: 'balanced',
    });
    state = advanceSetupPhase(state);

    expect(state.currentPhase).toBe('set_goals');
    state = applySetupDecision(state, {
      seasonGoals: context.recommendedGoals.slice(0, 2).map((goal) => goal.id),
      cultureMandate: 'accountability',
    });
    expect(isPhaseComplete(state, 'set_goals')).toBe(false);

    state = applySetupDecision(state, {
      seasonGoals: context.recommendedGoals.slice(0, 3).map((goal) => goal.id),
      cultureMandate: 'accountability',
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
      depthChartPhilosophy: 'best_players',
    });
    state = advanceSetupPhase(state);
    state = applySetupDecision(state, {
      capPosture: 'balanced',
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
    const state = hireCoachAndScoutSetupState();

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
      depthChartPhilosophy: 'best_players',
    });
    state = advanceSetupPhase(state);
    state = applySetupDecision(state, {
      capPosture: 'balanced',
    });
    state = advanceSetupPhase(state);
    state = applySetupDecision(state, {
      seasonGoals: goalContext.recommendedGoals.slice(0, 3).map((goal) => goal.id),
      cultureMandate: 'accountability',
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
      depthChartPhilosophy: 'best_players',
      depthChartOverrides: {
        QB: ['afce1-qb2'],
      },
    } as any);
    state = advanceSetupPhase(state);
    state = applySetupDecision(state, {
      capPosture: 'balanced',
    });
    state = advanceSetupPhase(state);
    state = applySetupDecision(state, {
      seasonGoals: goalContext.recommendedGoals.slice(0, 3).map((goal) => goal.id),
      cultureMandate: 'accountability',
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
      depthChartPhilosophy: 'best_players',
    });
    state = advanceSetupPhase(state);
    state = applySetupDecision(state, {
      capPosture: 'balanced',
    });
    state = advanceSetupPhase(state);
    state = applySetupDecision(state, {
      seasonGoals: goalContext.recommendedGoals.slice(0, 3).map((goal) => goal.id),
      cultureMandate: 'accountability',
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
    expect(finalized.frontOffice.agmProfileId).toBe('coach_d_hardaway');
    expect(finalized.ownerMandates?.map((mandate) => [mandate.goalId, mandate.slot])).toEqual([
      [goalContext.recommendedGoals[0]!.id, 'floor'],
      [goalContext.recommendedGoals[1]!.id, 'target'],
      [goalContext.recommendedGoals[2]!.id, 'ceiling'],
    ]);
    expect(finalized.handshakes.some((handshake) => handshake.condition.metric === 'owner_mandate')).toBe(true);
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
    expectActionableFirstRunCopy('intel overall assessment', intel.overallAssessment);
    expect(intel.overallAssessment).not.toMatch(STALE_GENERATED_SETUP_COPY);
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

  it('keeps setup scheme descriptions decision-first instead of slogan-first', () => {
    const game = addBattleAndInjury();
    const context = generateSchemeContext(game, 'afce1');
    const options = [...context.offenseOptions, ...context.defenseOptions];

    expect(options).toHaveLength(10);
    expect(FRANCHISE_SETUP_SOURCE).not.toMatch(STALE_SETUP_SCHEME_DESCRIPTION_COPY);
    for (const option of options) {
      expect(option.description, option.label).not.toMatch(STALE_SETUP_SCHEME_DESCRIPTION_COPY);
      expect(option.description, option.label).toMatch(/\bchoose\b/i);
      expect(option.description, option.label).toMatch(SETUP_SCHEME_ROSTER_DEMAND_COPY);
    }
    expect(context.defenseOptions.find((option) => option.schemeId === 'man_press')?.description).toContain(
      'safeties are assigned deep coverage',
    );
    expect(context.offenseOptions.find((option) => option.schemeId === 'air_raid')?.description).toContain(
      'blitz pickup, hot reads, and quick throws are assigned',
    );
    expect(context.defenseOptions.find((option) => option.schemeId === 'cover_3')?.description).toContain(
      'underneath tacklers have short-zone jobs',
    );
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
    expectActionableFirstRunCopy('cap briefing outlook', briefing.capOutlook);
    expect(briefing.capOutlook).not.toMatch(STALE_GENERATED_SETUP_COPY);
  });

  it('recommends goals based on owner profile and dynasty window', () => {
    const game = enrichStaff();
    const team = game.teams.afce1!;
    team.owner.archetypeId = 'profit_first';
    team.capSpace = 6;
    const context = generateGoalContext(game, 'afce1');
    team.owner.archetypeId = 'win_now';
    team.capSpace = 24;
    team.wins = 13;
    team.losses = 4;
    const peakingContext = generateGoalContext(game, 'afce1');

    expect(context.ownerType).toBe('penny');
    expect(context.availableGoals).toHaveLength(9);
    expect(context.recommendedGoals).toHaveLength(3);
    expect(context.recommendedGoals.some((goal) => goal.id === 'cap_health')).toBe(true);
    expect(context.availableGoals.every((goal) => goal.reason.length > 10)).toBe(true);
    expect(peakingContext.availableGoals.find((goal) => goal.id === 'championship')?.reason).toContain(
      'current starters, first backups, and cap space already support a title target',
    );
    expect(peakingContext.availableGoals.find((goal) => goal.id === 'championship')?.reason).not.toContain(
      'roster can defend',
    );
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
    expect(blueprint.blueprintNarrative).toMatch(/Week 1|tight cap space|cap plan/i);
    expect(blueprint.blueprintNarrative).not.toMatch(/press your edge|center of gravity|narrowing window|make it count/i);
    expect(blueprint.blueprintNarrative).not.toMatch(STALE_CAP_PLAN_COPY);
  });

  it('generates a blueprint without mutating a frozen team roster', () => {
    const game = addBattleAndInjury();
    const team = game.teams.afce1!;
    const originalOrder = team.roster.map((player) => player.id);
    Object.freeze(team.roster);

    expect(() =>
      generateBlueprint(game, 'afce1', {
        agmProfileId: 'marcus_webb',
        headCoachId: 'elias_rowe',
        scoutingDirectorId: 'zoe_wilcox',
        offenseScheme: 'spread',
        defenseScheme: 'cover_3',
        seasonGoals: ['playoff_berth', 'draft_well', 'winning_record'],
        depthChartOverrides: {},
        acknowledged: PHASES_ALL,
      }),
    ).not.toThrow();

    expect(team.roster.map((player) => player.id)).toEqual(originalOrder);
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

  it('keeps generated first-run setup copy concrete and consequence-first', () => {
    const game = addBattleAndInjury();
    const decisions = {
      agmProfileId: 'marcus_webb',
      headCoachId: 'elias_rowe',
      scoutingDirectorId: 'zoe_wilcox',
      offenseScheme: 'spread',
      defenseScheme: 'cover_3',
      seasonGoals: ['playoff_berth', 'draft_well', 'winning_record'],
      depthChartOverrides: {},
      acknowledged: [...PHASES_ALL],
      depthChartPhilosophy: 'best_players',
      capPosture: 'protect_future',
      cultureMandate: 'development_first',
    } as any;
    const crisis = generateTeamCrisisProfile(game, 'afce1');
    const coldOpen = generateSetupColdOpen(game, 'afce1');
    const forecast = generateSetupForecast(game, 'afce1', decisions);
    const cliffhanger = generateWeekOneCliffhanger(game, 'afce1', decisions);
    const defaultPreview = previewSetupForecastChange(game, 'afce1', decisions, {
      seasonGoals: ['winning_record', 'cap_health', 'draft_well'],
    });
    const goals = generateGoalContext(game, 'afce1');
    const blueprint = generateBlueprint(game, 'afce1', decisions);
    const visibleCopy = [
      crisis.headline,
      crisis.ownerPressure,
      crisis.mediaPressure,
      crisis.weekOneThreat,
      crisis.weekOneHope,
      crisis.weekOneUnknown,
      ...crisis.pressureCards.flatMap((card) => [
        card.diagnosis,
        card.drilldown.whyItMatters,
        card.drilldown.riskSource,
        card.drilldown.bestLever,
        card.drilldown.seasonOneConsequence,
      ]),
      coldOpen.ownerExpectation,
      coldOpen.mediaNarrative,
      coldOpen.lastSeasonScar,
      coldOpen.crisisHeadline,
      coldOpen.weekOneThreat,
      generateIntelBriefing(game, 'afce1').overallAssessment,
      forecast.summary,
      ...forecast.cards.map((card) => card.detail),
      cliffhanger.threat,
      cliffhanger.hope,
      cliffhanger.unknown,
      goals.ownerExpectations,
      ...goals.availableGoals.map((goal) => goal.reason),
      blueprint.blueprintNarrative,
      ...blueprint.dayOneBets,
    ].join(' ');

    expect(FRANCHISE_SETUP_SOURCE).not.toMatch(STALE_FIRST_RUN_SETUP_COPY);
    expect(FRANCHISE_SETUP_SOURCE).not.toMatch(STALE_GENERATED_SETUP_COPY);
    expect(FRANCHISE_SETUP_SOURCE).not.toMatch(RECENT_STALE_OWNER_PRESSURE_SETUP_COPY);
    expect(FRANCHISE_SETUP_SOURCE).not.toMatch(RECENT_STALE_SETUP_WEAKNESS_SHORTHAND);
    expect(FRANCHISE_SETUP_SOURCE).not.toMatch(RECENT_STALE_SETUP_SHORTHAND_COPY);
    expect(FRANCHISE_SETUP_SOURCE).not.toMatch(RECENT_STALE_UNCLEAR_SETUP_COPY);
    expect(FRANCHISE_SETUP_SOURCE).not.toMatch(RECENT_STALE_STAFF_PHILOSOPHY_COPY);
    expect(FRANCHISE_SETUP_SOURCE).not.toMatch(RECENT_STALE_SETUP_GRADE_SHORTHAND_COPY);
    expect(FRANCHISE_SETUP_SOURCE).not.toMatch(RECENT_STALE_SETUP_MORALE_PATIENCE_SHORTHAND);
    expect(FRANCHISE_SETUP_SOURCE).not.toMatch(RECENT_STALE_SETUP_GENERIC_PROBLEM_COPY);
    expect(FRANCHISE_SETUP_SOURCE).not.toMatch(RECENT_STALE_DIRECT_SETUP_COPY);
    expect(FRANCHISE_SETUP_SOURCE).not.toMatch(RECENT_STALE_VAGUE_CONSEQUENCE_COPY);
    expect(FRANCHISE_SETUP_SOURCE).not.toMatch(RECENT_STALE_SETUP_SOFT_CONSEQUENCE_COPY);
    expect(SETUP_HIRING_CATALOG_SOURCE).not.toMatch(STALE_GENERATED_SETUP_COPY);
    expect(FRANCHISE_SETUP_SOURCE).not.toMatch(RESTRICTIVE_FIRST_RUN_CHIP_COPY);
    expect(FRANCHISE_SETUP_SOURCE).not.toMatch(/\bUse\b/);
    expect([
      ...forecast.cards.map((card) => card.label),
      defaultPreview.secondaryDelta.label,
      defaultPreview.bonusDelta?.label ?? '',
    ].join(' ')).not.toMatch(STALE_SETUP_METRIC_LABELS);
    expect(visibleCopy).not.toMatch(STALE_FIRST_RUN_SETUP_COPY);
    expect(visibleCopy).not.toMatch(STALE_GENERATED_SETUP_COPY);
    expect(visibleCopy).not.toMatch(RECENT_STALE_SETUP_WEAKNESS_SHORTHAND);
    expect(visibleCopy).not.toMatch(RECENT_STALE_SETUP_GRADE_SHORTHAND_COPY);
    expect(visibleCopy).not.toMatch(RECENT_STALE_SETUP_MORALE_PATIENCE_SHORTHAND);
    expect(visibleCopy).not.toMatch(RECENT_STALE_SETUP_GENERIC_PROBLEM_COPY);
    expect(visibleCopy).not.toMatch(RECENT_STALE_DIRECT_SETUP_COPY);
    expect(visibleCopy).not.toMatch(RECENT_STALE_VAGUE_CONSEQUENCE_COPY);
    expect(visibleCopy).not.toMatch(RECENT_STALE_SETUP_SOFT_CONSEQUENCE_COPY);
    expect(visibleCopy).not.toMatch(RESTRICTIVE_FIRST_RUN_CHIP_COPY);
    expect(visibleCopy).not.toMatch(/Cap plan is (?:flush|tight|dire)\b/i);
    expect(visibleCopy).toMatch(/\b(?:roles|assignments|Week 1|cap|owner|pressure|depth|spending|development|mistakes|accountability)\b/i);
    expect(crisis.pressureCards.find((card) => card.id === 'culture')?.diagnosis).toMatch(/captains|backup expectations|accountability/i);
    expect(FRANCHISE_SETUP_SOURCE).toContain('Set captains and backup expectations before Week 1 or the first loss triggers role complaints.');
    expect(FRANCHISE_SETUP_SOURCE).toContain('Choose this scout to identify exposed starter or first-backup jobs before draft and roster moves; missed role or medical-limit answers waste picks or force veteran overpays.');
    expect(FRANCHISE_SETUP_SOURCE).toContain('Fix unresolved roster, Week 1 game-plan, and cap choices before kickoff or the opener exposes an unprotected starter or uncovered first-backup job.');
    expect(FRANCHISE_SETUP_SOURCE).toContain('Choose best-player depth for the strongest current lineup; a mismatched scheme role breaks protection or coverage in Week 1.');
    expect(FRANCHISE_SETUP_SOURCE).toContain("one extra spend removes ${team.city}'s injury, trade, or extension fix");
    expect(FRANCHISE_SETUP_SOURCE).toContain('a mismatched signing, trade, or depth change leaves that starter exposed.');
    expect(goals.availableGoals.find((goal) => goal.id === 'winning_record')?.reason).toContain('lineup, trade, and cap questions');

    const actionableCopy = [
      ['crisis headline', crisis.headline],
      ['crisis owner pressure', crisis.ownerPressure],
      ['crisis media pressure', crisis.mediaPressure],
      ['crisis week one threat', crisis.weekOneThreat],
      ['crisis week one hope', crisis.weekOneHope],
      ['crisis week one unknown', crisis.weekOneUnknown],
      ...crisis.pressureCards.map((card) => [
        `pressure card ${card.id}`,
        [
          card.diagnosis,
          card.drilldown.whyItMatters,
          card.drilldown.bestLever,
          card.drilldown.seasonOneConsequence,
        ].join(' '),
      ] as const),
      ['cold-open owner expectation', coldOpen.ownerExpectation],
      ['cold-open media narrative', coldOpen.mediaNarrative],
      ['cold-open crisis headline', coldOpen.crisisHeadline],
      ['cold-open week one threat', coldOpen.weekOneThreat],
      ['forecast summary', forecast.summary],
      ...forecast.cards.map((card) => [`forecast ${card.id}`, card.detail] as const),
      ['week one threat', cliffhanger.threat],
      ['week one hope', cliffhanger.hope],
      ['week one unknown', cliffhanger.unknown],
      ['default preview summary', defaultPreview.summaryLine],
      ['goal owner expectations', goals.ownerExpectations],
      ...goals.availableGoals.map((goal) => [`goal ${goal.id}`, goal.reason] as const),
      ['blueprint narrative', blueprint.blueprintNarrative],
    ] as const;

    for (const [label, copy] of actionableCopy) {
      expectActionableFirstRunCopy(label, copy);
    }
  });

  it('builds a deterministic team crisis profile with three pressure cards', () => {
    const game = addBattleAndInjury();

    const crisis = generateTeamCrisisProfile(game, 'afce1');

    expect(generateTeamCrisisProfile(game, 'afce1')).toEqual(crisis);
    expect(crisis.pressureCards.map((card) => card.id)).toEqual(['roster', 'cap', 'culture']);
    expect(crisis.headline.length).toBeGreaterThan(20);
    expect(crisis.ownerPressure.length).toBeGreaterThan(10);
    expect(crisis.mediaPressure.length).toBeGreaterThan(10);
    expect(crisis.weekOneThreat.length).toBeGreaterThan(10);
    expect(crisis.weekOneHope.length).toBeGreaterThan(10);
    expect(crisis.weekOneUnknown.length).toBeGreaterThan(10);
    expect(crisis.pressureCards.every((card) => card.drilldown.bestLever.length > 5)).toBe(true);
  });

  it('builds a deterministic cold open from live team state and recent franchise scars', () => {
    const game = addBattleAndInjury();
    game.franchiseHistory.push({
      year: game.year - 1,
      teamId: 'afce1',
      wins: 10,
      losses: 7,
      ties: 0,
      record: '10-7',
      pointDifferential: 48,
      playoffFinish: 'Lost in Divisional Round',
      majorEvents: [],
      awardsWon: [],
      recordsBroken: [],
    });

    const coldOpen = generateSetupColdOpen(game, 'afce1');

    expect(generateSetupColdOpen(game, 'afce1')).toEqual(coldOpen);
    expect(coldOpen.lastSeasonScar).toContain('10-7');
    expect(coldOpen.lastSeasonScar).toContain('Lost in Divisional Round');
    expect(coldOpen.openerLabel).toContain('Week 1');
    expect(coldOpen.crisisHeadline.length).toBeGreaterThan(15);
  });

  it('returns the highest-pressure card deterministically', () => {
    const game = addBattleAndInjury();
    const crisis = generateTeamCrisisProfile(game, 'afce1');

    const top = getTopPressureCard(crisis);

    expect(getTopPressureCard(crisis)).toEqual(top);
    expect(crisis.pressureCards.some((card) => card.id === top.id)).toBe(true);
    expect(top.score).toBe(
      Math.max(...crisis.pressureCards.map((card) => card.score)),
    );
  });

  it('toggles setup drilldowns without mutating unrelated setup decisions', () => {
    const game = addBattleAndInjury();
    const crisis = generateTeamCrisisProfile(game, 'afce1');
    const initial = {
      ...hireAgmSetupState(),
      crisisProfile: crisis,
    };
    const topPressure = getTopPressureCard(crisis);

    const opened = toggleSetupDrilldown(initial, topPressure.id);
    const closed = toggleSetupDrilldown(opened, topPressure.id);

    expect(opened.openedDrilldowns).toEqual([topPressure.id]);
    expect(closed.openedDrilldowns).toEqual([]);
    expect(closed.decisions).toEqual(initial.decisions);
  });

  it('builds three deterministic cap packages for day one posture choices', () => {
    const game = enrichStaff();

    const packages = generateCapPackages(game, 'afce1');

    expect(generateCapPackages(game, 'afce1')).toEqual(packages);
    expect(packages.map((entry) => entry.posture)).toEqual(['protect_future', 'balanced', 'push_chips']);
    expect(packages.map((entry) => entry.label)).toEqual([
      'Protect Future Cap',
      'Restructure One Contract',
      'Restructure Multiple Contracts',
    ]);
    expect(packages.every((entry) => entry.label.length > 3)).toBe(true);
    expect(packages.every((entry) => entry.rosterImpact.length > 10)).toBe(true);
    expect(packages.map((entry) => `${entry.summary} ${entry.rosterImpact}`).join(' ')).not.toMatch(
      /books clean|bill gets louder|gets cleaner|less forgiving/i,
    );
    expect(packages.map((entry) => `${entry.label} ${entry.summary} ${entry.rosterImpact}`).join(' ')).not.toMatch(STALE_CAP_PLAN_COPY);
    expect(packages.find((entry) => entry.posture === 'push_chips')?.rosterImpact).toContain('future cap hits');
  });

  it('updates the setup forecast when day one decisions change', () => {
    const game = addBattleAndInjury();

    const conservative = generateSetupForecast(game, 'afce1', {
      agmProfileId: 'marcus_webb',
      headCoachId: 'elias_rowe',
      scoutingDirectorId: 'zoe_wilcox',
      offenseScheme: 'balanced',
      defenseScheme: 'cover_3',
      seasonGoals: ['winning_record', 'cap_health', 'draft_well'],
      depthChartOverrides: {},
      acknowledged: [...PHASES_ALL],
      depthChartPhilosophy: 'best_players',
      capPosture: 'protect_future',
      cultureMandate: 'accountability',
    } as any);
    const aggressive = generateSetupForecast(game, 'afce1', {
      agmProfileId: 'coach_d_hardaway',
      headCoachId: 'nico_morales',
      scoutingDirectorId: 'marvin_tate',
      offenseScheme: 'air_raid',
      defenseScheme: 'man_press',
      seasonGoals: ['championship', 'win_division', 'star_power'],
      depthChartOverrides: {},
      acknowledged: [...PHASES_ALL],
      depthChartPhilosophy: 'youth_bet',
      capPosture: 'push_chips',
      cultureMandate: 'player_led',
    } as any);

    expect(conservative.weekOneReadiness).not.toBe(aggressive.weekOneReadiness);
    expect(conservative.capFlexibility).not.toBe(aggressive.capFlexibility);
    expect(conservative.cards).toHaveLength(5);
    expect(aggressive.cards).toHaveLength(5);
  });

  it('blocks full-run intel completion until the highest pressure has been opened', () => {
    const game = addBattleAndInjury();
    const crisis = generateTeamCrisisProfile(game, 'afce1');
    const topPressure = getTopPressureCard(crisis);
    const state = applySetupDecision({
      ...hireAgmSetupState(),
      crisisProfile: crisis,
    }, {
      acknowledged: ['intel_briefing'],
    });

    expect(isPhaseComplete(state, 'intel_briefing')).toBe(true);
    expect(isPhaseComplete(state, 'intel_briefing', { requireTopPressureOpened: true })).toBe(false);

    const opened = toggleSetupDrilldown(state, topPressure.id);

    expect(isPhaseComplete(opened, 'intel_briefing', { requireTopPressureOpened: true })).toBe(true);
  });

  it('previews readiness and volatility deltas for hypothetical day one choices', () => {
    const game = addBattleAndInjury();
    const baseDecisions = {
      agmProfileId: 'marcus_webb',
      headCoachId: 'elias_rowe',
      scoutingDirectorId: 'zoe_wilcox',
      offenseScheme: 'balanced',
      defenseScheme: 'cover_3',
      seasonGoals: ['winning_record', 'cap_health', 'draft_well'],
      depthChartOverrides: {},
      acknowledged: [...PHASES_ALL],
      depthChartPhilosophy: 'best_players',
      capPosture: 'protect_future',
      cultureMandate: 'accountability',
    } as any;

    const aggressiveCap = previewSetupForecastChange(game, 'afce1', baseDecisions, {
      capPosture: 'push_chips',
    });
    const youthDepth = previewSetupForecastChange(game, 'afce1', baseDecisions, {
      depthChartPhilosophy: 'youth_bet',
    });

    expect(aggressiveCap.weekOneReadinessDelta).not.toBe(0);
    expect(aggressiveCap.weekOneVolatilityDelta).not.toBe(0);
    expect(aggressiveCap.secondaryDelta.id).toBe('cap_flexibility');
    expect(aggressiveCap.secondaryDelta.label).toBe('Cap Space');
    expect(aggressiveCap.summaryLine).toContain('Choose multiple restructures when Week 1 needs a roster upgrade now');
    expect(aggressiveCap.bonusDelta?.label).toBe('Owner Patience');
    expect(youthDepth.secondaryDelta.id).toBe('scheme_cohesion');
    expect(youthDepth.secondaryDelta.label).toBe('Scheme Fit');
    expect(youthDepth.summaryLine).toContain('Choose youth-first depth when development snaps are the priority');
    expect(youthDepth.summaryLine).toContain('missed blocks, coverage, or run-defense assignments cost Week 1 points');
    expectActionableFirstRunCopy('aggressive cap preview', aggressiveCap.summaryLine);
    expectActionableFirstRunCopy('youth depth preview', youthDepth.summaryLine);
    expect([
      aggressiveCap.summaryLine,
      youthDepth.summaryLine,
      aggressiveCap.secondaryDelta.label,
      aggressiveCap.bonusDelta?.label ?? '',
    ].join(' ')).not.toMatch(/push chips|owner heat|first bet|real bite|room still|room playable/i);
    expect(aggressiveCap.summaryLine).not.toMatch(STALE_CAP_PLAN_COPY);
    expect(youthDepth.summaryLine).not.toMatch(RECENT_STALE_DIRECT_SETUP_COPY);
    expect([
      aggressiveCap.secondaryDelta.label,
      youthDepth.secondaryDelta.label,
      aggressiveCap.bonusDelta?.label ?? '',
    ].join(' ')).not.toMatch(STALE_SETUP_METRIC_LABELS);
  });

  it('raises volatility for younger, more chaotic opening bets', () => {
    const game = addBattleAndInjury();
    const conservative = generateWeekOneVolatility(game, 'afce1', {
      agmProfileId: 'marcus_webb',
      headCoachId: 'elias_rowe',
      scoutingDirectorId: 'zoe_wilcox',
      offenseScheme: 'balanced',
      defenseScheme: 'cover_3',
      seasonGoals: ['winning_record', 'cap_health', 'draft_well'],
      depthChartOverrides: {},
      acknowledged: [...PHASES_ALL],
      depthChartPhilosophy: 'best_players',
      capPosture: 'protect_future',
      cultureMandate: 'accountability',
    } as any);
    const aggressive = generateWeekOneVolatility(game, 'afce1', {
      agmProfileId: 'coach_d_hardaway',
      headCoachId: 'nico_morales',
      scoutingDirectorId: 'marvin_tate',
      offenseScheme: 'air_raid',
      defenseScheme: 'man_press',
      seasonGoals: ['championship', 'win_division', 'star_power'],
      depthChartOverrides: {},
      acknowledged: [...PHASES_ALL],
      depthChartPhilosophy: 'youth_bet',
      capPosture: 'push_chips',
      cultureMandate: 'development_first',
    } as any);

    expect(aggressive).toBeGreaterThan(conservative);
  });

  it('finalizeSetup persists crisis-room blueprint details and new day one decisions', () => {
    const game = addBattleAndInjury();
    let state = hireCoachAndScoutSetupState();

    state = applySetupDecision(state, {
      offenseScheme: 'air_raid',
      defenseScheme: 'man_press',
      depthChartPhilosophy: 'youth_bet',
      capPosture: 'push_chips',
    } as any);
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
      seasonGoals: ['championship', 'win_division', 'star_power'],
      cultureMandate: 'player_led',
    } as any);
    state = advanceSetupPhase(state);
    state = applySetupDecision(state, {
      acknowledged: [...state.decisions.acknowledged, 'blueprint'],
    });

    const finalized = finalizeSetup(game, 'afce1', state);

    expect((finalized.setupState?.decisions as any).depthChartPhilosophy).toBe('youth_bet');
    expect((finalized.setupState?.decisions as any).capPosture).toBe('push_chips');
    expect((finalized.setupState?.decisions as any).cultureMandate).toBe('player_led');
    expect((finalized.setupState?.blueprint as any).crisisHeadline.length).toBeGreaterThan(10);
    expect((finalized.setupState?.blueprint as any).pressureSnapshot).toHaveLength(3);
    expect((finalized.setupState?.blueprint as any).dayOneBets.length).toBeGreaterThan(2);
    expect((finalized.setupState?.blueprint as any).weekOneCliffhanger.threat.length).toBeGreaterThan(10);
  });

  it('builds a deterministic week one cliffhanger from the crisis-room setup', () => {
    const game = addBattleAndInjury();

    const cliffhanger = generateWeekOneCliffhanger(game, 'afce1', {
      agmProfileId: 'sandra_chen',
      headCoachId: 'elias_rowe',
      scoutingDirectorId: 'zoe_wilcox',
      offenseScheme: 'spread',
      defenseScheme: 'cover_3',
      seasonGoals: ['playoff_berth', 'draft_well', 'winning_record'],
      depthChartOverrides: {},
      acknowledged: [...PHASES_ALL],
      depthChartPhilosophy: 'best_players',
      capPosture: 'balanced',
      cultureMandate: 'development_first',
    } as any);

    expect(generateWeekOneCliffhanger(game, 'afce1', {
      agmProfileId: 'sandra_chen',
      headCoachId: 'elias_rowe',
      scoutingDirectorId: 'zoe_wilcox',
      offenseScheme: 'spread',
      defenseScheme: 'cover_3',
      seasonGoals: ['playoff_berth', 'draft_well', 'winning_record'],
      depthChartOverrides: {},
      acknowledged: [...PHASES_ALL],
      depthChartPhilosophy: 'best_players',
      capPosture: 'balanced',
      cultureMandate: 'development_first',
    } as any)).toEqual(cliffhanger);
    expect(cliffhanger.openerLabel.length).toBeGreaterThan(5);
    expect(cliffhanger.threat.length).toBeGreaterThan(10);
    expect(cliffhanger.hope.length).toBeGreaterThan(10);
    expect(cliffhanger.unknown.length).toBeGreaterThan(10);
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
