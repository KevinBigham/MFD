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
    title: 'Director of Football Strategy',
    background: 'Former cap analyst turned AGM. Cap-cost focused, shows which cuts, restructures, or promises spend future cap space.',
    personality: 'analytical',
    expertise: 'cap_management',
    selectionPitch: 'Choose me when cap mistakes are the first threat. I will show the roster cost before you cut, restructure, trade, or promise wins.',
    strengths: ['Cap-space choices before cuts', 'Dead-money tradeoffs before contracts', 'Promise deadlines before commitments'],
    cardAccent: 'cyan',
    welcomeMonologue: 'Welcome to the {teamName}. Start with Week 1 blockers: cap space, uncovered first-backup jobs, and expensive veterans. I will show what each choice costs before Advance Week.',
    teachingNarration: {
      what_is_a_head_coach: 'Hire the head coach who sets scheme, practice priorities, player development, and late-game habits. Calls that do not match current starters slow install and make young players harder to develop.',
      what_is_a_scouting_director: 'Hire a scouting director who names medical limits, expected role, and coachability warnings before picks are spent. A hire without role discipline misses future starters, overpays veterans, or wastes picks on players without defined draft-day roles.',
    },
    catchphrase: 'Cost, deadline, consequence.',
    toneModifiers: { enthusiasm: 0.45, bluntness: 0.65, humor: 0.15 },
  },
  {
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
    teachingNarration: {
      what_is_a_head_coach: 'Hire the head coach who owns scheme, accountability, and tight-game reactions. Poor practice roles create missed assignments, morale damage, and lost fourth-quarter chances.',
      what_is_a_scouting_director: 'Hire a scouting director who separates players with Week 1 or development roles from prospects without a defined job before draft deadlines, or picks get wasted.',
    },
    catchphrase: 'Fix the exposed position before kickoff.',
    toneModifiers: { enthusiasm: 0.95, bluntness: 0.85, humor: 0.25 },
  },
  {
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
    teachingNarration: {
      what_is_a_head_coach: 'Hire the head coach who turns your plan into practice reps, roles, and weekly assignments. A poor teacher slows development and leaves young players exposed.',
      what_is_a_scouting_director: 'Hire the scouting director who names each prospect role, medical limit, and coachability warning. Missing role, medical, or coachability detail turns talent into expensive mistakes.',
    },
    catchphrase: 'Role, snaps, consequence.',
    toneModifiers: { enthusiasm: 0.6, bluntness: 0.55, humor: 0.1 },
  },
] as const;

const POSITION_LABELS: Record<string, string> = {
  QB: 'quarterback',
  RB: 'running backs',
  WR: 'receivers',
  TE: 'tight ends',
  OL: 'offensive line',
  DL: 'defensive line',
  LB: 'linebackers',
  CB: 'corners',
  S: 'safeties',
  K: 'kicker',
  P: 'punter',
};

function formatMoney(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  if (Number.isInteger(rounded)) return `$${rounded}M`;
  return `$${rounded.toFixed(1)}M`;
}

function ordinal(value: number): string {
  const abs = Math.abs(value);
  const teen = abs % 100;
  if (teen >= 11 && teen <= 13) return `${value}th`;
  switch (abs % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
}

function schemeFitLabel(score: number): string {
  if (score >= 75) return 'Week 1 jobs named';
  if (score >= 55) return 'name jobs before Week 1';
  return 'protect those jobs before Week 1';
}

function installRiskLabel(penalty: number): string {
  if (penalty >= 18) return 'major Week 1 missed-assignment danger';
  if (penalty >= 10) return 'extra Week 1 prep';
  if (penalty > 0) return 'minor prep work';
  return 'no extra prep';
}

function playerRoleLabel(ovr: number): string {
  if (ovr >= 90) return 'elite starter';
  if (ovr >= 85) return 'cornerstone starter';
  if (ovr >= 80) return 'quality starter';
  if (ovr >= 74) return 'playable starter';
  if (ovr >= 68) return 'starter needing backup cover';
  return 'first-backup job is uncovered';
}

function developmentGainLabel(delta: number): string {
  if (delta >= 5) return 'major development jump';
  if (delta >= 3) return 'development snaps increased';
  if (delta > 0) return 'small development gain';
  return 'no recent development gain';
}

function ownerTypeLabel(ownerType: GoalSelectionContext['ownerType']): string {
  if (ownerType === 'win_now') return 'win-now';
  if (ownerType === 'penny') return 'cost-conscious';
  return 'patient';
}

function coachCommandLabel(level: number): string {
  if (level >= 6) return 'veteran staff command';
  if (level >= 4) return 'steady staff command';
  return 'unproven staff command';
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

function windowPhaseSetupLine(windowPhase: FranchiseIntelBriefing['windowPhase']): string {
  switch (windowPhase) {
    case 'peaking':
      return 'Ownership expects wins now; protect healthy starters, first backups, and cap space before spending picks.';
    case 'opening':
      return 'Young starters need protected roles before Week 1; save cap space for depth or injury fixes.';
    case 'closing':
      return 'Aging starters and tight cap space make early losses expensive; cover depth and cap answers before Week 1.';
    case 'rebuilding':
      return 'Young-player snaps and cap space decide the season; quick veteran fixes block development and later repairs.';
  }
}

function windowPhasePlanLabel(windowPhase: FranchiseIntelBriefing['windowPhase']): string {
  switch (windowPhase) {
    case 'peaking':
      return 'win-now';
    case 'opening':
      return 'young-roster';
    case 'closing':
      return 'aging-roster';
    case 'rebuilding':
      return 'development-first';
  }
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

function namesWithRoleLabels(players: Array<{ name: string; ovr: number }>, limit = 3): string {
  return joinNames(players.slice(0, limit).map((player) => `${player.name} (${playerRoleLabel(player.ovr)})`));
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

  if (personality === 'analytical') return text;

  if (personality === 'fiery') {
    const pumped = emphasizedFragment(text);
    return /[.!?]$/.test(pumped) ? pumped : `${pumped}.`;
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
      return buildInsight('strength', 'Save cuts and restructures for a named starter, backup, or injury job; early cap moves remove injury-depth, extension, or deadline options.', data.capGrade);
    }
    if ('restructureSavings' in candidate) {
      return buildInsight(
        'opportunity',
      `Preview ${candidate.playerName}'s restructure before cutting players; it creates cap space while cuts force dead-money or depth loss.`,
        formatMoney(candidate.restructureSavings),
      );
    }
    return buildInsight(
      'warning',
      `${candidate.playerName} is a hard cap-cost question. Cutting that deal creates relief when the lineup or cap fix outweighs the dead-money hit.`,
      formatMoney(candidate.savingsIfCut),
    );
  }

  if (agm.expertise === 'offense' && phaseId === 'set_scheme') {
    const data = phaseData as SchemeSelectionContext;
    const option = pickTopOption(data.offenseOptions);
    return buildInsight(
      'strength',
      `Choose ${option.label} to keep ${optionPlayers(option)} in roles they already run well before Week 1.`,
      schemeFitLabel(option.fitScore),
    );
  }

  if (agm.expertise === 'defense' && phaseId === 'set_scheme') {
    const data = phaseData as SchemeSelectionContext;
    const option = pickTopOption(data.defenseOptions);
    const concept = option.schemeId === 'cover_3'
      ? 'three deep zones and quick tackling after short throws'
      : option.schemeId === 'man_press'
        ? 'corners pressing receivers without extra safety protection'
        : option.schemeId === '4-3'
          ? 'four linemen rushing and linebackers owning run lanes'
          : option.schemeId === '3-4'
            ? 'linebackers rushing, covering, and fitting the run'
            : 'two deep safeties and tackling underneath';
    return buildInsight(
      'strength',
      `Choose ${option.label} because it asks for ${concept}; keep ${optionPlayers(option)} in those jobs or Week 1 missed assignments start there.`,
      schemeFitLabel(option.fitScore),
    );
  }

  if (agm.expertise === 'personnel' && phaseId === 'meet_roster') {
    const data = phaseData as RosterOverview;
    const breakout = data.risingStars[0];
    if (breakout) {
      return buildInsight(
        'opportunity',
        `Protect ${breakout.playerName}'s role before Week 1. Assign extra snaps through a defined scheme role, or the breakout turns into wasted development weeks.`,
        `Age ${breakout.age}, ${developmentGainLabel(breakout.ovrDelta)}`,
      );
    }
    const anchor = data.starPlayers[0];
    if (!anchor) return null;
    return buildInsight(
      'strength',
      `Protect ${anchor.name}'s weekly job before major roster moves; taking snaps, cap space, or practice reps away from his position group creates a Week 1 lineup or development miss.`,
      playerRoleLabel(anchor.ovr),
    );
  }

  if (agm.expertise === 'offense' && phaseId === 'depth_chart') {
    const data = phaseData as DepthChartContext;
    const qbRoom = roomFor(data, 'QB');
    const receiverRoom = roomFor(data, 'WR');
    if (!qbRoom || !receiverRoom) return null;
    return buildInsight(
      'strength',
      `${autoSetNames(data, 'QB')} throwing into a ${data.selectedOffenseScheme} structure with ${receiverRoom.players[0]?.name ?? 'the receivers'} is the Week 1 passing order with the fewest missed-protection sacks.`,
      schemeFitLabel(qbRoom.players[0]?.fitScore ?? 0),
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
      `Give ${youngPlayer.name} controlled setup snaps in a package named by down, distance, or formation; otherwise development slows or starter-level mistakes arrive too early.`,
      schemeFitLabel(youngPlayer.fitScore),
    );
  }

  if (agm.expertise === 'defense' && phaseId === 'meet_roster') {
    const data = phaseData as RosterOverview;
    const defender = data.starPlayers.find((player) => ['DL', 'LB', 'CB', 'S'].includes(player.pos))
      ?? data.weakestStarters.find((player) => ['DL', 'LB', 'CB', 'S'].includes(player.pos));
    if (!defender) return null;
    return buildInsight(
      defender.ovr >= 85 ? 'strength' : 'warning',
      `Set ${defender.name} as the defensive reference point. If opponents target that role, protect it with scheme or depth before Week 1.`,
      playerRoleLabel(defender.ovr),
    );
  }

  if (agm.expertise === 'cap_management' && phaseId === 'set_goals') {
    const data = phaseData as GoalSelectionContext;
    const capGoal = data.availableGoals.find((goal) => goal.id === 'cap_health');
    if (!capGoal) return null;
    return buildInsight(
      capGoal.recommended ? 'opportunity' : 'warning',
      `Choose ${capGoal.label} when you are willing to limit extension and veteran-add aggression once cap decisions arrive.`,
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
      `Compare ${biggest.name}'s role, production, and ${formatMoney(biggest.salary)} cap hit before adding contracts; an inefficient deal shrinks injury, trade, and extension money.`,
      formatMoney(biggest.salary),
    );
  }

  if (agm.expertise === 'offense' && phaseId === 'set_scheme') {
    const data = phaseData as SchemeSelectionContext;
    const bottom = pickBottomOption(data.offenseOptions);
    return buildInsight(
      'warning',
      `${bottom.label} asks the offense to run roles this roster is not built to handle. Protect ${playerNameList(bottom.worstFitPlayers)} or Week 1 missed assignments start there.`,
      installRiskLabel(bottom.transitionPenalty),
    );
  }

  if (agm.expertise === 'defense' && phaseId === 'set_scheme') {
    const data = phaseData as SchemeSelectionContext;
    const bottom = pickBottomOption(data.defenseOptions);
    return buildInsight(
      'warning',
      `Avoid ${bottom.label} when ${playerNameList(bottom.worstFitPlayers)} lack depth protection; otherwise the same unprotected assignment repeats snap after snap.`,
      installRiskLabel(bottom.transitionPenalty),
    );
  }

  if (agm.expertise === 'personnel' && phaseId === 'meet_roster') {
    const data = phaseData as RosterOverview;
    const weakStarter = data.weakestStarters[0];
    if (!weakStarter) return null;
    return buildInsight(
      'warning',
      `Name ${weakStarter.name}'s Week 1 job and backup order now. If that position slips, start a succession plan before the lineup costs games.`,
      playerRoleLabel(weakStarter.ovr),
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
  const concern = data.criticalNeeds[0] ? formatPositionGroup(data.criticalNeeds[0]) : 'the first uncovered starter or first-backup job';
  const insights = finalizeInsights('intel_briefing', [
    buildInsight('strength', `${strength} has Week 1 starters and first backups already set. Keep that order, then spend picks or cap space where weaker starters or backups cost Week 1 possessions.`, data.strengths[0] ?? null),
    buildInsight('concern', `${concern} is the first starter or backup group opponents will attack. Address depth, protection, or Game Plan calls there before Week 1.`, data.criticalNeeds[0] ?? null),
    buildInsight(
      data.capGrade === 'A' || data.capGrade === 'B' ? 'opportunity' : 'warning',
      data.capGrade === 'A' || data.capGrade === 'B'
        ? `Cap space is ${formatMoney(data.capSpace)}. Spend it on injury depth, extensions, or one starter upgrade with a named Week 1 job.`
        : `Cap space is ${formatMoney(data.capSpace)}. Preview a cut, restructure, or delayed move before new spending.`,
      formatMoney(data.capSpace),
    ),
    buildInsight(
      data.leagueRank <= 8 ? 'strength' : data.leagueRank >= 20 ? 'warning' : 'opportunity',
      data.leagueRank <= 8
        ? `The ${ordinal(data.leagueRank)} league rank supports win-now moves; name starter and backup cover first or one mistake wastes that advantage.`
        : data.leagueRank >= 20
        ? `Treat the ${ordinal(data.leagueRank)} league rank as an owner-patience warning. Overpromised wins spend picks or contracts before the roster is ready.`
          : `Treat the ${ordinal(data.leagueRank)} league rank as the reason to choose one starter fix now; one depth mistake costs a playoff game or division tiebreaker.`,
      ordinal(data.leagueRank),
    ),
  ], data, agm);

  return makeDialogue(
    'intel_briefing',
    agm,
    `${windowPhaseSetupLine(data.windowPhase)} Depth, cap space, and scheme choices decide whether Week 1 starts with backups covered or injury fixes blocked.`,
    insights,
    null,
    'Next, name which starter jobs, first-backup jobs, and cap choices must be handled before Week 1.',
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
        `Build scheme, snaps, and protection around ${namesWithRoleLabels(data.starPlayers)}; opponents will try to take those players away first.`,
        `${data.starPlayers.length} star players`,
      )
      : buildInsight(
        'warning',
        'No 85-plus cornerstone is carrying this roster. Set legal starters, protect development snaps, and cover the first uncovered starter or first-backup job, or Week 1 mistakes force emergency veteran fixes.',
        '0 star players',
      ),
    data.risingStars.length > 0
      ? buildInsight(
        'opportunity',
        `Prioritize ${data.risingStars[0]!.playerName} as the breakout candidate. Protect his role now, or recent growth turns into wasted development weeks.`,
        `Age ${data.risingStars[0]!.age}, ${developmentGainLabel(data.risingStars[0]!.ovrDelta)}`,
      )
      : buildInsight(
        'warning',
        'I do not see an obvious breakout candidate from last year’s data. Set scheme and snaps deliberately, or an unassigned role wastes development weeks.',
        null,
      ),
    data.injuredPlayers.length > 0
      ? buildInsight(
        'concern',
        `${data.injuredPlayers[0]!.name} is already unavailable. Name the replacement before saving depth, or Week 1 uses an uncovered backup.`,
        `${data.injuredPlayers[0]!.gamesOut} games out`,
      )
      : buildInsight(
        'strength',
        'No major injury is flagged yet. Assign practice reps to scheme responsibilities and set the first backups.',
        null,
      ),
  ], data, agm);

  const recommendation = anchor
    ? `${anchor} is the first player to protect. Before any major setup decision, name his role, backup cover, and cap cost; taking snaps, cap space, or practice reps away from his position group creates a Week 1 lineup or development miss.`
    : 'When no star anchors setup, set legal starters, first backups, development snaps, and the first uncovered starter or first-backup job before Week 1; otherwise first-game mistakes force emergency fixes.';

  return makeDialogue(
    'meet_roster',
    agm,
    `Name starters, first backups, and protected stars across all ${data.rosterSize} players now; uncovered jobs decide which positions need a depth-chart change, signing, trade, or cap move before Week 1.`,
    insights,
    recommendation,
    'Now choose the coach who owns play calls and protects the roles this roster must run before Week 1.',
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
      ? buildInsight('warning', 'The head coach job is vacant. Until we hire one, scheme calls, practice roles, and player development stay unresolved.', 'HC vacancy')
      : buildInsight(
        'strength',
        `${data.headCoach.name} is a ${data.headCoach.archetype} coach with ${coachCommandLabel(data.headCoach.level)}. Match coordinator roles to his scheme before Week 1, or practice install slows and young-player snaps get wasted.`,
        coachCommandLabel(data.headCoach.level),
      ),
    oc?.vacant
      ? buildInsight('warning', 'The offensive coordinator job is open. Choose protection, tempo, and receiver calls that fit current blockers and receivers now; complex calls create Week 1 missed assignments.', 'OC vacancy')
      : buildInsight(
        'opportunity',
        `${oc!.name} gives the offense a ${oc!.specialty ?? 'generalist'} base. Build Game Plan calls from that base before kickoff.`,
        oc!.specialty,
      ),
    dc?.vacant
      ? buildInsight('warning', 'The defensive coordinator job is open. Avoid blitz or man-coverage changes until roles are assigned, or the least protected defenders get isolated before Week 1.', 'DC vacancy')
      : buildInsight(
        'strength',
        `${dc!.name} gives the defense a ${dc!.specialty ?? 'generalist'} base. Assign each defender a run, coverage, or blitz job before kickoff.`,
        dc!.specialty,
      ),
  ], data, agm);

  return makeDialogue(
    'hire_coach',
    agm,
    'The next head coach hire sets scheme calls, practice roles, and player development. Calls that do not match current starters slow every setup choice after this.',
    insights,
    `Hire a head coach whose playbook installs ${data.schemeRecommendation.offenseLabel} and ${data.schemeRecommendation.defenseLabel} without forcing current players into weekly roles outside their assignments.`,
    'After the head coach is in place, hire the scout who names medical limits, assigned-role warnings, and coachability warnings for that scheme before picks become roster costs.',
    tone,
  );
}

export const agmOnCoachingReview = agmOnHireCoach;

export function agmOnHireScout(data: FranchiseIntelBriefing, agm: AGMProfile): AGMPhaseDialogue {
  const tone: AGMPhaseDialogue['tone'] = data.windowPhase === 'rebuilding' ? 'measured' : 'confident';
  const insights = finalizeInsights('hire_scout', [
    buildInsight(
      'opportunity',
      `${formatPositionGroup(data.criticalNeeds[0] ?? 'roster depth')} is the first position where scouting must identify draftable starters before we spend picks or cap space.`,
      data.criticalNeeds[0] ?? null,
    ),
    buildInsight(
      'strength',
      `${formatPositionGroup(data.strengths[0] ?? 'the roster core')} has Week 1 starters covered. Scout that position for next-year starter succession before injuries, age, or contracts force an expensive emergency patch.`,
      data.strengths[0] ?? null,
    ),
    buildInsight(
      data.capGrade === 'A' || data.capGrade === 'B' ? 'strength' : 'warning',
      `Hire scouting that names the starter or backup job before picks or free-agent money pay twice for the same fix; current cap space is ${formatMoney(data.capSpace)}.`,
      formatMoney(data.capSpace),
    ),
  ], data, agm);

  return makeDialogue(
    'hire_scout',
    agm,
    'Scouting finds future starters before missed medical limits, unnamed player jobs, or coachability warnings force a draft reach or free-agent overpay.',
    insights,
    'Hire a director who names medical limits, coachability warnings, and the assigned player job for the biggest uncovered starter or backup spot before the next three drafts spend picks.',
    'After this hire, choose schemes that match the roles scouting has named before draft picks become roster costs.',
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
      `${bestOffense.label} protects the offense now. Keep ${optionPlayers(bestOffense)} in calls they already know, or Week 1 missed assignments start in protection and timing.`,
      schemeFitLabel(bestOffense.fitScore),
    ),
    buildInsight(
      'strength',
      `Choose ${bestDefense.label} for the current defenders. Keep ${optionPlayers(bestDefense)} in roles with coverage or run-defense protection, or Week 1 mistakes start there.`,
      schemeFitLabel(bestDefense.fitScore),
    ),
    buildInsight(
      'warning',
      `${worstOffense.label} with ${worstDefense.label} is the pairing I would keep furthest from the game plan. Protect ${playerNameList([...worstOffense.worstFitPlayers, ...worstDefense.worstFitPlayers])} or Week 1 missed assignments start there.`,
      installRiskLabel(worstOffense.transitionPenalty + worstDefense.transitionPenalty),
    ),
  ], data, agm);

  return makeDialogue(
    'set_scheme',
    agm,
    'This phase decides whether Week 1 calls match current assignments or cost preparation time adapting.',
    insights,
    `Choose ${bestOffense.label} with ${bestDefense.label} because the current starters already match those run, pass, coverage, and run-defense jobs. Keep ${optionPlayers(bestOffense)} and ${optionPlayers(bestDefense)} in those jobs; late scheme changes create missed assignments before Week 1.`,
    'Set the schemes, then decide who earns the first snaps inside them.',
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
      ? buildInsight('opportunity', `${battleLine} Name current ability, assigned role, and the Week 1 snap consequence before saving that order.`, null)
      : buildInsight('strength', 'Starter order has fewer conflicts. Name backups, third-down roles, and injury cover before saving the order.', null),
    buildInsight(
      'strength',
      `If we auto-set this depth chart right now, the offense starts with ${qbNames} and the main receiver group is ${wrNames}. That gives Week 1 a legal starting order to edit before it locks.`,
      data.selectedOffenseScheme,
    ),
    buildInsight(
      'opportunity',
      `Apply ${data.selectedOffenseScheme} and ${data.selectedDefenseScheme} role demands to break close backup and package-role ties before saving the lineup.`,
      `${data.activeBattles.length} active battles`,
    ),
  ], data, agm);

  return makeDialogue(
    'depth_chart',
    agm,
    'Now we choose starters, backups, and the first players who lose snaps if the saved order leaves a backup uncovered.',
    insights,
    `Auto-set gives a legal starting order, not the final lineup. Save it, then set ${data.activeBattles[0]?.slotLabel ?? 'backup roles, third-down spots, and injury cover'} before Advance Week locks the lineup.`,
    'Once the depth chart matches the roster, the cap plan targets the exact contracts, injuries, or depth spots where a contract, injury replacement, or roster move still protects the lineup.',
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
      `Cap space is ${formatMoney(data.capSpace)} with ${formatMoney(data.deadCap)} in dead money. Adding players now forces a tradeoff: cut, restructure, or save fewer moves for later injuries and extensions.`,
      `${formatMoney(data.capSpace)} space`,
    ),
    biggest
      ? buildInsight(
        biggest.value === 'Overpay' ? 'warning' : 'strength',
        `${biggest.name} carries one of the largest cap commitments at ${formatMoney(biggest.salary)}. Compare his role and production before adding another contract; otherwise cap space for injuries, trades, and extensions shrinks.`,
        `${formatMoney(biggest.salary)} for ${playerRoleLabel(biggest.ovr)}`,
      )
      : buildInsight('strength', 'No contract demands an emergency move right now; save cap space for the next starter fix, backup fix, injury, or extension deadline.', null),
    restructure
      ? buildInsight(
        'opportunity',
        `${restructure.playerName} is the first restructure to test. Run it when the new cap space pays for a needed starter, injury replacement, or deadline move.`,
        formatMoney(restructure.restructureSavings),
      )
      : cut
        ? buildInsight(
          'warning',
          `Cut ${cut.playerName} first when a hard cap move is required; the move creates cap space and removes lineup or first-backup protection.`,
          formatMoney(cut.savingsIfCut),
        )
        : buildInsight(
          expiring ? 'opportunity' : 'strength',
          expiring
            ? `${expiring.name} is the first expiring deal I would schedule. That negotiation affects future cap space and whether the player reaches free agency.`
            : 'No immediate contract emergency is forcing a move. Save that cap action until injury, loss, or an extension deadline identifies the starter, backup, or contract fix.',
          expiring ? formatMoney(expiring.capHit) : null,
        ),
  ], data, agm);

  const recommendation = restructure
    ? `The first cap study is ${restructure.playerName}. Run that restructure before a cut when the new cap space protects a needed starter or replacement plan.`
    : cut
      ? `If cap space must be created today, cut ${cut.playerName} first when the cap-space fix outweighs weakening the lineup or first backup group.`
      : 'Save cap space until injuries, losses, or an extension deadline names the starter, backup, or contract fix; early spending blocks that fix.';

  return makeDialogue(
    'cap_strategy',
    agm,
    'This is where we decide whether cap space pays for injury replacements, extensions, and trades, or forces cuts and delayed upgrades.',
    insights,
    recommendation,
    'Cap plan is set. Now choose goals the roster is built to defend without spending cap space on contracts that block later fixes or shorten owner patience.',
    tone,
  );
}

export function agmOnGoalSelection(data: GoalSelectionContext, agm: AGMProfile): AGMPhaseDialogue {
  const labels = normalizeGoals(data);
  const tone: AGMPhaseDialogue['tone'] = data.ownerType === 'win_now' ? 'confident' : data.ownerType === 'penny' ? 'measured' : 'excited';
  const insights = finalizeInsights('set_goals', [
    buildInsight(
      data.ownerType === 'win_now' ? 'warning' : 'opportunity',
      `Open the ${ownerTypeLabel(data.ownerType)} owner reaction before choosing promises. ${data.ownerExpectations}`,
      ownerTypeLabel(data.ownerType),
    ),
    buildInsight(
      'strength',
      `Choose ${labels[0] ?? 'the top goal'} to protect the season plan: ${data.recommendedGoals[0]?.reason ?? 'it matches starter strength, cap space, and owner patience.'}`,
      data.recommendedGoals[0]?.difficulty ?? null,
    ),
    buildInsight(
      'opportunity',
      `Choose the full recommended goal set: ${joinNames(labels)}. That keeps owner expectations tied to current starters, cap space, and Week 1 lineup jobs.`,
      `${labels.length} goals`,
    ),
  ], data, agm);

  return makeDialogue(
    'set_goals',
    agm,
    'Owner goals decide what ownership judges, when roster upgrades are expected, and how losses affect patience.',
    insights,
    `My recommendation is ${joinNames(labels)}. That set protects the current roster, owner patience, cap limits, and Week 1 lineup jobs.`,
    'After goals, open the blueprint so staff, scheme, depth, cap, and owner promises are in one place before Week 1.',
    tone,
  );
}

export function agmOnBlueprint(data: FranchiseBlueprint, agm: AGMProfile): AGMPhaseDialogue {
  const keyNames = joinNames(data.keyPlayers.map((player) => player.name));
  const goalNames = joinNames(data.seasonGoals.map((goal) => goal.label));
  const closingByPersonality: Record<AGMProfile['personality'], string> = {
    analytical: 'This plan names the cost, deadline, and Week 1 starter job, cap move, or Game Plan call. Now set weekly roster, cap, and Game Plan choices before Advance Week locks them.',
    fiery: 'Week 1 starts from this plan. Set prep, depth, and cap choices every week or one uncovered starter or first-backup job costs games.',
    old_school: 'Plan set. Now save the legal lineup, prep the opponent, and spend cap space on a starter, depth, or injury need.',
    player_whisperer: 'Roles are assigned now. Set snaps, morale, and development choices every week or young players stall and veterans lose morale.',
  };
  const tone: AGMPhaseDialogue['tone'] = data.windowPhase === 'peaking' ? 'excited' : 'confident';
  const insights = finalizeInsights('blueprint', [
    buildInsight(
      'strength',
      `${data.selectedSchemes.offenseLabel} on offense and ${data.selectedSchemes.defenseLabel} on defense give the team a Week 1 plan instead of a placeholder install.`,
      `${data.selectedSchemes.offenseLabel} / ${data.selectedSchemes.defenseLabel}`,
    ),
    buildInsight(
      'strength',
      `${keyNames} are the players this plan leans on. If they are hurt, overloaded, or missing depth protection, fix roles, backups, or cap before Advance Week.`,
      `${data.keyPlayers.length} key players`,
    ),
    buildInsight(
      'opportunity',
      `${goalNames} are the goals we are committing to. Missing them affects owner patience; protect them weekly with roster, cap, and depth-chart decisions.`,
      windowPhasePlanLabel(data.windowPhase),
    ),
    buildInsight(
      'warning',
      `Before Advance Week, set depth-chart order and preview cap options for ${joinNames(data.criticalNeeds.map((need) => formatPositionGroup(need)))}; those starter and backup groups cost games if backups or money are left unresolved.`,
      data.capOutlook,
    ),
  ], data, agm);

  return makeDialogue(
    'blueprint',
    agm,
    `Open ${data.teamName}'s Week 1 plan now: ${data.selectedSchemes.offenseLabel}, ${data.selectedSchemes.defenseLabel}, and ${windowPhasePlanLabel(data.windowPhase)} priorities.`,
    insights,
    `Protect ${keyNames} and fix starter and backup groups before they cost games; ${goalNames} stay realistic only if weekly roster and cap choices preserve that plan before Advance Week.`,
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
  const weakerSide = weakest === offense ? 'offense' : 'defense';
  const worstFitNames = playerNameList(weakest.worstFitPlayers);

  if (offense.schemeId === bestOffense.schemeId && defense.schemeId === bestDefense.schemeId) {
    return {
      sentiment: 'love_it',
      reaction: withTone(`Lock ${offense.label} with ${defense.label}; current players have the fewest immediate role conflicts for that Week 1 install.`, agm),
      followUp: withTone('Assign prep days to protection, coverage, and run-defense jobs; missed assignments become Week 1 mistakes by kickoff.', agm),
    };
  }

  if (avgFit > 70 && minFit >= 50) {
    return {
      sentiment: 'like_it',
      reaction: withTone(`Run ${offense.label} with ${defense.label} after naming the ${weakerSide} starters and calls before Week 1.`, agm),
      followUp: withTone(`Name the ${weakerSide} starters and calls first; a role without enough player skill or backup protection turns this pairing into drive-costing mistakes.`, agm),
    };
  }

  if (avgFit < 35 || minFit < 35) {
    return {
      sentiment: 'disagree',
      reaction: withTone(`Name the Depth Chart or Game Plan protection before lock-in. The ${weakerSide} side lacks protected roles and costs drives immediately.`, agm),
      followUp: withTone(`Protect ${worstFitNames} before saving; late install changes hit their assignments first.`, agm),
    };
  }

  return {
    sentiment: 'concerned',
    reaction: withTone(`Name the exposed ${weakerSide} side before locking it. That side carries the first Week 1 assignment gap and needs Depth Chart or Game Plan protection.`, agm),
    followUp: withTone(`Protect ${worstFitNames} with Depth Chart or Game Plan calls, because late install changes hit their assignments first.`, agm),
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
      reaction: withTone(`Lock ${joinNames(matchedLabels)}; those promises match current starters, cap space, and development timing, so early losses cost less owner patience.`, agm),
      followUp: null,
    };
  }

  if (matches === 2) {
    return {
      sentiment: 'like_it',
      reaction: withTone(`${joinNames(matchedLabels)} match current starters, but name the skipped promise before locking goals; missing it turns early losses into owner-patience cuts or budget pressure.`, agm),
      followUp: missedLabels.length > 0 ? withTone(`Plan for ${missedLabels[0]} before October; leaving it out shortens owner patience or pushes a roster spend after losses.`, agm) : null,
    };
  }

  if (matches === 1) {
    return {
      sentiment: 'concerned',
      reaction: withTone('Preview this goal set before locking it; leaving two advised goals out shortens owner patience and pushes roster spending after losses.', agm),
      followUp: missedLabels.length > 0 ? withTone(`Plan for ${joinNames(missedLabels)} before October; leaving them out shortens owner patience after losses.`, agm) : null,
    };
  }

  return {
    sentiment: 'disagree',
    reaction: withTone('Plan this goal set again before lock-in; missing starter strength, cap space, or development timing makes early losses cut owner patience and push roster spending.', agm),
    followUp: missedLabels.length > 0 ? withTone(`Rebuild around ${joinNames(missedLabels)}; leaving them out makes early losses cut owner patience and trigger spending pressure.`, agm) : null,
  };
}
