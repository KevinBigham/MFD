import { describe, expect, it } from 'vitest';
import {
  createPostGamePressConference,
  maybeCreateMidweekPressConference,
  recordPressConference,
  seedLeagueRivalries,
} from '../index';
import { makeLeagueState } from './test-helpers';

describe('press conferences', () => {
  it('builds a contextual postgame conference with reporter questions and effects', () => {
    const game = makeLeagueState('regular_season', 3);
    const conference = createPostGamePressConference({
      game,
      team: game.teams.afce1!,
      opponent: game.teams.afce2!,
      result: 'win',
      topic: 'division statement',
      rivalryIntensity: 62,
      ownerDelta: 4,
    });

    expect(conference.type).toBe('postgame');
    expect(conference.reporterQuestions.length).toBeGreaterThanOrEqual(1);
    expect(conference.quotes.length).toBeGreaterThanOrEqual(2);
    expect(conference.effects.some((effect) => effect.sourceType === 'press_conference')).toBe(true);
  });

  it('creates a midweek conference before a heated rivalry matchup and stores only the latest five', () => {
    const game = makeLeagueState('regular_season', 2);
    game.schedule.splice(1, 0, {
      week: 2,
      games: [{ homeTeamId: 'afce1', awayTeamId: 'afce2', result: null }],
    });
    seedLeagueRivalries(game);
    const rivalry = game.leagueRivalries.find((entry) => entry.id === 'afce1::afce2')!;
    rivalry.intensity = 70;

    const conference = maybeCreateMidweekPressConference(game, game.teams.afce1!);
    expect(conference).not.toBeNull();
    expect(conference?.topic.toLowerCase()).toContain('rival');

    for (let index = 0; index < 6; index++) {
      recordPressConference(game, {
        ...(conference ?? {
          id: 'fallback',
          type: 'midweek',
          year: 2026,
          week: 2,
          teamId: 'afce1',
          speaker: 'Head Coach',
          speakerRole: 'HC',
          topic: 'fallback',
          tone: 'confident',
          headline: 'Fallback',
          opener: 'Fallback',
          quotes: ['Fallback quote'],
          reporterQuestions: [],
          effects: [],
        }),
        id: `pc-${index}`,
      });
    }

    expect(game.recentPressConferences).toHaveLength(5);
    expect(game.recentPressConferences[0]!.id).toBe('pc-5');
  });
});
