import { z } from 'zod';

export const CallYourShotReactionOutcomeSchema = z.enum(['hit', 'miss', 'partial']);
export const CallYourShotReactionSpeakerTypeSchema = z.enum(['fan', 'beat_writer', 'analyst', 'locker_room']);
export const CallYourShotReactionToneSchema = z.enum(['triumphant', 'sarcastic', 'measured']);

export const CallYourShotReactionSchema = z.object({
  id: z.string(),
  outcome: CallYourShotReactionOutcomeSchema,
  speaker: z.string(),
  speakerType: CallYourShotReactionSpeakerTypeSchema,
  tone: CallYourShotReactionToneSchema,
  headline: z.string(),
  quote: z.string(),
});

export const CallYourShotReactionsContentSchema = z.object({
  reactions: z.array(CallYourShotReactionSchema).min(15).max(25),
});

export const ContingencyCalloutKeySchema = z.enum([
  'go_air_raid',
  'kill_clock',
  'go_for_it_on_4th',
  'run_heavy',
  'pressure_every_down',
  'prevent_defense_off',
]);

export const ContingencyCalloutsContentSchema = z.object({
  callouts: z.record(ContingencyCalloutKeySchema, z.array(z.string()).min(5)),
});

export const ApologyTourBeatSchema = z.object({
  from: z.string(),
  title: z.string(),
  body: z.string(),
});

export const ApologyTourContentSchema = z.object({
  beats: z.object({
    fan_letter: ApologyTourBeatSchema,
    beat_column: ApologyTourBeatSchema,
    owner_email: ApologyTourBeatSchema,
    resolution_resolved: ApologyTourBeatSchema,
    resolution_escalated: ApologyTourBeatSchema,
  }),
});

export type CallYourShotReactionContent = z.infer<typeof CallYourShotReactionSchema>;
export type CallYourShotReactionOutcome = z.infer<typeof CallYourShotReactionOutcomeSchema>;
export type ContingencyCalloutKey = z.infer<typeof ContingencyCalloutKeySchema>;
export type ApologyTourBeatContent = z.infer<typeof ApologyTourBeatSchema>;
export type ApologyTourContent = z.infer<typeof ApologyTourContentSchema>;

// ── Team identity content (Sprint 40 — Tier A coverage) ───────────────
// 32 files in packages/content/teams/*.json validated at load.

export const TeamConferenceSchema = z.enum(['AFC', 'NFC']);
export const TeamDivisionSchema = z.enum(['North', 'South', 'East', 'West']);

export const TeamFightSongSchema = z.object({
  title: z.string(),
  lyrics: z.string(),
  chant: z.string(),
});

export const TeamStadiumSchema = z.object({
  name: z.string(),
  capacity: z.number().int().positive(),
  tradition: z.string(),
  surface: z.string(),
  roof: z.string(),
});

export const TeamFanCultureSchema = z.object({
  nickname: z.string(),
  description: z.string(),
  tailgate: z.string(),
  luckyCharm: z.string(),
});

export const TeamRivalrySchema = z.object({
  opponentId: z.string(),
  name: z.string(),
  trophy: z.string(),
  record: z.string(),
  narrative: z.string(),
});

export const TeamPaAnnouncerSchema = z.object({
  firstDownCall: z.string(),
  touchdownCall: z.string(),
});

export const TeamContentSchema = z.object({
  id: z.string(),
  city: z.string(),
  nickname: z.string(),
  fullName: z.string(),
  conference: TeamConferenceSchema,
  division: TeamDivisionSchema,
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  tertiaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  fightSong: TeamFightSongSchema,
  stadium: TeamStadiumSchema,
  fanCulture: TeamFanCultureSchema,
  rivalries: z.array(TeamRivalrySchema),
  paAnnouncer: TeamPaAnnouncerSchema,
  cityFlavor: z.string(),
  established: z.number().int().min(1900).max(2100),
  motto: z.string(),
});

export type TeamContent = z.infer<typeof TeamContentSchema>;
export type TeamFightSongContent = z.infer<typeof TeamFightSongSchema>;
export type TeamStadiumContent = z.infer<typeof TeamStadiumSchema>;
export type TeamFanCultureContent = z.infer<typeof TeamFanCultureSchema>;
export type TeamRivalryContent = z.infer<typeof TeamRivalrySchema>;

// ── Tier B content validation (cleanup sprint post-55) ────────────────
// Previously loaded via raw `as Record<...>` casts in content-loader.ts.
// Runtime Zod validation catches silent content drift at import time,
// matching the Tier A (team files) approach from Sprint 40.
//
// Convention: non-empty arrays use `.min(1)` where the game code throws
// on empty content; templates use `z.string().min(1)`; free-form
// key records use `z.record(z.string(), ValueSchema)`.

const NonEmptyStringSchema = z.string().min(1);
const NonEmptyStringArraySchema = z.array(NonEmptyStringSchema).min(1);

// 1. Press conference templates — Record<scenario, { questions, answers_* }>
export const PressConferenceScenarioKeySchema = z.enum([
  'win_blowout',
  'win_close',
  'loss_blowout',
  'loss_close',
  'rivalry_win',
  'rivalry_loss',
  'playoff_win',
  'playoff_loss',
  'super_bowl_win',
  'super_bowl_loss',
]);

export const PressConferenceScenarioContentSchema = z.object({
  questions: NonEmptyStringArraySchema,
  answers_high_ambition: NonEmptyStringArraySchema,
  answers_mid: NonEmptyStringArraySchema,
  answers_low_ambition: NonEmptyStringArraySchema,
});

export const PressConferenceTemplatesContentSchema = z.record(
  PressConferenceScenarioKeySchema,
  PressConferenceScenarioContentSchema,
);

// 2. AGM dialogue — 3-level nested: Record<personaId, Record<eventKey, Record<contextKey, string[]>>>
export const AgmDialogueContentSchema = z.record(
  z.string(),
  z.record(z.string(), z.record(z.string(), NonEmptyStringArraySchema)),
);

// 3. Broadcast play-by-play templates (rushing + passing-defense-st)
// Shared shape: Record<playType, { openers, endings }>
export const BroadcastTemplateCategorySchema = z.object({
  openers: NonEmptyStringArraySchema,
  endings: NonEmptyStringArraySchema,
});

export const BroadcastTemplatesContentSchema = z.record(
  z.string(),
  BroadcastTemplateCategorySchema,
);

// 4. Award speeches — nested variant buckets
export const AwardSpeechVariantBucketSchema = z.object({
  acceptance_humble: NonEmptyStringArraySchema.optional(),
  acceptance_confident: NonEmptyStringArraySchema.optional(),
  presenter_intro: NonEmptyStringArraySchema.optional(),
  induction_speech: NonEmptyStringArraySchema.optional(),
});

export const AwardSpeechesContentSchema = z.object({
  award_speeches: z.record(z.string(), AwardSpeechVariantBucketSchema),
});

// 5. Coach archetypes + scheme descriptions
export const CoachArchetypeEntrySchema = z.object({
  press_conference: NonEmptyStringArraySchema,
  sideline_reaction_good: NonEmptyStringArraySchema,
  sideline_reaction_bad: NonEmptyStringArraySchema,
});

export const CoachArchetypesContentSchema = z.object({
  coach_archetypes: z.record(z.string(), CoachArchetypeEntrySchema),
  scheme_descriptions: z.record(
    z.string(),
    z.record(z.string(), z.record(z.string(), z.string())),
  ),
});

// 6. Halftime — performers array + PA templates keyed by event
export const HalftimePerformerContentSchema = z.object({
  name: NonEmptyStringSchema,
  genre: NonEmptyStringSchema,
  showDescription: NonEmptyStringSchema,
  crowdReaction: NonEmptyStringSchema,
});

export const PaEventTypeSchema = z.enum([
  'first_down',
  'touchdown_home',
  'touchdown_away',
  'field_goal_home',
  'turnover_home',
  'sack_home',
  'big_play_home',
  'end_of_quarter',
  'two_minute_warning',
  'player_intro',
  'timeout',
]);

export const HalftimeContentSchema = z.object({
  performers: z.array(HalftimePerformerContentSchema).min(1),
  pa_templates: z.record(PaEventTypeSchema, NonEmptyStringArraySchema),
});

// 7. Player names — tiered string arrays
export const NameFrequencyTierSchema = z.enum(['common', 'uncommon', 'rare']);

export const PlayerNamesContentSchema = z.object({
  firstNames: z.record(NameFrequencyTierSchema, NonEmptyStringArraySchema),
  lastNames: z.record(NameFrequencyTierSchema, NonEmptyStringArraySchema),
});

// 8. Story arc templates — Record<arc, Record<phase, { headlines, bodies }>>
export const StoryArcTemplateKeySchema = z.enum([
  'breakout_season',
  'veteran_farewell',
  'coaching_hot_seat',
  'trade_demand',
  'rookie_struggle',
  'dynasty_defense',
  'underdog_run',
  'locker_room_rift',
  'record_chase',
  'comeback_from_injury',
]);

export const StoryArcPhaseKeySchema = z.enum([
  'start',
  'peak',
  'resolution_good',
  'resolution_bad',
]);

export const StoryArcPhaseContentSchema = z.object({
  headlines: NonEmptyStringArraySchema,
  bodies: NonEmptyStringArraySchema,
});

export const StoryArcTemplatesContentSchema = z.record(
  StoryArcTemplateKeySchema,
  z.record(StoryArcPhaseKeySchema, StoryArcPhaseContentSchema),
);

// 9. League news templates — Record<eventType, { headlines, blurbs }>
export const LeagueNewsEventTypeSchema = z.enum([
  'trade_completed',
  'free_agent_signing',
  'player_cut',
  'coaching_hire',
  'coaching_fired',
  'injury_major',
  'injury_return',
  'record_broken',
  'award_won',
  'retirement',
  'holdout',
  'suspension',
  'expansion_announced',
  'relocation',
  'playoff_clinch',
  'playoff_elimination',
  'draft_pick_trade',
  'contract_extension',
  'franchise_tag',
  'cba_update',
]);

export const LeagueNewsTemplateCategorySchema = z.object({
  headlines: NonEmptyStringArraySchema,
  blurbs: NonEmptyStringArraySchema,
});

export const LeagueNewsTemplatesContentSchema = z.record(
  LeagueNewsEventTypeSchema,
  LeagueNewsTemplateCategorySchema,
);

// 10. Personality flavor — 3-level: dimension → tier → scenario → lines
export const PersonalityDimensionSchema = z.enum([
  'workEthic',
  'loyalty',
  'greed',
  'pressure',
  'ambition',
]);

export const PersonalityTierSchema = z.enum(['low', 'mid', 'high']);

export const PersonalityFlavorScenarioSchema = z.enum([
  'socialPost',
  'pressQuote',
  'scoutReport',
  'lockerRoomVibe',
  'contractDemand',
]);

export const PersonalityFlavorContentSchema = z.record(
  PersonalityDimensionSchema,
  z.record(
    PersonalityTierSchema,
    z.record(PersonalityFlavorScenarioSchema, NonEmptyStringArraySchema),
  ),
);

// 11. Scouting report templates — Record<position, bucket>
export const ScoutingTemplateBucketSchema = z.object({
  strengths_elite: NonEmptyStringArraySchema,
  strengths_solid: NonEmptyStringArraySchema,
  weaknesses_fixable: NonEmptyStringArraySchema,
  weaknesses_concerning: NonEmptyStringArraySchema,
  projection_first_round: NonEmptyStringArraySchema,
  projection_mid_round: NonEmptyStringArraySchema,
  projection_late_round: NonEmptyStringArraySchema,
  comparison_template: NonEmptyStringArraySchema,
});

export const ScoutingTemplatesContentSchema = z.object({
  scouting_templates: z.record(z.string(), ScoutingTemplateBucketSchema),
});

// 12. Social feed templates — four source buckets, each scenario → lines
export const SocialFeedTemplatesContentSchema = z.object({
  player_posts: z.record(z.string(), NonEmptyStringArraySchema),
  fan_posts: z.record(z.string(), NonEmptyStringArraySchema),
  analyst_posts: z.record(z.string(), NonEmptyStringArraySchema),
  reporter_posts: z.record(z.string(), NonEmptyStringArraySchema),
});

// Inferred types exported for content-loader consumers
export type PressConferenceScenarioKey = z.infer<typeof PressConferenceScenarioKeySchema>;
export type PressConferenceScenarioContent = z.infer<typeof PressConferenceScenarioContentSchema>;
export type AgmDialogueContent = z.infer<typeof AgmDialogueContentSchema>;
export type BroadcastTemplateCategory = z.infer<typeof BroadcastTemplateCategorySchema>;
export type AwardSpeechVariantBucket = z.infer<typeof AwardSpeechVariantBucketSchema>;
export type AwardSpeechesContent = z.infer<typeof AwardSpeechesContentSchema>;
export type CoachArchetypeEntry = z.infer<typeof CoachArchetypeEntrySchema>;
export type CoachArchetypesContent = z.infer<typeof CoachArchetypesContentSchema>;
export type HalftimePerformerContent = z.infer<typeof HalftimePerformerContentSchema>;
export type HalftimeContent = z.infer<typeof HalftimeContentSchema>;
export type PaEventType = z.infer<typeof PaEventTypeSchema>;
export type NameFrequencyTier = z.infer<typeof NameFrequencyTierSchema>;
export type PlayerNamesContent = z.infer<typeof PlayerNamesContentSchema>;
export type StoryArcTemplateKey = z.infer<typeof StoryArcTemplateKeySchema>;
export type StoryArcPhaseKey = z.infer<typeof StoryArcPhaseKeySchema>;
export type StoryArcPhaseContent = z.infer<typeof StoryArcPhaseContentSchema>;
export type StoryArcTemplatesContent = z.infer<typeof StoryArcTemplatesContentSchema>;
export type LeagueNewsEventType = z.infer<typeof LeagueNewsEventTypeSchema>;
export type LeagueNewsTemplateCategory = z.infer<typeof LeagueNewsTemplateCategorySchema>;
export type LeagueNewsTemplatesContent = z.infer<typeof LeagueNewsTemplatesContentSchema>;
export type PersonalityDimension = z.infer<typeof PersonalityDimensionSchema>;
export type PersonalityTier = z.infer<typeof PersonalityTierSchema>;
export type PersonalityFlavorScenario = z.infer<typeof PersonalityFlavorScenarioSchema>;
export type PersonalityFlavorContent = z.infer<typeof PersonalityFlavorContentSchema>;
export type ScoutingTemplateBucket = z.infer<typeof ScoutingTemplateBucketSchema>;
export type ScoutingTemplatesContent = z.infer<typeof ScoutingTemplatesContentSchema>;
export type SocialFeedTemplatesContent = z.infer<typeof SocialFeedTemplatesContentSchema>;
