import { describe, expect, it } from 'vitest';
import { setSeed } from '../rng';
import { simGame } from './game-sim';
import { makeTeam } from './test-helpers';

describe('game sim balance', () => {
  it('stays within the target scoring and efficiency ranges across 1000 deterministic games', () => {
    const gameCount = 1000;
    let passAttempts = 0;
    let passCompletions = 0;
    let sacks = 0;
    let totalScore = 0;
    let turnovers = 0;

    for (let index = 0; index < gameCount; index += 1) {
      setSeed(10_000 + index);
      const home = makeTeam('home', 'AFC', 'East', false, 78);
      const away = makeTeam('away', 'NFC', 'West', false, 77);
      const result = simGame(home, away);

      passAttempts += result.homeStats.passAttempts + result.awayStats.passAttempts;
      passCompletions += result.homeStats.passCompletions + result.awayStats.passCompletions;
      sacks += result.homeStats.sacks + result.awayStats.sacks;
      totalScore += result.homeScore + result.awayScore;
      turnovers += result.homeStats.turnovers + result.awayStats.turnovers;
    }

    const avgCompletionPct = (passCompletions / passAttempts) * 100;
    const avgSackRate = (sacks / (passAttempts + sacks)) * 100;
    const avgSacksPerGame = sacks / gameCount;
    const avgCombinedScore = totalScore / gameCount;
    const avgTurnoversPerGame = turnovers / gameCount;

    expect(avgCompletionPct).toBeGreaterThanOrEqual(58);
    expect(avgCompletionPct).toBeLessThanOrEqual(68);
    expect(avgSackRate).toBeGreaterThanOrEqual(5);
    expect(avgSackRate).toBeLessThanOrEqual(9);
    expect(avgSacksPerGame).toBeGreaterThanOrEqual(2);
    expect(avgSacksPerGame).toBeLessThanOrEqual(4);
    expect(avgCombinedScore).toBeGreaterThanOrEqual(38);
    expect(avgCombinedScore).toBeLessThanOrEqual(52);
    expect(avgTurnoversPerGame).toBeGreaterThanOrEqual(2);
    expect(avgTurnoversPerGame).toBeLessThanOrEqual(4);
  });
});
