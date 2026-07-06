import type { FacilityEffect, GameState, MedicalStaff, Team } from '../types';
import { applyFacilityBonuses } from './facilities';
import { calculateRecoveryGames } from './injury-system';
import { calculateMentorEffects, type MentorEffect } from './alumni-mentors';

export type TeamOpsImpactTone = 'positive' | 'neutral' | 'warning' | 'negative';

export interface TeamOpsImpactItem {
  id: 'training' | 'recovery' | 'injury_prevention' | 'fatigue' | 'mentors' | 'camp';
  label: string;
  value: string;
  detail: string;
  tone: TeamOpsImpactTone;
}

export interface TeamOpsCampImpact {
  available: boolean;
  standouts: number;
  injuries: number;
  battles: number;
  topHeadline: string | null;
}

export interface TeamOpsMedicalImpact {
  staffName: string | null;
  tier: MedicalStaff['tier'];
  fourWeekRecoveryEstimate: number;
  effectiveInjuryPrevention: number;
}

export interface TeamOpsMentorImpact {
  activeMentors: number;
  budgetRemaining: number;
  affectedPlayers: number;
  topEffects: MentorEffect[];
}

export interface TeamOpsImpactReceipt {
  teamId: string;
  facilityBudget: number;
  facilityEffects: FacilityEffect;
  medical: TeamOpsMedicalImpact;
  mentors: TeamOpsMentorImpact;
  camp: TeamOpsCampImpact;
  summaryItems: TeamOpsImpactItem[];
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function bonusPct(multiplier: number): string {
  const pct = round1((multiplier - 1) * 100);
  if (pct === 0) return 'Baseline';
  return `${pct > 0 ? '+' : ''}${pct}%`;
}

function reductionPct(multiplier: number, noun: string): string {
  const pct = round1((1 - multiplier) * 100);
  if (pct === 0) return `Baseline ${noun}`;
  return `${pct > 0 ? '-' : '+'}${Math.abs(pct)}% ${noun}`;
}

function toneForReduction(multiplier: number): TeamOpsImpactTone {
  if (multiplier < 0.95) return 'positive';
  if (multiplier > 1.02) return 'warning';
  return 'neutral';
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function resolveTeam(game: GameState, teamId: string): Team | null {
  return game.teams[teamId] ?? Object.values(game.teams).find((team) => team.id === teamId) ?? null;
}

export function buildTeamOpsImpactReceipt(game: GameState, teamId: string): TeamOpsImpactReceipt | null {
  const team = resolveTeam(game, teamId);
  if (!team) return null;

  const facilityEffects = applyFacilityBonuses(team);
  const activeMentors = game.activeMentors ?? [];
  const mentorEffects = calculateMentorEffects(activeMentors, team.roster ?? []);
  const campResult = game.trainingCampResults?.find((result) => result.teamId === team.id || result.teamId === teamId) ?? null;
  const medicalStaff = team.medicalStaff ?? null;
  const fourWeekRecoveryEstimate = calculateRecoveryGames(4, medicalStaff, facilityEffects.recoveryBonus);
  const staffPrevention = medicalStaff?.preventionBonus ?? 1;
  const effectiveInjuryPrevention = round2(staffPrevention * facilityEffects.injuryPreventionBonus);
  const facilityBudget = team.facilityState?.budget ?? 0;
  const mentorBudget = game.mentorBudget ?? 2.5;

  const camp: TeamOpsCampImpact = {
    available: Boolean(campResult),
    standouts: campResult?.standouts.length ?? 0,
    injuries: campResult?.injuries.length ?? 0,
    battles: campResult?.battles.length ?? 0,
    topHeadline: campResult?.headlines[0] ?? null,
  };

  const summaryItems: TeamOpsImpactItem[] = [
    {
      id: 'training',
      label: 'Training XP',
      value: bonusPct(facilityEffects.trainingXPBonus),
      detail: 'Facility aggregate applied by player development and training systems.',
      tone: facilityEffects.trainingXPBonus > 1 ? 'positive' : 'neutral',
    },
    {
      id: 'recovery',
      label: 'Recovery Window',
      value: `${fourWeekRecoveryEstimate} weeks`,
      detail: 'Estimated result for a base four-week injury using current medical staff and facilities.',
      tone: fourWeekRecoveryEstimate <= 3 ? 'positive' : fourWeekRecoveryEstimate > 4 ? 'warning' : 'neutral',
    },
    {
      id: 'injury_prevention',
      label: 'Injury Risk',
      value: reductionPct(effectiveInjuryPrevention, 'risk'),
      detail: 'Combined medical-staff prevention and facility prevention multiplier.',
      tone: toneForReduction(effectiveInjuryPrevention),
    },
    {
      id: 'fatigue',
      label: 'Fatigue Gain',
      value: reductionPct(facilityEffects.fatigueGainBonus, 'fatigue'),
      detail: 'Facility aggregate used by workload and fatigue planning.',
      tone: toneForReduction(facilityEffects.fatigueGainBonus),
    },
    {
      id: 'mentors',
      label: 'Mentor Reach',
      value: pluralize(mentorEffects.length, 'player'),
      detail: `${pluralize(activeMentors.length, 'active alumni mentor')}; $${mentorBudget.toFixed(1)}M budget remaining.`,
      tone: mentorEffects.length > 0 ? 'positive' : activeMentors.length > 0 ? 'warning' : 'neutral',
    },
    {
      id: 'camp',
      label: 'Camp Receipt',
      value: camp.available ? `${camp.standouts} up / ${camp.injuries} hurt` : 'Pending',
      detail: camp.available
        ? `${camp.battles} position battles resolved. ${camp.topHeadline ?? 'No headline stored.'}`
        : 'Training camp receipts appear after the training_camp phase resolves.',
      tone: camp.available && camp.injuries > camp.standouts ? 'warning' : camp.available ? 'positive' : 'neutral',
    },
  ];

  return {
    teamId: team.id,
    facilityBudget,
    facilityEffects,
    medical: {
      staffName: medicalStaff?.name ?? null,
      tier: medicalStaff?.tier ?? 'average',
      fourWeekRecoveryEstimate,
      effectiveInjuryPrevention,
    },
    mentors: {
      activeMentors: activeMentors.length,
      budgetRemaining: mentorBudget,
      affectedPlayers: mentorEffects.length,
      topEffects: mentorEffects.slice(0, 5),
    },
    camp,
    summaryItems,
  };
}
