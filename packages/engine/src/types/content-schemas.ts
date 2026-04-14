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

export type CallYourShotReactionContent = z.infer<typeof CallYourShotReactionSchema>;
export type CallYourShotReactionOutcome = z.infer<typeof CallYourShotReactionOutcomeSchema>;
export type ContingencyCalloutKey = z.infer<typeof ContingencyCalloutKeySchema>;
