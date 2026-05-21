import { restructureCascade, v36CapHit } from './contract-helpers';
import { getCapHealth, identifyCapCandidates } from './cap-laboratory';
import { buildCapVisualization } from './cap-visualization';
import { getTeamRankings } from './analytics';
import { identifyBreakoutCandidates } from './development-insights';
import {
  calculateDynastyWindow,
  type WindowPhase,
} from './dynasty-window';
import {
  OWNER_GOALS,
  installOwnerMandates,
  type OwnerType,
} from './owner-goals';
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
import {
  findCoachCandidate,
  findScoutCandidate,
  materializeHeadCoach,
  seedScoutingStaff,
} from './setup-hiring-catalog';
import type {
  GameState,
  Player,
  Position,
  Team,
  TeamNeedsReport,
  TimedEffect,
} from '../types';
export type {
  CoachCandidate,
  ScoutCandidate,
} from './setup-hiring-catalog';

export const PHASE_ORDER = [
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

export interface SetupPhaseMeta {
  id: SetupPhase;
  label: string;
  subtitle: string;
}

export const PHASE_META: readonly SetupPhaseMeta[] = [
  { id: 'choose_agm', label: 'Choose Your AGM', subtitle: 'Hire your right hand' },
  { id: 'intel_briefing', label: 'Franchise Intel', subtitle: "What you're inheriting" },
  { id: 'meet_roster', label: 'Meet the Players', subtitle: 'Your roster at a glance' },
  { id: 'hire_coach', label: 'Hire Your Coach', subtitle: 'Who leads this team?' },
  { id: 'hire_scout', label: 'Build Your Intel', subtitle: 'Who finds the next star?' },
  { id: 'set_scheme', label: 'Set the Identity', subtitle: 'Your offensive and defensive vision' },
  { id: 'depth_chart', label: 'Starting Lineup', subtitle: 'Who takes the field Week 1' },
  { id: 'cap_strategy', label: 'The Money', subtitle: 'Your financial reality' },
  { id: 'set_goals', label: 'Set Your Goals', subtitle: 'What does year one look like?' },
  { id: 'blueprint', label: 'Day 1 Complete', subtitle: 'Your plan is locked in' },
] as const;

/**
 * Mutable decisions captured while the user moves through setup.
 */
export interface SetupDecisions {
  offenseScheme: string | null;
  defenseScheme: string | null;
  seasonGoals: string[];
  depthChartOverrides: Record<string, string[]>;
  acknowledged: SetupPhase[];
  agmProfileId: string | null;
  headCoachId: string | null;
  scoutingDirectorId: string | null;
  depthChartPhilosophy: DepthChartPhilosophy | null;
  capPosture: CapPosture | null;
  cultureMandate: CultureMandate | null;
  agmClosingWords?: string;
}

/**
 * Setup flow progress tracked on game state.
 */
export interface SetupState {
  currentPhase: SetupPhase;
  completedPhases: SetupPhase[];
  decisions: SetupDecisions;
  crisisProfile: TeamCrisisProfile | null;
  forecastBoard: ForecastBoard | null;
  openedDrilldowns: PressureCard['id'][];
  blueprint: FranchiseBlueprint | null;
}

export type DepthChartPhilosophy = 'best_players' | 'veterans_first' | 'youth_bet';
export type CapPosture = 'protect_future' | 'balanced' | 'push_chips';
export type CultureMandate = 'accountability' | 'player_led' | 'development_first';

export interface PressureDrilldown {
  whyItMatters: string;
  riskSource: string;
  bestLever: string;
  seasonOneConsequence: string;
}

export interface PressureCard {
  id: 'roster' | 'cap' | 'culture';
  label: string;
  severity: 'stable' | 'warning' | 'critical';
  score: number;
  diagnosis: string;
  signal: string;
  drilldown: PressureDrilldown;
}

export interface TeamCrisisProfile {
  headline: string;
  ownerPressure: string;
  mediaPressure: string;
  pressureCards: PressureCard[];
  weekOneThreat: string;
  weekOneHope: string;
  weekOneUnknown: string;
}

export interface ForecastCard {
  id: 'week_one_readiness' | 'scheme_cohesion' | 'culture_stability' | 'cap_flexibility' | 'owner_heat';
  label: string;
  value: number;
  delta: number;
  direction: 'up' | 'down' | 'flat';
  detail: string;
}

export interface ForecastBoard {
  weekOneReadiness: number;
  schemeCohesion: number;
  cultureStability: number;
  capFlexibility: number;
  ownerHeat: number;
  summary: string;
  cards: ForecastCard[];
}

export interface CapPackage {
  posture: CapPosture;
  label: string;
  summary: string;
  capSpaceDelta: number;
  deadCapDelta: number;
  rosterImpact: string;
  restructureTargets: string[];
  weekOneDelta: number;
  ownerApprovalDelta: number;
}

export interface WeekOneCliffhanger {
  openerLabel: string;
  threat: string;
  hope: string;
  unknown: string;
}

export interface SetupColdOpen {
  ownerExpectation: string;
  mediaNarrative: string;
  lastSeasonScar: string;
  crisisHeadline: string;
  weekOneThreat: string;
  openerLabel: string;
  topPressureId: PressureCard['id'];
}

type ChoiceForecastSecondaryId = Extract<ForecastCard['id'], 'scheme_cohesion' | 'culture_stability' | 'cap_flexibility' | 'owner_heat'>;

export interface ChoiceForecastPreview {
  weekOneReadinessDelta: number;
  weekOneVolatilityDelta: number;
  summaryLine: string;
  secondaryDelta: {
    id: ChoiceForecastSecondaryId;
    label: string;
    delta: number;
  };
  bonusDelta?: {
    id: 'owner_heat';
    label: string;
    delta: number;
  };
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
  crisisHeadline: string;
  pressureSnapshot: Array<{
    id: PressureCard['id'];
    label: string;
    severity: PressureCard['severity'];
    diagnosis: string;
  }>;
  dayOneBets: string[];
  weekOneCliffhanger: WeekOneCliffhanger;
  agmProfileId?: string;
  agmClosingWords?: string;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
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

function currentStamp(game: Pick<GameState, 'year' | 'week'>): number {
  return game.year * 100 + game.week;
}

function currentOffScheme(team: Team): string {
  return team.schemeOff ?? 'balanced';
}

function currentDefScheme(team: Team): string {
  return team.schemeDef ?? '4-3';
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

function pressureSeverity(score: number): PressureCard['severity'] {
  if (score >= 70) return 'critical';
  if (score >= 45) return 'warning';
  return 'stable';
}

function pressureSignal(severity: PressureCard['severity']): string {
  if (severity === 'critical') return 'High Alert';
  if (severity === 'warning') return 'Watchlist';
  return 'Stable';
}

function cultureSummary(team: Team): string {
  const culture = team.lockerRoom?.culture ?? 'stable';
  const score = team.lockerRoom?.cultureScore ?? 50;
  if (culture === 'elite' || score >= 78) return 'The room already believes it can win ugly games.';
  if (culture === 'strong' || score >= 64) return 'The locker room can absorb pressure if leadership stays consistent.';
  if (culture === 'fragile' || score <= 42) return 'One bad month can split the room if the message is not clear.';
  if (culture === 'toxic' || score <= 28) return 'The room is already unstable, and loose standards will make it worse fast.';
  return 'The room is neither broken nor secure. Early signals will matter.';
}

function goalStress(decisions: SetupDecisions): number {
  const goals = decisions.seasonGoals;
  let score = 0;
  if (goals.includes('championship')) score += 10;
  if (goals.includes('win_division')) score += 8;
  if (goals.includes('star_power')) score += 5;
  if (goals.includes('playoff_berth')) score += 4;
  if (goals.includes('winning_record')) score += 2;
  if (goals.includes('cap_health')) score -= 2;
  if (goals.includes('draft_well')) score -= 1;
  if (goals.includes('rebuild_progress')) score -= 3;
  return score;
}

function teamOpener(game: GameState, teamId: string): { label: string; opponent: Team | null; home: boolean } {
  const weekOne = game.schedule.find((entry) => entry.week === 1) ?? game.schedule[0];
  const opener = weekOne?.games.find((entry) => entry.homeTeamId === teamId || entry.awayTeamId === teamId);
  if (!opener) {
    return { label: 'Week 1 opener', opponent: null, home: true };
  }
  const home = opener.homeTeamId === teamId;
  const opponentId = home ? opener.awayTeamId : opener.homeTeamId;
  const opponent = game.teams[opponentId] ?? null;
  const label = opponent ? `Week 1 ${home ? 'vs' : '@'} ${opponent.city} ${opponent.name}` : 'Week 1 opener';
  return { label, opponent, home };
}

function defaultAgmForPressure(highest: PressureCard['id']): string {
  if (highest === 'cap') return 'marcus_webb';
  if (highest === 'culture') return 'sandra_chen';
  return 'coach_d_hardaway';
}

function defaultCultureMandate(team: Team): CultureMandate {
  const score = team.lockerRoom?.cultureScore ?? 50;
  if (score <= 42) return 'accountability';
  if (score >= 65) return 'player_led';
  return 'development_first';
}

function cardDirection(id: ForecastCard['id'], delta: number): ForecastCard['direction'] {
  if (delta === 0) return 'flat';
  if (id === 'owner_heat') {
    return delta < 0 ? 'up' : 'down';
  }
  return delta > 0 ? 'up' : 'down';
}

function safestCapPosture(team: Team): CapPosture {
  const capHealth = getCapHealth(team, { year: 0 } as GameState);
  if (capHealth.grade === 'D' || capHealth.grade === 'F') return 'balanced';
  if (capHealth.grade === 'A' || capHealth.grade === 'B') return 'protect_future';
  return 'balanced';
}

function philosophyStarterScore(
  player: Player,
  position: Position,
  schemeId: string,
  philosophy: DepthChartPhilosophy | null,
): number {
  const fit = calcSchemeFit(player, schemeId).score;
  const experience = clamp(player.yearsExp * 1.5, 0, 12);
  const youthUpside = clamp((player.pot - player.ovr) * 0.8 + Math.max(0, 26 - player.age) * 0.6, 0, 18);

  if (philosophy === 'veterans_first') {
    return player.ovr * 0.56 + fit * 0.24 + experience + Number(player.isStarter) * 4;
  }
  if (philosophy === 'youth_bet') {
    return player.ovr * 0.4 + fit * 0.28 + youthUpside + Number(player.age <= 25) * 6;
  }
  return player.ovr * 0.62 + fit * 0.28 + Number(player.isStarter) * 2;
}

function topPressureId(profile: TeamCrisisProfile): PressureCard['id'] {
  return [...profile.pressureCards]
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))[0]?.id ?? 'roster';
}

export function getTopPressureCard(profile: TeamCrisisProfile): PressureCard {
  return [...profile.pressureCards]
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))[0]
    ?? {
      id: 'roster',
      label: 'Roster Pressure',
      severity: 'warning',
      score: 50,
      diagnosis: 'The roster still needs a clearer answer.',
      signal: 'WATCH',
      drilldown: {
        whyItMatters: 'Week 1 exposes weak points quickly.',
        riskSource: 'The roster still has unanswered questions.',
        bestLever: 'Use Day 1 to clarify the roster.',
        seasonOneConsequence: 'The wrong Week 1 answers can drag the season early.',
      },
    };
}

function forecastMetricLabel(id: ChoiceForecastSecondaryId): string {
  switch (id) {
    case 'scheme_cohesion':
      return 'Scheme Cohesion';
    case 'culture_stability':
      return 'Culture Stability';
    case 'cap_flexibility':
      return 'Cap Flexibility';
    case 'owner_heat':
    default:
      return 'Owner Heat';
  }
}

function previewSummaryLine(
  override: Partial<SetupDecisions>,
  readinessDelta: number,
  volatilityDelta: number,
): string {
  if (override.capPosture === 'push_chips') {
    return 'Push chips buys room now, raises owner heat later.';
  }
  if (override.capPosture === 'protect_future') {
    return 'Protect future keeps the books calmer, even if the opener stays tighter.';
  }
  if (override.capPosture === 'balanced') {
    return 'Balanced posture keeps the room playable without forcing desperation.';
  }
  if (override.depthChartPhilosophy === 'youth_bet') {
    return 'Youth bet raises ceiling but increases Week 1 error bars.';
  }
  if (override.depthChartPhilosophy === 'veterans_first') {
    return 'Veterans first lowers chaos, even if it costs some upside.';
  }
  if (override.depthChartPhilosophy === 'best_players') {
    return 'Best players puts raw talent on the field and asks the room to catch up.';
  }
  if (override.cultureMandate === 'accountability') {
    return 'Accountability hardens the room quickly and asks everyone to handle it.';
  }
  if (override.cultureMandate === 'player_led') {
    return 'Player-led culture works only if the right veterans own the room immediately.';
  }
  if (override.cultureMandate === 'development_first') {
    return 'Development first buys long-term growth at the cost of short-term calm.';
  }
  if (override.headCoachId !== undefined) {
    return readinessDelta >= 0
      ? 'Coach fit calms the install and gives Week 1 cleaner answers.'
      : 'This coach increases install friction before the opener.';
  }
  if (override.scoutingDirectorId !== undefined) {
    return volatilityDelta <= 0
      ? 'Cleaner scouting intel steadies the building fast.'
      : 'This scouting bet widens uncertainty before it pays off.';
  }
  if (override.offenseScheme !== undefined || override.defenseScheme !== undefined) {
    return volatilityDelta > 0
      ? 'Transition risk shows up immediately if the install outruns the roster.'
      : 'Scheme fit gives the opener cleaner, more repeatable answers.';
  }
  return 'This Day 1 bet shifts the shape of Week 1 immediately.';
}

function latestFranchiseScar(game: GameState, teamId: string): string | null {
  const latestHistory = [...game.franchiseHistory]
    .filter((entry) => entry.teamId === teamId)
    .sort((left, right) => right.year - left.year)[0];
  if (!latestHistory) return null;

  const finish = latestHistory.playoffFinish?.trim();
  if (finish) {
    return `Last season ended at ${latestHistory.record}. ${finish} still hangs over this building.`;
  }

  return `Last season ended at ${latestHistory.record}. This building still feels that finish.`;
}

function currentRecordScar(team: Team, phase: WindowPhase, ownerType: OwnerType): string {
  const gamesPlayed = team.wins + team.losses + team.ties;
  if (gamesPlayed > 0) {
    return `This room is carrying a ${team.wins}-${team.losses}${team.ties > 0 ? `-${team.ties}` : ''} record and an owner approval number of ${Math.round(team.owner.approval)}.`;
  }
  if (phase === 'peaking') {
    return 'The roster says contender, but the margin for a sloppy opening is thin.';
  }
  if (phase === 'rebuilding') {
    return ownerType === 'patient'
      ? 'This is a stalled rebuild until the first month proves the foundation is real.'
      : 'This is a rebuild with less patience than the public story suggests.';
  }
  return 'The building feels like a narrow opening, not a stable long-term runway.';
}

export function generateSetupColdOpen(game: GameState, teamId: string): SetupColdOpen {
  const team = getTeam(game, teamId);
  const window = calculateDynastyWindow(team, game.year, team.draftPicks.length || undefined);
  const ownerType = getOwnerType(team);
  const crisis = generateTeamCrisisProfile(game, teamId);
  const opener = teamOpener(game, teamId);
  const topPressure = getTopPressureCard(crisis);

  return {
    ownerExpectation: ownerExpectationsNarrative(team, ownerType, window.phase),
    mediaNarrative: team.fanConfidence <= 42
      ? 'The market is skeptical and waiting for proof this regime sees the problem clearly.'
      : team.fanConfidence >= 68
        ? 'The market is loud, impatient, and ready to magnify any sign that this team can break through quickly.'
        : 'The market sees upside, but it also sees a team that can wobble if Day 1 misses the real problem.',
    lastSeasonScar: latestFranchiseScar(game, teamId) ?? currentRecordScar(team, window.phase, ownerType),
    crisisHeadline: crisis.headline,
    weekOneThreat: crisis.weekOneThreat,
    openerLabel: opener.label,
    topPressureId: topPressure.id,
  };
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

function selectedCoachLabel(coachId: string): string {
  return findCoachCandidate(coachId)?.name ?? 'your head coach';
}

function selectedScoutLabel(scoutId: string): string {
  return findScoutCandidate(scoutId)?.name ?? 'your scouting director';
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
    ?? [...roster.weakestStarters].sort((left, right) => right.ovr - left.ovr)[0]
    ?? toPlayerCard([...team.roster].sort((left, right) => right.ovr - left.ovr)[0]!);
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
  philosophy: DepthChartPhilosophy | null = null,
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
        const schemeId = isOffensivePosition(position)
          ? selectedOffenseScheme
          : isDefensivePosition(position)
            ? selectedDefenseScheme
            : selectedOffenseScheme;
        const leftFit = calcSchemeFit(left, schemeId).score;
        const rightFit = calcSchemeFit(right, schemeId).score;
        const leftComposite = philosophyStarterScore(left, position, schemeId, philosophy);
        const rightComposite = philosophyStarterScore(right, position, schemeId, philosophy);
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
 * Build the three day-one cap posture packages.
 */
export function generateCapPackages(game: GameState, teamId: string): CapPackage[] {
  const briefing = generateCapBriefing(game, teamId);
  const restructureTargets = briefing.restructureCandidates.map((candidate) => candidate.playerName);
  const totalSavings = round(briefing.restructureCandidates.reduce((sum, candidate) => sum + candidate.restructureSavings, 0));
  const balancedDelta = round(Math.min(totalSavings, Math.max(4, totalSavings * 0.45)));
  const pushDelta = round(Math.min(totalSavings, Math.max(8, totalSavings * 0.85)));

  return [
    {
      posture: 'protect_future',
      label: 'Protect the Future',
      summary: 'Leave the books clean and trust the current roster to answer Week 1 without borrowing from next spring.',
      capSpaceDelta: 0,
      deadCapDelta: 0,
      rosterImpact: 'You keep future flexibility, but the current roster has to solve its own problems now.',
      restructureTargets: [],
      weekOneDelta: 0,
      ownerApprovalDelta: 1,
    },
    {
      posture: 'balanced',
      label: 'Balanced Pressure Release',
      summary: 'Create room with one controlled restructure so the roster can breathe without turning next offseason into a mess.',
      capSpaceDelta: balancedDelta,
      deadCapDelta: 0,
      rosterImpact: 'You buy enough cap room to stabilize the opener without fully mortgaging future flexibility.',
      restructureTargets: restructureTargets.slice(0, Math.min(1, restructureTargets.length)),
      weekOneDelta: 1,
      ownerApprovalDelta: 2,
    },
    {
      posture: 'push_chips',
      label: 'Push the Chips',
      summary: 'Lean into restructures, protect this roster now, and accept that the bill gets louder later.',
      capSpaceDelta: pushDelta,
      deadCapDelta: 0,
      rosterImpact: 'Week 1 gets cleaner, but the cap sheet gets less forgiving the moment the season turns.',
      restructureTargets: restructureTargets.slice(0, Math.min(3, restructureTargets.length)),
      weekOneDelta: 2,
      ownerApprovalDelta: 4,
    },
  ];
}

/**
 * Build the command-center crisis diagnosis for a team.
 */
export function generateTeamCrisisProfile(game: GameState, teamId: string): TeamCrisisProfile {
  const team = getTeam(game, teamId);
  const needs = analyzeTeamNeeds(team, buildLeagueAverageByGroup(Object.values(game.teams)));
  const cap = getCapHealth(team, game);
  const roster = generateRosterOverview(game, teamId);
  const battles = detectPositionBattles(team.roster);
  const tensions = team.lockerRoom?.tensions.filter((entry) => !entry.resolved).length ?? 0;
  const lowMorale = team.roster.filter((player) => player.morale <= 52).length;
  const overpayCount = generateCapBriefing(game, teamId).biggestContracts.filter((contract) => contract.value === 'Overpay').length;

  const rosterPressure = clamp(Math.round(
    56
    - (averageStarterOvr(team) - 74) * 1.7
    + roster.injuredPlayers.length * 6
    + needs.criticalNeeds.length * 7
    + battles.length * 4
    + roster.weakestStarters.length * 3,
  ), 18, 95);
  const capPressure = clamp(Math.round(
    54
    - team.capSpace * 1.2
    + team.deadCap * 0.7
    + overpayCount * 8,
  ), 12, 95);
  const culturePressure = clamp(Math.round(
    58
    - (team.lockerRoom?.cultureScore ?? 50) * 0.6
    - team.owner.approval * 0.08
    - team.fanConfidence * 0.06
    + tensions * 9
    + lowMorale * 1.3,
  ), 10, 95);

  const rosterSeverity = pressureSeverity(rosterPressure);
  const capSeverity = pressureSeverity(capPressure);
  const cultureSeverity = pressureSeverity(culturePressure);
  const worstNeed = needs.criticalNeeds[0] ?? 'depth';
  const topInjury = roster.injuredPlayers[0];
  const capTargets = generateCapBriefing(game, teamId).restructureCandidates;
  const topBattle = battles[0];

  const pressureCards: PressureCard[] = [
    {
      id: 'roster',
      label: 'Roster Pressure',
      severity: rosterSeverity,
      score: rosterPressure,
      signal: pressureSignal(rosterSeverity),
      diagnosis: rosterSeverity === 'critical'
        ? `The lineup is talented enough to compete, but ${worstNeed} can sink the opener fast.`
        : rosterSeverity === 'warning'
          ? `The roster has answers, but ${worstNeed} and Week 1 readiness still need attention.`
          : 'The roster is mostly ready; your biggest job is choosing the right version of it.',
      drilldown: {
        whyItMatters: 'Bad Week 1 lineups turn small structural flaws into obvious losses before the season settles.',
        riskSource: topInjury
          ? `${topInjury.name} is already out for ${topInjury.gamesOut} game(s), and ${worstNeed} is thin behind the starters.`
          : `${worstNeed} is the clearest weak point, and there are ${battles.length} active position battles still unsettled.`,
        bestLever: topBattle
          ? `Use the depth chart to settle ${topBattle.slotLabel} with intent instead of inertia.`
          : 'Pick a depth-chart philosophy that matches the roster instead of defaulting to last year’s hierarchy.',
        seasonOneConsequence: 'If the wrong players take Week 1 reps, your early record can slide before scheme install catches up.',
      },
    },
    {
      id: 'cap',
      label: 'Cap Pressure',
      severity: capSeverity,
      score: capPressure,
      signal: pressureSignal(capSeverity),
      diagnosis: capSeverity === 'critical'
        ? 'The cap sheet is already narrowing your moves, and one aggressive mistake can trap the season.'
        : capSeverity === 'warning'
          ? 'The books are manageable, but only if you decide which pain belongs now versus later.'
          : 'The cap is a tool here, not a crisis, as long as you stay disciplined.',
      drilldown: {
        whyItMatters: 'Your Day 1 cap posture decides whether Week 1 flexibility exists at all.',
        riskSource: cap.recommendations[0] ?? 'There is not much room for waste.',
        bestLever: capTargets[0]
          ? `Choose a cap package that treats ${capTargets[0].playerName} as a lever instead of pretending room will appear on its own.`
          : 'Choose whether to protect the future or buy immediate breathing room.',
        seasonOneConsequence: 'A cap squeeze shows up as slower roster answers, fewer pivots, and less tolerance for injuries.',
      },
    },
    {
      id: 'culture',
      label: 'Culture Pressure',
      severity: cultureSeverity,
      score: culturePressure,
      signal: pressureSignal(cultureSeverity),
      diagnosis: cultureSeverity === 'critical'
        ? 'The room is unstable enough that the wrong message can break trust early.'
        : cultureSeverity === 'warning'
          ? 'The locker room can go either way, and your first mandate will tilt it.'
          : 'The room is stable, but it still needs a clear tone to survive a bad stretch.',
      drilldown: {
        whyItMatters: 'Culture pressure decides whether adversity sharpens the roster or fractures it.',
        riskSource: cultureSummary(team),
        bestLever: 'Pick a culture mandate that tells the room exactly what the first month is going to reward.',
        seasonOneConsequence: 'If the room rejects the first standard you set, the standings feel heavier by October.',
      },
    },
  ];

  const topPressure = [...pressureCards].sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))[0]!;
  const opener = teamOpener(game, teamId);

  return {
    headline: topPressure.id === 'cap'
      ? `${team.city} can compete, but the cap is deciding how bold you get on Day 1.`
      : topPressure.id === 'culture'
        ? `${team.city} has enough talent to matter, but the room can still turn on itself.`
        : `${team.city} can be dangerous fast, but only if the right players and priorities win Day 1.`,
    ownerPressure: team.owner.approval <= 38
      ? 'Ownership is already impatient. They want proof this team looks more coherent immediately.'
      : team.owner.approval >= 68
        ? 'Ownership will support a real plan, but they still expect you to explain the bet.'
        : 'Ownership is watchful. A messy start will make every Day 1 decision louder.',
    mediaPressure: team.fanConfidence <= 42
      ? 'The market is skeptical and waiting for the first sign this regime is different.'
      : team.fanConfidence >= 68
        ? 'The market is energized, which means every bold move gets amplified immediately.'
        : 'The market sees both upside and fragility, so the opener will shape the story fast.',
    pressureCards,
    weekOneThreat: opener.opponent
      ? `${opener.label} becomes dangerous if ${topPressure.label.toLowerCase()} is still unresolved by kickoff.`
      : 'The opener gets dangerous if your biggest Day 1 flaw survives the first week.',
    weekOneHope: opener.opponent
      ? `${opener.label} is winnable if your first hires and scheme choices clarify the roster quickly.`
      : 'The opener is winnable if the first week feels more coherent than the last season did.',
    weekOneUnknown: topPressure.id === 'culture'
      ? 'No spreadsheet knows how this room reacts once the first real punch lands.'
      : topPressure.id === 'cap'
        ? 'You can create room today, but the real question is whether that room buys calm or just delays pain.'
        : 'The biggest unknown is whether your roster choices solve the right problem or just rearrange it.',
  };
}

function forecastMetrics(
  game: GameState,
  teamId: string,
  decisions: SetupDecisions,
): Omit<ForecastBoard, 'summary' | 'cards'> {
  const team = getTeam(game, teamId);
  const coach = decisions.headCoachId ? findCoachCandidate(decisions.headCoachId) : null;
  const scout = decisions.scoutingDirectorId ? findScoutCandidate(decisions.scoutingDirectorId) : null;
  const schemes = generateSchemeContext(game, teamId);
  const capHealth = getCapHealth(team, game);
  const chosenOffense = decisions.offenseScheme ?? schemes.offenseOptions.find((entry) => entry.recommended)?.schemeId ?? currentOffScheme(team);
  const chosenDefense = decisions.defenseScheme ?? schemes.defenseOptions.find((entry) => entry.recommended)?.schemeId ?? currentDefScheme(team);
  const selectedOff = schemes.offenseOptions.find((entry) => entry.schemeId === chosenOffense)
    ?? evaluateSchemeOption(team, 'off', chosenOffense);
  const selectedDef = schemes.defenseOptions.find((entry) => entry.schemeId === chosenDefense)
    ?? evaluateSchemeOption(team, 'def', chosenDefense);
  const packages = generateCapPackages(game, teamId);
  const capPackage = packages.find((entry) => entry.posture === (decisions.capPosture ?? 'balanced')) ?? packages[1]!;
  const cultureScore = team.lockerRoom?.cultureScore ?? 50;
  const pressure = generateTeamCrisisProfile(game, teamId);
  const topPressure = topPressureId(pressure);

  const schemeCohesion = clamp(Math.round(
    42
    + selectedOff.fitScore * 0.22
    + selectedDef.fitScore * 0.22
    + selectedOff.staffAlignmentBonus * 1.1
    + selectedDef.staffAlignmentBonus * 1.1
    - selectedOff.transitionPenalty * 0.9
    - selectedDef.transitionPenalty * 0.9
    + (coach?.archetype === 'strategist' ? 6 : coach?.archetype === 'disciplinarian' ? 3 : 1),
  ), 20, 95);

  const cultureMandate = decisions.cultureMandate ?? defaultCultureMandate(team);
  const cultureBonus = cultureMandate === 'accountability'
    ? (cultureScore <= 55 ? 8 : 4)
    : cultureMandate === 'player_led'
      ? (cultureScore >= 60 ? 9 : -4)
      : team.roster.filter((player) => player.age <= 25).length >= 8 ? 7 : 3;
  const scoutBonus = scout?.specialty === 'blend' ? 3 : scout?.specialty === 'analytics_director' ? 1 : 2;
  const cultureStability = clamp(Math.round(
    cultureScore
    + cultureBonus
    + scoutBonus
    + (coach?.archetype === 'motivator' ? 6 : coach?.archetype === 'disciplinarian' ? 4 : 2)
    - pressure.pressureCards.find((card) => card.id === 'culture')!.score * 0.12,
  ), 18, 95);

  const capFlexibility = clamp(Math.round(
    44
    + team.capSpace * 1.1
    - team.deadCap * 0.3
    + capPackage.capSpaceDelta * 1.2
    - (capPackage.posture === 'push_chips' ? 9 : capPackage.posture === 'balanced' ? 3 : 0)
    + (capHealth.grade === 'A' ? 12 : capHealth.grade === 'B' ? 8 : capHealth.grade === 'C' ? 0 : -8),
  ), 8, 95);

  const ownerHeat = clamp(Math.round(
    100
    - team.owner.approval
    + goalStress(decisions)
    + (capPackage.posture === 'push_chips' ? -4 : capPackage.posture === 'protect_future' ? 2 : -1)
    + (topPressure === 'roster' ? 4 : 0),
  ), 5, 95);

  const depthPhilosophy = decisions.depthChartPhilosophy ?? 'best_players';
  const depthDelta = depthPhilosophy === 'best_players' ? 5 : depthPhilosophy === 'veterans_first' ? 2 : 3;
  const weekOneReadiness = clamp(Math.round(
    28
    + schemeCohesion * 0.32
    + cultureStability * 0.16
    + capPackage.weekOneDelta * 4
    + depthDelta
    + (coach?.archetype === 'strategist' ? 5 : coach?.archetype === 'motivator' ? 4 : 3)
    - pressure.pressureCards.find((card) => card.id === 'roster')!.score * 0.12
    - team.roster.filter((player) => (player.injury?.gamesOut ?? 0) > 0).length * 1.8,
  ), 15, 95);

  return {
    weekOneReadiness,
    schemeCohesion,
    cultureStability,
    capFlexibility,
    ownerHeat,
  };
}

/**
 * Build the live forecast board for the current day-one decisions.
 */
export function generateSetupForecast(game: GameState, teamId: string, decisions: SetupDecisions): ForecastBoard {
  const team = getTeam(game, teamId);
  const crisis = generateTeamCrisisProfile(game, teamId);
  const baselineDecisions: SetupDecisions = {
    offenseScheme: currentOffScheme(team),
    defenseScheme: currentDefScheme(team),
    seasonGoals: ['winning_record', 'draft_well', 'cap_health'],
    depthChartOverrides: {},
    acknowledged: [],
    agmProfileId: defaultAgmForPressure(topPressureId(crisis)),
    headCoachId: 'elias_rowe',
    scoutingDirectorId: 'celia_duarte',
    depthChartPhilosophy: 'best_players',
    capPosture: 'protect_future',
    cultureMandate: defaultCultureMandate(team),
    agmClosingWords: undefined,
  };
  const baseline = forecastMetrics(game, teamId, baselineDecisions);
  const current = forecastMetrics(game, teamId, decisions);
  const deltas = {
    weekOneReadiness: round(current.weekOneReadiness - baseline.weekOneReadiness),
    schemeCohesion: round(current.schemeCohesion - baseline.schemeCohesion),
    cultureStability: round(current.cultureStability - baseline.cultureStability),
    capFlexibility: round(current.capFlexibility - baseline.capFlexibility),
    ownerHeat: round(current.ownerHeat - baseline.ownerHeat),
  };

  const cards: ForecastCard[] = [
    {
      id: 'week_one_readiness',
      label: 'Week 1 Readiness',
      value: current.weekOneReadiness,
      delta: deltas.weekOneReadiness,
      direction: cardDirection('week_one_readiness', deltas.weekOneReadiness),
      detail: current.weekOneReadiness >= 70 ? 'The opening script feels coherent.' : 'The opener is still carrying risk.',
    },
    {
      id: 'scheme_cohesion',
      label: 'Scheme Cohesion',
      value: current.schemeCohesion,
      delta: deltas.schemeCohesion,
      direction: cardDirection('scheme_cohesion', deltas.schemeCohesion),
      detail: current.schemeCohesion >= 65 ? 'Staff fit improved.' : 'Install still needs time.',
    },
    {
      id: 'culture_stability',
      label: 'Culture Stability',
      value: current.cultureStability,
      delta: deltas.cultureStability,
      direction: cardDirection('culture_stability', deltas.cultureStability),
      detail: current.cultureStability >= 62 ? 'The room has a clearer standard.' : 'The room can still wobble under stress.',
    },
    {
      id: 'cap_flexibility',
      label: 'Cap Flexibility',
      value: current.capFlexibility,
      delta: deltas.capFlexibility,
      direction: cardDirection('cap_flexibility', deltas.capFlexibility),
      detail: current.capFlexibility >= 60 ? 'You bought breathing room.' : 'The books are still tight.',
    },
    {
      id: 'owner_heat',
      label: 'Owner Heat',
      value: current.ownerHeat,
      delta: deltas.ownerHeat,
      direction: cardDirection('owner_heat', deltas.ownerHeat),
      detail: current.ownerHeat <= 38 ? 'Ownership likes the direction.' : 'Ownership will demand proof early.',
    },
  ];

  const averageScore = average([
    current.weekOneReadiness,
    current.schemeCohesion,
    current.cultureStability,
    current.capFlexibility,
    100 - current.ownerHeat,
  ]);
  const volatility = crisis.pressureCards.filter((card) => card.severity !== 'stable').length;
  const summary = averageScore >= 72
    ? 'Week 1 looks dangerous in a good way. This team has real bite if the first bet holds.'
    : averageScore >= 58
      ? 'Week 1 is playable, but the room still feels volatile.'
      : volatility >= 2
        ? 'The opener is carrying real pressure. Your Day 1 decisions created a path, not safety.'
        : 'The first month still looks unstable, and the roster will feel every unresolved weakness.';

  return {
    ...current,
    summary,
    cards,
  };
}

export function generateWeekOneVolatility(
  game: GameState,
  teamId: string,
  decisions: SetupDecisions,
): number {
  const team = getTeam(game, teamId);
  const schemes = generateSchemeContext(game, teamId);
  const chosenOffense = decisions.offenseScheme
    ?? (decisions.headCoachId ? findCoachCandidate(decisions.headCoachId)?.schemePreference.offense : null)
    ?? schemes.offenseOptions.find((entry) => entry.recommended)?.schemeId
    ?? currentOffScheme(team);
  const chosenDefense = decisions.defenseScheme
    ?? (decisions.headCoachId ? findCoachCandidate(decisions.headCoachId)?.schemePreference.defense : null)
    ?? schemes.defenseOptions.find((entry) => entry.recommended)?.schemeId
    ?? currentDefScheme(team);
  const selectedOff = schemes.offenseOptions.find((entry) => entry.schemeId === chosenOffense)
    ?? evaluateSchemeOption(team, 'off', chosenOffense);
  const selectedDef = schemes.defenseOptions.find((entry) => entry.schemeId === chosenDefense)
    ?? evaluateSchemeOption(team, 'def', chosenDefense);
  const capPackage = generateCapPackages(game, teamId).find((entry) => entry.posture === (decisions.capPosture ?? 'balanced'))
    ?? generateCapPackages(game, teamId)[1]!;
  const crisis = generateTeamCrisisProfile(game, teamId);
  const culturePressure = crisis.pressureCards.find((card) => card.id === 'culture')?.score ?? 50;
  const activeBattles = detectPositionBattles(team.roster).length;
  const injuredStarters = team.roster.filter((player) => player.isStarter && (player.injury?.gamesOut ?? 0) > 0).length;
  const depthVolatility = decisions.depthChartPhilosophy === 'youth_bet' ? 8 : decisions.depthChartPhilosophy === 'veterans_first' ? -4 : 0;
  const capVolatility = capPackage.posture === 'push_chips' ? 6 : capPackage.posture === 'protect_future' ? -2 : 1;
  const cultureVolatility = decisions.cultureMandate === 'development_first'
    ? 5
    : decisions.cultureMandate === 'player_led'
      ? ((team.lockerRoom?.cultureScore ?? 50) >= 62 ? -3 : 4)
      : 0;

  return clamp(Math.round(
    24
    + (selectedOff.transitionPenalty + selectedDef.transitionPenalty) * 0.9
    + activeBattles * 5
    + injuredStarters * 7
    + culturePressure * 0.14
    + depthVolatility
    + capVolatility
    + cultureVolatility,
  ), 0, 100);
}

function previewStateFromDecisions(decisions: SetupDecisions): SetupState {
  return {
    currentPhase: 'intel_briefing',
    completedPhases: [],
    decisions: cloneGame(decisions),
    crisisProfile: null,
    forecastBoard: null,
    openedDrilldowns: [],
    blueprint: null,
  };
}

export function previewSetupForecastChange(
  game: GameState,
  teamId: string,
  decisions: SetupDecisions,
  override: Partial<SetupDecisions>,
): ChoiceForecastPreview {
  const currentForecast = generateSetupForecast(game, teamId, decisions);
  const currentVolatility = generateWeekOneVolatility(game, teamId, decisions);
  const nextDecisions = applySetupDecision(previewStateFromDecisions(decisions), override).decisions;
  const nextForecast = generateSetupForecast(game, teamId, nextDecisions);
  const nextVolatility = generateWeekOneVolatility(game, teamId, nextDecisions);

  const secondaryId: ChoiceForecastSecondaryId = override.capPosture !== undefined
    ? 'cap_flexibility'
    : override.scoutingDirectorId !== undefined || override.cultureMandate !== undefined
      ? 'culture_stability'
      : override.headCoachId !== undefined || override.offenseScheme !== undefined || override.defenseScheme !== undefined || override.depthChartPhilosophy !== undefined
        ? 'scheme_cohesion'
        : 'owner_heat';

  const secondaryDelta = secondaryId === 'cap_flexibility'
    ? round(nextForecast.capFlexibility - currentForecast.capFlexibility)
    : secondaryId === 'culture_stability'
      ? round(nextForecast.cultureStability - currentForecast.cultureStability)
      : secondaryId === 'scheme_cohesion'
        ? round(nextForecast.schemeCohesion - currentForecast.schemeCohesion)
        : round(nextForecast.ownerHeat - currentForecast.ownerHeat);
  const ownerHeatDelta = round(nextForecast.ownerHeat - currentForecast.ownerHeat);

  return {
    weekOneReadinessDelta: round(nextForecast.weekOneReadiness - currentForecast.weekOneReadiness),
    weekOneVolatilityDelta: round(nextVolatility - currentVolatility),
    summaryLine: previewSummaryLine(
      override,
      round(nextForecast.weekOneReadiness - currentForecast.weekOneReadiness),
      round(nextVolatility - currentVolatility),
    ),
    secondaryDelta: {
      id: secondaryId,
      label: forecastMetricLabel(secondaryId),
      delta: secondaryDelta,
    },
    bonusDelta: override.capPosture === 'push_chips' && ownerHeatDelta !== 0
      ? {
        id: 'owner_heat',
        label: 'Owner Heat',
        delta: ownerHeatDelta,
      }
      : undefined,
  };
}

/**
 * Build the Week 1 cliffhanger shown at the end of Day 1.
 */
export function generateWeekOneCliffhanger(
  game: GameState,
  teamId: string,
  decisions: SetupDecisions,
): WeekOneCliffhanger {
  const crisis = generateTeamCrisisProfile(game, teamId);
  const forecast = generateSetupForecast(game, teamId, decisions);
  const opener = teamOpener(game, teamId);
  const topPressure = crisis.pressureCards.find((card) => card.id === topPressureId(crisis))!;

  const threat = forecast.weekOneReadiness >= 68
    ? `${opener.label} is ready to prove this plan right, but ${topPressure.label.toLowerCase()} can still sabotage the first real test.`
    : `${opener.label} will expose ${topPressure.label.toLowerCase()} immediately if your Day 1 bet was wrong.`;
  const hope = forecast.schemeCohesion >= 65
    ? `Your new identity should show up right away in ${opener.label}, and that gives this team a real puncher's chance.`
    : `There is enough here to survive ${opener.label} if the room buys into the plan before kickoff.`;
  const unknown = forecast.cultureStability >= 60
    ? 'The biggest unknown is whether this group responds to live pressure as well as it responded in the room.'
    : 'The biggest unknown is whether the room trusts this new standard once the opener turns chaotic.';

  return {
    openerLabel: opener.label,
    threat,
    hope,
    unknown,
  };
}

export function toggleSetupDrilldown(state: SetupState, pressureId: PressureCard['id']): SetupState {
  const opened = state.openedDrilldowns.includes(pressureId)
    ? state.openedDrilldowns.filter((entry) => entry !== pressureId)
    : [...state.openedDrilldowns, pressureId];

  return {
    ...state,
    openedDrilldowns: opened,
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
  const crisis = generateTeamCrisisProfile(game, teamId);
  const cliffhanger = generateWeekOneCliffhanger(game, teamId, decisions);
  const capPackage = decisions.capPosture
    ? generateCapPackages(game, teamId).find((entry) => entry.posture === decisions.capPosture) ?? null
    : null;
  const keyPlayers = uniqueStrings([
    ...roster.starPlayers.map((player) => player.playerId),
    ...roster.risingStars.map((player) => player.playerId),
    ...[...team.roster]
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
  const dayOneBets = [
    decisions.headCoachId ? `You hired ${selectedCoachLabel(decisions.headCoachId)} to define the building every day.` : null,
    decisions.scoutingDirectorId ? `You put ${selectedScoutLabel(decisions.scoutingDirectorId)} in charge of what the room believes on talent.` : null,
    `You set the football identity with ${offense?.label ?? decisions.offenseScheme} on offense and ${defense?.label ?? decisions.defenseScheme} on defense.`,
    decisions.depthChartPhilosophy ? `You chose a ${decisions.depthChartPhilosophy.replace('_', ' ')} depth-chart philosophy for the opener.` : null,
    capPackage ? `You chose the ${capPackage.label} cap package for Day 1.` : null,
    decisions.cultureMandate ? `You told the room that ${decisions.cultureMandate.replace('_', ' ')} will define the first month.` : null,
  ].filter((entry): entry is string => Boolean(entry));

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
    crisisHeadline: crisis.headline,
    pressureSnapshot: crisis.pressureCards.map((card) => ({
      id: card.id,
      label: card.label,
      severity: card.severity,
      diagnosis: card.diagnosis,
    })),
    dayOneBets,
    weekOneCliffhanger: cliffhanger,
    agmProfileId: decisions.agmProfileId ?? undefined,
    agmClosingWords: decisions.agmClosingWords,
  };
}

/**
 * Create a blank setup state at the start of the flow.
 */
export function createSetupState(): SetupState {
  return {
    currentPhase: 'choose_agm',
    completedPhases: [],
    decisions: {
      offenseScheme: null,
      defenseScheme: null,
      seasonGoals: [],
      depthChartOverrides: {},
      acknowledged: [],
      agmProfileId: null,
      headCoachId: null,
      scoutingDirectorId: null,
      depthChartPhilosophy: null,
      capPosture: null,
      cultureMandate: null,
      agmClosingWords: undefined,
    },
    crisisProfile: null,
    forecastBoard: null,
    openedDrilldowns: [],
    blueprint: null,
  };
}

/**
 * Preload a shortened setup run for repeat players.
 */
export function createFastLaneSetupState(game: GameState, teamId: string): SetupState {
  const crisis = generateTeamCrisisProfile(game, teamId);
  const team = getTeam(game, teamId);
  const goalContext = generateGoalContext(game, teamId);
  const schemeContext = generateSchemeContext(game, teamId);
  const recommendedOffense = schemeContext.offenseOptions.find((entry) => entry.recommended)?.schemeId ?? currentOffScheme(team);
  const recommendedDefense = schemeContext.defenseOptions.find((entry) => entry.recommended)?.schemeId ?? currentDefScheme(team);
  const recommendedGoals = goalContext.recommendedGoals.slice(0, 3).map((goal) => goal.id);
  const decisions: SetupDecisions = {
    offenseScheme: recommendedOffense,
    defenseScheme: recommendedDefense,
    seasonGoals: recommendedGoals,
    depthChartOverrides: {},
    acknowledged: [],
    agmProfileId: defaultAgmForPressure(topPressureId(crisis)),
    headCoachId: 'elias_rowe',
    scoutingDirectorId: 'celia_duarte',
    depthChartPhilosophy: 'best_players',
    capPosture: 'balanced',
    cultureMandate: defaultCultureMandate(team),
    agmClosingWords: undefined,
  };

  return {
    currentPhase: 'intel_briefing',
    completedPhases: ['choose_agm'],
    decisions,
    crisisProfile: crisis,
    forecastBoard: generateSetupForecast(game, teamId, decisions),
    openedDrilldowns: [],
    blueprint: null,
  };
}

/**
 * Describe which decisions are required to leave a given phase.
 */
export function getPhaseRequirements(phase: SetupPhase): { requiresDecision: boolean; decisionFields: string[] } {
  switch (phase) {
    case 'choose_agm':
      return { requiresDecision: true, decisionFields: ['agmProfileId'] };
    case 'hire_coach':
      return { requiresDecision: true, decisionFields: ['headCoachId'] };
    case 'hire_scout':
      return { requiresDecision: true, decisionFields: ['scoutingDirectorId'] };
    case 'set_scheme':
      return { requiresDecision: true, decisionFields: ['offenseScheme', 'defenseScheme'] };
    case 'depth_chart':
      return { requiresDecision: true, decisionFields: ['depthChartPhilosophy'] };
    case 'cap_strategy':
      return { requiresDecision: true, decisionFields: ['capPosture'] };
    case 'set_goals':
      return { requiresDecision: true, decisionFields: ['seasonGoals', 'cultureMandate'] };
    case 'intel_briefing':
    case 'meet_roster':
    case 'blueprint':
    default:
      return { requiresDecision: false, decisionFields: ['acknowledged'] };
  }
}

/**
 * Return whether a phase has enough information to move past it.
 */
export function isPhaseComplete(
  state: SetupState,
  phase: SetupPhase,
  options?: { requireTopPressureOpened?: boolean },
): boolean {
  switch (phase) {
    case 'choose_agm':
      return state.decisions.agmProfileId !== null;
    case 'hire_coach':
      return state.decisions.headCoachId !== null;
    case 'hire_scout':
      return state.decisions.scoutingDirectorId !== null;
    case 'set_scheme':
      return Boolean(state.decisions.offenseScheme && state.decisions.defenseScheme);
    case 'depth_chart':
      return state.decisions.depthChartPhilosophy !== null;
    case 'cap_strategy':
      return state.decisions.capPosture !== null;
    case 'set_goals':
      return uniqueStrings(state.decisions.seasonGoals).length === 3 && state.decisions.cultureMandate !== null;
    case 'intel_briefing':
      return state.decisions.acknowledged.includes(phase)
        && (!options?.requireTopPressureOpened
          || state.crisisProfile === null
          || state.openedDrilldowns.includes(getTopPressureCard(state.crisisProfile).id));
    case 'meet_roster':
    case 'blueprint':
      return state.decisions.acknowledged.includes(phase);
    default:
      return false;
  }
}

/**
 * Advance to the next setup phase once the current phase is complete.
 */
export function advanceSetupPhase(
  state: SetupState,
  options?: { requireTopPressureOpened?: boolean },
): SetupState {
  if (!isPhaseComplete(state, state.currentPhase, options)) {
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
  const nextHeadCoachId = decision.headCoachId !== undefined ? decision.headCoachId : state.decisions.headCoachId;
  const nextCoachCandidate = nextHeadCoachId ? findCoachCandidate(nextHeadCoachId) : null;
  const nextOffenseScheme = decision.offenseScheme !== undefined
    ? decision.offenseScheme
    : state.decisions.offenseScheme ?? nextCoachCandidate?.schemePreference.offense ?? null;
  const nextDefenseScheme = decision.defenseScheme !== undefined
    ? decision.defenseScheme
    : state.decisions.defenseScheme ?? nextCoachCandidate?.schemePreference.defense ?? null;
  const nextState: SetupState = {
    ...state,
    decisions: {
      offenseScheme: nextOffenseScheme,
      defenseScheme: nextDefenseScheme,
      seasonGoals: decision.seasonGoals !== undefined ? uniqueStrings(decision.seasonGoals) : state.decisions.seasonGoals,
      depthChartOverrides: decision.depthChartOverrides !== undefined ? cloneGame(decision.depthChartOverrides) : state.decisions.depthChartOverrides,
      acknowledged: decision.acknowledged !== undefined ? normalizePhases(decision.acknowledged) : state.decisions.acknowledged,
      agmProfileId: decision.agmProfileId !== undefined ? decision.agmProfileId : state.decisions.agmProfileId,
      headCoachId: nextHeadCoachId,
      scoutingDirectorId: decision.scoutingDirectorId !== undefined ? decision.scoutingDirectorId : state.decisions.scoutingDirectorId,
      depthChartPhilosophy: decision.depthChartPhilosophy !== undefined ? decision.depthChartPhilosophy : state.decisions.depthChartPhilosophy,
      capPosture: decision.capPosture !== undefined ? decision.capPosture : state.decisions.capPosture,
      cultureMandate: decision.cultureMandate !== undefined ? decision.cultureMandate : state.decisions.cultureMandate,
      agmClosingWords: decision.agmClosingWords !== undefined ? decision.agmClosingWords : state.decisions.agmClosingWords,
    },
    blueprint: state.blueprint,
  };

  let invalidatedPhase: SetupPhase | null = null;
  if (
    decision.headCoachId !== undefined
    && decision.headCoachId !== state.decisions.headCoachId
  ) {
    invalidatedPhase = 'hire_scout';
  }
  if (
    !invalidatedPhase
    && decision.scoutingDirectorId !== undefined
    && decision.scoutingDirectorId !== state.decisions.scoutingDirectorId
  ) {
    invalidatedPhase = 'hire_scout';
  }
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
    decision.depthChartPhilosophy !== undefined &&
    decision.depthChartPhilosophy !== state.decisions.depthChartPhilosophy
  ) {
    invalidatedPhase = 'depth_chart';
  }
  if (
    !invalidatedPhase &&
    decision.capPosture !== undefined &&
    decision.capPosture !== state.decisions.capPosture
  ) {
    invalidatedPhase = 'cap_strategy';
  }
  if (
    !invalidatedPhase &&
    decision.seasonGoals !== undefined &&
    !shallowEqualStringArrays(uniqueStrings(decision.seasonGoals), state.decisions.seasonGoals)
  ) {
    invalidatedPhase = 'set_goals';
  }
  if (
    !invalidatedPhase &&
    decision.cultureMandate !== undefined &&
    decision.cultureMandate !== state.decisions.cultureMandate
  ) {
    invalidatedPhase = 'set_goals';
  }

  return trimCompletedPhases(nextState, invalidatedPhase);
}

function applyCapPackageChoice(game: GameState, team: Team, posture: CapPosture | null): CapPackage {
  const packages = generateCapPackages(game, team.id);
  const selected = packages.find((entry) => entry.posture === posture) ?? packages[1]!;
  if (selected.capSpaceDelta > 0) {
    const result = restructureCascade(team, selected.capSpaceDelta);
    team.capSpace = round(team.capSpace + result.totalSaved);
    team.capUsed = round(Math.max(0, team.capUsed - result.totalSaved));
  }
  team.deadCap = round(team.deadCap + selected.deadCapDelta);
  if (selected.ownerApprovalDelta !== 0) {
    team.owner.approval = clamp(team.owner.approval + selected.ownerApprovalDelta, 0, 100);
    team.ownerMood = team.owner.approval;
  }
  return selected;
}

function buildCultureMandateEffect(
  game: GameState,
  team: Team,
  mandate: CultureMandate | null,
): TimedEffect | null {
  if (!mandate) return null;
  const delta = mandate === 'accountability'
    ? 1
    : mandate === 'player_led'
      ? (team.lockerRoom?.cultureScore ?? 50) >= 60 ? 2 : -1
      : team.roster.filter((player) => player.age <= 25).length >= 8 ? 1 : 0;
  if (delta === 0) return null;
  const stamp = currentStamp(game);
  return {
    id: `setup:${team.id}:${mandate}`,
    sourceType: 'off_field_event',
    sourceId: `setup:${mandate}`,
    teamId: team.id,
    targetType: 'team',
    targetId: null,
    stat: 'ovr',
    delta,
    appliesToGame: true,
    startStamp: stamp,
    endStamp: game.year * 100 + 4,
    summary: mandate === 'accountability'
      ? 'Day 1 standards sharpened the building.'
      : mandate === 'player_led'
        ? 'Veteran leadership is carrying the opener.'
      : 'Young-player momentum is lifting the opener.',
  };
}

function appendAgmImpact(
  game: GameState,
  agmProfileId: string,
  category: 'cap' | 'competitive' | 'personnel' | 'mandate',
  summary: string,
): void {
  game.frontOffice.agmImpactLog ??= [];
  game.frontOffice.agmImpactLog = [
    ...game.frontOffice.agmImpactLog,
    {
      id: `setup-agm:${agmProfileId}:${game.year}:${game.week}:${game.frontOffice.agmImpactLog.length}`,
      year: game.year,
      week: game.week,
      agmProfileId,
      category,
      summary,
    },
  ].slice(-20);
}

function applyAgmSetupEffect(game: GameState, team: Team, decisions: SetupDecisions): void {
  const agmProfileId = decisions.agmProfileId;
  if (!agmProfileId) return;

  game.frontOffice.agmProfileId = agmProfileId;
  game.frontOffice.agmImpactLog ??= [];

  if (agmProfileId === 'marcus_webb') {
    const capGoalSelected = decisions.seasonGoals.includes('cap_health');
    if (capGoalSelected || decisions.capPosture === 'protect_future') {
      team.owner.approval = clamp(team.owner.approval + 1, 0, 100);
      team.ownerMood = team.owner.approval;
      if (team.isUser) {
        game.frontOffice.reputation.owner = clamp(game.frontOffice.reputation.owner + 1, 0, 100);
      }
      appendAgmImpact(
        game,
        agmProfileId,
        'cap',
        'Marcus Webb translated the Day 1 cap plan into a small owner-trust edge.',
      );
    }
  }

  if (agmProfileId === 'sandra_chen') {
    const developmentPath = decisions.cultureMandate === 'development_first'
      || decisions.seasonGoals.some((goalId) => goalId === 'rebuild_progress' || goalId === 'draft_well');
    if (developmentPath) {
      for (const player of team.roster) {
        if (player.age > 25 && player.yearsExp > 3) continue;
        player.morale = clamp(player.morale + 2, 0, 100);
        player.chemistry = clamp(player.chemistry + 2, 0, 100);
      }
      appendAgmImpact(
        game,
        agmProfileId,
        'personnel',
        'Sandra Chen gave the young core a visible morale and chemistry lift from the development plan.',
      );
    }
  }
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
  if (!state.decisions.agmProfileId) {
    throw new Error('Cannot finalize setup without a hired assistant GM.');
  }
  if (!state.decisions.headCoachId) {
    throw new Error('Cannot finalize setup without a hired head coach.');
  }
  if (!state.decisions.scoutingDirectorId) {
    throw new Error('Cannot finalize setup without a hired scouting director.');
  }
  if (!state.decisions.depthChartPhilosophy) {
    throw new Error('Cannot finalize setup without a depth chart philosophy.');
  }
  if (!state.decisions.capPosture) {
    throw new Error('Cannot finalize setup without a cap posture.');
  }
  if (!state.decisions.cultureMandate) {
    throw new Error('Cannot finalize setup without a culture mandate.');
  }

  const nextGame = cloneGame(game);
  const team = getTeam(nextGame, teamId);
  const offenseScheme = state.decisions.offenseScheme;
  const defenseScheme = state.decisions.defenseScheme;
  const selectedCoach = findCoachCandidate(state.decisions.headCoachId);
  const selectedScoutDirector = findScoutCandidate(state.decisions.scoutingDirectorId);

  if (!selectedCoach) {
    throw new Error(`Unknown setup head coach ${state.decisions.headCoachId}.`);
  }
  if (!selectedScoutDirector) {
    throw new Error(`Unknown scouting director ${state.decisions.scoutingDirectorId}.`);
  }

  const { staffMember, coachRecord } = materializeHeadCoach(selectedCoach, nextGame.year);
  team.staff.hc = staffMember;
  team.coachingStaff.hc = coachRecord;
  nextGame.scoutingDepartment.scouts = seedScoutingStaff(selectedScoutDirector, team);

  team.schemeOff = offenseScheme;
  team.offScheme = offenseScheme;
  team.schemeDef = defenseScheme;
  team.defScheme = defenseScheme;

  const depthChart = generateDepthChartContext(nextGame, teamId, {
    off: offenseScheme,
    def: defenseScheme,
  }, state.decisions.depthChartPhilosophy);
  applyStarterSelections(team, depthChart.autoSetRecommendation, state.decisions.depthChartOverrides);
  updatePlayersMirror(nextGame, team);

  applyCapPackageChoice(nextGame, team, state.decisions.capPosture);
  updatePlayersMirror(nextGame, team);

  const owner = ensureOwnerRecord(nextGame, team);
  const selectedGoals = state.decisions.seasonGoals.map((goalId) => goalEntry(goalId));
  owner.goals = {
    floor: selectedGoals[0]?.label ?? '',
    target: selectedGoals[1]?.label ?? '',
    ceiling: selectedGoals[2]?.label ?? '',
  };
  owner.patience = Math.max(owner.patience, team.ownerPatience80);
  nextGame.frontOffice.agmProfileId = state.decisions.agmProfileId;
  installOwnerMandates(nextGame, teamId, state.decisions.seasonGoals, state.decisions.agmProfileId);
  applyAgmSetupEffect(nextGame, team, state.decisions);
  updatePlayersMirror(nextGame, team);

  const cultureEffect = buildCultureMandateEffect(nextGame, team, state.decisions.cultureMandate);
  nextGame.activeEffects ??= [];
  if (cultureEffect) {
    nextGame.activeEffects.push(cultureEffect);
  }

  const blueprint = state.blueprint ?? generateBlueprint(nextGame, teamId, state.decisions);
  const crisisProfile = generateTeamCrisisProfile(nextGame, teamId);
  const forecastBoard = generateSetupForecast(nextGame, teamId, state.decisions);
  nextGame.franchiseBlueprint = blueprint;
  nextGame.setupState = {
    ...state,
    currentPhase: 'blueprint',
    completedPhases: [...PHASE_ORDER],
    crisisProfile,
    forecastBoard,
    blueprint,
  };

  return nextGame;
}
