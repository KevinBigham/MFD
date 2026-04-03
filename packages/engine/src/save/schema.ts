/**
 * MFD Save Schema — Zod-validated save format
 *
 * Rule 5: Save format is versioned and schema-validated.
 * Old saves MUST load through the migration pipeline.
 */

import { z } from 'zod';

const ScoutingRegionSchema = z.enum(['east', 'south', 'midwest', 'west']);
const ProspectRiskBandSchema = z.enum(['unknown', 'safe', 'balanced', 'volatile']);
const ProspectCeilingBandSchema = z.enum(['unknown', 'starter', 'impact', 'star']);
const ProspectCharacterReadSchema = z.enum(['unknown', 'leader', 'steady', 'mercurial', 'red_flag']);

export const PersonalitySchema = z.object({
  workEthic: z.number().min(1).max(10),
  loyalty: z.number().min(1).max(10),
  greed: z.number().min(1).max(10),
  pressure: z.number().min(1).max(10),
  ambition: z.number().min(1).max(10),
});

export const ContractYearSchema = z.object({
  year: z.number(),
  baseSalary: z.number(),
  capHit: z.number(),
  deadCap: z.number(),
  guaranteed: z.boolean(),
});

export const ContractSchema = z.object({
  playerId: z.string(),
  teamId: z.string(),
  years: z.number(),
  totalValue: z.number(),
  yearlyBreakdown: z.array(ContractYearSchema),
  guaranteed: z.number(),
  signingBonus: z.number(),
  voidYears: z.number(),
  franchiseTag: z.enum(['exclusive', 'non-exclusive', 'transition']).nullable(),
  incentives: z.array(z.object({
    type: z.string(),
    threshold: z.number(),
    bonus: z.number(),
    achieved: z.boolean(),
  })),
});

export const InjurySchema = z.object({
  type: z.string(),
  severity: z.enum(['questionable', 'doubtful', 'out', 'ir']),
  severityTier: z.enum(['minor', 'moderate', 'severe', 'season_ending']).default('minor'),
  gamesOut: z.number(),
  id: z.string().default('legacy-injury'),
  gamesRecovered: z.number().default(0),
  reinjuryRisk: z.number().default(0),
  affectedRatings: z.array(z.string()).default([]),
  ratingPenalty: z.number().default(0),
  onIR: z.boolean().default(false),
});

export const StoryArcSchema = z.object({
  id: z.string(),
  template: z.enum(['win_streak', 'hot_seat', 'breakout_player', 'revenge_game', 'injury_crisis']),
  playerId: z.string().nullable(),
  teamId: z.string().nullable(),
  stage: z.number(),
  title: z.string(),
  summary: z.string(),
  startedYear: z.number(),
  startedWeek: z.number(),
  updatedYear: z.number(),
  updatedWeek: z.number(),
  expiresAfterWeek: z.number().nullable(),
  data: z.record(z.string(), z.unknown()),
});

export const TimedEffectSchema = z.object({
  id: z.string(),
  sourceType: z.enum(['off_field_event', 'press_conference', 'rivalry']),
  sourceId: z.string(),
  teamId: z.string(),
  targetType: z.enum(['team', 'player']),
  targetId: z.string().nullable(),
  stat: z.enum(['chemistry', 'morale', 'ovr', 'ownerApproval']),
  delta: z.number(),
  appliesToGame: z.boolean(),
  startStamp: z.number(),
  endStamp: z.number(),
  summary: z.string(),
});

export const ReporterQuestionSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  topic: z.string(),
  response: z.string(),
});

export const PressConferenceSchema = z.object({
  id: z.string(),
  type: z.enum(['postgame', 'midweek', 'post_trade', 'post_draft', 'coaching_change']),
  year: z.number(),
  week: z.number(),
  teamId: z.string().nullable(),
  speaker: z.string(),
  speakerRole: z.enum(['HC', 'GM', 'PLAYER']),
  topic: z.string(),
  tone: z.enum(['confident', 'deflecting', 'fired_up', 'somber']),
  headline: z.string(),
  opener: z.string(),
  quotes: z.array(z.string()),
  reporterQuestions: z.array(ReporterQuestionSchema),
  effects: z.array(TimedEffectSchema),
});

export const OffFieldEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  category: z.enum(['locker_room', 'media', 'personal']),
  week: z.number(),
  year: z.number(),
  playerIds: z.array(z.string()),
  teamId: z.string(),
  headline: z.string(),
  description: z.string(),
  effects: z.array(TimedEffectSchema),
});

export const RivalryGameContextSchema = z.object({
  rivalryId: z.string(),
  intensity: z.number(),
  tier: z.enum(['budding', 'heated', 'blood_feud']),
  ovrBoost: z.number(),
  headline: z.string(),
});

export const CoachCareerHistorySchema = z.object({
  coachId: z.string(),
  name: z.string(),
  archetype: z.string(),
  age: z.number(),
  seasonsCoached: z.number(),
  wins: z.number(),
  losses: z.number(),
  championships: z.number(),
  awards: z.number(),
  retired: z.boolean(),
  teams: z.array(z.object({
    teamId: z.string(),
    startYear: z.number(),
    endYear: z.number(),
    wins: z.number(),
    losses: z.number(),
    championships: z.number(),
  })),
});

export const LeagueRivalrySchema = z.object({
  id: z.string(),
  teamA: z.string(),
  teamB: z.string(),
  intensity: z.number(),
  isDivision: z.boolean(),
  history: z.array(z.string()),
  lastMetYear: z.number().nullable(),
  lastMetWeek: z.number().nullable(),
});

export const GameDayPackageSchema = z.object({
  id: z.string(),
  year: z.number(),
  week: z.number(),
  phase: z.enum(['preseason', 'regular_season', 'playoffs', 'offseason', 'free_agency', 'draft', 'post_draft']),
  teamId: z.string(),
  opponentTeamId: z.string().nullable(),
  headline: z.string(),
  result: z.enum(['win', 'loss', 'tie', 'pending']),
  finalScore: z.string(),
  stakes: z.array(z.object({
    label: z.string(),
    detail: z.string(),
  })),
  turningPoints: z.array(z.object({
    label: z.string(),
    detail: z.string(),
    impact: z.enum(['positive', 'negative', 'neutral']),
  })),
  topPerformers: z.array(z.object({
    playerId: z.string().nullable(),
    label: z.string(),
    statLine: z.string(),
  })),
  injuryNotes: z.array(z.string()),
  ceremony: z.object({
    title: z.string(),
    subtitle: z.string(),
  }).nullable(),
  pressConference: z.object({
    theme: z.string(),
    opener: z.string(),
    quotes: z.array(z.string()),
    speaker: z.string(),
    tone: z.enum(['confident', 'deflecting', 'fired_up', 'somber']),
    topic: z.string(),
    reporterQuestions: z.array(ReporterQuestionSchema),
  }),
  rivalry: RivalryGameContextSchema.nullable(),
  activeEffectSummaries: z.array(z.string()),
  autopsy: z.object({
    diagnosis: z.string(),
    leverage: z.string(),
    nextFocus: z.array(z.string()),
  }),
  weather: z.enum(['dome', 'clear', 'rain', 'snow', 'wind']).nullable().optional(),
  matchupHighlight: z.object({
    label: z.string(),
    detail: z.string(),
    teamId: z.string(),
    playerId: z.string().nullable(),
    opponentPlayerId: z.string().nullable(),
    advantage: z.number(),
  }).nullable().optional(),
  broadcastNetwork: z.enum(['MFN', 'ESPN8', 'FOX8', 'CBS8', 'NBC8']).nullable().optional(),
  primetime: z.boolean().optional(),
  flexed: z.boolean().optional(),
  specialTeamsHighlights: z.array(z.string()).optional(),
  prepGrade: z.string().nullable().optional(),
  coachingNotes: z.array(z.string()).optional(),
  carryForwardRecommendations: z.array(z.string()).optional(),
});

export const GameDayStateSchema = z.object({
  recentPackages: z.array(GameDayPackageSchema),
  latestPackageId: z.string().nullable(),
});

export const RecordEntrySchema = z.object({
  category: z.enum(['singleGame', 'singleSeason', 'career', 'franchise']),
  stat: z.string(),
  value: z.number(),
  teamId: z.string(),
  teamName: z.string(),
  year: z.number(),
  week: z.number().nullable().optional(),
  playerId: z.string().nullable().optional(),
  playerName: z.string().nullable().optional(),
  note: z.string().optional(),
});

export const RecordBucketSchema = z.record(z.string(), z.array(RecordEntrySchema));

export const RecordBookSchema = z.object({
  singleGame: RecordBucketSchema,
  singleSeason: RecordBucketSchema,
  career: RecordBucketSchema,
  franchise: RecordBucketSchema,
});

export const AwardNomineeSchema = z.object({
  entityId: z.string(),
  entityType: z.enum(['player', 'coach']),
  name: z.string(),
  teamId: z.string().nullable(),
  teamName: z.string(),
  position: z.union([z.enum(['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P']), z.enum(['HC', 'OC', 'DC'])]).nullable(),
  ovr: z.number(),
  score: z.number(),
  stats: z.record(z.string(), z.union([z.number(), z.string()])),
});

export const AwardResultSchema = z.object({
  awardId: z.string(),
  label: z.string(),
  winnerId: z.string(),
  winnerName: z.string(),
  winnerTeamId: z.string().nullable(),
  winnerTeam: z.string(),
  winnerPosition: AwardNomineeSchema.shape.position,
  winnerStats: z.record(z.string(), z.union([z.number(), z.string()])),
  score: z.number(),
  runnersUp: z.array(AwardNomineeSchema),
  narrative: z.string(),
});

export const AwardsHistoryEntrySchema = z.object({
  year: z.number(),
  awards: z.array(AwardResultSchema),
  ceremony: z.object({
    headline: z.string(),
    intro: z.string(),
    blurbs: z.array(z.string()),
  }),
});

export const HallOfFameEntrySchema = z.object({
  playerId: z.string(),
  name: z.string(),
  position: z.enum(['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P']),
  inductionYear: z.number(),
  peakOvr: z.number(),
  careerYears: z.number(),
  score: z.number(),
  awards: z.object({
    mvps: z.number(),
    allPros: z.number(),
    proBowls: z.number(),
    championships: z.number(),
  }),
  highlights: z.array(z.string()),
  teams: z.array(z.string()),
});

export const PowerRankingSchema = z.object({
  rank: z.number(),
  teamId: z.string(),
  teamName: z.string(),
  score: z.number(),
  previousRank: z.number().nullable(),
  delta: z.number(),
  blurb: z.string(),
  record: z.string(),
});

export const ContractOfferSchema = z.object({
  years: z.number(),
  salary: z.number(),
  signingBonus: z.number(),
  guaranteed: z.number(),
});

export const ReSignDecisionSchema = z.object({
  playerId: z.string(),
  teamId: z.string(),
  askingPrice: ContractOfferSchema,
  agentDemand: ContractOfferSchema,
  lastOffer: ContractOfferSchema.nullable(),
  counterOffer: ContractOfferSchema.nullable(),
  agentResponse: z.string(),
  patienceWeeksRemaining: z.number(),
  status: z.enum(['pending', 'countered', 'accepted', 'declined', 'walked']),
});

export const FreeAgencyBidSchema = ContractOfferSchema.extend({
  playerId: z.string(),
  teamId: z.string(),
  round: z.number(),
  score: z.number(),
  status: z.enum(['pending', 'won', 'lost']),
});

export const ProspectScoutingStateSchema = z.object({
  prospectId: z.string(),
  actions: z.array(z.enum(['film', 'combine', 'interview', 'private_workout'])),
  accuracy: z.number(),
  confidence: z.number(),
  visibleScoutGrade: z.number(),
  notes: z.array(z.string()),
  proDayRating: z.string().nullable().optional(),
  assignedScoutId: z.string().nullable(),
  riskBand: ProspectRiskBandSchema,
  ceilingBand: ProspectCeilingBandSchema,
  characterRead: ProspectCharacterReadSchema,
  privateWorkoutRatings: z.array(z.string()),
});

export const TradeOfferAssetSchema = z.object({
  type: z.enum(['player', 'pick', 'conditional_pick']),
  teamId: z.string(),
  playerId: z.string().nullable(),
  pickId: z.string().nullable(),
  conditionalPickId: z.string().nullable().optional(),
  description: z.string(),
});

export const ScoutSchema = z.object({
  id: z.string(),
  name: z.string(),
  tier: z.enum(['elite', 'good', 'average', 'poor']),
  specialty: z.enum(['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P']).nullable(),
  scope: z.enum(['national', 'regional']),
  region: ScoutingRegionSchema.nullable(),
  salary: z.number(),
  accuracy: z.number(),
});

export const ScoutingDepartmentSchema = z.object({
  scouts: z.array(ScoutSchema),
  availableScouts: z.array(ScoutSchema),
  budget: z.number(),
  maxScouts: z.number(),
  privateWorkoutsRemaining: z.number(),
});

export const MedicalStaffSchema = z.object({
  id: z.string(),
  name: z.string(),
  tier: z.enum(['elite', 'good', 'average', 'poor']),
  salary: z.number(),
  recoveryBonus: z.number(),
  preventionBonus: z.number(),
});

export const FatigueStateSchema = z.object({
  playerId: z.string(),
  fatigue: z.number(),
  weeklySnaps: z.array(z.number()),
  seasonSnaps: z.number(),
  restWeeks: z.number(),
  conditioningBonus: z.number(),
});

export const FacilityTypeSchema = z.enum(['training_complex', 'medical_center', 'film_room', 'weight_room', 'recovery_suite']);

export const FacilityEffectSchema = z.object({
  trainingXPBonus: z.number(),
  recoveryBonus: z.number(),
  injuryPreventionBonus: z.number(),
  scoutingBonus: z.number(),
  moraleBonus: z.number(),
  fatigueGainBonus: z.number(),
});

export const FacilitySchema = z.object({
  type: FacilityTypeSchema,
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  effect: FacilityEffectSchema,
});

export const FacilityStateSchema = z.object({
  facilities: z.array(FacilitySchema),
  budget: z.number(),
  maxFacilities: z.number(),
  upgradeCosts: z.record(FacilityTypeSchema, z.array(z.number())),
});

export const PickConditionSchema = z.object({
  type: z.enum(['games_played', 'pro_bowl', 'playoff_win', 'starts']),
  playerId: z.string(),
  threshold: z.number(),
  upgradeRound: z.number(),
});

export const ConditionalPickSchema = z.object({
  id: z.string(),
  fromTeamId: z.string(),
  toTeamId: z.string(),
  playerId: z.string(),
  basePick: z.object({
    round: z.number(),
    pick: z.number(),
    originalTeamId: z.string(),
    currentTeamId: z.string(),
    year: z.number(),
    isCompPick: z.boolean(),
  }),
  condition: PickConditionSchema,
  resolvedPick: z.object({
    round: z.number(),
    pick: z.number(),
    originalTeamId: z.string(),
    currentTeamId: z.string(),
    year: z.number(),
    isCompPick: z.boolean(),
  }).nullable(),
  resolved: z.boolean(),
  description: z.string(),
});

export const WaiverWireEntrySchema = z.object({
  playerId: z.string(),
  releasedByTeamId: z.string().nullable(),
  createdYear: z.number(),
  createdWeek: z.number(),
  expiresYear: z.number(),
  expiresWeek: z.number(),
});

export const WaiverClaimSchema = z.object({
  teamId: z.string(),
  playerId: z.string(),
  claimYear: z.number(),
  claimWeek: z.number(),
});

export const WaiverResultEntrySchema = z.object({
  playerId: z.string(),
  releasedByTeamId: z.string().nullable(),
  winningTeamId: z.string().nullable(),
  losingTeamIds: z.array(z.string()),
  clearedToFreeAgency: z.boolean(),
});

export const WaiverRunResultSchema = z.object({
  id: z.string(),
  year: z.number(),
  week: z.number(),
  entries: z.array(WaiverResultEntrySchema),
});

export const HandshakeConditionSchema = z.object({
  metric: z.enum(['wins', 'playoff', 'starter', 'trade_block', 'spending', 'draft_position', 'on_roster', 'restructure']),
  target: z.union([z.number(), z.string(), z.boolean()]),
});

export const HandshakeSchema = z.object({
  id: z.string(),
  type: z.enum(['owner', 'player', 'media']),
  promiseText: z.string(),
  targetId: z.string(),
  teamId: z.string(),
  madeYear: z.number(),
  madeWeek: z.number(),
  deadline: z.object({
    year: z.number(),
    week: z.number(),
  }),
  condition: HandshakeConditionSchema,
  status: z.enum(['active', 'fulfilled', 'broken', 'expired']),
  consequence: z.string().nullable(),
});

export const DraftOrderEntrySchema = z.object({
  id: z.string(),
  teamId: z.string(),
  round: z.number(),
  pick: z.number(),
  overall: z.number(),
  originalTeamId: z.string(),
});

export const TradeOfferSchema = z.object({
  id: z.string(),
  fromTeamId: z.string(),
  toTeamId: z.string(),
  direction: z.enum(['inbound', 'outbound']),
  summary: z.string(),
  status: z.enum(['pending', 'accepted', 'rejected']),
  send: z.array(TradeOfferAssetSchema),
  receive: z.array(TradeOfferAssetSchema),
});

export const NewsItemSchema = z.object({
  id: z.string(),
  year: z.number(),
  week: z.number(),
  type: z.enum(['trade', 'signing', 'cut', 'injury', 'record', 'coaching', 'rivalry', 'milestone', 'draft', 'waiver']),
  headline: z.string(),
  body: z.string(),
  teamIds: z.array(z.string()),
  playerIds: z.array(z.string()),
  importance: z.enum(['breaking', 'major', 'minor']),
});

export const TrainingFocusSchema = z.enum(['film_study', 'position_drills', 'conditioning', 'mentorship', 'rest']);

export const TrainingAssignmentSchema = z.object({
  playerId: z.string(),
  focus: TrainingFocusSchema,
  weeksAssigned: z.number(),
  xpGained: z.number(),
  focusXp: z.object({
    film_study: z.number(),
    position_drills: z.number(),
    conditioning: z.number(),
    mentorship: z.number(),
    rest: z.number(),
  }),
});

export const DifficultyAdjustmentSchema = z.object({
  week: z.number(),
  delta: z.number(),
  reason: z.string(),
});

export const DifficultyStateSchema = z.object({
  enabled: z.boolean(),
  adaptiveSlider: z.number(),
  recentUserResults: z.array(z.object({
    week: z.number(),
    result: z.enum(['win', 'loss']),
  })),
  currentStreak: z.number(),
  adjustmentHistory: z.array(DifficultyAdjustmentSchema),
});

export const PlayoffMomentumSchema = z.object({
  teamId: z.string(),
  momentum: z.number(),
  narrativeTag: z.enum(['cinderella', 'dynasty', 'revenge', 'hot_streak', 'defending_champ', 'underdog']).nullable(),
  winStreak: z.number(),
});

export const AchievementConditionSchema = z.object({
  type: z.string(),
  threshold: z.union([z.number(), z.string(), z.boolean()]),
});

export const AchievementSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.enum(['dynasty', 'roster', 'draft', 'financial', 'coaching', 'narrative', 'records', 'milestones', 'hidden']),
  tier: z.enum(['bronze', 'silver', 'gold', 'platinum']),
  condition: AchievementConditionSchema,
  unlockedYear: z.number().nullable(),
  unlockedWeek: z.number().nullable(),
  icon: z.string(),
});

export const DashboardLayoutSchema = z.object({
  id: z.string(),
  name: z.string(),
  widgets: z.array(z.enum([
    'team_record',
    'next_game',
    'injury_report',
    'fatigue_watch',
    'cap_snapshot',
    'power_ranking',
    'promise_tracker',
    'training_report',
    'league_headlines',
    'record_watch',
    'rivalry_watch',
    'coaching_news',
    'waiver_wire',
    'weather_forecast',
    'achievement_progress',
    'dynasty_score',
    'playoff_picture',
    'stat_leaders',
  ])),
  columns: z.union([z.literal(2), z.literal(3)]),
});

export const DashboardStateSchema = z.object({
  activeLayoutId: z.string(),
  layouts: z.array(DashboardLayoutSchema),
  pinnedWidgets: z.array(DashboardLayoutSchema.shape.widgets.element),
});

export const SpecialTeamsStateSchema = z.object({
  kickReturner: z.string().nullable(),
  puntReturner: z.string().nullable(),
  longSnapper: z.string().nullable(),
  kickCoverageUnit: z.array(z.string()),
  puntCoverageUnit: z.array(z.string()),
});

export const ReportSectionSchema = z.object({
  title: z.string(),
  grade: z.string(),
  summary: z.string(),
  highlights: z.array(z.string()),
  stats: z.record(z.union([z.string(), z.number()])),
});

export const SeasonReportSchema = z.object({
  year: z.number(),
  teamId: z.string(),
  overallGrade: z.enum(['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F']),
  sections: z.array(ReportSectionSchema),
});

export const GamePlanSchema = z.object({
  offensiveScheme: z.enum(['balanced', 'pass_heavy', 'run_heavy', 'spread', 'power']),
  defensiveScheme: z.enum(['base', 'blitz_heavy', 'coverage', 'contain', 'aggressive']),
  keyMatchup: z.object({
    playerA: z.string(),
    playerB: z.string(),
  }).nullable(),
  gamePlanBonus: z.number(),
});

export const OpponentReportSchema = z.object({
  teamId: z.string(),
  teamName: z.string(),
  record: z.string(),
  year: z.number(),
  week: z.number(),
  offenseRank: z.number(),
  defenseRank: z.number(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  keyPlayers: z.array(z.lazy(() => PlayerSchema)),
  vulnerabilityRatings: z.object({
    passing: z.number(),
    rushing: z.number(),
    pass_rush: z.number(),
    coverage: z.number(),
  }),
  schemeRecommendation: z.object({
    offense: GamePlanSchema.shape.offensiveScheme,
    defense: GamePlanSchema.shape.defensiveScheme,
    reasoning: z.string(),
  }),
});

export const DraftRecapPickSchema = z.object({
  playerId: z.string(),
  teamId: z.string(),
  playerName: z.string(),
  position: z.enum(['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P']),
  ovr: z.number(),
  round: z.number(),
  pick: z.number(),
  projectedPick: z.number(),
  valueDelta: z.number(),
  verdict: z.enum(['steal', 'reach', 'fair']),
});

export const DraftRecapSchema = z.object({
  year: z.number(),
  teamId: z.string(),
  picks: z.array(DraftRecapPickSchema),
  classGrade: z.string(),
  bestValue: DraftRecapPickSchema,
  biggestReach: DraftRecapPickSchema,
  steals: z.array(DraftRecapPickSchema),
  leagueHighlights: z.array(DraftRecapPickSchema),
});

export const TradePackageSchema = z.object({
  offering: z.array(TradeOfferAssetSchema),
  requesting: z.array(TradeOfferAssetSchema),
  type: z.enum(['pick_for_player', 'player_for_player', 'mixed']),
});

export const TradeSuggestionSchema = z.object({
  partner: z.string(),
  offer: TradePackageSchema,
  reasoning: z.string(),
  valueGap: z.number(),
  acceptanceLikelihood: z.number(),
  need: z.enum(['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P']).nullable(),
});

export const PlayerSeasonHistoryEntrySchema = z.object({
  playerId: z.string(),
  season: z.number(),
  age: z.number(),
  ovr: z.number(),
  teamId: z.string().nullable(),
  gamesPlayed: z.number(),
  gamesStarted: z.number(),
  keyStats: z.record(z.string(), z.number()),
});

export const PositionGroupGradeSchema = z.object({
  group: z.enum(['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P']),
  grade: z.enum(['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F']),
  avgOvr: z.number(),
  starterOvr: z.number(),
  depth: z.number(),
  ageRisk: z.enum(['low', 'medium', 'high']),
  topPlayer: z.lazy(() => PlayerSchema).nullable(),
  weakestStarter: z.lazy(() => PlayerSchema).nullable(),
});

export const TeamNeedsReportSchema = z.object({
  overall: z.string(),
  positionGrades: z.array(PositionGroupGradeSchema),
  criticalNeeds: z.array(z.string()),
  strengths: z.array(z.string()),
  draftTargets: z.array(z.string()),
  faTargets: z.array(z.string()),
  capFlexibility: z.enum(['tight', 'moderate', 'abundant']),
});

export const FATargetSchema = z.object({
  player: z.lazy(() => PlayerSchema),
  projectedSalary: z.number(),
  marketDemand: z.enum(['high', 'medium', 'low']),
  fitScore: z.number(),
  signProbability: z.number(),
  competingTeams: z.array(z.string()),
});

export const FATargetBoardStateSchema = z.object({
  teamId: z.string().nullable(),
  watchlist: z.array(z.string()),
  targets: z.array(FATargetSchema),
});

export const DraftTradeOfferSchema = z.object({
  from: z.string(),
  targetPick: z.number(),
  offer: TradePackageSchema,
  urgency: z.enum(['desperate', 'interested', 'casual']),
  reasoning: z.string(),
});

export const WarRoomStateSchema = z.object({
  currentPick: z.number(),
  onTheClock: z.string(),
  timeRemaining: z.number(),
  incomingOffers: z.array(DraftTradeOfferSchema),
  userCanTradeUp: z.array(z.object({
    targetPick: z.number(),
    cost: TradePackageSchema,
  })),
  draftGrade: z.string(),
});

export const ExtensionOfferSchema = z.object({
  playerId: z.string(),
  newYears: z.number(),
  newAvgSalary: z.number(),
  guaranteedAmount: z.number(),
  signingBonus: z.number(),
  capHitByYear: z.array(z.number()),
});

export const ContractExtensionRecordSchema = z.object({
  playerId: z.string(),
  teamId: z.string(),
  status: z.enum(['pending', 'accepted', 'rejected', 'countered']),
  offer: ExtensionOfferSchema,
  counterOffer: ExtensionOfferSchema.nullable(),
  reasoning: z.string(),
  year: z.number(),
  week: z.number(),
});

export const StaffCandidateSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.enum(['HC', 'OC', 'DC']),
  archetype: z.string(),
  traits: z.array(z.string()),
  ratings: z.record(z.number()),
  level: z.number(),
  age: z.number().optional(),
  specialty75: z.any().nullable().optional(),
  term: z.number().optional(),
  buyoutPenalty: z.number().optional(),
  loyalty: z.number().optional(),
  ambition: z.number().optional(),
  schemeLean: z.object({
    offense: z.string(),
    defense: z.string(),
  }).optional(),
  lastHiredYear: z.number().optional(),
  desiredRole: z.enum(['HC', 'OC', 'DC']),
  fitScore: z.number(),
  continuityTag: z.enum(['ideal', 'strong', 'transition', 'risky']),
  reasoning: z.array(z.string()),
});

export const CoachingMarketStateSchema = z.object({
  teamId: z.string().nullable(),
  updatedYear: z.number(),
  updatedWeek: z.number(),
  hotSeat: z.boolean(),
  candidates: z.object({
    HC: z.array(StaffCandidateSchema),
    OC: z.array(StaffCandidateSchema),
    DC: z.array(StaffCandidateSchema),
  }),
});

export const WeeklyPrepPlanSchema = z.object({
  teamId: z.string(),
  opponentTeamId: z.string(),
  year: z.number(),
  week: z.number(),
  offensiveFocus: z.enum(['balanced', 'attack_secondary', 'attack_front', 'feed_star', 'protect_qb']),
  defensiveFocus: z.enum(['balanced', 'stop_run', 'limit_explosive', 'heat_qb', 'erase_wr1']),
  practiceIntensity: z.enum(['light', 'normal', 'full_pads']),
  keyMatchupPlayerId: z.string().nullable(),
  snapManagement: z.enum(['normal', 'protect_starters', 'ride_stars']),
  specialSituation: z.enum(['balanced', 'red_zone', 'third_down', 'two_minute', 'field_position']),
});

export const WeeklyPrepOutcomeSchema = z.object({
  teamId: z.string(),
  opponentTeamId: z.string(),
  year: z.number(),
  week: z.number(),
  plan: WeeklyPrepPlanSchema,
  readiness: z.number(),
  reasoning: z.array(z.string()),
  effects: z.object({
    teamOvrBonus: z.number(),
    playerBonuses: z.record(z.string(), z.number()),
    fatigueDelta: z.number(),
    injuryRiskDelta: z.number(),
    moraleDelta: z.number(),
    chemistryDelta: z.number(),
  }),
});

export const FilmRoomReportSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  opponentTeamId: z.string().nullable(),
  year: z.number(),
  week: z.number(),
  grade: z.enum(['A', 'B', 'C', 'D', 'F']),
  score: z.number(),
  headline: z.string(),
  planSummary: z.string(),
  alignedCalls: z.array(z.string()),
  missedCalls: z.array(z.string()),
  executionNotes: z.array(z.string()),
  recommendations: z.array(z.string()),
  carryForward: z.array(z.string()),
});

export const SpecialTeamsGameSummarySchema = z.object({
  kickReturnYards: z.number(),
  puntReturnYards: z.number(),
  returnTouchdowns: z.number(),
  returnFumbles: z.number(),
  touchbacks: z.number(),
  netPuntAverage: z.number(),
  highlights: z.array(z.string()),
});

export const ScheduledGameSchema = z.object({
  homeTeamId: z.string(),
  awayTeamId: z.string(),
  result: z.any().nullable(),
  weather: z.enum(['dome', 'clear', 'rain', 'snow', 'wind']).nullable().optional(),
  flexed: z.boolean().default(false),
  primetime: z.boolean().default(false),
  broadcastNetwork: z.enum(['MFN', 'ESPN8', 'FOX8', 'CBS8', 'NBC8']).nullable().default(null),
});

export const ScheduleWeekSchema = z.object({
  week: z.number(),
  games: z.array(ScheduledGameSchema),
});

export const TutorialStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  targetScreen: z.string(),
  targetElement: z.string().nullable(),
  action: z.string().nullable(),
  completed: z.boolean(),
});

export const TutorialStateSchema = z.object({
  active: z.boolean(),
  currentStepIndex: z.number(),
  steps: z.array(TutorialStepSchema),
  completedSteps: z.array(z.string()),
  dismissed: z.boolean(),
});

export const AgentProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  style: z.enum(['hardball', 'collaborative', 'media_savvy', 'old_school']),
  demandMultiplier: z.number(),
  patienceModifier: z.number(),
  clients: z.array(z.string()),
});

export const NarrativeBeatSchema = z.object({
  week: z.number(),
  type: z.enum(['positive', 'negative', 'neutral']),
  intensity: z.number(),
  source: z.string(),
});

export const NarrativeIntensitySchema = z.object({
  current: z.number(),
  recentBeats: z.array(NarrativeBeatSchema),
  cooldownWeeks: z.number(),
});

export const CeremonyHighlightSchema = z.object({
  label: z.string(),
  value: z.string(),
  playerIds: z.array(z.string()),
});

export const CeremonySchema = z.object({
  id: z.string(),
  type: z.enum(['championship', 'awards_night', 'hall_of_fame_induction', 'ring_ceremony', 'jersey_retirement']),
  year: z.number(),
  headline: z.string(),
  description: z.string(),
  highlights: z.array(CeremonyHighlightSchema),
  mvp: z.string().nullable(),
});

export const DynastyEventSchema = z.object({
  id: z.string(),
  year: z.number(),
  week: z.number().nullable(),
  type: z.enum(['championship', 'draft_pick', 'trade', 'signing', 'firing', 'record', 'award', 'hof', 'milestone']),
  headline: z.string(),
  importance: z.enum(['landmark', 'major', 'minor']),
  playerIds: z.array(z.string()),
  teamIds: z.array(z.string()),
});

export const TradeProposalSchema: z.ZodType = z.lazy(() => z.object({
  id: z.string(),
  fromTeamId: z.string(),
  toTeamId: z.string(),
  offering: z.array(TradeOfferAssetSchema),
  requesting: z.array(TradeOfferAssetSchema),
  status: z.enum(['draft', 'sent', 'countered', 'accepted', 'rejected']),
  counterOffer: TradeProposalSchema.nullable(),
  aiResponse: z.string(),
  valueDiff: z.number(),
}));

export const OffseasonStateSchema = z.object({
  round: z.number(),
  expiringPlayerIds: z.array(z.string()),
  reSignDecisions: z.record(z.string(), ReSignDecisionSchema),
  freeAgencyBids: z.record(z.string(), z.array(FreeAgencyBidSchema)),
  scoutingState: z.record(z.string(), ProspectScoutingStateSchema),
  scoutingWatchlist: z.array(z.string()),
  tradeOffers: z.array(TradeOfferSchema),
  draftOrder: z.array(DraftOrderEntrySchema),
  currentDraftPickIndex: z.number(),
  completedDraftPickIds: z.array(z.string()),
});

export const PlayerSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  pos: z.enum(['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P']),
  age: z.number(),
  ovr: z.number(),
  ratings: z.record(z.number()),
  devTrait: z.enum(['normal', 'star', 'superstar', 'x-factor']),
  personality: PersonalitySchema,
  traits: z.array(z.string()),
  archetype: z.object({
    archetype: z.string(),
    label: z.string(),
    description: z.string(),
  }).nullable(),
  contract: ContractSchema.nullable(),
  teamId: z.string().nullable(),
  draftYear: z.number(),
  draftRound: z.number(),
  draftPick: z.number(),
  college: z.string(),
  yearsExp: z.number(),
  careerStats: z.record(z.number()),
  traitMilestones: z.record(z.boolean()),
  traitPowerLevel: z.record(z.number()),
  injury: InjurySchema.nullable(),
  morale: z.number(),
  agentId: z.string().nullable().default(null),
});

export const SaveStateSchema = z.object({
  version: z.number(),
  seed: z.number(),
  year: z.number(),
  week: z.number(),
  phase: z.enum(['preseason', 'regular_season', 'playoffs', 'offseason', 'free_agency', 'draft', 'post_draft']),
  difficulty: z.enum(['rookie', 'pro', 'allpro', 'legend']),
  players: z.record(PlayerSchema),
  teams: z.record(z.any()),
  owners: z.record(z.any()),
  schedule: z.array(ScheduleWeekSchema),
  draftClass: z.array(z.any()),
  freeAgents: z.array(z.string()),
  records: RecordBookSchema,
  awardsHistory: z.array(AwardsHistoryEntrySchema),
  hallOfFame: z.array(HallOfFameEntrySchema),
  powerRankings: z.array(PowerRankingSchema),
  franchiseHistory: z.array(z.any()),
  playerArchive: z.array(z.any()),
  playerSeasonHistory: z.record(z.string(), z.array(PlayerSeasonHistoryEntrySchema)).default({}),
  frontOffice: z.object({
    xp: z.number(),
    level: z.number(),
    achievements: z.array(z.string()),
    perks: z.array(z.string()),
    reputation: z.object({
      players: z.number(),
      media: z.number(),
      owner: z.number(),
    }),
  }),
  eventLog: z.array(z.any()),
  narrativeState: z.object({
    activeArcs: z.array(StoryArcSchema),
    hooks: z.array(z.any()),
    recentHeadlines: z.array(z.string()),
  }),
  offFieldEvents: z.array(OffFieldEventSchema),
  recentPressConferences: z.array(PressConferenceSchema),
  coachingHistory: z.array(CoachCareerHistorySchema),
  leagueRivalries: z.array(LeagueRivalrySchema),
  activeEffects: z.array(TimedEffectSchema),
  gameDayState: GameDayStateSchema,
  weekSummaries: z.array(z.any()),
  playoffBracket: z.any().nullable(),
  offseasonState: OffseasonStateSchema.nullable(),
  leagueNews: z.array(NewsItemSchema).default([]),
  activeProposals: z.array(TradeProposalSchema).default([]),
  faTargetBoard: FATargetBoardStateSchema.default({
    teamId: null,
    watchlist: [],
    targets: [],
  }),
  teamNeedsCache: z.record(z.string(), TeamNeedsReportSchema).default({}),
  warRoomState: WarRoomStateSchema.nullable().default(null),
  contractExtensions: z.array(ContractExtensionRecordSchema).default([]),
  coachingMarket: CoachingMarketStateSchema.default({
    teamId: null,
    updatedYear: 0,
    updatedWeek: 0,
    hotSeat: false,
    candidates: {
      HC: [],
      OC: [],
      DC: [],
    },
  }),
  weeklyPrepPlans: z.record(z.string(), WeeklyPrepPlanSchema).default({}),
  weeklyPrepHistory: z.array(WeeklyPrepOutcomeSchema).default([]),
  filmRoomHistory: z.array(FilmRoomReportSchema).default([]),
  difficultyState: DifficultyStateSchema.default({
    enabled: true,
    adaptiveSlider: 50,
    recentUserResults: [],
    currentStreak: 0,
    adjustmentHistory: [],
  }),
  availableMedicalStaff: z.array(MedicalStaffSchema).default([]),
  playoffMomentum: z.record(z.string(), PlayoffMomentumSchema).default({}),
  scoutingDepartment: ScoutingDepartmentSchema.default({
    scouts: [],
    availableScouts: [],
    budget: 5,
    maxScouts: 5,
    privateWorkoutsRemaining: 3,
  }),
  conditionalPicks: z.array(ConditionalPickSchema).default([]),
  waiverOrder: z.array(z.string()).default([]),
  waiverWire: z.array(WaiverWireEntrySchema).default([]),
  waiverClaims: z.array(WaiverClaimSchema).default([]),
  handshakes: z.array(HandshakeSchema).default([]),
  tutorialState: TutorialStateSchema.default({
    active: false,
    currentStepIndex: 0,
    steps: [],
    completedSteps: [],
    dismissed: false,
  }),
  agents: z.array(AgentProfileSchema).default([]),
  narrativeIntensity: NarrativeIntensitySchema.default({
    current: 50,
    recentBeats: [],
    cooldownWeeks: 0,
  }),
  achievements: z.array(AchievementSchema).default([]),
  dashboardState: DashboardStateSchema.default({
    activeLayoutId: 'layout:default',
    layouts: [{
      id: 'layout:default',
      name: 'Command Center',
      widgets: [
        'team_record',
        'next_game',
        'injury_report',
        'cap_snapshot',
        'power_ranking',
        'league_headlines',
        'promise_tracker',
        'training_report',
      ],
      columns: 3,
    }],
    pinnedWidgets: [],
  }),
  seasonReports: z.array(SeasonReportSchema).default([]),
  waiverResults: z.array(WaiverRunResultSchema).default([]),
  gamePlan: GamePlanSchema.nullable().default(null),
  opponentReports: z.array(OpponentReportSchema).default([]),
  draftRecaps: z.array(DraftRecapSchema).default([]),
  tradeSuggestions: z.array(TradeSuggestionSchema).default([]),
  ceremonies: z.array(CeremonySchema).default([]),
  dynastyTimeline: z.array(DynastyEventSchema).default([]),
});

export type SaveState = z.infer<typeof SaveStateSchema>;
