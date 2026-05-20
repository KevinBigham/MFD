import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MfdTooltipProvider } from '@mfd/design-system/components';
import { GamePlanSetup } from './GamePlanSetup';

function createMockState(): any {
  return {
    week: 11,
    year: 2029,
    phase: 'regular_season',
    game: {
      activeCallYourShot: null,
    },
    userTeam: {
      id: 'team-1',
      city: 'Chicago',
      name: 'Blaze',
      staff: {
        hc: {
          ratings: { gameplan: 80 },
          traits: ['creative', 'gambler'],
        },
      },
      roster: [
        { id: 'qb-1', name: 'Jay Stone', pos: 'QB', ovr: 87 },
        { id: 'wr-1', name: 'Keenan Ward', pos: 'WR', ovr: 83 },
      ],
    },
    currentWeeklyPrepPlan: null,
    currentOpponentReport: {
      teamId: 'team-2',
      teamName: 'Austin Armadillos',
      record: '7-3',
      offenseRank: 5,
      defenseRank: 21,
      strengths: ['Vertical passing game can stress the secondary.'],
      weaknesses: ['Secondary is vulnerable to sustained passing pressure.'],
      keyPlayers: [{ id: 'opp-1', name: 'Rex Cole', pos: 'CB', ovr: 72 }],
      schemeRecommendation: {
        offense: 'pass_heavy',
        defense: 'coverage',
        reasoning: 'Attack the weak secondary and keep the lid on their pass game.',
      },
    },
    currentOpponentIntel: {
      opponentTeamId: 'team-2',
      attackLane: 'passing',
      defendLane: 'passing',
      dangerPlayers: [{ id: 'opp-2', name: 'Zane Cross', pos: 'WR', ovr: 86 }],
      weakLinks: [{ id: 'opp-3', name: 'Rex Cole', pos: 'CB', ovr: 72 }],
      tendencies: ['Austin leans on explosive pass game.'],
      recommendations: {
        offense: ['Stress the secondary early.'],
        defense: ['Disrupt the quarterback and close explosives.'],
      },
    },
    actions: {
      saveWeeklyPrepPlan: () => Promise.resolve(),
      clearWeeklyPrepPlan: () => Promise.resolve(),
      advanceWeek: () => Promise.resolve(null),
      setCallYourShot: () => Promise.resolve(),
    },
  };
}

let mockState: any = createMockState();

vi.mock('../../app/store/game-store', () => ({
  useGameStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  selectWeek: (state: typeof mockState) => state.week,
  selectYear: (state: typeof mockState) => state.year,
  selectPhase: (state: typeof mockState) => state.phase,
  selectUserTeam: (state: typeof mockState) => state.userTeam,
  selectCurrentWeeklyPrepPlan: (state: typeof mockState) => state.currentWeeklyPrepPlan,
  selectCurrentOpponentReport: (state: typeof mockState) => state.currentOpponentReport,
  selectCurrentOpponentIntel: (state: typeof mockState) => state.currentOpponentIntel,
}));

describe('GamePlanSetup', () => {
  beforeEach(() => {
    mockState = createMockState();
  });

  it('renders the scouting report and recommendation-driven controls', () => {
    const markup = renderToStaticMarkup(<MfdTooltipProvider><GamePlanSetup /></MfdTooltipProvider>);

    expect(markup).toContain('WEEKLY PREP');
    expect(markup).toContain('Austin Armadillos');
    expect(markup).toContain('7-3');
    expect(markup).toContain('Attack lane: passing');
    expect(markup).toContain('NEXT CALL');
    expect(markup).toContain('Primary decision');
    expect(markup).toContain('Stress the secondary early.');
    expect(markup).toContain('Save Weekly Prep &amp; Sim');
    expect(markup).toContain('Skip With Auto Prep');
  });

  it('shows the call your shot panel on eligible late-season weeks', () => {
    mockState.week = 15;

    const markup = renderToStaticMarkup(<MfdTooltipProvider><GamePlanSetup /></MfdTooltipProvider>);

    expect(markup).toContain('CALL YOUR SHOT');
    expect(markup).toContain('Rivalry week');
    expect(markup).toContain('We&#x27;ll Dominate the Air');
  });

  it('renders contingency, trick-play, and playbook tabs in the prep extras panel', () => {
    const markup = renderToStaticMarkup(<MfdTooltipProvider><GamePlanSetup /></MfdTooltipProvider>);

    expect(markup).toContain('PREP EXTRAS');
    expect(markup).toContain('Contingencies');
    expect(markup).toContain('Trick Plays');
    expect(markup).toContain('Playbook');
    expect(markup).toContain('Add Contingency Rule');
  });

  it('shows persisted prep metadata when a weekly prep plan already exists', () => {
    mockState.currentWeeklyPrepPlan = {
      teamId: 'team-1',
      opponentTeamId: 'team-2',
      year: 2029,
      week: 11,
      offensiveFocus: 'attack_secondary',
      defensiveFocus: 'limit_explosive',
      practiceIntensity: 'normal',
      keyMatchupPlayerId: 'qb-1',
      snapManagement: 'ride_stars',
      specialSituation: 'third_down',
      contingencyRules: [{
        id: 'rule-1',
        trigger: 'trailing_14_at_half',
        action: { type: 'go_aggressive' },
        label: 'IF TRAILING BIG -> GO AGGRESSIVE',
        description: 'Mock rule',
      }],
      trickPlays: ['flea_flicker'],
    };

    const markup = renderToStaticMarkup(<MfdTooltipProvider><GamePlanSetup /></MfdTooltipProvider>);

    expect(markup).toContain('weekly prep locked');
    expect(markup).toContain('contingencies 1/3');
    expect(markup).toContain('trick plays 1/2');
  });

  it('falls back to the scouting pending empty state when intel is unavailable', () => {
    mockState.currentOpponentReport = null;
    mockState.currentOpponentIntel = null;

    const markup = renderToStaticMarkup(<MfdTooltipProvider><GamePlanSetup /></MfdTooltipProvider>);

    expect(markup).toContain('SCOUTING PENDING');
    expect(markup).toContain('No opponent intel is available for this week.');
  });
});
