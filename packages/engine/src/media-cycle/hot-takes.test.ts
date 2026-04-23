import { describe, expect, it } from 'vitest';
import { makeLeagueState } from '../systems/test-helpers';
import type { Headline } from './types';
import { generateHotTakes } from './hot-takes';

function headlines(count: number): Headline[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `headline-${index + 1}`,
    category: (index % 2 === 0 ? 'UPSET' : 'MILESTONE'),
    weekNumber: 8,
    title: `Headline ${index + 1}`,
    summary: `Summary ${index + 1}`,
    teamIds: ['afce1'],
    playerId: null,
    gameId: `game-${index + 1}`,
    importance: index + 1,
  }));
}

describe('media-cycle hot takes', () => {
  it('is deterministic for the same headline set', () => {
    const game = makeLeagueState('regular_season', 8);
    const input = headlines(3);

    expect(generateHotTakes(game, 8, input)).toEqual(generateHotTakes(game, 8, input));
  });

  it('returns one take per headline for the first five headlines', () => {
    const game = makeLeagueState('regular_season', 8);
    expect(generateHotTakes(game, 8, headlines(7))).toHaveLength(5);
  });

  it('preserves the incoming headline order', () => {
    const game = makeLeagueState('regular_season', 8);
    const takes = generateHotTakes(game, 8, headlines(3));

    expect(takes.map((take) => take.headlineId)).toEqual(['headline-1', 'headline-2', 'headline-3']);
  });

  it('includes the requested week number on every take', () => {
    const game = makeLeagueState('regular_season', 8);
    expect(generateHotTakes(game, 8, headlines(2)).every((take) => take.weekNumber === 8)).toBe(true);
  });

  it('uses stable analyst names from the pool', () => {
    const game = makeLeagueState('regular_season', 8);
    const takes = generateHotTakes(game, 8, headlines(4));

    expect(takes.every((take) => ['Cal Knox', 'June Vega', 'Dex Marlowe', 'Rae Holloway'].includes(take.analyst))).toBe(true);
  });

  it('uses only the supported sentiment values', () => {
    const game = makeLeagueState('regular_season', 8);
    const takes = generateHotTakes(game, 8, headlines(4));

    expect(takes.every((take) => ['supportive', 'skeptical', 'combative'].includes(take.sentiment))).toBe(true);
  });

  it('changes output when the week changes', () => {
    const game = makeLeagueState('regular_season', 8);
    const input = headlines(2);

    expect(generateHotTakes(game, 8, input)).not.toEqual(generateHotTakes(game, 9, input));
  });

  it('returns empty output when no headlines exist', () => {
    const game = makeLeagueState('regular_season', 8);
    expect(generateHotTakes(game, 8, [])).toEqual([]);
  });

  it('links each take back to the source headline id', () => {
    const game = makeLeagueState('regular_season', 8);
    const input = headlines(2);
    const takes = generateHotTakes(game, 8, input);

    expect(takes[0]?.id).toBe('take|headline-1');
    expect(takes[1]?.id).toBe('take|headline-2');
  });

  it('always emits non-empty angle and quote text', () => {
    const game = makeLeagueState('regular_season', 8);
    const takes = generateHotTakes(game, 8, headlines(3));

    expect(takes.every((take) => take.angle.length > 0 && take.quote.length > 0)).toBe(true);
  });
});
