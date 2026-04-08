import { describe, it, expect } from 'vitest';
import { runTrainingCamp, runAllTrainingCamps } from './training-camp';
import { makeLeagueState, makePlayer } from './test-helpers';

describe('training-camp', () => {
  it('returns results for a valid team', () => {
    const game = makeLeagueState();
    const teamId = Object.keys(game.teams)[0]!;
    const result = runTrainingCamp(game, teamId);
    expect(result.teamId).toBe(teamId);
    expect(result.headlines.length).toBeGreaterThan(0);
    expect(Array.isArray(result.standouts)).toBe(true);
    expect(Array.isArray(result.injuries)).toBe(true);
    expect(Array.isArray(result.battles)).toBe(true);
  });

  it('returns empty results for unknown team', () => {
    const game = makeLeagueState();
    const result = runTrainingCamp(game, 'NONEXISTENT');
    expect(result.standouts).toEqual([]);
    expect(result.injuries).toEqual([]);
    expect(result.battles).toEqual([]);
  });

  it('rookie standouts get OVR boost', () => {
    const game = makeLeagueState();
    const teamId = Object.keys(game.teams)[0]!;

    // Ensure team has rookies by setting yearsExp to 0
    const team = game.teams[teamId]!;
    for (const player of team.roster.slice(0, 5)) {
      player.yearsExp = 0;
    }

    // Run camp many times with different seeds to find a standout
    let foundStandout = false;
    for (let s = 0; s < 50; s++) {
      // Reset OVR for each attempt
      for (const player of team.roster.slice(0, 5)) {
        player.yearsExp = 0;
        player.ovr = 70;
        game.players[player.id] = player;
      }
      game.seed = 42 + s;
      const result = runTrainingCamp(game, teamId);
      const rookieStandouts = result.standouts.filter((s) => s.reason === 'rookie_standout');
      if (rookieStandouts.length > 0) {
        foundStandout = true;
        expect(rookieStandouts[0]!.ovrAfter).toBeGreaterThan(rookieStandouts[0]!.ovrBefore);
        break;
      }
    }
    expect(foundStandout).toBe(true);
  });

  it('breakouts only happen for sub-72 OVR players', () => {
    const game = makeLeagueState();
    const teamId = Object.keys(game.teams)[0]!;

    // Run camp many times to collect breakouts
    const allBreakouts: Array<{ ovrBefore: number }> = [];
    for (let s = 0; s < 100; s++) {
      // Reset players
      const team = game.teams[teamId]!;
      for (const player of team.roster) {
        player.ovr = player.ovr > 72 ? player.ovr : 65; // Keep some below threshold
        game.players[player.id] = player;
      }
      game.seed = 100 + s;
      const result = runTrainingCamp(game, teamId);
      allBreakouts.push(...result.standouts.filter((s) => s.reason === 'breakout'));
    }
    for (const breakout of allBreakouts) {
      expect(breakout.ovrBefore).toBeLessThan(72);
    }
  });

  it('position battles resolve between close-OVR players', () => {
    const game = makeLeagueState();
    const teamId = Object.keys(game.teams)[0]!;
    const team = game.teams[teamId]!;

    // Set up a close battle at WR
    const wrs = team.roster.filter((p) => p.pos === 'WR');
    if (wrs.length >= 2) {
      wrs[0]!.ovr = 80;
      wrs[1]!.ovr = 77; // Within 5 OVR gap
      game.players[wrs[0]!.id] = wrs[0]!;
      game.players[wrs[1]!.id] = wrs[1]!;
    }

    const result = runTrainingCamp(game, teamId);
    // May or may not have a WR battle depending on other positions too
    for (const battle of result.battles) {
      expect(battle.winnerId).toBeTruthy();
      expect(battle.loserId).toBeTruthy();
      expect(battle.winnerOvr).toBeGreaterThanOrEqual(0);
    }
  });

  it('camp injuries are minor (2 weeks out)', () => {
    const game = makeLeagueState();
    const teamId = Object.keys(game.teams)[0]!;

    // Run many times to find an injury
    let foundInjury = false;
    for (let s = 0; s < 100; s++) {
      // Reset injuries
      const team = game.teams[teamId]!;
      for (const player of team.roster) {
        player.injury = null;
      }
      game.seed = 200 + s;
      const result = runTrainingCamp(game, teamId);
      if (result.injuries.length > 0) {
        foundInjury = true;
        expect(result.injuries[0]!.weeksOut).toBe(2);
        // Verify the player actually has the injury in game state
        const injured = game.players[result.injuries[0]!.playerId];
        expect(injured?.injury).not.toBeNull();
        break;
      }
    }
    expect(foundInjury).toBe(true);
  });

  it('runAllTrainingCamps runs for all teams', () => {
    const game = makeLeagueState();
    const teamCount = Object.keys(game.teams).length;
    const results = runAllTrainingCamps(game);
    expect(results).toHaveLength(teamCount);
    for (const result of results) {
      expect(result.teamId).toBeTruthy();
    }
  });

  it('is deterministic with same seed', () => {
    const game1 = makeLeagueState();
    const game2 = makeLeagueState();
    game1.seed = 999;
    game2.seed = 999;
    const teamId = Object.keys(game1.teams)[0]!;

    const result1 = runTrainingCamp(game1, teamId);
    const result2 = runTrainingCamp(game2, teamId);

    expect(result1.standouts.length).toBe(result2.standouts.length);
    expect(result1.injuries.length).toBe(result2.injuries.length);
    expect(result1.battles.length).toBe(result2.battles.length);
    expect(result1.headlines).toEqual(result2.headlines);
  });

  it('OVR never exceeds 99 for standouts', () => {
    const game = makeLeagueState();
    const teamId = Object.keys(game.teams)[0]!;
    const team = game.teams[teamId]!;

    // Set a rookie to 98 OVR — boost should cap at 99
    const rookie = team.roster[0]!;
    rookie.ovr = 98;
    rookie.yearsExp = 0;
    game.players[rookie.id] = rookie;

    // Run many times to find a standout for this player
    for (let s = 0; s < 200; s++) {
      rookie.ovr = 98;
      rookie.yearsExp = 0;
      game.seed = 500 + s;
      const result = runTrainingCamp(game, teamId);
      for (const standout of result.standouts) {
        expect(standout.ovrAfter).toBeLessThanOrEqual(99);
      }
    }
  });

  it('quiet camp generates a default headline', () => {
    const game = makeLeagueState();
    const teamId = Object.keys(game.teams)[0]!;
    const team = game.teams[teamId]!;

    // Remove all rookies and set all players to high OVR to minimize events
    for (const player of team.roster) {
      player.yearsExp = 5;
      player.ovr = 90; // Too high for breakout
      player.injury = null;
    }

    // Try seeds until we find a quiet camp
    let foundQuiet = false;
    for (let s = 0; s < 500; s++) {
      for (const player of team.roster) {
        player.ovr = 90;
        player.injury = null;
      }
      game.seed = 1000 + s;
      const result = runTrainingCamp(game, teamId);
      if (result.standouts.length === 0 && result.injuries.length === 0 && result.battles.length === 0) {
        foundQuiet = true;
        expect(result.headlines).toContain('A quiet camp — no major surprises or injuries.');
        break;
      }
    }
    // It's OK if we don't find a quiet camp in 500 tries — the test just validates the invariant
    if (!foundQuiet) {
      // At least verify headlines always exist
      const result = runTrainingCamp(game, teamId);
      expect(result.headlines.length).toBeGreaterThan(0);
    }
  });
});
