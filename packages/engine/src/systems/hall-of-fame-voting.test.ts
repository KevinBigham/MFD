import { describe, expect, it } from 'vitest';
import type { PlayerArchiveEntry } from '../types';
import {
  buildBallotFromEligible,
  FIRST_BALLOT_THRESHOLD,
  inductHallOfFame,
  simulateHOFBallot,
  type HOFBallotEntry,
} from './hall-of-fame';
import { makeLeagueState } from './test-helpers';

function ballotEntry(overrides: Partial<HOFBallotEntry> = {}): HOFBallotEntry {
  return {
    playerId: 'candidate-1',
    name: 'Candidate One',
    position: 'QB',
    score: 80,
    yearsOnBallot: 1,
    votePct: 0,
    ...overrides,
  };
}

function archiveEntry(playerId: string, peakOvr: number): PlayerArchiveEntry {
  return {
    playerId,
    firstName: 'Hall',
    lastName: 'Candidate',
    name: `Hall ${playerId}`,
    positions: ['QB'],
    jerseyNumber: 12,
    peakOvr,
    peakYear: 2026,
    firstYear: 2020,
    lastYear: 2030,
    retirementYear: 2030,
    teamHistory: [{ teamId: 'afce1', firstYear: 2020, lastYear: 2030 }],
    careerStats: {
      gp: 170,
      seasons: 11,
      mvps: peakOvr >= 90 ? 2 : 0,
      allPros: peakOvr >= 90 ? 4 : 1,
      proBowls: 5,
      championships: peakOvr >= 90 ? 2 : 0,
    },
  };
}

describe('hall of fame ballot voting', () => {
  it('inducts first-ballot candidates above the first-ballot threshold immediately', () => {
    const result = simulateHOFBallot([
      ballotEntry({
        playerId: 'first-ballot',
        name: 'First Ballot',
        score: FIRST_BALLOT_THRESHOLD,
      }),
    ], () => 0);

    expect(result.inducted).toHaveLength(1);
    expect(result.firstBallotInductees).toEqual(['first-ballot']);
    expect(result.inducted[0]?.votePct).toBeGreaterThanOrEqual(95);
  });

  it('can waitlist a borderline candidate', () => {
    const result = simulateHOFBallot([
      ballotEntry({
        playerId: 'borderline',
        name: 'Borderline',
        score: 78,
      }),
    ], () => 0);

    expect(result.inducted).toEqual([]);
    expect(result.waitlisted).toHaveLength(1);
    expect(result.waitlisted[0]?.yearsOnBallot).toBe(2);
  });

  it('eliminates candidates who fail on their fifth ballot', () => {
    const result = simulateHOFBallot([
      ballotEntry({
        playerId: 'linger',
        name: 'Linger',
        score: 72,
        yearsOnBallot: 5,
      }),
    ], () => 0);

    expect(result.inducted).toEqual([]);
    expect(result.waitlisted).toEqual([]);
    expect(result.eliminated.map((entry) => entry.playerId)).toEqual(['linger']);
  });

  it('caps the inducted class at five players', () => {
    const result = simulateHOFBallot(Array.from({ length: 6 }, (_, index) =>
      ballotEntry({
        playerId: `candidate-${index}`,
        name: `Candidate ${index}`,
        score: 95 - index,
      })), () => 0);

    expect(result.inducted).toHaveLength(5);
    expect(result.waitlisted).toHaveLength(1);
  });

  it('assigns higher vote percentages to higher-scoring candidates', () => {
    const result = simulateHOFBallot([
      ballotEntry({ playerId: 'low-score', score: 72 }),
      ballotEntry({ playerId: 'high-score', score: 89 }),
    ], () => 0);

    const allResults = [...result.inducted, ...result.waitlisted, ...result.eliminated];
    const low = allResults.find((entry) => entry.playerId === 'low-score')!;
    const high = allResults.find((entry) => entry.playerId === 'high-score')!;

    expect(high.votePct).toBeGreaterThan(low.votePct);
  });

  it('does not return eliminated players to future ballots', () => {
    const game = makeLeagueState('offseason');
    game.year = 2032;
    game.ballotWaitlist = [
      ballotEntry({
        playerId: 'linger',
        name: 'Linger',
        score: 72,
        yearsOnBallot: 5,
      }),
    ];
    game.playerArchive = [archiveEntry('linger', 86)];

    const inducted = inductHallOfFame(game, 2031);
    const nextBallot = buildBallotFromEligible(game);

    expect(inducted).toEqual([]);
    expect(game.ballotWaitlist).toEqual([]);
    expect(nextBallot.some((entry) => entry.playerId === 'linger')).toBe(false);
  });
});
