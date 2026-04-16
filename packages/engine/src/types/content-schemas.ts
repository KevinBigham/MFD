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
//
// TODO(sprint-41): Tier B — validate agm/, broadcast/, narrative/,
// news/, social/, scouting/, coaching/ (15 files).

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
