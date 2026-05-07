import { describe, expect, it } from 'vitest';
import {
  buildWeeklyGuidance,
  buildWeeklyGuidanceFromGame,
  formatChipWeeklyGuidanceText,
} from './weeklyGuidance';

describe('Chip weekly guidance', () => {
  it('ranks injury and missing-plan actions above lower-pressure context', () => {
    const guidance = buildWeeklyGuidance({
      currentWeek: 4,
      currentSeason: 2026,
      phase: 'regular_season',
      outcome: 'cleanWin',
      record: '3-1',
      opponentName: 'Portland Pioneers',
      injuredStarterCount: 1,
      injuryCount: 2,
      capSpace: 18,
      ownerMood: 68,
      chemistry: 54,
      pendingDecisions: 0,
      hasGamePlan: false,
      difficulty: 'standard',
    });

    expect(guidance.headline).toBe('Win banked, problem still on the board');
    expect(guidance.recommendedActions.map((action) => action.route).slice(0, 2)).toEqual([
      '/depth-chart',
      '/game-plan',
    ]);
    expect(guidance.whatChanged).toContain('1 injured starter needs a depth answer.');
    expect(guidance.risks[0]).toContain('passing plan may collapse');
  });

  it('surfaces cap pressure and pending decisions with deterministic action order', () => {
    const first = buildWeeklyGuidance({
      currentWeek: 8,
      currentSeason: 2027,
      phase: 'regular_season',
      outcome: 'loss',
      record: '3-5',
      injuredStarterCount: 0,
      injuryCount: 0,
      capSpace: -6,
      ownerMood: 31,
      chemistry: 39,
      pendingDecisions: 3,
      hasGamePlan: true,
      difficulty: 'hard',
    });
    const second = buildWeeklyGuidance({
      currentWeek: 8,
      currentSeason: 2027,
      phase: 'regular_season',
      outcome: 'loss',
      record: '3-5',
      injuredStarterCount: 0,
      injuryCount: 0,
      capSpace: -6,
      ownerMood: 31,
      chemistry: 39,
      pendingDecisions: 3,
      hasGamePlan: true,
      difficulty: 'hard',
    });

    expect(second).toEqual(first);
    expect(first.recommendedActions.map((action) => action.route).slice(0, 3)).toEqual([
      '/contracts',
      '/inbox',
      '/film-room',
    ]);
    expect(first.risks).toContain('Hard difficulty makes ignored cap and morale pressure bite faster.');
  });

  it('builds guidance from loose game state without requiring engine imports', () => {
    const guidance = buildWeeklyGuidanceFromGame({
      week: 2,
      year: 2026,
      phase: 'regular_season',
      currentGamePlan: null,
      weekSummaries: [{
        result: 'loss',
        headline: 'Late pressure buried the pocket',
        record: '0-1',
        injuries: [{ playerId: 'rt-1' }],
      }],
      teams: {
        user: {
          id: 'user',
          isUser: true,
          wins: 0,
          losses: 1,
          capSpace: 7,
          ownerMood: 44,
          lockerRoom: { cultureScore: 38 },
          roster: [
            { id: 'rt-1', name: 'Rex Tackle', pos: 'OL', isStarter: true, injury: { weeks: 2 } },
            { id: 'wr-2', name: 'Dee Wide', pos: 'WR', isStarter: false, injury: null },
          ],
        },
      },
    }, 2);

    expect(guidance.record).toBe('0-1');
    expect(guidance.recommendedActions[0]).toMatchObject({
      route: '/depth-chart',
      label: 'Fix the depth chart',
    });
    expect(guidance.featureLinks.map((link) => link.route)).toContain('/inbox');
  });

  it('formats a concise dock message with the top action and risk', () => {
    const guidance = buildWeeklyGuidance({
      currentWeek: 12,
      currentSeason: 2028,
      phase: 'regular_season',
      outcome: 'blowoutLoss',
      record: '5-6',
      injuredStarterCount: 0,
      injuryCount: 0,
      capSpace: 22,
      ownerMood: 70,
      chemistry: 63,
      pendingDecisions: 0,
      hasGamePlan: true,
      difficulty: 'standard',
    });
    const text = formatChipWeeklyGuidanceText(guidance);

    expect(text).toContain('Next: Review the film room.');
    expect(text.length).toBeLessThanOrEqual(240);
  });
});
