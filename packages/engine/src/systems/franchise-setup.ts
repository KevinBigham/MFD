import { v36CapHit } from './contract-helpers';
import { getCapHealth, identifyCapCandidates } from './cap-laboratory';
import { buildCapVisualization } from './cap-visualization';
import { getTeamRankings } from './analytics';
import { identifyBreakoutCandidates } from './development-insights';
import {
  calculateDynastyWindow,
  type WindowPhase,
} from './dynasty-window';
import { OWNER_GOALS, type OwnerType } from './owner-goals';
import {
  STARTER_SLOTS,
  detectPositionBattles,
  type PositionBattle,
} from './roster-management';
import { calcSchemeFit } from './scheme-fit';
import { projectSchemeTransition } from './scheme-install';
import {
  analyzeTeamNeeds,
  buildLeagueAverageByGroup,
} from './team-needs';
import type {
  GameState,
  Player,
  Position,
  Team,
  TeamNeedsReport,
} from '../types';

const PHASE_ORDER = [
  'intel_briefing',
  'meet_roster',
  'coaching_review',
  'set_scheme',
  'depth_chart',
  'cap_strategy',
  'set_goals',
  'blueprint',
] as const;

const POSITION_ORDER: readonly Position[] = [
  'QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P',
];

const OFFENSIVE_POSITIONS: readonly Position[] = ['QB', 'RB', 'WR', 'TE', 'OL'];
const DEFENSIVE_POSITIONS: readonly Position[] = ['DL', 'LB', 'CB', 'S'];

const OFFENSE_SCHEME_CATALOG = [
  {
    schemeId: 'spread',
    label: 'Spread',
    description: 'Space and pace. Four-wide looks and playmakers in space.',
  },
  {
    schemeId: 'west_coast',
    label: 'West Coast',
    description: 'Short rhythm throws, timing routes, and quarterback precision.',
  },
  {
    schemeId: 'power_run',
    label: 'Power Run',
    description: 'Pound the rock behind physical blocking and downhill backs.',
  },
  {
    schemeId: 'air_raid',
    label: 'Air Raid',
    description: 'Air it out. Your quarterback drives a high-volume passing attack.',
  },
  {
    schemeId: 'balanced',
    label: 'Balanced',
    description: 'Stay multiple and force defenses to defend every answer.',
  },
] as const;

const DEFENSE_SCHEME_CATALOG = [
  {
    schemeId: '4-3',
    label: '4-3',
    description: 'Sound and simple. Let the front four and linebackers play fast.',
  },
  {
    schemeId: '3-4',
    label: '3-4',
    description: 'Flexible pressure from the second level with varied fronts.',
  },
  {
    schemeId: 'cover_2',
    label: 'Cover 2',
    description: 'Keep the roof on the defense and rally to underneath throws.',
  },
  {
    schemeId: 'cover_3',
    label: 'Cover 3',
    description: 'Bend without breaking and squeeze explosive plays out of the game.',
  },
  {
    schemeId: 'man_press',
    label: 'Man Press',
    description: 'Challenge receivers at the line and trust your corners to travel.',
  },
] as const;

const GOAL_RECOMMENDATION_BASE: Record<WindowPhase, readonly string[]> = {
  peaking: ['win_division', 'star_power', 'championship'],
  opening: ['playoff_berth', 'draft_well', 'winning_record'],
  closing: ['win_division', 'cap_health', 'no_losing_streak'],
  rebuilding: ['rebuild_progress', 'draft_well', 'cap_health'],
};

const OWNER_TYPE_BOOSTS: Record<OwnerType, readonly string[]> = {
  win_now: ['championship', 'win_division', 'star_power'],
  patient: ['rebuild_progress', 'draft_well', 'winning_record'],
  penny: ['cap_health', 'draft_well', 'no_losing_streak'],
};

/**
 * Ordered phase IDs for the franchise setup flow.
 */
export type SetupPhase = (typeof PHASE_ORDER)[number];

/**
 * Mutable decisions captured while the user moves through setup.
 */
export interface SetupDecisions {
  offenseScheme: string | null;
  defenseScheme: string | null;
  seasonGoals: string[];
  depthChartOverrides: Record<string, string[]>;
  acknowledged: SetupPhase[];
}

/**
 * Setup flow progress tracked on game state.
 */
export interface SetupState {
  currentPhase: SetupPhase;
  completedPhases: SetupPhase[];
  decisions: SetupDecisions;
  blueprint: FranchiseBlueprint | null;
}

/**
 * High-level team context shown before the user makes any decisions.
 */
export interface FranchiseIntelBriefing {
  windowPhase: WindowPhase;
  windowScore: number;
  capGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  capSpace: number;
  rosterOverall: number;
  leagueRank: number;
  criticalNeeds: string[];
  strengths: string[];
  overallAssessment: string;
}

/**
 * Snapshot of the roster's stars, questions, and health entering the season.
 */
export interface RosterOverview {
  starPlayers: Array<{
    playerId: string;
    name: string;
    pos: Position;
    ovr: number;
    age: number;
  }>;
  risingStars: Array<{
    playerId: string;
    playerName: string;
    pos: string;
    age: number;
    ovr: number;
    ovrDelta: number;
    reason: string;
  }>;
  positionBattles: PositionBattle[];
  weakestStarters: Array<{
    playerId: string;
    name: string;
    pos: Position;
    ovr: number;
    age: number;
  }>;
  rosterSize: number;
  injuredPlayers: Array<{
    playerId: string;
    name: string;
    pos: Position;
    gamesOut: number;
    severity: string;
  }>;
}

/**
 * Summary of the current coaching staff and their football identity.
 */
export interface CoachingStaffReview {
  headCoach: {
    name: string;
    archetype: string;
    ratings: Record<string, number>;
    level: number;
    vacant: boolean;
  };
  coordinators: Array<{
    role: 'OC' | 'DC';
    name: string;
    archetype: string;
    specialty: string | null;
    ratings: Record<string, number>;
    level: number;
    vacant: boolean;
  }>;
  coachingPhilosophy: string;
  schemeRecommendation: {
    offenseSchemeId: string;
    offenseLabel: string;
    defenseSchemeId: string;
    defenseLabel: string;
    reasoning: string;
  };
}

/**
 * One setup-facing scheme option with fit and transition context.
 */
export interface SchemeOption {
  schemeId: string;
  label: string;
  description: string;
  fitScore: number;
  transitionPenalty: number;
  staffAlignmentBonus: number;
  bestFitPlayers: Array<{ playerId: string; name: string; pos: Position; ovr: number; fitScore: number }>;
  worstFitPlayers: Array<{ playerId: string; name: string; pos: Position; ovr: number; fitScore: number }>;
  staffAligned: boolean;
  recommendationScore: number;
  recommended: boolean;
}

/**
 * Scheme selection payload for the setup flow.
 */
export interface SchemeSelectionContext {
  currentOffScheme: string;
  currentDefScheme: string;
  offenseOptions: SchemeOption[];
  defenseOptions: SchemeOption[];
}

/**
 * Depth-chart recommendations after schemes are chosen.
 */
export interface DepthChartContext {
  selectedOffenseScheme: string;
  selectedDefenseScheme: string;
  positionGroups: Array<{
    position: Position;
    players: Array<{
      playerId: string;
      name: string;
      ovr: number;
      age: number;
      contractCapHit: number;
      isStarter: boolean;
      fitScore: number;
    }>;
  }>;
  activeBattles: PositionBattle[];
  autoSetRecommendation: Record<Position, string[]>;
}

/**
 * Salary-cap framing shown before the user reaches the main game.
 */
export interface CapStrategyBriefing {
  capGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  capSpace: number;
  deadCap: number;
  biggestContracts: Array<{
    name: string;
    pos: Position;
    ovr: number;
    age: number;
    salary: number;
    years: number;
    value: 'Fair' | 'Watch' | 'Overpay';
  }>;
  expiringDeals: Array<{
    playerId: string;
    name: string;
    pos: Position;
    ovr: number;
    capHit: number;
  }>;
  restructureCandidates: Array<{
    playerId: string;
    playerName: string;
    pos: Position;
    restructureSavings: number;
    recommendation: string;
  }>;
  cutCandidates: Array<{
    playerId: string;
    playerName: string;
    pos: Position;
    savingsIfCut: number;
    recommendation: string;
  }>;
  capOutlook: string;
}

/**
 * A selectable owner goal paired with setup-specific guidance.
 */
export interface GoalOption {
  id: string;
  label: string;
  description: string;
  recommended: boolean;
  difficulty: 'easy' | 'moderate' | 'hard';
  reason: string;
}

/**
 * Goal selection payload for the setup flow.
 */
export interface GoalSelectionContext {
  ownerType: OwnerType;
  ownerExpectations: string;
  availableGoals: GoalOption[];
  recommendedGoals: GoalOption[];
}

/**
 * Final setup summary persisted for UI reference after onboarding ends.
 */
export interface FranchiseBlueprint {
  teamName: string;
  year: number;
  difficulty: GameState['difficulty'];
  windowPhase: WindowPhase;
  windowTrend: 'improving' | 'stable' | 'declining';
  selectedSchemes: {
    offenseSchemeId: string;
    offenseLabel: string;
    defenseSchemeId: string;
    defenseLabel: string;
  };
  seasonGoals: Array<{ id: string; label: string; description: string }>;
  criticalNeeds: string[];
  keyPlayers: Array<{ playerId: string; name: string; pos: Position; ovr: number }>;
  rosterStrength: string;
  capOutlook: string;
  blueprintNarrative: string;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function cloneGame<T>(value: T): T {
  return structuredClone(value);
}

function getTeam(game: GameState, teamId: string): Team {
  const team = game.teams[teamId];
  if (!team) {
    throw new Error(`Missing team ${teamId} for franchise setup.`);
  }
  return team;
}

function getOwnerType(team: Team): OwnerType {
  switch (team.owner.archetypeId) {
    case 'win_now':
    case 'fan_favorite':
      return 'win_now';
    case 'profit_first':
      return 'penny';
    case 'patient_builder':
    case 'legacy_builder':
    default:
      return 'patient';
  }
}

function ensureOwnerRecord(game: GameState, team: Team) {
  if (!game.owners[team.ownerId]) {
    game.owners[team.ownerId] = {
      id: team.ownerId,
      name: team.owner.label || 'Owner',
      archetype: team.owner.archetypeId,
      patience: team.ownerPatience80,
      goals: { floor: '', target: '', ceiling: '' },
      personality: {
        spending: getOwnerType(team) === 'penny' ? 3 : 6,
        patience: getOwnerType(team) === 'patient' ? 8 : 4,
        mediaAwareness: 6,
      },
    };
  }
  return game.owners[team.ownerId]!;
}

function normalizePhases(phases: readonly SetupPhase[]): SetupPhase[] {
  const set = new Set(phases);
  return PHASE_ORDER.filter((phase) => set.has(phase));
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values));
}

function currentOffScheme(team: Team): string {
  return team.schemeOff ?? team.offScheme ?? 'balanced';
}

function currentDefScheme(team: Team): string {
  return team.schemeDef ?? team.defScheme ?? '4-3';
}

function isOffensivePosition(position: Position): boolean {
  return OFFENSIVE_POSITIONS.includes(position);
}

function isDefensivePosition(position: Position): boolean {
  return DEFENSIVE_POSITIONS.includes(position);
}

function getHealthyPlayers(players: readonly Player[]): Player[] {
  return players.filter((player) => !(player.injury?.gamesOut && player.injury.gamesOut > 0));
}

function getPlayersAtPosition(team: Team, position: Position): Player[] {
  return team.roster
    .filter((player) => player.pos === position)
    .sort((left, right) =>
      Number(right.isStarter) - Number(left.isStarter)
      || right.ovr - left.ovr
      || left.age - right.age
      || left.id.localeCompare(right.id));
}

function getStarterCount(position: Position): number {
  return STARTER_SLOTS[position] ?? 1;
}

function getPreferredStarters(team: Team, position: Position): Player[] {
  const room = getPlayersAtPosition(team, position);
  const starterCount = getStarterCount(position);
  const flagged = room.filter((player) => player.isStarter);
  if (flagged.length >= Math.min(room.length, starterCount)) {
    return flagged.slice(0, starterCount);
  }
  return room.slice(0, starterCount);
}

function getRosterStarters(team: Team): Player[] {
  const flagged = team.roster.filter((player) => player.isStarter);
  if (flagged.length >= 12) {
    return [...flagged].sort((left, right) => right.ovr - left.ovr || left.id.localeCompare(right.id));
  }
  return [...team.roster]
    .sort((left, right) => right.ovr - left.ovr || left.id.localeCompare(right.id))
    .slice(0, Math.min(22, team.roster.length));
}

function averageStarterOvr(team: Team): number {
  return round(average(getRosterStarters(team).map((player) => player.ovr)));
}

function getLeagueRank(rankings: ReturnType<typeof getTeamRankings>, teamId: string): number {
  const offense = rankings.offense.findIndex((entry) => entry.teamId === teamId) + 1;
  const defense = rankings.defense.findIndex((entry) => entry.teamId === teamId) + 1;
  const specialTeams = rankings.specialTeams.findIndex((entry) => entry.teamId === teamId) + 1;
  return Math.max(1, Math.round(average([offense, defense, specialTeams].filter((value) => value > 0))));
}

function buildIntelNarrative(
  windowPhase: WindowPhase,
  capGrade: FranchiseIntelBriefing['capGrade'],
  needs: TeamNeedsReport,
): string {
  const phaseLine = windowPhase === 'peaking'
    ? 'You are inheriting a roster with real win-now pressure.'
    : windowPhase === 'opening'
      ? 'The roster is trending upward and ready for smart early-season choices.'
      : windowPhase === 'closing'
        ? 'There is still talent here, but the margin for error is getting thinner.'
        : 'This franchise needs structure, patience, and a clean long-term plan.';
  const capLine = capGrade === 'A' || capGrade === 'B'
    ? 'The cap sheet gives you room to be proactive.'
    : capGrade === 'C'
      ? 'Financially, you can compete, but every move needs to be intentional.'
      : 'Cap pressure will limit how aggressive you can be right away.';
  return `${phaseLine} ${capLine} The roster profile reads ${needs.overall.toLowerCase()}, with ${needs.criticalNeeds.slice(0, 2).join(' and ')} demanding early attention.`;
}

function toPlayerCard(player: Player) {
  return {
    playerId: player.id,
    name: player.name,
    pos: player.pos,
    ovr: player.ovr,
    age: player.age,
  };
}

function toBattleReadyPlayers(team: Team, position: Position, schemeId: string) {
  return getPreferredStarters(team, position).map((player) => ({
    playerId: player.id,
    name: player.name,
    pos: player.pos,
    ovr: player.ovr,
    fitScore: calcSchemeFit(player, schemeId).score,
  }));
}

function staffArchetype(text: string | null | undefined): string {
  return (text ?? '').toLowerCase();
}

function staffExactLeanBonus(team: Team, side: 'off' | 'def', schemeId: string): number {
  const coordinator = side === 'off' ? team.staff.oc : team.staff.dc;
  const lean = side === 'off'
    ? coordinator?.schemeLean?.offense
    : coordinator?.schemeLean?.defense;
  return lean === schemeId ? 6 : 0;
}

function headCoachLeanBonus(team: Team, side: 'off' | 'def', schemeId: string): number {
  const lean = side === 'off'
    ? team.staff.hc?.schemeLean?.offense
    : team.staff.hc?.schemeLean?.defense;
  return lean === schemeId ? 3 : 0;
}

function staffFallbackBonus(team: Team, side: 'off' | 'def', schemeId: string): number {
  const primary = side === 'off' ? team.staff.oc : team.staff.dc;
  const backup = team.staff.hc;
  const primaryArch = staffArchetype(primary?.archetype);
  const headCoachArch = staffArchetype(backup?.archetype);

  const matches = (patterns: readonly string[]) =>
    patterns.some((pattern) => primaryArch.includes(pattern) || headCoachArch.includes(pattern));

  if (side === 'off') {
    if (['spread', 'west_coast', 'air_raid'].includes(schemeId) && matches(['offensive_minded', 'air_attack', 'west_coast'])) {
      return 2;
    }
    if (schemeId === 'power_run' && matches(['disciplinarian'])) {
      return 2;
    }
    if (schemeId === 'balanced' && matches(['balanced', 'strategist'])) {
      return 2;
    }
    return 0;
  }

  if (['cover_2', 'cover_3', 'man_press'].includes(schemeId) && matches(['defensive_minded', 'coverage_specialist'])) {
    return 2;
  }
  if (schemeId === 'man_press' && matches(['aggressive'])) {
    return 2;
  }
  if (['4-3', '3-4'].includes(schemeId) && matches(['disciplinarian'])) {
    return 2;
  }
  if (schemeId === '4-3' && matches(['balanced', 'strategist'])) {
    return 2;
  }
  return 0;
}

function getStaffAlignmentBonus(team: Team, side: 'off' | 'def', schemeId: string): number {
  return staffExactLeanBonus(team, side, schemeId)
    + headCoachLeanBonus(team, side, schemeId)
    + staffFallbackBonus(team, side, schemeId);
}

function evaluateSchemePlayers(team: Team, side: 'off' | 'def', schemeId: string) {
  const pool = team.roster
    .filter((player) => side === 'off' ? isOffensivePosition(player.pos) : isDefensivePosition(player.pos))
    .filter((player) => player.isStarter)
    .sort((left, right) => right.ovr - left.ovr || left.id.localeCompare(right.id));
  const starters = pool.length > 0 ? pool : team.roster.filter((player) =>
    side === 'off' ? isOffensivePosition(player.pos) : isDefensivePosition(player.pos));

  const scored = starters.map((player) => ({
    playerId: player.id,
    name: player.name,
    pos: player.pos,
    ovr: player.ovr,
    fitScore: calcSchemeFit(player, schemeId).score,
  }));

  const sortedHigh = [...scored].sort((left, right) =>
    right.fitScore - left.fitScore || right.ovr - left.ovr || left.playerId.localeCompare(right.playerId));
  const sortedLow = [...scored].sort((left, right) =>
    left.fitScore - right.fitScore || left.ovr - right.ovr || left.playerId.localeCompare(right.playerId));

  return {
    fitScore: Math.round(average(scored.map((entry) => entry.fitScore))),
    bestFitPlayers: sortedHigh.slice(0, 3),
    worstFitPlayers: sortedLow.slice(0, 3),
  };
}

function schemeDescriptionCatalog(side: 'off' | 'def') {
  return side === 'off' ? OFFENSE_SCHEME_CATALOG : DEFENSE_SCHEME_CATALOG;
}

function evaluateSchemeOption(team: Team, side: 'off' | 'def', schemeId: string): SchemeOption {
  const catalog = schemeDescriptionCatalog(side).find((entry) => entry.schemeId === schemeId);
  const nextOffense = side === 'off' ? schemeId : currentOffScheme(team);
  const nextDefense = side === 'def' ? schemeId : currentDefScheme(team);
  const transition = projectSchemeTransition(team, nextOffense, nextDefense);
  const fit = evaluateSchemePlayers(team, side, schemeId);
  const transitionPenalty = side === 'off'
    ? transition.offense.transitionPenalty
    : transition.defense.transitionPenalty;
  const staffAlignmentBonus = getStaffAlignmentBonus(team, side, schemeId);
  const recommendationScore = Math.round(fit.fitScore - transitionPenalty + staffAlignmentBonus);

  return {
    schemeId,
    label: catalog?.label ?? schemeId,
    description: catalog?.description ?? schemeId,
    fitScore: fit.fitScore,
    transitionPenalty,
    staffAlignmentBonus,
    bestFitPlayers: fit.bestFitPlayers,
    worstFitPlayers: fit.worstFitPlayers,
    staffAligned: staffAlignmentBonus > 0,
    recommendationScore,
    recommended: false,
  };
}

function markRecommended(options: SchemeOption[]): SchemeOption[] {
  return options
    .sort((left, right) =>
      right.recommendationScore - left.recommendationScore
      || right.fitScore - left.fitScore
      || left.schemeId.localeCompare(right.schemeId))
    .map((option, index) => ({
      ...option,
      recommended: index === 0,
    }));
}

function emptyRecommendationRecord(): Record<Position, string[]> {
  return {
    QB: [],
    RB: [],
    WR: [],
    TE: [],
    OL: [],
    DL: [],
    LB: [],
    CB: [],
    S: [],
    K: [],
    P: [],
  };
}

function applySchemeToTeam(team: Team, offenseScheme: string, defenseScheme: string): Team {
  return {
    ...team,
    schemeOff: offenseScheme,
    offScheme: offenseScheme,
    schemeDef: defenseScheme,
    defScheme: defenseScheme,
  };
}

function buildCoachingPhilosophy(team: Team): string {
  const archetype = staffArchetype(team.staff.hc?.archetype);
  if (archetype.includes('offensive')) {
    return 'The head coach leans into offensive answers, tempo, and quarterback-driven control.';
  }
  if (archetype.includes('defensive')) {
    return 'The head coach wants the defense to set the tone and force the game onto your terms.';
  }
  if (archetype.includes('disciplinarian')) {
    return 'This staff values physicality, detail, and low-error football over flash.';
  }
  if (archetype.includes('motivator')) {
    return 'Energy, momentum, and locker-room buy-in are central to how this staff operates.';
  }
  if (archetype.includes('strategist')) {
    return 'This staff wins with game-plan detail, matchup answers, and situational control.';
  }
  return 'The staff profile is balanced, with no single ideological lane dominating the plan.';
}

function bestStaffScheme(team: Team, side: 'off' | 'def') {
  const evaluated = schemeDescriptionCatalog(side)
    .map((entry) => ({
      entry,
      score: getStaffAlignmentBonus(team, side, entry.schemeId),
    }))
    .sort((left, right) =>
      right.score - left.score
      || left.entry.label.localeCompare(right.entry.label))[0];

  return evaluated ?? {
    entry: schemeDescriptionCatalog(side)[0]!,
    score: 0,
  };
}

function safeStaffMember(member: Team['staff']['oc'] | Team['staff']['dc'], role: 'OC' | 'DC') {
  if (!member) {
    return {
      role,
      name: `${role} Vacancy`,
      archetype: 'vacant',
      specialty: null,
      ratings: {},
      level: 0,
      vacant: true,
    };
  }

  return {
    role,
    name: member.name,
    archetype: member.archetype,
    specialty: member.specialty75?.label ?? null,
    ratings: member.ratings,
    level: member.level,
    vacant: false,
  };
}

function playerCapHit(player: Player): number {
  return player.contract ? round(v36CapHit(player.contract)) : 0;
}

function buildCapNarrative(grade: CapStrategyBriefing['capGrade'], capSpace: number, recommendations: string[]): string {
  if (grade === 'A' || grade === 'B') {
    return `You have room to be aggressive. With $${round(capSpace)}M in space, the cap sheet supports proactive moves and extension planning. ${recommendations[0] ?? ''}`.trim();
  }
  if (grade === 'C') {
    return `The cap is manageable, but not forgiving. You can make moves, though each one needs to solve a specific problem. ${recommendations[0] ?? ''}`.trim();
  }
  return `You need to create breathing room before chasing upside. The current cap profile will punish unnecessary spending. ${recommendations[0] ?? ''}`.trim();
}

function goalDifficulty(goalId: string, team: Team): GoalOption['difficulty'] {
  switch (goalId) {
    case 'win_division':
      return team.wins >= 10 ? 'easy' : team.wins >= 8 ? 'moderate' : 'hard';
    case 'playoff_berth':
      return team.wins >= 9 ? 'easy' : team.wins >= 7 ? 'moderate' : 'hard';
    case 'winning_record':
      return team.wins > team.losses ? 'easy' : team.wins === team.losses ? 'moderate' : 'hard';
    case 'rebuild_progress': {
      const count = team.roster.filter((player) => player.age <= 25 && player.ovr >= 70).length;
      return count >= 5 ? 'easy' : count >= 3 ? 'moderate' : 'hard';
    }
    case 'cap_health':
      return team.capSpace >= 20 ? 'easy' : team.capSpace >= 10 ? 'moderate' : 'hard';
    case 'star_power': {
      const stars = team.roster.filter((player) => player.ovr >= 85).length;
      return stars >= 3 ? 'easy' : stars >= 2 ? 'moderate' : 'hard';
    }
    case 'no_losing_streak':
      return (team.streak ?? 0) >= -2 ? 'easy' : (team.streak ?? 0) === -3 ? 'moderate' : 'hard';
    case 'draft_well': {
      const contributors = team.roster.filter((player) => player.yearsExp <= 2 && player.ovr >= 68).length;
      return contributors >= 3 ? 'easy' : contributors >= 2 ? 'moderate' : 'hard';
    }
    case 'championship':
      return team.wins >= 13 ? 'easy' : team.wins >= 11 ? 'moderate' : 'hard';
    default:
      return 'moderate';
  }
}

function goalReason(goalId: string, team: Team, phase: WindowPhase, ownerType: OwnerType): string {
  if (goalId === 'championship') {
    return phase === 'peaking'
      ? 'Your peaking window says the roster should be thinking bigger than simply making the tournament.'
      : 'This is ambitious, but it gives a win-now roster a clear north star.';
  }
  if (goalId === 'rebuild_progress') {
    return ownerType === 'patient'
      ? 'A patient ownership profile will reward visible development even before the standings fully flip.'
      : 'This goal keeps long-term talent growth visible inside a transitional season.';
  }
  if (goalId === 'cap_health') {
    return team.capSpace >= 15
      ? 'You have the flexibility to protect your future if you stay disciplined.'
      : 'Your current cap picture makes financial discipline part of the season mission.';
  }
  if (goalId === 'star_power') {
    return 'This roster already has centerpiece talent, so building around those names fits the season story.';
  }
  if (goalId === 'draft_well') {
    return 'Even a competitive roster needs young contributors to keep the pipeline moving.';
  }
  if (goalId === 'win_division') {
    return 'The division title is a clean benchmark that matches a contender-minded setup.';
  }
  if (goalId === 'playoff_berth') {
    return 'This goal balances ambition with realism and gives an emerging team a tangible target.';
  }
  if (goalId === 'winning_record') {
    return 'A winning season is the clearest proof that the foundation is moving in the right direction.';
  }
  return 'This goal fits the roster context without forcing unrealistic expectations.';
}

function ownerExpectationsNarrative(team: Team, ownerType: OwnerType, phase: WindowPhase): string {
  if (ownerType === 'win_now') {
    return phase === 'peaking'
      ? 'Ownership expects immediate contention and will judge this setup by how fast it turns into wins.'
      : 'Ownership still wants visible traction quickly, even if the roster needs shaping first.';
  }
  if (ownerType === 'penny') {
    return 'Ownership values discipline and efficiency. Results matter, but so does how responsibly you build them.';
  }
  return phase === 'rebuilding'
    ? 'Ownership can live with patience as long as the roster gets younger, cleaner, and more sustainable.'
    : 'Ownership is willing to stay patient if the team keeps trending the right way.';
}

function setupGoalScores(team: Team, phase: WindowPhase, ownerType: OwnerType): Record<string, number> {
  const scores: Record<string, number> = {};
  const phaseBoosts = GOAL_RECOMMENDATION_BASE[phase];
  const ownerBoosts = OWNER_TYPE_BOOSTS[ownerType];

  for (const goal of OWNER_GOALS) {
    let score = 0;
    const phaseIndex = phaseBoosts.indexOf(goal.id);
    const ownerIndex = ownerBoosts.indexOf(goal.id);
    if (phaseIndex >= 0) score += 30 - phaseIndex * 5;
    if (ownerIndex >= 0) score += 18 - ownerIndex * 4;
    if (goalDifficulty(goal.id, team) === 'easy') score += 8;
    if (goal.id === 'star_power' && team.roster.some((player) => player.ovr >= 90)) score += 3;
    if (goal.id === 'cap_health' && team.capSpace < 10) score += 4;
    scores[goal.id] = score;
  }

  return scores;
}

function goalEntry(goalId: string) {
  const goal = OWNER_GOALS.find((entry) => entry.id === goalId);
  if (!goal) {
    throw new Error(`Unknown setup goal ${goalId}.`);
  }
  return goal;
}

function phaseIndex(phase: SetupPhase): number {
  return PHASE_ORDER.indexOf(phase);
}

function nextPhase(phase: SetupPhase): SetupPhase {
  const index = phaseIndex(phase);
  return PHASE_ORDER[Math.min(index + 1, PHASE_ORDER.length - 1)]!;
}

function trimCompletedPhases(state: SetupState, invalidatedPhase: SetupPhase | null): SetupState {
  if (!invalidatedPhase) return state;
  const invalidatedIndex = phaseIndex(invalidatedPhase);
  const invalidatedStillComplete = isPhaseComplete(state, invalidatedPhase);
  const completedPhases = state.completedPhases.filter((phase) => {
    const index = phaseIndex(phase);
    if (index < invalidatedIndex) return true;
    if (index > invalidatedIndex) return false;
    return invalidatedStillComplete;
  });

  const currentPhase = phaseIndex(state.currentPhase) <= invalidatedIndex
    ? state.currentPhase
    : invalidatedStillComplete
      ? nextPhase(invalidatedPhase)
      : invalidatedPhase;

  return {
    ...state,
    currentPhase,
    completedPhases,
    blueprint: null,
  };
}

function shallowEqualStringArrays(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((entry, index) => entry === right[index]);
}

function shallowEqualOverrides(left: Record<string, string[]>, right: Record<string, string[]>): boolean {
  const keys = uniqueStrings([...Object.keys(left), ...Object.keys(right)]).sort((a, b) => a.localeCompare(b));
  return keys.every((key) => shallowEqualStringArrays(left[key] ?? [], right[key] ?? []));
}

function applyStarterSelections(
  team: Team,
  autoRecommendation: Record<Position, string[]>,
  overrides: Record<string, string[]>,
): void {
  for (const position of POSITION_ORDER) {
    const room = team.roster.filter((player) => player.pos === position);
    if (room.length === 0) continue;

    const fallback = autoRecommendation[position] ?? [];
    const candidateIds = uniqueStrings([...(overrides[position] ?? []), ...fallback]);
    const starterIds = new Set(candidateIds.slice(0, Math.min(getStarterCount(position), room.length)));

    for (const player of room) {
      player.isStarter = starterIds.has(player.id);
    }
  }
}

function updatePlayersMirror(game: GameState, team: Team): void {
  for (const player of team.roster) {
    game.players[player.id] = player;
  }
}

function capPosture(briefing: CapStrategyBriefing): string {
  if (briefing.capGrade === 'A' || briefing.capGrade === 'B') return 'flush';
  if (briefing.capGrade === 'C') return 'tight';
  return 'dire';
}

function blueprintNarrative(
  game: GameState,
  team: Team,
  intel: FranchiseIntelBriefing,
  roster: RosterOverview,
  cap: CapStrategyBriefing,
  selectedOffenseLabel: string,
  selectedDefenseLabel: string,
  goalLabels: string[],
): string {
  const window = calculateDynastyWindow(team, game.year, team.draftPicks.length || undefined);
  const topPlayer = roster.starPlayers[0]
    ?? roster.weakestStarters.sort((left, right) => right.ovr - left.ovr)[0]
    ?? toPlayerCard(team.roster.sort((left, right) => right.ovr - left.ovr)[0]!);
  const capState = capPosture(cap);

  if (window.phase === 'peaking') {
    return `The ${game.year} ${team.city} ${team.name} are built to win now. ${topPlayer.name} leads a ${selectedOffenseLabel} attack while the ${selectedDefenseLabel} defense keeps this roster on a championship track. Cap posture is ${capState}, so this is a year to press your edge, not waste it. The mission is simple: ${goalLabels.join(', ')}.`;
  }
  if (window.phase === 'rebuilding') {
    const rising = roster.risingStars[0]?.playerName ?? topPlayer.name;
    return `The ${game.year} ${team.city} ${team.name} are laying a foundation instead of chasing noise. The ${selectedOffenseLabel} offense can grow around ${rising}, while the ${selectedDefenseLabel} defense establishes a repeatable identity. Cap posture is ${capState}, which makes patience and discipline part of the plan. This season is about ${goalLabels.join(', ')}.`;
  }
  if (window.phase === 'opening') {
    return `The ${game.year} ${team.city} ${team.name} are on the rise. A ${window.trend} trajectory plus ${roster.risingStars.length} breakout candidate${roster.risingStars.length === 1 ? '' : 's'} says something real is building. The ${selectedOffenseLabel} offense and ${selectedDefenseLabel} defense fit the roster well enough to push forward immediately. With a ${capState} cap picture, the focus is ${goalLabels.join(', ')}.`;
  }
  return `The ${game.year} ${team.city} ${team.name} are working inside a narrowing window. ${topPlayer.name} still gives this team a center of gravity, but every choice now carries more weight than it did a year ago. The ${selectedOffenseLabel} offense and ${selectedDefenseLabel} defense give you a coherent identity, even with a ${capState} cap posture. Make it count through ${goalLabels.join(', ')}.`;
}

/**
 * Build the opening team situation report for setup phase one.
 */
export function generateIntelBriefing(game: GameState, teamId: string): FranchiseIntelBriefing {
  const team = getTeam(game, teamId);
  const dynasty = calculateDynastyWindow(team, game.year, team.draftPicks.length || undefined);
  const capHealth = getCapHealth(team, game);
  const leagueAverage = buildLeagueAverageByGroup(Object.values(game.teams));
  const needs = analyzeTeamNeeds(team, leagueAverage);
  const rankings = getTeamRankings(game);

  return {
    windowPhase: dynasty.phase,
    windowScore: dynasty.score,
    capGrade: capHealth.grade,
    capSpace: round(team.capSpace),
    rosterOverall: averageStarterOvr(team),
    leagueRank: getLeagueRank(rankings, teamId),
    criticalNeeds: needs.criticalNeeds.slice(0, 3),
    strengths: needs.strengths.slice(0, 3),
    overallAssessment: buildIntelNarrative(dynasty.phase, capHealth.grade, needs),
  };
}

/**
 * Build a player-facing roster summary for setup phase two.
 */
export function generateRosterOverview(game: GameState, teamId: string): RosterOverview {
  const team = getTeam(game, teamId);
  const starters = getRosterStarters(team);

  return {
    starPlayers: [...team.roster]
      .filter((player) => player.ovr >= 85)
      .sort((left, right) => right.ovr - left.ovr || left.id.localeCompare(right.id))
      .slice(0, 5)
      .map((player) => toPlayerCard(player)),
    risingStars: identifyBreakoutCandidates(game, teamId),
    positionBattles: detectPositionBattles(team.roster),
    weakestStarters: [...starters]
      .sort((left, right) => left.ovr - right.ovr || left.id.localeCompare(right.id))
      .slice(0, 3)
      .map((player) => toPlayerCard(player)),
    rosterSize: team.roster.length,
    injuredPlayers: team.roster
      .filter((player) => (player.injury?.gamesOut ?? 0) > 0)
      .sort((left, right) => (right.injury?.gamesOut ?? 0) - (left.injury?.gamesOut ?? 0))
      .map((player) => ({
        playerId: player.id,
        name: player.name,
        pos: player.pos,
        gamesOut: player.injury?.gamesOut ?? 0,
        severity: player.injury?.severity ?? 'out',
      })),
  };
}

/**
 * Build the coaching review payload for setup phase three.
 */
export function generateCoachingReview(game: GameState, teamId: string): CoachingStaffReview {
  const team = getTeam(game, teamId);
  const bestOffense = bestStaffScheme(team, 'off').entry;
  const bestDefense = bestStaffScheme(team, 'def').entry;

  return {
    headCoach: {
      name: team.staff.hc?.name ?? 'HC Vacancy',
      archetype: team.staff.hc?.archetype ?? 'vacant',
      ratings: team.staff.hc?.ratings ?? {},
      level: team.staff.hc?.level ?? 0,
      vacant: !team.staff.hc,
    },
    coordinators: [
      safeStaffMember(team.staff.oc, 'OC'),
      safeStaffMember(team.staff.dc, 'DC'),
    ],
    coachingPhilosophy: buildCoachingPhilosophy(team),
    schemeRecommendation: {
      offenseSchemeId: bestOffense.schemeId,
      offenseLabel: bestOffense.label,
      defenseSchemeId: bestDefense.schemeId,
      defenseLabel: bestDefense.label,
      reasoning: `Staff lean points toward ${bestOffense.label} on offense and ${bestDefense.label} on defense based on coordinator preferences and archetype overlap.`,
    },
  };
}

/**
 * Build scheme options for setup phase four.
 */
export function generateSchemeContext(game: GameState, teamId: string): SchemeSelectionContext {
  const team = getTeam(game, teamId);

  return {
    currentOffScheme: currentOffScheme(team),
    currentDefScheme: currentDefScheme(team),
    offenseOptions: markRecommended(OFFENSE_SCHEME_CATALOG.map((entry) =>
      evaluateSchemeOption(team, 'off', entry.schemeId))),
    defenseOptions: markRecommended(DEFENSE_SCHEME_CATALOG.map((entry) =>
      evaluateSchemeOption(team, 'def', entry.schemeId))),
  };
}

/**
 * Build lineup and position-room context for setup phase five.
 */
export function generateDepthChartContext(
  game: GameState,
  teamId: string,
  selectedSchemes?: { off: string; def: string },
): DepthChartContext {
  const team = getTeam(game, teamId);
  const selectedOffenseScheme = selectedSchemes?.off ?? currentOffScheme(team);
  const selectedDefenseScheme = selectedSchemes?.def ?? currentDefScheme(team);
  const schemeTeam = applySchemeToTeam(team, selectedOffenseScheme, selectedDefenseScheme);
  const autoSetRecommendation = emptyRecommendationRecord();

  const positionGroups = POSITION_ORDER
    .map((position) => {
      const room = getPlayersAtPosition(schemeTeam, position);
      if (room.length === 0) return null;

      const sorted = [...room].sort((left, right) => {
        const leftFit = calcSchemeFit(
          left,
          isOffensivePosition(position) ? selectedOffenseScheme : isDefensivePosition(position) ? selectedDefenseScheme : selectedOffenseScheme,
        ).score;
        const rightFit = calcSchemeFit(
          right,
          isOffensivePosition(position) ? selectedOffenseScheme : isDefensivePosition(position) ? selectedDefenseScheme : selectedOffenseScheme,
        ).score;
        const leftComposite = leftFit * 0.6 + left.ovr * 0.4;
        const rightComposite = rightFit * 0.6 + right.ovr * 0.4;
        return Number(right.isStarter) - Number(left.isStarter)
          || rightComposite - leftComposite
          || right.ovr - left.ovr
          || left.id.localeCompare(right.id);
      });

      const healthy = getHealthyPlayers(sorted);
      const recommendationPool = healthy.length > 0 ? healthy : sorted;
      autoSetRecommendation[position] = recommendationPool
        .slice(0, Math.min(getStarterCount(position), recommendationPool.length))
        .map((player) => player.id);

      return {
        position,
        players: sorted.map((player) => ({
          playerId: player.id,
          name: player.name,
          ovr: player.ovr,
          age: player.age,
          contractCapHit: playerCapHit(player),
          isStarter: player.isStarter,
          fitScore: calcSchemeFit(
            player,
            isOffensivePosition(position) ? selectedOffenseScheme : isDefensivePosition(position) ? selectedDefenseScheme : selectedOffenseScheme,
          ).score,
        })),
      };
    })
    .filter((group): group is NonNullable<typeof group> => Boolean(group));

  return {
    selectedOffenseScheme,
    selectedDefenseScheme,
    positionGroups,
    activeBattles: detectPositionBattles(schemeTeam.roster).filter((battle) =>
      battle.battleType === 'starter_boundary' || battle.battleType === 'starter_competition'),
    autoSetRecommendation,
  };
}

/**
 * Build cap guidance for setup phase six.
 */
export function generateCapBriefing(game: GameState, teamId: string): CapStrategyBriefing {
  const team = getTeam(game, teamId);
  const capVisualization = buildCapVisualization(team, game.year);
  const capHealth = getCapHealth(team, game);
  const candidates = identifyCapCandidates(team);

  return {
    capGrade: capHealth.grade,
    capSpace: round(team.capSpace),
    deadCap: round(capVisualization?.deadCap ?? team.deadCap),
    biggestContracts: (capVisualization?.topHits ?? []).slice(0, 5),
    expiringDeals: team.roster
      .filter((player) => player.contract?.years === 1)
      .sort((left, right) => playerCapHit(right) - playerCapHit(left) || left.id.localeCompare(right.id))
      .map((player) => ({
        playerId: player.id,
        name: player.name,
        pos: player.pos,
        ovr: player.ovr,
        capHit: playerCapHit(player),
      })),
    restructureCandidates: candidates
      .filter((candidate) => candidate.recommendation === 'restructure')
      .sort((left, right) => right.restructureSavings - left.restructureSavings || left.playerId.localeCompare(right.playerId))
      .slice(0, 3)
      .map((candidate) => ({
        playerId: candidate.playerId,
        playerName: candidate.playerName,
        pos: candidate.pos,
        restructureSavings: candidate.restructureSavings,
        recommendation: candidate.recommendation,
      })),
    cutCandidates: candidates
      .filter((candidate) => candidate.savingsIfCut > 0)
      .sort((left, right) => right.savingsIfCut - left.savingsIfCut || left.playerId.localeCompare(right.playerId))
      .slice(0, 3)
      .map((candidate) => ({
        playerId: candidate.playerId,
        playerName: candidate.playerName,
        pos: candidate.pos,
        savingsIfCut: candidate.savingsIfCut,
        recommendation: candidate.recommendation,
      })),
    capOutlook: buildCapNarrative(capHealth.grade, team.capSpace, capHealth.recommendations),
  };
}

/**
 * Build owner-goal recommendations for setup phase seven.
 */
export function generateGoalContext(game: GameState, teamId: string): GoalSelectionContext {
  const team = getTeam(game, teamId);
  const window = calculateDynastyWindow(team, game.year, team.draftPicks.length || undefined);
  const ownerType = getOwnerType(team);
  const scores = setupGoalScores(team, window.phase, ownerType);
  const recommendedIds = [...OWNER_GOALS]
    .sort((left, right) =>
      (scores[right.id] ?? 0) - (scores[left.id] ?? 0)
      || left.label.localeCompare(right.label))
    .slice(0, 3)
    .map((goal) => goal.id);

  const availableGoals = OWNER_GOALS.map((goal) => ({
    id: goal.id,
    label: goal.label,
    description: goal.desc,
    recommended: recommendedIds.includes(goal.id),
    difficulty: goalDifficulty(goal.id, team),
    reason: goalReason(goal.id, team, window.phase, ownerType),
  }));

  return {
    ownerType,
    ownerExpectations: ownerExpectationsNarrative(team, ownerType, window.phase),
    availableGoals,
    recommendedGoals: recommendedIds.map((goalId) => availableGoals.find((goal) => goal.id === goalId)!).filter(Boolean),
  };
}

/**
 * Build the final franchise blueprint for setup phase eight.
 */
export function generateBlueprint(
  game: GameState,
  teamId: string,
  decisions: SetupDecisions,
): FranchiseBlueprint {
  if (!decisions.offenseScheme || !decisions.defenseScheme) {
    throw new Error('Cannot build franchise blueprint without selected schemes.');
  }
  if (uniqueStrings(decisions.seasonGoals).length !== 3) {
    throw new Error('Cannot build franchise blueprint without exactly three season goals.');
  }

  const team = getTeam(game, teamId);
  const intel = generateIntelBriefing(game, teamId);
  const roster = generateRosterOverview(game, teamId);
  const cap = generateCapBriefing(game, teamId);
  const goalEntries = decisions.seasonGoals.map((goalId) => goalEntry(goalId));
  const offense = OFFENSE_SCHEME_CATALOG.find((entry) => entry.schemeId === decisions.offenseScheme);
  const defense = DEFENSE_SCHEME_CATALOG.find((entry) => entry.schemeId === decisions.defenseScheme);
  const needs = analyzeTeamNeeds(team, buildLeagueAverageByGroup(Object.values(game.teams)));
  const window = calculateDynastyWindow(team, game.year, team.draftPicks.length || undefined);
  const keyPlayers = uniqueStrings([
    ...roster.starPlayers.map((player) => player.playerId),
    ...roster.risingStars.map((player) => player.playerId),
    ...team.roster
      .sort((left, right) => right.ovr - left.ovr || left.id.localeCompare(right.id))
      .slice(0, 5)
      .map((player) => player.id),
  ])
    .map((playerId) => team.roster.find((player) => player.id === playerId))
    .filter((player): player is Player => Boolean(player))
    .slice(0, 5)
    .map((player) => ({
      playerId: player.id,
      name: player.name,
      pos: player.pos,
      ovr: player.ovr,
    }));

  const goalLabels = goalEntries.map((goal) => goal.label);

  return {
    teamName: `${team.city} ${team.name}`,
    year: game.year,
    difficulty: game.difficulty,
    windowPhase: intel.windowPhase,
    windowTrend: window.trend,
    selectedSchemes: {
      offenseSchemeId: decisions.offenseScheme,
      offenseLabel: offense?.label ?? decisions.offenseScheme,
      defenseSchemeId: decisions.defenseScheme,
      defenseLabel: defense?.label ?? decisions.defenseScheme,
    },
    seasonGoals: goalEntries.map((goal) => ({
      id: goal.id,
      label: goal.label,
      description: goal.desc,
    })),
    criticalNeeds: intel.criticalNeeds,
    keyPlayers,
    rosterStrength: needs.overall,
    capOutlook: cap.capOutlook,
    blueprintNarrative: blueprintNarrative(
      game,
      team,
      intel,
      roster,
      cap,
      offense?.label ?? decisions.offenseScheme,
      defense?.label ?? decisions.defenseScheme,
      goalLabels,
    ),
  };
}

/**
 * Create a blank setup state at the start of the flow.
 */
export function createSetupState(): SetupState {
  return {
    currentPhase: 'intel_briefing',
    completedPhases: [],
    decisions: {
      offenseScheme: null,
      defenseScheme: null,
      seasonGoals: [],
      depthChartOverrides: {},
      acknowledged: [],
    },
    blueprint: null,
  };
}

/**
 * Describe which decisions are required to leave a given phase.
 */
export function getPhaseRequirements(phase: SetupPhase): { requiresDecision: boolean; decisionFields: string[] } {
  switch (phase) {
    case 'set_scheme':
      return { requiresDecision: true, decisionFields: ['offenseScheme', 'defenseScheme'] };
    case 'set_goals':
      return { requiresDecision: true, decisionFields: ['seasonGoals'] };
    case 'intel_briefing':
    case 'meet_roster':
    case 'coaching_review':
    case 'depth_chart':
    case 'cap_strategy':
    case 'blueprint':
    default:
      return { requiresDecision: false, decisionFields: ['acknowledged'] };
  }
}

/**
 * Return whether a phase has enough information to move past it.
 */
export function isPhaseComplete(state: SetupState, phase: SetupPhase): boolean {
  switch (phase) {
    case 'set_scheme':
      return Boolean(state.decisions.offenseScheme && state.decisions.defenseScheme);
    case 'set_goals':
      return uniqueStrings(state.decisions.seasonGoals).length === 3;
    case 'intel_briefing':
    case 'meet_roster':
    case 'coaching_review':
    case 'depth_chart':
    case 'cap_strategy':
    case 'blueprint':
      return state.decisions.acknowledged.includes(phase);
    default:
      return false;
  }
}

/**
 * Advance to the next setup phase once the current phase is complete.
 */
export function advanceSetupPhase(state: SetupState): SetupState {
  if (!isPhaseComplete(state, state.currentPhase)) {
    throw new Error(`Cannot advance setup. Phase ${state.currentPhase} is incomplete.`);
  }

  const completedPhases = normalizePhases([...state.completedPhases, state.currentPhase]);
  const index = phaseIndex(state.currentPhase);

  return {
    ...state,
    completedPhases,
    currentPhase: PHASE_ORDER[Math.min(index + 1, PHASE_ORDER.length - 1)]!,
  };
}

/**
 * Step back one phase without mutating recorded decisions.
 */
export function goBackSetupPhase(state: SetupState): SetupState {
  const index = phaseIndex(state.currentPhase);
  return {
    ...state,
    currentPhase: PHASE_ORDER[Math.max(index - 1, 0)]!,
  };
}

/**
 * Merge user decisions into setup state and invalidate downstream phases when needed.
 */
export function applySetupDecision(state: SetupState, decision: Partial<SetupDecisions>): SetupState {
  const nextState: SetupState = {
    ...state,
    decisions: {
      offenseScheme: decision.offenseScheme !== undefined ? decision.offenseScheme : state.decisions.offenseScheme,
      defenseScheme: decision.defenseScheme !== undefined ? decision.defenseScheme : state.decisions.defenseScheme,
      seasonGoals: decision.seasonGoals !== undefined ? uniqueStrings(decision.seasonGoals) : state.decisions.seasonGoals,
      depthChartOverrides: decision.depthChartOverrides !== undefined ? cloneGame(decision.depthChartOverrides) : state.decisions.depthChartOverrides,
      acknowledged: decision.acknowledged !== undefined ? normalizePhases(decision.acknowledged) : state.decisions.acknowledged,
    },
    blueprint: state.blueprint,
  };

  let invalidatedPhase: SetupPhase | null = null;
  if (
    decision.offenseScheme !== undefined && decision.offenseScheme !== state.decisions.offenseScheme
    || decision.defenseScheme !== undefined && decision.defenseScheme !== state.decisions.defenseScheme
  ) {
    invalidatedPhase = 'set_scheme';
  }
  if (
    !invalidatedPhase &&
    decision.depthChartOverrides !== undefined &&
    !shallowEqualOverrides(decision.depthChartOverrides, state.decisions.depthChartOverrides)
  ) {
    invalidatedPhase = 'depth_chart';
  }
  if (
    !invalidatedPhase &&
    decision.seasonGoals !== undefined &&
    !shallowEqualStringArrays(uniqueStrings(decision.seasonGoals), state.decisions.seasonGoals)
  ) {
    invalidatedPhase = 'set_goals';
  }

  return trimCompletedPhases(nextState, invalidatedPhase);
}

/**
 * Apply setup choices to a cloned game state and persist the finished blueprint.
 */
export function finalizeSetup(game: GameState, teamId: string, state: SetupState): GameState {
  for (const phase of PHASE_ORDER) {
    if (!isPhaseComplete(state, phase)) {
      throw new Error(`Cannot finalize setup. Phase ${phase} is incomplete.`);
    }
  }
  if (!state.decisions.offenseScheme || !state.decisions.defenseScheme) {
    throw new Error('Cannot finalize setup without selected schemes.');
  }

  const nextGame = cloneGame(game);
  const team = getTeam(nextGame, teamId);
  const offenseScheme = state.decisions.offenseScheme;
  const defenseScheme = state.decisions.defenseScheme;

  team.schemeOff = offenseScheme;
  team.offScheme = offenseScheme;
  team.schemeDef = defenseScheme;
  team.defScheme = defenseScheme;

  const depthChart = generateDepthChartContext(nextGame, teamId, {
    off: offenseScheme,
    def: defenseScheme,
  });
  applyStarterSelections(team, depthChart.autoSetRecommendation, state.decisions.depthChartOverrides);
  updatePlayersMirror(nextGame, team);

  const owner = ensureOwnerRecord(nextGame, team);
  const selectedGoals = state.decisions.seasonGoals.map((goalId) => goalEntry(goalId));
  owner.goals = {
    floor: selectedGoals[0]?.label ?? '',
    target: selectedGoals[1]?.label ?? '',
    ceiling: selectedGoals[2]?.label ?? '',
  };

  const blueprint = state.blueprint ?? generateBlueprint(nextGame, teamId, state.decisions);
  nextGame.franchiseBlueprint = blueprint;
  nextGame.setupState = {
    ...state,
    currentPhase: 'blueprint',
    completedPhases: [...PHASE_ORDER],
    blueprint,
  };

  return nextGame;
}
