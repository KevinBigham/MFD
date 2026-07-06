/**
 * Season features — phase enums, difficulty, tutorial,
 * achievements, dashboard, narratives, ceremonies,
 * player rivalries, farewell tours, jersey retirements,
 * dynasty timeline, trade proposals.
 */

import type { Position } from './player.js';
import type { LeagueRuleKey, RuleChangeRecord } from './governance.js';
import type { TradeOfferAsset } from './transactions.js';

// ── Season Phase ────────────────────────────────────────

export type SeasonPhase =
  | 'preseason'
  | 'regular_season'
  | 'playoffs'
  | 'offseason'
  | 'free_agency'
  | 'draft'
  | 'post_draft'
  | 'training_camp';

// ── Difficulty ──────────────────────────────────────────

export type DifficultyLevel = 'rookie' | 'pro' | 'allpro' | 'legend';

export interface DifficultyAdjustment {
  week: number;
  delta: number;
  reason: string;
}

export interface DifficultyState {
  enabled: boolean;
  adaptiveSlider: number;
  recentUserResults: { week: number; result: 'win' | 'loss' }[];
  currentStreak: number;
  adjustmentHistory: DifficultyAdjustment[];
}

// ── Advanced Stats ──────────────────────────────────────

export interface AdvancedStats {
  qbr: number;
  epa: number;
  successRate: number;
  yac: number;
  pressureRate: number;
  thirdDownRate: number;
  redZoneRate: number;
  turnoverRate: number;
}

// ── Playoff Momentum ────────────────────────────────────

export interface PlayoffMomentum {
  teamId: string;
  momentum: number;
  narrativeTag: 'cinderella' | 'dynasty' | 'revenge' | 'hot_streak' | 'defending_champ' | 'underdog' | null;
  winStreak: number;
}

// ── Tutorial ────────────────────────────────────────────

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetScreen: string;
  targetElement: string | null;
  action: string | null;
  completed: boolean;
}

export interface TutorialState {
  active: boolean;
  currentStepIndex: number;
  steps: TutorialStep[];
  completedSteps: string[];
  dismissed: boolean;
  /**
   * Screens the user has visited at least once. Serialized as array (JSON-safe);
   * UI layer may hydrate to Set for O(1) lookup. Sprint 43 / SAVE_VERSION 31.
   */
  visitedScreens: string[];
}

// ── Achievements ────────────────────────────────────────

export const ACHIEVEMENT_CONDITION_TYPES = [
  'championships',
  'consecutive_championships',
  'perfect_season',
  'worst_to_first',
  'elite_defense_years',
  'dynasty_score',
  'conference_finals',
  'playoff_appearances',
  'young_starters',
  'average_roster_ovr',
  'average_roster_age_under',
  'veteran_count',
  'full_house',
  'cap_wizard',
  'no_ir_season',
  'average_chemistry',
  'starters_from_single_draft_class',
  'late_round_starters',
  'trade_up_foundation',
  'draft_pick_count',
  'comp_picks',
  'conditional_pick_upgrades',
  'elite_scouts',
  'combine_actions',
  'moneyball',
  'max_cap_usage',
  'fulfilled_promises',
  'hardball_bargains',
  'max_facilities',
  'positive_cap_years',
  'high_level_coaches',
  'active_mentoring_pairs',
  'training_breakouts',
  'scheme_innovator',
  'medical_marvel',
  'positive_press_conferences',
  'blood_feud_rivalries',
  'news_items_current_season',
  'active_story_arcs',
  'cool_under_pressure',
  'records_broken',
  'records_held',
  'hall_of_famers',
  'peak_ovr_90',
  'franchise_wins',
  'seasons_played',
  'hc_tenure',
  'trade_partners',
  'cinderella_story',
  'playoff_comebacks',
] as const;

export type AchievementConditionType = typeof ACHIEVEMENT_CONDITION_TYPES[number];

export interface AchievementCondition {
  type: AchievementConditionType;
  threshold: number | string | boolean;
}

export type AchievementCategory =
  | 'dynasty'
  | 'roster'
  | 'draft'
  | 'financial'
  | 'coaching'
  | 'narrative'
  | 'records'
  | 'milestones'
  | 'hidden';

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  tier: AchievementTier;
  condition: AchievementCondition;
  unlockedYear: number | null;
  unlockedWeek: number | null;
  icon: string;
}

export interface AchievementProgress {
  achievementId: string;
  current: number;
  target: number;
  percentage: number;
  label: string;
  hidden: boolean;
  complete: boolean;
}

// ── Dashboard ───────────────────────────────────────────

export type DashboardWidget =
  | 'team_record'
  | 'next_game'
  | 'injury_report'
  | 'fatigue_watch'
  | 'cap_snapshot'
  | 'power_ranking'
  | 'promise_tracker'
  | 'training_report'
  | 'league_headlines'
  | 'record_watch'
  | 'rivalry_watch'
  | 'coaching_news'
  | 'waiver_wire'
  | 'weather_forecast'
  | 'achievement_progress'
  | 'dynasty_score'
  | 'dynasty_window'
  | 'playoff_picture'
  | 'stat_leaders';

export interface DashboardLayout {
  id: string;
  name: string;
  widgets: DashboardWidget[];
  columns: 2 | 3;
}

export interface DashboardState {
  activeLayoutId: string;
  layouts: DashboardLayout[];
  pinnedWidgets: DashboardWidget[];
}

// ── Agents ──────────────────────────────────────────────

export interface AgentProfile {
  id: string;
  name: string;
  style: 'hardball' | 'collaborative' | 'media_savvy' | 'old_school';
  demandMultiplier: number;
  patienceModifier: number;
  clients: string[];
}

// ── Narrative ───────────────────────────────────────────

export interface NarrativeBeat {
  week: number;
  type: 'positive' | 'negative' | 'neutral';
  intensity: number;
  source: string;
}

export interface NarrativeIntensity {
  current: number;
  recentBeats: NarrativeBeat[];
  cooldownWeeks: number;
}

// ── Ceremonies ──────────────────────────────────────────

export type CeremonyType =
  | 'championship'
  | 'awards_night'
  | 'hall_of_fame_induction'
  | 'ring_ceremony'
  | 'jersey_retirement';

export interface CeremonyHighlight {
  label: string;
  value: string;
  playerIds: string[];
}

export interface Ceremony {
  id: string;
  type: CeremonyType;
  year: number;
  headline: string;
  description: string;
  highlights: CeremonyHighlight[];
  mvp: string | null;
}

// ── Player Rivalries / Farewell Tours ──────────────────

export interface PlayerRivalryEvent {
  year: number;
  week: number;
  description: string;
  intensityDelta: number;
}

export interface PlayerRivalry {
  id: string;
  playerAId: string;
  playerBId: string;
  playerAName: string;
  playerBName: string;
  teamAId: string;
  teamBId: string;
  intensity: number;
  tier: 'budding' | 'heated' | 'nemesis';
  origin: string;
  history: PlayerRivalryEvent[];
  seasonStarted: number;
}

export interface FarewellMoment {
  week: number;
  type: 'standing_ovation' | 'gift_exchange' | 'emotional_speech' | 'final_home_game' | 'final_game';
  narrative: string;
  opponent: string;
}

export interface FarewellTour {
  playerId: string;
  playerName: string;
  teamId: string;
  finalSeason: boolean;
  announcedWeek: number;
  moments: FarewellMoment[];
}

export interface JerseyRetirement {
  id: string;
  playerId: string;
  playerName: string;
  pos: Position;
  jerseyNumber: number;
  teamId: string;
  year: number;
  peakOvr: number;
  seasonsWithTeam: number;
  championships: number;
  headline: string;
  ceremony: string;
  legacyScore: number;
}

// ── League Rule History ────────────────────────────────

export interface LeagueRuleHistoryGroup {
  key: LeagueRuleKey;
  label: string;
  changes: RuleChangeRecord[];
}

// ── Dynasty Timeline ────────────────────────────────────

export interface DynastyEvent {
  id: string;
  year: number;
  week: number | null;
  type: 'championship' | 'draft_pick' | 'trade' | 'signing' | 'firing' | 'record' | 'award' | 'hof' | 'milestone' | 'named_game';
  headline: string;
  importance: 'landmark' | 'major' | 'minor';
  playerIds: string[];
  teamIds: string[];
  namedGame?: import('../systems/named-games').NamedGameEvent;
}

// ── Trade Proposals ────────────────────────────────────

export type TradeProposalStatus = 'draft' | 'sent' | 'countered' | 'accepted' | 'rejected';

export interface TradeProposal {
  id: string;
  fromTeamId: string;
  toTeamId: string;
  offering: TradeOfferAsset[];
  requesting: TradeOfferAsset[];
  status: TradeProposalStatus;
  counterOffer: TradeProposal | null;
  aiResponse: string;
  valueDiff: number;
}
