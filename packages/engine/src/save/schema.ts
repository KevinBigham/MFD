/**
 * MFD Save Schema — Zod-validated save format
 *
 * Rule 5: Save format is versioned and schema-validated.
 * Old saves MUST load through the migration pipeline.
 */

import { z } from 'zod';
import { createDefaultAchievements } from '../systems/achievements';
import { normalizeGmStrategy } from '../systems/gm-strategies';
import { ACHIEVEMENT_CONDITION_TYPES } from '../types';

const ScoutingRegionSchema = z.enum(['east', 'south', 'midwest', 'west']);
const ProspectRiskBandSchema = z.enum(['unknown', 'safe', 'balanced', 'volatile']);
const ProspectCeilingBandSchema = z.enum(['unknown', 'starter', 'impact', 'star']);
const ProspectCharacterReadSchema = z.enum(['unknown', 'leader', 'steady', 'mercurial', 'red_flag']);
const MarketSizeSchema = z.enum(['small', 'medium', 'large', 'mega']);
const PlayerPositionSchema = z.enum(['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P']);
const GmStrategySchema = z.preprocess(normalizeGmStrategy, z.enum(['rebuild', 'contend', 'neutral']));

export const PersonalitySchema = z.object({
  workEthic: z.number().min(1).max(10),
  loyalty: z.number().min(1).max(10),
  greed: z.number().min(1).max(10),
  pressure: z.number().min(1).max(10),
  ambition: z.number().min(1).max(10),
});

export const BloodlineInfoSchema = z.object({
  parentPlayerId: z.string(),
  parentName: z.string(),
  parentTeamId: z.string(),
  parentPosition: PlayerPositionSchema,
  relationship: z.literal('son').default('son'),
  legacyTag: z.enum(['franchise_royalty', 'famous_name', 'chip_on_shoulder', 'late_bloomer_family']),
});

export const BonusSliceSchema = z.object({
  sourceOp: z.enum(['signing', 'restructure', 'backload', 'extension']),
  season: z.number(),
  amount: z.number(),
});

export const GuaranteeEntrySchema = z.object({
  year: z.number(),
  type: z.enum(['GAS', 'RDG', 'VT']),
  amount: z.number(),
  vestedAt: z.string().optional(),
});

export const ContractYearSchema = z.object({
  year: z.number(),
  baseSalary: z.number(),
  capHit: z.number(),
  deadCap: z.number(),
  guaranteed: z.boolean(),
  guaranteeType: z.enum(['GAS', 'RDG', 'VT']).optional(),
});

export const ContractSchema = z.object({
  playerId: z.string(),
  teamId: z.string(),
  years: z.number(),
  totalValue: z.number(),
  yearlyBreakdown: z.array(ContractYearSchema),
  baseSalary: z.number().optional(),
  guaranteed: z.number(),
  signingBonus: z.number(),
  prorated: z.number().optional(),
  originalYears: z.number().optional(),
  voidYears: z.number(),
  restructured: z.boolean().optional(),
  franchiseTag: z.enum(['exclusive', 'non-exclusive', 'transition']).nullable(),
  incentives: z.array(z.object({
    type: z.string(),
    threshold: z.number(),
    bonus: z.number(),
    achieved: z.boolean(),
  })),
  slices: z.array(BonusSliceSchema).optional(),
  guaranteeSchedule: z.array(GuaranteeEntrySchema).optional(),
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

// NarrativeHook — field set verified against types/franchise.ts and both
// writers (franchise-week-helpers weekly refresh, convention-save seed).
// `type` is a free-form string by design (hooks-engine cat values are an
// open set: dev/owner/injury/draft/streak/playoff_race/...).
export const NarrativeHookSchema = z.object({
  id: z.string(),
  type: z.string(),
  description: z.string(),
  resolved: z.boolean(),
  deadline: z.number(),
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

// WeeklySummary — field set verified against types/sim.ts and the single
// writer (systems/weekly-summary.ts buildWeeklySummary), plus all engine +
// web readers. The v34 golden fixture carries a legacy minimal entry
// (year/week/teamId/headline/result only), so every post-legacy field
// carries a default: modern entries round-trip byte-equal, legacy entries
// parse losslessly with neutral defaults.
export const WeeklyInjurySummarySchema = z.object({
  playerId: z.string(),
  playerName: z.string(),
  severity: z.enum(['questionable', 'doubtful', 'out', 'ir']),
  gamesOut: z.number(),
  type: z.string(),
});

export const WeeklySummarySchema = z.object({
  id: z.string().default(''),
  year: z.number(),
  week: z.number(),
  phase: z.enum(['preseason', 'regular_season', 'playoffs', 'offseason', 'free_agency', 'draft', 'post_draft', 'training_camp']).default('regular_season'),
  teamId: z.string(),
  opponentTeamId: z.string().nullable().default(null),
  opponentName: z.string().default(''),
  result: z.enum(['win', 'loss', 'tie', 'pending']),
  teamScore: z.number().nullable().default(null),
  opponentScore: z.number().nullable().default(null),
  record: z.string().default(''),
  headline: z.string(),
  ownerDelta: z.number().default(0),
  injuries: z.array(WeeklyInjurySummarySchema).default([]),
  mvpPlayerId: z.string().nullable().default(null),
  notes: z.array(z.string()).default([]),
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

// ── Player rivalries ────────────────────────────────────
// Field set verified against types/season.ts PlayerRivalry and the closed
// writer set: player-rivalries.ts detectNewRivalries/decayRivalries build
// and mutate exactly this shape, the convention save seeds one literal of
// the same shape, and franchise-week updaters only touch
// intensity/tier/history. Fixtures carry empty or absent playerRivalries,
// so strict strip is lossless.
export const PlayerRivalryEventSchema = z.object({
  year: z.number(),
  week: z.number(),
  description: z.string(),
  intensityDelta: z.number(),
});

export const PlayerRivalrySchema = z.object({
  id: z.string(),
  playerAId: z.string(),
  playerBId: z.string(),
  playerAName: z.string(),
  playerBName: z.string(),
  teamAId: z.string(),
  teamBId: z.string(),
  intensity: z.number(),
  tier: z.enum(['budding', 'heated', 'nemesis']),
  origin: z.string(),
  history: z.array(PlayerRivalryEventSchema),
  seasonStarted: z.number(),
});

export const BrokenRecordSchema = z.object({
  playerId: z.string(),
  playerName: z.string().default('Unknown Player'),
  teamId: z.string(),
  stat: z.string(),
  newValue: z.number(),
  previousValue: z.number(),
  previousHolder: z.string(),
  category: z.enum(['singleGame', 'singleSeason']),
  year: z.number(),
  week: z.number(),
  narrative: z.string(),
});

export const MilestoneReachedSchema = z.object({
  playerId: z.string(),
  playerName: z.string().default('Unknown Player'),
  stat: z.string(),
  value: z.number(),
  milestoneLabel: z.string(),
  narrative: z.string(),
  year: z.number(),
  week: z.number(),
});

export const RecordChaseSchema = z.object({
  playerId: z.string(),
  playerName: z.string().default('Unknown Player'),
  teamId: z.string(),
  stat: z.string(),
  currentValue: z.number(),
  recordValue: z.number(),
  recordHolder: z.string(),
  pace: z.number(),
  category: z.enum(['singleGame', 'singleSeason', 'career', 'franchise']),
  weeksRemaining: z.number(),
  projected: z.number(),
});

export const NamedGameEventSchema = z.object({
  name: z.string(),
  archetype: z.enum([
    'yard_miracle',
    'dagger',
    'comeback',
    'collapse',
    'heartbreaker',
    'ghost_game',
    'statement',
    'gauntlet_game',
    'snow_bowl',
    'shootout',
    'coin_flip',
    'rout',
  ]),
  gameId: z.string(),
  year: z.number(),
  week: z.number(),
  homeTeamId: z.string(),
  awayTeamId: z.string(),
  winnerTeamId: z.string().nullable(),
  homeScore: z.number(),
  awayScore: z.number(),
  reason: z.string(),
});

export const GameDayPackageSchema = z.object({
  id: z.string(),
  year: z.number(),
  week: z.number(),
  phase: z.enum(['preseason', 'regular_season', 'playoffs', 'offseason', 'free_agency', 'draft', 'post_draft', 'training_camp']),
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
  recordsMoments: z.array(BrokenRecordSchema).default([]),
  milestoneMoments: z.array(MilestoneReachedSchema).default([]),
  callYourShotResult: z.object({
    declaration: z.enum([
      'run_dominant',
      'air_attack',
      'defensive_shutout',
      'total_domination',
      'underdog_special',
    ]),
    success: z.boolean(),
    outcome: z.enum(['hit', 'miss', 'partial']),
    magnitude: z.number(),
    reaction: z.object({
      id: z.string(),
      outcome: z.enum(['hit', 'miss', 'partial']),
      speaker: z.string(),
      speakerType: z.enum(['fan', 'beat_writer', 'analyst', 'locker_room']),
      tone: z.enum(['triumphant', 'sarcastic', 'measured']),
      headline: z.string(),
      quote: z.string(),
    }),
    fanConfidenceDelta: z.number(),
    moraleDelta: z.number(),
    chemistryDelta: z.number(),
    devBonusMultiplier: z.number(),
    headline: z.string(),
    narrative: z.string(),
  }).optional(),
  namedGame: NamedGameEventSchema.optional(),
});

export const GameDayStateSchema = z.object({
  recentPackages: z.array(GameDayPackageSchema),
  latestPackageId: z.string().nullable(),
});

export const ApologyTourBeatKeySchema = z.enum(['fan_letter', 'beat_column', 'owner_email', 'resolution']);

export const ApologyTourThreadSchema = z.object({
  id: z.string(),
  gameId: z.string(),
  teamId: z.string(),
  opponentTeamId: z.string(),
  namedGameName: z.string(),
  archetype: z.enum(['collapse', 'heartbreaker']),
  startedYear: z.number(),
  startedWeek: z.number(),
  status: z.enum(['active', 'resolved', 'escalated']),
  beatsDelivered: z.array(ApologyTourBeatKeySchema).default([]),
});

export const AudioCueSchema = z.object({
  event: z.string(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  timestamp: z.number().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const PressConferenceQueueEntrySchema = z.object({
  conferenceId: z.string(),
  teamId: z.string().nullable(),
  year: z.number(),
  week: z.number(),
  speaker: z.string(),
  topic: z.string(),
  scenario: z.string(),
  responses: z.object({
    high: z.array(z.string()),
    mid: z.array(z.string()),
    low: z.array(z.string()),
  }),
  selectedTier: z.enum(['high', 'mid', 'low']).optional(),
  selectedResponse: z.string().optional(),
});

export const SwitchSuggestionSchema = z.object({
  direction: z.enum(['more_pass', 'more_run', 'more_aggressive', 'slow_down']),
  responseLabel: z.string(),
  summary: z.string(),
  reason: z.string(),
});

export const PendingHalftimeDecisionSchema = z.object({
  teamId: z.string(),
  year: z.number(),
  week: z.number(),
  phase: z.enum(['preseason', 'regular_season', 'playoffs', 'offseason', 'free_agency', 'draft', 'post_draft', 'training_camp']),
  homeTeamId: z.string(),
  awayTeamId: z.string(),
  homeScore: z.number(),
  awayScore: z.number(),
  suggestion: SwitchSuggestionSchema,
});

export const GameSettingsSchema = z.object({
  halftimeDecisions: z.enum(['on', 'off']),
  coachMode: z.boolean().default(false),
});

export const PostGameUiStateSchema = z.object({
  pressConferenceQueue: z.array(PressConferenceQueueEntrySchema).default([]),
  audioCueQueue: z.array(AudioCueSchema).default([]),
  pendingHalftimeDecision: PendingHalftimeDecisionSchema.nullable().default(null),
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

export const CareerEpilogueSchema = z.object({
  playerId: z.string(),
  playerName: z.string(),
  headline: z.string(),
  story: z.string(),
  category: z.enum([
    'broadcasting',
    'coaching',
    'business',
    'entertainment',
    'philanthropy',
    'quiet_life',
    'writing',
    'controversy',
  ]),
});

function normalizeCareerEpilogueInput(raw: unknown): unknown {
  if (raw === undefined) return undefined;
  const result = CareerEpilogueSchema.safeParse(raw);
  return result.success ? result.data : undefined;
}


export const FarewellMomentSchema = z.object({
  week: z.number().int().min(0),
  type: z.enum([
    'standing_ovation',
    'gift_exchange',
    'emotional_speech',
    'final_home_game',
    'final_game',
  ]),
  narrative: z.string(),
  opponent: z.string(),
});

export const FarewellTourSchema = z.object({
  playerId: z.string(),
  playerName: z.string(),
  teamId: z.string(),
  finalSeason: z.boolean(),
  announcedWeek: z.number().int().min(0),
  moments: z.array(FarewellMomentSchema),
});

export const HallOfFameEntrySchema = z.object({
  playerId: z.string(),
  name: z.string(),
  position: PlayerPositionSchema,
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
  epilogue: z.preprocess(normalizeCareerEpilogueInput, CareerEpilogueSchema.optional()),
});

export const HallOfFameBallotEntrySchema = z.object({
  playerId: z.string(),
  name: z.string(),
  position: PlayerPositionSchema,
  score: z.number(),
  yearsOnBallot: z.number().int().min(1).max(5),
  votePct: z.number().min(0).max(100),
});

// ── Player archive (career history vault) ───────────────
// Field set verified against types/franchise.ts PlayerArchiveEntry and the
// closed writer set (history.ts ensureArchiveEntry/syncPlayerArchiveEntry/
// recordPlayerRetirement — the only producers, exact interface shape).
// Reader audit (bloodlines, franchise-legends, roster-identity, web legacy
// screens) stays inside the interface; award/championship extras are
// locally derived, never stored on the entry. careerStats mirrors
// CareerStats' open index signature via catchall; jerseyNumber was
// backfilled by migration 18, retirementYear defaults for the same era.
export const PlayerArchiveTeamStintSchema = z.object({
  teamId: z.string(),
  firstYear: z.number(),
  lastYear: z.number(),
});

export const PlayerArchiveCareerStatsSchema = z.object({
  seasons: z.number(),
  gp: z.number(),
  snaps: z.number(),
}).catchall(z.number());

export const PlayerArchiveEntrySchema = z.object({
  playerId: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  // Same tolerance as PlayerGameLineSchema.name: archived players inherit a
  // possibly-missing derived `name`, which JSON.stringify drops entirely.
  name: z.string().default(''),
  positions: z.array(PlayerPositionSchema),
  jerseyNumber: z.number().nullable().default(null),
  peakOvr: z.number(),
  peakYear: z.number(),
  firstYear: z.number(),
  lastYear: z.number(),
  retirementYear: z.number().nullable().default(null),
  teamHistory: z.array(PlayerArchiveTeamStintSchema),
  careerStats: PlayerArchiveCareerStatsSchema.optional(),
});

function normalizeHallOfFameBallotInput(raw: unknown): unknown {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => HallOfFameBallotEntrySchema.safeParse(entry))
    .filter((result): result is { success: true; data: z.infer<typeof HallOfFameBallotEntrySchema> } => result.success)
    .map((result) => result.data);
}

function normalizeStringArrayInput(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((value): value is string => typeof value === 'string'))].sort((left, right) =>
    left.localeCompare(right));
}

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

// ── Franchise history (per-team season archive) ─────────
// Field set verified against types/franchise.ts FranchiseHistoryEntry and
// both writers: history.ts archiveSeasonHistory emits the full modern
// shape (all five optional fields), while scenario-challenge seeds a
// minimal pre-identity shape without them — so fanbase/prestige/
// attendance/stadiumName/keyStats stay optional exactly as the interface
// declares. playoffFinish is a free-form string (champion /
// missed_playoffs / playoff_team / PLAYOFF_FINISH_LABELS values).
// Fixtures all carry empty franchiseHistory; strict strip is lossless.
export const FranchiseHistoryKeyStatsSchema = z.object({
  totalYards: z.number(),
  pointsFor: z.number(),
  pointsAgainst: z.number(),
});

export const FranchiseHistoryEntrySchema = z.object({
  year: z.number(),
  teamId: z.string(),
  wins: z.number(),
  losses: z.number(),
  ties: z.number(),
  record: z.string(),
  pointDifferential: z.number(),
  playoffFinish: z.string(),
  majorEvents: z.array(z.string()),
  awardsWon: z.array(z.string()),
  recordsBroken: z.array(z.string()),
  fanbase: z.number().optional(),
  prestige: z.number().optional(),
  attendance: z.number().optional(),
  stadiumName: z.string().optional(),
  keyStats: FranchiseHistoryKeyStatsSchema.optional(),
});

export const MediaPowerRankingSchema = z.object({
  teamId: z.string(),
  teamName: z.string(),
  rank: z.number(),
  rankDelta: z.number(),
  score: z.number(),
  blurb: z.string(),
  record: z.string(),
  weekNumber: z.number(),
});

export const PowerRankingSnapshotSchema = z.object({
  weekNumber: z.number(),
  rankings: z.array(MediaPowerRankingSchema).default([]),
});

export const HeadlineSchema = z.object({
  id: z.string(),
  category: z.enum([
    'UPSET',
    'BLOWOUT',
    'COMEBACK',
    'RIVALRY_WIN',
    'INDIVIDUAL_PERFORMANCE',
    'MILESTONE',
    'ROOKIE_BREAKOUT',
  ]),
  weekNumber: z.number(),
  title: z.string(),
  summary: z.string(),
  teamIds: z.array(z.string()).default([]),
  playerId: z.string().nullable(),
  gameId: z.string().nullable(),
  importance: z.number(),
});

export const HotTakeSchema = z.object({
  id: z.string(),
  weekNumber: z.number(),
  headlineId: z.string(),
  analyst: z.string(),
  angle: z.string(),
  quote: z.string(),
  sentiment: z.enum(['supportive', 'skeptical', 'combative']),
});

export const WeeklyDigestSchema = z.object({
  weekNumber: z.number(),
  powerRankings: z.array(MediaPowerRankingSchema).default([]),
  headlines: z.array(HeadlineSchema).default([]),
  hotTakes: z.array(HotTakeSchema).default([]),
});

export const MediaCycleStateSchema = z.object({
  weeklyDigests: z.array(WeeklyDigestSchema).default([]),
  powerRankingHistory: z.array(PowerRankingSnapshotSchema).default([]),
});

export const StorylineMetadataValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

export const StorylineBeatSchema = z.object({
  label: z.string(),
  summary: z.string(),
  weekNumber: z.number(),
  year: z.number(),
});

export const StorylineThreadSchema = z.object({
  id: z.string(),
  key: z.string(),
  archetype: z.enum([
    'hot-seat-coach',
    'qb-controversy',
    'rookie-of-year-chase',
    'records-chase',
    'comeback-player',
  ]),
  title: z.string(),
  summary: z.string(),
  teamIds: z.array(z.string()).default([]),
  playerIds: z.array(z.string()).default([]),
  startWeek: z.number(),
  startYear: z.number(),
  weeksActive: z.number(),
  status: z.enum(['active', 'closed']),
  beats: z.array(StorylineBeatSchema).default([]),
  heat: z.number(),
  nextBeatHint: z.string().nullable(),
  beatIndex: z.number(),
  updatedWeek: z.number(),
  updatedYear: z.number(),
  closeReason: z.string().nullable(),
  metadata: z.record(z.string(), StorylineMetadataValueSchema).default({}),
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

export const StadiumDealSchema = z.object({
  sponsorName: z.string(),
  revenuePerYear: z.number(),
  yearsTotal: z.number(),
  yearsRemaining: z.number(),
  prestigeBonus: z.number(),
});

export const FranchiseIdentitySchema = z.object({
  fanbase: z.number(),
  prestige: z.number(),
  marketSize: MarketSizeSchema,
  marketModifier: z.number(),
  stadiumName: z.string(),
  stadiumDeal: StadiumDealSchema.nullable(),
  stadiumLevel: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  attendance: z.number(),
  relocationHistory: z.array(z.object({
    fromCity: z.string(),
    fromName: z.string(),
    toCity: z.string(),
    toName: z.string(),
    year: z.number(),
  })),
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
  metric: z.enum(['wins', 'playoff', 'starter', 'trade_block', 'spending', 'draft_position', 'on_roster', 'restructure', 'owner_mandate']),
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

export const DeadlineDealSchema = z.object({
  id: z.string(),
  teams: z.tuple([z.string(), z.string()]),
  players: z.array(z.string()),
  picks: z.array(z.string()),
  pickIds: z.array(z.string()).optional(),
  timestamp: z.number(),
  grade: z.string(),
  splash: z.boolean(),
  narrative: z.string(),
});

export const TradeDeadlineStateSchema = z.object({
  isDeadlineWeek: z.boolean(),
  minutesRemaining: z.number(),
  completedDeals: z.array(DeadlineDealSchema),
  scheduledDeals: z.array(DeadlineDealSchema).optional(),
  pendingOffers: z.array(TradeOfferSchema),
  urgencyLevel: z.enum(['calm', 'heating_up', 'frantic', 'buzzer_beater']),
  tickerMessages: z.array(z.string()),
});

export const NewsItemSchema = z.object({
  id: z.string(),
  year: z.number(),
  week: z.number(),
  type: z.enum(['trade', 'signing', 'cut', 'injury', 'record', 'coaching', 'rivalry', 'milestone', 'draft', 'waiver', 'governance', 'labor']),
  headline: z.string(),
  body: z.string(),
  teamIds: z.array(z.string()),
  playerIds: z.array(z.string()),
  importance: z.enum(['breaking', 'major', 'minor']),
});

export const SocialPostSchema = z.object({
  id: z.string(),
  source: z.enum(['player', 'fan', 'analyst', 'reporter', 'team']),
  authorName: z.string(),
  authorPlayerId: z.string().optional(),
  content: z.string(),
  trigger: z.enum(['big_play', 'record', 'trade', 'signing', 'injury', 'draft_pick', 'achievement', 'upset', 'rivalry', 'milestone', 'weekly', 'governance', 'labor']),
  sentiment: z.enum(['positive', 'negative', 'neutral', 'hype', 'sarcastic']),
  likes: z.number(),
  timestamp: z.number(),
  replyTo: z.string().optional(),
});

export const LeagueRuleKeySchema = z.enum([
  'salary_cap_growth',
  'cap_floor_pct',
  'franchise_tag_limit',
  'roster_limit',
  'practice_squad_size',
  'playoff_seeds_per_conf',
  'schedule_weeks',
  'trade_deadline_week',
  'ir_return_limit',
  'overtime_format',
  'min_salary_scale',
  'revenue_split',
  'draft_rounds',
  'comp_pick_limit',
  'tag_types_allowed',
]);

export const LeagueRuleValueSchema = z.union([
  z.number(),
  z.string(),
  z.boolean(),
  z.array(z.number()),
  z.array(z.enum(['exclusive', 'non-exclusive', 'transition'])),
]);

export const RuleChangeRecordSchema = z.object({
  key: LeagueRuleKeySchema,
  previousValue: LeagueRuleValueSchema,
  newValue: LeagueRuleValueSchema,
  source: z.enum(['initial', 'cba', 'commissioner_vote', 'owners_vote']),
  proposedBy: z.string(),
  effectiveYear: z.number(),
  rationale: z.string(),
});

export const LeagueRuleSchema = z.object({
  key: LeagueRuleKeySchema,
  value: LeagueRuleValueSchema,
  effectiveYear: z.number(),
  source: z.enum(['initial', 'cba', 'commissioner_vote', 'owners_vote']),
  previousValue: LeagueRuleValueSchema,
});

export const LeagueRulesSchema = z.object({
  initializedYear: z.number(),
  entries: z.record(LeagueRuleKeySchema, LeagueRuleSchema),
  history: z.array(RuleChangeRecordSchema),
});

export const CBATermsSchema = z.object({
  revenueSplit: z.number(),
  capGrowthRate: z.number(),
  capFloorPct: z.number(),
  minSalaryScale: z.array(z.number()),
  franchiseTagLimit: z.number(),
  tagTypesAllowed: z.array(z.enum(['exclusive', 'non-exclusive', 'transition'])),
  rosterLimit: z.number(),
  practiceSquadSize: z.number(),
  irReturnLimit: z.number(),
  playoffSeeds: z.number(),
  draftRounds: z.number(),
});

export const CBAAmendmentSchema = z.object({
  year: z.number(),
  summary: z.string(),
  changes: z.array(RuleChangeRecordSchema),
});

export const CBADealSchema = z.object({
  id: z.string(),
  startYear: z.number(),
  endYear: z.number(),
  duration: z.number(),
  terms: CBATermsSchema,
  ratifiedBy: z.enum(['owners', 'players', 'both']),
  amendments: z.array(CBAAmendmentSchema),
});

export const CBAProposalSchema = z.object({
  id: z.string(),
  side: z.enum(['owners', 'players']),
  year: z.number(),
  round: z.number(),
  rationale: z.string(),
  terms: CBATermsSchema,
});

export const CBAEvaluationSchema = z.object({
  side: z.enum(['owners', 'players']),
  score: z.number(),
  concessions: z.array(z.string()),
  painPoints: z.array(z.string()),
});

export const NegotiationStateSchema = z.object({
  round: z.number(),
  ownersProposal: CBAProposalSchema.nullable(),
  playersProposal: CBAProposalSchema.nullable(),
  currentProposal: CBAProposalSchema.nullable(),
  gap: z.number(),
  mediator: z.boolean(),
  publicPressure: z.number(),
  ownerVotes: z.record(z.string(), z.enum(['approve', 'reject', 'abstain'])),
  userVote: z.enum(['approve', 'reject', 'abstain']).nullable(),
});

export const CBAStateSchema = z.object({
  status: z.enum(['active', 'expiring', 'expired', 'negotiating', 'awaiting_owner_vote', 'lockout']),
  currentDeal: CBADealSchema.nullable(),
  negotiationState: NegotiationStateSchema.nullable(),
  history: z.array(CBADealSchema),
  lockoutRisk: z.number(),
  lastNegotiationYear: z.number().nullable(),
});

export const RuleProposalSchema = z.object({
  id: z.string(),
  ruleKey: LeagueRuleKeySchema,
  currentValue: LeagueRuleValueSchema,
  proposedValue: LeagueRuleValueSchema,
  rationale: z.string(),
  source: z.enum(['commissioner', 'owner_petition']),
  votes: z.record(z.string(), z.enum(['yes', 'no', 'abstain'])),
  requiredMajority: z.number(),
  deadline: z.number(),
  effectiveYear: z.number(),
  proposedByTeamId: z.string().nullable(),
});

export const VoteResultSchema = z.object({
  proposalId: z.string(),
  passed: z.boolean(),
  yesVotes: z.number(),
  noVotes: z.number(),
  abstains: z.number(),
  effectiveYear: z.number(),
  ruleKey: LeagueRuleKeySchema,
  proposedValue: LeagueRuleValueSchema,
});

function normalizeCommissionerRulingInput(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const ruling = { ...(raw as Record<string, unknown>) };

  if (typeof ruling['rationale'] !== 'string' && typeof ruling['description'] === 'string') {
    ruling['rationale'] = ruling['description'];
  }
  if (typeof ruling['ownerApprovalImpact'] !== 'number' && typeof ruling['approvalImpact'] === 'number') {
    ruling['ownerApprovalImpact'] = ruling['approvalImpact'];
  }
  if (typeof ruling['chemistryImpact'] !== 'number') {
    ruling['chemistryImpact'] = 0;
  }
  if (typeof ruling['playerName'] !== 'string') {
    ruling['playerName'] = '';
  }

  delete ruling['description'];
  delete ruling['approvalImpact'];
  return ruling;
}

export const CommissionerRulingSchema = z.preprocess(normalizeCommissionerRulingInput, z.object({
  id: z.string(),
  year: z.number(),
  week: z.number(),
  type: z.enum(['fine', 'warning', 'suspension']),
  playerId: z.string().nullable(),
  playerName: z.string(),
  teamId: z.string().nullable(),
  headline: z.string(),
  rationale: z.string(),
  moraleImpact: z.number(),
  chemistryImpact: z.number(),
  ownerApprovalImpact: z.number(),
}));

export const CommissionerStateSchema = z.object({
  name: z.string(),
  personality: z.enum(['progressive', 'traditionalist', 'populist']),
  tenure: z.number(),
  approval: z.number(),
  activeProposals: z.array(RuleProposalSchema),
  history: z.array(VoteResultSchema),
  rulings: z.array(CommissionerRulingSchema),
  lowApprovalYears: z.number(),
});

export const BreakingNewsEventSchema = z.object({
  headline: z.string(),
  detail: z.string(),
  source: z.enum(['MFSN INSIDER', 'MFSN BREAKING', 'LEAGUE OFFICE', 'INJURY REPORT']),
  priority: z.enum(['high', 'critical']),
});

export const OwnerPersonalityEventSchema = z.object({
  archetypeId: z.enum(['win_now', 'patient_builder', 'profit_first', 'fan_favorite', 'legacy_builder']),
  label: z.string(),
  desc: z.string(),
  moodDelta: z.number(),
  moraleDelta: z.number(),
});

export const GrievanceSchema = z.object({
  playerId: z.string(),
  type: z.enum(['tag_dispute', 'salary_grievance', 'discipline_appeal']),
  filed: z.number(),
  resolved: z.number().nullable(),
  outcome: z.enum(['upheld', 'denied', 'settled']).nullable(),
});

export const WorkStoppageSchema = z.object({
  type: z.enum(['holdout_wave', 'practice_boycott', 'lockout']),
  severity: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  startWeek: z.number(),
  resolvedWeek: z.number().nullable(),
  affectedTeams: z.array(z.string()),
  moralePenalty: z.number(),
});

export const LaborEventSchema = z.object({
  type: z.enum(['union_statement', 'owner_response', 'media_leak', 'mediation_call']),
  description: z.string(),
  impact: z.object({
    satisfaction: z.number().optional(),
    morale: z.number().optional(),
  }),
});

export const LaborStateSchema = z.object({
  unionSatisfaction: z.number(),
  playerRepId: z.string().nullable(),
  grievances: z.array(GrievanceSchema),
  activeStoppage: WorkStoppageSchema.nullable(),
  laborEvents: z.array(LaborEventSchema),
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

const AchievementConditionTypeSchema = z.enum(ACHIEVEMENT_CONDITION_TYPES);
const DEFAULT_ACHIEVEMENTS_BY_ID = new Map(createDefaultAchievements().map((achievement) => [achievement.id, achievement]));

export const AchievementConditionSchema = z.object({
  type: AchievementConditionTypeSchema,
  threshold: z.union([z.number(), z.string(), z.boolean()]),
});

const AchievementObjectSchema = z.object({
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

function normalizeAchievementInput(raw: unknown): unknown | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const achievement = { ...(raw as Record<string, unknown>) };
  const catalogAchievement = typeof achievement['id'] === 'string'
    ? DEFAULT_ACHIEVEMENTS_BY_ID.get(achievement['id'])
    : undefined;
  const condition = achievement['condition'];

  if (!condition || typeof condition !== 'object' || Array.isArray(condition)) {
    if (!catalogAchievement) return null;
    achievement['condition'] = catalogAchievement.condition;
    return achievement;
  }

  const conditionRecord = { ...(condition as Record<string, unknown>) };
  const typeResult = AchievementConditionTypeSchema.safeParse(conditionRecord['type']);
  if (!typeResult.success) {
    if (!catalogAchievement) return null;
    achievement['condition'] = catalogAchievement.condition;
    return achievement;
  }

  const threshold = conditionRecord['threshold'];
  if (typeof threshold !== 'number' && typeof threshold !== 'string' && typeof threshold !== 'boolean') {
    if (!catalogAchievement) return null;
    achievement['condition'] = catalogAchievement.condition;
    return achievement;
  }

  achievement['condition'] = {
    type: typeResult.data,
    threshold,
  };
  return achievement;
}

function normalizeAchievementListInput(raw: unknown): unknown {
  if (!Array.isArray(raw)) return raw;
  return raw
    .map((achievement) => normalizeAchievementInput(achievement))
    .filter((achievement): achievement is NonNullable<typeof achievement> => achievement !== null);
}

export const AchievementSchema = z.preprocess(normalizeAchievementInput, AchievementObjectSchema);
export const AchievementsSchema = z.preprocess(normalizeAchievementListInput, z.array(AchievementSchema));

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

export const OwnerMandateProgressSchema = z.object({
  value: z.number(),
  target: z.number(),
  percent: z.number(),
  label: z.string(),
  detail: z.string(),
  status: z.enum(['on_track', 'at_risk', 'complete', 'failed']),
  agmNote: z.string().nullable().optional(),
});

export const OwnerMandateEvaluationSchema = z.object({
  evaluatedYear: z.number(),
  met: z.boolean(),
  exceeded: z.boolean(),
  outcomeLabel: z.string(),
  summary: z.string(),
  approvalDelta: z.number(),
  patienceDelta: z.number(),
  ownerReputationDelta: z.number(),
  applied: z.boolean(),
  agmAdjustment: z.string().nullable().optional(),
});

export const OwnerMandateSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  year: z.number(),
  goalId: z.string(),
  label: z.string(),
  description: z.string(),
  slot: z.enum(['floor', 'target', 'ceiling']),
  selectedIndex: z.number(),
  createdWeek: z.number(),
  createdByAGMProfileId: z.string().nullable().optional(),
  status: z.enum(['active', 'met', 'exceeded', 'missed']),
  progress: OwnerMandateProgressSchema,
  evaluation: OwnerMandateEvaluationSchema.nullable().optional(),
});

export const GameEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  timestamp: z.number(),
  description: z.string(),
  data: z.record(z.unknown()),
});

export const GamePlanSchema = z.object({
  offensiveScheme: z.enum(['balanced', 'pass_heavy', 'run_heavy', 'spread', 'power']),
  defensiveScheme: z.enum(['base', 'blitz_heavy', 'coverage', 'contain', 'aggressive']),
  keyMatchup: z.object({
    playerA: z.string(),
    playerB: z.string(),
  }).nullable(),
  gamePlanBonus: z.number(),
  contingencyRules: z.array(z.object({
    id: z.string(),
    trigger: z.enum([
      'trailing_14_at_half',
      'trailing_7_at_half',
      'leading_14_at_half',
      'opponent_scores_opening',
      'turnover_deficit_2',
      'wind_over_15',
      'down_by',
      'up_by',
      'end_of_q2_losing',
      'two_minute_warning_one_score',
      'opponent_td_lead_after_halftime',
    ]),
    threshold: z.union([z.literal(7), z.literal(14), z.literal(21)]).optional(),
    response: z.enum([
      'go_air_raid',
      'kill_clock',
      'go_for_it_on_4th',
      'run_heavy',
      'pressure_every_down',
      'prevent_defense_off',
    ]).optional(),
    action: z.discriminatedUnion('type', [
      z.object({
        type: z.literal('switch_offense'),
        scheme: z.enum(['balanced', 'pass_heavy', 'run_heavy', 'spread', 'power']),
      }),
      z.object({
        type: z.literal('switch_defense'),
        scheme: z.enum(['base', 'blitz_heavy', 'coverage', 'contain', 'aggressive']),
      }),
      z.object({
        type: z.literal('go_aggressive'),
      }),
      z.object({
        type: z.literal('go_conservative'),
      }),
    ]).optional(),
    label: z.string(),
    description: z.string(),
    legacy: z.boolean().optional(),
  })).optional(),
  trickPlays: z.array(z.string()).optional(),
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

export const AllDecadeTeamEntrySchema = z.object({
  playerId: z.string(),
  playerName: z.string(),
  pos: z.enum(['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P']),
  peakOvr: z.number(),
  seasonsWithTeam: z.number(),
  highlights: z.array(z.string()),
});

export const AllDecadeTeamSchema = z.object({
  id: z.string(),
  decade: z.string(),
  startYear: z.number(),
  endYear: z.number(),
  teamId: z.string(),
  roster: z.array(AllDecadeTeamEntrySchema),
  headline: z.string(),
});

export const ExpansionDraftStateSchema = z.object({
  expansionTeam: z.object({
    city: z.string(),
    name: z.string(),
    abbr: z.string(),
    conference: z.enum(['AFC', 'NFC']),
    division: z.string(),
  }),
  protectedPlayers: z.record(z.string(), z.array(z.string())),
  availablePlayers: z.array(z.lazy(() => PlayerSchema)),
  selectedPlayers: z.array(z.lazy(() => PlayerSchema)),
  picksRemaining: z.number(),
  phase: z.enum(['protection', 'drafting', 'complete']),
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

export const CoordinatorSpecialtySchema = z.object({
  id: z.string(),
  label: z.string(),
  icon: z.string(),
  effect: z.record(z.string(), z.number()),
  desc: z.string(),
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
  specialty75: CoordinatorSpecialtySchema.nullable().optional(),
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
  contingencyRules: GamePlanSchema.shape.contingencyRules.default([]),
  trickPlays: z.array(z.string()).default([]),
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

export const ScenarioObjectiveSchema = z.object({
  id: z.string(),
  description: z.string(),
  type: z.enum(['wins', 'championship', 'cap_space', 'roster_ovr', 'draft_pick', 'record', 'playoffs', 'custom']),
  target: z.number(),
  completed: z.boolean(),
});

export const ScenarioConstraintsSchema = z.object({
  blockTrades: z.boolean().default(false),
  blockFreeAgency: z.boolean().default(false),
  blockDraft: z.boolean().default(false),
  forcedDifficulty: z.enum(['rookie', 'pro', 'allpro', 'legend']).optional(),
});

export const ScenarioDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  tagline: z.string(),
  description: z.string(),
  difficulty: z.enum(['rookie', 'pro', 'all_pro', 'hall_of_fame']),
  seasonLimit: z.number(),
  objectives: z.array(ScenarioObjectiveSchema),
  bonusObjectives: z.array(ScenarioObjectiveSchema),
  constraints: ScenarioConstraintsSchema,
});

export const ScenarioStateSchema = z.object({
  activeScenario: ScenarioDefinitionSchema.optional(),
  scenarioSeason: z.number(),
  completedScenarios: z.array(z.object({
    id: z.string(),
    score: z.number(),
    grade: z.string(),
  })),
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

// ── GameResult island (schema hardening island 1) ────────
// Types ScheduledGame.result against the real GameResult shape in
// types/sim.ts. Legacy tolerance: fields introduced after early save
// versions carry defaults so old saves keep parsing; heavy nested event
// payloads (broadcast, snapEvents, callYourShotResult, namedGame) stay
// optional and are hardened as their own islands in later patches.
export const PlayerGameLineSchema = z.object({
  playerId: z.string(),
  // Players can legitimately lack a derived `name` at runtime (see
  // living-player-story / record-tracker tests); JSON.stringify then drops
  // the undefined, so a required string here rejects real autosaves.
  name: z.string().default(''),
  pos: PlayerPositionSchema,
  passAtt: z.number().optional(),
  passComp: z.number().optional(),
  passYds: z.number().optional(),
  passTD: z.number().optional(),
  passINT: z.number().optional(),
  sacked: z.number().optional(),
  rushAtt: z.number().optional(),
  rushYds: z.number().optional(),
  rushTD: z.number().optional(),
  fumbles: z.number().optional(),
  targets: z.number().optional(),
  rec: z.number().optional(),
  recYds: z.number().optional(),
  recTD: z.number().optional(),
  tackles: z.number().optional(),
  sacks: z.number().optional(),
  defINT: z.number().optional(),
  fgAtt: z.number().optional(),
  fgMade: z.number().optional(),
  snaps: z.number().optional(),
});

export const TeamGameStatsSchema = z.object({
  totalYards: z.number().default(0),
  passingYards: z.number().default(0),
  rushingYards: z.number().default(0),
  turnovers: z.number().default(0),
  sacks: z.number().default(0),
  pressuresAllowed: z.number().default(0),
  thirdDownConversions: z.number().default(0),
  thirdDownAttempts: z.number().default(0),
  timeOfPossession: z.number().default(0),
  passAttempts: z.number().default(0),
  passCompletions: z.number().default(0),
  passTDs: z.number().default(0),
  interceptions: z.number().default(0),
  rushAttempts: z.number().default(0),
  rushTDs: z.number().default(0),
  fumbles: z.number().default(0),
  penalties: z.number().default(0),
  penaltyYards: z.number().default(0),
  fgMade: z.number().default(0),
  fgAttempted: z.number().default(0),
  punts: z.number().default(0),
  drives: z.number().default(0),
  yacYards: z.number().default(0),
  redZoneTrips: z.number().default(0),
  redZoneScores: z.number().default(0),
  quarterScores: z.array(z.number()).default([]),
  playerLines: z.array(PlayerGameLineSchema).default([]),
});

export const PlayerMatchupEventSchema = z.object({
  type: z.enum(['interception', 'sack', 'fumble']),
  offensePlayerId: z.string(),
  defensePlayerId: z.string(),
  quarter: z.number(),
});

export const MatchupHighlightSchema = z.object({
  label: z.string(),
  detail: z.string(),
  teamId: z.string(),
  playerId: z.string().nullable(),
  opponentPlayerId: z.string().nullable(),
  advantage: z.number(),
});

export const GameResultSchema = z.object({
  id: z.string(),
  homeTeamId: z.string(),
  awayTeamId: z.string(),
  homeScore: z.number(),
  awayScore: z.number(),
  week: z.number(),
  year: z.number(),
  overtime: z.boolean().default(false),
  mvpPlayerId: z.string().nullable().default(null),
  stats: z.record(TeamGameStatsSchema).default({}),
  weather: z.enum(['dome', 'clear', 'rain', 'snow', 'wind']).nullable().optional(),
  matchupHighlight: MatchupHighlightSchema.nullable().optional(),
  broadcastNetwork: z.enum(['MFN', 'ESPN8', 'FOX8', 'CBS8', 'NBC8']).nullable().optional(),
  broadcast: z.any().optional(),
  primetime: z.boolean().optional(),
  flexed: z.boolean().optional(),
  specialTeams: z.record(SpecialTeamsGameSummarySchema).optional(),
  playerMatchupEvents: z.array(PlayerMatchupEventSchema).default([]),
  snapEvents: z.array(z.any()).optional(),
  snapLedgerMode: z.enum(['shadow', 'canonical']).optional(),
  healthyStarterShortages: z.record(z.number()).optional(),
  healthyStarterShortagesByTeam: z.record(z.record(z.number())).optional(),
  callYourShotResult: z.any().optional(),
  namedGame: z.any().optional(),
  contingencyActivations: z.array(z.object({
    teamId: z.string(),
    ruleId: z.string(),
    label: z.string(),
    triggerLabel: z.string().optional(),
    responseLabel: z.string().optional(),
    quarter: z.number(),
    callout: z.string().nullable().optional(),
  })).optional(),
});

export const ScheduledGameSchema = z.object({
  homeTeamId: z.string(),
  awayTeamId: z.string(),
  result: GameResultSchema.nullable(),
  weather: z.enum(['dome', 'clear', 'rain', 'snow', 'wind']).nullable().optional(),
  flexed: z.boolean().default(false),
  primetime: z.boolean().default(false),
  broadcastNetwork: z.enum(['MFN', 'ESPN8', 'FOX8', 'CBS8', 'NBC8']).nullable().default(null),
});

export const ScheduleWeekSchema = z.object({
  week: z.number(),
  games: z.array(ScheduledGameSchema),
});

// ── Playoff bracket ─────────────────────────────────────
// Field set verified against types/schedule.ts and the closed writer pair
// (seedPlayoffBracket / advancePlayoffBracket in systems/playoff-bracket.ts):
// toSeed and createMatchup emit exactly these shapes, and advance only fills
// winnerTeamId/result. All golden fixtures carry playoffBracket: null, so
// strict strip is lossless. matchup.result is a GameResult payload — it is
// typed by island 1's GameResultSchema (PR #82); wire it here in a one-line
// follow-up once that island lands, rather than stacking this patch on it.
export const PlayoffSeedSchema = z.object({
  seed: z.number(),
  teamId: z.string(),
  conference: z.enum(['AFC', 'NFC']),
  division: z.string(),
  divisionWinner: z.boolean(),
  wins: z.number(),
  losses: z.number(),
  ties: z.number(),
  pointDifferential: z.number(),
});

export const PlayoffMatchupSchema = z.object({
  id: z.string(),
  round: z.enum(['wild_card', 'divisional', 'conference', 'super_bowl']),
  conference: z.enum(['AFC', 'NFC', 'NFL']),
  week: z.number(),
  homeTeamId: z.string(),
  awayTeamId: z.string(),
  winnerTeamId: z.string().nullable(),
  result: z.any().nullable(),
});

export const PlayoffBracketSchema = z.object({
  season: z.number(),
  afc: z.array(PlayoffSeedSchema),
  nfc: z.array(PlayoffSeedSchema),
  matchups: z.array(PlayoffMatchupSchema),
  championTeamId: z.string().nullable(),
});

function normalizeTutorialStepInput(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const step = raw as Record<string, unknown>;
  if (step['id'] !== 'week1-briefing') return raw;

  const hasLegacyBriefingRoute = step['targetScreen'] === '/briefing'
    || step['targetElement'] === '[data-nav="/briefing"]'
    || step['action'] === 'screen:/briefing';

  if (!hasLegacyBriefingRoute) return raw;

  return {
    ...step,
    targetScreen: '/',
    targetElement: '[data-nav="/"]',
    action: 'screen:/',
  };
}

export const TutorialStepSchema = z.preprocess(normalizeTutorialStepInput, z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  targetScreen: z.string(),
  targetElement: z.string().nullable(),
  action: z.string().nullable(),
  completed: z.boolean(),
}));

export const TutorialStateSchema = z.object({
  active: z.boolean(),
  currentStepIndex: z.number(),
  steps: z.array(TutorialStepSchema),
  completedSteps: z.array(z.string()),
  dismissed: z.boolean(),
  // Sprint 43: first-visit tracker for AGM contextual tips.
  // Default [] keeps old (< v31) saves loading without shape errors.
  visitedScreens: z.array(z.string()).default([]),
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
  type: z.enum(['championship', 'draft_pick', 'trade', 'signing', 'firing', 'record', 'award', 'hof', 'milestone', 'named_game']),
  headline: z.string(),
  importance: z.enum(['landmark', 'major', 'minor']),
  playerIds: z.array(z.string()),
  teamIds: z.array(z.string()),
  namedGame: NamedGameEventSchema.optional(),
});

export const EarnedDoctrineSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  origin: z.string(),
  bonus: z.string(),
  category: z.enum(['culture', 'strategy', 'reputation', 'personnel']),
  earnedYear: z.number().int().min(1900),
  earnedWeek: z.number().int().min(0),
});

export const NearMissEntrySchema = z.object({
  type: z.enum(['declined_trade', 'passed_pick', 'missed_fa']),
  playerName: z.string(),
  playerOvr: z.number(),
  description: z.string(),
  outcome: z.string(),
});

export const NearMissTrackerSchema = z.object({
  declinedTrades: z.array(z.object({
    playerName: z.string(),
    playerOvr: z.number(),
    partnerTeamName: z.string(),
    week: z.number(),
  })).default([]),
  passedPicks: z.array(z.object({
    playerName: z.string(),
    playerOvr: z.number(),
    round: z.number(),
    pickNumber: z.number(),
    draftedByTeam: z.string(),
  })).default([]),
  missedFAs: z.array(z.object({
    playerName: z.string(),
    playerOvr: z.number(),
    signedWithTeam: z.string(),
    position: z.string(),
  })).default([]),
});

export const ShotDeclarationSchema = z.enum([
  'run_dominant',
  'air_attack',
  'defensive_shutout',
  'total_domination',
  'underdog_special',
]);

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

export const EndorsementRequirementSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('min_ovr'), value: z.number() }),
  z.object({ type: z.literal('min_games'), value: z.number() }),
  z.object({ type: z.literal('no_suspension'), value: z.literal(true) }),
  z.object({ type: z.literal('team_wins'), value: z.number() }),
]);

export const EndorsementDealSchema = z.object({
  id: z.string(),
  playerId: z.string(),
  brandName: z.string(),
  revenuePerYear: z.number(),
  yearsTotal: z.number(),
  yearsRemaining: z.number(),
  tier: z.enum(['local', 'regional', 'national', 'global']),
  moraleBonus: z.number(),
  requirement: EndorsementRequirementSchema,
  active: z.boolean().default(true),
});

function sanitizeEndorsementDeals(raw: unknown): unknown[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((deal) => EndorsementDealSchema.safeParse(deal).success);
}

export const EndorsementDealsSchema = z.preprocess(
  sanitizeEndorsementDeals,
  z.array(EndorsementDealSchema),
);

export const PlayerSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  pos: PlayerPositionSchema,
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
  cliqueId: z.union([z.literal(0), z.literal(1), z.literal(2)]).nullable().default(null),
  jerseyNumber: z.number().default(0),
  endorsements: EndorsementDealsSchema,
  agentId: z.string().nullable().default(null),
  bloodline: BloodlineInfoSchema.nullable().default(null),
});

// Sprint 45 "The Family Tree" — league-wide relationship graph edge.
export const RelationshipEdgeSchema = z.object({
  id: z.string(),
  fromId: z.string(),
  toId: z.string(),
  type: z.enum(['mentor', 'rival', 'teammate', 'family', 'coach_tree']),
  year: z.number(),
  strength: z.number(),
  note: z.string().optional(),
});

export const StoryArcBeatSchema = z.object({
  stage: z.string(),
  year: z.number(),
  note: z.string(),
  narrativeText: z.string(),
});

export const LeagueStoryArcSchema = z.object({
  id: z.string(),
  type: z.enum(['rebuild', 'contender_window', 'collapse', 'dynasty_run', 'cinderella']),
  teamId: z.string(),
  startYear: z.number(),
  endYear: z.number().nullable(),
  currentStage: z.string(),
  stageHistory: z.array(StoryArcBeatSchema).default([]),
});

export const LeagueEventSchema = z.object({
  id: z.string(),
  seasonWeek: z.object({ year: z.number(), week: z.number() }),
  type: z.enum(['signing', 'trade', 'cut', 'draft_pick', 'injury', 'firing', 'hiring', 'award', 'record', 'press_conference', 'game', 'trick_play', 'snap', 'legacy']),
  actors: z.object({
    teamIds: z.array(z.string()),
    playerIds: z.array(z.string()),
    staffIds: z.array(z.string()),
  }),
  payload: z.record(z.string(), z.unknown()),
  causeIds: z.array(z.string()),
});

export const DecisionReceiptSchema = z.object({
  id: z.string(),
  seasonWeek: z.object({ year: z.number(), week: z.number() }),
  teamId: z.string().nullable(),
  decision: z.string(),
  drivers: z.array(z.object({
    label: z.string(),
    value: z.union([z.number(), z.string(), z.boolean()]),
    detail: z.string(),
  })),
  outcome: z.string(),
  counterfactual: z.string(),
  eventRefs: z.array(z.string()),
});

export const FranchisePlanSchema = z.object({
  teamId: z.string(),
  windowYears: z.tuple([z.number(), z.number()]),
  ownerMandate: z.string(),
  capPosture: z.enum(['preserve', 'balanced', 'spend']),
  priorityPositions: z.array(z.enum(['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P'])),
  protectedAssets: z.array(z.string()),
  expendableAssets: z.array(z.string()),
  draftCapitalStrategy: z.enum(['accumulate', 'balanced', 'trade_up']),
  riskTolerance: z.number(),
  changeTriggers: z.array(z.string()),
  publicNarrative: z.string(),
  planHistory: z.array(z.object({
    year: z.number(),
    week: z.number(),
    trigger: z.string(),
    summary: z.string(),
  })),
  lastUpdatedYear: z.number(),
});

export const PressMemoryTagSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  year: z.number(),
  week: z.number(),
  tag: z.enum(['bold', 'measured', 'deflecting']),
  quote: z.string(),
  receiptId: z.string(),
});

export const GameCapsuleSchema = z.object({
  id: z.string(),
  gameId: z.string(),
  year: z.number(),
  week: z.number(),
  teamIds: z.tuple([z.string(), z.string()]),
  score: z.tuple([z.number(), z.number()]),
  turningPoint: z.string(),
  keyPlayEventIds: z.array(z.string()),
  receiptIds: z.array(z.string()),
  starPlayerIds: z.array(z.string()),
  summary: z.string(),
});

export const DynastyMemoryGraphSchema = z.object({
  nodes: z.array(z.object({
    id: z.string(),
    kind: z.enum(['person', 'game', 'decision', 'rivalry', 'team']),
    label: z.string(),
    eventRefs: z.array(z.string()),
  })),
  edges: z.array(z.object({
    id: z.string(),
    fromId: z.string(),
    toId: z.string(),
    kind: z.enum(['played', 'decided', 'affected', 'rivaled', 'remembered']),
    weight: z.number(),
  })),
});

export const TeamPersistedSchema = z.object({
  philosophy: z.enum(['rebuild', 'contend', 'maintain', 'fire_sale']).default('maintain'),
  gmStrategy: GmStrategySchema,
}).passthrough();

// ── Owner island (schema hardening island 2) ─────────────
// Types GameState.owners entries against the real Owner interface in
// types/franchise.ts. Both writers (convention-save createOwner,
// franchise-setup ensureOwnerRecord) produce exactly this shape. Goals and
// personality gain defaults for legacy-era entries that predate them, and
// .passthrough() preserves any historical extra keys so round-trips can
// never destroy owner data.
export const OwnerSeasonGoalsSchema = z.object({
  floor: z.string().default(''),
  target: z.string().default(''),
  ceiling: z.string().default(''),
});

export const OwnerPersonalitySchema = z.object({
  spending: z.number().default(5),
  patience: z.number().default(5),
  mediaAwareness: z.number().default(5),
});

export const OwnerSchema = z.object({
  id: z.string(),
  name: z.string(),
  archetype: z.string(),
  patience: z.number().default(50),
  goals: OwnerSeasonGoalsSchema.default({ floor: '', target: '', ceiling: '' }),
  personality: OwnerPersonalitySchema.default({ spending: 5, patience: 5, mediaAwareness: 5 }),
}).passthrough();

// ── Draft class prospects ───────────────────────────────
// Field set verified against the DraftProspect interface
// (packages/engine/src/types/draft.ts) and every writer/reader:
// makeProspect, runCombine, runScoutingAction, applyDraftSelection,
// scouting-staff, draft-war-room, and all web screens. Migrations 7/15/30
// already backfill combine/region/bloodline on load, so strict strip is
// safe — no production or fixture data carries extra keys.
export const CombineMeasurablesSchema = z.object({
  fortyYard: z.number(),
  benchPress: z.number(),
  vertical: z.number(),
  broadJump: z.number(),
  threeCone: z.number(),
  shuttle: z.number(),
});

export const ScoutingReportSchema = z.object({
  type: z.enum(['film', 'combine', 'interview']),
  accuracy: z.number(),
  grade: z.number(),
  notes: z.string(),
});

export const DraftProspectSchema = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  pos: PlayerPositionSchema,
  college: z.string(),
  region: ScoutingRegionSchema,
  ratings: z.record(z.number()),
  projectedRound: z.number(),
  scoutGrade: z.number(),
  trueGrade: z.number(),
  personality: PersonalitySchema,
  traits: z.array(z.string()),
  archetype: z.object({
    archetype: z.string(),
    label: z.string(),
    description: z.string(),
  }).nullable(),
  characterArchetype: z.string(),
  bustProbability: z.number(),
  stealProbability: z.number(),
  scoutingReports: z.array(ScoutingReportSchema),
  combine: CombineMeasurablesSchema.nullable().default(null),
  bloodline: BloodlineInfoSchema.nullable().default(null),
});

export const SaveStateSchema = z.object({
  version: z.number(),
  seed: z.number(),
  year: z.number(),
  week: z.number(),
  phase: z.enum(['preseason', 'regular_season', 'playoffs', 'offseason', 'free_agency', 'draft', 'post_draft', 'training_camp']),
  difficulty: z.enum(['rookie', 'pro', 'allpro', 'legend']),
  settings: GameSettingsSchema.default({
    halftimeDecisions: 'on',
    coachMode: false,
  }),
  players: z.record(PlayerSchema),
  teams: z.record(TeamPersistedSchema),
  owners: z.record(OwnerSchema),
  schedule: z.array(ScheduleWeekSchema),
  draftClass: z.array(DraftProspectSchema),
  freeAgents: z.array(z.string()),
  records: RecordBookSchema,
  activeRecordChases: z.array(RecordChaseSchema).default([]),
  recentBrokenRecords: z.array(BrokenRecordSchema).default([]),
  recentMilestones: z.array(MilestoneReachedSchema).default([]),
  awardsHistory: z.array(AwardsHistoryEntrySchema),
  hallOfFame: z.array(HallOfFameEntrySchema),
  ballotWaitlist: z.preprocess(normalizeHallOfFameBallotInput, z.array(HallOfFameBallotEntrySchema).default([])),
  ballotEliminatedIds: z.preprocess(normalizeStringArrayInput, z.array(z.string()).default([])),
  allDecadeTeams: z.array(AllDecadeTeamSchema).default([]),
  powerRankings: z.array(PowerRankingSchema),
  mediaCycle: MediaCycleStateSchema.default({
    weeklyDigests: [],
    powerRankingHistory: [],
  }),
  franchiseHistory: z.array(FranchiseHistoryEntrySchema),
  playerArchive: z.array(PlayerArchiveEntrySchema),
  playerSeasonHistory: z.record(z.string(), z.array(PlayerSeasonHistoryEntrySchema)).default({}),
  playerRivalries: z.array(PlayerRivalrySchema).default([]),
  farewellTours: z.array(FarewellTourSchema).default([]),
  endorsementOffers: EndorsementDealsSchema,
  leagueRules: LeagueRulesSchema,
  cbaState: CBAStateSchema,
  commissionerState: CommissionerStateSchema,
  laborState: LaborStateSchema,
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
    agmProfileId: z.string().nullable().default(null),
    agmImpactLog: z.array(z.object({
      id: z.string(),
      year: z.number(),
      week: z.number(),
      agmProfileId: z.string(),
      category: z.enum(['cap', 'competitive', 'personnel', 'mandate']),
      summary: z.string(),
    })).default([]),
  }),
  eventLog: z.array(GameEventSchema),
  narrativeState: z.object({
    activeArcs: z.array(StoryArcSchema),
    hooks: z.array(NarrativeHookSchema),
    recentHeadlines: z.array(z.string()),
  }),
  offFieldEvents: z.array(OffFieldEventSchema),
  recentPressConferences: z.array(PressConferenceSchema),
  coachingHistory: z.array(CoachCareerHistorySchema),
  leagueRivalries: z.array(LeagueRivalrySchema),
  activeEffects: z.array(TimedEffectSchema),
  gameDayState: GameDayStateSchema,
  weekSummaries: z.array(WeeklySummarySchema),
  playoffBracket: PlayoffBracketSchema.nullable(),
  offseasonState: OffseasonStateSchema.nullable(),
  expansionDraftState: ExpansionDraftStateSchema.optional(),
  stadiumDealOffers: z.array(StadiumDealSchema).default([]),
  leagueNews: z.array(NewsItemSchema).default([]),
  socialFeed: z.array(SocialPostSchema).default([]),
  activeProposals: z.array(TradeProposalSchema).default([]),
  tradeDeadlineState: TradeDeadlineStateSchema.optional(),
  faTargetBoard: FATargetBoardStateSchema.default({
    teamId: null,
    watchlist: [],
    targets: [],
  }),
  teamNeedsCache: z.record(z.string(), TeamNeedsReportSchema).default({}),
  scenarioState: ScenarioStateSchema.optional(),
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
  ownerMandates: z.array(OwnerMandateSchema).default([]),
  tutorialState: TutorialStateSchema.default({
    active: false,
    currentStepIndex: 0,
    steps: [],
    completedSteps: [],
    dismissed: false,
    visitedScreens: [],
  }),
  agents: z.array(AgentProfileSchema).default([]),
  narrativeIntensity: NarrativeIntensitySchema.default({
    current: 50,
    recentBeats: [],
    cooldownWeeks: 0,
  }),
  achievements: AchievementsSchema.default([]),
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
  postGameUi: PostGameUiStateSchema.default({
    pressConferenceQueue: [],
    audioCueQueue: [],
    pendingHalftimeDecision: null,
  }),
  breakingNewsQueue: z.array(BreakingNewsEventSchema).default([]),
  ownerPersonalityInbox: z.array(OwnerPersonalityEventSchema).default([]),
  commissionerDisciplineLog: z.array(CommissionerRulingSchema).default([]),
  earnedDoctrines: z.array(EarnedDoctrineSchema).default([]),
  nearMissTracker: NearMissTrackerSchema.optional(),
  seasonNearMissReceipts: z.array(NearMissEntrySchema).default([]),
  activeCallYourShot: ShotDeclarationSchema.optional(),
  apologyTourThreads: z.array(ApologyTourThreadSchema).default([]),
  lastPortableExportYear: z.number().nullable().default(null),
  ceremonies: z.array(CeremonySchema).default([]),
  dynastyTimeline: z.array(DynastyEventSchema).default([]),
  storylineThreads: z.array(StorylineThreadSchema).default([]),
  storyArcs: z.array(LeagueStoryArcSchema).default([]),
  // Sprint 45 "The Family Tree" — coaching lineage / rivalry graph.
  relationships: z.array(RelationshipEdgeSchema).default([]),
  leagueEvents: z.array(LeagueEventSchema).default([]),
  decisionReceipts: z.array(DecisionReceiptSchema).default([]),
  franchisePlans: z.record(z.string(), FranchisePlanSchema).default({}),
  pressMemoryTags: z.array(PressMemoryTagSchema).default([]),
  gameCapsules: z.array(GameCapsuleSchema).default([]),
  memoryGraph: DynastyMemoryGraphSchema.default({ nodes: [], edges: [] }),
  navigationMode: z.enum(['gm', 'nerd']).default('gm'),
  onboardingMode: z.enum(['instant', 'guided', 'full_gm']).default('guided'),
});

export type SaveState = z.infer<typeof SaveStateSchema>;
