import { describe, expect, it } from 'vitest';
import { applyRuleChange, initLeagueRules } from './league-rules';
import { buildSeasonSchedule, getConfiguredScheduleWeekCount, getRegularSeasonWeekCount } from './season-schedule';

function emptySchedule(weeks: number) {
  return Array.from({ length: weeks }, (_, index) => ({ week: index + 1, games: [] }));
}

describe('season schedule generation', () => {
  it('creates one bye per week for odd team counts and remains deterministic', () => {
    const teamIds = ['a', 'b', 'c', 'd', 'e'];

    const left = buildSeasonSchedule(teamIds, 2030);
    const right = buildSeasonSchedule(teamIds, 2030);

    expect(left).toEqual(right);
    expect(left).toHaveLength(18);
    expect(left.every((week) => Array.isArray(week.games))).toBe(true);

    for (const week of left) {
      const participants = new Set(week.games.flatMap((game) => [game.homeTeamId, game.awayTeamId]));
      expect(participants.size).toBe(4);
      expect(teamIds.filter((teamId) => !participants.has(teamId))).toHaveLength(1);
    }
  });

  it('reads the league rule override for shorter schedules', () => {
    const teamIds = ['a', 'b', 'c', 'd'];
    const leagueRules = applyRuleChange(initLeagueRules(2030), {
      key: 'schedule_weeks',
      newValue: 17,
      source: 'commissioner_vote',
      proposedBy: 'comm-1',
      effectiveYear: 2030,
      rationale: 'Trim the season.',
    });

    const schedule = buildSeasonSchedule(teamIds, 2030, { year: 2030, leagueRules } as never);

    expect(schedule).toHaveLength(17);
  });

  it('ignores future schedule changes until they are effective', () => {
    const teamIds = ['a', 'b', 'c', 'd'];
    const leagueRules = applyRuleChange(initLeagueRules(2030), {
      key: 'schedule_weeks',
      newValue: 19,
      source: 'commissioner_vote',
      proposedBy: 'comm-1',
      effectiveYear: 2032,
      rationale: 'Expand the calendar later.',
    });

    const currentYear = buildSeasonSchedule(teamIds, 2030, { year: 2030, leagueRules } as never);
    const futureYear = buildSeasonSchedule(teamIds, 2032, { year: 2032, leagueRules } as never);

    expect(currentYear).toHaveLength(18);
    expect(futureYear).toHaveLength(19);
  });

  it('reports generated schedule length while falling back to effective rules', () => {
    const leagueRules = applyRuleChange(initLeagueRules(2030), {
      key: 'schedule_weeks',
      newValue: 17,
      source: 'commissioner_vote',
      proposedBy: 'comm-1',
      effectiveYear: 2030,
      rationale: 'Trim the season.',
    });

    expect(getConfiguredScheduleWeekCount({ year: 2030, leagueRules })).toBe(17);
    expect(getRegularSeasonWeekCount({ year: 2030, leagueRules, schedule: emptySchedule(19) })).toBe(19);
    expect(getRegularSeasonWeekCount({ year: 2030, leagueRules, schedule: emptySchedule(2) })).toBe(17);
    expect(getRegularSeasonWeekCount(null)).toBe(18);
  });
});
