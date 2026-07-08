import agmCharactersJson from '../../../content/agm/agm-characters.json';
import hiringContentJson from '../../../content/agm/hiring-content.json';
import teachingPolishJson from '../../../content/agm/teaching-polish.json';
import type { SetupPhase } from './franchise-setup';

type MuseAgmId = 'elias_vance' | 'derrick_coleman' | 'maya_alvarez';
type LiveAgmId = 'marcus_webb' | 'coach_d_hardaway' | 'sandra_chen';
type TeachingTipTopic = 'roster_screen' | 'depth_chart_screen' | 'cap_screen' | 'game_plan_screen';
type Recommendation = 'hire' | 'consider' | 'pass';

interface HiringReactionContent {
  recommendation: Recommendation;
  analysis: string;
  one_liner: string;
}

interface HiringContentShape {
  head_coach_candidates: Array<{
    id: string;
    agm_reactions: Record<MuseAgmId, HiringReactionContent>;
  }>;
  scouting_director_candidates: Array<{
    id: string;
    agm_reactions: Record<MuseAgmId, HiringReactionContent>;
  }>;
}

interface AgmCharactersShape {
  day_one_narrative: {
    after_selection: string;
    phase_transitions: Record<string, string>;
  };
}

interface TeachingPolishShape {
  scheme_reactions: Record<MuseAgmId, Record<string, string>>;
  goal_reactions: Record<MuseAgmId, Record<string, string>>;
  teaching_tips: Record<MuseAgmId, Record<TeachingTipTopic, string[]>>;
  phase_transition_flavor: Record<MuseAgmId, Record<string, string>>;
  loading_tips: string[];
  blueprint_closing_monologue: Record<MuseAgmId, string>;
}

const AGM_CONTENT_ALIAS: Record<LiveAgmId, MuseAgmId> = {
  marcus_webb: 'elias_vance',
  coach_d_hardaway: 'derrick_coleman',
  sandra_chen: 'maya_alvarez',
};

const COACH_CONTENT_ALIAS: Record<string, string> = {
  elias_rowe: 'marcus_whitaker',
  dorian_cross: 'victor_ramos',
  nico_morales: 'jamal_brooks',
};

const SCOUT_CONTENT_ALIAS: Record<string, string> = {
  zoe_wilcox: 'priya_desai',
  marvin_tate: 'calvin_hendricks',
  celia_duarte: 'theo_washington',
};

const GENERIC_TRANSITION_KEYS: Partial<Record<string, string>> = {
  'intel_briefing__meet_roster': 'intel_to_roster',
  'meet_roster__hire_coach': 'roster_to_coaching',
  'set_scheme__depth_chart': 'scheme_to_depth',
  'depth_chart__cap_strategy': 'depth_to_cap',
  'cap_strategy__set_goals': 'cap_to_goals',
  'set_goals__blueprint': 'goals_to_blueprint',
};

const LOCAL_TRANSITION_FALLBACKS: Record<string, string> = {
  'choose_agm__intel_briefing': 'Your new AGM opens Franchise Intel and points to roster, staff, depth-chart, and cap choices that decide Week 1 starter jobs, cap space, and missed calls.',
  'hire_coach__hire_scout': 'The coach is set. Now hire the scouting director who finds medical limits, assigned-role gaps, and coachability warnings before picks are spent.',
  'hire_scout__set_scheme': 'With staff and scouting set, choose schemes that protect current starter assignments by Week 1.',
};
const DEFAULT_TRANSITION_FALLBACK =
  'Name the setup decision before you commit; missed staff, scheme, cap, or goal choices cost Week 1 prep.';

const hiringContent = hiringContentJson as HiringContentShape;
const agmCharacters = agmCharactersJson as AgmCharactersShape;
const teachingPolish = teachingPolishJson as TeachingPolishShape;

function toMuseAgmId(agmId: string): MuseAgmId {
  return (AGM_CONTENT_ALIAS as Record<string, MuseAgmId | undefined>)[agmId] ?? (agmId as MuseAgmId);
}

function coachContentId(candidateId: string): string {
  return COACH_CONTENT_ALIAS[candidateId] ?? candidateId;
}

function scoutContentId(candidateId: string): string {
  return SCOUT_CONTENT_ALIAS[candidateId] ?? candidateId;
}

function transitionKey(fromPhase: SetupPhase, toPhase: SetupPhase): string {
  return `${fromPhase}__${toPhase}`;
}

function hashText(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function getCoachReactionEntry(agmId: string, candidateId: string): HiringReactionContent {
  const agmKey = toMuseAgmId(agmId);
  const candidate = hiringContent.head_coach_candidates.find((entry) => entry.id === coachContentId(candidateId));
  if (!candidate) {
    throw new Error(`Unknown coach content candidate ${candidateId}.`);
  }
  return candidate.agm_reactions[agmKey];
}

function getScoutReactionEntry(agmId: string, candidateId: string): HiringReactionContent {
  const agmKey = toMuseAgmId(agmId);
  const candidate = hiringContent.scouting_director_candidates.find((entry) => entry.id === scoutContentId(candidateId));
  if (!candidate) {
    throw new Error(`Unknown scout content candidate ${candidateId}.`);
  }
  return candidate.agm_reactions[agmKey];
}

export function getCoachHiringReaction(agmId: string, candidateId: string): { recommendation: Recommendation; analysis: string; oneLiner: string } {
  const reaction = getCoachReactionEntry(agmId, candidateId);
  return {
    recommendation: reaction.recommendation,
    analysis: reaction.analysis,
    oneLiner: reaction.one_liner,
  };
}

export function getScoutHiringReaction(agmId: string, candidateId: string): { recommendation: Recommendation; analysis: string; oneLiner: string } {
  const reaction = getScoutReactionEntry(agmId, candidateId);
  return {
    recommendation: reaction.recommendation,
    analysis: reaction.analysis,
    oneLiner: reaction.one_liner,
  };
}

export function getSchemeReaction(agmId: string, schemeId: string): string {
  const agmKey = toMuseAgmId(agmId);
  return teachingPolish.scheme_reactions[agmKey]?.[schemeId]
    ?? `Choose ${schemeId} when starters have assigned protection, coverage, and run-defense jobs; otherwise Week 1 mistakes arrive first.`;
}

export function getGoalReaction(agmId: string, goalId: string): string {
  const agmKey = toMuseAgmId(agmId);
  return teachingPolish.goal_reactions[agmKey]?.[goalId]
    ?? 'Choose that goal after naming starter strength, cap space, and owner patience; otherwise early losses force rushed trades or contract pushes.';
}

export function getTeachingTips(agmId: string, topicKey: string): string[] {
  const agmKey = toMuseAgmId(agmId);
  const typedKey = topicKey as TeachingTipTopic;
  return [...(teachingPolish.teaching_tips[agmKey]?.[typedKey] ?? [])];
}

export function getPhaseTransitionFlavor(agmId: string, fromPhase: SetupPhase, toPhase: SetupPhase): string {
  const agmKey = toMuseAgmId(agmId);
  const key = transitionKey(fromPhase, toPhase);
  const agmSpecific = teachingPolish.phase_transition_flavor[agmKey]?.[key];
  if (agmSpecific) return agmSpecific;

  if (key === 'choose_agm__intel_briefing') {
    return agmCharacters.day_one_narrative.after_selection;
  }

  const genericKey = GENERIC_TRANSITION_KEYS[key];
  if (genericKey) {
    return agmCharacters.day_one_narrative.phase_transitions[genericKey] ?? LOCAL_TRANSITION_FALLBACKS[key] ?? DEFAULT_TRANSITION_FALLBACK;
  }

  return LOCAL_TRANSITION_FALLBACKS[key] ?? DEFAULT_TRANSITION_FALLBACK;
}

export function getTransitionTip(seed: number, fromPhase: SetupPhase, toPhase: SetupPhase): string {
  const tips = teachingPolish.loading_tips;
  if (tips.length === 0) {
    return 'Before the next setup screen, name the decision and consequence; skipped warnings leave Week 1 injuries, cap costs, or matchups unresolved.';
  }
  const index = hashText(`${seed}:${fromPhase}:${toPhase}`) % tips.length;
  return tips[index]!;
}

export function getBlueprintClosingMonologue(agmId: string): string {
  const agmKey = toMuseAgmId(agmId);
  return teachingPolish.blueprint_closing_monologue[agmKey]
    ?? 'Open Roster, cap space, Depth Chart, and Game Plan before each Advance Week; skipped roster, cap, depth-chart, or game-plan fixes leave an uncovered starter job, uncovered injury, or dead-money cap squeeze.';
}
