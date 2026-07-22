import { describe, expect, it } from 'vitest';
import { simulateSnapShadow } from './snap-shadow';
import { deriveSnapTeamBoxScore } from './snap-stats';
import { makeTeam } from './test-helpers';

describe('snap-derived box scores', () => {
  it('reconciles team and player offense to the exact snap ledger', () => {
    const home = makeTeam('home', 'AFC', 'East', true, 80);
    const away = makeTeam('away', 'NFC', 'West', false, 77);
    const game = simulateSnapShadow('snap-stats', { id: home.id, overall: 80 }, { id: away.id, overall: 77 }, 90210);
    const box = deriveSnapTeamBoxScore(game.snapEvents, home);
    const offensiveEvents = game.snapEvents.filter((event) => event.offenseTeamId === home.id);

    expect(box.stats.totalYards).toBe(box.stats.passingYards + box.stats.rushingYards);
    expect(box.stats.passAttempts).toBe(offensiveEvents.filter((event) => event.playType === 'pass').length);
    expect(box.stats.rushAttempts).toBe(offensiveEvents.filter((event) => event.playType === 'run' || event.playType === 'trick').length);
    expect(box.stats.playerLines.reduce((total, line) => total + (line.passYds ?? 0), 0)).toBe(box.stats.passingYards);
    expect(box.stats.playerLines.reduce((total, line) => total + (line.rushYds ?? 0), 0)).toBe(box.stats.rushingYards);
    expect(box.stats.quarterScores.reduce((total, points) => total + points, 0)).toBe(game.homeScore);
  });

  it('is deterministic and selects an MVP from the supplied roster', () => {
    const team = makeTeam('club', 'AFC', 'North', true, 78);
    const opponent = makeTeam('opp', 'NFC', 'South', false, 78);
    const first = simulateSnapShadow('mvp', { id: team.id, overall: 78 }, { id: opponent.id, overall: 78 }, 77);
    const second = simulateSnapShadow('mvp', { id: team.id, overall: 78 }, { id: opponent.id, overall: 78 }, 77);

    expect(deriveSnapTeamBoxScore(first.snapEvents, team)).toEqual(deriveSnapTeamBoxScore(second.snapEvents, team));
    expect(team.roster.some((player) => player.id === deriveSnapTeamBoxScore(first.snapEvents, team).mvpPlayerId)).toBe(true);
  });
});
