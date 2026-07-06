import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { GameState, TeamOpsImpactReceipt } from '@mfd/engine';
import { TrainingCamp } from './TrainingCamp';
import { buildTrainingCampReadinessForecast } from './trainingCampReadiness';

const facilityEffect = {
  trainingXPBonus: 1,
  recoveryBonus: 1,
  injuryPreventionBonus: 1,
  scoutingBonus: 1,
  moraleBonus: 1,
  fatigueGainBonus: 1,
};

const roster = [
  { id: 'qb-1', name: 'Young QB', pos: 'QB', age: 23, ovr: 72 },
  { id: 'wr-1', name: 'Young WR', pos: 'WR', age: 22, ovr: 74 },
];

const gameState = {
  year: 2031,
  phase: 'preseason',
  teams: {
    'team-1': {
      id: 'team-1',
      name: 'Blaze',
      isUser: true,
      roster,
      facilityState: {
        budget: 7,
        facilities: [
          {
            type: 'training_complex',
            level: 2,
            effect: { ...facilityEffect, trainingXPBonus: 1.1 },
          },
          {
            type: 'medical_center',
            level: 2,
            effect: { ...facilityEffect, recoveryBonus: 1.1, injuryPreventionBonus: 0.98 },
          },
          {
            type: 'recovery_suite',
            level: 1,
            effect: { ...facilityEffect, injuryPreventionBonus: 0.95 },
          },
        ],
        upgradeCosts: {
          training_complex: [4, 8, 12],
          medical_center: [4, 8, 12],
          film_room: [3, 6, 9],
          weight_room: [3, 6, 9],
          recovery_suite: [5, 10, 15],
        },
      },
      medicalStaff: {
        id: 'med-1',
        name: 'Dr. Harper',
        tier: 'good',
        salary: 1.8,
        recoveryBonus: 0.9,
        preventionBonus: 0.9,
      },
    },
  },
  activeMentors: [{
    playerId: 'mentor-qb',
    name: 'Retired QB',
    position: 'QB',
    peakOvr: 95,
    mentorRating: 4,
    specialty: 'technique',
    hiredYear: 2031,
    salary: 0.5,
  }],
  mentorBudget: 1.5,
  trainingCampResults: [{
    teamId: 'team-1',
    standouts: [{
      playerId: 'wr-1',
      playerName: 'Young WR',
      pos: 'WR',
      ovrBefore: 72,
      ovrAfter: 74,
      reason: 'rookie_standout',
    }],
    injuries: [{
      playerId: 'qb-1',
      playerName: 'Young QB',
      pos: 'QB',
      weeksOut: 2,
    }],
    battles: [{
      pos: 'WR',
      winnerId: 'wr-1',
      winnerName: 'Young WR',
      winnerOvr: 74,
      loserId: 'wr-2',
      loserName: 'Veteran WR',
      loserOvr: 73,
    }],
    headlines: ['Young WR turned heads in camp.'],
  }],
};

let currentGameState = gameState;

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: { game: typeof gameState; teamId: string }) => unknown) => selector({
    game: currentGameState,
    teamId: 'team-1',
  }),
  selectUserTeamId: (state: { teamId: string }) => state.teamId,
}));

describe('TrainingCamp', () => {
  it('renders team-ops carryover from the shared receipt helper', () => {
    currentGameState = gameState;
    const markup = renderToStaticMarkup(<TrainingCamp />);

    expect(markup).toContain('TRAINING CAMP');
    expect(markup).toContain('data-spotlight-target="chip.route.training-camp.beat-1"');
    expect(markup).toContain('data-spotlight-target="chip.route.training-camp.beat-2"');
    expect(markup).toContain('CAMP READINESS');
    expect(markup).toContain('Camp recorded');
    expect(markup).toContain('Saved 2031 camp report is available');
    expect(markup).toContain('Saved Report');
    expect(markup).toContain('1 up / 1 hurt / 1 battles');
    expect(markup).toContain('Source: saved game.trainingCampResults for the user team; this route does not rerun camp.');
    expect(markup).toContain('Camp Standouts');
    expect(markup).toContain('Young WR turned heads in camp.');
    expect(markup).toContain('OPS CARRYOVER');
    expect(markup).toContain('Training XP');
    expect(markup).toContain('+10%');
    expect(markup).toContain('Recovery Window');
    expect(markup).toContain('Injury Risk');
    expect(markup).toContain('Mentor Reach');
    expect(markup).toContain('Retired QB shares technique guidance with Young QB.');
    expect(markup).toContain('Camp Receipt');
    expect(markup).toContain('1 up / 1 hurt');
  });

  it('shows training camp as ready to resolve without rerunning camp', () => {
    currentGameState = {
      ...gameState,
      phase: 'training_camp',
      trainingCampResults: [],
    };

    const markup = renderToStaticMarkup(<TrainingCamp />);

    expect(markup).toContain('CAMP READINESS');
    expect(markup).toContain('data-spotlight-target="chip.route.training-camp.beat-1"');
    expect(markup).toContain('data-spotlight-target="chip.route.training-camp.beat-2"');
    expect(markup).toContain('Ready to resolve');
    expect(markup).toContain('Advance week commits camp and opens preseason');
    expect(markup).toContain('Advance Week');
    expect(markup).toContain('No saved report');
    expect(markup).toContain('Source: game.phase is training_camp; advanceFranchiseWeek is the only path that writes camp results.');
    expect(markup).toContain('Training camp results will appear here after the post-draft phase.');
  });

  it('builds read-only forecast labels from saved camp and ops context', () => {
    const receipt: TeamOpsImpactReceipt = {
      teamId: 'team-1',
      facilityBudget: 7,
      facilityEffects: facilityEffect,
      medical: {
        staffName: 'Dr. Harper',
        tier: 'good',
        fourWeekRecoveryEstimate: 3,
        effectiveInjuryPrevention: 0.9,
      },
      mentors: {
        activeMentors: 0,
        budgetRemaining: 1.5,
        affectedPlayers: 0,
        topEffects: [],
      },
      camp: {
        available: false,
        standouts: 0,
        injuries: 0,
        battles: 0,
        topHeadline: null,
      },
      summaryItems: [
        { id: 'training', label: 'Training XP', value: '+10%', tone: 'positive', detail: 'Training complex' },
        { id: 'injury_prevention', label: 'Injury Risk', value: '-5%', tone: 'positive', detail: 'Recovery suite' },
      ],
    };

    const forecast = buildTrainingCampReadinessForecast(
      { ...gameState, phase: 'training_camp', trainingCampResults: [] } as unknown as GameState,
      'team-1',
      receipt,
    );

    expect(forecast).toMatchObject({
      status: 'ready_to_resolve',
      label: 'Ready to resolve',
      commitPath: 'Advance Week',
      savedReceipt: 'No saved report',
      carryover: '+10% training // -5%',
    });
  });
});
