import type { Position } from '../types';
import {
  getCoachCandidateCatalog,
  getScoutCandidateCatalog,
} from './setup-hiring-catalog';
import {
  getCoachHiringReaction,
  getScoutHiringReaction,
} from './agm-setup-content';
import type {
  CapStrategyBriefing,
  CoachingStaffReview,
  CoachCandidate,
  DepthChartContext,
  FranchiseBlueprint,
  FranchiseIntelBriefing,
  GoalSelectionContext,
  RosterOverview,
  ScoutCandidate,
  SchemeOption,
  SchemeSelectionContext,
  SetupPhase,
} from './franchise-setup';

export interface AGMProfile {
  id: string;
  name: string;
  title: string;
  background: string;
  personality: 'analytical' | 'fiery' | 'old_school' | 'player_whisperer';
  expertise: 'offense' | 'defense' | 'personnel' | 'cap_management';
  selectionPitch: string;
  strengths: string[];
  cardAccent: 'default' | 'gold' | 'cyan' | 'green' | 'red';
  welcomeMonologue: string;
  teachingNarration: {
    what_is_a_head_coach: string;
    what_is_a_scouting_director: string;
  };
  catchphrase: string;
  toneModifiers: {
    enthusiasm: number;
    bluntness: number;
    humor: number;
  };
}

export interface AGMInsight {
  category: 'strength' | 'concern' | 'opportunity' | 'warning';
  text: string;
  dataPoint: string | null;
}

export interface AGMPhaseDialogue {
  phaseId: SetupPhase;
  intro: string;
  insights: AGMInsight[];
  recommendation: string | null;
  closingRemark: string;
  tone: 'confident' | 'concerned' | 'excited' | 'measured';
}

export interface AGMReaction {
  sentiment: 'love_it' | 'like_it' | 'concerned' | 'disagree';
  reaction: string;
  followUp: string | null;
}

const ASSISTANT_GM_PRESETS: readonly AGMProfile[] = [
  {
    id: 'marcus_webb',
    name: 'Marcus Webb',
    title: 'Director of Baseball Strategy',
    background: 'Former cap analyst turned AGM. Cool-headed, data-first, explains roster math like a professor.',
    personality: 'analytical',
    expertise: 'cap_management',
    selectionPitch: 'I will turn your roster decisions into repeatable edges. We can build a winner without losing control of the long game.',
    strengths: ['Payroll modeling', 'Option valuation', 'Process discipline'],
    cardAccent: 'cyan',
    welcomeMonologue: 'Welcome to the {teamName}. I have the books, the projections, and the weak spots mapped out. Let us start with what this franchise really is.',
    teachingNarration: {
      what_is_a_head_coach: 'Your head coach is the operating system for the roster. That hire sets the daily standard, shapes situational decisions, and tells us how fast the whole building can absorb change.',
      what_is_a_scouting_director: 'Your scouting director decides where certainty comes from. That person organizes the board, tells us which evaluations we can trust, and keeps the draft room from chasing noise.',
    },
    catchphrase: 'The numbers never lie.',
    toneModifiers: { enthusiasm: 0.45, bluntness: 0.65, humor: 0.15 },
  },
  {
    id: 'coach_d_hardaway',
    name: "Deion 'Coach D' Hardaway",
    title: 'Senior AGM, Competitive Edge',
    background: 'Former clubhouse enforcer turned front office closer. Lives for urgency, standards, and winning every matchup.',
    personality: 'fiery',
    expertise: 'defense',
    selectionPitch: 'You were hired to take control. I will keep the building loud, demanding, and impossible to out-compete when the pressure rises.',
    strengths: ['Clubhouse intensity', 'Opponent pressure points', 'Accountability'],
    cardAccent: 'red',
    welcomeMonologue: 'Welcome to the {teamName}. The room is yours now. I will keep the staff sharp, the players honest, and the pressure pointed in the right direction.',
    teachingNarration: {
      what_is_a_head_coach: 'Head coach is not just play sheet and speeches. That is the person who decides what the room tolerates when things get tight and who sets the edge for every staff meeting.',
      what_is_a_scouting_director: 'Scouting director is your early-warning system. Good one tells you who can handle this league, who is fooling the stopwatch, and where the board is lying to you.',
    },
    catchphrase: 'We are NOT giving up easy yards.',
    toneModifiers: { enthusiasm: 0.95, bluntness: 0.85, humor: 0.25 },
  },
  {
    id: 'sandra_chen',
    name: 'Sandra Chen',
    title: 'Senior AGM, Player Development',
    background: 'Former scout and player liaison who reads a room as quickly as she reads a stat line. Trusted by players and evaluators alike.',
    personality: 'player_whisperer',
    expertise: 'personnel',
    selectionPitch: 'The roster is a people problem before it is a spreadsheet problem. I will help you see who can grow, who can lead, and who needs a clearer role.',
    strengths: ['Player evaluation', 'Development arcs', 'Relationship capital'],
    cardAccent: 'green',
    welcomeMonologue: 'Welcome to the {teamName}. I have already been through the roster, and there are a few people in this building we can unlock fast if we handle them the right way.',
    teachingNarration: {
      what_is_a_head_coach: 'The head coach translates your plan into lived habits. Pick the right teacher and players grow into the system instead of surviving it.',
      what_is_a_scouting_director: 'The scouting director tells you which people your building can believe in. That role matters because draft boards are about projection, trust, and context as much as raw talent.',
    },
    catchphrase: 'Trust the tape.',
    toneModifiers: { enthusiasm: 0.6, bluntness: 0.55, humor: 0.1 },
  },
] as const;

const POSITION_LABELS: Record<string, string> = {
  QB: 'quarterback',
  RB: 'running back room',
  WR: 'receiver room',
  TE: 'tight end room',
  OL: 'offensive line',
  DL: 'defensive line',
  LB: 'linebacker room',
  CB: 'corner room',
  S: 'safety room',
  K: 'kicker spot',
  P: 'punter spot',
};

function formatMoney(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  if (Number.isInteger(rounded)) return `$${rounded}M`;
  return `$${rounded.toFixed(1)}M`;
}

function joinNames(values: string[]): string {
  const names = values.filter(Boolean);
  if (names.length === 0) return 'nobody yet';
  if (names.length === 1) return names[0]!;
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

function formatPositionGroup(group: string): string {
  return POSITION_LABELS[group] ?? group.toLowerCase();
}

function pickTopOption(options: SchemeOption[]): SchemeOption {
  return options.find((option) => option.recommended) ?? options[0]!;
}

function pickBottomOption(options: SchemeOption[]): SchemeOption {
  return options[options.length - 1]!;
}

function normalizeGoals(context: GoalSelectionContext): string[] {
  return [...new Set(context.recommendedGoals.map((goal) => goal.label))];
}

function toneForWindow(windowPhase: FranchiseIntelBriefing['windowPhase']): AGMPhaseDialogue['tone'] {
  if (windowPhase === 'peaking') return 'excited';
  if (windowPhase === 'opening') return 'measured';
  return 'concerned';
}

function buildInsight(category: AGMInsight['category'], text: string, dataPoint: string | null = null): AGMInsight {
  return { category, text, dataPoint };
}

function withTone(text: string, agm: AGMProfile): string {
  return toneAdjust(text, agm.personality);
}

function withInsightTone(insight: AGMInsight, agm: AGMProfile): AGMInsight {
  return {
    ...insight,
    text: withTone(insight.text, agm),
  };
}

function uniqueInsights(insights: AGMInsight[]): AGMInsight[] {
  const seen = new Set<string>();
  const result: AGMInsight[] = [];
  for (const insight of insights) {
    const key = `${insight.category}:${insight.text}:${insight.dataPoint ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(insight);
  }
  return result;
}

function finalizeInsights(
  phaseId: SetupPhase,
  baseInsights: AGMInsight[],
  phaseData: unknown,
  agm: AGMProfile,
): AGMInsight[] {
  const insights = [...baseInsights];
  const bonusCount = expertiseEmphasis(phaseId, agm.expertise);
  if (bonusCount > 0) {
    const primary = getExpertiseInsight(phaseId, phaseData, agm);
    if (primary) insights.push(primary);
  }
  if (bonusCount > 1) {
    const secondary = getSecondaryExpertiseInsight(phaseId, phaseData, agm);
    if (secondary) insights.push(secondary);
  }
  return uniqueInsights(insights).slice(0, 4).map((insight) => withInsightTone(insight, agm));
}

function makeDialogue(
  phaseId: SetupPhase,
  agm: AGMProfile,
  intro: string,
  insights: AGMInsight[],
  recommendation: string | null,
  closingRemark: string,
  tone: AGMPhaseDialogue['tone'],
): AGMPhaseDialogue {
  return {
    phaseId,
    intro: withTone(intro, agm),
    insights,
    recommendation: recommendation ? withTone(recommendation, agm) : null,
    closingRemark: withTone(closingRemark, agm),
    tone,
  };
}

function playerNameList(players: Array<{ name: string }>, limit = 3): string {
  return joinNames(players.slice(0, limit).map((player) => player.name));
}

function namesWithRatings(players: Array<{ name: string; ovr: number }>, limit = 3): string {
  return joinNames(players.slice(0, limit).map((player) => `${player.name} (${player.ovr} OVR)`));
}

function optionPlayers(option: SchemeOption): string {
  if (option.bestFitPlayers.length === 0) return 'the current roster core';
  return playerNameList(option.bestFitPlayers);
}

function weakerSchemeSide(context: SchemeSelectionContext, offenseScheme: string, defenseScheme: string): {
  offense: SchemeOption;
  defense: SchemeOption;
  weakest: SchemeOption;
} {
  const offense = context.offenseOptions.find((option) => option.schemeId === offenseScheme);
  const defense = context.defenseOptions.find((option) => option.schemeId === defenseScheme);
  if (!offense || !defense) {
    throw new Error(`Unknown scheme pairing ${offenseScheme}/${defenseScheme}.`);
  }
  return {
    offense,
    defense,
    weakest: offense.fitScore <= defense.fitScore ? offense : defense,
  };
}

function roomFor(context: DepthChartContext, position: Position) {
  return context.positionGroups.find((group) => group.position === position);
}

function autoSetNames(context: DepthChartContext, position: Position): string {
  const room = roomFor(context, position);
  const starterIds = context.autoSetRecommendation[position] ?? [];
  if (!room) return 'no one';
  return joinNames(
    starterIds
      .map((playerId) => room.players.find((player) => player.playerId === playerId)?.name)
      .filter((name): name is string => Boolean(name)),
  );
}

function battleSummary(context: DepthChartContext): string | null {
  const battle = context.activeBattles[0];
  if (!battle) return null;
  return `${battle.slotLabel} is live between ${battle.incumbent.name} and ${battle.challenger.name}.`;
}

function bestRosterAnchor(data: RosterOverview): string | null {
  if (data.starPlayers.length > 0) return data.starPlayers[0]!.name;
  if (data.risingStars.length > 0) return data.risingStars[0]!.playerName;
  if (data.weakestStarters.length > 0) return data.weakestStarters[0]!.name;
  return null;
}

function mentionPlayerCentricText(text: string): string {
  const firstNameMatch = text.match(/\b([A-Z][a-z]+(?: [A-Z][a-z' -]+)+)\b/);
  if (firstNameMatch?.[1]) {
    return `It starts with ${firstNameMatch[1]}. ${text}`;
  }
  return `This comes down to the players. ${text}`;
}

function emphasizedFragment(text: string): string {
  const fragment = text.match(/\b(cap|secondary|defense|offense|D-line|run game|scheme|window|depth chart)\b/i)?.[0];
  if (!fragment) return text;
  return text.replace(fragment, fragment.toUpperCase());
}

export function toneAdjust(baseText: string, personality: AGMProfile['personality']): string {
  const text = baseText.trim();
  if (text.length === 0) return text;

  if (personality === 'analytical') {
    if (/[0-9$%]/.test(text) || /\b[A-F][+]? grade\b/i.test(text)) {
      return text.startsWith('The data') || text.startsWith('Numerically')
        ? text
        : `The data says ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
    }
    return text.startsWith('The data') ? text : `Measuredly, ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
  }

  if (personality === 'fiery') {
    const pumped = emphasizedFragment(text);
    return pumped.endsWith('!') ? pumped : `${pumped}!`;
  }

  if (personality === 'old_school') {
    if (text.startsWith('Bottom line:') || text.startsWith('Simple:')) return text;
    return `Bottom line: ${text}`;
  }

  if (personality === 'player_whisperer') {
    return mentionPlayerCentricText(text);
  }

  return text;
}

export function expertiseEmphasis(phaseId: SetupPhase, expertise: AGMProfile['expertise']): number {
  if (expertise === 'cap_management') {
    if (phaseId === 'cap_strategy') return 2;
    if (phaseId === 'set_goals') return 1;
  }
  if (expertise === 'offense') {
    if (phaseId === 'set_scheme') return 2;
    if (phaseId === 'depth_chart') return 1;
  }
  if (expertise === 'defense') {
    if (phaseId === 'set_scheme') return 2;
    if (phaseId === 'meet_roster') return 1;
  }
  if (expertise === 'personnel') {
    if (phaseId === 'meet_roster') return 2;
    if (phaseId === 'depth_chart') return 1;
  }
  return 0;
}

export function getExpertiseInsight(
  phaseId: SetupPhase,
  phaseData: unknown,
  agm: AGMProfile,
): AGMInsight | null {
  if (agm.expertise === 'cap_management' && phaseId === 'cap_strategy') {
    const data = phaseData as CapStrategyBriefing;
    const candidate = data.restructureCandidates[0] ?? data.cutCandidates[0];
    if (!candidate) {
      return buildInsight('strength', 'There is no emergency cap move staring us in the face, which lets us stay disciplined.', data.capGrade);
    }
    if ('restructureSavings' in candidate) {
      return buildInsight(
        'opportunity',
        `${candidate.playerName} is the cleanest lever on the board. A restructure opens room without blowing up the roster spine.`,
        formatMoney(candidate.restructureSavings),
      );
    }
    return buildInsight(
      'warning',
      `${candidate.playerName} is a hard value question. Cutting that deal creates relief, but only if we are ready to absorb the dead-money hit.`,
      formatMoney(candidate.savingsIfCut),
    );
  }

  if (agm.expertise === 'offense' && phaseId === 'set_scheme') {
    const data = phaseData as SchemeSelectionContext;
    const option = pickTopOption(data.offenseOptions);
    return buildInsight(
      'strength',
      `${option.label} lets ${optionPlayers(option)} operate in the concepts they already execute cleanly.`,
      `${option.fitScore} fit`,
    );
  }

  if (agm.expertise === 'defense' && phaseId === 'set_scheme') {
    const data = phaseData as SchemeSelectionContext;
    const option = pickTopOption(data.defenseOptions);
    const concept = option.schemeId === 'cover_3'
      ? 'three-deep spacing and downhill pursuit'
      : option.schemeId === 'man_press'
        ? 'tight press technique and contested throws'
        : option.schemeId === '4-3'
          ? 'front-four pressure and clean linebacker fits'
          : option.schemeId === '3-4'
            ? 'pressure from the second level'
            : 'two-high discipline';
    return buildInsight(
      'strength',
      `${option.label} gives us ${concept}, and ${optionPlayers(option)} are the players most ready to execute it.`,
      `${option.fitScore} fit`,
    );
  }

  if (agm.expertise === 'personnel' && phaseId === 'meet_roster') {
    const data = phaseData as RosterOverview;
    const breakout = data.risingStars[0];
    if (breakout) {
      return buildInsight(
        'opportunity',
        `${breakout.playerName} is exactly the kind of player you bet on before the rest of the league catches up. The age curve and last-year jump both say arrow up.`,
        `Age ${breakout.age}, +${breakout.ovrDelta} OVR`,
      );
    }
    const anchor = data.starPlayers[0];
    if (!anchor) return null;
    return buildInsight(
      'strength',
      `${anchor.name} is a clean personnel anchor. When your best player is this bankable, roster decisions get clearer around him.`,
      `${anchor.ovr} OVR`,
    );
  }

  if (agm.expertise === 'offense' && phaseId === 'depth_chart') {
    const data = phaseData as DepthChartContext;
    const qbRoom = roomFor(data, 'QB');
    const receiverRoom = roomFor(data, 'WR');
    if (!qbRoom || !receiverRoom) return null;
    return buildInsight(
      'strength',
      `${autoSetNames(data, 'QB')} throwing into a ${data.selectedOffenseScheme} structure with ${receiverRoom.players[0]?.name ?? 'the receiver room'} is the cleanest version of this offense.`,
      `${qbRoom.players[0]?.fitScore ?? 0} QB fit`,
    );
  }

  if (agm.expertise === 'personnel' && phaseId === 'depth_chart') {
    const data = phaseData as DepthChartContext;
    const receiverRoom = roomFor(data, 'WR') ?? roomFor(data, 'CB');
    if (!receiverRoom) return null;
    const youngPlayer = receiverRoom.players.find((player) => player.age <= 25);
    if (!youngPlayer) return null;
    return buildInsight(
      'opportunity',
      `${youngPlayer.name} is exactly the kind of player you create runway for during setup. The fit is good enough to justify more snaps right away.`,
      `${youngPlayer.fitScore} fit`,
    );
  }

  if (agm.expertise === 'defense' && phaseId === 'meet_roster') {
    const data = phaseData as RosterOverview;
    const defender = data.starPlayers.find((player) => ['DL', 'LB', 'CB', 'S'].includes(player.pos))
      ?? data.weakestStarters.find((player) => ['DL', 'LB', 'CB', 'S'].includes(player.pos));
    if (!defender) return null;
    return buildInsight(
      defender.ovr >= 85 ? 'strength' : 'warning',
      `${defender.name} is setting the tone for the defense right now. That position group will look like him, for better or worse.`,
      `${defender.ovr} OVR`,
    );
  }

  if (agm.expertise === 'cap_management' && phaseId === 'set_goals') {
    const data = phaseData as GoalSelectionContext;
    const capGoal = data.availableGoals.find((goal) => goal.id === 'cap_health');
    if (!capGoal) return null;
    return buildInsight(
      capGoal.recommended ? 'opportunity' : 'warning',
      `${capGoal.label} is not a throwaway checkbox. It changes how aggressive we can be once extension season hits.`,
      capGoal.difficulty,
    );
  }

  return null;
}

function getSecondaryExpertiseInsight(
  phaseId: SetupPhase,
  phaseData: unknown,
  agm: AGMProfile,
): AGMInsight | null {
  if (agm.expertise === 'cap_management' && phaseId === 'cap_strategy') {
    const data = phaseData as CapStrategyBriefing;
    const biggest = data.biggestContracts[0];
    if (!biggest) return null;
    return buildInsight(
      biggest.value === 'Overpay' ? 'warning' : 'strength',
      `${biggest.name} sets the tone for the whole cap sheet. If that contract is right, the structure works. If it is wrong, every other move gets tighter.`,
      formatMoney(biggest.salary),
    );
  }

  if (agm.expertise === 'offense' && phaseId === 'set_scheme') {
    const data = phaseData as SchemeSelectionContext;
    const bottom = pickBottomOption(data.offenseOptions);
    return buildInsight(
      'warning',
      `${bottom.label} asks the offense to live somewhere this roster is not built to live. ${playerNameList(bottom.worstFitPlayers)} would feel that mismatch immediately.`,
      `${bottom.transitionPenalty}-point penalty`,
    );
  }

  if (agm.expertise === 'defense' && phaseId === 'set_scheme') {
    const data = phaseData as SchemeSelectionContext;
    const bottom = pickBottomOption(data.defenseOptions);
    return buildInsight(
      'warning',
      `${bottom.label} would put ${playerNameList(bottom.worstFitPlayers)} in uncomfortable spots snap after snap.`,
      `${bottom.transitionPenalty}-point penalty`,
    );
  }

  if (agm.expertise === 'personnel' && phaseId === 'meet_roster') {
    const data = phaseData as RosterOverview;
    const weakStarter = data.weakestStarters[0];
    if (!weakStarter) return null;
    return buildInsight(
      'warning',
      `${weakStarter.name} is the kind of starter you monitor from the first day of camp. If that room slips, we need a succession plan fast.`,
      `${weakStarter.ovr} OVR`,
    );
  }

  return null;
}

export function getAGMProfiles(): AGMProfile[] {
  return ASSISTANT_GM_PRESETS.map((profile) => ({
    ...profile,
    strengths: [...profile.strengths],
    teachingNarration: { ...profile.teachingNarration },
    toneModifiers: { ...profile.toneModifiers },
  }));
}

export function getSelectedAGM(profileId: string): AGMProfile | null {
  return getAGMProfiles().find((profile) => profile.id === profileId) ?? null;
}

export function getAGMGreeting(profile: AGMProfile, teamName: string): string {
  return toneAdjust(profile.welcomeMonologue.replace('{teamName}', teamName), profile.personality);
}

export function getCoachCandidates(): CoachCandidate[] {
  return getCoachCandidateCatalog();
}

export function getScoutCandidates(): ScoutCandidate[] {
  return getScoutCandidateCatalog();
}

export function getAGMCoachReaction(agmId: string, coachId: string): { recommendation: string; analysis: string; oneLiner: string } {
  const candidate = getCoachCandidates().find((entry) => entry.id === coachId);
  if (!candidate) {
    throw new Error(`Unknown coach candidate ${coachId}.`);
  }
  const reaction = getCoachHiringReaction(agmId, candidate.id);
  return {
    recommendation: reaction.recommendation,
    analysis: reaction.analysis,
    oneLiner: reaction.oneLiner,
  };
}

export function getAGMScoutReaction(agmId: string, scoutId: string): { recommendation: string; analysis: string; oneLiner: string } {
  const candidate = getScoutCandidates().find((entry) => entry.id === scoutId);
  if (!candidate) {
    throw new Error(`Unknown scout candidate ${scoutId}.`);
  }
  const reaction = getScoutHiringReaction(agmId, candidate.id);
  return {
    recommendation: reaction.recommendation,
    analysis: reaction.analysis,
    oneLiner: reaction.oneLiner,
  };
}

export function agmOnIntelBriefing(data: FranchiseIntelBriefing, agm: AGMProfile): AGMPhaseDialogue {
  const tone = toneForWindow(data.windowPhase);
  const strength = data.strengths[0] ? formatPositionGroup(data.strengths[0]) : 'the roster core';
  const concern = data.criticalNeeds[0] ? formatPositionGroup(data.criticalNeeds[0]) : 'the margin for error';
  const insights = finalizeInsights('intel_briefing', [
    buildInsight('strength', `${strength} is carrying the cleanest grade on the team right now. That is where the roster can dictate games early.`, data.strengths[0] ?? null),
    buildInsight('concern', `${concern} is the first leak opponents will test. If we do nothing there, the division will find it.`, data.criticalNeeds[0] ?? null),
    buildInsight(
      data.capGrade === 'A' || data.capGrade === 'B' ? 'opportunity' : 'warning',
      `The cap picture comes in at a ${data.capGrade} grade with ${formatMoney(data.capSpace)} in space. That either gives us flexibility or forces restraint.`,
      `${data.capGrade} / ${formatMoney(data.capSpace)}`,
    ),
    buildInsight(
      data.leagueRank <= 8 ? 'strength' : data.leagueRank >= 20 ? 'warning' : 'opportunity',
      `League-wide, we are walking in around ${data.leagueRank} right now. That gives us a clean benchmark for how urgent this climb is.`,
      `${data.leagueRank}th`,
    ),
  ], data, agm);

  return makeDialogue(
    'intel_briefing',
    agm,
    `We are opening this build in a ${data.windowPhase} window with a ${data.windowScore}-point trajectory marker.`,
    insights,
    null,
    'Next, let me show you the roster and where the real pressure points live.',
    tone,
  );
}

export function agmOnRosterOverview(data: RosterOverview, agm: AGMProfile): AGMPhaseDialogue {
  const anchor = bestRosterAnchor(data);
  const tone: AGMPhaseDialogue['tone'] = data.starPlayers.length >= 2 ? 'excited' : data.injuredPlayers.length > 0 ? 'concerned' : 'measured';
  const insights = finalizeInsights('meet_roster', [
    data.starPlayers.length > 0
      ? buildInsight(
        'strength',
        `${namesWithRatings(data.starPlayers)} give this roster real top-end juice. Those are the names opponents will build the scouting report around.`,
        `${data.starPlayers.length} star players`,
      )
      : buildInsight(
        'warning',
        'There is not a single 85-plus cornerstone on the board yet. That means we have to win with structure and development instead of raw star power.',
        '0 star players',
      ),
    data.risingStars.length > 0
      ? buildInsight(
        'opportunity',
        `${data.risingStars[0]!.playerName} is the breakout I keep circling. That kind of age-and-growth profile changes the timetable fast.`,
        `Age ${data.risingStars[0]!.age}, +${data.risingStars[0]!.ovrDelta} OVR`,
      )
      : buildInsight(
        'warning',
        'I do not see an obvious breakout candidate from last year’s data. That raises the importance of getting the scheme and snaps right.',
        null,
      ),
    data.injuredPlayers.length > 0
      ? buildInsight(
        'concern',
        `${data.injuredPlayers[0]!.name} is already unavailable, so the depth picture is stressed before we even hit the first checkpoint.`,
        `${data.injuredPlayers[0]!.gamesOut} games out`,
      )
      : buildInsight(
        'strength',
        'Health is not screaming at us right now. That gives the staff a clean runway to install the plan.',
        null,
      ),
  ], data, agm);

  const recommendation = anchor
    ? `${anchor} is the franchise touchpoint for me. Every major setup decision should make that player harder to defend or easier to support.`
    : 'We do not have a single franchise tentpole yet, so the recommendation is to build the cleanest collective fit possible.';

  return makeDialogue(
    'meet_roster',
    agm,
    `We are looking at ${data.rosterSize} players, and I already know which rooms feel like answers and which ones feel like conversations.`,
    insights,
    recommendation,
    'Now let’s see whether the staff in the building matches what this roster needs.',
    tone,
  );
}

export function agmOnHireCoach(data: CoachingStaffReview, agm: AGMProfile): AGMPhaseDialogue {
  const vacancies = Number(data.headCoach.vacant) + data.coordinators.filter((coach) => coach.vacant).length;
  const tone: AGMPhaseDialogue['tone'] = vacancies > 0 ? 'concerned' : 'measured';
  const oc = data.coordinators.find((coach) => coach.role === 'OC');
  const dc = data.coordinators.find((coach) => coach.role === 'DC');
  const insights = finalizeInsights('hire_coach', [
    data.headCoach.vacant
      ? buildInsight('warning', 'The head coach chair is vacant, which means identity has to come from the roster until that role is stabilized.', 'HC vacancy')
      : buildInsight(
        'strength',
        `${data.headCoach.name} brings a ${data.headCoach.archetype} profile with level ${data.headCoach.level}. That gives us a real point of view at the top.`,
        `Level ${data.headCoach.level}`,
      ),
    oc?.vacant
      ? buildInsight('warning', 'Offensive coordination is unsettled. That puts more pressure on us to choose something simple and executable.', 'OC vacancy')
      : buildInsight(
        'opportunity',
        `${oc!.name} gives the offense its cleanest lean with ${oc!.specialty ?? 'generalist'} seasoning. That matters when we pick the menu.`,
        oc!.specialty,
      ),
    dc?.vacant
      ? buildInsight('warning', 'The defensive staff is missing a real organizer right now. Any aggressive shift on that side carries more risk.', 'DC vacancy')
      : buildInsight(
        'strength',
        `${dc!.name} can actually support the recommended defensive identity instead of fighting it. That is a good place to start.`,
        dc!.specialty,
      ),
  ], data, agm);

  return makeDialogue(
    'hire_coach',
    agm,
    'The next head coach hire sets the temperature of the whole building. This is where process becomes identity.',
    insights,
    `I want a head coach who can carry ${data.schemeRecommendation.offenseLabel} on offense and ${data.schemeRecommendation.defenseLabel} on defense without making the roster feel like it is learning a new language every week.`,
    'Once the head coach is in place, we can decide who should be feeding the board next.',
    tone,
  );
}

export const agmOnCoachingReview = agmOnHireCoach;

export function agmOnHireScout(data: FranchiseIntelBriefing, agm: AGMProfile): AGMPhaseDialogue {
  const tone: AGMPhaseDialogue['tone'] = data.windowPhase === 'rebuilding' ? 'measured' : 'confident';
  const insights = finalizeInsights('hire_scout', [
    buildInsight(
      'opportunity',
      `${formatPositionGroup(data.criticalNeeds[0] ?? 'roster depth')} is the first place our scouting room has to beat consensus.`,
      data.criticalNeeds[0] ?? null,
    ),
    buildInsight(
      'strength',
      `${formatPositionGroup(data.strengths[0] ?? 'the roster core')} gives us enough stability to draft for upside instead of pure panic.`,
      data.strengths[0] ?? null,
    ),
    buildInsight(
      data.capGrade === 'A' || data.capGrade === 'B' ? 'strength' : 'warning',
      `The better our intel, the less money we waste solving the same need twice. That matters with a ${data.capGrade} cap picture.`,
      data.capGrade,
    ),
  ], data, agm);

  return makeDialogue(
    'hire_scout',
    agm,
    'Scouting is how we buy tomorrow before the rest of the league knows the price.',
    insights,
    'I want a director who sharpens the board in the lane this franchise is most likely to exploit over the next three drafts.',
    'After this hire, we can start deciding what brand of football these evaluations need to serve.',
    tone,
  );
}

export function agmOnSchemeSelection(data: SchemeSelectionContext, agm: AGMProfile): AGMPhaseDialogue {
  const bestOffense = pickTopOption(data.offenseOptions);
  const bestDefense = pickTopOption(data.defenseOptions);
  const worstOffense = pickBottomOption(data.offenseOptions);
  const worstDefense = pickBottomOption(data.defenseOptions);
  const tone: AGMPhaseDialogue['tone'] = (bestOffense.transitionPenalty + bestDefense.transitionPenalty) > 12 ? 'measured' : 'confident';
  const insights = finalizeInsights('set_scheme', [
    buildInsight(
      'strength',
      `${bestOffense.label} is the cleanest offensive fit on the board. ${optionPlayers(bestOffense)} are the names that make it feel natural instead of forced.`,
      `${bestOffense.fitScore} fit`,
    ),
    buildInsight(
      'strength',
      `${bestDefense.label} is the best defensive answer for the personnel we actually have. ${optionPlayers(bestDefense)} give it real teeth.`,
      `${bestDefense.fitScore} fit`,
    ),
    buildInsight(
      'warning',
      `${worstOffense.label} with ${worstDefense.label} is the pairing I would keep furthest from the call sheet. ${playerNameList([...worstOffense.worstFitPlayers, ...worstDefense.worstFitPlayers])} would feel that mismatch immediately.`,
      `${worstOffense.transitionPenalty + worstDefense.transitionPenalty}-point transition hit`,
    ),
  ], data, agm);

  return makeDialogue(
    'set_scheme',
    agm,
    'This is the phase that decides whether our roster is playing fast or swimming upstream.',
    insights,
    `If it were up to me, I would run ${bestOffense.label} with ${bestDefense.label}. We are talking about ${bestOffense.fitScore}/${bestDefense.fitScore} fit scores, a manageable ${bestOffense.transitionPenalty + bestDefense.transitionPenalty}-point transition hit, and core players like ${optionPlayers(bestOffense)} and ${optionPlayers(bestDefense)} living where they should.`,
    'Set the schemes, then we can clean up who earns the first snaps inside them.',
    tone,
  );
}

export function agmOnDepthChart(data: DepthChartContext, agm: AGMProfile): AGMPhaseDialogue {
  const battleLine = battleSummary(data);
  const qbNames = autoSetNames(data, 'QB');
  const wrNames = autoSetNames(data, 'WR');
  const tone: AGMPhaseDialogue['tone'] = data.activeBattles.length > 0 ? 'measured' : 'confident';
  const insights = finalizeInsights('depth_chart', [
    battleLine
      ? buildInsight('opportunity', `${battleLine} That one deserves a real look before we call it settled.`, null)
      : buildInsight('strength', 'There are not many real starter-level battles here, which means the top of the depth chart is relatively clear.', null),
    buildInsight(
      'strength',
      `If we auto-set this board right now, the offense starts with ${qbNames} and the main receiver group is ${wrNames}. That gives the install a coherent first picture.`,
      data.selectedOffenseScheme,
    ),
    buildInsight(
      'opportunity',
      `${data.selectedOffenseScheme} on offense and ${data.selectedDefenseScheme} on defense will change who earns tie-breakers. Fit score matters more than familiarity in the last couple of slots.`,
      `${data.activeBattles.length} active battles`,
    ),
  ], data, agm);

  return makeDialogue(
    'depth_chart',
    agm,
    'Now we stop talking in generalities and start deciding who actually runs out there first.',
    insights,
    `My default move is to auto-set the board, then manually revisit the rooms with true competition. The first audit for me would be ${data.activeBattles[0]?.slotLabel ?? 'the fringe starter spots'}.`,
    'Once the depth chart is honest, the cap conversation gets a lot clearer.',
    tone,
  );
}

export function agmOnCapStrategy(data: CapStrategyBriefing, agm: AGMProfile): AGMPhaseDialogue {
  const biggest = data.biggestContracts[0];
  const expiring = data.expiringDeals[0];
  const restructure = data.restructureCandidates[0];
  const cut = data.cutCandidates[0];
  const tone: AGMPhaseDialogue['tone'] = data.capGrade === 'D' || data.capGrade === 'F' ? 'concerned' : data.capGrade === 'A' ? 'confident' : 'measured';
  const insights = finalizeInsights('cap_strategy', [
    buildInsight(
      data.capGrade === 'A' || data.capGrade === 'B' ? 'strength' : 'warning',
      `The cap sheet grades out at ${data.capGrade} with ${formatMoney(data.capSpace)} in room and ${formatMoney(data.deadCap)} in dead money. That sets the boundary for everything else.`,
      `${data.capGrade} / ${formatMoney(data.capSpace)}`,
    ),
    biggest
      ? buildInsight(
        biggest.value === 'Overpay' ? 'warning' : 'strength',
        `${biggest.name} is carrying one of the defining contracts on this roster at ${formatMoney(biggest.salary)}. The value tag says ${biggest.value}.`,
        `${formatMoney(biggest.salary)} for ${biggest.ovr} OVR`,
      )
      : buildInsight('strength', 'There is no single contract distorting the whole picture right now.', null),
    restructure
      ? buildInsight(
        'opportunity',
        `${restructure.playerName} is the first restructure I would model. There is real relief there without immediately losing the player.`,
        formatMoney(restructure.restructureSavings),
      )
      : cut
        ? buildInsight(
          'warning',
          `${cut.playerName} is the cleanest release valve if we have to make a hard cap move.`,
          formatMoney(cut.savingsIfCut),
        )
        : buildInsight(
          expiring ? 'opportunity' : 'strength',
          expiring
            ? `${expiring.name} is the first expiring deal I would calendar. That negotiation will shape the season’s flexibility.`
            : 'There is no immediate contract fire here, which buys us patience.',
          expiring ? formatMoney(expiring.capHit) : null,
        ),
  ], data, agm);

  const recommendation = restructure
    ? `The first cap study for me is ${restructure.playerName}. If we need instant room, that is the lever I pull before I start subtracting good players.`
    : cut
      ? `If we need to create room right now, ${cut.playerName} is the uncomfortable but cleanest conversation on the board.`
      : 'My recommendation is restraint. The right move might be doing nothing until the season gives us more information.';

  return makeDialogue(
    'cap_strategy',
    agm,
    'This is where we decide whether the books are helping the roster or quietly dragging it down.',
    insights,
    recommendation,
    'Cap plan is set. Let’s make sure the goals match the roster and the owner.',
    tone,
  );
}

export function agmOnGoalSelection(data: GoalSelectionContext, agm: AGMProfile): AGMPhaseDialogue {
  const labels = normalizeGoals(data);
  const tone: AGMPhaseDialogue['tone'] = data.ownerType === 'win_now' ? 'confident' : data.ownerType === 'penny' ? 'measured' : 'excited';
  const insights = finalizeInsights('set_goals', [
    buildInsight(
      data.ownerType === 'win_now' ? 'warning' : 'opportunity',
      `Ownership is coming in as ${data.ownerType}. ${data.ownerExpectations}`,
      data.ownerType,
    ),
    buildInsight(
      'strength',
      `${labels[0] ?? 'The top goal'} is recommended for a reason: ${data.recommendedGoals[0]?.reason ?? 'it is the best fit for this roster state.'}`,
      data.recommendedGoals[0]?.difficulty ?? null,
    ),
    buildInsight(
      'opportunity',
      `The full recommended stack is ${joinNames(labels)}. That combination matches the roster stage without pretending we are a different team than we are.`,
      `${labels.length} goals`,
    ),
  ], data, agm);

  return makeDialogue(
    'set_goals',
    agm,
    'Goals sound soft until they start driving owner pressure, roster timing, and what counts as a successful season.',
    insights,
    `My recommendation is ${joinNames(labels)}. That set of goals fits the current roster, the owner profile, and the risk profile we are walking into.`,
    'One last thing after this: I’ll put the whole franchise blueprint in one place.',
    tone,
  );
}

export function agmOnBlueprint(data: FranchiseBlueprint, agm: AGMProfile): AGMPhaseDialogue {
  const keyNames = joinNames(data.keyPlayers.map((player) => player.name));
  const goalNames = joinNames(data.seasonGoals.map((goal) => goal.label));
  const closingByPersonality: Record<AGMProfile['personality'], string> = {
    analytical: 'The data says this plan gives us the best probability of success. Now let’s execute.',
    fiery: 'This is OUR year, Coach. I can feel it. Let’s go get that trophy.',
    old_school: 'Good plan. Now the hard part is playing the games. One week at a time.',
    player_whisperer: 'The roster is set, the direction is clear, and now we find out what these players are made of.',
  };
  const tone: AGMPhaseDialogue['tone'] = data.windowPhase === 'peaking' ? 'excited' : 'confident';
  const insights = finalizeInsights('blueprint', [
    buildInsight(
      'strength',
      `${data.selectedSchemes.offenseLabel} on offense and ${data.selectedSchemes.defenseLabel} on defense give the team a real identity instead of a placeholder one.`,
      `${data.selectedSchemes.offenseLabel} / ${data.selectedSchemes.defenseLabel}`,
    ),
    buildInsight(
      'strength',
      `${keyNames} are the players this whole plan is built around. If they hit, the blueprint breathes.`,
      `${data.keyPlayers.length} key players`,
    ),
    buildInsight(
      'opportunity',
      `${goalNames} is the standard we are putting on the wall. That is ambitious enough to matter and grounded enough to track.`,
      data.windowPhase,
    ),
    buildInsight(
      'warning',
      `${joinNames(data.criticalNeeds.map((need) => formatPositionGroup(need)))} remain the parts of the roster we cannot stop watching.`,
      data.capOutlook,
    ),
  ], data, agm);

  return makeDialogue(
    'blueprint',
    agm,
    `${data.teamName} now has a plan: ${data.selectedSchemes.offenseLabel}, ${data.selectedSchemes.defenseLabel}, and a window labeled ${data.windowPhase}.`,
    insights,
    `If I had to summarize the blueprint in one line, it is this: support ${keyNames}, keep the critical needs from caving in, and chase ${goalNames}.`,
    closingByPersonality[agm.personality],
    tone,
  );
}

export function agmReactsToSchemeChoice(
  chosenOffense: string,
  chosenDefense: string,
  context: SchemeSelectionContext,
  agm: AGMProfile,
): AGMReaction {
  const bestOffense = pickTopOption(context.offenseOptions);
  const bestDefense = pickTopOption(context.defenseOptions);
  const { offense, defense, weakest } = weakerSchemeSide(context, chosenOffense, chosenDefense);
  const avgFit = Math.round((offense.fitScore + defense.fitScore) / 2);
  const minFit = Math.min(offense.fitScore, defense.fitScore);
  const totalTransitionPenalty = offense.transitionPenalty + defense.transitionPenalty;
  const weakerSide = weakest === offense ? 'offense' : 'defense';
  const worstFitNames = playerNameList(weakest.worstFitPlayers);

  if (offense.schemeId === bestOffense.schemeId && defense.schemeId === bestDefense.schemeId) {
    return {
      sentiment: 'love_it',
      reaction: withTone(`That is exactly the pairing I would have called. Our personnel is built for ${offense.label} and ${defense.label}.`, agm),
      followUp: withTone(`Now we get to coach the roster we have instead of apologizing for it.`, agm),
    };
  }

  if (avgFit > 70 && minFit >= 50) {
    return {
      sentiment: 'like_it',
      reaction: withTone(`Not my first call, but I can see the vision. ${offense.label} with ${defense.label} still gives us enough fit to operate.`, agm),
      followUp: withTone(`The weaker side is ${weakerSide}, so that is the room I would monitor first.`, agm),
    };
  }

  if (avgFit < 35 || minFit < 35) {
    return {
      sentiment: 'disagree',
      reaction: withTone(`I will back your call, but the tape says this is going to be rough. The ${weakerSide} side is carrying only a ${minFit} fit and the roster would need real turnover.`, agm),
      followUp: withTone(`That pairing brings a ${totalTransitionPenalty}-point transition hit, and ${worstFitNames} are the first players I would worry about.`, agm),
    };
  }

  return {
    sentiment: 'concerned',
    reaction: withTone(`Coach, I have to be honest: this pairing asks for a lot of adaptation. The ${weakerSide} side is the one that will feel it first.`, agm),
    followUp: withTone(`We are taking a ${totalTransitionPenalty}-point transition hit, and ${worstFitNames} are the players most likely to strain under it.`, agm),
  };
}

export function agmReactsToGoalChoice(
  chosenGoals: string[],
  context: GoalSelectionContext,
  agm: AGMProfile,
): AGMReaction {
  const recommended = new Set(context.recommendedGoals.map((goal) => goal.id));
  const chosen = [...new Set(chosenGoals)];
  const matches = chosen.filter((goal) => recommended.has(goal)).length;
  const matchedLabels = context.availableGoals.filter((goal) => chosen.includes(goal.id) && recommended.has(goal.id)).map((goal) => goal.label);
  const missedLabels = context.recommendedGoals.filter((goal) => !chosen.includes(goal.id)).map((goal) => goal.label);

  if (matches === 3) {
    return {
      sentiment: 'love_it',
      reaction: withTone(`That is exactly the goal stack I would put in front of ownership. ${joinNames(matchedLabels)} fits the team we actually have.`, agm),
      followUp: null,
    };
  }

  if (matches === 2) {
    return {
      sentiment: 'like_it',
      reaction: withTone(`I can work with that. We kept ${joinNames(matchedLabels)} in the stack, which preserves most of the logic behind the plan.`, agm),
      followUp: missedLabels.length > 0 ? withTone(`The piece I would keep an eye on is ${missedLabels[0]}.`, agm) : null,
    };
  }

  if (matches === 1) {
    return {
      sentiment: 'concerned',
      reaction: withTone(`I see the angle, but we only kept one of the three recommendations. That changes the season’s risk profile in a real way.`, agm),
      followUp: missedLabels.length > 0 ? withTone(`The goals we left behind are ${joinNames(missedLabels)}.`, agm) : null,
    };
  }

  return {
    sentiment: 'disagree',
    reaction: withTone(`I respect that you are the boss, but none of those goals line up with the path I would have mapped for this roster.`, agm),
    followUp: missedLabels.length > 0 ? withTone(`The recommended stack was ${joinNames(missedLabels)} for a reason.`, agm) : null,
  };
}
