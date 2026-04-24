import { describe, expect, it } from 'vitest';
import type { GameResult } from '../types';
import { mulberry32 } from '../rng';
import { checkForNamedGame, detectNamedGame, formatNamedGame, NAMED_GAME_PRIORITY } from './named-games';

function makeResult(homeScore: number, awayScore: number, overrides: Partial<GameResult> = {}): GameResult {
  return {
    id: 'game-1',
    homeTeamId: 'team-a',
    awayTeamId: 'team-b',
    homeScore,
    awayScore,
    week: 5,
    year: 2026,
    overtime: false,
    mvpPlayerId: null,
    stats: {
      'team-a': {
        totalYards: 300,
        passingYards: 180,
        rushingYards: 120,
        turnovers: 1,
        sacks: 2,
        pressuresAllowed: 2,
        thirdDownConversions: 5,
        thirdDownAttempts: 11,
        timeOfPossession: 28,
        passAttempts: 25,
        passCompletions: 17,
        passTDs: 2,
        interceptions: 1,
        rushAttempts: 24,
        rushTDs: 1,
        fumbles: 0,
        penalties: 4,
        penaltyYards: 35,
        fgMade: 1,
        fgAttempted: 1,
        punts: 4,
        drives: 11,
        yacYards: 52,
        redZoneTrips: 3,
        redZoneScores: 2,
        quarterScores: [7, 7, 7, homeScore - 21],
        playerLines: [],
      },
      'team-b': {
        totalYards: 280,
        passingYards: 170,
        rushingYards: 110,
        turnovers: 1,
        sacks: 2,
        pressuresAllowed: 2,
        thirdDownConversions: 5,
        thirdDownAttempts: 11,
        timeOfPossession: 32,
        passAttempts: 24,
        passCompletions: 16,
        passTDs: 2,
        interceptions: 1,
        rushAttempts: 23,
        rushTDs: 1,
        fumbles: 0,
        penalties: 5,
        penaltyYards: 40,
        fgMade: 1,
        fgAttempted: 1,
        punts: 4,
        drives: 11,
        yacYards: 48,
        redZoneTrips: 3,
        redZoneScores: 2,
        quarterScores: [7, 7, 7, awayScore - 21],
        playerLines: [],
      },
    } as any,
    playerMatchupEvents: [],
    ...overrides,
  } as GameResult;
}

describe('Named Games', () => {
  it('detects The Snow Bowl', () => {
    const named = detectNamedGame(makeResult(13, 10, { weather: 'snow' }), { weather: 'snow' });
    expect(named?.name).toBe('The Snow Bowl');
  });

  it('keeps the result weather fallback when context weather is explicitly undefined', () => {
    const named = detectNamedGame(makeResult(13, 10, { weather: 'snow' }), { weather: undefined });

    expect(named?.name).toBe('The Snow Bowl');
  });

  it('detects The Shootout', () => {
    const named = detectNamedGame(makeResult(42, 35));
    expect(named?.name).toBe('The Shootout');
  });

  it('detects The X-Yard Miracle from a clutch 50+ yard winner', () => {
    const named = detectNamedGame(makeResult(31, 28), {
      winningPlayYards: 72,
      winningPlayClutch: true,
      winningPlayType: 'offense',
    });

    expect(named?.name).toBe('The 72-Yard Miracle');
  });

  it('detects The Statement on a 21+ point win over a ranked rival', () => {
    const named = detectNamedGame(makeResult(38, 10), {
      isRivalry: true,
      awayRank: 8,
    });

    expect(named?.name).toBe('The Statement');
  });

  it('detects The Heartbreaker on a late three-point loss after leading by 10+', () => {
    const named = detectNamedGame(makeResult(24, 27), {
      homeLeadStartQ4: 13,
    });

    expect(named?.name).toBe('The Heartbreaker');
  });

  it('detects The Rout on a 35+ point margin', () => {
    const named = detectNamedGame(makeResult(49, 10));
    expect(named?.name).toBe('The Rout');
  });

  it('detects The Coin Flip on a one-score finish with a clutch winner', () => {
    const named = detectNamedGame(makeResult(27, 24), {
      winningPlayClutch: true,
      winningPlayYards: 18,
      winningPlayType: 'field_goal',
    });

    expect(named?.name).toBe('The Coin Flip');
  });

  it('detects The Gauntlet Game after four injuries in a win', () => {
    const named = detectNamedGame(makeResult(24, 20), {
      homeInjuries: 4,
    });

    expect(named?.name).toBe('The Gauntlet Game');
  });

  it('detects The Dagger on a clutch defensive score', () => {
    const named = detectNamedGame(makeResult(31, 21), {
      winningPlayClutch: true,
      winningPlayType: 'defense',
    });

    expect(named?.name).toBe('The Dagger');
  });

  it('detects The Ghost Game on a road primetime upset over a top-five team', () => {
    const named = detectNamedGame(makeResult(21, 24), {
      primetime: true,
      homeRank: 4,
    });

    expect(named?.name).toBe('The Ghost Game');
  });

  it('detects The Comeback and The Collapse from fourth-quarter leverage', () => {
    const comeback = detectNamedGame(makeResult(31, 28), {
      homeLeadStartQ4: -17,
    });
    const collapse = detectNamedGame(makeResult(28, 31), {
      homeLeadStartQ4: 3,
      homeLargestLeadQ4: 17,
    });

    expect(comeback?.name).toBe('The Comeback');
    expect(collapse?.name).toBe('The Collapse');
  });

  it('returns null when no archetype matches', () => {
    const named = detectNamedGame(makeResult(24, 20));
    expect(named).toBeNull();
  });

  it('uses the documented priority order when multiple archetypes match', () => {
    const named = detectNamedGame(makeResult(38, 31, { weather: 'snow' }), {
      weather: 'snow',
      winningPlayYards: 61,
      winningPlayClutch: true,
      winningPlayType: 'offense',
    });

    expect(NAMED_GAME_PRIORITY[0]).toBe('yard_miracle');
    expect(named?.name).toBe('The 61-Yard Miracle');
  });

  it('formats named games for timeline display', () => {
    const text = formatNamedGame({
      name: 'The Snow Bowl',
      archetype: 'snow_bowl',
      gameId: 'g-1',
      year: 2026,
      week: 12,
      homeTeamId: 'team-a',
      awayTeamId: 'team-b',
      winnerTeamId: 'team-a',
      homeScore: 17,
      awayScore: 14,
      reason: 'Played in heavy snow',
    });

    expect(text).toContain('The Snow Bowl');
    expect(text).toContain('Week 12');
    expect(text).toContain('17-14');
  });

  it('falls back to result weather when context is omitted', () => {
    const named = detectNamedGame(makeResult(13, 10, { weather: 'snow' }));

    expect(named?.name).toBe('The Snow Bowl');
  });

  it('treats null context weather as no override for result weather', () => {
    const named = detectNamedGame(makeResult(13, 10, { weather: 'snow' }), { weather: null });

    expect(named?.name).toBe('The Snow Bowl');
  });

  it('lets explicit non-snow context weather override snow result weather', () => {
    const named = detectNamedGame(makeResult(13, 10, { weather: 'snow' }), { weather: 'rain' });

    expect(named).toBeNull();
  });

  it('detects snow from context weather when result weather is absent', () => {
    const named = detectNamedGame(makeResult(13, 10), { weather: 'snow' });

    expect(named?.name).toBe('The Snow Bowl');
  });

  it('does not create a snow bowl from clear weather and a low score', () => {
    const named = detectNamedGame(makeResult(13, 10, { weather: 'clear' }), { weather: 'clear' });

    expect(named).toBeNull();
  });

  it('threads result weather through checkForNamedGame', () => {
    const named = checkForNamedGame(mulberry32(42), makeResult(13, 10, { weather: 'snow' }), false, false);

    expect(named?.archetype).toBe('snow_bowl');
  });

  it('does not invent ranking context for primetime checkForNamedGame calls', () => {
    const named = checkForNamedGame(
      mulberry32(42),
      makeResult(21, 24, { primetime: true }),
      false,
      false,
    );

    expect(named).toBeNull();
  });

  it('keeps weather fallback lower priority than yard miracles', () => {
    const named = detectNamedGame(makeResult(17, 14, { weather: 'snow' }), {
      winningPlayYards: 64,
      winningPlayClutch: true,
      winningPlayType: 'offense',
    });

    expect(named?.archetype).toBe('yard_miracle');
  });

  it('preserves the fallback weather reason on snow bowls', () => {
    const named = detectNamedGame(makeResult(13, 10, { weather: 'snow' }), { weather: undefined });

    expect(named?.reason).toContain('Snow');
  });

  it('returns null for tied low-scoring non-weather games', () => {
    const named = detectNamedGame(makeResult(10, 10), {});

    expect(named).toBeNull();
  });
});
