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
}

// ── Achievements ────────────────────────────────────────

export interface AchievementCondition {
  type: string;
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

