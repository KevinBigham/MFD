import { z } from 'zod';
import type { PendingPassedPickTarget, Position, TrainingCampReport } from '../types';
import type { AlumniMentor } from '../systems/alumni-mentors';
import type { DynastyEra } from '../systems/dynasty-era';
import type {
  ForecastBoard,
  FranchiseBlueprint,
  PressureCard,
  SetupDecisions,
  SetupPhase,
  SetupState,
  TeamCrisisProfile,
  WeekOneCliffhanger,
} from '../systems/franchise-setup';

// These schemas import domain types only: loading a save must not run setup,
// camp, draft or mentor actions to reconstruct already-recorded state.
const PositionSchema = z.enum(['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P']) satisfies z.ZodType<Position>;
const FiniteNumber = z.number().finite();
const SetupPhaseSchema = z.enum([
  'choose_agm', 'intel_briefing', 'meet_roster', 'hire_coach', 'hire_scout',
  'set_scheme', 'depth_chart', 'cap_strategy', 'set_goals', 'blueprint',
]) satisfies z.ZodType<SetupPhase>;
const PressureIdSchema = z.enum(['roster', 'cap', 'culture']);
const PressureSeveritySchema = z.enum(['stable', 'warning', 'critical']);

export const AlumniMentorSchema = z.object({
  playerId: z.string(),
  name: z.string(),
  position: PositionSchema,
  peakOvr: FiniteNumber,
  mentorRating: FiniteNumber,
  specialty: z.enum(['technique', 'leadership', 'film_study', 'conditioning', 'mental_toughness']),
  hiredYear: FiniteNumber,
  salary: FiniteNumber,
}) satisfies z.ZodType<AlumniMentor>;

export const DynastyEraSchema = z.object({
  name: z.string(),
  startYear: FiniteNumber,
  endYear: FiniteNumber.nullable(),
  trigger: z.enum(['championship', 'milestone', 'manual']),
  achievements: z.array(z.string()),
}) satisfies z.ZodType<DynastyEra>;

export const TrainingCampReportSchema = z.object({
  teamId: z.string(),
  standouts: z.array(z.object({
    playerId: z.string(),
    playerName: z.string(),
    pos: PositionSchema,
    ovrBefore: FiniteNumber,
    ovrAfter: FiniteNumber,
    reason: z.enum(['rookie_standout', 'breakout', 'battle_winner']),
  })),
  injuries: z.array(z.object({
    playerId: z.string(),
    playerName: z.string(),
    pos: PositionSchema,
    weeksOut: FiniteNumber,
  })),
  battles: z.array(z.object({
    pos: PositionSchema,
    winnerId: z.string(),
    winnerName: z.string(),
    loserId: z.string(),
    loserName: z.string(),
    winnerOvr: FiniteNumber,
    loserOvr: FiniteNumber,
  })),
  headlines: z.array(z.string()),
}) satisfies z.ZodType<TrainingCampReport>;

export const PendingPassedPickTargetSchema = z.object({
  prospectId: z.string(),
  playerName: z.string(),
  playerOvr: FiniteNumber,
  round: FiniteNumber,
  pickNumber: FiniteNumber,
}) satisfies z.ZodType<PendingPassedPickTarget>;

const PressureCardSchema = z.object({
  id: PressureIdSchema,
  label: z.string(),
  severity: PressureSeveritySchema,
  score: FiniteNumber,
  diagnosis: z.string(),
  signal: z.string(),
  drilldown: z.object({
    whyItMatters: z.string(),
    riskSource: z.string(),
    bestLever: z.string(),
    seasonOneConsequence: z.string(),
  }),
}) satisfies z.ZodType<PressureCard>;

const TeamCrisisProfileSchema = z.object({
  headline: z.string(),
  ownerPressure: z.string(),
  mediaPressure: z.string(),
  pressureCards: z.array(PressureCardSchema),
  weekOneThreat: z.string(),
  weekOneHope: z.string(),
  weekOneUnknown: z.string(),
}) satisfies z.ZodType<TeamCrisisProfile>;

const ForecastBoardSchema = z.object({
  weekOneReadiness: FiniteNumber,
  schemeCohesion: FiniteNumber,
  cultureStability: FiniteNumber,
  capFlexibility: FiniteNumber,
  ownerHeat: FiniteNumber,
  summary: z.string(),
  cards: z.array(z.object({
    id: z.enum(['week_one_readiness', 'scheme_cohesion', 'culture_stability', 'cap_flexibility', 'owner_heat']),
    label: z.string(),
    value: FiniteNumber,
    delta: FiniteNumber,
    direction: z.enum(['up', 'down', 'flat']),
    detail: z.string(),
  })),
}) satisfies z.ZodType<ForecastBoard>;

const WeekOneCliffhangerSchema = z.object({
  openerLabel: z.string(),
  threat: z.string(),
  hope: z.string(),
  unknown: z.string(),
}) satisfies z.ZodType<WeekOneCliffhanger>;

export const FranchiseBlueprintSchema = z.object({
  teamName: z.string(),
  year: FiniteNumber,
  difficulty: z.enum(['rookie', 'pro', 'allpro', 'legend']),
  windowPhase: z.enum(['opening', 'peaking', 'closing', 'rebuilding']),
  windowTrend: z.enum(['improving', 'stable', 'declining']),
  selectedSchemes: z.object({
    offenseSchemeId: z.string(),
    offenseLabel: z.string(),
    defenseSchemeId: z.string(),
    defenseLabel: z.string(),
  }),
  seasonGoals: z.array(z.object({ id: z.string(), label: z.string(), description: z.string() })),
  criticalNeeds: z.array(z.string()),
  keyPlayers: z.array(z.object({ playerId: z.string(), name: z.string(), pos: PositionSchema, ovr: FiniteNumber })),
  rosterStrength: z.string(),
  capOutlook: z.string(),
  blueprintNarrative: z.string(),
  crisisHeadline: z.string(),
  pressureSnapshot: z.array(z.object({
    id: PressureIdSchema,
    label: z.string(),
    severity: PressureSeveritySchema,
    diagnosis: z.string(),
  })),
  dayOneBets: z.array(z.string()),
  weekOneCliffhanger: WeekOneCliffhangerSchema,
  agmProfileId: z.string().optional(),
  agmClosingWords: z.string().optional(),
}) satisfies z.ZodType<FranchiseBlueprint>;

const SetupDecisionsSchema = z.object({
  offenseScheme: z.string().nullable(),
  defenseScheme: z.string().nullable(),
  seasonGoals: z.array(z.string()),
  depthChartOverrides: z.record(z.string(), z.array(z.string())),
  acknowledged: z.array(SetupPhaseSchema),
  agmProfileId: z.string().nullable(),
  headCoachId: z.string().nullable(),
  scoutingDirectorId: z.string().nullable(),
  depthChartPhilosophy: z.enum(['best_players', 'veterans_first', 'youth_bet']).nullable(),
  capPosture: z.enum(['protect_future', 'balanced', 'push_chips']).nullable(),
  cultureMandate: z.enum(['accountability', 'player_led', 'development_first']).nullable(),
  agmClosingWords: z.string().optional(),
}) satisfies z.ZodType<SetupDecisions>;

export const SetupStateSchema = z.object({
  currentPhase: SetupPhaseSchema,
  completedPhases: z.array(SetupPhaseSchema),
  decisions: SetupDecisionsSchema,
  crisisProfile: TeamCrisisProfileSchema.nullable(),
  forecastBoard: ForecastBoardSchema.nullable(),
  openedDrilldowns: z.array(PressureIdSchema),
  blueprint: FranchiseBlueprintSchema.nullable(),
}) satisfies z.ZodType<SetupState>;
