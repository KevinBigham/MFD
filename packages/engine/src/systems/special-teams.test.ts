import { describe, expect, it } from 'vitest';
import {
  assignKickReturner,
  autoAssignSpecialTeams,
  buildSpecialTeamsState,
  calculateReturnYards,
  createDefaultSpecialTeamsState,
  simulateSpecialTeams,
} from './special-teams';
import { makeLeagueState, makePlayer } from './test-helpers';

describe('special teams', () => {
  it('fast returners gain more return yards on average', () => {
    const fastReturner = makePlayer('fast', 'afce1', 'WR', 84, false);
    fastReturner.ratings.speed = 95;
    const averageReturner = makePlayer('average', 'afce1', 'WR', 84, false);
    averageReturner.ratings.speed = 78;

    const fast = calculateReturnYards(fastReturner, 72, () => 0.4);
    const average = calculateReturnYards(averageReturner, 72, () => 0.4);

    expect(fast.yards).toBeGreaterThan(average.yards);
  });

  it('top returners can score touchdowns', () => {
    const returner = makePlayer('elite', 'afce1', 'RB', 88, false);
    returner.ratings.speed = 96;

    const result = calculateReturnYards(returner, 68, () => 0);

    expect(result.touchdown).toBe(true);
  });

  it('returns include fumble risk', () => {
    const returner = makePlayer('loose', 'afce1', 'WR', 76, false);
    returner.ratings.speed = 82;
    returner.ratings.ballSecurity = 40;

    const result = calculateReturnYards(returner, 78, () => 0.01);

    expect(result.fumble).toBe(true);
  });

  it('auto-assigns the fastest eligible returner', () => {
    const game = makeLeagueState();
    const team = game.teams.afce1!;
    const burner = makePlayer('burner', team.id, 'WR', 79, false);
    burner.ratings.speed = 97;
    team.roster.push(burner);
    game.players[burner.id] = burner;
    team.specialTeams = createDefaultSpecialTeamsState();

    autoAssignSpecialTeams(game, team.id);

    expect(team.specialTeams.kickReturner).toBe('burner');
    expect(team.specialTeams.puntReturner).toBe('burner');
  });

  it('prefers available players when a coaching recommendation supplies availability', () => {
    const game = makeLeagueState();
    const team = game.teams.afce1!;
    const unavailableBurner = makePlayer('unavailable-burner', team.id, 'WR', 99, false);
    unavailableBurner.ratings.speed = 99;
    team.roster.push(unavailableBurner);

    const specialTeams = buildSpecialTeamsState(team, {
      isPlayerAvailable: (player) => player.id !== unavailableBurner.id,
    });

    expect(specialTeams.kickReturner).not.toBe(unavailableBurner.id);
    expect(specialTeams.puntReturner).not.toBe(unavailableBurner.id);
  });

  it('does not reintroduce unavailable defenders through an empty coverage fallback', () => {
    const simulateAgainstUnavailableCoverage = (unavailableOvr: number) => {
      const game = makeLeagueState();
      const home = game.teams.afce1!;
      const away = game.teams.afce2!;
      for (const player of home.roster.filter((entry) => ['DL', 'LB', 'CB', 'S'].includes(entry.pos))) {
        player.ovr = unavailableOvr;
        player.injury = {
          id: `${player.id}-injury`,
          type: 'knee',
          severity: 'out',
          severityTier: 'severe',
          gamesOut: 4,
          gamesRecovered: 0,
          reinjuryRisk: 0.2,
          affectedRatings: [],
          ratingPenalty: 8,
          onIR: false,
        };
      }
      const isAvailable = (player: typeof home.roster[number]) => !player.injury?.gamesOut;
      home.specialTeams = buildSpecialTeamsState(home, { isPlayerAvailable: isAvailable });
      away.specialTeams = buildSpecialTeamsState(away);

      expect(home.specialTeams.kickCoverageUnit).toEqual([]);
      return simulateSpecialTeams(home, away, () => 0.5).away;
    };

    const lowOutPlayers = simulateAgainstUnavailableCoverage(40);
    const eliteOutPlayers = simulateAgainstUnavailableCoverage(99);

    expect(eliteOutPlayers.kickReturnYards).toBe(lowOutPlayers.kickReturnYards);
    expect(eliteOutPlayers.puntReturnYards).toBe(lowOutPlayers.puntReturnYards);
  });

  it('revalidates saved coverage assignments when players become unavailable later', () => {
    const simulateAgainstLateInjuries = (unavailableOvr: number) => {
      const game = makeLeagueState();
      const home = game.teams.afce1!;
      const away = game.teams.afce2!;
      home.specialTeams = buildSpecialTeamsState(home);
      away.specialTeams = buildSpecialTeamsState(away);
      expect(home.specialTeams.kickCoverageUnit.length).toBeGreaterThan(0);

      for (const playerId of home.specialTeams.kickCoverageUnit) {
        const player = home.roster.find((entry) => entry.id === playerId)!;
        player.ovr = unavailableOvr;
        player.injury = {
          id: `${player.id}-late-injury`,
          type: 'knee',
          severity: 'out',
          severityTier: 'severe',
          gamesOut: 4,
          gamesRecovered: 0,
          reinjuryRisk: 0.2,
          affectedRatings: [],
          ratingPenalty: 8,
          onIR: false,
        };
      }

      return simulateSpecialTeams(home, away, () => 0.5).away;
    };

    const lowOutPlayers = simulateAgainstLateInjuries(40);
    const eliteOutPlayers = simulateAgainstLateInjuries(99);

    expect(eliteOutPlayers.kickReturnYards).toBe(lowOutPlayers.kickReturnYards);
    expect(eliteOutPlayers.puntReturnYards).toBe(lowOutPlayers.puntReturnYards);
  });

  it('revalidates saved returners when they become unavailable later', () => {
    const simulateWithLateReturnerInjury = (unavailableSpeed: number) => {
      const game = makeLeagueState();
      const home = game.teams.afce1!;
      const away = game.teams.afce2!;
      home.specialTeams = buildSpecialTeamsState(home);
      away.specialTeams = buildSpecialTeamsState(away);
      const returner = home.roster.find(
        (player) => player.id === home.specialTeams?.kickReturner,
      )!;
      returner.ovr = unavailableSpeed;
      returner.ratings.speed = unavailableSpeed;
      returner.injury = {
        id: `${returner.id}-late-injury`,
        type: 'knee',
        severity: 'out',
        severityTier: 'severe',
        gamesOut: 4,
        gamesRecovered: 0,
        reinjuryRisk: 0.2,
        affectedRatings: [],
        ratingPenalty: 8,
        onIR: false,
      };

      return simulateSpecialTeams(home, away, () => 0.5).home;
    };

    const slowOutReturner = simulateWithLateReturnerInjury(40);
    const eliteOutReturner = simulateWithLateReturnerInjury(99);

    expect(eliteOutReturner.kickReturnYards).toBe(slowOutReturner.kickReturnYards);
    expect(eliteOutReturner.puntReturnYards).toBe(slowOutReturner.puntReturnYards);
  });

  it('ties kicker strength to touchback rate', () => {
    const game = makeLeagueState();
    const home = game.teams.afce1!;
    const away = game.teams.afce2!;
    home.specialTeams = createDefaultSpecialTeamsState();
    away.specialTeams = createDefaultSpecialTeamsState();
    assignKickReturner(game, home.id, home.roster.find((player) => player.pos === 'WR')!.id);
    assignKickReturner(game, away.id, away.roster.find((player) => player.pos === 'WR')!.id);
    const kicker = home.roster.find((player) => player.pos === 'K')!;
    kicker.ovr = 92;

    const result = simulateSpecialTeams(home, away, () => 0.1);

    expect(result.home.touchbackRate).toBeGreaterThan(0.5);
  });
});
