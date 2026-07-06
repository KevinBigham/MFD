import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import type { StaffMember } from '../types';
import * as engine from '../index';
import { makeLeagueState, makePlayer } from './test-helpers';

type AssistantApi = {
  getAGMProfiles: () => any[];
  getSelectedAGM: (profileId: string) => any;
  getCoachCandidates: () => any[];
  getScoutCandidates: () => any[];
  getSchemeReaction: (agmId: string, schemeId: string) => string;
  getGoalReaction: (agmId: string, goalId: string) => string;
  getTeachingTips: (agmId: string, topicKey: string) => string[];
  getPhaseTransitionFlavor: (agmId: string, fromPhase: string, toPhase: string) => string;
  getTransitionTip: (seed: number, fromPhase: string, toPhase: string) => string;
  getBlueprintClosingMonologue: (agmId: string) => string;
  getAGMGreeting: (profile: any, teamName: string) => string;
  agmOnIntelBriefing: (data: unknown, agm: any) => any;
  agmOnRosterOverview: (data: unknown, agm: any) => any;
  agmOnHireCoach: (data: unknown, agm: any) => any;
  agmOnHireScout: (data: unknown, agm: any) => any;
  agmOnSchemeSelection: (data: unknown, agm: any) => any;
  agmOnDepthChart: (data: unknown, agm: any) => any;
  agmOnCapStrategy: (data: unknown, agm: any) => any;
  agmOnGoalSelection: (data: unknown, agm: any) => any;
  agmOnBlueprint: (data: unknown, agm: any) => any;
  getAGMCoachReaction: (agmId: string, coachId: string) => any;
  getAGMScoutReaction: (agmId: string, scoutId: string) => any;
  agmReactsToSchemeChoice: (chosenOffense: string, chosenDefense: string, context: unknown, agm: any) => any;
  agmReactsToGoalChoice: (chosenGoals: string[], context: unknown, agm: any) => any;
  toneAdjust: (baseText: string, personality: string) => string;
  expertiseEmphasis: (phaseId: string, expertise: string) => number;
  getExpertiseInsight: (phaseId: string, phaseData: unknown, agm: any) => any;
};

const assistant = engine as typeof engine & Partial<AssistantApi>;
const ASSISTANT_GM_SOURCE = readFileSync(new URL('./assistant-gm.ts', import.meta.url), 'utf8');
const STALE_ASSISTANT_GM_SETUP_COPY = /\b(?:what this franchise really is|priority player|best collective fit|coherent first picture|real look before we call it settled|boundary for everything else|defining contracts|season’s flexibility|season's flexibility|season’s risk profile|season's risk profile|logic behind the plan|path I would have mapped|plan works|grounded enough to track|what these players are made of|arrow up|best version of this offense|setting the tone|will look like him|not a throwaway checkbox|Measuredly|clean linebacker fits|cap picture|The numbers never lie|Trust the tape|NOT giving up easy yards|real top-end talent|Health is stable right now|stable enough that we can spend picks|relatively clear|My default move|real competition|real cap need|recommended for a reason|going to be rough|would need real turnover|I will back your call|solves a real problem|real starters)\b/i;
const RECENT_STALE_ASSISTANT_GM_COPY = /\b(?:clearest restructure candidate|safest Week 1 passing order|cap conversation gets a lot clearer|clearest cut candidate|Now prove it|clear staff standards|Bad standards|That matters when we choose the game plan|scouting must identify value|less money we waste|snaps, standards|hard value question|value tag says|patience matters|raises the importance|should be the first restructure review|should get meaningful snaps|Once the head coach is in place, we can decide|If it were up to me|Scheme fit should decide|One last thing after this|That is exactly the pairing I would have called|Now prep time can sharpen roles|Not my first call|I can work with that|I see the angle|Those goals do not match|can pay off|can speed development|can shorten the rebuild|No single player should drive (?:setup|every setup choice)|safe roles|useful backups|should stay limited|contract grade says|single contract distorting|should be the first cut review|buys us patience|cutting useful players|transition penalty|transition hit|manageable .*transition|best fit now|probably needs|cap gives us flexibility|roster sacrifices|extension flexibility|clear scheme and development plan|something simple and executable|Aggressive defensive changes carry more risk|The season will show|goal stack fits the roster|keeping only one recommendation|run through .*strengths|strongest current position group|Scout that group|concepts they already execute|ready to execute|not built to execute|current starters can execute|roles they cannot execute|roster can execute in Week 1|install cost|\d+-point install cost|\d+-point penalty|has only a \d+ fit|safest Week 1 fit: \d+\/\d+ fit|structure and development|Monitor the .* first|current starters can handle|make sure the goals match|best current grade|weaker rooms|best offensive fit|lower the Week 1 install risk|lower Week 1 role risk|Good plan|personnel fit lowers|You can run|lower owner-pressure risk|poor fits|bad fits|prospect role fit|strong role fit|workable role fit|weak role fit|role fit and Week 1|current personnel fit|turn this fit|lacks enough role fit|model cutting|medical, trait, and role risk|Role, risk, consequence)\b/i;
const RECENT_STALE_ASSISTANT_GM_RESIDUAL_COPY = /\b(?:weekly fixes|Auto-set is a baseline|current starters already have those assignments|late prep changes|prep time to sharpen roles)\b/i;
const RECENT_STALE_ASSISTANT_SETUP_DECISION_COPY =
  /staff matches what this roster needs|offense fits|defense fits|checks medical|matches the offense now|current starters already fit those assignments best|cap resources|resources away/i;
const RECENT_STALE_CHIP_PROFILE_COPY = /\b(?:confidence levels|Keep the cap plan patient)\b/i;
const RECENT_STALE_ASSISTANT_GM_SETUP_COPY =
  /\b(?:weakest position|first weakness opponents will attack|weak spots?|weak position|weak depth|weak hire|spot is weak|weak defenders get exposed|thin backups?|thinnest starter|thin starter|thin starter or backup|exposed backup groups|exposed starter or backup groups|slower install lands|slower install strains|roles ready|clear development jump|clear package role|one clear starter upgrade|clear assignments|mostly clear)\b/i;
const ASSISTANT_GM_HELP_SHORTHAND =
  /\b(?:depth help|Week 1 help is needed|Week 1 roster help|coverage or run-defense help|still need help|Unsupported calls|unsupported role)\b/i;
const ASSISTANT_SCOUTING_SHORTHAND =
  /\b(?:build draft grades|draft cost rises|how sure each grade|improves grades|workout numbers|these grades can explain|grade risk|camp grade|draft work there)\b/i;
const ASSISTANT_CAP_GRADE_SHORTHAND =
  /\b(?:The cap grade is|cap grade|Cap health is|The cap sheet is [A-F]|with [A-F] cap health|Read [^.?!;]*(?:cap hit|owner reaction|role and production))\b/i;
const RECENT_STALE_ADVISOR_PRESSURE_COPY =
  /\b(?:weak spots need pressure now|Opponent pressure points|pressure decisions first|owner-pressure tradeoff|roster spending pressure|raises owner pressure|create pressure after early losses)\b/i;
const RECENT_STALE_ASSISTANT_PROFILE_COPY =
  /\b(?:Deadline discipline|Defensive intensity|Development arcs|Relationship capital|Process discipline|Lineup discipline|front-four pressure|fitting run gaps|pressure from the second level|two-high discipline|Treat the deal as|Cap planning|Contract tradeoffs|Deadline cost checks|Player role evaluation|Development snap plans|Morale risk checks|explains roster math like a professor|Trusted by players and evaluators alike)\b/i;
const RECENT_STALE_ASSISTANT_CAN_SHORTHAND =
  /\b(?:who can grow|can handle Week 1|offense can run|defense can run|can cover Week 1|current starters can run|current players can learn)\b/i;
const RECENT_STALE_HEDGED_ASSISTANT_COPY =
  /\b(?:If you add players now, you may need cuts|may need cuts, restructures, or fewer later moves|should stay ready)\b/i;
const RECENT_STALE_ASSISTANT_SOFT_CONSEQUENCE_COPY =
  /\b(?:can block Week 1|can miss future starters|can cost games|development can stall|cuts can force|can create a Week 1|can cost Week 1|Overpromising wins can spend|depth mistake can cost|role can waste|no star can anchor|scouting can defend|player can leave|early spending can block|early cap moves can remove|roster can defend|can still cost games|can turn this pairing|can cost drives|skipping it can shorten|can force roster spending|skipping them can shorten|can make early losses trigger|can weaken the lineup|opponents can target|cap plan can target)\b/i;
const RECENT_STALE_ASSISTANT_PHASE_COPY =
  /\b(?:roster phase|permission to chase wins|Check the .* owner reaction|roster stage|and chase)\b/i;
const RAW_ASSISTANT_GM_RATING_COPY = /\b(?:OVR|\+\d+\s*OVR|\d+-point roster outlook|owner standard|role fit, ratings)\b/;
const RESTRICTIVE_ASSISTANT_GM_CONDITION_COPY =
  /\b(?:avoid|choose|cut|hire|run|spend|use)\b[^.!?;]*(?:only if|only when|only after|only where|only with|unless)\b|\b(?:but|first)\s+only\s+if\b/i;
const RESTRICTIVE_ASSISTANT_GM_DO_NOT_COPY =
  /\bDo not (?:cut|spend|lock|choose|hire|run|use)\b|Compare [^.?!;]+ first|Compare current ability|without a named roster need|rollback plan|goal stack|Wait until|wait for a roster need/i;
const STALE_ASSISTANT_GM_ROSTER_NEED_COPY =
  /\b(?:named roster need|biggest roster need|next roster need|same need|this roster needs|roster needs patience|roster needs owner patience|roster needs cheaper starters)\b/i;
const RECENT_STALE_ASSISTANT_GM_CONCRETE_SHORTHAND =
  /\b(?:starter or backup problems|coach play-call problems|roster issue|roster risks|players at risk of losing snaps|critical needs?|cap problem|roster problem|actual fix|pairing problem|Week 1 consequence|Week 1 lineup consequences|Week 1 risk before saving that order|current starters, cap space, and Week 1 risk|cap limits, and Week 1 risk|This plan names the cost, deadline, and Week 1 risk|first Week 1 install risk and needs protection|medical, role, and trait risk|development are the first risk|trait risk|replacement-level risk|protection risk|complex calls risk|major Week 1 install risk|risky projections|needs first-backup protection|need decisions first|as a patience warning|role answers|starter or backup shortage|game-plan issue|problems lock|needs a roster fix|cap or depth fix)\b/i;
const RECENT_STALE_ASSISTANT_GOAL_REACTION_COPY =
  /\b(?:fit the roster|ownership forgives|skipped target|recommended goals out|ignores starter strength|spending problems)\b/i;
const ASSISTANT_ACTION_CUE = /\b(apply|assign|avoid|build|choose|compare|cut|edit|flag|give|hire|identify|keep|lock|monitor|name|open|pick|plan|preview|promise|protect|run|set|show|spend|start|trade)\b/i;
const ASSISTANT_CONSEQUENCE_CUE =
  /\b(Advance Week|before|block|cap|cost|deadline|depth|development|draft|future|games?|injur\w*|loss(?:es)?|lost|mistakes?|morale|owner|overpay|patience|picks?|pressure|risk|roles?|snaps?|spend\w*|starter|stall\w*|trade|weak|Week 1|wins?)\b/i;

const MARCUS = {
  id: 'marcus_webb',
  name: 'Marcus Webb',
  title: 'Director of Football Strategy',
  background: 'Former cap analyst turned AGM. Cap-cost focused, shows which cuts, restructures, or promises spend future cap space.',
  personality: 'analytical',
  expertise: 'cap_management',
  selectionPitch: 'Choose me when cap mistakes are the first threat. I will show the roster cost before you cut, restructure, trade, or promise wins.',
  strengths: ['Cap-space choices before cuts', 'Dead-money tradeoffs before contracts', 'Promise deadlines before commitments'],
  cardAccent: 'cyan',
  welcomeMonologue: 'Welcome to the {teamName}. Start with Week 1 blockers: cap space, uncovered first-backup jobs, and expensive veterans. I will show what each choice costs before Advance Week.',
  catchphrase: 'Cost, deadline, consequence.',
  toneModifiers: { enthusiasm: 0.45, bluntness: 0.65, humor: 0.15 },
};

const COACH_D = {
  id: 'coach_d_hardaway',
  name: "Deion 'Coach D' Hardaway",
  title: 'Senior AGM, Defensive Planning',
  background: 'Former defensive leader turned front office closer. Focuses on exposed positions, practice accountability, and opponent matchups.',
  personality: 'fiery',
  expertise: 'defense',
  selectionPitch: 'Choose me when starter or backup jobs need immediate fixes. I will flag Week 1 game-plan misses and matchup attacks before they cost games.',
  strengths: ['Find exposed starters before Week 1', 'Set opponent matchup targets', 'Set practice roles before kickoff'],
  cardAccent: 'red',
  welcomeMonologue: 'Welcome to the {teamName}. Identify exposed starters, uncovered first-backup jobs, Week 1 game-plan misses, and matchup calls first; if they wait, mistakes cost games.',
  catchphrase: 'Fix the exposed position before kickoff.',
  toneModifiers: { enthusiasm: 0.95, bluntness: 0.85, humor: 0.25 },
};

const SANDRA = {
  id: 'sandra_chen',
  name: 'Sandra Chen',
  title: 'Senior AGM, Player Development',
  background: 'Former scout and player liaison who flags role conflicts before morale or development stalls.',
  personality: 'player_whisperer',
  expertise: 'personnel',
  selectionPitch: 'Choose me when player roles and development snaps must be settled first. I will identify who needs development snaps, leadership work, or a new job before stalled development costs wins.',
  strengths: ['Assign player jobs before snaps change', 'Protect development snaps before October', 'Flag morale fallout before cuts'],
  cardAccent: 'green',
  welcomeMonologue: 'Welcome to the {teamName}. Start by naming which players need defined roles, earned snaps, or depth protection now; ignore that and development stalls before October.',
  catchphrase: 'Role, snaps, consequence.',
  toneModifiers: { enthusiasm: 0.6, bluntness: 0.55, humor: 0.1 },
};

const TOMMY = {
  id: 'tommy_obrien',
  name: "Tommy O'Brien",
  title: 'Senior AGM, Field Operations',
  background: 'Thirty-year football lifer who believes in running the ball and keeping things grounded.',
  personality: 'old_school',
  expertise: 'offense',
  selectionPitch: 'We will save the legal lineup, choose a scheme, and fix exposed positions before Week 1.',
  strengths: ['Practice schedule checks', 'Staff role checks', 'Lineup order checks'],
  cardAccent: 'gold',
  welcomeMonologue: 'Welcome to the {teamName}. We start by saving a legal lineup, picking a scheme that protects player assignments, and protecting exposed starters and first-backup jobs before Week 1.',
  catchphrase: 'Save the lineup, prep the opponent, and fix exposed positions.',
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

function flattenDialogue(dialogue: any): string {
  return [
    dialogue.intro,
    dialogue.recommendation,
    dialogue.closingRemark,
    ...dialogue.insights.map((insight: any) => `${insight.text} ${insight.dataPoint ?? ''}`),
  ].filter(Boolean).join(' ');
}

function flattenProfile(profile: any): string {
  return [
    profile.background,
    profile.selectionPitch,
    profile.welcomeMonologue,
    profile.catchphrase,
    ...profile.strengths,
    ...Object.values(profile.teachingNarration ?? {}),
  ].filter(Boolean).join(' ');
}

function expectAssistantActionAndConsequence(copy: string, label: string): void {
  expect(copy.length, label).toBeGreaterThan(0);
  expect(ASSISTANT_ACTION_CUE.test(copy), `${label}: ${copy}`).toBe(true);
  expect(ASSISTANT_CONSEQUENCE_CUE.test(copy), `${label}: ${copy}`).toBe(true);
}

describe('assistant gm exports', () => {
  it('exports the Sprint 33 assistant gm API from the engine barrel', () => {
    expect(typeof assistant.getAGMProfiles).toBe('function');
    expect(typeof assistant.getSelectedAGM).toBe('function');
    expect(typeof assistant.getCoachCandidates).toBe('function');
    expect(typeof assistant.getScoutCandidates).toBe('function');
    expect(typeof assistant.getSchemeReaction).toBe('function');
    expect(typeof assistant.getGoalReaction).toBe('function');
    expect(typeof assistant.getTeachingTips).toBe('function');
    expect(typeof assistant.getPhaseTransitionFlavor).toBe('function');
    expect(typeof assistant.getTransitionTip).toBe('function');
    expect(typeof assistant.getBlueprintClosingMonologue).toBe('function');
    expect(typeof assistant.getAGMGreeting).toBe('function');
    expect(typeof assistant.agmOnIntelBriefing).toBe('function');
    expect(typeof assistant.agmOnRosterOverview).toBe('function');
    expect(typeof assistant.agmOnHireCoach).toBe('function');
    expect(typeof assistant.agmOnHireScout).toBe('function');
    expect(typeof assistant.agmOnSchemeSelection).toBe('function');
    expect(typeof assistant.agmOnDepthChart).toBe('function');
    expect(typeof assistant.agmOnCapStrategy).toBe('function');
    expect(typeof assistant.agmOnGoalSelection).toBe('function');
    expect(typeof assistant.agmOnBlueprint).toBe('function');
    expect(typeof assistant.getAGMCoachReaction).toBe('function');
    expect(typeof assistant.getAGMScoutReaction).toBe('function');
    expect(typeof assistant.agmReactsToSchemeChoice).toBe('function');
    expect(typeof assistant.agmReactsToGoalChoice).toBe('function');
    expect(typeof assistant.toneAdjust).toBe('function');
    expect(typeof assistant.expertiseEmphasis).toBe('function');
    expect(typeof assistant.getExpertiseInsight).toBe('function');
  });
});

describe('assistant gm catalog and helpers', () => {
  it('returns exactly three selectable AGM profiles', () => {
    const getAGMProfiles = requiredFunction('getAGMProfiles');
    const profiles = getAGMProfiles();

    expect(profiles).toHaveLength(3);
    expect(profiles.map((profile) => profile.id)).toEqual([
      'marcus_webb',
      'coach_d_hardaway',
      'sandra_chen',
    ]);
  });

  it('finds a selected AGM by id and returns null for unknown ids', () => {
    const getSelectedAGM = requiredFunction('getSelectedAGM');

    expect(getSelectedAGM('marcus_webb')?.id).toBe('marcus_webb');
    expect(getSelectedAGM('not_real')).toBeNull();
  });

  it('includes selection screen fields on all selectable profiles', () => {
    const getAGMProfiles = requiredFunction('getAGMProfiles');

    for (const profile of getAGMProfiles()) {
      expect(typeof profile.title).toBe('string');
      expect(profile.title.length).toBeGreaterThan(5);
      expect(typeof profile.selectionPitch).toBe('string');
      expect(profile.selectionPitch.length).toBeGreaterThan(10);
      expectAssistantActionAndConsequence(profile.selectionPitch, `${profile.id} selection pitch`);
      expect(Array.isArray(profile.strengths)).toBe(true);
      expect(profile.strengths.length).toBeGreaterThanOrEqual(3);
      expect(typeof profile.cardAccent).toBe('string');
      expect(profile.cardAccent.length).toBeGreaterThan(0);
      expect(typeof profile.welcomeMonologue).toBe('string');
      expect(profile.welcomeMonologue.length).toBeGreaterThan(10);
      expectAssistantActionAndConsequence(profile.welcomeMonologue, `${profile.id} welcome monologue`);
      expectAssistantActionAndConsequence(profile.teachingNarration.what_is_a_head_coach, `${profile.id} coach teaching`);
      expectAssistantActionAndConsequence(profile.teachingNarration.what_is_a_scouting_director, `${profile.id} scout teaching`);
      expect(profile.catchphrase).toMatch(/\b(?:cost|deadline|consequence|fix|exposed position|role|risk)\b/i);
      expect(profile.catchphrase).not.toMatch(STALE_ASSISTANT_GM_SETUP_COPY);
    }
  });

  it('keeps early setup advisor copy practical and consequence-focused', () => {
    const getAGMProfiles = requiredFunction('getAGMProfiles');
    const agmOnIntelBriefing = requiredFunction('agmOnIntelBriefing');
    const agmOnRosterOverview = requiredFunction('agmOnRosterOverview');
    const agmOnHireCoach = requiredFunction('agmOnHireCoach');
    const agmOnHireScout = requiredFunction('agmOnHireScout');
    const agmOnSchemeSelection = requiredFunction('agmOnSchemeSelection');
    const agmOnDepthChart = requiredFunction('agmOnDepthChart');
    const agmOnCapStrategy = requiredFunction('agmOnCapStrategy');
    const agmOnGoalSelection = requiredFunction('agmOnGoalSelection');
    const agmOnBlueprint = requiredFunction('agmOnBlueprint');
    const profiles = getAGMProfiles();
    const [marcus, coachD, sandra] = profiles;
    const setupGame = addBattleAndInjury();
    const capGame = capCrunchGame();
    const intel = engine.generateIntelBriefing(setupGame, 'afce1');
    const roster = engine.generateRosterOverview(setupGame, 'afce1');
    const coaching = engine.generateCoachingReview(setupGame, 'afce1');
    const scheme = engine.generateSchemeContext(setupGame, 'afce1');
    const depth = engine.generateDepthChartContext(setupGame, 'afce1', { off: 'spread', def: 'cover_3' });
    const cap = engine.generateCapBriefing(capGame, 'afce1');
    const goals = engine.generateGoalContext(capGame, 'afce1');
    const blueprint = engine.generateBlueprint(setupGame, 'afce1', {
      offenseScheme: 'spread',
      defenseScheme: 'cover_3',
      seasonGoals: ['playoff_berth', 'draft_well', 'winning_record'],
      depthChartOverrides: {},
      acknowledged: ['intel_briefing', 'meet_roster', 'hire_coach', 'hire_scout', 'set_scheme', 'depth_chart', 'cap_strategy', 'set_goals'],
    });
    const visibleCopy = [
      ...profiles.map(flattenProfile),
      flattenDialogue(agmOnIntelBriefing(intel, coachD)),
      flattenDialogue(agmOnRosterOverview(roster, sandra)),
      flattenDialogue(agmOnHireCoach(coaching, coachD)),
      flattenDialogue(agmOnHireScout(intel, marcus)),
      flattenDialogue(agmOnSchemeSelection(scheme, marcus)),
      flattenDialogue(agmOnDepthChart(depth, sandra)),
      flattenDialogue(agmOnCapStrategy(cap, marcus)),
      flattenDialogue(agmOnGoalSelection(goals, marcus)),
      flattenDialogue(agmOnBlueprint(blueprint, marcus)),
      flattenDialogue(agmOnBlueprint(blueprint, coachD)),
      flattenDialogue(agmOnBlueprint(blueprint, sandra)),
    ].join(' ');

    expect(ASSISTANT_GM_SOURCE).not.toMatch(STALE_ASSISTANT_GM_SETUP_COPY);
    expect(ASSISTANT_GM_SOURCE).not.toMatch(RECENT_STALE_ASSISTANT_GM_COPY);
    expect(ASSISTANT_GM_SOURCE).not.toMatch(RECENT_STALE_ASSISTANT_GM_RESIDUAL_COPY);
    expect(ASSISTANT_GM_SOURCE).not.toMatch(RECENT_STALE_ASSISTANT_SETUP_DECISION_COPY);
    expect(ASSISTANT_GM_SOURCE).not.toMatch(RECENT_STALE_CHIP_PROFILE_COPY);
    expect(ASSISTANT_GM_SOURCE).not.toMatch(RECENT_STALE_ASSISTANT_GM_SETUP_COPY);
    expect(ASSISTANT_GM_SOURCE).not.toMatch(ASSISTANT_GM_HELP_SHORTHAND);
    expect(ASSISTANT_GM_SOURCE).not.toMatch(ASSISTANT_SCOUTING_SHORTHAND);
    expect(ASSISTANT_GM_SOURCE).not.toMatch(ASSISTANT_CAP_GRADE_SHORTHAND);
    expect(ASSISTANT_GM_SOURCE).not.toMatch(RECENT_STALE_ADVISOR_PRESSURE_COPY);
    expect(ASSISTANT_GM_SOURCE).not.toMatch(RECENT_STALE_ASSISTANT_PROFILE_COPY);
    expect(ASSISTANT_GM_SOURCE).not.toMatch(RECENT_STALE_ASSISTANT_CAN_SHORTHAND);
    expect(ASSISTANT_GM_SOURCE).not.toMatch(RECENT_STALE_HEDGED_ASSISTANT_COPY);
    expect(ASSISTANT_GM_SOURCE).not.toMatch(RECENT_STALE_ASSISTANT_SOFT_CONSEQUENCE_COPY);
    expect(ASSISTANT_GM_SOURCE).not.toMatch(RECENT_STALE_ASSISTANT_PHASE_COPY);
    expect(ASSISTANT_GM_SOURCE).not.toMatch(/roles, snaps, and support|support him|current players support|support them weekly|must support that plan/i);
    expect(ASSISTANT_GM_SOURCE).not.toMatch(RAW_ASSISTANT_GM_RATING_COPY);
    expect(ASSISTANT_GM_SOURCE).not.toMatch(RESTRICTIVE_ASSISTANT_GM_CONDITION_COPY);
    expect(ASSISTANT_GM_SOURCE).not.toMatch(RESTRICTIVE_ASSISTANT_GM_DO_NOT_COPY);
    expect(ASSISTANT_GM_SOURCE).not.toMatch(/\bUse\b/);
    expect(ASSISTANT_GM_SOURCE).toContain('save cap space for the next starter fix, backup fix, injury, or extension deadline');
    expect(ASSISTANT_GM_SOURCE).not.toMatch(STALE_ASSISTANT_GM_ROSTER_NEED_COPY);
    expect(ASSISTANT_GM_SOURCE).not.toMatch(RECENT_STALE_ASSISTANT_GM_CONCRETE_SHORTHAND);
    expect(ASSISTANT_GM_SOURCE).not.toMatch(RECENT_STALE_ASSISTANT_GOAL_REACTION_COPY);
    expect(ASSISTANT_GM_SOURCE).not.toMatch(/before spending picks or cap space elsewhere/i);
    expect(ASSISTANT_GM_SOURCE).toContain('one depth mistake costs a playoff game or division tiebreaker');
    expect(ASSISTANT_GM_SOURCE).not.toMatch(/\b(?:inspect|audit|justifies|The data says|The numbers say|Numerically|first checkpoint|data-first)\b/i);
    expect(visibleCopy).not.toMatch(/\b(?:inspect|audit|justifies|The data says|The numbers say|Numerically|first checkpoint|data-first)\b/i);
    expect(visibleCopy).toContain('name starter and backup cover first');
    expect(visibleCopy).toContain('Name starters, first backups, and protected stars');
    expect(visibleCopy).toContain('Name the replacement before saving depth');
    expect(visibleCopy).toContain('edit before it locks');
    expect(visibleCopy).toContain('set WR3 Spot before Advance Week locks the lineup');
    expect(ASSISTANT_GM_SOURCE).toContain("set ${data.activeBattles[0]?.slotLabel ?? 'backup roles, third-down spots, and injury cover'} before Advance Week locks the lineup");
    expect(ASSISTANT_GM_SOURCE).not.toMatch(/can swing the season/i);
    expect(visibleCopy).not.toMatch(/\b(?:building loud|room is yours|reads a room|board is lying|draft room|chasing noise|top-end juice|draft for upside|pure panic|franchise touchpoint|franchise tentpole|swimming upstream|call sheet|blueprint breathes|standard we are putting on the wall|contract fire|cleanest conversation on the board|feeding the board|buy tomorrow|real point of view|brand of football|create runway|first leak|walking in around|cleanest lever on the board|in room and|sets the temperature|competitive edge|cleanest|bet on|execute cleanly|clean personnel|clean collective|margin for error|roster window|trajectory score|raw star power|wastes weeks|clean up who earns|window labeled|would feel that mismatch|feel natural|defensive identity|clear identity instead of a placeholder|I can feel it|see the vision|apologizing for it|will feel it first|what this franchise really is|priority player|best collective fit|coherent first picture|real look before we call it settled|boundary for everything else|defining contracts|season’s flexibility|season's flexibility|season’s risk profile|season's risk profile|logic behind the plan|path I would have mapped|plan works|grounded enough to track|what these players are made of|arrow up|best version of this offense|setting the tone|will look like him|not a throwaway checkbox|The numbers never lie|Trust the tape|NOT giving up easy yards)\b/i);
    expect(visibleCopy).not.toMatch(/\b(?:building loud|room is yours|reads a room|board is lying|draft room|chasing noise|top-end juice|draft for upside|pure panic|franchise touchpoint|franchise tentpole|swimming upstream|call sheet|blueprint breathes|standard we are putting on the wall|contract fire|cleanest conversation on the board|feeding the board|buy tomorrow|real point of view|brand of football|create runway|first leak|walking in around|cleanest lever on the board|in room and|sets the temperature|competitive edge|cleanest|bet on|execute cleanly|clean personnel|clean collective|margin for error|roster window|trajectory score|raw star power|wastes weeks|clean up who earns|window labeled|would feel that mismatch|feel natural|defensive identity|clear identity instead of a placeholder|I can feel it|see the vision|apologizing for it|will feel it first|what this franchise really is|priority player|best collective fit|coherent first picture|real look before we call it settled|boundary for everything else|defining contracts|season’s flexibility|season's flexibility|season’s risk profile|season's risk profile|logic behind the plan|path I would have mapped|plan works|grounded enough to track|what these players are made of|arrow up|best version of this offense|setting the tone|will look like him|not a throwaway checkbox|The numbers never lie|Trust the tape|NOT giving up easy yards|real top-end talent|Health is stable right now|stable enough that we can spend picks|relatively clear|My default move|real competition|real cap need|recommended for a reason|going to be rough|would need real turnover|I will back your call)\b/i);
    expect(visibleCopy).not.toMatch(RECENT_STALE_ASSISTANT_GM_COPY);
    expect(visibleCopy).not.toMatch(RECENT_STALE_ASSISTANT_GM_RESIDUAL_COPY);
    expect(visibleCopy).not.toMatch(RECENT_STALE_ASSISTANT_SETUP_DECISION_COPY);
    expect(visibleCopy).not.toMatch(RECENT_STALE_ASSISTANT_GM_SETUP_COPY);
    expect(visibleCopy).not.toMatch(ASSISTANT_GM_HELP_SHORTHAND);
    expect(visibleCopy).not.toMatch(ASSISTANT_SCOUTING_SHORTHAND);
    expect(visibleCopy).not.toMatch(ASSISTANT_CAP_GRADE_SHORTHAND);
    expect(visibleCopy).not.toMatch(RECENT_STALE_ADVISOR_PRESSURE_COPY);
    expect(visibleCopy).not.toMatch(RECENT_STALE_ASSISTANT_PROFILE_COPY);
    expect(visibleCopy).not.toMatch(RECENT_STALE_ASSISTANT_CAN_SHORTHAND);
    expect(visibleCopy).not.toMatch(RECENT_STALE_ASSISTANT_SOFT_CONSEQUENCE_COPY);
    expect(visibleCopy).not.toMatch(RECENT_STALE_ASSISTANT_PHASE_COPY);
    expect(visibleCopy).not.toMatch(/roles, snaps, and support|support him|current players support|support them weekly|must support that plan/i);
    expect(visibleCopy).not.toMatch(RAW_ASSISTANT_GM_RATING_COPY);
    expect(visibleCopy).not.toMatch(RESTRICTIVE_ASSISTANT_GM_CONDITION_COPY);
    expect(visibleCopy).not.toMatch(RESTRICTIVE_ASSISTANT_GM_DO_NOT_COPY);
    expect(visibleCopy).not.toMatch(RECENT_STALE_ASSISTANT_GM_CONCRETE_SHORTHAND);
    expect(visibleCopy).not.toMatch(/\belsewhere\b/i);
    expect(visibleCopy).not.toMatch(/should shape the Game Plan|best starting point/i);
    expect(visibleCopy).not.toMatch(/can support the recommended defensive plan|opportunity over the next three drafts/i);
    expect(visibleCopy).not.toMatch(RECENT_STALE_ASSISTANT_GOAL_REACTION_COPY);
    expect(visibleCopy).not.toMatch(/No single player is worth driving setup alone|strengths decide who the plan protects|installs and young-player snaps drift|install can drift|roles drift|jobs drift|mismatched weekly roles|head coach who can carry|safest Week 1 role plan|cap sheet grades out|can handle those jobs|can survive Week 1/i);
    expect(visibleCopy).toMatch(/Match coordinator roles to his scheme before Week 1/i);
    expect(visibleCopy).toContain('Week 1 missed assignments start in protection and timing');
    expect(visibleCopy).toContain('Build Game Plan calls from that base before kickoff');
    expect(visibleCopy).toContain('Assign each defender a run, coverage, or blitz job before kickoff');
    expect(visibleCopy).toContain('choose schemes that match the roles scouting has named before draft picks become roster costs');
    expect(visibleCopy).toContain('has Week 1 starters and first backups already set');
    expect(visibleCopy).toContain('current starters already match those run, pass, coverage, and run-defense jobs');
    expect(visibleCopy).toMatch(/Week 1 starts from this plan\. Set prep, depth, and cap choices every week/i);
    expect(visibleCopy).toContain('Set snaps, morale, and development choices every week');
    expect(visibleCopy).toContain('cornerstone starter');
    expect(visibleCopy).toMatch(/\b(?:major development jump|development snaps increased|small development gain)\b/i);
    expect(visibleCopy).toContain('Week 1 starts with backups covered or injury fixes blocked');
    expect(visibleCopy).toMatch(/starter jobs, first-backup jobs, and cap choices must be handled before Week 1/i);
    expect(visibleCopy).toContain('unnamed player jobs');
    expect(visibleCopy).toContain('biggest uncovered starter or backup spot');
    expect(visibleCopy).toContain('where a contract, injury replacement, or roster move still protects the lineup');
    expect(visibleCopy).toContain('Week 1 starter job, cap move, or Game Plan call');
    expect(visibleCopy).toMatch(/weaker starters or backups cost Week 1 possessions/i);
    expect(visibleCopy).toContain('Cap-space choices before cuts');
    expect(visibleCopy).toContain('Dead-money tradeoffs before contracts');
    expect(visibleCopy).toContain('Promise deadlines before commitments');
    expect(visibleCopy).toContain('Find exposed starters before Week 1');
    expect(visibleCopy).toContain('Assign player jobs before snaps change');
    expect(visibleCopy).toContain('Flag morale fallout before cuts');
    expect(visibleCopy).toContain('1st league rank');
    expect(visibleCopy).toContain('win-now moves');
    expect(visibleCopy).toContain('current starters, cap space, and Week 1 lineup jobs');
    expect(visibleCopy).toContain('stay realistic only if weekly roster and cap choices preserve that plan');
    expect(visibleCopy).toContain('veteran staff command');
    expect(visibleCopy).not.toContain('1th');
    expect(visibleCopy).not.toMatch(/\bLevel \d+\b/);
    expect(visibleCopy).toMatch(/\b(?:cost|cap space|dead cap|cuts|scheme|practice|development|snaps|roles|draft|picks|owner patience|risk|weakness|overpay|prep work|starter|backups|weekly)\b/i);
  });

  it('returns three deterministic head coach candidates', () => {
    const getCoachCandidates = requiredFunction('getCoachCandidates');
    const candidates = getCoachCandidates();

    expect(candidates).toHaveLength(3);
    for (const candidate of candidates) {
      expect(typeof candidate.id).toBe('string');
      expect(typeof candidate.name).toBe('string');
      expect(typeof candidate.background).toBe('string');
      expect(Array.isArray(candidate.strengths)).toBe(true);
      expect(Array.isArray(candidate.weaknesses)).toBe(true);
      expect(candidate.strengths.length).toBeGreaterThan(0);
      expect(candidate.weaknesses.length).toBeGreaterThan(0);
      expect(typeof candidate.interviewQuote).toBe('string');
    }
  });

  it('returns three deterministic scouting director candidates', () => {
    const getScoutCandidates = requiredFunction('getScoutCandidates');
    const candidates = getScoutCandidates();

    expect(candidates).toHaveLength(3);
    for (const candidate of candidates) {
      expect(typeof candidate.id).toBe('string');
      expect(typeof candidate.name).toBe('string');
      expect(typeof candidate.specialty).toBe('string');
      expect(typeof candidate.philosophy).toBe('string');
      expect(Array.isArray(candidate.strengths)).toBe(true);
      expect(Array.isArray(candidate.weaknesses)).toBe(true);
      expect(typeof candidate.interviewQuote).toBe('string');
    }
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
    expect(insight.text).toContain('Preview');
    expect(insight.text).toContain('dead-money or depth loss');
    expect(insight.text).not.toMatch(RESTRICTIVE_ASSISTANT_GM_DO_NOT_COPY);
  });
});

describe('assistant gm phase dialogue', () => {
  it('builds an intel briefing dialogue with real team context', () => {
    const agmOnIntelBriefing = requiredFunction('agmOnIntelBriefing');
    const intel = engine.generateIntelBriefing(addBattleAndInjury(), 'afce1');
    const dialogue = agmOnIntelBriefing(intel, COACH_D);

    expectDialogue(dialogue, 'intel_briefing');
    expect(dialogue.intro).not.toContain(intel.windowPhase);
    expect(dialogue.intro).toContain('Week 1');
    expect(dialogue.intro).toContain('backups covered or injury fixes blocked');
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
    expect(flattenDialogue(dialogue)).toContain('Set legal starters, protect development snaps');
    expect(flattenDialogue(dialogue)).toContain('Week 1 mistakes force emergency veteran fixes');
    expect(flattenDialogue(dialogue)).not.toContain('raises the importance');
    expect(flattenDialogue(dialogue)).not.toMatch(/structure and development/i);
  });

  it('builds a hire-coach dialogue even when staff spots are vacant', () => {
    const agmOnHireCoach = requiredFunction('agmOnHireCoach');
    const review = engine.generateCoachingReview(makeLeagueState('regular_season', 1), 'afce1');
    const dialogue = agmOnHireCoach(review, TOMMY);

    expectDialogue(dialogue, 'hire_coach');
    expect(dialogue.intro.toLowerCase()).toContain('coach');
    expect(dialogue.intro).toContain('Calls that do not match current starters slow every setup choice after this.');
    expect(dialogue.intro).not.toContain('A bad fit slows every setup choice after this.');
    expect(flattenDialogue(dialogue)).toContain('Choose protection, tempo, and receiver calls that fit current blockers and receivers now');
    expect(flattenDialogue(dialogue)).toContain('Avoid blitz or man-coverage changes');
    expect(flattenDialogue(dialogue)).toContain('least protected defenders get isolated before Week 1');
    expect(flattenDialogue(dialogue)).not.toMatch(/something simple and executable|Aggressive defensive changes carry more risk/i);
    expect(flattenDialogue(dialogue)).not.toMatch(/run\/pass|roster can run|players can run|current players cannot run|starters cannot run|can run now/i);
  });

  it('builds a hire-scout dialogue around scouting coverage', () => {
    const agmOnHireScout = requiredFunction('agmOnHireScout');
    const dialogue = agmOnHireScout(engine.generateIntelBriefing(addBattleAndInjury(), 'afce1'), MARCUS);

    expectDialogue(dialogue, 'hire_scout');
    expect(dialogue.intro.toLowerCase()).toContain('scout');
  });

  it('builds a scheme recommendation dialogue that references the best-fit schemes', () => {
    const agmOnSchemeSelection = requiredFunction('agmOnSchemeSelection');
    const context = engine.generateSchemeContext(addBattleAndInjury(), 'afce1');
    const dialogue = agmOnSchemeSelection(context, MARCUS);

    expectDialogue(dialogue, 'set_scheme');
    expect(dialogue.recommendation).toContain(context.offenseOptions[0]!.label);
    expect(dialogue.recommendation).toContain(context.defenseOptions[0]!.label);
    expect(flattenDialogue(dialogue)).toContain('Week 1');
    expect(flattenDialogue(dialogue)).toContain('late scheme changes create missed assignments before Week 1');
    expect(flattenDialogue(dialogue)).not.toMatch(/\d+-point install cost|install cost|has only a \d+ fit/i);
    expect(flattenDialogue(dialogue)).not.toMatch(/roster can run|players can run|current players cannot run|starters cannot run|can run now/i);
    expect(flattenDialogue(dialogue)).not.toMatch(RECENT_STALE_ASSISTANT_GM_COPY);
  });

  it('builds a depth chart dialogue that mentions active battles', () => {
    const agmOnDepthChart = requiredFunction('agmOnDepthChart');
    const context = engine.generateDepthChartContext(addBattleAndInjury(), 'afce1', { off: 'spread', def: 'cover_3' });
    const dialogue = agmOnDepthChart(context, SANDRA);

    expectDialogue(dialogue, 'depth_chart');
    expect(context.activeBattles.length).toBeGreaterThan(0);
    expect(flattenDialogue(dialogue)).toContain('Auto-set gives a legal starting order');
    expect(flattenDialogue(dialogue)).toContain('Name current ability, assigned role, and the Week 1 snap consequence before saving that order');
    expect(flattenDialogue(dialogue)).not.toMatch(RESTRICTIVE_ASSISTANT_GM_DO_NOT_COPY);
    expect(flattenDialogue(dialogue)).not.toMatch(STALE_ASSISTANT_GM_SETUP_COPY);
    expect(flattenDialogue(dialogue)).not.toMatch(RECENT_STALE_ASSISTANT_GM_COPY);
  });

  it('builds a cap strategy dialogue with contract-specific analysis', () => {
    const agmOnCapStrategy = requiredFunction('agmOnCapStrategy');
    const cap = engine.generateCapBriefing(capCrunchGame(), 'afce1');
    const dialogue = agmOnCapStrategy(cap, MARCUS);

    expectDialogue(dialogue, 'cap_strategy');
    expect(dialogue.insights.some((insight: any) => typeof insight.dataPoint === 'string' && insight.dataPoint.includes('$'))).toBe(true);
    expect(flattenDialogue(dialogue)).not.toMatch(STALE_ASSISTANT_GM_SETUP_COPY);
    expect(flattenDialogue(dialogue)).not.toMatch(RECENT_STALE_ASSISTANT_GM_COPY);
    expect(flattenDialogue(dialogue)).toContain('Adding players now forces a tradeoff');
    expect(flattenDialogue(dialogue)).toContain('save fewer moves for later injuries and extensions');
    expect(flattenDialogue(dialogue)).not.toMatch(/wait for a roster need|Wait until/i);
    expect(flattenDialogue(dialogue)).not.toContain('Do not spend cap space');
    expect(flattenDialogue(dialogue)).not.toMatch(RESTRICTIVE_ASSISTANT_GM_DO_NOT_COPY);
    expect(flattenDialogue(dialogue)).not.toMatch(RECENT_STALE_HEDGED_ASSISTANT_COPY);
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
      acknowledged: ['intel_briefing', 'meet_roster', 'hire_coach', 'hire_scout', 'depth_chart', 'cap_strategy', 'blueprint'],
    });
    const dialogue = agmOnBlueprint(blueprint, COACH_D);

    expectDialogue(dialogue, 'blueprint');
    expect(['confident', 'excited']).toContain(dialogue.tone);
    expect(dialogue.intro).toContain(blueprint.selectedSchemes.offenseLabel);
    expect(dialogue.intro).toContain('Week 1 plan');
    expect(dialogue.intro).not.toContain('roster phase');
    expect(flattenDialogue(dialogue)).toMatch(/set depth-chart order and preview cap options/i);
    expect(flattenDialogue(dialogue)).toMatch(/stay realistic only if weekly roster and cap choices preserve that plan/i);
    expect(flattenDialogue(dialogue)).not.toContain('check depth-chart order');
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
  it('returns valid coach reactions for every agm-candidate pairing', () => {
    const getAGMProfiles = requiredFunction('getAGMProfiles');
    const getCoachCandidates = requiredFunction('getCoachCandidates');
    const getAGMCoachReaction = requiredFunction('getAGMCoachReaction');

    for (const agm of getAGMProfiles()) {
      for (const coach of getCoachCandidates()) {
        const reaction = getAGMCoachReaction(agm.id, coach.id);
        expect(['hire', 'consider', 'pass']).toContain(reaction.recommendation);
        expect(typeof reaction.analysis).toBe('string');
        expect(reaction.analysis.length).toBeGreaterThan(10);
        expect(typeof reaction.oneLiner).toBe('string');
        expect(reaction.oneLiner.length).toBeGreaterThan(5);
      }
    }
  });

  it('returns valid scout reactions for every agm-candidate pairing', () => {
    const getAGMProfiles = requiredFunction('getAGMProfiles');
    const getScoutCandidates = requiredFunction('getScoutCandidates');
    const getAGMScoutReaction = requiredFunction('getAGMScoutReaction');

    for (const agm of getAGMProfiles()) {
      for (const scout of getScoutCandidates()) {
        const reaction = getAGMScoutReaction(agm.id, scout.id);
        expect(['hire', 'consider', 'pass']).toContain(reaction.recommendation);
        expect(typeof reaction.analysis).toBe('string');
        expect(reaction.analysis.length).toBeGreaterThan(10);
        expect(typeof reaction.oneLiner).toBe('string');
        expect(reaction.oneLiner.length).toBeGreaterThan(5);
      }
    }
  });

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
    expect(reaction.reaction).not.toContain('Do not lock this pairing');
    expect(reaction.reaction).not.toContain('pairing problem');
  });

  it('scores goal choices by overlap with the recommended list', () => {
    const agmReactsToGoalChoice = requiredFunction('agmReactsToGoalChoice');
    const context = engine.generateGoalContext(capCrunchGame(), 'afce1');
    const recommended = context.recommendedGoals.map((goal) => goal.id);
    const oneMatch = [recommended[0]!, context.availableGoals.find((goal) => !recommended.includes(goal.id))!.id, context.availableGoals.findLast((goal) => !recommended.includes(goal.id))!.id];
    const noneMatch = context.availableGoals.filter((goal) => !recommended.includes(goal.id)).slice(0, 3).map((goal) => goal.id);

    const fullMatch = agmReactsToGoalChoice(recommended, context, TOMMY);
    expect(fullMatch.sentiment).toBe('love_it');
    expect(fullMatch.reaction).toContain('early losses cost less owner patience');
    expect(fullMatch.reaction).not.toContain('goal stack fits the roster');
    const partialMatch = agmReactsToGoalChoice(recommended.slice(0, 2).concat([noneMatch[0]!]), context, TOMMY);
    expect(partialMatch.sentiment).toBe('like_it');
    expect(`${partialMatch.reaction} ${partialMatch.followUp ?? ''}`).toContain('missing it turns early losses into owner-patience cuts or budget pressure');
    expect(`${partialMatch.reaction} ${partialMatch.followUp ?? ''}`).not.toMatch(RECENT_STALE_ASSISTANT_GOAL_REACTION_COPY);
    expect(agmReactsToGoalChoice(oneMatch, context, TOMMY).sentiment).toBe('concerned');
    const noMatch = agmReactsToGoalChoice(noneMatch, context, TOMMY);
    expect(noMatch.sentiment).toBe('disagree');
    expect(noMatch.reaction).toContain('Plan this goal set again before lock-in');
    expect(noMatch.reaction).toContain('early losses cut owner patience and push roster spending');
    expect(noMatch.reaction).not.toContain('Do not lock these goals');
    expect(noMatch.reaction).not.toMatch(RECENT_STALE_ASSISTANT_GOAL_REACTION_COPY);
  });

  it('keeps live scheme and goal reaction lines action-and-consequence focused', () => {
    const getAGMProfiles = requiredFunction('getAGMProfiles');
    const agmReactsToSchemeChoice = requiredFunction('agmReactsToSchemeChoice');
    const agmReactsToGoalChoice = requiredFunction('agmReactsToGoalChoice');
    const schemeContext = engine.generateSchemeContext(addBattleAndInjury(), 'afce1');
    const goalContext = engine.generateGoalContext(capCrunchGame(), 'afce1');
    const recommendedGoals = goalContext.recommendedGoals.map((goal) => goal.id);
    const notRecommendedGoals = goalContext.availableGoals
      .filter((goal) => !recommendedGoals.includes(goal.id))
      .map((goal) => goal.id);
    const goalChoices = [
      recommendedGoals,
      recommendedGoals.slice(0, 2).concat(notRecommendedGoals[0]!),
      [recommendedGoals[0]!, notRecommendedGoals[0]!, notRecommendedGoals[1]!],
      notRecommendedGoals.slice(0, 3),
    ];
    const schemeChoices = [
      [schemeContext.offenseOptions[0]!.schemeId, schemeContext.defenseOptions[0]!.schemeId],
      [schemeContext.offenseOptions[1]!.schemeId, schemeContext.defenseOptions[1]!.schemeId],
      [schemeContext.offenseOptions.at(-1)!.schemeId, schemeContext.defenseOptions.at(-1)!.schemeId],
      [schemeContext.offenseOptions[0]!.schemeId, schemeContext.defenseOptions.at(-1)!.schemeId],
    ] as const;

    for (const agm of getAGMProfiles()) {
      for (const [offense, defense] of schemeChoices) {
        const reaction = agmReactsToSchemeChoice(offense, defense, schemeContext, agm);
        expectAssistantActionAndConsequence(reaction.reaction, `${agm.id} ${offense}/${defense} reaction`);
        if (reaction.followUp) {
          expectAssistantActionAndConsequence(reaction.followUp, `${agm.id} ${offense}/${defense} follow-up`);
        }
      }

      for (const choices of goalChoices) {
        const reaction = agmReactsToGoalChoice(choices, goalContext, agm);
        expectAssistantActionAndConsequence(reaction.reaction, `${agm.id} ${choices.join('+')} goal reaction`);
        if (reaction.followUp) {
          expectAssistantActionAndConsequence(reaction.followUp, `${agm.id} ${choices.join('+')} goal follow-up`);
        }
      }
    }
  });

  it('returns scheme reaction copy for all live schemes across all live agms', () => {
    const getAGMProfiles = requiredFunction('getAGMProfiles');
    const getSchemeReaction = requiredFunction('getSchemeReaction');
    const schemeIds = ['spread', 'west_coast', 'power_run', 'air_raid', 'balanced', '4-3', '3-4', 'cover_2', 'cover_3', 'man_press'];

    for (const agm of getAGMProfiles()) {
      for (const schemeId of schemeIds) {
        const reaction = getSchemeReaction(agm.id, schemeId);
        expect(typeof reaction).toBe('string');
        expect(reaction.length).toBeGreaterThan(12);
      }
    }
  });

  it('returns goal reaction copy for all live goals across all live agms', () => {
    const getAGMProfiles = requiredFunction('getAGMProfiles');
    const getGoalReaction = requiredFunction('getGoalReaction');
    const goalIds = ['win_division', 'playoff_berth', 'winning_record', 'rebuild_progress', 'cap_health', 'star_power', 'no_losing_streak', 'draft_well', 'championship'];

    for (const agm of getAGMProfiles()) {
      for (const goalId of goalIds) {
        const reaction = getGoalReaction(agm.id, goalId);
        expect(typeof reaction).toBe('string');
        expect(reaction.length).toBeGreaterThan(12);
      }
    }
  });

  it('returns teaching tips, transition flavor, and a deterministic loading tip', () => {
    const getTeachingTips = requiredFunction('getTeachingTips');
    const getPhaseTransitionFlavor = requiredFunction('getPhaseTransitionFlavor');
    const getTransitionTip = requiredFunction('getTransitionTip');

    const tips = getTeachingTips('marcus_webb', 'roster_screen');
    expect(tips.length).toBeGreaterThanOrEqual(3);
    expect(tips[0]!.length).toBeGreaterThan(12);

    const flavor = getPhaseTransitionFlavor('coach_d_hardaway', 'hire_coach', 'hire_scout');
    expect(flavor.length).toBeGreaterThan(12);

    expect(getTransitionTip(77, 'meet_roster', 'hire_coach')).toBe(getTransitionTip(77, 'meet_roster', 'hire_coach'));
  });

  it('returns a closing monologue for all live agms', () => {
    const getAGMProfiles = requiredFunction('getAGMProfiles');
    const getBlueprintClosingMonologue = requiredFunction('getBlueprintClosingMonologue');

    for (const agm of getAGMProfiles()) {
      const monologue = getBlueprintClosingMonologue(agm.id);
      expect(typeof monologue).toBe('string');
      expect(monologue.length).toBeGreaterThan(20);
    }
  });
});
