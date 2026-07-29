import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MfdTooltipProvider } from '@mfd/design-system/components';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  GamePlanSetup,
  PLAN_TOOLTIPS,
  buildRecommendedWeeklyPrepPlan,
  buildWeeklyPrepSourceRows,
} from './GamePlanSetup';

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
      strengths: ['QB, WR, and TE group wins deep routes; safeties and corners need help rules before kickoff.'],
      weaknesses: ['Secondary gives up repeated throws; assign QB, WR, and TE timing reps before kickoff.'],
      keyPlayers: [{ id: 'opp-1', name: 'Rex Cole', pos: 'CB', ovr: 72 }],
      schemeRecommendation: {
        offense: 'pass_heavy',
        defense: 'coverage',
        reasoning: 'Set pass heavy and coverage before Advance Week; bad calls give Austin Armadillos the matchup they already want.',
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
        offense: ['Throw at their secondary early; missed timing turns those calls into punts.'],
        defense: ['Hit the quarterback before deep routes develop; missed pressure leaves explosive throws open.'],
      },
    },
    upcomingRivalry: null,
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
  selectUpcomingRivalry: (state: typeof mockState) => state.upcomingRivalry,
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
    expect(markup).toContain('WEEKLY PREP SOURCES');
    expect(markup).toContain('OPPONENT INTEL');
    expect(markup).toContain('selectCurrentOpponentReport');
    expect(markup).toContain('DECISION FORECAST');
    expect(markup).toContain('Save Weekly Prep &amp; Sim writes the plan');
    expect(markup).toContain('TRICK PLAY BOUNDARY');
    expect(markup).toContain('Selected trick plays are saved in the weekly prep plan');
    expect(markup).toContain('enter the seeded live-drive caller at most once per play');
    expect(markup).toContain('Opening Game Plan does not click Advance Week');
    expect(markup).toContain('create Film Room entries');
    expect(markup).toContain('NEXT CALL');
    expect(markup).toContain('Use Recommended');
    expect(markup).toContain('data-mfd-use-recommended="game-plan"');
    expect(markup).toContain('does not save or advance');
    expect(markup).toContain('loads the scout-matched core settings for review');
    expect(markup).toContain('preserves optional extras');
    expect(markup).toContain('DECISION FORECAST');
    expect(PLAN_TOOLTIPS['Practice Intensity']).toContain('Set practice contact before Save Weekly Prep');
    expect(PLAN_TOOLTIPS['Practice Intensity']).toContain('Light lowers injury-report chances but leaves fewer reps');
    expect(PLAN_TOOLTIPS['Practice Intensity']).toContain('Full Pads raises install gains and injury-report chances before Advance Week');
    expect(PLAN_TOOLTIPS['Practice Intensity']).not.toContain('maximum readiness');
    expect(markup).toContain('OFFENSE VS SCOUT REPORT');
    expect(markup).toContain('DEFENSE VS SCOUT REPORT');
    expect(markup).toContain('Immediate');
    expect(markup).toContain('Uncertainty');
    expect(markup).toContain('Scout report matched');
    expect(markup).toContain('SCOUT MATCH');
    expect(markup).toContain('missed timing turns those calls into punts');
    expect(markup).toContain('missed pressure leaves explosive throws open');
    expect(markup).toContain('Save Weekly Prep &amp; Sim');
    expect(markup).toContain('Skip With Auto Prep');
    expect(markup).not.toMatch(/\b(?:REC|Off-script bet|Balanced hedge|sim gets|variance|less signal|film-room receipts|tricks|staff board|auto-prep|can stress the secondary|control tempo|leverage|Stress the secondary|maximum readiness|Offensive alignment|Defensive alignment)\b/i);
  });

  it('builds stable scout-matched recommended core settings', () => {
    expect(buildRecommendedWeeklyPrepPlan({
      teamId: 'team-1',
      opponentTeamId: 'team-2',
      year: 2029,
      week: 11,
      attackLane: 'passing',
      defendLane: 'rushing',
    })).toEqual({
      teamId: 'team-1',
      opponentTeamId: 'team-2',
      year: 2029,
      week: 11,
      offensiveFocus: 'attack_secondary',
      defensiveFocus: 'stop_run',
      practiceIntensity: 'normal',
      keyMatchupPlayerId: null,
      snapManagement: 'normal',
      specialSituation: 'third_down',
    });
  });

  it('keeps Use Recommended draft-only and preserves optional extras', () => {
    const source = readFileSync(fileURLToPath(new URL('./GamePlanSetup.tsx', import.meta.url)), 'utf8');
    const start = source.indexOf('const handleUseRecommended = () => {');
    const end = source.indexOf('\n  };', start);
    const handler = source.slice(start, end);

    expect(handler).toContain('setOffensiveFocus');
    expect(handler).toContain('setKeyMatchupPlayerId');
    expect(handler).not.toContain('setContingencyRules');
    expect(handler).not.toContain('setSelectedTrickPlays');
    expect(handler).not.toContain('saveWeeklyPrepPlan');
    expect(handler).not.toContain('clearWeeklyPrepPlan');
    expect(handler).not.toContain('advanceWeek');
    expect(handler).not.toContain('setCallYourShot');
  });

  it('shows the call your shot panel on eligible late-season weeks', () => {
    mockState.week = 15;

    const markup = renderToStaticMarkup(<MfdTooltipProvider><GamePlanSetup /></MfdTooltipProvider>);

    expect(markup).toContain('CALL YOUR SHOT');
    expect(markup).toContain('Late-season push');
    expect(markup).toContain('Choose one promise before Save &amp; Sim or Auto Prep');
    expect(markup).toContain('hit it for fan-confidence gain');
    expect(markup).toContain('fan confidence drops in the recap receipt');
    expect(markup).toContain('We&#x27;ll Dominate the Air');
    expect(markup).toContain('Promise 250+ passing yards');
    expect(markup).not.toMatch(/\b(?:Make a bold prediction|bonus morale|Declare aerial supremacy|High risk, huge reward|no matter how)\b/i);
  });

  it('uses live rivalry context instead of a week-number proxy for call your shot eligibility', () => {
    mockState.week = 8;
    mockState.upcomingRivalry = {
      rivalryId: 'team-1::team-2',
      intensity: 67,
      tier: 'heated',
      ovrBoost: 3,
      headline: 'The Blaze and Armadillos are circling this matchup.',
    };

    const markup = renderToStaticMarkup(<MfdTooltipProvider><GamePlanSetup /></MfdTooltipProvider>);

    expect(markup).toContain('CALL YOUR SHOT');
    expect(markup).toContain('Rivalry week');
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
    expect(markup).toContain('SAVED BOARD');
  });

  it('labels selected trick plays as planned weekly-prep data, not live sim execution', () => {
    const rows = buildWeeklyPrepSourceRows({
      reportTeamName: 'Austin Armadillos',
      week: 11,
      storedPlan: true,
      alignmentLabel: 'Intel matched',
      loadLabel: 'Balanced load',
      extrasLabel: 'Extras ready',
      contingencyCount: 1,
      trickPlayCount: 2,
    });

    const trickBoundary = rows.find((row) => row.id === 'trick-play-boundary');
    expect(trickBoundary).toMatchObject({
      label: 'Trick play boundary',
      value: '2 planned',
      accent: 'cyan',
    });
    expect(trickBoundary?.detail).toContain('saved in the weekly prep plan');
    expect(trickBoundary?.detail).toContain('enter the seeded live-drive caller at most once per play');
  });

  it('falls back to the scouting pending empty state when intel is unavailable', () => {
    mockState.currentOpponentReport = null;
    mockState.currentOpponentIntel = null;

    const markup = renderToStaticMarkup(<MfdTooltipProvider><GamePlanSetup /></MfdTooltipProvider>);

    expect(markup).toContain('SCOUTING PENDING');
    expect(markup).toContain('No opponent intel is available for this week.');
  });
});
