import { describe, expect, it } from 'vitest';
import { buildSeasonSchedule } from './season-schedule';

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
});
