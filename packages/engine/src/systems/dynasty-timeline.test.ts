import { describe, expect, it } from 'vitest';
import {
  getDynastyByYear,
  getDynastyHighlights,
  recordDynastyEvent,
} from './dynasty-timeline';
import { makeLeagueState } from './test-helpers';

describe('dynasty timeline', () => {
  it('records championships as landmark events', () => {
    const game = makeLeagueState('offseason');

    recordDynastyEvent(game, {
      id: 'title-1',
      year: 2026,
      week: null,
      type: 'championship',
      headline: 'Won the title',
      importance: 'landmark',
      playerIds: [],
      teamIds: ['afce1'],
    });

    expect(game.dynastyTimeline[0]?.importance).toBe('landmark');
  });

  it('records a round one draft pick event', () => {
    const game = makeLeagueState('draft');

    recordDynastyEvent(game, {
      id: 'draft-1',
      year: 2026,
      week: 1,
      type: 'draft_pick',
      headline: 'Selected a franchise tackle in round one',
      importance: 'major',
      playerIds: ['prospect-1'],
      teamIds: ['afce1'],
    });

    expect(game.dynastyTimeline.at(-1)?.type).toBe('draft_pick');
  });

  it('returns the top events by importance first', () => {
    const game = makeLeagueState('offseason');
    recordDynastyEvent(game, {
      id: 'minor-1',
      year: 2026,
      week: 1,
      type: 'signing',
      headline: 'Signed a depth player',
      importance: 'minor',
      playerIds: [],
      teamIds: ['afce1'],
    });
    recordDynastyEvent(game, {
      id: 'major-1',
      year: 2026,
      week: 2,
      type: 'trade',
      headline: 'Won a blockbuster trade',
      importance: 'major',
      playerIds: [],
      teamIds: ['afce1'],
    });
    recordDynastyEvent(game, {
      id: 'landmark-1',
      year: 2026,
      week: null,
      type: 'championship',
      headline: 'Won the championship',
      importance: 'landmark',
      playerIds: [],
      teamIds: ['afce1'],
    });

    expect(getDynastyHighlights(game, 2).map((event) => event.id)).toEqual(['landmark-1', 'major-1']);
  });

  it('filters timeline events by year', () => {
    const game = makeLeagueState('offseason');
    recordDynastyEvent(game, {
      id: 'event-2026',
      year: 2026,
      week: 1,
      type: 'record',
      headline: 'Record broken',
      importance: 'major',
      playerIds: [],
      teamIds: ['afce1'],
    });
    recordDynastyEvent(game, {
      id: 'event-2027',
      year: 2027,
      week: 1,
      type: 'award',
      headline: 'Award won',
      importance: 'major',
      playerIds: [],
      teamIds: ['afce1'],
    });

    expect(getDynastyByYear(game, 2026).map((event) => event.id)).toEqual(['event-2026']);
  });
});
