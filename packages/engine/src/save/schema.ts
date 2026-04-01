/**
 * MFD Save Schema — Zod-validated save format
 *
 * Rule 5: Save format is versioned and schema-validated.
 * Old saves MUST load through the migration pipeline.
 */

import { z } from 'zod';

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
  gamesOut: z.number(),
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
  lastOffer: ContractOfferSchema.nullable(),
  status: z.enum(['pending', 'accepted', 'declined', 'walked']),
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
  actions: z.array(z.enum(['film', 'combine', 'interview'])),
  accuracy: z.number(),
  visibleScoutGrade: z.number(),
  notes: z.array(z.string()),
});

export const TradeOfferAssetSchema = z.object({
  type: z.enum(['player', 'pick']),
  teamId: z.string(),
  playerId: z.string().nullable(),
  pickId: z.string().nullable(),
  description: z.string(),
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

export const OffseasonStateSchema = z.object({
  round: z.number(),
  expiringPlayerIds: z.array(z.string()),
  reSignDecisions: z.record(z.string(), ReSignDecisionSchema),
  freeAgencyBids: z.record(z.string(), z.array(FreeAgencyBidSchema)),
  scoutingState: z.record(z.string(), ProspectScoutingStateSchema),
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
  schedule: z.array(z.any()),
  draftClass: z.array(z.any()),
  freeAgents: z.array(z.string()),
  records: z.array(z.any()),
  hallOfFame: z.array(z.any()),
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
    activeArcs: z.array(z.any()),
    hooks: z.array(z.any()),
    recentHeadlines: z.array(z.string()),
  }),
  weekSummaries: z.array(z.any()),
  playoffBracket: z.any().nullable(),
  offseasonState: OffseasonStateSchema.nullable(),
});

export type SaveState = z.infer<typeof SaveStateSchema>;
