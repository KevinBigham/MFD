import { describe, expect, it } from 'vitest';
import type { AlumniMentor } from './alumni-mentors';
import { buildTeamOpsImpactReceipt } from './team-ops-impact';
import { getFacility, getFacilityLevelEffect } from './facilities';
import { makeLeagueState, makePlayer } from './test-helpers';

function mentor(overrides: Partial<AlumniMentor> = {}): AlumniMentor {
  return {
    playerId: 'mentor-qb',
    name: 'Retired QB',
    position: 'QB',
    peakOvr: 96,
    mentorRating: 4,
    specialty: 'technique',
    hiredYear: 2031,
    salary: 0.5,
    ...overrides,
  };
}

describe('team ops impact receipt', () => {
  it('summarizes source-backed facility and medical impact without mutating state', () => {
    const game = makeLeagueState('regular_season');
    const team = game.teams.afce1;
    const medicalCenter = getFacility(team.facilityState, 'medical_center')!;
    medicalCenter.level = 3;
    medicalCenter.effect = getFacilityLevelEffect('medical_center', 3);
    team.medicalStaff = {
      id: 'med-elite',
      name: 'Dr. Elite',
      tier: 'elite',
      salary: 2.8,
      recoveryBonus: 0.8,
      preventionBonus: 0.8,
    };
    const snapshot = structuredClone(game);

    const receipt = buildTeamOpsImpactReceipt(game, team.id);

    expect(receipt?.medical.staffName).toBe('Dr. Elite');
    expect(receipt?.medical.fourWeekRecoveryEstimate).toBe(3);
    expect(receipt?.medical.effectiveInjuryPrevention).toBe(0.78);
    expect(receipt?.facilityEffects.recoveryBonus).toBe(1.15);
    expect(receipt?.summaryItems.find((item) => item.id === 'recovery')?.value).toBe('3 weeks');
    expect(game).toEqual(snapshot);
  });

  it('counts active alumni mentor reach from the existing mentor effect helper', () => {
    const game = makeLeagueState('regular_season');
    const team = game.teams.afce1;
    team.roster = [
      makePlayer('qb-1', team.id, 'QB', 74),
      makePlayer('qb-2', team.id, 'QB', 75),
      makePlayer('wr-1', team.id, 'WR', 76),
    ];
    game.activeMentors = [mentor()];
    game.mentorBudget = 1.5;

    const receipt = buildTeamOpsImpactReceipt(game, team.id);

    expect(receipt?.mentors.activeMentors).toBe(1);
    expect(receipt?.mentors.budgetRemaining).toBe(1.5);
    expect(receipt?.mentors.affectedPlayers).toBe(2);
    expect(receipt?.mentors.topEffects.map((effect) => effect.targetPlayerId)).toEqual(['qb-1', 'qb-2']);
    expect(receipt?.summaryItems.find((item) => item.id === 'mentors')?.value).toBe('2 players');
  });

  it('includes stored training camp receipts when camp has resolved', () => {
    const game = makeLeagueState('preseason');
    const team = game.teams.afce1;
    game.trainingCampResults = [{
      teamId: team.id,
      standouts: [{
        playerId: 'rookie-1',
        playerName: 'Rookie Flash',
        pos: 'WR',
        ovrBefore: 68,
        ovrAfter: 70,
        reason: 'rookie_standout',
      }],
      injuries: [],
      battles: [{
        pos: 'QB',
        winnerId: 'qb-1',
        winnerName: 'QB One',
        loserId: 'qb-2',
        loserName: 'QB Two',
        winnerOvr: 78,
        loserOvr: 76,
      }],
      headlines: ['Rookie Flash turned heads in camp.'],
    }];

    const receipt = buildTeamOpsImpactReceipt(game, team.id);

    expect(receipt?.camp.available).toBe(true);
    expect(receipt?.camp.standouts).toBe(1);
    expect(receipt?.camp.battles).toBe(1);
    expect(receipt?.camp.topHeadline).toBe('Rookie Flash turned heads in camp.');
    expect(receipt?.summaryItems.find((item) => item.id === 'camp')?.detail).toContain('1 position battles resolved');
  });

  it('returns null for missing teams', () => {
    const game = makeLeagueState();

    expect(buildTeamOpsImpactReceipt(game, 'missing-team')).toBeNull();
  });
});
